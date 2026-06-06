import React from 'react';
import { TouchableOpacity, Text } from 'react-native';
import type { Alert } from '../api/types';
import { colors } from '../theme';

interface AlertPillProps {
  alert: Alert;
  onPress: () => void;
}

const severityColor: Record<Alert['severity'], string> = {
  info:     colors.paytmBlue,
  warning:  colors.warning,
  critical: colors.danger,
};

export function AlertPill({ alert, onPress }: AlertPillProps) {
  return (
    <TouchableOpacity
      onPress={onPress}
      className="rounded-full px-3 py-1 mr-2"
      style={{ backgroundColor: severityColor[alert.severity] }}
    >
      <Text className="text-white text-xs font-medium">{alert.message}</Text>
    </TouchableOpacity>
  );
}
