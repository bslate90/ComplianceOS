'use client';

import { useState, useEffect, useCallback } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { mapUSDAToIngredient, formatDataType } from '@/lib/usda/mappers';
import type { USDASearchResult, USDASearchResponse } from '@/lib/usda/api';

interface USDASearchModalProps {
    open: boolean;
    onClose: () => void;
    onImport: (ingredient: ReturnType<typeof mapUSDAToIngredient>) => void;
}

export function USDASearchModal({ open, onClose, onImport }: USDASearchModalProps) {
    const [query, setQuery] = useState('');
    const [results, setResults] = useState<USDASearchResult[]>([]);
    const [loading, setLoading] = useState(false);
    const [importing, setImporting] = useState<number | null>(null);
    const [totalHits, setTotalHits] = useState(0);

    const searchUSDA = useCallback(async (searchQuery: string) => {
        if (!searchQuery.trim()) {
            setResults([]);
            return;
        }

        setLoading(true);
        try {
            const response = await fetch(`/api/usda/search?query=${encodeURIComponent(searchQuery)}`);
            if (!response.ok) throw new Error('Search failed');

            const data: USDASearchResponse = await response.json();
            setResults(data.foods || []);
            setTotalHits(data.totalHits || 0);
        } catch (error) {
            console.error('USDA search error:', error);
            setResults([]);
        } finally {
            setLoading(false);
        }
    }, []);

    // Debounced search
    useEffect(() => {
        const timer = setTimeout(() => {
            if (query) {
                searchUSDA(query);
            }
        }, 500);

        return () => clearTimeout(timer);
    }, [query, searchUSDA]);

    const handleImport = async (food: USDASearchResult) => {
        setImporting(food.fdcId);
        try {
            const mapped = mapUSDAToIngredient(food);
            onImport(mapped);
            onClose();
        } finally {
            setImporting(null);
        }
    };

    return (
        <Dialog open={open} onOpenChange={onClose}>
            <DialogContent className="max-w-3xl max-h-[80vh] bg-slate-800 border-slate-700">
                <DialogHeader>
                    <DialogTitle className="text-white flex items-center gap-2">
                        <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5 text-blue-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
                        </svg>
                        Search USDA FoodData Central
                    </DialogTitle>
                </DialogHeader>

                <div className="space-y-4">
                    <Input
                        placeholder="Search for ingredients (e.g., 'butter', 'whole wheat flour')"
                        value={query}
                        onChange={(e) => setQuery(e.target.value)}
                        className="bg-slate-700/50 border-slate-600 text-white"
                        autoFocus
                    />

                    {loading && (
                        <div className="flex items-center justify-center py-8">
                            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-emerald-500" />
                        </div>
                    )}

                    {!loading && results.length > 0 && (
                        <div className="space-y-2">
                            <p className="text-sm text-slate-400">
                                Found {totalHits.toLocaleString()} results
                            </p>
                            <div className="max-h-96 overflow-y-auto space-y-2 pr-2">
                                {results.map((food) => (
                                    <div
                                        key={food.fdcId}
                                        className="flex items-start justify-between gap-4 p-3 rounded-lg bg-slate-700/50 hover:bg-slate-700 transition-colors"
                                    >
                                        <div className="flex-1 min-w-0">
                                            <p className="text-white font-medium truncate">{food.description}</p>
                                            <div className="flex flex-wrap items-center gap-2 mt-1">
                                                {food.brandOwner && (
                                                    <span className="text-sm text-slate-400">{food.brandOwner}</span>
                                                )}
                                                <Badge variant="outline" className="text-xs border-slate-600 text-slate-400">
                                                    {formatDataType(food.dataType)}
                                                </Badge>
                                            </div>
                                            {/* Quick nutrition preview */}
                                            <div className="flex gap-4 mt-2 text-xs text-slate-500">
                                                {food.foodNutrients?.slice(0, 4).map((n) => (
                                                    <span key={n.nutrientId}>
                                                        {n.nutrientName}: {n.value?.toFixed(1)} {n.unitName}
                                                    </span>
                                                ))}
                                            </div>
                                        </div>
                                        <Button
                                            size="sm"
                                            onClick={() => handleImport(food)}
                                            disabled={importing === food.fdcId}
                                            className="bg-emerald-500 hover:bg-emerald-600 shrink-0"
                                        >
                                            {importing === food.fdcId ? (
                                                <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white" />
                                            ) : (
                                                'Import'
                                            )}
                                        </Button>
                                    </div>
                                ))}
                            </div>
                        </div>
                    )}

                    {!loading && query && results.length === 0 && (
                        <div className="text-center py-8 text-slate-400">
                            No results found for &quot;{query}&quot;
                        </div>
                    )}

                    {!query && !loading && (
                        <div className="text-center py-8 text-slate-400">
                            <svg xmlns="http://www.w3.org/2000/svg" className="h-12 w-12 mx-auto mb-2 text-slate-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
                            </svg>
                            <p>Start typing to search the USDA database</p>
                            <p className="text-sm mt-1">Access over 300,000 food items with full nutrition data</p>
                        </div>
                    )}
                </div>
            </DialogContent>
        </Dialog>
    );
}
