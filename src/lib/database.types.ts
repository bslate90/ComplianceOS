export type Json =
    | string
    | number
    | boolean
    | null
    | { [key: string]: Json | undefined }
    | Json[]

export interface Database {
    public: {
        Tables: {
            organizations: {
                Row: {
                    id: string
                    name: string
                    slug: string
                    created_at: string
                }
                Insert: {
                    id?: string
                    name: string
                    slug: string
                    created_at?: string
                }
                Update: {
                    id?: string
                    name?: string
                    slug?: string
                    created_at?: string
                }
                Relationships: []
            }
            profiles: {
                Row: {
                    id: string
                    organization_id: string | null
                    full_name: string | null
                    role: string
                    created_at: string
                }
                Insert: {
                    id: string
                    organization_id?: string | null
                    full_name?: string | null
                    role?: string
                    created_at?: string
                }
                Update: {
                    id?: string
                    organization_id?: string | null
                    full_name?: string | null
                    role?: string
                    created_at?: string
                }
                Relationships: [
                    {
                        foreignKeyName: "profiles_organization_id_fkey"
                        columns: ["organization_id"]
                        referencedRelation: "organizations"
                        referencedColumns: ["id"]
                    }
                ]
            }
            ingredients: {
                Row: {
                    id: string
                    organization_id: string
                    name: string
                    brand: string | null
                    usda_fdc_id: number | null
                    serving_size_g: number
                    calories: number | null
                    total_fat_g: number | null
                    saturated_fat_g: number | null
                    trans_fat_g: number | null
                    cholesterol_mg: number | null
                    sodium_mg: number | null
                    total_carbohydrates_g: number | null
                    dietary_fiber_g: number | null
                    total_sugars_g: number | null
                    added_sugars_g: number | null
                    protein_g: number | null
                    vitamin_d_mcg: number | null
                    calcium_mg: number | null
                    iron_mg: number | null
                    potassium_mg: number | null
                    contains_milk: boolean
                    contains_eggs: boolean
                    contains_fish: boolean
                    contains_shellfish: boolean
                    contains_tree_nuts: boolean
                    contains_peanuts: boolean
                    contains_wheat: boolean
                    contains_soybeans: boolean
                    contains_sesame: boolean
                    created_at: string
                    updated_at: string
                    user_code: string | null
                }
                Insert: {
                    id?: string
                    organization_id: string
                    name: string
                    brand?: string | null
                    usda_fdc_id?: number | null
                    serving_size_g?: number
                    calories?: number | null
                    total_fat_g?: number | null
                    saturated_fat_g?: number | null
                    trans_fat_g?: number | null
                    cholesterol_mg?: number | null
                    sodium_mg?: number | null
                    total_carbohydrates_g?: number | null
                    dietary_fiber_g?: number | null
                    total_sugars_g?: number | null
                    added_sugars_g?: number | null
                    protein_g?: number | null
                    vitamin_d_mcg?: number | null
                    calcium_mg?: number | null
                    iron_mg?: number | null
                    potassium_mg?: number | null
                    contains_milk?: boolean
                    contains_eggs?: boolean
                    contains_fish?: boolean
                    contains_shellfish?: boolean
                    contains_tree_nuts?: boolean
                    contains_peanuts?: boolean
                    contains_wheat?: boolean
                    contains_soybeans?: boolean
                    contains_sesame?: boolean
                    created_at?: string
                    updated_at?: string
                    user_code?: string | null
                }
                Update: {
                    id?: string
                    organization_id?: string
                    name?: string
                    brand?: string | null
                    usda_fdc_id?: number | null
                    serving_size_g?: number
                    calories?: number | null
                    total_fat_g?: number | null
                    saturated_fat_g?: number | null
                    trans_fat_g?: number | null
                    cholesterol_mg?: number | null
                    sodium_mg?: number | null
                    total_carbohydrates_g?: number | null
                    dietary_fiber_g?: number | null
                    total_sugars_g?: number | null
                    added_sugars_g?: number | null
                    protein_g?: number | null
                    vitamin_d_mcg?: number | null
                    calcium_mg?: number | null
                    iron_mg?: number | null
                    potassium_mg?: number | null
                    contains_milk?: boolean
                    contains_eggs?: boolean
                    contains_fish?: boolean
                    contains_shellfish?: boolean
                    contains_tree_nuts?: boolean
                    contains_peanuts?: boolean
                    contains_wheat?: boolean
                    contains_soybeans?: boolean
                    contains_sesame?: boolean
                    created_at?: string
                    updated_at?: string
                    user_code?: string | null
                }
                Relationships: [
                    {
                        foreignKeyName: "ingredients_organization_id_fkey"
                        columns: ["organization_id"]
                        referencedRelation: "organizations"
                        referencedColumns: ["id"]
                    }
                ]
            }
            recipes: {
                Row: {
                    id: string
                    organization_id: string
                    name: string
                    description: string | null
                    recipe_yield_g: number
                    serving_size_g: number
                    serving_size_description: string | null
                    servings_per_container: number | null
                    calculated_nutrition: Json | null
                    allergen_summary: Json | null
                    status: string
                    racc_category_id: string | null
                    created_at: string
                    updated_at: string
                }
                Insert: {
                    id?: string
                    organization_id: string
                    name: string
                    description?: string | null
                    recipe_yield_g: number
                    serving_size_g: number
                    serving_size_description?: string | null
                    servings_per_container?: number | null
                    calculated_nutrition?: Json | null
                    allergen_summary?: Json | null
                    status?: string
                    racc_category_id?: string | null
                    created_at?: string
                    updated_at?: string
                }
                Update: {
                    id?: string
                    organization_id?: string
                    name?: string
                    description?: string | null
                    recipe_yield_g?: number
                    serving_size_g?: number
                    serving_size_description?: string | null
                    servings_per_container?: number | null
                    calculated_nutrition?: Json | null
                    allergen_summary?: Json | null
                    status?: string
                    racc_category_id?: string | null
                    created_at?: string
                    updated_at?: string
                }
                Relationships: [
                    {
                        foreignKeyName: "recipes_organization_id_fkey"
                        columns: ["organization_id"]
                        referencedRelation: "organizations"
                        referencedColumns: ["id"]
                    }
                ]
            }
            recipe_ingredients: {
                Row: {
                    id: string
                    recipe_id: string
                    ingredient_id: string
                    amount_g: number
                    sort_order: number
                    created_at: string
                }
                Insert: {
                    id?: string
                    recipe_id: string
                    ingredient_id: string
                    amount_g: number
                    sort_order?: number
                    created_at?: string
                }
                Update: {
                    id?: string
                    recipe_id?: string
                    ingredient_id?: string
                    amount_g?: number
                    sort_order?: number
                    created_at?: string
                }
                Relationships: [
                    {
                        foreignKeyName: "recipe_ingredients_recipe_id_fkey"
                        columns: ["recipe_id"]
                        referencedRelation: "recipes"
                        referencedColumns: ["id"]
                    },
                    {
                        foreignKeyName: "recipe_ingredients_ingredient_id_fkey"
                        columns: ["ingredient_id"]
                        referencedRelation: "ingredients"
                        referencedColumns: ["id"]
                    }
                ]
            }
            labels: {
                Row: {
                    id: string
                    organization_id: string
                    recipe_id: string
                    name: string
                    format: 'fda_vertical' | 'standard_vertical' | 'tabular' | 'linear'
                    simplified: boolean | null // Modifier: omit insignificant nutrients
                    nutrition_data: Json
                    ingredient_statement: string
                    allergen_statement: string | null
                    pdf_url: string | null
                    serving_size_g: number | null
                    serving_size_household: string | null
                    servings_per_container: number | null
                    package_surface_area: number | null
                    compliance_status: 'compliant' | 'warnings' | 'errors' | 'pending' | 'not_validated' | null
                    validation_results: Json | null
                    validated_at: string | null
                    claim_statements: Json | null
                    is_dual_column: boolean | null
                    prepared_nutrition_data: Json | null
                    created_at: string
                }
                Insert: {
                    id?: string
                    organization_id: string
                    recipe_id: string
                    name: string
                    format?: 'fda_vertical' | 'standard_vertical' | 'tabular' | 'linear'
                    simplified?: boolean | null
                    nutrition_data: Json
                    ingredient_statement: string
                    allergen_statement?: string | null
                    pdf_url?: string | null
                    serving_size_g?: number | null
                    serving_size_household?: string | null
                    servings_per_container?: number | null
                    package_surface_area?: number | null
                    compliance_status?: 'compliant' | 'warnings' | 'errors' | 'pending' | 'not_validated' | null
                    validation_results?: Json | null
                    validated_at?: string | null
                    claim_statements?: Json | null
                    is_dual_column?: boolean | null
                    prepared_nutrition_data?: Json | null
                    created_at?: string
                }
                Update: {
                    id?: string
                    organization_id?: string
                    recipe_id?: string
                    name?: string
                    format?: 'fda_vertical' | 'standard_vertical' | 'tabular' | 'linear'
                    simplified?: boolean | null
                    nutrition_data?: Json
                    ingredient_statement?: string
                    allergen_statement?: string | null
                    pdf_url?: string | null
                    serving_size_g?: number | null
                    serving_size_household?: string | null
                    servings_per_container?: number | null
                    package_surface_area?: number | null
                    compliance_status?: 'compliant' | 'warnings' | 'errors' | 'pending' | 'not_validated' | null
                    validation_results?: Json | null
                    validated_at?: string | null
                    claim_statements?: Json | null
                    is_dual_column?: boolean | null
                    prepared_nutrition_data?: Json | null
                    created_at?: string
                }
                Relationships: [
                    {
                        foreignKeyName: "labels_organization_id_fkey"
                        columns: ["organization_id"]
                        referencedRelation: "organizations"
                        referencedColumns: ["id"]
                    },
                    {
                        foreignKeyName: "labels_recipe_id_fkey"
                        columns: ["recipe_id"]
                        referencedRelation: "recipes"
                        referencedColumns: ["id"]
                    }
                ]
            }
            suppliers: {
                Row: {
                    id: string
                    organization_id: string
                    name: string
                    contact_email: string | null
                    contact_phone: string | null
                    address: string | null
                    notes: string | null
                    created_at: string
                    updated_at: string
                }
                Insert: {
                    id?: string
                    organization_id: string
                    name: string
                    contact_email?: string | null
                    contact_phone?: string | null
                    address?: string | null
                    notes?: string | null
                    created_at?: string
                    updated_at?: string
                }
                Update: {
                    id?: string
                    organization_id?: string
                    name?: string
                    contact_email?: string | null
                    contact_phone?: string | null
                    address?: string | null
                    notes?: string | null
                    created_at?: string
                    updated_at?: string
                }
                Relationships: [
                    {
                        foreignKeyName: "suppliers_organization_id_fkey"
                        columns: ["organization_id"]
                        referencedRelation: "organizations"
                        referencedColumns: ["id"]
                    }
                ]
            }
            supplier_documents: {
                Row: {
                    id: string
                    organization_id: string
                    supplier_id: string
                    name: string
                    document_type: string
                    current_version: number
                    file_path: string
                    file_type: string
                    file_size_bytes: number | null
                    uploaded_by: string | null
                    uploaded_at: string
                    expires_at: string | null
                    linked_ingredient_id: string | null
                }
                Insert: {
                    id?: string
                    organization_id: string
                    supplier_id: string
                    name: string
                    document_type?: string
                    current_version?: number
                    file_path: string
                    file_type: string
                    file_size_bytes?: number | null
                    uploaded_by?: string | null
                    uploaded_at?: string
                    expires_at?: string | null
                    linked_ingredient_id?: string | null
                }
                Update: {
                    id?: string
                    organization_id?: string
                    supplier_id?: string
                    name?: string
                    document_type?: string
                    current_version?: number
                    file_path?: string
                    file_type?: string
                    file_size_bytes?: number | null
                    uploaded_by?: string | null
                    uploaded_at?: string
                    expires_at?: string | null
                    linked_ingredient_id?: string | null
                }
                Relationships: [
                    {
                        foreignKeyName: "supplier_documents_organization_id_fkey"
                        columns: ["organization_id"]
                        referencedRelation: "organizations"
                        referencedColumns: ["id"]
                    },
                    {
                        foreignKeyName: "supplier_documents_supplier_id_fkey"
                        columns: ["supplier_id"]
                        referencedRelation: "suppliers"
                        referencedColumns: ["id"]
                    }
                ]
            }
            document_versions: {
                Row: {
                    id: string
                    document_id: string
                    version_number: number
                    file_path: string
                    file_size_bytes: number | null
                    uploaded_by: string | null
                    uploaded_at: string
                    change_notes: string | null
                }
                Insert: {
                    id?: string
                    document_id: string
                    version_number: number
                    file_path: string
                    file_size_bytes?: number | null
                    uploaded_by?: string | null
                    uploaded_at?: string
                    change_notes?: string | null
                }
                Update: {
                    id?: string
                    document_id?: string
                    version_number?: number
                    file_path?: string
                    file_size_bytes?: number | null
                    uploaded_by?: string | null
                    uploaded_at?: string
                    change_notes?: string | null
                }
                Relationships: [
                    {
                        foreignKeyName: "document_versions_document_id_fkey"
                        columns: ["document_id"]
                        referencedRelation: "supplier_documents"
                        referencedColumns: ["id"]
                    }
                ]
            }
            document_audit_log: {
                Row: {
                    id: string
                    organization_id: string
                    document_id: string | null
                    supplier_id: string | null
                    user_id: string | null
                    action: string
                    action_details: Json | null
                    ip_address: string | null
                    user_agent: string | null
                    created_at: string
                }
                Insert: {
                    id?: string
                    organization_id: string
                    document_id?: string | null
                    supplier_id?: string | null
                    user_id?: string | null
                    action: string
                    action_details?: Json | null
                    ip_address?: string | null
                    user_agent?: string | null
                    created_at?: string
                }
                Update: {
                    id?: string
                    organization_id?: string
                    document_id?: string | null
                    supplier_id?: string | null
                    user_id?: string | null
                    action?: string
                    action_details?: Json | null
                    ip_address?: string | null
                    user_agent?: string | null
                    created_at?: string
                }
                Relationships: [
                    {
                        foreignKeyName: "document_audit_log_organization_id_fkey"
                        columns: ["organization_id"]
                        referencedRelation: "organizations"
                        referencedColumns: ["id"]
                    }
                ]
            }
            compliance_rules: {
                Row: {
                    id: string
                    organization_id: string | null
                    rule_type: string
                    rule_category: 'required' | 'conditional' | 'optional' | 'prohibited'
                    rule_name: string
                    description: string | null
                    requirements: Json
                    cfr_reference: string | null
                    guidance_reference: string | null
                    severity: 'error' | 'warning' | 'info'
                    active: boolean
                    applicable_to: Json | null
                    created_at: string
                    updated_at: string
                }
                Insert: {
                    id?: string
                    organization_id?: string | null
                    rule_type: string
                    rule_category: 'required' | 'conditional' | 'optional' | 'prohibited'
                    rule_name: string
                    description?: string | null
                    requirements: Json
                    cfr_reference?: string | null
                    guidance_reference?: string | null
                    severity?: 'error' | 'warning' | 'info'
                    active?: boolean
                    applicable_to?: Json | null
                    created_at?: string
                    updated_at?: string
                }
                Update: {
                    id?: string
                    organization_id?: string | null
                    rule_type?: string
                    rule_category?: 'required' | 'conditional' | 'optional' | 'prohibited'
                    rule_name?: string
                    description?: string | null
                    requirements?: Json
                    cfr_reference?: string | null
                    guidance_reference?: string | null
                    severity?: 'error' | 'warning' | 'info'
                    active?: boolean
                    applicable_to?: Json | null
                    created_at?: string
                    updated_at?: string
                }
                Relationships: [
                    {
                        foreignKeyName: "compliance_rules_organization_id_fkey"
                        columns: ["organization_id"]
                        referencedRelation: "organizations"
                        referencedColumns: ["id"]
                    }
                ]
            }
            recipe_audit_log: {
                Row: {
                    id: string
                    organization_id: string | null
                    recipe_id: string | null
                    recipe_name: string | null
                    user_id: string | null
                    user_name: string | null
                    action: string
                    changes: Json | null
                    created_at: string
                }
                Insert: {
                    id?: string
                    organization_id?: string | null
                    recipe_id?: string | null
                    recipe_name?: string | null
                    user_id?: string | null
                    user_name?: string | null
                    action: string
                    changes?: Json | null
                    created_at?: string
                }
                Update: {
                    id?: string
                    organization_id?: string | null
                    recipe_id?: string | null
                    recipe_name?: string | null
                    user_id?: string | null
                    user_name?: string | null
                    action?: string
                    changes?: Json | null
                    created_at?: string
                }
                Relationships: [
                    {
                        foreignKeyName: "recipe_audit_log_organization_id_fkey"
                        columns: ["organization_id"]
                        referencedRelation: "organizations"
                        referencedColumns: ["id"]
                    },
                    {
                        foreignKeyName: "recipe_audit_log_recipe_id_fkey"
                        columns: ["recipe_id"]
                        referencedRelation: "recipes"
                        referencedColumns: ["id"]
                    }
                ]
            }
            organization_settings: {
                Row: {
                    id: string
                    organization_id: string
                    default_label_format: string
                    default_serving_size_g: number
                    default_servings_per_container: number
                    default_household_measure: string | null
                    show_dual_column: boolean
                    logo_url: string | null
                    primary_color: string
                    secondary_color: string
                    company_address: string | null
                    company_phone: string | null
                    company_website: string | null
                    general_disclaimer: string | null
                    footer_text: string | null
                    email_compliance_alerts: boolean
                    email_expiration_reminders: boolean
                    email_weekly_digest: boolean
                    email_team_activity: boolean
                    expiration_reminder_days: number
                    created_at: string
                    updated_at: string
                }
                Insert: {
                    id?: string
                    organization_id: string
                    default_label_format?: string
                    default_serving_size_g?: number
                    default_servings_per_container?: number
                    default_household_measure?: string | null
                    show_dual_column?: boolean
                    logo_url?: string | null
                    primary_color?: string
                    secondary_color?: string
                    company_address?: string | null
                    company_phone?: string | null
                    company_website?: string | null
                    general_disclaimer?: string | null
                    footer_text?: string | null
                    email_compliance_alerts?: boolean
                    email_expiration_reminders?: boolean
                    email_weekly_digest?: boolean
                    email_team_activity?: boolean
                    expiration_reminder_days?: number
                    created_at?: string
                    updated_at?: string
                }
                Update: {
                    id?: string
                    organization_id?: string
                    default_label_format?: string
                    default_serving_size_g?: number
                    default_servings_per_container?: number
                    default_household_measure?: string | null
                    show_dual_column?: boolean
                    logo_url?: string | null
                    primary_color?: string
                    secondary_color?: string
                    company_address?: string | null
                    company_phone?: string | null
                    company_website?: string | null
                    general_disclaimer?: string | null
                    footer_text?: string | null
                    email_compliance_alerts?: boolean
                    email_expiration_reminders?: boolean
                    email_weekly_digest?: boolean
                    email_team_activity?: boolean
                    expiration_reminder_days?: number
                    created_at?: string
                    updated_at?: string
                }
                Relationships: [
                    {
                        foreignKeyName: "organization_settings_organization_id_fkey"
                        columns: ["organization_id"]
                        referencedRelation: "organizations"
                        referencedColumns: ["id"]
                    }
                ]
            }
            user_permissions: {
                Row: {
                    id: string
                    profile_id: string
                    organization_id: string
                    can_manage_ingredients: boolean
                    can_manage_recipes: boolean
                    can_manage_labels: boolean
                    can_manage_suppliers: boolean
                    can_export_data: boolean
                    can_import_data: boolean
                    can_manage_team: boolean
                    can_manage_settings: boolean
                    can_view_audit_log: boolean
                    can_delete_data: boolean
                    created_at: string
                    updated_at: string
                }
                Insert: {
                    id?: string
                    profile_id: string
                    organization_id: string
                    can_manage_ingredients?: boolean
                    can_manage_recipes?: boolean
                    can_manage_labels?: boolean
                    can_manage_suppliers?: boolean
                    can_export_data?: boolean
                    can_import_data?: boolean
                    can_manage_team?: boolean
                    can_manage_settings?: boolean
                    can_view_audit_log?: boolean
                    can_delete_data?: boolean
                    created_at?: string
                    updated_at?: string
                }
                Update: {
                    id?: string
                    profile_id?: string
                    organization_id?: string
                    can_manage_ingredients?: boolean
                    can_manage_recipes?: boolean
                    can_manage_labels?: boolean
                    can_manage_suppliers?: boolean
                    can_export_data?: boolean
                    can_import_data?: boolean
                    can_manage_team?: boolean
                    can_manage_settings?: boolean
                    can_view_audit_log?: boolean
                    can_delete_data?: boolean
                    created_at?: string
                    updated_at?: string
                }
                Relationships: [
                    {
                        foreignKeyName: "user_permissions_profile_id_fkey"
                        columns: ["profile_id"]
                        referencedRelation: "profiles"
                        referencedColumns: ["id"]
                    },
                    {
                        foreignKeyName: "user_permissions_organization_id_fkey"
                        columns: ["organization_id"]
                        referencedRelation: "organizations"
                        referencedColumns: ["id"]
                    }
                ]
            }
            organization_audit_log: {
                Row: {
                    id: string
                    organization_id: string
                    user_id: string | null
                    user_name: string | null
                    user_email: string | null
                    action: string
                    entity_type: string
                    entity_id: string | null
                    entity_name: string | null
                    old_values: Json | null
                    new_values: Json | null
                    change_summary: string | null
                    ip_address: string | null
                    user_agent: string | null
                    created_at: string
                }
                Insert: {
                    id?: string
                    organization_id: string
                    user_id?: string | null
                    user_name?: string | null
                    user_email?: string | null
                    action: string
                    entity_type: string
                    entity_id?: string | null
                    entity_name?: string | null
                    old_values?: Json | null
                    new_values?: Json | null
                    change_summary?: string | null
                    ip_address?: string | null
                    user_agent?: string | null
                    created_at?: string
                }
                Update: {
                    id?: string
                    organization_id?: string
                    user_id?: string | null
                    user_name?: string | null
                    user_email?: string | null
                    action?: string
                    entity_type?: string
                    entity_id?: string | null
                    entity_name?: string | null
                    old_values?: Json | null
                    new_values?: Json | null
                    change_summary?: string | null
                    ip_address?: string | null
                    user_agent?: string | null
                    created_at?: string
                }
                Relationships: [
                    {
                        foreignKeyName: "organization_audit_log_organization_id_fkey"
                        columns: ["organization_id"]
                        referencedRelation: "organizations"
                        referencedColumns: ["id"]
                    },
                    {
                        foreignKeyName: "organization_audit_log_user_id_fkey"
                        columns: ["user_id"]
                        referencedRelation: "profiles"
                        referencedColumns: ["id"]
                    }
                ]
            }
            webhook_configurations: {
                Row: {
                    id: string
                    organization_id: string
                    name: string
                    provider: string
                    webhook_url: string | null
                    api_key: string | null
                    api_secret: string | null
                    plex_company_code: string | null
                    plex_data_source_key: string | null
                    plex_environment: string
                    sync_ingredients: boolean
                    sync_recipes: boolean
                    sync_nutrition: boolean
                    sync_compliance: boolean
                    auto_generate_reports: boolean
                    is_active: boolean
                    last_sync_at: string | null
                    last_error: string | null
                    created_at: string
                    updated_at: string
                }
                Insert: {
                    id?: string
                    organization_id: string
                    name: string
                    provider?: string
                    webhook_url?: string | null
                    api_key?: string | null
                    api_secret?: string | null
                    plex_company_code?: string | null
                    plex_data_source_key?: string | null
                    plex_environment?: string
                    sync_ingredients?: boolean
                    sync_recipes?: boolean
                    sync_nutrition?: boolean
                    sync_compliance?: boolean
                    auto_generate_reports?: boolean
                    is_active?: boolean
                    last_sync_at?: string | null
                    last_error?: string | null
                    created_at?: string
                    updated_at?: string
                }
                Update: {
                    id?: string
                    organization_id?: string
                    name?: string
                    provider?: string
                    webhook_url?: string | null
                    api_key?: string | null
                    api_secret?: string | null
                    plex_company_code?: string | null
                    plex_data_source_key?: string | null
                    plex_environment?: string
                    sync_ingredients?: boolean
                    sync_recipes?: boolean
                    sync_nutrition?: boolean
                    sync_compliance?: boolean
                    auto_generate_reports?: boolean
                    is_active?: boolean
                    last_sync_at?: string | null
                    last_error?: string | null
                    created_at?: string
                    updated_at?: string
                }
                Relationships: [
                    {
                        foreignKeyName: "webhook_configurations_organization_id_fkey"
                        columns: ["organization_id"]
                        referencedRelation: "organizations"
                        referencedColumns: ["id"]
                    }
                ]
            }
            webhook_events: {
                Row: {
                    id: string
                    organization_id: string
                    webhook_config_id: string | null
                    event_type: string
                    source: string
                    external_id: string | null
                    payload: Json
                    headers: Json | null
                    status: string
                    processed_at: string | null
                    error_message: string | null
                    retry_count: number
                    recipe_id: string | null
                    compliance_report_id: string | null
                    created_at: string
                }
                Insert: {
                    id?: string
                    organization_id: string
                    webhook_config_id?: string | null
                    event_type: string
                    source?: string
                    external_id?: string | null
                    payload: Json
                    headers?: Json | null
                    status?: string
                    processed_at?: string | null
                    error_message?: string | null
                    retry_count?: number
                    recipe_id?: string | null
                    compliance_report_id?: string | null
                    created_at?: string
                }
                Update: {
                    id?: string
                    organization_id?: string
                    webhook_config_id?: string | null
                    event_type?: string
                    source?: string
                    external_id?: string | null
                    payload?: Json
                    headers?: Json | null
                    status?: string
                    processed_at?: string | null
                    error_message?: string | null
                    retry_count?: number
                    recipe_id?: string | null
                    compliance_report_id?: string | null
                    created_at?: string
                }
                Relationships: [
                    {
                        foreignKeyName: "webhook_events_organization_id_fkey"
                        columns: ["organization_id"]
                        referencedRelation: "organizations"
                        referencedColumns: ["id"]
                    },
                    {
                        foreignKeyName: "webhook_events_webhook_config_id_fkey"
                        columns: ["webhook_config_id"]
                        referencedRelation: "webhook_configurations"
                        referencedColumns: ["id"]
                    }
                ]
            }
            compliance_reports: {
                Row: {
                    id: string
                    organization_id: string
                    recipe_id: string | null
                    label_id: string | null
                    trigger_source: string
                    webhook_event_id: string | null
                    report_type: string
                    status: string
                    overall_status: string | null
                    total_checks: number
                    passed_checks: number
                    warning_checks: number
                    failed_checks: number
                    results: Json | null
                    summary: string | null
                    recommendations: Json | null
                    generated_by: string | null
                    generated_at: string | null
                    expires_at: string | null
                    created_at: string
                    updated_at: string
                }
                Insert: {
                    id?: string
                    organization_id: string
                    recipe_id?: string | null
                    label_id?: string | null
                    trigger_source?: string
                    webhook_event_id?: string | null
                    report_type?: string
                    status?: string
                    overall_status?: string | null
                    total_checks?: number
                    passed_checks?: number
                    warning_checks?: number
                    failed_checks?: number
                    results?: Json | null
                    summary?: string | null
                    recommendations?: Json | null
                    generated_by?: string | null
                    generated_at?: string | null
                    expires_at?: string | null
                    created_at?: string
                    updated_at?: string
                }
                Update: {
                    id?: string
                    organization_id?: string
                    recipe_id?: string | null
                    label_id?: string | null
                    trigger_source?: string
                    webhook_event_id?: string | null
                    report_type?: string
                    status?: string
                    overall_status?: string | null
                    total_checks?: number
                    passed_checks?: number
                    warning_checks?: number
                    failed_checks?: number
                    results?: Json | null
                    summary?: string | null
                    recommendations?: Json | null
                    generated_by?: string | null
                    generated_at?: string | null
                    expires_at?: string | null
                    created_at?: string
                    updated_at?: string
                }
                Relationships: [
                    {
                        foreignKeyName: "compliance_reports_organization_id_fkey"
                        columns: ["organization_id"]
                        referencedRelation: "organizations"
                        referencedColumns: ["id"]
                    },
                    {
                        foreignKeyName: "compliance_reports_recipe_id_fkey"
                        columns: ["recipe_id"]
                        referencedRelation: "recipes"
                        referencedColumns: ["id"]
                    }
                ]
            }
            plex_sync_queue: {
                Row: {
                    id: string
                    organization_id: string
                    webhook_config_id: string | null
                    entity_type: string
                    entity_id: string
                    action: string
                    payload: Json
                    status: string
                    attempts: number
                    max_attempts: number
                    last_attempt_at: string | null
                    next_attempt_at: string | null
                    error_message: string | null
                    response_data: Json | null
                    created_at: string
                }
                Insert: {
                    id?: string
                    organization_id: string
                    webhook_config_id?: string | null
                    entity_type: string
                    entity_id: string
                    action: string
                    payload: Json
                    status?: string
                    attempts?: number
                    max_attempts?: number
                    last_attempt_at?: string | null
                    next_attempt_at?: string | null
                    error_message?: string | null
                    response_data?: Json | null
                    created_at?: string
                }
                Update: {
                    id?: string
                    organization_id?: string
                    webhook_config_id?: string | null
                    entity_type?: string
                    entity_id?: string
                    action?: string
                    payload?: Json
                    status?: string
                    attempts?: number
                    max_attempts?: number
                    last_attempt_at?: string | null
                    next_attempt_at?: string | null
                    error_message?: string | null
                    response_data?: Json | null
                    created_at?: string
                }
                Relationships: [
                    {
                        foreignKeyName: "plex_sync_queue_organization_id_fkey"
                        columns: ["organization_id"]
                        referencedRelation: "organizations"
                        referencedColumns: ["id"]
                    },
                    {
                        foreignKeyName: "plex_sync_queue_webhook_config_id_fkey"
                        columns: ["webhook_config_id"]
                        referencedRelation: "webhook_configurations"
                        referencedColumns: ["id"]
                    }
                ]
            }
        }
        Views: {
            [_ in never]: never
        }
        Functions: {
            [_ in never]: never
        }
        Enums: {
            [_ in never]: never
        }
        CompositeTypes: {
            [_ in never]: never
        }
    }
}

// Helper types
export type Tables<T extends keyof Database['public']['Tables']> = Database['public']['Tables'][T]['Row']
export type Insertable<T extends keyof Database['public']['Tables']> = Database['public']['Tables'][T]['Insert']
export type Updatable<T extends keyof Database['public']['Tables']> = Database['public']['Tables'][T]['Update']
