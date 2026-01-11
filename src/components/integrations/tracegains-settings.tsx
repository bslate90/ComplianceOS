'use client';

import { useState, useEffect } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { toast } from 'sonner';
import { cn } from '@/lib/utils';

interface TraceGainsStatus {
    connected: boolean;
    configured: boolean;
    lastSyncAt?: string;
    syncStatus?: string;
    syncError?: string;
    instanceUrl?: string;
}

export function TraceGainsIntegrationSettings() {
    const [status, setStatus] = useState<TraceGainsStatus | null>(null);
    const [loading, setLoading] = useState(true);
    const [connecting, setConnecting] = useState(false);
    const [syncing, setSyncing] = useState(false);
    const [showApiKeyInput, setShowApiKeyInput] = useState(false);
    const [apiKey, setApiKey] = useState('');
    const [instanceUrl, setInstanceUrl] = useState('https://api.tracegains.net');

    // Fetch current status
    useEffect(() => {
        fetchStatus();
    }, []);

    const fetchStatus = async () => {
        try {
            const response = await fetch('/api/integrations/tracegains');
            if (response.ok) {
                const data = await response.json();
                setStatus(data);
            }
        } catch (error) {
            console.error('Failed to fetch TraceGains status:', error);
        } finally {
            setLoading(false);
        }
    };

    const handleConnect = async () => {
        if (!apiKey.trim()) {
            toast.error('Please enter your TraceGains API key');
            return;
        }

        setConnecting(true);
        try {
            const response = await fetch('/api/integrations/tracegains', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ apiKey, instanceUrl }),
            });

            const data = await response.json();

            if (data.success) {
                toast.success('Successfully connected to TraceGains!');
                setShowApiKeyInput(false);
                setApiKey('');
                fetchStatus();
            } else {
                toast.error(data.message || 'Failed to connect to TraceGains');
            }
        } catch (error) {
            toast.error('Failed to connect to TraceGains');
            console.error(error);
        } finally {
            setConnecting(false);
        }
    };

    const handleDisconnect = async () => {
        if (!confirm('Are you sure you want to disconnect from TraceGains? This will remove all cached items.')) {
            return;
        }

        try {
            const response = await fetch('/api/integrations/tracegains', {
                method: 'DELETE',
            });

            if (response.ok) {
                toast.success('Disconnected from TraceGains');
                setStatus({ connected: false, configured: false });
            } else {
                toast.error('Failed to disconnect');
            }
        } catch (error) {
            toast.error('Failed to disconnect');
            console.error(error);
        }
    };

    const handleSync = async () => {
        setSyncing(true);
        try {
            const response = await fetch('/api/integrations/tracegains/sync', {
                method: 'POST',
            });

            const data = await response.json();

            if (data.success) {
                toast.success(data.message || 'Sync completed!');
                fetchStatus();
            } else {
                toast.error(data.error || 'Sync failed');
            }
        } catch (error) {
            toast.error('Failed to sync with TraceGains');
            console.error(error);
        } finally {
            setSyncing(false);
        }
    };

    if (loading) {
        return (
            <Card className="bg-card border-border">
                <CardContent className="p-6">
                    <div className="animate-pulse space-y-4">
                        <div className="h-4 bg-muted rounded w-1/3"></div>
                        <div className="h-10 bg-muted rounded"></div>
                    </div>
                </CardContent>
            </Card>
        );
    }

    return (
        <Card className="bg-card border-border">
            <CardHeader>
                <div className="flex items-center justify-between">
                    <div className="flex items-center gap-3">
                        {/* TraceGains Logo/Icon */}
                        <div className="w-10 h-10 rounded-lg bg-gradient-to-br from-blue-600 to-cyan-500 flex items-center justify-center">
                            <svg className="w-6 h-6 text-white" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                                <path d="M12 2L2 7l10 5 10-5-10-5z" />
                                <path d="M2 17l10 5 10-5" />
                                <path d="M2 12l10 5 10-5" />
                            </svg>
                        </div>
                        <div>
                            <CardTitle className="text-foreground">TraceGains Integration</CardTitle>
                            <CardDescription>
                                Connect to your TraceGains account to sync ingredients and specifications
                            </CardDescription>
                        </div>
                    </div>
                    <Badge
                        className={cn(
                            status?.connected
                                ? 'bg-emerald-500/20 text-emerald-400 border border-emerald-500/30'
                                : 'bg-muted text-muted-foreground border border-border'
                        )}
                    >
                        {status?.connected ? 'Connected' : 'Not Connected'}
                    </Badge>
                </div>
            </CardHeader>
            <CardContent className="space-y-4">
                {status?.connected ? (
                    <>
                        {/* Connected State */}
                        <div className="grid gap-4 sm:grid-cols-3">
                            <div className="p-3 bg-muted/50 rounded-lg">
                                <p className="text-xs text-muted-foreground">Status</p>
                                <p className="text-sm font-medium text-foreground capitalize">
                                    {status.syncStatus === 'syncing' ? (
                                        <span className="flex items-center gap-2">
                                            <span className="animate-spin">⟳</span> Syncing...
                                        </span>
                                    ) : status.syncStatus === 'success' ? (
                                        '✓ Synced'
                                    ) : status.syncStatus === 'error' ? (
                                        <span className="text-red-400">✗ Error</span>
                                    ) : (
                                        'Ready to sync'
                                    )}
                                </p>
                            </div>
                            <div className="p-3 bg-muted/50 rounded-lg">
                                <p className="text-xs text-muted-foreground">Last Synced</p>
                                <p className="text-sm font-medium text-foreground">
                                    {status.lastSyncAt
                                        ? new Date(status.lastSyncAt).toLocaleString()
                                        : 'Never'}
                                </p>
                            </div>
                            <div className="p-3 bg-muted/50 rounded-lg">
                                <p className="text-xs text-muted-foreground">Instance</p>
                                <p className="text-sm font-medium text-foreground truncate">
                                    {status.instanceUrl || 'Default'}
                                </p>
                            </div>
                        </div>

                        {status.syncError && (
                            <div className="p-3 bg-red-900/20 border border-red-500/30 rounded-lg">
                                <p className="text-sm text-red-400">{status.syncError}</p>
                            </div>
                        )}

                        <div className="flex gap-2">
                            <Button
                                onClick={handleSync}
                                disabled={syncing}
                                className="bg-primary"
                            >
                                {syncing ? 'Syncing...' : 'Sync Items'}
                            </Button>
                            <Button
                                variant="outline"
                                onClick={handleDisconnect}
                                className="border-destructive text-destructive hover:bg-destructive/10"
                            >
                                Disconnect
                            </Button>
                        </div>
                    </>
                ) : showApiKeyInput ? (
                    <>
                        {/* API Key Input Form */}
                        <div className="space-y-4">
                            <div className="space-y-2">
                                <Label htmlFor="apiKey" className="text-foreground">
                                    TraceGains API Key (Bearer Token)
                                </Label>
                                <Input
                                    id="apiKey"
                                    type="password"
                                    value={apiKey}
                                    onChange={(e) => setApiKey(e.target.value)}
                                    placeholder="Enter your TraceGains API key"
                                    className="bg-muted/50 border-border text-foreground"
                                />
                                <p className="text-xs text-muted-foreground">
                                    You can generate an API key from your TraceGains instance under Configuration → Manage Keys
                                </p>
                            </div>

                            <div className="space-y-2">
                                <Label htmlFor="instanceUrl" className="text-foreground">
                                    Instance URL (optional)
                                </Label>
                                <Input
                                    id="instanceUrl"
                                    type="url"
                                    value={instanceUrl}
                                    onChange={(e) => setInstanceUrl(e.target.value)}
                                    placeholder="https://api.tracegains.net"
                                    className="bg-muted/50 border-border text-foreground"
                                />
                                <p className="text-xs text-muted-foreground">
                                    Leave as default unless you have a custom TraceGains instance
                                </p>
                            </div>

                            <div className="flex gap-2">
                                <Button
                                    onClick={handleConnect}
                                    disabled={connecting}
                                    className="bg-primary"
                                >
                                    {connecting ? 'Connecting...' : 'Connect'}
                                </Button>
                                <Button
                                    variant="outline"
                                    onClick={() => {
                                        setShowApiKeyInput(false);
                                        setApiKey('');
                                    }}
                                    className="border-border"
                                >
                                    Cancel
                                </Button>
                            </div>
                        </div>
                    </>
                ) : (
                    <>
                        {/* Not Connected State */}
                        <div className="text-center py-6">
                            <p className="text-muted-foreground mb-4">
                                Connect your TraceGains account to import ingredients, specifications, and allergen data directly.
                            </p>
                            <ul className="text-sm text-muted-foreground space-y-1 mb-6">
                                <li>• Import your ingredient master list</li>
                                <li>• Sync nutrition and allergen data</li>
                                <li>• Keep specifications up to date</li>
                                <li>• Link ingredients to TraceGains items</li>
                            </ul>
                            <Button
                                onClick={() => setShowApiKeyInput(true)}
                                className="bg-gradient-to-r from-blue-600 to-cyan-500"
                            >
                                Connect TraceGains Account
                            </Button>
                        </div>
                    </>
                )}
            </CardContent>
        </Card>
    );
}
