import { Outlet, Link, useLocation } from 'react-router-dom'
import { motion } from 'motion/react'
import { SearchBar } from '@/components/SearchBar'
import { cn } from '@/lib/utils'

export default function Layout() {
  const location = useLocation()
  const isHome = location.pathname === '/' || location.pathname === ''

  return (
    <div className="min-h-screen bg-background noise bg-grid">
      {/* Background ambient orbs */}
      <div className="fixed inset-0 pointer-events-none overflow-hidden z-0">
        <div
          className="absolute -top-40 -right-40 w-96 h-96 rounded-full opacity-[0.07] blur-3xl"
          style={{ background: 'radial-gradient(circle, #6366f1, transparent)' }}
        />
        <div
          className="absolute -bottom-40 -left-40 w-[500px] h-[500px] rounded-full opacity-[0.05] blur-3xl"
          style={{ background: 'radial-gradient(circle, #8b5cf6, transparent)' }}
        />
        <div
          className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[600px] h-[400px] opacity-[0.03] blur-3xl"
          style={{ background: 'radial-gradient(ellipse, #06b6d4, transparent)' }}
        />
      </div>

      {/* Top navigation bar */}
      <header className="fixed top-0 left-0 right-0 z-50 px-4 py-3">
        <div className="max-w-7xl mx-auto">
          <div className={cn(
            'flex items-center gap-3 px-4 py-2',
            'rounded-2xl backdrop-blur-xl',
            'bg-[#0f0f1a]/80 border border-white/[0.06]',
            'shadow-glass'
          )}>
            {/* Logo */}
            <Link
              to="/"
              className="flex items-center gap-2 shrink-0 group"
              aria-label="NBA Predictions Home"
            >
              <div className="relative">
                <div className="w-7 h-7 rounded-lg bg-gradient-to-br from-indigo-500 to-purple-600 flex items-center justify-center shadow-glow-sm">
                  <span className="text-[10px] font-black text-white">N</span>
                </div>
              </div>
              <span className="hidden sm:block text-sm font-bold text-gradient">
                NBA Predictions
              </span>
            </Link>

            {/* Divider */}
            <div className="w-px h-4 bg-white/[0.08] hidden sm:block" />

            {/* Search bar — expands to fill */}
            <div className="flex-1 min-w-0">
              <SearchBar />
            </div>

            {/* Season badge */}
            <div className="shrink-0 hidden sm:flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-white/[0.04] border border-white/[0.06]">
              <div className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse" />
              <span className="text-[10px] font-medium text-white/40">2025-26</span>
            </div>
          </div>
        </div>
      </header>

      {/* Page content */}
      <main className="relative z-10">
        <motion.div
          key={location.pathname}
          initial={{ opacity: 0, y: 8 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.3, ease: 'easeOut' }}
        >
          <Outlet />
        </motion.div>
      </main>

      {/* Footer */}
      <footer className="relative z-10 text-center py-6 text-[11px] text-white/15">
        NBA Predictions 2026 · Built with Vite + React + TypeScript
      </footer>
    </div>
  )
}
