'use client';

import { useState, useMemo } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import {
    Command,
    CommandEmpty,
    CommandGroup,
    CommandInput,
    CommandItem,
    CommandList,
} from '@/components/ui/command';
import {
    Popover,
    PopoverContent,
    PopoverTrigger,
} from '@/components/ui/popover';
import { FDA_RACC_TABLE, getRACCById, getRACCCategories, type RACCCategory } from '@/lib/compliance/fda-racc';
import { getServingSizeRecommendation, checkServingSizeMatchesRACC } from '@/lib/compliance/serving-size-validator';

interface RACCCategorySelectorProps {
    value: string | null;
    onChange: (categoryId: string | null) => void;
    totalProductWeight?: number;
    currentServingSize?: number;
    onServingSizeRecommendation?: (recommendation: ReturnType<typeof getServingSizeRecommendation>) => void;
    className?: string;
}

export function RACCCategorySelector({
    value,
    onChange,
    totalProductWeight,
    currentServingSize,
    onServingSizeRecommendation,
    className = '',
}: RACCCategorySelectorProps) {
    const [open, setOpen] = useState(false);
    const [searchQuery, setSearchQuery] = useState('');

    // Get selected category info
    const selectedCategory = value ? getRACCById(value) : null;

    // Group RACC items by category
    const groupedItems = useMemo(() => {
        const categories = getRACCCategories();
        const groups: { [key: string]: RACCCategory[] } = {};

        categories.forEach(cat => {
            groups[cat] = FDA_RACC_TABLE.filter(r => r.category === cat);
        });

        return groups;
    }, []);

    // Filter based on search
    const filteredGroups = useMemo(() => {
        if (!searchQuery) return groupedItems;

        const q = searchQuery.toLowerCase();
        const filtered: { [key: string]: RACCCategory[] } = {};

        Object.entries(groupedItems).forEach(([category, items]) => {
            const matchingItems = items.filter(item =>
                item.category.toLowerCase().includes(q) ||
                item.subcategory?.toLowerCase().includes(q) ||
                item.product_examples?.some(ex => ex.toLowerCase().includes(q))
            );

            if (matchingItems.length > 0) {
                filtered[category] = matchingItems;
            }
        });

        return filtered;
    }, [groupedItems, searchQuery]);

    // Get serving size recommendation when category selected
    const recommendation = useMemo(() => {
        if (!value || !totalProductWeight) return null;
        return getServingSizeRecommendation(value, totalProductWeight);
    }, [value, totalProductWeight]);

    // Check if current serving size matches RACC
    const servingSizeCheck = useMemo(() => {
        if (!value || !currentServingSize) return null;
        return checkServingSizeMatchesRACC(currentServingSize, value);
    }, [value, currentServingSize]);

    const handleSelect = (categoryId: string) => {
        onChange(categoryId);
        setOpen(false);

        // Notify parent of recommendation
        if (onServingSizeRecommendation && totalProductWeight) {
            const rec = getServingSizeRecommendation(categoryId, totalProductWeight);
            onServingSizeRecommendation(rec);
        }
    };

    return (
        <div className={`space-y-3 ${className}`}>
            <div className="space-y-2">
                <Label className="text-slate-200 flex items-center gap-2">
                    FDA RACC Category
                    <Badge variant="outline" className="text-xs font-normal text-slate-500 border-slate-600">
                        21 CFR 101.12
                    </Badge>
                </Label>

                <Popover open={open} onOpenChange={setOpen}>
                    <PopoverTrigger asChild>
                        <Button
                            variant="outline"
                            role="combobox"
                            aria-expanded={open}
                            className="w-full justify-between bg-slate-700/50 border-slate-600 text-white hover:bg-slate-700 hover:text-white"
                        >
                            {selectedCategory ? (
                                <div className="flex items-center gap-2 text-left">
                                    <span className="truncate">
                                        {selectedCategory.subcategory || selectedCategory.category}
                                    </span>
                                    <Badge className="bg-emerald-600/20 text-emerald-400 border-emerald-600/30 text-xs">
                                        {selectedCategory.racc_amount}{selectedCategory.racc_unit}
                                    </Badge>
                                </div>
                            ) : (
                                <span className="text-slate-400">Select product category...</span>
                            )}
                            <svg
                                xmlns="http://www.w3.org/2000/svg"
                                className="h-4 w-4 ml-2 shrink-0 opacity-50"
                                fill="none"
                                viewBox="0 0 24 24"
                                stroke="currentColor"
                            >
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 9l4-4 4 4m0 6l-4 4-4-4" />
                            </svg>
                        </Button>
                    </PopoverTrigger>
                    <PopoverContent className="w-[400px] p-0 bg-slate-800 border-slate-700" align="start">
                        <Command className="bg-transparent">
                            <CommandInput
                                placeholder="Search categories, products..."
                                value={searchQuery}
                                onValueChange={setSearchQuery}
                                className="border-b border-slate-700"
                            />
                            <CommandList className="max-h-[300px]">
                                <CommandEmpty className="text-slate-400 py-6 text-center">
                                    No category found.
                                </CommandEmpty>
                                {Object.entries(filteredGroups).map(([category, items]) => (
                                    <CommandGroup key={category} heading={category} className="text-slate-400">
                                        {items.map((item) => (
                                            <CommandItem
                                                key={item.id}
                                                value={item.id}
                                                onSelect={handleSelect}
                                                className="cursor-pointer text-white hover:bg-slate-700 aria-selected:bg-slate-700"
                                            >
                                                <div className="flex-1 min-w-0">
                                                    <div className="flex items-center gap-2">
                                                        <span className="truncate font-medium">
                                                            {item.subcategory || item.category}
                                                        </span>
                                                        <Badge variant="outline" className="text-xs text-emerald-400 border-emerald-600/50 shrink-0">
                                                            {item.racc_amount}{item.racc_unit}
                                                        </Badge>
                                                    </div>
                                                    {item.product_examples && (
                                                        <p className="text-xs text-slate-500 truncate mt-0.5">
                                                            {item.product_examples.slice(0, 3).join(', ')}
                                                        </p>
                                                    )}
                                                </div>
                                                {value === item.id && (
                                                    <svg
                                                        xmlns="http://www.w3.org/2000/svg"
                                                        className="h-4 w-4 text-emerald-500 shrink-0"
                                                        fill="none"
                                                        viewBox="0 0 24 24"
                                                        stroke="currentColor"
                                                    >
                                                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                                                    </svg>
                                                )}
                                            </CommandItem>
                                        ))}
                                    </CommandGroup>
                                ))}
                            </CommandList>
                        </Command>
                    </PopoverContent>
                </Popover>
            </div>

            {/* Selected Category Info */}
            {selectedCategory && (
                <div className="p-3 bg-slate-700/30 rounded-lg border border-slate-600/50 space-y-2">
                    <div className="flex items-center justify-between">
                        <span className="text-sm text-slate-400">Reference Amount:</span>
                        <span className="text-sm font-medium text-white">
                            {selectedCategory.racc_amount}{selectedCategory.racc_unit} ({selectedCategory.label_statement})
                        </span>
                    </div>
                    {selectedCategory.household_measure && (
                        <div className="flex items-center justify-between">
                            <span className="text-sm text-slate-400">Household Measure:</span>
                            <span className="text-sm text-white">{selectedCategory.household_measure}</span>
                        </div>
                    )}
                    {selectedCategory.notes && (
                        <p className="text-xs text-slate-500 italic">{selectedCategory.notes}</p>
                    )}
                </div>
            )}

            {/* Serving Size Validation Feedback */}
            {servingSizeCheck && (
                <div className={`p-3 rounded-lg border ${servingSizeCheck.matches
                        ? 'bg-emerald-900/20 border-emerald-600/50'
                        : 'bg-amber-900/20 border-amber-600/50'
                    }`}>
                    <div className="flex items-start gap-2">
                        {servingSizeCheck.matches ? (
                            <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5 text-emerald-500 shrink-0 mt-0.5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
                            </svg>
                        ) : (
                            <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5 text-amber-500 shrink-0 mt-0.5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
                            </svg>
                        )}
                        <div>
                            <p className={`text-sm font-medium ${servingSizeCheck.matches ? 'text-emerald-400' : 'text-amber-400'}`}>
                                {servingSizeCheck.message}
                            </p>
                            <p className="text-xs text-slate-400 mt-1">
                                RACC: {servingSizeCheck.raccAmount}g • Your serving: {currentServingSize}g ({Math.round(servingSizeCheck.percentOfRACC)}% of RACC)
                            </p>
                        </div>
                    </div>
                </div>
            )}

            {/* Serving Size Recommendation */}
            {recommendation && totalProductWeight && (
                <div className="p-3 bg-blue-900/20 rounded-lg border border-blue-600/50">
                    <p className="text-sm font-medium text-blue-400 mb-2">Recommended Serving Size</p>
                    <div className="grid grid-cols-2 gap-2 text-sm">
                        <div>
                            <span className="text-slate-400">Serving Size:</span>
                            <span className="text-white ml-2">{recommendation.recommendedServingSize}g</span>
                        </div>
                        <div>
                            <span className="text-slate-400">Servings/Container:</span>
                            <span className="text-white ml-2">{recommendation.recommendedServingsPerContainer}</span>
                        </div>
                    </div>
                    {recommendation.isSingleServing && (
                        <Badge className="mt-2 bg-blue-600/20 text-blue-400 border-blue-600/30">
                            Single-Serving Container
                        </Badge>
                    )}
                    {recommendation.canUseDualColumn && (
                        <Badge className="mt-2 bg-purple-600/20 text-purple-400 border-purple-600/30">
                            Dual-Column Eligible
                        </Badge>
                    )}
                </div>
            )}
        </div>
    );
}
