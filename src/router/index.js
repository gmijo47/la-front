import { createRouter, createWebHistory } from 'vue-router'
import StatisticsView from '../views/StatisticsView.vue'
import ChartsView from '../views/ChartsView.vue'
import PredictView from '../views/PredictView.vue'
import InfoView from '../views/InfoView.vue'

const routes = [
  { path: '/',        name: 'info',       component: InfoView       },
  { path: '/stats',   name: 'statistics', component: StatisticsView },
  { path: '/charts',  name: 'charts',     component: ChartsView     },
  { path: '/predict', name: 'predict',    component: PredictView    },
]

export default createRouter({
  history: createWebHistory(),
  routes,
})
