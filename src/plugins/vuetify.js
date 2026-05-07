import 'vuetify/styles'
import '@mdi/font/css/materialdesignicons.css'
import { createVuetify } from 'vuetify'
import * as components from 'vuetify/components'
import * as directives from 'vuetify/directives'

const darkTheme = {
  dark: true,
  colors: {
    background: '#0a0a0f',
    surface: '#12121a',
    'surface-variant': '#1e1e2e',
    primary: '#2563eb',
    'primary-darken-1': '#1d4ed8',
    secondary: '#06b6d4',
    accent: '#f59e0b',
    error: '#ef4444',
    warning: '#f59e0b',
    info: '#06b6d4',
    success: '#10b981',
    'on-background': '#e2e8f0',
    'on-surface': '#e2e8f0',
  },
}

const lightTheme = {
  dark: false,
  colors: {
    background: '#f1f5f9',
    surface: '#ffffff',
    'surface-variant': '#e2e8f0',
    primary: '#2563eb',
    'primary-darken-1': '#1d4ed8',
    secondary: '#0891b2',
    accent: '#d97706',
    error: '#dc2626',
    warning: '#d97706',
    info: '#0891b2',
    success: '#059669',
    'on-background': '#0f172a',
    'on-surface': '#0f172a',
  },
}

export default createVuetify({
  components,
  directives,
  theme: {
    defaultTheme: 'darkTheme',
    themes: { darkTheme, lightTheme },
  },
  defaults: {
    VCard: { rounded: 'xl' },
    VBtn: { rounded: 'lg' },
    VChip: { rounded: 'lg' },
  },
})
