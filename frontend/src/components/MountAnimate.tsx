import React, { useEffect, useRef } from 'react';
import { Animated, Easing } from 'react-native';

interface MountAnimateProps {
  children: React.ReactNode;
  /** Distance (in dp) the child travels on entry. Default 24 (right→0). */
  from?: number;
  /** ms before the entry begins. Stagger lists by passing index * step. */
  delay?: number;
  duration?: number;
}

/**
 * Slide-in-from-right + fade-in for any child on mount.
 * Used for the AlertPills entering the Home strip — per DESIGN.md §7
 * the new reorder pill should "animate into the Home strip" after a
 * confirmed sale tips the reorder threshold.
 */
export function MountAnimate({
  children,
  from = 24,
  delay = 0,
  duration = 320,
}: MountAnimateProps) {
  const t = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    Animated.timing(t, {
      toValue: 1,
      duration,
      delay,
      easing: Easing.out(Easing.cubic),
      useNativeDriver: true,
    }).start();
  }, [t, delay, duration]);

  const translateX = t.interpolate({ inputRange: [0, 1], outputRange: [from, 0] });

  return (
    <Animated.View style={{ opacity: t, transform: [{ translateX }] }}>
      {children}
    </Animated.View>
  );
}
