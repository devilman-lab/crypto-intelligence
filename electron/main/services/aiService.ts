/**
 * Optional AI module — NOT part of the MVP.
 *
 * The interface documents the intended extension points so a provider-backed
 * implementation can be added later without touching the rest of the app.
 * Only the NullAIService exists today; it is never wired to any network.
 */
import type { ScreenDefinition } from '@shared/analysis/screener'

export interface AIService {
  readonly available: boolean
  /** Plain-language summary of the current market snapshot. */
  summarizeMarket(): Promise<string>
  /** Explain a portfolio's composition and risk in plain language. */
  explainPortfolio(portfolioId: number): Promise<string>
  /** Translate a natural-language query into a structured screener definition. */
  parseScreenerQuery(query: string): Promise<ScreenDefinition>
  /** Reflective analysis of journal entries. */
  analyseJournal(): Promise<string>
}

export class NullAIService implements AIService {
  readonly available = false
  async summarizeMarket(): Promise<string> {
    throw new Error('The AI module is not enabled in this version.')
  }
  async explainPortfolio(): Promise<string> {
    throw new Error('The AI module is not enabled in this version.')
  }
  async parseScreenerQuery(): Promise<ScreenDefinition> {
    throw new Error('The AI module is not enabled in this version.')
  }
  async analyseJournal(): Promise<string> {
    throw new Error('The AI module is not enabled in this version.')
  }
}
