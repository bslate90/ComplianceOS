'use client';

import { useState, useEffect, useCallback } from 'react';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { toast } from 'sonner';
import { cn } from '@/lib/utils';

interface TraceGainsItem {
    id: string;
    tracegains_item_id: string;
    name: string;
    item_number: string | null;
    category: string | null;
    supplier_name: string | null;
    raw_data: Record<string, unknown>;
}

interface TraceGainsItemSelectorProps {
    ingredientId?: string;
    ingredientName?: string;
    currentLink?: string;
    onSelect?: (item: TraceGainsItem | null) => void;
    trigger?: React.ReactNode;
}

export function TraceGainsItemSelector({
    ingredientId,
    ingredientName,
    currentLink,
    onSelect,
    trigger,
}: TraceGainsItemSelectorProps) {
    const [open, setOpen] = useState(false);
    const [search, setSearch] = useState('');
    const [items, setItems] = useState<TraceGainsItem[]>([]);
    const [loading, setLoading] = useState(false);
    const [isConnected, setIsConnected] = useState<boolean | null>(null);

    // Check if TraceGains is connected
    useEffect(() => {
        async function checkConnection() {
            try {
                const response = await fetch('/api/integrations/tracegains');
                if (response.ok) {
                    const data = await response.json();
                    setIsConnected(data.connected);
                }
            } catch {
                setIsConnected(false);
            }
        }
        checkConnection();
    }, []);

    // Search TraceGains items
    const searchItems = useCallback(async (query: string) => {
        setLoading(true);
        try {
            const params = new URLSearchParams({
                search: query,
                pageSize: '20',
            });
            const response = await fetch(`/api/integrations/tracegains/items?${params}`);
            if (response.ok) {
                const data = await response.json();
                setItems(data.items || []);
            }
        } catch (error) {
            console.error('Failed to search TraceGains items:', error);
        } finally {
            setLoading(false);
        }
    }, []);

    // Load items when dialog opens
    useEffect(() => {
        if (open && isConnected) {
            searchItems(ingredientName || '');
        }
    }, [open, isConnected, ingredientName, searchItems]);

    // Debounced search
    useEffect(() => {
        if (!open || !isConnected) return;

        const timer = setTimeout(() => {
            searchItems(search);
        }, 300);

        return () => clearTimeout(timer);
    }, [search, open, isConnected, searchItems]);

    const handleSelect = async (item: TraceGainsItem) => {
        if (onSelect) {
            onSelect(item);
        }

        // If we have an ingredientId, save the link
        if (ingredientId) {
            try {
                const response = await fetch('/api/ingredients', {
                    method: 'PUT',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({
                        id: ingredientId,
                        tracegains_item_id: item.tracegains_item_id,
                    }),
                });

                if (response.ok) {
                    toast.success(`Linked to TraceGains item: ${item.name}`);
                } else {
                    toast.error('Failed to save link');
                }
            } catch (error) {
                console.error('Failed to save link:', error);
                toast.error('Failed to save link');
            }
        }

        setOpen(false);
    };

    const handleUnlink = async () => {
        if (onSelect) {
            onSelect(null);
        }

        if (ingredientId) {
            try {
                const response = await fetch('/api/ingredients', {
                    method: 'PUT',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({
                        id: ingredientId,
                        tracegains_item_id: null,
                    }),
                });

                if (response.ok) {
                    toast.success('TraceGains link removed');
                }
            } catch (error) {
                console.error('Failed to unlink:', error);
            }
        }

        setOpen(false);
    };

    return (
        <Dialog open={open} onOpenChange={setOpen}>
            <DialogTrigger asChild>
                {trigger || (
                    <Button variant="outline" size="sm" className="border-border text-muted-foreground">
                        {currentLink ? (
                            <>
                                <svg className="w-4 h-4 mr-1 text-cyan-400" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                                    <path d="M12 2L2 7l10 5 10-5-10-5z" />
                                    <path d="M2 17l10 5 10-5" />
                                    <path d="M2 12l10 5 10-5" />
                                </svg>
                                Linked
                            </>
                        ) : (
                            'Link to TraceGains'
                        )}
                    </Button>
                )}
            </DialogTrigger>
            <DialogContent className="bg-card border-border max-w-2xl max-h-[80vh] overflow-hidden flex flex-col">
                <DialogHeader>
                    <DialogTitle className="text-foreground flex items-center gap-2">
                        <svg className="w-5 h-5 text-cyan-400" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                            <path d="M12 2L2 7l10 5 10-5-10-5z" />
                            <path d="M2 17l10 5 10-5" />
                            <path d="M2 12l10 5 10-5" />
                        </svg>
                        Link to TraceGains Item
                    </DialogTitle>
                    <DialogDescription>
                        {ingredientName
                            ? `Find and link a TraceGains item to "${ingredientName}"`
                            : 'Search for a TraceGains item to link'}
                    </DialogDescription>
                </DialogHeader>

                {isConnected === false ? (
                    <div className="py-8 text-center">
                        <p className="text-muted-foreground mb-4">
                            TraceGains is not connected. Please configure your TraceGains integration in Settings.
                        </p>
                        <Button variant="outline" onClick={() => setOpen(false)}>
                            Close
                        </Button>
                    </div>
                ) : (
                    <>
                        {/* Search */}
                        <div className="relative">
                            <Input
                                placeholder="Search TraceGains items..."
                                value={search}
                                onChange={(e) => setSearch(e.target.value)}
                                className="bg-muted/50 border-border text-foreground"
                            />
                            {loading && (
                                <div className="absolute right-3 top-1/2 -translate-y-1/2">
                                    <span className="animate-spin">⟳</span>
                                </div>
                            )}
                        </div>

                        {/* Current Link */}
                        {currentLink && (
                            <div className="flex items-center justify-between p-3 bg-cyan-900/20 border border-cyan-500/30 rounded-lg">
                                <div>
                                    <p className="text-sm text-cyan-400">Currently linked to:</p>
                                    <p className="text-foreground font-medium">{currentLink}</p>
                                </div>
                                <Button
                                    variant="outline"
                                    size="sm"
                                    onClick={handleUnlink}
                                    className="border-red-500/50 text-red-400 hover:bg-red-500/10"
                                >
                                    Unlink
                                </Button>
                            </div>
                        )}

                        {/* Results */}
                        <div className="flex-1 overflow-y-auto space-y-2 min-h-[200px] max-h-[400px]">
                            {items.length === 0 && !loading ? (
                                <div className="py-8 text-center text-muted-foreground">
                                    No TraceGains items found. Try syncing your items first.
                                </div>
                            ) : (
                                items.map((item) => (
                                    <button
                                        key={item.id}
                                        onClick={() => handleSelect(item)}
                                        className={cn(
                                            'w-full p-3 rounded-lg border text-left transition-colors',
                                            'bg-muted/30 border-border hover:bg-muted hover:border-primary/50'
                                        )}
                                    >
                                        <div className="flex items-center justify-between">
                                            <div className="flex-1 min-w-0">
                                                <p className="font-medium text-foreground truncate">
                                                    {item.name}
                                                </p>
                                                <div className="flex items-center gap-2 mt-1">
                                                    {item.item_number && (
                                                        <Badge variant="outline" className="text-xs">
                                                            {item.item_number}
                                                        </Badge>
                                                    )}
                                                    {item.supplier_name && (
                                                        <span className="text-xs text-muted-foreground truncate">
                                                            {item.supplier_name}
                                                        </span>
                                                    )}
                                                </div>
                                            </div>
                                            {item.category && (
                                                <Badge className="bg-muted text-muted-foreground ml-2">
                                                    {item.category}
                                                </Badge>
                                            )}
                                        </div>
                                    </button>
                                ))
                            )}
                        </div>
                    </>
                )}
            </DialogContent>
        </Dialog>
    );
}
