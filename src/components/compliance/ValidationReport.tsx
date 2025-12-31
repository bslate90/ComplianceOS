'use client'

import { Badge } from '@/components/ui/badge'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { CheckCircle2, XCircle, AlertCircle, Info } from 'lucide-react'

interface ValidationResult {
  rule_id: string
  rule_name: string
  rule_type: string
  status: 'pass' | 'fail' | 'warning'
  message: string
  severity: 'error' | 'warning' | 'info'
  cfr_reference?: string
  details?: Record<string, any>
}

interface ValidationReportProps {
  overall_status: 'compliant' | 'warnings' | 'errors' | 'not_validated' | 'pending'
  validation_results: ValidationResult[]
  errors_count: number
  warnings_count: number
  validated_at?: string
  showDetails?: boolean
}

export function ValidationReport({
  overall_status,
  validation_results,
  errors_count,
  warnings_count,
  validated_at,
  showDetails = true,
}: ValidationReportProps) {
  const getStatusColor = (status: string) => {
    switch (status) {
      case 'compliant':
        return 'bg-green-100 text-green-800 border-green-200'
      case 'warnings':
        return 'bg-yellow-100 text-yellow-800 border-yellow-200'
      case 'errors':
        return 'bg-red-100 text-red-800 border-red-200'
      case 'pending':
      case 'not_validated':
        return 'bg-gray-100 text-gray-800 border-gray-200'
      default:
        return 'bg-gray-100 text-gray-800 border-gray-200'
    }
  }

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'compliant':
        return <CheckCircle2 className="h-5 w-5 text-green-600" />
      case 'warnings':
        return <AlertCircle className="h-5 w-5 text-yellow-600" />
      case 'errors':
        return <XCircle className="h-5 w-5 text-red-600" />
      default:
        return <Info className="h-5 w-5 text-gray-600" />
    }
  }

  const getResultIcon = (result: ValidationResult) => {
    if (result.status === 'pass') {
      return <CheckCircle2 className="h-4 w-4 text-green-600" />
    } else if (result.severity === 'error') {
      return <XCircle className="h-4 w-4 text-red-600" />
    } else if (result.severity === 'warning') {
      return <AlertCircle className="h-4 w-4 text-yellow-600" />
    } else {
      return <Info className="h-4 w-4 text-blue-600" />
    }
  }

  // Group results by rule type
  const groupedResults = validation_results.reduce((acc, result) => {
    const type = result.rule_type
    if (!acc[type]) {
      acc[type] = []
    }
    acc[type].push(result)
    return acc
  }, {} as Record<string, ValidationResult[]>)

  const ruleTypeLabels: Record<string, string> = {
    nfp_format: 'NFP Format',
    serving_size: 'Serving Size',
    mandatory_nutrients: 'Mandatory Nutrients',
    nutrient_content_claim: 'Nutrient Content Claims',
  }

  return (
    <div className="space-y-4">
      {/* Overall Status Card */}
      <Card className={`border-2 ${getStatusColor(overall_status)}`}>
        <CardHeader>
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              {getStatusIcon(overall_status)}
              <CardTitle className="text-lg">
                Compliance Status: {overall_status.toUpperCase()}
              </CardTitle>
            </div>
            {validated_at && (
              <span className="text-xs text-muted-foreground">
                Validated: {new Date(validated_at).toLocaleString()}
              </span>
            )}
          </div>
          <CardDescription>
            {errors_count > 0 && (
              <span className="text-red-600 font-medium">
                {errors_count} error{errors_count !== 1 ? 's' : ''}
              </span>
            )}
            {errors_count > 0 && warnings_count > 0 && <span> • </span>}
            {warnings_count > 0 && (
              <span className="text-yellow-600 font-medium">
                {warnings_count} warning{warnings_count !== 1 ? 's' : ''}
              </span>
            )}
            {errors_count === 0 && warnings_count === 0 && (
              <span className="text-green-600 font-medium">
                All compliance checks passed
              </span>
            )}
          </CardDescription>
        </CardHeader>
      </Card>

      {/* Detailed Results */}
      {showDetails && validation_results.length > 0 && (
        <div className="space-y-3">
          {Object.entries(groupedResults).map(([ruleType, results]) => (
            <Card key={ruleType}>
              <CardHeader className="pb-3">
                <CardTitle className="text-sm font-medium">
                  {ruleTypeLabels[ruleType] || ruleType}
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-2">
                {results.map((result, index) => (
                  <div
                    key={`${result.rule_id}-${index}`}
                    className="flex items-start gap-3 p-3 rounded-md border bg-card"
                  >
                    <div className="mt-0.5">{getResultIcon(result)}</div>
                    <div className="flex-1 space-y-1">
                      <div className="flex items-center justify-between gap-2">
                        <span className="font-medium text-sm">{result.rule_name}</span>
                        <Badge
                          variant={
                            result.status === 'pass'
                              ? 'default'
                              : result.severity === 'error'
                              ? 'destructive'
                              : 'secondary'
                          }
                          className="text-xs"
                        >
                          {result.severity}
                        </Badge>
                      </div>
                      <p className="text-sm text-muted-foreground">{result.message}</p>
                      {result.cfr_reference && (
                        <p className="text-xs text-muted-foreground font-mono">
                          Reference: {result.cfr_reference}
                        </p>
                      )}
                      {result.details && Object.keys(result.details).length > 0 && (
                        <details className="text-xs text-muted-foreground">
                          <summary className="cursor-pointer hover:text-foreground">
                            View details
                          </summary>
                          <pre className="mt-2 p-2 bg-muted rounded text-xs overflow-x-auto">
                            {JSON.stringify(result.details, null, 2)}
                          </pre>
                        </details>
                      )}
                    </div>
                  </div>
                ))}
              </CardContent>
            </Card>
          ))}
        </div>
      )}

      {/* Summary message */}
      {overall_status === 'errors' && (
        <Card className="border-red-200 bg-red-50">
          <CardContent className="pt-6">
            <p className="text-sm text-red-800">
              <strong>Note:</strong> This label has compliance errors that must be resolved before
              it can be exported as a PDF. Please review and address the errors above.
            </p>
          </CardContent>
        </Card>
      )}

      {overall_status === 'warnings' && (
        <Card className="border-yellow-200 bg-yellow-50">
          <CardContent className="pt-6">
            <p className="text-sm text-yellow-800">
              <strong>Note:</strong> This label has warnings that should be reviewed. The label can
              be exported, but you may want to address these warnings for full compliance.
            </p>
          </CardContent>
        </Card>
      )}

      {overall_status === 'compliant' && (
        <Card className="border-green-200 bg-green-50">
          <CardContent className="pt-6">
            <p className="text-sm text-green-800">
              <strong>Success:</strong> This label meets all FDA compliance requirements and is
              ready for export.
            </p>
          </CardContent>
        </Card>
      )}
    </div>
  )
}
