import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';

// GET - Fetch compliance reports
export async function GET(request: NextRequest) {
    const supabase = await createClient();

    const { data: { user } } = await supabase.auth.getUser();
    if (!user) {
        return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { data: profile } = await supabase
        .from('profiles')
        .select('organization_id')
        .eq('id', user.id)
        .single();

    if (!profile?.organization_id) {
        return NextResponse.json({ error: 'No organization found' }, { status: 404 });
    }

    const { searchParams } = new URL(request.url);
    const recipeId = searchParams.get('recipe_id');
    const status = searchParams.get('status');
    const triggerSource = searchParams.get('trigger_source');
    const limit = parseInt(searchParams.get('limit') || '50');
    const offset = parseInt(searchParams.get('offset') || '0');

    let query = supabase
        .from('compliance_reports')
        .select(`
            *,
            recipe:recipes(id, name),
            generated_by_user:profiles!compliance_reports_generated_by_fkey(full_name)
        `, { count: 'exact' })
        .eq('organization_id', profile.organization_id)
        .order('created_at', { ascending: false })
        .range(offset, offset + limit - 1);

    if (recipeId) {
        query = query.eq('recipe_id', recipeId);
    }
    if (status) {
        query = query.eq('status', status);
    }
    if (triggerSource) {
        query = query.eq('trigger_source', triggerSource);
    }

    const { data: reports, count, error } = await query;

    if (error) {
        return NextResponse.json({ error: error.message }, { status: 500 });
    }

    return NextResponse.json({
        reports,
        total: count,
        limit,
        offset,
    });
}

// POST - Generate a new compliance report
export async function POST(request: NextRequest) {
    const supabase = await createClient();

    const { data: { user } } = await supabase.auth.getUser();
    if (!user) {
        return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { data: profile } = await supabase
        .from('profiles')
        .select('organization_id, full_name')
        .eq('id', user.id)
        .single();

    if (!profile?.organization_id) {
        return NextResponse.json({ error: 'No organization found' }, { status: 404 });
    }

    try {
        const body = await request.json();
        const { recipe_id, label_id, report_type = 'full' } = body;

        if (!recipe_id && !label_id) {
            return NextResponse.json(
                { error: 'Either recipe_id or label_id is required' },
                { status: 400 }
            );
        }

        // Fetch recipe with nutrition data
        let recipeData = null;
        if (recipe_id) {
            const { data } = await supabase
                .from('recipes')
                .select('*')
                .eq('id', recipe_id)
                .eq('organization_id', profile.organization_id)
                .single();
            recipeData = data;
        } else if (label_id) {
            const { data: label } = await supabase
                .from('labels')
                .select('*, recipe:recipes(*)')
                .eq('id', label_id)
                .eq('organization_id', profile.organization_id)
                .single();
            recipeData = label?.recipe;
        }

        if (!recipeData) {
            return NextResponse.json({ error: 'Recipe not found' }, { status: 404 });
        }

        // Run compliance checks
        const checkResults = runComplianceChecks(recipeData as RecipeData, report_type);

        // Calculate overall status
        const failedChecks = checkResults.filter(r => r.status === 'fail').length;
        const warningChecks = checkResults.filter(r => r.status === 'warning').length;
        const passedChecks = checkResults.filter(r => r.status === 'pass').length;

        const overallStatus = failedChecks > 0 ? 'errors' :
            warningChecks > 0 ? 'warnings' : 'compliant';

        // Generate summary
        const summary = generateComplianceSummary(recipeData as RecipeData, checkResults);

        // Generate recommendations
        const recommendations = generateRecommendations(checkResults);

        // Create report
        const { data: report, error: reportError } = await supabase
            .from('compliance_reports')
            .insert({
                organization_id: profile.organization_id,
                recipe_id,
                label_id,
                trigger_source: 'manual',
                report_type,
                status: 'completed',
                overall_status: overallStatus,
                total_checks: checkResults.length,
                passed_checks: passedChecks,
                warning_checks: warningChecks,
                failed_checks: failedChecks,
                results: JSON.parse(JSON.stringify(checkResults)),
                summary,
                recommendations: JSON.parse(JSON.stringify(recommendations)),
                generated_by: user.id,
                generated_at: new Date().toISOString(),
            })
            .select()
            .single();

        if (reportError) {
            throw reportError;
        }

        // Log the action
        await supabase.from('organization_audit_log').insert({
            organization_id: profile.organization_id,
            user_id: user.id,
            user_name: profile.full_name,
            action: 'create',
            entity_type: 'compliance_report',
            entity_id: report.id,
            entity_name: `Compliance Report: ${recipeData.name}`,
            change_summary: `Generated ${report_type} compliance report - ${overallStatus}`,
        });

        // Queue for PLEX sync if configured
        const { data: plexConfig } = await supabase
            .from('webhook_configurations')
            .select('id')
            .eq('organization_id', profile.organization_id)
            .eq('provider', 'plex')
            .eq('is_active', true)
            .eq('sync_compliance', true)
            .single();

        if (plexConfig) {
            await supabase.from('plex_sync_queue').insert({
                organization_id: profile.organization_id,
                webhook_config_id: plexConfig.id,
                entity_type: 'compliance_report',
                entity_id: report.id,
                action: 'create',
                payload: report,
                next_attempt_at: new Date().toISOString(),
            });
        }

        return NextResponse.json({
            success: true,
            report,
        });

    } catch (error) {
        console.error('Compliance report error:', error);
        const message = error instanceof Error ? error.message : 'Unknown error';
        return NextResponse.json({ error: message }, { status: 500 });
    }
}

// Compliance check types
interface ComplianceCheck {
    id: string;
    category: string;
    rule: string;
    status: 'pass' | 'warning' | 'fail';
    message: string;
    recommendation?: string;
    details?: Record<string, unknown>;
}

interface RecipeData {
    name: string;
    serving_size_g?: number;
    servings_per_container?: number;
    household_measure?: string;
    calculated_nutrition?: Record<string, number>;
    ingredient_statement?: string;
    allergen_statement?: string;
    contains_milk?: boolean;
    contains_eggs?: boolean;
    contains_fish?: boolean;
    contains_shellfish?: boolean;
    contains_tree_nuts?: boolean;
    contains_peanuts?: boolean;
    contains_wheat?: boolean;
    contains_soybeans?: boolean;
    contains_sesame?: boolean;
}

// Run compliance checks on recipe data
function runComplianceChecks(recipe: RecipeData, reportType: string): ComplianceCheck[] {
    const checks: ComplianceCheck[] = [];
    const nutrition = recipe.calculated_nutrition || {};

    // Always run these checks
    const runNutrition = reportType === 'full' || reportType === 'nutrition';
    const runAllergen = reportType === 'full' || reportType === 'allergen';
    const runLabeling = reportType === 'full' || reportType === 'labeling';

    if (runNutrition) {
        // FDA Required Nutrients
        const requiredNutrients = [
            { key: 'calories', name: 'Calories' },
            { key: 'total_fat_g', name: 'Total Fat' },
            { key: 'saturated_fat_g', name: 'Saturated Fat' },
            { key: 'trans_fat_g', name: 'Trans Fat' },
            { key: 'cholesterol_mg', name: 'Cholesterol' },
            { key: 'sodium_mg', name: 'Sodium' },
            { key: 'total_carbohydrates_g', name: 'Total Carbohydrates' },
            { key: 'dietary_fiber_g', name: 'Dietary Fiber' },
            { key: 'total_sugars_g', name: 'Total Sugars' },
            { key: 'added_sugars_g', name: 'Added Sugars' },
            { key: 'protein_g', name: 'Protein' },
            { key: 'vitamin_d_mcg', name: 'Vitamin D' },
            { key: 'calcium_mg', name: 'Calcium' },
            { key: 'iron_mg', name: 'Iron' },
            { key: 'potassium_mg', name: 'Potassium' },
        ];

        for (const nutrient of requiredNutrients) {
            const value = nutrition[nutrient.key];
            checks.push({
                id: `nutrient_${nutrient.key}`,
                category: 'Nutrition',
                rule: `${nutrient.name} Value Required`,
                status: value !== undefined && value !== null ? 'pass' : 'fail',
                message: value !== undefined && value !== null
                    ? `${nutrient.name}: ${value}`
                    : `${nutrient.name} value is missing`,
                recommendation: value === undefined || value === null
                    ? `Add ${nutrient.name} value to the nutrition data`
                    : undefined,
            });
        }

        // Check for reasonable values
        if (nutrition.calories !== undefined) {
            checks.push({
                id: 'calories_range',
                category: 'Nutrition',
                rule: 'Calories Range Check',
                status: nutrition.calories >= 0 && nutrition.calories <= 1000 ? 'pass' : 'warning',
                message: nutrition.calories >= 0 && nutrition.calories <= 1000
                    ? 'Calories value is within expected range'
                    : `Calories value (${nutrition.calories}) seems unusual`,
                recommendation: 'Verify the calorie value is correct for a single serving',
            });
        }

        // Check sodium levels (FDA concern >2300mg)
        if (nutrition.sodium_mg !== undefined && nutrition.sodium_mg > 600) {
            checks.push({
                id: 'sodium_high',
                category: 'Nutrition',
                rule: 'High Sodium Warning',
                status: 'warning',
                message: `Sodium level (${nutrition.sodium_mg}mg) is high for a single serving`,
                recommendation: 'Consider adding "high sodium" disclosure if required',
            });
        }
    }

    if (runLabeling) {
        // Serving Size Check
        checks.push({
            id: 'serving_size',
            category: 'Labeling',
            rule: 'Serving Size Required',
            status: recipe.serving_size_g ? 'pass' : 'fail',
            message: recipe.serving_size_g
                ? `Serving size: ${recipe.serving_size_g}g`
                : 'Serving size is not specified',
            recommendation: !recipe.serving_size_g
                ? 'Set an FDA-compliant serving size based on RACC values'
                : undefined,
        });

        // Servings Per Container
        checks.push({
            id: 'servings_per_container',
            category: 'Labeling',
            rule: 'Servings Per Container',
            status: recipe.servings_per_container ? 'pass' : 'warning',
            message: recipe.servings_per_container
                ? `Servings per container: ${recipe.servings_per_container}`
                : 'Servings per container not specified',
            recommendation: !recipe.servings_per_container
                ? 'Add servings per container for complete label compliance'
                : undefined,
        });

        // Household Measure
        checks.push({
            id: 'household_measure',
            category: 'Labeling',
            rule: 'Household Measure',
            status: recipe.household_measure ? 'pass' : 'warning',
            message: recipe.household_measure
                ? `Household measure: ${recipe.household_measure}`
                : 'Household measure not specified',
            recommendation: !recipe.household_measure
                ? 'Add a household measure (e.g., "1 cup", "2 tbsp") for FDA compliance'
                : undefined,
        });

        // Ingredient Statement
        checks.push({
            id: 'ingredient_statement',
            category: 'Labeling',
            rule: 'Ingredient Statement Required',
            status: recipe.ingredient_statement ? 'pass' : 'fail',
            message: recipe.ingredient_statement
                ? 'Ingredient statement is present'
                : 'Ingredient statement is missing',
            recommendation: !recipe.ingredient_statement
                ? 'Add a complete ingredient statement in descending order by weight'
                : undefined,
        });
    }

    if (runAllergen) {
        // Major Allergen Declaration
        const allergens = [
            { flag: recipe.contains_milk, name: 'Milk' },
            { flag: recipe.contains_eggs, name: 'Eggs' },
            { flag: recipe.contains_fish, name: 'Fish' },
            { flag: recipe.contains_shellfish, name: 'Shellfish' },
            { flag: recipe.contains_tree_nuts, name: 'Tree Nuts' },
            { flag: recipe.contains_peanuts, name: 'Peanuts' },
            { flag: recipe.contains_wheat, name: 'Wheat' },
            { flag: recipe.contains_soybeans, name: 'Soybeans' },
            { flag: recipe.contains_sesame, name: 'Sesame' },
        ];

        const containedAllergens = allergens.filter(a => a.flag).map(a => a.name);

        checks.push({
            id: 'allergen_declaration',
            category: 'Allergens',
            rule: 'Major Allergen Declaration',
            status: containedAllergens.length > 0
                ? (recipe.allergen_statement ? 'pass' : 'fail')
                : 'pass',
            message: containedAllergens.length > 0
                ? `Contains: ${containedAllergens.join(', ')}`
                : 'No major allergens declared',
            recommendation: containedAllergens.length > 0 && !recipe.allergen_statement
                ? 'Add "Contains" statement with major allergens'
                : undefined,
        });

        // Check allergen statement format
        if (recipe.allergen_statement) {
            const hasContainsFormat = recipe.allergen_statement.toLowerCase().includes('contains');
            checks.push({
                id: 'allergen_format',
                category: 'Allergens',
                rule: 'Allergen Statement Format',
                status: hasContainsFormat ? 'pass' : 'warning',
                message: hasContainsFormat
                    ? 'Allergen statement uses proper "Contains" format'
                    : 'Allergen statement may not follow FDA format',
                recommendation: !hasContainsFormat
                    ? 'Use format: "Contains: milk, wheat, soy"'
                    : undefined,
            });
        }
    }

    return checks;
}

// Generate human-readable summary
function generateComplianceSummary(recipe: RecipeData, checks: ComplianceCheck[]): string {
    const failed = checks.filter(c => c.status === 'fail');
    const warnings = checks.filter(c => c.status === 'warning');
    const passed = checks.filter(c => c.status === 'pass');

    let summary = `Compliance Report for "${recipe.name}"\n\n`;
    summary += `Total Checks: ${checks.length}\n`;
    summary += `Passed: ${passed.length} | Warnings: ${warnings.length} | Failed: ${failed.length}\n\n`;

    if (failed.length === 0 && warnings.length === 0) {
        summary += 'This recipe meets all FDA nutrition labeling requirements.';
    } else if (failed.length > 0) {
        summary += `Critical Issues (${failed.length}):\n`;
        failed.forEach(f => {
            summary += `• ${f.message}\n`;
        });
    }

    if (warnings.length > 0) {
        summary += `\nWarnings (${warnings.length}):\n`;
        warnings.forEach(w => {
            summary += `• ${w.message}\n`;
        });
    }

    return summary;
}

// Generate actionable recommendations
function generateRecommendations(checks: ComplianceCheck[]): string[] {
    return checks
        .filter(c => c.recommendation && (c.status === 'fail' || c.status === 'warning'))
        .sort((a, b) => (a.status === 'fail' ? -1 : 1))
        .map(c => c.recommendation!)
        .filter((v, i, a) => a.indexOf(v) === i); // Remove duplicates
}
