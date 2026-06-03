// SPDX-License-Identifier: MIT
import React, { useState } from 'react';
import { View, Text, Modal, Pressable, KeyboardAvoidingView, Platform } from 'react-native';
import { X, Mail, Lock, KeyRound } from 'lucide-react-native';
import { Input } from '@/components/ui/Input';
import { Button } from '@/components/ui/Button';
import { apiPost, ApiError } from '@/lib/api';
import { Colors } from '@athletly/shared';

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
      setError('E-Mail und Passwort sind erforderlich.');
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
      setError('Verbindung fehlgeschlagen.');
    } catch (err) {
      setError(err instanceof ApiError ? err.message : 'Unbekannter Fehler.');
    } finally {
      setIsLoading(false);
    }
  };

  const handleMfa = async () => {
    const code = mfaCode.trim();
    if (!code) {
      setError('Code eingeben.');
      return;
    }
    if (!stateId) {
      setError('Login-Session abgelaufen, bitte neu starten.');
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
      setError('MFA fehlgeschlagen.');
    } catch (err) {
      setError(err instanceof ApiError ? err.message : 'Unbekannter Fehler.');
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <Modal visible={visible} transparent animationType="fade" onRequestClose={handleClose}>
      <Pressable
        className="flex-1 justify-center items-center"
        style={{ backgroundColor: Colors.overlay }}
        onPress={handleClose}
      >
        <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : 'height'}>
          <Pressable className="bg-white rounded-2xl p-6 mx-6 w-80" onPress={() => {}}>
            <View className="flex-row items-center justify-between mb-5">
              <Text className="text-text-primary text-lg font-semibold">
                {step === 'credentials' ? 'Garmin Connect' : 'Code eingeben'}
              </Text>
              <Pressable onPress={handleClose} hitSlop={12} accessibilityLabel="Schliessen">
                <X size={20} color={Colors.textMuted} />
              </Pressable>
            </View>

            {step === 'credentials' ? (
              <>
                <Text className="text-text-secondary text-sm mb-4">
                  Melde dich mit deinem Garmin Connect Konto an.
                </Text>
                <View className="gap-3 mb-4">
                  <Input
                    label="E-Mail"
                    leftIcon={Mail}
                    placeholder="garmin@example.com"
                    value={email}
                    onChangeText={setEmail}
                    keyboardType="email-address"
                    autoCapitalize="none"
                    autoCorrect={false}
                  />
                  <Input
                    label="Passwort"
                    leftIcon={Lock}
                    isPassword
                    placeholder="Passwort"
                    value={password}
                    onChangeText={setPassword}
                  />
                </View>
                {error && (
                  <View className="bg-error-light rounded-xl px-4 py-2.5 mb-4">
                    <Text className="text-error text-sm">{error}</Text>
                  </View>
                )}
                <Button
                  variant="primary"
                  size="lg"
                  label="Verbinden"
                  onPress={handleConnect}
                  loading={isLoading}
                  disabled={isLoading}
                />
              </>
            ) : (
              <>
                <Text className="text-text-secondary text-sm mb-4">
                  Garmin hat einen Code an dein Geraet oder deine E-Mail geschickt.
                </Text>
                <View className="gap-3 mb-4">
                  <Input
                    label="6-stelliger Code"
                    leftIcon={KeyRound}
                    placeholder="123456"
                    value={mfaCode}
                    onChangeText={setMfaCode}
                    keyboardType="number-pad"
                    autoCapitalize="none"
                    autoCorrect={false}
                  />
                </View>
                {error && (
                  <View className="bg-error-light rounded-xl px-4 py-2.5 mb-4">
                    <Text className="text-error text-sm">{error}</Text>
                  </View>
                )}
                <Button
                  variant="primary"
                  size="lg"
                  label="Bestaetigen"
                  onPress={handleMfa}
                  loading={isLoading}
                  disabled={isLoading}
                />
              </>
            )}
          </Pressable>
        </KeyboardAvoidingView>
      </Pressable>
    </Modal>
  );
}

export default GarminConnectModal;
