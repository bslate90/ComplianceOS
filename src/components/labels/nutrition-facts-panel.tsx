'use client';

import { RoundedNutritionData } from '@/lib/nutrition/rounding-rules';
import { calculateDailyValuePercent } from '@/lib/nutrition/daily-values';

export type LabelFormat = 'standard' | 'tabular' | 'linear';
export type LabelSize = 'large' | 'medium' | 'small';

interface NutritionFactsPanelProps {
    servingsPerContainer?: number | string;
    servingSize: string;
    nutrition: RoundedNutritionData;
    format?: LabelFormat;
    size?: LabelSize;
}

export function NutritionFactsPanel({
    servingsPerContainer,
    servingSize,
    nutrition,
    format = 'standard',
    size = 'large',
}: NutritionFactsPanelProps) {
    const formatValue = (value: number | string): string => {
        if (typeof value === 'string') return value;
        return value.toString();
    };

    const getRawValue = (value: number | string): number => {
        if (typeof value === 'string') return 0;
        return value;
    };

    // Size-based styling
    const sizeStyles = {
        large: { width: 'w-[280px]', header: 'text-[2rem]', calories: 'text-3xl', fontSize: 'text-sm' },
        medium: { width: 'w-[220px]', header: 'text-xl', calories: 'text-2xl', fontSize: 'text-xs' },
        small: { width: 'w-[180px]', header: 'text-lg', calories: 'text-xl', fontSize: 'text-[10px]' },
    };

    const styles = sizeStyles[size];

    // Linear format for very small packages
    if (format === 'linear') {
        return (
            <div className={`bg-white text-black p-2 ${sizeStyles.small.width} font-sans border border-black`}>
                <div className="text-xs font-bold mb-1">Nutrition Facts</div>
                <div className="text-[9px] leading-tight">
                    <span className="font-bold">Serv. Size</span> {servingSize} •
                    <span className="font-bold"> Cal.</span> {formatValue(nutrition.calories)} •
                    <span className="font-bold"> Fat</span> {formatValue(nutrition.totalFat)}g •
                    <span className="font-bold"> Sat. Fat</span> {formatValue(nutrition.saturatedFat)}g •
                    <span className="font-bold"> Trans Fat</span> {formatValue(nutrition.transFat)}g •
                    <span className="font-bold"> Cholest.</span> {formatValue(nutrition.cholesterol)}mg •
                    <span className="font-bold"> Sodium</span> {formatValue(nutrition.sodium)}mg •
                    <span className="font-bold"> Carb.</span> {formatValue(nutrition.totalCarbohydrates)}g •
                    <span className="font-bold"> Fiber</span> {formatValue(nutrition.dietaryFiber)}g •
                    <span className="font-bold"> Sugars</span> {formatValue(nutrition.totalSugars)}g •
                    <span className="font-bold"> Protein</span> {formatValue(nutrition.protein)}g
                </div>
            </div>
        );
    }

    // Tabular format for medium packages
    if (format === 'tabular') {
        return (
            <div className={`bg-white text-black p-2 w-auto max-w-[400px] font-sans border-2 border-black`}>
                <div className="text-lg font-black leading-none border-b border-black pb-1">
                    Nutrition Facts
                </div>
                <div className="text-xs py-1 border-b-4 border-black">
                    {servingsPerContainer && <span>{servingsPerContainer} servings per container • </span>}
                    <span className="font-bold">Serving size: {servingSize}</span>
                </div>

                <table className="w-full text-[10px]">
                    <tbody>
                        <tr className="border-b border-black">
                            <td className="font-bold py-0.5">Calories {formatValue(nutrition.calories)}</td>
                            <td className="font-bold">Total Fat {formatValue(nutrition.totalFat)}g</td>
                            <td className="font-bold">Sodium {formatValue(nutrition.sodium)}mg</td>
                            <td className="font-bold">Total Carb {formatValue(nutrition.totalCarbohydrates)}g</td>
                            <td className="font-bold">Protein {formatValue(nutrition.protein)}g</td>
                        </tr>
                        <tr className="border-b border-black">
                            <td className="py-0.5"></td>
                            <td className="pl-2">Sat. Fat {formatValue(nutrition.saturatedFat)}g</td>
                            <td></td>
                            <td className="pl-2">Fiber {formatValue(nutrition.dietaryFiber)}g</td>
                            <td></td>
                        </tr>
                        <tr className="border-b border-black">
                            <td className="py-0.5"></td>
                            <td className="pl-2">Trans Fat {formatValue(nutrition.transFat)}g</td>
                            <td></td>
                            <td className="pl-2">Sugars {formatValue(nutrition.totalSugars)}g</td>
                            <td></td>
                        </tr>
                        <tr>
                            <td className="py-0.5"></td>
                            <td>Cholest. {formatValue(nutrition.cholesterol)}mg</td>
                            <td></td>
                            <td className="pl-4">Added Sugars {formatValue(nutrition.addedSugars)}g</td>
                            <td></td>
                        </tr>
                    </tbody>
                </table>

                <div className="text-[8px] pt-1 border-t border-black mt-1">
                    Vit D {nutrition.vitaminD}mcg • Calcium {nutrition.calcium}mg • Iron {nutrition.iron}mg • Potassium {nutrition.potassium}mg
                </div>
            </div>
        );
    }

    // Standard vertical format (default)
    return (
        <div className={`bg-white text-black p-2 ${styles.width} font-sans border-2 border-black`}>
            {/* Header */}
            <div className={`${styles.header} font-black leading-none border-b border-black pb-1`}>
                Nutrition Facts
            </div>

            {/* Servings info */}
            <div className={`${styles.fontSize} py-1 border-b-8 border-black`}>
                {servingsPerContainer && (
                    <div>{servingsPerContainer} servings per container</div>
                )}
                <div className="flex justify-between font-bold">
                    <span>Serving size</span>
                    <span>{servingSize}</span>
                </div>
            </div>

            {/* Calories */}
            <div className="py-1 border-b border-black">
                <div className="text-[0.65rem] font-bold">Amount per serving</div>
                <div className="flex justify-between items-end">
                    <span className="text-2xl font-black">Calories</span>
                    <span className={`${styles.calories} font-black`}>{formatValue(nutrition.calories)}</span>
                </div>
            </div>

            {/* Daily Value header */}
            <div className="text-right text-[0.65rem] font-bold border-b border-black py-0.5">
                % Daily Value*
            </div>

            {/* Nutrients */}
            <NutrientRow label="Total Fat" value={`${formatValue(nutrition.totalFat)}g`} dailyValue={calculateDailyValuePercent('totalFat', getRawValue(nutrition.totalFat))} bold />
            <NutrientRow label="Saturated Fat" value={`${formatValue(nutrition.saturatedFat)}g`} dailyValue={calculateDailyValuePercent('saturatedFat', getRawValue(nutrition.saturatedFat))} indent />
            <NutrientRow label="Trans Fat" value={`${formatValue(nutrition.transFat)}g`} indent />
            <NutrientRow label="Cholesterol" value={`${formatValue(nutrition.cholesterol)}mg`} dailyValue={calculateDailyValuePercent('cholesterol', getRawValue(nutrition.cholesterol))} bold />
            <NutrientRow label="Sodium" value={`${formatValue(nutrition.sodium)}mg`} dailyValue={calculateDailyValuePercent('sodium', getRawValue(nutrition.sodium))} bold />
            <NutrientRow label="Total Carbohydrate" value={`${formatValue(nutrition.totalCarbohydrates)}g`} dailyValue={calculateDailyValuePercent('totalCarbohydrates', getRawValue(nutrition.totalCarbohydrates))} bold />
            <NutrientRow label="Dietary Fiber" value={`${formatValue(nutrition.dietaryFiber)}g`} dailyValue={calculateDailyValuePercent('dietaryFiber', getRawValue(nutrition.dietaryFiber))} indent />
            <NutrientRow label="Total Sugars" value={`${formatValue(nutrition.totalSugars)}g`} indent />
            <NutrientRow label="Includes Added Sugars" value={`${formatValue(nutrition.addedSugars)}g`} dailyValue={calculateDailyValuePercent('addedSugars', getRawValue(nutrition.addedSugars))} doubleIndent />
            <NutrientRow label="Protein" value={`${formatValue(nutrition.protein)}g`} bold borderThick />

            {/* Vitamins and Minerals */}
            <NutrientRow label="Vitamin D" value={`${nutrition.vitaminD}mcg`} dailyValue={calculateDailyValuePercent('vitaminD', nutrition.vitaminD)} />
            <NutrientRow label="Calcium" value={`${nutrition.calcium}mg`} dailyValue={calculateDailyValuePercent('calcium', nutrition.calcium)} />
            <NutrientRow label="Iron" value={`${nutrition.iron}mg`} dailyValue={calculateDailyValuePercent('iron', nutrition.iron)} />
            <NutrientRow label="Potassium" value={`${nutrition.potassium}mg`} dailyValue={calculateDailyValuePercent('potassium', nutrition.potassium)} borderThick />

            {/* Footnote */}
            <div className="text-[0.55rem] pt-1">
                * The % Daily Value tells you how much a nutrient in a serving of food contributes to a daily diet. 2,000 calories a day is used for general nutrition advice.
            </div>
        </div>
    );
}

interface NutrientRowProps {
    label: string;
    value: string;
    dailyValue?: number;
    bold?: boolean;
    indent?: boolean;
    doubleIndent?: boolean;
    borderThick?: boolean;
}

function NutrientRow({
    label,
    value,
    dailyValue,
    bold,
    indent,
    doubleIndent,
    borderThick,
}: NutrientRowProps) {
    return (
        <div
            className={`flex justify-between text-sm py-0.5 ${borderThick ? 'border-b-8 border-black' : 'border-b border-black'
                } ${indent ? 'pl-4' : ''} ${doubleIndent ? 'pl-8' : ''}`}
        >
            <span className={bold ? 'font-bold' : ''}>
                {label} {value}
            </span>
            {dailyValue !== undefined && (
                <span className="font-bold">{dailyValue}%</span>
            )}
        </div>
    );
}
