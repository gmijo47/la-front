import axios from 'axios'

const api = axios.create({ baseURL: 'http://localhost:8000' })

// ── EDA ───────────────────────────────────────────────────────────────────
export const getEdaSummary   = ()       => api.get('/eda/summary')
export const getEdaInfo      = ()       => api.get('/eda/info')
export const getEdaMissing   = ()       => api.get('/eda/missing')
export const getSkewKurtosis = ()       => api.get('/eda/skew-kurtosis')
export const getCorrelation  = ()       => api.get('/eda/correlation')
export const getValueCounts  = (col)    => api.get(`/eda/value-counts/${col}`)

// ── Graphs ────────────────────────────────────────────────────────────────
export const getStressDist       = ()           => api.get('/graphs/stress-distribution')
export const getCorrelationHeatmap = ()         => api.get('/graphs/correlation-heatmap')
export const getHistogram        = (col, bins)  => api.get(`/graphs/histogram/${col}`, { params: { bins } })
export const getBoxplot          = (cols)       => api.get('/graphs/boxplot', { params: cols ? { columns: cols } : {} })
export const getScatter          = (x, y, n)    => api.get(`/graphs/scatter/${x}/${y}`, { params: { sample: n ?? 500 } })
export const getFeatureVsStress  = (feat)       => api.get(`/graphs/feature-vs-stress/${feat}`)

// ── Prediction ────────────────────────────────────────────────────────────
export const predict           = (payload) => api.post('/predict', payload)
export const predictBasic      = (payload) => api.post('/predict/basic', payload)
export const predictLifestyle  = (payload) => api.post('/predict/lifestyle', payload)
export const getModelMetrics   = ()        => api.get('/model/metrics')
