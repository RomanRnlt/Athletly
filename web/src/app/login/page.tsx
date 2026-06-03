'use client';
// SPDX-License-Identifier: MIT

// Web port of mobile/app/login.tsx. Same gradient + card layout, same email
// sign-in/up flow. Social sign-in uses Supabase OAuth redirect (web has no
// native Apple/Google SDK); the Apple button is shown but routes through OAuth.
import React, { useState } from 'react';
import { Mail, ArrowRight } from 'lucide-react';
import { Button } from '@/components/ui/Button';
import { Input } from '@/components/ui/Input';
import { GoogleLogo } from '@/components/auth/GoogleLogo';
import { Colors, BRAND_GRADIENT } from '@athletly/shared';
import { signInWithEmail, signUpWithEmail } from '@/lib/use-auth';
import { signInWithApple, signInWithGoogle } from '@/lib/social-auth';
import { useT, type TranslateFn } from '@/i18n';

type Mode = 'choose' | 'email-signin' | 'email-signup';

const SOCIAL_BUTTON_HEIGHT = 52;

function GoogleSignInButton({
  onPress,
  loading,
  t,
}: {
  onPress: () => void;
  loading: boolean;
  t: TranslateFn;
}) {
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
      aria-label={t('login.withGoogle')}
    >
      <GoogleLogo size={20} />
      <span style={{ color: '#1F1F1F', fontSize: 17, fontWeight: 600, letterSpacing: 0.1, marginLeft: 8 }}>
        {t('login.withGoogle')}
      </span>
    </button>
  );
}

function AppleSignInButton({
  onPress,
  loading,
  t,
}: {
  onPress: () => void;
  loading: boolean;
  t: TranslateFn;
}) {
  return (
    <button
      type="button"
      onClick={onPress}
      disabled={loading}
      className="w-full flex flex-row items-center justify-center rounded-xl bg-black"
      style={{ height: SOCIAL_BUTTON_HEIGHT, opacity: loading ? 0.6 : 1 }}
      aria-label={t('login.withApple')}
    >
      <span className="text-white" style={{ fontSize: 18, marginRight: 6 }}></span>
      <span style={{ color: '#FFFFFF', fontSize: 17, fontWeight: 600 }}>{t('login.withApple')}</span>
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
  const t = useT();
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
      const msg = err instanceof Error ? err.message : t('login.providerFailed', { provider: label });
      setError(msg);
      setLoading(false);
    }
    // On OAuth redirect success the page navigates away; no finally needed there.
  };

  const handleEmailSubmit = async () => {
    const e = email.trim();
    if (!e || !password) {
      setError(t('login.errorCredentialsRequired'));
      return;
    }
    setError(null);
    setLoading(true);
    try {
      const fn = mode === 'email-signup' ? signUpWithEmail : signInWithEmail;
      await fn(e, password);
    } catch (err) {
      setError(err instanceof Error ? err.message : t('login.errorSignInFailed'));
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="flex-1 min-h-0 h-full relative">
      <div
        style={{ position: 'absolute', top: 0, left: 0, right: 0, height: 360, background: BRAND_GRADIENT }}
      />

      <div className="relative h-full overflow-y-auto no-scrollbar" style={{ padding: '60px 24px 24px' }}>
        <div className="mb-10">
          <h1 className="text-white text-4xl font-bold" style={{ letterSpacing: -0.5 }}>
            {t('app.name')}
          </h1>
          <p className="text-white/80 text-base mt-2">{t('app.tagline')}</p>
        </div>

        <div className="bg-white rounded-3xl p-6 flex flex-col gap-3" style={{ boxShadow: CARD_SHADOW }}>
          {mode === 'choose' && (
            <>
              <p className="text-text-primary text-lg font-semibold mb-1">{t('login.welcome')}</p>
              <p className="text-text-secondary text-sm mb-3">{t('login.subtitle')}</p>

              <AppleSignInButton
                onPress={() => runProvider(signInWithApple, t('login.appleProvider'))}
                loading={loading}
                t={t}
              />
              <GoogleSignInButton
                onPress={() => runProvider(signInWithGoogle, t('login.googleProvider'))}
                loading={loading}
                t={t}
              />

              <div className="flex flex-row items-center my-1 gap-3">
                <div className="flex-1 h-px bg-divider" />
                <span className="text-text-muted text-xs">{t('login.or')}</span>
                <div className="flex-1 h-px bg-divider" />
              </div>

              <Button
                variant="secondary"
                size="lg"
                label={t('login.withEmail')}
                icon={Mail}
                onPress={() => setMode('email-signin')}
                disabled={loading}
              />
              <button
                type="button"
                onClick={() => setMode('email-signup')}
                className="py-2 flex items-center justify-center"
              >
                <span className="text-primary text-sm font-medium">{t('login.noAccount')}</span>
              </button>

              {error && <ErrorBox message={error} />}
            </>
          )}

          {(mode === 'email-signin' || mode === 'email-signup') && (
            <>
              <button type="button" onClick={() => setMode('choose')} className="mb-2 self-start">
                <span className="text-primary text-sm">{`← ${t('common.back')}`}</span>
              </button>
              <p className="text-text-primary text-lg font-semibold mb-1">
                {mode === 'email-signup' ? t('login.createAccount') : t('login.signIn')}
              </p>
              <Input
                label={t('login.emailLabel')}
                leftIcon={Mail}
                placeholder={t('login.emailPlaceholder')}
                value={email}
                onChangeText={setEmail}
                keyboardType="email-address"
                autoCapitalize="none"
                autoCorrect={false}
              />
              <Input
                label={t('login.passwordLabel')}
                isPassword
                placeholder={t('login.passwordPlaceholder')}
                value={password}
                onChangeText={setPassword}
                onSubmit={handleEmailSubmit}
              />
              {error && <ErrorBox message={error} />}
              <Button
                variant="primary"
                size="lg"
                label={mode === 'email-signup' ? t('login.createAccount') : t('login.signIn')}
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
                  {mode === 'email-signin' ? t('login.noAccount') : t('login.haveAccount')}
                </span>
              </button>
            </>
          )}
        </div>
      </div>
    </div>
  );
}
