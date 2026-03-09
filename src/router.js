import { createRouter, createWebHistory } from 'vue-router'
import DisplayView from './views/DisplayView.vue'
import ControllerView from './views/ControllerView.vue'

const routes = [
  { path: '/', component: DisplayView },
  { path: '/controller', component: ControllerView },
]

export default createRouter({
  history: createWebHistory(),
  routes,
})
