import { NextRequest, NextResponse } from 'next/server';
import { logger } from '@/lib/logger';

export async function POST(request: NextRequest) {
  try {
    const feedback = await request.json();
    
    // Validate required fields
    if (!feedback.message || !feedback.type) {
      return NextResponse.json(
        { error: 'Message and type are required' },
        { status: 400 }
      );
    }

    // Log feedback with high priority
    logger.info('User feedback received', {
      type: feedback.type,
      page: feedback.page,
      rating: feedback.rating,
      userAgent: feedback.userAgent,
      url: feedback.url,
      user: feedback.user,
      message: feedback.message.substring(0, 200) + (feedback.message.length > 200 ? '...' : ''),
      timestamp: feedback.timestamp,
      component: 'feedback-system'
    });

    // For critical bugs, send high-priority alert
    if (feedback.type === 'bug') {
      logger.error('Bug report received', new Error('User reported bug'), {
        message: feedback.message,
        page: feedback.page,
        userAgent: feedback.userAgent,
        user: feedback.user,
        url: feedback.url,
        component: 'bug-report'
      });
    }

    // For suggestions with high ratings, mark as important
    if (feedback.type === 'suggestion' && feedback.rating >= 4) {
      logger.info('High-rated suggestion received', {
        message: feedback.message,
        rating: feedback.rating,
        page: feedback.page,
        user: feedback.user,
        priority: 'high',
        component: 'suggestions'
      });
    }

    // In a real implementation, you might also:
    // - Store feedback in database
    // - Send email notifications
    // - Create tickets in support system
    // - Send to Slack/Discord webhook

    return NextResponse.json({
      success: true,
      message: 'Feedback received successfully',
      id: `feedback_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`
    });

  } catch (error) {
    logger.error('Feedback API error', error, { component: 'feedback-api' });
    
    return NextResponse.json(
      { error: 'Failed to process feedback' },
      { status: 500 }
    );
  }
}