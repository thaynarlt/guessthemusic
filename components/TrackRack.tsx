'use client';

import type { ReactNode } from 'react';
import { Lock } from 'lucide-react';
import { useStrings } from '@/store/useSettings';

export interface RackItem {
  id: string;
  label: string;
  icon: ReactNode;
}

interface TrackRackProps {
  items: RackItem[];
  /** Quantos itens ja foram liberados, da esquerda para a direita. */
  unlocked: number;
  muted: Set<string>;
  onToggle: (id: string) => void;
  /** Falso deixa o rack apenas informativo (usado na revelacao final). */
  interactive?: boolean;
}

/**
 * Rack do modo Banda: liberados coloridos e clicaveis (liga/desliga), travados
 * em silhueta. Serve tanto para instrumentos quanto para camadas de frequencia.
 */
export function TrackRack({
  items,
  unlocked,
  muted,
  onToggle,
  interactive = true,
}: TrackRackProps) {
  const strings = useStrings();

  return (
    <ul className="grid w-full max-w-md grid-cols-6 gap-1.5">
      {items.map((item, index) => {
        const open = index < unlocked;
        const off = muted.has(item.id);

        return (
          <li key={item.id}>
            <button
              type="button"
              disabled={!open || !interactive}
              onClick={() => onToggle(item.id)}
              aria-pressed={open ? !off : undefined}
              aria-label={`${item.label}: ${
                open ? (off ? strings.muted : strings.unmuted) : strings.stemHintLocked
              }`}
              title={open ? strings.stemHintMute : strings.stemHintLocked}
              className={`tap flex w-full flex-col items-center gap-1.5 rounded-xl border px-1 py-2.5 transition ${
                open && interactive ? 'hover:bg-grape-500/10' : ''
              } ${open ? '' : 'cursor-not-allowed'}`}
              style={{
                borderColor: open ? 'rgb(var(--border))' : 'transparent',
                backgroundColor: open && !off ? 'rgb(154 92 255 / 0.14)' : 'transparent',
                color: open && !off ? 'rgb(154 92 255)' : 'rgb(var(--text-muted))',
                opacity: open ? (off ? 0.5 : 1) : 0.3,
              }}
            >
              {open ? item.icon : <Lock size={20} aria-hidden="true" />}
              <span
                className="text-[10px] font-semibold leading-tight"
                style={{ color: 'rgb(var(--text-muted))' }}
              >
                {item.label}
              </span>
            </button>
          </li>
        );
      })}
    </ul>
  );
}
