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

function isFamilyRoute(pathname: string): boolean {
  return pathname === "/familia" || pathname.startsWith("/familia/");
}

function isNoAccessRoute(pathname: string): boolean {
  return pathname === "/sin-acceso" || pathname.startsWith("/sin-acceso/");
}

function isActivationRoute(pathname: string): boolean {
  return pathname === "/activar-cuenta" || pathname.startsWith("/activar-cuenta/");
}

function isStaffRoute(pathname: string): boolean {
  if (pathname === "/") {
    return true;
  }
  return pathname === "/kids" || pathname.startsWith("/kids/");
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
  const userId = claims?.claims?.sub;
  const isAuthenticated =
    typeof userId === "string" && userId.length > 0;

  const { pathname } = request.nextUrl;

  // Unauthenticated user on a protected route → go to login.
  // ("/" matches everything via startsWith, so /familia is covered too.)
  if (!isAuthenticated && isPathProtected(pathname) && !isPathPublic(pathname)) {
    return NextResponse.redirect(new URL("/login", request.url));
  }

  if (!isAuthenticated) {
    return supabaseResponse;
  }

  // One extra query per navigation for clean role redirects; layouts
  // re-verify anyway as source of truth.
  const { data: roleRow } = await supabase
    .from("users")
    .select("role")
    .eq("id", userId)
    .maybeSingle();
  const role = (roleRow as { role: string } | null)?.role ?? null;
  const hasProfile =
    role === "staff" || role === "parent" || role === "admin";
  const homeByRole = role === "parent" ? "/familia" : "/";

  // Authenticated user WITHOUT profile (orphan/pending account): out of the
  // login/panel loop into /sin-acceso, except the activation flow which is
  // exactly how such accounts get their profile.
  if (!hasProfile) {
    if (isNoAccessRoute(pathname) || isActivationRoute(pathname)) {
      return supabaseResponse;
    }
    return NextResponse.redirect(new URL("/sin-acceso", request.url));
  }

  // Authenticated user on the login page → go to their panel
  if (isLoginRoute(pathname)) {
    return NextResponse.redirect(new URL(homeByRole, request.url));
  }

  // Profile owner wandering into /sin-acceso → back to their panel
  if (isNoAccessRoute(pathname)) {
    return NextResponse.redirect(new URL(homeByRole, request.url));
  }

  // Parent on staff routes → family panel
  if (role === "parent" && isStaffRoute(pathname)) {
    return NextResponse.redirect(new URL("/familia", request.url));
  }

  // Staff on family route → staff feed
  if ((role === "staff" || role === "admin") && isFamilyRoute(pathname)) {
    return NextResponse.redirect(new URL("/", request.url));
  }

  return supabaseResponse
}

export { updateSession };
