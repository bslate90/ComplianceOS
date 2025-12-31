'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import { Button } from '@/components/ui/button';
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
import { ComplianceStatusBadge } from '@/components/compliance/ComplianceStatusBadge';

interface Label {
    id: string;
    name: string;
    format: string;
    recipe_id: string;
    recipe: { name: string } | null;
    compliance_status?: 'compliant' | 'warnings' | 'errors' | 'pending' | 'not_validated';
    validation_results?: any[];
    created_at: string;
}

export default function LabelsPage() {
    const [labels, setLabels] = useState<Label[]>([]);
    const [loading, setLoading] = useState(true);
    const [deleting, setDeleting] = useState<string | null>(null);

    useEffect(() => {
        fetchLabels();
    }, []);

    const fetchLabels = async () => {
        try {
            const response = await fetch('/api/labels');
            if (!response.ok) throw new Error('Failed to fetch');
            const data = await response.json();
            setLabels(data);
        } catch (error) {
            console.error('Error:', error);
            toast.error('Failed to load labels');
        } finally {
            setLoading(false);
        }
    };

    const handleDelete = async (id: string) => {
        if (!confirm('Are you sure you want to delete this label?')) return;

        setDeleting(id);
        try {
            const response = await fetch(`/api/labels?id=${id}`, { method: 'DELETE' });
            if (!response.ok) throw new Error('Failed to delete');

            setLabels(prev => prev.filter(l => l.id !== id));
            toast.success('Label deleted');
        } catch (error) {
            console.error('Error:', error);
            toast.error('Failed to delete label');
        } finally {
            setDeleting(null);
        }
    };

    const formatDate = (dateString: string) => {
        return new Date(dateString).toLocaleDateString('en-US', {
            year: 'numeric',
            month: 'short',
            day: 'numeric',
        });
    };

    return (
        <div className="space-y-6">
            {/* Header */}
            <div className="flex flex-col sm:flex-row justify-between gap-4">
                <div>
                    <h1 className="text-3xl font-bold text-white">Labels</h1>
                    <p className="text-slate-400 mt-1">View and manage generated nutrition labels</p>
                </div>
                <Button asChild className="bg-gradient-to-r from-purple-500 to-pink-600 hover:from-purple-600 hover:to-pink-700 self-start">
                    <Link href="/labels/generate">
                        <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4 mr-2" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
                        </svg>
                        Generate New Label
                    </Link>
                </Button>
            </div>

            {/* Table */}
            <Card className="bg-slate-800/50 border-slate-700">
                <CardHeader>
                    <CardTitle className="text-white">
                        {labels.length} Label{labels.length !== 1 ? 's' : ''}
                    </CardTitle>
                </CardHeader>
                <CardContent>
                    {loading ? (
                        <div className="flex justify-center py-8">
                            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-emerald-500" />
                        </div>
                    ) : labels.length === 0 ? (
                        <div className="text-center py-12">
                            <svg xmlns="http://www.w3.org/2000/svg" className="h-12 w-12 mx-auto text-slate-600 mb-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 7h.01M7 3h5c.512 0 1.024.195 1.414.586l7 7a2 2 0 010 2.828l-7 7a2 2 0 01-2.828 0l-7-7A1.994 1.994 0 013 12V7a4 4 0 014-4z" />
                            </svg>
                            <p className="text-slate-400">No labels generated yet</p>
                            <Button asChild className="mt-4" variant="outline">
                                <Link href="/labels/generate">Generate your first label</Link>
                            </Button>
                        </div>
                    ) : (
                        <div className="overflow-x-auto">
                            <Table>
                                <TableHeader>
                                    <TableRow className="border-slate-700">
                                        <TableHead className="text-slate-400">Label Name</TableHead>
                                        <TableHead className="text-slate-400">Recipe</TableHead>
                                        <TableHead className="text-slate-400">Format</TableHead>
                                        <TableHead className="text-slate-400">Compliance</TableHead>
                                        <TableHead className="text-slate-400">Created</TableHead>
                                        <TableHead className="text-slate-400 text-right">Actions</TableHead>
                                    </TableRow>
                                </TableHeader>
                                <TableBody>
                                    {labels.map((label) => {
                                        const errors = label.validation_results?.filter(
                                            (r: any) => r.status === 'fail' && r.severity === 'error'
                                        ).length || 0;
                                        const warnings = label.validation_results?.filter(
                                            (r: any) => r.status === 'fail' && r.severity === 'warning'
                                        ).length || 0;

                                        return (
                                            <TableRow key={label.id} className="border-slate-700 hover:bg-slate-700/50">
                                                <TableCell className="text-white font-medium">{label.name}</TableCell>
                                                <TableCell className="text-slate-300">
                                                    {label.recipe?.name || 'Unknown Recipe'}
                                                </TableCell>
                                                <TableCell>
                                                    <Badge variant="outline" className="text-slate-400 border-slate-600">
                                                        {label.format === 'fda_vertical' ? 'FDA Vertical' : label.format}
                                                    </Badge>
                                                </TableCell>
                                                <TableCell>
                                                    <ComplianceStatusBadge
                                                        status={label.compliance_status || 'not_validated'}
                                                        errors_count={errors}
                                                        warnings_count={warnings}
                                                        showCounts={true}
                                                        size="sm"
                                                    />
                                                </TableCell>
                                                <TableCell className="text-slate-400">{formatDate(label.created_at)}</TableCell>
                                                <TableCell className="text-right">
                                                    <div className="flex justify-end gap-2">
                                                        <Button
                                                            size="sm"
                                                            variant="ghost"
                                                            asChild
                                                            className="text-emerald-400 hover:text-emerald-300 hover:bg-emerald-900/20"
                                                        >
                                                            <Link href="/compliance">View Report</Link>
                                                        </Button>
                                                        <Button
                                                            size="sm"
                                                            variant="ghost"
                                                            onClick={() => handleDelete(label.id)}
                                                            disabled={deleting === label.id}
                                                            className="text-red-400 hover:text-red-300 hover:bg-red-900/20"
                                                        >
                                                            {deleting === label.id ? '...' : 'Delete'}
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
        </div>
    );
}
