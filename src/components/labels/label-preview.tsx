'use client';

import { useState } from 'react';
import { NutritionFactsPanel, LabelFormat, LabelSize } from './nutrition-facts-panel';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import type { RoundedNutritionData } from '@/lib/nutrition/rounding-rules';

interface LabelPreviewProps {
    recipeName: string;
    servingsPerContainer?: number;
    servingSize: string;
    nutrition: RoundedNutritionData;
    ingredientStatement: string;
    allergenStatement: string | null;
}

const FORMAT_INFO: Record<LabelFormat, { name: string; desc: string }> = {
    standard: { name: 'Standard Vertical', desc: '>40 sq in packages' },
    tabular: { name: 'Tabular', desc: '20-40 sq in packages' },
    linear: { name: 'Linear', desc: '<12 sq in packages' },
};

const SIZE_INFO: Record<LabelSize, string> = {
    large: 'Full Size',
    medium: 'Reduced',
    small: 'Compact',
};

export function LabelPreview({
    recipeName,
    servingsPerContainer,
    servingSize,
    nutrition,
    ingredientStatement,
    allergenStatement,
}: LabelPreviewProps) {
    const [format, setFormat] = useState<LabelFormat>('standard');
    const [size, setSize] = useState<LabelSize>('large');

    return (
        <Card className="bg-card border-border">
            <CardHeader>
                <CardTitle className="text-foreground flex items-center justify-between">
                    <span>Label Preview: {recipeName}</span>
                    <Badge className="bg-emerald-500">FDA 2020</Badge>
                </CardTitle>

                {/* Format & Size Selectors */}
                <div className="flex flex-wrap gap-4 mt-3">
                    {/* Format Selector */}
                    <div className="space-y-1">
                        <label className="text-xs text-muted-foreground">Label Format</label>
                        <div className="flex gap-1">
                            {(Object.keys(FORMAT_INFO) as LabelFormat[]).map((f) => (
                                <button
                                    key={f}
                                    onClick={() => setFormat(f)}
                                    className={`px-2 py-1 text-xs rounded transition-all ${format === f
                                        ? 'bg-primary text-primary-foreground'
                                        : 'bg-muted text-muted-foreground hover:text-foreground'
                                        }`}
                                    title={FORMAT_INFO[f].desc}
                                >
                                    {FORMAT_INFO[f].name}
                                </button>
                            ))}
                        </div>
                    </div>

                    {/* Size Selector - only for standard format */}
                    {format === 'standard' && (
                        <div className="space-y-1">
                            <label className="text-xs text-muted-foreground">Label Size</label>
                            <div className="flex gap-1">
                                {(Object.keys(SIZE_INFO) as LabelSize[]).map((s) => (
                                    <button
                                        key={s}
                                        onClick={() => setSize(s)}
                                        className={`px-2 py-1 text-xs rounded transition-all ${size === s
                                            ? 'bg-purple-600 text-white'
                                            : 'bg-muted text-muted-foreground hover:text-foreground'
                                            }`}
                                    >
                                        {SIZE_INFO[s]}
                                    </button>
                                ))}
                            </div>
                        </div>
                    )}
                </div>
            </CardHeader>
            <CardContent className="space-y-6">
                {/* Nutrition Facts Panel */}
                <div className="flex justify-center">
                    <NutritionFactsPanel
                        servingsPerContainer={servingsPerContainer}
                        servingSize={servingSize}
                        nutrition={nutrition}
                        format={format}
                        size={size}
                    />
                </div>

                {/* Ingredient Statement */}
                <div className="bg-muted/50 rounded-lg p-4">
                    <h3 className="text-sm font-semibold text-foreground mb-2">INGREDIENTS:</h3>
                    <p className="text-foreground text-sm leading-relaxed">{ingredientStatement}</p>
                </div>

                {/* Allergen Statement */}
                {allergenStatement && (
                    <div className="bg-amber-900/30 border border-amber-500/30 rounded-lg p-4">
                        <h3 className="text-sm font-semibold text-amber-400 mb-2">ALLERGEN INFORMATION:</h3>
                        <p className="text-amber-200 text-sm font-medium">{allergenStatement}</p>
                    </div>
                )}

                {/* Format Info */}
                <div className="text-xs text-muted-foreground pt-2 border-t border-border">
                    <span className="font-medium">Format:</span> {FORMAT_INFO[format].name} — {FORMAT_INFO[format].desc}
                </div>
            </CardContent>
        </Card>
    );
}
