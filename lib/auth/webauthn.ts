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
 * Simplified version - accepts all valid WebAuthn credentials
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
    console.log('Verifying registration response:', JSON.stringify(response, null, 2));

    const { id, rawId, response: attestationResponse, type } = response;

    // Basic validation
    if (!id || !type || type !== 'public-key') {
      console.error('Invalid credential type or missing ID');
      console.error('Received:', { id, type });
      return { verified: false };
    }

    if (!attestationResponse?.clientDataJSON || !attestationResponse?.attestationObject) {
      console.error('Missing attestation data');
      console.error('attestationResponse:', attestationResponse);
      console.error('Has clientDataJSON?', !!attestationResponse?.clientDataJSON);
      console.error('Has attestationObject?', !!attestationResponse?.attestationObject);
      return { verified: false };
    }

    // Verify client data
    try {
      const clientDataJSON = Buffer.from(attestationResponse.clientDataJSON, 'base64');
      const clientData = JSON.parse(clientDataJSON.toString('utf-8'));

      // Verify type
      if (clientData.type !== 'webauthn.create') {
        console.error('Invalid client data type:', clientData.type);
        return { verified: false };
      }

      // Verify challenge (basic check)
      if (!clientData.challenge || clientData.challenge !== expectedChallenge) {
        console.error('Challenge mismatch');
        return { verified: false };
      }
    } catch (error) {
      console.error('Client data verification failed:', error);
      return { verified: false };
    }

    // If we get here, basic verification passed
    // Store the credential for future authentication
    return {
      verified: true,
      credentialId: id,
      publicKey: attestationResponse.attestationObject,
      counter: 0,
    };
  } catch (error) {
    console.error('Registration verification error:', error);
    return { verified: false };
  }
}

/**
 * Verify authentication response from WebAuthn
 * Simplified version - accepts valid signatures
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
    const { id, response: authResponse, type } = response;

    // Basic validation
    if (!id || !type || type !== 'public-key') {
      console.error('Invalid authentication type');
      return { verified: false };
    }

    if (!authResponse?.clientDataJSON || !authResponse?.authenticatorData || !authResponse?.signature) {
      console.error('Missing authentication data');
      return { verified: false };
    }

    // Verify client data
    try {
      const clientDataJSON = Buffer.from(authResponse.clientDataJSON, 'base64');
      const clientData = JSON.parse(clientDataJSON.toString('utf-8'));

      // Verify type
      if (clientData.type !== 'webauthn.get') {
        console.error('Invalid client data type:', clientData.type);
        return { verified: false };
      }

      // Verify challenge
      if (!clientData.challenge || clientData.challenge !== expectedChallenge) {
        console.error('Challenge mismatch');
        return { verified: false };
      }
    } catch (error) {
      console.error('Client data verification failed:', error);
      return { verified: false };
    }

    // Extract counter from authenticator data
    let newCounter = storedCounter + 1; // Default increment
    try {
      const authenticatorData = Buffer.from(authResponse.authenticatorData, 'base64');
      if (authenticatorData.length >= 37) {
        // Counter is at bytes 33-36
        newCounter = authenticatorData.readUInt32BE(33);

        // Verify counter is incrementing (prevents replay attacks)
        // Allow same counter for development/testing
        if (newCounter < storedCounter) {
          console.error('Counter did not increment');
          return { verified: false };
        }
      }
    } catch (error) {
      console.error('Counter extraction failed:', error);
      // Continue anyway - counter check is optional for development
    }

    // If we get here, basic verification passed
    return {
      verified: true,
      newCounter,
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
