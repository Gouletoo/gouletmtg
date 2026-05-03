"use client";

import { useState } from "react";
import { createClient } from "@/lib/supabase/client";
import type { PodRules } from "@/lib/types";

export function ProfileForm({ initialPodRules }: { initialPodRules: PodRules }) {
  const [rules, setRules] = useState<PodRules>(initialPodRules);
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);

  const save = async () => {
    setSaving(true);
    setSaved(false);
    const supabase = createClient();
    const {
      data: { user },
    } = await supabase.auth.getUser();
    if (!user) return;
    await supabase
      .from("profiles")
      .update({ pod_rules: rules })
      .eq("user_id", user.id);
    setSaving(false);
    setSaved(true);
    setTimeout(() => setSaved(false), 2000);
  };

  return (
    <div className="space-y-6">
      <h2 className="font-display text-2xl text-ink">Règles du pod</h2>

      <label className="flex items-start gap-3 cursor-pointer">
        <input
          type="checkbox"
          checked={rules.noTutors}
          onChange={(e) => setRules({ ...rules, noTutors: e.target.checked })}
          className="mt-1 accent-terracotta"
        />
        <div>
          <p className="font-body text-ink">Pas de tutors</p>
          <p className="font-body text-xs text-ink/50">
            Aucune catégorie tutor dans les decks. Alerte si une carte tutorisable est suggérée.
          </p>
        </div>
      </label>

      <label className="flex items-start gap-3 cursor-pointer">
        <input
          type="checkbox"
          checked={rules.noInfiniteCombos}
          onChange={(e) =>
            setRules({ ...rules, noInfiniteCombos: e.target.checked })
          }
          className="mt-1 accent-terracotta"
        />
        <div>
          <p className="font-body text-ink">Pas de combos infinis 2-cartes</p>
          <p className="font-body text-xs text-ink/50">
            Combos 3-4 cartes acceptables uniquement comme plan B.
          </p>
        </div>
      </label>

      <div>
        <label className="block font-body text-sm text-ink mb-2">
          Plafond éthique par carte (USD)
        </label>
        <input
          type="number"
          min={0}
          value={rules.maxCardPriceUsd}
          onChange={(e) =>
            setRules({
              ...rules,
              maxCardPriceUsd: Math.max(0, Number(e.target.value) || 0),
            })
          }
          className="w-32 px-3 py-2 bg-cream border border-ink/15 rounded-sm focus:border-terracotta focus:outline-none font-body text-sm"
        />
        <p className="font-body text-xs text-ink/50 mt-2">
          Les cartes au-dessus déclencheront une alerte (respect du groupe qui ne proxy pas).
        </p>
      </div>

      <div>
        <label className="block font-body text-sm text-ink mb-2">
          Notes du pod
        </label>
        <textarea
          value={rules.notes ?? ""}
          onChange={(e) => setRules({ ...rules, notes: e.target.value })}
          rows={3}
          placeholder="Conventions ou règles maison qu'on devrait connaître…"
          className="w-full px-3 py-2 bg-cream border border-ink/15 rounded-sm focus:border-terracotta focus:outline-none font-body text-sm"
        />
      </div>

      <div className="flex items-center gap-4 pt-4">
        <button
          onClick={save}
          disabled={saving}
          className="px-6 py-3 bg-ink text-cream rounded-sm hover:bg-terracotta transition-colors text-sm uppercase tracking-wider disabled:opacity-50"
        >
          {saving ? "Sauvegarde…" : "Sauvegarder"}
        </button>
        {saved && (
          <span className="text-sm text-terracotta font-body">Sauvegardé.</span>
        )}
      </div>
    </div>
  );
}
