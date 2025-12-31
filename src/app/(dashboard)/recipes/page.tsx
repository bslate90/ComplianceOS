'use client';

import { useState, useEffect } from 'react';
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
import { toast } from 'sonner';
import type { Tables } from '@/lib/database.types';

type Recipe = Tables<'recipes'>;

export default function RecipesPage() {
    const [recipes, setRecipes] = useState<Recipe[]>([]);
    const [loading, setLoading] = useState(true);
    const [search, setSearch] = useState('');
    const [deleting, setDeleting] = useState<string | null>(null);
    const [exporting, setExporting] = useState<string | null>(null);

    useEffect(() => {
        fetchRecipes();
    }, []);

    const fetchRecipes = async () => {
        try {
            const response = await fetch('/api/recipes');
            if (!response.ok) throw new Error('Failed to fetch');
            const data = await response.json();
            setRecipes(data);
        } catch (error) {
            console.error('Error:', error);
            toast.error('Failed to load recipes');
        } finally {
            setLoading(false);
        }
    };

    const handleDelete = async (id: string) => {
        if (!confirm('Are you sure you want to delete this recipe?')) return;

        setDeleting(id);
        try {
            const response = await fetch(`/api/recipes?id=${id}`, { method: 'DELETE' });
            if (!response.ok) throw new Error('Failed to delete');

            setRecipes(prev => prev.filter(r => r.id !== id));
            toast.success('Recipe deleted');
        } catch (error) {
            console.error('Error:', error);
            toast.error('Failed to delete recipe');
        } finally {
            setDeleting(null);
        }
    };

    const handleExport100g = async (id: string, format: 'json' | 'csv' = 'csv') => {
        setExporting(id);
        try {
            const response = await fetch(`/api/recipes/${id}/export-100g`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ format }),
            });

            if (!response.ok) {
                const error = await response.json();
                throw new Error(error.error || 'Failed to export');
            }

            if (format === 'csv') {
                const blob = await response.blob();
                const url = URL.createObjectURL(blob);
                const a = document.createElement('a');
                a.href = url;
                a.download = `recipe-${id}-100g-nutrition.csv`;
                document.body.appendChild(a);
                a.click();
                document.body.removeChild(a);
                URL.revokeObjectURL(url);
                toast.success('100g nutrition report exported');
            } else {
                const data = await response.json();
                console.log('100g nutrition data:', data);
                toast.success('100g nutrition data retrieved');
            }
        } catch (error) {
            console.error('Error:', error);
            toast.error(error instanceof Error ? error.message : 'Failed to export');
        } finally {
            setExporting(null);
        }
    };

    const filteredRecipes = recipes.filter(r =>
        r.name.toLowerCase().includes(search.toLowerCase())
    );

    const getStatusBadge = (status: string) => {
        switch (status) {
            case 'published':
                return <Badge className="bg-emerald-500">Published</Badge>;
            case 'archived':
                return <Badge variant="outline" className="text-slate-400">Archived</Badge>;
            default:
                return <Badge variant="outline" className="text-yellow-400 border-yellow-500/30">Draft</Badge>;
        }
    };

    return (
        <div className="space-y-6">
            {/* Header */}
            <div className="flex flex-col sm:flex-row justify-between gap-4">
                <div>
                    <h1 className="text-3xl font-bold text-white">Recipes</h1>
                    <p className="text-slate-400 mt-1">Build formulations and calculate nutrition per serving</p>
                </div>
                <Button asChild className="bg-gradient-to-r from-emerald-500 to-teal-600 hover:from-emerald-600 hover:to-teal-700 self-start">
                    <Link href="/recipes/new">
                        <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4 mr-2" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
                        </svg>
                        Create Recipe
                    </Link>
                </Button>
            </div>

            {/* Search */}
            <Card className="bg-slate-800/50 border-slate-700">
                <CardContent className="pt-6">
                    <Input
                        placeholder="Search recipes..."
                        value={search}
                        onChange={(e) => setSearch(e.target.value)}
                        className="bg-slate-700/50 border-slate-600 text-white max-w-md"
                    />
                </CardContent>
            </Card>

            {/* Table */}
            <Card className="bg-slate-800/50 border-slate-700">
                <CardHeader>
                    <CardTitle className="text-white">
                        {filteredRecipes.length} Recipe{filteredRecipes.length !== 1 ? 's' : ''}
                    </CardTitle>
                </CardHeader>
                <CardContent>
                    {loading ? (
                        <div className="flex justify-center py-8">
                            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-emerald-500" />
                        </div>
                    ) : filteredRecipes.length === 0 ? (
                        <div className="text-center py-12">
                            <svg xmlns="http://www.w3.org/2000/svg" className="h-12 w-12 mx-auto text-slate-600 mb-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 6.253v13m0-13C10.832 5.477 9.246 5 7.5 5S4.168 5.477 3 6.253v13C4.168 18.477 5.754 18 7.5 18s3.332.477 4.5 1.253m0-13C13.168 5.477 14.754 5 16.5 5c1.747 0 3.332.477 4.5 1.253v13C19.832 18.477 18.247 18 16.5 18c-1.746 0-3.332.477-4.5 1.253" />
                            </svg>
                            <p className="text-slate-400">No recipes found</p>
                            <Button asChild className="mt-4" variant="outline">
                                <Link href="/recipes/new">Create your first recipe</Link>
                            </Button>
                        </div>
                    ) : (
                        <div className="overflow-x-auto">
                            <Table>
                                <TableHeader>
                                    <TableRow className="border-slate-700">
                                        <TableHead className="text-slate-400">Name</TableHead>
                                        <TableHead className="text-slate-400">Yield</TableHead>
                                        <TableHead className="text-slate-400">Serving Size</TableHead>
                                        <TableHead className="text-slate-400">Status</TableHead>
                                        <TableHead className="text-slate-400 text-right">Actions</TableHead>
                                    </TableRow>
                                </TableHeader>
                                <TableBody>
                                    {filteredRecipes.map((recipe) => (
                                        <TableRow key={recipe.id} className="border-slate-700 hover:bg-slate-700/50">
                                            <TableCell>
                                                <div>
                                                    <Link href={`/recipes/${recipe.id}`} className="text-white font-medium hover:text-emerald-400">
                                                        {recipe.name}
                                                    </Link>
                                                    {recipe.description && (
                                                        <p className="text-sm text-slate-400 truncate max-w-xs">{recipe.description}</p>
                                                    )}
                                                </div>
                                            </TableCell>
                                            <TableCell className="text-slate-300">{recipe.recipe_yield_g}g</TableCell>
                                            <TableCell className="text-slate-300">
                                                {recipe.serving_size_description || `${recipe.serving_size_g}g`}
                                            </TableCell>
                                            <TableCell>{getStatusBadge(recipe.status)}</TableCell>
                                            <TableCell className="text-right">
                                                <div className="flex justify-end gap-2">
                                                    <Button
                                                        asChild
                                                        size="sm"
                                                        variant="ghost"
                                                        className="text-slate-400 hover:text-white hover:bg-slate-700"
                                                    >
                                                        <Link href={`/recipes/${recipe.id}`}>Edit</Link>
                                                    </Button>
                                                    <Button
                                                        size="sm"
                                                        variant="ghost"
                                                        onClick={() => handleExport100g(recipe.id, 'csv')}
                                                        disabled={exporting === recipe.id}
                                                        className="text-blue-400 hover:text-blue-300 hover:bg-blue-900/20"
                                                        title="Export 100g nutrition report"
                                                    >
                                                        {exporting === recipe.id ? '...' : '100g'}
                                                    </Button>
                                                    <Button
                                                        asChild
                                                        size="sm"
                                                        variant="ghost"
                                                        className="text-emerald-400 hover:text-emerald-300 hover:bg-emerald-900/20"
                                                    >
                                                        <Link href={`/labels/generate?recipe=${recipe.id}`}>Generate Label</Link>
                                                    </Button>
                                                    <Button
                                                        size="sm"
                                                        variant="ghost"
                                                        onClick={() => handleDelete(recipe.id)}
                                                        disabled={deleting === recipe.id}
                                                        className="text-red-400 hover:text-red-300 hover:bg-red-900/20"
                                                    >
                                                        {deleting === recipe.id ? '...' : 'Delete'}
                                                    </Button>
                                                </div>
                                            </TableCell>
                                        </TableRow>
                                    ))}
                                </TableBody>
                            </Table>
                        </div>
                    )}
                </CardContent>
            </Card>
        </div>
    );
}
