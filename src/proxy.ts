import { createServerClient } from "@supabase/ssr";
import type { NextRequest } from "next/server";
import { NextResponse } from "next/server";

interface PublicRoute {
  path: string;
  methods: string[];
}

const PUBLIC_APIS: PublicRoute[] = [
  { path: "/api/auth/login", methods: ["POST"] },
  { path: "/api/auth/register", methods: ["POST"] },
  { path: "/api/workspaces", methods: ["GET"] },
];

const PUBLIC_PAGES = ["/login", "/terms", "/privacy"];

const STUDENT_ALLOWED_PAGES = ["/", "/my"];

const STUDENT_ALLOWED_API_PREFIXES = ["/api/auth/", "/api/my/"];

const isPublicApi = (pathname: string, method: string): boolean => {
  return PUBLIC_APIS.some((api) => pathname.startsWith(api.path) && api.methods.includes(method));
};

const isPublicPage = (pathname: string): boolean => {
  return PUBLIC_PAGES.some((page) => pathname === page);
};

const matchesPath = (pathname: string, paths: string[]): boolean => {
  return paths.some((path) => pathname === path || pathname.startsWith(`${path}/`));
};

const isStudentAllowedApi = (pathname: string): boolean => {
  return STUDENT_ALLOWED_API_PREFIXES.some((prefix) => pathname.startsWith(prefix));
};

export const proxy = async (request: NextRequest): Promise<NextResponse> => {
  let supabaseResponse = NextResponse.next({ request });

  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll() {
          return request.cookies.getAll();
        },
        setAll(cookiesToSet) {
          for (const { name, value } of cookiesToSet) {
            request.cookies.set(name, value);
          }
          supabaseResponse = NextResponse.next({ request });
          for (const { name, value, options } of cookiesToSet) {
            supabaseResponse.cookies.set(name, value, options);
          }
        },
      },
    },
  );

  const {
    data: { user },
  } = await supabase.auth.getUser();

  const { pathname } = request.nextUrl;

  if (isPublicPage(pathname)) {
    if (pathname === "/login" && user) {
      return NextResponse.redirect(new URL("/", request.url));
    }
    return supabaseResponse;
  }

  if (pathname.startsWith("/api/")) {
    if (isPublicApi(pathname, request.method)) {
      return supabaseResponse;
    }
    if (!user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }
    return supabaseResponse;
  }

  if (!user) {
    return NextResponse.redirect(new URL("/login", request.url));
  }

  const role = (user.app_metadata?.role ?? user.user_metadata?.role) as string | undefined;
  if (role === "student") {
    if (pathname.startsWith("/api/") && !isStudentAllowedApi(pathname)) {
      return NextResponse.json({ error: "접근 권한이 없습니다." }, { status: 403 });
    }
    if (!pathname.startsWith("/api/") && !matchesPath(pathname, STUDENT_ALLOWED_PAGES)) {
      return NextResponse.redirect(new URL("/", request.url));
    }
  }

  return supabaseResponse;
};

export const config = {
  matcher: ["/((?!_next/static|_next/image|favicon.ico).*)"],
};
