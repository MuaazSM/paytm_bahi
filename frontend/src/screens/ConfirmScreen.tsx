import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import {
  View,
  Text,
  ScrollView,
  Pressable,
  ActivityIndicator,
  Modal,
  FlatList,
  StyleSheet,
  Animated,
  Easing,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useNavigation } from '@react-navigation/native';
import type { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { X, Check, AlertCircle, Search } from 'lucide-react-native';

import {
  confirmSale,
  speakText,
  getProducts,
} from '../api';
import type {
  Alert,
  ConfirmLineItem,
  DraftLineItem,
  Product,
} from '../api/types';
import { useDraftSaleStore } from '../store/draftSaleStore';
import { useMerchantStore } from '../store/merchantStore';
import { useAlertStore } from '../store/alertStore';
import { useInventoryStore } from '../store/inventoryStore';
import { LineItemRow } from '../components/LineItemRow';
import { LangNumber } from '../components/LangNumber';
import { colors } from '../theme';
import type { RootStackParamList } from '../navigation/types';

type Status = 'editing' | 'saving' | 'success' | 'error';

export default function ConfirmScreen() {
  const nav = useNavigation<NativeStackNavigationProp<RootStackParamList>>();

  const draft = useDraftSaleStore((s) => s.draft);
  const updateLineItem = useDraftSaleStore((s) => s.updateLineItem);
  const clearDraft = useDraftSaleStore((s) => s.clearDraft);
  const merchantLang = useMerchantStore((s) => s.merchant?.language ?? 'hi-IN');
  const addAlerts = useAlertStore((s) => s.addAlerts);
  const inventoryProducts = useInventoryStore((s) => s.products);
  const setProducts = useInventoryStore((s) => s.setProducts);
  const updateProduct = useInventoryStore((s) => s.updateProduct);

  const [status, setStatus] = useState<Status>('editing');
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [reassignIndex, setReassignIndex] = useState<number | null>(null);

  // Lazy-load catalog for the reassignment picker
  useEffect(() => {
    if (inventoryProducts.length === 0) {
      getProducts().then((r) => setProducts(r.products)).catch(() => undefined);
    }
  }, [inventoryProducts.length, setProducts]);

  // Bounce back home if we landed here with no draft
  useEffect(() => {
    if (!draft) {
      nav.reset({ index: 0, routes: [{ name: 'MainTabs' }] });
    }
  }, [draft, nav]);

  const blockedReason = useMemo(() => {
    if (!draft || draft.line_items.length === 0) return 'No items detected';
    const unmatched = draft.line_items.some(
      (li) => li.product_id == null || li.match_confidence < 0.7,
    );
    if (unmatched) return 'Tap amber items to assign correct SKU';
    const zero = draft.line_items.some((li) => li.qty <= 0 || li.unit_price <= 0);
    if (zero) return 'Quantity and price must be greater than zero';
    return null;
  }, [draft]);

  const handleConfirm = useCallback(async () => {
    if (!draft || blockedReason) return;
    setStatus('saving');
    setErrorMsg(null);

    const payload: ConfirmLineItem[] = draft.line_items.map((li) => ({
      // product_id is guaranteed non-null here because blockedReason gates it
      product_id: li.product_id as number,
      qty: li.qty,
      unit: li.unit,
      unit_price: li.unit_price,
    }));

    try {
      const res = await confirmSale({
        source: draft.source === 'ocr' ? 'ocr' : 'voice',
        raw_input: draft.transcript,
        line_items: payload,
      });

      // Mirror stock decrements + alerts into the local stores
      res.stock_updates.forEach((u) =>
        updateProduct(u.product_id, { current_stock: u.new_stock }),
      );
      if (res.alerts.length > 0) {
        addAlerts(res.alerts);
        // Fire and forget — the alert pill also offers TTS; this auto-speaks
        // the first proactive alert on confirm, like the demo script wants.
        res.alerts.forEach((a: Alert) => {
          if (a.spoken_message) speakText(a.spoken_message, merchantLang).catch(() => undefined);
        });
      }

      setStatus('success');
      // Brief success state, then home
      setTimeout(() => {
        clearDraft();
        nav.reset({ index: 0, routes: [{ name: 'MainTabs' }] });
      }, 900);
    } catch {
      setStatus('error');
      setErrorMsg('सेव नहीं हुआ / Could not save sale. Try again.');
    }
  }, [
    draft,
    blockedReason,
    addAlerts,
    updateProduct,
    merchantLang,
    clearDraft,
    nav,
  ]);

  const handleCancel = () => {
    clearDraft();
    nav.goBack();
  };

  const handleReassignPick = (product: Product) => {
    if (reassignIndex == null) return;
    const li = draft?.line_items[reassignIndex];
    if (!li) return;
    const unit_price = li.unit_price > 0 ? li.unit_price : product.selling_price;
    updateLineItem(reassignIndex, {
      product_id: product.id,
      matched_name: product.name,
      unit: product.unit,
      unit_price,
      line_total: Math.round(li.qty * unit_price),
      match_confidence: 1,
    });
    setReassignIndex(null);
  };

  if (!draft) return null;

  const total = draft.line_items.reduce((s, li) => s + li.line_total, 0);

  return (
    <SafeAreaView style={styles.root}>
      <Header onClose={handleCancel} />
      {draft.transcript ? <TranscriptChip transcript={draft.transcript} /> : null}
      {draft.needs_clarification ? (
        <ClarifyBanner clarification={draft.clarification} />
      ) : null}

      <ScrollView style={styles.list} contentContainerStyle={{ paddingBottom: 16 }}>
        {draft.line_items.length === 0 ? (
          <EmptyDraft />
        ) : (
          draft.line_items.map((item, idx) => (
            <LineItemRow
              key={`${item.product_id ?? 'none'}-${idx}`}
              item={item}
              onChange={(patch) => updateLineItem(idx, patch)}
              onReassign={() => setReassignIndex(idx)}
              onRemove={() =>
                updateLineItem(idx, { qty: 0, line_total: 0 })
              }
            />
          ))
        )}
      </ScrollView>

      <Footer
        total={total}
        status={status}
        blockedReason={blockedReason}
        errorMsg={errorMsg}
        onConfirm={handleConfirm}
        onCancel={handleCancel}
      />

      {status === 'success' ? <SuccessOverlay /> : null}

      <ReassignPicker
        visible={reassignIndex != null}
        products={inventoryProducts}
        onPick={handleReassignPick}
        onClose={() => setReassignIndex(null)}
      />
    </SafeAreaView>
  );
}

// -----------------------------------------------------------------------------
// Subcomponents
// -----------------------------------------------------------------------------

function Header({ onClose }: { onClose: () => void }) {
  return (
    <View style={styles.header}>
      <View>
        <Text style={styles.headerTitle}>यह सही है?</Text>
        <Text style={styles.headerCaption}>Is this right?</Text>
      </View>
      <Pressable
        onPress={onClose}
        accessibilityRole="button"
        accessibilityLabel="Cancel and close"
        hitSlop={12}
        style={styles.closeBtn}
      >
        <X color={colors.textSecondary} size={24} />
      </Pressable>
    </View>
  );
}

function TranscriptChip({ transcript }: { transcript: string }) {
  return (
    <View style={styles.transcriptChip}>
      <Text style={styles.transcriptLabel}>आपने कहा / You said</Text>
      <Text style={styles.transcriptText}>"{transcript}"</Text>
    </View>
  );
}

function ClarifyBanner({ clarification }: { clarification: string | null }) {
  return (
    <View style={styles.clarifyBanner}>
      <AlertCircle color={colors.warning} size={16} />
      <Text style={styles.clarifyText}>
        {clarification ?? 'Some items were unclear — please review before confirming.'}
      </Text>
    </View>
  );
}

function EmptyDraft() {
  return (
    <View style={styles.emptyBox}>
      <Text style={styles.emptyTitle}>कोई सामान नहीं मिला</Text>
      <Text style={styles.emptyCaption}>
        No line items were detected. Cancel and try recording again.
      </Text>
    </View>
  );
}

function Footer({
  total,
  status,
  blockedReason,
  errorMsg,
  onConfirm,
  onCancel,
}: {
  total: number;
  status: Status;
  blockedReason: string | null;
  errorMsg: string | null;
  onConfirm: () => void;
  onCancel: () => void;
}) {
  const isSaving = status === 'saving';
  const isError = status === 'error';
  const canConfirm = !blockedReason && !isSaving && status !== 'success';

  return (
    <View style={styles.footer}>
      <View style={styles.totalRow}>
        <Text style={styles.totalLabel}>कुल · Total</Text>
        <LangNumber
          value={total}
          paise
          prefix="₹"
          style={styles.totalValue}
        />
      </View>

      {blockedReason ? (
        <Text style={styles.blockedReason}>{blockedReason}</Text>
      ) : null}
      {isError && errorMsg ? (
        <Text style={styles.errorMsg}>{errorMsg}</Text>
      ) : null}

      <View style={styles.buttonRow}>
        <Pressable
          onPress={onCancel}
          accessibilityRole="button"
          accessibilityLabel="Cancel"
          style={({ pressed }) => [
            styles.cancelBtn,
            { borderColor: pressed ? colors.textPrimary : colors.border },
          ]}
          disabled={isSaving}
        >
          <Text style={styles.cancelText}>Cancel · रद्द</Text>
        </Pressable>
        <Pressable
          onPress={onConfirm}
          accessibilityRole="button"
          accessibilityLabel="Confirm sale"
          accessibilityState={{ disabled: !canConfirm, busy: isSaving }}
          disabled={!canConfirm}
          style={({ pressed }) => [
            styles.confirmBtn,
            {
              backgroundColor: !canConfirm
                ? colors.border
                : pressed
                ? colors.paytmBlueDark
                : colors.paytmBlue,
            },
          ]}
        >
          {isSaving ? (
            <ActivityIndicator color="#FFFFFF" />
          ) : (
            <>
              <Text style={styles.confirmText}>Confirm</Text>
              <Text style={styles.confirmTextHi}>पक्का करें</Text>
            </>
          )}
        </Pressable>
      </View>
    </View>
  );
}

function SuccessOverlay() {
  const fade = useRef(new Animated.Value(0)).current;
  const scale = useRef(new Animated.Value(0.2)).current;
  const lift = useRef(new Animated.Value(8)).current;

  useEffect(() => {
    Animated.parallel([
      Animated.timing(fade, {
        toValue: 1,
        duration: 180,
        easing: Easing.out(Easing.ease),
        useNativeDriver: true,
      }),
      Animated.spring(scale, {
        toValue: 1,
        friction: 5,
        tension: 120,
        useNativeDriver: true,
      }),
      Animated.timing(lift, {
        toValue: 0,
        duration: 280,
        easing: Easing.out(Easing.cubic),
        useNativeDriver: true,
      }),
    ]).start();
  }, [fade, scale, lift]);

  return (
    <Animated.View style={[styles.successOverlay, { opacity: fade }]} pointerEvents="none">
      <Animated.View style={[styles.successCircle, { transform: [{ scale }] }]}>
        <Check color="#FFFFFF" size={48} strokeWidth={3} />
      </Animated.View>
      <Animated.Text style={[styles.successText, { transform: [{ translateY: lift }] }]}>
        हो गया!
      </Animated.Text>
      <Animated.Text style={[styles.successCaption, { transform: [{ translateY: lift }] }]}>
        Sale saved
      </Animated.Text>
    </Animated.View>
  );
}

function ReassignPicker({
  visible,
  products,
  onPick,
  onClose,
}: {
  visible: boolean;
  products: Product[];
  onPick: (p: Product) => void;
  onClose: () => void;
}) {
  const [query, setQuery] = useState('');
  const filtered = useMemo(() => {
    if (!query.trim()) return products;
    const q = query.toLowerCase();
    return products.filter((p) => p.name.toLowerCase().includes(q));
  }, [products, query]);

  return (
    <Modal
      visible={visible}
      animationType="slide"
      transparent
      onRequestClose={onClose}
    >
      <Pressable style={styles.pickerBackdrop} onPress={onClose}>
        <Pressable style={styles.pickerSheet} onPress={() => undefined}>
          <View style={styles.pickerHandle} />
          <Text style={styles.pickerTitle}>सही सामान चुनें · Pick item</Text>
          <View style={styles.searchRow}>
            <Search color={colors.textSecondary} size={16} />
            <Text
              style={styles.searchPlaceholder}
              onPress={() => undefined}
            >
              {query || `Search ${products.length} items`}
            </Text>
          </View>
          <FlatList
            data={filtered}
            keyExtractor={(p) => String(p.id)}
            keyboardShouldPersistTaps="handled"
            ItemSeparatorComponent={() => (
              <View style={{ height: 1, backgroundColor: colors.border }} />
            )}
            renderItem={({ item }) => (
              <Pressable
                onPress={() => onPick(item)}
                style={({ pressed }) => [
                  styles.pickerRow,
                  { backgroundColor: pressed ? colors.paytmSkyTint : 'transparent' },
                ]}
                accessibilityRole="button"
                accessibilityLabel={`Assign ${item.name}`}
              >
                <View style={{ flex: 1 }}>
                  <Text style={styles.pickerName}>{item.name}</Text>
                  <Text style={styles.pickerMeta}>
                    {item.category} · {item.unit}
                  </Text>
                </View>
                <LangNumber
                  value={item.selling_price}
                  paise
                  prefix="₹"
                  style={styles.pickerPrice}
                />
              </Pressable>
            )}
            ListEmptyComponent={
              <Text style={styles.pickerEmpty}>No products loaded</Text>
            }
          />
        </Pressable>
      </Pressable>
    </Modal>
  );
}

// -----------------------------------------------------------------------------
// Styles
// -----------------------------------------------------------------------------

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: colors.bg },

  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 20,
    paddingVertical: 12,
  },
  headerTitle: { color: colors.paytmBlueDark, fontSize: 22, fontWeight: '700' },
  headerCaption: { color: colors.textSecondary, fontSize: 13, marginTop: 2 },
  closeBtn: { padding: 8 },

  transcriptChip: {
    marginHorizontal: 16,
    marginBottom: 8,
    padding: 12,
    backgroundColor: colors.paytmSkyTint,
    borderRadius: 12,
  },
  transcriptLabel: {
    color: colors.paytmBlueDark,
    fontSize: 11,
    fontWeight: '600',
    marginBottom: 2,
  },
  transcriptText: {
    color: colors.textPrimary,
    fontSize: 14,
    fontStyle: 'italic',
  },

  clarifyBanner: {
    flexDirection: 'row',
    alignItems: 'center',
    marginHorizontal: 16,
    marginBottom: 8,
    padding: 10,
    backgroundColor: '#FDF2DC',
    borderRadius: 12,
  },
  clarifyText: {
    color: colors.textPrimary,
    fontSize: 13,
    marginLeft: 8,
    flex: 1,
  },

  list: {
    flex: 1,
    backgroundColor: colors.surface,
    marginHorizontal: 16,
    marginTop: 4,
    borderRadius: 16,
    borderWidth: 1,
    borderColor: colors.border,
  },

  emptyBox: { padding: 32, alignItems: 'center' },
  emptyTitle: { color: colors.textPrimary, fontSize: 16, fontWeight: '600' },
  emptyCaption: {
    color: colors.textSecondary,
    fontSize: 13,
    marginTop: 4,
    textAlign: 'center',
  },

  footer: {
    padding: 16,
    paddingTop: 12,
    backgroundColor: colors.surface,
    borderTopWidth: 1,
    borderTopColor: colors.border,
  },
  totalRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'baseline',
    marginBottom: 8,
  },
  totalLabel: { color: colors.textSecondary, fontSize: 14, fontWeight: '500' },
  totalValue: {
    color: colors.textPrimary,
    fontSize: 28,
    fontWeight: '800',
    letterSpacing: -0.5,
  },
  blockedReason: {
    color: colors.warning,
    fontSize: 12,
    fontWeight: '500',
    marginBottom: 8,
  },
  errorMsg: {
    color: colors.danger,
    fontSize: 13,
    fontWeight: '500',
    marginBottom: 8,
  },
  buttonRow: { flexDirection: 'row', gap: 8 },
  cancelBtn: {
    flex: 1,
    borderRadius: 12,
    borderWidth: 1.5,
    backgroundColor: colors.surface,
    alignItems: 'center',
    justifyContent: 'center',
    minHeight: 52,
  },
  cancelText: { color: colors.textPrimary, fontSize: 15, fontWeight: '600' },
  confirmBtn: {
    flex: 2,
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
    minHeight: 52,
    flexDirection: 'column',
  },
  confirmText: { color: '#FFFFFF', fontSize: 16, fontWeight: '700' },
  confirmTextHi: { color: '#FFFFFF', fontSize: 11, fontWeight: '400', opacity: 0.85 },

  successOverlay: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    backgroundColor: 'rgba(255,255,255,0.95)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  successCircle: {
    width: 96,
    height: 96,
    borderRadius: 48,
    backgroundColor: colors.success,
    alignItems: 'center',
    justifyContent: 'center',
  },
  successText: {
    color: colors.textPrimary,
    fontSize: 24,
    fontWeight: '700',
    marginTop: 16,
  },
  successCaption: { color: colors.textSecondary, fontSize: 14, marginTop: 4 },

  pickerBackdrop: {
    flex: 1,
    backgroundColor: 'rgba(10,15,44,0.4)',
    justifyContent: 'flex-end',
  },
  pickerSheet: {
    backgroundColor: colors.surface,
    borderTopLeftRadius: 20,
    borderTopRightRadius: 20,
    padding: 16,
    maxHeight: '75%',
  },
  pickerHandle: {
    width: 40,
    height: 4,
    borderRadius: 2,
    backgroundColor: colors.border,
    alignSelf: 'center',
    marginBottom: 12,
  },
  pickerTitle: {
    color: colors.textPrimary,
    fontSize: 17,
    fontWeight: '700',
    marginBottom: 12,
  },
  searchRow: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 10,
    backgroundColor: colors.bg,
    borderRadius: 10,
    marginBottom: 8,
  },
  searchPlaceholder: {
    color: colors.textSecondary,
    fontSize: 14,
    marginLeft: 8,
  },
  pickerRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 14,
    paddingHorizontal: 8,
    minHeight: 56,
  },
  pickerName: { color: colors.textPrimary, fontSize: 15, fontWeight: '600' },
  pickerMeta: { color: colors.textSecondary, fontSize: 12, marginTop: 2 },
  pickerPrice: { color: colors.textPrimary, fontSize: 14, fontWeight: '700' },
  pickerEmpty: {
    color: colors.textSecondary,
    fontSize: 13,
    textAlign: 'center',
    paddingVertical: 24,
  },
});
