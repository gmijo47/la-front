import { defineStore } from 'pinia'
import { ref, computed } from 'vue'

export const useSurveyStore = defineStore('survey', () => {
  // PHQ-9 (depression, 0–27)
  const phq9 = ref(Array(9).fill(null))
  // GAD-7 (anxiety, 0–21)
  const gad7 = ref(Array(7).fill(null))
  // RSE (self_esteem, 0–30)
  const rse  = ref(Array(10).fill(null))

  // Other factors
  const others = ref({
    mental_health_history: 0,
    headache: 2,
    sleep_quality: 3,
    breathing_problem: 1,
    noise_level: 2,
    living_conditions: 3,
    safety: 3,
    basic_needs: 3,
    academic_performance: 3,
    study_load: 3,
    teacher_student_relationship: 3,
    future_career_concerns: 3,
    social_support: 2,
    peer_pressure: 2,
    extracurricular_activities: 2,
    bullying: 1,
  })

  // Computed scores
  const depressionScore = computed(() =>
    phq9.value.reduce((s, v) => s + (v ?? 0), 0)
  )
  const anxietyScore = computed(() =>
    gad7.value.reduce((s, v) => s + (v ?? 0), 0)
  )

  // RSE scoring: items 0,1,3,5,6 are positive (score as-is 0-3)
  //              items 2,4,7,8,9 are reversed (score = 3 - value)
  const REVERSED_RSE = [2, 4, 7, 8, 9]
  const selfEsteemScore = computed(() => {
    return rse.value.reduce((s, v, i) => {
      if (v === null) return s
      return s + (REVERSED_RSE.includes(i) ? 3 - v : v)
    }, 0)
  })

  const phq9Complete  = computed(() => phq9.value.every(v => v !== null))
  const gad7Complete  = computed(() => gad7.value.every(v => v !== null))
  const rseComplete   = computed(() => rse.value.every(v => v !== null))

  const payload = computed(() => ({
    anxiety_level:              anxietyScore.value,
    self_esteem:                selfEsteemScore.value,
    mental_health_history:      others.value.mental_health_history,
    depression:                 depressionScore.value,
    headache:                   others.value.headache,
    sleep_quality:              others.value.sleep_quality,
    breathing_problem:          others.value.breathing_problem,
    noise_level:                others.value.noise_level,
    living_conditions:          others.value.living_conditions,
    safety:                     others.value.safety,
    basic_needs:                others.value.basic_needs,
    academic_performance:       others.value.academic_performance,
    study_load:                 others.value.study_load,
    teacher_student_relationship: others.value.teacher_student_relationship,
    future_career_concerns:     others.value.future_career_concerns,
    social_support:             others.value.social_support,
    peer_pressure:              others.value.peer_pressure,
    extracurricular_activities: others.value.extracurricular_activities,
    bullying:                   others.value.bullying,
  }))

  function reset() {
    phq9.value = Array(9).fill(null)
    gad7.value = Array(7).fill(null)
    rse.value  = Array(10).fill(null)
    others.value = {
      mental_health_history: 0, headache: 2, sleep_quality: 3,
      breathing_problem: 1, noise_level: 2, living_conditions: 3,
      safety: 3, basic_needs: 3, academic_performance: 3,
      study_load: 3, teacher_student_relationship: 3,
      future_career_concerns: 3, social_support: 2,
      peer_pressure: 2, extracurricular_activities: 2, bullying: 1,
    }
  }

  return {
    phq9, gad7, rse, others,
    depressionScore, anxietyScore, selfEsteemScore,
    phq9Complete, gad7Complete, rseComplete,
    payload, reset,
  }
})
