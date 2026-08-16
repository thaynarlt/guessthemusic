'use client';

import { useEffect, useRef, useState } from 'react';
import { ChevronDown, MessageCircle, Send } from 'lucide-react';
import { MAX_CHAT_LENGTH, type RoomEvent } from '@/lib/room/protocol';
import { useStrings } from '@/store/useSettings';

interface RoomFeedProps {
  feed: readonly RoomEvent[];
  meId: string | null;
  onSay: (text: string) => void;
}

/**
 * Mural da sala: quem entrou, quem saiu e a conversa, na mesma lista.
 *
 * Comeca fechado porque a tela do celular ja esta cheia — e a partida, nao a
 * conversa, e o que precisa de espaco. O contador no botao avisa do que chegou
 * enquanto estava fechado.
 */
export function RoomFeed({ feed, meId, onSay }: RoomFeedProps) {
  const strings = useStrings();
  const [open, setOpen] = useState(false);
  const [text, setText] = useState('');
  const [seen, setSeen] = useState(0);
  const list = useRef<HTMLOListElement>(null);

  const unread = Math.max(0, feed.length - seen);

  // Aberto, tudo o que chega ja conta como lido.
  useEffect(() => {
    if (open) setSeen(feed.length);
  }, [open, feed.length]);

  // Rola para a ultima linha, senao a conversa "some" para cima.
  useEffect(() => {
    if (open && list.current) list.current.scrollTop = list.current.scrollHeight;
  }, [open, feed.length]);

  const send = () => {
    onSay(text);
    setText('');
  };

  return (
    <section className="surface overflow-hidden">
      <button
        type="button"
        className="tap flex w-full items-center gap-2 px-4 py-3 text-sm font-bold"
        aria-expanded={open}
        onClick={() => setOpen((current) => !current)}
      >
        <MessageCircle size={18} aria-hidden="true" className="text-neon-500" />
        {strings.roomChat}
        {unread > 0 && !open && (
          <span className="rounded-full bg-neon-500 px-2 py-0.5 text-xs font-extrabold text-black">
            {unread}
          </span>
        )}
        <ChevronDown
          size={18}
          aria-hidden="true"
          className={`ml-auto muted transition ${open ? 'rotate-180' : ''}`}
        />
      </button>

      {open && (
        <div
          className="space-y-2 border-t px-4 pb-4 pt-3"
          style={{ borderColor: 'rgb(var(--border))' }}
        >
          <ol ref={list} className="max-h-48 space-y-1.5 overflow-y-auto text-sm">
            {feed.length === 0 && <li className="muted italic">{strings.roomChatEmpty}</li>}

            {feed.map((event, index) => (
              <li key={`${event.at}-${index}`}>
                {event.kind === 'chat' ? (
                  <>
                    <span className={`font-semibold ${event.id === meId ? 'text-grape-500' : ''}`}>
                      {event.name}
                    </span>
                    <span className="muted">: </span>
                    <span className="break-words">{event.text}</span>
                  </>
                ) : (
                  <span className="muted italic">
                    {(event.kind === 'joined' ? strings.playerJoined : strings.playerLeft).replace(
                      '{name}',
                      event.name,
                    )}
                  </span>
                )}
              </li>
            ))}
          </ol>

          <div className="flex gap-2">
            <input
              type="text"
              value={text}
              maxLength={MAX_CHAT_LENGTH}
              placeholder={strings.roomChatPlaceholder}
              aria-label={strings.roomChatPlaceholder}
              onChange={(event) => setText(event.target.value)}
              onKeyDown={(event) => {
                if (event.key === 'Enter') send();
              }}
              className="tap min-h-[44px] w-full rounded-xl border bg-transparent px-3 text-base outline-none"
              style={{ borderColor: 'rgb(var(--border))' }}
            />
            <button
              type="button"
              className="btn-ghost px-3 disabled:opacity-40"
              disabled={text.trim().length === 0}
              onClick={send}
              aria-label={strings.submit}
            >
              <Send size={16} aria-hidden="true" />
            </button>
          </div>
        </div>
      )}
    </section>
  );
}
