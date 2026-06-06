import React, { useCallback, useEffect, useRef, useState } from 'react';
import {
  View,
  Text,
  ScrollView,
  Pressable,
  TextInput,
  ActivityIndicator,
  KeyboardAvoidingView,
  Platform,
  StyleSheet,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import {
  useAudioRecorder,
  useAudioRecorderState,
  RecordingPresets,
  requestRecordingPermissionsAsync,
  setAudioModeAsync,
} from 'expo-audio';
import { MessageCircle, Send, Volume2, Sparkles } from 'lucide-react-native';

import {
  queryAssistant,
  queryAssistantAudio,
  speakText,
} from '../api';
import type { AssistantQueryResponse } from '../api/types';
import { useMerchantStore } from '../store/merchantStore';
import { MicFAB } from '../components/MicFAB';
import { colors } from '../theme';

type Msg =
  | { id: string; role: 'user'; text: string }
  | {
      id: string;
      role: 'assistant';
      text: string;
      audioUrl: string;
      data: Record<string, unknown>;
    };

type Status = 'idle' | 'listening' | 'thinking' | 'error';

const SUGGESTIONS: { hi: string; en: string }[] = [
  { hi: 'आज कितना बेचा?',           en: "Today's sales?" },
  { hi: 'इस हफ़्ते सबसे ज़्यादा क्या बिका?', en: 'Top mover this week?' },
  { hi: 'क्या ख़त्म होने वाला है?',     en: "What's running low?" },
];

export default function AssistantScreen() {
  const merchantLang = useMerchantStore((s) => s.merchant?.language ?? 'hi-IN');

  const [messages, setMessages] = useState<Msg[]>([]);
  const [input, setInput] = useState('');
  const [status, setStatus] = useState<Status>('idle');
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  const scrollRef = useRef<ScrollView | null>(null);

  // Audio recorder for voice questions
  const recorder = useAudioRecorder(RecordingPresets.HIGH_QUALITY);
  const recorderState = useAudioRecorderState(recorder);

  useEffect(() => {
    setAudioModeAsync({ allowsRecording: true, playsInSilentMode: true }).catch(
      () => undefined,
    );
  }, []);

  useEffect(() => {
    // Best-effort cleanup on unmount
    return () => {
      if (recorderState.isRecording) {
        recorder.stop().catch(() => undefined);
      }
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const appendUser = (text: string): string => {
    const id = `u-${Date.now()}`;
    setMessages((prev) => [...prev, { id, role: 'user', text }]);
    return id;
  };
  const appendAssistant = (res: AssistantQueryResponse) => {
    const id = `a-${Date.now()}`;
    setMessages((prev) => [
      ...prev,
      {
        id,
        role: 'assistant',
        text: res.answer_text,
        audioUrl: res.answer_audio_url,
        data: res.data,
      },
    ]);
  };

  const scrollToEnd = () =>
    setTimeout(() => scrollRef.current?.scrollToEnd({ animated: true }), 50);

  const sendText = useCallback(
    async (text: string) => {
      const trimmed = text.trim();
      if (!trimmed) return;
      setErrorMsg(null);
      setInput('');
      appendUser(trimmed);
      scrollToEnd();
      setStatus('thinking');
      try {
        const res = await queryAssistant(trimmed, merchantLang);
        appendAssistant(res);
        setStatus('idle');
        scrollToEnd();
      } catch {
        setErrorMsg('जवाब नहीं आया / No reply');
        setStatus('error');
      }
    },
    [merchantLang],
  );

  const startListening = useCallback(async () => {
    setErrorMsg(null);
    const perm = await requestRecordingPermissionsAsync();
    if (!perm.granted) {
      setErrorMsg('माइक की अनुमति चाहिए / Mic permission needed');
      setStatus('error');
      return;
    }
    try {
      await recorder.prepareToRecordAsync();
      recorder.record();
      setStatus('listening');
    } catch {
      setErrorMsg('माइक शुरू नहीं हुआ / Mic failed to start');
      setStatus('error');
    }
  }, [recorder]);

  const stopAndAsk = useCallback(async () => {
    setStatus('thinking');
    try {
      await recorder.stop();
      const uri = recorder.uri;
      if (!uri) throw new Error('no_uri');
      const res = await queryAssistantAudio(uri, merchantLang);
      // Show the transcribed question + answer
      appendUser(res.question_text || '🎤');
      scrollToEnd();
      appendAssistant(res);
      setStatus('idle');
      scrollToEnd();
    } catch {
      setErrorMsg('जवाब नहीं आया / No reply');
      setStatus('error');
    }
  }, [recorder, merchantLang]);

  const onMicPress = useCallback(() => {
    if (status === 'idle' || status === 'error') return startListening();
    if (status === 'listening') return stopAndAsk();
    // 'thinking' — inert
  }, [status, startListening, stopAndAsk]);

  const replay = useCallback(
    (text: string) => {
      // Fire-and-forget TTS. Actual playback wiring is the next iteration; this
      // at least re-requests the audio so the backend regenerates fresh Bulbul.
      speakText(text, merchantLang).catch(() => undefined);
    },
    [merchantLang],
  );

  return (
    <SafeAreaView style={styles.root} edges={['top']}>
      <Header />

      <KeyboardAvoidingView
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
        style={{ flex: 1 }}
        keyboardVerticalOffset={Platform.OS === 'ios' ? 80 : 0}
      >
        <ScrollView
          ref={scrollRef}
          style={styles.thread}
          contentContainerStyle={{ paddingVertical: 16 }}
        >
          {messages.length === 0 ? (
            <EmptyHint onSuggest={(t) => sendText(t)} />
          ) : (
            messages.map((m) =>
              m.role === 'user' ? (
                <UserBubble key={m.id} text={m.text} />
              ) : (
                <AssistantBubble
                  key={m.id}
                  text={m.text}
                  data={m.data}
                  onReplay={() => replay(m.text)}
                />
              ),
            )
          )}

          {status === 'thinking' ? <ThinkingBubble /> : null}
          {status === 'error' && errorMsg ? (
            <ErrorBubble message={errorMsg} />
          ) : null}
        </ScrollView>

        <Composer
          value={input}
          onChange={setInput}
          onSend={() => sendText(input)}
          onMicPress={onMicPress}
          recording={status === 'listening'}
          disabled={status === 'thinking'}
        />
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

// -----------------------------------------------------------------------------
// Bubbles & composer
// -----------------------------------------------------------------------------

function Header() {
  return (
    <View style={styles.header}>
      <View style={styles.headerIcon}>
        <Sparkles color={colors.sarvamAccent} size={18} />
      </View>
      <View>
        <Text style={styles.headerHi}>सहायक</Text>
        <Text style={styles.headerEn}>Ask anything · Sarvam</Text>
      </View>
    </View>
  );
}

function EmptyHint({ onSuggest }: { onSuggest: (text: string) => void }) {
  return (
    <View style={styles.emptyWrap}>
      <View style={styles.emptyIconCircle}>
        <MessageCircle color={colors.sarvamAccent} size={28} />
      </View>
      <Text style={styles.emptyTitle}>आज दुकान के बारे में पूछें</Text>
      <Text style={styles.emptyCaption}>
        Ask about today's sales, top sellers, or what's running low.
      </Text>
      <View style={styles.suggestList}>
        {SUGGESTIONS.map((s) => (
          <Pressable
            key={s.en}
            onPress={() => onSuggest(s.hi)}
            accessibilityRole="button"
            accessibilityLabel={s.en}
            style={[styles.suggest]}
          >
            <Text style={styles.suggestHi}>{s.hi}</Text>
            <Text style={styles.suggestEn}>{s.en}</Text>
          </Pressable>
        ))}
      </View>
    </View>
  );
}

function UserBubble({ text }: { text: string }) {
  return (
    <View style={styles.userRow}>
      <View style={styles.userBubble}>
        <Text style={styles.userText}>{text}</Text>
      </View>
    </View>
  );
}

function AssistantBubble({
  text,
  data,
  onReplay,
}: {
  text: string;
  data: Record<string, unknown>;
  onReplay: () => void;
}) {
  const cards = extractDataCards(data);
  return (
    <View style={styles.aRow}>
      <View style={styles.aAvatar}>
        <Sparkles color={colors.sarvamAccent} size={14} />
      </View>
      <View style={{ flex: 1 }}>
        <View style={styles.aBubble}>
          <Text style={styles.aText}>{text}</Text>
          {cards.length > 0 ? (
            <View style={styles.dataCard}>
              {cards.map((row, i) => (
                <Text key={i} style={styles.dataRow}>
                  <Text style={styles.dataKey}>{row.label}: </Text>
                  <Text style={styles.dataVal}>{row.value}</Text>
                </Text>
              ))}
            </View>
          ) : null}
        </View>
        <Pressable
          onPress={onReplay}
          accessibilityRole="button"
          accessibilityLabel="Replay answer"
          hitSlop={8}
          style={styles.replay}
        >
          <Volume2 color={colors.sarvamAccent} size={14} />
          <Text style={styles.replayText}>Replay · दोबारा सुनें</Text>
        </Pressable>
      </View>
    </View>
  );
}

function ThinkingBubble() {
  return (
    <View style={styles.aRow}>
      <View style={styles.aAvatar}>
        <Sparkles color={colors.sarvamAccent} size={14} />
      </View>
      <View style={[styles.aBubble, styles.thinkingBubble]}>
        <ActivityIndicator size="small" color={colors.sarvamAccent} />
        <Text style={styles.thinkingText}>समझ रहा हूँ… / Thinking…</Text>
      </View>
    </View>
  );
}

function ErrorBubble({ message }: { message: string }) {
  return (
    <View style={styles.aRow}>
      <View style={[styles.aAvatar, { backgroundColor: '#FDE6E7' }]}>
        <Sparkles color={colors.danger} size={14} />
      </View>
      <View style={[styles.aBubble, { borderColor: colors.danger }]}>
        <Text style={[styles.aText, { color: colors.danger }]}>{message}</Text>
      </View>
    </View>
  );
}

function Composer({
  value,
  onChange,
  onSend,
  onMicPress,
  recording,
  disabled,
}: {
  value: string;
  onChange: (s: string) => void;
  onSend: () => void;
  onMicPress: () => void;
  recording: boolean;
  disabled: boolean;
}) {
  const canSend = value.trim().length > 0 && !disabled;
  return (
    <View style={styles.composer}>
      <View style={styles.inputRow}>
        <TextInput
          value={value}
          onChangeText={onChange}
          placeholder="कुछ पूछें… / Ask anything…"
          placeholderTextColor={colors.textSecondary}
          editable={!disabled && !recording}
          multiline
          style={styles.input}
        />
        <Pressable
          onPress={onSend}
          disabled={!canSend}
          accessibilityRole="button"
          accessibilityLabel="Send"
          style={[
            styles.sendBtn,
            { backgroundColor: canSend ? colors.paytmBlue : colors.border },
          ]}
        >
          <Send color="#FFFFFF" size={18} />
        </Pressable>
      </View>
      <View style={styles.micRow}>
        <MicFAB onPress={onMicPress} recording={recording} size={56} />
      </View>
    </View>
  );
}

// -----------------------------------------------------------------------------
// Helpers
// -----------------------------------------------------------------------------

/**
 * Flatten the `data` payload (which can be any shape per the contract) into
 * a small key/value preview to render inside the assistant bubble.
 * Handles the shapes the backend sends today: top_movers[], running_low[], etc.
 */
function extractDataCards(
  data: Record<string, unknown>,
): { label: string; value: string }[] {
  const out: { label: string; value: string }[] = [];
  for (const [key, val] of Object.entries(data)) {
    if (!Array.isArray(val) || val.length === 0) continue;
    val.slice(0, 3).forEach((row) => {
      if (typeof row !== 'object' || row === null) return;
      const r = row as Record<string, unknown>;
      const name = typeof r.name === 'string' ? r.name : null;
      if (!name) return;
      let value = '';
      if (typeof r.units === 'number') value = `${r.units} units`;
      else if (typeof r.stock === 'number') value = `${r.stock} in stock`;
      else if (typeof r.revenue_paise === 'number')
        value = `₹${Math.round(r.revenue_paise / 100)}`;
      out.push({ label: name, value: `${value || prettyKey(key)}` });
    });
  }
  return out.slice(0, 5);
}

const prettyKey = (k: string) => k.replace(/_/g, ' ');

// -----------------------------------------------------------------------------
// Styles
// -----------------------------------------------------------------------------

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: colors.bg },

  header: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 20,
    paddingVertical: 12,
  },
  headerIcon: {
    width: 32,
    height: 32,
    borderRadius: 8,
    backgroundColor: colors.sarvamAccentTint,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 10,
  },
  headerHi: { color: colors.paytmBlueDark, fontSize: 20, fontWeight: '700' },
  headerEn: { color: colors.textSecondary, fontSize: 12, marginTop: 1 },

  thread: { flex: 1, paddingHorizontal: 16 },

  // Empty state
  emptyWrap: { alignItems: 'center', marginTop: 32, paddingHorizontal: 16 },
  emptyIconCircle: {
    width: 64,
    height: 64,
    borderRadius: 32,
    backgroundColor: colors.sarvamAccentTint,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 16,
  },
  emptyTitle: { color: colors.textPrimary, fontSize: 18, fontWeight: '700' },
  emptyCaption: {
    color: colors.textSecondary,
    fontSize: 13,
    marginTop: 6,
    textAlign: 'center',
  },
  suggestList: { marginTop: 24, width: '100%', gap: 8 },
  suggest: {
    backgroundColor: colors.surface,
    borderRadius: 12,
    paddingVertical: 12,
    paddingHorizontal: 14,
    borderWidth: 1,
    borderColor: colors.border,
    minHeight: 48,
  },
  suggestHi: { color: colors.textPrimary, fontSize: 15, fontWeight: '600' },
  suggestEn: { color: colors.textSecondary, fontSize: 12, marginTop: 2 },

  // User bubble (right, Paytm blue)
  userRow: {
    flexDirection: 'row',
    justifyContent: 'flex-end',
    marginVertical: 6,
  },
  userBubble: {
    backgroundColor: colors.paytmBlue,
    borderRadius: 16,
    borderTopRightRadius: 4,
    paddingHorizontal: 14,
    paddingVertical: 10,
    maxWidth: '80%',
  },
  userText: { color: '#FFFFFF', fontSize: 15, fontWeight: '500' },

  // Assistant bubble (left, Sarvam tint)
  aRow: { flexDirection: 'row', marginVertical: 6, alignItems: 'flex-end' },
  aAvatar: {
    width: 28,
    height: 28,
    borderRadius: 14,
    backgroundColor: colors.sarvamAccentTint,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 8,
  },
  aBubble: {
    backgroundColor: colors.surface,
    borderRadius: 16,
    borderTopLeftRadius: 4,
    padding: 12,
    borderWidth: 1,
    borderColor: colors.border,
    maxWidth: '85%',
  },
  aText: { color: colors.textPrimary, fontSize: 15, lineHeight: 21 },

  dataCard: {
    marginTop: 10,
    paddingTop: 10,
    borderTopWidth: 1,
    borderTopColor: colors.border,
  },
  dataRow: { fontSize: 13, marginBottom: 2 },
  dataKey: { color: colors.textPrimary, fontWeight: '600' },
  dataVal: { color: colors.textSecondary },

  replay: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: 6,
    marginLeft: 4,
    paddingVertical: 4,
  },
  replayText: {
    color: colors.sarvamAccent,
    fontSize: 12,
    fontWeight: '600',
    marginLeft: 6,
  },

  thinkingBubble: { flexDirection: 'row', alignItems: 'center' },
  thinkingText: {
    color: colors.textSecondary,
    fontSize: 14,
    marginLeft: 8,
  },

  // Composer
  composer: {
    borderTopWidth: 1,
    borderTopColor: colors.border,
    backgroundColor: colors.surface,
    paddingHorizontal: 12,
    paddingTop: 10,
    paddingBottom: 8,
  },
  inputRow: { flexDirection: 'row', alignItems: 'flex-end' },
  input: {
    flex: 1,
    backgroundColor: colors.bg,
    borderRadius: 16,
    paddingHorizontal: 14,
    paddingVertical: 10,
    fontSize: 15,
    color: colors.textPrimary,
    minHeight: 44,
    maxHeight: 120,
  },
  sendBtn: {
    width: 44,
    height: 44,
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
    marginLeft: 8,
  },
  micRow: { alignItems: 'center', marginTop: 8 },
});
