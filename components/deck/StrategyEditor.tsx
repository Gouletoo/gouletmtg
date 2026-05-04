"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";

export function StrategyEditor({
  deckId,
  initialStrategy,
}: {
  deckId: string;
  initialStrategy: string | null;
}) {
  const router = useRouter();
  const [editing, setEditing] = useState(false);
  const [strategy, setStrategy] = useState(initialStrategy ?? "");
  const [saving, setSaving] = useState(false);
  const [savedAt, setSavedAt] = useState<number | null>(null);
  const [message, setMessage] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  const save = async (refreshTags: boolean) => {
    setSaving(true);
    setError(null);
    setMessage(null);
    try {
      const r = await fetch(`/api/decks/${deckId}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          strategy_summary: strategy || null,
          refreshStrategyTags: refreshTags,
        }),
      });
      const data = await r.json();
      if (!r.ok) {
        setError(data.error ?? "Échec");
        return;
      }
      setSavedAt(Date.now());
      if (data.message) setMessage(data.message);
      setEditing(false);
      router.refresh();
      setTimeout(() => setSavedAt(null), 2500);
    } finally {
      setSaving(false);
    }
  };

  if (!editing) {
    return (
      <div className="space-y-2">
        {strategy ? (
          <p className="font-body text-ink/70 max-w-2xl leading-relaxed">{strategy}</p>
        ) : (
          <p className="font-body text-ink/40 italic">
            Aucune stratégie décrite — ajoute-la pour améliorer le scoring de
            synergie.
          </p>
        )}
        <div className="flex items-center gap-3">
          <button
            onClick={() => setEditing(true)}
            className="text-xs font-body text-terracotta hover:underline"
          >
            {strategy ? "Modifier la stratégie" : "+ Ajouter une stratégie"}
          </button>
          {savedAt && (
            <span className="text-xs font-body text-[#6B8E5A]">
              ✓ {message ?? "Sauvegardé"}
            </span>
          )}
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-3 max-w-3xl">
      <textarea
        value={strategy}
        onChange={(e) => setStrategy(e.target.value)}
        rows={4}
        placeholder={`Décris ta stratégie en quelques phrases. Ex:

"Allies tribal 5-color qui spamme des créatures et utilise les triggers d'Aragorn pour générer du value à chaque combat. Win con par damage massif aux 3 adversaires."

Plus tu es précis (mécaniques, tribu, win con, payoffs clés), plus le scoring sera juste.`}
        className="w-full px-4 py-3 bg-cream border border-ink/15 rounded-sm focus:border-terracotta focus:outline-none font-body text-sm leading-relaxed resize-none"
        autoFocus
      />
      <div className="flex items-center gap-3 flex-wrap">
        <button
          onClick={() => save(true)}
          disabled={saving}
          className="px-5 py-2 bg-ink text-cream rounded-sm hover:bg-terracotta transition-colors text-xs uppercase tracking-wider disabled:opacity-50"
        >
          {saving ? "Analyse en cours…" : "Sauvegarder & analyser"}
        </button>
        <button
          onClick={() => save(false)}
          disabled={saving}
          className="px-5 py-2 border border-ink/15 rounded-sm hover:border-terracotta hover:text-terracotta text-xs uppercase tracking-wider disabled:opacity-50"
        >
          Sauvegarder seulement
        </button>
        <button
          onClick={() => {
            setStrategy(initialStrategy ?? "");
            setEditing(false);
          }}
          disabled={saving}
          className="text-xs font-body text-ink/40 hover:text-terracotta"
        >
          Annuler
        </button>
        {error && <span className="text-xs text-terracotta font-body">⚠ {error}</span>}
      </div>
      <p className="text-xs font-body text-ink/40 italic">
        « Sauvegarder &amp; analyser » utilise Gemini pour extraire des tags
        stratégiques qui enrichissent le scoring de synergie au-delà du seul
        commander.
      </p>
    </div>
  );
}
