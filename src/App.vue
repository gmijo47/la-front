<script setup>
import { useTheme } from 'vuetify'
import { computed } from 'vue'
import DockNav from './components/DockNav.vue'
import Mascot from './components/Mascot.vue'

const theme = useTheme()
const isDark = computed(() => theme.global.name.value === 'darkTheme')

function toggleTheme() {
  theme.global.name.value = isDark.value ? 'lightTheme' : 'darkTheme'
}
</script>

<template>
  <v-app>
    <!-- Floating theme toggle -->
    <button
      class="theme-toggle"
      :class="isDark ? 'toggle-dark' : 'toggle-light'"
      :title="isDark ? 'Switch to light mode' : 'Switch to dark mode'"
      @click="toggleTheme"
      aria-label="Toggle theme"
    >
      <v-icon :icon="isDark ? 'mdi-weather-sunny' : 'mdi-weather-night'" size="18" />
    </button>

    <!-- Main content -->
    <v-main class="main-content">
      <RouterView v-slot="{ Component }">
        <Transition name="page" mode="out-in">
          <component :is="Component" />
        </Transition>
      </RouterView>
    </v-main>

    <!-- Floating Dock -->
    <DockNav />

    <!-- Mascot -->
    <Mascot />
  </v-app>
</template>

<style>
.theme-toggle {
  position: fixed;
  top: 16px;
  right: 16px;
  z-index: 9999;
  width: 38px;
  height: 38px;
  border-radius: 50%;
  border: 1px solid rgba(37,99,235,0.28);
  cursor: pointer;
  display: flex;
  align-items: center;
  justify-content: center;
  transition: all 0.22s cubic-bezier(0.34,1.56,0.64,1);
  backdrop-filter: blur(16px) saturate(1.6);
  outline: none;
}
.toggle-dark {
  background: rgba(18,18,26,0.72);
  color: rgba(226,232,240,0.8);
}
.toggle-light {
  background: rgba(255,255,255,0.78);
  color: rgba(15,23,42,0.75);
  border-color: rgba(37,99,235,0.22);
}
.theme-toggle:hover {
  transform: scale(1.14) rotate(15deg);
  border-color: rgba(37,99,235,0.55);
  box-shadow: 0 4px 16px rgba(37,99,235,0.25);
}

.main-content { padding-top: 16px !important; padding-bottom: 100px; }

/* Page transitions */
.page-enter-active, .page-leave-active { transition: all 0.35s cubic-bezier(0.4,0,0.2,1); }
.page-enter-from { opacity: 0; transform: translateY(18px); }
.page-leave-to  { opacity: 0; transform: translateY(-18px); }

/* ── Light mode overrides ── */
.v-theme--lightTheme .chart-card,
.v-theme--lightTheme .panel,
.v-theme--lightTheme .info-card,
.v-theme--lightTheme .q-card,
.v-theme--lightTheme .mode-card {
  background: rgba(241,245,249,0.85) !important;
  border-color: rgba(37,99,235,0.18) !important;
  color: #0f172a !important;
}
.v-theme--lightTheme .tab-bar {
  background: rgba(226,232,240,0.7) !important;
  border-color: rgba(37,99,235,0.15) !important;
}
.v-theme--lightTheme .tab-btn {
  color: #334155 !important;
}
.v-theme--lightTheme .tab-btn.active {
  background: rgba(37,99,235,0.15) !important;
  color: #1d4ed8 !important;
}
.v-theme--lightTheme .hm-col-lbl,
.v-theme--lightTheme .hm-row-lbl {
  color: #334155 !important;
}
.v-theme--lightTheme .hm-cell {
  color: #0f172a !important;
}
.v-theme--lightTheme .card-head,
.v-theme--lightTheme .panel-head {
  color: #0f172a !important;
}
.v-theme--lightTheme .metric-col {
  background: rgba(241,245,249,0.9) !important;
  border-color: rgba(37,99,235,0.15) !important;
}
.v-theme--lightTheme .eda-section-label {
  color: #1e40af !important;
}
.v-theme--lightTheme .stat-box {
  background: rgba(241,245,249,0.85) !important;
  border-color: rgba(37,99,235,0.18) !important;
}
.v-theme--lightTheme .stat-val {
  color: #1d4ed8 !important;
}
.v-theme--lightTheme .stat-lbl {
  color: #475569 !important;
}
.v-theme--lightTheme .dock {
  background: rgba(241,245,249,0.88) !important;
  border-color: rgba(37,99,235,0.2) !important;
  color: #0f172a !important;
}
.v-theme--lightTheme .dock-label {
  color: #334155 !important;
}
.v-theme--lightTheme .dock-item.active .dock-label {
  color: #1d4ed8 !important;
}
.v-theme--lightTheme .v-data-table {
  background: transparent !important;
}
.v-theme--lightTheme .badge {
  background: rgba(37,99,235,0.1) !important;
  color: #1d4ed8 !important;
}
.v-theme--lightTheme .feat-tag--target {
  background: rgba(37,99,235,0.08) !important;
  border-color: rgba(37,99,235,0.25) !important;
  color: #1d4ed8 !important;
}
.v-theme--lightTheme .section-title {
  color: #0f172a !important;
}
.v-theme--lightTheme .dist-name {
  color: #0f172a !important;
}
.v-theme--lightTheme .step-label {
  color: #334155 !important;
}
.v-theme--lightTheme .q-text {
  color: #0f172a !important;
}
.v-theme--lightTheme .sub-title {
  color: #334155 !important;
}
/* ── InfoView light overrides ── */
.v-theme--lightTheme .info-page   { color: #0f172a !important; }
.v-theme--lightTheme .hero {
  background: linear-gradient(135deg,rgba(37,99,235,0.1) 0%,rgba(139,92,246,0.07) 55%,rgba(16,185,129,0.06) 100%) !important;
  border-color: rgba(37,99,235,0.28) !important;
}
.v-theme--lightTheme .hero-sub    { color: #475569 !important; opacity: 1 !important; }
.v-theme--lightTheme .hs-l        { color: #64748b !important; opacity: 1 !important; }
.v-theme--lightTheme .glass-card  {
  background: #ffffff !important;
  border-color: rgba(37,99,235,0.2) !important;
  color: #0f172a !important;
  box-shadow: 0 1px 4px rgba(15,23,42,0.07) !important;
}
.v-theme--lightTheme .ds-cell     {
  background: #f1f5f9 !important;
  border-color: rgba(37,99,235,0.15) !important;
}
.v-theme--lightTheme .ds-val      { color: #0f172a !important; }
.v-theme--lightTheme .ds-k        { color: #475569 !important; opacity: 1 !important; }
.v-theme--lightTheme .card-label  { color: #64748b !important; opacity: 1 !important; }
.v-theme--lightTheme .model-name  { color: #0f172a !important; }
.v-theme--lightTheme .model-hint  { color: #64748b !important; opacity: 1 !important; }
.v-theme--lightTheme .big-acc     { opacity: 1 !important; }
.v-theme--lightTheme .mr-cls      { color: #0f172a !important; }
.v-theme--lightTheme .mr-key      { color: #64748b !important; opacity: 1 !important; }
.v-theme--lightTheme .mr-val      { color: #334155 !important; opacity: 1 !important; }
.v-theme--lightTheme .mr-track    { background: rgba(15,23,42,0.09) !important; }
.v-theme--lightTheme .cm-table th { color: #475569 !important; opacity: 1 !important; }
.v-theme--lightTheme .cm-rl       { color: #475569 !important; opacity: 1 !important; }
.v-theme--lightTheme .arch-u      { color: #475569 !important; opacity: 1 !important; }
.v-theme--lightTheme .arch-note   { color: #64748b !important; opacity: 1 !important; }
.v-theme--lightTheme .arch-arrow  { color: #334155 !important; }
.v-theme--lightTheme .fw-head     { color: #0f172a !important; }
.v-theme--lightTheme .fw-lbl      { color: #334155 !important; opacity: 1 !important; }
.v-theme--lightTheme .fw-track    { background: rgba(15,23,42,0.07) !important; }
.v-theme--lightTheme .fw-val      { opacity: 1 !important; }
.v-theme--lightTheme .feat-chip   {
  background: #f1f5f9 !important;
  border-color: rgba(37,99,235,0.18) !important;
}
.v-theme--lightTheme .chip-lbl    { color: #0f172a !important; }
.v-theme--lightTheme .chip-scale  { color: #64748b !important; opacity: 1 !important; }
.v-theme--lightTheme .cat-title   { opacity: 1 !important; }
.v-theme--lightTheme .mascot-hint { color: #64748b !important; opacity: 0.55 !important; }
.v-theme--lightTheme .dist-name   { color: #0f172a !important; }
.v-theme--lightTheme .dist-n      { color: #64748b !important; opacity: 1 !important; }
.v-theme--lightTheme .dist-track  { background: rgba(15,23,42,0.08) !important; }
/* mode toggle */
.v-theme--lightTheme .mode-toggle { background: #f1f5f9 !important; border-color: rgba(37,99,235,0.18) !important; }
.v-theme--lightTheme .mt-btn      { color: #64748b !important; }
.v-theme--lightTheme .mt-btn.active { background: rgba(37,99,235,0.12) !important; color: #1d4ed8 !important; }
/* full mode cards */
.v-theme--lightTheme .full-feat-card {
  background: #f8fafc !important;
  border-color: rgba(37,99,235,0.15) !important;
}
.v-theme--lightTheme .ffc-name    { color: #0f172a !important; }
.v-theme--lightTheme .ffc-desc    { color: #334155 !important; opacity: 1 !important; }
.v-theme--lightTheme .ffc-scale   { background: rgba(15,23,42,0.07) !important; color: #475569 !important; opacity: 1 !important; }
</style>

