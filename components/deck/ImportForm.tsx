"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";

export function ImportForm() {
  const router = useRouter();
  const [source, setSource] = useState("");
  const [status, setStatus] = useState<"idle" | "loading" | "error">("idle");
  const [error, setError] = useState<string | null>(null);
  const [unresolved, setUnresolved] = useState<string[] | null>(null);

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    setStatus("loading");
    setError(null);
    setUnresolved(null);

    const r = await fetch("/api/decks/import", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ source }),
    });
    const data = await r.json();

    if (!r.ok) {
      setError(data.error ?? "Import a échoué");
      setStatus("error");
      return;
    }

    if (data.cardsUnresolved > 0) {
      setUnresolved(data.unresolvedNames);
    }

    router.push(`/decks/${data.deckId}/builder`);
  };

  return (
    <form onSubmit={submit} className="space-y-4">
      <input
        type="text"
        required
        value={source}
        onChange={(e) => setSource(e.target.value)}
        placeholder="https://archidekt.com/decks/12345/..."
        className="w-full px-4 py-3 bg-cream border border-ink/15 rounded-sm focus:border-terracotta focus:outline-none font-body"
      />
      <button
        type="submit"
        disabled={status === "loading" || !source}
        className="px-6 py-3 bg-ink text-cream rounded-sm hover:bg-terracotta transition-colors text-sm uppercase tracking-wider disabled:opacity-50"
      >
        {status === "loading" ? "Import en cours…" : "Importer le deck"}
      </button>
      {error && (
        <p className="text-sm text-terracotta font-body">{error}</p>
      )}
      {unresolved && unresolved.length > 0 && (
        <div className="text-xs font-body text-ink/60 border-l-2 border-sand pl-4">
          <p className="mb-1">
            {unresolved.length} carte(s) non trouvée(s) dans la base — vérifie qu&apos;elles existent ou relance la sync :
          </p>
          <ul className="list-disc list-inside">
            {unresolved.slice(0, 5).map((n) => (
              <li key={n}>{n}</li>
            ))}
          </ul>
        </div>
      )}
    </form>
  );
}
