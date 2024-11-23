<template>
  <div class="relative">
    <div class="fixed top-0 left-0 right-0 flex justify-center" style="z-index: 9999;">
      <Transition
        enter-active-class="transform transition ease-out duration-300"
        enter-from-class="translate-y-[-100%] opacity-0"
        enter-to-class="translate-y-0 opacity-100"
        leave-active-class="transform transition ease-in duration-200"
        leave-from-class="translate-y-0 opacity-100"
        leave-to-class="translate-y-[-100%] opacity-0"
      >
        <div 
          v-if="successMessage" 
          class="mt-4 bg-green-100 border border-green-400 text-green-700 px-4 py-3 rounded shadow-lg"
          style="pointer-events: none;"
        >
          <span class="block sm:inline">{{ successMessage }}</span>
        </div>
      </Transition>
    </div>

    <div class="space-y-6">
      <div class="bg-white shadow sm:rounded-lg">
        <div class="px-4 py-5 sm:p-6">
          <h3 class="text-lg leading-6 font-medium text-gray-900 mb-4">
            Course Check-in
          </h3>
          <form @submit.prevent="handleManualCheckIn" class="space-y-4">
            <div>
              <label class="block text-sm font-medium text-gray-700">
                Student ID
              </label>
              <input 
                type="text" 
                :value="studentId"
                readonly
                class="mt-1 block w-full px-3 py-2 bg-gray-100 border border-gray-300 rounded-md shadow-sm text-gray-600 sm:text-sm"
              >
            </div>

            <div>
              <label class="block text-sm font-medium text-gray-700">
                Class ID
              </label>
              <input 
                type="text" 
                :value="classId"
                readonly
                class="mt-1 block w-full px-3 py-2 bg-gray-100 border border-gray-300 rounded-md shadow-sm text-gray-600 sm:text-sm"
              >
            </div>

            <div>
              <label class="block text-sm font-medium text-gray-700">
                Course ID
              </label>
              <input 
                type="text" 
                v-model="manualCheckIn.courseId"
                required
                class="mt-1 block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm placeholder-gray-400 focus:outline-none focus:ring-indigo-500 focus:border-indigo-500 sm:text-sm"
                placeholder="Enter course ID"
              >
            </div>

            <div>
              <button 
                type="submit"
                :disabled="!manualCheckIn.courseId"
                class="w-full inline-flex justify-center py-2 px-4 border border-transparent rounded-md shadow-sm text-sm font-medium text-white bg-indigo-600 hover:bg-indigo-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500 disabled:opacity-50 disabled:cursor-not-allowed"
              >
                Check In
              </button>
            </div>
          </form>
        </div>
      </div>

      <div class="bg-white shadow sm:rounded-lg">
        <div class="px-4 py-5 sm:p-6">
          <h3 class="text-lg leading-6 font-medium text-gray-900 mb-4">
            Recent Check-ins
          </h3>
          <div class="space-y-4">
            <div v-if="loading" class="text-center py-4">
              Loading...
            </div>
            <div v-else-if="previousCourses.length === 0" class="text-center py-4 text-gray-500">
              No check-in records found
            </div>
            <div v-else class="space-y-2">
              <div 
                v-for="record in previousCourses" 
                :key="record.id"
                class="p-4 bg-gray-50 rounded-md"
              >
                <div class="flex items-center justify-between">
                  <div class="space-y-2">
                    <div class="flex items-center space-x-4">
                      <span class="text-sm font-medium text-gray-900">Student ID: {{ record.studentId }}</span>
                      <span class="text-sm font-medium text-gray-900">Class ID: {{ record.classId }}</span>
                    </div>
                    <div class="flex items-center space-x-4">
                      <span class="text-sm font-medium text-gray-900">Transaction ID: {{ record.id.substring(0, 8) }}...</span>
                      <span 
                        :class="[
                          'px-2 py-1 text-xs font-medium rounded-full',
                          record.status === 'complete' 
                            ? 'bg-green-100 text-green-800' 
                            : 'bg-yellow-100 text-yellow-800'
                        ]"
                      >
                        {{ record.status }}
                      </span>
                    </div>
                    <div class="text-xs text-gray-500">
                      Check-in Time: {{ formatDateTime(record.timestamp) }}
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>

      <div v-if="errorMessage" class="rounded-md bg-red-50 p-4">
        <div class="text-sm text-red-700">
          {{ errorMessage }}
        </div>
      </div>
    </div>
  </div>
</template>

<script setup>
import { ref, computed, onMounted } from 'vue'
import { useRoute } from 'vue-router'
import { studentService } from '../../../services/api'

const route = useRoute()
const studentId = route.params.studentId
const classId = localStorage.getItem('classId')

const manualCheckIn = ref({
  courseId: ''
})

const loading = ref(false)
const errorMessage = ref('')
const successMessage = ref('')
const previousCourses = ref([])

const formattedDate = computed(() => {
  const date = new Date()
  return date.toISOString().split('T')[0]
})

const formatDateTime = (timestamp) => {
  if (!timestamp) return 'N/A'
  const date = new Date(Number(timestamp))
  return date.toLocaleString('zh-CN', {
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
    hour: '2-digit',
    minute: '2-digit'
  })
}

const uniqueCoursesWithDates = computed(() => {
  const courseMap = new Map()
  
  previousCourses.value.forEach(record => {
    if (!courseMap.has(record.eventId) || 
        courseMap.get(record.eventId).latestDate < record.timestamp) {
      courseMap.set(record.eventId, {
        eventId: record.eventId,
        latestDate: record.timestamp,
        confirmed: record.confirmed
      })
    }
  })
  
  return Array.from(courseMap.values())
})

const showSuccessMessage = (message) => {
  successMessage.value = message
  setTimeout(() => {
    successMessage.value = ''
  }, 3000)
}

const fetchAttendanceRecords = async () => {
  try {
    loading.value = true
    errorMessage.value = ''
    const records = []

    // 获取已确认的交易
    const confirmedResponse = await studentService.getPendingTransactions()
    const confirmedTransactions = confirmedResponse.data

    // 处理已确认的交易
    confirmedTransactions.forEach(tx => {
      if (tx.type === 'studentRegistration' && 
          tx.data?.outputs?.[0]?.metadata?.studentId === studentId) {
        records.push({
          id: tx.id,
          studentId: tx.data.outputs[0].metadata.studentId,
          classId: tx.data.outputs[0].metadata.classId,
          timestamp: tx.data.outputs[0].metadata.registrationTime,
          status: 'complete',
          hash: tx.hash
        })
      }
    })

    // 获取待处理的交易（这里需要实现获取待处理交易的逻辑）
    try {
      const pendingResponse = await studentService.getPendingTransactions()
      const pendingTransactions = pendingResponse.data

      pendingTransactions.forEach(tx => {
        if (tx.type === 'studentRegistration' && 
            tx.data?.outputs?.[0]?.metadata?.studentId === studentId &&
            !records.some(r => r.id === tx.id)) { // 避免重复
          records.push({
            id: tx.id,
            studentId: tx.data.outputs[0].metadata.studentId,
            classId: tx.data.outputs[0].metadata.classId,
            timestamp: Date.now(),
            status: 'pending',
            hash: tx.hash
          })
        }
      })
    } catch (pendingError) {
      console.warn('Failed to fetch pending transactions:', pendingError)
    }

    // 按时间戳排序，最新的在前
    records.sort((a, b) => b.timestamp - a.timestamp)
    previousCourses.value = records
    console.log('Attendance records:', records)
  } catch (error) {
    console.error('Failed to fetch attendance records:', error)
    errorMessage.value = error.response?.data?.message || 'Failed to fetch attendance records'
  } finally {
    loading.value = false
  }
}

const handleManualCheckIn = async () => {
  try {
    loading.value = true
    errorMessage.value = ''
    
    const walletId = localStorage.getItem('walletId')
    const password = localStorage.getItem('password')
    
    if (!walletId || !password) {
      throw new Error('Wallet ID or password not found')
    }

    const response = await studentService.checkIn(walletId, {
      password: password,
      classId: manualCheckIn.value.courseId,
      studentId: studentId
    })
    
    if (response.status === 201) {
      showSuccessMessage('Check-in successful!')
      manualCheckIn.value.courseId = ''
      await fetchAttendanceRecords()
    }
  } catch (error) {
    console.error('Check-in error:', error)
    errorMessage.value = error.response?.data || 'Check-in failed'
  } finally {
    loading.value = false
  }
}

const handleQuickCheckIn = async (courseId) => {
  try {
    loading.value = true
    errorMessage.value = ''
    
    const walletId = localStorage.getItem('walletId')
    const password = localStorage.getItem('password')
    
    if (!walletId || !password) {
      throw new Error('Wallet ID or password not found')
    }

    const response = await studentService.checkIn(walletId, {
      password: password,
      classId: courseId,
      studentId: studentId
    })
    
    if (response.status === 201) {
      showSuccessMessage('Check-in successful!')
      await fetchAttendanceRecords()
    }
  } catch (error) {
    console.error('Quick check-in error:', error)
    errorMessage.value = error.response?.data || 'Check-in failed'
  } finally {
    loading.value = false
  }
}

onMounted(() => {
  fetchAttendanceRecords()
})
</script>

<style scoped>
.fixed {
  position: fixed;
  pointer-events: none;
}

.shadow-lg {
  box-shadow: 0 10px 15px -3px rgba(0, 0, 0, 0.1), 0 4px 6px -2px rgba(0, 0, 0, 0.05);
}

.transform {
  will-change: transform, opacity;
}
</style> 