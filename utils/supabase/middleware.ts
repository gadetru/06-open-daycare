import { createServerClient } from "@supabase/ssr";
import { type NextRequest, NextResponse } from "next/server";

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseKey = process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY;

const PROTECTED_ROUTES = ["/", "/kids"];
const PUBLIC_ROUTES = ["/login", "/activar-cuenta"];

function isPathProtected(pathname: string): boolean {
  return PROTECTED_ROUTES.some((route) => pathname.startsWith(route));
}

function isPathPublic(pathname: string): boolean {
  return PUBLIC_ROUTES.some(
    (route) => pathname === route || pathname.startsWith(`${route}/`),
  );
}

function isLoginRoute(pathname: string): boolean {
  return pathname === "/login" || pathname.startsWith("/login/");
}

async function updateSession(request: NextRequest) {
  let supabaseResponse = NextResponse.next({
    request: {
      headers: request.headers,
    },
  });

  const supabase = createServerClient(
    supabaseUrl!,
    supabaseKey!,
    {
      cookies: {
        getAll() {
          return request.cookies.getAll()
        },
        setAll(cookiesToSet) {
          cookiesToSet.forEach(({ name, value }) => request.cookies.set(name, value))
          supabaseResponse = NextResponse.next({
            request,
          })
          cookiesToSet.forEach(({ name, value, options }) =>
            supabaseResponse.cookies.set(name, value, options)
          )
        },
      },
    },
  );

  // Refreshes the auth token and verifies it. Do not add code between
  // createServerClient and this call, or the refresh will be skipped.
  const { data: claims } = await supabase.auth.getClaims();
  const isAuthenticated = Boolean(claims?.claims);

  const { pathname } = request.nextUrl;

  // Authenticated user on the login page → go to the feed
  if (isAuthenticated && isLoginRoute(pathname)) {
    return NextResponse.redirect(new URL("/", request.url));
  }

  // Unauthenticated user on a protected route → go to login
  if (!isAuthenticated && isPathProtected(pathname) && !isPathPublic(pathname)) {
    return NextResponse.redirect(new URL("/login", request.url));
  }

  return supabaseResponse
}

export { updateSession };
