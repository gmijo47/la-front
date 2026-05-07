<script setup>
import { useRouter, useRoute } from 'vue-router'
import { computed } from 'vue'

const router = useRouter()
const route = useRoute()

const items = [
  { to: '/',        icon: 'mdi-lightbulb-outline',      activeIcon: 'mdi-lightbulb',     label: 'Info'       },
  { to: '/stats',   icon: 'mdi-chart-box-outline',     activeIcon: 'mdi-chart-box',     label: 'Statistics' },
  { to: '/charts',  icon: 'mdi-chart-line',             activeIcon: 'mdi-chart-line',    label: 'Charts'     },
  { to: '/predict', icon: 'mdi-head-cog-outline',       activeIcon: 'mdi-head-cog',      label: 'Predict'    },
]

const current = computed(() => route.path)
</script>

<template>
  <div class="dock-wrap">
    <div class="dock">
      <div
        v-for="item in items"
        :key="item.to"
        class="dock-item"
        :class="{ active: current === item.to }"
        @click="router.push(item.to)"
      >
        <div class="dock-icon-wrap">
          <v-icon
            :icon="current === item.to ? item.activeIcon : item.icon"
            size="26"
          />
        </div>
        <span class="dock-label">{{ item.label }}</span>
        <div v-if="current === item.to" class="dock-dot" />
      </div>
    </div>
  </div>
</template>

<style scoped>
.dock-wrap {
  position: fixed;
  bottom: 20px;
  left: 50%;
  transform: translateX(-50%);
  z-index: 9999;
  pointer-events: none;
}

.dock {
  display: flex;
  gap: 6px;
  align-items: flex-end;
  padding: 10px 16px;
  border-radius: 24px;
  background: rgba(18, 18, 26, 0.72);
  backdrop-filter: blur(28px) saturate(1.8);
  border: 1px solid rgba(37, 99, 235, 0.22);
  box-shadow:
    0 8px 32px rgba(0,0,0,0.45),
    0 0 0 1px rgba(255,255,255,0.04) inset;
  pointer-events: all;
}

/* Light theme override */
:root[data-v-theme="lightTheme"] .dock,
.v-theme--lightTheme .dock {
  background: rgba(255,255,255,0.78);
  border-color: rgba(37,99,235,0.18);
  box-shadow: 0 8px 32px rgba(0,0,0,0.14), 0 0 0 1px rgba(0,0,0,0.04) inset;
}

.dock-item {
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 3px;
  padding: 8px 14px 6px;
  border-radius: 16px;
  cursor: pointer;
  position: relative;
  transition: transform 0.22s cubic-bezier(0.34,1.56,0.64,1);
  color: rgba(200,200,220,0.55);
}

.dock-item:hover {
  transform: translateY(-10px) scale(1.18);
  color: rgba(200,200,220,0.9);
}

.dock-item.active {
  color: rgb(37, 99, 235);
  background: rgba(37, 99, 235, 0.12);
}

.dock-item.active:hover {
  transform: translateY(-10px) scale(1.18);
}

.dock-icon-wrap {
  display: flex;
  align-items: center;
  justify-content: center;
  width: 36px;
  height: 36px;
}

.dock-label {
  font-size: 10px;
  font-weight: 600;
  letter-spacing: 0.3px;
  text-transform: uppercase;
  white-space: nowrap;
}

.dock-dot {
  position: absolute;
  bottom: 2px;
  width: 4px;
  height: 4px;
  border-radius: 50%;
  background: rgb(37, 99, 235);
  animation: dot-pop 0.3s cubic-bezier(0.34,1.56,0.64,1);
}

@keyframes dot-pop {
  from { transform: scale(0); opacity: 0; }
  to   { transform: scale(1); opacity: 1; }
}
</style>
