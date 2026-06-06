import React, { useCallback, useEffect, useState } from 'react';
import {
  View,
  Text,
  ScrollView,
  RefreshControl,
  Pressable,
  ActivityIndicator,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import {
  TrendingUp,
  AlertTriangle,
  Coins,
  PackageX,
  RefreshCw,
} from 'lucide-react-native';

import { useNavigation } from '@react-navigation/native';
import type { BottomTabNavigationProp } from '@react-navigation/bottom-tabs';

import { getInsightsSummary, getAlerts } from '../api';
import type { InsightsSummary, Alert } from '../api/types';
import { useMerchantStore } from '../store/merchantStore';
import { useAlertStore } from '../store/alertStore';
import { colors } from '../theme';
import { LangNumber } from '../components/LangNumber';
import { AlertPill } from '../components/AlertPill';
import { InsightCard } from '../components/InsightCard';
import type { TabParamList } from '../navigation/types';

type Status = 'loading' | 'ready' | 'error';

export default function HomeScreen() {
  const tabNav = useNavigation<BottomTabNavigationProp<TabParamList>>();
  const merchant = useMerchantStore((s) => s.merchant);
  const alerts = useAlertStore((s) => s.alerts);
  const setAlerts = useAlertStore((s) => s.setAlerts);
  const dismiss = useAlertStore((s) => s.dismiss);

  const [summary, setSummary] = useState<InsightsSummary | null>(null);
  const [status, setStatus] = useState<Status>('loading');
  const [refreshing, setRefreshing] = useState(false);

  const handleAlertPress = useCallback(
    (_a: Alert) => {
      // Every actionable alert (reorder/stockout/wastage/dead_stock/pairing/margin)
      // surfaces in the Insights tab where the merchant can act. Jump there.
      tabNav.navigate('Insights');
    },
    [tabNav],
  );

  const handleAlertDismiss = useCallback(
    (id: number) => {
      void dismiss(id);
    },
    [dismiss],
  );

  const load = useCallback(async () => {
    try {
      const [s, a] = await Promise.all([getInsightsSummary(), getAlerts(false)]);
      setSummary(s);
      setAlerts(a.alerts);
      setStatus('ready');
    } catch {
      setStatus('error');
    }
  }, [setAlerts]);

  useEffect(() => {
    load();
  }, [load]);

  const onRefresh = useCallback(async () => {
    setRefreshing(true);
    await load();
    setRefreshing(false);
  }, [load]);

  const activeAlerts = alerts.filter((a) => !a.dismissed);

  return (
    <SafeAreaView className="flex-1 bg-bg" edges={['top']}>
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
        <Header name={merchant?.name ?? 'Dukaan'} />

        {status === 'loading' ? (
          <LoadingState />
        ) : status === 'error' ? (
          <ErrorState onRetry={load} />
        ) : summary ? (
          <ReadyState
            summary={summary}
            alerts={activeAlerts}
            alertsLoading={false}
            onAlertPress={handleAlertPress}
            onAlertDismiss={handleAlertDismiss}
          />
        ) : null}
      </ScrollView>
    </SafeAreaView>
  );
}

// -----------------------------------------------------------------------------
// Sections
// -----------------------------------------------------------------------------

function Header({ name }: { name: string }) {
  return (
    <View style={{ paddingHorizontal: 20, paddingTop: 8, paddingBottom: 16 }}>
      <Text style={{ color: colors.textSecondary, fontSize: 13, fontWeight: '500' }}>
        नमस्ते
      </Text>
      <Text
        style={{
          color: colors.paytmBlueDark,
          fontSize: 22,
          fontWeight: '700',
          marginTop: 2,
        }}
        numberOfLines={1}
      >
        {name}
      </Text>
    </View>
  );
}

function RevenueHero({ summary }: { summary: InsightsSummary }) {
  return (
    <View
      style={{
        marginHorizontal: 16,
        backgroundColor: colors.paytmBlueDark,
        borderRadius: 16,
        padding: 20,
      }}
    >
      <Text style={{ color: '#B8D1FF', fontSize: 13, fontWeight: '500' }}>
        आज की बिक्री
      </Text>
      <Text style={{ color: '#B8D1FF', fontSize: 11, marginTop: 1 }}>
        Today's revenue
      </Text>
      <LangNumber
        value={summary.revenue_today_paise}
        paise
        prefix="₹"
        style={{
          color: '#FFFFFF',
          fontSize: 36,
          fontWeight: '800',
          marginTop: 10,
          letterSpacing: -0.5,
        }}
      />
      <View
        style={{
          flexDirection: 'row',
          alignItems: 'center',
          marginTop: 12,
          paddingTop: 12,
          borderTopWidth: 1,
          borderTopColor: 'rgba(255,255,255,0.12)',
        }}
      >
        <Text style={{ color: '#B8D1FF', fontSize: 13 }}>
          इस हफ्ते{'  '}
          <Text style={{ color: '#FFFFFF', fontWeight: '700' }}>
            ₹{Math.round(summary.revenue_week_paise / 100).toLocaleString('en-IN')}
          </Text>
        </Text>
      </View>
    </View>
  );
}

function AlertStrip({
  alerts,
  loading,
  onAlertPress,
  onAlertDismiss,
}: {
  alerts: Alert[];
  loading: boolean;
  onAlertPress: (alert: Alert) => void;
  onAlertDismiss: (id: number) => void;
}) {
  return (
    <View style={{ marginTop: 20 }}>
      <Text
        style={{
          color: colors.textSecondary,
          fontSize: 13,
          fontWeight: '600',
          paddingHorizontal: 20,
          marginBottom: 8,
        }}
      >
        ज़रूरी सूचना · Alerts
      </Text>
      {loading ? (
        <View style={{ flexDirection: 'row', paddingHorizontal: 16 }}>
          {[0, 1, 2].map((i) => (
            <View
              key={i}
              style={{
                width: 160,
                height: 32,
                borderRadius: 16,
                backgroundColor: colors.surface,
                borderWidth: 1,
                borderColor: colors.border,
                marginRight: 8,
                opacity: 0.6,
              }}
            />
          ))}
        </View>
      ) : alerts.length === 0 ? (
        <View
          style={{
            marginHorizontal: 16,
            paddingHorizontal: 14,
            paddingVertical: 10,
            backgroundColor: colors.surface,
            borderRadius: 12,
            borderWidth: 1,
            borderColor: colors.border,
            flexDirection: 'row',
            alignItems: 'center',
          }}
        >
          <View
            style={{
              width: 8,
              height: 8,
              borderRadius: 4,
              backgroundColor: colors.success,
              marginRight: 8,
            }}
          />
          <Text style={{ color: colors.textSecondary, fontSize: 13 }}>
            कोई सूचना नहीं · All clear
          </Text>
        </View>
      ) : (
        <ScrollView
          horizontal
          showsHorizontalScrollIndicator={false}
          contentContainerStyle={{ paddingHorizontal: 16 }}
        >
          {alerts.map((alert) => (
            <AlertPill
              key={alert.id}
              alert={alert}
              onPress={() => onAlertPress(alert)}
              onDismiss={() => onAlertDismiss(alert.id)}
            />
          ))}
        </ScrollView>
      )}
    </View>
  );
}

function InsightsGrid({ summary }: { summary: InsightsSummary }) {
  const top = summary.top_movers[0];
  const low = summary.running_low[0];
  const margin = summary.margin_leaders[0];
  const dead = summary.dead_stock[0];

  const anyContent = top || low || margin || dead;
  if (!anyContent) {
    return <EmptyInsights />;
  }

  return (
    <View style={{ marginTop: 16, paddingHorizontal: 8 }}>
      <Text
        style={{
          color: colors.textSecondary,
          fontSize: 13,
          fontWeight: '600',
          paddingHorizontal: 12,
          marginBottom: 4,
        }}
      >
        दिन की समझ · Today's insights
      </Text>

      <View style={{ flexDirection: 'row', flexWrap: 'wrap' }}>
        {top ? (
          <CardCol>
            <InsightCard
              icon={TrendingUp}
              tone="success"
              title="सबसे ज़्यादा बिका · Top mover"
              value={`${top.name}`}
              takeaway={`${top.units} units · ₹${Math.round(top.revenue_paise / 100)} today`}
              actionLabel="Restock"
              onAction={() => {}}
            />
          </CardCol>
        ) : null}

        {low ? (
          <CardCol>
            <InsightCard
              icon={AlertTriangle}
              tone="warning"
              title="कम बचा · Running low"
              value={`${low.name} — ${low.stock} left`}
              takeaway={`Reorder point: ${low.reorder_point}`}
              actionLabel="Reorder"
              onAction={() => {}}
            />
          </CardCol>
        ) : null}

        {margin ? (
          <CardCol>
            <InsightCard
              icon={Coins}
              tone="info"
              title="मुनाफ़ा · Margin leader"
              value={margin.name}
              takeaway={`₹${Math.round(margin.margin_paise / 100)} profit · ${margin.units} units`}
              actionLabel="Promote"
              onAction={() => {}}
            />
          </CardCol>
        ) : null}

        {dead ? (
          <CardCol>
            <InsightCard
              icon={PackageX}
              tone="danger"
              title="रुका माल · Dead stock"
              value={dead.name}
              takeaway={`${dead.days_since_sale} days no sale · ${dead.stock} in stock`}
              actionLabel="Discount"
              onAction={() => {}}
            />
          </CardCol>
        ) : null}
      </View>
    </View>
  );
}

function CardCol({ children }: { children: React.ReactNode }) {
  return <View style={{ width: '50%' }}>{children}</View>;
}

// -----------------------------------------------------------------------------
// State variants
// -----------------------------------------------------------------------------

function ReadyState({
  summary,
  alerts,
  alertsLoading,
  onAlertPress,
  onAlertDismiss,
}: {
  summary: InsightsSummary;
  alerts: Alert[];
  alertsLoading: boolean;
  onAlertPress: (alert: Alert) => void;
  onAlertDismiss: (id: number) => void;
}) {
  return (
    <>
      <RevenueHero summary={summary} />
      <AlertStrip
        alerts={alerts}
        loading={alertsLoading}
        onAlertPress={onAlertPress}
        onAlertDismiss={onAlertDismiss}
      />
      <InsightsGrid summary={summary} />
    </>
  );
}

function LoadingState() {
  return (
    <>
      <SkeletonBlock height={140} marginHorizontal={16} />
      <View style={{ flexDirection: 'row', marginTop: 16, paddingHorizontal: 8 }}>
        <View style={{ width: '50%' }}>
          <SkeletonBlock height={160} marginHorizontal={8} />
        </View>
        <View style={{ width: '50%' }}>
          <SkeletonBlock height={160} marginHorizontal={8} />
        </View>
      </View>
      <View style={{ flexDirection: 'row', paddingHorizontal: 8 }}>
        <View style={{ width: '50%' }}>
          <SkeletonBlock height={160} marginHorizontal={8} />
        </View>
        <View style={{ width: '50%' }}>
          <SkeletonBlock height={160} marginHorizontal={8} />
        </View>
      </View>
      <View
        style={{
          marginTop: 12,
          flexDirection: 'row',
          alignItems: 'center',
          justifyContent: 'center',
        }}
      >
        <ActivityIndicator size="small" color={colors.paytmBlue} />
        <Text style={{ marginLeft: 8, color: colors.textSecondary, fontSize: 13 }}>
          Loading dashboard…
        </Text>
      </View>
    </>
  );
}

function SkeletonBlock({
  height,
  marginHorizontal,
}: {
  height: number;
  marginHorizontal: number;
}) {
  return (
    <View
      style={{
        height,
        marginHorizontal,
        marginVertical: 8,
        backgroundColor: colors.surface,
        borderRadius: 16,
        borderWidth: 1,
        borderColor: colors.border,
        opacity: 0.6,
      }}
    />
  );
}

function ErrorState({ onRetry }: { onRetry: () => void }) {
  return (
    <View
      style={{
        marginHorizontal: 16,
        marginTop: 12,
        padding: 20,
        borderRadius: 16,
        backgroundColor: colors.surface,
        borderWidth: 1,
        borderColor: colors.border,
        alignItems: 'center',
      }}
    >
      <Text
        style={{
          color: colors.textPrimary,
          fontSize: 16,
          fontWeight: '600',
          textAlign: 'center',
        }}
      >
        डेटा लोड नहीं हुआ
      </Text>
      <Text
        style={{
          color: colors.textSecondary,
          fontSize: 13,
          marginTop: 4,
          textAlign: 'center',
        }}
      >
        Couldn't load dashboard. Network bandh ho gaya?
      </Text>
      <Pressable
        onPress={onRetry}
        accessibilityRole="button"
        accessibilityLabel="Retry loading dashboard"
        style={({ pressed }) => ({
          flexDirection: 'row',
          alignItems: 'center',
          marginTop: 16,
          paddingVertical: 10,
          paddingHorizontal: 18,
          borderRadius: 12,
          backgroundColor: pressed ? colors.paytmBlueDark : colors.paytmBlue,
          minHeight: 44,
        })}
      >
        <RefreshCw color="#FFFFFF" size={16} />
        <Text style={{ color: '#FFFFFF', fontWeight: '700', marginLeft: 8 }}>
          Retry · दोबारा कोशिश
        </Text>
      </Pressable>
    </View>
  );
}

function EmptyInsights() {
  return (
    <View
      style={{
        marginHorizontal: 16,
        marginTop: 16,
        padding: 24,
        borderRadius: 16,
        backgroundColor: colors.surface,
        borderWidth: 1,
        borderColor: colors.border,
        alignItems: 'center',
      }}
    >
      <Text style={{ color: colors.textPrimary, fontSize: 16, fontWeight: '600' }}>
        अभी कोई बिक्री नहीं
      </Text>
      <Text
        style={{
          color: colors.textSecondary,
          fontSize: 13,
          marginTop: 4,
          textAlign: 'center',
        }}
      >
        Tap the mic to log your first sale — insights will appear here.
      </Text>
    </View>
  );
}
