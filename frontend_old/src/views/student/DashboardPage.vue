<template>
  <div class="min-h-screen bg-gray-100 flex flex-col">
    <!-- Navigation Header -->
    <nav class="bg-white shadow">
      <div class="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div class="flex justify-between h-16">
          <div class="flex">
            <!-- Navigation Links -->
            <div class="flex space-x-8">
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
          
          <!-- Student Info -->
          <div class="flex items-center">
            <span class="text-gray-700">Student ID: {{ studentId }}</span>
          </div>
        </div>
      </div>
    </nav>

    <!-- Main Content -->
    <main class="flex-1 relative">
      <!-- Fixed position container for notifications -->
      <div class="fixed top-0 left-0 right-0 z-50 pointer-events-none">
        <div class="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <!-- Notifications will be rendered here by child components -->
        </div>
      </div>

      <!-- Actual content -->
      <div class="max-w-7xl mx-auto py-6 sm:px-6 lg:px-8">
        <div class="px-4 py-4 sm:px-0 min-h-content">
          <router-view></router-view>
        </div>
      </div>
    </main>
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