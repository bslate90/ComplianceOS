/**
 * USDA FoodData Central API Integration
 */

const USDA_API_BASE = 'https://api.nal.usda.gov/fdc/v1';

export interface USDASearchResult {
    fdcId: number;
    description: string;
    dataType: string;
    brandOwner?: string;
    brandName?: string;
    gtinUpc?: string;
    foodNutrients: USDANutrient[];
}

export interface USDANutrient {
    nutrientId: number;
    nutrientName: string;
    nutrientNumber: string;
    unitName: string;
    value: number;
}

export interface USDASearchResponse {
    totalHits: number;
    currentPage: number;
    totalPages: number;
    foods: USDASearchResult[];
}

/**
 * Search USDA FoodData Central database
 */
export async function searchUSDAFoods(
    query: string,
    apiKey: string,
    pageSize: number = 25,
    pageNumber: number = 1
): Promise<USDASearchResponse> {
    const url = new URL(`${USDA_API_BASE}/foods/search`);
    url.searchParams.set('api_key', apiKey);
    url.searchParams.set('query', query);
    url.searchParams.set('pageSize', pageSize.toString());
    url.searchParams.set('pageNumber', pageNumber.toString());

    // Prefer SR Legacy and Foundation data types for more complete nutrition data
    url.searchParams.set('dataType', 'Foundation,SR Legacy,Branded');

    const response = await fetch(url.toString());

    if (!response.ok) {
        throw new Error(`USDA API error: ${response.status} ${response.statusText}`);
    }

    return response.json();
}

/**
 * Get detailed food data by FDC ID
 */
export async function getUSDAFoodDetails(
    fdcId: number,
    apiKey: string
): Promise<USDASearchResult> {
    const url = `${USDA_API_BASE}/food/${fdcId}?api_key=${apiKey}`;

    const response = await fetch(url);

    if (!response.ok) {
        throw new Error(`USDA API error: ${response.status} ${response.statusText}`);
    }

    return response.json();
}
