<template>
  <div class="bg-white shadow sm:rounded-lg">
    <div class="px-4 py-5 sm:p-6">
      <h3 class="text-lg leading-6 font-medium text-gray-900 mb-4">
        Attendance Records
      </h3>
      <div class="space-y-4">
        <div v-if="loading" class="text-center py-4">
          Loading...
        </div>
        <div v-else-if="records.length === 0" class="text-center py-4 text-gray-500">
          No attendance records found
        </div>
        <div v-else class="space-y-2">
          <div 
            v-for="record in records" 
            :key="record.hash"
            class="p-4 bg-gray-50 rounded-md"
          >
            <div class="flex items-center justify-between">
              <div class="space-y-1">
                <div class="flex items-center space-x-2">
                  <span class="text-sm font-medium text-gray-900">Course: {{ record.eventId }}</span>
                  <span class="bg-green-100 text-green-800 px-2 py-1 text-xs font-medium rounded-full">
                    Confirmed
                  </span>
                </div>
                <div class="text-xs text-gray-500">
                  Check-in Time: {{ formatDate(record.timestamp) }}
                </div>
                <div class="text-xs text-gray-500">
                  Block Hash: {{ record.hash }}
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup>
import { ref, onMounted } from 'vue'
import { useRoute } from 'vue-router'
import { studentService } from '../../../services/api'

const route = useRoute()
const studentId = route.params.studentId
const loading = ref(false)
const records = ref([])

const formatDate = (timestamp) => {
  if (!timestamp) return 'N/A'
  return new Date(timestamp).toLocaleString()
}

const fetchRecords = async () => {
  try {
    loading.value = true
    const response = await studentService.getAttendanceRecords(studentId)
    records.value = response.data.records
    console.log('Attendance records:', records.value)  // 添加日志
  } catch (error) {
    console.error('Failed to fetch records:', error)
  } finally {
    loading.value = false
  }
}

onMounted(() => {
  fetchRecords()
})
</script> 