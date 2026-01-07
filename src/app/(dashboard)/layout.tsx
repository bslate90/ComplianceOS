import { createClient } from '@/lib/supabase/server';
import { Sidebar } from '@/components/layout/sidebar';
import { Header } from '@/components/layout/header';
import { Toaster } from '@/components/ui/sonner';
import { BrandingProvider } from '@/contexts/branding-context';

export default async function DashboardLayout({
    children,
}: {
    children: React.ReactNode;
}) {
    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();

    return (
        <BrandingProvider>
            <div className="min-h-screen bg-background">
                <Sidebar />
                <Header user={user} />
                {/* Desktop: offset for sidebar. Mobile: full width with compact padding */}
                <main className="lg:pl-60 pt-14 min-h-screen">
                    <div className="px-4 py-5 sm:px-5 sm:py-6 lg:px-8 lg:py-8 max-w-6xl mx-auto">
                        {children}
                    </div>
                </main>
                <Toaster richColors closeButton position="top-right" />
            </div>
        </BrandingProvider>
    );
}
