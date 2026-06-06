import React from 'react';
import { createNativeStackNavigator } from '@react-navigation/native-stack';

import OnboardingScreen from '../screens/OnboardingScreen';
import VoiceCaptureScreen from '../screens/VoiceCaptureScreen';
import ConfirmScreen from '../screens/ConfirmScreen';
import OcrCaptureScreen from '../screens/OcrCaptureScreen';
import { MainTabs } from './MainTabs';
import type { RootStackParamList } from './types';

const Stack = createNativeStackNavigator<RootStackParamList>();

export function RootNavigator() {
  return (
    <Stack.Navigator
      // Demo mode: skip Onboarding and land on the dashboard directly.
      // merchantStore is pre-seeded with the demo merchant so screens that
      // read merchant.name / merchant.language render correctly.
      initialRouteName="MainTabs"
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
      <Stack.Screen
        name="OcrCapture"
        component={OcrCaptureScreen}
        options={{ presentation: 'modal' }}
      />
    </Stack.Navigator>
  );
}
