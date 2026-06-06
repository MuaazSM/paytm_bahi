import React from 'react';
import { createNativeStackNavigator } from '@react-navigation/native-stack';

import OnboardingScreen from '../screens/OnboardingScreen';
import VoiceCaptureScreen from '../screens/VoiceCaptureScreen';
import ConfirmScreen from '../screens/ConfirmScreen';
import { MainTabs } from './MainTabs';
import type { RootStackParamList } from './types';

const Stack = createNativeStackNavigator<RootStackParamList>();

export function RootNavigator() {
  return (
    <Stack.Navigator
      initialRouteName="Onboarding"
      screenOptions={{ headerShown: false }}
    >
      <Stack.Screen name="Onboarding" component={OnboardingScreen} />
      <Stack.Screen name="MainTabs" component={MainTabs} />
      <Stack.Screen
        name="VoiceCapture"
        component={VoiceCaptureScreen}
        options={{ presentation: 'modal' }}
      />
      <Stack.Screen
        name="Confirm"
        component={ConfirmScreen}
        options={{ presentation: 'modal' }}
      />
    </Stack.Navigator>
  );
}
