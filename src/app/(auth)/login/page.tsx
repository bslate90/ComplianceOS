'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { createClient } from '@/lib/supabase/client';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from '@/components/ui/card';

export default function LoginPage() {
    const [email, setEmail] = useState('');
    const [password, setPassword] = useState('');
    const [error, setError] = useState<string | null>(null);
    const [loading, setLoading] = useState(false);
    const router = useRouter();
    const supabase = createClient();

    const handleLogin = async (e: React.FormEvent) => {
        e.preventDefault();
        setError(null);
        setLoading(true);

        try {
            const { error } = await supabase.auth.signInWithPassword({
                email,
                password,
            });

            if (error) {
                setError(error.message);
                return;
            }

            router.push('/dashboard');
            router.refresh();
        } catch {
            setError('An unexpected error occurred');
        } finally {
            setLoading(false);
        }
    };

    return (
        <Card className="border-slate-700/50 bg-slate-800/60 backdrop-blur-xl shadow-2xl shadow-black/20">
            <CardHeader className="p-5 sm:p-6 md:p-8 pb-0 sm:pb-0 md:pb-0">
                {/* Logo and Brand - stacked vertically */}
                <div className="flex flex-col items-start gap-3">
                    <div className="w-11 h-11 sm:w-12 sm:h-12 rounded-xl bg-gradient-to-br from-emerald-500 to-teal-600 flex items-center justify-center shadow-lg shadow-emerald-500/20">
                        <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6 sm:h-7 sm:w-7 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
                        </svg>
                    </div>
                    <div className="flex flex-col items-start gap-1">
                        <span className="text-xl sm:text-2xl font-bold text-white tracking-tight">Exodis</span>
                        <span className="text-sm sm:text-base text-slate-500 font-medium">FDA Nutrition Labels</span>
                    </div>
                </div>

                {/* Divider */}
                <div className="w-full h-px bg-gradient-to-r from-slate-600 via-slate-500 to-transparent mt-5 sm:mt-6" />

                {/* Title Section - left aligned */}
                <div className="mt-5 sm:mt-6 flex flex-col items-start gap-2 sm:gap-3">
                    <CardTitle className="text-xl sm:text-2xl md:text-[1.75rem] font-semibold text-white tracking-tight text-left">
                        Welcome back
                    </CardTitle>
                    <CardDescription className="text-slate-400 text-sm sm:text-base leading-relaxed text-left">
                        Enter your credentials to access your account and continue managing your compliance workflows.
                    </CardDescription>
                </div>
            </CardHeader>

            <form onSubmit={handleLogin}>
                <CardContent className="p-5 sm:p-6 md:p-8 pt-6 sm:pt-6 md:pt-8 space-y-5 sm:space-y-6">
                    {error && (
                        <div className="p-3 sm:p-4 text-sm text-red-400 bg-red-900/30 border border-red-800/50 rounded-lg flex items-start gap-3">
                            <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5 flex-shrink-0 mt-0.5" viewBox="0 0 20 20" fill="currentColor">
                                <path fillRule="evenodd" d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7 4a1 1 0 11-2 0 1 1 0 012 0zm-1-9a1 1 0 00-1 1v4a1 1 0 102 0V6a1 1 0 00-1-1z" clipRule="evenodd" />
                            </svg>
                            <span>{error}</span>
                        </div>
                    )}

                    <div className="space-y-2 sm:space-y-2.5">
                        <Label htmlFor="email" className="text-sm sm:text-base font-medium text-slate-200">
                            Email Address
                        </Label>
                        <Input
                            id="email"
                            type="email"
                            placeholder="you@company.com"
                            value={email}
                            onChange={(e) => setEmail(e.target.value)}
                            required
                            className="h-11 sm:h-12 text-sm sm:text-base bg-slate-700/50 border-slate-600 text-white placeholder:text-slate-500 focus:border-emerald-500 focus:ring-emerald-500 transition-colors"
                        />
                    </div>

                    <div className="space-y-2 sm:space-y-2.5">
                        <div className="flex items-center justify-between">
                            <Label htmlFor="password" className="text-sm sm:text-base font-medium text-slate-200">
                                Password
                            </Label>
                            <Link
                                href="#"
                                className="text-xs sm:text-sm text-emerald-400 hover:text-emerald-300 transition-colors"
                            >
                                Forgot password?
                            </Link>
                        </div>
                        <Input
                            id="password"
                            type="password"
                            placeholder="••••••••"
                            value={password}
                            onChange={(e) => setPassword(e.target.value)}
                            required
                            className="h-11 sm:h-12 text-sm sm:text-base bg-slate-700/50 border-slate-600 text-white placeholder:text-slate-500 focus:border-emerald-500 focus:ring-emerald-500 transition-colors"
                        />
                    </div>
                </CardContent>

                <CardFooter className="flex flex-col gap-5 sm:gap-6 p-5 sm:p-6 md:p-8 pt-0 sm:pt-0 md:pt-0">
                    <Button
                        type="submit"
                        className="w-full h-11 sm:h-12 text-sm sm:text-base bg-gradient-to-r from-emerald-500 to-teal-600 hover:from-emerald-600 hover:to-teal-700 text-white font-semibold shadow-lg shadow-emerald-500/25 transition-all duration-200"
                        disabled={loading}
                    >
                        {loading ? (
                            <span className="flex items-center gap-2">
                                <svg className="animate-spin h-4 w-4" viewBox="0 0 24 24">
                                    <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" fill="none" />
                                    <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" />
                                </svg>
                                Signing in...
                            </span>
                        ) : 'Sign in'}
                    </Button>

                    {/* Divider with text */}
                    <div className="relative w-full">
                        <div className="absolute inset-0 flex items-center">
                            <div className="w-full border-t border-slate-700" />
                        </div>
                        <div className="relative flex justify-center text-xs sm:text-sm">
                            <span className="px-3 sm:px-4 bg-slate-800/60 text-slate-500">New to Exodis?</span>
                        </div>
                    </div>

                    <p className="text-sm sm:text-base text-slate-400 text-center leading-relaxed">
                        <Link
                            href="/register"
                            className="text-emerald-400 hover:text-emerald-300 font-semibold transition-colors"
                        >
                            Create an account
                        </Link>
                        {' '}to get started with FDA-compliant labels
                    </p>
                </CardFooter>
            </form>
        </Card>
    );
}
