"use client";

import { useState } from "react";
import Link from "next/link";
import { createClient } from "@/lib/supabase/client";

export default function LoginPage() {
  const [email, setEmail] = useState("");
  const [status, setStatus] = useState<"idle" | "loading" | "sent" | "error">("idle");
  const [error, setError] = useState<string | null>(null);

  const onSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setStatus("loading");
    setError(null);
    const supabase = createClient();
    const origin = typeof window !== "undefined" ? window.location.origin : "";
    const { error } = await supabase.auth.signInWithOtp({
      email,
      options: { emailRedirectTo: `${origin}/auth/callback` },
    });
    if (error) {
      setError(error.message);
      setStatus("error");
    } else {
      setStatus("sent");
    }
  };

  return (
    <main className="flex-1 flex flex-col">
      <header className="px-8 md:px-16 lg:px-24 py-8">
        <Link href="/" className="font-display text-2xl tracking-tight text-ink">
          gouletmtg
        </Link>
      </header>

      <section className="flex-1 flex items-center justify-center px-8 py-16">
        <div className="w-full max-w-md">
          <p className="font-body text-xs uppercase tracking-[0.2em] text-terracotta mb-4">
            Connexion
          </p>
          <h1 className="font-display text-4xl md:text-5xl text-ink mb-3">
            Lien magique
          </h1>
          <p className="font-body text-ink/60 mb-10 leading-relaxed">
            Entre ton courriel, on t&apos;envoie un lien pour te connecter. Pas
            de mot de passe.
          </p>

          {status === "sent" ? (
            <div className="border border-terracotta/30 bg-terracotta/5 rounded-sm p-6">
              <p className="font-display text-2xl text-terracotta mb-2">
                Lien envoyé.
              </p>
              <p className="font-body text-ink/70 text-sm">
                Vérifie <span className="font-medium">{email}</span> et clique
                sur le lien pour te connecter.
              </p>
            </div>
          ) : (
            <form onSubmit={onSubmit} className="space-y-4">
              <input
                type="email"
                required
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="ton@courriel.com"
                className="w-full px-4 py-3 bg-cream border border-ink/15 rounded-sm focus:border-terracotta focus:outline-none font-body"
              />
              <button
                type="submit"
                disabled={status === "loading"}
                className="w-full px-6 py-3 bg-ink text-cream rounded-sm hover:bg-terracotta transition-colors text-sm uppercase tracking-wider disabled:opacity-50"
              >
                {status === "loading" ? "Envoi…" : "Envoyer le lien"}
              </button>
              {error && (
                <p className="text-sm text-terracotta font-body">{error}</p>
              )}
            </form>
          )}
        </div>
      </section>
    </main>
  );
}
