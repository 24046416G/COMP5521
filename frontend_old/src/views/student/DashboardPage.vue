<template>
  <div class="min-h-screen bg-gray-100">
    <nav class="bg-white shadow">
      <div class="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div class="flex justify-between h-16">
          <div class="flex">
            <div class="flex-shrink-0 flex items-center">
              <!-- Logo -->
            </div>
            <div class="hidden sm:ml-6 sm:flex sm:space-x-8">
              <router-link
                v-for="item in navigationItems"
                :key="item.name"
                :to="{ name: item.route }"
                class="inline-flex items-center px-1 pt-1 border-b-2 text-sm font-medium"
                :class="[
                  $route.name === item.route
                    ? 'border-indigo-500 text-gray-900'
                    : 'border-transparent text-gray-500 hover:border-gray-300 hover:text-gray-700'
                ]"
              >
                {{ item.name }}
              </router-link>
            </div>
          </div>
          
          <!-- 新增：学生信息和登出按钮 -->
          <div class="flex items-center space-x-4">
            <span class="text-gray-700">Student ID: {{ studentId }}</span>
            <button
              @click="handleLogout"
              class="inline-flex items-center px-3 py-1.5 border border-transparent 
                     text-sm font-medium rounded-md text-white bg-indigo-600 
                     hover:bg-indigo-700 focus:outline-none focus:ring-2 
                     focus:ring-offset-2 focus:ring-indigo-500
                     transition-colors duration-200"
            >
              Log Out
            </button>
          </div>
        </div>
      </div>
    </nav>

    <!-- 页面内容 -->
    <router-view></router-view>
  </div>
</template>

<script setup>
import { useRoute, useRouter } from 'vue-router'
import { useAuthStore } from '../../stores/auth'

const route = useRoute()
const router = useRouter()
const authStore = useAuthStore()
const studentId = localStorage.getItem('studentId')

const navigationItems = [
  { name: 'Check In', route: 'studentCheckIn' },
  { name: 'Block Mining', route: 'studentBlockMining' },
  { name: 'Account', route: 'studentAccount' }
]

// 新增：处理登出逻辑
const handleLogout = async () => {
  await authStore.logout()
  // 清除本地存储的学生信息
  localStorage.removeItem('studentId')
  localStorage.removeItem('walletId')
  localStorage.removeItem('password')
  // 跳转到登录页
  router.push('/login')
}
</script>

<style scoped>
.min-h-content {
  min-height: calc(100vh - 4rem);
}
</style> 