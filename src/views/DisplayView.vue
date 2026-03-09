<template>
  <div class="display-container">
    <!-- 左側比分面板 -->
    <transition name="slide">
      <div v-if="scoreboardVisible" class="scoreboard">
        <!-- 倒數計時 -->
        <div v-if="timerSeconds > 0 || timerRunning" class="timer-bar" :class="{ 'timer-warning': timerSeconds <= 10 }">
          {{ formatTime(timerSeconds) }}
        </div>

        <h2 class="scoreboard-title">隊伍比分</h2>
        <div
          v-for="team in teams"
          :key="team.id"
          class="team-card"
          :style="teamCardStyle(team.color)"
        >
          <span class="team-name">{{ team.name }}</span>
          <span class="team-score">{{ team.score }}</span>
        </div>
      </div>
    </transition>

    <!-- 右側 Figma Slides -->
    <div class="slide-area">
      <iframe
        v-if="figmaUrl"
        :src="figmaEmbedUrl"
        class="figma-iframe"
        allowfullscreen
      ></iframe>
      <div v-else class="placeholder">
        <p>請在控制器中輸入 Figma 連結</p>
      </div>
    </div>

    <!-- 計時結束提示 -->
    <transition name="fade">
      <div v-if="showTimerEnd" class="timer-end-overlay" @click="showTimerEnd = false">
        <span>時間到！</span>
      </div>
    </transition>
  </div>
</template>

<script setup>
import { ref, computed, onMounted, onUnmounted } from 'vue'

const teams = ref([
  { id: 1, name: '第一隊', score: 0, color: '#e74c3c' },
  { id: 2, name: '第二隊', score: 0, color: '#3498db' },
  { id: 3, name: '第三隊', score: 0, color: '#2ecc71' },
  { id: 4, name: '第四隊', score: 0, color: '#f39c12' },
  { id: 5, name: '第五隊', score: 0, color: '#9b59b6' },
])

const figmaUrl = ref('')
const scoreboardVisible = ref(true)
const timerSeconds = ref(0)
const timerRunning = ref(false)
const showTimerEnd = ref(false)

const figmaEmbedUrl = computed(() => {
  if (!figmaUrl.value) return ''
  const encoded = encodeURIComponent(figmaUrl.value)
  return `https://www.figma.com/embed?embed_host=share&url=${encoded}`
})

function teamCardStyle(color) {
  return {
    background: `linear-gradient(135deg, ${color}88, ${color}33)`,
  }
}

function formatTime(s) {
  const m = Math.floor(s / 60)
  const sec = s % 60
  return `${String(m).padStart(2, '0')}:${String(sec).padStart(2, '0')}`
}

const channel = new BroadcastChannel('cloud100')

function handleMessage(event) {
  const { type, data } = event.data
  if (type === 'update-scores') {
    teams.value = data
  } else if (type === 'update-figma') {
    figmaUrl.value = data
  } else if (type === 'update-visibility') {
    scoreboardVisible.value = data
  } else if (type === 'update-timer') {
    timerSeconds.value = data.seconds
    timerRunning.value = data.running
  } else if (type === 'timer-end') {
    showTimerEnd.value = true
    setTimeout(() => { showTimerEnd.value = false }, 5000)
  }
}

onMounted(() => {
  channel.addEventListener('message', handleMessage)

  const saved = localStorage.getItem('cloud100-state')
  if (saved) {
    const state = JSON.parse(saved)
    const fallbackColors = ['#e74c3c', '#3498db', '#2ecc71', '#f39c12', '#9b59b6', '#1abc9c', '#e67e22', '#2c3e50']
    if (state.teams) {
      teams.value = state.teams.map((t, i) => ({
        id: t.id ?? i + 1,
        name: t.name,
        score: t.score,
        color: t.color ?? fallbackColors[i % fallbackColors.length],
      }))
    }
    if (state.figmaUrl) figmaUrl.value = state.figmaUrl
    if (state.scoreboardVisible !== undefined) scoreboardVisible.value = state.scoreboardVisible
  }
})

onUnmounted(() => {
  channel.removeEventListener('message', handleMessage)
  channel.close()
})
</script>

<style scoped>
.display-container {
  display: flex;
  height: 100vh;
  background: #0a0a1a;
  color: #fff;
  position: relative;
}

.scoreboard {
  width: 280px;
  min-width: 280px;
  padding: 24px 16px;
  display: flex;
  flex-direction: column;
  gap: 12px;
  background: #111128;
  border-right: 2px solid #2a2a4a;
}

/* 進出動畫 */
.slide-enter-active,
.slide-leave-active {
  transition: all 0.4s ease;
}

.slide-enter-from,
.slide-leave-to {
  margin-left: -280px;
  opacity: 0;
}

/* 倒數計時 */
.timer-bar {
  text-align: center;
  font-size: 2.4rem;
  font-weight: 800;
  font-variant-numeric: tabular-nums;
  letter-spacing: 4px;
  padding: 12px 0;
  border-radius: 12px;
  background: linear-gradient(135deg, #1a1a3e, #2a2a5e);
  color: #fff;
  animation: none;
}

.timer-warning {
  color: #e74c3c;
  animation: blink 1s infinite;
}

@keyframes blink {
  0%, 100% { opacity: 1; }
  50% { opacity: 0.4; }
}

.scoreboard-title {
  text-align: center;
  font-size: 1.4rem;
  margin: 0 0 8px;
  color: #aab;
  letter-spacing: 4px;
}

.team-card {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 16px 20px;
  border-radius: 12px;
  font-size: 1.1rem;
  transition: transform 0.3s;
}

.team-card:hover {
  transform: scale(1.03);
}

.team-name {
  font-weight: 600;
}

.team-score {
  font-size: 2rem;
  font-weight: 800;
  font-variant-numeric: tabular-nums;
}

.slide-area {
  flex: 1;
  display: flex;
  align-items: center;
  justify-content: center;
}

.figma-iframe {
  width: 100%;
  height: 100%;
  border: none;
}

.placeholder {
  color: #555;
  font-size: 1.2rem;
}

/* 計時結束提示 */
.timer-end-overlay {
  position: fixed;
  inset: 0;
  background: rgba(0, 0, 0, 0.7);
  display: flex;
  align-items: center;
  justify-content: center;
  z-index: 100;
  cursor: pointer;
}

.timer-end-overlay span {
  font-size: 5rem;
  font-weight: 900;
  color: #e74c3c;
  animation: pulse 0.6s ease-in-out infinite alternate;
}

@keyframes pulse {
  from { transform: scale(1); }
  to { transform: scale(1.1); }
}

.fade-enter-active,
.fade-leave-active {
  transition: opacity 0.5s;
}

.fade-enter-from,
.fade-leave-to {
  opacity: 0;
}
</style>
