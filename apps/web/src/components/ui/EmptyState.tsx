import Link from 'next/link'

interface EmptyStateProps {
  icon: string
  title: string
  description?: string
  action?: { label: string; href: string }
}

export function EmptyState({ icon, title, description, action }: EmptyStateProps) {
  return (
    <div className="bg-white rounded-2xl border border-gray-200 p-16 text-center">
      <div className="text-5xl mb-4">{icon}</div>
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
