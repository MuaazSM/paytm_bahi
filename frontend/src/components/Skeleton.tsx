import React, { useEffect, useRef } from 'react';
import { Animated, Easing, type ViewStyle, type StyleProp } from 'react-native';
import { colors } from '../theme';

interface SkeletonProps {
  height?: number;
  width?: number | `${number}%`;
  radius?: number;
  /** Stagger the pulse so adjacent skeletons don't all flash in sync. */
  delay?: number;
  style?: StyleProp<ViewStyle>;
}

/**
 * Animated loading placeholder. Opacity loops between 0.45 and 0.85 with
 * a 900ms ease-in-out cycle — subtle enough that it reads as "loading"
 * without becoming visual noise on the screen.
 */
export function Skeleton({
  height = 16,
  width,
  radius = 12,
  delay = 0,
  style,
}: SkeletonProps) {
  const pulse = useRef(new Animated.Value(0.45)).current;

  useEffect(() => {
    const loop = Animated.loop(
      Animated.sequence([
        Animated.delay(delay),
        Animated.timing(pulse, {
          toValue: 0.85,
          duration: 900,
          easing: Easing.inOut(Easing.ease),
          useNativeDriver: true,
        }),
        Animated.timing(pulse, {
          toValue: 0.45,
          duration: 900,
          easing: Easing.inOut(Easing.ease),
          useNativeDriver: true,
        }),
      ]),
    );
    loop.start();
    return () => loop.stop();
  }, [pulse, delay]);

  return (
    <Animated.View
      style={[
        {
          height,
          width,
          borderRadius: radius,
          backgroundColor: colors.surface,
          borderWidth: 1,
          borderColor: colors.border,
          opacity: pulse,
        },
        style,
      ]}
    />
  );
}
