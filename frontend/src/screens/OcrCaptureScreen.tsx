import React, { useCallback, useState } from 'react';
import {
  View,
  Text,
  Pressable,
  Image,
  StyleSheet,
  ActivityIndicator,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useNavigation } from '@react-navigation/native';
import type { NativeStackNavigationProp } from '@react-navigation/native-stack';
import * as ImagePicker from 'expo-image-picker';
import {
  X,
  Camera,
  ImageIcon,
  Sparkles,
  RefreshCw,
  Pencil,
  FileText,
} from 'lucide-react-native';

import { postOcrSale } from '../api';
import type { VoiceDraftResponse } from '../api/types';
import { useDraftSaleStore } from '../store/draftSaleStore';
import { useMerchantStore } from '../store/merchantStore';
import { colors } from '../theme';
import type { RootStackParamList } from '../navigation/types';

type Phase = 'idle' | 'preview' | 'processing' | 'error' | 'permission_denied';

// 1x1 transparent PNG used when the merchant taps "Sample daybook" —
// the fixture postOcrSale ignores the URI but the preview wants something.
const SAMPLE_PLACEHOLDER =
  'data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mNkYAAAAAYAAjCB0C8AAAAASUVORK5CYII=';

export default function OcrCaptureScreen() {
  const nav = useNavigation<NativeStackNavigationProp<RootStackParamList>>();
  const merchantLang = useMerchantStore((s) => s.merchant?.language ?? 'hi-IN');
  const setDraft = useDraftSaleStore((s) => s.setDraft);

  const [imageUri, setImageUri] = useState<string | null>(null);
  const [phase, setPhase] = useState<Phase>('idle');
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  const pickFromLibrary = useCallback(async () => {
    setErrorMsg(null);
    const perm = await ImagePicker.requestMediaLibraryPermissionsAsync();
    if (!perm.granted) {
      setErrorMsg('Photos की अनुमति चाहिए / Photos permission needed');
      setPhase('permission_denied');
      return;
    }
    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ImagePicker.MediaTypeOptions.Images,
      quality: 0.8,
      allowsEditing: false,
    });
    if (!result.canceled && result.assets[0]) {
      setImageUri(result.assets[0].uri);
      setPhase('preview');
    }
  }, []);

  const pickFromCamera = useCallback(async () => {
    setErrorMsg(null);
    const perm = await ImagePicker.requestCameraPermissionsAsync();
    if (!perm.granted) {
      setErrorMsg('Camera की अनुमति चाहिए / Camera permission needed');
      setPhase('permission_denied');
      return;
    }
    const result = await ImagePicker.launchCameraAsync({
      quality: 0.8,
      allowsEditing: false,
    });
    if (!result.canceled && result.assets[0]) {
      setImageUri(result.assets[0].uri);
      setPhase('preview');
    }
  }, []);

  const useSample = useCallback(() => {
    setErrorMsg(null);
    setImageUri(SAMPLE_PLACEHOLDER);
    setPhase('preview');
  }, []);

  const submit = useCallback(async () => {
    if (!imageUri) return;
    setErrorMsg(null);
    setPhase('processing');
    try {
      const draft: VoiceDraftResponse = await postOcrSale(imageUri);
      setDraft(draft);
      nav.replace('Confirm');
    } catch {
      setErrorMsg('OCR नहीं हो पाया / OCR failed');
      setPhase('error');
    }
  }, [imageUri, nav, setDraft]);

  const editManually = useCallback(() => {
    // Never a dead end — seed an empty draft so the merchant can type
    // the day-book by hand on the Confirm screen.
    setDraft({
      draft_id: 'manual',
      source: 'ocr',
      transcript: '',
      language_detected: merchantLang,
      needs_clarification: true,
      clarification: null,
      line_items: [],
      total_amount: 0,
    });
    nav.replace('Confirm');
  }, [merchantLang, nav, setDraft]);

  const reset = () => {
    setImageUri(null);
    setErrorMsg(null);
    setPhase('idle');
  };

  return (
    <SafeAreaView style={styles.root}>
      <Header onClose={() => nav.goBack()} />

      <View style={styles.body}>
        {phase === 'permission_denied' && errorMsg ? (
          <ErrorPanel
            title="अनुमति चाहिए"
            message={errorMsg}
            onRetry={reset}
            onManualEdit={editManually}
          />
        ) : phase === 'idle' ? (
          <IdleState
            onCamera={pickFromCamera}
            onLibrary={pickFromLibrary}
            onSample={useSample}
          />
        ) : phase === 'preview' && imageUri ? (
          <PreviewState
            uri={imageUri}
            onSubmit={submit}
            onPickAgain={reset}
          />
        ) : phase === 'processing' ? (
          <ProcessingState uri={imageUri} />
        ) : phase === 'error' ? (
          <ErrorPanel
            title="OCR नहीं हो पाया"
            message={errorMsg ?? ''}
            onRetry={submit}
            onManualEdit={editManually}
            onPickAgain={reset}
          />
        ) : null}
      </View>

      <PoweredFooter />
    </SafeAreaView>
  );
}

// -----------------------------------------------------------------------------
// Header / footer
// -----------------------------------------------------------------------------

function Header({ onClose }: { onClose: () => void }) {
  return (
    <View style={styles.header}>
      <View>
        <Text style={styles.headerHi}>दुकान-डायरी की फ़ोटो</Text>
        <Text style={styles.headerEn}>Day-book photo</Text>
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

function PoweredFooter() {
  return (
    <View style={{ alignItems: 'center', paddingBottom: 16 }}>
      <Text style={{ color: colors.textSecondary, fontSize: 11 }}>
        OCR powered by{' '}
        <Text style={{ color: colors.sarvamAccent, fontWeight: '700' }}>Sarvam</Text>
      </Text>
    </View>
  );
}

// -----------------------------------------------------------------------------
// States
// -----------------------------------------------------------------------------

function IdleState({
  onCamera,
  onLibrary,
  onSample,
}: {
  onCamera: () => void;
  onLibrary: () => void;
  onSample: () => void;
}) {
  return (
    <View style={{ flex: 1, justifyContent: 'space-between' }}>
      <View style={styles.idleHero}>
        <View style={styles.idleIconCircle}>
          <FileText color={colors.paytmBlue} size={32} />
        </View>
        <Text style={styles.idleTitle}>लिखी हुई बही को पढ़ें</Text>
        <Text style={styles.idleCaption}>
          Snap a photo of your handwritten day-book — Sarvam will read it
          into line items.
        </Text>
      </View>

      <View style={styles.actionsCol}>
        <ActionRow
          icon={Camera}
          hi="फ़ोटो खींचें"
          en="Take a photo"
          onPress={onCamera}
          accent={colors.paytmBlue}
        />
        <ActionRow
          icon={ImageIcon}
          hi="गैलरी से चुनें"
          en="Pick from library"
          onPress={onLibrary}
          accent={colors.paytmBlue}
        />
        <ActionRow
          icon={Sparkles}
          hi="नमूना देखें"
          en="Try the sample"
          onPress={onSample}
          accent={colors.sarvamAccent}
        />
      </View>
    </View>
  );
}

function ActionRow({
  icon: Icon,
  hi,
  en,
  onPress,
  accent,
}: {
  icon: React.ComponentType<{ color: string; size: number }>;
  hi: string;
  en: string;
  onPress: () => void;
  accent: string;
}) {
  return (
    <Pressable
      onPress={onPress}
      accessibilityRole="button"
      accessibilityLabel={en}
      style={({ pressed }) => [
        styles.actionRow,
        pressed && { backgroundColor: colors.paytmSkyTint },
      ]}
    >
      <View style={[styles.actionIconWrap, { backgroundColor: accent + '22' }]}>
        <Icon color={accent} size={20} />
      </View>
      <View style={{ flex: 1 }}>
        <Text style={styles.actionHi}>{hi}</Text>
        <Text style={styles.actionEn}>{en}</Text>
      </View>
    </Pressable>
  );
}

function PreviewState({
  uri,
  onSubmit,
  onPickAgain,
}: {
  uri: string;
  onSubmit: () => void;
  onPickAgain: () => void;
}) {
  return (
    <View style={{ flex: 1, justifyContent: 'space-between' }}>
      <View style={styles.previewFrame}>
        <Image source={{ uri }} style={styles.previewImage} resizeMode="contain" />
      </View>
      <View style={{ gap: 8 }}>
        <Pressable
          onPress={onSubmit}
          accessibilityRole="button"
          accessibilityLabel="Read this photo"
          style={({ pressed }) => [
            styles.primaryBtn,
            { backgroundColor: pressed ? colors.paytmBlueDark : colors.paytmBlue },
          ]}
        >
          <Sparkles color="#FFFFFF" size={16} />
          <Text style={styles.primaryBtnText}>Read & continue · पढ़ें</Text>
        </Pressable>
        <Pressable
          onPress={onPickAgain}
          accessibilityRole="button"
          accessibilityLabel="Pick a different photo"
          style={({ pressed }) => [
            styles.ghostBtn,
            pressed && { backgroundColor: colors.paytmSkyTint },
          ]}
        >
          <Text style={styles.ghostBtnText}>दूसरी फ़ोटो / Pick again</Text>
        </Pressable>
      </View>
    </View>
  );
}

function ProcessingState({ uri }: { uri: string | null }) {
  return (
    <View style={{ flex: 1, alignItems: 'center', justifyContent: 'center' }}>
      {uri ? (
        <Image source={{ uri }} style={styles.processingThumb} resizeMode="cover" />
      ) : null}
      <View style={{ flexDirection: 'row', alignItems: 'center', marginTop: 20 }}>
        <ActivityIndicator color={colors.sarvamAccent} />
        <Text style={styles.processingLabel}>
          पढ़ रहा हूँ… / Reading…
        </Text>
      </View>
      <Text style={styles.processingHint}>
        Sarvam Vision is extracting items from the photo
      </Text>
    </View>
  );
}

function ErrorPanel({
  title,
  message,
  onRetry,
  onManualEdit,
  onPickAgain,
}: {
  title: string;
  message: string;
  onRetry: () => void;
  onManualEdit: () => void;
  onPickAgain?: () => void;
}) {
  return (
    <View style={{ flex: 1, justifyContent: 'center' }}>
      <View style={styles.errorBox}>
        <Text style={styles.errorTitle}>{title}</Text>
        {message ? <Text style={styles.errorMsg}>{message}</Text> : null}

        <View style={{ flexDirection: 'row', gap: 8, marginTop: 16 }}>
          <Pressable
            onPress={onRetry}
            accessibilityRole="button"
            accessibilityLabel="Retry"
            style={({ pressed }) => [
              styles.retryBtn,
              { backgroundColor: pressed ? colors.paytmBlueDark : colors.paytmBlue },
            ]}
          >
            <RefreshCw color="#FFFFFF" size={16} />
            <Text style={styles.btnText}>Retry · दोबारा</Text>
          </Pressable>
          <Pressable
            onPress={onManualEdit}
            accessibilityRole="button"
            accessibilityLabel="Edit manually"
            style={({ pressed }) => [
              styles.manualBtn,
              { borderColor: pressed ? colors.paytmBlueDark : colors.paytmBlue },
            ]}
          >
            <Pencil color={colors.paytmBlue} size={16} />
            <Text style={[styles.btnText, { color: colors.paytmBlue }]}>
              Edit manually
            </Text>
          </Pressable>
        </View>

        {onPickAgain ? (
          <Pressable
            onPress={onPickAgain}
            accessibilityRole="button"
            accessibilityLabel="Pick a different photo"
            style={({ pressed }) => [
              { marginTop: 12, paddingVertical: 8, borderRadius: 12, alignItems: 'center' },
              pressed && { backgroundColor: colors.paytmSkyTint },
            ]}
          >
            <Text style={styles.ghostBtnText}>दूसरी फ़ोटो / Pick a different photo</Text>
          </Pressable>
        ) : null}
      </View>
    </View>
  );
}

// -----------------------------------------------------------------------------
// Styles
// -----------------------------------------------------------------------------

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: colors.bg },

  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 20,
    paddingVertical: 12,
  },
  headerHi: { color: colors.paytmBlueDark, fontSize: 20, fontWeight: '700' },
  headerEn: { color: colors.textSecondary, fontSize: 12, marginTop: 2 },
  closeBtn: { padding: 8 },

  body: { flex: 1, paddingHorizontal: 20 },

  // Idle
  idleHero: { alignItems: 'center', paddingTop: 16 },
  idleIconCircle: {
    width: 72,
    height: 72,
    borderRadius: 36,
    backgroundColor: colors.paytmSkyTint,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 12,
  },
  idleTitle: { color: colors.textPrimary, fontSize: 18, fontWeight: '700' },
  idleCaption: {
    color: colors.textSecondary,
    fontSize: 13,
    marginTop: 6,
    textAlign: 'center',
    paddingHorizontal: 16,
    lineHeight: 19,
  },

  actionsCol: { gap: 8, paddingBottom: 8 },
  actionRow: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: colors.surface,
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: 12,
    paddingVertical: 14,
    paddingHorizontal: 14,
    minHeight: 64,
    gap: 12,
  },
  actionIconWrap: {
    width: 40,
    height: 40,
    borderRadius: 10,
    alignItems: 'center',
    justifyContent: 'center',
  },
  actionHi: { color: colors.textPrimary, fontSize: 15, fontWeight: '600' },
  actionEn: { color: colors.textSecondary, fontSize: 12, marginTop: 2 },

  // Preview
  previewFrame: {
    flex: 1,
    backgroundColor: colors.surface,
    borderRadius: 16,
    borderWidth: 1,
    borderColor: colors.border,
    overflow: 'hidden',
    marginTop: 8,
    marginBottom: 16,
    alignItems: 'center',
    justifyContent: 'center',
  },
  previewImage: { width: '100%', height: '100%' },

  primaryBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 14,
    borderRadius: 12,
    minHeight: 52,
    gap: 8,
  },
  primaryBtnText: { color: '#FFFFFF', fontSize: 16, fontWeight: '700' },

  ghostBtn: {
    paddingVertical: 12,
    borderRadius: 12,
    alignItems: 'center',
    minHeight: 44,
  },
  ghostBtnText: { color: colors.paytmBlue, fontSize: 14, fontWeight: '600' },

  // Processing
  processingThumb: {
    width: 120,
    height: 160,
    borderRadius: 12,
    backgroundColor: colors.surface,
    borderWidth: 1,
    borderColor: colors.border,
  },
  processingLabel: {
    color: colors.sarvamAccent,
    fontSize: 18,
    fontWeight: '700',
    marginLeft: 10,
  },
  processingHint: {
    color: colors.textSecondary,
    fontSize: 12,
    marginTop: 8,
    textAlign: 'center',
  },

  // Error
  errorBox: {
    padding: 20,
    backgroundColor: colors.surface,
    borderRadius: 16,
    borderWidth: 1,
    borderColor: colors.border,
  },
  errorTitle: { color: colors.textPrimary, fontSize: 17, fontWeight: '700' },
  errorMsg: { color: colors.danger, fontSize: 13, marginTop: 6 },

  retryBtn: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 12,
    borderRadius: 12,
    minHeight: 48,
    gap: 8,
  },
  manualBtn: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 12,
    borderRadius: 12,
    minHeight: 48,
    borderWidth: 1.5,
    backgroundColor: colors.surface,
    gap: 8,
  },
  btnText: { color: '#FFFFFF', fontSize: 14, fontWeight: '700' },
});
