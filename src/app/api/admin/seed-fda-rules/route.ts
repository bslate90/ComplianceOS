/**
 * Admin API: Seed FDA Compliance Rules
 * POST /api/admin/seed-fda-rules - Seeds global FDA rules into database
 * GET /api/admin/seed-fda-rules - Gets current count of FDA rules
 */

import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import {
  seedFDAComplianceRules,
  clearFDAComplianceRules,
  getFDAComplianceRulesCount,
} from '@/lib/compliance/seed-fda-rules'

export async function POST(request: NextRequest) {
  try {
    const supabase = await createClient()
    const body = await request.json()
    const { clear_existing = false } = body

    // Get user's organization to verify they have admin access
    const {
      data: { user },
    } = await supabase.auth.getUser()
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    // Clear existing rules if requested
    if (clear_existing) {
      await clearFDAComplianceRules(supabase)
    }

    // Seed FDA compliance rules (as global rules, organization_id = null)
    const rules = await seedFDAComplianceRules(supabase, null)

    return NextResponse.json({
      success: true,
      message: `Successfully seeded ${rules?.length || 0} FDA compliance rules`,
      rules_count: rules?.length || 0,
    })
  } catch (error) {
    console.error('POST /api/admin/seed-fda-rules error:', error)
    return NextResponse.json(
      {
        error: 'Failed to seed FDA compliance rules',
        details: (error as Error).message,
      },
      { status: 500 }
    )
  }
}

export async function GET() {
  try {
    const supabase = await createClient()

    // Get count of existing FDA rules
    const count = await getFDAComplianceRulesCount(supabase)

    // Get breakdown by rule type
    const { data: breakdown } = await supabase
      .from('compliance_rules')
      .select('rule_type')
      .is('organization_id', null)

    const ruleTypeCount: Record<string, number> = {}
    breakdown?.forEach((rule) => {
      ruleTypeCount[rule.rule_type] = (ruleTypeCount[rule.rule_type] || 0) + 1
    })

    return NextResponse.json({
      total_fda_rules: count,
      breakdown_by_type: ruleTypeCount,
    })
  } catch (error) {
    console.error('GET /api/admin/seed-fda-rules error:', error)
    return NextResponse.json(
      {
        error: 'Failed to get FDA compliance rules count',
        details: (error as Error).message,
      },
      { status: 500 }
    )
  }
}
