'use client'

import { Badge } from '@/components/ui/badge'
import { CheckCircle2, XCircle, AlertCircle, Clock } from 'lucide-react'

interface ComplianceStatusBadgeProps {
  status: 'compliant' | 'warnings' | 'errors' | 'pending' | 'not_validated'
  errors_count?: number
  warnings_count?: number
  showCounts?: boolean
  size?: 'sm' | 'md' | 'lg'
}

export function ComplianceStatusBadge({
  status,
  errors_count = 0,
  warnings_count = 0,
  showCounts = false,
  size = 'md',
}: ComplianceStatusBadgeProps) {
  const getStatusConfig = () => {
    switch (status) {
      case 'compliant':
        return {
          label: 'Compliant',
          variant: 'default' as const,
          icon: CheckCircle2,
          className: 'bg-green-100 text-green-800 hover:bg-green-100',
        }
      case 'warnings':
        return {
          label: 'Warnings',
          variant: 'secondary' as const,
          icon: AlertCircle,
          className: 'bg-yellow-100 text-yellow-800 hover:bg-yellow-100',
        }
      case 'errors':
        return {
          label: 'Errors',
          variant: 'destructive' as const,
          icon: XCircle,
          className: 'bg-red-100 text-red-800 hover:bg-red-100',
        }
      case 'pending':
      case 'not_validated':
        return {
          label: 'Not Validated',
          variant: 'outline' as const,
          icon: Clock,
          className: 'bg-gray-100 text-gray-600 hover:bg-gray-100',
        }
      default:
        return {
          label: 'Unknown',
          variant: 'outline' as const,
          icon: Clock,
          className: 'bg-gray-100 text-gray-600 hover:bg-gray-100',
        }
    }
  }

  const config = getStatusConfig()
  const Icon = config.icon

  const sizeClasses = {
    sm: 'text-xs px-2 py-0.5',
    md: 'text-sm px-2.5 py-1',
    lg: 'text-base px-3 py-1.5',
  }

  const iconSizes = {
    sm: 'h-3 w-3',
    md: 'h-3.5 w-3.5',
    lg: 'h-4 w-4',
  }

  return (
    <Badge variant={config.variant} className={`${config.className} ${sizeClasses[size]} gap-1.5`}>
      <Icon className={iconSizes[size]} />
      <span>{config.label}</span>
      {showCounts && (errors_count > 0 || warnings_count > 0) && (
        <span className="ml-1 font-normal opacity-80">
          ({errors_count > 0 && `${errors_count}E`}
          {errors_count > 0 && warnings_count > 0 && ', '}
          {warnings_count > 0 && `${warnings_count}W`})
        </span>
      )}
    </Badge>
  )
}
