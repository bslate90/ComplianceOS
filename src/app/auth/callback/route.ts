import { createClient } from '@/lib/supabase/server';
import { NextResponse } from 'next/server';

export async function GET(request: Request) {
    const { searchParams, origin } = new URL(request.url);
    const code = searchParams.get('code');
    const next = searchParams.get('next') ?? '/dashboard';
    const error = searchParams.get('error');
    const error_description = searchParams.get('error_description');

    // Handle error from Supabase (e.g., expired link)
    if (error) {
        console.error('Auth callback error:', error, error_description);
        return NextResponse.redirect(
            `${origin}/login?error=${encodeURIComponent(error_description || error)}`
        );
    }

    if (code) {
        const supabase = await createClient();
        const { error } = await supabase.auth.exchangeCodeForSession(code);

        if (!error) {
            // Successful authentication - redirect to the intended destination
            const forwardedHost = request.headers.get('x-forwarded-host');
            const isLocalEnv = process.env.NODE_ENV === 'development';

            if (isLocalEnv) {
                // In development, redirect to origin
                return NextResponse.redirect(`${origin}${next}`);
            } else if (forwardedHost) {
                // In production behind a proxy, use the forwarded host
                return NextResponse.redirect(`https://${forwardedHost}${next}`);
            } else {
                return NextResponse.redirect(`${origin}${next}`);
            }
        }

        console.error('Error exchanging code for session:', error);
        return NextResponse.redirect(
            `${origin}/login?error=${encodeURIComponent(error.message)}`
        );
    }

    // No code or error - redirect to login
    return NextResponse.redirect(`${origin}/login`);
}
