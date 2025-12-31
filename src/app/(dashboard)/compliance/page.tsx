'use client'

import { useEffect, useState } from 'react'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { ComplianceStatusBadge } from '@/components/compliance/ComplianceStatusBadge'
import { ValidationReport } from '@/components/compliance/ValidationReport'
import { FileText, Download, RefreshCw, Search } from 'lucide-react'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import { Input } from '@/components/ui/input'
import { toast } from 'sonner'

interface Label {
  id: string
  name: string
  recipe?: { name: string }
  compliance_status: 'compliant' | 'warnings' | 'errors' | 'pending' | 'not_validated'
  validation_results?: any[]
  validated_at?: string
  created_at: string
}

export default function CompliancePage() {
  const [labels, setLabels] = useState<Label[]>([])
  const [loading, setLoading] = useState(true)
  const [selectedLabel, setSelectedLabel] = useState<Label | null>(null)
  const [searchQuery, setSearchQuery] = useState('')
  const [filterStatus, setFilterStatus] = useState<string>('all')
  const [revalidating, setRevalidating] = useState<string | null>(null)
  const [exporting, setExporting] = useState<string | null>(null)

  const fetchLabels = async () => {
    setLoading(true)
    try {
      const response = await fetch('/api/labels')
      if (response.ok) {
        const data = await response.json()
        setLabels(data)
      }
    } catch (error) {
      console.error('Error fetching labels:', error)
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    fetchLabels()
  }, [])

  const revalidateLabel = async (labelId: string) => {
    setRevalidating(labelId)
    try {
      const response = await fetch('/api/labels/export', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ label_id: labelId, validate_only: true }),
      })

      if (response.ok) {
        const result = await response.json()
        await fetchLabels()

        // Update selected label if it's the one being revalidated
        if (selectedLabel?.id === labelId) {
          const updatedLabel = labels.find(l => l.id === labelId)
          if (updatedLabel) {
            setSelectedLabel({ ...updatedLabel, validation_results: result.validation_report?.validation_results })
          }
        }

        toast.success('Label revalidated successfully')
      } else {
        const error = await response.json()
        toast.error(`Validation failed: ${error.error || 'Unknown error'}`)
      }
    } catch (error) {
      console.error('Error revalidating label:', error)
      toast.error('Failed to revalidate label')
    } finally {
      setRevalidating(null)
    }
  }

  const exportLabelPDF = async (labelId: string) => {
    setExporting(labelId)
    try {
      const response = await fetch('/api/labels/export', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ label_id: labelId }),
      })

      if (response.ok) {
        const blob = await response.blob()
        const url = URL.createObjectURL(blob)
        const a = document.createElement('a')
        a.href = url
        a.download = `label-${labelId}.pdf`
        document.body.appendChild(a)
        a.click()
        document.body.removeChild(a)
        URL.revokeObjectURL(url)
        toast.success('Label exported successfully')
      } else {
        const error = await response.json()
        toast.error(`Export failed: ${error.error || 'Unknown error'}`)
      }
    } catch (error) {
      console.error('Error exporting label:', error)
      toast.error('Failed to export label')
    } finally {
      setExporting(null)
    }
  }

  // Calculate statistics
  const stats = {
    total: labels.length,
    compliant: labels.filter((l) => l.compliance_status === 'compliant').length,
    warnings: labels.filter((l) => l.compliance_status === 'warnings').length,
    errors: labels.filter((l) => l.compliance_status === 'errors').length,
    not_validated: labels.filter(
      (l) => l.compliance_status === 'pending' || l.compliance_status === 'not_validated'
    ).length,
  }

  // Filter labels
  const filteredLabels = labels.filter((label) => {
    const matchesSearch =
      label.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      label.recipe?.name.toLowerCase().includes(searchQuery.toLowerCase())

    const matchesFilter =
      filterStatus === 'all' ||
      label.compliance_status === filterStatus ||
      (filterStatus === 'not_validated' &&
        (label.compliance_status === 'pending' || label.compliance_status === 'not_validated'))

    return matchesSearch && matchesFilter
  })

  const getValidationSummary = (label: Label) => {
    if (!label.validation_results) return { errors: 0, warnings: 0 }
    const errors = label.validation_results.filter(
      (r: any) => r.status === 'fail' && r.severity === 'error'
    ).length
    const warnings = label.validation_results.filter(
      (r: any) => r.status === 'fail' && r.severity === 'warning'
    ).length
    return { errors, warnings }
  }

  return (
    <div className="space-y-6 animate-fade-in">
      {/* Header */}
      <div>
        <h1 className="text-xl sm:text-2xl font-semibold text-foreground">Compliance Dashboard</h1>
        <p className="mt-1 text-sm text-muted-foreground">
          FDA NFP compliance status for all labels
        </p>
      </div>

      {/* Statistics Cards */}
      <div className="grid gap-4 md:grid-cols-5 mb-8">
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-sm font-medium text-muted-foreground">
              Total Labels
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{stats.total}</div>
          </CardContent>
        </Card>

        <Card className="border-green-200 bg-green-50">
          <CardHeader className="pb-3">
            <CardTitle className="text-sm font-medium text-green-800">Compliant</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-green-900">{stats.compliant}</div>
          </CardContent>
        </Card>

        <Card className="border-yellow-200 bg-yellow-50">
          <CardHeader className="pb-3">
            <CardTitle className="text-sm font-medium text-yellow-800">Warnings</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-yellow-900">{stats.warnings}</div>
          </CardContent>
        </Card>

        <Card className="border-red-200 bg-red-50">
          <CardHeader className="pb-3">
            <CardTitle className="text-sm font-medium text-red-800">Errors</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-red-900">{stats.errors}</div>
          </CardContent>
        </Card>

        <Card className="border-gray-200 bg-gray-50">
          <CardHeader className="pb-3">
            <CardTitle className="text-sm font-medium text-gray-700">Not Validated</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-gray-900">{stats.not_validated}</div>
          </CardContent>
        </Card>
      </div>

      {/* Filters and Search */}
      <Card className="mb-6">
        <CardContent className="pt-6">
          <div className="flex flex-col sm:flex-row gap-4">
            <div className="flex-1 relative">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input
                placeholder="Search labels..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="pl-9"
              />
            </div>
            <div className="flex gap-2 flex-wrap">
              <Button
                variant={filterStatus === 'all' ? 'default' : 'outline'}
                onClick={() => setFilterStatus('all')}
                size="sm"
              >
                All
              </Button>
              <Button
                variant={filterStatus === 'compliant' ? 'default' : 'outline'}
                onClick={() => setFilterStatus('compliant')}
                size="sm"
              >
                Compliant
              </Button>
              <Button
                variant={filterStatus === 'warnings' ? 'default' : 'outline'}
                onClick={() => setFilterStatus('warnings')}
                size="sm"
              >
                Warnings
              </Button>
              <Button
                variant={filterStatus === 'errors' ? 'default' : 'outline'}
                onClick={() => setFilterStatus('errors')}
                size="sm"
              >
                Errors
              </Button>
              <Button
                variant={filterStatus === 'not_validated' ? 'default' : 'outline'}
                onClick={() => setFilterStatus('not_validated')}
                size="sm"
              >
                Not Validated
              </Button>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Labels List */}
      <Card>
        <CardHeader>
          <CardTitle>Labels</CardTitle>
          <CardDescription>
            Click on a label to view detailed compliance report
          </CardDescription>
        </CardHeader>
        <CardContent>
          {loading ? (
            <div className="text-center py-8 text-muted-foreground">Loading...</div>
          ) : filteredLabels.length === 0 ? (
            <div className="text-center py-8 text-muted-foreground">
              No labels found matching your criteria
            </div>
          ) : (
            <div className="space-y-3">
              {filteredLabels.map((label) => {
                const { errors, warnings } = getValidationSummary(label)
                return (
                  <div
                    key={label.id}
                    className="flex items-center justify-between p-4 border rounded-lg hover:bg-muted/50 cursor-pointer transition-colors"
                    onClick={() => setSelectedLabel(label)}
                  >
                    <div className="flex items-center gap-4 flex-1 min-w-0">
                      <FileText className="h-5 w-5 text-muted-foreground flex-shrink-0" />
                      <div className="flex-1 min-w-0">
                        <div className="font-medium truncate">{label.name}</div>
                        {label.recipe && (
                          <div className="text-sm text-muted-foreground truncate">
                            Recipe: {label.recipe.name}
                          </div>
                        )}
                      </div>
                    </div>

                    <div className="flex items-center gap-3 flex-shrink-0">
                      <ComplianceStatusBadge
                        status={label.compliance_status}
                        errors_count={errors}
                        warnings_count={warnings}
                        showCounts
                      />

                      <div className="flex gap-1">
                        <Button
                          variant="ghost"
                          size="icon"
                          onClick={(e) => {
                            e.stopPropagation()
                            revalidateLabel(label.id)
                          }}
                          disabled={revalidating === label.id}
                          title="Re-validate"
                        >
                          <RefreshCw className={`h-4 w-4 ${revalidating === label.id ? 'animate-spin' : ''}`} />
                        </Button>
                        <Button
                          variant="ghost"
                          size="icon"
                          onClick={(e) => {
                            e.stopPropagation()
                            exportLabelPDF(label.id)
                          }}
                          disabled={label.compliance_status === 'errors' || exporting === label.id}
                          title={
                            label.compliance_status === 'errors'
                              ? 'Fix errors before exporting'
                              : 'Export as PDF'
                          }
                        >
                          <Download className={`h-4 w-4 ${exporting === label.id ? 'animate-pulse' : ''}`} />
                        </Button>
                      </div>
                    </div>
                  </div>
                )
              })}
            </div>
          )}
        </CardContent>
      </Card>

      {/* Validation Report Dialog */}
      <Dialog open={!!selectedLabel} onOpenChange={(open) => !open && setSelectedLabel(null)}>
        <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>{selectedLabel?.name}</DialogTitle>
            <DialogDescription>
              Detailed FDA compliance validation report
            </DialogDescription>
          </DialogHeader>

          {selectedLabel && selectedLabel.validation_results && (
            <ValidationReport
              overall_status={selectedLabel.compliance_status}
              validation_results={selectedLabel.validation_results}
              errors_count={getValidationSummary(selectedLabel).errors}
              warnings_count={getValidationSummary(selectedLabel).warnings}
              validated_at={selectedLabel.validated_at}
              showDetails={true}
            />
          )}

          {selectedLabel && !selectedLabel.validation_results && (
            <div className="text-center py-8 text-muted-foreground">
              This label has not been validated yet. Click the refresh button to validate.
            </div>
          )}

          <div className="flex justify-end gap-2 pt-4">
            <Button
              variant="outline"
              onClick={() => selectedLabel && revalidateLabel(selectedLabel.id)}
              disabled={revalidating === selectedLabel?.id}
            >
              <RefreshCw className={`h-4 w-4 mr-2 ${revalidating === selectedLabel?.id ? 'animate-spin' : ''}`} />
              {revalidating === selectedLabel?.id ? 'Validating...' : 'Re-validate'}
            </Button>
            <Button
              onClick={() => selectedLabel && exportLabelPDF(selectedLabel.id)}
              disabled={selectedLabel?.compliance_status === 'errors' || exporting === selectedLabel?.id}
            >
              <Download className={`h-4 w-4 mr-2 ${exporting === selectedLabel?.id ? 'animate-pulse' : ''}`} />
              {exporting === selectedLabel?.id ? 'Exporting...' : 'Export PDF'}
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  )
}
