import React, { useState } from 'react';
import { View, Text, TextInput, Pressable } from 'react-native';
import { AlertCircle, Trash2 } from 'lucide-react-native';

import type { DraftLineItem, Unit } from '../api/types';
import { colors } from '../theme';
import { LangNumber } from './LangNumber';

interface LineItemRowProps {
  item: DraftLineItem;
  /** Called with the patch when qty or unit_price changes; parent recomputes line_total. */
  onChange: (patch: Partial<DraftLineItem>) => void;
  /** Tapped when the matched_name pill is pressed — open a SKU reassignment sheet. */
  onReassign?: () => void;
  onRemove?: () => void;
}

const LOW_CONFIDENCE = 0.7;

// Parse a typed-in qty/price string into a number; allow decimals for qty (e.g. 1.5 kg).
const parseQty = (s: string): number => {
  const n = parseFloat(s.replace(/[^\d.]/g, ''));
  return Number.isFinite(n) && n >= 0 ? n : 0;
};
const parseRupees = (s: string): number => {
  // Strip ₹, commas, spaces — convert rupee input to paise (×100).
  const n = parseFloat(s.replace(/[^\d.]/g, ''));
  if (!Number.isFinite(n) || n < 0) return 0;
  return Math.round(n * 100);
};

const computeTotal = (qty: number, unit_price: number): number =>
  Math.round(qty * unit_price);

/**
 * LineItemRow — one editable row inside the confirmation card.
 * Layout:  [• name pill] [qty input] [unit] · ₹[price input]  ………  ₹[total]   [✕]
 * The leading amber dot appears when match_confidence < 0.7 — tap the name
 * pill to reassign the SKU.
 */
export function LineItemRow({
  item,
  onChange,
  onReassign,
  onRemove,
}: LineItemRowProps) {
  const lowConfidence = item.match_confidence < LOW_CONFIDENCE || item.product_id == null;
  const [qtyStr, setQtyStr] = useState(String(item.qty));
  const [priceStr, setPriceStr] = useState(((item.unit_price / 100) || 0).toFixed(0));

  const commitQty = () => {
    const qty = parseQty(qtyStr);
    onChange({ qty, line_total: computeTotal(qty, item.unit_price) });
    setQtyStr(String(qty));
  };
  const commitPrice = () => {
    const unit_price = parseRupees(priceStr);
    onChange({ unit_price, line_total: computeTotal(item.qty, unit_price) });
    setPriceStr(((unit_price / 100) || 0).toFixed(0));
  };

  return (
    <View
      style={{
        flexDirection: 'row',
        alignItems: 'center',
        paddingVertical: 12,
        paddingHorizontal: 8,
        borderBottomWidth: 1,
        borderBottomColor: colors.border,
        minHeight: 56,
      }}
    >
      {/* Qty + unit */}
      <View style={{ flexDirection: 'row', alignItems: 'center', marginRight: 8 }}>
        <TextInput
          value={qtyStr}
          onChangeText={setQtyStr}
          onBlur={commitQty}
          keyboardType="decimal-pad"
          accessibilityLabel="Quantity"
          style={{
            minWidth: 36,
            textAlign: 'center',
            color: colors.textPrimary,
            fontSize: 16,
            fontWeight: '700',
            backgroundColor: colors.bg,
            borderRadius: 8,
            paddingVertical: 6,
            paddingHorizontal: 8,
          }}
        />
        <Text
          style={{
            color: colors.textSecondary,
            fontSize: 12,
            fontWeight: '500',
            marginLeft: 6,
          }}
        >
          {item.unit as Unit}
        </Text>
      </View>

      {/* Name pill (tap to reassign when low confidence) */}
      <Pressable
        onPress={lowConfidence ? onReassign : undefined}
        disabled={!lowConfidence}
        accessibilityRole={lowConfidence ? 'button' : 'text'}
        accessibilityLabel={
          lowConfidence
            ? `${item.matched_name}. Low confidence match. Tap to reassign.`
            : item.matched_name
        }
        style={{
          flex: 1,
          flexDirection: 'row',
          alignItems: 'center',
          marginRight: 8,
        }}
      >
        {lowConfidence ? (
          <AlertCircle
            color={colors.warning}
            size={14}
            // Amber dot is the affordance per DESIGN.md §6.2
          />
        ) : null}
        <Text
          numberOfLines={1}
          style={{
            color: colors.textPrimary,
            fontSize: 15,
            fontWeight: '500',
            marginLeft: lowConfidence ? 6 : 0,
            textDecorationLine: lowConfidence ? 'underline' : 'none',
          }}
        >
          {item.matched_name}
        </Text>
      </Pressable>

      {/* Unit price */}
      <View style={{ flexDirection: 'row', alignItems: 'center', marginRight: 8 }}>
        <Text style={{ color: colors.textSecondary, fontSize: 14 }}>₹</Text>
        <TextInput
          value={priceStr}
          onChangeText={setPriceStr}
          onBlur={commitPrice}
          keyboardType="numeric"
          accessibilityLabel="Unit price in rupees"
          style={{
            minWidth: 44,
            textAlign: 'right',
            color: colors.textSecondary,
            fontSize: 13,
            fontWeight: '500',
            paddingVertical: 4,
            paddingHorizontal: 2,
          }}
        />
      </View>

      {/* Line total (read-only, derived) */}
      <LangNumber
        value={item.line_total}
        paise
        prefix="₹"
        style={{
          color: colors.textPrimary,
          fontSize: 17,
          fontWeight: '700',
          minWidth: 60,
          textAlign: 'right',
        }}
      />

      {onRemove ? (
        <Pressable
          onPress={onRemove}
          accessibilityRole="button"
          accessibilityLabel="Remove line item"
          style={{ marginLeft: 8, padding: 6 }}
          hitSlop={8}
        >
          <Trash2 color={colors.textSecondary} size={16} />
        </Pressable>
      ) : null}
    </View>
  );
}
