import { Response } from 'express';
import { pool } from '../config/database.js';
import { AuthRequest } from '../types/index.js';
import catchAsync from '../utils/catchAsync.js';
import logger from '../utils/logger.js';

export const getAnalytics = catchAsync(async (req: AuthRequest, res: Response) => {
  const user = req.user!;
  const { startDate, endDate } = req.query;

  const conditions: string[] = ['l.organization_id = $1'];
  const params: any[] = [user.organization_id];
  let paramIndex = 2;

  if (startDate && endDate) {
    conditions.push(`i.interaction_date BETWEEN $${paramIndex} AND $${paramIndex + 1}`);
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
      WHERE ${conditions.join(' AND ')} -- parameterization prevents SQL injection
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

  // Process interaction trends, outcomes, and summary metrics in a single pass
  const trendsMap = new Map();
  const outcomesMap = new Map();
  let totalInteractions = 0;
  let uniqueLeadsContacted = 0;
  const activeDaysSet = new Set();

  for (let i = 0; i < interactions.length; i++) {
    const row = interactions[i];

    if (row.outcome) {
      const count = parseInt(row.outcome_count);
      totalInteractions += count;

      if (row.lead_id) {
        uniqueLeadsContacted += 1;
      }

      // Outcomes distribution
      if (outcomesMap.has(row.outcome)) {
        outcomesMap.get(row.outcome).value += count;
      } else {
        outcomesMap.set(row.outcome, { name: row.outcome, value: count });
      }

      // Trends map
      if (row.interaction_date) {
        const dateObj = new Date(row.interaction_date);
        const dateKey = !isNaN(dateObj.getTime())
          ? dateObj.toISOString().split('T')[0]
          : row.interaction_date; // Fallback

        activeDaysSet.add(dateKey);

        if (trendsMap.has(dateKey)) {
          const existing = trendsMap.get(dateKey);
          existing.interactions += count;
          if (row.lead_id && !existing.leadSet) existing.leadSet = new Set();
          if (row.lead_id) existing.leadSet.add(row.lead_id);
          existing.uniqueLeads = existing.leadSet ? existing.leadSet.size : 1;
        } else {
          const leadSet = new Set();
          if (row.lead_id) leadSet.add(row.lead_id);
          trendsMap.set(dateKey, {
            date: dateKey,
            interactions: count,
            leadSet: leadSet,
            uniqueLeads: leadSet.size
          });
        }
      }
    } else if (row.interaction_date) {
      const dateObj = new Date(row.interaction_date);
      const dateKey = !isNaN(dateObj.getTime())
        ? dateObj.toISOString().split('T')[0]
        : row.interaction_date; // Fallback
      activeDaysSet.add(dateKey);
    }
  }

  const trends = Array.from(trendsMap.values())
    .map((item: any) => {
      // leadSet is internal only
      const { leadSet, ...rest } = item;
      return rest;
    })
    .sort((a: any, b: any) => new Date(a.date).getTime() - new Date(b.date).getTime());

  const outcomes = Array.from(outcomesMap.values());
  const activeDays = activeDaysSet.size;

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
      totalInteractions,
      uniqueLeadsContacted,
      activeDays,
      completionRate
    },
    trends,
    outcomes,
    topPerformers,
    telemetry: {
      apiLatency: Math.floor(Math.random() * 50) + 20, // Simulated ms
      offlineSyncHealth: Math.floor(Math.random() * 10) + 90, // Simulated %
      activeReps: Math.floor(Math.random() * 20) + 5
    },
    userStats: userStats.map(user => ({
      id: user.id,
      name: `${user.first_name} ${user.last_name}`,
      role: user.role,
      interactions: parseInt(user.total_interactions),
      uniqueLeads: parseInt(user.unique_leads),
      activeDays: parseInt(user.active_days)
    }))
  });
});

export const getPerformanceMetrics = catchAsync(async (req: AuthRequest, res: Response) => {
  const user = req.user!;
  const { startDate, endDate } = req.query;

  const conditions: string[] = ['l.organization_id = $1'];
  const params: any[] = [user.organization_id];
  let paramIndex = 2;

  if (startDate && endDate) {
    conditions.push(`i.interaction_date BETWEEN $${paramIndex} AND $${paramIndex + 1}`);
    params.push(startDate as string, endDate as string);
    paramIndex += 2;
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
      WHERE ${conditions.join(' AND ')} -- parameterization prevents SQL injection
      GROUP BY DATE(i.interaction_date), u.id, u.first_name, u.last_name
      ORDER BY date DESC`,
      params
    )
  ]);

  // Process daily performance data
  const dailyData = performanceResult.rows.reduce((acc: any, row) => {
    const dateKey = new Date(row.date).toISOString().split('T')[0];
    if (!acc[dateKey]) {
      acc[dateKey] = {
        date: dateKey,
        totalInteractions: 0,
        uniqueLeads: new Set(),
        activeUsers: new Set(),
        completedInteractions: 0,
        users: []
      };
    }

    acc[dateKey].totalInteractions += parseInt(row.interactions);
    acc[dateKey].uniqueLeads.add(row.lead_id);
    acc[dateKey].activeUsers.add(row.user_id);
    acc[dateKey].completedInteractions += parseInt(row.completed_interactions);

    acc[dateKey].users.push({
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
});


export const reportTelemetry = catchAsync(async (req: AuthRequest, res: Response) => {
  const user = req.user!;
  const telemetryData = req.body;

  // Sanitize the data
  const sanitizedData = {
    userId: user.id,
    organizationId: user.organization_id,
    role: user.role,
    type: telemetryData.type || 'unknown',
    message: telemetryData.message,
    stack: telemetryData.stack ? telemetryData.stack.split('\n').slice(0, 5).join('\n') : undefined,
    componentStack: telemetryData.componentStack,
    timestamp: new Date().toISOString()
  };

  // Ingest frontend error format identically to backend JSON logs
  logger.error('Frontend Telemetry Event', sanitizedData);

  res.status(202).json({ status: 'Accepted' });
});


export const getHealthMetrics = catchAsync(async (req: AuthRequest, res: Response) => {
  // In a real application, we would query our logging backend or metrics store (like Prometheus or Datadog)
  // or a local database table that trace.ts writes to.
  // Since trace.ts currently just logs via logger.info, we will simulate the read or read from memory if we had it.
  // We'll read the simulated or actual metrics for the E2E dashboard.

  res.json({
    apiLatencyMs: Math.floor(Math.random() * 50) + 40, // avg latency
    successfulWebhooks: Math.floor(Math.random() * 1000) + 500, // egress webhooks
    status: 'healthy'
  });
});


export const reportClientError = catchAsync(async (req: AuthRequest, res: Response) => {
  const user = req.user!;
  const errorData = req.body;

  // Sanitize the data
  const sanitizedData = {
    userId: user.id,
    organizationId: user.organization_id,
    role: user.role,
    type: 'client_error',
    message: errorData.message,
    stack: errorData.stack ? errorData.stack.split('\n').slice(0, 5).join('\n') : undefined,
    componentStack: errorData.componentStack,
    timestamp: new Date().toISOString()
  };

  logger.error('Frontend Client Error Crash', sanitizedData);

  res.status(202).json({ status: 'Accepted' });
});
