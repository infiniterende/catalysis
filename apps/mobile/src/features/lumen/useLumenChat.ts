import { conversationTitle, newId, type Conversation, type Message } from '@catalysis/api';
import { useEffect, useRef, useState } from 'react';

import { askLumen, createThrottle, errorMessage, isAbort } from '@/lib/lumen';
import { actions, store } from '@/lib/store';

interface Streaming {
  conversationId: string;
  messageId: string;
}

interface ChatError {
  conversationId: string;
  message: string;
}

const findConversation = (id: string | null): Conversation | undefined =>
  store.getState().conversations.find((conversation) => conversation.id === id);

/** The store has no action for this; an answer that never arrived should not linger as an empty message. */
function removeMessage(conversationId: string, messageId: string): void {
  store.setState({
    conversations: store.getState().conversations.map((conversation) =>
      conversation.id === conversationId
        ? { ...conversation, messages: conversation.messages.filter((message) => message.id !== messageId) }
        : conversation,
    ),
  });
}

function message(role: Message['role'], content: string): Message {
  return { id: newId('msg'), role, content, citations: [], followUps: [], createdAt: new Date().toISOString() };
}

/** Sends questions to Lumen and streams the answers into the active conversation. */
export function useLumenChat() {
  const [streaming, setStreaming] = useState<Streaming | null>(null);
  const [error, setError] = useState<ChatError | null>(null);
  const controller = useRef<AbortController | null>(null);

  // Leaving the screen abandons any answer in flight.
  useEffect(() => () => controller.current?.abort(), []);

  /** Asks for an answer to the conversation as it stands, which must end with a user message. */
  const answer = (conversationId: string) => {
    const conversation = findConversation(conversationId);
    if (!conversation) return;

    const history = conversation.messages.map(({ role, content }) => ({ role, content }));
    const reply = message('assistant', '');
    actions().appendMessage(conversationId, reply);

    const abort = new AbortController();
    controller.current = abort;
    setStreaming({ conversationId, messageId: reply.id });
    setError(null);

    const throttle = createThrottle((content) => {
      if (!abort.signal.aborted) actions().updateMessage(conversationId, reply.id, { content });
    });
    let received = '';

    askLumen({ mode: 'chat', messages: history }, {
      signal: abort.signal,
      onDelta: (delta) => {
        received += delta;
        throttle.push(delta);
      },
    })
      .then((result) => {
        throttle.cancel();
        actions().updateMessage(conversationId, reply.id, {
          content: result.content,
          citations: result.citations,
          followUps: result.followUps,
          demo: result.demo,
        });
      })
      .catch((failure: unknown) => {
        throttle.cancel();
        if (isAbort(failure) && received) {
          // Keep what had arrived before the reader left.
          actions().updateMessage(conversationId, reply.id, { content: received });
          return;
        }
        removeMessage(conversationId, reply.id);
        if (!isAbort(failure)) setError({ conversationId, message: errorMessage(failure) });
      })
      .finally(() => {
        if (controller.current === abort) {
          controller.current = null;
          setStreaming(null);
        }
      });
  };

  const send = (text: string) => {
    const question = text.trim();
    if (!question || controller.current) return;

    const state = store.getState();
    const existing = findConversation(state.activeConversationId);
    // A conversation is only created once there is something to put in it.
    const conversationId = existing?.id ?? actions().startConversation();
    if (!existing || existing.messages.length === 0) {
      actions().renameConversation(conversationId, conversationTitle(question));
    }
    actions().appendMessage(conversationId, message('user', question));
    answer(conversationId);
  };

  const retry = () => {
    if (error && !controller.current) answer(error.conversationId);
  };

  return { send, retry, streaming, error, clearError: () => setError(null) };
}
