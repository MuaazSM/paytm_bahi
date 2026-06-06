import React from 'react';
import { View, Text, TouchableOpacity } from 'react-native';
import { createBottomTabNavigator } from '@react-navigation/bottom-tabs';
import { useNavigation } from '@react-navigation/native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import type { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { Home, Package, BarChart2, MessageCircle } from 'lucide-react-native';

import HomeScreen from '../screens/HomeScreen';
import InventoryScreen from '../screens/InventoryScreen';
import InsightsScreen from '../screens/InsightsScreen';
import AssistantScreen from '../screens/AssistantScreen';
import { MicFAB } from '../components/MicFAB';
import { colors } from '../theme';
import type { RootStackParamList, TabParamList } from './types';

const Tab = createBottomTabNavigator<TabParamList>();

const TAB_META: Record<
  keyof TabParamList,
  { icon: React.ComponentType<{ color: string; size: number }>; hi: string; en: string }
> = {
  Home:      { icon: Home,         hi: 'होम',        en: 'Home' },
  Inventory: { icon: Package,      hi: 'सामान',       en: 'Inventory' },
  Insights:  { icon: BarChart2,    hi: 'इनसाइट्स',    en: 'Insights' },
  Assistant: { icon: MessageCircle, hi: 'सहायक',      en: 'Assistant' },
};

function CustomTabBar({ state, descriptors, navigation }: any) {
  const rootNav = useNavigation<NativeStackNavigationProp<RootStackParamList>>();
  const insets = useSafeAreaInsets();

  return (
    <View
      className="flex-row bg-surface border-t border-border"
      style={{ paddingBottom: insets.bottom || 8, paddingTop: 8 }}
    >
      {state.routes.map((route: any, index: number) => {
        const { options } = descriptors[route.key];
        const isFocused = state.index === index;
        const meta = TAB_META[route.name as keyof TabParamList];
        const iconColor = isFocused ? colors.paytmBlue : colors.textSecondary;
        const Icon = meta.icon;

        const onPress = () => {
          if (!isFocused) navigation.navigate(route.name);
        };

        const tabButton = (
          <TouchableOpacity
            key={route.key}
            onPress={onPress}
            className="flex-1 items-center pt-1"
            accessibilityLabel={options.tabBarAccessibilityLabel ?? meta.en}
            accessibilityRole="tab"
            accessibilityState={{ selected: isFocused }}
          >
            <Icon color={iconColor} size={22} />
            <Text
              style={{ color: iconColor, fontSize: 12, fontWeight: '500', marginTop: 2 }}
              numberOfLines={1}
            >
              {meta.hi}
            </Text>
            <Text
              style={{ color: colors.textSecondary, fontSize: 10, fontWeight: '400' }}
              numberOfLines={1}
            >
              {meta.en}
            </Text>
          </TouchableOpacity>
        );

        if (index === 2) {
          return (
            <React.Fragment key={`frag-${route.key}`}>
              <View className="flex-1 items-center" style={{ marginTop: -24 }}>
                <MicFAB onPress={() => rootNav.navigate('VoiceCapture')} />
              </View>
              {tabButton}
            </React.Fragment>
          );
        }

        return tabButton;
      })}
    </View>
  );
}

export function MainTabs() {
  return (
    <Tab.Navigator
      tabBar={(props) => <CustomTabBar {...props} />}
      screenOptions={{ headerShown: false }}
    >
      <Tab.Screen name="Home" component={HomeScreen} />
      <Tab.Screen name="Inventory" component={InventoryScreen} />
      <Tab.Screen name="Insights" component={InsightsScreen} />
      <Tab.Screen name="Assistant" component={AssistantScreen} />
    </Tab.Navigator>
  );
}
