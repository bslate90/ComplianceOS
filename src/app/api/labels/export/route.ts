/**
 * Label Export API
 * Validates and exports labels as PDF with FDA compliance checking
 */

import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { validateLabel, type LabelData, type NutritionData } from '@/lib/compliance/nfp-validator'
import type { Json } from '@/lib/database.types'

console.log('[Export Route] Loaded at /api/labels/export')

export async function POST(request: NextRequest) {
  console.log('[Export Route] POST request received')
  try {
    const supabase = await createClient()
    const body = await request.json()
    const { label_id, validate_only = false } = body

    if (!label_id) {
      return NextResponse.json({ error: 'label_id is required' }, { status: 400 })
    }

    // Get user's organization
    const {
      data: { user },
    } = await supabase.auth.getUser()
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const { data: profile } = await supabase
      .from('profiles')
      .select('organization_id')
      .eq('id', user.id)
      .single()

    if (!profile?.organization_id) {
      return NextResponse.json({ error: 'No organization found' }, { status: 400 })
    }

    // Fetch label data
    const { data: label, error: labelError } = await supabase
      .from('labels')
      .select(
        `
        *,
        recipe:recipes(
          name,
          recipe_yield_g
        )
      `
      )
      .eq('id', label_id)
      .eq('organization_id', profile.organization_id)
      .single()

    if (labelError || !label) {
      return NextResponse.json({ error: 'Label not found' }, { status: 404 })
    }

    // Prepare label data for validation
    const labelData: LabelData = {
      nutrition_data: label.nutrition_data as unknown as NutritionData,
      serving_size_g: label.serving_size_g ?? undefined,
      serving_size_household: label.serving_size_household ?? undefined,
      servings_per_container: label.servings_per_container ?? undefined,
      format: (label.format === 'fda_vertical' ? 'standard_vertical' : label.format) as LabelData['format'],
      package_surface_area: label.package_surface_area ?? undefined,
      claim_statements: label.claim_statements as string[] | undefined,
    }

    // Validate label against FDA rules
    const validationReport = validateLabel(labelData)

    // Update label with validation results
    const { error: updateError } = await supabase
      .from('labels')
      .update({
        compliance_status: validationReport.overall_status,
        validation_results: validationReport.validation_results as unknown as Json,
        validated_at: validationReport.validated_at,
      })
      .eq('id', label_id)

    if (updateError) {
      console.error('Error updating label validation results:', updateError)
    }

    // If validation only, return validation report
    if (validate_only) {
      return NextResponse.json({
        validation_report: validationReport,
      })
    }

    // Check if there are critical errors that prevent export
    if (validationReport.errors_count > 0) {
      return NextResponse.json(
        {
          error: 'Label has compliance errors that must be fixed before export',
          validation_report: validationReport,
        },
        { status: 400 }
      )
    }

    // Dynamically import PDF dependencies to avoid build issues
    const { renderToStream } = await import('@react-pdf/renderer')
    const { LabelPDFDocument } = await import('@/lib/export/label-pdf-generator')

    // Generate PDF
    const pdfDocument = LabelPDFDocument({
      productName: label.name || (label.recipe as { name?: string })?.name || 'Untitled Product',
      servingSize: label.serving_size_household ?? `${label.serving_size_g}g`,
      servingsPerContainer:
        label.servings_per_container?.toString() || 'Not specified',
      nutritionData: label.nutrition_data as unknown as NutritionData,
      format: (label.format === 'fda_vertical' ? 'standard_vertical' : label.format) as 'standard_vertical' | 'tabular' | 'linear',
      ingredientStatement: label.ingredient_statement,
      allergenStatement: label.allergen_statement ?? undefined,
      companyName: 'Your Company Name', // TODO: Get from organization
      companyAddress: 'Your Company Address', // TODO: Get from organization
    })

    // Render PDF to stream
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const stream = await renderToStream(pdfDocument as any)

    // Convert stream to buffer
    const chunks: Buffer[] = []
    for await (const chunk of stream) {
      chunks.push(Buffer.from(chunk))
    }
    const pdfBuffer = Buffer.concat(chunks)

    // Return PDF as response
    return new NextResponse(pdfBuffer, {
      status: 200,
      headers: {
        'Content-Type': 'application/pdf',
        'Content-Disposition': `attachment; filename="${label.name || 'label'}.pdf"`,
        'X-Validation-Status': validationReport.overall_status,
        'X-Warnings-Count': validationReport.warnings_count.toString(),
      },
    })
  } catch (error) {
    console.error('POST /api/labels/export error:', error)
    return NextResponse.json(
      { error: 'Internal server error', details: (error as Error).message },
      { status: 500 }
    )
  }
}

export async function GET(request: NextRequest) {
  try {
    const supabase = await createClient()
    const { searchParams } = new URL(request.url)
    const label_id = searchParams.get('label_id')

    if (!label_id) {
      return NextResponse.json({ error: 'label_id is required' }, { status: 400 })
    }

    // Get user's organization
    const {
      data: { user },
    } = await supabase.auth.getUser()
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const { data: profile } = await supabase
      .from('profiles')
      .select('organization_id')
      .eq('id', user.id)
      .single()

    if (!profile?.organization_id) {
      return NextResponse.json({ error: 'No organization found' }, { status: 400 })
    }

    // Fetch label validation results
    const { data: label, error: labelError } = await supabase
      .from('labels')
      .select('compliance_status, validation_results, validated_at')
      .eq('id', label_id)
      .eq('organization_id', profile.organization_id)
      .single()

    if (labelError || !label) {
      return NextResponse.json({ error: 'Label not found' }, { status: 404 })
    }

    return NextResponse.json({
      compliance_status: label.compliance_status,
      validation_results: label.validation_results,
      validated_at: label.validated_at,
    })
  } catch (error) {
    console.error('GET /api/labels/export error:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
