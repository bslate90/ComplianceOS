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

interface Supplier {
    id: string;
    name: string;
    contact_email: string | null;
    contact_phone: string | null;
    created_at: string;
    supplier_documents: { count: number }[];
}

export default function SuppliersPage() {
    const [suppliers, setSuppliers] = useState<Supplier[]>([]);
    const [loading, setLoading] = useState(true);
    const [search, setSearch] = useState('');
    const [deleting, setDeleting] = useState<string | null>(null);

    useEffect(() => {
        fetchSuppliers();
    }, []);

    const fetchSuppliers = async () => {
        try {
            const response = await fetch('/api/suppliers');
            if (!response.ok) throw new Error('Failed to fetch');
            const data = await response.json();
            setSuppliers(data);
        } catch (error) {
            console.error('Error:', error);
            toast.error('Failed to load suppliers');
        } finally {
            setLoading(false);
        }
    };

    const handleDelete = async (id: string) => {
        if (!confirm('Are you sure? This will delete all associated documents.')) return;

        setDeleting(id);
        try {
            const response = await fetch(`/api/suppliers?id=${id}`, { method: 'DELETE' });
            if (!response.ok) throw new Error('Failed to delete');

            setSuppliers(prev => prev.filter(s => s.id !== id));
            toast.success('Supplier deleted');
        } catch (error) {
            console.error('Error:', error);
            toast.error('Failed to delete supplier');
        } finally {
            setDeleting(null);
        }
    };

    const filteredSuppliers = suppliers.filter(s =>
        s.name.toLowerCase().includes(search.toLowerCase()) ||
        s.contact_email?.toLowerCase().includes(search.toLowerCase())
    );

    const formatDate = (dateString: string) => {
        return new Date(dateString).toLocaleDateString('en-US', {
            year: 'numeric',
            month: 'short',
            day: 'numeric',
        });
    };

    return (
        <div className="space-y-6 animate-fade-in">
            {/* Header */}
            <div className="flex flex-col sm:flex-row justify-between gap-4">
                <div>
                    <h1 className="text-3xl font-bold text-white">Suppliers</h1>
                    <p className="text-slate-400 mt-1">Manage supplier documents and nutritional specifications</p>
                </div>
                <Button asChild className="bg-gradient-to-r from-purple-500 to-pink-600 hover:from-purple-600 hover:to-pink-700 self-start">
                    <Link href="/suppliers/new">
                        <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4 mr-2" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
                        </svg>
                        Add Supplier
                    </Link>
                </Button>
            </div>

            {/* Search */}
            <Card className="bg-slate-800/50 border-slate-700">
                <CardContent className="pt-6">
                    <Input
                        placeholder="Search suppliers..."
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
                        {filteredSuppliers.length} Supplier{filteredSuppliers.length !== 1 ? 's' : ''}
                    </CardTitle>
                </CardHeader>
                <CardContent>
                    {loading ? (
                        <div className="flex justify-center py-8">
                            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-emerald-500" />
                        </div>
                    ) : filteredSuppliers.length === 0 ? (
                        <div className="text-center py-12">
                            <svg xmlns="http://www.w3.org/2000/svg" className="h-12 w-12 mx-auto text-slate-600 mb-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 21V5a2 2 0 00-2-2H7a2 2 0 00-2 2v16m14 0h2m-2 0h-5m-9 0H3m2 0h5M9 7h1m-1 4h1m4-4h1m-1 4h1m-5 10v-5a1 1 0 011-1h2a1 1 0 011 1v5m-4 0h4" />
                            </svg>
                            <p className="text-slate-400">No suppliers yet</p>
                            <Button asChild className="mt-4" variant="outline">
                                <Link href="/suppliers/new">Add your first supplier</Link>
                            </Button>
                        </div>
                    ) : (
                        <div className="overflow-x-auto">
                            <Table>
                                <TableHeader>
                                    <TableRow className="border-slate-700">
                                        <TableHead className="text-slate-400">Supplier</TableHead>
                                        <TableHead className="text-slate-400">Contact</TableHead>
                                        <TableHead className="text-slate-400">Documents</TableHead>
                                        <TableHead className="text-slate-400">Added</TableHead>
                                        <TableHead className="text-slate-400 text-right">Actions</TableHead>
                                    </TableRow>
                                </TableHeader>
                                <TableBody>
                                    {filteredSuppliers.map((supplier) => {
                                        const docCount = supplier.supplier_documents?.[0]?.count || 0;
                                        return (
                                            <TableRow key={supplier.id} className="border-slate-700 hover:bg-slate-700/50">
                                                <TableCell>
                                                    <Link href={`/suppliers/${supplier.id}`} className="text-white font-medium hover:text-purple-400">
                                                        {supplier.name}
                                                    </Link>
                                                </TableCell>
                                                <TableCell className="text-slate-300">
                                                    {supplier.contact_email || supplier.contact_phone || '-'}
                                                </TableCell>
                                                <TableCell>
                                                    <Badge variant="outline" className="text-slate-400 border-slate-600">
                                                        {docCount} document{docCount !== 1 ? 's' : ''}
                                                    </Badge>
                                                </TableCell>
                                                <TableCell className="text-slate-400">
                                                    {formatDate(supplier.created_at)}
                                                </TableCell>
                                                <TableCell className="text-right">
                                                    <div className="flex justify-end gap-2">
                                                        <Button
                                                            asChild
                                                            size="sm"
                                                            variant="ghost"
                                                            className="text-slate-400 hover:text-white hover:bg-slate-700"
                                                        >
                                                            <Link href={`/suppliers/${supplier.id}`}>View</Link>
                                                        </Button>
                                                        <Button
                                                            size="sm"
                                                            variant="ghost"
                                                            onClick={() => handleDelete(supplier.id)}
                                                            disabled={deleting === supplier.id}
                                                            className="text-red-400 hover:text-red-300 hover:bg-red-900/20"
                                                        >
                                                            {deleting === supplier.id ? '...' : 'Delete'}
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
