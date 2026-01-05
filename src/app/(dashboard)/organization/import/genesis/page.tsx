import { createClient } from '@/lib/supabase/server';
import { redirect } from 'next/navigation';
import GenesisImporter from '@/components/genesis-importer';
import Link from 'next/link';

export default async function GenesisImportPage() {
    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();

    if (!user) {
        redirect('/login');
    }

    // Get user's profile
    const { data: profile } = await supabase
        .from('profiles')
        .select('role, organization_id')
        .eq('id', user.id)
        .single();

    if (profile?.role !== 'admin') {
        redirect('/organization?error=admin_required');
    }

    return (
        <div className="space-y-6 animate-fade-in">
            {/* Header */}
            <div className="flex items-center gap-4 pb-2">
                <Link
                    href="/organization"
                    className="flex items-center justify-center w-10 h-10 rounded-lg bg-muted hover:bg-muted/80 transition-colors"
                >
                    <svg className="w-5 h-5 text-muted-foreground" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
                    </svg>
                </Link>
                <div>
                    <h1 className="text-xl sm:text-2xl font-semibold text-foreground">
                        Genesis R&D Classic Import
                    </h1>
                    <p className="mt-1 text-sm text-muted-foreground">
                        Migrate your data from Genesis R&D Classic to ComplianceOS
                    </p>
                </div>
            </div>

            {/* Genesis Importer Component */}
            <GenesisImporter />

            {/* Help Section */}
            <div className="p-4 rounded-lg bg-muted/30 border border-border/50">
                <div className="flex items-start gap-3">
                    <div className="w-8 h-8 rounded-lg bg-blue-500/10 flex items-center justify-center shrink-0">
                        <svg className="w-4 h-4 text-blue-500" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8.228 9c.549-1.165 2.03-2 3.772-2 2.21 0 4 1.343 4 3 0 1.4-1.278 2.575-3.006 2.907-.542.104-.994.54-.994 1.093m0 3h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                        </svg>
                    </div>
                    <div className="text-sm">
                        <p className="font-medium text-foreground mb-1">Need help?</p>
                        <p className="text-muted-foreground">
                            If you&apos;re having trouble exporting from Genesis or importing your data,
                            contact our support team at{' '}
                            <a href="mailto:support@complianceos.com" className="text-primary hover:underline">
                                support@complianceos.com
                            </a>
                        </p>
                    </div>
                </div>
            </div>

            {/* Back to Settings */}
            <div className="flex justify-center">
                <Link
                    href="/organization"
                    className="text-sm text-muted-foreground hover:text-foreground transition-colors flex items-center gap-2"
                >
                    <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 19l-7-7m0 0l7-7m-7 7h18" />
                    </svg>
                    Back to Organization Settings
                </Link>
            </div>
        </div>
    );
}
