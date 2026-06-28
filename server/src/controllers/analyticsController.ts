import { Request, Response } from 'express';
import { pool } from '../config/database.js';
import logger, { clientExceptionStream } from '../utils/logger.js';
import { AuthRequest } from '../types/index.js';
import catchAsync from '../utils/catchAsync.js';

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

  // Optimize by fetching related data in parallel where possible
  const [territoriesResult, leadsResult, interactionsResult, userStatsResult] = await Promise.all([
    pool.query(
      `SELECT
        COUNT(*) as total_territories,
        COUNT(CASE WHEN user_id IS NOT NULL THEN 1 END) as territories_assigned
       FROM territories WHERE organization_id = $1`,
      [user.organization_id]
    ),
    pool.query(
      `SELECT
        COUNT(*) as total_leads,
        COUNT(CASE WHEN status = 'Completed' THEN 1 END) as completed_leads,
        COUNT(CASE WHEN location IS NOT NULL THEN 1 END) as geocoded_leads
       FROM leads WHERE organization_id = $1`,
      [user.organization_id]
    ),
    pool.query(
      `SELECT
        i.id,
        i.outcome,
        i.interaction_date,
        i.lead_id
       FROM interactions i
       JOIN leads l ON i.lead_id = l.id
       WHERE ${conditions.join(' AND ')}`,
      params
    ),
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
       WHERE u.organization_id = $1
       GROUP BY u.id, u.first_name, u.last_name, u.role`,
      [user.organization_id]
    )
  ]);

  const territories = territoriesResult.rows[0];
  const leads = leadsResult.rows[0];
  const interactions = interactionsResult.rows;
  const userStats = userStatsResult.rows;

  // Process interactions data (replaces reduce with for loop for O(n) performance)
  let totalInteractions = 0;
  let completedInteractionsCount = 0;
  const uniqueLeadsContactedSet = new Set();
  const outcomesMap = new Map();
  const trendsMap = new Map();
  const activeDaysSet = new Set();

  for (let i = 0; i < interactions.length; i++) {
    const row = interactions[i];
    totalInteractions++;
    if (row.lead_id) uniqueLeadsContactedSet.add(row.lead_id);
    if (row.outcome === 'Completed') completedInteractionsCount++;

    // Outcome counts
    if (row.outcome) {
      if (outcomesMap.has(row.outcome)) {
        outcomesMap.get(row.outcome).count++;
      } else {
        outcomesMap.set(row.outcome, { name: row.outcome, count: 1 });
      }
    }

    // Trends calculation
    if (row.interaction_date && !isNaN(new Date(row.interaction_date).getTime())) {
      const dateObj = new Date(row.interaction_date);
      const dateKey = dateObj.toISOString().split('T')[0];
      activeDaysSet.add(dateKey);

      if (trendsMap.has(dateKey)) {
        const existing = trendsMap.get(dateKey);
        existing.interactions++;
        if (row.lead_id) existing.leadSet.add(row.lead_id);
        existing.uniqueLeads = existing.leadSet.size;
      } else {
        const leadSet = new Set();
        if (row.lead_id) leadSet.add(row.lead_id);
        trendsMap.set(dateKey, {
          date: dateKey,
          interactions: 1,
          leadSet: leadSet,
          uniqueLeads: leadSet.size
        });
      }
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
  const uniqueLeadsContacted = uniqueLeadsContactedSet.size;
  const completionRate = totalInteractions > 0 ? Math.round((completedInteractionsCount / totalInteractions) * 100) : 0;

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
  let safeMessage = telemetryData.message || 'unknown';
  if (typeof safeMessage === 'string' && safeMessage.length > 1000) {
    safeMessage = safeMessage.substring(0, 1000) + '...[TRUNCATED]';
  }

  const sanitizedData = {
    userId: user.id,
    organizationId: user.organization_id,
    role: user.role,
    type: telemetryData.type || 'unknown',
    message: safeMessage,
    stack: telemetryData.stack ? telemetryData.stack.split('\n').slice(0, 5).join('\n') : undefined,
    componentStack: telemetryData.componentStack ? String(telemetryData.componentStack).split('\n').slice(0, 5).join('\n') : undefined,
    timestamp: new Date().toISOString()
  };

  // Ingest frontend error format identically to backend JSON logs
  logger.info('Frontend Telemetry Event', sanitizedData);

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

  try {
    // Wrap processing strings in reliable parsing blocks to avoid system crashes if processing incomplete front-end traces.
    let parsedStack = 'No stack trace provided';
    try {
      if (errorData.stack) {
        parsedStack = String(errorData.stack).split('\n').slice(0, 5).join('\n');
      }
    } catch (parseError) {
      logger.error('Error parsing front-end trace stack', parseError);
      parsedStack = 'Unparseable stack trace';
    }

    let parsedComponentStack = 'No component stack provided';
    try {
      if (errorData.componentStack) {
        parsedComponentStack = String(errorData.componentStack).split('\n').slice(0, 5).join('\n');
      }
    } catch (parseError) {
      logger.error('Error parsing component stack', parseError);
      parsedComponentStack = 'Unparseable component stack trace';
    }

    let safeMessage = errorData.message || 'Unknown error message';
    if (typeof safeMessage === 'string' && safeMessage.length > 2000) {
      safeMessage = safeMessage.substring(0, 2000) + '...[TRUNCATED]';
    }

    // Sanitize the data
    const sanitizedData = {
      userId: user.id,
      organizationId: user.organization_id,
      role: user.role,
      type: 'client_error',
      message: safeMessage,
      stack: parsedStack,
      componentStack: parsedComponentStack,
      timestamp: new Date().toISOString()
    };

    logger.error('Frontend Client Error Crash', sanitizedData);

    // Isolate incoming error metadata into a dedicated ingestion log system (logs/client-exceptions.log)
    // Device spec extraction
    let userAgent = 'Unknown Device';
    try {
        userAgent = String(req.headers['user-agent'] || 'Unknown Device');
    } catch (e) {
        userAgent = 'Unparseable User-Agent';
    }

    const logObject = {
      timestamp: sanitizedData.timestamp,
      userId: sanitizedData.userId,
      organizationId: sanitizedData.organizationId,
      message: sanitizedData.message,
      stack: sanitizedData.stack,
      componentStack: sanitizedData.componentStack,
      deviceSpec: userAgent
    };

    let logLine = JSON.stringify(logObject);
    if (logLine.length > 100000) {
        logLine = JSON.stringify({
            timestamp: sanitizedData.timestamp,
            userId: sanitizedData.userId,
            organizationId: sanitizedData.organizationId,
            message: 'Payload exceeded 100kb limit',
            stack: 'TRUNCATED',
            componentStack: 'TRUNCATED',
            deviceSpec: userAgent
        });
    }
    logLine += '\n';

    try {
      if (!clientExceptionStream.write(logLine)) {
         clientExceptionStream.once('drain', () => {});
      }
    } catch (streamError) {
      logger.error('Failed to write to client-exceptions stream', streamError);
    }

  } catch (err) {
    logger.error('Failed to process client error report:', err);
  }

  res.status(202).json({ status: 'Accepted' });
});
