'use client';

import { useState, useCallback } from 'react';
import { NutritionFactsPanel, LabelFormat, LabelSize } from './nutrition-facts-panel';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Badge } from '@/components/ui/badge';
import { validateLabel, type LabelData, type NutritionData } from '@/lib/compliance/nfp-validator';
import type { RoundedNutritionData } from '@/lib/nutrition/rounding-rules';

interface LabelEditorProps {
    recipeName: string;
    servingsPerContainer?: number;
    servingSize: string;
    nutrition: RoundedNutritionData;
    rawNutrition?: Record<string, number>; // Added for accurate validation
    ingredientStatement: string;
    allergenStatement: string | null;
    onSave?: (data: LabelEditorData) => void;
}

export interface LabelEditorData {
    ingredientStatement: string;
    allergenStatement: string | null;
    format: LabelFormat;
    size: LabelSize;
    customWidth: number;
    customHeight: number;
}

// FDA minimum font sizes in points (per 21 CFR 101.9)
const FDA_MIN_FONTS = {
    header: 13,      // "Nutrition Facts"
    calories: 22,    // Calories value
    servingSize: 10, // Serving size
    nutrients: 8,    // Nutrient values
    footnote: 6,     // Footnote text
};

// Standard label sizes in pixels (for screen, 72 DPI)
const LABEL_SIZES = {
    large: { width: 280, height: 450 },
    medium: { width: 220, height: 380 },
    small: { width: 180, height: 300 },
};

// Minimum readable size (FDA requires 6pt minimum = ~8px at 72DPI)
const MIN_READABLE_WIDTH = 150;

const FORMAT_INFO: Record<LabelFormat, { name: string; desc: string }> = {
    standard: { name: 'Standard Vertical', desc: '>40 sq in packages' },
    tabular: { name: 'Tabular', desc: '20-40 sq in packages' },
    linear: { name: 'Linear', desc: '<12 sq in packages' },
};

export function LabelEditor({
    recipeName,
    servingsPerContainer,
    servingSize,
    nutrition,
    rawNutrition,
    ingredientStatement: initialIngredients,
    allergenStatement: initialAllergens,
    onSave,
}: LabelEditorProps) {
    const [format, setFormat] = useState<LabelFormat>('standard');
    const [size, setSize] = useState<LabelSize>('large');
    const [ingredientStatement, setIngredientStatement] = useState(initialIngredients);
    const [allergenStatement, setAllergenStatement] = useState(initialAllergens || '');
    const [customWidth, setCustomWidth] = useState(LABEL_SIZES.large.width);
    const [customHeight, setCustomHeight] = useState(LABEL_SIZES.large.height);
    const [useCustomSize, setUseCustomSize] = useState(false);

    // Calculate scale factor for custom sizing
    const baseSize = LABEL_SIZES[size];
    const scale = useCustomSize ? customWidth / baseSize.width : 1;

    // FDA Compliance checks
    const getFDAWarnings = useCallback((): string[] => {
        const warnings: string[] = [];

        // 1. Physical/Visual Checks (Font sizes, readability)
        if (useCustomSize && customWidth < MIN_READABLE_WIDTH) {
            warnings.push(`Label width (${customWidth}px) is below minimum readable size (${MIN_READABLE_WIDTH}px)`);
        }

        if (scale < 0.7) {
            warnings.push(`Label scaled to ${Math.round(scale * 100)}% - fonts may fall below FDA minimums`);
        }

        if (scale < 0.5) {
            const estimatedNutrientFont = Math.round(8 * scale);
            if (estimatedNutrientFont < FDA_MIN_FONTS.footnote) {
                warnings.push(`Nutrient text (~${estimatedNutrientFont}pt) below FDA minimum of ${FDA_MIN_FONTS.footnote}pt`);
            }
        }

        // 2. Regulatory Checks using NFP Validator
        // Calculate surface area (assuming 72 DPI for screen pixels -> inches)
        // Area = (width/72) * (height/72)
        const widthIn = customWidth / 72;
        const heightIn = customHeight / 72;
        const surfaceArea = widthIn * heightIn;

        // Map format to validator types
        const validatorFormat = format === 'standard' ? 'standard_vertical' : format;

        // Prepare data for validator
        // Use raw nutrition if available, otherwise parse rounded (fallback)
        const nutritionData: NutritionData = rawNutrition ? {
            calories: rawNutrition.calories || 0,
            totalFat: rawNutrition.totalFat || 0,
            saturatedFat: rawNutrition.saturatedFat || 0,
            transFat: rawNutrition.transFat || 0,
            cholesterol: rawNutrition.cholesterol || 0,
            sodium: rawNutrition.sodium || 0,
            totalCarbohydrates: rawNutrition.totalCarbohydrates || 0,
            dietaryFiber: rawNutrition.dietaryFiber || 0,
            totalSugars: rawNutrition.totalSugars || 0,
            addedSugars: rawNutrition.addedSugars || 0,
            protein: rawNutrition.protein || 0,
            vitaminD: rawNutrition.vitaminD || 0,
            calcium: rawNutrition.calcium || 0,
            iron: rawNutrition.iron || 0,
            potassium: rawNutrition.potassium || 0,
        } : {
            // Fallback: try to parse numbers from string/number rounded values
            // This is imperfect but better than crashing
            calories: Number(nutrition.calories) || 0,
            totalFat: Number(nutrition.totalFat) || 0,
            saturatedFat: Number(nutrition.saturatedFat) || 0,
            transFat: Number(nutrition.transFat) || 0,
            cholesterol: typeof nutrition.cholesterol === 'string' ? 0 : nutrition.cholesterol, // 'less than 5' -> 0?
            sodium: Number(nutrition.sodium) || 0,
            totalCarbohydrates: Number(nutrition.totalCarbohydrates) || 0,
            dietaryFiber: Number(nutrition.dietaryFiber) || 0,
            totalSugars: Number(nutrition.totalSugars) || 0,
            addedSugars: Number(nutrition.addedSugars) || 0,
            protein: Number(nutrition.protein) || 0,
            vitaminD: Number(nutrition.vitaminD) || 0,
            calcium: Number(nutrition.calcium) || 0,
            iron: Number(nutrition.iron) || 0,
            potassium: Number(nutrition.potassium) || 0,
        };

        const labelData: LabelData = {
            nutrition_data: nutritionData,
            serving_size_g: parseInt(servingSize) || 30, // Rough parse if needed
            servings_per_container: servingsPerContainer,
            format: validatorFormat,
            package_surface_area: surfaceArea, // This is the key for "resizing" validation
        };

        const report = validateLabel(labelData);

        // Add validator warnings/errors
        report.validation_results.forEach(result => {
            if (result.status === 'fail') {
                warnings.push(`${result.rule_name}: ${result.message}`);
            }
        });

        return warnings;
    }, [useCustomSize, customWidth, customHeight, scale, format, rawNutrition, nutrition, servingSize, servingsPerContainer]);

    const warnings = getFDAWarnings();
    const hasWarnings = warnings.length > 0;

    const handleSizePreset = (newSize: LabelSize) => {
        setSize(newSize);
        if (!useCustomSize) {
            setCustomWidth(LABEL_SIZES[newSize].width);
            setCustomHeight(LABEL_SIZES[newSize].height);
        }
    };

    const handleSave = () => {
        onSave?.({
            ingredientStatement,
            allergenStatement: allergenStatement || null,
            format,
            size,
            customWidth,
            customHeight,
        });
    };

    return (
        <div className="grid gap-6 lg:grid-cols-2">
            {/* Left: Editor Controls */}
            <Card className="bg-card border-border">
                <CardHeader>
                    <CardTitle className="text-foreground flex items-center gap-2">
                        Label Editor
                        <Badge className="bg-purple-600">Editable</Badge>
                    </CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                    {/* Format Selector */}
                    <div className="space-y-2">
                        <Label className="text-foreground">Label Format</Label>
                        <div className="flex gap-2">
                            {(Object.keys(FORMAT_INFO) as LabelFormat[]).map((f) => (
                                <Button
                                    key={f}
                                    type="button"
                                    variant={format === f ? 'default' : 'outline'}
                                    size="sm"
                                    onClick={() => setFormat(f)}
                                    className={format === f ? 'bg-primary' : 'border-border'}
                                >
                                    {FORMAT_INFO[f].name}
                                </Button>
                            ))}
                        </div>
                    </div>

                    {/* Size Presets */}
                    {format === 'standard' && (
                        <div className="space-y-2">
                            <Label className="text-foreground">Label Size Preset</Label>
                            <div className="flex gap-2">
                                {(['large', 'medium', 'small'] as LabelSize[]).map((s) => (
                                    <Button
                                        key={s}
                                        type="button"
                                        variant={size === s && !useCustomSize ? 'default' : 'outline'}
                                        size="sm"
                                        onClick={() => {
                                            handleSizePreset(s);
                                            setUseCustomSize(false);
                                        }}
                                        className={size === s && !useCustomSize ? 'bg-purple-600' : 'border-border'}
                                    >
                                        {s.charAt(0).toUpperCase() + s.slice(1)}
                                    </Button>
                                ))}
                                <Button
                                    type="button"
                                    variant={useCustomSize ? 'default' : 'outline'}
                                    size="sm"
                                    onClick={() => setUseCustomSize(true)}
                                    className={useCustomSize ? 'bg-orange-600' : 'border-border'}
                                >
                                    Custom
                                </Button>
                            </div>
                        </div>
                    )}

                    {/* Custom Size */}
                    {useCustomSize && (
                        <div className="grid grid-cols-2 gap-4 p-3 bg-muted rounded-lg">
                            <div className="space-y-1">
                                <Label className="text-xs text-muted-foreground">Width (px)</Label>
                                <Input
                                    type="number"
                                    value={customWidth}
                                    onChange={(e) => setCustomWidth(parseInt(e.target.value) || 100)}
                                    className="bg-muted/50 border-border text-foreground"
                                    min={100}
                                    max={500}
                                />
                            </div>
                            <div className="space-y-1">
                                <Label className="text-xs text-muted-foreground">Height (px)</Label>
                                <Input
                                    type="number"
                                    value={customHeight}
                                    onChange={(e) => setCustomHeight(parseInt(e.target.value) || 100)}
                                    className="bg-muted/50 border-border text-foreground"
                                    min={100}
                                    max={800}
                                />
                            </div>
                        </div>
                    )}

                    {/* FDA Compliance Warning */}
                    {hasWarnings && (
                        <div className="p-3 bg-red-900/30 border border-red-500/50 rounded-lg">
                            <div className="flex items-center gap-2 text-red-400 font-medium text-sm mb-2">
                                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
                                </svg>
                                FDA Compliance Warnings
                            </div>
                            <ul className="text-xs text-red-300 space-y-1">
                                {warnings.map((w, i) => (
                                    <li key={i}>• {w}</li>
                                ))}
                            </ul>
                        </div>
                    )}

                    {/* Ingredient Statement */}
                    <div className="space-y-2">
                        <Label className="text-foreground">Ingredient Statement</Label>
                        <Textarea
                            value={ingredientStatement}
                            onChange={(e) => setIngredientStatement(e.target.value)}
                            className="bg-muted/50 border-border text-foreground min-h-[100px]"
                        />
                    </div>

                    {/* Allergen Statement */}
                    <div className="space-y-2">
                        <Label className="text-foreground">Allergen Statement (optional)</Label>
                        <Textarea
                            value={allergenStatement}
                            onChange={(e) => setAllergenStatement(e.target.value)}
                            className="bg-muted/50 border-border text-foreground"
                            placeholder="Contains: ..."
                        />
                    </div>

                    {/* Save Button */}
                    <Button
                        onClick={handleSave}
                        className="w-full bg-gradient-to-r from-emerald-500 to-teal-600"
                    >
                        Save Label Settings
                    </Button>
                </CardContent>
            </Card>

            {/* Right: Live Preview */}
            <Card className="bg-card border-border">
                <CardHeader>
                    <CardTitle className="text-foreground flex items-center justify-between">
                        <span>Preview: {recipeName}</span>
                        <Badge className={hasWarnings ? 'bg-red-500' : 'bg-emerald-500'}>
                            {hasWarnings ? 'Non-Compliant' : 'FDA 2020'}
                        </Badge>
                    </CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                    {/* Scaled Preview */}
                    <div
                        className="flex justify-center overflow-auto p-4 bg-muted rounded-lg"
                        style={{
                            transform: useCustomSize ? `scale(${Math.min(scale, 1)})` : undefined,
                            transformOrigin: 'top center',
                        }}
                    >
                        <NutritionFactsPanel
                            servingsPerContainer={servingsPerContainer}
                            servingSize={servingSize}
                            nutrition={nutrition}
                            format={format}
                            size={size}
                        />
                    </div>

                    {/* Ingredient Statement Preview */}
                    <div className="bg-muted/50 rounded-lg p-4">
                        <h3 className="text-sm font-semibold text-foreground mb-2">INGREDIENTS:</h3>
                        <p className="text-foreground text-sm leading-relaxed">{ingredientStatement}</p>
                    </div>

                    {/* Allergen Statement Preview */}
                    {allergenStatement && (
                        <div className="bg-amber-900/30 border border-amber-500/30 rounded-lg p-4">
                            <h3 className="text-sm font-semibold text-amber-400 mb-2">ALLERGEN INFORMATION:</h3>
                            <p className="text-amber-200 text-sm font-medium">{allergenStatement}</p>
                        </div>
                    )}

                    {/* Size Info */}
                    <div className="text-xs text-muted-foreground pt-2 border-t border-border">
                        <span className="font-medium">Dimensions:</span> {useCustomSize ? `${customWidth}×${customHeight}px (custom)` : `${LABEL_SIZES[size].width}×${LABEL_SIZES[size].height}px`}
                    </div>
                </CardContent>
            </Card>
        </div>
    );
}
