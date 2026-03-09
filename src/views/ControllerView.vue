<template>
  <div class="controller">
    <h1>控制面板</h1>

    <div class="grid">
      <!-- Figma 連結設定 -->
      <div class="card">
        <h2>Figma Embed 設定</h2>
        <div class="card-body">
          <div class="figma-input">
            <input
              v-model="figmaUrl"
              type="text"
              placeholder="貼上 Figma 連結（presenter / proto / design）..."
              @input="sendFigmaUrl"
            />
          </div>
          <div class="figma-input">
            <input
              v-model="figmaClientId"
              type="text"
              placeholder="Figma OAuth Client ID"
              @input="sendFigmaUrl"
            />
            <small class="hint">至 <a href="https://www.figma.com/developers/apps" target="_blank">Figma Developer</a> 建立 App 取得</small>
          </div>
          <div class="slide-nav">
            <button class="nav-btn" @click="navigateSlide('prev')">&#9664; 上一頁</button>
            <button class="nav-btn" @click="navigateSlide('next')">下一頁 &#9654;</button>
            <button class="nav-btn" @click="restartSlide()">重置</button>
          </div>
        </div>
      </div>

      <!-- 顯示控制 -->
      <div class="card">
        <h2>顯示設定</h2>
        <div class="card-body toggle-row">
          <label>
            <input type="checkbox" v-model="scoreboardVisible" @change="sendVisibility" />
            顯示計分板
          </label>
          <div v-if="scoreboardVisible" class="layout-control">
            <label class="layout-label">排版</label>
            <div class="layout-options">
              <button
                v-for="opt in layoutOptions"
                :key="opt.value"
                :class="['layout-btn', { active: layout === opt.value }]"
                @click="layout = opt.value; sendVisibility()"
                :title="opt.label"
              >
                <span class="layout-icon" v-html="opt.icon"></span>
                <span class="layout-text">{{ opt.label }}</span>
              </button>
            </div>
          </div>
          <div v-if="scoreboardVisible" class="width-control">
            <label>{{ layout === 'top' ? '高度' : '寬度' }}：{{ scoreboardWidth }}px</label>
            <input
              type="range"
              v-model.number="scoreboardWidth"
              min="110"
              max="600"
              step="10"
              @input="sendVisibility"
            />
          </div>
        </div>
      </div>

      <!-- 倒數計時控制 -->
      <div class="card">
        <h2>倒數計時</h2>
        <div class="card-body">
          <div class="timer-presets">
            <button v-for="m in [1, 2, 3, 5]" :key="m" @click="setTimer(m * 60)">{{ m }} min</button>
          </div>
          <div class="custom-timer">
            <input v-model.number="customMinutes" type="number" min="0" placeholder="分" class="timer-num" />
            <span>:</span>
            <input v-model.number="customSeconds" type="number" min="0" max="59" placeholder="秒" class="timer-num" />
            <button @click="setTimer((customMinutes || 0) * 60 + (customSeconds || 0))">設定</button>
          </div>
          <div class="timer-display">
            <span class="timer-value">{{ formatTime(timerSeconds) }}</span>
            <div class="timer-buttons">
              <button @click="startTimer" :disabled="timerRunning || timerSeconds <= 0">開始</button>
              <button @click="pauseTimer" :disabled="!timerRunning">暫停</button>
              <button @click="resetTimer">重置</button>
            </div>
          </div>
        </div>
      </div>

      <!-- 隊伍比分控制 -->
      <div class="card card-full">
        <h2>隊伍比分</h2>
        <div class="card-body">
          <div class="teams-grid">
            <div
              v-for="(team, index) in teams"
              :key="team.id"
              class="team-row"
              :style="{ background: team.color }"
            >
              <div class="team-top">
                <input
                  v-model="team.name"
                  class="name-input"
                  @input="sendScores"
                />
                <input
                  v-model="team.color"
                  type="color"
                  class="color-picker"
                  @input="sendScores"
                />
                <button class="delete-btn" @click="removeTeam(index)" title="刪除隊伍">✕</button>
              </div>
              <div class="team-bottom">
                <div class="score-controls">
                  <button @click="changeScore(index, -1)">−</button>
                  <span class="score">{{ team.score }}</span>
                  <button @click="changeScore(index, 1)">+</button>
                </div>
                <input
                  v-model.number="team.score"
                  type="number"
                  class="score-input"
                  @input="sendScores"
                />
              </div>
            </div>
          </div>
          <button class="add-btn" @click="addTeam">+ 新增隊伍</button>
          <button class="reset-btn" @click="resetAll">全部歸零</button>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup>
import { ref, onMounted, onUnmounted } from 'vue'

const DEFAULT_COLORS = ['#e74c3c', '#3498db', '#2ecc71', '#f39c12', '#9b59b6', '#1abc9c', '#e67e22', '#2c3e50']
let nextId = 6

const teams = ref([
  { id: 1, name: '一', score: 0, color: '#e74c3c' },
  { id: 2, name: '二', score: 0, color: '#3498db' },
  { id: 3, name: '三', score: 0, color: '#2ecc71' },
  { id: 4, name: '四', score: 0, color: '#f39c12' },
  { id: 5, name: '五', score: 0, color: '#9b59b6' },
])

const figmaUrl = ref('https://www.figma.com/deck/RAuvyQ0LQNgZsO7nJNd0MC')
const figmaClientId = ref('lMz39R1GmNKC4w9RXdjVHx')
const scoreboardVisible = ref(true)
const scoreboardWidth = ref(280)
const layout = ref('left')

const layoutOptions = [
  { value: 'left', label: '左', icon: '&#9664;&#9724;' },
  { value: 'right', label: '右', icon: '&#9724;&#9654;' },
  { value: 'top', label: '上', icon: '&#9650;<br>&#9724;' },
]

// 計時器
const timerSeconds = ref(0)
const timerRunning = ref(false)
const customMinutes = ref(null)
const customSeconds = ref(null)
let timerInterval = null

const channel = new BroadcastChannel('cloud100')

function sendScores() {
  channel.postMessage({ type: 'update-scores', data: JSON.parse(JSON.stringify(teams.value)) })
  saveState()
}

function sendFigmaUrl() {
  channel.postMessage({
    type: 'update-figma',
    data: { url: figmaUrl.value, clientId: figmaClientId.value },
  })
  saveState()
}

function navigateSlide(direction) {
  channel.postMessage({ type: 'navigate-slide', data: direction })
}

function restartSlide() {
  channel.postMessage({ type: 'restart-slide' })
}

function sendVisibility() {
  channel.postMessage({
    type: 'update-visibility',
    data: { visible: scoreboardVisible.value, width: scoreboardWidth.value, layout: layout.value },
  })
  saveState()
}

function sendTimer() {
  channel.postMessage({
    type: 'update-timer',
    data: { seconds: timerSeconds.value, running: timerRunning.value },
  })
}

function changeScore(index, delta) {
  teams.value[index].score += delta
  sendScores()
}

function addTeam() {
  const colorIndex = teams.value.length % DEFAULT_COLORS.length
  teams.value.push({
    id: nextId++,
    name: `${teams.value.length + 1}`,
    score: 0,
    color: DEFAULT_COLORS[colorIndex],
  })
  sendScores()
}

function removeTeam(index) {
  teams.value.splice(index, 1)
  sendScores()
}

function resetAll() {
  teams.value.forEach(t => (t.score = 0))
  sendScores()
}

function setTimer(secs) {
  pauseTimer()
  timerSeconds.value = Math.max(0, secs)
  sendTimer()
}

function startTimer() {
  if (timerRunning.value || timerSeconds.value <= 0) return
  timerRunning.value = true
  sendTimer()
  timerInterval = setInterval(() => {
    timerSeconds.value--
    sendTimer()
    if (timerSeconds.value <= 0) {
      pauseTimer()
      channel.postMessage({ type: 'timer-end' })
    }
  }, 1000)
}

function pauseTimer() {
  timerRunning.value = false
  clearInterval(timerInterval)
  timerInterval = null
  sendTimer()
}

function resetTimer() {
  pauseTimer()
  timerSeconds.value = 0
  sendTimer()
}

function formatTime(s) {
  const m = Math.floor(s / 60)
  const sec = s % 60
  return `${String(m).padStart(2, '0')}:${String(sec).padStart(2, '0')}`
}

function saveState() {
  localStorage.setItem(
    'cloud100-state',
    JSON.stringify({
      teams: teams.value,
      figmaUrl: figmaUrl.value,
      figmaClientId: figmaClientId.value,
      scoreboardVisible: scoreboardVisible.value,
      scoreboardWidth: scoreboardWidth.value,
      layout: layout.value,
      nextId,
    })
  )
}

onMounted(() => {
  const saved = localStorage.getItem('cloud100-state')
  if (saved) {
    const state = JSON.parse(saved)
    if (state.teams) {
      teams.value = state.teams.map((t, i) => ({
        id: t.id ?? i + 1,
        name: t.name,
        score: t.score,
        color: t.color ?? DEFAULT_COLORS[i % DEFAULT_COLORS.length],
      }))
    }
    if (state.figmaUrl) figmaUrl.value = state.figmaUrl
    if (state.figmaClientId) figmaClientId.value = state.figmaClientId
    if (state.scoreboardVisible !== undefined) scoreboardVisible.value = state.scoreboardVisible
    if (state.scoreboardWidth) scoreboardWidth.value = state.scoreboardWidth
    if (state.layout) layout.value = state.layout
    if (state.nextId) nextId = state.nextId
  }
})

onUnmounted(() => {
  clearInterval(timerInterval)
  sendFigmaUrl() // 讓 DisplayView 知道 Figma 連結被清空了
  channel.close()
})
</script>

<style scoped>
.controller {
  max-width: 960px;
  margin: 0 auto;
  padding: 24px 16px;
  font-family: system-ui, sans-serif;
}

h1 {
  text-align: center;
  margin-bottom: 20px;
  color: #333;
  font-size: 1.5rem;
}

/* Grid 排版 */
.grid {
  display: grid;
  grid-template-columns: 1fr 1fr;
  gap: 16px;
}

.card {
  background: #f8f9fa;
  border: 1px solid #e0e0e0;
  border-radius: 12px;
  overflow: hidden;
}

.card h2 {
  font-size: 0.9rem;
  color: #fff;
  background: #2c3e50;
  margin: 0;
  padding: 10px 16px;
  letter-spacing: 1px;
}

.card-body {
  padding: 14px 16px;
  display: flex;
  flex-direction: column;
  gap: 10px;
}

.card-full {
  grid-column: 1 / -1;
}

/* Figma */
.figma-input input {
  width: 100%;
  padding: 8px 12px;
  border: 2px solid #ddd;
  border-radius: 8px;
  font-size: 0.85rem;
  box-sizing: border-box;
}

.hint {
  display: block;
  margin-top: 2px;
  font-size: 0.75rem;
  color: #999;
}

.hint a {
  color: #3498db;
}

.slide-nav {
  display: flex;
  gap: 6px;
}

.nav-btn {
  flex: 1;
  padding: 8px;
  border: 2px solid #555;
  border-radius: 8px;
  background: #1a1a2e;
  color: #fff;
  font-size: 0.85rem;
  cursor: pointer;
  transition: all 0.2s;
}

.nav-btn:hover {
  background: #2a2a4e;
  border-color: #3498db;
}

.nav-btn:active {
  transform: scale(0.97);
}

/* 顯示設定 */
.toggle-row label {
  display: flex;
  align-items: center;
  gap: 8px;
  font-size: 0.9rem;
  color: #444;
  cursor: pointer;
}

.toggle-row input[type="checkbox"] {
  width: 18px;
  height: 18px;
}

.layout-control {
  display: flex;
  align-items: center;
  gap: 10px;
}

.layout-label {
  font-size: 0.85rem;
  color: #666;
  flex-shrink: 0;
}

.layout-options {
  display: flex;
  gap: 4px;
  flex: 1;
}

.layout-btn {
  flex: 1;
  padding: 6px 4px;
  border: 2px solid #ddd;
  border-radius: 6px;
  background: #fff;
  cursor: pointer;
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 1px;
  transition: all 0.2s;
}

.layout-btn.active {
  border-color: #3498db;
  background: #ebf5fb;
}

.layout-btn:hover {
  border-color: #3498db;
}

.layout-icon {
  font-size: 0.55rem;
  line-height: 1.1;
  color: #666;
}

.layout-btn.active .layout-icon {
  color: #3498db;
}

.layout-text {
  font-size: 0.7rem;
  color: #666;
}

.layout-btn.active .layout-text {
  color: #3498db;
  font-weight: 600;
}

.width-control {
  display: flex;
  align-items: center;
  gap: 10px;
}

.width-control label {
  font-size: 0.8rem;
  color: #666;
  min-width: 80px;
}

.width-control input[type="range"] {
  flex: 1;
}

/* 計時器 */
.timer-presets {
  display: flex;
  gap: 6px;
}

.timer-presets > button {
  flex: 1;
  padding: 6px;
  border: 2px solid #3498db;
  border-radius: 8px;
  background: #fff;
  color: #3498db;
  font-size: 0.85rem;
  cursor: pointer;
  transition: all 0.2s;
}

.timer-presets > button:hover {
  background: #3498db;
  color: #fff;
}

.custom-timer {
  display: flex;
  align-items: center;
  gap: 4px;
}

.custom-timer span {
  font-size: 1rem;
  font-weight: 700;
  color: #333;
}

.timer-num {
  width: 44px;
  padding: 5px 4px;
  border: 2px solid #ddd;
  border-radius: 6px;
  text-align: center;
  font-size: 0.85rem;
}

.timer-num::-webkit-inner-spin-button,
.timer-num::-webkit-outer-spin-button {
  -webkit-appearance: none;
}

.custom-timer button {
  padding: 5px 10px;
  border: 2px solid #3498db;
  border-radius: 8px;
  background: #fff;
  color: #3498db;
  font-size: 0.85rem;
  cursor: pointer;
}

.custom-timer button:hover {
  background: #3498db;
  color: #fff;
}

.timer-display {
  display: flex;
  align-items: center;
  gap: 12px;
  padding: 10px 14px;
  background: #1a1a2e;
  border-radius: 10px;
}

.timer-value {
  font-size: 1.8rem;
  font-weight: 800;
  color: #fff;
  font-variant-numeric: tabular-nums;
  letter-spacing: 2px;
}

.timer-buttons {
  display: flex;
  gap: 6px;
}

.timer-buttons button {
  padding: 5px 12px;
  border: none;
  border-radius: 6px;
  font-size: 0.8rem;
  cursor: pointer;
  color: #fff;
  background: #555;
  transition: background 0.2s;
}

.timer-buttons button:first-child { background: #2ecc71; }
.timer-buttons button:first-child:hover { background: #27ae60; }
.timer-buttons button:nth-child(2) { background: #f39c12; }
.timer-buttons button:nth-child(2):hover { background: #e67e22; }
.timer-buttons button:last-child { background: #e74c3c; }
.timer-buttons button:last-child:hover { background: #c0392b; }
.timer-buttons button:disabled { opacity: 0.4; cursor: not-allowed; }

/* 隊伍 */
.teams-grid {
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(220px, 1fr));
  gap: 8px;
}

.team-row {
  padding: 10px 14px;
  border-radius: 10px;
  color: #fff;
}

.team-top {
  display: flex;
  align-items: center;
  gap: 6px;
  margin-bottom: 6px;
}

.team-bottom {
  display: flex;
  align-items: center;
  gap: 10px;
}

.name-input {
  flex: 1;
  min-width: 0;
  background: rgba(255, 255, 255, 0.25);
  border: none;
  border-radius: 6px;
  padding: 5px 8px;
  color: #fff;
  font-size: 0.9rem;
}

.name-input::placeholder {
  color: rgba(255, 255, 255, 0.6);
}

.color-picker {
  width: 28px;
  height: 28px;
  border: 2px solid rgba(255, 255, 255, 0.4);
  border-radius: 6px;
  padding: 0;
  cursor: pointer;
  background: none;
  flex-shrink: 0;
}

.delete-btn {
  width: 24px;
  height: 24px;
  border: none;
  border-radius: 50%;
  background: rgba(0, 0, 0, 0.3);
  color: #fff;
  font-size: 0.75rem;
  cursor: pointer;
  display: flex;
  align-items: center;
  justify-content: center;
  transition: background 0.2s;
  flex-shrink: 0;
}

.delete-btn:hover {
  background: rgba(0, 0, 0, 0.6);
}

.score-controls {
  display: flex;
  align-items: center;
  gap: 6px;
}

.score-controls button {
  width: 32px;
  height: 32px;
  border: none;
  border-radius: 50%;
  background: rgba(255, 255, 255, 0.3);
  color: #fff;
  font-size: 1.2rem;
  cursor: pointer;
  display: flex;
  align-items: center;
  justify-content: center;
  transition: background 0.2s;
  flex-shrink: 0;
}

.score-controls button:hover {
  background: rgba(255, 255, 255, 0.5);
}

.score {
  font-size: 1.3rem;
  font-weight: 700;
  min-width: 32px;
  text-align: center;
  font-variant-numeric: tabular-nums;
}

.score-input {
  width: 50px;
  background: rgba(255, 255, 255, 0.25);
  border: none;
  border-radius: 6px;
  padding: 5px 6px;
  color: #fff;
  font-size: 0.9rem;
  text-align: center;
}

.score-input::-webkit-inner-spin-button,
.score-input::-webkit-outer-spin-button {
  -webkit-appearance: none;
}

.add-btn {
  display: block;
  width: 100%;
  padding: 8px;
  background: #fff;
  border: 2px dashed #bbb;
  border-radius: 10px;
  color: #888;
  font-size: 0.9rem;
  cursor: pointer;
  transition: all 0.2s;
}

.add-btn:hover {
  border-color: #3498db;
  color: #3498db;
}

.reset-btn {
  display: block;
  width: 100%;
  padding: 10px;
  margin-top: 4px;
  background: #e74c3c;
  color: #fff;
  border: none;
  border-radius: 10px;
  font-size: 0.9rem;
  cursor: pointer;
  transition: background 0.2s;
}

.reset-btn:hover {
  background: #c0392b;
}

/* RWD */
@media (max-width: 768px) {
  .grid {
    grid-template-columns: 1fr;
  }

  .card-full {
    grid-column: 1;
  }

  .teams-grid {
    grid-template-columns: 1fr;
  }
}

@media (max-width: 480px) {
  .controller {
    padding: 16px 10px;
  }

  h1 {
    font-size: 1.2rem;
  }

  .timer-display {
    flex-direction: column;
    align-items: flex-start;
    gap: 8px;
  }

  .slide-nav {
    flex-direction: column;
  }
}
</style>
