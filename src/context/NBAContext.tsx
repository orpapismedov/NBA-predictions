import React, { createContext, useContext, useEffect, useState } from 'react'
import { MOCK_PLAYERS, type Player, type PlayerStats } from '@/lib/data/mock'
import {
  searchPlayerByName,
  fetchSeasonAverages,
  type BDLSeasonAvg,
} from '@/lib/api/balldontlie'

// ─── localStorage keys & TTL ────────────────────────────────────────────────
const ID_MAP_KEY    = 'nba_bdl_ids_v1'       // { [ourPlayerId]: bdlNumericId }
const STATS_KEY     = 'nba_bdl_stats_v1'     // cached season averages
const STATS_TTL_MS  = 4 * 60 * 60 * 1000    // 4 hours — roughly half-game cadence

// ─── Helpers ─────────────────────────────────────────────────────────────────
function sleep(ms: number) {
  return new Promise<void>(r => setTimeout(r, ms))
}

/** Parse "34:12" → 34.2 minutes */
function parseMinutes(raw: string): number {
  if (!raw) return 0
  const [m, s] = raw.split(':').map(Number)
  return +((m || 0) + (s || 0) / 60).toFixed(1)
}

/** Build a PlayerStats object from live balldontlie averages, falling back to mock for missing fields */
function buildLiveStats(mock: PlayerStats, live: BDLSeasonAvg): PlayerStats {
  const fgm  = live.fgm  || 0
  const fga  = live.fga  || 1   // avoid div/0
  const fg3m = live.fg3m || 0
  const fta  = live.fta  || 0
  const pts  = live.pts  || 0

  const efgPct = (fgm + 0.5 * fg3m) / fga
  const tsPct  = pts / (2 * (fga + 0.44 * fta)) || mock.tsPct

  return {
    pts:     +pts.toFixed(1),
    reb:     +(live.reb      ?? mock.reb).toFixed(1),
    ast:     +(live.ast      ?? mock.ast).toFixed(1),
    stl:     +(live.stl      ?? mock.stl).toFixed(1),
    blk:     +(live.blk      ?? mock.blk).toFixed(1),
    threePM: +(live.fg3m     ?? mock.threePM).toFixed(1),
    ftPct:    live.ft_pct  != null ? +live.ft_pct.toFixed(3)  : mock.ftPct,
    tov:     +(live.turnover ?? mock.tov).toFixed(1),
    fgPct:    live.fg_pct  != null ? +live.fg_pct.toFixed(3)  : mock.fgPct,
    mpg:     parseMinutes(live.min) || mock.mpg,
    gp:      live.games_played ?? mock.gp,
    fga:     +live.fga.toFixed(1),
    efgPct:  +efgPct.toFixed(3),
    tsPct:   +tsPct.toFixed(3),
    usgPct:  mock.usgPct,   // requires team totals — keep from mock
  }
}

// ─── localStorage helpers ─────────────────────────────────────────────────────
function readIdMap(): Record<string, number> | null {
  try {
    const raw = localStorage.getItem(ID_MAP_KEY)
    return raw ? JSON.parse(raw) : null
  } catch { return null }
}
function writeIdMap(map: Record<string, number>) {
  try { localStorage.setItem(ID_MAP_KEY, JSON.stringify(map)) } catch {}
}

function readStatsCache(): BDLSeasonAvg[] | null {
  try {
    const raw = localStorage.getItem(STATS_KEY)
    if (!raw) return null
    const { data, ts }: { data: BDLSeasonAvg[]; ts: number } = JSON.parse(raw)
    if (Date.now() - ts > STATS_TTL_MS) return null
    return data
  } catch { return null }
}
function writeStatsCache(data: BDLSeasonAvg[]) {
  try { localStorage.setItem(STATS_KEY, JSON.stringify({ data, ts: Date.now() })) } catch {}
}

// ─── Build player ID map (searches BDL for each player name in batches) ──────
async function buildIdMap(): Promise<Record<string, number>> {
  const map: Record<string, number> = {}
  const BATCH = 5
  for (let i = 0; i < MOCK_PLAYERS.length; i += BATCH) {
    const batch = MOCK_PLAYERS.slice(i, i + BATCH)
    const results = await Promise.all(
      batch.map(p =>
        searchPlayerByName(p.name).then(bdlId => ({ playerId: p.id, bdlId }))
      )
    )
    for (const { playerId, bdlId } of results) {
      if (bdlId != null) map[playerId] = bdlId
    }
    if (i + BATCH < MOCK_PLAYERS.length) await sleep(250)   // stay under rate limit
  }
  writeIdMap(map)
  return map
}

/** Merge live stats into the mock player list */
function mergePlayers(
  base: Player[],
  idMap: Record<string, number>,
  liveStats: BDLSeasonAvg[],
): Player[] {
  const statsMap = new Map(liveStats.map(s => [s.player_id, s]))
  return base.map(p => {
    const bdlId = idMap[p.id]
    if (!bdlId) return p
    const live = statsMap.get(bdlId)
    if (!live) return p
    return { ...p, currentStats: buildLiveStats(p.currentStats, live) }
  })
}

// ─── Context ──────────────────────────────────────────────────────────────────
interface NBAContextValue {
  players: Player[]
  loading: boolean
  isLive: boolean
  lastUpdated: Date | null
}

const NBAContext = createContext<NBAContextValue>({
  players: MOCK_PLAYERS,
  loading: false,
  isLive: false,
  lastUpdated: null,
})

export function NBAProvider({ children }: { children: React.ReactNode }) {
  const [players,     setPlayers]     = useState<Player[]>(MOCK_PLAYERS)
  const [loading,     setLoading]     = useState(false)
  const [isLive,      setIsLive]      = useState(false)
  const [lastUpdated, setLastUpdated] = useState<Date | null>(null)

  useEffect(() => {
    // Only activate when the user has provided an API key
    if (!import.meta.env.VITE_BDL_API_KEY) return
    loadLive()

    // Re-check every 30 minutes. loadLive() reads from the 4-hour cache so it
    // only hits the network when the cache has actually expired.
    const interval = setInterval(loadLive, 30 * 60 * 1000)
    return () => clearInterval(interval)
  }, [])

  async function loadLive() {
    setLoading(true)
    try {
      // 1. Get (or build) the player-ID map
      const idMap = readIdMap() ?? await buildIdMap()
      const bdlIds = Object.values(idMap) as number[]
      if (!bdlIds.length) return

      // 2. Get stats — from cache or fresh
      const cached = readStatsCache()
      const liveStats = cached ?? await fetchSeasonAverages(bdlIds)
      if (!cached) writeStatsCache(liveStats)

      // 3. Merge into our player list
      setPlayers(mergePlayers(MOCK_PLAYERS, idMap, liveStats))
      setIsLive(true)
      setLastUpdated(new Date())
    } catch (err) {
      console.warn('[NBA] Live data unavailable — using static data.', err)
    } finally {
      setLoading(false)
    }
  }

  return (
    <NBAContext.Provider value={{ players, loading, isLive, lastUpdated }}>
      {children}
    </NBAContext.Provider>
  )
}

/** Hook — returns players (live or mock), loading flag, and isLive flag */
export function usePlayers() {
  return useContext(NBAContext)
}
