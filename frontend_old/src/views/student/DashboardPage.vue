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
                :to="{ name: 'studentCheckIn' }"
                class="inline-flex items-center px-1 pt-1 border-b-2 text-sm font-medium"
                :class="[
                  $route.name === 'studentCheckIn'
                    ? 'border-indigo-500 text-gray-900'
                    : 'border-transparent text-gray-500 hover:border-gray-300 hover:text-gray-700'
                ]"
              >
                Check In
              </router-link>

              <router-link
                :to="{ name: 'studentBlockMining' }"
                class="inline-flex items-center px-1 pt-1 border-b-2 text-sm font-medium"
                :class="[
                  $route.name === 'studentBlockMining'
                    ? 'border-indigo-500 text-gray-900'
                    : 'border-transparent text-gray-500 hover:border-gray-300 hover:text-gray-700'
                ]"
              >
                Block Mining
              </router-link>

              <router-link
                :to="{ name: 'studentAccount' }"
                class="inline-flex items-center px-1 pt-1 border-b-2 text-sm font-medium"
                :class="[
                  $route.name === 'studentAccount'
                    ? 'border-indigo-500 text-gray-900'
                    : 'border-transparent text-gray-500 hover:border-gray-300 hover:text-gray-700'
                ]"
              >
                Account
              </router-link>
            </div>
          </div>
          <!-- 其他导航内容... -->
        </div>
      </div>
    </nav>

    <!-- 页面内容 -->
    <router-view></router-view>
  </div>
</template>

<script setup>
import { useRoute } from 'vue-router'
import { useAuthStore } from '../../stores/auth'

const route = useRoute()
const authStore = useAuthStore()
const studentId = route.params.studentId

const navigationItems = [
  { name: 'Check In', route: 'studentCheckIn' },
  { name: 'Attendance Records', route: 'studentAttendanceRecords' },
  { name: 'Block Mining', route: 'studentBlockMining' },
  { name: 'Account', route: 'studentAccount' }
]
</script>

<style scoped>
.min-h-content {
  min-height: calc(100vh - 4rem);
}
</style> 