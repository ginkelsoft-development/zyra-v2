import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/db/prisma';

/**
 * Clear all authentication data (DEBUG ONLY - REMOVE IN PRODUCTION)
 * GET /api/auth/debug/clear
 */
export async function GET(request: NextRequest) {
  try {
    // Delete in correct order (child tables first)
    await prisma.session.deleteMany({});
    await prisma.webAuthnCredential.deleteMany({});
    await prisma.user.deleteMany({});

    return NextResponse.json({
      success: true,
      message: 'All authentication data cleared',
    });
  } catch (error: any) {
    console.error('Clear auth data error:', error);
    return NextResponse.json(
      { error: error.message || 'Failed to clear data' },
      { status: 500 }
    );
  }
}
