"use client"
import { useEffect, useRef, useCallback } from 'react'
import { cn } from '@/lib/utils'

interface GlowingEffectProps {
  children: React.ReactNode
  className?: string
  containerClassName?: string
  glowColor?: string
  glowSize?: number
  disabled?: boolean
  spread?: number
  borderWidth?: number
  borderRadius?: string
  blur?: number
}

export function GlowingEffect({
  children,
  className,
  containerClassName,
  glowColor = 'rgba(99,102,241,0.6)',
  glowSize = 200,
  disabled = false,
  spread = 40,
  borderWidth = 1,
  borderRadius = '1rem',
  blur = 0,
}: GlowingEffectProps) {
  const containerRef = useRef<HTMLDivElement>(null)
  const glowRef = useRef<HTMLDivElement>(null)
  const borderRef = useRef<HTMLDivElement>(null)

  const handleMouseMove = useCallback(
    (e: MouseEvent) => {
      if (disabled || !containerRef.current || !glowRef.current || !borderRef.current) return

      const rect = containerRef.current.getBoundingClientRect()
      const x = e.clientX - rect.left
      const y = e.clientY - rect.top

      // Update mouse glow
      glowRef.current.style.background = `radial-gradient(${glowSize}px circle at ${x}px ${y}px, ${glowColor}, transparent 70%)`
      glowRef.current.style.opacity = '1'

      // Update border glow
      const cx = (x / rect.width) * 100
      const cy = (y / rect.height) * 100
      borderRef.current.style.background = `radial-gradient(${spread}% ${spread}% at ${cx}% ${cy}%, ${glowColor}, transparent)`
      borderRef.current.style.opacity = '1'
    },
    [disabled, glowColor, glowSize, spread]
  )

  const handleMouseLeave = useCallback(() => {
    if (!glowRef.current || !borderRef.current) return
    glowRef.current.style.opacity = '0'
    borderRef.current.style.opacity = '0'
  }, [])

  useEffect(() => {
    const container = containerRef.current
    if (!container || disabled) return

    container.addEventListener('mousemove', handleMouseMove)
    container.addEventListener('mouseleave', handleMouseLeave)

    return () => {
      container.removeEventListener('mousemove', handleMouseMove)
      container.removeEventListener('mouseleave', handleMouseLeave)
    }
  }, [disabled, handleMouseMove, handleMouseLeave])

  return (
    <div
      ref={containerRef}
      className={cn('relative group', containerClassName)}
      style={{ borderRadius }}
    >
      {/* Mouse-tracking background glow */}
      <div
        ref={glowRef}
        className="pointer-events-none absolute inset-0 z-0 opacity-0 transition-opacity duration-300"
        style={{
          borderRadius,
          filter: blur > 0 ? `blur(${blur}px)` : undefined,
        }}
      />

      {/* Animated border glow */}
      <div
        ref={borderRef}
        className="pointer-events-none absolute inset-0 z-10 opacity-0 transition-opacity duration-300"
        style={{
          borderRadius,
          padding: `${borderWidth}px`,
          WebkitMask: `linear-gradient(#fff 0 0) content-box, linear-gradient(#fff 0 0)`,
          WebkitMaskComposite: 'destination-out',
          maskComposite: 'exclude',
        }}
      />

      {/* Persistent subtle border */}
      <div
        className="pointer-events-none absolute inset-0 z-10"
        style={{
          borderRadius,
          border: `${borderWidth}px solid rgba(99,102,241,0.15)`,
        }}
      />

      {/* Content */}
      <div className={cn('relative z-20', className)}>
        {children}
      </div>
    </div>
  )
}

// Simpler wrapper for card usage
interface GlowCardProps extends React.HTMLAttributes<HTMLDivElement> {
  glowColor?: string
  intensity?: 'low' | 'medium' | 'high'
}

export function GlowCard({
  children,
  className,
  glowColor,
  intensity = 'medium',
  ...props
}: GlowCardProps) {
  const intensityMap = {
    low: { size: 120, spread: 25, color: glowColor ?? 'rgba(99,102,241,0.3)' },
    medium: { size: 200, spread: 40, color: glowColor ?? 'rgba(99,102,241,0.5)' },
    high: { size: 300, spread: 60, color: glowColor ?? 'rgba(99,102,241,0.7)' },
  }

  const settings = intensityMap[intensity]

  return (
    <GlowingEffect
      containerClassName={cn('w-full h-full', className)}
      glowColor={settings.color}
      glowSize={settings.size}
      spread={settings.spread}
      borderWidth={1}
      {...(props as object)}
    >
      {children}
    </GlowingEffect>
  )
}
