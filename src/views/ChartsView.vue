<script setup>
import { ref, onMounted, computed } from 'vue'
import { useTheme } from 'vuetify'
import {
  Chart as ChartJS,
  ArcElement, BarElement, PointElement,
  CategoryScale, LinearScale, Title, Tooltip, Legend
} from 'chart.js'
import { Doughnut, Bar, Scatter } from 'vue-chartjs'
import {
  getStressDist, getHistogram, getFeatureVsStress, getScatter,
  getCorrelationHeatmap, getSkewKurtosis
} from '../api'

ChartJS.register(ArcElement, BarElement, PointElement, CategoryScale, LinearScale, Title, Tooltip, Legend)

// ── Theme-reactive colors ─────────────────────────────────────────────────
const vTheme  = useTheme()
const isDark  = computed(() => vTheme.global.current.value.dark)
const tickColor  = computed(() => isDark.value ? 'rgba(226,232,240,0.55)' : 'rgba(15,23,42,0.65)')
const gridColor  = computed(() => isDark.value ? 'rgba(255,255,255,0.06)' : 'rgba(15,23,42,0.07)')
const legendColor = computed(() => isDark.value ? 'rgba(226,232,240,0.7)' : 'rgba(15,23,42,0.7)')
const TIP = {
  backgroundColor: 'rgba(9,9,18,0.95)', titleColor: '#f8fafc',
  bodyColor: 'rgba(226,232,240,0.75)', padding: 10, cornerRadius: 8,
  borderColor: 'rgba(255,255,255,0.08)', borderWidth: 1,
}

function mkOpts(extra = {}) {
  return computed(() => ({
    responsive: true,
    maintainAspectRatio: false,
    animation: false,
    plugins: { legend: { display: false }, tooltip: TIP, ...(extra.plugins || {}) },
    scales: {
      x: { grid: { color: gridColor.value, drawBorder: false }, ticks: { color: tickColor.value, font: { size: 11 } } },
      y: { grid: { color: gridColor.value, drawBorder: false }, ticks: { color: tickColor.value, font: { size: 11 } } },
      ...(extra.scales || {}),
    },
  }))
}

const SC  = ['#10b981','#f59e0b','#ef4444']
const fmt = s => s.replace(/_/g,' ')

// ── Donut ─────────────────────────────────────────────────────────────────
const donutData = ref(null)
const donutOpts = computed(() => ({
  responsive: true, maintainAspectRatio: false,
  animation: false,
  cutout: '66%',
  plugins: {
    legend: { position: 'bottom', labels: { color: legendColor.value, padding: 20, font: { size: 12 }, boxWidth: 12 } },
    tooltip: TIP,
  },
}))

async function loadDonut() {
  const { data } = await getStressDist()
  donutData.value = {
    labels: data.labels,
    datasets: [{ data: data.values, backgroundColor: SC, borderWidth: 0, hoverOffset: 10 }],
  }
}

// ── Heatmap ───────────────────────────────────────────────────────────────
const hmCells = ref([])
const hmCols  = ref([])

function cellBg(val) {
  const v = Math.max(-1, Math.min(1, val))
  const a = 0.08 + Math.abs(v) * 0.75
  return v >= 0 ? `rgba(37,99,235,${a})` : `rgba(6,182,212,${a})`
}
function cellText(val) {
  if (isDark.value) return Math.abs(val) > 0.4 ? 'rgba(255,255,255,0.9)' : 'rgba(255,255,255,0.3)'
  return Math.abs(val) > 0.4 ? 'rgba(15,23,42,0.9)' : 'rgba(15,23,42,0.35)'
}
function hmCell(x, y) { return hmCells.value.find(d => d.x === x && d.y === y) }

async function loadHeatmap() {
  const { data } = await getCorrelationHeatmap()
  hmCols.value  = data.columns
  hmCells.value = data.data
}

// ── EDA state ─────────────────────────────────────────────────────────────
const edaHist    = ref({})
const edaFvs     = ref({})
const edaScatter = ref({})
const topCorrData= ref(null)
const skewData   = ref(null)
const kurtData   = ref(null)
const edaLoaded  = ref(false)
const edaLoading = ref(false)

const HIST_FEATURES = [
  { key: 'anxiety_level',         bins: 15 },
  { key: 'depression',            bins: 15 },
  { key: 'sleep_quality',         bins: 6  },
  { key: 'self_esteem',           bins: 10 },
  { key: 'academic_performance',  bins: 6  },
  { key: 'study_load',            bins: 5  },
]
const FVS_FEATURES   = ['anxiety_level','depression','sleep_quality','social_support','self_esteem','academic_performance','peer_pressure','study_load']
const SCATTER_PAIRS  = [
  { x: 'anxiety_level',           y: 'depression'              },
  { x: 'sleep_quality',           y: 'self_esteem'             },
  { x: 'peer_pressure',           y: 'bullying'                },
  { x: 'study_load',              y: 'academic_performance'    },
  { x: 'social_support',          y: 'self_esteem'             },
  { x: 'future_career_concerns',  y: 'anxiety_level'           },
]
const HIST_COLORS = [
  ['rgba(37,99,235,0.65)',  'rgba(96,165,250,0.9)'],
  ['rgba(239,68,68,0.6)',   'rgba(252,165,165,0.9)'],
  ['rgba(16,185,129,0.6)',  'rgba(52,211,153,0.9)'],
  ['rgba(245,158,11,0.6)',  'rgba(252,211,77,0.9)'],
  ['rgba(6,182,212,0.6)',   'rgba(103,232,249,0.9)'],
  ['rgba(139,92,246,0.6)',  'rgba(196,181,253,0.9)'],
]
const SCAT_COLORS = [
  'rgba(37,99,235,0.35)', 'rgba(16,185,129,0.35)', 'rgba(239,68,68,0.35)',
  'rgba(245,158,11,0.35)','rgba(6,182,212,0.35)',   'rgba(139,92,246,0.35)',
]

const histOpts  = mkOpts()
const fvsOpts   = mkOpts()
const scatOpts  = mkOpts({ scales: { x: {}, y: {} } })
const topCorrOpts = computed(() => ({
  ...mkOpts({ scales: { x: {}, y: {} } }).value,
  indexAxis: 'y',
  plugins: { legend: { display: false }, tooltip: TIP },
  scales: {
    x: { grid: { color: gridColor.value, drawBorder: false }, ticks: { color: tickColor.value, font: { size: 11 } } },
    y: { grid: { color: gridColor.value, drawBorder: false }, ticks: { color: tickColor.value, font: { size: 10 } } },
  },
}))
const skewOpts = computed(() => ({
  ...topCorrOpts.value,
}))
const kurtOpts = computed(() => ({
  ...topCorrOpts.value,
}))

async function loadEdaCharts() {
  if (edaLoaded.value || edaLoading.value) return
  edaLoading.value = true
  try {
    await Promise.all(HIST_FEATURES.map(async ({ key, bins }, i) => {
      const { data } = await getHistogram(key, bins)
      const [bg, bd] = HIST_COLORS[i % HIST_COLORS.length]
      edaHist.value[key] = {
        labels: data.bin_edges.slice(0,-1).map(v => v.toFixed(1)),
        datasets: [{ data: data.counts, backgroundColor: bg, borderColor: bd, borderWidth: 1, borderRadius: 3 }],
      }
    }))

    await Promise.all(FVS_FEATURES.map(async feat => {
      const { data } = await getFeatureVsStress(feat)
      edaFvs.value[feat] = {
        labels: data.stress_labels,
        datasets: [{ data: data.means, backgroundColor: SC, borderColor: SC, borderWidth: 0, borderRadius: 8, borderSkipped: false }],
      }
    }))

    await Promise.all(SCATTER_PAIRS.map(async ({ x, y }, i) => {
      const { data } = await getScatter(x, y, 800)
      edaScatter.value[x+'__'+y] = {
        datasets: [{
          data: data.x.map((xv,j) => ({ x: xv, y: data.y[j] })),
          backgroundColor: SCAT_COLORS[i % SCAT_COLORS.length],
          pointRadius: 2.5, pointHoverRadius: 4.5,
        }],
      }
    }))

    if (!hmCells.value.length) await loadHeatmap()

    const stressCells = hmCells.value.filter(d => (d.x === 'stress_level' || d.y === 'stress_level') && d.x !== d.y)
    const seen = new Set(), pairs = []
    for (const c of stressCells) {
      const feat = c.x === 'stress_level' ? c.y : c.x
      if (!seen.has(feat)) { seen.add(feat); pairs.push({ feat, val: c.value }) }
    }
    pairs.sort((a,b) => Math.abs(b.val) - Math.abs(a.val))
    const top = pairs.slice(0,10)
    topCorrData.value = {
      labels: top.map(p => fmt(p.feat)),
      datasets: [{
        data: top.map(p => p.val),
        backgroundColor: top.map(p => p.val >= 0 ? 'rgba(37,99,235,0.65)' : 'rgba(6,182,212,0.65)'),
        borderColor:     top.map(p => p.val >= 0 ? 'rgba(96,165,250,0.9)'  : 'rgba(103,232,249,0.9)'),
        borderWidth: 1, borderRadius: 4,
      }],
    }

    const { data: sk } = await getSkewKurtosis()
    const skCols = Object.keys(sk.skewness)
    const skVals = skCols.map(c => sk.skewness[c])
    skewData.value = {
      labels: skCols.map(fmt),
      datasets: [{
        data: skVals,
        backgroundColor: skVals.map(v => v >= 0 ? 'rgba(245,158,11,0.65)' : 'rgba(16,185,129,0.65)'),
        borderColor:     skVals.map(v => v >= 0 ? 'rgba(252,211,77,0.9)'  : 'rgba(52,211,153,0.9)'),
        borderWidth: 1, borderRadius: 3,
      }],
    }
    const ktVals = skCols.map(c => sk.kurtosis[c])
    kurtData.value = {
      labels: skCols.map(fmt),
      datasets: [{
        data: ktVals,
        backgroundColor: ktVals.map(v => Math.abs(v) > 1 ? 'rgba(239,68,68,0.65)' : 'rgba(96,165,250,0.65)'),
        borderColor:     ktVals.map(v => Math.abs(v) > 1 ? 'rgba(252,165,165,0.9)' : 'rgba(147,197,253,0.9)'),
        borderWidth: 1, borderRadius: 3,
      }],
    }

    edaLoaded.value = true
  } finally {
    edaLoading.value = false
  }
}

onMounted(() => Promise.all([loadDonut(), loadEdaCharts()]))
</script>

<template>
  <div class="charts-page">

    <div v-if="edaLoading && !edaLoaded" class="eda-loading">
      <v-progress-circular indeterminate color="primary" size="40" />
      <p class="mt-3 eda-loading-text">Loading charts…</p>
    </div>

    <template v-else>

      <!-- ── Distributions ─────────────────────────────────────────── -->
      <div class="eda-section-label">Distributions</div>
      <div class="charts-grid three-col mb-4">
        <div class="chart-card">
          <div class="card-head">Stress Level Split</div>
          <div class="chart-area h240">
            <Doughnut v-if="donutData" :data="donutData" :options="donutOpts" />
            <div v-else class="chart-spin"><v-progress-circular indeterminate color="primary" size="24"/></div>
          </div>
        </div>
        <div class="chart-card">
          <div class="card-head">Anxiety Level</div>
          <div class="chart-area h240">
            <Bar v-if="edaHist['anxiety_level']" :data="edaHist['anxiety_level']" :options="histOpts" />
            <div v-else class="chart-spin"><v-progress-circular indeterminate color="primary" size="24"/></div>
          </div>
        </div>
        <div class="chart-card">
          <div class="card-head">Depression Score</div>
          <div class="chart-area h240">
            <Bar v-if="edaHist['depression']" :data="edaHist['depression']" :options="histOpts" />
            <div v-else class="chart-spin"><v-progress-circular indeterminate color="error" size="24"/></div>
          </div>
        </div>
        <div class="chart-card">
          <div class="card-head">Sleep Quality</div>
          <div class="chart-area h240">
            <Bar v-if="edaHist['sleep_quality']" :data="edaHist['sleep_quality']" :options="histOpts" />
            <div v-else class="chart-spin"><v-progress-circular indeterminate color="success" size="24"/></div>
          </div>
        </div>
        <div class="chart-card">
          <div class="card-head">Self-Esteem Score</div>
          <div class="chart-area h240">
            <Bar v-if="edaHist['self_esteem']" :data="edaHist['self_esteem']" :options="histOpts" />
            <div v-else class="chart-spin"><v-progress-circular indeterminate color="warning" size="24"/></div>
          </div>
        </div>
        <div class="chart-card">
          <div class="card-head">Academic Performance</div>
          <div class="chart-area h240">
            <Bar v-if="edaHist['academic_performance']" :data="edaHist['academic_performance']" :options="histOpts" />
            <div v-else class="chart-spin"><v-progress-circular indeterminate color="info" size="24"/></div>
          </div>
        </div>
        <div class="chart-card">
          <div class="card-head">Study Load</div>
          <div class="chart-area h240">
            <Bar v-if="edaHist['study_load']" :data="edaHist['study_load']" :options="histOpts" />
            <div v-else class="chart-spin"><v-progress-circular indeterminate color="info" size="24"/></div>
          </div>
        </div>
      </div>

      <!-- ── Feature vs Stress ─────────────────────────────────────── -->
      <div class="eda-section-label">Feature vs Stress Level (mean per class)</div>
      <div class="charts-grid four-col mb-4">
        <div class="chart-card" v-for="feat in ['anxiety_level','depression','sleep_quality','social_support','self_esteem','academic_performance','peer_pressure','study_load']" :key="feat">
          <div class="card-head">{{ feat.replace(/_/g,' ') }}</div>
          <div class="chart-area h200">
            <Bar v-if="edaFvs[feat]" :data="edaFvs[feat]" :options="fvsOpts" />
            <div v-else class="chart-spin"><v-progress-circular indeterminate color="primary" size="20"/></div>
          </div>
        </div>
      </div>

      <!-- ── Bivariate scatter ──────────────────────────────────────── -->
      <div class="eda-section-label">Bivariate Relationships</div>
      <div class="charts-grid three-col mb-4">
        <div class="chart-card" v-for="p in [
          {x:'anxiety_level',y:'depression',lbl:'Anxiety vs Depression'},
          {x:'sleep_quality',y:'self_esteem',lbl:'Sleep Quality vs Self-Esteem'},
          {x:'peer_pressure',y:'bullying',lbl:'Peer Pressure vs Bullying'},
          {x:'study_load',y:'academic_performance',lbl:'Study Load vs Academic Perf.'},
          {x:'social_support',y:'self_esteem',lbl:'Social Support vs Self-Esteem'},
          {x:'future_career_concerns',y:'anxiety_level',lbl:'Career Concerns vs Anxiety'},
        ]" :key="p.lbl">
          <div class="card-head">{{ p.lbl }}</div>
          <div class="chart-area h240">
            <Scatter v-if="edaScatter[p.x+'__'+p.y]" :data="edaScatter[p.x+'__'+p.y]" :options="scatOpts" />
            <div v-else class="chart-spin"><v-progress-circular indeterminate color="primary" size="24"/></div>
          </div>
        </div>
      </div>

      <!-- ── Correlation Analysis ───────────────────────────────────── -->
      <div class="eda-section-label">Correlation Analysis</div>
      <div class="charts-grid equal mb-4">
        <div class="chart-card">
          <div class="card-head">Top Correlations with Stress Level</div>
          <div class="chart-area h340">
            <Bar v-if="topCorrData" :data="topCorrData" :options="topCorrOpts" />
            <div v-else class="chart-spin"><v-progress-circular indeterminate color="primary" size="24"/></div>
          </div>
        </div>
        <div class="chart-card">
          <div class="card-head">Feature Skewness</div>
          <div class="chart-area h340">
            <Bar v-if="skewData" :data="skewData" :options="skewOpts" />
            <div v-else class="chart-spin"><v-progress-circular indeterminate color="warning" size="24"/></div>
          </div>
        </div>
        <div class="chart-card">
          <div class="card-head">Feature Kurtosis</div>
          <div class="chart-area h340">
            <Bar v-if="kurtData" :data="kurtData" :options="kurtOpts" />
            <div v-else class="chart-spin"><v-progress-circular indeterminate color="error" size="24"/></div>
          </div>
        </div>
      </div>

      <!-- ── Correlation Heatmap ────────────────────────────────────── -->
      <div class="chart-card mb-4">
        <div class="card-head">Correlation Heatmap — Full Matrix</div>
        <div v-if="hmCells.length" class="heatmap-wrap">
          <table class="hm-table">
            <thead>
              <tr>
                <th class="hm-corner"></th>
                <th v-for="col in hmCols" :key="col"><div class="hm-col-lbl">{{ fmt(col) }}</div></th>
              </tr>
            </thead>
            <tbody>
              <tr v-for="row in hmCols" :key="row">
                <td class="hm-row-lbl">{{ fmt(row) }}</td>
                <td v-for="col in hmCols" :key="col"
                  class="hm-cell"
                  :style="{ background: cellBg(hmCell(col,row)?.value ?? 0) }"
                  :title="`${fmt(row)} × ${fmt(col)}: ${(hmCell(col,row)?.value??0).toFixed(2)}`"
                >
                  <span :style="{ color: cellText(hmCell(col,row)?.value ?? 0) }">
                    {{ (hmCell(col,row)?.value??0).toFixed(2) }}
                  </span>
                </td>
              </tr>
            </tbody>
          </table>
        </div>
        <div v-else class="chart-spin pa-10"><v-progress-circular indeterminate color="accent" size="28"/></div>
      </div>

    </template>
  </div>
</template>

<style scoped>
.charts-page { padding: 20px; display: flex; flex-direction: column; gap: 0; }
.mb-4 { margin-bottom: 16px; }

.eda-section-label {
  font-size: 0.68rem; font-weight: 700; text-transform: uppercase;
  letter-spacing: 1.6px; opacity: 0.38; margin-bottom: 10px; margin-top: 6px; padding-left: 2px;
}
.eda-loading { display: flex; flex-direction: column; align-items: center; justify-content: center; padding: 80px 0; }
.eda-loading-text { font-size: 0.82rem; opacity: 0.45; }

.charts-grid { display: grid; gap: 16px; }
.equal     { grid-template-columns: 1fr 1fr; }
.three-col { grid-template-columns: 1fr 1fr 1fr; }
.four-col  { grid-template-columns: 1fr 1fr 1fr 1fr; }

.chart-card {
  border: 1px solid rgba(255,255,255,0.07);
  border-radius: 12px; overflow: hidden;
  background: rgba(255,255,255,0.02);
}
.card-head {
  display: flex; align-items: center; justify-content: space-between; gap: 12px;
  padding: 12px 16px; border-bottom: 1px solid rgba(255,255,255,0.05);
  font-size: 0.72rem; font-weight: 700; text-transform: uppercase; letter-spacing: 1.2px; opacity: 0.5;
}

.chart-area { padding: 16px; position: relative; }
.h200 { height: 200px; }
.h220 { height: 220px; }
.h240 { height: 240px; }
.h340 { height: 340px; }
.chart-spin { display: flex; align-items: center; justify-content: center; height: 100%; }

.heatmap-wrap { overflow-x: auto; padding: 16px; }
.hm-table { border-collapse: collapse; font-size: 9px; }
.hm-corner { width: 96px; min-width: 96px; }
.hm-table thead th { padding: 2px 1px; vertical-align: bottom; width: 36px; min-width: 36px; }
.hm-col-lbl { writing-mode: vertical-rl; transform: rotate(180deg); font-size: 7.5px; opacity: 0.5; max-height: 80px; overflow: hidden; white-space: nowrap; font-weight: 500; }
.hm-row-lbl { font-size: 7.5px; opacity: 0.5; padding-right: 8px; text-align: right; white-space: nowrap; overflow: hidden; max-width: 96px; text-overflow: ellipsis; font-weight: 500; }
.hm-cell { width: 36px; height: 27px; text-align: center; cursor: default; transition: filter 0.15s; font-size: 7.5px; font-weight: 600; }
.hm-cell:hover { filter: brightness(1.5); }

@media (max-width: 1200px) { .four-col { grid-template-columns: 1fr 1fr; } }
@media (max-width: 1100px) { .three-col { grid-template-columns: 1fr 1fr; } }
@media (max-width: 900px)  { .equal, .three-col, .four-col { grid-template-columns: 1fr; } }
</style>
