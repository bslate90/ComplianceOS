'use client';

import { useState, useEffect, useCallback, use } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { NutritionScanner } from '@/components/documents/nutrition-scanner';
import { toast } from 'sonner';
import type { ExtractedNutritionData } from '@/lib/types/supplier.types';

interface Supplier {
    id: string;
    name: string;
    contact_email: string | null;
    contact_phone: string | null;
    address: string | null;
    notes: string | null;
    created_at: string;
}

interface Document {
    id: string;
    name: string;
    document_type: string;
    file_type: string;
    current_version: number;
    uploaded_at: string;
    linked_ingredient_id: string | null;
}

export default function SupplierDetailPage({
    params,
}: {
    params: Promise<{ id: string }>;
}) {
    const { id } = use(params);
    const router = useRouter();
    const [supplier, setSupplier] = useState<Supplier | null>(null);
    const [documents, setDocuments] = useState<Document[]>([]);
    const [loading, setLoading] = useState(true);
    const [showScanner, setShowScanner] = useState(false);

    const fetchSupplier = useCallback(async () => {
        try {
            const response = await fetch(`/api/suppliers`);
            if (!response.ok) throw new Error('Failed to fetch');
            const data = await response.json();
            const found = data.find((s: Supplier) => s.id === id);
            setSupplier(found || null);
        } catch (error) {
            console.error('Error:', error);
            toast.error('Failed to load supplier');
        } finally {
            setLoading(false);
        }
    }, [id]);

    useEffect(() => {
        fetchSupplier();
    }, [fetchSupplier]);

    const handleScanComplete = async (data: ExtractedNutritionData, file: File) => {
        // Use original filename without extension for document name
        const docName = file.name.replace(/\.[^/.]+$/, '');

        // First upload the document with its original filename
        const formData = new FormData();
        formData.append('file', file);
        formData.append('supplier_id', id);
        formData.append('name', docName); // Use filename for document
        formData.append('document_type', 'spec_sheet');

        try {
            const uploadResponse = await fetch('/api/documents/upload', {
                method: 'POST',
                body: formData,
            });

            if (!uploadResponse.ok) {
                throw new Error('Failed to upload document');
            }

            const document = await uploadResponse.json();

            // Create the ingredient with parsed name from OCR
            const ingredientResponse = await fetch('/api/ingredients', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    name: data.name || docName, // Use OCR name, fallback to doc name
                    brand: data.brand || supplier?.name,
                    serving_size_g: data.serving_size_g || 100,
                    calories: data.calories,
                    total_fat_g: data.total_fat_g,
                    saturated_fat_g: data.saturated_fat_g,
                    trans_fat_g: data.trans_fat_g,
                    cholesterol_mg: data.cholesterol_mg,
                    sodium_mg: data.sodium_mg,
                    total_carbohydrates_g: data.total_carbohydrates_g,
                    dietary_fiber_g: data.dietary_fiber_g,
                    total_sugars_g: data.total_sugars_g,
                    added_sugars_g: data.added_sugars_g,
                    protein_g: data.protein_g,
                    vitamin_d_mcg: data.vitamin_d_mcg,
                    calcium_mg: data.calcium_mg,
                    iron_mg: data.iron_mg,
                    potassium_mg: data.potassium_mg,
                }),
            });

            if (!ingredientResponse.ok) {
                throw new Error('Failed to create ingredient');
            }

            const ingredient = await ingredientResponse.json();

            toast.success(`Created ingredient "${data.name || docName}" - redirecting to edit...`);
            setShowScanner(false);
            setDocuments(prev => [...prev, document]);

            // Navigate to ingredient edit page so user can review/edit all data
            router.push(`/ingredients/${ingredient.id}`);

        } catch (error) {
            console.error('Error:', error);
            toast.error(error instanceof Error ? error.message : 'Failed to process');
        }
    };

    const formatDate = (dateString: string) => {
        return new Date(dateString).toLocaleDateString('en-US', {
            year: 'numeric',
            month: 'short',
            day: 'numeric',
        });
    };

    const truncateText = (text: string, maxLength: number = 25) => {
        if (text.length <= maxLength) return text;
        return text.substring(0, maxLength) + '...';
    };

    if (loading) {
        return (
            <div className="flex justify-center py-20">
                <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-emerald-500" />
            </div>
        );
    }

    if (!supplier) {
        return (
            <div className="text-center py-20">
                <p className="text-slate-400">Supplier not found</p>
                <Button asChild className="mt-4" variant="outline">
                    <Link href="/suppliers">Back to Suppliers</Link>
                </Button>
            </div>
        );
    }

    return (
        <div className="space-y-6 animate-fade-in">
            {/* Header */}
            <div className="flex flex-col sm:flex-row justify-between gap-4">
                <div>
                    <div className="flex items-center gap-3">
                        <Button variant="ghost" size="icon" onClick={() => router.back()} className="text-slate-400 hover:text-white">
                            <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
                            </svg>
                        </Button>
                        <h1 className="text-3xl font-bold text-white">{supplier.name}</h1>
                    </div>
                    <p className="text-slate-400 mt-1 ml-11">
                        {supplier.contact_email || 'No email'} • Added {formatDate(supplier.created_at)}
                    </p>
                </div>
                <Button
                    onClick={() => setShowScanner(true)}
                    className="bg-gradient-to-r from-emerald-500 to-teal-600 hover:from-emerald-600 hover:to-teal-700 self-start"
                >
                    <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4 mr-2" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 13h6m-3-3v6m5 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                    </svg>
                    Upload & Scan Document
                </Button>
            </div>

            {/* Scanner Modal/Section */}
            {showScanner && (
                <Card className="bg-slate-800/50 border-slate-700">
                    <CardHeader>
                        <CardTitle className="text-white flex items-center gap-2">
                            <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5 text-emerald-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                            </svg>
                            Scan Nutrition Document
                        </CardTitle>
                    </CardHeader>
                    <CardContent>
                        <NutritionScanner
                            onScanComplete={handleScanComplete}
                            onCancel={() => setShowScanner(false)}
                        />
                    </CardContent>
                </Card>
            )}

            {/* Tabs */}
            <Tabs defaultValue="documents" className="space-y-4">
                <TabsList className="bg-slate-800 border border-slate-700">
                    <TabsTrigger value="documents" className="data-[state=active]:bg-slate-700">
                        Documents
                    </TabsTrigger>
                    <TabsTrigger value="info" className="data-[state=active]:bg-slate-700">
                        Supplier Info
                    </TabsTrigger>
                    <TabsTrigger value="audit" className="data-[state=active]:bg-slate-700">
                        Audit Log
                    </TabsTrigger>
                </TabsList>

                <TabsContent value="documents" className="space-y-4">
                    {documents.length === 0 ? (
                        <Card className="bg-slate-800/50 border-slate-700">
                            <CardContent className="text-center py-12">
                                <svg xmlns="http://www.w3.org/2000/svg" className="h-12 w-12 mx-auto text-slate-600 mb-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 21h10a2 2 0 002-2V9.414a1 1 0 00-.293-.707l-5.414-5.414A1 1 0 0012.586 3H7a2 2 0 00-2 2v14a2 2 0 002 2z" />
                                </svg>
                                <p className="text-slate-400">No documents yet</p>
                                <p className="text-sm text-slate-500 mt-1">Upload a nutrition spec sheet to get started</p>
                                <Button onClick={() => setShowScanner(true)} className="mt-4">
                                    Upload Document
                                </Button>
                            </CardContent>
                        </Card>
                    ) : (
                        <div className="grid gap-4">
                            {documents.map((doc) => (
                                <Card key={doc.id} className="bg-slate-800/50 border-slate-700 hover:bg-slate-800 transition-colors">
                                    <CardContent className="p-4">
                                        <div className="flex items-center justify-between">
                                            <div className="flex items-center gap-3">
                                                <div className="w-10 h-10 rounded-lg bg-red-500/10 flex items-center justify-center">
                                                    <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5 text-red-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 21h10a2 2 0 002-2V9.414a1 1 0 00-.293-.707l-5.414-5.414A1 1 0 0012.586 3H7a2 2 0 00-2 2v14a2 2 0 002 2z" />
                                                    </svg>
                                                </div>
                                                <div>
                                                    <p className="text-white font-medium" title={doc.name}>{truncateText(doc.name)}</p>
                                                    <p className="text-sm text-slate-400">
                                                        Version {doc.current_version} • {formatDate(doc.uploaded_at)}
                                                    </p>
                                                </div>
                                            </div>
                                            <div className="flex items-center gap-2">
                                                <Badge variant="outline" className="text-slate-400 border-slate-600">
                                                    {doc.document_type.replace('_', ' ')}
                                                </Badge>
                                                {doc.linked_ingredient_id && (
                                                    <Badge className="bg-emerald-500">Linked</Badge>
                                                )}
                                            </div>
                                        </div>
                                    </CardContent>
                                </Card>
                            ))}
                        </div>
                    )}
                </TabsContent>

                <TabsContent value="info">
                    <Card className="bg-slate-800/50 border-slate-700">
                        <CardContent className="pt-6 space-y-4">
                            <div className="grid gap-4 md:grid-cols-2">
                                <div>
                                    <p className="text-sm text-slate-400">Email</p>
                                    <p className="text-white">{supplier.contact_email || '-'}</p>
                                </div>
                                <div>
                                    <p className="text-sm text-slate-400">Phone</p>
                                    <p className="text-white">{supplier.contact_phone || '-'}</p>
                                </div>
                            </div>
                            <div>
                                <p className="text-sm text-slate-400">Address</p>
                                <p className="text-white line-clamp-2 max-h-12 overflow-hidden" title={supplier.address || undefined}>
                                    {supplier.address || '-'}
                                </p>
                            </div>
                            <div>
                                <p className="text-sm text-slate-400">Notes</p>
                                <p className="text-white line-clamp-3 max-h-[4.5rem] overflow-hidden" title={supplier.notes || undefined}>
                                    {supplier.notes || '-'}
                                </p>
                            </div>
                        </CardContent>
                    </Card>
                </TabsContent>

                <TabsContent value="audit">
                    <Card className="bg-slate-800/50 border-slate-700">
                        <CardContent className="text-center py-12">
                            <svg xmlns="http://www.w3.org/2000/svg" className="h-12 w-12 mx-auto text-slate-600 mb-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2" />
                            </svg>
                            <p className="text-slate-400">Audit log coming soon</p>
                            <p className="text-sm text-slate-500 mt-1">Track all document changes and user actions</p>
                        </CardContent>
                    </Card>
                </TabsContent>
            </Tabs>
        </div>
    );
}
