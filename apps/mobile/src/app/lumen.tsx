import {
  activeConversation, formatDayShort, lumenPlainText, toISODate, type Citation, type Message,
} from '@catalysis/api';
import { useRouter } from 'expo-router';
import { useRef, useState } from 'react';
import { KeyboardAvoidingView, Platform, ScrollView, StyleSheet, Text, View } from 'react-native';

import { Chip, TextLink } from '@/components/Buttons';
import { Composer } from '@/components/Composer';
import { FieldError } from '@/components/Field';
import { Label } from '@/components/Label';
import { HeaderBar } from '@/components/Masthead';
import { Screen } from '@/components/Screen';
import { Sheet } from '@/components/Sheet';
import { EmptyState, SkeletonLines } from '@/components/States';
import { IconButton, Touchable } from '@/components/Touchable';
import { MessageBlocks, SourceList } from '@/features/lumen/MessageBlocks';
import { useLumenChat } from '@/features/lumen/useLumenChat';
import { copyText } from '@/lib/native';
import { actions, useApp } from '@/lib/store';
import { colors, display, spacing, text } from '@/theme';

const SUGGESTIONS = ['Forgiveness when it’s hard', 'Who were the three archangels?', 'How to pray the Examen'];
const DISCLAIMER = 'Lumen is a study aid, not a substitute for a priest or spiritual director.';

/** 08 · AI Chat. Full screen. */
export default function Lumen() {
  const router = useRouter();
  const conversation = useApp(activeConversation);
  const conversations = useApp((s) => s.conversations);
  const chat = useLumenChat();

  const [draft, setDraft] = useState('');
  const [menu, setMenu] = useState(false);
  const [sources, setSources] = useState<Citation[] | null>(null);
  const [sourcesOpen, setSourcesOpen] = useState(false);
  const thread = useRef<ScrollView>(null);

  const messages = conversation?.messages ?? [];
  const busy = chat.streaming !== null;
  const last = messages[messages.length - 1];
  const followUps = !busy && last?.role === 'assistant' ? last.followUps : [];
  const error = chat.error && chat.error.conversationId === conversation?.id ? chat.error : null;
  const history = conversations.filter((item) => item.messages.length > 0);

  const send = (value: string) => {
    chat.send(value);
    setDraft('');
  };

  const openConversation = (id: string | null) => {
    actions().setActiveConversation(id);
    chat.clearError();
    setMenu(false);
  };

  return (
    <Screen>
      <HeaderBar
        left={<IconButton name="chevron-left" size={20} label="Back" onPress={() => (router.canGoBack() ? router.back() : router.replace('/today'))} />}
        center={
          <>
            <Text accessibilityRole="header" style={styles.title}>Lumen</Text>
            <Label size={8} color={colors.muted} style={styles.subtitle}>Scripture & Catechism</Label>
          </>
        }
        right={<IconButton name="more-horizontal" label="Conversations and settings" onPress={() => setMenu(true)} />}
      />

      <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : undefined} style={styles.fill}>
        <ScrollView
          ref={thread}
          keyboardShouldPersistTaps="handled"
          showsVerticalScrollIndicator={false}
          onContentSizeChange={() => thread.current?.scrollToEnd({ animated: true })}
          contentContainerStyle={styles.thread}>
          {messages.length === 0 ? (
            <View style={styles.welcome}>
              <Text style={styles.welcomeTitle}>Lumen</Text>
              <Text style={styles.welcomeDeck}>Answers drawn from Scripture and the Catechism, with sources.</Text>
              <View style={styles.suggestions}>
                {SUGGESTIONS.map((suggestion) => (
                  <Chip key={suggestion} label={suggestion} padV={9} onPress={() => send(suggestion)} />
                ))}
              </View>
            </View>
          ) : (
            <>
              <Label size={8.5} color={colors.subtle} style={styles.date}>
                {dayLabel(conversation?.updatedAt)}
              </Label>
              {messages.map((message) =>
                message.role === 'user' ? (
                  <View key={message.id} style={styles.question}>
                    <Text style={styles.questionText}>{message.content}</Text>
                  </View>
                ) : (
                  <Answer
                    key={message.id}
                    message={message}
                    streaming={chat.streaming?.messageId === message.id}
                    onToggleSaved={() =>
                      conversation && actions().updateMessage(conversation.id, message.id, { saved: !message.saved })}
                    onSources={() => {
                      setSources(message.citations);
                      setSourcesOpen(true);
                    }}
                  />
                ),
              )}
              {followUps.length > 0 ? (
                <View style={styles.chips}>
                  {followUps.map((followUp) => (
                    <Chip key={followUp} label={followUp} padV={9} onPress={() => send(followUp)} />
                  ))}
                </View>
              ) : null}
            </>
          )}

          {error ? (
            <View>
              <FieldError>{error.message}</FieldError>
              <TextLink label="Try again" onPress={chat.retry} style={styles.retry} />
            </View>
          ) : null}
        </ScrollView>

        <Composer
          value={draft}
          onChangeText={setDraft}
          onSend={() => send(draft)}
          busy={busy}
          placeholder="Ask about scripture, prayer, the saints…"
          sendLabel="Ask Lumen"
        />
      </KeyboardAvoidingView>

      <Sheet visible={menu} onClose={() => setMenu(false)} title="Conversations" scroll>
        <Touchable
          hitSlop={undefined}
          onPress={() => openConversation(null)}
          accessibilityRole="button"
          style={styles.newConversation}>
          <Label weight="semibold">+ New conversation</Label>
        </Touchable>
        {history.map((item) => {
          const active = item.id === conversation?.id;
          return (
            <Touchable
              key={item.id}
              hitSlop={undefined}
              onPress={() => openConversation(item.id)}
              accessibilityRole="button"
              accessibilityState={{ selected: active }}
              style={styles.historyRow}>
              <Text style={[styles.historyTitle, active && styles.historyActive]} numberOfLines={2}>
                {item.title}
              </Text>
            </Touchable>
          );
        })}
        <Text style={styles.disclaimer}>{DISCLAIMER}</Text>
      </Sheet>

      <Sheet visible={sourcesOpen} onClose={() => setSourcesOpen(false)} title="Sources in this answer" scroll>
        {sources && sources.length > 0
          ? <SourceList citations={sources} />
          : <EmptyState align="left" style={styles.noSources}>No sources were cited in this answer.</EmptyState>}
        <Text style={styles.disclaimer}>{DISCLAIMER}</Text>
      </Sheet>
    </Screen>
  );
}

function dayLabel(iso: string | undefined): string {
  if (!iso) return 'Today';
  const date = new Date(iso);
  return toISODate(date) === toISODate(new Date()) ? 'Today' : formatDayShort(date);
}

interface AnswerProps {
  message: Message;
  streaming: boolean;
  onToggleSaved: () => void;
  onSources: () => void;
}

function Answer({ message, streaming, onToggleSaved, onSources }: AnswerProps) {
  const [copied, setCopied] = useState(false);

  const copy = async () => {
    if (await copyText(lumenPlainText(message.content))) {
      setCopied(true);
      setTimeout(() => setCopied(false), 1600);
    }
  };

  return (
    <View>
      <Label weight="semibold" color={colors.crimson}>Lumen</Label>
      <View style={styles.answerBody}>
        {message.content
          ? <MessageBlocks content={message.content} />
          : <SkeletonLines lines={3} gap={12} height={12} />}
      </View>
      {streaming ? null : (
        <>
          <View style={styles.answerActions}>
            <AnswerAction label={copied ? 'Copied' : 'Copy'} onPress={() => void copy()} />
            <AnswerAction label={message.saved ? 'Saved' : 'Save'} selected={Boolean(message.saved)} onPress={onToggleSaved} />
            <AnswerAction label="Sources" onPress={onSources} />
          </View>
          {message.demo ? <Label size={8} color={colors.subtle} style={styles.demo}>Demo answer</Label> : null}
        </>
      )}
    </View>
  );
}

function AnswerAction({ label, onPress, selected }: { label: string; onPress: () => void; selected?: boolean }) {
  return (
    <Touchable
      onPress={onPress}
      accessibilityRole="button"
      accessibilityLabel={label}
      accessibilityState={selected === undefined ? undefined : { selected }}>
      <Label size={8.5} color={selected ? colors.crimson : colors.subtle}>{label}</Label>
    </Touchable>
  );
}

const styles = StyleSheet.create({
  fill: { flex: 1 },
  title: { ...display(22, { lineHeight: 1 }), color: colors.ink, paddingTop: 3 },
  subtitle: { marginTop: 5 },
  thread: { flexGrow: 1, gap: 18, paddingTop: 18, paddingHorizontal: spacing.pageMobile, paddingBottom: 24 },
  welcome: { flex: 1, alignItems: 'center', justifyContent: 'center', paddingVertical: 32 },
  welcomeTitle: { ...display(40), color: colors.ink },
  welcomeDeck: {
    ...text(15, { italic: true, lineHeight: 1.5 }),
    color: colors.muted,
    textAlign: 'center',
    marginTop: 8,
    maxWidth: 280,
  },
  suggestions: { alignItems: 'center', gap: 8, marginTop: 26 },
  date: { textAlign: 'center' },
  question: {
    alignSelf: 'flex-end',
    maxWidth: '80%',
    backgroundColor: colors.ink,
    paddingVertical: 13,
    paddingHorizontal: 16,
  },
  questionText: { ...text(15, { lineHeight: 1.5 }), color: colors.paper },
  answerBody: { marginTop: 8 },
  answerActions: { flexDirection: 'row', gap: 18, marginTop: 12 },
  demo: { marginTop: 10 },
  chips: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
  retry: { marginTop: 12 },
  newConversation: { paddingVertical: 14, borderTopWidth: 1, borderTopColor: colors.ink, borderBottomWidth: 1, borderBottomColor: colors.rule },
  historyRow: { paddingVertical: 13, borderBottomWidth: 1, borderBottomColor: colors.rule },
  historyTitle: { ...text(15.5, { lineHeight: 1.4 }), color: colors.ink },
  historyActive: { color: colors.crimson },
  noSources: { paddingHorizontal: 0, paddingVertical: 12 },
  disclaimer: { ...text(13, { italic: true, lineHeight: 1.5 }), color: colors.subtle, marginTop: 22 },
});
