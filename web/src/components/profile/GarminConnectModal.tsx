'use client';
// SPDX-License-Identifier: MIT

// Web port of mobile/components/profile/GarminConnectModal.tsx. RN Modal -> a
// fixed overlay. Same two-step (credentials -> MFA) flow + same API calls.
import React, { useState } from 'react';
import { X, Mail, Lock, KeyRound } from 'lucide-react';
import { Input } from '@/components/ui/Input';
import { Button } from '@/components/ui/Button';
import { apiPost, ApiError } from '@/lib/api';
import { Colors } from '@athletly/shared';
import { useT } from '@/i18n';

interface GarminConnectModalProps {
  visible: boolean;
  onClose: () => void;
  onSuccess: (displayName: string | null) => void;
}

interface ConnectResponse {
  status: 'connected' | 'needs_mfa' | 'error';
  display_name: string | null;
  state_id: string | null;
}

type Step = 'credentials' | 'mfa';

export function GarminConnectModal({ visible, onClose, onSuccess }: GarminConnectModalProps) {
  const t = useT();
  const [step, setStep] = useState<Step>('credentials');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [mfaCode, setMfaCode] = useState('');
  const [stateId, setStateId] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(false);

  const reset = () => {
    setStep('credentials');
    setEmail('');
    setPassword('');
    setMfaCode('');
    setStateId(null);
    setError(null);
    setIsLoading(false);
  };

  const handleClose = () => {
    reset();
    onClose();
  };

  const handleConnect = async () => {
    const trimmedEmail = email.trim();
    if (!trimmedEmail || !password) {
      setError(t('garmin.errorCredentialsRequired'));
      return;
    }
    setError(null);
    setIsLoading(true);
    try {
      const res = await apiPost<ConnectResponse>('/garmin/connect', {
        email: trimmedEmail,
        password,
      });
      if (res.status === 'needs_mfa') {
        setStateId(res.state_id);
        setStep('mfa');
        return;
      }
      if (res.status === 'connected') {
        onSuccess(res.display_name);
        reset();
        return;
      }
      setError(t('garmin.errorConnectFailed'));
    } catch (err) {
      setError(err instanceof ApiError ? err.message : t('common.unknownError'));
    } finally {
      setIsLoading(false);
    }
  };

  const handleMfa = async () => {
    const code = mfaCode.trim();
    if (!code) {
      setError(t('garmin.errorCodeRequired'));
      return;
    }
    if (!stateId) {
      setError(t('garmin.errorSessionExpired'));
      setStep('credentials');
      return;
    }
    setError(null);
    setIsLoading(true);
    try {
      const res = await apiPost<ConnectResponse>('/garmin/connect/mfa', {
        state_id: stateId,
        code,
      });
      if (res.status === 'connected') {
        onSuccess(res.display_name);
        reset();
        return;
      }
      setError(t('garmin.errorMfaFailed'));
    } catch (err) {
      setError(err instanceof ApiError ? err.message : t('common.unknownError'));
    } finally {
      setIsLoading(false);
    }
  };

  if (!visible) return null;

  return (
    <div
      className="fixed inset-0 z-50 flex justify-center items-center p-4"
      style={{ backgroundColor: Colors.overlay }}
      onClick={handleClose}
    >
      <div
        className="bg-white rounded-2xl p-6 w-80 max-w-full"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex flex-row items-center justify-between mb-5">
          <p className="text-text-primary text-lg font-semibold">
            {step === 'credentials' ? t('garmin.titleCredentials') : t('garmin.titleMfa')}
          </p>
          <button type="button" onClick={handleClose} aria-label={t('common.close')}>
            <X size={20} color={Colors.textMuted} />
          </button>
        </div>

        {step === 'credentials' ? (
          <>
            <p className="text-text-secondary text-sm mb-4">{t('garmin.credentialsBody')}</p>
            <div className="flex flex-col gap-3 mb-4">
              <Input
                label={t('garmin.emailLabel')}
                leftIcon={Mail}
                placeholder={t('garmin.emailPlaceholder')}
                value={email}
                onChangeText={setEmail}
                keyboardType="email-address"
                autoCapitalize="none"
                autoCorrect={false}
              />
              <Input
                label={t('garmin.passwordLabel')}
                leftIcon={Lock}
                isPassword
                placeholder={t('garmin.passwordPlaceholder')}
                value={password}
                onChangeText={setPassword}
                onSubmit={handleConnect}
              />
            </div>
            {error && (
              <div className="bg-error-light rounded-xl px-4 py-2.5 mb-4">
                <p className="text-error text-sm">{error}</p>
              </div>
            )}
            <Button
              variant="primary"
              size="lg"
              label={t('garmin.connect')}
              onPress={handleConnect}
              loading={isLoading}
              disabled={isLoading}
            />
          </>
        ) : (
          <>
            <p className="text-text-secondary text-sm mb-4">{t('garmin.mfaBody')}</p>
            <div className="flex flex-col gap-3 mb-4">
              <Input
                label={t('garmin.mfaLabel')}
                leftIcon={KeyRound}
                placeholder="123456"
                value={mfaCode}
                onChangeText={setMfaCode}
                keyboardType="number-pad"
                autoCapitalize="none"
                autoCorrect={false}
                onSubmit={handleMfa}
              />
            </div>
            {error && (
              <div className="bg-error-light rounded-xl px-4 py-2.5 mb-4">
                <p className="text-error text-sm">{error}</p>
              </div>
            )}
            <Button
              variant="primary"
              size="lg"
              label={t('garmin.confirm')}
              onPress={handleMfa}
              loading={isLoading}
              disabled={isLoading}
            />
          </>
        )}
      </div>
    </div>
  );
}

export default GarminConnectModal;
