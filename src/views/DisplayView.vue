<template>
  <div class="display-container" :class="'layout-' + layout">
    <!-- 上方區塊 -->
    <!-- layout: top → 計時器 + 計分板 -->
    <div v-if="scoreboardVisible && layout === 'top'" class="scoreboard scoreboard-top" :style="{ height: scoreboardWidth + 'px' }">
      <div v-if="timerSeconds > 0 || timerRunning" class="timer-bar" :class="{ 'timer-warning': timerSeconds <= 10 }">
        {{ formatTime(timerSeconds) }}
      </div>
      <h2 class="scoreboard-title">隊伍比分</h2>
      <div class="teams-horizontal">
        <div
          v-for="team in rankedTeams"
          :key="team.id"
          class="team-card"
          :style="teamCardStyle(team.color)"
        >
          <span class="team-name">{{ team.name }}</span>
          <span class="team-score">{{ team.score }}</span>
        </div>
      </div>
    </div>

    <div class="main-row">
      <!-- 左側計分板（layout: left） -->
      <transition
        @before-enter="onBeforeEnter"
        @enter="onEnter"
        @leave="onLeave"
      >
        <div
          v-if="scoreboardVisible && layout === 'left'"
          class="scoreboard scoreboard-side"
          :style="{ width: scoreboardWidth + 'px', minWidth: scoreboardWidth + 'px' }"
        >
          <div v-if="timerSeconds > 0 || timerRunning" class="timer-bar" :class="{ 'timer-warning': timerSeconds <= 10 }">
            {{ formatTime(timerSeconds) }}
          </div>
          <h2 class="scoreboard-title">隊伍比分</h2>
          <div
            v-for="team in rankedTeams"
            :key="team.id"
            class="team-card"
            :style="teamCardStyle(team.color)"
          >
            <span class="team-name">{{ team.name }}</span>
            <span class="team-score">{{ team.score }}</span>
          </div>
        </div>
      </transition>

      <!-- Figma Slides -->
      <div class="slide-area">
        <iframe
          v-if="figmaEmbedUrl"
          ref="figmaIframe"
          :src="figmaEmbedUrl"
          class="figma-iframe"
          allowfullscreen
        ></iframe>
        <div v-else class="placeholder">
          <p>請在控制器中輸入 Figma 連結與 Client ID</p>
        </div>
      </div>

      <!-- 右側計分板（layout: right） -->
      <transition
        @before-enter="onBeforeEnterRight"
        @enter="onEnterRight"
        @leave="onLeaveRight"
      >
        <div
          v-if="scoreboardVisible && layout === 'right'"
          class="scoreboard scoreboard-side"
          :style="{ width: scoreboardWidth + 'px', minWidth: scoreboardWidth + 'px' }"
        >
          <div v-if="timerSeconds > 0 || timerRunning" class="timer-bar" :class="{ 'timer-warning': timerSeconds <= 10 }">
            {{ formatTime(timerSeconds) }}
          </div>
          <h2 class="scoreboard-title">隊伍比分</h2>
          <div
            v-for="team in rankedTeams"
            :key="team.id"
            class="team-card"
            :style="teamCardStyle(team.color)"
          >
            <span class="team-name">{{ team.name }}</span>
            <span class="team-score">{{ team.score }}</span>
          </div>
        </div>
      </transition>
    </div>

    <!-- 全螢幕按鈕 -->
    <button
      v-if="!isFullscreen"
      class="fullscreen-btn"
      @click="toggleFullscreen"
      title="全螢幕"
    >&#x26F6;</button>

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

const rankedTeams = computed(() =>
  [...teams.value].sort((a, b) => b.score - a.score)
)

const figmaUrl = ref('')
const figmaClientId = ref('')
const figmaIframe = ref(null)
const scoreboardVisible = ref(true)
const isFullscreen = ref(false)
const scoreboardWidth = ref(280)
const layout = ref('left')
const timerSeconds = ref(0)
const timerRunning = ref(false)
const showTimerEnd = ref(false)

// 將使用者貼的 Figma URL 轉成 Embed API 格式
const figmaEmbedUrl = computed(() => {
  if (!figmaUrl.value) return ''
  // 沒有 clientId 就用舊的 embed 方式（不支援換頁控制）
  if (!figmaClientId.value) {
    const encoded = encodeURIComponent(figmaUrl.value)
    return `https://www.figma.com/embed?embed_host=share&url=${encoded}&hide-ui=1`
  }
  // 有 clientId：轉成 embed.figma.com/proto/ 格式
  return buildFigmaEmbedApiUrl(figmaUrl.value, figmaClientId.value)
})

function buildFigmaEmbedApiUrl(url, clientId) {
  try {
    const u = new URL(url)
    // 支援多種 Figma URL 格式: /presenter/, /proto/, /design/, /slides/
    const match = u.pathname.match(/\/(presenter|proto|design|slides)\/([a-zA-Z0-9]+)/)
    if (!match) {
      // fallback: 用舊的 embed 方式
      const encoded = encodeURIComponent(url)
      return `https://www.figma.com/embed?embed_host=share&url=${encoded}&client-id=${clientId}&hide-ui=1`
    }
    const fileKey = match[2]
    // 取得 node-id 等參數
    const nodeId = u.searchParams.get('node-id') || ''
    const params = new URLSearchParams({
      'embed-host': location.hostname,
      'client-id': clientId,
    })
    if (nodeId) params.set('node-id', nodeId)
    return `https://embed.figma.com/proto/${fileKey}/?${params.toString()}`
  } catch {
    return ''
  }
}

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

// 右側進出動畫
function onBeforeEnterRight(el) {
  el.style.marginRight = `-${scoreboardWidth.value}px`
  el.style.opacity = '0'
}

function onEnterRight(el, done) {
  void el.offsetHeight
  el.style.transition = 'margin-right 0.4s ease, opacity 0.4s ease'
  el.style.marginRight = '0'
  el.style.opacity = '1'
  el.addEventListener('transitionend', done, { once: true })
}

function onLeaveRight(el, done) {
  el.style.transition = 'margin-right 0.4s ease, opacity 0.4s ease'
  el.style.marginRight = `-${scoreboardWidth.value}px`
  el.style.opacity = '0'
  el.addEventListener('transitionend', done, { once: true })
}

function formatTime(s) {
  const m = Math.floor(s / 60)
  const sec = s % 60
  return `${String(m).padStart(2, '0')}:${String(sec).padStart(2, '0')}`
}

const FIGMA_ORIGIN = 'https://www.figma.com'
const channel = new BroadcastChannel('cloud100')

function handleMessage(event) {
  const { type, data } = event.data
  if (type === 'update-scores') {
    teams.value = data
  } else if (type === 'update-figma') {
    if (typeof data === 'string') {
      figmaUrl.value = data
    } else {
      figmaUrl.value = data.url
      figmaClientId.value = data.clientId
    }
  } else if (type === 'update-visibility') {
    scoreboardVisible.value = data.visible
    scoreboardWidth.value = data.width
    if (data.layout) layout.value = data.layout
  } else if (type === 'update-timer') {
    timerSeconds.value = data.seconds
    timerRunning.value = data.running
  } else if (type === 'timer-end') {
    showTimerEnd.value = true
    setTimeout(() => { showTimerEnd.value = false }, 5000)
  } else if (type === 'navigate-slide') {
    navigateSlide(data)
  } else if (type === 'restart-slide') {
    restartSlide()
  }
}

function toggleFullscreen() {
  if (!document.fullscreenElement) {
    document.documentElement.requestFullscreen()
  } else {
    document.exitFullscreen()
  }
}

function navigateSlide(direction) {
  const iframe = figmaIframe.value
  if (!iframe) return
  // 使用 Figma 官方 Embed API postMessage 格式
  const msgType = direction === 'next' ? 'NAVIGATE_FORWARD' : 'NAVIGATE_BACKWARD'
  iframe.contentWindow.postMessage({ type: msgType }, FIGMA_ORIGIN)
  console.log(`[Figma Embed API] 已發送 ${msgType}`)
}

function restartSlide() {
  const iframe = figmaIframe.value
  if (!iframe) return
  // 使用 Figma 官方 Embed API postMessage 格式
  iframe.contentWindow.postMessage({ type: 'RESTART' }, FIGMA_ORIGIN)
  console.log(`[Figma Embed API] 已發送 ${msgType}`)
}

// 監聽 Figma iframe 傳回的 message
function onFigmaMessage(event) {
  if (event.origin === FIGMA_ORIGIN) {
    console.log('[Figma event]', event.data)
  }
}

function onFullscreenChange() {
  isFullscreen.value = !!document.fullscreenElement
}

onMounted(() => {
  channel.addEventListener('message', handleMessage)
  window.addEventListener('message', onFigmaMessage)
  document.addEventListener('fullscreenchange', onFullscreenChange)

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
    if (state.figmaClientId) figmaClientId.value = state.figmaClientId
    if (state.scoreboardVisible !== undefined) scoreboardVisible.value = state.scoreboardVisible
    if (state.scoreboardWidth) scoreboardWidth.value = state.scoreboardWidth
    if (state.layout) layout.value = state.layout
  }
})

onUnmounted(() => {
  channel.removeEventListener('message', handleMessage)
  window.removeEventListener('message', onFigmaMessage)
  document.removeEventListener('fullscreenchange', onFullscreenChange)
  channel.close()
})
</script>

<style scoped>
.display-container {
  display: flex;
  flex-direction: column;
  height: 100vh;
  background: #000;
  color: #fff;
  position: relative;
}

.main-row {
  display: flex;
  flex: 1;
  min-height: 0;
}

.fullscreen-btn {
  position: fixed;
  bottom: 16px;
  right: 16px;
  width: 44px;
  height: 44px;
  border: none;
  border-radius: 50%;
  background: rgba(255, 255, 255, 0.15);
  color: #fff;
  font-size: 1.3rem;
  cursor: pointer;
  z-index: 50;
  transition: background 0.2s;
  display: flex;
  align-items: center;
  justify-content: center;
}

.fullscreen-btn:hover {
  background: rgba(255, 255, 255, 0.35);
}

.scoreboard {
  padding: 16px;
  display: flex;
  flex-direction: column;
  gap: 12px;
  background: #000;
}

.scoreboard-side {
  width: 280px;
  min-width: 280px;
  overflow-y: auto;
}

.scoreboard-top {
  width: 100%;
  overflow: hidden;
  padding: 12px 24px;
}

.scoreboard-top .scoreboard-title {
  margin: 0 0 6px;
  font-size: 1.5rem;
}

.teams-horizontal {
  display: flex;
  gap: 10px;
  overflow-x: auto;
}

.teams-horizontal .team-card {
  min-width: 160px;
  flex-shrink: 0;
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
  font-size: 1.5rem;
  margin: 0 0 8px;
  color: #aab;
  letter-spacing: 4px;
}

.team-card {
  display: flex;
  flex-direction: column;
  align-items: center;
  padding: 12px 20px;
  border-radius: 12px;
  font-size: 2rem;
  transition: transform 0.3s;
}

.team-card:hover {
  transform: scale(1.03);
}

.team-name {
  font-weight: 600;
}

.team-score {
  font-size: 3.5rem;
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
