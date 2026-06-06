import React from 'react';
import { View, TouchableOpacity } from 'react-native';
import { createBottomTabNavigator } from '@react-navigation/bottom-tabs';
import { useNavigation } from '@react-navigation/native';
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

function CustomTabBar({ state, descriptors, navigation }: any) {
  const rootNav = useNavigation<NativeStackNavigationProp<RootStackParamList>>();

  return (
    <View
      className="flex-row bg-surface border-t border-border"
      style={{ paddingBottom: 20, paddingTop: 8 }}
    >
      {state.routes.map((route: any, index: number) => {
        const { options } = descriptors[route.key];
        const isFocused = state.index === index;

        const onPress = () => {
          if (!isFocused) navigation.navigate(route.name);
        };

        const iconColor = isFocused ? colors.paytmBlue : colors.textSecondary;

        const Icon =
          route.name === 'Home'      ? Home :
          route.name === 'Inventory' ? Package :
          route.name === 'Insights'  ? BarChart2 :
          MessageCircle;

        const tabButton = (
          <TouchableOpacity
            key={route.key}
            onPress={onPress}
            className="flex-1 items-center"
            accessibilityLabel={options.tabBarAccessibilityLabel}
          >
            <Icon color={iconColor} size={24} />
          </TouchableOpacity>
        );

        if (index === 2) {
          return (
            <React.Fragment key={`frag-${route.key}`}>
              <View className="flex-1 items-center" style={{ marginTop: -20 }}>
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
