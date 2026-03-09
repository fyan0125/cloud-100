<template>
  <div class="display-container">
    <!-- 左側比分面板 -->
    <transition
      @before-enter="onBeforeEnter"
      @enter="onEnter"
      @leave="onLeave"
    >
      <div v-if="scoreboardVisible" class="scoreboard" :style="{ width: scoreboardWidth + 'px', minWidth: scoreboardWidth + 'px' }">
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
        ref="figmaIframe"
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
const figmaIframe = ref(null)
const scoreboardVisible = ref(true)
const scoreboardWidth = ref(280)
const timerSeconds = ref(0)
const timerRunning = ref(false)
const showTimerEnd = ref(false)

const figmaEmbedUrl = computed(() => {
  if (!figmaUrl.value) return ''
  const encoded = encodeURIComponent(figmaUrl.value)
  return `https://www.figma.com/embed?embed_host=share&hide-ui=1&url=${encoded}`
})

function teamCardStyle(color) {
  return {
    background: `linear-gradient(135deg, ${color}88, ${color}33)`,
  }
}

function onBeforeEnter(el) {
  el.style.marginLeft = `-${scoreboardWidth.value}px`
  el.style.opacity = '0'
}

function onEnter(el, done) {
  // force reflow
  void el.offsetHeight
  el.style.transition = 'margin-left 0.4s ease, opacity 0.4s ease'
  el.style.marginLeft = '0'
  el.style.opacity = '1'
  el.addEventListener('transitionend', done, { once: true })
}

function onLeave(el, done) {
  el.style.transition = 'margin-left 0.4s ease, opacity 0.4s ease'
  el.style.marginLeft = `-${scoreboardWidth.value}px`
  el.style.opacity = '0'
  el.addEventListener('transitionend', done, { once: true })
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
    scoreboardVisible.value = data.visible
    scoreboardWidth.value = data.width
  } else if (type === 'update-timer') {
    timerSeconds.value = data.seconds
    timerRunning.value = data.running
  } else if (type === 'timer-end') {
    showTimerEnd.value = true
    setTimeout(() => { showTimerEnd.value = false }, 5000)
  } else if (type === 'navigate-slide') {
    navigateSlide(data)
  }
}

function navigateSlide(direction) {
  const iframe = figmaIframe.value
  if (!iframe) return
  const key = direction === 'next' ? 'ArrowRight' : 'ArrowLeft'
  // 透過 postMessage 傳送鍵盤事件給 Figma iframe
  iframe.contentWindow.postMessage(
    { type: 'KEYBOARD_INPUT', key, keyCode: key === 'ArrowRight' ? 39 : 37 },
    '*'
  )
  // 備用方案：focus iframe 後在 iframe element 上觸發鍵盤事件
  iframe.focus()
  iframe.dispatchEvent(new KeyboardEvent('keydown', { key, code: key, bubbles: true }))
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
    if (state.scoreboardWidth) scoreboardWidth.value = state.scoreboardWidth
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
  background: #000;
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
  background: #000;
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
