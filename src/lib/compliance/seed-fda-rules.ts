/**
 * Seed FDA Compliance Rules to Database
 * Run this script to populate the compliance_rules table with FDA NFP requirements
 *
 * Usage: Can be called from an API route or run as a standalone script
 */

import { SupabaseClient } from '@supabase/supabase-js'
import type { Database } from '@/lib/database.types'
import { ALL_FDA_NFP_RULES } from './fda-nfp-rules'

/**
 * Seed FDA rules into the database
 * Pass organization_id = null to create global rules (available to all organizations)
 */
export async function seedFDAComplianceRules(
  supabaseClient: SupabaseClient<Database>,
  organizationId: string | null = null
) {
  const rulesToInsert = ALL_FDA_NFP_RULES.map((rule) => ({
    organization_id: organizationId, // null = global FDA rules
    rule_type: rule.rule_type,
    rule_category: rule.rule_category,
    rule_name: rule.rule_name,
    description: rule.description,
    requirements: rule.requirements,
    cfr_reference: rule.cfr_reference,
    guidance_reference: 'FDA Food Labeling Guide (https://www.fda.gov/media/81606/download)',
    severity: rule.severity,
    applicable_to: rule.applicable_to || null,
    active: true,
  }))

  // Insert rules (upsert to avoid duplicates)
  const { data, error } = await supabaseClient
    .from('compliance_rules')
    .upsert(rulesToInsert, {
      onConflict: 'id', // This won't work since we're generating new UUIDs
      ignoreDuplicates: false,
    })
    .select()

  if (error) {
    console.error('Error seeding FDA compliance rules:', error)
    throw error
  }

  console.log(`Successfully seeded ${data?.length || 0} FDA compliance rules`)
  return data
}

/**
 * Delete all FDA compliance rules (for re-seeding)
 */
export async function clearFDAComplianceRules(
  supabaseClient: SupabaseClient<Database>,
  organizationId: string | null = null
) {
  const query = supabaseClient
    .from('compliance_rules')
    .delete()
    .in('rule_type', ['nfp_format', 'serving_size', 'nutrient_content_claim', 'mandatory_nutrients'])

  // If organizationId is provided, only delete for that org
  // If null, only delete global rules (where organization_id IS NULL)
  if (organizationId) {
    query.eq('organization_id', organizationId)
  } else {
    query.is('organization_id', null)
  }

  const { error } = await query

  if (error) {
    console.error('Error clearing FDA compliance rules:', error)
    throw error
  }

  console.log('Successfully cleared FDA compliance rules')
}

/**
 * Get count of FDA compliance rules
 */
export async function getFDAComplianceRulesCount(
  supabaseClient: SupabaseClient<Database>
): Promise<number> {
  const { count, error } = await supabaseClient
    .from('compliance_rules')
    .select('*', { count: 'exact', head: true })
    .is('organization_id', null) // Only count global rules

  if (error) {
    console.error('Error getting FDA compliance rules count:', error)
    throw error
  }

  return count || 0
}
