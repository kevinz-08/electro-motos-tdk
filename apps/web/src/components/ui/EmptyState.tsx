import Link from 'next/link'
import type { LucideIcon } from 'lucide-react'

interface EmptyStateProps {
  icon: LucideIcon
  title: string
  description?: string
  action?: { label: string; href: string }
}

export function EmptyState({ icon: Icon, title, description, action }: EmptyStateProps) {
  return (
    <div className="bg-white rounded-2xl border border-gray-200 p-16 text-center">
      <div className="mx-auto mb-4 flex h-16 w-16 items-center justify-center rounded-full bg-sky-50">
        <Icon className="h-8 w-8 text-sky-500" aria-hidden="true" />
      </div>
      <h2 className="text-xl font-bold text-gray-900 mb-2">{title}</h2>
      {description && (
        <p className="text-gray-500 mb-6 max-w-sm mx-auto">{description}</p>
      )}
      {action && (
        <Link
          href={action.href}
          className="inline-block bg-sky-400 text-black px-8 py-3 rounded-xl font-bold hover:bg-sky-500 hover:text-white transition-colors"
        >
          {action.label}
        </Link>
      )}
    </div>
  )
}
