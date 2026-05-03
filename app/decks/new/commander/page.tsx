import { redirect } from "next/navigation";
import { SiteHeader } from "@/components/brand/SiteHeader";
import { createClient } from "@/lib/supabase/server";
import { CommanderCreateForm } from "@/components/deck/CommanderCreateForm";

export const metadata = { title: "Nouveau deck par commander — gouletmtg" };

export default async function CommanderModePage() {
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
          Mode A
        </p>
        <h1 className="font-display text-4xl md:text-5xl text-ink mb-3">
          J&apos;ai un commander en tête
        </h1>
        <p className="font-body text-ink/60 mb-10 max-w-xl leading-relaxed">
          Cherche le commander que tu veux jouer. Tu peux ensuite décrire ta
          stratégie en quelques mots — on s&apos;en servira pour orienter les
          suggestions.
        </p>
        <CommanderCreateForm />
      </section>
    </main>
  );
}
