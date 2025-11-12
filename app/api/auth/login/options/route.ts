import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/db/prisma';
import { generateAuthenticationOptions } from '@/lib/auth/webauthn';

/**
 * Generate WebAuthn authentication options
 * POST /api/auth/login/options
 */
export async function POST(request: NextRequest) {
  try {
    const { email } = await request.json();

    const rpId = new URL(request.url).hostname;

    // If email provided, get specific user credentials
    let allowCredentials;
    if (email) {
      const user = await prisma.user.findUnique({
        where: { email, isActive: true },
        include: {
          credentials: true,
        },
      });

      if (!user || user.credentials.length === 0) {
        return NextResponse.json(
          { error: 'No credentials found for this user' },
          { status: 404 }
        );
      }

      allowCredentials = user.credentials.map((cred) => ({
        id: cred.credentialId,
        transports: cred.transports ? (cred.transports as any[]) : undefined,
      }));
    }

    // Generate authentication options
    const options = generateAuthenticationOptions(rpId, allowCredentials);

    return NextResponse.json({
      options,
    });
  } catch (error: any) {
    console.error('Login options error:', error);
    return NextResponse.json(
      { error: error.message || 'Failed to generate login options' },
      { status: 500 }
    );
  }
}
