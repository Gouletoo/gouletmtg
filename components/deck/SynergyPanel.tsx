"use client";

import { useState } from "react";

export interface ScoreEntry {
  cardId: string;
  name: string;
  score: number;
  color: "low" | "medium" | "high";
  tagOverlap: number;
  patternMatch: number;
  patterns: Array<{ id: string; name: string; explanation: string; score: number }>;
  sharedTags: string[];
}

export interface SynergyData {
  commanderScores: ScoreEntry[];
  weakLinks: ScoreEntry[];
  averageScore: number;
  threshold: number;
}

export function SynergyPanel({
  data,
  loading,
  error,
}: {
  data: SynergyData | null;
  loading: boolean;
  error: string | null;
}) {
  const [showWeakLinks, setShowWeakLinks] = useState(false);

  if (loading) {
    return (
      <div>
        <h3 className="font-display text-lg text-ink mb-3">Synergie commander</h3>
        <p className="font-body text-xs text-ink/40">Calcul…</p>
      </div>
    );
  }

  if (error || !data) {
    return (
      <div>
        <h3 className="font-display text-lg text-ink mb-3">Synergie commander</h3>
        <p className="font-body text-xs text-terracotta">⚠ {error ?? "indisponible"}</p>
      </div>
    );
  }

  const avgColor =
    data.averageScore >= 60 ? "text-[#6B8E5A]" : data.averageScore >= 40 ? "text-sand" : "text-terracotta";

  return (
    <div>
      <h3 className="font-display text-lg text-ink mb-3">Synergie commander</h3>

      <div className="mb-4">
        <div className="flex items-baseline gap-2">
          <span className={`font-display text-4xl ${avgColor}`}>
            {data.averageScore}
          </span>
          <span className="font-body text-xs text-ink/40">/ 100</span>
        </div>
        <p className="font-body text-xs text-ink/50 mt-1">
          Score moyen carte ↔ commander
        </p>
      </div>

      <div className="border-t border-ink/10 pt-4">
        <button
          onClick={() => setShowWeakLinks((v) => !v)}
          className="flex items-baseline gap-2 group w-full text-left"
        >
          <span
            className={`text-ink/40 text-xs transition-transform inline-block w-2 ${
              showWeakLinks ? "rotate-90" : ""
            }`}
          >
            ▶
          </span>
          <span className="font-body text-sm text-ink group-hover:text-terracotta transition-colors">
            Maillons faibles
          </span>
          <span className="font-body text-xs text-ink/40">
            {data.weakLinks.length}
          </span>
        </button>

        {showWeakLinks && data.weakLinks.length === 0 && (
          <p className="font-body text-xs text-ink/40 italic mt-2">
            Aucune carte sous le seuil ({data.threshold}). Solide.
          </p>
        )}

        {showWeakLinks && data.weakLinks.length > 0 && (
          <ul className="mt-2 space-y-1.5 max-h-72 overflow-y-auto">
            {data.weakLinks.map((w) => (
              <li
                key={w.cardId}
                className="flex items-center justify-between gap-2 text-xs font-body"
              >
                <span className="text-ink/80 truncate">{w.name}</span>
                <span className="text-terracotta font-medium tabular-nums">
                  {w.score}
                </span>
              </li>
            ))}
          </ul>
        )}
      </div>

      <p className="font-body text-[10px] text-ink/30 mt-4 italic leading-relaxed">
        Score basé sur tags + patterns canoniques MTG. EDHrec et nuance LLM à venir.
      </p>
    </div>
  );
}
