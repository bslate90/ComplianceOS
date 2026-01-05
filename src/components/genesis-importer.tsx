'use client';

import { useState, useCallback } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { toast } from 'sonner';

interface ImportResult {
    success: boolean;
    ingredients: {
        total: number;
        imported: number;
        skipped: number;
        errors: string[];
    };
    recipes: {
        total: number;
        imported: number;
        skipped: number;
        errors: string[];
    };
    warnings: string[];
}

export default function GenesisImporter() {
    const [file, setFile] = useState<File | null>(null);
    const [mergeMode, setMergeMode] = useState<'skip' | 'update'>('skip');
    const [importing, setImporting] = useState(false);
    const [result, setResult] = useState<ImportResult | null>(null);
    const [showInstructions, setShowInstructions] = useState(false);

    const handleFileChange = useCallback((event: React.ChangeEvent<HTMLInputElement>) => {
        const selectedFile = event.target.files?.[0];
        if (selectedFile) {
            setFile(selectedFile);
            setResult(null);
        }
    }, []);

    const handleDrop = useCallback((event: React.DragEvent<HTMLDivElement>) => {
        event.preventDefault();
        const droppedFile = event.dataTransfer.files[0];
        if (droppedFile) {
            setFile(droppedFile);
            setResult(null);
        }
    }, []);

    const handleDragOver = useCallback((event: React.DragEvent<HTMLDivElement>) => {
        event.preventDefault();
    }, []);

    const handleImport = async () => {
        if (!file) return;

        setImporting(true);
        setResult(null);

        try {
            const formData = new FormData();
            formData.append('file', file);
            formData.append('mergeMode', mergeMode);

            const response = await fetch('/api/import/genesis', {
                method: 'POST',
                body: formData,
            });

            const data = await response.json();

            if (!response.ok) {
                if (data.instructions) {
                    setShowInstructions(true);
                }
                toast.error(data.error || 'Import failed');
                return;
            }

            setResult(data);

            const totalImported = data.ingredients.imported + data.recipes.imported;
            if (totalImported > 0) {
                toast.success(`Successfully imported ${totalImported} items!`);
            } else if (data.ingredients.skipped + data.recipes.skipped > 0) {
                toast.info('All items already exist in your database');
            }

        } catch (error) {
            console.error('Import error:', error);
            toast.error('Failed to import file');
        } finally {
            setImporting(false);
        }
    };

    return (
        <div className="space-y-6">
            {/* Genesis Branding */}
            <Card className="border shadow-card overflow-hidden">
                <div className="h-1 bg-gradient-to-r from-orange-500 via-red-500 to-pink-500"></div>
                <CardHeader className="pb-4">
                    <div className="flex items-center gap-4">
                        <div className="w-14 h-14 rounded-xl bg-gradient-to-br from-orange-500 to-red-600 flex items-center justify-center shadow-lg shadow-orange-500/20">
                            <svg className="w-8 h-8 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-8l-4-4m0 0L8 8m4-4v12" />
                            </svg>
                        </div>
                        <div>
                            <CardTitle className="text-lg font-semibold">
                                Genesis R&D Classic Import
                            </CardTitle>
                            <CardDescription>
                                Migrate your ingredients and recipes from Genesis R&D Classic
                            </CardDescription>
                        </div>
                    </div>
                </CardHeader>
                <CardContent className="space-y-6">
                    {/* File Upload Area */}
                    <div
                        onDrop={handleDrop}
                        onDragOver={handleDragOver}
                        className={`border-2 border-dashed rounded-lg p-8 text-center transition-colors ${file ? 'border-primary bg-primary/5' : 'border-border hover:border-primary/50 hover:bg-muted/50'
                            }`}
                    >
                        {file ? (
                            <div className="space-y-3">
                                <div className="w-16 h-16 mx-auto rounded-xl bg-primary/10 flex items-center justify-center">
                                    <svg className="w-8 h-8 text-primary" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
                                    </svg>
                                </div>
                                <div>
                                    <p className="text-sm font-medium text-foreground">{file.name}</p>
                                    <p className="text-xs text-muted-foreground">
                                        {(file.size / 1024).toFixed(1)} KB
                                    </p>
                                </div>
                                <Button
                                    variant="ghost"
                                    size="sm"
                                    onClick={() => { setFile(null); setResult(null); }}
                                >
                                    Remove
                                </Button>
                            </div>
                        ) : (
                            <>
                                <svg className="w-12 h-12 mx-auto text-muted-foreground mb-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 16a4 4 0 01-.88-7.903A5 5 0 1115.9 6L16 6a5 5 0 011 9.9M15 13l-3-3m0 0l-3 3m3-3v12" />
                                </svg>
                                <p className="text-sm font-medium mb-1">Drop your Genesis export file here</p>
                                <p className="text-xs text-muted-foreground mb-4">
                                    Supports .txt (tab-delimited), .csv, and .exl files
                                </p>
                                <label htmlFor="genesis-file">
                                    <input
                                        id="genesis-file"
                                        type="file"
                                        accept=".txt,.csv,.exl,.exlx"
                                        onChange={handleFileChange}
                                        className="hidden"
                                    />
                                    <Button variant="outline" asChild>
                                        <span className="cursor-pointer">Select File</span>
                                    </Button>
                                </label>
                            </>
                        )}
                    </div>

                    {/* Import Options */}
                    {file && (
                        <div className="space-y-4">
                            <div className="flex items-center justify-between p-4 rounded-lg bg-muted/30 border border-border/50">
                                <div>
                                    <div className="text-sm font-medium">Duplicate Handling</div>
                                    <div className="text-xs text-muted-foreground">
                                        What to do when an item already exists
                                    </div>
                                </div>
                                <Select value={mergeMode} onValueChange={(v) => setMergeMode(v as 'skip' | 'update')}>
                                    <SelectTrigger className="w-40">
                                        <SelectValue />
                                    </SelectTrigger>
                                    <SelectContent>
                                        <SelectItem value="skip">Skip duplicates</SelectItem>
                                        <SelectItem value="update">Update existing</SelectItem>
                                    </SelectContent>
                                </Select>
                            </div>

                            <Button
                                onClick={handleImport}
                                disabled={importing}
                                className="w-full bg-gradient-to-r from-orange-500 to-red-600 hover:from-orange-600 hover:to-red-700"
                            >
                                {importing ? (
                                    <span className="flex items-center gap-2">
                                        <svg className="animate-spin h-4 w-4" viewBox="0 0 24 24">
                                            <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" fill="none" />
                                            <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" />
                                        </svg>
                                        Importing...
                                    </span>
                                ) : (
                                    <span className="flex items-center gap-2">
                                        <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-8l-4-4m0 0L8 8m4-4v12" />
                                        </svg>
                                        Import from Genesis
                                    </span>
                                )}
                            </Button>
                        </div>
                    )}

                    {/* Results */}
                    {result && (
                        <div className="space-y-4">
                            <div className="grid grid-cols-2 gap-4">
                                <div className={`p-4 rounded-lg border ${result.ingredients.imported > 0 ? 'bg-green-500/10 border-green-500/20' : 'bg-muted/30 border-border/50'
                                    }`}>
                                    <div className="text-2xl font-bold text-foreground">
                                        {result.ingredients.imported}
                                    </div>
                                    <div className="text-xs text-muted-foreground">
                                        Ingredients imported
                                    </div>
                                    {result.ingredients.skipped > 0 && (
                                        <div className="text-xs text-amber-500 mt-1">
                                            +{result.ingredients.skipped} skipped
                                        </div>
                                    )}
                                </div>
                                <div className={`p-4 rounded-lg border ${result.recipes.imported > 0 ? 'bg-green-500/10 border-green-500/20' : 'bg-muted/30 border-border/50'
                                    }`}>
                                    <div className="text-2xl font-bold text-foreground">
                                        {result.recipes.imported}
                                    </div>
                                    <div className="text-xs text-muted-foreground">
                                        Recipes imported
                                    </div>
                                    {result.recipes.skipped > 0 && (
                                        <div className="text-xs text-amber-500 mt-1">
                                            +{result.recipes.skipped} skipped
                                        </div>
                                    )}
                                </div>
                            </div>

                            {/* Warnings */}
                            {result.warnings.length > 0 && (
                                <div className="p-3 rounded-lg bg-amber-500/10 border border-amber-500/20">
                                    <div className="flex gap-2">
                                        <svg className="w-5 h-5 text-amber-500 shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
                                        </svg>
                                        <div className="text-sm text-amber-500">
                                            {result.warnings.map((warning, i) => (
                                                <p key={i}>{warning}</p>
                                            ))}
                                        </div>
                                    </div>
                                </div>
                            )}

                            {/* Errors */}
                            {(result.ingredients.errors.length > 0 || result.recipes.errors.length > 0) && (
                                <div className="p-3 rounded-lg bg-red-500/10 border border-red-500/20 max-h-40 overflow-y-auto">
                                    <div className="flex gap-2">
                                        <svg className="w-5 h-5 text-red-500 shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 14l2-2m0 0l2-2m-2 2l-2-2m2 2l2 2m7-2a9 9 0 11-18 0 9 9 0 0118 0z" />
                                        </svg>
                                        <div className="text-xs text-red-400 space-y-1">
                                            {[...result.ingredients.errors, ...result.recipes.errors].slice(0, 10).map((error, i) => (
                                                <p key={i}>{error}</p>
                                            ))}
                                            {(result.ingredients.errors.length + result.recipes.errors.length) > 10 && (
                                                <p className="text-muted-foreground">
                                                    +{(result.ingredients.errors.length + result.recipes.errors.length) - 10} more errors
                                                </p>
                                            )}
                                        </div>
                                    </div>
                                </div>
                            )}
                        </div>
                    )}
                </CardContent>
            </Card>

            {/* Export Instructions */}
            <Card className="border shadow-card">
                <CardHeader className="pb-3 cursor-pointer" onClick={() => setShowInstructions(!showInstructions)}>
                    <div className="flex items-center justify-between">
                        <CardTitle className="text-sm font-medium flex items-center gap-2">
                            <svg className="w-4 h-4 text-muted-foreground" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                            </svg>
                            How to Export from Genesis R&D Classic
                        </CardTitle>
                        <svg className={`w-4 h-4 text-muted-foreground transition-transform ${showInstructions ? 'rotate-180' : ''}`} fill="none" viewBox="0 0 24 24" stroke="currentColor">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                        </svg>
                    </div>
                </CardHeader>
                {showInstructions && (
                    <CardContent className="pt-0">
                        <div className="space-y-4 text-sm">
                            <div className="space-y-2">
                                <h4 className="font-medium text-foreground flex items-center gap-2">
                                    <span className="w-6 h-6 rounded-full bg-primary/10 text-primary flex items-center justify-center text-xs font-bold">1</span>
                                    Export as Tab-Delimited (Recommended)
                                </h4>
                                <div className="pl-8 text-muted-foreground space-y-1">
                                    <p>• Open Genesis R&D Classic</p>
                                    <p>• Go to <strong>Reports</strong> → <strong>Multi-Column Report</strong></p>
                                    <p>• Select the items you want to export</p>
                                    <p>• Click <strong>Print</strong> → <strong>To File</strong></p>
                                    <p>• Choose <strong>Tab-delimited</strong> format</p>
                                    <p>• Save and upload the file here</p>
                                </div>
                            </div>

                            <div className="space-y-2">
                                <h4 className="font-medium text-foreground flex items-center gap-2">
                                    <span className="w-6 h-6 rounded-full bg-primary/10 text-primary flex items-center justify-center text-xs font-bold">2</span>
                                    Bulk Export All Data
                                </h4>
                                <div className="pl-8 text-muted-foreground space-y-1">
                                    <p>• Go to <strong>File</strong> → <strong>Export</strong> → <strong>Export All</strong></p>
                                    <p>• Under &quot;Type&quot;, select <strong>Ingredients</strong> or <strong>Recipes</strong></p>
                                    <p>• Click <strong>Export</strong></p>
                                </div>
                            </div>

                            <div className="p-3 rounded-lg bg-blue-500/10 border border-blue-500/20">
                                <div className="flex gap-2">
                                    <svg className="w-5 h-5 text-blue-500 shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                                    </svg>
                                    <div className="text-xs text-blue-400">
                                        <strong>Tip:</strong> Tab-delimited text files (.txt) work best.
                                        Binary .EXL files have limited support - export as text for best results.
                                    </div>
                                </div>
                            </div>
                        </div>
                    </CardContent>
                )}
            </Card>

            {/* Supported Data */}
            <Card className="border shadow-card">
                <CardHeader className="pb-3">
                    <CardTitle className="text-sm font-medium">What Gets Imported</CardTitle>
                </CardHeader>
                <CardContent className="pt-0">
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        <div className="p-3 rounded-lg bg-muted/30 border border-border/50">
                            <div className="flex items-center gap-2 mb-2">
                                <div className="w-8 h-8 rounded-lg bg-green-500/10 flex items-center justify-center">
                                    <svg className="w-4 h-4 text-green-500" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                                    </svg>
                                </div>
                                <span className="font-medium text-sm">Ingredients</span>
                            </div>
                            <ul className="text-xs text-muted-foreground space-y-1 pl-10">
                                <li>• Name & brand</li>
                                <li>• All nutrition facts</li>
                                <li>• Serving size</li>
                                <li>• Allergen flags</li>
                                <li>• User codes</li>
                            </ul>
                        </div>
                        <div className="p-3 rounded-lg bg-muted/30 border border-border/50">
                            <div className="flex items-center gap-2 mb-2">
                                <div className="w-8 h-8 rounded-lg bg-green-500/10 flex items-center justify-center">
                                    <svg className="w-4 h-4 text-green-500" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                                    </svg>
                                </div>
                                <span className="font-medium text-sm">Recipes</span>
                            </div>
                            <ul className="text-xs text-muted-foreground space-y-1 pl-10">
                                <li>• Name & description</li>
                                <li>• Yield & serving size</li>
                                <li>• Calculated nutrition</li>
                                <li>• Status as draft</li>
                            </ul>
                        </div>
                    </div>
                </CardContent>
            </Card>
        </div>
    );
}
