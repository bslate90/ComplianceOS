'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { createClient } from '@/lib/supabase/client';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from '@/components/ui/card';

export default function RegisterPage() {
    const [email, setEmail] = useState('');
    const [password, setPassword] = useState('');
    const [fullName, setFullName] = useState('');
    const [organizationName, setOrganizationName] = useState('');
    const [error, setError] = useState<string | null>(null);
    const [loading, setLoading] = useState(false);
    const router = useRouter();
    const supabase = createClient();

    const handleRegister = async (e: React.FormEvent) => {
        e.preventDefault();
        setError(null);
        setLoading(true);

        try {
            // Generate a slug from organization name
            const slug = organizationName
                .toLowerCase()
                .replace(/[^a-z0-9]+/g, '-')
                .replace(/(^-|-$)/g, '');

            // Sign up the user first
            const { data: authData, error: authError } = await supabase.auth.signUp({
                email,
                password,
                options: {
                    data: {
                        full_name: fullName,
                    },
                },
            });

            if (authError) {
                setError(authError.message);
                return;
            }

            // Check if email confirmation is required
            if (authData.user && !authData.session) {
                setError('Please check your email to confirm your account before logging in.');
                setLoading(false);
                return;
            }

            // Now create the organization (user is authenticated)
            const { data: org, error: orgError } = await supabase
                .from('organizations')
                .insert({ name: organizationName, slug })
                .select()
                .single();

            if (orgError) {
                console.error('Organization creation error:', orgError);
                if (orgError.code === '23505') {
                    setError('An organization with this name already exists');
                } else {
                    setError(`Failed to create organization: ${orgError.message}`);
                }
                return;
            }

            // Update the user's profile with organization
            if (authData.user && org) {
                const { error: profileError } = await supabase
                    .from('profiles')
                    .update({
                        organization_id: org.id,
                        full_name: fullName,
                        role: 'admin'
                    })
                    .eq('id', authData.user.id);

                if (profileError) {
                    console.error('Profile update error:', profileError);
                }
            }

            router.push('/dashboard');
            router.refresh();
        } catch (err: unknown) {
            console.error('Registration error:', err);
            const message = err instanceof Error ? err.message : 'An unexpected error occurred';
            setError(message);
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
                        <span className="text-xl sm:text-2xl font-bold text-white tracking-tight">ComplianceOS</span>
                        <span className="text-sm sm:text-base text-slate-500 font-medium">FDA Nutrition Labels</span>
                    </div>
                </div>

                {/* Divider */}
                <div className="w-full h-px bg-gradient-to-r from-slate-600 via-slate-500 to-transparent mt-5 sm:mt-6" />

                {/* Title Section - left aligned */}
                <div className="mt-5 sm:mt-6 flex flex-col items-start gap-2 sm:gap-3">
                    <CardTitle className="text-xl sm:text-2xl md:text-[1.75rem] font-semibold text-white tracking-tight text-left">
                        Create your account
                    </CardTitle>
                    <CardDescription className="text-slate-400 text-sm sm:text-base leading-relaxed text-left">
                        Join thousands of food manufacturers creating FDA-compliant nutrition labels with ease.
                    </CardDescription>
                </div>

                {/* Feature Pills - left aligned */}
                <div className="flex flex-wrap justify-start gap-2 sm:gap-2.5 mt-4 sm:mt-5">
                    <span className="inline-flex items-center gap-1.5 px-2.5 sm:px-3 py-1 sm:py-1.5 rounded-full text-xs sm:text-sm font-medium bg-emerald-500/10 text-emerald-400 border border-emerald-500/20">
                        <svg className="w-3.5 h-3.5" fill="currentColor" viewBox="0 0 20 20">
                            <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
                        </svg>
                        Auto-calculated NFP
                    </span>
                    <span className="inline-flex items-center gap-1.5 px-2.5 sm:px-3 py-1 sm:py-1.5 rounded-full text-xs sm:text-sm font-medium bg-teal-500/10 text-teal-400 border border-teal-500/20">
                        <svg className="w-3.5 h-3.5" fill="currentColor" viewBox="0 0 20 20">
                            <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
                        </svg>
                        RACC Compliance
                    </span>
                    <span className="inline-flex items-center gap-1.5 px-2.5 sm:px-3 py-1 sm:py-1.5 rounded-full text-xs sm:text-sm font-medium bg-cyan-500/10 text-cyan-400 border border-cyan-500/20">
                        <svg className="w-3.5 h-3.5" fill="currentColor" viewBox="0 0 20 20">
                            <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
                        </svg>
                        PDF Export
                    </span>
                </div>
            </CardHeader>

            <form onSubmit={handleRegister}>
                <CardContent className="p-5 sm:p-6 md:p-8 pt-6 sm:pt-6 md:pt-8 space-y-6 sm:space-y-8">
                    {error && (
                        <div className="p-3 sm:p-4 text-sm text-red-400 bg-red-900/30 border border-red-800/50 rounded-lg flex items-start gap-3">
                            <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5 flex-shrink-0 mt-0.5" viewBox="0 0 20 20" fill="currentColor">
                                <path fillRule="evenodd" d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7 4a1 1 0 11-2 0 1 1 0 012 0zm-1-9a1 1 0 00-1 1v4a1 1 0 102 0V6a1 1 0 00-1-1z" clipRule="evenodd" />
                            </svg>
                            <span>{error}</span>
                        </div>
                    )}

                    {/* Personal Info Section */}
                    <div className="space-y-4 sm:space-y-5">
                        <div className="flex items-center gap-2 text-xs sm:text-sm font-semibold text-slate-500 uppercase tracking-wider">
                            <svg className="w-4 h-4 sm:w-5 sm:h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
                            </svg>
                            Personal Information
                        </div>
                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 sm:gap-5">
                            <div className="space-y-2 sm:space-y-2.5">
                                <Label htmlFor="fullName" className="text-sm sm:text-base font-medium text-slate-200">
                                    Full Name
                                </Label>
                                <Input
                                    id="fullName"
                                    type="text"
                                    placeholder="John Smith"
                                    value={fullName}
                                    onChange={(e) => setFullName(e.target.value)}
                                    required
                                    className="h-11 sm:h-12 text-sm sm:text-base bg-slate-700/50 border-slate-600 text-white placeholder:text-slate-500 focus:border-emerald-500 focus:ring-emerald-500 transition-colors"
                                />
                            </div>
                            <div className="space-y-2 sm:space-y-2.5">
                                <Label htmlFor="organizationName" className="text-sm sm:text-base font-medium text-slate-200">
                                    Organization
                                </Label>
                                <Input
                                    id="organizationName"
                                    type="text"
                                    placeholder="Acme Foods Inc."
                                    value={organizationName}
                                    onChange={(e) => setOrganizationName(e.target.value)}
                                    required
                                    className="h-11 sm:h-12 text-sm sm:text-base bg-slate-700/50 border-slate-600 text-white placeholder:text-slate-500 focus:border-emerald-500 focus:ring-emerald-500 transition-colors"
                                />
                            </div>
                        </div>
                    </div>

                    {/* Account Section */}
                    <div className="space-y-4 sm:space-y-5">
                        <div className="flex items-center gap-2 text-xs sm:text-sm font-semibold text-slate-500 uppercase tracking-wider">
                            <svg className="w-4 h-4 sm:w-5 sm:h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 7a2 2 0 012 2m4 0a6 6 0 01-7.743 5.743L11 17H9v2H7v2H4a1 1 0 01-1-1v-2.586a1 1 0 01.293-.707l5.964-5.964A6 6 0 1121 9z" />
                            </svg>
                            Account Credentials
                        </div>
                        <div className="space-y-4 sm:space-y-5">
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
                                <Label htmlFor="password" className="text-sm sm:text-base font-medium text-slate-200">
                                    Password
                                </Label>
                                <Input
                                    id="password"
                                    type="password"
                                    placeholder="••••••••"
                                    value={password}
                                    onChange={(e) => setPassword(e.target.value)}
                                    required
                                    minLength={6}
                                    className="h-11 sm:h-12 text-sm sm:text-base bg-slate-700/50 border-slate-600 text-white placeholder:text-slate-500 focus:border-emerald-500 focus:ring-emerald-500 transition-colors"
                                />
                                <p className="text-xs sm:text-sm text-slate-500 flex items-center gap-2 mt-1.5">
                                    <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                                    </svg>
                                    Must be at least 6 characters
                                </p>
                            </div>
                        </div>
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
                                Creating account...
                            </span>
                        ) : 'Create account'}
                    </Button>

                    {/* Terms Notice */}
                    <p className="text-xs sm:text-sm text-slate-500 text-center leading-relaxed">
                        By creating an account, you agree to our{' '}
                        <Link href="#" className="text-slate-400 underline hover:text-slate-300 transition-colors">Terms of Service</Link>
                        {' '}and{' '}
                        <Link href="#" className="text-slate-400 underline hover:text-slate-300 transition-colors">Privacy Policy</Link>
                    </p>

                    {/* Divider with text */}
                    <div className="relative w-full">
                        <div className="absolute inset-0 flex items-center">
                            <div className="w-full border-t border-slate-700" />
                        </div>
                        <div className="relative flex justify-center text-xs sm:text-sm">
                            <span className="px-3 sm:px-4 bg-slate-800/60 text-slate-500">Already registered?</span>
                        </div>
                    </div>

                    <p className="text-sm sm:text-base text-slate-400 text-center">
                        <Link
                            href="/login"
                            className="text-emerald-400 hover:text-emerald-300 font-semibold transition-colors"
                        >
                            Sign in to your account
                        </Link>
                    </p>
                </CardFooter>
            </form>
        </Card>
    );
}
