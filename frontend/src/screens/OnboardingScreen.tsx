import React, { useState } from 'react';
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  ActivityIndicator,
  KeyboardAvoidingView,
  Platform,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useNavigation } from '@react-navigation/native';
import type { NativeStackNavigationProp } from '@react-navigation/native-stack';

import { login } from '../api';
import { useMerchantStore } from '../store/merchantStore';
import { colors } from '../theme';
import type { RootStackParamList } from '../navigation/types';

const DEMO_PHONE = '9800000000';

export default function OnboardingScreen() {
  const nav = useNavigation<NativeStackNavigationProp<RootStackParamList>>();
  const setMerchant = useMerchantStore((s) => s.setMerchant);

  const [phone, setPhone] = useState(DEMO_PHONE);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const canSubmit = phone.trim().length >= 10 && !loading;

  const handleLogin = async () => {
    if (!canSubmit) return;
    setError(null);
    setLoading(true);
    try {
      const res = await login({ phone: phone.trim() });
      setMerchant(res.merchant, res.token);
      nav.reset({ index: 0, routes: [{ name: 'MainTabs' }] });
    } catch (e) {
      setError('Login fail ho gaya. Dobara try karein. / Login failed. Retry.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <SafeAreaView className="flex-1 bg-bg">
      <KeyboardAvoidingView
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
        className="flex-1"
      >
        <View className="flex-1 px-6 justify-between">
          {/* Brand hero */}
          <View className="items-center pt-16">
            <View
              className="w-20 h-20 rounded-2xl items-center justify-center mb-5"
              style={{ backgroundColor: colors.paytmBlue }}
            >
              <Text style={{ color: '#FFFFFF', fontSize: 32, fontWeight: '800' }}>
                D
              </Text>
            </View>
            <Text
              style={{ color: colors.paytmBlueDark, fontSize: 28, fontWeight: '700' }}
            >
              Dukaan IQ
            </Text>
            <Text
              style={{ color: colors.textSecondary, fontSize: 15, marginTop: 6 }}
            >
              आपकी दुकान, अब और होशियार
            </Text>
            <Text
              style={{ color: colors.textSecondary, fontSize: 13, marginTop: 2 }}
            >
              Your shop, smarter
            </Text>
          </View>

          {/* Login form */}
          <View>
            <Text
              style={{ color: colors.textPrimary, fontSize: 18, fontWeight: '600', marginBottom: 12 }}
            >
              अपना नंबर डालें
            </Text>
            <Text
              style={{ color: colors.textSecondary, fontSize: 13, marginBottom: 8 }}
            >
              Enter your phone number
            </Text>

            <View
              className="flex-row items-center bg-surface border border-border"
              style={{ borderRadius: 12, paddingHorizontal: 14, height: 52 }}
            >
              <Text style={{ color: colors.textSecondary, fontSize: 16, marginRight: 8 }}>
                +91
              </Text>
              <TextInput
                value={phone}
                onChangeText={(t) => {
                  setPhone(t.replace(/[^0-9]/g, '').slice(0, 10));
                  if (error) setError(null);
                }}
                keyboardType="phone-pad"
                maxLength={10}
                editable={!loading}
                placeholder="9800000000"
                placeholderTextColor={colors.textSecondary}
                style={{
                  flex: 1,
                  color: colors.textPrimary,
                  fontSize: 17,
                  fontWeight: '500',
                  letterSpacing: 1,
                }}
              />
            </View>

            {error ? (
              <Text
                style={{ color: colors.danger, fontSize: 13, marginTop: 10 }}
                accessibilityRole="alert"
              >
                {error}
              </Text>
            ) : null}

            <TouchableOpacity
              onPress={handleLogin}
              disabled={!canSubmit}
              accessibilityRole="button"
              accessibilityLabel="Log in"
              accessibilityState={{ disabled: !canSubmit, busy: loading }}
              style={{
                marginTop: 20,
                height: 52,
                borderRadius: 12,
                backgroundColor: canSubmit ? colors.paytmBlue : colors.border,
                alignItems: 'center',
                justifyContent: 'center',
              }}
            >
              {loading ? (
                <ActivityIndicator color="#FFFFFF" />
              ) : (
                <>
                  <Text style={{ color: '#FFFFFF', fontSize: 16, fontWeight: '700' }}>
                    लॉगिन करें
                  </Text>
                  <Text style={{ color: '#FFFFFF', fontSize: 12, fontWeight: '400', opacity: 0.85 }}>
                    Log in
                  </Text>
                </>
              )}
            </TouchableOpacity>

            <Text
              style={{ color: colors.textSecondary, fontSize: 11, textAlign: 'center', marginTop: 12 }}
            >
              Demo mode · uses seeded Ramesh Kirana Store
            </Text>
          </View>

          {/* Footer */}
          <View className="items-center pb-4">
            <Text style={{ color: colors.textSecondary, fontSize: 12 }}>
              Powered by{' '}
              <Text style={{ color: colors.paytmBlueDark, fontWeight: '600' }}>Paytm</Text>
              {' + '}
              <Text style={{ color: colors.sarvamAccent, fontWeight: '600' }}>Sarvam</Text>
            </Text>
          </View>
        </View>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}
