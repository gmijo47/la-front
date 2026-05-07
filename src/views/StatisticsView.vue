<script setup>
import { ref, onMounted, computed } from 'vue'
import { getEdaInfo, getEdaSummary, getSkewKurtosis, getValueCounts, getModelMetrics, getCorrelation } from '../api'

const info      = ref(null)
const summary   = ref(null)
const skewKurt  = ref(null)
const distData  = ref(null)
const nnAccuracy = ref(null)
const corrData   = ref(null)

const animRows  = ref(0)
const animFeats = ref(0)

function animateTo(r, target, dur = 1400) {
  const start = performance.now()
  const tick = (now) => {
    const t = Math.min((now - start) / dur, 1)
    r.value = Math.round((1 - Math.pow(1 - t, 4)) * target)
    if (t < 1) requestAnimationFrame(tick)
    else r.value = target
  }
  requestAnimationFrame(tick)
}

const SMETA = {
  Low:    { color: '#10b981', hex: '16,185,129' },
  Medium: { color: '#f59e0b', hex: '245,158,11' },
  High:   { color: '#ef4444', hex: '239,68,68'  },
}
const totalDist = computed(() =>
  distData.value?.counts
    ? Object.values(distData.value.counts).reduce((a,b) => a+b, 0)
    : 1
)

const TABLE_COLS = [
  { key: 'feature', label: 'Feature'  },
  { key: 'mean',    label: 'Mean'     },
  { key: 'std',     label: 'Std Dev'  },
  { key: 'min',     label: 'Min'      },
  { key: 'q1',      label: 'Q1'       },
  { key: 'median',  label: 'Median'   },
  { key: 'q3',      label: 'Q3'       },
  { key: 'max',     label: 'Max'      },
]
const tableRows = computed(() => {
  if (!summary.value) return []
  return Object.entries(summary.value).map(([feat, s]) => ({
    feature: feat,
    mean:   s.mean?.toFixed(3)   ?? '—',
    std:    s.std?.toFixed(3)    ?? '—',
    min:    s.min?.toFixed(2)    ?? '—',
    max:    s.max?.toFixed(2)    ?? '—',
    q1:     s['25%']?.toFixed(2) ?? '—',
    median: s['50%']?.toFixed(2) ?? '—',
    q3:     s['75%']?.toFixed(2) ?? '—',
  }))
})

const skewColor = v => {
  const a = Math.abs(v)
  if (a < 0.5) return '#10b981'
  if (a < 1)   return '#f59e0b'
  return '#ef4444'
}

const stressCorr = computed(() => {
  if (!corrData.value) return []
  const matrix = corrData.value
  const stressRow = matrix['stress_level'] || {}
  return Object.entries(stressRow)
    .filter(([k]) => k !== 'stress_level')
    .map(([k, v]) => ({ feature: k, corr: v }))
    .sort((a, b) => Math.abs(b.corr) - Math.abs(a.corr))
})

onMounted(async () => {
  const [iR, sR, skR, vR, mR, cR] = await Promise.all([
    getEdaInfo(), getEdaSummary(), getSkewKurtosis(), getValueCounts('stress_level'),
    getModelMetrics(), getCorrelation(),
  ])
  info.value     = iR.data
  summary.value  = sR.data
  skewKurt.value = skR.data
  distData.value = vR.data
  nnAccuracy.value = mR.data?.nn_accuracy ?? null
  corrData.value   = cR.data
  animateTo(animRows,  iR.data.rows)
  animateTo(animFeats, iR.data.columns - 1)
})
</script>

<template>
  <div class="page">
    <!-- ── Top stat strip ─────────────────────────────────────────────── -->
    <div class="stat-strip">
      <div class="stat-item" v-for="s in [
        { v: animRows,  lbl: 'Records',   color: '#60a5fa' },
        { v: animFeats, lbl: 'Features',  color: '#67e8f9' },
        { v: 3,         lbl: 'Classes',   color: '#6ee7b7' },
        { v: 0,         lbl: 'Missing',   color: '#fde68a' },
      ]" :key="s.lbl">
        <span class="stat-num" :style="{ color: s.color }">{{ s.v.toLocaleString() }}</span>
        <span class="stat-lbl">{{ s.lbl }}</span>
      </div>
      <div class="stat-item">
        <span class="stat-num" :style="{ color: '#a3e635' }">{{ nnAccuracy !== null ? (nnAccuracy * 100).toFixed(1) + '%' : '…' }}</span>
        <span class="stat-lbl">NN Accuracy</span>
      </div>
    </div>

    <div class="content">
      <!-- ── Row 1: Distribution + Features ───────────────────────────── -->
      <div class="two-col mb-5">

        <!-- Distribution -->
        <div class="panel">
          <div class="panel-head">Stress Distribution</div>
          <div class="panel-body">
            <template v-if="distData">
              <div v-for="(count, label) in distData.counts" :key="label" class="dist-item">
                <div class="dist-top">
                  <span class="dist-dot" :style="{ background: SMETA[label]?.color }"/>
                  <span class="dist-name">{{ label }}</span>
                  <span class="dist-n">{{ count.toLocaleString() }}</span>
                  <span class="dist-pct" :style="{ color: SMETA[label]?.color }">
                    {{ Math.round(count / totalDist * 100) }}%
                  </span>
                </div>
                <div class="dist-track">
                  <div class="dist-fill"
                    :style="{ width: (count / totalDist * 100) + '%', background: SMETA[label]?.color }" />
                </div>
              </div>
            </template>
            <div v-else class="loading-row"><v-progress-circular size="24" indeterminate color="primary"/></div>
          </div>
        </div>

        <!-- Features -->
        <div class="panel">
          <div class="panel-head">
            Dataset Columns
            <span class="badge" v-if="info">{{ info.column_names.length }}</span>
          </div>
          <div class="panel-body feat-wrap">
            <template v-if="info">
              <span v-for="c in info.column_names" :key="c"
                class="feat-tag" :class="{ 'feat-tag--target': c === 'stress_level' }">
                {{ c }}
              </span>
            </template>
            <div v-else class="loading-row"><v-progress-circular size="24" indeterminate color="secondary"/></div>
          </div>
        </div>

      </div>

      <!-- ── Stats table ───────────────────────────────────────────────── -->
      <div class="panel mb-5">
        <div class="panel-head">Descriptive Statistics</div>
        <div class="table-scroll" v-if="summary">
          <table class="data-table">
            <thead>
              <tr>
                <th v-for="c in TABLE_COLS" :key="c.key">{{ c.label }}</th>
              </tr>
            </thead>
            <tbody>
              <tr v-for="row in tableRows" :key="row.feature">
                <td class="td-feat">{{ row.feature }}</td>
                <td>{{ row.mean }}</td>
                <td class="td-dim">{{ row.std }}</td>
                <td>{{ row.min }}</td>
                <td class="td-dim">{{ row.q1 }}</td>
                <td class="td-accent">{{ row.median }}</td>
                <td class="td-dim">{{ row.q3 }}</td>
                <td>{{ row.max }}</td>
              </tr>
            </tbody>
          </table>
        </div>
        <div v-else class="loading-row pa-6"><v-progress-circular indeterminate color="primary"/></div>
      </div>

      <!-- ── Skewness + Kurtosis ───────────────────────────────────────── -->
      <div class="two-col mb-5">
        <div class="panel">
          <div class="panel-head">
            Skewness
            <span class="panel-hint">|val| &lt; 0.5 → symmetric</span>
          </div>
          <div class="panel-body metric-list" v-if="skewKurt">
            <div v-for="(val, col) in skewKurt.skewness" :key="col" class="metric-row">
              <span class="metric-col">{{ col.replace(/_/g,' ') }}</span>
              <div class="metric-track">
                <div class="metric-center"/>
                <div class="metric-bar" :style="{
                  width: Math.min(Math.abs(val) * 50, 100) + '%',
                  [val >= 0 ? 'left' : 'right']: '50%',
                  background: skewColor(val)
                }"/>
              </div>
              <span class="metric-val" :style="{ color: skewColor(val) }">{{ val.toFixed(2) }}</span>
            </div>
          </div>
          <div v-else class="loading-row pa-6"><v-progress-circular size="20" indeterminate color="primary"/></div>
        </div>

        <div class="panel">
          <div class="panel-head">
            Kurtosis
            <span class="panel-hint">excess &gt; 3 → heavy tails</span>
          </div>
          <div class="panel-body metric-list" v-if="skewKurt">
            <div v-for="(val, col) in skewKurt.kurtosis" :key="col" class="metric-row">
              <span class="metric-col">{{ col.replace(/_/g,' ') }}</span>
              <div class="metric-track">
                <div class="metric-bar-k" :style="{
                  width: Math.min(Math.abs(val) / 10 * 100, 100) + '%',
                  background: Math.abs(val) > 3 ? '#f59e0b' : '#10b981'
                }"/>
              </div>
              <span class="metric-val" :style="{ color: Math.abs(val) > 3 ? '#f59e0b' : '#10b981' }">
                {{ val.toFixed(2) }}
              </span>
            </div>
          </div>
          <div v-else class="loading-row pa-6"><v-progress-circular size="20" indeterminate color="warning"/></div>
        </div>
      </div>

      <!-- ── Feature Ranges ─────────────────────────────────────────────── -->
      <div class="panel mb-5">
        <div class="panel-head">Feature Ranges <span class="panel-hint">min → max with mean</span></div>
        <div class="panel-body range-list" v-if="summary">
          <div v-for="(s, feat) in summary" :key="feat" class="range-row">
            <span class="range-feat">{{ feat.replace(/_/g,' ') }}</span>
            <div class="range-track">
              <div class="range-fill"
                :style="{ width: '100%' }"/>
              <div class="range-mean-dot"
                :style="{ left: s.max !== s.min ? ((s.mean - s.min) / (s.max - s.min) * 100) + '%' : '50%' }"/>
            </div>
            <span class="range-min">{{ s.min?.toFixed(1) }}</span>
            <span class="range-max">{{ s.max?.toFixed(1) }}</span>
          </div>
        </div>
        <div v-else class="loading-row pa-6"><v-progress-circular indeterminate color="primary"/></div>
      </div>

      <!-- ── Correlation with Stress ──────────────────────────────────────── -->
      <div class="panel mb-5">
        <div class="panel-head">Correlation with Stress Level <span class="panel-hint">|Pearson r| ranked</span></div>
        <div class="panel-body corr-list" v-if="corrData">
          <div v-for="item in stressCorr" :key="item.feature" class="corr-row">
            <span class="corr-feat">{{ item.feature.replace(/_/g,' ') }}</span>
            <div class="corr-track">
              <div class="corr-bar"
                :style="{
                  width: Math.abs(item.corr) * 100 + '%',
                  background: item.corr >= 0 ? '#3b82f6' : '#06b6d4'
                }"/>
            </div>
            <span class="corr-val" :style="{ color: item.corr >= 0 ? '#60a5fa' : '#67e8f9' }">
              {{ item.corr >= 0 ? '+' : '' }}{{ item.corr.toFixed(3) }}
            </span>
          </div>
        </div>
        <div v-else class="loading-row pa-6"><v-progress-circular indeterminate color="primary"/></div>
      </div>

      <!-- ── Data Quality ──────────────────────────────────────────────────── -->
      <div class="panel mb-5">
        <div class="panel-head">Data Quality</div>
        <div class="table-scroll" v-if="info">
          <table class="data-table">
            <thead>
              <tr>
                <th>Feature</th><th>Type</th><th>Unique Values</th><th>Null Count</th>
              </tr>
            </thead>
            <tbody>
              <tr v-for="col in info.column_names" :key="col">
                <td class="td-feat" :class="{ 'td-target': col === 'stress_level' }">{{ col }}</td>
                <td class="td-dim">{{ info.dtypes?.[col] ?? 'numeric' }}</td>
                <td>{{ info.unique_counts?.[col] ?? '—' }}</td>
                <td class="td-zero">{{ info.null_counts?.[col] ?? 0 }}</td>
              </tr>
            </tbody>
          </table>
        </div>
        <div v-else class="loading-row pa-6"><v-progress-circular indeterminate color="primary"/></div>
      </div>

    </div>
  </div>
</template>

<style scoped>
.page { min-height: 100%; background: rgb(var(--v-theme-background)); }

/* Stat strip */
.stat-strip {
  display: flex;
  border-bottom: 1px solid rgba(255,255,255,0.06);
}
.stat-item {
  flex: 1;
  display: flex;
  flex-direction: column;
  align-items: center;
  padding: 20px 12px;
  border-right: 1px solid rgba(255,255,255,0.05);
  gap: 4px;
}
.stat-item:last-child { border-right: none; }
.stat-num {
  font-size: 2.4rem;
  font-weight: 900;
  line-height: 1;
  letter-spacing: -1px;
  font-variant-numeric: tabular-nums;
}
.stat-lbl {
  font-size: 0.68rem;
  font-weight: 700;
  text-transform: uppercase;
  letter-spacing: 1.5px;
  opacity: 0.4;
}

/* Layout */
.content { padding: 24px; }
.two-col { display: grid; grid-template-columns: 1fr 1fr; gap: 16px; }
.mb-5 { margin-bottom: 16px; }

/* Panel */
.panel {
  border: 1px solid rgba(255,255,255,0.07);
  border-radius: 12px;
  overflow: hidden;
  background: rgba(255,255,255,0.02);
}
.panel-head {
  padding: 12px 18px;
  font-size: 0.72rem;
  font-weight: 700;
  text-transform: uppercase;
  letter-spacing: 1.2px;
  opacity: 0.45;
  border-bottom: 1px solid rgba(255,255,255,0.05);
  display: flex;
  align-items: center;
  gap: 8px;
}
.panel-hint { margin-left: auto; font-style: italic; font-weight: 400; opacity: 0.6; text-transform: none; letter-spacing: 0; }
.panel-body { padding: 18px; }
.badge {
  margin-left: auto;
  font-size: 0.7rem;
  background: rgba(37,99,235,0.2);
  color: #60a5fa;
  padding: 1px 8px;
  border-radius: 100px;
}
.loading-row { display: flex; justify-content: center; align-items: center; }

/* Distribution */
.dist-item { margin-bottom: 16px; }
.dist-item:last-child { margin-bottom: 0; }
.dist-top { display: flex; align-items: center; gap: 7px; margin-bottom: 7px; }
.dist-dot { width: 7px; height: 7px; border-radius: 50%; flex-shrink: 0; }
.dist-name { font-size: 0.86rem; font-weight: 600; flex: 1; }
.dist-n { font-size: 0.78rem; opacity: 0.45; }
.dist-pct { font-size: 0.82rem; font-weight: 800; min-width: 36px; text-align: right; }
.dist-track {
  height: 5px;
  background: rgba(255,255,255,0.07);
  border-radius: 100px;
  overflow: hidden;
}
.dist-fill {
  height: 100%;
  border-radius: 100px;
  transition: width 1.4s cubic-bezier(0.4,0,0.2,1);
}

/* Features */
.feat-wrap { display: flex; flex-wrap: wrap; gap: 5px; }
.feat-tag {
  font-size: 0.71rem;
  padding: 3px 9px;
  border-radius: 5px;
  background: rgba(255,255,255,0.04);
  border: 1px solid rgba(255,255,255,0.07);
  color: rgba(255,255,255,0.5);
  font-weight: 500;
  transition: all 0.15s;
  cursor: default;
}
.feat-tag:hover { background: rgba(255,255,255,0.08); color: rgba(255,255,255,0.8); }
.feat-tag--target {
  background: rgba(37,99,235,0.15);
  border-color: rgba(37,99,235,0.35);
  color: #60a5fa;
  font-weight: 700;
}

/* Table */
.table-scroll { overflow-x: auto; }
.data-table { width: 100%; border-collapse: collapse; font-size: 0.81rem; }
.data-table th {
  padding: 9px 14px;
  text-align: left;
  font-size: 0.68rem;
  font-weight: 700;
  text-transform: uppercase;
  letter-spacing: 0.8px;
  opacity: 0.35;
  border-bottom: 1px solid rgba(255,255,255,0.06);
  white-space: nowrap;
}
.data-table td {
  padding: 8px 14px;
  border-bottom: 1px solid rgba(255,255,255,0.04);
  font-variant-numeric: tabular-nums;
  opacity: 0.7;
}
.data-table tr:last-child td { border-bottom: none; }
.data-table tr:hover td { background: rgba(255,255,255,0.02); }
.td-feat { font-weight: 600; opacity: 1 !important; color: rgba(255,255,255,0.85); font-size: 0.77rem; }
.td-dim  { opacity: 0.35 !important; }
.td-accent { font-weight: 700; color: #60a5fa !important; opacity: 1 !important; }
.td-target { color: #60a5fa !important; font-weight: 700; opacity: 1 !important; }
.td-zero   { color: #10b981 !important; opacity: 1 !important; }

/* Skew/Kurt metrics */
.metric-list { display: flex; flex-direction: column; gap: 9px; max-height: 300px; overflow-y: auto; }
.metric-row { display: flex; align-items: center; gap: 10px; }
.metric-col { font-size: 0.72rem; opacity: 0.55; min-width: 155px; white-space: nowrap; }
.metric-track {
  flex: 1;
  height: 4px;
  background: rgba(255,255,255,0.06);
  border-radius: 2px;
  position: relative;
  overflow: hidden;
}
.metric-center {
  position: absolute; left: 50%; top: 0;
  width: 1px; height: 100%;
  background: rgba(255,255,255,0.12);
}
.metric-bar {
  position: absolute; top: 0; height: 100%;
  border-radius: 2px;
  transition: width 0.9s ease;
}
.metric-bar-k { height: 100%; border-radius: 2px; transition: width 0.9s ease; }
.metric-val { font-size: 0.75rem; font-weight: 700; min-width: 42px; text-align: right; font-variant-numeric: tabular-nums; }

/* Feature Ranges */
.range-list { display: flex; flex-direction: column; gap: 10px; }
.range-row { display: flex; align-items: center; gap: 8px; }
.range-feat { font-size: 0.71rem; opacity: 0.55; min-width: 160px; white-space: nowrap; overflow: hidden; text-overflow: ellipsis; }
.range-track {
  flex: 1; height: 6px; background: rgba(255,255,255,0.06); border-radius: 100px;
  position: relative; overflow: visible;
}
.range-fill { height: 100%; border-radius: 100px; background: rgba(37,99,235,0.35); }
.range-mean-dot {
  position: absolute; top: 50%; transform: translate(-50%, -50%);
  width: 9px; height: 9px; border-radius: 50%;
  background: #60a5fa; border: 2px solid rgba(255,255,255,0.3);
}
.range-min, .range-max { font-size: 0.68rem; opacity: 0.4; font-variant-numeric: tabular-nums; min-width: 28px; }
.range-max { text-align: right; }

/* Correlation */
.corr-list { display: flex; flex-direction: column; gap: 9px; }
.corr-row { display: flex; align-items: center; gap: 10px; }
.corr-feat { font-size: 0.71rem; opacity: 0.55; min-width: 175px; white-space: nowrap; }
.corr-track { flex: 1; height: 5px; background: rgba(255,255,255,0.06); border-radius: 2px; overflow: hidden; }
.corr-bar { height: 100%; border-radius: 2px; transition: width 0.9s ease; }
.corr-val { font-size: 0.75rem; font-weight: 700; min-width: 52px; text-align: right; font-variant-numeric: tabular-nums; }

@media (max-width: 768px) {
  .two-col { grid-template-columns: 1fr; }
  .stat-num { font-size: 1.8rem; }
}
</style>
