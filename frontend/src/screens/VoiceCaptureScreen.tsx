import React, { useCallback, useEffect, useRef, useState } from 'react';
import {
  View,
  Text,
  Pressable,
  StyleSheet,
  ActivityIndicator,
  Animated,
  Easing,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import {
  useAudioRecorder,
  useAudioRecorderState,
  RecordingPresets,
  requestRecordingPermissionsAsync,
  setAudioModeAsync,
  AudioModule,
} from 'expo-audio';
import { useNavigation } from '@react-navigation/native';
import type { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { X, MicOff, Pencil, RefreshCw } from 'lucide-react-native';

import { MicFAB } from '../components/MicFAB';
import { postVoiceSale } from '../api';
import type { VoiceDraftResponse } from '../api/types';
import { useMerchantStore } from '../store/merchantStore';
import { useDraftSaleStore } from '../store/draftSaleStore';
import { colors } from '../theme';
import type { RootStackParamList } from '../navigation/types';

type Phase = 'idle' | 'permission_denied' | 'listening' | 'processing' | 'error';

export default function VoiceCaptureScreen() {
  const nav = useNavigation<NativeStackNavigationProp<RootStackParamList>>();
  const merchantLang = useMerchantStore((s) => s.merchant?.language ?? 'hi-IN');
  const setDraft = useDraftSaleStore((s) => s.setDraft);

  const recorder = useAudioRecorder(RecordingPresets.HIGH_QUALITY);
  const recorderState = useAudioRecorderState(recorder);

  const [phase, setPhase] = useState<Phase>('idle');
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [transcript, setTranscript] = useState<string | null>(null);

  // Configure audio session for recording on mount
  useEffect(() => {
    setAudioModeAsync({ allowsRecording: true, playsInSilentMode: true }).catch(() => {
      /* non-fatal */
    });
  }, []);

  const ensurePermission = useCallback(async (): Promise<boolean> => {
    const res = await requestRecordingPermissionsAsync();
    if (!res.granted) {
      setPhase('permission_denied');
      return false;
    }
    return true;
  }, []);

  const startListening = useCallback(async () => {
    setErrorMsg(null);
    setTranscript(null);
    const ok = await ensurePermission();
    if (!ok) return;
    try {
      await recorder.prepareToRecordAsync();
      recorder.record();
      setPhase('listening');
    } catch {
      setErrorMsg('माइक शुरू नहीं हुआ / Mic failed to start');
      setPhase('error');
    }
  }, [recorder, ensurePermission]);

  const stopAndParse = useCallback(async () => {
    setPhase('processing');
    try {
      await recorder.stop();
      const uri = recorder.uri;
      if (!uri) throw new Error('no_uri');
      const draft: VoiceDraftResponse = await postVoiceSale(uri, merchantLang);
      setTranscript(draft.transcript);
      setDraft(draft);
      // Replace this modal with the Confirm modal so back-swipe from Confirm
      // doesn't return to a stale capture screen.
      nav.replace('Confirm');
    } catch (e: unknown) {
      // The contract guarantees that 400 parse_failed includes a `transcript`
      // at the response root, so the merchant can still see what was heard
      // and edit manually. Salvage it if present.
      const ax = e as { response?: { data?: { transcript?: string; error?: { code?: string } } } };
      const salvagedTranscript = ax?.response?.data?.transcript;
      if (typeof salvagedTranscript === 'string' && salvagedTranscript.length > 0) {
        setTranscript(salvagedTranscript);
      }

      const code = ax?.response?.data?.error?.code;
      let message: string;
      if (e instanceof Error && e.message === 'no_uri') {
        message = 'रिकॉर्डिंग सेव नहीं हुई / Recording was empty';
      } else if (code === 'stt_failed') {
        message = 'आवाज़ समझ नहीं आई / Could not transcribe audio';
      } else if (code === 'parse_failed') {
        message = 'सामान पहचान नहीं हो पाई / Could not parse items — edit manually below';
      } else if (code === 'upstream_timeout') {
        message = 'Sarvam slow है / Sarvam is slow — try again';
      } else {
        message = 'सर्वर से जवाब नहीं आया / Server did not respond';
      }
      setErrorMsg(message);
      setPhase('error');
    }
  }, [recorder, merchantLang, setDraft, nav]);

  const onFabPress = useCallback(() => {
    if (phase === 'idle' || phase === 'error') return startListening();
    if (phase === 'listening') return stopAndParse();
    // 'processing' / 'permission_denied' — FAB inert
  }, [phase, startListening, stopAndParse]);

  // Best-effort cleanup if user dismisses mid-recording
  useEffect(() => {
    return () => {
      if (recorderState.isRecording) {
        recorder.stop().catch(() => undefined);
      }
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const recording = phase === 'listening';

  return (
    <SafeAreaView style={styles.root}>
      <CloseButton onPress={() => nav.goBack()} />

      <View style={styles.center}>
        {phase === 'permission_denied' ? (
          <PermissionDenied onRetry={startListening} />
        ) : (
          <>
            <PhaseLabel phase={phase} />

            <View style={styles.fabWrap}>
              <MicFAB
                onPress={onFabPress}
                recording={recording}
                size={96}
              />
            </View>

            <PhaseHint phase={phase} />

            {phase === 'processing' ? (
              <View style={styles.processingRow}>
                <ActivityIndicator color={colors.sarvamAccent} />
                <Text style={styles.processingHint}>
                  Sarvam-30B parsing transcript
                </Text>
              </View>
            ) : null}

            {phase === 'error' ? (
              <ErrorPanel
                message={errorMsg}
                transcript={transcript}
                onRetry={startListening}
                onManualEdit={() => {
                  // Send to Confirm with an empty draft skeleton so they can
                  // type line items. Never a dead end.
                  setDraft({
                    draft_id: 'manual',
                    source: 'voice',
                    transcript: transcript ?? '',
                    language_detected: merchantLang,
                    needs_clarification: true,
                    clarification: null,
                    line_items: [],
                    total_amount: 0,
                  });
                  nav.replace('Confirm');
                }}
              />
            ) : null}
          </>
        )}
      </View>

      <PoweredFooter />
    </SafeAreaView>
  );
}

// -----------------------------------------------------------------------------
// Subcomponents
// -----------------------------------------------------------------------------

function CloseButton({ onPress }: { onPress: () => void }) {
  return (
    <Pressable
      onPress={onPress}
      accessibilityRole="button"
      accessibilityLabel="Close"
      hitSlop={12}
      style={styles.closeBtn}
    >
      <X color={colors.textSecondary} size={24} />
    </Pressable>
  );
}

function PhaseLabel({ phase }: { phase: Phase }) {
  // Bilingual primary + caption; switch copy by phase.
  let hi = 'दुकानदारी बोलें';
  let en = 'Speak your sale';
  let toneFg: string = colors.textPrimary;

  if (phase === 'listening') {
    hi = 'सुन रहा हूँ…';
    en = 'Listening…';
    toneFg = colors.sarvamAccent;
  } else if (phase === 'processing') {
    hi = 'समझ रहा हूँ…';
    en = 'Understanding…';
    toneFg = colors.sarvamAccent;
  } else if (phase === 'error') {
    hi = 'कुछ गड़बड़ हुई';
    en = 'Something went wrong';
    toneFg = colors.danger;
  }

  // Re-fire a short fade-in whenever the phase changes so the copy
  // swap feels intentional rather than a jump cut.
  const fade = useRef(new Animated.Value(0)).current;
  useEffect(() => {
    fade.setValue(0);
    Animated.timing(fade, {
      toValue: 1,
      duration: 220,
      easing: Easing.out(Easing.ease),
      useNativeDriver: true,
    }).start();
  }, [phase, fade]);

  return (
    <Animated.View
      style={{ alignItems: 'center', marginBottom: 24, opacity: fade }}
      accessibilityLiveRegion="polite"
    >
      <Text style={{ color: toneFg, fontSize: 22, fontWeight: '700' }}>
        {hi}
      </Text>
      <Text style={{ color: colors.textSecondary, fontSize: 14, marginTop: 4 }}>
        {en}
      </Text>
    </Animated.View>
  );
}

function PhaseHint({ phase }: { phase: Phase }) {
  let text = 'जैसे: "एक पारले-जी और दो किलो आटा"';
  if (phase === 'listening') text = 'Tap mic again when done';
  else if (phase === 'processing') text = '';
  else if (phase === 'error') text = '';

  if (!text) return <View style={{ height: 24, marginTop: 24 }} />;
  return (
    <Text style={styles.hint} numberOfLines={2}>
      {text}
    </Text>
  );
}

function ErrorPanel({
  message,
  transcript,
  onRetry,
  onManualEdit,
}: {
  message: string | null;
  transcript: string | null;
  onRetry: () => void;
  onManualEdit: () => void;
}) {
  return (
    <View style={styles.errorBox}>
      <Text style={styles.errorMsg}>{message ?? 'Unknown error'}</Text>
      {transcript ? (
        <View style={styles.transcriptBox}>
          <Text style={styles.transcriptLabel}>आपने कहा / You said</Text>
          <Text style={styles.transcriptText}>"{transcript}"</Text>
        </View>
      ) : null}
      <View style={{ flexDirection: 'row', marginTop: 16, gap: 8 }}>
        <Pressable
          onPress={onRetry}
          accessibilityRole="button"
          accessibilityLabel="Retry recording"
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
    </View>
  );
}

function PermissionDenied({ onRetry }: { onRetry: () => void }) {
  return (
    <View style={{ alignItems: 'center', padding: 24 }}>
      <MicOff color={colors.danger} size={48} />
      <Text
        style={{
          color: colors.textPrimary,
          fontSize: 18,
          fontWeight: '700',
          marginTop: 12,
          textAlign: 'center',
        }}
      >
        माइक की अनुमति चाहिए
      </Text>
      <Text
        style={{
          color: colors.textSecondary,
          fontSize: 13,
          marginTop: 4,
          textAlign: 'center',
        }}
      >
        We need microphone access to log voice sales.
      </Text>
      <Pressable
        onPress={onRetry}
        style={({ pressed }) => [
          styles.retryBtn,
          {
            marginTop: 20,
            backgroundColor: pressed ? colors.paytmBlueDark : colors.paytmBlue,
          },
        ]}
      >
        <Text style={styles.btnText}>Grant access · अनुमति दें</Text>
      </Pressable>
    </View>
  );
}

function PoweredFooter() {
  return (
    <View style={styles.footer}>
      <Text style={{ color: colors.textSecondary, fontSize: 11 }}>
        Voice powered by{' '}
        <Text style={{ color: colors.sarvamAccent, fontWeight: '700' }}>Sarvam</Text>
      </Text>
    </View>
  );
}

// -----------------------------------------------------------------------------
// Styles
// -----------------------------------------------------------------------------

const styles = StyleSheet.create({
  root: {
    flex: 1,
    backgroundColor: colors.bg,
  },
  closeBtn: {
    position: 'absolute',
    top: 16,
    right: 16,
    zIndex: 10,
    padding: 8,
  },
  center: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 24,
  },
  fabWrap: {
    marginVertical: 12,
  },
  hint: {
    color: colors.textSecondary,
    fontSize: 14,
    textAlign: 'center',
    marginTop: 24,
    maxWidth: 280,
    lineHeight: 20,
  },
  processingRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: 20,
  },
  processingHint: {
    color: colors.sarvamAccent,
    fontSize: 13,
    fontWeight: '500',
    marginLeft: 8,
  },
  errorBox: {
    marginTop: 24,
    width: '100%',
    padding: 16,
    backgroundColor: colors.surface,
    borderRadius: 16,
    borderWidth: 1,
    borderColor: colors.border,
  },
  errorMsg: {
    color: colors.danger,
    fontSize: 14,
    fontWeight: '600',
  },
  transcriptBox: {
    marginTop: 12,
    padding: 12,
    backgroundColor: colors.bg,
    borderRadius: 12,
  },
  transcriptLabel: {
    color: colors.textSecondary,
    fontSize: 11,
    fontWeight: '600',
    marginBottom: 4,
  },
  transcriptText: {
    color: colors.textPrimary,
    fontSize: 14,
    fontStyle: 'italic',
  },
  retryBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 12,
    paddingHorizontal: 16,
    borderRadius: 12,
    minHeight: 48,
    flex: 1,
  },
  manualBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 12,
    paddingHorizontal: 16,
    borderRadius: 12,
    minHeight: 48,
    flex: 1,
    borderWidth: 1.5,
    backgroundColor: colors.surface,
  },
  btnText: {
    color: '#FFFFFF',
    fontSize: 14,
    fontWeight: '700',
    marginLeft: 8,
  },
  footer: {
    paddingBottom: 16,
    alignItems: 'center',
  },
});

// Silences "unused" lint when AudioModule isn't referenced; we import it so the
// native module is registered at module load (needed for permission flows on
// some Android devices).
void AudioModule;
