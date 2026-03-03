/**
 * NBA API Client — Placeholder
 *
 * This file is a placeholder for real NBA API integration.
 * The app uses mock data by default (src/lib/data/mock.ts).
 *
 * To integrate a real NBA API:
 * 1. Get an API key from balldontlie.io (free) or stats.nba.com
 * 2. Set VITE_NBA_API_KEY in your .env file
 * 3. Implement the functions below
 *
 * Options:
 * - balldontlie.io: Free, simple REST API
 * - NBA Stats API: stats.nba.com (unofficial, no key needed but rate limited)
 * - Sportradar: Paid, most comprehensive
 */

const API_KEY = import.meta.env.VITE_NBA_API_KEY as string | undefined
const BASE_URL = 'https://api.balldontlie.io/v1'

export interface NBAApiPlayer {
  id: number
  first_name: string
  last_name: string
  position: string
  team: {
    abbreviation: string
    full_name: string
  }
}

export interface NBAApiStats {
  pts: number
  reb: number
  ast: number
  stl: number
  blk: number
  fg3m: number
  ft_pct: number
  turnover: number
  fg_pct: number
  min: string
  games_played: number
}

/**
 * Fetch player season averages from balldontlie API.
 * Returns null if API key not configured.
 */
export async function fetchPlayerStats(playerId: number, season = 2025): Promise<NBAApiStats | null> {
  if (!API_KEY) {
    console.info('[NBA API] No API key configured — using mock data')
    return null
  }

  try {
    const response = await fetch(
      `${BASE_URL}/season_averages?season=${season}&player_ids[]=${playerId}`,
      { headers: { Authorization: API_KEY } }
    )
    if (!response.ok) throw new Error(`API error: ${response.status}`)
    const data = await response.json()
    return data.data?.[0] ?? null
  } catch (err) {
    console.error('[NBA API] Failed to fetch player stats:', err)
    return null
  }
}

/**
 * Search for players by name.
 * Returns empty array if API key not configured.
 */
export async function searchNBAPlayers(name: string): Promise<NBAApiPlayer[]> {
  if (!API_KEY) return []

  try {
    const response = await fetch(
      `${BASE_URL}/players?search=${encodeURIComponent(name)}&per_page=10`,
      { headers: { Authorization: API_KEY } }
    )
    if (!response.ok) throw new Error(`API error: ${response.status}`)
    const data = await response.json()
    return data.data ?? []
  } catch (err) {
    console.error('[NBA API] Failed to search players:', err)
    return []
  }
}
