import Link from 'next/link';
import { createClient } from '@/lib/supabase/server';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';

export default async function DashboardPage() {
    const supabase = await createClient();

    // Get counts for stats
    const [ingredientsResult, recipesResult, labelsResult] = await Promise.all([
        supabase.from('ingredients').select('id', { count: 'exact', head: true }),
        supabase.from('recipes').select('id', { count: 'exact', head: true }),
        supabase.from('labels').select('id', { count: 'exact', head: true }),
    ]);

    const stats = [
        {
            name: 'Ingredients',
            value: ingredientsResult.count || 0,
            href: '/ingredients',
            description: 'Raw materials',
            icon: (
                <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M19.428 15.428a2 2 0 00-1.022-.547l-2.387-.477a6 6 0 00-3.86.517l-.318.158a6 6 0 01-3.86.517L6.05 15.21a2 2 0 00-1.806.547M8 4h8l-1 1v5.172a2 2 0 00.586 1.414l5 5c1.26 1.26.367 3.414-1.415 3.414H4.828c-1.782 0-2.674-2.154-1.414-3.414l5-5A2 2 0 009 10.172V5L8 4z" />
                </svg>
            ),
            iconBg: 'icon-bg-blue',
            cardClass: 'stat-card stat-card-blue'
        },
        {
            name: 'Recipes',
            value: recipesResult.count || 0,
            href: '/recipes',
            description: 'Formulations',
            icon: (
                <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M12 6.253v13m0-13C10.832 5.477 9.246 5 7.5 5S4.168 5.477 3 6.253v13C4.168 18.477 5.754 18 7.5 18s3.332.477 4.5 1.253m0-13C13.168 5.477 14.754 5 16.5 5c1.747 0 3.332.477 4.5 1.253v13C19.832 18.477 18.247 18 16.5 18c-1.746 0-3.332.477-4.5 1.253" />
                </svg>
            ),
            iconBg: 'icon-bg-green',
            cardClass: 'stat-card stat-card-green'
        },
        {
            name: 'Labels',
            value: labelsResult.count || 0,
            href: '/labels',
            description: 'NFPs generated',
            icon: (
                <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M7 7h.01M7 3h5c.512 0 1.024.195 1.414.586l7 7a2 2 0 010 2.828l-7 7a2 2 0 01-2.828 0l-7-7A1.994 1.994 0 013 12V7a4 4 0 014-4z" />
                </svg>
            ),
            iconBg: 'icon-bg-purple',
            cardClass: 'stat-card stat-card-purple'
        },
    ];

    return (
        <div className="space-y-6 animate-fade-in">
            {/* Welcome section */}
            <div className="pb-2">
                <h1 className="text-xl sm:text-2xl font-semibold text-foreground">Welcome to ComplianceOS</h1>
                <p className="mt-1 text-sm text-muted-foreground">FDA-compliant nutrition label generation</p>
            </div>

            {/* Stats grid - Improved card layout */}
            <div className="grid gap-4 grid-cols-1 sm:grid-cols-3 stagger-children">
                {stats.map((stat) => (
                    <Link key={stat.name} href={stat.href} className="block group">
                        <div className={`${stat.cardClass} shadow-card hover:shadow-card-hover transition-all duration-150 cursor-pointer`}>
                            <div className="p-4">
                                <div className="flex items-start justify-between mb-3">
                                    <div className={`w-10 h-10 rounded-lg ${stat.iconBg} flex items-center justify-center text-white shadow-soft`}>
                                        {stat.icon}
                                    </div>
                                    <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4 text-muted-foreground/50 group-hover:text-muted-foreground transition-colors" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M9 5l7 7-7 7" />
                                    </svg>
                                </div>
                                <div>
                                    <div className="text-2xl font-bold text-foreground mb-0.5">{stat.value}</div>
                                    <div className="text-sm font-medium text-foreground/80">{stat.name}</div>
                                    <div className="text-xs text-muted-foreground">{stat.description}</div>
                                </div>
                            </div>
                        </div>
                    </Link>
                ))}
            </div>

            {/* Quick actions - Compact design */}
            <Card className="border shadow-card">
                <CardHeader className="pb-2 pt-4 px-4">
                    <CardTitle className="text-sm font-medium text-foreground">Quick Actions</CardTitle>
                </CardHeader>
                <CardContent className="flex flex-wrap gap-2 px-4 pb-4">
                    <Button asChild size="sm" variant="outline" className="h-8 text-xs gap-1.5 border-blue-200 text-blue-700 hover:bg-blue-50 hover:border-blue-300">
                        <Link href="/ingredients/new">
                            <svg xmlns="http://www.w3.org/2000/svg" className="h-3.5 w-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
                            </svg>
                            Add Ingredient
                        </Link>
                    </Button>
                    <Button asChild size="sm" variant="outline" className="h-8 text-xs gap-1.5 border-green-200 text-green-700 hover:bg-green-50 hover:border-green-300">
                        <Link href="/recipes/new">
                            <svg xmlns="http://www.w3.org/2000/svg" className="h-3.5 w-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
                            </svg>
                            Create Recipe
                        </Link>
                    </Button>
                    <Button asChild size="sm" variant="outline" className="h-8 text-xs gap-1.5 border-purple-200 text-purple-700 hover:bg-purple-50 hover:border-purple-300">
                        <Link href="/labels/generate">
                            <svg xmlns="http://www.w3.org/2000/svg" className="h-3.5 w-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                            </svg>
                            Generate Label
                        </Link>
                    </Button>
                </CardContent>
            </Card>

            {/* Info section - More compact grid */}
            <div className="grid gap-4 grid-cols-1 lg:grid-cols-2">
                <Card className="border shadow-card overflow-hidden">
                    <div className="h-1 bg-gradient-to-r from-teal-500 to-cyan-500"></div>
                    <CardHeader className="pb-2 pt-4 px-4">
                        <CardTitle className="text-sm font-medium text-foreground flex items-center gap-2">
                            <span className="w-2 h-2 rounded-full bg-teal-500"></span>
                            FDA 2020 Compliance
                        </CardTitle>
                    </CardHeader>
                    <CardContent className="px-4 pb-4">
                        <ul className="space-y-2 text-sm">
                            {[
                                'Updated Daily Values (2020)',
                                '21 CFR 101.9 Rounding Rules',
                                'Big 9 Allergen Tracking',
                                'Added Sugars Declaration'
                            ].map((item, i) => (
                                <li key={i} className="flex items-center gap-2 text-muted-foreground">
                                    <svg xmlns="http://www.w3.org/2000/svg" className="h-3.5 w-3.5 text-teal-600 shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M5 13l4 4L19 7" />
                                    </svg>
                                    <span>{item}</span>
                                </li>
                            ))}
                        </ul>
                    </CardContent>
                </Card>

                <Card className="border shadow-card overflow-hidden">
                    <div className="h-1 bg-gradient-to-r from-blue-500 to-indigo-500"></div>
                    <CardHeader className="pb-2 pt-4 px-4">
                        <CardTitle className="text-sm font-medium text-foreground flex items-center gap-2">
                            <span className="w-2 h-2 rounded-full bg-blue-500"></span>
                            USDA Integration
                        </CardTitle>
                    </CardHeader>
                    <CardContent className="px-4 pb-4">
                        <ul className="space-y-2 text-sm">
                            {[
                                'FoodData Central Database',
                                'One-Click Import',
                                'Full Nutrient Data',
                                'Branded & SR Legacy Data'
                            ].map((item, i) => (
                                <li key={i} className="flex items-center gap-2 text-muted-foreground">
                                    <svg xmlns="http://www.w3.org/2000/svg" className="h-3.5 w-3.5 text-blue-600 shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M5 13l4 4L19 7" />
                                    </svg>
                                    <span>{item}</span>
                                </li>
                            ))}
                        </ul>
                    </CardContent>
                </Card>
            </div>
        </div>
    );
}
