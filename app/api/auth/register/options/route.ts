import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/db/prisma';
import { generateRegistrationOptions } from '@/lib/auth/webauthn';

/**
 * Generate WebAuthn registration options for a new user
 * POST /api/auth/register/options
 */
export async function POST(request: NextRequest) {
  try {
    const { name, email } = await request.json();

    if (!name || !email) {
      return NextResponse.json(
        { error: 'Name and email are required' },
        { status: 400 }
      );
    }

    // Check if user already exists
    const existingUser = await prisma.user.findUnique({
      where: { email },
    });

    if (existingUser) {
      return NextResponse.json(
        { error: 'User already exists' },
        { status: 400 }
      );
    }

    // Create temporary user record
    const user = await prisma.user.create({
      data: {
        name,
        email,
        role: 'user', // First user will be upgraded to admin
        isActive: false, // Will be activated after fingerprint registration
      },
    });

    // Check if this is the first user (make them admin)
    const userCount = await prisma.user.count();
    if (userCount === 1) {
      await prisma.user.update({
        where: { id: user.id },
        data: { role: 'admin' },
      });
    }

    // Generate WebAuthn registration options
    const rpName = 'Zyra Orchestrator';
    const rpId = new URL(request.url).hostname;

    const options = generateRegistrationOptions(
      {
        id: user.id,
        name: user.name,
        email: user.email,
      },
      rpName,
      rpId
    );

    // Store challenge temporarily (in production, use Redis or database)
    // For now, we'll return it and expect it back
    return NextResponse.json({
      options,
      userId: user.id,
    });
  } catch (error: any) {
    console.error('Registration options error:', error);
    return NextResponse.json(
      { error: error.message || 'Failed to generate registration options' },
      { status: 500 }
    );
  }
}
