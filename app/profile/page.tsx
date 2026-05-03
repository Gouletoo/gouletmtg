import { redirect } from "next/navigation";
import { SiteHeader } from "@/components/brand/SiteHeader";
import { createClient } from "@/lib/supabase/server";
import { ProfileForm } from "@/components/profile/ProfileForm";
import { DEFAULT_POD_RULES, type PodRules } from "@/lib/types";

export const metadata = { title: "Profil — gouletmtg" };

export default async function ProfilePage() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect("/login");

  const { data: profile } = await supabase
    .from("profiles")
    .select("display_name, pod_rules")
    .eq("user_id", user.id)
    .single();

  const podRules = (profile?.pod_rules as PodRules | undefined) ?? DEFAULT_POD_RULES;

  return (
    <main className="flex-1 flex flex-col">
      <SiteHeader active="profile" />
      <section className="px-8 md:px-16 lg:px-24 py-12 max-w-3xl">
        <p className="font-body text-xs uppercase tracking-[0.2em] text-terracotta mb-3">
          Ton profil
        </p>
        <h1 className="font-display text-4xl md:text-5xl text-ink mb-2">
          {profile?.display_name ?? user.email}
        </h1>
        <p className="font-body text-ink/60 mb-12">
          Les règles de ton pod et tes préférences sont appliquées par défaut à
          tous les nouveaux decks et aux suggestions.
        </p>

        <ProfileForm initialPodRules={podRules} />

        <div className="mt-16 pt-12 border-t border-ink/10">
          <h2 className="font-display text-2xl text-ink mb-3">Pet cards</h2>
          <p className="font-body text-sm text-ink/50">
            À venir — ajoute des cartes signature qui seront priorisées dans les
            suggestions.
          </p>
        </div>

        <div className="mt-12">
          <h2 className="font-display text-2xl text-ink mb-3">
            Cartes bannies (perso)
          </h2>
          <p className="font-body text-sm text-ink/50">
            À venir — cartes que tu ne veux jamais voir suggérées.
          </p>
        </div>
      </section>
    </main>
  );
}
