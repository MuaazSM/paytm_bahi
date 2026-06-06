import React from 'react';
import { View, Text } from 'react-native';
import { colors } from '../theme';
import { LangNumber } from './LangNumber';

interface StockBadgeProps {
  stock: number;
  reorderPoint: number;
  /** Optional unit suffix (e.g. "packets", "kg"). */
  unit?: string;
}

type StockStatus = 'ok' | 'low' | 'out';

const statusOf = (stock: number, reorderPoint: number): StockStatus => {
  if (stock <= 0) return 'out';
  if (stock <= reorderPoint) return 'low';
  return 'ok';
};

const COLOR: Record<StockStatus, string> = {
  ok:  colors.success,
  low: colors.warning,
  out: colors.danger,
};

const A11Y: Record<StockStatus, string> = {
  ok:  'in stock',
  low: 'running low',
  out: 'out of stock',
};

/**
 * StockBadge — dot + count.
 * Green when above reorder_point, amber when at/below, red when zero.
 */
export function StockBadge({ stock, reorderPoint, unit }: StockBadgeProps) {
  const status = statusOf(stock, reorderPoint);
  return (
    <View
      className="flex-row items-center"
      accessibilityRole="text"
      accessibilityLabel={`Stock ${stock}${unit ? ' ' + unit : ''}, ${A11Y[status]}`}
    >
      <View
        style={{
          width: 8,
          height: 8,
          borderRadius: 4,
          backgroundColor: COLOR[status],
          marginRight: 6,
        }}
      />
      <LangNumber
        value={stock}
        suffix={unit ? ` ${unit}` : ''}
        style={{ color: colors.textSecondary, fontSize: 12, fontWeight: '500' }}
      />
    </View>
  );
}
