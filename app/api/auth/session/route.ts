import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/db/prisma';

/**
 * Get current session
 * GET /api/auth/session
 */
export async function GET(request: NextRequest) {
  try {
    const sessionToken = request.cookies.get('session')?.value;

    if (!sessionToken) {
      return NextResponse.json(
        { error: 'Not authenticated' },
        { status: 401 }
      );
    }

    // Find session in database
    const session = await prisma.session.findUnique({
      where: { token: sessionToken },
      include: {
        user: {
          select: {
            id: true,
            name: true,
            email: true,
            role: true,
            isActive: true,
          },
        },
      },
    });

    if (!session) {
      return NextResponse.json(
        { error: 'Session not found' },
        { status: 401 }
      );
    }

    // Check if session is expired
    if (new Date() > session.expiresAt) {
      // Delete expired session
      await prisma.session.delete({
        where: { id: session.id },
      });

      return NextResponse.json(
        { error: 'Session expired' },
        { status: 401 }
      );
    }

    // Check if user is active
    if (!session.user.isActive) {
      return NextResponse.json(
        { error: 'User account is not active' },
        { status: 403 }
      );
    }

    return NextResponse.json({
      user: session.user,
    });
  } catch (error: any) {
    console.error('Session check error:', error);
    return NextResponse.json(
      { error: error.message || 'Failed to check session' },
      { status: 500 }
    );
  }
}
