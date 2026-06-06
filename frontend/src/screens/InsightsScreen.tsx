import React, { useCallback, useEffect, useState } from 'react';
import {
  View,
  Text,
  ScrollView,
  RefreshControl,
  Pressable,
  ActivityIndicator,
  StyleSheet,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import {
  TrendingUp,
  AlertTriangle,
  Coins,
  PackageX,
  Link2,
  Snowflake,
  RefreshCw,
  type LucideIcon,
} from 'lucide-react-native';

import { getInsightsSummary } from '../api';
import type { InsightsSummary } from '../api/types';
import { LangNumber } from '../components/LangNumber';
import { StockBadge } from '../components/StockBadge';
import { colors } from '../theme';

type Status = 'loading' | 'ready' | 'error';

export default function InsightsScreen() {
  const [summary, setSummary] = useState<InsightsSummary | null>(null);
  const [status, setStatus] = useState<Status>('loading');
  const [refreshing, setRefreshing] = useState(false);

  const load = useCallback(async () => {
    try {
      const s = await getInsightsSummary();
      setSummary(s);
      setStatus('ready');
    } catch {
      setStatus('error');
    }
  }, []);

  useEffect(() => {
    load();
  }, [load]);

  const onRefresh = useCallback(async () => {
    setRefreshing(true);
    await load();
    setRefreshing(false);
  }, [load]);

  return (
    <SafeAreaView style={styles.root} edges={['top']}>
      <Header />
      <ScrollView
        contentContainerStyle={{ paddingBottom: 24 }}
        refreshControl={
          <RefreshControl
            refreshing={refreshing}
            onRefresh={onRefresh}
            tintColor={colors.paytmBlue}
          />
        }
      >
        {status === 'loading' ? (
          <LoadingState />
        ) : status === 'error' ? (
          <ErrorState onRetry={load} />
        ) : summary ? (
          <ReadyState summary={summary} />
        ) : null}
        <PoweredBySarvam />
      </ScrollView>
    </SafeAreaView>
  );
}

// -----------------------------------------------------------------------------
// Ready state
// -----------------------------------------------------------------------------

function ReadyState({ summary }: { summary: InsightsSummary }) {
  const allEmpty =
    summary.top_movers.length === 0 &&
    summary.running_low.length === 0 &&
    summary.margin_leaders.length === 0 &&
    summary.dead_stock.length === 0 &&
    summary.wastage_risk.length === 0 &&
    summary.pairings.length === 0;

  if (allEmpty) return <EmptyState />;

  return (
    <>
      <TopMoversSection items={summary.top_movers} />
      <RunningLowSection items={summary.running_low} />
      <MarginLeadersSection items={summary.margin_leaders} />
      <WastageRiskSection items={summary.wastage_risk} />
      <DeadStockSection items={summary.dead_stock} />
      <PairingsSection items={summary.pairings} />
    </>
  );
}

// -----------------------------------------------------------------------------
// Sections
// -----------------------------------------------------------------------------

function SectionHeader({
  icon: Icon,
  hi,
  en,
  tone,
}: {
  icon: LucideIcon;
  hi: string;
  en: string;
  tone: string;
}) {
  return (
    <View style={styles.sectionHeader}>
      <View style={[styles.sectionIconWrap, { backgroundColor: tone + '22' }]}>
        <Icon color={tone} size={16} />
      </View>
      <View style={{ flex: 1 }}>
        <Text style={styles.sectionHi}>{hi}</Text>
        <Text style={styles.sectionEn}>{en}</Text>
      </View>
    </View>
  );
}

function SectionCard({ children }: { children: React.ReactNode }) {
  return <View style={styles.sectionCard}>{children}</View>;
}

function RowSeparator() {
  return <View style={styles.rowSeparator} />;
}

function ActionButton({
  label,
  onPress,
  color,
}: {
  label: string;
  onPress: () => void;
  color: string;
}) {
  return (
    <Pressable
      onPress={onPress}
      accessibilityRole="button"
      accessibilityLabel={label}
      hitSlop={6}
      style={({ pressed }) => [
        styles.actionBtn,
        { backgroundColor: pressed ? color + '22' : 'transparent', borderColor: color },
      ]}
    >
      <Text style={{ color, fontSize: 12, fontWeight: '700' }}>{label}</Text>
    </Pressable>
  );
}

// --- Top movers (with horizontal proportion bars) ---------------------------

function TopMoversSection({
  items,
}: {
  items: InsightsSummary['top_movers'];
}) {
  if (items.length === 0) return null;
  const max = Math.max(...items.map((i) => i.units));

  return (
    <View style={styles.section}>
      <SectionHeader
        icon={TrendingUp}
        hi="तेज़ बिकने वाले"
        en="Top movers"
        tone={colors.success}
      />
      <SectionCard>
        {items.map((item, idx) => (
          <React.Fragment key={item.product_id}>
            {idx > 0 ? <RowSeparator /> : null}
            <View style={styles.row}>
              <View style={{ flex: 1 }}>
                <Text style={styles.rowName} numberOfLines={1}>
                  {item.name}
                </Text>
                <View style={styles.barTrack}>
                  <View
                    style={[
                      styles.barFill,
                      {
                        width: `${(item.units / max) * 100}%`,
                        backgroundColor: colors.success,
                      },
                    ]}
                  />
                </View>
                <View style={styles.rowMetaRow}>
                  <LangNumber
                    value={item.units}
                    suffix=" units"
                    style={styles.rowMeta}
                  />
                  <Text style={styles.rowMetaDot}> · </Text>
                  <LangNumber
                    value={item.revenue_paise}
                    paise
                    prefix="₹"
                    style={styles.rowMeta}
                  />
                </View>
              </View>
              <ActionButton
                label="Restock"
                color={colors.success}
                onPress={() => undefined}
              />
            </View>
          </React.Fragment>
        ))}
      </SectionCard>
    </View>
  );
}

// --- Running low ------------------------------------------------------------

function RunningLowSection({
  items,
}: {
  items: InsightsSummary['running_low'];
}) {
  if (items.length === 0) return null;
  return (
    <View style={styles.section}>
      <SectionHeader
        icon={AlertTriangle}
        hi="ख़त्म होने वाले"
        en="Running low"
        tone={colors.warning}
      />
      <SectionCard>
        {items.map((item, idx) => (
          <React.Fragment key={item.product_id}>
            {idx > 0 ? <RowSeparator /> : null}
            <View style={styles.row}>
              <View style={{ flex: 1 }}>
                <Text style={styles.rowName}>{item.name}</Text>
                <View style={{ flexDirection: 'row', alignItems: 'center', marginTop: 6 }}>
                  <StockBadge stock={item.stock} reorderPoint={item.reorder_point} />
                  <Text style={[styles.rowMeta, { marginLeft: 8 }]}>
                    reorder at{' '}
                    <LangNumber value={item.reorder_point} style={styles.rowMeta} />
                  </Text>
                </View>
              </View>
              <ActionButton
                label="Reorder"
                color={colors.warning}
                onPress={() => undefined}
              />
            </View>
          </React.Fragment>
        ))}
      </SectionCard>
    </View>
  );
}

// --- Margin leaders ---------------------------------------------------------

function MarginLeadersSection({
  items,
}: {
  items: InsightsSummary['margin_leaders'];
}) {
  if (items.length === 0) return null;
  return (
    <View style={styles.section}>
      <SectionHeader
        icon={Coins}
        hi="मुनाफ़ा"
        en="Margin leaders"
        tone={colors.paytmBlue}
      />
      <SectionCard>
        {items.map((item, idx) => (
          <React.Fragment key={item.product_id}>
            {idx > 0 ? <RowSeparator /> : null}
            <View style={styles.row}>
              <View style={{ flex: 1 }}>
                <Text style={styles.rowName}>{item.name}</Text>
                <View style={styles.rowMetaRow}>
                  <LangNumber
                    value={item.margin_paise}
                    paise
                    prefix="₹"
                    suffix=" profit"
                    style={styles.rowMeta}
                  />
                  <Text style={styles.rowMetaDot}> · </Text>
                  <LangNumber
                    value={item.units}
                    suffix=" units"
                    style={styles.rowMeta}
                  />
                </View>
              </View>
              <ActionButton
                label="Promote"
                color={colors.paytmBlue}
                onPress={() => undefined}
              />
            </View>
          </React.Fragment>
        ))}
      </SectionCard>
    </View>
  );
}

// --- Wastage risk -----------------------------------------------------------

function WastageRiskSection({
  items,
}: {
  items: InsightsSummary['wastage_risk'];
}) {
  if (items.length === 0) return null;
  return (
    <View style={styles.section}>
      <SectionHeader
        icon={Snowflake}
        hi="ख़राब होने का ख़तरा"
        en="Wastage risk"
        tone={colors.warning}
      />
      <SectionCard>
        {items.map((item, idx) => (
          <React.Fragment key={item.product_id}>
            {idx > 0 ? <RowSeparator /> : null}
            <View style={styles.row}>
              <View style={{ flex: 1 }}>
                <Text style={styles.rowName}>{item.name}</Text>
                <View style={styles.rowMetaRow}>
                  <LangNumber value={item.stock} suffix=" in stock" style={styles.rowMeta} />
                  <Text style={styles.rowMetaDot}> · </Text>
                  <Text style={styles.rowMeta}>trend {item.trend}</Text>
                </View>
              </View>
              <ActionButton
                label="Bundle"
                color={colors.warning}
                onPress={() => undefined}
              />
            </View>
          </React.Fragment>
        ))}
      </SectionCard>
    </View>
  );
}

// --- Dead stock -------------------------------------------------------------

function DeadStockSection({
  items,
}: {
  items: InsightsSummary['dead_stock'];
}) {
  if (items.length === 0) return null;
  return (
    <View style={styles.section}>
      <SectionHeader
        icon={PackageX}
        hi="पड़ा हुआ माल"
        en="Dead stock"
        tone={colors.danger}
      />
      <SectionCard>
        {items.map((item, idx) => (
          <React.Fragment key={item.product_id}>
            {idx > 0 ? <RowSeparator /> : null}
            <View style={styles.row}>
              <View style={{ flex: 1 }}>
                <Text style={styles.rowName}>{item.name}</Text>
                <View style={styles.rowMetaRow}>
                  <LangNumber
                    value={item.days_since_sale}
                    suffix=" days no sale"
                    style={styles.rowMeta}
                  />
                  <Text style={styles.rowMetaDot}> · </Text>
                  <LangNumber
                    value={item.stock}
                    suffix=" in stock"
                    style={styles.rowMeta}
                  />
                </View>
              </View>
              <ActionButton
                label="Discount"
                color={colors.danger}
                onPress={() => undefined}
              />
            </View>
          </React.Fragment>
        ))}
      </SectionCard>
    </View>
  );
}

// --- Pairings ---------------------------------------------------------------

function PairingsSection({
  items,
}: {
  items: InsightsSummary['pairings'];
}) {
  if (items.length === 0) return null;
  return (
    <View style={styles.section}>
      <SectionHeader
        icon={Link2}
        hi="साथ बिकते हैं"
        en="Frequently paired"
        tone={colors.paytmBlue}
      />
      <SectionCard>
        {items.map((pair, idx) => (
          <React.Fragment key={`${pair.a}-${pair.b}`}>
            {idx > 0 ? <RowSeparator /> : null}
            <View style={styles.row}>
              <View style={{ flex: 1 }}>
                <Text style={styles.rowName}>
                  {pair.a}{' '}
                  <Text style={{ color: colors.textSecondary, fontWeight: '400' }}>+</Text>{' '}
                  {pair.b}
                </Text>
                <LangNumber
                  value={pair.count}
                  suffix=" times together"
                  style={[styles.rowMeta, { marginTop: 4 }]}
                />
              </View>
              <ActionButton
                label="Bundle"
                color={colors.paytmBlue}
                onPress={() => undefined}
              />
            </View>
          </React.Fragment>
        ))}
      </SectionCard>
    </View>
  );
}

// -----------------------------------------------------------------------------
// State variants
// -----------------------------------------------------------------------------

function Header() {
  return (
    <View style={styles.headerWrap}>
      <Text style={styles.headerHi}>दिन की समझ</Text>
      <Text style={styles.headerEn}>Today's insights</Text>
    </View>
  );
}

function LoadingState() {
  return (
    <>
      {[140, 160, 130, 160, 120].map((h, i) => (
        <View key={i} style={[styles.skeleton, { height: h }]} />
      ))}
      <View style={styles.loadingRow}>
        <ActivityIndicator size="small" color={colors.paytmBlue} />
        <Text style={styles.loadingHint}>Loading insights…</Text>
      </View>
    </>
  );
}

function ErrorState({ onRetry }: { onRetry: () => void }) {
  return (
    <View style={styles.errorBox}>
      <Text style={styles.errorTitle}>डेटा लोड नहीं हुआ</Text>
      <Text style={styles.errorCaption}>
        Couldn't load insights. Network bandh ho gaya?
      </Text>
      <Pressable
        onPress={onRetry}
        accessibilityRole="button"
        accessibilityLabel="Retry loading insights"
        style={({ pressed }) => [
          styles.retryBtn,
          { backgroundColor: pressed ? colors.paytmBlueDark : colors.paytmBlue },
        ]}
      >
        <RefreshCw color="#FFFFFF" size={16} />
        <Text style={styles.retryText}>Retry · दोबारा कोशिश</Text>
      </Pressable>
    </View>
  );
}

function EmptyState() {
  return (
    <View style={styles.errorBox}>
      <Text style={styles.errorTitle}>अभी कोई समझ नहीं</Text>
      <Text style={styles.errorCaption}>
        Log a few sales to see top movers, dead stock, margin and more here.
      </Text>
    </View>
  );
}

function PoweredBySarvam() {
  return (
    <View style={{ alignItems: 'center', paddingVertical: 16 }}>
      <Text style={{ color: colors.textSecondary, fontSize: 11 }}>
        Insights powered by{' '}
        <Text style={{ color: colors.sarvamAccent, fontWeight: '700' }}>Sarvam</Text>
      </Text>
    </View>
  );
}

// -----------------------------------------------------------------------------
// Styles
// -----------------------------------------------------------------------------

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: colors.bg },

  headerWrap: { paddingHorizontal: 20, paddingTop: 8, paddingBottom: 12 },
  headerHi: { color: colors.paytmBlueDark, fontSize: 22, fontWeight: '700' },
  headerEn: { color: colors.textSecondary, fontSize: 13, marginTop: 2 },

  section: { marginBottom: 16, paddingHorizontal: 16 },

  sectionHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 4,
    marginBottom: 8,
  },
  sectionIconWrap: {
    width: 28,
    height: 28,
    borderRadius: 8,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 10,
  },
  sectionHi: { color: colors.textPrimary, fontSize: 15, fontWeight: '700' },
  sectionEn: { color: colors.textSecondary, fontSize: 11, marginTop: 1 },

  sectionCard: {
    backgroundColor: colors.surface,
    borderRadius: 16,
    borderWidth: 1,
    borderColor: colors.border,
    overflow: 'hidden',
  },

  row: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 14,
    paddingVertical: 12,
    minHeight: 64,
    gap: 12,
  },
  rowSeparator: { height: 1, backgroundColor: colors.border, marginHorizontal: 14 },

  rowName: { color: colors.textPrimary, fontSize: 15, fontWeight: '600' },
  rowMetaRow: { flexDirection: 'row', alignItems: 'center', marginTop: 4 },
  rowMeta: { color: colors.textSecondary, fontSize: 12, fontWeight: '500' },
  rowMetaDot: { color: colors.textSecondary, fontSize: 12 },

  barTrack: {
    height: 4,
    backgroundColor: colors.bg,
    borderRadius: 2,
    marginTop: 6,
    overflow: 'hidden',
  },
  barFill: { height: '100%', borderRadius: 2 },

  actionBtn: {
    paddingVertical: 8,
    paddingHorizontal: 12,
    borderRadius: 12,
    borderWidth: 1.5,
    minHeight: 36,
    minWidth: 80,
    alignItems: 'center',
    justifyContent: 'center',
  },

  skeleton: {
    backgroundColor: colors.surface,
    marginHorizontal: 16,
    marginBottom: 12,
    borderRadius: 16,
    borderWidth: 1,
    borderColor: colors.border,
    opacity: 0.6,
  },
  loadingRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: 8,
  },
  loadingHint: {
    color: colors.textSecondary,
    fontSize: 13,
    marginLeft: 8,
  },

  errorBox: {
    marginHorizontal: 16,
    padding: 20,
    borderRadius: 16,
    backgroundColor: colors.surface,
    borderWidth: 1,
    borderColor: colors.border,
    alignItems: 'center',
  },
  errorTitle: { color: colors.textPrimary, fontSize: 16, fontWeight: '600' },
  errorCaption: {
    color: colors.textSecondary,
    fontSize: 13,
    marginTop: 4,
    textAlign: 'center',
  },
  retryBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: 16,
    paddingVertical: 10,
    paddingHorizontal: 18,
    borderRadius: 12,
    minHeight: 44,
  },
  retryText: { color: '#FFFFFF', fontWeight: '700', marginLeft: 8 },
});
