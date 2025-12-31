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
        <Card className="border-slate-700 bg-slate-800/50 backdrop-blur-xl shadow-2xl">
            <CardHeader className="space-y-1">
                <div className="flex items-center gap-2 mb-2">
                    <div className="w-10 h-10 rounded-lg bg-gradient-to-br from-emerald-500 to-teal-600 flex items-center justify-center">
                        <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
                        </svg>
                    </div>
                    <span className="text-xl font-bold text-white">ComplianceOS</span>
                </div>
                <CardTitle className="text-2xl text-white">Create an account</CardTitle>
                <CardDescription className="text-slate-400">
                    Get started with FDA-compliant nutrition labels
                </CardDescription>
            </CardHeader>
            <form onSubmit={handleRegister}>
                <CardContent className="space-y-4">
                    {error && (
                        <div className="p-3 text-sm text-red-400 bg-red-900/30 border border-red-800 rounded-lg">
                            {error}
                        </div>
                    )}
                    <div className="space-y-2">
                        <Label htmlFor="fullName" className="text-slate-200">Full Name</Label>
                        <Input
                            id="fullName"
                            type="text"
                            placeholder="John Smith"
                            value={fullName}
                            onChange={(e) => setFullName(e.target.value)}
                            required
                            className="bg-slate-700/50 border-slate-600 text-white placeholder:text-slate-500 focus:border-emerald-500 focus:ring-emerald-500"
                        />
                    </div>
                    <div className="space-y-2">
                        <Label htmlFor="organizationName" className="text-slate-200">Organization Name</Label>
                        <Input
                            id="organizationName"
                            type="text"
                            placeholder="Acme Foods Inc."
                            value={organizationName}
                            onChange={(e) => setOrganizationName(e.target.value)}
                            required
                            className="bg-slate-700/50 border-slate-600 text-white placeholder:text-slate-500 focus:border-emerald-500 focus:ring-emerald-500"
                        />
                    </div>
                    <div className="space-y-2">
                        <Label htmlFor="email" className="text-slate-200">Email</Label>
                        <Input
                            id="email"
                            type="email"
                            placeholder="you@company.com"
                            value={email}
                            onChange={(e) => setEmail(e.target.value)}
                            required
                            className="bg-slate-700/50 border-slate-600 text-white placeholder:text-slate-500 focus:border-emerald-500 focus:ring-emerald-500"
                        />
                    </div>
                    <div className="space-y-2">
                        <Label htmlFor="password" className="text-slate-200">Password</Label>
                        <Input
                            id="password"
                            type="password"
                            placeholder="••••••••"
                            value={password}
                            onChange={(e) => setPassword(e.target.value)}
                            required
                            minLength={6}
                            className="bg-slate-700/50 border-slate-600 text-white placeholder:text-slate-500 focus:border-emerald-500 focus:ring-emerald-500"
                        />
                        <p className="text-xs text-slate-500">Minimum 6 characters</p>
                    </div>
                </CardContent>
                <CardFooter className="flex flex-col gap-4">
                    <Button
                        type="submit"
                        className="w-full bg-gradient-to-r from-emerald-500 to-teal-600 hover:from-emerald-600 hover:to-teal-700 text-white font-medium shadow-lg shadow-emerald-500/25"
                        disabled={loading}
                    >
                        {loading ? 'Creating account...' : 'Create account'}
                    </Button>
                    <p className="text-sm text-slate-400 text-center">
                        Already have an account?{' '}
                        <Link href="/login" className="text-emerald-400 hover:text-emerald-300 font-medium">
                            Sign in
                        </Link>
                    </p>
                </CardFooter>
            </form>
        </Card>
    );
}
