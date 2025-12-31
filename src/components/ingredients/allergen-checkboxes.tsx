'use client';

import { ALLERGENS } from '@/lib/constants/allergens';
import { Checkbox } from '@/components/ui/checkbox';
import { Label } from '@/components/ui/label';

interface AllergenCheckboxesProps {
    values: Record<string, boolean | string | number | null | undefined>;
    onChange: (field: string, value: boolean) => void;
    disabled?: boolean;
}

export function AllergenCheckboxes({ values, onChange, disabled }: AllergenCheckboxesProps) {
    return (
        <div className="space-y-3">
            <Label className="text-slate-200 text-sm font-medium">Contains Allergens (Big 9)</Label>
            <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
                {ALLERGENS.map((allergen) => (
                    <div key={allergen.key} className="flex items-center space-x-2">
                        <Checkbox
                            id={allergen.field}
                            checked={!!values[allergen.field]}
                            onCheckedChange={(checked) => onChange(allergen.field, checked as boolean)}
                            disabled={disabled}
                            className="border-slate-600 data-[state=checked]:bg-amber-500 data-[state=checked]:border-amber-500"
                        />
                        <Label
                            htmlFor={allergen.field}
                            className="text-sm text-slate-300 cursor-pointer"
                        >
                            {allergen.label}
                        </Label>
                    </div>
                ))}
            </div>
        </div>
    );
}
