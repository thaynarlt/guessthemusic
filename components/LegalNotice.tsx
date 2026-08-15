'use client';

import { useState } from 'react';
import { ExternalLink } from 'lucide-react';
import { AppHeader } from '@/components/AppHeader';
import { HowToModal } from '@/components/HowToModal';
import { legalPages, REPO_URL } from '@/lib/i18n/legal';
import { useSettings } from '@/store/useSettings';

/** Aviso de hobby, creditos das inspiracoes e o que o jogo guarda de dados. */
export function LegalNotice() {
  const locale = useSettings((state) => state.locale);
  const page = legalPages[locale];
  const [showHowTo, setShowHowTo] = useState(false);

  return (
    <>
      <AppHeader backHref="/" onHowTo={() => setShowHowTo(true)} />

      <main className="flex flex-1 flex-col gap-6">
        <div>
          <h1 className="text-2xl font-extrabold tracking-tight">{page.title}</h1>
          <p className="mt-1 text-xs muted">{page.updated}</p>
        </div>

        <p className="text-sm leading-relaxed">{page.intro}</p>

        {page.sections.map((section) => (
          <section key={section.heading} className="surface space-y-3 p-4">
            <h2 className="text-lg font-bold">{section.heading}</h2>

            {/* A lista entra depois do primeiro paragrafo: ele e quem a apresenta. */}
            {section.paragraphs.map((paragraph, index) => (
              <div key={index} className="space-y-3">
                <p className="text-sm leading-relaxed muted">{paragraph}</p>

                {index === 0 && section.items && (
                  <ul className="space-y-2">
                    {section.items.map((item) => (
                      <li key={item.term} className="text-sm leading-relaxed">
                        {item.href ? (
                          <a
                            href={item.href}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="font-bold text-grape-600 underline dark:text-grape-400"
                          >
                            {item.term}
                          </a>
                        ) : (
                          <span className="font-bold">{item.term}</span>
                        )}
                        <span className="muted"> — {item.text}</span>
                      </li>
                    ))}
                  </ul>
                )}
              </div>
            ))}
          </section>
        ))}

        <a
          href={REPO_URL}
          target="_blank"
          rel="noopener noreferrer"
          className="btn-ghost mx-auto"
        >
          {page.contact}
          <ExternalLink size={16} aria-hidden="true" />
        </a>
      </main>

      <HowToModal open={showHowTo} onClose={() => setShowHowTo(false)} />
    </>
  );
}
