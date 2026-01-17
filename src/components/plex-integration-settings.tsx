'use client';

import { useState, useEffect, useCallback } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Switch } from '@/components/ui/switch';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { toast } from 'sonner';

interface PlexConfig {
    id: string;
    name: string;
    is_active: boolean;
    plex_company_code: string;
    plex_environment: 'production' | 'test';
    sync_ingredients: boolean;
    sync_recipes: boolean;
    sync_nutrition: boolean;
    sync_compliance: boolean;
    auto_generate_reports: boolean;
    last_sync_at: string | null;
    last_error: string | null;
}

interface IntegrationStatus {
    configured: boolean;
    active: boolean;
    lastSync?: string;
    pendingSync: number;
    recentEvents: number;
    errors: number;
}

interface WebhookEvent {
    id: string;
    event_type: string;
    status: string;
    external_id: string;
    created_at: string;
    error_message: string | null;
}

export default function PlexIntegrationSettings() {
    const [loading, setLoading] = useState(true);
    const [saving, setSaving] = useState(false);
    const [config, setConfig] = useState<PlexConfig | null>(null);
    const [status, setStatus] = useState<IntegrationStatus | null>(null);
    const [webhookUrl, setWebhookUrl] = useState('');
    const [recentEvents, setRecentEvents] = useState<WebhookEvent[]>([]);
    const [showSecrets, setShowSecrets] = useState(false);

    // Form state
    const [formData, setFormData] = useState({
        name: 'PLEX Integration',
        webhook_url: '',
        api_key: '',
        api_secret: '',
        plex_company_code: '',
        plex_data_source_key: '',
        plex_environment: 'production' as 'production' | 'test',
        sync_ingredients: true,
        sync_recipes: true,
        sync_nutrition: true,
        sync_compliance: true,
        auto_generate_reports: true,
        is_active: true,
    });

    const fetchConfig = useCallback(async () => {
        try {
            const res = await fetch('/api/integrations/plex');
            if (res.ok) {
                const data = await res.json();
                if (data.config) {
                    setConfig(data.config);
                    setFormData(prev => ({
                        ...prev,
                        name: data.config.name || prev.name,
                        plex_company_code: data.config.plex_company_code || '',
                        plex_environment: data.config.plex_environment || 'production',
                        sync_ingredients: data.config.sync_ingredients ?? true,
                        sync_recipes: data.config.sync_recipes ?? true,
                        sync_nutrition: data.config.sync_nutrition ?? true,
                        sync_compliance: data.config.sync_compliance ?? true,
                        auto_generate_reports: data.config.auto_generate_reports ?? true,
                        is_active: data.config.is_active ?? true,
                    }));
                }
                setStatus(data.status);
                setWebhookUrl(data.webhookUrl);
                setRecentEvents(data.recentEvents || []);
            }
        } catch (error) {
            console.error('Failed to fetch PLEX config:', error);
        }
        setLoading(false);
    }, []);

    useEffect(() => {
        fetchConfig();
    }, [fetchConfig]);

    const handleSave = async () => {
        setSaving(true);
        try {
            const res = await fetch('/api/integrations/plex', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(formData),
            });

            if (res.ok) {
                toast.success('PLEX integration saved successfully');
                fetchConfig();
            } else {
                const error = await res.json();
                toast.error(error.error || 'Failed to save configuration');
            }
        } catch {
            toast.error('Failed to save configuration');
        }
        setSaving(false);
    };

    const handleDisable = async () => {
        if (!confirm('Are you sure you want to disable the PLEX integration?')) return;

        try {
            const res = await fetch('/api/integrations/plex', { method: 'DELETE' });
            if (res.ok) {
                toast.success('PLEX integration disabled');
                fetchConfig();
            } else {
                toast.error('Failed to disable integration');
            }
        } catch {
            toast.error('Failed to disable integration');
        }
    };

    const copyWebhookUrl = () => {
        navigator.clipboard.writeText(webhookUrl);
        toast.success('Webhook URL copied to clipboard');
    };

    if (loading) {
        return (
            <div className="flex items-center justify-center p-12">
                <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
            </div>
        );
    }

    return (
        <div className="space-y-6">
            {/* PLEX Header */}
            <Card className="border shadow-card overflow-hidden">
                <div className="h-1 bg-gradient-to-r from-blue-600 via-blue-500 to-cyan-500"></div>
                <CardHeader className="pb-4">
                    <div className="flex items-start justify-between">
                        <div className="flex items-center gap-4">
                            <div className="w-14 h-14 rounded-xl bg-gradient-to-br from-blue-600 to-cyan-500 flex items-center justify-center shadow-lg shadow-blue-500/20">
                                <svg className="w-8 h-8 text-white" viewBox="0 0 24 24" fill="currentColor">
                                    <path d="M12 2L2 7l10 5 10-5-10-5zM2 17l10 5 10-5M2 12l10 5 10-5" />
                                </svg>
                            </div>
                            <div>
                                <CardTitle className="text-lg font-semibold">
                                    PLEX by Rockwell Automation
                                </CardTitle>
                                <CardDescription>
                                    Bi-directional ERP integration for formulation and compliance data
                                </CardDescription>
                            </div>
                        </div>
                        <div className={`inline-flex items-center px-3 py-1 rounded-full text-xs font-medium ${status?.active
                            ? 'bg-green-500/10 text-green-500 border border-green-500/20'
                            : 'bg-slate-500/10 text-slate-400 border border-slate-500/20'
                            }`}>
                            {status?.active ? 'Connected' : 'Not Connected'}
                        </div>
                    </div>
                </CardHeader>
                {status && (
                    <CardContent className="pt-0 pb-4">
                        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                            <div className="p-3 rounded-lg bg-muted/30 border border-border/50 text-center">
                                <div className="text-2xl font-bold text-foreground">{status.recentEvents}</div>
                                <div className="text-xs text-muted-foreground">Events (24h)</div>
                            </div>
                            <div className="p-3 rounded-lg bg-muted/30 border border-border/50 text-center">
                                <div className="text-2xl font-bold text-foreground">{status.pendingSync}</div>
                                <div className="text-xs text-muted-foreground">Pending Sync</div>
                            </div>
                            <div className="p-3 rounded-lg bg-muted/30 border border-border/50 text-center">
                                <div className={`text-2xl font-bold ${status.errors > 0 ? 'text-red-500' : 'text-foreground'}`}>
                                    {status.errors}
                                </div>
                                <div className="text-xs text-muted-foreground">Errors (24h)</div>
                            </div>
                            <div className="p-3 rounded-lg bg-muted/30 border border-border/50 text-center">
                                <div className="text-sm font-medium text-foreground">
                                    {status.lastSync ? new Date(status.lastSync).toLocaleDateString() : 'Never'}
                                </div>
                                <div className="text-xs text-muted-foreground">Last Sync</div>
                            </div>
                        </div>
                    </CardContent>
                )}
            </Card>

            {/* Webhook URL */}
            <Card className="border shadow-card">
                <CardHeader className="pb-3">
                    <CardTitle className="text-sm font-medium flex items-center gap-2">
                        <svg className="w-4 h-4 text-primary" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13.828 10.172a4 4 0 00-5.656 0l-4 4a4 4 0 105.656 5.656l1.102-1.101m-.758-4.899a4 4 0 005.656 0l4-4a4 4 0 00-5.656-5.656l-1.1 1.1" />
                        </svg>
                        Incoming Webhook URL
                    </CardTitle>
                    <CardDescription className="text-xs">
                        Configure this URL in PLEX to send formulation changes to Exodis
                    </CardDescription>
                </CardHeader>
                <CardContent className="pt-0">
                    <div className="flex gap-2">
                        <Input
                            value={webhookUrl}
                            readOnly
                            className="font-mono text-xs bg-muted"
                        />
                        <Button variant="outline" onClick={copyWebhookUrl}>
                            <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 16H6a2 2 0 01-2-2V6a2 2 0 012-2h8a2 2 0 012 2v2m-6 12h8a2 2 0 002-2v-8a2 2 0 00-2-2h-8a2 2 0 00-2 2v8a2 2 0 002 2z" />
                            </svg>
                        </Button>
                    </div>
                </CardContent>
            </Card>

            {/* Configuration Form */}
            <Card className="border shadow-card">
                <CardHeader className="pb-3">
                    <CardTitle className="text-sm font-medium">Connection Settings</CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        <div className="space-y-2">
                            <Label>Integration Name</Label>
                            <Input
                                value={formData.name}
                                onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                                placeholder="PLEX Integration"
                            />
                        </div>
                        <div className="space-y-2">
                            <Label>Environment</Label>
                            <Select
                                value={formData.plex_environment}
                                onValueChange={(v) => setFormData({ ...formData, plex_environment: v as 'production' | 'test' })}
                            >
                                <SelectTrigger>
                                    <SelectValue />
                                </SelectTrigger>
                                <SelectContent>
                                    <SelectItem value="production">Production</SelectItem>
                                    <SelectItem value="test">Test/Sandbox</SelectItem>
                                </SelectContent>
                            </Select>
                        </div>
                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        <div className="space-y-2">
                            <Label>PLEX Company Code</Label>
                            <Input
                                value={formData.plex_company_code}
                                onChange={(e) => setFormData({ ...formData, plex_company_code: e.target.value })}
                                placeholder="Your PLEX company code"
                            />
                        </div>
                        <div className="space-y-2">
                            <Label>Data Source Key</Label>
                            <Input
                                value={formData.plex_data_source_key}
                                onChange={(e) => setFormData({ ...formData, plex_data_source_key: e.target.value })}
                                placeholder="PLEX data source key for nutrition data"
                            />
                        </div>
                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        <div className="space-y-2">
                            <Label>API Key</Label>
                            <Input
                                type={showSecrets ? 'text' : 'password'}
                                value={formData.api_key}
                                onChange={(e) => setFormData({ ...formData, api_key: e.target.value })}
                                placeholder="PLEX Connect API key"
                            />
                        </div>
                        <div className="space-y-2">
                            <Label>API Secret</Label>
                            <div className="flex gap-2">
                                <Input
                                    type={showSecrets ? 'text' : 'password'}
                                    value={formData.api_secret}
                                    onChange={(e) => setFormData({ ...formData, api_secret: e.target.value })}
                                    placeholder="Webhook signing secret"
                                />
                                <Button
                                    variant="ghost"
                                    size="sm"
                                    onClick={() => setShowSecrets(!showSecrets)}
                                >
                                    {showSecrets ? 'Hide' : 'Show'}
                                </Button>
                            </div>
                        </div>
                    </div>

                    <div className="space-y-2">
                        <Label>PLEX Webhook URL (Optional)</Label>
                        <Input
                            value={formData.webhook_url}
                            onChange={(e) => setFormData({ ...formData, webhook_url: e.target.value })}
                            placeholder="https://connect.plex.com/api/v1 (leave blank for default)"
                        />
                        <p className="text-xs text-muted-foreground">
                            Custom PLEX Connect API endpoint. Leave blank to use the default for your environment.
                        </p>
                    </div>
                </CardContent>
            </Card>

            {/* Sync Settings */}
            <Card className="border shadow-card">
                <CardHeader className="pb-3">
                    <CardTitle className="text-sm font-medium">Sync Settings</CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                    <div className="flex items-center justify-between p-4 rounded-lg bg-muted/30 border border-border/50">
                        <div>
                            <div className="text-sm font-medium">Sync Ingredients</div>
                            <div className="text-xs text-muted-foreground">
                                Receive ingredient updates from PLEX
                            </div>
                        </div>
                        <Switch
                            checked={formData.sync_ingredients}
                            onCheckedChange={(v) => setFormData({ ...formData, sync_ingredients: v })}
                        />
                    </div>

                    <div className="flex items-center justify-between p-4 rounded-lg bg-muted/30 border border-border/50">
                        <div>
                            <div className="text-sm font-medium">Sync Recipes/Formulations</div>
                            <div className="text-xs text-muted-foreground">
                                Receive formulation changes and push nutrition data
                            </div>
                        </div>
                        <Switch
                            checked={formData.sync_recipes}
                            onCheckedChange={(v) => setFormData({ ...formData, sync_recipes: v })}
                        />
                    </div>

                    <div className="flex items-center justify-between p-4 rounded-lg bg-muted/30 border border-border/50">
                        <div>
                            <div className="text-sm font-medium">Push Nutritional Data</div>
                            <div className="text-xs text-muted-foreground">
                                Send calculated nutrition facts to PLEX data sources
                            </div>
                        </div>
                        <Switch
                            checked={formData.sync_nutrition}
                            onCheckedChange={(v) => setFormData({ ...formData, sync_nutrition: v })}
                        />
                    </div>

                    <div className="flex items-center justify-between p-4 rounded-lg bg-muted/30 border border-border/50">
                        <div>
                            <div className="text-sm font-medium">Push Compliance Reports</div>
                            <div className="text-xs text-muted-foreground">
                                Send compliance check results to PLEX
                            </div>
                        </div>
                        <Switch
                            checked={formData.sync_compliance}
                            onCheckedChange={(v) => setFormData({ ...formData, sync_compliance: v })}
                        />
                    </div>

                    <div className="flex items-center justify-between p-4 rounded-lg bg-primary/5 border border-primary/20">
                        <div>
                            <div className="text-sm font-medium">Auto-Generate Compliance Reports</div>
                            <div className="text-xs text-muted-foreground">
                                Automatically generate compliance reports when formulations change
                            </div>
                        </div>
                        <Switch
                            checked={formData.auto_generate_reports}
                            onCheckedChange={(v) => setFormData({ ...formData, auto_generate_reports: v })}
                        />
                    </div>
                </CardContent>
            </Card>

            {/* Recent Events */}
            {recentEvents.length > 0 && (
                <Card className="border shadow-card">
                    <CardHeader className="pb-3">
                        <CardTitle className="text-sm font-medium">Recent Webhook Events</CardTitle>
                    </CardHeader>
                    <CardContent className="pt-0">
                        <div className="space-y-2 max-h-60 overflow-y-auto">
                            {recentEvents.map((event) => (
                                <div key={event.id} className="flex items-center justify-between p-3 rounded-lg bg-muted/30 border border-border/50">
                                    <div className="flex items-center gap-3">
                                        <div className={`w-2 h-2 rounded-full ${event.status === 'completed' ? 'bg-green-500' :
                                            event.status === 'failed' ? 'bg-red-500' :
                                                event.status === 'processing' ? 'bg-blue-500' : 'bg-amber-500'
                                            }`} />
                                        <div>
                                            <div className="text-sm font-medium">{event.event_type}</div>
                                            <div className="text-xs text-muted-foreground">
                                                ID: {event.external_id}
                                            </div>
                                        </div>
                                    </div>
                                    <div className="text-xs text-muted-foreground">
                                        {new Date(event.created_at).toLocaleString()}
                                    </div>
                                </div>
                            ))}
                        </div>
                    </CardContent>
                </Card>
            )}

            {/* Actions */}
            <div className="flex justify-between">
                {config && (
                    <Button variant="destructive" onClick={handleDisable}>
                        Disable Integration
                    </Button>
                )}
                <div className="flex gap-3 ml-auto">
                    <Button variant="outline" onClick={fetchConfig}>
                        Refresh
                    </Button>
                    <Button onClick={handleSave} disabled={saving}>
                        {saving ? 'Saving...' : 'Save Configuration'}
                    </Button>
                </div>
            </div>
        </div>
    );
}
