import React from 'react';
import { View, Text, TouchableOpacity } from 'react-native';

interface InsightCardProps {
  title: string;
  value: string;
  takeaway: string;
  actionLabel: string;
  onAction: () => void;
}

export function InsightCard({ title, value, takeaway, actionLabel, onAction }: InsightCardProps) {
  return (
    <View className="bg-surface rounded-2xl p-4 m-2 flex-1">
      <Text className="text-text-secondary text-sm">{title}</Text>
      <Text className="text-text-primary text-xl font-bold mt-1">{value}</Text>
      <Text className="text-text-secondary text-sm mt-1">{takeaway}</Text>
      <TouchableOpacity onPress={onAction} className="mt-3">
        <Text className="text-paytm-blue font-semibold text-sm">{actionLabel}</Text>
      </TouchableOpacity>
    </View>
  );
}
