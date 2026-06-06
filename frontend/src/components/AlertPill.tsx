import React, { useState } from 'react';
import { Pressable, Text, View } from 'react-native';
import { Volume2, AlertTriangle, AlertOctagon, Info } from 'lucide-react-native';

import type { Alert } from '../api/types';
import { speakText } from '../api';
import { useMerchantStore } from '../store/merchantStore';
import { colors } from '../theme';

interface AlertPillProps {
  alert: Alert;
  /** Optional secondary tap handler (e.g. navigate to product). */
  onPress?: () => void;
}

const SEVERITY_BG: Record<Alert['severity'], string> = {
  info:     colors.paytmBlue,
  warning:  colors.warning,
  critical: colors.danger,
};

const SEVERITY_ICON: Record<Alert['severity'], React.ComponentType<{ color: string; size: number }>> = {
  info:     Info,
  warning:  AlertTriangle,
  critical: AlertOctagon,
};

/**
 * AlertPill — compact rounded pill for the Home alert strip.
 * Single tap: speak the alert's `spoken_message` via Bulbul TTS (the
 * "proactive voice alert" from the hero loop) and run optional onPress.
 */
export function AlertPill({ alert, onPress }: AlertPillProps) {
  const language = useMerchantStore((s) => s.merchant?.language);
  const [speaking, setSpeaking] = useState(false);
  const Icon = SEVERITY_ICON[alert.severity];

  const handlePress = async () => {
    onPress?.();
    if (!alert.spoken_message || speaking) return;
    setSpeaking(true);
    try {
      await speakText(alert.spoken_message, language);
      // Note: the audio URL is returned but actually playing it lives at the
      // call site that owns the audio player. Pill only triggers TTS.
    } catch {
      // Soft-fail — pill stays usable; never a dead end.
    } finally {
      setSpeaking(false);
    }
  };

  return (
    <Pressable
      onPress={handlePress}
      accessibilityRole="button"
      accessibilityLabel={`${alert.message}. Tap to hear.`}
      accessibilityState={{ busy: speaking }}
      style={({ pressed }) => ({
        backgroundColor: SEVERITY_BG[alert.severity],
        paddingHorizontal: 12,
        paddingVertical: 8,
        borderRadius: 9999,
        marginRight: 8,
        flexDirection: 'row',
        alignItems: 'center',
        opacity: pressed ? 0.85 : 1,
        minHeight: 32,
      })}
    >
      <Icon color="#FFFFFF" size={14} />
      <Text
        numberOfLines={1}
        style={{
          color: '#FFFFFF',
          fontSize: 12,
          fontWeight: '600',
          marginLeft: 6,
          marginRight: 6,
          maxWidth: 220,
        }}
      >
        {alert.message}
      </Text>
      <View style={{ opacity: speaking ? 1 : 0.7 }}>
        <Volume2 color="#FFFFFF" size={14} />
      </View>
    </Pressable>
  );
}
