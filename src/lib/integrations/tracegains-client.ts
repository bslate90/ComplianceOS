/**
 * TraceGains API Client
 * 
 * Provides integration with TraceGains Gather/Customer Management API
 * for accessing items, specifications, and ingredient data.
 * 
 * API Documentation: https://tracegains.net/api/
 * 
 * Note: TraceGains API requires a licensed API key (bearer token)
 * obtained from your TraceGains instance.
 */

const DEFAULT_BASE_URL = 'https://api.tracegains.net';

export interface TraceGainsConfig {
    apiKey: string;
    baseUrl?: string;
}

export interface TraceGainsItem {
    id: string;
    itemNumber: string;
    name: string;
    description?: string;
    category?: string;
    status?: string;
    supplierName?: string;
    supplierCode?: string;
    locations?: TraceGainsLocation[];
    specifications?: TraceGainsSpecification[];
    documents?: TraceGainsDocument[];
    customFields?: Record<string, unknown>;
    createdAt?: string;
    updatedAt?: string;
}

export interface TraceGainsLocation {
    id: string;
    name: string;
    code?: string;
    address?: string;
}

export interface TraceGainsSpecification {
    id: string;
    name: string;
    type: string;
    version?: string;
    status?: string;
    nutritionData?: TraceGainsNutrition;
    allergenData?: TraceGainsAllergens;
    ingredientDeclaration?: string;
}

export interface TraceGainsNutrition {
    servingSize?: number;
    servingSizeUnit?: string;
    calories?: number;
    totalFat?: number;
    saturatedFat?: number;
    transFat?: number;
    cholesterol?: number;
    sodium?: number;
    totalCarbohydrates?: number;
    dietaryFiber?: number;
    totalSugars?: number;
    addedSugars?: number;
    protein?: number;
    vitaminD?: number;
    calcium?: number;
    iron?: number;
    potassium?: number;
}

export interface TraceGainsAllergens {
    containsMilk?: boolean;
    containsEggs?: boolean;
    containsFish?: boolean;
    containsShellfish?: boolean;
    containsTreeNuts?: boolean;
    containsPeanuts?: boolean;
    containsWheat?: boolean;
    containsSoybeans?: boolean;
    containsSesame?: boolean;
    allergenStatement?: string;
}

export interface TraceGainsDocument {
    id: string;
    name: string;
    type: string;
    fileUrl?: string;
    expirationDate?: string;
    status?: string;
}

export interface TraceGainsSearchResult {
    items: TraceGainsItem[];
    totalCount: number;
    page: number;
    pageSize: number;
}

export interface TraceGainsApiError {
    code: string;
    message: string;
    details?: unknown;
}

/**
 * TraceGains API Client
 */
export class TraceGainsClient {
    private apiKey: string;
    private baseUrl: string;

    constructor(config: TraceGainsConfig) {
        this.apiKey = config.apiKey;
        this.baseUrl = config.baseUrl || DEFAULT_BASE_URL;
    }

    /**
     * Make an authenticated request to the TraceGains API
     */
    private async request<T>(
        endpoint: string,
        options: RequestInit = {}
    ): Promise<T> {
        const url = `${this.baseUrl}${endpoint}`;

        const response = await fetch(url, {
            ...options,
            headers: {
                'Authorization': `Bearer ${this.apiKey}`,
                'Content-Type': 'application/json',
                'Accept': 'application/json',
                ...options.headers,
            },
        });

        if (!response.ok) {
            let errorMessage = `TraceGains API error: ${response.status} ${response.statusText}`;
            try {
                const errorData = await response.json();
                errorMessage = errorData.message || errorData.error || errorMessage;
            } catch {
                // Keep default error message
            }
            throw new Error(errorMessage);
        }

        return response.json();
    }

    /**
     * Test the connection to TraceGains
     */
    async testConnection(): Promise<{ success: boolean; message: string }> {
        try {
            // Try to fetch a small set of items to verify connection
            await this.request('/api/v1/items?pageSize=1');
            return { success: true, message: 'Successfully connected to TraceGains' };
        } catch (error) {
            return {
                success: false,
                message: error instanceof Error ? error.message : 'Failed to connect to TraceGains'
            };
        }
    }

    /**
     * Get all items with pagination
     */
    async getItems(
        page: number = 1,
        pageSize: number = 50,
        search?: string
    ): Promise<TraceGainsSearchResult> {
        let endpoint = `/api/v1/items?page=${page}&pageSize=${pageSize}`;

        if (search) {
            endpoint += `&search=${encodeURIComponent(search)}`;
        }

        const response = await this.request<{
            data: TraceGainsItem[];
            totalCount: number;
            page: number;
            pageSize: number;
        }>(endpoint);

        return {
            items: response.data || [],
            totalCount: response.totalCount || 0,
            page: response.page || page,
            pageSize: response.pageSize || pageSize,
        };
    }

    /**
     * Get a single item by ID
     */
    async getItem(itemId: string): Promise<TraceGainsItem> {
        return this.request<TraceGainsItem>(`/api/v1/items/${itemId}`);
    }

    /**
     * Search items by name or item number
     */
    async searchItems(query: string, pageSize: number = 25): Promise<TraceGainsItem[]> {
        const result = await this.getItems(1, pageSize, query);
        return result.items;
    }

    /**
     * Get item specifications
     */
    async getItemSpecifications(itemId: string): Promise<TraceGainsSpecification[]> {
        const response = await this.request<{ data: TraceGainsSpecification[] }>(
            `/api/v1/items/${itemId}/specifications`
        );
        return response.data || [];
    }

    /**
     * Get item documents
     */
    async getItemDocuments(itemId: string): Promise<TraceGainsDocument[]> {
        const response = await this.request<{ data: TraceGainsDocument[] }>(
            `/api/v1/items/${itemId}/documents`
        );
        return response.data || [];
    }

    /**
     * Get all item categories
     */
    async getCategories(): Promise<{ id: string; name: string }[]> {
        const response = await this.request<{ data: { id: string; name: string }[] }>(
            '/api/v1/categories'
        );
        return response.data || [];
    }

    /**
     * Fetch all items (handles pagination automatically)
     * Use with caution for large datasets
     */
    async fetchAllItems(progressCallback?: (loaded: number, total: number) => void): Promise<TraceGainsItem[]> {
        const allItems: TraceGainsItem[] = [];
        let page = 1;
        const pageSize = 100;
        let totalCount = 0;

        do {
            const result = await this.getItems(page, pageSize);
            allItems.push(...result.items);
            totalCount = result.totalCount;

            if (progressCallback) {
                progressCallback(allItems.length, totalCount);
            }

            page++;
        } while (allItems.length < totalCount);

        return allItems;
    }
}

/**
 * Map TraceGains item to our ingredient format
 */
export function mapTraceGainsToIngredient(item: TraceGainsItem, spec?: TraceGainsSpecification) {
    const nutrition = spec?.nutritionData;
    const allergens = spec?.allergenData;

    return {
        name: item.name,
        tracegains_item_id: item.id,
        user_code: item.itemNumber || null,
        brand: item.supplierName || null,
        ingredient_declaration: spec?.ingredientDeclaration || null,

        // Nutrition (per 100g or per serving - adjust as needed)
        serving_size_g: nutrition?.servingSize || 100,
        calories: nutrition?.calories || null,
        total_fat_g: nutrition?.totalFat || null,
        saturated_fat_g: nutrition?.saturatedFat || null,
        trans_fat_g: nutrition?.transFat || null,
        cholesterol_mg: nutrition?.cholesterol || null,
        sodium_mg: nutrition?.sodium || null,
        total_carbohydrates_g: nutrition?.totalCarbohydrates || null,
        dietary_fiber_g: nutrition?.dietaryFiber || null,
        total_sugars_g: nutrition?.totalSugars || null,
        added_sugars_g: nutrition?.addedSugars || null,
        protein_g: nutrition?.protein || null,
        vitamin_d_mcg: nutrition?.vitaminD || null,
        calcium_mg: nutrition?.calcium || null,
        iron_mg: nutrition?.iron || null,
        potassium_mg: nutrition?.potassium || null,

        // Allergens
        contains_milk: allergens?.containsMilk || false,
        contains_eggs: allergens?.containsEggs || false,
        contains_fish: allergens?.containsFish || false,
        contains_shellfish: allergens?.containsShellfish || false,
        contains_tree_nuts: allergens?.containsTreeNuts || false,
        contains_peanuts: allergens?.containsPeanuts || false,
        contains_wheat: allergens?.containsWheat || false,
        contains_soybeans: allergens?.containsSoybeans || false,
        contains_sesame: allergens?.containsSesame || false,
    };
}

/**
 * Create a TraceGains client from encrypted credentials
 * Decryption should happen server-side only
 */
export function createTraceGainsClient(apiKey: string, baseUrl?: string): TraceGainsClient {
    return new TraceGainsClient({ apiKey, baseUrl });
}
