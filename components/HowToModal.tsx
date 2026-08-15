'use client';

import { Drum, Guitar, MicVocal, Piano } from 'lucide-react';
import { Modal } from '@/components/Modal';
import { useStrings } from '@/store/useSettings';

/** Ilustracao do modo Trecho: o trecho liberado cresce a cada tentativa. */
function SnippetIllustration() {
  return (
    <svg viewBox="0 0 240 44" className="h-11 w-full" role="img" aria-hidden="true">
      <rect x="0" y="14" width="240" height="16" rx="8" fill="rgb(var(--border))" />
      <rect x="0" y="14" width="60" height="16" rx="8" fill="#9a5cff" />
      <rect x="60" y="14" width="40" height="16" rx="8" fill="#9a5cff" opacity="0.55" />
      <rect x="100" y="14" width="50" height="16" rx="8" fill="#9a5cff" opacity="0.3" />
      <text x="4" y="10" fontSize="9" fill="rgb(var(--text-muted))">
        1s
      </text>
      <text x="98" y="10" fontSize="9" fill="rgb(var(--text-muted))">
        4s
      </text>
      <text x="200" y="10" fontSize="9" fill="rgb(var(--text-muted))">
        16s
      </text>
    </svg>
  );
}

/** Ilustracao do modo Banda: camadas entram uma a uma. */
function BandIllustration() {
  const icons = [
    <Drum key="drum" size={20} />,
    <Guitar key="guitar" size={20} />,
    <Piano key="piano" size={20} />,
    <MicVocal key="mic" size={20} />,
  ];

  return (
    <div className="flex items-end gap-2" aria-hidden="true">
      {icons.map((icon, index) => (
        <div
          key={index}
          className="flex h-11 w-11 items-center justify-center rounded-xl border"
          style={{
            borderColor: 'rgb(var(--border))',
            color: index < 2 ? 'rgb(154 92 255)' : 'rgb(var(--text-muted))',
            opacity: 1 - index * 0.2,
          }}
        >
          {icon}
        </div>
      ))}
    </div>
  );
}

export function HowToModal({ open, onClose }: { open: boolean; onClose: () => void }) {
  const strings = useStrings();

  return (
    <Modal open={open} title={strings.howToPlay} onClose={onClose}>
      <div className="space-y-5 text-sm">
        <p className="muted">{strings.howToShared}</p>

        <section className="space-y-2">
          <h3 className="font-bold">{strings.modeTrechoName}</h3>
          <SnippetIllustration />
          <p className="muted">{strings.howToTrecho}</p>
        </section>

        <section className="space-y-2">
          <h3 className="font-bold">{strings.modeBandaName}</h3>
          <BandIllustration />
          <p className="muted">{strings.howToBanda}</p>
        </section>

        <button type="button" className="btn-primary w-full" onClick={onClose}>
          {strings.gotIt}
        </button>
      </div>
    </Modal>
  );
}
