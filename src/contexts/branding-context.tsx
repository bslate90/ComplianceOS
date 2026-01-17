'use client';

import React, { createContext, useContext, useEffect, useState, useCallback } from 'react';

interface BrandingSettings {
    logo_url: string | null;
    primary_color: string;
    secondary_color: string;
    company_address: string | null;
    company_phone: string | null;
    company_website: string | null;
    footer_text: string | null;
    organization_name?: string;
}

interface BrandingContextType {
    branding: BrandingSettings | null;
    loading: boolean;
    error: string | null;
    refetch: () => Promise<void>;
}

const defaultBranding: BrandingSettings = {
    logo_url: null,
    primary_color: '#10b981',
    secondary_color: '#0d9488',
    company_address: null,
    company_phone: null,
    company_website: null,
    footer_text: null,
    organization_name: 'Exodis',
};

const BrandingContext = createContext<BrandingContextType>({
    branding: defaultBranding,
    loading: true,
    error: null,
    refetch: async () => { },
});

export function useBranding() {
    return useContext(BrandingContext);
}

// Convert hex color to HSL values for CSS custom properties
function hexToHSL(hex: string): { h: number; s: number; l: number } | null {
    // Remove # if present
    hex = hex.replace(/^#/, '');

    // Handle shorthand hex
    if (hex.length === 3) {
        hex = hex.split('').map(char => char + char).join('');
    }

    if (hex.length !== 6) return null;

    const r = parseInt(hex.substring(0, 2), 16) / 255;
    const g = parseInt(hex.substring(2, 4), 16) / 255;
    const b = parseInt(hex.substring(4, 6), 16) / 255;

    const max = Math.max(r, g, b);
    const min = Math.min(r, g, b);
    let h = 0;
    let s = 0;
    const l = (max + min) / 2;

    if (max !== min) {
        const d = max - min;
        s = l > 0.5 ? d / (2 - max - min) : d / (max + min);

        switch (max) {
            case r:
                h = ((g - b) / d + (g < b ? 6 : 0)) / 6;
                break;
            case g:
                h = ((b - r) / d + 2) / 6;
                break;
            case b:
                h = ((r - g) / d + 4) / 6;
                break;
        }
    }

    return {
        h: Math.round(h * 360),
        s: Math.round(s * 100),
        l: Math.round(l * 100),
    };
}

// Convert hex to OKLCH for modern CSS (approximation)
function hexToOKLCH(hex: string): string {
    const hsl = hexToHSL(hex);
    if (!hsl) return 'oklch(0.5 0.14 175)';

    // Approximate conversion from HSL to OKLCH
    // L is roughly the same, but adjusted for perceptual uniformity
    const l = hsl.l / 100;
    const adjustedL = 0.3 + l * 0.5; // Map to 0.3-0.8 range for good visibility

    // Chroma is based on saturation
    const c = (hsl.s / 100) * 0.2;

    // Hue is similar but needs adjustment for OKLCH color space
    const h = hsl.h;

    return `oklch(${adjustedL.toFixed(2)} ${c.toFixed(2)} ${h})`;
}

// Apply branding colors to CSS custom properties
function applyBrandingColors(primaryColor: string, secondaryColor: string) {
    const root = document.documentElement;

    // Generate OKLCH values for secondary color
    const secondaryOKLCH = hexToOKLCH(secondaryColor);

    // Generate lighter/darker variants
    const primaryHSL = hexToHSL(primaryColor);
    if (primaryHSL) {
        // Light mode primary
        const lightPrimary = `oklch(${(0.35 + primaryHSL.l / 100 * 0.2).toFixed(2)} 0.14 ${primaryHSL.h})`;
        const darkPrimary = `oklch(${(0.55 + primaryHSL.l / 100 * 0.15).toFixed(2)} 0.16 ${primaryHSL.h})`;

        // Set CSS custom properties for light mode
        root.style.setProperty('--brand-primary', primaryColor);
        root.style.setProperty('--brand-secondary', secondaryColor);
        root.style.setProperty('--brand-primary-oklch', lightPrimary);
        root.style.setProperty('--brand-secondary-oklch', secondaryOKLCH);

        // Update primary colors for both themes
        root.style.setProperty('--primary-brand-light', lightPrimary);
        root.style.setProperty('--primary-brand-dark', darkPrimary);

        // Update ring colors
        root.style.setProperty('--ring-brand', `oklch(${(0.45 + primaryHSL.l / 100 * 0.15).toFixed(2)} 0.14 ${primaryHSL.h})`);

        // Update sidebar accent colors
        root.style.setProperty('--sidebar-accent-brand', `oklch(0.94 0.015 ${primaryHSL.h})`);
        root.style.setProperty('--sidebar-accent-brand-dark', `oklch(0.24 0.025 ${primaryHSL.h})`);
    }
}

interface BrandingProviderProps {
    children: React.ReactNode;
}

export function BrandingProvider({ children }: BrandingProviderProps) {
    const [branding, setBranding] = useState<BrandingSettings | null>(null);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);

    const fetchBranding = useCallback(async () => {
        try {
            setLoading(true);
            const res = await fetch('/api/organization/settings');

            if (res.ok) {
                const data = await res.json();

                // Get organization name if available
                const orgRes = await fetch('/api/organization/info');
                let organizationName = 'Exodis';
                if (orgRes.ok) {
                    const orgData = await orgRes.json();
                    organizationName = orgData.name || 'Exodis';
                }

                const brandingData: BrandingSettings = {
                    logo_url: data.logo_url,
                    primary_color: data.primary_color || '#10b981',
                    secondary_color: data.secondary_color || '#0d9488',
                    company_address: data.company_address,
                    company_phone: data.company_phone,
                    company_website: data.company_website,
                    footer_text: data.footer_text,
                    organization_name: organizationName,
                };

                setBranding(brandingData);

                // Apply colors to CSS custom properties
                applyBrandingColors(brandingData.primary_color, brandingData.secondary_color);
                setError(null);
            } else if (res.status === 401) {
                // User not authenticated, use defaults
                setBranding(defaultBranding);
            } else {
                // Other error, use defaults
                setBranding(defaultBranding);
            }
        } catch (err) {
            console.error('Failed to fetch branding settings:', err);
            setError('Failed to load branding');
            setBranding(defaultBranding);
        } finally {
            setLoading(false);
        }
    }, []);

    useEffect(() => {
        fetchBranding();
    }, [fetchBranding]);

    // Listen for settings update events to refetch
    useEffect(() => {
        const handleBrandingUpdate = () => {
            fetchBranding();
        };

        window.addEventListener('branding-updated', handleBrandingUpdate);
        return () => window.removeEventListener('branding-updated', handleBrandingUpdate);
    }, [fetchBranding]);

    return (
        <BrandingContext.Provider value={{ branding, loading, error, refetch: fetchBranding }}>
            {children}
        </BrandingContext.Provider>
    );
}
