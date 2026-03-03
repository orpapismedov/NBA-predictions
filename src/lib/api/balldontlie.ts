// balldontlie.io v1 NBA stats API
// Free tier: register at https://app.balldontlie.io/register (no credit card)
// Set VITE_BDL_API_KEY in your .env.local file

const BASE = 'https://api.balldontlie.io/v1'

function getAuthHeader(): Record<string, string> {
  const key = import.meta.env.VITE_BDL_API_KEY
  if (!key) throw new Error('VITE_BDL_API_KEY is not set')
  return { Authorization: key }
}

export interface BDLSeasonAvg {
  player_id: number
  season: number
  games_played: number
  min: string        // e.g. "34:15"
  pts: number
  reb: number
  ast: number
  stl: number
  blk: number
  turnover: number
  fg_pct: number     // 0–1
  fg3m: number
  fg3_pct: number
  ft_pct: number
  fgm: number
  fga: number
  ftm: number
  fta: number
}

/** Search players by full name — returns balldontlie numeric ID or null */
export async function searchPlayerByName(name: string): Promise<number | null> {
  const url = `${BASE}/players?search=${encodeURIComponent(name)}&per_page=5`
  const res = await fetch(url, { headers: getAuthHeader() })
  if (!res.ok) return null
  const json = await res.json()
  const list: { id: number; first_name: string; last_name: string }[] = json.data ?? []
  const q = name.toLowerCase()
  const exact = list.find(p => `${p.first_name} ${p.last_name}`.toLowerCase() === q)
  return exact?.id ?? list[0]?.id ?? null
}

/** Fetch season averages for a list of balldontlie player IDs (season=2025 = 2025-26 season) */
export async function fetchSeasonAverages(
  playerIds: number[],
  season = 2025,
): Promise<BDLSeasonAvg[]> {
  const CHUNK = 25
  const results: BDLSeasonAvg[] = []
  for (let i = 0; i < playerIds.length; i += CHUNK) {
    const chunk = playerIds.slice(i, i + CHUNK)
    const params = chunk.map(id => `player_ids[]=${id}`).join('&')
    const url = `${BASE}/season_averages?season=${season}&${params}`
    const res = await fetch(url, { headers: getAuthHeader() })
    if (res.ok) {
      const json = await res.json()
      results.push(...(json.data ?? []))
    }
  }
  return results
}
