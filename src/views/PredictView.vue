<script setup>
import { ref, computed, watch } from 'vue'
import { useSurveyStore } from '../stores/survey'
import { useMascotStore } from '../stores/mascot'
import { predict, predictLifestyle } from '../api'

const survey  = useSurveyStore()
const mascot  = useMascotStore()
const mode    = ref(null)   // null | 'quick' | 'direct' | 'advanced'
const step    = ref(1)
const loading = ref(false)
const result  = ref(null)
const err     = ref(null)

// Quick mode state
const quickSleep         = ref(3)
const quickAcademic      = ref(3)
const quickStudyLoad     = ref(3)
const quickSocialSupport = ref(2)
const quickSafety        = ref(3)
const quickBasicNeeds    = ref(3)
const quickLoading = ref(false)
const quickResult  = ref(null)
const quickErr     = ref(null)

// Advance step → happy; back → idle
watch(step, (newS, oldS) => {
  if (newS > oldS && newS < 5) mascot.react(1, 1, true)
  else if (newS < oldS) mascot.setIdle()
})

// RSE items 2,4,7,8,9 are negative statements (reversed scoring)
const RSE_REVERSED = new Set([2, 4, 7, 8, 9])
function onRseAnswer(val, idx) {
  mascot.react(val, 3, !RSE_REVERSED.has(idx))
}

// ── PHQ-9 ──────────────────────────────────────────────────────────────────
const PHQ9 = [
  'Little interest or pleasure in doing things',
  'Feeling down, depressed, or hopeless',
  'Trouble falling or staying asleep, or sleeping too much',
  'Feeling tired or having little energy',
  'Poor appetite or overeating',
  'Feeling bad about yourself or feeling like a failure',
  'Trouble concentrating on things',
  'Moving or speaking unusually slowly, or being fidgety or restless',
  'Thoughts that you would be better off dead or of hurting yourself',
]
const FREQ = [
  { v: 0, lbl: 'Not at all'   },
  { v: 1, lbl: 'Several days' },
  { v: 2, lbl: 'Half the days'},
  { v: 3, lbl: 'Nearly every day' },
]
const phqSev = computed(() => {
  const s = survey.depressionScore
  if (s <= 4)  return { lbl: 'Minimal',          c: '#6ee7b7' }
  if (s <= 9)  return { lbl: 'Mild',              c: '#67e8f9' }
  if (s <= 14) return { lbl: 'Moderate',          c: '#fde68a' }
  if (s <= 19) return { lbl: 'Moderately Severe', c: '#fb923c' }
  return               { lbl: 'Severe',           c: '#f87171' }
})

// ── GAD-7 ──────────────────────────────────────────────────────────────────
const GAD7 = [
  'Feeling nervous, anxious, or on edge',
  'Not being able to stop or control worrying',
  'Worrying too much about different things',
  'Trouble relaxing',
  "Being so restless that it's hard to sit still",
  'Becoming easily annoyed or irritable',
  'Feeling afraid as if something awful might happen',
]
const gadSev = computed(() => {
  const s = survey.anxietyScore
  if (s <= 4)  return { lbl: 'Minimal',  c: '#6ee7b7' }
  if (s <= 9)  return { lbl: 'Mild',     c: '#67e8f9' }
  if (s <= 14) return { lbl: 'Moderate', c: '#fde68a' }
  return               { lbl: 'Severe',  c: '#f87171' }
})

// ── RSE ────────────────────────────────────────────────────────────────────
const RSE = [
  'On the whole, I am satisfied with myself.',
  'At times, I think I am no good at all.',
  'I feel that I have a number of good qualities.',
  'I am able to do things as well as most other people.',
  'I feel I do not have much to be proud of.',
  'I certainly feel useless at times.',
  "I feel that I'm a person of worth, at least on equal standing with others.",
  'I wish I could have more respect for myself.',
  'All in all, I am inclined to feel that I am a failure.',
  'I take a positive attitude toward myself.',
]
const RSE_OPTS = [
  { v: 3, lbl: 'Strongly Agree'    },
  { v: 2, lbl: 'Agree'             },
  { v: 1, lbl: 'Disagree'          },
  { v: 0, lbl: 'Strongly Disagree' },
]
const rseSev = computed(() => {
  const s = survey.selfEsteemScore
  if (s < 15) return { lbl: 'Low Self-Esteem',    c: '#f87171' }
  if (s < 25) return { lbl: 'Normal Self-Esteem', c: '#6ee7b7' }
  return               { lbl: 'High Self-Esteem', c: '#67e8f9' }
})

// ── Other factors ──────────────────────────────────────────────────────────
const SLIDERS = [
  { group: 'Physical', color: '#fb923c', bg: 'rgba(251,146,60,0.07)', icon: 'mdi-heart-pulse', items: [
    { key: 'headache',          lbl: 'Headache frequency',   max: 5 },
    { key: 'sleep_quality',     lbl: 'Sleep quality',        max: 5 },
    { key: 'breathing_problem', lbl: 'Breathing problems',   max: 5 },
  ]},
  { group: 'Environment', color: '#34d399', bg: 'rgba(52,211,153,0.07)', icon: 'mdi-home-city', items: [
    { key: 'noise_level',       lbl: 'Noise level',          max: 5 },
    { key: 'living_conditions', lbl: 'Living conditions',    max: 5 },
    { key: 'safety',            lbl: 'Safety',               max: 5 },
    { key: 'basic_needs',       lbl: 'Basic needs met',      max: 5 },
  ]},
  { group: 'Academic & Social', color: '#60a5fa', bg: 'rgba(96,165,250,0.07)', icon: 'mdi-school', items: [
    { key: 'academic_performance',         lbl: 'Academic performance',  max: 5 },
    { key: 'study_load',                   lbl: 'Study load',            max: 5 },
    { key: 'teacher_student_relationship', lbl: 'Teacher relationship',  max: 5 },
    { key: 'future_career_concerns',       lbl: 'Career concerns',       max: 5 },
    { key: 'social_support',               lbl: 'Social support',        max: 3 },
    { key: 'peer_pressure',                lbl: 'Peer pressure',         max: 5 },
    { key: 'extracurricular_activities',   lbl: 'Extracurricular',       max: 5 },
    { key: 'bullying',                     lbl: 'Bullying exposure',      max: 5 },
  ]},
]

// ── Nav helpers ────────────────────────────────────────────────────────────
const canNext = computed(() => {
  if (step.value === 1) return survey.phq9Complete
  if (step.value === 2) return survey.gad7Complete
  if (step.value === 3) return survey.rseComplete
  return true
})

async function submitQuick() {
  mascot.react(1, 3, true)
  quickLoading.value = true
  quickErr.value = null
  try {
    const { data } = await predictLifestyle({
      sleep_quality:        quickSleep.value,
      academic_performance: quickAcademic.value,
      study_load:           quickStudyLoad.value,
      social_support:       quickSocialSupport.value,
      safety:               quickSafety.value,
      basic_needs:          quickBasicNeeds.value,
    })
    quickResult.value = data
    mascot.celebrate()
  } catch (e) {
    quickErr.value = e?.response?.data?.detail ?? 'Prediction failed — is the backend running?'
    mascot.speak('Hmm, something went wrong.', 'worried')
  } finally {
    quickLoading.value = false
  }
}

async function submitDirect() {
  // Direct mode removed — this function is no longer used
}

async function submit() {
  mascot.celebrate()
  loading.value = true
  err.value = null
  try {
    const { data } = await predict(survey.payload)
    result.value = data
    step.value = 5
  } catch (e) {
    err.value = e?.response?.data?.detail ?? 'Prediction failed — is the backend running?'
  } finally {
    loading.value = false
  }
}

function restart() {
  survey.reset()
  result.value = null
  quickResult.value = null
  err.value = null
  quickErr.value = null
  step.value = 1
  mode.value = null
}

const RMETA = {
  Low:    { c: '#10b981', bg: 'rgba(16,185,129,0.12)',  border: 'rgba(16,185,129,0.3)',  icon: 'mdi-emoticon-happy'   },
  Medium: { c: '#f59e0b', bg: 'rgba(245,158,11,0.1)',   border: 'rgba(245,158,11,0.3)',  icon: 'mdi-emoticon-neutral' },
  High:   { c: '#ef4444', bg: 'rgba(239,68,68,0.1)',    border: 'rgba(239,68,68,0.3)',   icon: 'mdi-emoticon-sad'     },
}
const rmeta = computed(() => result.value ? RMETA[result.value.stress_label] ?? RMETA.Low : null)
const classLabel = { 0: 'Low', 1: 'Medium', 2: 'High' }
const classColor = { 0: '#10b981', 1: '#f59e0b', 2: '#ef4444' }

const STEPS = ['PHQ-9', 'GAD-7', 'RSE', 'Factors']
</script>

<template>
  <div class="predict-page">
    <div class="predict-inner">

      <!-- ── Mode Selector ───────────────────────────────────────────── -->
      <Transition name="fade-slide" mode="out-in">
        <div v-if="!mode && !result && !quickResult" key="mode-sel" class="mode-sel">
          <h1 class="mode-sel-title">Choose Prediction Mode</h1>
          <p class="mode-sel-sub">Each mode uses a different amount of information to estimate your stress level.</p>
          <div class="mode-cards" style="grid-template-columns: 1fr 1fr">
            <div class="mode-card" @click="mode = 'quick'">
              <div class="mode-badge lr-badge">Logistic Regression</div>
              <v-icon icon="mdi-flash" size="32" color="#f59e0b" class="mb-2"/>
              <div class="mode-card-title">Quick</div>
              <p class="mode-card-desc">Rate 6 lifestyle factors — sleep, academic performance, study load, social support, safety &amp; basic needs. Instant result using Logistic Regression.</p>
              <div class="mode-card-action">Select →</div>
            </div>
            <div class="mode-card mode-card-primary" @click="mode = 'advanced'">
              <div class="mode-badge nn-badge">Neural Network</div>
              <v-icon icon="mdi-clipboard-text-outline" size="32" color="#60a5fa" class="mb-2"/>
              <div class="mode-card-title">Advanced</div>
              <p class="mode-card-desc">Full validated survey — PHQ-9 depression, GAD-7 anxiety, RSE self-esteem and all other lifestyle factors. Full neural network prediction.</p>
              <div class="mode-card-action">Select →</div>
            </div>
          </div>
        </div>
      </Transition>

      <!-- ── Quick Mode ─────────────────────────────────────────────── -->
      <Transition name="fade-slide" mode="out-in">
        <div v-if="mode === 'quick' && !quickResult" key="quick-form">
          <div class="mode-header">
            <button class="btn-back" @click="mode = null"><v-icon icon="mdi-arrow-left" size="16"/> Back</button>
            <div class="mode-badge lr-badge">Quick · Logistic Regression</div>
          </div>
          <div class="q-card" style="padding: 24px;">
            <div class="q-card-title" style="margin-bottom:6px;">Lifestyle Quick Prediction</div>
            <div class="q-card-sub" style="margin-bottom:28px;">Rate each factor — 0 = very poor/none, max = excellent/high.</div>

            <div class="slider-item">
              <div class="slider-meta"><span class="slider-lbl">Sleep Quality</span><span class="slider-val" style="color:#60a5fa">{{ quickSleep }} / 5</span></div>
              <div class="slider-hint">0 — very poor &nbsp;·&nbsp; 5 — excellent</div>
              <input type="range" v-model.number="quickSleep" min="0" max="5" step="1" class="clean-range" :style="{ '--pct': (quickSleep/5*100)+'%', '--fill': '#60a5fa' }" />
            </div>

            <div class="slider-item">
              <div class="slider-meta"><span class="slider-lbl">Academic Performance</span><span class="slider-val" style="color:#34d399">{{ quickAcademic }} / 5</span></div>
              <div class="slider-hint">0 — failing &nbsp;·&nbsp; 5 — excellent</div>
              <input type="range" v-model.number="quickAcademic" min="0" max="5" step="1" class="clean-range" :style="{ '--pct': (quickAcademic/5*100)+'%', '--fill': '#34d399' }" />
            </div>

            <div class="slider-item">
              <div class="slider-meta"><span class="slider-lbl">Study Load</span><span class="slider-val" style="color:#fb923c">{{ quickStudyLoad }} / 5</span></div>
              <div class="slider-hint">1 — very light &nbsp;·&nbsp; 5 — overwhelming</div>
              <input type="range" v-model.number="quickStudyLoad" min="1" max="5" step="1" class="clean-range" :style="{ '--pct': ((quickStudyLoad-1)/4*100)+'%', '--fill': '#fb923c' }" />
            </div>

            <div class="slider-item">
              <div class="slider-meta"><span class="slider-lbl">Social Support</span><span class="slider-val" style="color:#a78bfa">{{ quickSocialSupport }} / 3</span></div>
              <div class="slider-hint">0 — isolated &nbsp;·&nbsp; 3 — strong network</div>
              <input type="range" v-model.number="quickSocialSupport" min="0" max="3" step="1" class="clean-range" :style="{ '--pct': (quickSocialSupport/3*100)+'%', '--fill': '#a78bfa' }" />
            </div>

            <div class="slider-item">
              <div class="slider-meta"><span class="slider-lbl">Safety (home / campus)</span><span class="slider-val" style="color:#67e8f9">{{ quickSafety }} / 5</span></div>
              <div class="slider-hint">0 — unsafe &nbsp;·&nbsp; 5 — very safe</div>
              <input type="range" v-model.number="quickSafety" min="0" max="5" step="1" class="clean-range" :style="{ '--pct': (quickSafety/5*100)+'%', '--fill': '#67e8f9' }" />
            </div>

            <div class="slider-item" style="margin-bottom:0">
              <div class="slider-meta"><span class="slider-lbl">Basic Needs Met</span><span class="slider-val" style="color:#fde68a">{{ quickBasicNeeds }} / 5</span></div>
              <div class="slider-hint">0 — unmet &nbsp;·&nbsp; 5 — fully met</div>
              <input type="range" v-model.number="quickBasicNeeds" min="0" max="5" step="1" class="clean-range" :style="{ '--pct': (quickBasicNeeds/5*100)+'%', '--fill': '#fde68a' }" />
            </div>
          </div>
          <div class="nav-row" style="margin-top:16px">
            <div/>
            <button class="btn-predict" :disabled="quickLoading" @click="submitQuick">
              <v-progress-circular v-if="quickLoading" size="16" width="2" indeterminate />
              <v-icon v-else icon="mdi-flash" size="18"/>
              {{ quickLoading ? 'Analysing…' : 'Quick Predict' }}
            </button>
          </div>
          <div v-if="quickErr" class="err-box">{{ quickErr }}</div>
        </div>
      </Transition>

      <!-- Quick result -->
      <Transition name="fade-slide" mode="out-in">
        <div v-if="mode === 'quick' && quickResult" key="quick-result" class="result-wrap">
          <div class="result-card" :style="{ background: RMETA[quickResult.stress_label]?.bg, borderColor: RMETA[quickResult.stress_label]?.border }">
            <v-icon :icon="RMETA[quickResult.stress_label]?.icon" size="64" :style="{ color: RMETA[quickResult.stress_label]?.c }" class="result-icon"/>
            <div class="result-hint">Quick Prediction (Logistic Regression)</div>
            <div class="result-main" :style="{ color: RMETA[quickResult.stress_label]?.c }">{{ quickResult.stress_label }}</div>
          </div>
          <div class="proba-card">
            <div class="proba-title">Confidence Breakdown</div>
            <div v-for="(prob, cls) in quickResult.confidence" :key="cls" class="proba-row">
              <span class="proba-lbl">{{ classLabel[cls] }}</span>
              <div class="proba-track">
                <div class="proba-fill" :style="{ width: (prob*100).toFixed(1)+'%', background: classColor[cls] }"/>
              </div>
              <span class="proba-pct" :style="{ color: classColor[cls] }">{{ (prob*100).toFixed(1) }}%</span>
            </div>
          </div>
          <button class="btn-restart" @click="restart"><v-icon icon="mdi-refresh" size="16"/> Try Again</button>
        </div>
      </Transition>


      <!-- ── Advanced Mode (original 4-step survey) ─────────────────── -->
      <Transition name="fade-slide" mode="out-in">
        <div v-if="mode === 'advanced' && step <= 4 && !result" key="adv-header">
          <div class="mode-header">
            <button class="btn-back" @click="mode = null; step = 1"><v-icon icon="mdi-arrow-left" size="16"/> Back</button>
            <div class="mode-badge nn-badge">Advanced · Neural Network Survey</div>
          </div>
        </div>
      </Transition>

      <!-- ── Step bar (Advanced only) ────────────────────────────────── -->
      <div v-if="mode === 'advanced' && step <= 4" class="step-bar">
        <div v-for="(lbl, i) in STEPS" :key="i"
          class="step-node"
          :class="{ 'done': step > i+1, 'active': step === i+1 }"
        >
          <div class="step-circle">
            <v-icon v-if="step > i+1" icon="mdi-check" size="14"/>
            <span v-else>{{ i+1 }}</span>
          </div>
          <span class="step-lbl">{{ lbl }}</span>
          <div v-if="i < STEPS.length-1" class="step-line" :class="{ 'filled': step > i+1 }"/>
        </div>
      </div>

      <!-- ── PHQ-9 ────────────────────────────────────────────────────── -->
      <Transition name="fade-slide" mode="out-in">
        <div v-if="mode === 'advanced' && step === 1" key="phq9">
          <div class="q-card">
            <div class="q-card-head">
              <div>
                <div class="q-card-title">PHQ-9 Depression Screen</div>
                <div class="q-card-sub">Over the last 2 weeks, how often have you been bothered by…</div>
              </div>
              <div v-if="survey.phq9Complete" class="sev-badge" :style="{ color: phqSev.c, borderColor: phqSev.c + '50' }">
                {{ survey.depressionScore }}/27 · {{ phqSev.lbl }}
              </div>
            </div>

            <div v-for="(q, i) in PHQ9" :key="i" class="q-row">
              <div class="q-num">{{ i+1 }}</div>
              <div class="q-content">
                <div class="q-text">{{ q }}</div>
                <div class="q-options">
                  <label v-for="opt in FREQ" :key="opt.v" class="q-opt" :class="{ selected: survey.phq9[i] === opt.v }"
                    @click="mascot.react(opt.v, 3, false)">
                    <input type="radio" :name="`phq9-${i}`" :value="opt.v" v-model="survey.phq9[i]" />
                    <span>{{ opt.lbl }}</span>
                  </label>
                </div>
              </div>
            </div>
          </div>
          <div class="nav-row">
            <div/>
            <button class="btn-next" :disabled="!canNext" @click="step = 2">
              Next: GAD-7 <v-icon icon="mdi-arrow-right" size="16"/>
            </button>
          </div>
        </div>
      </Transition>

      <!-- ── GAD-7 ────────────────────────────────────────────────────── -->
      <Transition name="fade-slide" mode="out-in">
        <div v-if="mode === 'advanced' && step === 2" key="gad7">
          <div class="q-card">
            <div class="q-card-head">
              <div>
                <div class="q-card-title">GAD-7 Anxiety Screen</div>
                <div class="q-card-sub">Over the last 2 weeks, how often have you been bothered by…</div>
              </div>
              <div v-if="survey.gad7Complete" class="sev-badge" :style="{ color: gadSev.c, borderColor: gadSev.c + '50' }">
                {{ survey.anxietyScore }}/21 · {{ gadSev.lbl }}
              </div>
            </div>

            <div v-for="(q, i) in GAD7" :key="i" class="q-row">
              <div class="q-num">{{ i+1 }}</div>
              <div class="q-content">
                <div class="q-text">{{ q }}</div>
                <div class="q-options">
                  <label v-for="opt in FREQ" :key="opt.v" class="q-opt" :class="{ selected: survey.gad7[i] === opt.v }"
                    @click="mascot.react(opt.v, 3, false)">
                    <input type="radio" :name="`gad7-${i}`" :value="opt.v" v-model="survey.gad7[i]" />
                    <span>{{ opt.lbl }}</span>
                  </label>
                </div>
              </div>
            </div>
          </div>
          <div class="nav-row">
            <button class="btn-back" @click="step = 1"><v-icon icon="mdi-arrow-left" size="16"/> Back</button>
            <button class="btn-next" :disabled="!canNext" @click="step = 3">
              Next: RSE <v-icon icon="mdi-arrow-right" size="16"/>
            </button>
          </div>
        </div>
      </Transition>

      <!-- ── RSE ──────────────────────────────────────────────────────── -->
      <Transition name="fade-slide" mode="out-in">
        <div v-if="mode === 'advanced' && step === 3" key="rse">
          <div class="q-card">
            <div class="q-card-head">
              <div>
                <div class="q-card-title">Rosenberg Self-Esteem Scale</div>
                <div class="q-card-sub">How much do you agree with each statement?</div>
              </div>
              <div v-if="survey.rseComplete" class="sev-badge" :style="{ color: rseSev.c, borderColor: rseSev.c + '50' }">
                {{ survey.selfEsteemScore }}/30 · {{ rseSev.lbl }}
              </div>
            </div>

            <div v-for="(q, i) in RSE" :key="i" class="q-row">
              <div class="q-num">{{ i+1 }}</div>
              <div class="q-content">
                <div class="q-text">{{ q }}</div>
                <div class="q-options rse-opts">
                  <label v-for="opt in RSE_OPTS" :key="opt.v" class="q-opt" :class="{ selected: survey.rse[i] === opt.v }"
                    @click="onRseAnswer(opt.v, i)">
                    <input type="radio" :name="`rse-${i}`" :value="opt.v" v-model="survey.rse[i]" />
                    <span>{{ opt.lbl }}</span>
                  </label>
                </div>
              </div>
            </div>
          </div>
          <div class="nav-row">
            <button class="btn-back" @click="step = 2"><v-icon icon="mdi-arrow-left" size="16"/> Back</button>
            <button class="btn-next" :disabled="!canNext" @click="step = 4">
              Next: Factors <v-icon icon="mdi-arrow-right" size="16"/>
            </button>
          </div>
        </div>
      </Transition>

      <!-- ── Other factors ─────────────────────────────────────────────── -->
      <Transition name="fade-slide" mode="out-in">
        <div v-if="mode === 'advanced' && step === 4" key="factors">
          <div class="q-card">
            <div class="q-card-head">
              <div>
                <div class="q-card-title">Additional Factors</div>
                <div class="q-card-sub">Rate each factor from 0 (none/low) to max</div>
              </div>
            </div>

            <!-- Mental health history -->
            <div class="factors-section" style="--sec-color:#f472b6; --sec-bg:rgba(244,114,182,0.07)">
              <div class="factor-group-head">
                <v-icon icon="mdi-brain" size="15" style="color:#f472b6"/>
                <div class="factor-group-lbl" style="color:#f472b6">Mental Health History</div>
              </div>
              <div class="toggle-row">
                <button class="toggle-btn" :class="{ active: survey.others.mental_health_history === 0 }"
                  style="--tb-color:#f472b6"
                  @click="survey.others.mental_health_history = 0">No history</button>
                <button class="toggle-btn" :class="{ active: survey.others.mental_health_history === 1 }"
                  style="--tb-color:#f472b6"
                  @click="survey.others.mental_health_history = 1">Yes, I have history</button>
              </div>
            </div>

            <!-- Grouped sliders with color per category -->
            <div v-for="grp in SLIDERS" :key="grp.group"
              class="factors-section"
              :style="{ '--sec-color': grp.color, '--sec-bg': grp.bg }"
            >
              <div class="factor-group-head">
                <v-icon :icon="grp.icon" size="15" :style="{ color: grp.color }"/>
                <div class="factor-group-lbl" :style="{ color: grp.color }">{{ grp.group }}</div>
              </div>
              <div v-for="item in grp.items" :key="item.key" class="slider-item">
                <div class="slider-meta">
                  <span class="slider-lbl">{{ item.lbl }}</span>
                  <span class="slider-val" :style="{ color: grp.color }">{{ survey.others[item.key] }} / {{ item.max }}</span>
                </div>
                <input type="range"
                  v-model.number="survey.others[item.key]"
                  :min="0" :max="item.max" :step="1"
                  class="clean-range"
                  :style="{
                    '--pct': (survey.others[item.key] / item.max * 100) + '%',
                    '--fill': grp.color
                  }"
                  @input="mascot.reactSlider(item.key, survey.others[item.key], item.max)"
                />
              </div>
            </div>
          </div>

          <div class="nav-row">
            <button class="btn-back" @click="step = 3"><v-icon icon="mdi-arrow-left" size="16"/> Back</button>
            <button class="btn-predict" :disabled="loading" @click="submit">
              <v-progress-circular v-if="loading" size="16" width="2" indeterminate />
              <v-icon v-else icon="mdi-brain" size="18"/>
              {{ loading ? 'Analysing…' : 'Predict Stress Level' }}
            </button>
          </div>
          <div v-if="err" class="err-box">{{ err }}</div>
        </div>
      </Transition>

      <!-- ── Result ────────────────────────────────────────────────────── -->
      <Transition name="fade-slide" mode="out-in">
        <div v-if="mode === 'advanced' && step === 5 && result" key="result" class="result-wrap">
          <div class="result-card" :style="{ background: rmeta.bg, borderColor: rmeta.border }">
            <v-icon :icon="rmeta.icon" size="64" :style="{ color: rmeta.c }" class="result-icon"/>
            <div class="result-hint">Predicted Stress Level</div>
            <div class="result-main" :style="{ color: rmeta.c }">{{ result.stress_label }}</div>
          </div>

          <div class="proba-card">
            <div class="proba-title">Confidence Breakdown</div>
            <div v-for="(prob, cls) in result.confidence" :key="cls" class="proba-row">
              <span class="proba-lbl">{{ classLabel[cls] }}</span>
              <div class="proba-track">
                <div class="proba-fill" :style="{ width: (prob*100).toFixed(1)+'%', background: classColor[cls] }"/>
              </div>
              <span class="proba-pct" :style="{ color: classColor[cls] }">{{ (prob*100).toFixed(1) }}%</span>
            </div>
          </div>

          <div class="scores-row">
            <div class="score-box">
              <div class="score-n">{{ survey.depressionScore }}</div>
              <div class="score-lbl">PHQ-9 / 27</div>
            </div>
            <div class="score-box">
              <div class="score-n" style="color:#67e8f9">{{ survey.anxietyScore }}</div>
              <div class="score-lbl">GAD-7 / 21</div>
            </div>
            <div class="score-box">
              <div class="score-n" style="color:#60a5fa">{{ survey.selfEsteemScore }}</div>
              <div class="score-lbl">RSE / 30</div>
            </div>
          </div>

          <button class="btn-restart" @click="restart">
            <v-icon icon="mdi-refresh" size="16"/> Take Survey Again
          </button>
        </div>
      </Transition>

    </div>
  </div>
</template>

<style scoped>
.predict-page { min-height: 100%; padding: 32px 16px 80px; }
.predict-inner { max-width: 700px; margin: 0 auto; }

/* Mode selector */
.mode-sel { display: flex; flex-direction: column; align-items: center; padding: 20px 0 10px; }
.mode-sel-title { font-size: 1.5rem; font-weight: 700; margin-bottom: 6px; }
.mode-sel-sub { font-size: 0.85rem; opacity: 0.5; margin-bottom: 28px; text-align: center; }
.mode-cards { display: grid; grid-template-columns: repeat(3, 1fr); gap: 14px; width: 100%; }
.mode-card {
  border: 1px solid rgba(255,255,255,0.09);
  border-radius: 16px; padding: 22px 18px;
  background: rgba(255,255,255,0.03);
  cursor: pointer; text-align: center;
  transition: all 0.22s cubic-bezier(0.34,1.56,0.64,1);
  display: flex; flex-direction: column; align-items: center; gap: 6px;
}
.mode-card:hover { transform: translateY(-4px); border-color: rgba(37,99,235,0.4); box-shadow: 0 8px 28px rgba(37,99,235,0.2); }
.mode-card-primary { border-color: rgba(37,99,235,0.3); background: rgba(37,99,235,0.06); }
.mode-badge { font-size: 0.62rem; font-weight: 700; letter-spacing: 0.08em; text-transform: uppercase; padding: 3px 8px; border-radius: 6px; margin-bottom: 4px; }
.lr-badge { background: rgba(245,158,11,0.15); color: #fbbf24; }
.nn-badge { background: rgba(37,99,235,0.15); color: #60a5fa; }
.mode-card-title { font-size: 1.1rem; font-weight: 700; }
.mode-card-desc { font-size: 0.78rem; color: rgba(148,163,184,0.75); line-height: 1.5; }
.mode-card-action { font-size: 0.76rem; color: rgba(37,99,235,0.8); font-weight: 600; margin-top: 4px; }

/* Mode header */
.mode-header { display: flex; align-items: center; gap: 12px; margin-bottom: 16px; }

/* Step bar */
.step-bar {
  display: flex;
  align-items: center;
  justify-content: center;
  margin-bottom: 32px;
  gap: 0;
}
.step-node {
  display: flex;
  align-items: center;
  gap: 8px;
  position: relative;
}
.step-circle {
  width: 28px; height: 28px;
  border-radius: 50%;
  border: 1.5px solid rgba(255,255,255,0.15);
  display: flex; align-items: center; justify-content: center;
  font-size: 0.78rem; font-weight: 700;
  color: rgba(255,255,255,0.35);
  flex-shrink: 0;
  transition: all 0.3s;
}
.step-node.active .step-circle {
  border-color: #2563eb;
  background: rgba(37,99,235,0.2);
  color: #60a5fa;
  box-shadow: 0 0 14px rgba(37,99,235,0.35);
}
.step-node.done .step-circle {
  border-color: #10b981;
  background: rgba(16,185,129,0.15);
  color: #10b981;
}
.step-lbl {
  font-size: 0.72rem;
  font-weight: 600;
  text-transform: uppercase;
  letter-spacing: 0.8px;
  opacity: 0.4;
  white-space: nowrap;
  margin-right: 6px;
}
.step-node.active .step-lbl { opacity: 0.85; color: #60a5fa; }
.step-node.done .step-lbl   { opacity: 0.55; color: #6ee7b7; }
.step-line {
  width: 40px;
  height: 1px;
  background: rgba(255,255,255,0.1);
  margin: 0 6px;
  transition: background 0.3s;
}
.step-line.filled { background: rgba(16,185,129,0.4); }

/* Question card */
.q-card {
  border: 1px solid rgba(255,255,255,0.07);
  border-radius: 14px;
  overflow: hidden;
  margin-bottom: 16px;
  background: rgba(255,255,255,0.02);
}
.q-card-head {
  padding: 20px 24px;
  border-bottom: 1px solid rgba(255,255,255,0.06);
  display: flex;
  align-items: flex-start;
  justify-content: space-between;
  gap: 12px;
}
.q-card-title { font-size: 1.05rem; font-weight: 700; margin-bottom: 3px; }
.q-card-sub   { font-size: 0.82rem; opacity: 0.45; }
.sev-badge {
  font-size: 0.75rem;
  font-weight: 700;
  padding: 4px 12px;
  border-radius: 100px;
  border: 1px solid;
  white-space: nowrap;
  flex-shrink: 0;
}

/* Question rows */
.q-row {
  display: flex;
  gap: 16px;
  padding: 16px 24px;
  border-bottom: 1px solid rgba(255,255,255,0.04);
}
.q-row:last-child { border-bottom: none; }
.q-num {
  font-size: 0.72rem;
  font-weight: 700;
  opacity: 0.3;
  padding-top: 3px;
  min-width: 20px;
}
.q-text {
  font-size: 0.88rem;
  line-height: 1.5;
  margin-bottom: 10px;
  opacity: 0.85;
}
.q-options {
  display: flex;
  gap: 6px;
  flex-wrap: wrap;
}
.rse-opts { gap: 5px; }
.q-opt {
  display: flex;
  align-items: center;
  gap: 5px;
  padding: 5px 11px;
  border-radius: 6px;
  border: 1px solid rgba(255,255,255,0.1);
  font-size: 0.78rem;
  cursor: pointer;
  transition: all 0.15s;
  color: rgba(255,255,255,0.55);
  background: rgba(255,255,255,0.03);
}
.q-opt:hover { border-color: rgba(37,99,235,0.4); color: rgba(255,255,255,0.85); background: rgba(37,99,235,0.08); }
.q-opt.selected { border-color: #2563eb; background: rgba(37,99,235,0.18); color: #93c5fd; }
.q-opt input { display: none; }

/* Navigation */
.nav-row { display: flex; justify-content: space-between; align-items: center; }
.btn-back {
  display: flex; align-items: center; gap: 4px;
  font-size: 0.83rem; opacity: 0.5; cursor: pointer;
  padding: 8px 0; background: none; border: none; color: inherit;
  transition: opacity 0.15s;
}
.btn-back:hover { opacity: 0.9; }
.btn-next {
  display: flex; align-items: center; gap: 6px;
  padding: 10px 22px;
  border-radius: 8px;
  background: rgba(37,99,235,0.85);
  border: 1px solid rgba(37,99,235,0.6);
  color: #fff; font-size: 0.88rem; font-weight: 600;
  cursor: pointer;
  transition: all 0.2s;
}
.btn-next:hover:not(:disabled) { background: rgba(37,99,235,1); transform: translateY(-1px); }
.btn-next:disabled { opacity: 0.35; cursor: not-allowed; }
.btn-predict {
  display: flex; align-items: center; gap: 8px;
  padding: 11px 26px;
  border-radius: 8px;
  background: linear-gradient(135deg, #2563eb, #1d4ed8);
  border: 1px solid rgba(37,99,235,0.5);
  color: #fff; font-size: 0.9rem; font-weight: 700;
  cursor: pointer;
  transition: all 0.2s;
  box-shadow: 0 4px 20px rgba(37,99,235,0.3);
}
.btn-predict:hover:not(:disabled) { transform: translateY(-2px); box-shadow: 0 8px 28px rgba(37,99,235,0.45); }
.btn-predict:disabled { opacity: 0.5; cursor: not-allowed; }
.err-box {
  margin-top: 12px; padding: 12px 16px;
  border-radius: 8px; font-size: 0.83rem;
  background: rgba(239,68,68,0.1); border: 1px solid rgba(239,68,68,0.25);
  color: #fca5a5;
}

/* Factors */
.factors-section {
  padding: 18px 24px;
  border-bottom: 1px solid rgba(255,255,255,0.04);
  border-left: 3px solid var(--sec-color, rgba(255,255,255,0.12));
  background: var(--sec-bg, transparent);
  transition: background 0.2s;
}
.factors-section:last-child { border-bottom: none; }
.factor-group-head {
  display: flex;
  align-items: center;
  gap: 6px;
  margin-bottom: 14px;
}
.factor-group-lbl {
  font-size: 0.7rem;
  font-weight: 700;
  text-transform: uppercase;
  letter-spacing: 1.2px;
}
.toggle-row { display: flex; gap: 8px; }
.toggle-btn {
  padding: 7px 18px;
  border-radius: 7px;
  border: 1px solid rgba(255,255,255,0.1);
  font-size: 0.82rem; font-weight: 500;
  background: rgba(255,255,255,0.03);
  color: rgba(255,255,255,0.5);
  cursor: pointer; transition: all 0.15s;
}
.toggle-btn.active {
  border-color: var(--tb-color, #2563eb);
  background: color-mix(in srgb, var(--tb-color, #2563eb) 18%, transparent);
  color: white;
}
.toggle-btn:hover:not(.active) { background: rgba(255,255,255,0.06); color: rgba(255,255,255,0.8); }

.slider-item { margin-bottom: 14px; }
.slider-item:last-child { margin-bottom: 0; }
.slider-meta { display: flex; justify-content: space-between; margin-bottom: 6px; }
.slider-lbl  { font-size: 0.82rem; opacity: 0.7; }
.slider-hint { font-size: 0.72rem; opacity: 0.4; margin: 2px 0 6px; }
.slider-val  { font-size: 0.78rem; font-weight: 700; font-variant-numeric: tabular-nums; }
.clean-range {
  -webkit-appearance: none;
  width: 100%; height: 4px;
  border-radius: 2px;
  background: linear-gradient(to right, var(--fill, rgba(37,99,235,0.7)) var(--pct), rgba(255,255,255,0.08) var(--pct));
  outline: none; cursor: pointer;
}
.clean-range::-webkit-slider-thumb {
  -webkit-appearance: none;
  width: 16px; height: 16px;
  border-radius: 50%;
  background: var(--fill, #60a5fa);
  border: 2.5px solid rgba(255,255,255,0.6);
  transition: transform 0.15s;
  box-shadow: 0 0 8px color-mix(in srgb, var(--fill, #60a5fa) 60%, transparent);
}
.clean-range::-webkit-slider-thumb:hover { transform: scale(1.35); }
.clean-range:active::-webkit-slider-thumb { transform: scale(1.5); }

/* Result */
.result-wrap { display: flex; flex-direction: column; gap: 16px; }
.result-card {
  border: 1px solid;
  border-radius: 16px;
  padding: 40px 24px 32px;
  text-align: center;
  animation: pop-in 0.5s cubic-bezier(0.34,1.56,0.64,1);
}
.result-icon {
  display: block; margin: 0 auto 16px;
  animation: breathe 2.5s ease-in-out infinite;
}
.result-hint { font-size: 0.75rem; text-transform: uppercase; letter-spacing: 1.5px; opacity: 0.45; }
.result-main { font-size: 3.2rem; font-weight: 900; letter-spacing: -1px; line-height: 1; margin-top: 6px; }

.proba-card {
  border: 1px solid rgba(255,255,255,0.07);
  border-radius: 12px;
  padding: 18px 20px;
  background: rgba(255,255,255,0.02);
}
.proba-title { font-size: 0.7rem; font-weight: 700; text-transform: uppercase; letter-spacing: 1px; opacity: 0.4; margin-bottom: 14px; }
.proba-row   { display: flex; align-items: center; gap: 12px; margin-bottom: 12px; }
.proba-row:last-child { margin-bottom: 0; }
.proba-lbl   { font-size: 0.82rem; font-weight: 600; min-width: 56px; }
.proba-track { flex: 1; height: 6px; background: rgba(255,255,255,0.07); border-radius: 3px; overflow: hidden; }
.proba-fill  { height: 100%; border-radius: 3px; transition: width 1s cubic-bezier(0.4,0,0.2,1); }
.proba-pct   { font-size: 0.82rem; font-weight: 700; min-width: 44px; text-align: right; font-variant-numeric: tabular-nums; }

.scores-row  { display: grid; grid-template-columns: 1fr 1fr 1fr; gap: 12px; }
.score-box   { border: 1px solid rgba(255,255,255,0.07); border-radius: 10px; padding: 16px 12px; text-align: center; background: rgba(255,255,255,0.02); }
.score-n     { font-size: 2rem; font-weight: 900; color: #fde68a; line-height: 1; }
.score-lbl   { font-size: 0.68rem; opacity: 0.45; margin-top: 4px; text-transform: uppercase; letter-spacing: 0.8px; }

.btn-restart {
  display: flex; align-items: center; gap: 6px;
  margin: 4px auto 0;
  padding: 9px 22px;
  border-radius: 8px;
  border: 1px solid rgba(255,255,255,0.12);
  font-size: 0.83rem; font-weight: 600;
  background: rgba(255,255,255,0.04);
  color: rgba(255,255,255,0.6);
  cursor: pointer; transition: all 0.15s;
}
.btn-restart:hover { background: rgba(255,255,255,0.08); color: rgba(255,255,255,0.9); }

/* Transitions */
.fade-slide-enter-active, .fade-slide-leave-active { transition: all 0.3s ease; }
.fade-slide-enter-from { opacity: 0; transform: translateX(20px); }
.fade-slide-leave-to   { opacity: 0; transform: translateX(-20px); }

@keyframes pop-in     { from { opacity: 0; transform: scale(0.85); } to { opacity: 1; transform: scale(1); } }
@keyframes breathe    { 0%, 100% { transform: scale(1); } 50% { transform: scale(1.05); } }
</style>
