import React from 'react';
import { View, Text } from 'react-native';
import type { DraftLineItem } from '../api/types';

interface LineItemRowProps {
  item: DraftLineItem;
}

export function LineItemRow({ item }: LineItemRowProps) {
  return (
    <View className="flex-row justify-between py-2">
      <Text className="text-text-primary">
        {item.qty} {item.unit} · {item.matched_name}
      </Text>
      <Text className="text-text-primary font-semibold">
        ₹{(item.line_total / 100).toFixed(0)}
      </Text>
    </View>
  );
}
