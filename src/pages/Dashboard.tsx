import { useMemo } from 'react'
import { useNavigate } from 'react-router-dom'
import { motion } from 'motion/react'
import { TrendingUp, TrendingDown, Minus } from 'lucide-react'
import { TEAM_COLORS, type Player } from '@/lib/data/mock'
import { usePlayers } from '@/context/NBAContext'
import { projectPlayer } from '@/lib/projections/project'
import { GlowingEffect } from '@/components/ui/glowing-effect'
import { generateDeterministicSparkData, Sparkline } from '@/components/ui/sparkline'
import { cn, formatStat, formatPct } from '@/lib/utils'

type StatKey = 'pts' | 'reb' | 'ast' | 'stl' | 'blk' | 'threePM' | 'ftPct' | 'tov' | 'fgPct'

interface LeaderCategory {
  key: StatKey
  label: string
  abbr: string
  format: (v: number) => string
  lowerIsBetter?: boolean
  color: string
  glowColor: string
}

const CATEGORIES: LeaderCategory[] = [
  { key: 'pts', label: 'Points', abbr: 'PTS', format: v => formatStat(v), color: '#6366f1', glowColor: 'rgba(99,102,241,0.55)' },
  { key: 'reb', label: 'Rebounds', abbr: 'REB', format: v => formatStat(v), color: '#8b5cf6', glowColor: 'rgba(139,92,246,0.55)' },
  { key: 'ast', label: 'Assists', abbr: 'AST', format: v => formatStat(v), color: '#06b6d4', glowColor: 'rgba(6,182,212,0.55)' },
  { key: 'stl', label: 'Steals', abbr: 'STL', format: v => formatStat(v, 2), color: '#10b981', glowColor: 'rgba(16,185,129,0.55)' },
  { key: 'blk', label: 'Blocks', abbr: 'BLK', format: v => formatStat(v, 2), color: '#f59e0b', glowColor: 'rgba(245,158,11,0.55)' },
  { key: 'threePM', label: '3-Pointers Made', abbr: '3PM', format: v => formatStat(v), color: '#ec4899', glowColor: 'rgba(236,72,153,0.55)' },
  { key: 'ftPct', label: 'Free Throw %', abbr: 'FT%', format: v => formatPct(v), color: '#a78bfa', glowColor: 'rgba(167,139,250,0.55)' },
  { key: 'tov', label: 'Turnovers', abbr: 'TOV', format: v => formatStat(v), lowerIsBetter: true, color: '#f87171', glowColor: 'rgba(248,113,113,0.55)' },
  { key: 'fgPct', label: 'Field Goal %', abbr: 'FG%', format: v => formatPct(v), color: '#34d399', glowColor: 'rgba(52,211,153,0.55)' },
]

function getLeader(players: Player[], key: StatKey, lowerIsBetter = false, threshold = 35): Player {
  const eligible = players.filter(p => p.currentStats.gp >= threshold)
  const pool = eligible.length ? eligible : players
  return pool.reduce((best, player) => {
    const a = player.currentStats[key] as number
    const b = best.currentStats[key] as number
    return lowerIsBetter ? (a < b ? player : best) : (a > b ? player : best)
  })
}

interface LeaderCardProps {
  category: LeaderCategory
  player: Player
  index: number
}

function LeaderCard({ category, player, index }: LeaderCardProps) {
  const navigate = useNavigate()
  const projection = useMemo(() => projectPlayer(player), [player])

  const currentVal = player.currentStats[category.key] as number
  const projectedVal = projection[category.key] as number
  const diff = projectedVal - currentVal
  const diffPct = currentVal > 0 ? (diff / currentVal) * 100 : 0

  const isBetter = category.lowerIsBetter ? diff < 0 : diff > 0
  const isSame = Math.abs(diffPct) < 1

  const teamColors = TEAM_COLORS[player.teamAbbr] ?? ['#6366f1', '#8b5cf6']
  // Sparkline goes currentVal → projectedVal so arrow matches projection direction
  const sparkData = generateDeterministicSparkData(
    currentVal,
    projectedVal,
    8,
    index * 7 + 3
  )

  const injuryColors: Record<string, string> = {
    healthy: '#10b981',
    'day-to-day': '#f59e0b',
    questionable: '#f97316',
    out: '#ef4444',
  }

  return (
    <motion.div
      initial={{ opacity: 0, y: 24 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay: index * 0.05, duration: 0.4, ease: 'easeOut' }}
      className="w-full"
    >
      <GlowingEffect
        glowColor={category.glowColor}
        glowSize={220}
        spread={45}
        borderRadius="1rem"
        containerClassName="w-full h-full cursor-pointer"
      >
        <div
          onClick={() => navigate(`/player/${player.id}`)}
          className={cn(
            'relative overflow-hidden rounded-2xl p-4',
            'bg-white/[0.025] backdrop-blur-xl',
            'border border-white/[0.06]',
            'transition-all duration-300',
            'hover:bg-white/[0.045] hover:border-white/[0.1]',
            'hover:scale-[1.02] hover:shadow-glass',
            'active:scale-[0.99]',
            'h-full min-h-[180px]'
          )}
          style={{
            background: `radial-gradient(ellipse at top right, ${teamColors[0]}08, transparent 60%), rgba(12,12,18,0.8)`,
          }}
        >
          {/* Category label */}
          <div className="absolute top-3 right-3 z-10">
            <span
              className="text-[10px] font-bold tracking-[0.15em] uppercase px-2 py-0.5 rounded-full"
              style={{
                color: category.color,
                background: `${category.color}18`,
                border: `1px solid ${category.color}30`,
              }}
            >
              {category.abbr}
            </span>
          </div>

          {/* Injury dot */}
          <div className="absolute top-3 left-3 z-10">
            <div
              className="w-1.5 h-1.5 rounded-full"
              style={{ backgroundColor: injuryColors[player.injuryStatus] }}
            />
          </div>

          {/* Player info row */}
          <div className="flex items-start gap-3 mt-2 mb-3">
            <div className="relative shrink-0">
              <div
                className="w-12 h-12 rounded-full overflow-hidden ring-2 shrink-0"
                style={{ boxShadow: `0 0 0 2px ${category.glowColor}, 0 0 12px ${category.glowColor}` }}
              >
                <img
                  src={player.headshotUrl}
                  alt={player.name}
                  className="w-full h-full object-cover"
                  onError={(e) => {
                    (e.target as HTMLImageElement).src = `https://ui-avatars.com/api/?name=${encodeURIComponent(player.name)}&background=141420&color=fff&size=96`
                  }}
                />
              </div>
            </div>

            <div className="min-w-0 flex-1 pt-0.5">
              <p className="text-sm font-semibold text-white leading-tight truncate">
                {player.name}
              </p>
              <p className="text-[11px] text-white/40 font-medium mt-0.5">
                {player.teamAbbr} · {player.position}
              </p>
            </div>
          </div>

          {/* Main stat — equal-size two-column layout */}
          <div className="flex items-start gap-2 mb-1">
            {/* Current NOW */}
            <div className="flex-1 rounded-xl px-2.5 py-2" style={{ background: `${category.color}0d`, border: `1px solid ${category.color}20` }}>
              <p className="text-[9px] font-bold uppercase tracking-widest mb-1" style={{ color: category.color + '70' }}>NOW</p>
              <p
                className="text-xl font-bold font-mono tabular-nums leading-none"
                style={{ color: category.color + 'cc' }}
              >
                {category.format(currentVal)}
              </p>
            </div>

            {/* EOY Projection */}
            <div className="flex-1 rounded-xl px-2.5 py-2" style={{ background: `${category.color}18`, border: `1px solid ${category.color}35` }}>
              <div className="flex items-center justify-between mb-1">
                <p className="text-[9px] font-bold uppercase tracking-widest" style={{ color: category.color + 'aa' }}>EOY</p>
                {!isSame && (
                  <span className={cn('text-[9px] font-semibold flex items-center gap-0.5', isBetter ? 'text-emerald-400' : 'text-red-400')}>
                    {isBetter ? <TrendingUp className="w-2.5 h-2.5" /> : <TrendingDown className="w-2.5 h-2.5" />}
                    {Math.abs(diffPct).toFixed(1)}%
                  </span>
                )}
                {isSame && <Minus className="w-2.5 h-2.5 text-white/20" />}
              </div>
              <p
                className="text-xl font-bold font-mono tabular-nums leading-none"
                style={{ color: category.color, textShadow: `0 0 14px ${category.color}50` }}
              >
                {category.format(projectedVal)}
              </p>
            </div>

            {/* Sparkline */}
            <div className="shrink-0 flex items-end pb-1">
              <Sparkline
                data={sparkData}
                color={category.color}
                width={52}
                height={36}
                strokeWidth={1.5}
                animate={true}
                showArea={true}
              />
            </div>
          </div>

          {/* Confidence bar */}
          <div className="mt-3 pt-2 border-t border-white/[0.04]">
            <div className="flex items-center justify-between mb-1">
              <span className="text-[9px] text-white/25 uppercase tracking-wider">Projection Confidence</span>
              <span
                className="text-[9px] font-bold"
                style={{ color: projection.confidenceColor }}
                title="How reliable this EOY projection is: based on games played, injury status, and recent form"
              >
                {(projection.confidence * 100).toFixed(0)}% · {projection.confidenceLabel}
              </span>
            </div>
            <div className="h-0.5 bg-white/[0.06] rounded-full overflow-hidden">
              <motion.div
                initial={{ width: 0 }}
                animate={{ width: `${projection.confidence * 100}%` }}
                transition={{ delay: index * 0.05 + 0.3, duration: 0.5 }}
                className="h-full rounded-full"
                style={{ backgroundColor: projection.confidenceColor }}
              />
            </div>
          </div>
        </div>
      </GlowingEffect>
    </motion.div>
  )
}

export default function Dashboard() {
  const { players, isLive } = usePlayers()

  // Dynamic threshold: 66% of the average GP across all players.
  // As the season progresses and GP rises, the cutoff rises automatically.
  const gpThreshold = useMemo(() => {
    if (!players.length) return 35
    const avgGP = players.reduce((sum, p) => sum + p.currentStats.gp, 0) / players.length
    return Math.round(avgGP * 0.66)
  }, [players])

  const leaders = useMemo(() =>
    CATEGORIES.map(cat => ({
      category: cat,
      player: getLeader(players, cat.key, cat.lowerIsBetter, gpThreshold),
    })),
    [players, gpThreshold]
  )

  return (
    <div className="page-container">
      {/* Header */}
      <motion.div
        initial={{ opacity: 0, y: -16 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.4 }}
        className="mb-8 text-center"
      >
        <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-indigo-500/10 border border-indigo-500/20 mb-4">
          <div className="w-1.5 h-1.5 rounded-full bg-indigo-400 animate-pulse" />
          <span className="text-xs text-indigo-300 font-medium tracking-wider uppercase">
            2025-26 Season · {isLive ? 'Live Stats' : 'Projections'}
          </span>
        </div>
        <h1 className="text-3xl sm:text-4xl font-black text-gradient mb-2">
          Stat Leaders
        </h1>
        <p className="text-sm text-white/40 max-w-sm mx-auto">
          Category leaders + AI-powered projections with confidence scoring
        </p>
        <p className="text-[11px] text-white/25 mt-1 max-w-md mx-auto">
          Leaders filtered to players with ≥{gpThreshold} GP (≥66% of ~{Math.round(gpThreshold / 0.66)} avg games played this season)
        </p>
      </motion.div>

      {/* 3×3 Grid */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3 sm:gap-4">
        {leaders.map(({ category, player }, i) => (
          <LeaderCard key={category.key} category={category} player={player} index={i} />
        ))}
      </div>

      {/* Footer note */}
      <motion.p
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ delay: 0.8 }}
        className="text-center text-[11px] text-white/20 mt-8"
      >
        Projections based on age curve · minutes trend · injury risk · recent form
      </motion.p>
    </div>
  )
}
