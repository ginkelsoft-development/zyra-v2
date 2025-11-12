import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/db/prisma';
import { verifyAuthenticationResponse, generateSessionToken } from '@/lib/auth/webauthn';

/**
 * Verify WebAuthn authentication and create session
 * POST /api/auth/login/verify
 */
export async function POST(request: NextRequest) {
  try {
    const { credential, challenge } = await request.json();

    if (!credential || !challenge) {
      return NextResponse.json(
        { error: 'Missing required fields' },
        { status: 400 }
      );
    }

    // Find credential in database
    const storedCredential = await prisma.webAuthnCredential.findUnique({
      where: { credentialId: credential.id },
      include: { user: true },
    });

    if (!storedCredential) {
      return NextResponse.json(
        { error: 'Credential not found' },
        { status: 404 }
      );
    }

    if (!storedCredential.user.isActive) {
      return NextResponse.json(
        { error: 'User account is not active' },
        { status: 403 }
      );
    }

    // Verify the authentication
    const verification = verifyAuthenticationResponse(
      credential,
      challenge,
      storedCredential.publicKey,
      storedCredential.counter
    );

    if (!verification.verified) {
      return NextResponse.json(
        { error: 'Invalid authentication' },
        { status: 401 }
      );
    }

    // Update credential counter and last used
    await prisma.webAuthnCredential.update({
      where: { id: storedCredential.id },
      data: {
        counter: verification.newCounter || storedCredential.counter,
        lastUsedAt: new Date(),
      },
    });

    // Create session
    const sessionToken = generateSessionToken();
    const expiresAt = new Date();
    expiresAt.setDate(expiresAt.getDate() + 30); // 30 days

    await prisma.session.create({
      data: {
        userId: storedCredential.userId,
        token: sessionToken,
        expiresAt,
        userAgent: request.headers.get('user-agent'),
        ipAddress: request.headers.get('x-forwarded-for') || request.headers.get('x-real-ip'),
      },
    });

    // Get user data
    const user = {
      id: storedCredential.user.id,
      name: storedCredential.user.name,
      email: storedCredential.user.email,
      role: storedCredential.user.role,
    };

    // Set session cookie
    const response = NextResponse.json({
      success: true,
      user,
    });

    response.cookies.set('session', sessionToken, {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'lax',
      maxAge: 30 * 24 * 60 * 60, // 30 days
      path: '/',
    });

    return response;
  } catch (error: any) {
    console.error('Login verification error:', error);
    return NextResponse.json(
      { error: error.message || 'Failed to verify login' },
      { status: 500 }
    );
  }
}
