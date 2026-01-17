'use client';

import { useState, useEffect } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { toast } from 'sonner';
import { PlexIntegrationSettings } from '@/components/plex-integration-settings';

// Integration provider configurations
const INTEGRATIONS = [
    {
        id: 'plex',
        name: 'Plex ERP',
        description: 'Connect with Plex Manufacturing Cloud by Rockwell Automation for bi-directional formulation and nutrition data sync.',
        logo: '/integrations/plex-logo.svg',
        category: 'ERP',
        features: ['Recipe sync', 'Nutrition data push', 'Compliance reports', 'Webhook support'],
        docsUrl: 'https://docs.exodis.com/integrations/plex',
    },
    {
        id: 'foodlogiq',
        name: 'FoodLogiQ Connect',
        description: 'Food safety and traceability platform integration for product registration, supplier compliance, and FSMA requirements.',
        logo: '/integrations/foodlogiq-logo.svg',
        category: 'Food Safety',
        features: ['Product registration', 'Supplier tracking', 'Traceability events', 'Compliance scoring'],
        docsUrl: 'https://docs.exodis.com/integrations/foodlogiq',
    },
    {
        id: 'genesis',
        name: 'Genesis R&D',
        description: 'Import and export formulations with Trustwell Genesis R&D via EshaPort files or API for nutritional analysis.',
        logo: '/integrations/genesis-logo.svg',
        category: 'Formulation',
        features: ['EshaPort import/export', 'Recipe sync', 'Ingredient sync', 'Nutrition analysis'],
        docsUrl: 'https://docs.exodis.com/integrations/genesis',
    },
    {
        id: 'sap',
        name: 'SAP S/4HANA',
        description: 'Enterprise integration with SAP S/4HANA for material master, recipe management, and quality specifications.',
        logo: '/integrations/sap-logo.svg',
        category: 'ERP',
        features: ['Material master sync', 'Recipe/BOM integration', 'Quality specs', 'OData API'],
        docsUrl: 'https://docs.exodis.com/integrations/sap',
    },
    {
        id: 'tracegains',
        name: 'TraceGains',
        description: 'Supplier compliance and document management integration for specifications, COAs, and audit management.',
        logo: '/integrations/tracegains-logo.svg',
        category: 'Compliance',
        features: ['Supplier specs', 'Document sync', 'Ingredient mapping', 'Compliance data'],
        docsUrl: 'https://docs.exodis.com/integrations/tracegains',
    },
];

interface IntegrationStatus {
    configured: boolean;
    active: boolean;
    lastSync?: string;
    pendingSync?: number;
    errors?: number;
}

export default function IntegrationsPage() {
    const [statuses, setStatuses] = useState<Record<string, IntegrationStatus>>({});
    const [loading, setLoading] = useState(true);
    const [selectedIntegration, setSelectedIntegration] = useState<string | null>(null);

    useEffect(() => {
        fetchIntegrationStatuses();
    }, []);

    async function fetchIntegrationStatuses() {
        try {
            const response = await fetch('/api/integrations/status');
            if (response.ok) {
                const data = await response.json();
                setStatuses(data);
            }
        } catch (error) {
            console.error('Failed to fetch integration statuses:', error);
        } finally {
            setLoading(false);
        }
    }

    function getStatusBadge(status: IntegrationStatus | undefined) {
        if (!status?.configured) {
            return <Badge variant="outline" className="text-muted-foreground">Not Configured</Badge>;
        }
        if (status.errors && status.errors > 0) {
            return <Badge variant="destructive">Errors ({status.errors})</Badge>;
        }
        if (status.active) {
            return <Badge className="bg-green-500/20 text-green-500 border-green-500/30">Active</Badge>;
        }
        return <Badge variant="secondary">Inactive</Badge>;
    }

    function getCategoryColor(category: string) {
        switch (category) {
            case 'ERP': return 'bg-blue-500/10 text-blue-500';
            case 'Food Safety': return 'bg-green-500/10 text-green-500';
            case 'Formulation': return 'bg-purple-500/10 text-purple-500';
            case 'Compliance': return 'bg-orange-500/10 text-orange-500';
            default: return 'bg-gray-500/10 text-gray-500';
        }
    }

    if (selectedIntegration === 'plex') {
        return (
            <div className="space-y-6">
                <div className="flex items-center gap-4">
                    <Button
                        variant="ghost"
                        onClick={() => setSelectedIntegration(null)}
                        className="gap-2"
                    >
                        <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
                        </svg>
                        Back to Integrations
                    </Button>
                </div>
                <PlexIntegrationSettings />
            </div>
        );
    }

    if (selectedIntegration) {
        const integration = INTEGRATIONS.find(i => i.id === selectedIntegration);
        return (
            <div className="space-y-6">
                <div className="flex items-center gap-4">
                    <Button
                        variant="ghost"
                        onClick={() => setSelectedIntegration(null)}
                        className="gap-2"
                    >
                        <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
                        </svg>
                        Back to Integrations
                    </Button>
                </div>
                <Card>
                    <CardHeader>
                        <CardTitle className="flex items-center gap-3">
                            <IntegrationIcon integrationId={selectedIntegration} />
                            {integration?.name}
                        </CardTitle>
                        <CardDescription>{integration?.description}</CardDescription>
                    </CardHeader>
                    <CardContent>
                        <div className="text-center py-12 text-muted-foreground">
                            <svg className="w-16 h-16 mx-auto mb-4 opacity-50" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M19.428 15.428a2 2 0 00-1.022-.547l-2.387-.477a6 6 0 00-3.86.517l-.318.158a6 6 0 01-3.86.517L6.05 15.21a2 2 0 00-1.806.547M8 4h8l-1 1v5.172a2 2 0 00.586 1.414l5 5c1.26 1.26.367 3.414-1.415 3.414H4.828c-1.782 0-2.674-2.154-1.414-3.414l5-5A2 2 0 009 10.172V5L8 4z" />
                            </svg>
                            <p className="text-lg font-medium mb-2">Coming Soon</p>
                            <p className="max-w-md mx-auto">
                                The {integration?.name} integration is currently under development.
                                Check back soon or contact support for early access.
                            </p>
                            <Button variant="outline" className="mt-6" onClick={() => window.open(integration?.docsUrl, '_blank')}>
                                View Documentation
                            </Button>
                        </div>
                    </CardContent>
                </Card>
            </div>
        );
    }

    return (
        <div className="space-y-6 animate-fade-in">
            {/* Header */}
            <div className="pb-2">
                <h1 className="text-xl sm:text-2xl font-semibold text-foreground">Integrations</h1>
                <p className="mt-1 text-sm text-muted-foreground">
                    Connect Exodis with your existing ERP, formulation, and compliance systems
                </p>
            </div>

            {/* Integration Cards */}
            <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
                {INTEGRATIONS.map((integration) => {
                    const status = statuses[integration.id];

                    return (
                        <Card
                            key={integration.id}
                            className="relative group hover:border-primary/40 transition-colors cursor-pointer"
                            onClick={() => setSelectedIntegration(integration.id)}
                        >
                            <CardHeader className="pb-3">
                                <div className="flex items-start justify-between">
                                    <div className="flex items-center gap-3">
                                        <div className="w-10 h-10 rounded-lg bg-muted flex items-center justify-center">
                                            <IntegrationIcon integrationId={integration.id} />
                                        </div>
                                        <div>
                                            <CardTitle className="text-base">{integration.name}</CardTitle>
                                            <Badge variant="secondary" className={`text-xs mt-1 ${getCategoryColor(integration.category)}`}>
                                                {integration.category}
                                            </Badge>
                                        </div>
                                    </div>
                                    {getStatusBadge(status)}
                                </div>
                            </CardHeader>
                            <CardContent className="pb-4">
                                <p className="text-sm text-muted-foreground mb-3 line-clamp-2">
                                    {integration.description}
                                </p>
                                <div className="flex flex-wrap gap-1.5">
                                    {integration.features.slice(0, 3).map((feature) => (
                                        <span
                                            key={feature}
                                            className="text-xs px-2 py-0.5 rounded-full bg-muted text-muted-foreground"
                                        >
                                            {feature}
                                        </span>
                                    ))}
                                    {integration.features.length > 3 && (
                                        <span className="text-xs px-2 py-0.5 rounded-full bg-muted text-muted-foreground">
                                            +{integration.features.length - 3} more
                                        </span>
                                    )}
                                </div>

                                {status?.lastSync && (
                                    <p className="text-xs text-muted-foreground mt-3 pt-3 border-t">
                                        Last sync: {new Date(status.lastSync).toLocaleDateString()}
                                    </p>
                                )}
                            </CardContent>

                            {/* Hover arrow */}
                            <div className="absolute right-4 top-1/2 -translate-y-1/2 opacity-0 group-hover:opacity-100 transition-opacity">
                                <svg className="w-5 h-5 text-primary" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                                </svg>
                            </div>
                        </Card>
                    );
                })}
            </div>

            {/* Help Section */}
            <Card className="bg-muted/30 border-dashed">
                <CardContent className="py-6">
                    <div className="flex items-start gap-4">
                        <div className="w-10 h-10 rounded-lg bg-primary/10 flex items-center justify-center flex-shrink-0">
                            <svg className="w-5 h-5 text-primary" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8.228 9c.549-1.165 2.03-2 3.772-2 2.21 0 4 1.343 4 3 0 1.4-1.278 2.575-3.006 2.907-.542.104-.994.54-.994 1.093m0 3h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                            </svg>
                        </div>
                        <div>
                            <h3 className="font-medium mb-1">Need a different integration?</h3>
                            <p className="text-sm text-muted-foreground">
                                We&apos;re constantly adding new integrations. If you need to connect with a system not listed here,{' '}
                                <a href="mailto:support@exodis.com" className="text-primary hover:underline">
                                    contact our team
                                </a>{' '}
                                to discuss your requirements.
                            </p>
                        </div>
                    </div>
                </CardContent>
            </Card>
        </div>
    );
}

function IntegrationIcon({ integrationId }: { integrationId: string }) {
    // Simple placeholder icons for each integration
    switch (integrationId) {
        case 'plex':
            return (
                <svg className="w-6 h-6 text-blue-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M9 3v2m6-2v2M9 19v2m6-2v2M5 9H3m2 6H3m18-6h-2m2 6h-2M7 19h10a2 2 0 002-2V7a2 2 0 00-2-2H7a2 2 0 00-2 2v10a2 2 0 002 2zM9 9h6v6H9V9z" />
                </svg>
            );
        case 'foodlogiq':
            return (
                <svg className="w-6 h-6 text-green-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M9 12l2 2 4-4m5.618-4.016A11.955 11.955 0 0112 2.944a11.955 11.955 0 01-8.618 3.04A12.02 12.02 0 003 9c0 5.591 3.824 10.29 9 11.622 5.176-1.332 9-6.03 9-11.622 0-1.042-.133-2.052-.382-3.016z" />
                </svg>
            );
        case 'genesis':
            return (
                <svg className="w-6 h-6 text-purple-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M19.428 15.428a2 2 0 00-1.022-.547l-2.387-.477a6 6 0 00-3.86.517l-.318.158a6 6 0 01-3.86.517L6.05 15.21a2 2 0 00-1.806.547M8 4h8l-1 1v5.172a2 2 0 00.586 1.414l5 5c1.26 1.26.367 3.414-1.415 3.414H4.828c-1.782 0-2.674-2.154-1.414-3.414l5-5A2 2 0 009 10.172V5L8 4z" />
                </svg>
            );
        case 'sap':
            return (
                <svg className="w-6 h-6 text-sky-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M20 7l-8-4-8 4m16 0l-8 4m8-4v10l-8 4m0-10L4 7m8 4v10M4 7v10l8 4" />
                </svg>
            );
        case 'tracegains':
            return (
                <svg className="w-6 h-6 text-orange-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                </svg>
            );
        default:
            return (
                <svg className="w-6 h-6 text-muted-foreground" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M13.828 10.172a4 4 0 00-5.656 0l-4 4a4 4 0 105.656 5.656l1.102-1.101m-.758-4.899a4 4 0 005.656 0l4-4a4 4 0 00-5.656-5.656l-1.1 1.1" />
                </svg>
            );
    }
}
