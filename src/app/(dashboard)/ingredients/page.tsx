'use client';

import { useState, useEffect, useMemo } from 'react';
import Link from 'next/link';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import {
    Table,
    TableBody,
    TableCell,
    TableHead,
    TableHeader,
    TableRow,
} from '@/components/ui/table';
import { getPresentAllergens } from '@/lib/constants/allergens';
import { toast } from 'sonner';
import type { Tables } from '@/lib/database.types';
import {
    Dialog,
    DialogContent,
    DialogDescription,
    DialogHeader,
    DialogTitle,
} from '@/components/ui/dialog';
import { Upload, FileText, ArrowUpDown, ArrowUp, ArrowDown } from 'lucide-react';

type Ingredient = Tables<'ingredients'>;
type SortField = 'name' | 'user_code' | 'serving_size_g' | 'calories' | 'created_at';
type SortDirection = 'asc' | 'desc';

export default function IngredientsPage() {
    const [ingredients, setIngredients] = useState<Ingredient[]>([]);
    const [loading, setLoading] = useState(true);
    const [search, setSearch] = useState('');
    const [deleting, setDeleting] = useState<string | null>(null);
    const [uploadModalOpen, setUploadModalOpen] = useState(false);
    const [uploading, setUploading] = useState(false);
    const [selectedFile, setSelectedFile] = useState<File | null>(null);
    const [supplierName, setSupplierName] = useState('');
    const [sortField, setSortField] = useState<SortField>('name');
    const [sortDirection, setSortDirection] = useState<SortDirection>('asc');

    useEffect(() => {
        fetchIngredients();
    }, []);

    const fetchIngredients = async () => {
        try {
            const response = await fetch('/api/ingredients');
            if (!response.ok) throw new Error('Failed to fetch');
            const data = await response.json();
            setIngredients(data);
        } catch (error) {
            console.error('Error:', error);
            toast.error('Failed to load ingredients');
        } finally {
            setLoading(false);
        }
    };

    const handleDelete = async (id: string) => {
        if (!confirm('Are you sure you want to delete this ingredient?')) return;

        setDeleting(id);
        try {
            const response = await fetch(`/api/ingredients?id=${id}`, { method: 'DELETE' });
            if (!response.ok) throw new Error('Failed to delete');

            setIngredients(prev => prev.filter(i => i.id !== id));
            toast.success('Ingredient deleted');
        } catch (error) {
            console.error('Error:', error);
            toast.error('Failed to delete ingredient');
        } finally {
            setDeleting(null);
        }
    };

    // Handle sorting
    const handleSort = (field: SortField) => {
        if (sortField === field) {
            setSortDirection(prev => prev === 'asc' ? 'desc' : 'asc');
        } else {
            setSortField(field);
            setSortDirection('asc');
        }
    };

    // Get sort icon
    const getSortIcon = (field: SortField) => {
        if (sortField !== field) {
            return <ArrowUpDown className="h-3 w-3 ml-1 opacity-50" />;
        }
        return sortDirection === 'asc'
            ? <ArrowUp className="h-3 w-3 ml-1" />
            : <ArrowDown className="h-3 w-3 ml-1" />;
    };

    // Filter and sort ingredients
    const filteredAndSortedIngredients = useMemo(() => {
        let result = ingredients.filter(i =>
            i.name.toLowerCase().includes(search.toLowerCase()) ||
            i.brand?.toLowerCase().includes(search.toLowerCase()) ||
            (i.user_code && i.user_code.toLowerCase().includes(search.toLowerCase()))
        );

        // Sort
        result.sort((a, b) => {
            let aVal: string | number | null = null;
            let bVal: string | number | null = null;

            switch (sortField) {
                case 'name':
                    aVal = a.name.toLowerCase();
                    bVal = b.name.toLowerCase();
                    break;
                case 'user_code':
                    aVal = a.user_code?.toLowerCase() || '';
                    bVal = b.user_code?.toLowerCase() || '';
                    break;
                case 'serving_size_g':
                    aVal = a.serving_size_g ?? 0;
                    bVal = b.serving_size_g ?? 0;
                    break;
                case 'calories':
                    aVal = a.calories ?? 0;
                    bVal = b.calories ?? 0;
                    break;
                case 'created_at':
                    aVal = a.created_at || '';
                    bVal = b.created_at || '';
                    break;
            }

            if (aVal === null || bVal === null) return 0;
            if (aVal < bVal) return sortDirection === 'asc' ? -1 : 1;
            if (aVal > bVal) return sortDirection === 'asc' ? 1 : -1;
            return 0;
        });

        return result;
    }, [ingredients, search, sortField, sortDirection]);

    const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
        const file = e.target.files?.[0];
        if (file) {
            // Check file type
            const validTypes = ['application/pdf', 'application/msword', 'application/vnd.openxmlformats-officedocument.wordprocessingml.document'];
            if (!validTypes.includes(file.type)) {
                toast.error('Please upload a PDF or Word document');
                return;
            }
            setSelectedFile(file);
        }
    };

    const handleUploadSpec = async () => {
        if (!selectedFile) {
            toast.error('Please select a file');
            return;
        }

        setUploading(true);
        try {
            const formData = new FormData();
            formData.append('file', selectedFile);
            if (supplierName.trim()) {
                formData.append('supplier_name', supplierName.trim());
            }

            const response = await fetch('/api/ingredients/upload-spec', {
                method: 'POST',
                body: formData,
            });

            if (!response.ok) {
                const error = await response.json();
                throw new Error(error.error || 'Failed to process spec');
            }

            const result = await response.json();

            // Show success message with supplier info if created
            if (result.supplier) {
                toast.success(`Created supplier "${result.supplier.name}" and ingredient "${result.ingredient.name}"!`);
            } else {
                toast.success(`Ingredient "${result.ingredient.name}" created successfully!`);
            }

            // Refresh ingredients list
            await fetchIngredients();

            // Close modal and reset
            setUploadModalOpen(false);
            setSelectedFile(null);
            setSupplierName('');
        } catch (error) {
            console.error('Error:', error);
            toast.error(error instanceof Error ? error.message : 'Failed to upload spec');
        } finally {
            setUploading(false);
        }
    };

    return (
        <div className="space-y-5">
            {/* Header */}
            <div className="flex flex-col sm:flex-row justify-between gap-3">
                <div>
                    <h1 className="text-xl sm:text-2xl font-semibold text-foreground">Ingredients</h1>
                    <p className="text-sm text-muted-foreground mt-0.5">Manage your ingredient library with full nutritional data</p>
                </div>
                <div className="flex gap-2 self-start">
                    <Button
                        onClick={() => setUploadModalOpen(true)}
                        variant="outline"
                        size="sm"
                        className="border-blue-200 text-blue-700 hover:bg-blue-50"
                    >
                        <Upload className="h-4 w-4 mr-1.5" />
                        Upload Spec
                    </Button>
                    <Button asChild size="sm" className="icon-bg-teal text-white hover:opacity-90">
                        <Link href="/ingredients/new">
                            <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4 mr-1.5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
                            </svg>
                            Add Ingredient
                        </Link>
                    </Button>
                </div>
            </div>

            {/* Search */}
            <Card className="bg-white border-border shadow-card">
                <CardContent className="pt-4">
                    <Input
                        placeholder="Search ingredients..."
                        value={search}
                        onChange={(e) => setSearch(e.target.value)}
                        className="max-w-md"
                    />
                </CardContent>
            </Card>

            {/* Table */}
            <Card className="bg-white border-border shadow-card">
                <CardHeader>
                    <CardTitle className="text-foreground text-base">
                        {filteredAndSortedIngredients.length} Ingredient{filteredAndSortedIngredients.length !== 1 ? 's' : ''}
                    </CardTitle>
                </CardHeader>
                <CardContent>
                    {loading ? (
                        <div className="flex justify-center py-8">
                            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-emerald-500" />
                        </div>
                    ) : filteredAndSortedIngredients.length === 0 ? (
                        <div className="text-center py-12">
                            <svg xmlns="http://www.w3.org/2000/svg" className="h-12 w-12 mx-auto text-muted-foreground mb-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19.428 15.428a2 2 0 00-1.022-.547l-2.387-.477a6 6 0 00-3.86.517l-.318.158a6 6 0 01-3.86.517L6.05 15.21a2 2 0 00-1.806.547M8 4h8l-1 1v5.172a2 2 0 00.586 1.414l5 5c1.26 1.26.367 3.414-1.415 3.414H4.828c-1.782 0-2.674-2.154-1.414-3.414l5-5A2 2 0 009 10.172V5L8 4z" />
                            </svg>
                            <p className="text-muted-foreground">No ingredients found</p>
                            <Button asChild className="mt-4" variant="outline" size="sm">
                                <Link href="/ingredients/new">Add your first ingredient</Link>
                            </Button>
                        </div>
                    ) : (
                        <div className="overflow-x-auto">
                            <Table>
                                <TableHeader>
                                    <TableRow className="border-border">
                                        <TableHead
                                            className="text-muted-foreground text-sm cursor-pointer hover:text-foreground transition-colors"
                                            onClick={() => handleSort('name')}
                                        >
                                            <span className="flex items-center">Name{getSortIcon('name')}</span>
                                        </TableHead>
                                        <TableHead
                                            className="text-muted-foreground text-sm cursor-pointer hover:text-foreground transition-colors"
                                            onClick={() => handleSort('user_code')}
                                        >
                                            <span className="flex items-center">Code{getSortIcon('user_code')}</span>
                                        </TableHead>
                                        <TableHead
                                            className="text-muted-foreground text-sm cursor-pointer hover:text-foreground transition-colors"
                                            onClick={() => handleSort('serving_size_g')}
                                        >
                                            <span className="flex items-center">Serving{getSortIcon('serving_size_g')}</span>
                                        </TableHead>
                                        <TableHead
                                            className="text-muted-foreground text-sm cursor-pointer hover:text-foreground transition-colors"
                                            onClick={() => handleSort('calories')}
                                        >
                                            <span className="flex items-center">Cal{getSortIcon('calories')}</span>
                                        </TableHead>
                                        <TableHead className="text-muted-foreground text-sm">Allergens</TableHead>
                                        <TableHead className="text-muted-foreground text-sm">Source</TableHead>
                                        <TableHead className="text-muted-foreground text-sm text-right">Actions</TableHead>
                                    </TableRow>
                                </TableHeader>
                                <TableBody>
                                    {filteredAndSortedIngredients.map((ingredient) => {
                                        const allergens = getPresentAllergens(ingredient as unknown as Record<string, boolean>);
                                        return (
                                            <TableRow key={ingredient.id} className="border-border hover:bg-muted/50">
                                                <TableCell>
                                                    <div className="max-w-[200px] sm:max-w-[280px]">
                                                        <p className="text-foreground font-medium text-sm truncate">{ingredient.name}</p>
                                                        {ingredient.brand && (
                                                            <p className="text-xs text-muted-foreground truncate" title={ingredient.brand}>
                                                                {ingredient.brand}
                                                            </p>
                                                        )}
                                                    </div>
                                                </TableCell>
                                                <TableCell>
                                                    {ingredient.user_code ? (
                                                        <code className="text-xs font-mono bg-muted px-1.5 py-0.5 rounded text-foreground">
                                                            {ingredient.user_code}
                                                        </code>
                                                    ) : (
                                                        <span className="text-muted-foreground text-sm">—</span>
                                                    )}
                                                </TableCell>
                                                <TableCell className="text-foreground text-sm">{ingredient.serving_size_g}g</TableCell>
                                                <TableCell className="text-foreground text-sm">{ingredient.calories ?? '-'}</TableCell>
                                                <TableCell>
                                                    {allergens.length > 0 ? (
                                                        <div className="flex flex-wrap gap-1">
                                                            {allergens.slice(0, 3).map((a) => (
                                                                <Badge key={a} variant="outline" className="bg-amber-50 text-amber-700 border-amber-200 text-xs">
                                                                    {a}
                                                                </Badge>
                                                            ))}
                                                            {allergens.length > 3 && (
                                                                <Badge variant="outline" className="text-muted-foreground border-border text-xs">
                                                                    +{allergens.length - 3}
                                                                </Badge>
                                                            )}
                                                        </div>
                                                    ) : (
                                                        <span className="text-muted-foreground text-sm">None</span>
                                                    )}
                                                </TableCell>
                                                <TableCell>
                                                    {ingredient.usda_fdc_id ? (
                                                        <Badge variant="outline" className="text-blue-600 border-blue-200 bg-blue-50 text-xs">
                                                            USDA
                                                        </Badge>
                                                    ) : (
                                                        <Badge variant="outline" className="text-muted-foreground border-border text-xs">
                                                            Manual
                                                        </Badge>
                                                    )}
                                                </TableCell>
                                                <TableCell className="text-right">
                                                    <div className="flex justify-end gap-2">
                                                        <Button
                                                            asChild
                                                            size="sm"
                                                            variant="ghost"
                                                            className="text-slate-400 hover:text-white hover:bg-slate-700"
                                                        >
                                                            <Link href={`/ingredients/${ingredient.id}`}>Edit</Link>
                                                        </Button>
                                                        <Button
                                                            size="sm"
                                                            variant="ghost"
                                                            onClick={() => handleDelete(ingredient.id)}
                                                            disabled={deleting === ingredient.id}
                                                            className="text-red-400 hover:text-red-300 hover:bg-red-900/20"
                                                        >
                                                            {deleting === ingredient.id ? '...' : 'Delete'}
                                                        </Button>
                                                    </div>
                                                </TableCell>
                                            </TableRow>
                                        );
                                    })}
                                </TableBody>
                            </Table>
                        </div>
                    )}
                </CardContent>
            </Card>

            {/* Upload Spec Modal */}
            <Dialog open={uploadModalOpen} onOpenChange={setUploadModalOpen}>
                <DialogContent className="bg-slate-900 border-slate-700 sm:max-w-lg">
                    <DialogHeader>
                        <DialogTitle className="text-white flex items-center gap-2">
                            <Upload className="h-5 w-5 text-blue-400" />
                            Upload Ingredient Spec
                        </DialogTitle>
                        <DialogDescription className="text-slate-400">
                            Upload a spec sheet (PDF or Word) to automatically extract nutrition data and create a new ingredient.
                        </DialogDescription>
                    </DialogHeader>

                    <div className="space-y-4 py-4">
                        {/* File Upload */}
                        <div className="space-y-2">
                            <label className="text-sm font-medium text-slate-200">Spec Sheet File *</label>
                            <div className="relative">
                                <input
                                    type="file"
                                    accept=".pdf,.doc,.docx"
                                    onChange={handleFileSelect}
                                    className="absolute inset-0 w-full h-full opacity-0 cursor-pointer"
                                    disabled={uploading}
                                />
                                <div className={`flex items-center gap-3 p-4 border-2 border-dashed rounded-lg transition-colors ${selectedFile
                                    ? 'border-emerald-500/50 bg-emerald-500/10'
                                    : 'border-slate-600 hover:border-slate-500 hover:bg-slate-800/50'
                                    }`}>
                                    <FileText className={`h-8 w-8 ${selectedFile ? 'text-emerald-400' : 'text-slate-500'}`} />
                                    <div className="flex-1 min-w-0">
                                        {selectedFile ? (
                                            <>
                                                <p className="text-white font-medium truncate">{selectedFile.name}</p>
                                                <p className="text-sm text-slate-400">
                                                    {(selectedFile.size / 1024).toFixed(1)} KB
                                                </p>
                                            </>
                                        ) : (
                                            <>
                                                <p className="text-slate-300">Click or drag to upload</p>
                                                <p className="text-sm text-slate-500">PDF or Word document</p>
                                            </>
                                        )}
                                    </div>
                                    {selectedFile && (
                                        <Badge variant="outline" className="text-emerald-400 border-emerald-500/30">
                                            Ready
                                        </Badge>
                                    )}
                                </div>
                            </div>
                        </div>

                        {/* Supplier Name (Optional) */}
                        <div className="space-y-2">
                            <label className="text-sm font-medium text-slate-200">
                                Supplier Name
                                <span className="text-slate-500 font-normal ml-2">(optional - will auto-create)</span>
                            </label>
                            <Input
                                placeholder="e.g., Acme Foods Inc."
                                value={supplierName}
                                onChange={(e) => setSupplierName(e.target.value)}
                                className="bg-slate-700/50 border-slate-600 text-white"
                                disabled={uploading}
                            />
                            <p className="text-xs text-slate-500">
                                If provided, a new supplier will be created and linked to this ingredient.
                            </p>
                        </div>

                        {/* Upload Progress */}
                        {uploading && (
                            <div className="p-3 bg-slate-800/50 rounded-lg border border-slate-700">
                                <div className="flex items-center gap-3">
                                    <div className="animate-spin rounded-full h-5 w-5 border-b-2 border-blue-400" />
                                    <div className="flex-1">
                                        <p className="text-sm text-white">Processing spec sheet...</p>
                                        <p className="text-xs text-slate-400">Extracting nutrition data with OCR</p>
                                    </div>
                                </div>
                            </div>
                        )}
                    </div>

                    <div className="flex justify-end gap-3">
                        <Button
                            variant="outline"
                            onClick={() => {
                                setUploadModalOpen(false);
                                setSelectedFile(null);
                                setSupplierName('');
                            }}
                            disabled={uploading}
                            className="border-slate-600 text-slate-300"
                        >
                            Cancel
                        </Button>
                        <Button
                            onClick={handleUploadSpec}
                            disabled={!selectedFile || uploading}
                            className="bg-gradient-to-r from-blue-500 to-blue-600 hover:from-blue-600 hover:to-blue-700"
                        >
                            {uploading ? (
                                <>
                                    <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white mr-2" />
                                    Processing...
                                </>
                            ) : (
                                <>
                                    <Upload className="h-4 w-4 mr-2" />
                                    Upload & Parse
                                </>
                            )}
                        </Button>
                    </div>
                </DialogContent>
            </Dialog>
        </div>
    );
}
