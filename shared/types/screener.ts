import type { ScreenDefinition } from '../analysis/screener'

export interface SavedScreen {
  id: number
  name: string
  definition: ScreenDefinition
  createdAt: number
  updatedAt: number
}
