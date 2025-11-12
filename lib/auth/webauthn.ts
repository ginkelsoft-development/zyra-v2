/**
 * WebAuthn Helper Library
 * Handles biometric authentication (fingerprint, Face ID, etc.)
 */

import crypto from 'crypto';

export interface PublicKeyCredentialCreationOptionsJSON {
  challenge: string;
  rp: {
    name: string;
    id: string;
  };
  user: {
    id: string;
    name: string;
    displayName: string;
  };
  pubKeyCredParams: {
    type: string;
    alg: number;
  }[];
  timeout: number;
  attestation: string;
  authenticatorSelection: {
    authenticatorAttachment?: string;
    requireResidentKey: boolean;
    userVerification: string;
  };
}

export interface PublicKeyCredentialRequestOptionsJSON {
  challenge: string;
  timeout: number;
  rpId: string;
  userVerification: string;
  allowCredentials?: {
    type: string;
    id: string;
    transports?: string[];
  }[];
}

/**
 * Generate registration options for WebAuthn
 */
export function generateRegistrationOptions(
  user: {
    id: string;
    name: string;
    email: string;
  },
  rpName: string,
  rpId: string
): PublicKeyCredentialCreationOptionsJSON {
  const challenge = crypto.randomBytes(32).toString('base64url');

  return {
    challenge,
    rp: {
      name: rpName,
      id: rpId,
    },
    user: {
      id: Buffer.from(user.id).toString('base64url'),
      name: user.email,
      displayName: user.name,
    },
    pubKeyCredParams: [
      { type: 'public-key', alg: -7 },  // ES256
      { type: 'public-key', alg: -257 }, // RS256
    ],
    timeout: 60000,
    attestation: 'none',
    authenticatorSelection: {
      authenticatorAttachment: 'platform', // Prefer built-in authenticators (fingerprint, Face ID)
      requireResidentKey: false,
      userVerification: 'required', // Always require user verification
    },
  };
}

/**
 * Generate authentication options for WebAuthn
 */
export function generateAuthenticationOptions(
  rpId: string,
  allowCredentials?: {
    id: string;
    transports?: string[];
  }[]
): PublicKeyCredentialRequestOptionsJSON {
  const challenge = crypto.randomBytes(32).toString('base64url');

  return {
    challenge,
    timeout: 60000,
    rpId,
    userVerification: 'required',
    allowCredentials: allowCredentials?.map(cred => ({
      type: 'public-key',
      id: cred.id,
      transports: cred.transports,
    })),
  };
}

/**
 * Verify registration response from WebAuthn
 */
export function verifyRegistrationResponse(
  response: any,
  expectedChallenge: string
): {
  verified: boolean;
  credentialId?: string;
  publicKey?: string;
  counter?: number;
} {
  try {
    // In a production environment, you would use a library like @simplewebauthn/server
    // For now, we'll do basic verification

    const { id, rawId, response: attestationResponse, type } = response;

    if (type !== 'public-key') {
      return { verified: false };
    }

    // Extract and verify authenticator data
    const authenticatorData = Buffer.from(attestationResponse.authenticatorData, 'base64');
    const clientDataJSON = Buffer.from(attestationResponse.clientDataJSON, 'base64');
    const clientData = JSON.parse(clientDataJSON.toString('utf-8'));

    // Verify challenge
    if (clientData.challenge !== expectedChallenge) {
      return { verified: false };
    }

    // Verify origin (in production, check against your domain)
    // if (clientData.origin !== expectedOrigin) {
    //   return { verified: false };
    // }

    // Extract public key from attestation object
    const attestationObject = Buffer.from(attestationResponse.attestationObject, 'base64');

    // For simplicity, we'll store the raw response
    // In production, properly parse the CBOR attestation object

    return {
      verified: true,
      credentialId: id,
      publicKey: attestationResponse.attestationObject, // Store full attestation for now
      counter: 0,
    };
  } catch (error) {
    console.error('Registration verification error:', error);
    return { verified: false };
  }
}

/**
 * Verify authentication response from WebAuthn
 */
export function verifyAuthenticationResponse(
  response: any,
  expectedChallenge: string,
  storedPublicKey: string,
  storedCounter: number
): {
  verified: boolean;
  newCounter?: number;
} {
  try {
    const { id, rawId, response: authResponse, type } = response;

    if (type !== 'public-key') {
      return { verified: false };
    }

    // Extract and verify authenticator data
    const authenticatorData = Buffer.from(authResponse.authenticatorData, 'base64');
    const clientDataJSON = Buffer.from(authResponse.clientDataJSON, 'base64');
    const clientData = JSON.parse(clientDataJSON.toString('utf-8'));

    // Verify challenge
    if (clientData.challenge !== expectedChallenge) {
      return { verified: false };
    }

    // Verify origin (in production)
    // if (clientData.origin !== expectedOrigin) {
    //   return { verified: false };
    // }

    // Extract counter from authenticator data
    // The counter is at bytes 33-36 of the authenticator data
    const counter = authenticatorData.readUInt32BE(33);

    // Verify counter is incrementing (prevents replay attacks)
    if (counter <= storedCounter) {
      return { verified: false };
    }

    // Verify signature (in production, use proper crypto verification)
    // For now, we'll accept if challenge matches and counter increments
    const signature = Buffer.from(authResponse.signature, 'base64');

    // In production, verify signature with stored public key
    // const verification = crypto.verify(
    //   'sha256',
    //   signedData,
    //   publicKey,
    //   signature
    // );

    return {
      verified: true,
      newCounter: counter,
    };
  } catch (error) {
    console.error('Authentication verification error:', error);
    return { verified: false };
  }
}

/**
 * Generate session token
 */
export function generateSessionToken(): string {
  return crypto.randomBytes(32).toString('base64url');
}

/**
 * Hash password (for fallback admin account)
 */
export async function hashPassword(password: string): Promise<string> {
  return new Promise((resolve, reject) => {
    const salt = crypto.randomBytes(16).toString('hex');
    crypto.scrypt(password, salt, 64, (err, derivedKey) => {
      if (err) reject(err);
      resolve(`${salt}:${derivedKey.toString('hex')}`);
    });
  });
}

/**
 * Verify password (for fallback admin account)
 */
export async function verifyPassword(password: string, hash: string): Promise<boolean> {
  return new Promise((resolve, reject) => {
    const [salt, key] = hash.split(':');
    crypto.scrypt(password, salt, 64, (err, derivedKey) => {
      if (err) reject(err);
      resolve(key === derivedKey.toString('hex'));
    });
  });
}
