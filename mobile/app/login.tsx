import React, { useEffect, useState } from 'react';
import {
  ActivityIndicator,
  KeyboardAvoidingView,
  Platform,
  Pressable,
  ScrollView,
  Text,
  View,
} from 'react-native';
import * as AppleAuthentication from 'expo-apple-authentication';
import { LinearGradient } from 'expo-linear-gradient';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Mail, ArrowRight } from 'lucide-react-native';
import { Button } from '@/components/ui/Button';
import { Input } from '@/components/ui/Input';
import { GoogleLogo } from '@/components/auth/GoogleLogo';
import { Colors } from '@/lib/colors';
import {
  signInWithEmail,
  signUpWithEmail,
} from '@/lib/use-auth';
import { signInWithApple, signInWithGoogle } from '@/lib/social-auth';

type Mode = 'choose' | 'email-signin' | 'email-signup';

const SOCIAL_BUTTON_HEIGHT = 52;
const SOCIAL_CORNER_RADIUS = 12;

function GoogleSignInButton({
  onPress,
  loading,
}: {
  onPress: () => void;
  loading: boolean;
}) {
  return (
    <Pressable
      onPress={onPress}
      disabled={loading}
      accessibilityRole="button"
      accessibilityLabel="Mit Google anmelden"
      style={({ pressed }) => ({
        height: SOCIAL_BUTTON_HEIGHT,
        borderRadius: SOCIAL_CORNER_RADIUS,
        backgroundColor: '#FFFFFF',
        borderWidth: 1,
        borderColor: Colors.divider,
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'center',
        opacity: loading ? 0.6 : pressed ? 0.85 : 1,
      })}
    >
      <View style={{ marginRight: 10 }}>
        <GoogleLogo size={20} />
      </View>
      <Text
        style={{
          color: '#1F1F1F',
          fontSize: 16,
          fontWeight: '600',
          letterSpacing: 0.1,
        }}
      >
        Mit Google anmelden
      </Text>
    </Pressable>
  );
}

function ErrorBox({ message }: { message: string }) {
  return (
    <View className="bg-error-light rounded-xl px-4 py-2.5">
      <Text className="text-error text-sm">{message}</Text>
    </View>
  );
}

export default function LoginScreen() {
  const insets = useSafeAreaInsets();
  const [mode, setMode] = useState<Mode>('choose');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [appleAvailable, setAppleAvailable] = useState(false);

  useEffect(() => {
    if (Platform.OS !== 'ios') return;
    AppleAuthentication.isAvailableAsync()
      .then(setAppleAvailable)
      .catch(() => setAppleAvailable(false));
  }, []);

  const runProvider = async (fn: () => Promise<void>, label: string) => {
    setError(null);
    setLoading(true);
    try {
      await fn();
    } catch (err) {
      const msg = err instanceof Error ? err.message : `${label} fehlgeschlagen`;
      setError(msg);
    } finally {
      setLoading(false);
    }
  };

  const handleEmailSubmit = async () => {
    const e = email.trim();
    if (!e || !password) {
      setError('E-Mail und Passwort sind erforderlich.');
      return;
    }
    const fn = mode === 'email-signup' ? signUpWithEmail : signInWithEmail;
    await runProvider(() => fn(e, password), 'Anmeldung');
  };

  return (
    <View className="flex-1">
      <LinearGradient
        colors={['#2563EB', '#4F46E5', '#7C3AED']}
        start={{ x: 0, y: 0 }}
        end={{ x: 1, y: 1 }}
        style={{ position: 'absolute', top: 0, left: 0, right: 0, height: 360 }}
      />

      <KeyboardAvoidingView
        style={{ flex: 1 }}
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
      >
        <ScrollView
          contentContainerStyle={{
            flexGrow: 1,
            paddingTop: insets.top + 60,
            paddingBottom: insets.bottom + 20,
            paddingHorizontal: 24,
          }}
          keyboardShouldPersistTaps="handled"
        >
          <View className="mb-10">
            <Text className="text-white text-4xl font-bold" style={{ letterSpacing: -0.5 }}>
              Athletly
            </Text>
            <Text className="text-white/80 text-base mt-2">
              Dein Coach. Deine Daten. Dein Plan.
            </Text>
          </View>

          <View
            className="bg-white rounded-3xl p-6 gap-3"
            style={{
              shadowColor: '#000',
              shadowOffset: { width: 0, height: 4 },
              shadowOpacity: 0.08,
              shadowRadius: 16,
              elevation: 6,
            }}
          >
            {mode === 'choose' && (
              <>
                <Text className="text-text-primary text-lg font-semibold mb-1">
                  Willkommen
                </Text>
                <Text className="text-text-secondary text-sm mb-3">
                  Melde dich an oder erstelle einen Account.
                </Text>

                {appleAvailable && (
                  <AppleAuthentication.AppleAuthenticationButton
                    buttonType={
                      AppleAuthentication.AppleAuthenticationButtonType.SIGN_IN
                    }
                    buttonStyle={
                      AppleAuthentication.AppleAuthenticationButtonStyle.BLACK
                    }
                    cornerRadius={SOCIAL_CORNER_RADIUS}
                    style={{
                      width: '100%',
                      height: SOCIAL_BUTTON_HEIGHT,
                      opacity: loading ? 0.6 : 1,
                    }}
                    onPress={() =>
                      runProvider(signInWithApple, 'Apple-Anmeldung')
                    }
                  />
                )}

                <GoogleSignInButton
                  onPress={() => runProvider(signInWithGoogle, 'Google-Anmeldung')}
                  loading={loading}
                />

                <View className="flex-row items-center my-1 gap-3">
                  <View className="flex-1 h-px bg-divider" />
                  <Text className="text-text-muted text-xs">oder</Text>
                  <View className="flex-1 h-px bg-divider" />
                </View>

                <Button
                  variant="secondary"
                  size="lg"
                  label="Mit E-Mail anmelden"
                  icon={Mail}
                  onPress={() => setMode('email-signin')}
                  disabled={loading}
                />
                <Pressable
                  onPress={() => setMode('email-signup')}
                  className="py-2 items-center"
                  accessibilityRole="button"
                >
                  <Text className="text-primary text-sm font-medium">
                    Noch kein Konto? Account erstellen
                  </Text>
                </Pressable>

                {error && <ErrorBox message={error} />}
              </>
            )}

            {(mode === 'email-signin' || mode === 'email-signup') && (
              <>
                <Pressable onPress={() => setMode('choose')} className="mb-2">
                  <Text className="text-primary text-sm">{'← Zurueck'}</Text>
                </Pressable>
                <Text className="text-text-primary text-lg font-semibold mb-1">
                  {mode === 'email-signup' ? 'Konto erstellen' : 'Anmelden'}
                </Text>
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
                <Pressable
                  onPress={() =>
                    setMode(mode === 'email-signin' ? 'email-signup' : 'email-signin')
                  }
                  className="py-1 items-center"
                  accessibilityRole="button"
                >
                  <Text className="text-primary text-sm font-medium">
                    {mode === 'email-signin'
                      ? 'Noch kein Konto? Account erstellen'
                      : 'Schon ein Konto? Anmelden'}
                  </Text>
                </Pressable>
              </>
            )}
          </View>

          {loading && (
            <View className="items-center mt-4">
              <ActivityIndicator color="#FFF" />
            </View>
          )}
        </ScrollView>
      </KeyboardAvoidingView>
    </View>
  );
}
