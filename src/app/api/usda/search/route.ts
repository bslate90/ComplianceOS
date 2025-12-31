import { NextRequest, NextResponse } from 'next/server';
import { searchUSDAFoods, getUSDAFoodDetails } from '@/lib/usda/api';

export async function GET(request: NextRequest) {
    try {
        const { searchParams } = new URL(request.url);
        const query = searchParams.get('query');
        const fdcId = searchParams.get('fdcId');
        const page = parseInt(searchParams.get('page') || '1');

        const apiKey = process.env.USDA_API_KEY;
        if (!apiKey) {
            return NextResponse.json({ error: 'USDA API key not configured' }, { status: 500 });
        }

        // If fdcId is provided, get detailed food info
        if (fdcId) {
            const food = await getUSDAFoodDetails(parseInt(fdcId), apiKey);
            return NextResponse.json(food);
        }

        // Otherwise, search for foods
        if (!query) {
            return NextResponse.json({ error: 'Query or fdcId is required' }, { status: 400 });
        }

        const results = await searchUSDAFoods(query, apiKey, 25, page);
        return NextResponse.json(results);
    } catch (error) {
        console.error('USDA search error:', error);
        return NextResponse.json({ error: 'Failed to search USDA database' }, { status: 500 });
    }
}
