import { createClient } from '@/lib/supabase/server';
import { redirect } from 'next/navigation';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';

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

    // Get organization members (note: email is stored in auth.users, not profiles)
    const { data: members } = profile?.organization_id
        ? await supabase
            .from('profiles')
            .select('id, full_name, role, created_at')
            .eq('organization_id', profile.organization_id)
        : { data: [] };

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
                    <h1 className="text-xl sm:text-2xl font-semibold text-foreground">Organization</h1>
                    <p className="mt-1 text-sm text-muted-foreground">
                        Manage your organization settings, team, and data
                    </p>
                </div>
                {isAdmin && (
                    <Button size="sm" className="gap-1.5 bg-primary hover:bg-primary/90">
                        <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M18 9v3m0 0v3m0-3h3m-3 0h-3m-2-5a4 4 0 11-8 0 4 4 0 018 0zM3 20a6 6 0 0112 0v1H3v-1z" />
                        </svg>
                        Invite Member
                    </Button>
                )}
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
                        {isAdmin && (
                            <Button variant="outline" size="sm" className="gap-1.5">
                                <svg xmlns="http://www.w3.org/2000/svg" className="h-3.5 w-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15.232 5.232l3.536 3.536m-2.036-5.036a2.5 2.5 0 113.536 3.536L6.5 21.036H3v-3.572L16.732 3.732z" />
                                </svg>
                                Edit
                            </Button>
                        )}
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

            {/* Team Members */}
            <Card className="border shadow-card">
                <CardHeader className="pb-4">
                    <div className="flex items-center justify-between">
                        <div>
                            <CardTitle className="text-sm font-medium text-foreground flex items-center gap-2">
                                <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4 text-muted-foreground" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0zm6 3a2 2 0 11-4 0 2 2 0 014 0zM7 10a2 2 0 11-4 0 2 2 0 014 0z" />
                                </svg>
                                Team Members
                            </CardTitle>
                            <CardDescription className="text-xs text-muted-foreground mt-1">
                                {members?.length || 0} member{(members?.length || 0) !== 1 ? 's' : ''} in your organization
                            </CardDescription>
                        </div>
                    </div>
                </CardHeader>
                <CardContent className="pt-0">
                    <div className="space-y-3">
                        {members && members.length > 0 ? (
                            members.map((member) => (
                                <div
                                    key={member.id}
                                    className="flex items-center justify-between p-3 rounded-lg bg-muted/30 border border-border/50 hover:bg-muted/50 transition-colors"
                                >
                                    <div className="flex items-center gap-3">
                                        <div className="w-10 h-10 rounded-full bg-gradient-to-br from-slate-600 to-slate-700 flex items-center justify-center">
                                            <span className="text-sm font-medium text-white">
                                                {member.full_name?.charAt(0)?.toUpperCase() || '?'}
                                            </span>
                                        </div>
                                        <div>
                                            <div className="text-sm font-medium text-foreground">
                                                {member.full_name || 'Unnamed User'}
                                            </div>
                                            <div className="text-xs text-muted-foreground capitalize">
                                                {member.role || 'Member'}
                                            </div>
                                        </div>
                                    </div>
                                    <div className="flex items-center gap-3">
                                        <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${member.role === 'admin'
                                            ? 'bg-emerald-500/10 text-emerald-500 border border-emerald-500/20'
                                            : 'bg-slate-500/10 text-slate-400 border border-slate-500/20'
                                            }`}>
                                            {member.role === 'admin' ? 'Admin' : 'Member'}
                                        </span>
                                        {isAdmin && member.id !== user.id && (
                                            <Button variant="ghost" size="sm" className="h-8 w-8 p-0">
                                                <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4 text-muted-foreground" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 5v.01M12 12v.01M12 19v.01M12 6a1 1 0 110-2 1 1 0 010 2zm0 7a1 1 0 110-2 1 1 0 010 2zm0 7a1 1 0 110-2 1 1 0 010 2z" />
                                                </svg>
                                            </Button>
                                        )}
                                    </div>
                                </div>
                            ))
                        ) : (
                            <div className="text-center py-8 text-muted-foreground text-sm">
                                No team members found
                            </div>
                        )}
                    </div>
                </CardContent>
            </Card>

            {/* Settings Grid */}
            <div className="grid gap-4 grid-cols-1 lg:grid-cols-2">
                {/* Organization Settings */}
                <Card className="border shadow-card">
                    <CardHeader className="pb-3">
                        <CardTitle className="text-sm font-medium text-foreground flex items-center gap-2">
                            <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4 text-muted-foreground" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.065 2.572c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.572 1.065c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.065-2.572c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z" />
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
                            </svg>
                            Settings
                        </CardTitle>
                    </CardHeader>
                    <CardContent className="pt-0 space-y-3">
                        <button className="w-full flex items-center justify-between p-3 rounded-lg bg-muted/30 border border-border/50 hover:bg-muted/50 transition-colors text-left">
                            <div className="flex items-center gap-3">
                                <div className="w-8 h-8 rounded-lg bg-blue-500/10 flex items-center justify-center">
                                    <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4 text-blue-500" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                                    </svg>
                                </div>
                                <div>
                                    <div className="text-sm font-medium text-foreground">Label Defaults</div>
                                    <div className="text-xs text-muted-foreground">Default serving sizes, formats</div>
                                </div>
                            </div>
                            <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4 text-muted-foreground" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                            </svg>
                        </button>
                        <button className="w-full flex items-center justify-between p-3 rounded-lg bg-muted/30 border border-border/50 hover:bg-muted/50 transition-colors text-left">
                            <div className="flex items-center gap-3">
                                <div className="w-8 h-8 rounded-lg bg-purple-500/10 flex items-center justify-center">
                                    <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4 text-purple-500" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 21a4 4 0 01-4-4V5a2 2 0 012-2h4a2 2 0 012 2v12a4 4 0 01-4 4zm0 0h12a2 2 0 002-2v-4a2 2 0 00-2-2h-2.343M11 7.343l1.657-1.657a2 2 0 012.828 0l2.829 2.829a2 2 0 010 2.828l-8.486 8.485M7 17h.01" />
                                    </svg>
                                </div>
                                <div>
                                    <div className="text-sm font-medium text-foreground">Branding</div>
                                    <div className="text-xs text-muted-foreground">Logo, colors for exports</div>
                                </div>
                            </div>
                            <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4 text-muted-foreground" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                            </svg>
                        </button>
                        <button className="w-full flex items-center justify-between p-3 rounded-lg bg-muted/30 border border-border/50 hover:bg-muted/50 transition-colors text-left">
                            <div className="flex items-center gap-3">
                                <div className="w-8 h-8 rounded-lg bg-amber-500/10 flex items-center justify-center">
                                    <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4 text-amber-500" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 17h5l-1.405-1.405A2.032 2.032 0 0118 14.158V11a6.002 6.002 0 00-4-5.659V5a2 2 0 10-4 0v.341C7.67 6.165 6 8.388 6 11v3.159c0 .538-.214 1.055-.595 1.436L4 17h5m6 0v1a3 3 0 11-6 0v-1m6 0H9" />
                                    </svg>
                                </div>
                                <div>
                                    <div className="text-sm font-medium text-foreground">Notifications</div>
                                    <div className="text-xs text-muted-foreground">Alerts, compliance reminders</div>
                                </div>
                            </div>
                            <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4 text-muted-foreground" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                            </svg>
                        </button>
                    </CardContent>
                </Card>

                {/* Data & Export */}
                <Card className="border shadow-card">
                    <CardHeader className="pb-3">
                        <CardTitle className="text-sm font-medium text-foreground flex items-center gap-2">
                            <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4 text-muted-foreground" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 7v10c0 2.21 3.582 4 8 4s8-1.79 8-4V7M4 7c0 2.21 3.582 4 8 4s8-1.79 8-4M4 7c0-2.21 3.582-4 8-4s8 1.79 8 4m0 5c0 2.21-3.582 4-8 4s-8-1.79-8-4" />
                            </svg>
                            Data Management
                        </CardTitle>
                    </CardHeader>
                    <CardContent className="pt-0 space-y-3">
                        <button className="w-full flex items-center justify-between p-3 rounded-lg bg-muted/30 border border-border/50 hover:bg-muted/50 transition-colors text-left">
                            <div className="flex items-center gap-3">
                                <div className="w-8 h-8 rounded-lg bg-green-500/10 flex items-center justify-center">
                                    <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4 text-green-500" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-8l-4-4m0 0L8 8m4-4v12" />
                                    </svg>
                                </div>
                                <div>
                                    <div className="text-sm font-medium text-foreground">Import Data</div>
                                    <div className="text-xs text-muted-foreground">CSV, Excel import</div>
                                </div>
                            </div>
                            <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4 text-muted-foreground" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                            </svg>
                        </button>
                        <button className="w-full flex items-center justify-between p-3 rounded-lg bg-muted/30 border border-border/50 hover:bg-muted/50 transition-colors text-left">
                            <div className="flex items-center gap-3">
                                <div className="w-8 h-8 rounded-lg bg-cyan-500/10 flex items-center justify-center">
                                    <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4 text-cyan-500" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4" />
                                    </svg>
                                </div>
                                <div>
                                    <div className="text-sm font-medium text-foreground">Export Data</div>
                                    <div className="text-xs text-muted-foreground">Backup all organization data</div>
                                </div>
                            </div>
                            <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4 text-muted-foreground" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                            </svg>
                        </button>
                        <button className="w-full flex items-center justify-between p-3 rounded-lg bg-muted/30 border border-border/50 hover:bg-muted/50 transition-colors text-left">
                            <div className="flex items-center gap-3">
                                <div className="w-8 h-8 rounded-lg bg-slate-500/10 flex items-center justify-center">
                                    <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4 text-slate-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
                                    </svg>
                                </div>
                                <div>
                                    <div className="text-sm font-medium text-foreground">Audit Log</div>
                                    <div className="text-xs text-muted-foreground">View activity history</div>
                                </div>
                            </div>
                            <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4 text-muted-foreground" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                            </svg>
                        </button>
                    </CardContent>
                </Card>
            </div>

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
                                <div className="text-xs text-muted-foreground">Permanently delete all data</div>
                            </div>
                            <Button variant="destructive" size="sm" className="bg-red-600 hover:bg-red-700">
                                Delete
                            </Button>
                        </div>
                    </CardContent>
                </Card>
            )}
        </div>
    );
}
