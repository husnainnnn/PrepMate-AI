// ─── Tone Definitions ────────────────────────────────────
// Each tone is a function that receives an AudioContext and plays itself.
// All tones are SHORT (max ~0.2s) — quick notification sounds.

export interface ToneOption {
  id: string
  name: string
  description: string
  play: (ctx: AudioContext) => void
}

const TONES: ToneOption[] = [
  // ── 1. Professional Chime (DEFAULT) ──────────────────
  {
    id: 'professional',
    name: 'Professional Chime',
    description: 'Quick warm chime — short & crisp',
    play: (ctx) => {
      const now = ctx.currentTime
      const g1 = ctx.createGain(); const o1 = ctx.createOscillator()
      o1.connect(g1); g1.connect(ctx.destination)
      o1.frequency.value = 880; o1.type = 'sine'
      g1.gain.setValueAtTime(0.2, now)
      g1.gain.exponentialRampToValueAtTime(0.01, now + 0.15)
      o1.start(now); o1.stop(now + 0.15)

      const g2 = ctx.createGain(); const o2 = ctx.createOscillator()
      o2.connect(g2); g2.connect(ctx.destination)
      o2.frequency.value = 1100; o2.type = 'sine'
      g2.gain.setValueAtTime(0.12, now + 0.06)
      g2.gain.exponentialRampToValueAtTime(0.01, now + 0.18)
      o2.start(now + 0.06); o2.stop(now + 0.18)
    },
  },

  // ── 2. Classic Ding ──────────────────────────────────
  {
    id: 'classic-ding',
    name: 'Classic Ding',
    description: 'Clean single short ding',
    play: (ctx) => {
      const now = ctx.currentTime
      const g = ctx.createGain(); const o = ctx.createOscillator()
      o.connect(g); g.connect(ctx.destination)
      o.frequency.value = 880; o.type = 'sine'
      g.gain.setValueAtTime(0.25, now)
      g.gain.exponentialRampToValueAtTime(0.01, now + 0.15)
      o.start(now); o.stop(now + 0.15)
    },
  },

  // ── 3. Soft Pop ──────────────────────────────────────
  {
    id: 'soft-pop',
    name: 'Soft Pop',
    description: 'Tiny gentle bubble pop',
    play: (ctx) => {
      const now = ctx.currentTime
      const g = ctx.createGain(); const o = ctx.createOscillator()
      o.connect(g); g.connect(ctx.destination)
      o.frequency.value = 600; o.type = 'sine'
      g.gain.setValueAtTime(0.15, now)
      g.gain.exponentialRampToValueAtTime(0.01, now + 0.1)
      o.start(now); o.stop(now + 0.1)
    },
  },

  // ── 4. Two-Tone (WhatsApp-style) ──────────────────────
  {
    id: 'two-tone',
    name: 'Two-Tone',
    description: 'Quick ascending double note',
    play: (ctx) => {
      const now = ctx.currentTime
      const g1 = ctx.createGain(); const o1 = ctx.createOscillator()
      o1.connect(g1); g1.connect(ctx.destination)
      o1.frequency.value = 740; o1.type = 'sine'
      g1.gain.setValueAtTime(0.18, now)
      g1.gain.exponentialRampToValueAtTime(0.01, now + 0.1)
      o1.start(now); o1.stop(now + 0.1)

      const g2 = ctx.createGain(); const o2 = ctx.createOscillator()
      o2.connect(g2); g2.connect(ctx.destination)
      o2.frequency.value = 1000; o2.type = 'sine'
      g2.gain.setValueAtTime(0.2, now + 0.08)
      g2.gain.exponentialRampToValueAtTime(0.01, now + 0.2)
      o2.start(now + 0.08); o2.stop(now + 0.2)
    },
  },

  // ── 5. Triple Chime ──────────────────────────────────
  {
    id: 'triple-chime',
    name: 'Triple Chime',
    description: 'Three quick ascending notes',
    play: (ctx) => {
      const now = ctx.currentTime; const notes = [523, 659, 784]
      notes.forEach((f, i) => {
        const g = ctx.createGain(); const o = ctx.createOscillator()
        o.connect(g); g.connect(ctx.destination)
        o.frequency.value = f; o.type = 'sine'
        g.gain.setValueAtTime(0.15, now + i * 0.05)
        g.gain.exponentialRampToValueAtTime(0.01, now + i * 0.05 + 0.1)
        o.start(now + i * 0.05); o.stop(now + i * 0.05 + 0.1)
      })
    },
  },

  // ── 6. Marimba ───────────────────────────────────────
  {
    id: 'marimba',
    name: 'Marimba',
    description: 'Warm wooden tone',
    play: (ctx) => {
      const now = ctx.currentTime
      const g = ctx.createGain(); const o = ctx.createOscillator()
      o.connect(g); g.connect(ctx.destination)
      o.frequency.value = 880; o.type = 'triangle'
      g.gain.setValueAtTime(0.22, now)
      g.gain.exponentialRampToValueAtTime(0.01, now + 0.12)
      o.start(now); o.stop(now + 0.12)
    },
  },

  // ── 7. Bell Ring ─────────────────────────────────────
  {
    id: 'bell-ring',
    name: 'Bell Ring',
    description: 'Soft bell ring',
    play: (ctx) => {
      const now = ctx.currentTime
      const g1 = ctx.createGain(); const o1 = ctx.createOscillator()
      o1.connect(g1); g1.connect(ctx.destination)
      o1.frequency.value = 1047; o1.type = 'sine'
      g1.gain.setValueAtTime(0.2, now)
      g1.gain.exponentialRampToValueAtTime(0.01, now + 0.2)
      o1.start(now); o1.stop(now + 0.2)

      const g2 = ctx.createGain(); const o2 = ctx.createOscillator()
      o2.connect(g2); g2.connect(ctx.destination)
      o2.frequency.value = 1568; o2.type = 'sine'
      g2.gain.setValueAtTime(0.08, now + 0.05)
      g2.gain.exponentialRampToValueAtTime(0.01, now + 0.15)
      o2.start(now + 0.05); o2.stop(now + 0.15)
    },
  },

  // ── 8. Digital Alert ─────────────────────────────────
  {
    id: 'digital-alert',
    name: 'Digital Alert',
    description: 'Sharp modern tone',
    play: (ctx) => {
      const now = ctx.currentTime
      const g = ctx.createGain(); const o = ctx.createOscillator()
      o.connect(g); g.connect(ctx.destination)
      o.frequency.value = 1000; o.type = 'square'
      g.gain.setValueAtTime(0.06, now)
      g.gain.exponentialRampToValueAtTime(0.01, now + 0.12)
      o.start(now); o.stop(now + 0.12)
    },
  },

  // ── 9. Gentle Knock ──────────────────────────────────
  {
    id: 'gentle-knock',
    name: 'Gentle Knock',
    description: 'Soft double tap',
    play: (ctx) => {
      const now = ctx.currentTime
      for (let i = 0; i < 2; i++) {
        const g = ctx.createGain(); const o = ctx.createOscillator()
        o.connect(g); g.connect(ctx.destination)
        o.frequency.value = 350 + i * 100; o.type = 'sine'
        const t = now + i * 0.1
        g.gain.setValueAtTime(0.12, t)
        g.gain.exponentialRampToValueAtTime(0.01, t + 0.04)
        o.start(t); o.stop(t + 0.04)
      }
    },
  },

  // ── 10. Crystal ──────────────────────────────────────
  {
    id: 'crystal',
    name: 'Crystal',
    description: 'Light clear chime',
    play: (ctx) => {
      const now = ctx.currentTime
      const g1 = ctx.createGain(); const o1 = ctx.createOscillator()
      o1.connect(g1); g1.connect(ctx.destination)
      o1.frequency.value = 1319; o1.type = 'sine'
      g1.gain.setValueAtTime(0.15, now)
      g1.gain.exponentialRampToValueAtTime(0.01, now + 0.15)
      o1.start(now); o1.stop(now + 0.15)

      const g2 = ctx.createGain(); const o2 = ctx.createOscillator()
      o2.connect(g2); g2.connect(ctx.destination)
      o2.frequency.value = 1760; o2.type = 'sine'
      g2.gain.setValueAtTime(0.08, now + 0.05)
      g2.gain.exponentialRampToValueAtTime(0.01, now + 0.12)
      o2.start(now + 0.05); o2.stop(now + 0.12)
    },
  },

  // ── 11. Breeze ───────────────────────────────────────
  {
    id: 'breeze',
    name: 'Breeze',
    description: 'Soft gentle swoosh',
    play: (ctx) => {
      const now = ctx.currentTime
      const g = ctx.createGain(); const o = ctx.createOscillator()
      o.connect(g); g.connect(ctx.destination)
      o.frequency.setValueAtTime(500, now)
      o.frequency.exponentialRampToValueAtTime(1000, now + 0.12)
      o.type = 'sine'
      g.gain.setValueAtTime(0.1, now)
      g.gain.exponentialRampToValueAtTime(0.01, now + 0.18)
      o.start(now); o.stop(now + 0.18)
    },
  },

  // ── 12. Echo ─────────────────────────────────────────
  {
    id: 'echo',
    name: 'Echo',
    description: 'Tone with a subtle bounce',
    play: (ctx) => {
      const now = ctx.currentTime
      const g1 = ctx.createGain(); const o1 = ctx.createOscillator()
      o1.connect(g1); g1.connect(ctx.destination)
      o1.frequency.value = 660; o1.type = 'sine'
      g1.gain.setValueAtTime(0.2, now)
      g1.gain.exponentialRampToValueAtTime(0.01, now + 0.1)
      o1.start(now); o1.stop(now + 0.1)

      const g2 = ctx.createGain(); const o2 = ctx.createOscillator()
      o2.connect(g2); g2.connect(ctx.destination)
      o2.frequency.value = 660; o2.type = 'sine'
      g2.gain.setValueAtTime(0.1, now + 0.1)
      g2.gain.exponentialRampToValueAtTime(0.01, now + 0.18)
      o2.start(now + 0.1); o2.stop(now + 0.18)
    },
  },
]

// ─── Storage helpers ─────────────────────────────────────
const STORAGE_KEY = 'notification-tone'

export function getSavedToneId(): string {
  try {
    return localStorage.getItem(STORAGE_KEY) || 'professional'
  } catch { return 'professional' }
}

export function saveToneId(id: string) {
  try { localStorage.setItem(STORAGE_KEY, id) } catch { /* noop */ }
}

// ─── Find tone by ID ─────────────────────────────────────
export function getToneById(id: string): ToneOption | undefined {
  return TONES.find(t => t.id === id)
}

export function getToneList(): ToneOption[] {
  return TONES
}

// ─── Singleton AudioContext (never closed — reused) ──────
// Keeps the context alive across multiple notifications.
// Resumes if suspended by autoplay policy.
let sharedCtx: AudioContext | null = null

function getOrCreateAudioContext(): AudioContext | null {
  try {
    if (!sharedCtx || sharedCtx.state === 'closed') {
      sharedCtx = new (window.AudioContext || (window as any).webkitAudioContext)()
    }
    // Resume if suspended (autoplay policy in Chrome)
    if (sharedCtx.state === 'suspended') {
      sharedCtx.resume().catch(() => {
        // If resume fails (no user gesture yet), sound won't play.
        // That's OK — next notification after a user gesture will work.
      })
    }
    return sharedCtx
  } catch {
    return null
  }
}

// ─── Play the selected (or given) tone ───────────────────
export function playNotificationSound(toneId?: string) {
  try {
    const ctx = getOrCreateAudioContext()
    if (!ctx) return

    const id = toneId || getSavedToneId()
    const tone = getToneById(id)
    if (tone) {
      tone.play(ctx)
    } else {
      getToneById('professional')?.play(ctx)
    }
  } catch {
    // Audio not supported or browser policy blocked playback
  }
}

// ─── Preview a tone (user clicking Play in settings) ────
export function previewTone(id: string) {
  playNotificationSound(id)
}

// ─── Desktop / Browser Push Notification ────────────────
// Use the same icon as the site's favicon (/images.png)
const NOTIF_ICON = window.location.origin + '/images.png'

export async function requestDesktopNotifPermission(): Promise<boolean> {
  if (!('Notification' in window)) return false
  if (Notification.permission === 'granted') return true
  if (Notification.permission === 'denied') return false
  const result = await Notification.requestPermission()
  return result === 'granted'
}

export function getDesktopNotifEnabled(): boolean {
  try { return localStorage.getItem('desktop-notif') === 'true' } catch { return false }
}

export function setDesktopNotifEnabled(enabled: boolean) {
  try { localStorage.setItem('desktop-notif', enabled ? 'true' : 'false') } catch { /* noop */ }
}

export function showDesktopNotification(title: string, body: string, link?: string) {
  if (!getDesktopNotifEnabled()) return
  if (!('Notification' in window)) return
  if (Notification.permission !== 'granted') return
  try {
    const notif = new Notification(title, { body, icon: NOTIF_ICON, tag: 'interview-platform' })
    if (link) {
      notif.onclick = () => { window.focus(); window.location.href = link; notif.close() }
    }
    setTimeout(() => notif.close(), 5000)
  } catch { /* desktop notif not supported */ }
}
