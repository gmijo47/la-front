<script setup>
import { ref, onMounted, computed } from 'vue'
import { getModelMetrics, getValueCounts } from '../api'
import { useMascotStore } from '../stores/mascot'

const mascot = useMascotStore()

const metrics  = ref(null)
const distData = ref(null)

const CLS   = ['Low', 'Medium', 'High']
const CCLR  = { Low: '#10b981', Medium: '#f59e0b', High: '#ef4444' }
const SMETA = { Low: { color: '#10b981' }, Medium: { color: '#f59e0b' }, High: { color: '#ef4444' } }

const totalDist = () =>
  distData.value?.counts ? Object.values(distData.value.counts).reduce((a,b)=>a+b,0) : 1
const pct = (val, denom) => denom ? +((val/denom)*100).toFixed(1) : 0

const NN_LAYERS = [
  { n:19,  label:'Input',  note:'19 features',         color:'#60a5fa', bg:'rgba(96,165,250,0.1)'  },
  { n:128, label:'Dense',  note:'ReLU · BN · Drop 0.3',color:'#a78bfa', bg:'rgba(167,139,250,0.09)'},
  { n:64,  label:'Dense',  note:'ReLU · BN · Drop 0.3',color:'#c084fc', bg:'rgba(192,132,252,0.08)'},
  { n:32,  label:'Dense',  note:'ReLU · Drop 0.2',     color:'#f59e0b', bg:'rgba(245,158,11,0.09)' },
  { n:3,   label:'Output', note:'Softmax',              color:'#10b981', bg:'rgba(16,185,129,0.1)'  },
]

const featMode = ref('mascot')

const CAT_COLOR = {
  Psychological:'#ef4444', Physical:'#fb923c', Environmental:'#34d399',
  Academic:'#60a5fa', Social:'#a78bfa',
}
const CAT_BG = {
  Psychological:'rgba(239,68,68,0.11)', Physical:'rgba(251,146,60,0.11)',
  Environmental:'rgba(52,211,153,0.11)', Academic:'rgba(96,165,250,0.11)', Social:'rgba(167,139,250,0.11)',
}
const FEAT_INFO = [
  { key:'anxiety_level',                icon:'mdi-alert-circle',          lbl:'Anxiety Level',       scale:'0–21', cat:'Psychological' },
  { key:'self_esteem',                  icon:'mdi-account-heart',         lbl:'Self-Esteem',          scale:'0–30', cat:'Psychological' },
  { key:'mental_health_history',        icon:'mdi-brain',                 lbl:'MH History',           scale:'0–1',  cat:'Psychological' },
  { key:'depression',                   icon:'mdi-weather-cloudy',        lbl:'Depression',           scale:'0–27', cat:'Psychological' },
  { key:'headache',                     icon:'mdi-head-cog',              lbl:'Headache',             scale:'0–5',  cat:'Physical'      },
  { key:'sleep_quality',                icon:'mdi-sleep',                 lbl:'Sleep Quality',        scale:'0–5',  cat:'Physical'      },
  { key:'breathing_problem',            icon:'mdi-lungs',                 lbl:'Breathing',            scale:'0–5',  cat:'Physical'      },
  { key:'noise_level',                  icon:'mdi-volume-high',           lbl:'Noise Level',          scale:'0–5',  cat:'Environmental' },
  { key:'living_conditions',            icon:'mdi-home',                  lbl:'Living Conditions',    scale:'0–5',  cat:'Environmental' },
  { key:'safety',                       icon:'mdi-shield-check',          lbl:'Safety',               scale:'0–5',  cat:'Environmental' },
  { key:'basic_needs',                  icon:'mdi-silverware-fork-knife', lbl:'Basic Needs',          scale:'0–5',  cat:'Environmental' },
  { key:'academic_performance',         icon:'mdi-school',                lbl:'Academic Perf.',       scale:'0–5',  cat:'Academic'      },
  { key:'study_load',                   icon:'mdi-book-open-variant',     lbl:'Study Load',           scale:'1–5',  cat:'Academic'      },
  { key:'teacher_student_relationship', icon:'mdi-human-greeting',        lbl:'Teacher Relation',     scale:'0–5',  cat:'Academic'      },
  { key:'future_career_concerns',       icon:'mdi-briefcase-clock',       lbl:'Career Concerns',      scale:'0–5',  cat:'Academic'      },
  { key:'social_support',               icon:'mdi-account-group',         lbl:'Social Support',       scale:'0–3',  cat:'Social'        },
  { key:'peer_pressure',                icon:'mdi-account-arrow-right',   lbl:'Peer Pressure',        scale:'0–5',  cat:'Social'        },
  { key:'extracurricular_activities',   icon:'mdi-basketball',            lbl:'Extracurricular',      scale:'0–5',  cat:'Social'        },
  { key:'bullying',                     icon:'mdi-account-cancel',        lbl:'Bullying',             scale:'0–5',  cat:'Social'        },
]
const CATS = ['Psychological','Physical','Environmental','Academic','Social']
const featByCat = computed(() =>
  CATS.map(cat => ({ cat, feats: FEAT_INFO.filter(f => f.cat === cat) }))
)

const FEAT_TIPS = {
  anxiety_level:                'GAD-7 score (0–21). Measures generalised anxiety — worry, restlessness, irritability over the past 2 weeks.',
  self_esteem:                  'Rosenberg scale (0–30). Overall sense of self-worth and personal value.',
  mental_health_history:        'Binary (0/1). Whether the student has a prior diagnosed mental health condition.',
  depression:                   'PHQ-9 score (0–27). Depressed mood, anhedonia, sleep & appetite changes, fatigue.',
  headache:                     'Frequency of headaches (0–5). Higher = more frequent episodes.',
  sleep_quality:                'Self-reported sleep quality (0–5). 0 = very poor, 5 = excellent every night.',
  breathing_problem:            'Frequency of breathing difficulties (0–5) — shortness of breath, chest tightness.',
  noise_level:                  'Noise in the study/living environment (0–5). Higher = more disruptive.',
  living_conditions:            'Quality & comfort of current living situation (0–5) — space, cleanliness, stability.',
  safety:                       'Perceived personal safety at home, on campus and in the surrounding area (0–5).',
  basic_needs:                  'How well fundamental needs are met (0–5) — food, water, shelter, financial stability.',
  academic_performance:         'Self-assessed academic standing (0–5) — GPA trajectory & satisfaction with output.',
  study_load:                   'Volume of weekly coursework & study hours (1–5). 1 = minimal, 5 = extremely heavy.',
  teacher_student_relationship: 'Quality of instructor support (0–5) — approachability, feedback, communication.',
  future_career_concerns:       'Worry about post-graduation employment & career direction (0–5).',
  social_support:               'Perceived support from friends, family & peers (0–3).',
  peer_pressure:                'Pressure from peers on lifestyle, decisions or academic choices (0–5).',
  extracurricular_activities:   'Involvement in sports, clubs or activities outside coursework (0–5).',
  bullying:                     'Exposure to bullying, harassment or aggressive peer behaviour (0–5).',
}

function onChipEnter(f) {
  mascot.speak(FEAT_TIPS[f.key], 'happy')
}
function onChipLeave() {
  mascot.setIdle()
}

onMounted(async () => {
  const [mr, vr] = await Promise.all([getModelMetrics(), getValueCounts('stress_level')])
  metrics.value  = mr.data
  distData.value = vr.data
})
</script>

<template>
  <div class="info-page">

    <!-- ── Hero ──────────────────────────────────────────────────────── -->
    <div class="hero">
      <div class="hero-left">
        <div class="hero-title">Student Stress<br>Prediction</div>
        <div class="hero-sub">ML system classifying student stress into Low · Medium · High using 19 psycho-social features collected via standardised questionnaires.</div>
      </div>
      <div class="hero-stats">
        <div class="hs"><span class="hs-n" style="color:#60a5fa">1,100</span><span class="hs-l">Records</span></div>
        <div class="hs"><span class="hs-n" style="color:#67e8f9">19</span><span class="hs-l">Features</span></div>
        <div class="hs">
          <span class="hs-n" style="color:#a3e635">{{ metrics ? (metrics.nn_accuracy*100).toFixed(1)+'%' : '…' }}</span>
          <span class="hs-l">NN Acc.</span>
        </div>
        <div class="hs">
          <span class="hs-n" style="color:#f472b6">{{ metrics ? (metrics.lr_accuracy*100).toFixed(1)+'%' : '…' }}</span>
          <span class="hs-l">LR Acc.</span>
        </div>
      </div>
    </div>

    <!-- ── Overview row ──────────────────────────────────────────────── -->
    <div class="row-2-1">
      <div class="glass-card">
        <div class="card-label">Stress Distribution</div>
        <div class="dist-bars" v-if="distData">
          <div v-for="(count, label) in distData.counts" :key="label" class="dist-row">
            <div class="dist-top">
              <span class="dist-dot" :style="{background:SMETA[label]?.color}"></span>
              <span class="dist-name">{{ label }}</span>
              <span class="dist-n">{{ count.toLocaleString() }}</span>
              <span class="dist-pct" :style="{color:SMETA[label]?.color}">{{ pct(count,totalDist()) }}%</span>
            </div>
            <div class="dist-track">
              <div class="dist-fill" :style="{width:pct(count,totalDist())+'%',background:SMETA[label]?.color}"></div>
            </div>
          </div>
        </div>
        <div v-else class="spin-row"><v-progress-circular indeterminate color="primary" size="20"/></div>
      </div>
      <div class="glass-card">
        <div class="card-label">Dataset</div>
        <div class="ds-grid">
          <div class="ds-cell"><span class="ds-val">1,100</span><span class="ds-k">rows</span></div>
          <div class="ds-cell"><span class="ds-val">19</span><span class="ds-k">features</span></div>
          <div class="ds-cell"><span class="ds-val">3</span><span class="ds-k">classes</span></div>
          <div class="ds-cell"><span class="ds-val" style="color:#34d399">0</span><span class="ds-k">missing</span></div>
          <div class="ds-cell"><span class="ds-val" style="color:#60a5fa">CSV</span><span class="ds-k">format</span></div>
          <div class="ds-cell"><span class="ds-val" style="color:#f59e0b">Bal.</span><span class="ds-k">classes</span></div>
        </div>
      </div>
    </div>

    <!-- ── Model Performance ─────────────────────────────────────────── -->
    <div class="row-equal" v-if="metrics">
      <div class="glass-card" v-for="m in ['nn','lr']" :key="m">
        <div class="model-head">
          <div>
            <div class="model-name">{{ m==='nn' ? 'Neural Network' : 'Logistic Regression' }}</div>
            <div class="model-hint">{{ m==='nn' ? 'Sequential · Adam · SparseCCE' : 'C=1.0 · StandardScaler · Softmax' }}</div>
          </div>
          <div class="big-acc" :style="{color: m==='nn' ? '#a3e635' : '#f472b6'}">
            {{ (metrics[m+'_accuracy']*100).toFixed(1) }}<span class="big-acc-unit">%</span>
          </div>
        </div>

        <div class="card-label sect-mt">Per-class metrics</div>
        <div class="metric-rows">
          <div v-for="cls in CLS" :key="cls" class="metric-row">
            <span class="mr-cls"><span class="cls-dot" :style="{background:CCLR[cls]}"></span>{{ cls }}</span>
            <div class="mr-bars">
              <div v-for="key in ['precision','recall','f1-score']" :key="key" class="mr-bar-wrap">
                <span class="mr-key">{{ {precision:'Pre',recall:'Rec','f1-score':'F1'}[key] }}</span>
                <div class="mr-track">
                  <div class="mr-fill" :style="{width:(metrics[m+'_report'][cls]?.[key]*100)+'%',background:CCLR[cls]}"></div>
                </div>
                <span class="mr-val">{{ (metrics[m+'_report'][cls]?.[key]*100).toFixed(0) }}%</span>
              </div>
            </div>
          </div>
        </div>

        <div class="card-label sect-mt">Confusion Matrix</div>
        <div class="cm-block">
          <table class="cm-table">
            <thead>
              <tr>
                <th class="cm-corner"></th>
                <th v-for="c in CLS" :key="c">{{ c[0] }}</th>
              </tr>
            </thead>
            <tbody>
              <tr v-for="(row,ri) in metrics[m+'_cm']" :key="ri">
                <td class="cm-rl">{{ CLS[ri][0] }}</td>
                <td v-for="(val,ci) in row" :key="ci" class="cm-cell"
                  :style="{
                    background: ri===ci ? `rgba(16,185,129,${0.12+val/450*0.65})` : `rgba(239,68,68,${val?0.05+val/150*0.5:0})`,
                    color: ri===ci ? '#6ee7b7' : (val?'#fca5a5':'rgba(255,255,255,0.12)')
                  }">{{ val }}</td>
              </tr>
            </tbody>
          </table>
        </div>
      </div>
    </div>
    <div v-else class="spin-row"><v-progress-circular indeterminate color="primary" size="28"/></div>

    <!-- ── NN Architecture ────────────────────────────────────────────── -->
    <div class="glass-card">
      <div class="card-label">Neural Network Architecture</div>
      <div class="arch-row">
        <template v-for="(layer,i) in NN_LAYERS" :key="i">
          <div class="arch-col">
            <div class="arch-node" :style="{border:'1.5px solid '+layer.color,background:layer.bg}">
              <span class="arch-n" :style="{color:layer.color}">{{ layer.n }}</span>
              <span class="arch-u">{{ layer.label }}</span>
            </div>
            <div class="arch-note">{{ layer.note }}</div>
          </div>
          <div v-if="i<NN_LAYERS.length-1" class="arch-arrow">→</div>
        </template>
      </div>
    </div>

    <!-- ── LR Feature Weights ─────────────────────────────────────────── -->
    <div class="glass-card" v-if="metrics">
      <div class="card-label">LR Feature Importance — Coefficients per Class</div>
      <div class="three-col">
        <div v-for="cls in CLS" :key="cls" class="fw-col">
          <div class="fw-head"><span class="cls-dot" :style="{background:CCLR[cls]}"></span>{{ cls }}</div>
          <div v-for="item in metrics.lr_top_features[cls]" :key="item.feature" class="fw-row">
            <span class="fw-lbl">{{ item.feature.replace(/_/g,' ') }}</span>
            <div class="fw-track">
              <div class="fw-bar" :style="{
                width:Math.min(Math.abs(item.weight)/2*100,100)+'%',
                background: item.weight>=0 ? CCLR[cls] : '#67e8f9',
                marginLeft: item.weight<0?'auto':'0'
              }"></div>
            </div>
            <span class="fw-val" :style="{color:item.weight>=0?CCLR[cls]:'#67e8f9'}">
              {{ item.weight>0?'+':'' }}{{ item.weight.toFixed(2) }}
            </span>
          </div>
        </div>
      </div>
    </div>

    <!-- ── Feature Index ─────────────────────────────────────────────── -->
    <div class="glass-card">
      <div class="fi-header">
        <div class="card-label" style="margin-bottom:0">Feature Index</div>
        <div class="mode-toggle">
          <button class="mt-btn" :class="{active:featMode==='mascot'}" @click="featMode='mascot'">
            <v-icon icon="mdi-emoticon-outline" size="13"/>Mascot
          </button>
          <button class="mt-btn" :class="{active:featMode==='full'}" @click="featMode='full'">
            <v-icon icon="mdi-text-box-outline" size="13"/>Full
          </button>
        </div>
      </div>

      <!-- ── Mascot mode: compact chips ── -->
      <template v-if="featMode==='mascot'">
        <div class="cat-groups">
          <div v-for="group in featByCat" :key="group.cat" class="cat-group">
            <div class="cat-title" :style="{color:CAT_COLOR[group.cat]}">
              <span class="cat-dot" :style="{background:CAT_COLOR[group.cat]}"></span>
              {{ group.cat }}
            </div>
            <div class="feat-chips">
              <div v-for="f in group.feats" :key="f.key" class="feat-chip" :style="{'--cc':CAT_COLOR[f.cat]}"
                @mouseenter="onChipEnter(f)" @mouseleave="onChipLeave">
                <v-icon :icon="f.icon" size="13" :style="{color:CAT_COLOR[f.cat]}"/>
                <span class="chip-lbl">{{ f.lbl }}</span>
                <span class="chip-scale">{{ f.scale }}</span>
              </div>
            </div>
          </div>
        </div>
        <div class="mascot-hint">
          <v-icon icon="mdi-cursor-default-outline" size="13"/>
          <span>Hover a chip — the mascot will explain the feature</span>
        </div>
      </template>

      <!-- ── Full mode: expanded cards ── -->
      <template v-else>
        <div class="full-feat-grid">
          <div v-for="f in FEAT_INFO" :key="f.key" class="full-feat-card" :style="{'--cc':CAT_COLOR[f.cat]}">
            <div class="ffc-head">
              <div class="ffc-icon-wrap" :style="{background:CAT_BG[f.cat]}">
                <v-icon :icon="f.icon" size="15" :style="{color:CAT_COLOR[f.cat]}"/>
              </div>
              <div class="ffc-title-col">
                <span class="ffc-name">{{ f.lbl }}</span>
                <span class="ffc-cat" :style="{color:CAT_COLOR[f.cat]}">{{ f.cat }}</span>
              </div>
              <span class="ffc-scale">{{ f.scale }}</span>
            </div>
            <div class="ffc-desc">{{ FEAT_TIPS[f.key] }}</div>
          </div>
        </div>
      </template>
    </div>

  </div>
</template>

<style scoped>
.info-page { padding: 24px; display: flex; flex-direction: column; gap: 16px; }

/* ── Hero ── */
.hero {
  display: flex; align-items: flex-end; justify-content: space-between; flex-wrap: wrap; gap: 24px;
  padding: 28px 32px; border-radius: 16px;
  background: linear-gradient(135deg, rgba(37,99,235,0.14) 0%, rgba(139,92,246,0.09) 55%, rgba(16,185,129,0.07) 100%);
  border: 1px solid rgba(37,99,235,0.22);
}
.hero-title { font-size: 2rem; font-weight: 900; line-height: 1.15; letter-spacing: -0.5px; }
.hero-sub   { font-size: 0.8rem; opacity: 0.4; margin-top: 8px; max-width: 380px; line-height: 1.55; }
.hero-stats { display: flex; gap: 30px; flex-shrink: 0; }
.hs         { display: flex; flex-direction: column; align-items: center; gap: 4px; }
.hs-n       { font-size: 1.8rem; font-weight: 800; line-height: 1; }
.hs-l       { font-size: 0.62rem; opacity: 0.4; text-transform: uppercase; letter-spacing: 0.8px; }

/* ── Cards ── */
.glass-card {
  border: 1px solid rgba(255,255,255,0.07); border-radius: 14px;
  background: rgba(255,255,255,0.02); padding: 20px 22px;
}
.card-label {
  font-size: 0.64rem; font-weight: 700; text-transform: uppercase;
  letter-spacing: 1.5px; opacity: 0.32; margin-bottom: 14px;
}
.sect-mt { margin-top: 18px; }

/* ── Row layouts ── */
.row-2-1  { display: grid; grid-template-columns: 2fr 1fr; gap: 16px; }
.row-equal { display: grid; grid-template-columns: 1fr 1fr; gap: 16px; }
.three-col { display: grid; grid-template-columns: 1fr 1fr 1fr; gap: 20px; }
.spin-row  { display: flex; justify-content: center; padding: 24px; }

/* ── Stress distribution ── */
.dist-bars { display: flex; flex-direction: column; gap: 14px; }
.dist-top  { display: flex; align-items: center; gap: 8px; margin-bottom: 7px; }
.dist-dot  { width: 7px; height: 7px; border-radius: 50%; flex-shrink: 0; }
.dist-name { font-size: 0.85rem; font-weight: 600; flex: 1; }
.dist-n    { font-size: 0.74rem; opacity: 0.35; }
.dist-pct  { font-size: 0.82rem; font-weight: 800; min-width: 40px; text-align: right; }
.dist-track { height: 5px; background: rgba(255,255,255,0.07); border-radius: 100px; overflow: hidden; }
.dist-fill  { height: 100%; border-radius: 100px; transition: width 1.2s cubic-bezier(0.4,0,0.2,1); }

/* ── Dataset grid ── */
.ds-grid { display: grid; grid-template-columns: 1fr 1fr; gap: 8px; }
.ds-cell {
  display: flex; flex-direction: column; align-items: center; padding: 10px 0;
  background: rgba(255,255,255,0.025); border-radius: 8px;
  border: 1px solid rgba(255,255,255,0.05);
}
.ds-val { font-size: 1.25rem; font-weight: 800; }
.ds-k   { font-size: 0.62rem; opacity: 0.38; text-transform: uppercase; letter-spacing: 0.5px; margin-top: 2px; }

/* ── Model cards ── */
.model-head  { display: flex; align-items: flex-start; justify-content: space-between; gap: 12px; }
.model-name  { font-size: 1rem; font-weight: 800; }
.model-hint  { font-size: 0.67rem; opacity: 0.35; margin-top: 3px; }
.big-acc     { font-size: 2.4rem; font-weight: 900; line-height: 1; }
.big-acc-unit { font-size: 1.1rem; }

/* ── Metric bars ── */
.metric-rows { display: flex; flex-direction: column; gap: 10px; }
.metric-row  { display: flex; align-items: center; gap: 10px; }
.cls-dot     { display: inline-block; width: 6px; height: 6px; border-radius: 50%; flex-shrink: 0; }
.mr-cls      { font-size: 0.76rem; font-weight: 700; min-width: 62px; display: flex; align-items: center; gap: 5px; }
.mr-bars     { flex: 1; display: flex; flex-direction: column; gap: 5px; }
.mr-bar-wrap { display: flex; align-items: center; gap: 6px; }
.mr-key      { font-size: 0.6rem; opacity: 0.38; text-transform: uppercase; width: 22px; flex-shrink: 0; }
.mr-track    { flex: 1; height: 4px; background: rgba(255,255,255,0.07); border-radius: 100px; overflow: hidden; }
.mr-fill     { height: 100%; border-radius: 100px; transition: width 1s cubic-bezier(0.4,0,0.2,1); }
.mr-val      { font-size: 0.68rem; font-weight: 700; min-width: 30px; text-align: right; opacity: 0.65; }

/* ── Confusion matrix ── */
.cm-block { overflow-x: auto; }
.cm-table { border-collapse: collapse; width: 100%; }
.cm-corner { width: 26px; }
.cm-table th { padding: 5px 8px; font-size: 0.68rem; opacity: 0.38; text-align: center; }
.cm-rl       { font-size: 0.68rem; opacity: 0.38; padding: 7px 8px 7px 0; }
.cm-cell     { padding: 9px 12px; text-align: center; font-size: 0.9rem; font-weight: 700; border-radius: 4px; }

/* ── NN Architecture ── */
.arch-row {
  display: flex; flex-direction: row; align-items: flex-start;
  justify-content: center; flex-wrap: wrap; gap: 0;
}
.arch-col  { display: flex; flex-direction: column; align-items: center; gap: 8px; }
.arch-node {
  display: flex; flex-direction: column; align-items: center; gap: 2px;
  border-radius: 10px; padding: 10px 18px; min-width: 76px; text-align: center;
}
.arch-n    { font-size: 1.3rem; font-weight: 800; line-height: 1; }
.arch-u    { font-size: 0.6rem; opacity: 0.45; text-transform: uppercase; letter-spacing: 0.5px; }
.arch-note { font-size: 0.6rem; opacity: 0.32; text-align: center; max-width: 90px; line-height: 1.4; white-space: nowrap; }
.arch-arrow { font-size: 1.2rem; opacity: 0.18; padding: 0 8px; margin-top: 16px; }

/* ── LR weights ── */
.fw-col {}
.fw-head { font-size: 0.78rem; font-weight: 700; margin-bottom: 12px; display: flex; align-items: center; gap: 6px; }
.fw-row  { display: flex; align-items: center; gap: 8px; margin-bottom: 7px; }
.fw-lbl  { font-size: 0.67rem; opacity: 0.48; min-width: 108px; white-space: nowrap; overflow: hidden; text-overflow: ellipsis; }
.fw-track { flex: 1; height: 4px; background: rgba(255,255,255,0.06); border-radius: 2px; overflow: hidden; display: flex; }
.fw-bar  { height: 100%; border-radius: 2px; min-width: 2px; transition: width 0.8s ease; }
.fw-val  { font-size: 0.67rem; font-weight: 700; min-width: 42px; text-align: right; font-variant-numeric: tabular-nums; }

/* ── Feature Index ── */
.cat-groups { display: flex; flex-direction: column; gap: 16px; }
.cat-title  { font-size: 0.7rem; font-weight: 800; text-transform: uppercase; letter-spacing: 1px; margin-bottom: 8px; display: flex; align-items: center; gap: 7px; }
.cat-dot    { width: 6px; height: 6px; border-radius: 50%; flex-shrink: 0; }
.feat-chips { display: flex; flex-wrap: wrap; gap: 7px; }
.feat-chip  {
  display: flex; align-items: center; gap: 6px;
  border: 1px solid rgba(255,255,255,0.08); border-radius: 100px;
  padding: 5px 12px; background: rgba(255,255,255,0.025);
  cursor: default; transition: border-color 0.15s, background 0.15s;
}
.feat-chip:hover {
  border-color: var(--cc, rgba(255,255,255,0.25));
  background: rgba(255,255,255,0.055);
}
.chip-lbl   { font-size: 0.74rem; font-weight: 600; }
.chip-scale { font-size: 0.62rem; opacity: 0.32; }

/* ── Feature Index header / toggle ── */
.fi-header   { display: flex; align-items: center; justify-content: space-between; margin-bottom: 16px; }
.mode-toggle { display: flex; gap: 2px; padding: 2px; background: rgba(255,255,255,0.04); border-radius: 8px; border: 1px solid rgba(255,255,255,0.07); }
.mt-btn {
  display: flex; align-items: center; gap: 5px;
  font-size: 0.7rem; font-weight: 600; padding: 4px 10px; border-radius: 6px; border: none; cursor: pointer;
  background: transparent; color: rgba(226,232,240,0.38); transition: all 0.15s;
}
.mt-btn:hover { color: rgba(226,232,240,0.75); background: rgba(255,255,255,0.05); }
.mt-btn.active { background: rgba(37,99,235,0.2); color: #93c5fd; }

/* Mascot hint */
.mascot-hint { display: flex; align-items: center; gap: 6px; margin-top: 14px; font-size: 0.67rem; opacity: 0.28; }

/* Full mode grid */
.full-feat-grid { display: grid; grid-template-columns: repeat(3, 1fr); gap: 10px; }
.full-feat-card {
  border: 1px solid rgba(255,255,255,0.07); border-left: 3px solid var(--cc);
  border-radius: 10px; padding: 12px 14px; background: rgba(255,255,255,0.025);
}
.ffc-head { display: flex; align-items: center; gap: 9px; margin-bottom: 8px; }
.ffc-icon-wrap { width: 28px; height: 28px; border-radius: 7px; display: flex; align-items: center; justify-content: center; flex-shrink: 0; }
.ffc-title-col { flex: 1; display: flex; flex-direction: column; gap: 1px; min-width: 0; }
.ffc-name  { font-size: 0.8rem; font-weight: 700; white-space: nowrap; overflow: hidden; text-overflow: ellipsis; }
.ffc-cat   { font-size: 0.59rem; font-weight: 700; text-transform: uppercase; letter-spacing: 0.7px; }
.ffc-scale { font-size: 0.62rem; padding: 2px 7px; border-radius: 4px; background: rgba(255,255,255,0.06); opacity: 0.52; white-space: nowrap; flex-shrink: 0; }
.ffc-desc  { font-size: 0.72rem; opacity: 0.42; line-height: 1.55; }

@media (max-width: 1000px) {
  .row-2-1 { grid-template-columns: 1fr; }
  .row-equal { grid-template-columns: 1fr; }
  .three-col { grid-template-columns: 1fr 1fr; }
  .arch-row  { gap: 4px; }
  .arch-arrow { padding: 0 2px; }
  .full-feat-grid { grid-template-columns: 1fr 1fr; }
}
@media (max-width: 650px) {
  .three-col { grid-template-columns: 1fr; }
  .full-feat-grid { grid-template-columns: 1fr; }
  .hero { flex-direction: column; align-items: flex-start; }
  .hero-stats { gap: 20px; }
}
</style>
