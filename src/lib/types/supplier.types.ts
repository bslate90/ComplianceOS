// Supplier and document related types

export interface Supplier {
    id: string;
    organization_id: string;
    name: string;
    contact_email: string | null;
    contact_phone: string | null;
    address: string | null;
    notes: string | null;
    created_at: string;
    updated_at: string;
}

export interface SupplierDocument {
    id: string;
    organization_id: string;
    supplier_id: string;
    name: string;
    document_type: 'spec_sheet' | 'coa' | 'allergen_declaration' | 'other';
    current_version: number;
    file_path: string;
    file_type: string;
    file_size_bytes: number | null;
    uploaded_by: string | null;
    uploaded_at: string;
    expires_at: string | null;
    linked_ingredient_id: string | null;
    // Joined fields
    supplier?: Supplier;
    uploader?: { full_name: string };
}

export interface DocumentVersion {
    id: string;
    document_id: string;
    version_number: number;
    file_path: string;
    file_size_bytes: number | null;
    uploaded_by: string | null;
    uploaded_at: string;
    change_notes: string | null;
    uploader?: { full_name: string };
}

export interface AuditLogEntry {
    id: string;
    organization_id: string;
    document_id: string | null;
    supplier_id: string | null;
    user_id: string | null;
    action: 'upload' | 'scan' | 'update' | 'delete' | 'create_ingredient' | 'view' | 'download';
    action_details: Record<string, unknown> | null;
    created_at: string;
    user?: { full_name: string };
}

// OCR extracted nutrition data
export interface ExtractedNutritionData {
    name?: string;
    brand?: string;
    serving_size_g?: number;
    calories?: number;
    total_fat_g?: number;
    saturated_fat_g?: number;
    trans_fat_g?: number;
    cholesterol_mg?: number;
    sodium_mg?: number;
    total_carbohydrates_g?: number;
    dietary_fiber_g?: number;
    total_sugars_g?: number;
    added_sugars_g?: number;
    protein_g?: number;
    vitamin_d_mcg?: number;
    calcium_mg?: number;
    iron_mg?: number;
    potassium_mg?: number;
    raw_text?: string;
    confidence?: number;
}
