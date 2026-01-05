import { createClient } from '@/lib/supabase/server';
import { redirect } from 'next/navigation';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import OrganizationSettingsForm from '@/components/organization-settings-form';

export default async function OrganizationPage() {
    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();

    if (!user) {
        redirect('/login');
    }

    // Get user's profile with organization
    const { data: profile } = await supabase
        .from('profiles')
        .select(`
            *,
            organization:organizations(*)
        `)
        .eq('id', user.id)
        .single();

    // Get data counts for the organization
    const [ingredientsCount, recipesCount, labelsCount, suppliersCount] = await Promise.all([
        supabase.from('ingredients').select('id', { count: 'exact', head: true }),
        supabase.from('recipes').select('id', { count: 'exact', head: true }),
        supabase.from('labels').select('id', { count: 'exact', head: true }),
        supabase.from('suppliers').select('id', { count: 'exact', head: true }),
    ]);

    const organization = profile?.organization;
    const isAdmin = profile?.role === 'admin';

    return (
        <div className="space-y-6 animate-fade-in">
            {/* Header */}
            <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 pb-2">
                <div>
                    <h1 className="text-xl sm:text-2xl font-semibold text-foreground">Organization Settings</h1>
                    <p className="mt-1 text-sm text-muted-foreground">
                        Manage your organization settings, team, branding, and data
                    </p>
                </div>
            </div>

            {/* Organization Info Card */}
            <Card className="border shadow-card overflow-hidden">
                <div className="h-1 bg-gradient-to-r from-emerald-500 to-teal-500"></div>
                <CardHeader className="pb-4">
                    <div className="flex items-start justify-between">
                        <div className="flex items-center gap-4">
                            <div className="w-14 h-14 rounded-xl bg-gradient-to-br from-emerald-500 to-teal-600 flex items-center justify-center shadow-lg shadow-emerald-500/20">
                                <span className="text-2xl font-bold text-white">
                                    {organization?.name?.charAt(0)?.toUpperCase() || 'O'}
                                </span>
                            </div>
                            <div>
                                <CardTitle className="text-lg font-semibold text-foreground">
                                    {organization?.name || 'Your Organization'}
                                </CardTitle>
                                <CardDescription className="text-sm text-muted-foreground mt-0.5">
                                    {organization?.slug ? `@${organization.slug}` : 'No slug set'}
                                </CardDescription>
                            </div>
                        </div>
                        <div className={`inline-flex items-center px-2.5 py-1 rounded-full text-xs font-medium ${isAdmin
                                ? 'bg-emerald-500/10 text-emerald-500 border border-emerald-500/20'
                                : 'bg-slate-500/10 text-slate-400 border border-slate-500/20'
                            }`}>
                            {isAdmin ? 'Admin' : 'Member'}
                        </div>
                    </div>
                </CardHeader>
                <CardContent className="pt-0">
                    <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
                        <div className="p-4 rounded-lg bg-muted/50 border border-border/50">
                            <div className="text-2xl font-bold text-foreground">{ingredientsCount.count || 0}</div>
                            <div className="text-xs text-muted-foreground font-medium">Ingredients</div>
                        </div>
                        <div className="p-4 rounded-lg bg-muted/50 border border-border/50">
                            <div className="text-2xl font-bold text-foreground">{recipesCount.count || 0}</div>
                            <div className="text-xs text-muted-foreground font-medium">Recipes</div>
                        </div>
                        <div className="p-4 rounded-lg bg-muted/50 border border-border/50">
                            <div className="text-2xl font-bold text-foreground">{labelsCount.count || 0}</div>
                            <div className="text-xs text-muted-foreground font-medium">Labels</div>
                        </div>
                        <div className="p-4 rounded-lg bg-muted/50 border border-border/50">
                            <div className="text-2xl font-bold text-foreground">{suppliersCount.count || 0}</div>
                            <div className="text-xs text-muted-foreground font-medium">Suppliers</div>
                        </div>
                    </div>
                </CardContent>
            </Card>

            {/* Settings Form */}
            <OrganizationSettingsForm
                isAdmin={isAdmin}
                organizationId={profile?.organization_id || ''}
                organizationName={organization?.name || 'Your Organization'}
            />

            {/* Danger Zone - Only for Admins */}
            {isAdmin && (
                <Card className="border border-red-500/20 shadow-card">
                    <CardHeader className="pb-3">
                        <CardTitle className="text-sm font-medium text-red-500 flex items-center gap-2">
                            <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
                            </svg>
                            Danger Zone
                        </CardTitle>
                        <CardDescription className="text-xs text-muted-foreground">
                            Irreversible actions that affect your entire organization
                        </CardDescription>
                    </CardHeader>
                    <CardContent className="pt-0">
                        <div className="flex items-center justify-between p-3 rounded-lg bg-red-500/5 border border-red-500/20">
                            <div>
                                <div className="text-sm font-medium text-foreground">Delete Organization</div>
                                <div className="text-xs text-muted-foreground">Permanently delete all organization data</div>
                            </div>
                            <button className="inline-flex items-center justify-center rounded-md text-sm font-medium transition-colors focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring disabled:pointer-events-none disabled:opacity-50 bg-red-600 text-white shadow hover:bg-red-700 h-8 px-3">
                                Delete
                            </button>
                        </div>
                    </CardContent>
                </Card>
            )}
        </div>
    );
}
