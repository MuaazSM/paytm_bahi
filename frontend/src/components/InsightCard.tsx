import React from 'react';
import { View, Text, Pressable } from 'react-native';
import { ChevronRight, type LucideIcon } from 'lucide-react-native';
import { colors } from '../theme';

export type InsightTone = 'info' | 'success' | 'warning' | 'danger';

interface InsightCardProps {
  icon: LucideIcon;
  title: string;
  /** Hero number / metric (e.g. "Parle-G — 3 left"). */
  value: string;
  /** One-line plain-language takeaway under the value. */
  takeaway: string;
  actionLabel: string;
  onAction: () => void;
  /** Semantic tone — drives icon tint and the action button color. */
  tone?: InsightTone;
}

const TONE: Record<InsightTone, { fg: string; bg: string }> = {
  info:    { fg: colors.paytmBlue,    bg: colors.paytmSkyTint },
  success: { fg: colors.success,      bg: '#E8F6EE' },
  warning: { fg: colors.warning,      bg: '#FDF2DC' },
  danger:  { fg: colors.danger,       bg: '#FDE6E7' },
};

/**
 * InsightCard — every insight ends in a verb (Reorder / Discount / Bundle).
 * Tone drives the leading icon tint and the action button color so it reads
 * at a glance.
 */
export function InsightCard({
  icon: Icon,
  title,
  value,
  takeaway,
  actionLabel,
  onAction,
  tone = 'info',
}: InsightCardProps) {
  const { fg, bg } = TONE[tone];

  return (
    <View
      style={{
        backgroundColor: colors.surface,
        borderRadius: 16,
        padding: 16,
        margin: 8,
        flex: 1,
        borderWidth: 1,
        borderColor: colors.border,
      }}
    >
      <View style={{ flexDirection: 'row', alignItems: 'center', marginBottom: 10 }}>
        <View
          style={{
            width: 32,
            height: 32,
            borderRadius: 8,
            backgroundColor: bg,
            alignItems: 'center',
            justifyContent: 'center',
            marginRight: 10,
          }}
        >
          <Icon color={fg} size={18} />
        </View>
        <Text
          style={{ color: colors.textSecondary, fontSize: 13, fontWeight: '500', flex: 1 }}
          numberOfLines={1}
        >
          {title}
        </Text>
      </View>

      <Text
        style={{ color: colors.textPrimary, fontSize: 18, fontWeight: '700', marginBottom: 4 }}
        numberOfLines={2}
      >
        {value}
      </Text>
      <Text
        style={{ color: colors.textSecondary, fontSize: 13, fontWeight: '400', lineHeight: 18 }}
        numberOfLines={2}
      >
        {takeaway}
      </Text>

      <Pressable
        onPress={onAction}
        accessibilityRole="button"
        accessibilityLabel={actionLabel}
        style={({ pressed }) => [
          {
            marginTop: 14,
            alignSelf: 'flex-start',
            flexDirection: 'row',
            alignItems: 'center',
            paddingVertical: 8,
            paddingHorizontal: 12,
            borderRadius: 12,
            minHeight: 36,
          },
          pressed && { backgroundColor: colors.paytmSkyTint },
        ]}
      >
        <Text style={{ color: fg, fontSize: 14, fontWeight: '700', marginRight: 2 }}>
          {actionLabel}
        </Text>
        <ChevronRight color={fg} size={16} />
      </Pressable>
    </View>
  );
}
