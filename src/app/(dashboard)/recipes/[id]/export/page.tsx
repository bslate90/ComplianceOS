'use client';

import { useState, useEffect, useCallback, use } from 'react';
import { useRouter } from 'next/navigation';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { LabelEditor } from '@/components/labels/label-editor';
import { toast } from 'sonner';
import type { RoundedNutritionData } from '@/lib/nutrition/rounding-rules';
import {
    calculateFormulaPercentages,
    calculateRangeFormula,
    formatFormulaAsCsv,
    RecipeIngredientWithDetails,
} from '@/lib/export/formula-export';

interface RecipeData {
    recipe: {
        id: string;
        name: string;
        serving_size_g: number;
        serving_size_description: string | null;
        servings_per_container: number | null;
        recipe_yield_g: number;
    };
    ingredients: RecipeIngredientWithDetails[];
    nutrition: {
        raw: Record<string, number>;
        rounded: RoundedNutritionData;
    };
    ingredientStatement: string;
    allergenStatement: string | null;
}

interface AuditLogEntry {
    id: string;
    action: string;
    user_name: string | null;
    changes: Record<string, unknown>;
    created_at: string;
}

export default function RecipeExportPage({
    params,
}: {
    params: Promise<{ id: string }>;
}) {
    const { id } = use(params);
    const router = useRouter();
    const [loading, setLoading] = useState(true);
    const [data, setData] = useState<RecipeData | null>(null);
    const [auditLog, setAuditLog] = useState<AuditLogEntry[]>([]);
    const [exportFormat, setExportFormat] = useState<'percentage' | 'range'>('percentage');

    const fetchData = useCallback(async () => {
        try {
            // Fetch recipe data
            const [recipeRes, auditRes] = await Promise.all([
                fetch(`/api/recipes/${id}/calculate`),
                fetch(`/api/recipes/${id}/audit`),
            ]);

            if (recipeRes.ok) {
                const recipeData = await recipeRes.json();
                // Fetch full recipe with ingredients
                const fullRecipeRes = await fetch(`/api/recipes/${id}`);
                if (fullRecipeRes.ok) {
                    const fullRecipe = await fullRecipeRes.json();
                    setData({
                        ...recipeData,
                        ingredients: fullRecipe.recipe_ingredients || [],
                    });
                }
            }

            if (auditRes.ok) {
                const auditData = await auditRes.json();
                setAuditLog(auditData);
            }
        } catch (error) {
            console.error('Error:', error);
            toast.error('Failed to load recipe data');
        } finally {
            setLoading(false);
        }
    }, [id]);

    useEffect(() => {
        fetchData();
    }, [fetchData]);

    const handleExportFormula = (format: 'percentage' | 'range') => {
        if (!data) return;

        const csv = formatFormulaAsCsv(data.ingredients, format, data.recipe.recipe_yield_g);
        const blob = new Blob([csv], { type: 'text/csv' });
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = `${data.recipe.name}_formula_${format}.csv`;
        a.click();
        URL.revokeObjectURL(url);
        toast.success(`Formula exported as ${format} format`);
    };

    const handleExportAuditTrail = () => {
        if (!data || !auditLog.length) {
            toast.error('No audit trail available');
            return;
        }

        const lines = [
            `AUDIT TRAIL - ${data.recipe.name}`,
            `Generated: ${new Date().toISOString()}`,
            '',
            'Date,User,Action,Changes',
            ...auditLog.map(log => {
                const date = new Date(log.created_at).toLocaleString();
                const changes = JSON.stringify(log.changes);
                return `"${date}","${log.user_name || 'Unknown'}","${log.action}","${changes.replace(/"/g, '""')}"`;
            }),
        ];

        const csv = lines.join('\n');
        const blob = new Blob([csv], { type: 'text/csv' });
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = `${data.recipe.name}_audit_trail.csv`;
        a.click();
        URL.revokeObjectURL(url);
        toast.success('Audit trail exported');
    };

    if (loading) {
        return (
            <div className="flex justify-center py-20">
                <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-emerald-500" />
            </div>
        );
    }

    if (!data) {
        return (
            <div className="text-center py-20">
                <p className="text-slate-400">Recipe not found</p>
                <Button asChild className="mt-4" variant="outline">
                    <a href="/recipes">Back to Recipes</a>
                </Button>
            </div>
        );
    }

    const servingSize = data.recipe.serving_size_description || `${data.recipe.serving_size_g}g`;
    const formulaData = exportFormat === 'percentage'
        ? calculateFormulaPercentages(data.ingredients, data.recipe.recipe_yield_g)
        : calculateRangeFormula(data.ingredients, data.recipe.recipe_yield_g);

    return (
        <div className="space-y-6">
            <div className="flex justify-between items-start">
                <div>
                    <h1 className="text-3xl font-bold text-white">Export: {data.recipe.name}</h1>
                    <p className="text-slate-400 mt-1">Export labels, formulas, and audit trail</p>
                </div>
                <Button variant="outline" onClick={() => router.back()} className="border-slate-600">
                    Back
                </Button>
            </div>

            {/* Formula Export Section */}
            <Card className="bg-slate-800/50 border-slate-700">
                <CardHeader>
                    <CardTitle className="text-white flex items-center gap-2">
                        Formula Export
                        <Badge className="bg-blue-600">CSV</Badge>
                    </CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                    {/* Format Toggle */}
                    <div className="flex gap-2">
                        <Button
                            variant={exportFormat === 'percentage' ? 'default' : 'outline'}
                            size="sm"
                            onClick={() => setExportFormat('percentage')}
                            className={exportFormat === 'percentage' ? 'bg-emerald-600' : 'border-slate-600'}
                        >
                            Formula %
                        </Button>
                        <Button
                            variant={exportFormat === 'range' ? 'default' : 'outline'}
                            size="sm"
                            onClick={() => setExportFormat('range')}
                            className={exportFormat === 'range' ? 'bg-purple-600' : 'border-slate-600'}
                        >
                            Range Formula
                        </Button>
                    </div>

                    {/* Formula Preview */}
                    <div className="bg-slate-900/50 rounded-lg p-4 max-h-60 overflow-y-auto">
                        <table className="w-full text-sm">
                            <thead>
                                <tr className="text-slate-500 border-b border-slate-700">
                                    <th className="text-left py-2">Ingredient</th>
                                    <th className="text-left py-2">Code</th>
                                    <th className="text-right py-2">Amount</th>
                                    <th className="text-right py-2">
                                        {exportFormat === 'percentage' ? 'Percentage' : 'Range'}
                                    </th>
                                </tr>
                            </thead>
                            <tbody>
                                {formulaData.map((item, i) => (
                                    <tr key={i} className="border-b border-slate-800">
                                        <td className="py-2 text-white">{item.name}</td>
                                        <td className="py-2 text-emerald-400 font-mono text-xs">
                                            {item.code || '—'}
                                        </td>
                                        <td className="py-2 text-slate-400 text-right">{item.amount_g}g</td>
                                        <td className="py-2 text-white text-right font-medium">
                                            {'range' in item ? (item as { range: string }).range : `${item.percentage.toFixed(2)}%`}
                                        </td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    </div>

                    <Button
                        onClick={() => handleExportFormula(exportFormat)}
                        className="bg-gradient-to-r from-blue-500 to-purple-600"
                    >
                        Download {exportFormat === 'percentage' ? 'Formula %' : 'Range Formula'} CSV
                    </Button>
                </CardContent>
            </Card>

            {/* Audit Trail Export */}
            <Card className="bg-slate-800/50 border-slate-700">
                <CardHeader>
                    <CardTitle className="text-white flex items-center gap-2">
                        Audit Trail
                        <Badge className="bg-amber-600">{auditLog.length} entries</Badge>
                    </CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                    {auditLog.length > 0 ? (
                        <>
                            <div className="bg-slate-900/50 rounded-lg p-4 max-h-48 overflow-y-auto">
                                <table className="w-full text-sm">
                                    <thead>
                                        <tr className="text-slate-500 border-b border-slate-700">
                                            <th className="text-left py-2">Date</th>
                                            <th className="text-left py-2">User</th>
                                            <th className="text-left py-2">Action</th>
                                        </tr>
                                    </thead>
                                    <tbody>
                                        {auditLog.map((log) => (
                                            <tr key={log.id} className="border-b border-slate-800">
                                                <td className="py-2 text-slate-400">
                                                    {new Date(log.created_at).toLocaleDateString()}
                                                </td>
                                                <td className="py-2 text-white">{log.user_name || 'Unknown'}</td>
                                                <td className="py-2">
                                                    <Badge className={
                                                        log.action === 'create' ? 'bg-emerald-600' :
                                                            log.action === 'update' ? 'bg-blue-600' :
                                                                'bg-red-600'
                                                    }>
                                                        {log.action}
                                                    </Badge>
                                                </td>
                                            </tr>
                                        ))}
                                    </tbody>
                                </table>
                            </div>
                            <Button onClick={handleExportAuditTrail} className="bg-amber-600 hover:bg-amber-700">
                                Download Audit Trail CSV
                            </Button>
                        </>
                    ) : (
                        <p className="text-slate-400 text-sm">No audit trail entries yet.</p>
                    )}
                </CardContent>
            </Card>

            {/* Label Editor */}
            <div className="space-y-4">
                <h2 className="text-xl font-bold text-white">Label Editor</h2>
                <LabelEditor
                    recipeName={data.recipe.name}
                    servingsPerContainer={data.recipe.servings_per_container || undefined}
                    servingSize={servingSize}
                    nutrition={data.nutrition.rounded}
                    rawNutrition={data.nutrition.raw}
                    ingredientStatement={data.ingredientStatement}
                    allergenStatement={data.allergenStatement}
                    onSave={(labelData) => {
                        console.log('Label settings saved:', labelData);
                        toast.success('Label settings saved');
                    }}
                />
            </div>
        </div>
    );
}
