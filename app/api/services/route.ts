import { NextRequest, NextResponse } from 'next/server';
import { serviceManager } from '@/lib/services/serviceManager';

// GET /api/services - Get all services
export async function GET() {
  try {
    const services = await serviceManager.getAllServices();

    return NextResponse.json({
      services,
      total: services.length,
    });
  } catch (error: any) {
    return NextResponse.json(
      { error: error.message || 'Failed to load services' },
      { status: 500 }
    );
  }
}

// POST /api/services - Create a new custom service
export async function POST(request: NextRequest) {
  try {
    const serviceData = await request.json();

    const newService = await serviceManager.createService(serviceData);

    return NextResponse.json({
      success: true,
      message: 'Service created successfully',
      service: newService,
    });
  } catch (error: any) {
    return NextResponse.json(
      { error: error.message || 'Failed to create service' },
      { status: 500 }
    );
  }
}
