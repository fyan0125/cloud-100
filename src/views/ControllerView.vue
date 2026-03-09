<template>
  <div class="controller">
    <h1>控制面板</h1>

    <!-- Figma 連結設定 -->
    <div class="section">
      <h2>Figma Slides 連結</h2>
      <div class="figma-input">
        <input
          v-model="figmaUrl"
          type="text"
          placeholder="貼上 Figma 連結..."
          @input="sendFigmaUrl"
        />
      </div>
      <div class="slide-nav">
        <button class="nav-btn" @click="navigateSlide('prev')">&#9664; 上一頁</button>
        <button class="nav-btn" @click="navigateSlide('next')">下一頁 &#9654;</button>
      </div>
    </div>

    <!-- 顯示控制 -->
    <div class="section toggle-row">
      <label>
        <input type="checkbox" v-model="scoreboardVisible" @change="sendVisibility" />
        顯示左側計分板
      </label>
      <div v-if="scoreboardVisible" class="width-control">
        <label>寬度：{{ scoreboardWidth }}px</label>
        <input
          type="range"
          v-model.number="scoreboardWidth"
          min="180"
          max="600"
          step="10"
          @input="sendVisibility"
        />
      </div>
    </div>

    <!-- 倒數計時控制 -->
    <div class="section">
      <h2>倒數計時</h2>
      <div class="timer-presets">
        <button v-for="m in [1, 2, 3, 5]" :key="m" @click="setTimer(m * 60)">{{ m }} min</button>
        <div class="custom-timer">
          <input v-model.number="customMinutes" type="number" min="0" placeholder="分" class="timer-num" />
          <span>:</span>
          <input v-model.number="customSeconds" type="number" min="0" max="59" placeholder="秒" class="timer-num" />
          <button @click="setTimer((customMinutes || 0) * 60 + (customSeconds || 0))">設定</button>
        </div>
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

    <!-- 隊伍比分控制 -->
    <div class="section">
      <h2>隊伍比分</h2>
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
      <button class="add-btn" @click="addTeam">+ 新增隊伍</button>
    </div>

    <button class="reset-btn" @click="resetAll">全部歸零</button>
  </div>
</template>

<script setup>
import { ref, onMounted, onUnmounted } from 'vue'

const DEFAULT_COLORS = ['#e74c3c', '#3498db', '#2ecc71', '#f39c12', '#9b59b6', '#1abc9c', '#e67e22', '#2c3e50']
let nextId = 6

const teams = ref([
  { id: 1, name: '第一隊', score: 0, color: '#e74c3c' },
  { id: 2, name: '第二隊', score: 0, color: '#3498db' },
  { id: 3, name: '第三隊', score: 0, color: '#2ecc71' },
  { id: 4, name: '第四隊', score: 0, color: '#f39c12' },
  { id: 5, name: '第五隊', score: 0, color: '#9b59b6' },
])

const figmaUrl = ref('')
const scoreboardVisible = ref(true)
const scoreboardWidth = ref(280)

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
  channel.postMessage({ type: 'update-figma', data: figmaUrl.value })
  saveState()
}

function navigateSlide(direction) {
  channel.postMessage({ type: 'navigate-slide', data: direction })
}

function sendVisibility() {
  channel.postMessage({
    type: 'update-visibility',
    data: { visible: scoreboardVisible.value, width: scoreboardWidth.value },
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
    name: `第${teams.value.length + 1}隊`,
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
      scoreboardVisible: scoreboardVisible.value,
      scoreboardWidth: scoreboardWidth.value,
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
    if (state.scoreboardVisible !== undefined) scoreboardVisible.value = state.scoreboardVisible
    if (state.scoreboardWidth) scoreboardWidth.value = state.scoreboardWidth
    if (state.nextId) nextId = state.nextId
  }
})

onUnmounted(() => {
  clearInterval(timerInterval)
  channel.close()
})
</script>

<style scoped>
.controller {
  max-width: 520px;
  margin: 0 auto;
  padding: 32px 24px;
  font-family: system-ui, sans-serif;
}

h1 {
  text-align: center;
  margin-bottom: 24px;
  color: #333;
}

.section {
  margin-bottom: 28px;
}

.section h2 {
  font-size: 1rem;
  color: #666;
  margin-bottom: 12px;
}

.figma-input input {
  width: 100%;
  padding: 10px 14px;
  border: 2px solid #ddd;
  border-radius: 8px;
  font-size: 0.95rem;
  box-sizing: border-box;
}

.slide-nav {
  display: flex;
  gap: 8px;
  margin-top: 10px;
}

.nav-btn {
  flex: 1;
  padding: 10px;
  border: 2px solid #555;
  border-radius: 8px;
  background: #1a1a2e;
  color: #fff;
  font-size: 0.95rem;
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

/* 顯示/隱藏 */
.toggle-row label {
  display: flex;
  align-items: center;
  gap: 8px;
  font-size: 0.95rem;
  color: #444;
  cursor: pointer;
}

.width-control {
  margin-top: 10px;
  display: flex;
  align-items: center;
  gap: 12px;
}

.width-control label {
  font-size: 0.85rem;
  color: #666;
  min-width: 80px;
}

.width-control input[type="range"] {
  flex: 1;
}

.toggle-row input[type="checkbox"] {
  width: 18px;
  height: 18px;
}

/* 計時器 */
.timer-presets {
  display: flex;
  flex-wrap: wrap;
  gap: 8px;
  margin-bottom: 12px;
}

.timer-presets > button {
  padding: 6px 16px;
  border: 2px solid #3498db;
  border-radius: 8px;
  background: #fff;
  color: #3498db;
  font-size: 0.9rem;
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
  font-size: 1.1rem;
  font-weight: 700;
  color: #333;
}

.timer-num {
  width: 48px;
  padding: 6px 4px;
  border: 2px solid #ddd;
  border-radius: 6px;
  text-align: center;
  font-size: 0.9rem;
}

.timer-num::-webkit-inner-spin-button,
.timer-num::-webkit-outer-spin-button {
  -webkit-appearance: none;
}

.custom-timer button {
  padding: 6px 12px;
  border: 2px solid #3498db;
  border-radius: 8px;
  background: #fff;
  color: #3498db;
  font-size: 0.9rem;
  cursor: pointer;
}

.custom-timer button:hover {
  background: #3498db;
  color: #fff;
}

.timer-display {
  display: flex;
  align-items: center;
  gap: 16px;
  padding: 12px 16px;
  background: #1a1a2e;
  border-radius: 10px;
}

.timer-value {
  font-size: 2rem;
  font-weight: 800;
  color: #fff;
  font-variant-numeric: tabular-nums;
  letter-spacing: 2px;
}

.timer-buttons {
  display: flex;
  gap: 8px;
}

.timer-buttons button {
  padding: 6px 14px;
  border: none;
  border-radius: 6px;
  font-size: 0.85rem;
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
.team-row {
  padding: 12px 16px;
  margin-bottom: 8px;
  border-radius: 10px;
  color: #fff;
}

.team-top {
  display: flex;
  align-items: center;
  gap: 8px;
  margin-bottom: 8px;
}

.team-bottom {
  display: flex;
  align-items: center;
  gap: 12px;
}

.name-input {
  flex: 1;
  background: rgba(255, 255, 255, 0.25);
  border: none;
  border-radius: 6px;
  padding: 6px 10px;
  color: #fff;
  font-size: 0.95rem;
}

.name-input::placeholder {
  color: rgba(255, 255, 255, 0.6);
}

.color-picker {
  width: 32px;
  height: 32px;
  border: 2px solid rgba(255, 255, 255, 0.4);
  border-radius: 6px;
  padding: 0;
  cursor: pointer;
  background: none;
}

.delete-btn {
  width: 28px;
  height: 28px;
  border: none;
  border-radius: 50%;
  background: rgba(0, 0, 0, 0.3);
  color: #fff;
  font-size: 0.8rem;
  cursor: pointer;
  display: flex;
  align-items: center;
  justify-content: center;
  transition: background 0.2s;
}

.delete-btn:hover {
  background: rgba(0, 0, 0, 0.6);
}

.score-controls {
  display: flex;
  align-items: center;
  gap: 8px;
}

.score-controls button {
  width: 36px;
  height: 36px;
  border: none;
  border-radius: 50%;
  background: rgba(255, 255, 255, 0.3);
  color: #fff;
  font-size: 1.3rem;
  cursor: pointer;
  display: flex;
  align-items: center;
  justify-content: center;
  transition: background 0.2s;
}

.score-controls button:hover {
  background: rgba(255, 255, 255, 0.5);
}

.score {
  font-size: 1.4rem;
  font-weight: 700;
  min-width: 36px;
  text-align: center;
  font-variant-numeric: tabular-nums;
}

.score-input {
  width: 60px;
  background: rgba(255, 255, 255, 0.25);
  border: none;
  border-radius: 6px;
  padding: 6px 8px;
  color: #fff;
  font-size: 0.95rem;
  text-align: center;
}

.score-input::-webkit-inner-spin-button,
.score-input::-webkit-outer-spin-button {
  -webkit-appearance: none;
}

.add-btn {
  display: block;
  width: 100%;
  padding: 10px;
  margin-top: 4px;
  background: #fff;
  border: 2px dashed #bbb;
  border-radius: 10px;
  color: #888;
  font-size: 0.95rem;
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
  padding: 12px;
  background: #e74c3c;
  color: #fff;
  border: none;
  border-radius: 10px;
  font-size: 1rem;
  cursor: pointer;
  transition: background 0.2s;
}

.reset-btn:hover {
  background: #c0392b;
}
</style>
