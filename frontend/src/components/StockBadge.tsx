import React from 'react';
import { View, Text } from 'react-native';
import { colors } from '../theme';

interface StockBadgeProps {
  stock: number;
  reorderPoint: number;
}

export function StockBadge({ stock, reorderPoint }: StockBadgeProps) {
  const color =
    stock === 0 ? colors.danger :
    stock <= reorderPoint ? colors.warning :
    colors.success;

  return (
    <View className="flex-row items-center gap-1">
      <View className="w-2 h-2 rounded-full" style={{ backgroundColor: color }} />
      <Text className="text-text-secondary text-xs">{stock}</Text>
    </View>
  );
}
