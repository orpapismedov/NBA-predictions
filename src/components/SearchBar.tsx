import { useState, useRef, useEffect, useCallback } from 'react'
import { useNavigate } from 'react-router-dom'
import { Search, X } from 'lucide-react'
import { motion, AnimatePresence } from 'motion/react'
import type { Player } from '@/lib/data/mock'
import { usePlayers } from '@/context/NBAContext'
import { cn } from '@/lib/utils'

interface SearchBarProps {
  className?: string
}

export function SearchBar({ className }: SearchBarProps) {
  const [query, setQuery] = useState('')
  const [results, setResults] = useState<Player[]>([])
  const [focused, setFocused] = useState(false)
  const [selectedIndex, setSelectedIndex] = useState(-1)
  const inputRef = useRef<HTMLInputElement>(null)
  const navigate = useNavigate()
  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null)
  const { players } = usePlayers()

  const doSearch = useCallback((q: string) => {
    if (q.trim().length < 1) {
      setResults([])
      return
    }
    const lower = q.toLowerCase()
    setResults(
      players
        .filter(p =>
          p.name.toLowerCase().includes(lower) ||
          p.team.toLowerCase().includes(lower) ||
          p.teamAbbr.toLowerCase().includes(lower)
        )
        .slice(0, 6)
    )
  }, [players])

  useEffect(() => {
    if (debounceRef.current) clearTimeout(debounceRef.current)
    debounceRef.current = setTimeout(() => doSearch(query), 160)
    return () => {
      if (debounceRef.current) clearTimeout(debounceRef.current)
    }
  }, [query, doSearch])

  const selectPlayer = (id: string) => {
    setQuery('')
    setResults([])
    setFocused(false)
    navigate(`/player/${id}`)
  }

  const clearSearch = () => {
    setQuery('')
    setResults([])
    inputRef.current?.focus()
  }

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (results.length === 0) return
    if (e.key === 'ArrowDown') {
      e.preventDefault()
      setSelectedIndex(prev => Math.min(prev + 1, results.length - 1))
    } else if (e.key === 'ArrowUp') {
      e.preventDefault()
      setSelectedIndex(prev => Math.max(prev - 1, -1))
    } else if (e.key === 'Enter' && selectedIndex >= 0) {
      selectPlayer(results[selectedIndex].id)
    } else if (e.key === 'Escape') {
      setFocused(false)
      setResults([])
    }
  }

  const showDropdown = focused && results.length > 0

  return (
    <div className={cn('relative w-full max-w-lg mx-auto', className)}>
      {/* Input */}
      <div
        className={cn(
          'flex items-center gap-2 px-4 py-2.5 rounded-full',
          'bg-white/[0.04] backdrop-blur-xl border transition-all duration-200',
          focused
            ? 'border-indigo-500/60 shadow-glow-sm bg-white/[0.06]'
            : 'border-white/[0.08] hover:border-white/[0.14]'
        )}
      >
        <Search className="w-4 h-4 text-white/40 shrink-0" />
        <input
          ref={inputRef}
          type="text"
          value={query}
          onChange={e => setQuery(e.target.value)}
          onFocus={() => setFocused(true)}
          onBlur={() => setTimeout(() => setFocused(false), 150)}
          onKeyDown={handleKeyDown}
          placeholder="Search players, teams…"
          className={cn(
            'flex-1 bg-transparent text-sm text-white placeholder-white/30',
            'outline-none min-w-0'
          )}
          autoComplete="off"
          spellCheck={false}
        />
        <AnimatePresence>
          {query && (
            <motion.button
              initial={{ opacity: 0, scale: 0.6 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.6 }}
              transition={{ duration: 0.15 }}
              onClick={clearSearch}
              className="p-0.5 rounded-full text-white/40 hover:text-white hover:bg-white/10 transition-colors"
            >
              <X className="w-3.5 h-3.5" />
            </motion.button>
          )}
        </AnimatePresence>
      </div>

      {/* Dropdown */}
      <AnimatePresence>
        {showDropdown && (
          <motion.div
            initial={{ opacity: 0, y: -4, scale: 0.97 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: -4, scale: 0.97 }}
            transition={{ duration: 0.15 }}
            className={cn(
              'absolute top-full left-0 right-0 mt-2 z-50',
              'rounded-2xl overflow-hidden',
              'bg-[#141420]/95 backdrop-blur-xl',
              'border border-white/[0.08]',
              'shadow-glass'
            )}
          >
            {results.map((player, i) => (
              <button
                key={player.id}
                onMouseDown={() => selectPlayer(player.id)}
                onMouseEnter={() => setSelectedIndex(i)}
                className={cn(
                  'w-full flex items-center gap-3 px-4 py-3 text-left transition-colors duration-100',
                  'border-b border-white/[0.04] last:border-b-0',
                  selectedIndex === i
                    ? 'bg-indigo-500/10 text-white'
                    : 'text-white/80 hover:bg-white/[0.04] hover:text-white'
                )}
              >
                <img
                  src={player.headshotUrl}
                  alt={player.name}
                  className="w-8 h-8 rounded-full object-cover bg-white/10"
                  onError={(e) => {
                    (e.target as HTMLImageElement).src = `https://ui-avatars.com/api/?name=${encodeURIComponent(player.name)}&background=6366f1&color=fff&size=48`
                  }}
                />
                <div className="min-w-0">
                  <p className="text-sm font-medium leading-tight">{player.name}</p>
                  <p className="text-xs text-white/40 truncate">
                    {player.teamAbbr} · {player.position}
                  </p>
                </div>
                <div className="ml-auto text-right shrink-0">
                  <p className="text-xs font-mono font-bold text-indigo-400">
                    {player.currentStats.pts.toFixed(1)}
                  </p>
                  <p className="text-[10px] text-white/30">PPG</p>
                </div>
              </button>
            ))}
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  )
}
