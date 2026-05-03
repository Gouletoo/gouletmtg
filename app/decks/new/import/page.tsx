import { redirect } from "next/navigation";
import { SiteHeader } from "@/components/brand/SiteHeader";
import { createClient } from "@/lib/supabase/server";
import { ImportForm } from "@/components/deck/ImportForm";

export const metadata = { title: "Import Archidekt — gouletmtg" };

export default async function ImportPage() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect("/login");

  return (
    <main className="flex-1 flex flex-col">
      <SiteHeader active="decks" />
      <section className="px-8 md:px-16 lg:px-24 py-12 max-w-3xl">
        <p className="font-body text-xs uppercase tracking-[0.2em] text-terracotta mb-3">
          Mode C
        </p>
        <h1 className="font-display text-4xl md:text-5xl text-ink mb-3">
          Importer depuis Archidekt
        </h1>
        <p className="font-body text-ink/60 mb-10 max-w-xl leading-relaxed">
          Colle l&apos;URL d&apos;un deck Archidekt public (ou son ID). On
          récupère la liste, on identifie le commander, et on crée le deck dans
          ta bibliothèque.
        </p>

        <ImportForm />

        <div className="mt-12 pt-8 border-t border-ink/10 text-sm font-body text-ink/50 space-y-2">
          <p>
            <strong className="text-ink/70">Formats acceptés</strong> :
          </p>
          <ul className="list-disc list-inside space-y-1">
            <li>
              <code>https://archidekt.com/decks/12345/nom-du-deck</code>
            </li>
            <li>
              <code>https://archidekt.com/decks/12345</code>
            </li>
            <li>
              ID brut : <code>12345</code>
            </li>
          </ul>
          <p className="pt-2">
            ⚠ Le deck doit être <strong>public</strong> sur Archidekt.
          </p>
        </div>
      </section>
    </main>
  );
}
