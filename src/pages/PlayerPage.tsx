import React, { useMemo, useState } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import { motion, AnimatePresence } from 'motion/react'
import {
  ArrowLeft, ChevronDown, ChevronUp,
  Activity, Shield, TrendingUp, BarChart3,
  Target, Zap, Award
} from 'lucide-react'
import { TEAM_COLORS } from '@/lib/data/mock'
import { usePlayers } from '@/context/NBAContext'
import { projectPlayer, computeAdvancedStats } from '@/lib/projections/project'
import { GlowingEffect } from '@/components/ui/glowing-effect'
import { Sparkline, generateDeterministicSparkData } from '@/components/ui/sparkline'
import { cn, formatStat, formatPct } from '@/lib/utils'

type StatKey = 'pts' | 'reb' | 'ast' | 'stl' | 'blk' | 'threePM' | 'ftPct' | 'tov' | 'fgPct'

interface StatCardProps {
  label: string
  abbr: string
  current: number
  projected: number
  color: string
  format: (v: number) => string
  index: number
  lowerIsBetter?: boolean
  playerSeed?: number
}

function StatMicroCard({ label, abbr, current, projected, color, format, index, lowerIsBetter, playerSeed = 0 }: StatCardProps) {
  const diff = projected - current
  const isBetter = lowerIsBetter ? diff < 0 : diff > 0
  const diffPct = current > 0 ? Math.abs(diff / current * 100) : 0
  // Sparkline goes current → projected so visual direction matches projection trend
  const sparkData = generateDeterministicSparkData(current, projected, 6, playerSeed + index * 3)

  return (
    <motion.div
      initial={{ opacity: 0, scale: 0.95 }}
      animate={{ opacity: 1, scale: 1 }}
      transition={{ delay: 0.1 + index * 0.04, duration: 0.3 }}
    >
      <GlowingEffect
        glowColor={`${color}55`}
        glowSize={140}
        spread={30}
        borderRadius="0.75rem"
        containerClassName="w-full h-full"
      >
        <div
          className={cn(
            'relative p-3 rounded-xl',
            'bg-white/[0.025] border border-white/[0.05]',
            'transition-all duration-200 hover:bg-white/[0.04] hover:border-white/[0.09]',
            'hover:scale-[1.02]'
          )}
        >
          {/* Label */}
          <div className="flex items-center justify-between mb-2">
            <span className="text-[9px] font-bold tracking-[0.12em] uppercase" style={{ color: color + 'aa' }}>
              {abbr}
            </span>
            <Sparkline
              data={sparkData}
              color={color}
              width={36}
              height={16}
              strokeWidth={1.2}
              animate
              showArea={false}
            />
          </div>

          {/* Current value */}
          <p
            className="text-xl font-bold font-mono tabular-nums leading-none"
            style={{ color, textShadow: `0 0 16px ${color}50` }}
          >
            {format(current)}
          </p>

          {/* Projected */}
          <div className="flex items-center gap-1 mt-1.5">
            <span className="text-[9px] text-white/25">EOY PROJ</span>
            <span className="text-[11px] font-mono font-semibold" style={{ color: color + 'bb' }}>
              {format(projected)}
            </span>
            {Math.abs(diffPct) >= 1 && (
              <span className={cn('text-[9px] font-bold', isBetter ? 'text-emerald-400' : 'text-red-400')}>
                {isBetter ? '+' : '-'}{diffPct.toFixed(1)}%
              </span>
            )}
          </div>

          <p className="text-[9px] text-white/25 mt-1">{label}</p>
        </div>
      </GlowingEffect>
    </motion.div>
  )
}

const MAIN_STATS: Array<{ key: StatKey; label: string; abbr: string; format: (v: number) => string; color: string; lowerIsBetter?: boolean }> = [
  { key: 'pts', label: 'Points', abbr: 'PTS', format: v => formatStat(v), color: '#6366f1' },
  { key: 'reb', label: 'Rebounds', abbr: 'REB', format: v => formatStat(v), color: '#8b5cf6' },
  { key: 'ast', label: 'Assists', abbr: 'AST', format: v => formatStat(v), color: '#06b6d4' },
  { key: 'stl', label: 'Steals', abbr: 'STL', format: v => formatStat(v, 2), color: '#10b981' },
  { key: 'blk', label: 'Blocks', abbr: 'BLK', format: v => formatStat(v, 2), color: '#f59e0b' },
  { key: 'threePM', label: '3PM', abbr: '3PM', format: v => formatStat(v), color: '#ec4899' },
  { key: 'ftPct', label: 'FT%', abbr: 'FT%', format: v => formatPct(v), color: '#a78bfa' },
  { key: 'tov', label: 'Turnovers', abbr: 'TOV', format: v => formatStat(v), color: '#f87171', lowerIsBetter: true },
  { key: 'fgPct', label: 'FG%', abbr: 'FG%', format: v => formatPct(v), color: '#34d399' },
]

function RationaleItem({ icon, label, value, color }: {
  icon: React.ReactNode
  label: string
  value: string
  color: string
}) {
  return (
    <div className="rounded-xl p-3" style={{ background: `${color}08`, border: `1px solid ${color}18` }}>
      <div className="flex items-center gap-1.5 mb-1.5">
        <span style={{ color }} className="shrink-0">{icon}</span>
        <span className="text-[9px] font-bold uppercase tracking-wider" style={{ color: color + '90' }}>{label}</span>
      </div>
      <p className="text-xs text-white/60 leading-relaxed">{value}</p>
    </div>
  )
}

function RationalePanel({ rationale, projection }: {
  rationale: ReturnType<typeof projectPlayer>['rationale']
  projection: ReturnType<typeof projectPlayer>
}) {
  const [open, setOpen] = useState(false)

  return (
    <div className="rounded-2xl border border-white/[0.06] bg-white/[0.02] overflow-hidden">
      <button
        onClick={() => setOpen(o => !o)}
        className={cn(
          'w-full flex items-center justify-between px-4 py-3',
          'text-left transition-colors duration-200',
          open ? 'bg-indigo-500/5' : 'hover:bg-white/[0.025]'
        )}
      >
        <div className="flex items-center gap-2">
          <BarChart3 className="w-4 h-4 text-indigo-400" />
          <span className="text-sm font-semibold text-white/80">Projection Rationale</span>
        </div>
        {open
          ? <ChevronUp className="w-4 h-4 text-white/30" />
          : <ChevronDown className="w-4 h-4 text-white/30" />
        }
      </button>

      <AnimatePresence>
        {open && (
          <motion.div
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: 'auto', opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            transition={{ duration: 0.25 }}
            className="overflow-hidden"
          >
            <div className="px-4 pb-4 space-y-3 border-t border-white/[0.04]">
              {/* Factor bars */}
              <div className="grid grid-cols-2 gap-2 pt-3">
                {[
                  { label: 'Age Factor', value: projection.ageFactor },
                  { label: 'Minutes', value: projection.minutesFactor },
                  { label: 'Injury Safety', value: projection.injuryFactor },
                  { label: 'Form', value: projection.trendFactor },
                ].map(f => (
                  <div key={f.label} className="bg-white/[0.02] rounded-lg p-2">
                    <p className="text-[9px] text-white/30 uppercase tracking-wider mb-1">{f.label}</p>
                    <p className={cn('text-sm font-mono font-bold', f.value >= 1 ? 'text-emerald-400' : 'text-red-400')}>
                      {f.value >= 1 ? '+' : ''}{((f.value - 1) * 100).toFixed(1)}%
                    </p>
                  </div>
                ))}
              </div>

              {/* Age Curve */}
              <RationaleItem
                icon={<Activity className="w-3.5 h-3.5" />}
                label="Age Curve"
                value={rationale.ageCurve}
                color="#6366f1"
              />

              {/* Minutes Trend */}
              <RationaleItem
                icon={<TrendingUp className="w-3.5 h-3.5" />}
                label="Minutes Trend"
                value={rationale.minutesTrend}
                color="#06b6d4"
              />

              {/* Injury & Health — dedicated prose block */}
              <div className="rounded-xl p-3" style={{ background: '#f59e0b08', border: '1px solid #f59e0b20' }}>
                <div className="flex items-center gap-1.5 mb-2">
                  <Shield className="w-3.5 h-3.5 text-amber-400" />
                  <span className="text-[9px] font-bold uppercase tracking-wider text-amber-400/80">Injury & Health History</span>
                </div>
                <p className="text-xs text-white/60 leading-relaxed whitespace-pre-line">{rationale.injuryRisk}</p>
              </div>

              {/* Recent Form */}
              <RationaleItem
                icon={<Zap className="w-3.5 h-3.5" />}
                label="Recent Form"
                value={rationale.recentForm}
                color="#10b981"
              />

              {/* Overall confidence summary */}
              <div className="rounded-xl bg-indigo-500/[0.06] border border-indigo-500/15 p-3">
                <div className="flex items-center gap-1.5 mb-1.5">
                  <Award className="w-3.5 h-3.5 text-indigo-400" />
                  <span className="text-[9px] font-bold uppercase tracking-wider text-indigo-400/80">Overall Assessment</span>
                </div>
                <p className="text-xs text-indigo-300/80 leading-relaxed">{rationale.overall}</p>
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  )
}

export default function PlayerPage() {
  const { id } = useParams<{ id: string }>()
  const navigate = useNavigate()
  const { players } = usePlayers()
  const player = useMemo(() => (id ? players.find(p => p.id === id) : undefined), [id, players])
  const projection = useMemo(() => (player ? projectPlayer(player) : null), [player])
  const advanced = useMemo(() => (player ? computeAdvancedStats(player) : null), [player])

  if (!player || !projection || !advanced) {
    return (
      <div className="page-container flex flex-col items-center justify-center min-h-[60vh] gap-4">
        <div className="text-4xl">🏀</div>
        <p className="text-white/40">Player not found</p>
        <button onClick={() => navigate('/')} className="btn-ghost text-sm">
          ← Back to Dashboard
        </button>
      </div>
    )
  }

  const teamColors = TEAM_COLORS[player.teamAbbr] ?? ['#6366f1', '#8b5cf6']

  const injuryLabels: Record<string, { label: string; color: string }> = {
    healthy: { label: 'Healthy', color: '#10b981' },
    'day-to-day': { label: 'Day-to-Day', color: '#f59e0b' },
    questionable: { label: 'Questionable', color: '#f97316' },
    out: { label: 'Out', color: '#ef4444' },
  }
  const injuryInfo = injuryLabels[player.injuryStatus]

  const ptsSpark = generateDeterministicSparkData(
    player.lastSeasonStats.pts,
    player.currentStats.pts,
    16,
    player.id.charCodeAt(0)
  )

  return (
    <div className="page-container max-w-3xl">
      {/* Back button */}
      <motion.button
        initial={{ opacity: 0, x: -12 }}
        animate={{ opacity: 1, x: 0 }}
        onClick={() => navigate(-1)}
        className={cn(
          'flex items-center gap-2 mb-6 text-sm text-white/40',
          'hover:text-white transition-colors duration-200',
          'group'
        )}
      >
        <ArrowLeft className="w-4 h-4 group-hover:-translate-x-0.5 transition-transform" />
        Back
      </motion.button>

      {/* Hero card */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.4 }}
        className={cn(
          'relative overflow-hidden rounded-3xl mb-6',
          'border border-white/[0.07]',
          'p-5 sm:p-6'
        )}
        style={{
          background: `
            radial-gradient(ellipse at top right, ${teamColors[0]}18, transparent 50%),
            radial-gradient(ellipse at bottom left, ${teamColors[1]}10, transparent 50%),
            rgba(12,12,20,0.9)
          `,
        }}
      >
        {/* Decorative glow */}
        <div
          className="absolute inset-0 pointer-events-none"
          style={{
            background: `radial-gradient(ellipse at 70% -10%, ${teamColors[0]}15, transparent 60%)`,
          }}
        />

        <div className="relative flex flex-col sm:flex-row gap-5 items-start sm:items-center">
          {/* Player image */}
          <div className="relative shrink-0">
            <div
              className="w-24 h-24 sm:w-28 sm:h-28 rounded-2xl overflow-hidden border-2"
              style={{ borderColor: `${teamColors[0]}60`, boxShadow: `0 0 30px ${teamColors[0]}30` }}
            >
              <img
                src={player.headshotUrl}
                alt={player.name}
                className="w-full h-full object-cover"
                onError={(e) => {
                  (e.target as HTMLImageElement).src = `https://ui-avatars.com/api/?name=${encodeURIComponent(player.name)}&background=141420&color=fff&size=112`
                }}
              />
            </div>
          </div>

          {/* Player info */}
          <div className="flex-1 min-w-0">
            <h1 className="text-2xl sm:text-3xl font-black text-white leading-tight">
              {player.name}
            </h1>

            <div className="flex flex-wrap items-center gap-2 mt-2">
              {/* Team pill */}
              <span
                className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-semibold"
                style={{
                  background: `${teamColors[0]}20`,
                  color: teamColors[0] === '#000000' ? '#fff' : teamColors[0],
                  border: `1px solid ${teamColors[0]}30`,
                }}
              >
                {player.team}
              </span>

              {/* Position */}
              <span className="px-2.5 py-0.5 rounded-full text-xs font-semibold bg-white/[0.06] text-white/60 border border-white/[0.06]">
                {player.position}
              </span>

              {/* Age */}
              <span className="px-2.5 py-0.5 rounded-full text-xs bg-white/[0.04] text-white/40 border border-white/[0.04]">
                Age {player.age}
              </span>
            </div>

            {/* Injury + confidence row */}
            <div className="flex flex-wrap items-center gap-3 mt-3">
              <div
                className="flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-semibold"
                style={{
                  background: `${injuryInfo.color}15`,
                  color: injuryInfo.color,
                  border: `1px solid ${injuryInfo.color}30`,
                }}
              >
                <div className="w-1.5 h-1.5 rounded-full animate-pulse" style={{ backgroundColor: injuryInfo.color }} />
                {injuryInfo.label}
                {player.injuryNote && <span className="font-normal opacity-70">— {player.injuryNote}</span>}
              </div>

              {/* Confidence badge */}
              <div
                className="flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-bold"
                style={{
                  background: `${projection.confidenceColor}15`,
                  color: projection.confidenceColor,
                  border: `1px solid ${projection.confidenceColor}30`,
                }}
                title="Projection confidence: how reliable this end-of-season projection is, based on health, availability, and form"
              >
                <Target className="w-3 h-3" />
                <span className="opacity-60 font-normal">Proj. Confidence</span>
                &nbsp;{(projection.confidence * 100).toFixed(0)}%&nbsp;<span>{projection.confidenceLabel}</span>
              </div>
            </div>
          </div>

          {/* Points sparkline */}
          <div className="shrink-0 hidden sm:flex flex-col items-end gap-1">
            <p className="text-[9px] text-white/25 uppercase tracking-wider">PTS trend</p>
            <Sparkline data={ptsSpark} color="#6366f1" width={100} height={40} strokeWidth={2} animate />
            <p className="text-xs font-mono font-bold text-indigo-400">{formatStat(player.currentStats.pts)} PPG</p>
          </div>
        </div>

        {/* Games played bar */}
        <div className="relative mt-4 pt-3 border-t border-white/[0.04]">
          <div className="flex items-center justify-between text-xs mb-1.5">
            <span className="text-white/30">Games Played</span>
            <span className="font-mono text-white/50">{player.currentStats.gp} / 82</span>
          </div>
          <div className="h-1 bg-white/[0.06] rounded-full overflow-hidden">
            <motion.div
              initial={{ width: 0 }}
              animate={{ width: `${(player.currentStats.gp / 82) * 100}%` }}
              transition={{ delay: 0.4, duration: 0.6 }}
              className="h-full rounded-full"
              style={{ background: `linear-gradient(90deg, ${teamColors[0]}, ${teamColors[1]})` }}
            />
          </div>
        </div>
      </motion.div>

      {/* Stats Grid */}
      <motion.div
        initial={{ opacity: 0, y: 12 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.15, duration: 0.35 }}
        className="mb-6"
      >
        <div className="flex items-center gap-2 mb-3">
          <Award className="w-4 h-4 text-indigo-400" />
          <h2 className="text-sm font-bold text-white/70 uppercase tracking-wider">Per Game Stats</h2>
        </div>
        <div className="grid grid-cols-3 sm:grid-cols-3 gap-2">
          {MAIN_STATS.map((stat, i) => (
            <StatMicroCard
              key={stat.key}
              label={stat.label}
              abbr={stat.abbr}
              current={player.currentStats[stat.key] as number}
              projected={projection[stat.key] as number}
              color={stat.color}
              format={stat.format}
              index={i}
              lowerIsBetter={stat.lowerIsBetter}
              playerSeed={player.id.charCodeAt(0)}
            />
          ))}
        </div>
      </motion.div>

      {/* Advanced Stats */}
      <motion.div
        initial={{ opacity: 0, y: 12 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.25, duration: 0.35 }}
        className="mb-6"
      >
        <div className="flex items-center gap-2 mb-3">
          <BarChart3 className="w-4 h-4 text-cyan-400" />
          <h2 className="text-sm font-bold text-white/70 uppercase tracking-wider">Advanced Stats</h2>
        </div>
        <div className={cn(
          'rounded-2xl border border-white/[0.06]',
          'bg-white/[0.015] backdrop-blur-xl p-4'
        )}>
          {/* 2025-26 Current */}
          <p className="text-[9px] font-bold uppercase tracking-widest text-white/25 mb-3">2025-26 Current</p>
          <div className="grid grid-cols-3 gap-4 mb-4">
            {[
              { label: 'True Shooting %', abbr: 'TS%', value: advanced.tsPct, color: '#6366f1' },
              { label: 'Eff. Field Goal %', abbr: 'eFG%', value: advanced.efgPct, color: '#8b5cf6' },
              { label: 'Usage Rate', abbr: 'USG%', value: advanced.usgPct, color: '#06b6d4' },
            ].map((stat, i) => (
              <motion.div
                key={stat.abbr + '-cur'}
                initial={{ opacity: 0, scale: 0.9 }}
                animate={{ opacity: 1, scale: 1 }}
                transition={{ delay: 0.3 + i * 0.06 }}
                className="text-center"
              >
                <p
                  className="text-2xl font-bold font-mono"
                  style={{ color: stat.color, textShadow: `0 0 16px ${stat.color}50` }}
                >
                  {formatPct(stat.value)}
                </p>
                <p className="text-[10px] font-bold text-white/40 mt-0.5">{stat.abbr}</p>
                <p className="text-[9px] text-white/20 hidden sm:block">{stat.label}</p>
              </motion.div>
            ))}
          </div>
          {/* EOY Projected */}
          <div className="border-t border-white/[0.04] pt-3">
            <p className="text-[9px] font-bold uppercase tracking-widest text-white/25 mb-3">EOY Projected</p>
            <div className="grid grid-cols-3 gap-4">
              {[
                { label: 'True Shooting %', abbr: 'TS%', value: player.currentStats.pts > 0 ? Math.min(1, advanced.tsPct * (projection.pts / player.currentStats.pts)) : advanced.tsPct, color: '#6366f1' },
                { label: 'Eff. Field Goal %', abbr: 'eFG%', value: player.currentStats.fgPct > 0 ? Math.min(1, advanced.efgPct * (projection.fgPct / player.currentStats.fgPct)) : advanced.efgPct, color: '#8b5cf6' },
                { label: 'Usage Rate', abbr: 'USG%', value: advanced.usgPct, color: '#06b6d4' },
              ].map((stat, i) => (
                <motion.div
                  key={stat.abbr + '-proj'}
                  initial={{ opacity: 0, scale: 0.9 }}
                  animate={{ opacity: 1, scale: 1 }}
                  transition={{ delay: 0.36 + i * 0.06 }}
                  className="text-center"
                >
                  <p
                    className="text-2xl font-bold font-mono"
                    style={{ color: stat.color + 'bb', textShadow: `0 0 14px ${stat.color}40` }}
                  >
                    {formatPct(stat.value)}
                  </p>
                  <p className="text-[10px] font-bold text-white/30 mt-0.5">{stat.abbr}</p>
                  <p className="text-[9px] text-white/20 hidden sm:block">{stat.label}</p>
                </motion.div>
              ))}
            </div>
          </div>
        </div>
      </motion.div>

      {/* Projection Rationale */}
      <motion.div
        initial={{ opacity: 0, y: 12 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.35, duration: 0.35 }}
        className="mb-6"
      >
        <RationalePanel rationale={projection.rationale} projection={projection} />
      </motion.div>

      {/* Season comparison */}
      <motion.div
        initial={{ opacity: 0, y: 12 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.4, duration: 0.35 }}
        className="mb-4"
      >
        <div className="flex items-center gap-2 mb-3">
          <TrendingUp className="w-4 h-4 text-emerald-400" />
          <h2 className="text-sm font-bold text-white/70 uppercase tracking-wider">Season Comparison</h2>
        </div>
        <div className="rounded-2xl border border-white/[0.06] bg-white/[0.015] overflow-hidden">
          {/* Header */}
          <div className="grid grid-cols-4 px-4 py-2 border-b border-white/[0.04]">
            <span className="text-[10px] text-white/30 uppercase tracking-wider">Stat</span>
            <span className="text-[10px] text-white/30 uppercase tracking-wider text-right">2024-25</span>
            <span className="text-[10px] text-white/30 uppercase tracking-wider text-right">2025-26</span>
            <span className="text-[10px] text-white/30 uppercase tracking-wider text-right">EOY Proj</span>
          </div>
          {MAIN_STATS.map((stat, i) => {
            const last = player.lastSeasonStats[stat.key] as number
            const curr = player.currentStats[stat.key] as number
            const proj = projection[stat.key] as number
            // For lower-is-better stats (TOV), improvement means curr < last
            const isImproved = stat.lowerIsBetter ? curr < last : curr > last
            return (
              <div
                key={stat.key}
                className={cn(
                  'grid grid-cols-4 px-4 py-2.5 transition-colors',
                  'border-b border-white/[0.03] last:border-b-0',
                  'hover:bg-white/[0.02]'
                )}
              >
                <span className="text-xs font-medium" style={{ color: stat.color }}>{stat.abbr}</span>
                <span className="text-xs font-mono text-white/40 text-right">{stat.format(last)}</span>
                <span className={cn('text-xs font-mono font-semibold text-right', isImproved ? 'text-emerald-400' : 'text-red-400')}>
                  {stat.format(curr)}
                </span>
                <span className="text-xs font-mono text-right" style={{ color: stat.color + 'bb' }}>{stat.format(proj)}</span>
              </div>
            )
          })}
        </div>
      </motion.div>
    </div>
  )
}
