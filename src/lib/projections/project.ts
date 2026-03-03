import type { Player, PlayerStats } from '../data/mock'
import { clamp } from '../utils'

export interface ProjectionContext {
  teamPace?: number         // Optional team pace factor (default 100)
  minutesChange?: number    // Expected MPG change this season
  injuryRisk?: number       // 0-1 additional injury risk override
}

export interface ProjectionResult {
  // Projected per-game stats
  pts: number
  reb: number
  ast: number
  stl: number
  blk: number
  threePM: number
  ftPct: number
  tov: number
  fgPct: number

  // Meta
  confidence: number    // 0-1 confidence score
  confidenceLabel: 'HIGH' | 'MEDIUM' | 'LOW'
  confidenceColor: string

  // Rationale
  rationale: {
    ageCurve: string
    minutesTrend: string
    injuryRisk: string
    recentForm: string
    overall: string
  }

  // Intermediate values for display
  ageFactor: number
  minutesFactor: number
  injuryFactor: number
  trendFactor: number
}

/**
 * Age curve multiplier:
 * Under 25: improving (+1.5% per year under 27)
 * 25-26: prime ramp up
 * 27: statistical peak
 * 28-30: flat prime
 * 31-33: slight decline
 * 34+: accelerating decline
 */
function getAgeFactor(age: number): number {
  if (age <= 22) return 1.06
  if (age <= 24) return 1.04
  if (age <= 26) return 1.02
  if (age <= 27) return 1.01
  if (age <= 30) return 1.00
  if (age <= 32) return 0.98
  if (age <= 34) return 0.96
  if (age <= 36) return 0.93
  if (age <= 38) return 0.89
  return 0.84
}

function getAgeCurveLabel(age: number, factor: number): string {
  const pct = Math.abs((factor - 1) * 100).toFixed(0)
  if (age <= 22)
    return `Age ${age} — early development stage. Model applies a +${pct}% age curve, reflecting that players this young typically see meaningful year-over-year statistical growth as they adapt to the NBA game. Upside variance is high.`
  if (age <= 24)
    return `Age ${age} — steep growth phase. A +${pct}% upward curve is applied; players in this range typically improve their efficiency, shot selection, and decision-making notably each season. Projection skews optimistic.`
  if (age <= 26)
    return `Age ${age} — approaching statistical prime. +${pct}% curve applied. Most NBA players hit peak production between 27-29; this player is one or two years away from that window, so modest improvement is still baked in.`
  if (age === 27)
    return `Age 27 — statistical prime window. Neutral age curve applied (no meaningful decline or growth expected). This is typically the peak year for NBA players by per-game output and efficiency.`
  if (age <= 30)
    return `Age ${age} — established prime. Flat age curve; no growth adjustment and no decline penalty. Players in this range typically maintain their established production level barring injury.`
  if (age <= 33)
    return `Age ${age} — early decline phase. A -${pct}% curve is applied as athleticism and recovery capacity begin to gradually erode. Elite players often mask this with improved efficiency and playmaking IQ, so the decline is modest.`
  if (age <= 36)
    return `Age ${age} — veteran decline. A -${pct}% curve applied, reflecting notable drops in explosiveness and recovery. Minutes management typically increases. Projection relies more heavily on efficiency maintenance than raw athleticism.`
  return `Age ${age} — late career. A -${pct}% age curve applied. At this stage the model heavily discounts physical decline; production is highly dependent on role, health, and team context. High variance projection.`
}

/**
 * Minutes factor based on current vs last season MPG.
 * More minutes = more counting stats.
 */
function getMinutesFactor(current: PlayerStats, last: PlayerStats): number {
  const mpgChange = current.mpg - last.mpg
  // Each minute change has ~2.5% effect on counting stats
  return clamp(1 + (mpgChange / last.mpg), 0.8, 1.2)
}

function getMinutesLabel(current: PlayerStats, last: PlayerStats): string {
  const diff = current.mpg - last.mpg
  const sign = diff >= 0 ? '+' : ''
  if (Math.abs(diff) < 0.5)
    return `Minutes virtually unchanged at ${current.mpg.toFixed(1)} MPG (${sign}${diff.toFixed(1)} vs last season's ${last.mpg.toFixed(1)} MPG). Stable role expected through season end — counting stats projection carries minimal minutes-driven variance.`
  if (diff >= 3.0)
    return `Minutes up significantly: ${current.mpg.toFixed(1)} MPG this season vs ${last.mpg.toFixed(1)} last year (${sign}${diff.toFixed(1)} MPG). A larger role directly inflates counting stats like points, rebounds, and assists. This is a meaningful positive signal for the projection.`
  if (diff > 0)
    return `Minutes up modestly: ${current.mpg.toFixed(1)} MPG vs last season's ${last.mpg.toFixed(1)} MPG (${sign}${diff.toFixed(1)}). A slight bump in role that contributes marginally to higher counting numbers. No major role change inflection expected.`
  if (diff <= -3.0)
    return `Minutes down notably: ${current.mpg.toFixed(1)} MPG vs last season's ${last.mpg.toFixed(1)} MPG (${diff.toFixed(1)}). A reduced role — likely due to load management, injury recovery, or roster competition — drags down counting stat projections. Efficiency metrics should be less affected.`
  return `Minutes down slightly: ${current.mpg.toFixed(1)} MPG vs last season's ${last.mpg.toFixed(1)} MPG (${diff.toFixed(1)}). Modest reduction in playing time expected to modestly clip counting stats, though the effect is limited.`
}

/**
 * Injury factor: reduces confidence and projected output.
 */
function getInjuryFactor(player: Player): { factor: number; confidence: number; label: string } {
  const gpRate = player.currentStats.gp / 82
  const gpRatePct = (gpRate * 100).toFixed(0)
  const history = player.injuryContext

  if (player.injuryStatus === 'out') {
    const base = `Currently OUT (${player.injuryNote ?? 'injury'}). ${player.currentStats.gp} GP played this season (${gpRatePct}% of 82). The model applies a near-zero output factor and flags this as very low confidence — any EOY projection is speculative until a return timeline is confirmed.`
    return {
      factor: 0.0,
      confidence: 0.15,
      label: history ? `${base}\n\n${history}` : base,
    }
  }

  if (player.injuryStatus === 'questionable') {
    const base = `Currently questionable (${player.injuryNote ?? 'injury concern'}). Has played ${player.currentStats.gp} GP this season (${gpRatePct}% availability). A games-played penalty and reduced confidence factor are applied — projection assumes limited availability risk but could shift significantly if status changes.`
    return {
      factor: 0.88,
      confidence: 0.45,
      label: history ? `${base}\n\n${history}` : base,
    }
  }

  if (player.injuryStatus === 'day-to-day') {
    const base = `Currently day-to-day (${player.injuryNote ?? 'minor issue'}). Has played ${player.currentStats.gp} GP (${gpRatePct}% availability). A slight minutes-risk discount is applied; barring escalation this should not materially affect the projection.`
    return {
      factor: 0.95,
      confidence: 0.65,
      label: history ? `${base}\n\n${history}` : base,
    }
  }

  // Healthy
  if (gpRate < 0.6) {
    const base = `Listed healthy but has only played ${player.currentStats.gp} GP (${gpRatePct}% availability rate). Despite the clean bill of health, this low game count raises a durability flag — the model applies a modest availability discount and caps confidence at medium.`
    return {
      factor: 0.92,
      confidence: 0.60,
      label: history ? `${base}\n\n${history}` : base,
    }
  }

  if (gpRate < 0.75) {
    const base = `Healthy with ${player.currentStats.gp} GP played (${gpRatePct}% availability). Slightly below the 75% threshold that signals full durability — a minor availability discount is applied, though the projection impact is small.`
    return {
      factor: 0.96,
      confidence: 0.74,
      label: history ? `${base}\n\n${history}` : base,
    }
  }

  // Healthy, good availability
  if (!history) {
    return {
      factor: 1.0,
      confidence: 0.90,
      label: `Healthy and durable — ${player.currentStats.gp} GP played (${gpRatePct}% availability). No notable injury history on record. Full weight applied to projection with high availability confidence.`,
    }
  }
  return {
    factor: 1.0,
    confidence: 0.90,
    label: `Healthy and durable — ${player.currentStats.gp} GP played (${gpRatePct}% availability rate this season). Full availability factor applied.\n\n${history}`,
  }
}

/**
 * Trend factor: recent form vs season average.
 * Uses last 5 games pts as signal if available.
 */
function getTrendFactor(player: Player): { factor: number; label: string } {
  const last5pts = player.trend.last5.pts
  const last15pts = player.trend.last15.pts
  const avg = player.currentStats.pts
  if (!last5pts) return { factor: 1.0, label: 'No recent trend data available. Projection relies entirely on season-long averages.' }

  const ratio = last5pts / avg
  const trendPct = ((ratio - 1) * 100).toFixed(1)
  const l15Pct = last15pts ? (((last15pts / avg) - 1) * 100).toFixed(1) : null
  const l15Note = l15Pct ? ` L15 pts: ${last15pts!.toFixed(1)} (${Number(l15Pct) >= 0 ? '+' : ''}${l15Pct}% vs avg) — ${Math.abs(Number(l15Pct)) < 3 ? 'consistent over the stretch' : Number(l15Pct) > 0 ? 'trending up over 15 games' : 'some softening over 15 games'}.` : ''

  if (ratio > 1.08) {
    return {
      factor: clamp(ratio * 0.3 + 0.7, 0.95, 1.12),
      label: `Hot streak: L5 scoring avg of ${last5pts.toFixed(1)} pts (+${trendPct}% vs season avg of ${avg.toFixed(1)}). Strong recent form carries a positive momentum bonus into the EOY projection.${l15Note}`,
    }
  }
  if (ratio < 0.92) {
    return {
      factor: clamp(ratio * 0.3 + 0.7, 0.88, 1.05),
      label: `Cold stretch: L5 scoring avg of ${last5pts.toFixed(1)} pts (${trendPct}% vs season avg of ${avg.toFixed(1)}). Negative recent form drags the projection slightly — though the model tempers this, assuming some mean regression back toward the season average.${l15Note}`,
    }
  }
  return {
    factor: 1.0,
    label: `Consistent form: L5 scoring avg of ${last5pts.toFixed(1)} pts (~${trendPct}% vs season avg of ${avg.toFixed(1)}). No notable hot or cold streak — recent performance aligns with the season average, giving the projection solid footing.${l15Note}`,
  }
}

/**
 * Project a single stat value using the blended model.
 * baseline = 0.7 * lastSeason + 0.3 * currentTrend
 * then apply age, minutes, injury, and trend factors.
 */
function projectStat(
  currentVal: number,
  lastVal: number,
  ageFactor: number,
  minutesFactor: number,
  injuryFactor: number,
  trendFactor: number,
  isPct = false, // percentage stats don't scale with minutes
): number {
  const baseline = 0.7 * lastVal + 0.3 * currentVal
  const combined = baseline * ageFactor * trendFactor
  const scaled = isPct ? combined : combined * minutesFactor * injuryFactor
  return Math.max(0, scaled)
}

/**
 * Main projection function.
 * Returns projected stats + confidence + rationale for a player.
 */
export function projectPlayer(player: Player, context: ProjectionContext = {}): ProjectionResult {
  const curr = player.currentStats
  const last = player.lastSeasonStats

  const ageFactor = getAgeFactor(player.age)
  const minutesFactor = getMinutesFactor(curr, last)
  const injury = getInjuryFactor(player)
  const trend = getTrendFactor(player)

  const project = (c: number, l: number, isPct = false) =>
    projectStat(c, l, ageFactor, minutesFactor, injury.factor, trend.factor, isPct)

  const pts = project(curr.pts, last.pts)
  const reb = project(curr.reb, last.reb)
  const ast = project(curr.ast, last.ast)
  const stl = project(curr.stl, last.stl)
  const blk = project(curr.blk, last.blk)
  const threePM = project(curr.threePM, last.threePM)
  const tov = project(curr.tov, last.tov)

  // Percentages scale differently (not by minutes)
  const ftPct = clamp(project(curr.ftPct, last.ftPct, true), 0, 1)
  const fgPct = clamp(project(curr.fgPct, last.fgPct, true), 0, 1)

  // Confidence: base from injury * health factor * minutes stability
  const minutesStability = Math.abs(minutesFactor - 1) < 0.05 ? 1.0 : 0.9
  const ageConfidence = ageFactor >= 1.0 ? 1.0 : ageFactor >= 0.96 ? 0.92 : 0.82
  const confidence = clamp(
    injury.confidence * minutesStability * ageConfidence,
    0.05, 0.98
  )

  const confidenceLabel = confidence >= 0.72
    ? 'HIGH'
    : confidence >= 0.50
    ? 'MEDIUM'
    : 'LOW'

  const confidenceColor = confidence >= 0.72
    ? '#10b981'  // green
    : confidence >= 0.50
    ? '#f59e0b'  // yellow
    : '#ef4444'  // red

  const projPts = Math.round((0.7 * last.pts + 0.3 * curr.pts) * ageFactor * trend.factor * minutesFactor * injury.factor * 10) / 10
  const projAst = Math.round((0.7 * last.ast + 0.3 * curr.ast) * ageFactor * trend.factor * minutesFactor * injury.factor * 10) / 10
  const projReb = Math.round((0.7 * last.reb + 0.3 * curr.reb) * ageFactor * trend.factor * minutesFactor * injury.factor * 10) / 10
  const confPct = Math.round(confidence * 100)

  const overallSentiment = confidence >= 0.72
    ? `Strong projection confidence (${confPct}%). ${player.name} shows consistent availability and stable production. EOY model points to ~${projPts} pts / ${projReb} reb / ${projAst} ast per game, with high reliability on those numbers barring a major injury or role change.`
    : confidence >= 0.50
    ? `Moderate confidence (${confPct}%). There is some availability concern or uncertainty factored into this projection. EOY estimates of ~${projPts} pts / ${projReb} reb / ${projAst} ast are reasonable but carry wider error bars — the actual numbers could shift meaningfully if health status changes.`
    : `Low confidence (${confPct}%). Significant availability risk, injury concern, or declining trend makes this projection speculative. The model shows ~${projPts} pts / ${projReb} reb / ${projAst} ast but treat these as rough indicators only — substantial uncertainty remains, particularly on games played and role.`

  return {
    pts: Math.round(pts * 10) / 10,
    reb: Math.round(reb * 10) / 10,
    ast: Math.round(ast * 10) / 10,
    stl: Math.round(stl * 100) / 100,
    blk: Math.round(blk * 100) / 100,
    threePM: Math.round(threePM * 10) / 10,
    ftPct: Math.round(ftPct * 1000) / 1000,
    tov: Math.round(tov * 10) / 10,
    fgPct: Math.round(fgPct * 1000) / 1000,
    confidence,
    confidenceLabel,
    confidenceColor,
    rationale: {
      ageCurve: getAgeCurveLabel(player.age, ageFactor),
      minutesTrend: getMinutesLabel(curr, last),
      injuryRisk: injury.label,
      recentForm: trend.label,
      overall: overallSentiment,
    },
    ageFactor,
    minutesFactor,
    injuryFactor: injury.factor,
    trendFactor: trend.factor,
  }
}

/**
 * Compute advanced stats approximations.
 */
export function computeAdvancedStats(player: Player) {
  const s = player.currentStats

  // True Shooting % = PTS / (2 * (FGA + 0.44 * FTA))
  // Approximate FTA from FT% and known data
  const ftaApprox = s.pts > 0 && s.ftPct > 0
    ? (s.pts - s.fga * s.fgPct * 2) / s.ftPct * 0.44
    : null

  const tsPct = ftaApprox !== null && ftaApprox > 0
    ? s.pts / (2 * (s.fga + 0.44 * ftaApprox))
    : s.tsPct

  // Effective FG% = (FGM + 0.5 * 3PM) / FGA
  const fgm = s.fga * s.fgPct
  const efgPct = s.fga > 0 ? (fgm + 0.5 * s.threePM) / s.fga : s.efgPct

  // Usage Rate ≈ (FGA + 0.44*FTA + TOV) / (team possessions per game)
  // Simplified: use stored usgPct or compute from MPG ratio
  const usgPct = s.usgPct

  return {
    tsPct: Math.round(tsPct * 1000) / 1000,
    efgPct: Math.round(efgPct * 1000) / 1000,
    usgPct: Math.round(usgPct * 1000) / 1000,
  }
}
