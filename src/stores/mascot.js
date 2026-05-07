import { defineStore } from 'pinia'
import { ref } from 'vue'

const STRESSED = [
  "Oh no… that's really high 😰",
  "That sounds really tough 😟",
  "Let's breathe through this 🌬️",
  "You're not alone in this 💜",
]
const WORRIED = [
  "Hmm, worth keeping an eye on 👀",
  "That's a lot to handle… 🤔",
  "You okay? 💭",
  "Keep going, you've got this",
]
const GOOD = [
  "That's great to hear! ✨",
  "Really healthy, love it 🌟",
  "Keep it up! 💚",
  "Love to see it! 🎉",
]
const CELEBRATE = [
  "All done! Let's see the result! 🎊",
  "Sending to the AI brain… 🧠",
  "Here we go! ✨",
  "Fingers crossed! 🤞",
]

function pick(arr) { return arr[Math.floor(Math.random() * arr.length)] }

// Slider keys where higher value = worse
const STRESSORS = new Set([
  'headache', 'breathing_problem', 'noise_level',
  'peer_pressure', 'bullying', 'study_load', 'future_career_concerns',
])

export const useMascotStore = defineStore('mascot', () => {
  const mood        = ref('idle')
  const message     = ref('')
  const lastChanged = ref(0)

  function _apply(m, msg) {
    mood.value        = m
    message.value     = msg
    lastChanged.value = Date.now()
  }

  // Generic react: value/max + whether higher is better or worse
  function react(value, max, higherIsBetter = false) {
    const pct = higherIsBetter ? value / max : 1 - value / max
    if (pct >= 0.85)      _apply('happy',     pick(GOOD))
    else if (pct >= 0.55) _apply('idle',      '')
    else if (pct >= 0.25) _apply('worried',   pick(WORRIED))
    else                  _apply('stressed',  pick(STRESSED))
  }

  // For named slider keys (uses STRESSORS to determine direction)
  function reactSlider(key, value, max) {
    react(value, max, !STRESSORS.has(key))
  }

  function celebrate() {
    _apply('celebrating', pick(CELEBRATE))
  }

  function setIdle() {
    mood.value    = 'idle'
    message.value = ''
  }

  function speak(text, m) {
    _apply(m || 'happy', text)
  }

  return { mood, message, lastChanged, react, reactSlider, celebrate, setIdle, speak }
})
