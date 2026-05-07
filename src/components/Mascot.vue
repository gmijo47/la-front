<script setup>
import { ref, computed, watch, onMounted, onUnmounted } from 'vue'
import { useTheme } from 'vuetify'
import { useMascotStore } from '../stores/mascot'

const vTheme = useTheme()
const isLight = computed(() => !vTheme.global.current.value.dark)

const mascot = useMascotStore()
const el = ref(null)
const showBubble = ref(false)
let bubbleTimer = null

// ── Body color customization ─────────────────────────────────────────────────
const bodyColor = ref('#7c3aed')
const bodyColorDark = computed(() => {
  // Darken the picked color by mixing with black
  const c = bodyColor.value
  const r = parseInt(c.slice(1,3),16), g = parseInt(c.slice(3,5),16), b = parseInt(c.slice(5,7),16)
  const dr = Math.round(r*0.45), dg = Math.round(g*0.45), db = Math.round(b*0.45)
  return `rgb(${dr},${dg},${db})`
})
const shadowColor = computed(() => {
  const c = bodyColor.value
  const r = parseInt(c.slice(1,3),16), g = parseInt(c.slice(3,5),16), b = parseInt(c.slice(5,7),16)
  return `rgba(${r},${g},${b},0.55)`
})
const showColorPicker = ref(false)
const PRESET_COLORS = ['#7c3aed','#2563eb','#059669','#dc2626','#d97706','#db2777','#0891b2','#4f46e5']

// ── Size customization ───────────────────────────────────────────────────────
const SIZE_OPTIONS = [
  { key: 'baby',   label: '👶 Baby',   w: 90,  h: 113 },
  { key: 'medium', label: '🧑 Medium', w: 130, h: 163 },
  { key: 'adult',  label: '🦸 Adult',  w: 175, h: 219 },
]
const mascotSize = ref('medium')
const svgW = computed(() => SIZE_OPTIONS.find(s => s.key === mascotSize.value).w)
const svgH = computed(() => SIZE_OPTIONS.find(s => s.key === mascotSize.value).h)

// ── Hat system ───────────────────────────────────────────────────────────────
const HAT_OPTIONS = [
  { key: 'none',      label: '🚫 None' },
  { key: 'cowboy',    label: '🤠 Cowboy' },
  { key: 'propeller', label: '🎡 Propeller' },
  { key: 'helmet',    label: '⛑ Helmet' },
]
const currentHat = ref('none')
function cycleHat() {
  const idx = HAT_OPTIONS.findIndex(h => h.key === currentHat.value)
  currentHat.value = HAT_OPTIONS[(idx + 1) % HAT_OPTIONS.length].key
}

// ── Flying / rope / swing state ────────────────────────────────────────────
const isFlying = ref(false)
const showRope = ref(false)

const ropeEl  = ref(null)

// ── Idle phone state ────────────────────────────────────────────────────────
const isIdle = ref(false)
const isSleeping = ref(false)
const idleMsgIdx = ref(0)
const IDLE_MSGS_BABY = [
  'goo goo 👶',
  'mama!! 🍼',
  'baba baba',
  'waaah 😭',
  'i want milkies 🥛',
  'nap time? 😴',
  'googoo gaga',
  'uuuh... 🧸',
  'poo poo 💩',
  'dada!! 🍼',
]
const IDLE_MSGS_ADULT = [
  '❤️ heyy',
  'what are you doing? 🥺',
  'i was thinking about you',
  '😍😍😍',
  'come online please',
  'been texting you all day',
  '💌 you\'re mine',
  'you know i love you? 🥰',
  'can\'t stop thinking...',
  '🌹🌹',
]
const currentIdleMsgs = computed(() =>
  mascotSize.value === 'baby' ? IDLE_MSGS_BABY : IDLE_MSGS_ADULT
)
let idleTimer = null
let idleMsgTimer = null
function resetIdle() {
  clearTimeout(idleTimer)
  clearTimeout(idleMsgTimer)
  if (isIdle.value || isSleeping.value) {
    isIdle.value = false
    isSleeping.value = false
    showBubble.value = false
  }
  if (!isDead.value && !specialMode) {
    idleTimer = setTimeout(() => startIdle(), 7000)
  }
}
function startIdle() {
  if (isDead.value || specialMode) return
  isIdle.value = true
  idleMsgIdx.value = 0
  showIdleMsg()
}
function showIdleMsg() {
  if (!isIdle.value) return
  showBubble.value = true
  idleMsgTimer = setTimeout(() => {
    const next = idleMsgIdx.value + 1
    if (next >= currentIdleMsgs.value.length) {
      // all messages shown — fall asleep
      showBubble.value = false
      isIdle.value = false
      isSleeping.value = true
      return
    }
    idleMsgIdx.value = next
    showIdleMsg()
  }, 2200)
}

// ── Sunglasses pocket-pull animation ────────────────────────────────────────
const glassesReady = ref(false)   // false = glasses hidden / animating
const glassesPhase = ref('done')  // 'flash' | 'pull' | 'done'
const showFlash = ref(false)

watch(isLight, (nowLight) => {
  if (nowLight) {
    // Flash the screen, then pull glasses out of pocket
    glassesReady.value = false
    glassesPhase.value = 'flash'
    showFlash.value = true
    setTimeout(() => { showFlash.value = false }, 320)
    setTimeout(() => {
      glassesPhase.value = 'pull'
      setTimeout(() => {
        glassesReady.value = true
        glassesPhase.value = 'done'
      }, 700)
    }, 350)
  } else {
    glassesReady.value = false
    glassesPhase.value = 'done'
  }
})

// ── Speech bubble timer ──────────────────────────────────────────────────────
watch(() => mascot.lastChanged, () => {
  if (isDead.value) return          // no talking when dead
  if (mascot.message) {
    showBubble.value = true
    clearTimeout(bubbleTimer)
    bubbleTimer = setTimeout(() => { showBubble.value = false }, 3500)
  } else {
    showBubble.value = false
  }
})

// ── Smooth mouse-following via lerp + RAF ────────────────────────────────────
let cx = 0, cy = 0
let tx = 0, ty = 0
let rafId = null
let specialMode = null   // null | 'plane' | 'bounce' | 'peek'
let specialTime = 0
let specialAngle = 0     // for peek: which corner

function onMouseMove(e) {
  resetIdle()
  if (specialMode) return
  const w = window.innerWidth, h = window.innerHeight
  const rawX = e.clientX + 80, rawY = e.clientY - 30
  tx = Math.max(4, Math.min(w - 120, rawX))
  ty = Math.max(55, Math.min(h - 160, rawY))
}

function loop() {
  const prevCx = cx
  const LERP = 0.08
  cx += (tx - cx) * LERP
  cy += (ty - cy) * LERP
  const vx = cx - prevCx
  const tilt = Math.max(-14, Math.min(14, vx * 1.8))
  if (el.value) {
    el.value.style.transform =
      `translate(${Math.round(cx)}px, ${Math.round(cy)}px) rotate(${tilt.toFixed(1)}deg)`
  }
  rafId = requestAnimationFrame(loop)
}

// ── Special animation loop ───────────────────────────────────────────────────
let specialRafId = null

function runPlane() {
  isFlying.value = true
  const w = window.innerWidth, h = window.innerHeight
  const duration = 3200
  // Pick random direction
  const dirPick = Math.floor(Math.random() * 4)
  let startX, startY, endX, endY, ampX, ampY
  if (dirPick === 0) { // left→right
    startX = -160; endX = w + 60; startY = h * 0.22; endY = h * 0.22; ampX = 0; ampY = 55
  } else if (dirPick === 1) { // right→left
    startX = w + 60; endX = -160; startY = h * 0.3; endY = h * 0.3; ampX = 0; ampY = 55
  } else if (dirPick === 2) { // top→bottom diagonal
    startX = -160; endX = w * 0.7; startY = -160; endY = h + 60; ampX = 30; ampY = 0
  } else { // bottom→top diagonal
    startX = w * 0.1; endX = w + 60; startY = h + 60; endY = -160; ampX = 30; ampY = 0
  }
  let start = null
  function frame(ts) {
    if (!start) start = ts
    const t = Math.min((ts - start) / duration, 1)
    const bx = startX + (endX - startX) * t
    const by = startY + (endY - startY) * t
    const sx = ampX ? Math.sin(t * Math.PI * 2.5) * ampX : 0
    const sy = ampY ? Math.sin(t * Math.PI * 2.5) * ampY - 30 : 0
    const x = bx + sx, y = by + sy
    const tilt = ampY ? Math.cos(t * Math.PI * 2.5) * 14 : (dirPick === 2 ? 25 : -25)
    if (el.value) el.value.style.transform = `translate(${x}px,${y}px) rotate(${tilt}deg)`
    cx = x; cy = y
    if (t < 1) specialRafId = requestAnimationFrame(frame)
    else runPlane() // loop
  }
  specialRafId = requestAnimationFrame(frame)
}

function runBounce() {
  const w = window.innerWidth, h = window.innerHeight
  const duration = 4000
  const baseY = h - 170
  const startX = w * 0.15
  const endX = w * 0.85
  let start = null
  function frame(ts) {
    if (!start) start = ts
    const t = Math.min((ts - start) / duration, 1)
    const x = startX + (endX - startX) * t
    const bounce = Math.abs(Math.sin(t * Math.PI * 6)) * 110
    const y = baseY - bounce
    const tilt = Math.sin(t * Math.PI * 6) * 18
    if (el.value) el.value.style.transform = `translate(${x}px,${y}px) rotate(${tilt}deg)`
    cx = x; cy = y
    if (t < 1) specialRafId = requestAnimationFrame(frame)
    else runBounce() // loop
  }
  specialRafId = requestAnimationFrame(frame)
}

const peekCorners = [
  { name: 'top-left',     startX: -130, startY: -130, peekX: -30, peekY: -30 },
  { name: 'top-right',    startX:  999, startY: -130, peekX: -100, peekY: -30, useW: true },
  { name: 'bottom-left',  startX: -130, startY:  999, peekX: -30, peekY: -100, useH: true },
  { name: 'bottom-right', startX:  999, startY:  999, peekX: -100, peekY: -100, useW: true, useH: true },
]
function runPeek() {
  const w = window.innerWidth, h = window.innerHeight
  const c = peekCorners[specialAngle % peekCorners.length]
  specialAngle++
  const sX = (c.useW ? w : 0) + c.startX
  const sY = (c.useH ? h : 0) + c.startY
  const pX = (c.useW ? w : 0) + c.peekX
  const pY = (c.useH ? h : 0) + c.peekY
  const phases = [
    { dur: 700,  fromX: sX, toX: pX, fromY: sY, toY: pY },  // peek in
    { dur: 1200, fromX: pX, toX: pX, fromY: pY, toY: pY },  // hold
    { dur: 700,  fromX: pX, toX: sX, fromY: pY, toY: sY },  // retreat
  ]
  let phaseIdx = 0, start = null
  function frame(ts) {
    if (!start) start = ts
    const ph = phases[phaseIdx]
    const t = Math.min((ts - start) / ph.dur, 1)
    const ease = t < 0.5 ? 2*t*t : -1+(4-2*t)*t
    const x = ph.fromX + (ph.toX - ph.fromX) * ease
    const y = ph.fromY + (ph.toY - ph.fromY) * ease
    if (el.value) el.value.style.transform = `translate(${x}px,${y}px) rotate(0deg)`
    cx = x; cy = y
    if (t >= 1) {
      phaseIdx++
      if (phaseIdx >= phases.length) { runPeek(); return } // loop
      start = ts
    }
    specialRafId = requestAnimationFrame(frame)
  }
  specialRafId = requestAnimationFrame(frame)
}

function runRope() {
  showRope.value = true
  const w = window.innerWidth, h = window.innerHeight
  const ropeX = Math.floor(Math.random() * (w - 300) + 100)
  const baseX = ropeX - 65
  const targetY = h * 0.5
  const duration = 2400
  let start = null
  function frame(ts) {
    if (!start) start = ts
    const t = Math.min((ts - start) / duration, 1)
    const ease = 1 - Math.pow(1 - t, 3)
    const x = baseX
    const rawY = -200 + (targetY + 200) * ease
    const swing = t > 0.82 ? Math.sin(((t - 0.82) / 0.18) * Math.PI * 5) * 22 * (1 - (t - 0.82) / 0.18) : 0
    if (el.value) el.value.style.transform = `translate(${x}px,${rawY}px) rotate(${swing}deg)`
    cx = x; cy = rawY
    if (ropeEl.value) {
      ropeEl.value.style.left = ropeX + 'px'
      ropeEl.value.style.height = Math.max(0, rawY + 20) + 'px'
    }
    if (t < 1) { specialRafId = requestAnimationFrame(frame); return }
    // Fade to white then exit downward
    if (el.value) el.value.style.transition = 'filter 0.4s ease'
    if (el.value) el.value.style.filter = 'brightness(10) saturate(0)'
    if (ropeEl.value) ropeEl.value.style.opacity = '0'
    setTimeout(() => {
      if (el.value) {
        el.value.style.transition = 'transform 0.5s ease, filter 0.3s ease'
        el.value.style.transform = `translate(${x}px,${h + 200}px)`
        el.value.style.filter = ''
      }
      setTimeout(() => {
        if (el.value) { el.value.style.transition = ''; el.value.style.filter = '' }
        showRope.value = false
        runRope() // loop with new random X
      }, 550)
    }, 420)
  }
  specialRafId = requestAnimationFrame(frame)
}

const SPECIALS = ['plane','bounce','peek','rope']
let specialIdx = 0

function triggerSpecial() {
  if (isDead.value) return
  // Stop current and advance to next
  cancelAnimationFrame(specialRafId)
  cancelAnimationFrame(rafId)
  isFlying.value = false
  showRope.value = false
  if (el.value) { el.value.style.transition = ''; el.value.style.filter = '' }
  specialMode = SPECIALS[specialIdx % SPECIALS.length]
  specialIdx++
  if (specialMode === 'plane') runPlane()
  else if (specialMode === 'bounce') runBounce()
  else if (specialMode === 'rope') runRope()
  else runPeek()
  // restart idle timer since activity
  resetIdle()
}

function stopSpecial() {
  if (!specialMode) return
  cancelAnimationFrame(specialRafId)
  endSpecial()
}

function endSpecial() {
  specialMode = null
  isFlying.value = false
  showRope.value = false
  cancelAnimationFrame(specialRafId)
  if (el.value) { el.value.style.transition = ''; el.value.style.filter = ''; el.value.style.transformOrigin = 'center bottom' }
  // Restore mouse follow
  const w = window.innerWidth, h = window.innerHeight
  tx = w - 140; ty = h - 270
  rafId = requestAnimationFrame(loop)
  resetIdle()
}

onMounted(() => {
  const w = window.innerWidth, h = window.innerHeight
  cx = w - 140; cy = h - 270
  tx = cx; ty = cy
  window.addEventListener('mousemove', onMouseMove, { passive: true })
  window.addEventListener('keydown', onKeyDown)
  rafId = requestAnimationFrame(loop)
  idleTimer = setTimeout(() => startIdle(), 7000)
})

onUnmounted(() => {
  window.removeEventListener('mousemove', onMouseMove)
  window.removeEventListener('keydown', onKeyDown)
  cancelAnimationFrame(rafId)
  cancelAnimationFrame(specialRafId)
  clearTimeout(bubbleTimer)
  clearTimeout(idleTimer)
  clearTimeout(idleMsgTimer)
})

// SVG expressions per mood
const mouthD = computed(() => {
  if (isIdle.value || isSleeping.value) return 'M 30 63 Q 40 66 50 63' // calm/sleeping mouth
  switch (mascot.mood) {
    case 'happy':       return 'M 28 62 Q 40 72 52 62'
    case 'worried':     return 'M 28 66 Q 40 61 52 66'
    case 'stressed':    return 'M 25 68 Q 40 60 55 68'
    case 'celebrating': return 'M 26 59 Q 40 74 54 59'
    default:            return 'M 30 63 Q 40 69 50 63'
  }
})
const pupilR  = computed(() => mascot.mood === 'stressed' ? 6.5 : 5)
const pupilDy = computed(() => mascot.mood === 'worried'  ? 1.5 : 0)
const showBrows = computed(() => mascot.mood === 'worried' || mascot.mood === 'stressed')
const browLeft  = computed(() => mascot.mood === 'stressed' ? 'M 20 30 Q 30 25 38 32' : 'M 22 33 Q 30 29 37 34')
const browRight = computed(() => mascot.mood === 'stressed' ? 'M 42 32 Q 50 25 60 30' : 'M 43 34 Q 50 29 58 33')
const showStars = computed(() => mascot.mood === 'celebrating')

// ── Kill / revive ────────────────────────────────────────────────────────────
const isDead = ref(false)

function killMascot() {
  if (isDead.value) return
  isDead.value = true
  showBubble.value = false
  isIdle.value = false
  isSleeping.value = false
  clearTimeout(idleTimer)
  clearTimeout(idleMsgTimer)
  cancelAnimationFrame(rafId)
  cancelAnimationFrame(specialRafId)
  specialMode = null
  isFlying.value = false
  showRope.value = false
  if (!el.value) return
  el.value.style.transformOrigin = 'center center'
  el.value.style.transition = 'transform 0.85s cubic-bezier(0.34,1.56,0.64,1)'
  setTimeout(() => {
    if (el.value) {
      el.value.style.transform = `translate(${Math.round(cx)}px, ${Math.round(cy)}px) rotate(90deg)`
      setTimeout(() => { if (el.value) el.value.style.transition = '' }, 900)
    }
  }, 16)
}

function reviveMascot() {
  if (!isDead.value) return
  isDead.value = false
  if (!el.value) return
  el.value.style.transformOrigin = 'center bottom'
  // Jump up from dead spot
  const snapX = Math.round(cx), snapY = Math.round(cy)
  el.value.style.transition = 'transform 0.1s ease'
  setTimeout(() => {
    if (!el.value) return
    el.value.style.transform = `translate(${snapX}px, ${snapY}px) rotate(0deg)`
    setTimeout(() => {
      if (!el.value) return
      el.value.style.transition = 'transform 0.7s cubic-bezier(0.34,1.56,0.64,1)'
      el.value.style.transform = `translate(${snapX}px, ${snapY - 60}px) rotate(0deg) scaleY(1.12)`
      setTimeout(() => {
        if (!el.value) return
        el.value.style.transition = 'transform 0.4s cubic-bezier(0.18,1,0.45,1)'
        el.value.style.transform = `translate(${snapX}px, ${snapY}px) rotate(0deg) scaleY(1)`
        setTimeout(() => {
          if (!el.value) return
          el.value.style.transition = ''
          tx = snapX; ty = snapY
          rafId = requestAnimationFrame(loop)
        }, 420)
      }, 720)
    }, 120)
  }, 16)
}

function onKeyDown(e) {
  if (!e.shiftKey) return
  const k = e.key.toUpperCase()
  if (k === 'K') killMascot()
  else if (k === 'R') reviveMascot()
  else if (k === 'A') triggerSpecial()
  else if (k === 'S') stopSpecial()
  else if (k === 'H') cycleHat()
}

// ── Info panel ───────────────────────────────────────────────────────────────
const showInfo = ref(false)
const SHORTCUTS = [
  { keys: 'Shift + K', desc: 'Kill mascot' },
  { keys: 'Shift + R', desc: 'Revive mascot' },
  { keys: 'Shift + A', desc: 'Next animation (swing → plane → bounce → peek → rope)' },
  { keys: 'Shift + S', desc: 'Stop current animation' },
  { keys: 'Shift + H', desc: 'Cycle hat (cowboy → propeller → helmet → none)' },
]
</script>

<template>
  <div ref="el" class="mascot-wrap" :class="[`mood-${mascot.mood}`, { 'is-dead': isDead }]">
    <!-- Speech bubble -->
    <Transition name="bubble">
      <div v-if="showBubble && !isDead" class="speech-bubble">
        {{ isIdle ? currentIdleMsgs[idleMsgIdx] : mascot.message }}
        <div class="bubble-tail" />
      </div>
    </Transition>

    <!-- Character SVG -->
    <svg :viewBox="'0 0 80 105'" :width="svgW" :height="svgH" overflow="visible" class="mascot-svg" aria-hidden="true">
      <defs>
        <linearGradient id="mg-body" x1="0.2" y1="0" x2="0" y2="1">
          <stop offset="0%" :stop-color="bodyColor"/>
          <stop offset="100%" :stop-color="bodyColorDark"/>
        </linearGradient>
        <linearGradient id="mg-shine" x1="0" y1="0" x2="1" y2="1">
          <stop offset="0%" stop-color="white" stop-opacity="0.18"/>
          <stop offset="100%" stop-color="white" stop-opacity="0"/>
        </linearGradient>
        <filter id="mg-drop" x="-30%" y="-20%" width="160%" height="160%">
          <feDropShadow dx="0" dy="6" stdDeviation="8" :flood-color="shadowColor" flood-opacity="0.55"/>
        </filter>
      </defs>

      <ellipse cx="40" cy="101" rx="18" ry="4" :fill="bodyColorDark" opacity="0.2"/>
      <path d="M 13 48 C 13 23 67 23 67 48 L 67 77 Q 62 87 56 80 Q 52 73 48 80 Q 44 87 40 80 Q 36 87 32 80 Q 28 73 24 80 Q 18 87 13 77 Z"
        fill="url(#mg-body)" filter="url(#mg-drop)"/>
      <ellipse cx="34" cy="42" rx="14" ry="9" fill="url(#mg-shine)"/>

      <!-- Phone during idle (left hand, not for baby) -->
      <template v-if="isIdle && !isDead && mascotSize !== 'baby'">
        <rect x="14" y="58" width="14" height="22" rx="2.5" fill="#1e293b"/>
        <rect x="15.5" y="60" width="11" height="15" rx="1" fill="#ec4899" opacity="0.85"/>
        <circle cx="21" cy="78" r="1.2" fill="#64748b"/>
        <!-- typing dots -->
        <circle cx="17.5" cy="64" r="1.1" fill="white" opacity="0.9"/>
        <circle cx="21" cy="64" r="1.1" fill="white" opacity="0.9"/>
        <circle cx="24.5" cy="64" r="1.1" fill="white" opacity="0.9"/>
      </template>

      <!-- Wings during plane animation -->
      <template v-if="isFlying">
        <path d="M 14 63 L -12 48 Q -16 60 -12 70 L 14 72 Z" fill="#94a3b8" opacity="0.92"/>
        <path d="M 66 63 L 92 48 Q 96 60 92 70 L 66 72 Z" fill="#94a3b8" opacity="0.92"/>
        <!-- Tail fin -->
        <path d="M 27 78 L 20 92 L 34 84 Z" fill="#cbd5e1" opacity="0.8"/>
      </template>

      <!-- ── Eyes: alive ── -->
      <template v-if="!isDead && !isSleeping">
        <circle cx="30" cy="48" r="10.5" fill="white"/>
        <circle :cx="32" :cy="48 + pupilDy" :r="pupilR" fill="#14082a"/>
        <circle :cx="35" :cy="45 + pupilDy" r="2.2" fill="white"/>
        <circle cx="50" cy="48" r="10.5" fill="white"/>
        <circle :cx="52" :cy="48 + pupilDy" :r="pupilR" fill="#14082a"/>
        <circle :cx="55" :cy="45 + pupilDy" r="2.2" fill="white"/>
        <template v-if="showStars">
          <text x="22" y="55" font-size="13" fill="#fbbf24" text-anchor="middle">✦</text>
          <text x="44" y="55" font-size="13" fill="#fbbf24" text-anchor="middle">✦</text>
        </template>
        <template v-if="showBrows">
          <path :d="browLeft"  stroke="#14082a" stroke-width="2.8" fill="none" stroke-linecap="round"/>
          <path :d="browRight" stroke="#14082a" stroke-width="2.8" fill="none" stroke-linecap="round"/>
        </template>
        <!-- Sunglasses (light theme) — animated pocket pull -->
        <g v-if="isLight"
           :class="['glasses-g', glassesPhase === 'pull' ? 'glasses-pull' : '', glassesReady ? 'glasses-on' : '']">
          <circle cx="30" cy="48" r="12" fill="#1e293b"/>
          <circle cx="50" cy="48" r="12" fill="#1e293b"/>
          <line x1="42" y1="48" x2="38" y2="48" stroke="#1e293b" stroke-width="3.5"/>
          <line x1="18" y1="46" x2="12" y2="43" stroke="#1e293b" stroke-width="2.8" stroke-linecap="round"/>
          <line x1="62" y1="46" x2="68" y2="43" stroke="#1e293b" stroke-width="2.8" stroke-linecap="round"/>
          <ellipse cx="24" cy="43" rx="3.5" ry="2" fill="white" opacity="0.22" transform="rotate(-20 24 43)"/>
          <ellipse cx="44" cy="43" rx="3.5" ry="2" fill="white" opacity="0.22" transform="rotate(-20 44 43)"/>
        </g>
      </template>

      <!-- ── Eyes: sleeping ── -->
      <template v-else-if="isSleeping">
        <circle cx="30" cy="48" r="10.5" fill="white"/>
        <circle cx="50" cy="48" r="10.5" fill="white"/>
        <!-- closed eye arcs -->
        <path d="M 20 48 Q 30 42 40 48" stroke="#14082a" stroke-width="2.8" fill="none" stroke-linecap="round"/>
        <path d="M 40 48 Q 50 42 60 48" stroke="#14082a" stroke-width="2.8" fill="none" stroke-linecap="round"/>
        <!-- zzz -->
        <text x="66" y="38" font-size="9" fill="#a78bfa" opacity="0.9">z</text>
        <text x="72" y="30" font-size="11" fill="#a78bfa" opacity="0.75">z</text>
        <text x="78" y="20" font-size="13" fill="#a78bfa" opacity="0.55">z</text>
      </template>

      <!-- ── Eyes: dead ── -->
      <template v-else>
        <circle cx="30" cy="48" r="10.5" fill="white"/>
        <circle cx="50" cy="48" r="10.5" fill="white"/>
        <line x1="23" y1="41" x2="37" y2="55" stroke="#14082a" stroke-width="3.5" stroke-linecap="round"/>
        <line x1="37" y1="41" x2="23" y2="55" stroke="#14082a" stroke-width="3.5" stroke-linecap="round"/>
        <line x1="43" y1="41" x2="57" y2="55" stroke="#14082a" stroke-width="3.5" stroke-linecap="round"/>
        <line x1="57" y1="41" x2="43" y2="55" stroke="#14082a" stroke-width="3.5" stroke-linecap="round"/>
      </template>

      <circle cx="18" cy="57" r="7" fill="#f472b6" opacity="0.28"/>
      <circle cx="62" cy="57" r="7" fill="#f472b6" opacity="0.28"/>
      <path v-if="!isDead" :d="mouthD" stroke="#14082a" stroke-width="2.6" fill="none" stroke-linecap="round"/>
      <path v-else d="M 30 67 Q 40 64 50 67" stroke="#14082a" stroke-width="2.6" fill="none" stroke-linecap="round"/>

      <!-- Baby pacifier -->
      <template v-if="mascotSize === 'baby' && !isDead">
        <!-- nipple -->
        <ellipse cx="40" cy="64" rx="5" ry="4.5" fill="#fecaca"/>
        <!-- shield -->
        <ellipse cx="40" cy="69.5" rx="11" ry="5" fill="#f9a8d4" opacity="0.95"/>
        <ellipse cx="40" cy="69.5" rx="11" ry="5" fill="none" stroke="#f472b6" stroke-width="1.3"/>
        <!-- ring handle -->
        <circle cx="40" cy="76" r="3.8" fill="none" stroke="#f472b6" stroke-width="2.2"/>
      </template>

      <template v-if="showStars && !isDead">
        <text x="3"  y="24" font-size="11" fill="#fbbf24" opacity="0.9">✨</text>
        <text x="63" y="18" font-size="9"  fill="#a78bfa" opacity="0.85">⭐</text>
        <text x="5"  y="72" font-size="8"  fill="#67e8f9" opacity="0.7">✦</text>
      </template>

      <!-- ── Hats ── -->
      <!-- Cowboy hat -->
      <template v-if="currentHat === 'cowboy'">
        <ellipse cx="40" cy="31" rx="28" ry="5.5" fill="#92400e"/>
        <path d="M 22 31 Q 22 12 40 12 Q 58 12 58 31 Z" fill="#78350f"/>
        <rect x="22" y="26" width="36" height="4" rx="1.5" fill="#f59e0b"/>
        <line x1="22" y1="28" x2="58" y2="28" stroke="#d97706" stroke-width="0.8" opacity="0.5"/>
      </template>
      <!-- Propeller hat -->
      <template v-if="currentHat === 'propeller'">
        <path d="M 18 34 Q 17 13 40 11 Q 63 13 62 34 Z" fill="#3b82f6"/>
        <rect x="17" y="31" width="46" height="5" rx="2.5" fill="#2563eb"/>
        <path d="M 27 32 Q 40 15 53 32" fill="none" stroke="#93c5fd" stroke-width="2.2"/>
        <line x1="40" y1="11" x2="40" y2="5" stroke="#64748b" stroke-width="2.5"/>
        <ellipse cx="40" cy="5" rx="10" ry="3" fill="#f87171" opacity="0.9"/>
        <ellipse cx="40" cy="5" rx="3" ry="10" fill="#fb923c" opacity="0.88"/>
        <circle cx="40" cy="5" r="2.5" fill="#fca5a5"/>
      </template>
      <!-- Helmet -->
      <template v-if="currentHat === 'helmet'">
        <path d="M 13 37 Q 13 8 40 8 Q 67 8 67 37 Z" fill="#1e293b"/>
        <path d="M 21 31 Q 21 14 40 14 Q 52 16 58 26" fill="none" stroke="#475569" stroke-width="2.2"/>
        <path d="M 21 30 Q 21 41 40 42 Q 59 41 59 30 Z" fill="#0ea5e9" opacity="0.62"/>
        <path d="M 21 30 Q 40 36 59 30" stroke="#38bdf8" stroke-width="1.5" fill="none"/>
        <circle cx="16" cy="34" r="2.2" fill="#475569"/>
        <circle cx="64" cy="34" r="2.2" fill="#475569"/>
      </template>
    </svg>
  </div>

  <!-- ── Rope ── -->
  <div v-if="showRope" ref="ropeEl" class="rope-line"/>

  <!-- ── Flash overlay ── -->
  <Transition name="flash">
    <div v-if="showFlash" class="flash-overlay"/>
  </Transition>

  <!-- ── HUD panel (bottom-right) ── -->
  <div class="hud-panel">

    <!-- Color + size picker popup -->
    <Transition name="pop">
      <div v-if="showColorPicker" class="color-popup">
        <div class="cp-title">Body color</div>
        <div class="cp-presets">
          <button
            v-for="c in PRESET_COLORS" :key="c"
            class="cp-swatch"
            :style="{ background: c, outline: bodyColor === c ? '2px solid white' : 'none' }"
            @click="bodyColor = c"
          />
        </div>
        <input type="color" v-model="bodyColor" class="cp-custom" title="Custom color"/>
        <div class="cp-divider"/>
        <div class="cp-title" style="margin-top:8px">Size</div>
        <div class="cp-sizes">
          <button
            v-for="s in SIZE_OPTIONS" :key="s.key"
            class="cp-size-btn"
            :class="{ active: mascotSize === s.key }"
            @click="mascotSize = s.key"
          >{{ s.label }}</button>
        </div>
        <div class="cp-divider"/>
        <div class="cp-title" style="margin-top:8px">Hat</div>
        <div class="cp-sizes">
          <button
            v-for="h in HAT_OPTIONS" :key="h.key"
            class="cp-size-btn"
            :class="{ active: currentHat === h.key }"
            @click="currentHat = h.key"
          >{{ h.label }}</button>
        </div>
      </div>
    </Transition>

    <!-- Info tooltip -->
    <Transition name="pop">
      <div v-if="showInfo" class="info-popup">
        <div class="ip-title">⌨ Shortcuts</div>
        <div v-for="s in SHORTCUTS" :key="s.keys" class="ip-row">
          <kbd>{{ s.keys }}</kbd>
          <span>{{ s.desc }}</span>
        </div>
      </div>
    </Transition>

    <!-- Buttons row -->
    <div class="hud-btns">
      <button class="hud-btn" title="Customize color" @click="showColorPicker = !showColorPicker; showInfo = false">
        🎨
      </button>
      <button class="hud-btn" :class="{ active: isDead }" :title="isDead ? 'Revive (Shift+R)' : 'Kill (Shift+K)'"
        @click="isDead ? reviveMascot() : killMascot()">
        {{ isDead ? '💫' : '💀' }}
      </button>
      <button class="hud-btn" title="Keyboard shortcuts" @mouseenter="showInfo = true" @mouseleave="showInfo = false"
        @click="showInfo = !showInfo">
        ℹ️
      </button>
    </div>
  </div>
</template>

<style scoped>
.mascot-wrap {
  position: fixed;
  left: 0; top: 0;
  z-index: 500;
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 6px;
  pointer-events: none;
  will-change: transform;
  transform-origin: center bottom;
}
.is-dead .mascot-svg {
  animation: none !important;
  filter: saturate(0.35) brightness(0.8);
}

/* ── HUD panel ── */
.hud-panel {
  position: fixed;
  bottom: 14px;
  right: 14px;
  z-index: 600;
  display: flex;
  flex-direction: column;
  align-items: flex-end;
  gap: 8px;
}
.hud-btns {
  display: flex;
  gap: 6px;
}
.hud-btn {
  background: rgba(18, 6, 46, 0.88);
  border: 1px solid rgba(167,139,250,0.4);
  border-radius: 50%;
  width: 40px; height: 40px;
  font-size: 18px;
  cursor: pointer;
  display: flex; align-items: center; justify-content: center;
  transition: background 0.18s, transform 0.15s, box-shadow 0.18s;
  backdrop-filter: blur(10px);
  pointer-events: auto;
  box-shadow: 0 2px 12px rgba(109,40,217,0.35);
}
.hud-btn:hover, .hud-btn.active {
  background: rgba(60,20,110,0.96);
  transform: scale(1.13);
  box-shadow: 0 4px 18px rgba(109,40,217,0.55);
}

/* ── Color popup ── */
.color-popup {
  background: rgba(14,5,36,0.95);
  border: 1px solid rgba(167,139,250,0.4);
  border-radius: 12px;
  padding: 12px 14px;
  backdrop-filter: blur(14px);
  box-shadow: 0 8px 28px rgba(109,40,217,0.4);
  pointer-events: auto;
}
.cp-title {
  font-size: 0.72rem;
  color: rgba(167,139,250,0.85);
  margin-bottom: 8px;
  font-weight: 600;
  letter-spacing: 0.05em;
  text-transform: uppercase;
}
.cp-presets {
  display: flex; gap: 7px; flex-wrap: wrap; margin-bottom: 8px;
}
.cp-swatch {
  width: 22px; height: 22px;
  border-radius: 50%;
  border: none;
  cursor: pointer;
  transition: transform 0.15s;
}
.cp-swatch:hover { transform: scale(1.2); }
.cp-custom {
  width: 100%;
  height: 28px;
  border-radius: 6px;
  border: none;
  cursor: pointer;
  background: none;
  padding: 0;
}
.cp-divider {
  height: 1px;
  background: rgba(167,139,250,0.2);
  margin: 4px 0;
}
.cp-sizes {
  display: flex;
  gap: 6px;
  margin-top: 4px;
}
.cp-size-btn {
  flex: 1;
  padding: 5px 4px;
  border-radius: 7px;
  border: 1px solid rgba(167,139,250,0.3);
  background: rgba(167,139,250,0.08);
  color: rgba(255,255,255,0.75);
  font-size: 0.72rem;
  cursor: pointer;
  transition: background 0.15s, transform 0.12s;
  white-space: nowrap;
}
.cp-size-btn:hover { background: rgba(167,139,250,0.22); transform: scale(1.05); }
.cp-size-btn.active {
  background: rgba(167,139,250,0.35);
  border-color: rgba(167,139,250,0.7);
  color: white;
  font-weight: 600;
}

/* ── Info popup ── */
.info-popup {
  background: rgba(14,5,36,0.96);
  border: 1px solid rgba(167,139,250,0.4);
  border-radius: 12px;
  padding: 12px 16px;
  backdrop-filter: blur(14px);
  box-shadow: 0 8px 28px rgba(109,40,217,0.4);
  min-width: 280px;
  pointer-events: auto;
}
.ip-title {
  font-size: 0.72rem;
  color: rgba(167,139,250,0.85);
  font-weight: 600;
  letter-spacing: 0.05em;
  text-transform: uppercase;
  margin-bottom: 8px;
}
.ip-row {
  display: flex;
  align-items: baseline;
  gap: 10px;
  margin-bottom: 5px;
  font-size: 0.8rem;
  color: rgba(255,255,255,0.8);
}
.ip-row:last-child { margin-bottom: 0; }
kbd {
  background: rgba(167,139,250,0.15);
  border: 1px solid rgba(167,139,250,0.35);
  border-radius: 5px;
  padding: 1px 7px;
  font-size: 0.72rem;
  color: rgba(167,139,250,0.9);
  white-space: nowrap;
  flex-shrink: 0;
}

/* ── Glasses pocket-pull animation ── */
.glasses-g {
  /* hidden below body by default when animating */
  transform: translateY(30px);
  opacity: 0;
  transition: none;
}
.glasses-pull {
  animation: glasses-pull-in 0.65s cubic-bezier(0.34,1.56,0.64,1) forwards;
}
.glasses-on {
  transform: translateY(0);
  opacity: 1;
  transition: none;
}
@keyframes glasses-pull-in {
  0%   { transform: translateY(32px) rotate(-12deg); opacity: 0; }
  40%  { opacity: 1; }
  70%  { transform: translateY(-4px) rotate(4deg); opacity: 1; }
  100% { transform: translateY(0) rotate(0deg);  opacity: 1; }
}

/* ── Flash overlay ── */
.flash-overlay {
  position: fixed;
  inset: 0;
  z-index: 9999;
  background: white;
  pointer-events: none;
}
.flash-enter-active { transition: opacity 0.08s ease; }
.flash-leave-active { transition: opacity 0.28s ease; }
.flash-enter-from   { opacity: 0; }
.flash-leave-to     { opacity: 0; }

/* ── Pop transition ── */
.pop-enter-active { transition: all 0.22s cubic-bezier(0.34,1.56,0.64,1); }
.pop-leave-active { transition: all 0.16s ease; }
.pop-enter-from  { opacity: 0; transform: scale(0.82) translateY(10px); }
.pop-leave-to    { opacity: 0; transform: scale(0.9) translateY(6px); }

/* ── Mood animations ── */
.mascot-svg { animation: m-float 3.2s ease-in-out infinite; }
.mood-happy .mascot-svg {
  animation: m-jump 0.55s cubic-bezier(0.34,1.56,0.64,1) 1,
             m-float 3.2s ease-in-out 0.55s infinite;
}
.mood-worried .mascot-svg {
  animation: m-tilt 0.45s ease-in-out 2,
             m-float 3.2s ease-in-out 0.9s infinite;
}
.mood-stressed .mascot-svg { animation: m-shake 0.1s linear 7; }
.mood-celebrating .mascot-svg { animation: m-bounce 0.35s cubic-bezier(0.34,1.56,0.64,1) 5; }

/* ── Speech bubble ── */
.speech-bubble {
  position: relative;
  background: rgba(18, 8, 40, 0.96);
  border: 1px solid rgba(167,139,250,0.5);
  border-radius: 13px;
  padding: 9px 14px;
  font-size: 0.79rem;
  line-height: 1.45;
  max-width: 240px;
  width: max-content;
  text-align: center;
  color: rgba(255,255,255,0.92);
  backdrop-filter: blur(12px);
  box-shadow: 0 6px 24px rgba(109,40,217,0.3);
  white-space: normal;
}
.bubble-tail {
  position: absolute;
  bottom: -8px; left: 50%;
  transform: translateX(-50%);
  width: 0; height: 0;
  border-left: 8px solid transparent;
  border-right: 8px solid transparent;
  border-top: 8px solid rgba(18,8,40,0.96);
}
.bubble-enter-active { transition: all 0.3s cubic-bezier(0.34,1.56,0.64,1); }
.bubble-leave-active { transition: all 0.22s ease; }
.bubble-enter-from   { opacity: 0; transform: scale(0.78) translateY(10px); }
.bubble-leave-to     { opacity: 0; transform: translateY(-6px); }

/* ── Keyframes ── */
@keyframes m-float {
  0%, 100% { transform: translateY(0); }
  50%       { transform: translateY(-9px); }
}
@keyframes m-jump {
  0%   { transform: translateY(0) scale(1); }
  40%  { transform: translateY(-22px) scale(1.06, 0.96); }
  70%  { transform: translateY(-6px) scale(0.97, 1.03); }
  100% { transform: translateY(0) scale(1); }
}
@keyframes m-tilt {
  0%, 100% { transform: rotate(0deg); }
  30%       { transform: rotate(-7deg); }
  70%       { transform: rotate(7deg); }
}
@keyframes m-shake {
  0%, 100% { transform: translateX(0); }
  25%       { transform: translateX(-5px); }
  75%       { transform: translateX(5px); }
}
@keyframes m-bounce {
  0%   { transform: translateY(0) scale(1); }
  50%  { transform: translateY(-14px) scale(1.09, 0.94); }
  100% { transform: translateY(0) scale(1); }
}

/* ── Rope ── */
.rope-line {
  position: fixed;
  top: 0;
  width: 5px;
  transform: translateX(-50%);
  background: repeating-linear-gradient(
    to bottom,
    #92400e 0px,
    #d97706 5px,
    #92400e 10px
  );
  border-radius: 3px;
  z-index: 498;
  pointer-events: none;
  box-shadow: 1px 0 4px rgba(120,60,0,0.35);
  transition: height 0.15s linear, opacity 0.3s ease;
}



/* ── Propeller spin ── */
@keyframes spin { to { transform: rotate(360deg); } }
</style>
