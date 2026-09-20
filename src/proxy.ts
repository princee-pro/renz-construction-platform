import { createServerClient } from "@supabase/ssr";
import type { NextRequest } from "next/server";
import { NextResponse } from "next/server";

import { getPublicSupabaseEnvironment } from "@/lib/supabase/public-env";

export async function proxy(request: NextRequest) {
  const response = NextResponse.next({ request });
  const environment = getPublicSupabaseEnvironment();
  const client = createServerClient(environment.url, environment.publishableKey, {
    cookies: {
      getAll() {
        return request.cookies.getAll();
      },
      setAll(cookiesToSet) {
        cookiesToSet.forEach(({ name, value, options }) => {
          request.cookies.set(name, value);
          response.cookies.set(name, value, options);
        });
      },
    },
  });

  const { data } = await client.auth.getUser();
  response.headers.set("Cache-Control", "private, no-store, max-age=0");
  response.headers.set("X-Robots-Tag", "noindex, nofollow, noarchive");
  // C10 §51: an anonymous request for any staff route gets a real HTTP
  // redirect at the edge, not a streamed loading shell. The workspace
  // layout guard (AAL2, active profile, password gate) stays the authority.
  const { pathname, search } = request.nextUrl;
  if (!data.user && pathname !== "/admin/sign-in") {
    const signIn = new URL("/admin/sign-in", request.url);
    signIn.searchParams.set("next", `${pathname}${search}`);
    const redirect = NextResponse.redirect(signIn, 307);
    for (const cookie of response.cookies.getAll()) redirect.cookies.set(cookie);
    redirect.headers.set("Cache-Control", "private, no-store, max-age=0");
    redirect.headers.set("X-Robots-Tag", "noindex, nofollow, noarchive");
    return redirect;
  }
  return response;
}

export const config = {
  matcher: ["/admin/:path*"],
};
