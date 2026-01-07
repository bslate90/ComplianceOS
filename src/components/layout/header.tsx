'use client';

import { useRouter } from 'next/navigation';
import { createClient } from '@/lib/supabase/client';
import { Button } from '@/components/ui/button';
import {
    DropdownMenu,
    DropdownMenuContent,
    DropdownMenuItem,
    DropdownMenuLabel,
    DropdownMenuSeparator,
    DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { Avatar, AvatarFallback } from '@/components/ui/avatar';
import { ThemeToggle } from '@/components/theme-toggle';
import { useBranding } from '@/contexts/branding-context';

interface HeaderProps {
    user?: {
        email?: string;
        user_metadata?: {
            full_name?: string;
        };
    } | null;
}

export function Header({ user }: HeaderProps) {
    const router = useRouter();
    const supabase = createClient();
    const { branding } = useBranding();

    const handleSignOut = async () => {
        await supabase.auth.signOut();
        router.push('/login');
        router.refresh();
    };

    const initials = user?.user_metadata?.full_name
        ?.split(' ')
        .map((n: string) => n[0])
        .join('')
        .toUpperCase() || user?.email?.[0]?.toUpperCase() || 'U';

    // Generate gradient style for avatar based on branding colors
    const avatarStyle = branding?.primary_color ? {
        background: `linear-gradient(135deg, ${branding.primary_color}, ${branding.secondary_color || branding.primary_color})`,
    } : undefined;

    return (
        <header className="fixed top-0 left-0 lg:left-60 right-0 z-30 h-14 bg-background/80 backdrop-blur-md border-b border-border">
            <div className="flex h-full items-center justify-between px-4 lg:px-6">
                {/* Title - hidden on mobile to save space for hamburger */}
                <div className="flex items-center gap-3 ml-12 lg:ml-0">
                    <h1 className="text-sm lg:text-base font-medium text-foreground truncate">
                        Food Compliance Platform
                    </h1>
                </div>

                <div className="flex items-center gap-2">
                    <ThemeToggle />
                    <DropdownMenu>
                        <DropdownMenuTrigger asChild>
                            <Button variant="ghost" className="relative h-8 w-8 rounded-full p-0">
                                <Avatar className="h-8 w-8 border border-border">
                                    <AvatarFallback
                                        className="text-white text-xs font-medium"
                                        style={avatarStyle || { background: 'linear-gradient(135deg, oklch(0.50 0.14 175), oklch(0.55 0.12 185))' }}
                                    >
                                        {initials}
                                    </AvatarFallback>
                                </Avatar>
                            </Button>
                        </DropdownMenuTrigger>
                        <DropdownMenuContent className="w-56 bg-popover border-border shadow-lg" align="end">
                            <DropdownMenuLabel className="text-foreground">
                                <div className="flex flex-col space-y-0.5">
                                    <p className="text-sm font-medium">{user?.user_metadata?.full_name || 'User'}</p>
                                    <p className="text-xs text-muted-foreground truncate">{user?.email}</p>
                                </div>
                            </DropdownMenuLabel>
                            <DropdownMenuSeparator className="bg-border" />
                            <DropdownMenuItem
                                className="text-muted-foreground focus:bg-muted focus:text-foreground cursor-pointer"
                                onClick={handleSignOut}
                            >
                                <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4 mr-2" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M17 16l4-4m0 0l-4-4m4 4H7m6 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h4a3 3 0 013 3v1" />
                                </svg>
                                Sign out
                            </DropdownMenuItem>
                        </DropdownMenuContent>
                    </DropdownMenu>
                </div>
            </div>
        </header>
    );
}


