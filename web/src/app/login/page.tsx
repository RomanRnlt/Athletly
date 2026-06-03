'use client';

// Web port of mobile/app/login.tsx. Same gradient + card layout, same email
// sign-in/up flow. Social sign-in uses Supabase OAuth redirect (web has no
// native Apple/Google SDK); the Apple button is shown but routes through OAuth.
import React, { useState } from 'react';
import { Mail, ArrowRight } from 'lucide-react';
import { Button } from '@/components/ui/Button';
import { Input } from '@/components/ui/Input';
import { GoogleLogo } from '@/components/auth/GoogleLogo';
import { Colors, BRAND_GRADIENT } from '@/lib/colors';
import { signInWithEmail, signUpWithEmail } from '@/lib/use-auth';
import { signInWithApple, signInWithGoogle } from '@/lib/social-auth';

type Mode = 'choose' | 'email-signin' | 'email-signup';

const SOCIAL_BUTTON_HEIGHT = 52;

function GoogleSignInButton({ onPress, loading }: { onPress: () => void; loading: boolean }) {
  return (
    <button
      type="button"
      onClick={onPress}
      disabled={loading}
      className="w-full flex flex-row items-center justify-center rounded-xl bg-white"
      style={{
        height: SOCIAL_BUTTON_HEIGHT,
        borderWidth: 1,
        borderStyle: 'solid',
        borderColor: Colors.divider,
        opacity: loading ? 0.6 : 1,
      }}
      aria-label="Mit Google anmelden"
    >
      <GoogleLogo size={20} />
      <span style={{ color: '#1F1F1F', fontSize: 17, fontWeight: 600, letterSpacing: 0.1, marginLeft: 8 }}>
        Mit Google anmelden
      </span>
    </button>
  );
}

function AppleSignInButton({ onPress, loading }: { onPress: () => void; loading: boolean }) {
  return (
    <button
      type="button"
      onClick={onPress}
      disabled={loading}
      className="w-full flex flex-row items-center justify-center rounded-xl bg-black"
      style={{ height: SOCIAL_BUTTON_HEIGHT, opacity: loading ? 0.6 : 1 }}
      aria-label="Mit Apple anmelden"
    >
      <span className="text-white" style={{ fontSize: 18, marginRight: 6 }}></span>
      <span style={{ color: '#FFFFFF', fontSize: 17, fontWeight: 600 }}>Mit Apple anmelden</span>
    </button>
  );
}

function ErrorBox({ message }: { message: string }) {
  return (
    <div className="bg-error-light rounded-xl px-4 py-2.5">
      <p className="text-error text-sm">{message}</p>
    </div>
  );
}

const CARD_SHADOW = '0 4px 16px rgba(0,0,0,0.08)';

export default function LoginScreen() {
  const [mode, setMode] = useState<Mode>('choose');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  const runProvider = async (fn: () => Promise<void>, label: string) => {
    setError(null);
    setLoading(true);
    try {
      await fn();
    } catch (err) {
      const msg = err instanceof Error ? err.message : `${label} fehlgeschlagen`;
      setError(msg);
      setLoading(false);
    }
    // On OAuth redirect success the page navigates away; no finally needed there.
  };

  const handleEmailSubmit = async () => {
    const e = email.trim();
    if (!e || !password) {
      setError('E-Mail und Passwort sind erforderlich.');
      return;
    }
    setError(null);
    setLoading(true);
    try {
      const fn = mode === 'email-signup' ? signUpWithEmail : signInWithEmail;
      await fn(e, password);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Anmeldung fehlgeschlagen');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="flex-1 relative min-h-screen">
      <div
        style={{ position: 'absolute', top: 0, left: 0, right: 0, height: 360, background: BRAND_GRADIENT }}
      />

      <div className="relative overflow-y-auto no-scrollbar min-h-screen" style={{ padding: '60px 24px 24px' }}>
        <div className="mb-10">
          <h1 className="text-white text-4xl font-bold" style={{ letterSpacing: -0.5 }}>
            Athletly
          </h1>
          <p className="text-white/80 text-base mt-2">Dein Coach. Deine Daten. Dein Plan.</p>
        </div>

        <div className="bg-white rounded-3xl p-6 flex flex-col gap-3" style={{ boxShadow: CARD_SHADOW }}>
          {mode === 'choose' && (
            <>
              <p className="text-text-primary text-lg font-semibold mb-1">Willkommen</p>
              <p className="text-text-secondary text-sm mb-3">
                Melde dich an oder erstelle einen Account.
              </p>

              <AppleSignInButton
                onPress={() => runProvider(signInWithApple, 'Apple-Anmeldung')}
                loading={loading}
              />
              <GoogleSignInButton
                onPress={() => runProvider(signInWithGoogle, 'Google-Anmeldung')}
                loading={loading}
              />

              <div className="flex flex-row items-center my-1 gap-3">
                <div className="flex-1 h-px bg-divider" />
                <span className="text-text-muted text-xs">oder</span>
                <div className="flex-1 h-px bg-divider" />
              </div>

              <Button
                variant="secondary"
                size="lg"
                label="Mit E-Mail anmelden"
                icon={Mail}
                onPress={() => setMode('email-signin')}
                disabled={loading}
              />
              <button
                type="button"
                onClick={() => setMode('email-signup')}
                className="py-2 flex items-center justify-center"
              >
                <span className="text-primary text-sm font-medium">
                  Noch kein Konto? Account erstellen
                </span>
              </button>

              {error && <ErrorBox message={error} />}
            </>
          )}

          {(mode === 'email-signin' || mode === 'email-signup') && (
            <>
              <button type="button" onClick={() => setMode('choose')} className="mb-2 self-start">
                <span className="text-primary text-sm">{'← Zurueck'}</span>
              </button>
              <p className="text-text-primary text-lg font-semibold mb-1">
                {mode === 'email-signup' ? 'Konto erstellen' : 'Anmelden'}
              </p>
              <Input
                label="E-Mail"
                leftIcon={Mail}
                placeholder="du@example.com"
                value={email}
                onChangeText={setEmail}
                keyboardType="email-address"
                autoCapitalize="none"
                autoCorrect={false}
              />
              <Input
                label="Passwort"
                isPassword
                placeholder="Mindestens 6 Zeichen"
                value={password}
                onChangeText={setPassword}
                onSubmit={handleEmailSubmit}
              />
              {error && <ErrorBox message={error} />}
              <Button
                variant="primary"
                size="lg"
                label={mode === 'email-signup' ? 'Konto erstellen' : 'Anmelden'}
                icon={ArrowRight}
                iconPosition="right"
                onPress={handleEmailSubmit}
                loading={loading}
                disabled={loading}
              />
              <button
                type="button"
                onClick={() => setMode(mode === 'email-signin' ? 'email-signup' : 'email-signin')}
                className="py-1 flex items-center justify-center"
              >
                <span className="text-primary text-sm font-medium">
                  {mode === 'email-signin'
                    ? 'Noch kein Konto? Account erstellen'
                    : 'Schon ein Konto? Anmelden'}
                </span>
              </button>
            </>
          )}
        </div>
      </div>
    </div>
  );
}
