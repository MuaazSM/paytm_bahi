import React, { useEffect, useRef } from 'react';
import { Animated, Easing, Pressable, View } from 'react-native';
import { Mic } from 'lucide-react-native';
import { colors } from '../theme';

interface MicFABProps {
  onPress: () => void;
  recording?: boolean;
  size?: number;
}

const SIZE_DEFAULT = 64;
const RING_COUNT = 3;

/**
 * MicFAB — primary voice action.
 * Resting: paytm-blue solid circle (app/payments world).
 * Recording: switches to sarvam-accent and emits three pulsing rings
 * (Sarvam orange waveform — AI/voice world).
 */
export function MicFAB({ onPress, recording = false, size = SIZE_DEFAULT }: MicFABProps) {
  const fill = recording ? colors.sarvamAccent : colors.paytmBlue;

  return (
    <View
      style={{
        width: size * 1.6,
        height: size * 1.6,
        alignItems: 'center',
        justifyContent: 'center',
      }}
    >
      {recording ? <PulseRings size={size} color={colors.sarvamAccent} /> : null}
      <Pressable
        onPress={onPress}
        accessibilityRole="button"
        accessibilityLabel={recording ? 'Stop recording' : 'Record sale'}
        accessibilityState={{ busy: recording }}
        style={({ pressed }) => ({
          width: size,
          height: size,
          borderRadius: size / 2,
          backgroundColor: fill,
          alignItems: 'center',
          justifyContent: 'center',
          transform: [{ scale: pressed ? 0.96 : 1 }],
          shadowColor: fill,
          shadowOpacity: 0.35,
          shadowRadius: 12,
          shadowOffset: { width: 0, height: 4 },
          elevation: 6,
        })}
      >
        <Mic color="#FFFFFF" size={Math.round(size * 0.44)} />
      </Pressable>
    </View>
  );
}

function PulseRings({ size, color }: { size: number; color: string }) {
  return (
    <>
      {Array.from({ length: RING_COUNT }).map((_, i) => (
        <PulseRing key={i} delay={i * 600} size={size} color={color} />
      ))}
    </>
  );
}

function PulseRing({
  delay,
  size,
  color,
}: {
  delay: number;
  size: number;
  color: string;
}) {
  const progress = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    const loop = Animated.loop(
      Animated.sequence([
        Animated.delay(delay),
        Animated.timing(progress, {
          toValue: 1,
          duration: 1800,
          easing: Easing.out(Easing.ease),
          useNativeDriver: true,
        }),
      ]),
    );
    loop.start();
    return () => loop.stop();
  }, [progress, delay]);

  const scale = progress.interpolate({ inputRange: [0, 1], outputRange: [1, 1.8] });
  const opacity = progress.interpolate({
    inputRange: [0, 0.1, 1],
    outputRange: [0, 0.55, 0],
  });

  return (
    <Animated.View
      pointerEvents="none"
      style={{
        position: 'absolute',
        width: size,
        height: size,
        borderRadius: size / 2,
        borderWidth: 3,
        borderColor: color,
        transform: [{ scale }],
        opacity,
      }}
    />
  );
}
