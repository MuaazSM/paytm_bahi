import React from 'react';
import { TouchableOpacity } from 'react-native';
import { Mic } from 'lucide-react-native';
import { colors } from '../theme';

interface MicFABProps {
  onPress: () => void;
  recording?: boolean;
}

export function MicFAB({ onPress, recording = false }: MicFABProps) {
  return (
    <TouchableOpacity
      onPress={onPress}
      className="w-16 h-16 rounded-full items-center justify-center"
      style={{ backgroundColor: recording ? colors.sarvamAccent : colors.paytmBlue }}
      accessibilityLabel="Record sale"
    >
      <Mic color="#FFFFFF" size={28} />
    </TouchableOpacity>
  );
}
