import { notFound } from 'next/navigation';
import { createClient } from '@/lib/supabase/server';
import { IngredientForm } from '@/components/ingredients/ingredient-form';

export default async function EditIngredientPage({
    params,
}: {
    params: Promise<{ id: string }>;
}) {
    const { id } = await params;
    const supabase = await createClient();

    const { data: ingredient, error } = await supabase
        .from('ingredients')
        .select('*')
        .eq('id', id)
        .single();

    if (error || !ingredient) {
        notFound();
    }

    return (
        <div className="space-y-6">
            <div>
                <h1 className="text-3xl font-bold text-white">Edit Ingredient</h1>
                <p className="text-slate-400 mt-1">Update ingredient details and nutrition data</p>
            </div>

            <IngredientForm initialData={ingredient} />
        </div>
    );
}
