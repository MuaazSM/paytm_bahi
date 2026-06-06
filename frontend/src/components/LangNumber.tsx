import React from 'react';
import { Text, type StyleProp, type TextStyle } from 'react-native';
import { useMerchantStore } from '../store/merchantStore';

interface LangNumberProps {
  /** The number to render. */
  value: number;
  /** Optional prefix (e.g. "₹"). Not localised. */
  prefix?: string;
  /** Optional suffix (e.g. " पैकेट" or "kg"). */
  suffix?: string;
  /**
   * Treat `value` as paise and divide by 100 for display.
   * When true, fractional rupees are dropped (we display ₹X).
   */
  paise?: boolean;
  /**
   * Override the script. Defaults to the merchant's language —
   * hi-* / mr-* render Devanagari digits, everything else Latin.
   */
  language?: string;
  style?: StyleProp<TextStyle>;
}

// Hindu-Arabic 0–9 → Devanagari ०–९ (U+0966 … U+096F)
const DEVANAGARI = ['०', '१', '२', '३', '४', '५', '६', '७', '८', '९'] as const;

const toDevanagari = (s: string): string =>
  s.replace(/[0-9]/g, (d) => DEVANAGARI[Number(d)]);

const isDevanagariLang = (lang: string): boolean =>
  lang.startsWith('hi') || lang.startsWith('mr') || lang.startsWith('ne');

/**
 * LangNumber — renders a number with the script appropriate for the merchant.
 * Hindi/Marathi → Devanagari digits with Indian thousands grouping.
 * Other languages → Latin digits with Indian thousands grouping.
 * `paise` divides by 100 first; UI is the only place this conversion happens.
 */
export function LangNumber({
  value,
  prefix = '',
  suffix = '',
  paise = false,
  language,
  style,
}: LangNumberProps) {
  const merchantLang = useMerchantStore((s) => s.merchant?.language ?? 'en-IN');
  const lang = language ?? merchantLang;

  const display = paise ? Math.round(value / 100) : value;
  // 'en-IN' gives Indian thousands grouping (1,00,000); we only swap digits.
  let formatted = display.toLocaleString('en-IN');
  if (isDevanagariLang(lang)) formatted = toDevanagari(formatted);

  return (
    <Text style={style}>
      {prefix}
      {formatted}
      {suffix}
    </Text>
  );
}
