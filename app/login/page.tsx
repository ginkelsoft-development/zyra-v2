'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';

export default function LoginPage() {
  const router = useRouter();
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [mode, setMode] = useState<'login' | 'register'>('login');
  const [isWebAuthnSupported, setIsWebAuthnSupported] = useState(true); // Assume supported initially
  const [mounted, setMounted] = useState(false);

  // Registration form
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');

  // Check WebAuthn support client-side only
  useEffect(() => {
    setMounted(true);
    setIsWebAuthnSupported(
      typeof window !== 'undefined' && window.PublicKeyCredential !== undefined
    );
  }, []);

  /**
   * Handle biometric login
   */
  const handleBiometricLogin = async () => {
    if (!isWebAuthnSupported) {
      setError('Je browser ondersteunt geen biometrische authenticatie');
      return;
    }

    try {
      setLoading(true);
      setError('');

      // Get authentication options from server
      const optionsRes = await fetch('/api/auth/login/options', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email: mode === 'login' ? email : undefined }),
      });

      if (!optionsRes.ok) {
        const data = await optionsRes.json();
        throw new Error(data.error || 'Failed to get login options');
      }

      const { options } = await optionsRes.json();

      // Convert challenge from base64url to ArrayBuffer
      const challengeBuffer = Uint8Array.from(
        atob(options.challenge.replace(/_/g, '/').replace(/-/g, '+')),
        c => c.charCodeAt(0)
      );

      // Convert allowCredentials if present
      const allowCredentials = options.allowCredentials?.map((cred: any) => ({
        ...cred,
        id: Uint8Array.from(atob(cred.id.replace(/_/g, '/').replace(/-/g, '+')), c => c.charCodeAt(0)),
      }));

      // Get credential from authenticator
      const credential = await navigator.credentials.get({
        publicKey: {
          ...options,
          challenge: challengeBuffer,
          allowCredentials,
        },
      }) as any;

      if (!credential) {
        throw new Error('Authenticatie geannuleerd');
      }

      // Convert credential to JSON
      const credentialJSON = {
        id: credential.id,
        rawId: btoa(String.fromCharCode(...Array.from(new Uint8Array(credential.rawId)))),
        type: credential.type,
        response: {
          authenticatorData: btoa(String.fromCharCode(...Array.from(new Uint8Array(credential.response.authenticatorData)))),
          clientDataJSON: btoa(String.fromCharCode(...Array.from(new Uint8Array(credential.response.clientDataJSON)))),
          signature: btoa(String.fromCharCode(...Array.from(new Uint8Array(credential.response.signature)))),
          userHandle: credential.response.userHandle ?
            btoa(String.fromCharCode(...Array.from(new Uint8Array(credential.response.userHandle)))) : null,
        },
      };

      // Verify with server
      const verifyRes = await fetch('/api/auth/login/verify', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          credential: credentialJSON,
          challenge: options.challenge,
        }),
      });

      if (!verifyRes.ok) {
        const data = await verifyRes.json();
        throw new Error(data.error || 'Login mislukt');
      }

      // Success - redirect to home
      router.push('/');
      router.refresh();
    } catch (err: any) {
      console.error('Login error:', err);
      setError(err.message || 'Login mislukt. Probeer het opnieuw.');
    } finally {
      setLoading(false);
    }
  };

  /**
   * Handle user registration with biometric
   */
  const handleBiometricRegister = async () => {
    if (!isWebAuthnSupported) {
      setError('Je browser ondersteunt geen biometrische authenticatie');
      return;
    }

    if (!name || !email) {
      setError('Vul je naam en email in');
      return;
    }

    try {
      setLoading(true);
      setError('');

      // Get registration options from server
      const optionsRes = await fetch('/api/auth/register/options', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ name, email }),
      });

      if (!optionsRes.ok) {
        const data = await optionsRes.json();
        throw new Error(data.error || 'Failed to get registration options');
      }

      const { options, userId } = await optionsRes.json();

      // Convert challenge and user.id from base64url to ArrayBuffer
      const challengeBuffer = Uint8Array.from(
        atob(options.challenge.replace(/_/g, '/').replace(/-/g, '+')),
        c => c.charCodeAt(0)
      );

      const userIdBuffer = Uint8Array.from(
        atob(options.user.id.replace(/_/g, '/').replace(/-/g, '+')),
        c => c.charCodeAt(0)
      );

      // Create credential
      const credential = await navigator.credentials.create({
        publicKey: {
          ...options,
          challenge: challengeBuffer,
          user: {
            ...options.user,
            id: userIdBuffer,
          },
        },
      }) as any;

      if (!credential) {
        throw new Error('Registratie geannuleerd');
      }

      // Convert credential to JSON
      const credentialJSON = {
        id: credential.id,
        rawId: btoa(String.fromCharCode(...Array.from(new Uint8Array(credential.rawId)))),
        type: credential.type,
        response: {
          attestationObject: btoa(String.fromCharCode(...Array.from(new Uint8Array(credential.response.attestationObject)))),
          clientDataJSON: btoa(String.fromCharCode(...Array.from(new Uint8Array(credential.response.clientDataJSON)))),
          transports: credential.response.getTransports ? credential.response.getTransports() : [],
        },
      };

      // Verify with server
      const verifyRes = await fetch('/api/auth/register/verify', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          userId,
          credential: credentialJSON,
          challenge: options.challenge,
          deviceName: navigator.userAgent.includes('Mobile') ? 'Mobile Device' : 'Desktop',
        }),
      });

      if (!verifyRes.ok) {
        const data = await verifyRes.json();
        throw new Error(data.error || 'Registratie mislukt');
      }

      // Success - redirect to home
      router.push('/');
      router.refresh();
    } catch (err: any) {
      console.error('Registration error:', err);
      setError(err.message || 'Registratie mislukt. Probeer het opnieuw.');
    } finally {
      setLoading(false);
    }
  };

  // Don't render until mounted (prevents hydration mismatch)
  if (!mounted) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-gray-900 via-gray-800 to-gray-900">
        <div className="text-white">Loading...</div>
      </div>
    );
  }

  if (!isWebAuthnSupported) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-gray-900 via-gray-800 to-gray-900">
        <div className="bg-gray-800 border border-red-600 rounded-xl p-8 max-w-md">
          <h1 className="text-2xl font-bold text-red-500 mb-4">Browser Niet Ondersteund</h1>
          <p className="text-gray-300">
            Je browser ondersteunt geen biometrische authenticatie (WebAuthn).
            Gebruik een moderne browser zoals Chrome, Firefox, Safari, of Edge.
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-gray-900 via-gray-800 to-gray-900 p-4">
      <div className="w-full max-w-md">
        {/* Logo & Title */}
        <div className="text-center mb-8">
          <div className="inline-block bg-gradient-to-br from-blue-500 to-purple-600 p-4 rounded-2xl mb-4">
            <svg className="w-12 h-12 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z" />
            </svg>
          </div>
          <h1 className="text-3xl font-bold text-white mb-2">Zyra Orchestrator</h1>
          <p className="text-gray-400">Beveiligde biometrische toegang</p>
        </div>

        {/* Main Card */}
        <div className="bg-gray-800/50 backdrop-blur-sm border border-gray-700 rounded-2xl p-8 shadow-2xl">
          {/* Mode Toggle */}
          <div className="flex gap-2 mb-6 bg-gray-900/50 p-1 rounded-lg">
            <button
              onClick={() => setMode('login')}
              className={`flex-1 py-2 px-4 rounded-md font-medium transition-all ${
                mode === 'login'
                  ? 'bg-blue-600 text-white shadow-lg'
                  : 'text-gray-400 hover:text-white'
              }`}
            >
              Inloggen
            </button>
            <button
              onClick={() => setMode('register')}
              className={`flex-1 py-2 px-4 rounded-md font-medium transition-all ${
                mode === 'register'
                  ? 'bg-blue-600 text-white shadow-lg'
                  : 'text-gray-400 hover:text-white'
              }`}
            >
              Registreren
            </button>
          </div>

          {/* Registration Form */}
          {mode === 'register' && (
            <div className="space-y-4 mb-6">
              <div>
                <label className="block text-sm font-medium text-gray-300 mb-2">Naam</label>
                <input
                  type="text"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  className="w-full px-4 py-3 bg-gray-900/50 border border-gray-600 rounded-lg text-white placeholder-gray-500 focus:outline-none focus:border-blue-500 transition"
                  placeholder="Je volledige naam"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-300 mb-2">Email</label>
                <input
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  className="w-full px-4 py-3 bg-gray-900/50 border border-gray-600 rounded-lg text-white placeholder-gray-500 focus:outline-none focus:border-blue-500 transition"
                  placeholder="je@email.com"
                />
              </div>
            </div>
          )}

          {/* Error Message */}
          {error && (
            <div className="mb-6 p-4 bg-red-900/20 border border-red-600 rounded-lg">
              <p className="text-red-400 text-sm">{error}</p>
            </div>
          )}

          {/* Biometric Button */}
          <button
            onClick={mode === 'login' ? handleBiometricLogin : handleBiometricRegister}
            disabled={loading}
            className="w-full py-4 bg-gradient-to-r from-blue-600 to-purple-600 hover:from-blue-700 hover:to-purple-700 text-white font-semibold rounded-lg shadow-lg hover:shadow-xl transform hover:scale-105 transition-all disabled:opacity-50 disabled:cursor-not-allowed disabled:transform-none flex items-center justify-center gap-3"
          >
            {loading ? (
              <>
                <svg className="animate-spin h-5 w-5" fill="none" viewBox="0 0 24 24">
                  <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                  <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                </svg>
                <span>Even geduld...</span>
              </>
            ) : (
              <>
                <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 11c0 3.517-1.009 6.799-2.753 9.571m-3.44-2.04l.054-.09A13.916 13.916 0 008 11a4 4 0 118 0c0 1.017-.07 2.019-.203 3m-2.118 6.844A21.88 21.88 0 0015.171 17m3.839 1.132c.645-2.266.99-4.659.99-7.132A8 8 0 008 4.07M3 15.364c.64-1.319 1-2.8 1-4.364 0-1.457.39-2.823 1.07-4" />
                </svg>
                <span>
                  {mode === 'login' ? 'Inloggen met vingerafdruk' : 'Registreer met vingerafdruk'}
                </span>
              </>
            )}
          </button>

          {/* Help Text */}
          <div className="mt-6 text-center space-y-2">
            <p className="text-sm text-gray-400">
              {mode === 'login'
                ? 'Gebruik je vingerafdruk, gezichtsherkenning of beveiligingssleutel om in te loggen'
                : 'Registreer je vingerafdruk of gezichtsherkenning voor veilige toegang'
              }
            </p>
            {mode === 'login' && (
              <p className="text-xs text-gray-500">
                Geen account? Klik op <span className="text-blue-400">Registreren</span>
              </p>
            )}
          </div>
        </div>

        {/* Footer */}
        <div className="mt-6 text-center text-sm text-gray-500">
          <p>Beveiligd met WebAuthn biometrische authenticatie</p>
        </div>
      </div>
    </div>
  );
}
