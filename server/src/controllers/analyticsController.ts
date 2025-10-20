import { Request, Response } from 'express';
import { pool } from '../config/database.js';
import { AuthRequest } from '../types/index.js';

export const getAnalytics = async (req: AuthRequest, res: Response) => {
  try {
    const user = req.user!;
    const { startDate, endDate } = req.query;

    let dateFilter = '';
    const params: any[] = [user.organization_id];
    let paramIndex = 2;

    if (startDate && endDate) {
      dateFilter = ' AND i.interaction_date BETWEEN $2 AND $3';
      params.push(startDate as string, endDate as string);
      paramIndex += 2;
    }

    // Get comprehensive analytics data
    const [
      territoriesResult,
      leadsResult,
      interactionsResult,
      userStatsResult
    ] = await Promise.all([
      // Territory statistics
      pool.query(
        `SELECT 
          COUNT(*) as total_territories,
          COUNT(DISTINCT ta.user_id) as territories_assigned
        FROM territories t
        LEFT JOIN territory_assignments ta ON t.id = ta.territory_id
        WHERE t.organization_id = $1`,
        [user.organization_id]
      ),
      
      // Lead statistics
      pool.query(
        `SELECT 
          COUNT(*) as total_leads,
          COUNT(CASE WHEN status = 'Completed' OR status = 'Sold' THEN 1 END) as completed_leads,
          COUNT(CASE WHEN location IS NOT NULL THEN 1 END) as geocoded_leads
        FROM leads 
        WHERE organization_id = $1`,
        [user.organization_id]
      ),

      // Interaction statistics
      pool.query(
        `SELECT 
          COUNT(*) as total_interactions,
          COUNT(DISTINCT i.lead_id) as unique_leads_contacted,
          COUNT(DISTINCT DATE(i.interaction_date)) as active_days,
          i.outcome,
          COUNT(*) as outcome_count,
          DATE(i.interaction_date) as interaction_date,
          u.id as user_id,
          u.first_name,
          u.last_name
        FROM interactions i
        JOIN leads l ON i.lead_id = l.id
        JOIN users u ON i.user_id = u.id
        WHERE l.organization_id = $1${dateFilter}
        GROUP BY ROLLUP(i.outcome, DATE(i.interaction_date), u.id, u.first_name, u.last_name)
        ORDER BY interaction_date DESC`,
        params
      ),

      // User performance statistics
      pool.query(
        `SELECT 
          u.id,
          u.first_name,
          u.last_name,
          u.role,
          COUNT(i.id) as total_interactions,
          COUNT(DISTINCT i.lead_id) as unique_leads,
          COUNT(DISTINCT DATE(i.interaction_date)) as active_days
        FROM users u
        LEFT JOIN interactions i ON u.id = i.user_id
        LEFT JOIN leads l ON i.lead_id = l.id
        WHERE u.organization_id = $1 AND u.is_active = true
        GROUP BY u.id, u.first_name, u.last_name, u.role
        ORDER BY total_interactions DESC`,
        [user.organization_id]
      )
    ]);

    // Process the data
    const territories = territoriesResult.rows[0];
    const leads = leadsResult.rows[0];
    const interactions = interactionsResult.rows;
    const userStats = userStatsResult.rows;

    // Calculate completion rate
    const completionRate = leads.total_leads > 0 
      ? Math.round((leads.completed_leads / leads.total_leads) * 100)
      : 0;

    // Process interaction trends
    const trends = interactions
      .filter(row => row.interaction_date && row.outcome)
      .reduce((acc: any[], row) => {
        const existing = acc.find(item => item.date === row.interaction_date);
        if (existing) {
          existing.interactions += parseInt(row.outcome_count);
          existing.uniqueLeads += 1; // This is simplified - in production, you'd count unique leads properly
        } else {
          acc.push({
            date: new Date(row.interaction_date).toLocaleDateString(),
            interactions: parseInt(row.outcome_count),
            uniqueLeads: 1
          });
        }
        return acc;
      }, [])
      .sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime());

    // Process outcomes distribution
    const outcomes = interactions
      .filter(row => row.outcome)
      .reduce((acc: any[], row) => {
        const existing = acc.find(item => item.name === row.outcome);
        if (existing) {
          existing.value += parseInt(row.outcome_count);
        } else {
          acc.push({
            name: row.outcome,
            value: parseInt(row.outcome_count)
          });
        }
        return acc;
      }, []);

    // Process top performers
    const topPerformers = userStats
      .filter(user => user.total_interactions > 0)
      .map(user => ({
        id: user.id,
        name: `${user.first_name} ${user.last_name}`,
        interactions: parseInt(user.total_interactions),
        uniqueLeads: parseInt(user.unique_leads),
        activeDays: parseInt(user.active_days),
        efficiency: user.total_interactions > 0 
          ? Math.round((parseInt(user.unique_leads) / parseInt(user.total_interactions)) * 100)
          : 0
      }))
      .sort((a, b) => b.interactions - a.interactions)
      .slice(0, 10);

    res.json({
      summary: {
        totalTerritories: parseInt(territories.total_territories),
        territoriesAssigned: parseInt(territories.territories_assigned),
        totalLeads: parseInt(leads.total_leads),
        completedLeads: parseInt(leads.completed_leads),
        geocodedLeads: parseInt(leads.geocoded_leads),
        totalInteractions: interactions.reduce((sum, row) => 
          row.outcome ? sum + parseInt(row.outcome_count) : sum, 0),
        uniqueLeadsContacted: interactions.reduce((sum, row) => 
          row.outcome && row.lead_id ? sum + 1 : sum, 0),
        activeDays: new Set(interactions.filter(row => row.interaction_date).map(row => row.interaction_date)).size,
        completionRate
      },
      trends,
      outcomes,
      topPerformers,
      userStats: userStats.map(user => ({
        id: user.id,
        name: `${user.first_name} ${user.last_name}`,
        role: user.role,
        interactions: parseInt(user.total_interactions),
        uniqueLeads: parseInt(user.unique_leads),
        activeDays: parseInt(user.active_days)
      }))
    });
  } catch (error) {
    console.error('Get analytics error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
};

export const getPerformanceMetrics = async (req: AuthRequest, res: Response) => {
  try {
    const user = req.user!;
    const { startDate, endDate } = req.query;

    let dateFilter = '';
    const params: any[] = [user.organization_id];

    if (startDate && endDate) {
      dateFilter = ' AND i.interaction_date BETWEEN $2 AND $3';
      params.push(startDate as string, endDate as string);
    }

    // Get detailed performance metrics
    const [performanceResult] = await Promise.all([
      pool.query(
        `SELECT 
          DATE(i.interaction_date) as date,
          COUNT(*) as interactions,
          COUNT(DISTINCT i.lead_id) as unique_leads,
          COUNT(DISTINCT i.user_id) as active_users,
          u.first_name,
          u.last_name,
          u.id as user_id,
          COUNT(*) FILTER (WHERE i.outcome = 'Completed') as completed_interactions
        FROM interactions i
        JOIN leads l ON i.lead_id = l.id
        JOIN users u ON i.user_id = u.id
        WHERE l.organization_id = $1${dateFilter}
        GROUP BY DATE(i.interaction_date), u.id, u.first_name, u.last_name
        ORDER BY date DESC`,
        params
      )
    ]);

    // Process daily performance data
    const dailyData = performanceResult.rows.reduce((acc: any, row) => {
      const date = row.date;
      if (!acc[date]) {
        acc[date] = {
          date: new Date(date).toLocaleDateString(),
          totalInteractions: 0,
          uniqueLeads: new Set(),
          activeUsers: new Set(),
          completedInteractions: 0,
          users: []
        };
      }
      
      acc[date].totalInteractions += parseInt(row.interactions);
      acc[date].uniqueLeads.add(row.lead_id);
      acc[date].activeUsers.add(row.user_id);
      acc[date].completedInteractions += parseInt(row.completed_interactions);
      
      acc[date].users.push({
        id: row.user_id,
        name: `${row.first_name} ${row.last_name}`,
        interactions: parseInt(row.interactions),
        completed: parseInt(row.completed_interactions)
      });

      return acc;
    }, {});

    // Convert Sets to counts and prepare final data
    const processedData = Object.values(dailyData).map((day: any) => ({
      date: day.date,
      totalInteractions: day.totalInteractions,
      uniqueLeads: day.uniqueLeads.size,
      activeUsers: day.activeUsers.size,
      completedInteractions: day.completedInteractions,
      completionRate: day.totalInteractions > 0 
        ? Math.round((day.completedInteractions / day.totalInteractions) * 100)
        : 0,
      users: day.users.sort((a: any, b: any) => b.interactions - a.interactions)
    }));

    res.json({
      dailyPerformance: processedData,
      summary: {
        totalDays: processedData.length,
        totalInteractions: processedData.reduce((sum, day) => sum + day.totalInteractions, 0),
        averagePerDay: processedData.length > 0 
          ? Math.round(processedData.reduce((sum, day) => sum + day.totalInteractions, 0) / processedData.length)
          : 0,
        overallCompletionRate: processedData.length > 0
          ? Math.round(processedData.reduce((sum, day) => sum + day.completionRate, 0) / processedData.length)
          : 0
      }
    });
  } catch (error) {
    console.error('Get performance metrics error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
};