import { Construction } from 'lucide-react'
import { EmptyState } from '@/components/ui/EmptyState'

export function PlaceholderPage({ name, phase }: { name: string; phase: number }) {
  return <EmptyState icon={Construction} title={`${name} — coming in Phase ${phase}`} description="This section is scaffolded and will be implemented in a later development phase." />
}
