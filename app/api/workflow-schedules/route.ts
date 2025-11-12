import { NextRequest, NextResponse } from 'next/server';
import { getWorkflowScheduler, WorkflowSchedule } from '@/lib/services/workflowScheduler';

// GET - Get all schedules or schedules for a specific workflow
export async function GET(request: NextRequest) {
  try {
    const searchParams = request.nextUrl.searchParams;
    const workflowId = searchParams.get('workflowId');
    const projectPath = searchParams.get('projectPath');
    const scheduleId = searchParams.get('id');

    const scheduler = getWorkflowScheduler();

    if (scheduleId) {
      const schedule = scheduler.getSchedule(scheduleId);
      if (!schedule) {
        return NextResponse.json(
          { error: 'Schedule not found' },
          { status: 404 }
        );
      }
      return NextResponse.json({ schedule });
    }

    if (workflowId && projectPath) {
      const schedules = scheduler.getSchedulesForWorkflow(workflowId, projectPath);
      return NextResponse.json({ schedules });
    }

    const schedules = scheduler.getAllSchedules();
    return NextResponse.json({ schedules });
  } catch (error: any) {
    console.error('Error fetching workflow schedules:', error);
    return NextResponse.json(
      { error: 'Failed to fetch workflow schedules', details: error.message },
      { status: 500 }
    );
  }
}

// POST - Create a new schedule
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { workflowId, workflowName, projectPath, schedule } = body;

    if (!workflowId || !workflowName || !projectPath || !schedule) {
      return NextResponse.json(
        { error: 'Missing required fields: workflowId, workflowName, projectPath, schedule' },
        { status: 400 }
      );
    }

    // Validate schedule config
    if (!schedule.type || !['interval', 'cron', 'once'].includes(schedule.type)) {
      return NextResponse.json(
        { error: 'Invalid schedule type. Must be: interval, cron, or once' },
        { status: 400 }
      );
    }

    if (schedule.type === 'interval' && !schedule.interval) {
      return NextResponse.json(
        { error: 'interval config required for interval schedule type' },
        { status: 400 }
      );
    }

    if (schedule.type === 'cron' && !schedule.cron) {
      return NextResponse.json(
        { error: 'cron expression required for cron schedule type' },
        { status: 400 }
      );
    }

    if (schedule.type === 'once' && !schedule.once) {
      return NextResponse.json(
        { error: 'date/time required for once schedule type' },
        { status: 400 }
      );
    }

    const scheduler = getWorkflowScheduler();
    const newSchedule = scheduler.createSchedule(
      workflowId,
      workflowName,
      projectPath,
      schedule
    );

    return NextResponse.json({ schedule: newSchedule }, { status: 201 });
  } catch (error: any) {
    console.error('Error creating workflow schedule:', error);
    return NextResponse.json(
      { error: 'Failed to create workflow schedule', details: error.message },
      { status: 500 }
    );
  }
}

// PATCH - Update an existing schedule
export async function PATCH(request: NextRequest) {
  try {
    const searchParams = request.nextUrl.searchParams;
    const scheduleId = searchParams.get('id');

    if (!scheduleId) {
      return NextResponse.json(
        { error: 'Schedule ID is required' },
        { status: 400 }
      );
    }

    const body = await request.json();
    const scheduler = getWorkflowScheduler();

    const updatedSchedule = scheduler.updateSchedule(scheduleId, body);

    if (!updatedSchedule) {
      return NextResponse.json(
        { error: 'Schedule not found' },
        { status: 404 }
      );
    }

    return NextResponse.json({ schedule: updatedSchedule });
  } catch (error: any) {
    console.error('Error updating workflow schedule:', error);
    return NextResponse.json(
      { error: 'Failed to update workflow schedule', details: error.message },
      { status: 500 }
    );
  }
}

// DELETE - Delete a schedule
export async function DELETE(request: NextRequest) {
  try {
    const searchParams = request.nextUrl.searchParams;
    const scheduleId = searchParams.get('id');

    if (!scheduleId) {
      return NextResponse.json(
        { error: 'Schedule ID is required' },
        { status: 400 }
      );
    }

    const scheduler = getWorkflowScheduler();
    const deleted = scheduler.deleteSchedule(scheduleId);

    if (!deleted) {
      return NextResponse.json(
        { error: 'Schedule not found' },
        { status: 404 }
      );
    }

    return NextResponse.json({ success: true });
  } catch (error: any) {
    console.error('Error deleting workflow schedule:', error);
    return NextResponse.json(
      { error: 'Failed to delete workflow schedule', details: error.message },
      { status: 500 }
    );
  }
}
