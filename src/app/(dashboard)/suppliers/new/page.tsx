'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { toast } from 'sonner';

export default function NewSupplierPage() {
    const router = useRouter();
    const [loading, setLoading] = useState(false);
    const [formData, setFormData] = useState({
        name: '',
        contact_email: '',
        contact_phone: '',
        address: '',
        notes: '',
    });

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        setLoading(true);

        try {
            const response = await fetch('/api/suppliers', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    name: formData.name,
                    contact_email: formData.contact_email || null,
                    contact_phone: formData.contact_phone || null,
                    address: formData.address || null,
                    notes: formData.notes || null,
                }),
            });

            if (!response.ok) {
                const error = await response.json();
                throw new Error(error.error || 'Failed to create supplier');
            }

            const supplier = await response.json();
            toast.success('Supplier created!');
            router.push(`/suppliers/${supplier.id}`);
        } catch (error) {
            toast.error(error instanceof Error ? error.message : 'An error occurred');
        } finally {
            setLoading(false);
        }
    };

    return (
        <div className="max-w-2xl mx-auto space-y-6 animate-fade-in">
            <div>
                <h1 className="text-3xl font-bold text-white">Add Supplier</h1>
                <p className="text-slate-400 mt-1">Create a new supplier to manage their documents</p>
            </div>

            <form onSubmit={handleSubmit}>
                <Card className="bg-slate-800/50 border-slate-700">
                    <CardHeader>
                        <CardTitle className="text-white">Supplier Information</CardTitle>
                        <CardDescription className="text-slate-400">
                            Enter the supplier&apos;s contact details
                        </CardDescription>
                    </CardHeader>
                    <CardContent className="space-y-4">
                        <div className="space-y-2">
                            <Label className="text-slate-200">Supplier Name *</Label>
                            <Input
                                value={formData.name}
                                onChange={(e) => setFormData(prev => ({ ...prev, name: e.target.value }))}
                                required
                                className="bg-slate-700/50 border-slate-600 text-white"
                                placeholder="e.g., Acme Ingredients Co."
                            />
                        </div>

                        <div className="grid gap-4 md:grid-cols-2">
                            <div className="space-y-2">
                                <Label className="text-slate-200">Email</Label>
                                <Input
                                    type="email"
                                    value={formData.contact_email}
                                    onChange={(e) => setFormData(prev => ({ ...prev, contact_email: e.target.value }))}
                                    className="bg-slate-700/50 border-slate-600 text-white"
                                    placeholder="supplier@example.com"
                                />
                            </div>
                            <div className="space-y-2">
                                <Label className="text-slate-200">Phone</Label>
                                <Input
                                    type="tel"
                                    value={formData.contact_phone}
                                    onChange={(e) => setFormData(prev => ({ ...prev, contact_phone: e.target.value }))}
                                    className="bg-slate-700/50 border-slate-600 text-white"
                                    placeholder="+1 (555) 000-0000"
                                />
                            </div>
                        </div>

                        <div className="space-y-2">
                            <Label className="text-slate-200">Address</Label>
                            <Textarea
                                value={formData.address}
                                onChange={(e) => setFormData(prev => ({ ...prev, address: e.target.value }))}
                                className="bg-slate-700/50 border-slate-600 text-white"
                                placeholder="Street address, city, state, zip"
                                rows={2}
                            />
                        </div>

                        <div className="space-y-2">
                            <Label className="text-slate-200">Notes</Label>
                            <Textarea
                                value={formData.notes}
                                onChange={(e) => setFormData(prev => ({ ...prev, notes: e.target.value }))}
                                className="bg-slate-700/50 border-slate-600 text-white"
                                placeholder="Additional notes about this supplier..."
                                rows={3}
                            />
                        </div>

                        <div className="flex gap-4 pt-4">
                            <Button
                                type="submit"
                                disabled={loading}
                                className="bg-gradient-to-r from-purple-500 to-pink-600 hover:from-purple-600 hover:to-pink-700"
                            >
                                {loading ? 'Creating...' : 'Create Supplier'}
                            </Button>
                            <Button
                                type="button"
                                variant="outline"
                                onClick={() => router.back()}
                                className="border-slate-600 text-slate-300 hover:bg-slate-700"
                            >
                                Cancel
                            </Button>
                        </div>
                    </CardContent>
                </Card>
            </form>
        </div>
    );
}
