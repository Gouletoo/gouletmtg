import Link from "next/link";
import { createClient } from "@/lib/supabase/server";

export async function SiteHeader({ active }: { active?: "decks" | "cards" | "oracle" | "profile" }) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  return (
    <header className="px-8 md:px-16 lg:px-24 py-8 flex items-center justify-between border-b border-ink/10">
      <Link href="/" className="font-display text-2xl tracking-tight text-ink">
        gouletmtg
      </Link>
      <nav className="flex items-center gap-8 text-sm">
        <Link
          href="/decks"
          className={
            active === "decks"
              ? "text-terracotta"
              : "text-ink/70 hover:text-terracotta transition-colors"
          }
        >
          Decks
        </Link>
        <Link
          href="/cards"
          className={
            active === "cards"
              ? "text-terracotta"
              : "text-ink/70 hover:text-terracotta transition-colors"
          }
        >
          Cartes
        </Link>
        <Link
          href="/oracle"
          className={
            active === "oracle"
              ? "text-terracotta"
              : "text-ink/70 hover:text-terracotta transition-colors"
          }
        >
          Oracle
        </Link>
        <Link
          href="/profile"
          className={
            active === "profile"
              ? "text-terracotta"
              : "text-ink/70 hover:text-terracotta transition-colors"
          }
        >
          Profil
        </Link>
        {user ? (
          <form action="/auth/signout" method="post">
            <button
              type="submit"
              className="text-ink/50 hover:text-terracotta transition-colors text-xs uppercase tracking-wider"
            >
              Déconnexion
            </button>
          </form>
        ) : (
          <Link
            href="/login"
            className="px-4 py-2 bg-ink text-cream rounded-sm hover:bg-terracotta transition-colors text-xs uppercase tracking-wider"
          >
            Connexion
          </Link>
        )}
      </nav>
    </header>
  );
}
