import Link from "next/link";
import { SiteHeader } from "@/components/brand/SiteHeader";

export default function ModeAStub() {
  return (
    <main className="flex-1 flex flex-col">
      <SiteHeader active="decks" />
      <section className="flex-1 flex items-center justify-center px-8 py-20">
        <div className="text-center max-w-lg">
          <p className="font-body text-xs uppercase tracking-[0.2em] text-terracotta mb-4">
            En construction
          </p>
          <h1 className="font-display text-4xl text-ink mb-4">
            Mode commander
          </h1>
          <p className="font-body text-ink/60 mb-8">
            Cette page sera disponible dans la prochaine itération. On y choisit
            un commander dans la base, et on génère une stratégie + shell.
          </p>
          <Link
            href="/decks/new"
            className="text-terracotta hover:underline text-sm"
          >
            ← Retour aux modes
          </Link>
        </div>
      </section>
    </main>
  );
}
