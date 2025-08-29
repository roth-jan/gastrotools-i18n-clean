import { NextRequest, NextResponse } from 'next/server';
import { logger } from '@/lib/logger';

export async function POST(request: NextRequest) {
  try {
    const analyticsData = await request.json();
    
    // Basic validation
    if (!analyticsData.event || !analyticsData.timestamp) {
      return NextResponse.json({ error: 'Invalid analytics data' }, { status: 400 });
    }

    // Extract useful information
    const { event, sessionId, page, ...data } = analyticsData;
    
    // Log different types of events appropriately
    switch (event) {
      case 'pageview':
        logger.info('Page view', {
          page: data.page || page,
          referrer: data.referrer,
          sessionId,
          userAgent: data.userAgent?.substring(0, 100),
          component: 'analytics-pageview'
        });
        break;

      case 'tool_usage':
        logger.info('Tool usage event', {
          tool: data.tool,
          action: data.action,
          metadata: data.metadata,
          sessionId,
          component: 'analytics-tool-usage'
        });
        break;

      case 'lead_generation':
        logger.leadEvent(data.leadEvent, {
          tool: data.tool,
          metadata: data.metadata,
          sessionId,
          page
        });
        break;

      case 'error':
        logger.error('Client-side error', new Error(data.error), {
          stack: data.stack,
          context: data.context,
          sessionId,
          page,
          component: 'analytics-error'
        });
        break;

      case 'performance':
        logger.performance(data.metric, data.value, {
          metadata: data.metadata,
          sessionId,
          page
        });
        break;

      default:
        logger.info('Custom analytics event', {
          event,
          data,
          sessionId,
          page,
          component: 'analytics-custom'
        });
    }

    // In production, you might also:
    // - Store in a time-series database (InfluxDB, TimescaleDB)
    // - Send to external analytics (Google Analytics, Mixpanel)
    // - Aggregate metrics for dashboards

    return NextResponse.json({ success: true });

  } catch (error) {
    logger.error('Analytics API error', error, { component: 'analytics-api' });
    return NextResponse.json({ error: 'Failed to process analytics' }, { status: 500 });
  }
}

// Batch endpoint for multiple events
export async function PUT(request: NextRequest) {
  try {
    const { events } = await request.json();
    
    if (!Array.isArray(events)) {
      return NextResponse.json({ error: 'Events must be an array' }, { status: 400 });
    }

    // Process each event
    for (const event of events) {
      if (event.event && event.timestamp) {
        logger.info('Batch analytics event', {
          event: event.event,
          sessionId: event.sessionId,
          component: 'analytics-batch'
        });
      }
    }

    logger.info('Analytics batch processed', {
      eventCount: events.length,
      component: 'analytics-batch'
    });

    return NextResponse.json({ 
      success: true, 
      processed: events.length 
    });

  } catch (error) {
    logger.error('Analytics batch API error', error, { component: 'analytics-batch-api' });
    return NextResponse.json({ error: 'Failed to process batch' }, { status: 500 });
  }
}