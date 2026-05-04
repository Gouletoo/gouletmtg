import { NextRequest, NextResponse } from "next/server";
import { createServerClient } from "@supabase/ssr";

/**
 * Callback magic link Supabase.
 *
 * Pattern important : on attache les cookies de session DIRECTEMENT à la
 * réponse de redirect, sinon les SetCookie headers se perdent dans le
 * redirect (notamment sur Safari) et on tombe en boucle login → callback → login.
 */
export async function GET(req: NextRequest) {
  const url = new URL(req.url);
  const code = url.searchParams.get("code");
  const next = url.searchParams.get("next") ?? "/decks";

  if (!code) {
    return NextResponse.redirect(new URL("/login?error=missing_code", url.origin));
  }

  // 1. On crée la réponse de redirect AVANT d'invoquer supabase.auth
  const response = NextResponse.redirect(new URL(next, url.origin));

  // 2. On crée le client Supabase qui écrira ses cookies sur CETTE réponse
  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll() {
          return req.cookies.getAll();
        },
        setAll(cookiesToSet) {
          cookiesToSet.forEach(({ name, value, options }) => {
            response.cookies.set(name, value, options);
          });
        },
      },
    }
  );

  const { error } = await supabase.auth.exchangeCodeForSession(code);
  if (error) {
    return NextResponse.redirect(
      new URL(`/login?error=${encodeURIComponent(error.message)}`, url.origin)
    );
  }

  // 3. Auto-création du profil au premier login (best-effort)
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (user) {
    await supabase
      .from("profiles")
      .upsert(
        {
          user_id: user.id,
          display_name: user.email?.split("@")[0] ?? null,
        },
        { onConflict: "user_id", ignoreDuplicates: true }
      );
  }

  return response;
}
