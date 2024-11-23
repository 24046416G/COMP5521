<template>
  <div class="relative min-h-screen bg-gray-50">
    <!-- 页面容器 -->
    <div class="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
      <!-- 错误提示 -->
      <div v-if="errorMessage" 
           class="mb-4 p-4 bg-red-50 border-l-4 border-red-500 rounded-md">
        <div class="flex">
          <div class="flex-shrink-0">
            <svg class="h-5 w-5 text-red-400" viewBox="0 0 20 20" fill="currentColor">
              <path fill-rule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zM8.707 7.293a1 1 0 00-1.414 1.414L8.586 10l-1.293 1.293a1 1 0 101.414 1.414L10 11.414l1.293 1.293a1 1 0 001.414-1.414L11.414 10l1.293-1.293a1 1 0 00-1.414-1.414L10 8.586 8.707 7.293z" clip-rule="evenodd"/>
            </svg>
          </div>
          <div class="ml-3">
            <p class="text-sm text-red-700">
              {{ errorMessage }}
            </p>
          </div>
        </div>
      </div>

      <!-- 成功提示 -->
      <div v-if="successMessage" 
           class="mb-4 p-4 bg-green-50 border-l-4 border-green-500 rounded-md">
        <div class="flex">
          <div class="flex-shrink-0">
            <svg class="h-5 w-5 text-green-400" viewBox="0 0 20 20" fill="currentColor">
              <path fill-rule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clip-rule="evenodd"/>
            </svg>
          </div>
          <div class="ml-3">
            <p class="text-sm text-green-700">
              {{ successMessage }}
            </p>
          </div>
        </div>
      </div>

      <div class="space-y-8">
        <!-- Check-in Form Card -->
        <div class="bg-white shadow-lg rounded-2xl overflow-hidden border border-gray-100">
          <div class="px-8 py-6">
            <h3 class="text-2xl font-semibold text-gray-900 mb-6 flex items-center">
              <svg class="w-6 h-6 mr-2 text-indigo-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2"/>
              </svg>
              Course Check-in
            </h3>
            <form @submit.prevent="handleManualCheckIn" class="space-y-5">
              <!-- Student ID Field -->
              <div>
                <label class="block text-sm font-medium text-gray-700 mb-1">
                  Student ID
                </label>
                <input 
                  type="text" 
                  :value="studentId"
                  readonly
                  class="w-full px-4 py-2 bg-gray-50 border border-gray-200 rounded-lg text-gray-600 
                         focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500"
                >
              </div>

              <!-- Class ID Field -->
              <div>
                <label class="block text-sm font-medium text-gray-700 mb-1">
                  Class ID
                </label>
                <input 
                  type="text" 
                  :value="classId"
                  readonly
                  class="w-full px-4 py-2 bg-gray-50 border border-gray-200 rounded-lg text-gray-600 
                         focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500"
                >
              </div>

              <!-- Course ID Field -->
              <div>
                <label class="block text-sm font-medium text-gray-700 mb-1">
                  Course ID
                </label>
                <input 
                  type="text" 
                  v-model.trim="manualCheckIn.courseId"
                  required
                  placeholder="Enter course ID (e.g., CS101, MATH-2023)"
                  pattern="[A-Za-z0-9\-_]+"
                  class="w-full px-4 py-2 border border-gray-300 rounded-lg placeholder-gray-400
                         focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500
                         transition-all duration-200"
                >
                <p class="mt-1 text-sm text-gray-500">
                  You can use letters, numbers, hyphens and underscores
                </p>
              </div>

              <!-- Submit Button -->
              <div>
                <button 
                  type="submit"
                  :disabled="!manualCheckIn.courseId"
                  class="w-full inline-flex justify-center items-center px-6 py-3 border border-transparent rounded-xl
                         text-base font-medium text-white bg-gradient-to-r from-indigo-600 to-purple-600
                         hover:from-indigo-700 hover:to-purple-700 focus:outline-none focus:ring-2 
                         focus:ring-offset-2 focus:ring-indigo-500 disabled:opacity-50 disabled:cursor-not-allowed
                         transition-all duration-200 ease-in-out shadow-md hover:shadow-lg"
                >
                  <svg class="w-5 h-5 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M5 13l4 4L19 7"/>
                  </svg>
                  Check In
                </button>
              </div>
            </form>
          </div>
        </div>

        <!-- Attendance Records Card -->
        <div class="bg-white shadow-lg rounded-2xl overflow-hidden border border-gray-100">
          <div class="px-8 py-6">
            <div class="flex justify-between items-center mb-8">
              <h3 class="text-2xl font-semibold text-gray-900 flex items-center">
                <svg class="w-6 h-6 mr-2 text-indigo-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2"/>
                </svg>
                Attendance Records
              </h3>
              <!-- Search Box with updated styles -->
              <div class="relative w-72">
                <input
                  type="text"
                  v-model="searchQuery"
                  placeholder="Search course ID..."
                  class="w-full px-4 py-2 pl-10 pr-4 border border-gray-300 rounded-xl shadow-sm 
                         focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 transition-all duration-200"
                />
                <svg class="w-5 h-5 text-gray-400 absolute left-3 top-2.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z"/>
                </svg>
              </div>
            </div>

            <!-- Records Grid with updated styles -->
            <div class="grid gap-6 sm:grid-cols-1 lg:grid-cols-2">
              <div v-for="record in groupedRecords" 
                   :key="record.courseId" 
                   class="group bg-white rounded-xl border border-gray-200 hover:border-indigo-300
                          shadow-sm hover:shadow-md transition-all duration-300 transform hover:scale-[1.02]">
                <div class="p-6">
                  <!-- Record Header -->
                  <div class="flex justify-between items-start space-x-4">
                    <div class="space-y-3 flex-1">
                      <div class="flex items-center space-x-3">
                        <span class="text-lg font-semibold text-gray-900">
                          Course ID: {{ record.courseId }}
                        </span>
                        <span :class="[
                          'px-3 py-1 text-xs font-medium rounded-full',
                          record.status === 'complete' 
                            ? 'bg-green-100 text-green-800' 
                            : 'bg-yellow-100 text-yellow-800'
                        ]">
                          {{ record.status }}
                        </span>
                      </div>
                      <div class="text-sm text-gray-600">
                        Latest Check-in: {{ formatDateTime(record.latestTimestamp) }}
                      </div>
                      <div class="text-sm font-medium text-indigo-600">
                        Total Check-ins: {{ record.transactions.length }}
                      </div>
                    </div>
                    <!-- Action Buttons -->
                    <div class="flex items-center space-x-3">
                      <button
                        @click.stop="handleQuickCheckIn(record.courseId)"
                        class="inline-flex items-center px-4 py-2 text-sm font-medium text-white
                               bg-gradient-to-r from-indigo-600 to-purple-600 rounded-lg
                               hover:from-indigo-700 hover:to-purple-700 focus:outline-none 
                               focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500
                               transition-all duration-200 shadow-sm hover:shadow-md"
                        :disabled="loading"
                      >
                        <svg class="w-4 h-4 mr-1" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M5 13l4 4L19 7"/>
                        </svg>
                        Quick Check-in
                      </button>
                      <button 
                        class="p-2 hover:bg-gray-100 rounded-full transition-colors duration-200"
                        @click.stop="toggleDetails(record)"
                      >
                        <svg class="w-5 h-5 text-gray-400 transform transition-transform duration-200"
                             :class="{ 'rotate-180': openStates[record.courseId] }"
                             xmlns="http://www.w3.org/2000/svg" 
                             viewBox="0 0 20 20" 
                             fill="currentColor">
                          <path fill-rule="evenodd" d="M5.293 7.293a1 1 0 011.414 0L10 10.586l3.293-3.293a1 1 0 111.414 1.414l-4 4a1 1 0 01-1.414 0l-4-4a1 1 0 010-1.414z" clip-rule="evenodd" />
                        </svg>
                      </button>
                    </div>
                  </div>

                  <!-- Details Section with updated styles -->
                  <div v-if="openStates[record.courseId]" 
                       class="mt-6 space-y-3 border-t border-gray-100 pt-4">
                    <div class="text-sm font-medium text-gray-500 mb-3">
                      Previous Check-ins:
                    </div>
                    <div class="space-y-2">
                      <div v-for="(tx, index) in record.transactions.slice().reverse()" 
                           :key="tx.id"
                           class="p-4 rounded-lg bg-gray-50 hover:bg-gray-100 
                                  transition-all duration-200 border border-gray-200
                                  hover:border-indigo-200 shadow-sm hover:shadow">
                        <div class="flex items-center justify-between">
                          <span class="text-indigo-600 font-medium flex items-center">
                            <svg class="w-4 h-4 mr-1" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                              <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z"/>
                            </svg>
                            Check-in #{{ index + 1 }}
                          </span>
                          <span class="text-gray-500">{{ formatDateTime(tx.data.outputs[0].metadata.registrationTime) }}</span>
                        </div>
                      </div>
                    </div>
                  </div>
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
import { ref, computed, onMounted, nextTick } from 'vue'
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
const attendanceRecords = ref([])

const formattedDate = computed(() => {
  const date = new Date()
  return date.toISOString().split('T')[0]
})

const formatDateTime = (timestamp) => {
  if (!timestamp) return 'N/A'
  const date = new Date(Number(timestamp))
  return date.toLocaleString('en-GB', {
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
    hour: '2-digit',
    minute: '2-digit',
    hour12: false
  })
}

const showSuccessMessage = (message) => {
  successMessage.value = message
  setTimeout(() => {
    successMessage.value = ''
  }, 3000)
}

const fetchAttendanceRecords = async () => {
  try {
    loading.value = true;
    errorMessage.value = '';
    
    const walletId = localStorage.getItem('walletId');
    if (!walletId) {
      throw new Error('未找到钱包ID');
    }
    
    const response = await studentService.getAttendanceRecords(walletId);
    if (Array.isArray(response)) {  // 添加数据验证
      attendanceRecords.value = response;
    } else {
      throw new Error('获取签到记录失败：数据格式错误');
    }
  } catch (error) {
    console.error('获取签到记录失败:', error);
    errorMessage.value = error.message || '获取签到记录失败';
  } finally {
    loading.value = false;
  }
}

const handleManualCheckIn = async () => {
  try {
    if (!manualCheckIn.value.courseId.trim()) {
      errorMessage.value = '请输入课程ID';
      return;
    }

    loading.value = true;
    errorMessage.value = '';
    
    const walletId = localStorage.getItem('walletId');
    const password = localStorage.getItem('password');
    
    if (!walletId || !password) {
      throw new Error('未找到钱包ID或密码');
    }

    const response = await studentService.checkIn(walletId, {
      password: password,
      courseId: manualCheckIn.value.courseId.trim(),
      studentId: studentId,
      classId: classId
    });
    
    if (response) {
      showSuccessMessage('签到成功！');
      manualCheckIn.value.courseId = '';
      setTimeout(async () => {
        await fetchAttendanceRecords();
      }, 2000);
    }
  } catch (error) {
    console.error('签到错误:', error);
    if (error.response?.data?.includes('Insufficient balance')) {
      errorMessage.value = 'Insufficient balance, 1 token is required to sign in. Please mine to get tokens first.';
    } else {
      errorMessage.value = error.response?.data || error.message || '签到失败';
    }
  } finally {
    loading.value = false;
  }
}

const handleQuickCheckIn = async (courseId) => {
  try {
    if (loading.value) return;
    loading.value = true;
    errorMessage.value = '';
    
    const walletId = localStorage.getItem('walletId');
    const password = localStorage.getItem('password');
    
    if (!walletId || !password) {
      throw new Error('未找到钱包ID或密码');
    }

    const response = await studentService.checkIn(walletId, {
      password: password,
      courseId: courseId,
      studentId: studentId,
      classId: classId
    });
    
    if (response) {
      showSuccessMessage('快速签到成功！');
      setTimeout(async () => {
        await fetchAttendanceRecords();
      }, 2000);
    }
  } catch (error) {
    console.error('快速签到错误:', error);
    if (error.response?.data?.includes('Insufficient balance')) {
      errorMessage.value = '余额不足，签到需要1个代币。请先进行挖矿获取代币。';
    } else {
      errorMessage.value = error.response?.data || error.message || '快速签到失败';
    }
  } finally {
    loading.value = false;
  }
}

const openStates = ref({})

const searchQuery = ref('')

const groupedRecords = computed(() => {
  const groups = attendanceRecords.value.reduce((acc, record) => {
    const courseId = record.data.outputs[0].metadata.classId;
    if (!acc[courseId]) {
      acc[courseId] = {
        courseId,
        status: record.status,
        latestTimestamp: record.data.outputs[0].metadata.registrationTime,
        transactions: [record]
      };
    } else {
      acc[courseId].transactions.push(record);
      if (record.data.outputs[0].metadata.registrationTime > acc[courseId].latestTimestamp) {
        acc[courseId].latestTimestamp = record.data.outputs[0].metadata.registrationTime;
      }
      if (record.status === 'complete') {
        acc[courseId].status = 'complete';
      }
    }
    return acc;
  }, {});

  let records = Object.values(groups).sort((a, b) => b.latestTimestamp - a.latestTimestamp);
  
  if (searchQuery.value) {
    records = records.filter(record => 
      record.courseId.toLowerCase().includes(searchQuery.value.toLowerCase())
    );
  }

  return records;
});

const toggleDetails = (record) => {
  const courseId = record.courseId
  openStates.value[courseId] = !openStates.value[courseId]
}

onMounted(() => {
  fetchAttendanceRecords()
})
</script>

<style scoped>
/* 添加新的样式 */
.bg-gradient-to-r {
  background-size: 200% auto;
  transition: background-position 0.5s ease-in-out;
}

.hover\:bg-gradient-to-r:hover {
  background-position: right center;
}

/* 优化阴影效果 */
.shadow-lg {
  box-shadow: 0 10px 15px -3px rgba(0, 0, 0, 0.1), 
              0 4px 6px -2px rgba(0, 0, 0, 0.05);
}

.hover\:shadow-lg:hover {
  box-shadow: 0 20px 25px -5px rgba(0, 0, 0, 0.1), 
              0 10px 10px -5px rgba(0, 0, 0, 0.04);
}

/* 添加平滑过渡 */
.transition-all {
  transition-property: all;
  transition-timing-function: cubic-bezier(0.4, 0, 0.2, 1);
  transition-duration: 300ms;
}

/* 优化按钮悬停效果 */
button:not(:disabled):hover {
  transform: translateY(-1px);
}

/* 优化输入框焦点效果 */
input:focus {
  box-shadow: 0 0 0 2px rgba(99, 102, 241, 0.2);
}

/* 添加卡片悬停效果 */
.hover\:scale-\[1\.02\]:hover {
  transform: scale(1.02);
}
</style> 