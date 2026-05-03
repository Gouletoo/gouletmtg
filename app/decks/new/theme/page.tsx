import { redirect } from "next/navigation";
import { SiteHeader } from "@/components/brand/SiteHeader";
import { createClient } from "@/lib/supabase/server";
import { ThemeSuggester } from "@/components/deck/ThemeSuggester";

export const metadata = { title: "Nouveau deck par thème — gouletmtg" };

export default async function ThemeModePage() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect("/login");

  return (
    <main className="flex-1 flex flex-col">
      <SiteHeader active="decks" />
      <section className="px-8 md:px-16 lg:px-24 py-12 max-w-5xl">
        <p className="font-body text-xs uppercase tracking-[0.2em] text-terracotta mb-3">
          Mode B
        </p>
        <h1 className="font-display text-4xl md:text-5xl text-ink mb-3">
          J&apos;ai un thème en tête
        </h1>
        <p className="font-body text-ink/60 mb-10 max-w-2xl leading-relaxed">
          Décris une mécanique, un archétype, une vibe. On suggère des
          commanders pertinents — biaisés vers ceux à beaucoup de triggers, ta
          préférence. Tu choisis ensuite lequel devient ton commander.
        </p>
        <ThemeSuggester />
      </section>
    </main>
  );
}
