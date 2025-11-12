import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/db/prisma';
import { verifyRegistrationResponse, generateSessionToken } from '@/lib/auth/webauthn';

/**
 * Verify WebAuthn registration and create credential
 * POST /api/auth/register/verify
 */
export async function POST(request: NextRequest) {
  try {
    const { userId, credential, challenge, deviceName } = await request.json();

    if (!userId || !credential || !challenge) {
      return NextResponse.json(
        { error: 'Missing required fields' },
        { status: 400 }
      );
    }

    // Verify the credential
    const verification = verifyRegistrationResponse(credential, challenge);

    if (!verification.verified || !verification.credentialId || !verification.publicKey) {
      return NextResponse.json(
        { error: 'Invalid credential' },
        { status: 400 }
      );
    }

    // Store the credential
    await prisma.webAuthnCredential.create({
      data: {
        userId,
        credentialId: verification.credentialId,
        publicKey: verification.publicKey,
        counter: verification.counter || 0,
        transports: credential.response.transports || [],
        deviceName: deviceName || 'Unknown Device',
      },
    });

    // Activate the user
    await prisma.user.update({
      where: { id: userId },
      data: { isActive: true },
    });

    // Create session
    const sessionToken = generateSessionToken();
    const expiresAt = new Date();
    expiresAt.setDate(expiresAt.getDate() + 30); // 30 days

    await prisma.session.create({
      data: {
        userId,
        token: sessionToken,
        expiresAt,
        userAgent: request.headers.get('user-agent'),
        ipAddress: request.headers.get('x-forwarded-for') || request.headers.get('x-real-ip'),
      },
    });

    // Get user data
    const user = await prisma.user.findUnique({
      where: { id: userId },
      select: {
        id: true,
        name: true,
        email: true,
        role: true,
      },
    });

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
    console.error('Registration verification error:', error);
    return NextResponse.json(
      { error: error.message || 'Failed to verify registration' },
      { status: 500 }
    );
  }
}
