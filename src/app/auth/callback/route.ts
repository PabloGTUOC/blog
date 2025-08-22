import { NextRequest, NextResponse } from "next/server";
import { createServerClient, type CookieOptions } from "@supabase/ssr";

export async function GET(req: NextRequest) {
    const { searchParams, origin } = new URL(req.url);
    const code = searchParams.get("code");
    const next = searchParams.get("next") || "/";

    // we’ll redirect back to the app after exchanging the code
    const res = NextResponse.redirect(new URL(next, origin));

    if (code) {
        // bind cookie get/set to the *response* so Set-Cookie headers are written
        const supabase = createServerClient(
            process.env.NEXT_PUBLIC_SUPABASE_URL!,
            process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
            {
                cookies: {
                    get: (name: string) => req.cookies.get(name)?.value,
                    set(name: string, value: string, options: CookieOptions) {
                        res.cookies.set({ name, value, ...options });
                    },
                    remove(name: string, options: CookieOptions) {
                        res.cookies.set({ name, value: "", ...options, maxAge: 0 });
                    },
                },
            }
        );

        const { error } = await supabase.auth.exchangeCodeForSession(code);
        if (error) {
            // optional: redirect to a nicer error page
            return NextResponse.redirect(new URL("/auth/error", origin));
        }
    }

    return res;
}
