<template>
  <div class="space-y-6">
    <!-- Search Filters -->
    <div class="bg-white shadow-lg rounded-2xl overflow-hidden border border-gray-100">
      <div class="px-8 py-6">
        <h3 class="text-2xl font-semibold text-gray-900 flex items-center mb-6">
          <svg class="w-6 h-6 mr-2 text-indigo-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z"/>
          </svg>
          Attendance Search
        </h3>

        <!-- Search Type Selector -->
        <div class="mb-6">
          <label class="block text-sm font-medium text-gray-700 mb-2">Search By</label>
          <div class="grid grid-cols-3 gap-4">
            <button
              v-for="type in searchTypes"
              :key="type.value"
              @click="selectSearchType(type.value)"
              :class="[
                'px-4 py-2 rounded-lg text-sm font-medium transition-all duration-200',
                selectedSearchType === type.value
                  ? 'bg-indigo-600 text-white shadow-md'
                  : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
              ]"
            >
              {{ type.label }}
            </button>
          </div>
        </div>

        <!-- Search Input and Date Range -->
        <div class="grid grid-cols-2 gap-6 mb-6">
          <!-- Search Input -->
          <div>
            <label class="block text-sm font-medium text-gray-700 mb-2">
              {{ getSearchLabel() }}
            </label>
            <input
              type="text"
              v-model="searchValue"
              :placeholder="`Enter ${getSearchLabel()}`"
              class="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-indigo-500 focus:border-indigo-500"
            />
          </div>

          <!-- Date Range -->
          <div>
            <label class="block text-sm font-medium text-gray-700 mb-2">Date Range</label>
            <div class="flex space-x-2">
              <input
                type="date"
                v-model="dateRange.startDate"
                class="flex-1 px-3 py-2 border border-gray-300 rounded-lg focus:ring-indigo-500 focus:border-indigo-500"
              />
              <input
                type="date"
                v-model="dateRange.endDate"
                class="flex-1 px-3 py-2 border border-gray-300 rounded-lg focus:ring-indigo-500 focus:border-indigo-500"
              />
            </div>
          </div>
        </div>

        <!-- Search Button -->
        <button
          @click="searchAttendance"
          :disabled="loading || !searchValue"
          class="w-full px-4 py-3 text-sm font-medium text-white bg-gradient-to-r from-indigo-600 to-purple-600 rounded-lg hover:from-indigo-700 hover:to-purple-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500 disabled:opacity-50 transition-all duration-300"
        >
          <span class="flex items-center justify-center">
            <svg v-if="loading" class="animate-spin -ml-1 mr-3 h-5 w-5 text-white" fill="none" viewBox="0 0 24 24">
              <circle class="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" stroke-width="4"></circle>
              <path class="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
            </svg>
            {{ loading ? 'Searching...' : 'Search Records' }}
          </span>
        </button>
      </div>
    </div>

    <!-- Error Message -->
    <div v-if="error" class="mb-4 p-4 bg-red-50 border-l-4 border-red-500 rounded-md">
      <div class="flex">
        <div class="flex-shrink-0">
          <svg class="h-5 w-5 text-red-400" viewBox="0 0 20 20" fill="currentColor">
            <path fill-rule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zM8.707 7.293a1 1 0 00-1.414 1.414L8.586 10l-1.293 1.293a1 1 0 101.414 1.414L10 11.414l1.293 1.293a1 1 0 001.414-1.414L11.414 10l1.293-1.293a1 1 0 00-1.414-1.414L10 8.586 8.707 7.293z" clip-rule="evenodd"/>
          </svg>
        </div>
        <div class="ml-3">
          <p class="text-sm text-red-700">{{ error }}</p>
        </div>
      </div>
    </div>

    <!-- Results Display -->
    <div v-if="records.length > 0" class="bg-white shadow-lg rounded-2xl overflow-hidden border border-gray-100">
      <div class="px-8 py-6">
        <h3 class="text-2xl font-semibold text-gray-900 flex items-center mb-8">
          <svg class="w-6 h-6 mr-2 text-indigo-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2"/>
          </svg>
          Attendance Records
        </h3>

        <!-- Records Grid -->
        <div class="grid gap-6 sm:grid-cols-1 lg:grid-cols-2">
          <div 
            v-for="record in records" 
            :key="record.key"
            class="group bg-white rounded-xl border border-gray-200 hover:border-indigo-300
                   shadow-sm hover:shadow-md transition-all duration-300 transform 
                   hover:scale-[1.02]"
          >
            <div class="p-6">
              <!-- Record Header -->
              <div class="flex justify-between items-start space-x-4">
                <div class="space-y-3 flex-1">
                  <div class="flex items-center space-x-3">
                    <span class="text-lg font-semibold bg-gradient-to-r from-indigo-600 to-purple-600 bg-clip-text text-transparent">
                      {{ record.title }}
                    </span>
                    <span class="px-3 py-1 text-xs font-medium rounded-full bg-indigo-100 text-indigo-800">
                      {{ record.attendances.length }} records
                    </span>
                  </div>

                  <!-- Record Summary -->
                  <div class="text-sm text-gray-600">
                    <p>Latest: {{ formatDateTime(record.latestTimestamp) }}</p>
                    <p>{{ record.subtitle }}</p>
                  </div>
                </div>

                <!-- Expand Button -->
                <button 
                  @click="toggleDetails(record)"
                  class="p-2 hover:bg-gray-100 rounded-full transition-colors duration-200"
                >
                  <svg 
                    class="w-5 h-5 text-gray-400 transform transition-transform duration-200"
                    :class="{ 'rotate-180': openStates[record.key] }"
                    xmlns="http://www.w3.org/2000/svg" 
                    viewBox="0 0 20 20" 
                    fill="currentColor"
                  >
                    <path fill-rule="evenodd" d="M5.293 7.293a1 1 0 011.414 0L10 10.586l3.293-3.293a1 1 0 111.414 1.414l-4 4a1 1 0 01-1.414 0l-4-4a1 1 0 010-1.414z" clip-rule="evenodd" />
                  </svg>
                </button>
              </div>

              <!-- Expanded Details -->
              <div 
                v-if="openStates[record.key]"
                class="mt-4 space-y-3 border-t border-gray-100 pt-4"
              >
                <div 
                  v-for="attendance in record.attendances" 
                  :key="attendance.timestamp"
                  class="p-3 rounded-lg bg-gray-50 hover:bg-gray-100 
                         transition-all duration-200 border border-gray-200"
                >
                  <div class="flex justify-between items-center">
                    <span class="text-sm font-medium text-gray-900">
                      {{ formatDateTime(attendance.timestamp) }}
                    </span>
                    <span class="text-sm text-gray-500">
                      {{ attendance.info }}
                    </span>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>

    <!-- No Results Message -->
    <div v-else-if="!loading && hasSearched" class="bg-white shadow-lg rounded-2xl p-6 text-center">
      <p class="text-gray-500">No attendance records found for the selected criteria.</p>
    </div>
  </div>
</template>

<script>
import { ref, reactive } from 'vue'
import { blockchainService, attendanceService } from '@/services/api'

export default {
  name: 'Dashboard',
  
  setup() {
    const searchTypes = [
      { label: 'Student ID', value: 'student' },
      { label: 'Course ID', value: 'course' },
      { label: 'Class ID', value: 'class' }
    ]

    const selectedSearchType = ref('student')
    const searchValue = ref('')
    const dateRange = reactive({
      startDate: '',
      endDate: ''
    })

    const records = ref([])
    const openStates = ref({})
    const loading = ref(false)
    const hasSearched = ref(false)
    const error = ref('')

    const getSearchLabel = () => {
      switch (selectedSearchType.value) {
        case 'student': return 'Student ID'
        case 'course': return 'Course ID'
        case 'class': return 'Class ID'
        default: return 'Search Value'
      }
    }

    const selectSearchType = (type) => {
      selectedSearchType.value = type
      searchValue.value = ''
    }

    const searchAttendance = async () => {
      try {
        loading.value = true
        hasSearched.value = true
        error.value = ''

        // 获取所有区块和待处理交易
        const [blocksResponse, pendingResponse] = await Promise.all([
          blockchainService.getBlocks(),
          blockchainService.getPendingTransactions()
        ])

        // 从区块中获取已确认的考勤记录
        const confirmedRecords = blocksResponse.data.flatMap(block => 
          block.transactions
            .filter(tx => tx.type === 'attendance')
            .filter(tx => {
              const metadata = tx.data.outputs[0].metadata
              const matchesSearch = selectedSearchType.value === 'student' ? 
                metadata.studentId === searchValue.value :
                selectedSearchType.value === 'course' ?
                metadata.courseId === searchValue.value :
                metadata.classId === searchValue.value

              // 日期过滤
              const recordDate = new Date(metadata.timestamp)
              const inDateRange = (!dateRange.startDate || recordDate >= new Date(dateRange.startDate)) &&
                                (!dateRange.endDate || recordDate <= new Date(dateRange.endDate))

              return matchesSearch && inDateRange
            })
            .map(tx => ({
              blockIndex: block.index,
              timestamp: tx.data.outputs[0].metadata.timestamp,
              studentId: tx.data.outputs[0].metadata.studentId,
              courseId: tx.data.outputs[0].metadata.courseId,
              classId: tx.data.outputs[0].metadata.classId,
              status: 'confirmed',
              hash: tx.id
            }))
        )

        // 从待处理交易中获取未确认的考勤记录
        const pendingRecords = pendingResponse.data
          .filter(tx => tx.type === 'attendance')
          .filter(tx => {
            const metadata = tx.data.outputs[0].metadata
            const matchesSearch = selectedSearchType.value === 'student' ? 
              metadata.studentId === searchValue.value :
              selectedSearchType.value === 'course' ?
              metadata.courseId === searchValue.value :
              metadata.classId === searchValue.value

            // 日期过滤
            const recordDate = new Date(metadata.timestamp)
            const inDateRange = (!dateRange.startDate || recordDate >= new Date(dateRange.startDate)) &&
                              (!dateRange.endDate || recordDate <= new Date(dateRange.endDate))

            return matchesSearch && inDateRange
          })
          .map(tx => ({
            timestamp: tx.data.outputs[0].metadata.timestamp,
            studentId: tx.data.outputs[0].metadata.studentId,
            courseId: tx.data.outputs[0].metadata.courseId,
            classId: tx.data.outputs[0].metadata.classId,
            status: 'pending',
            hash: tx.id
          }))

        // 合并记录并处理
        const allRecords = [...confirmedRecords, ...pendingRecords]
        if (allRecords.length === 0) {
          records.value = []
          return
        }

        records.value = processRecords(allRecords)
      } catch (err) {
        console.error('Failed to fetch attendance records:', err)
        error.value = err.message || 'Failed to fetch attendance records'
        records.value = []
      } finally {
        loading.value = false
      }
    }

    const toggleDetails = (record) => {
      openStates.value[record.key] = !openStates.value[record.key]
    }

    const processRecords = (attendanceRecords) => {
      if (!attendanceRecords || attendanceRecords.length === 0) return []

      // 根据搜索类型进行分组
      const groupedData = attendanceRecords.reduce((acc, record) => {
        let key, title, subtitle

        switch (selectedSearchType.value) {
          case 'student':
            // 按课程分组 - 当搜索学生时，显示该学生参加的所有课程
            key = record.courseId
            title = `Course: ${record.courseId}`
            subtitle = `Student: ${record.studentId}`
            break
            
          case 'course':
            // 按学生分组 - 当搜索课程时，显示参加该课程的所有学生
            key = record.studentId
            title = `Student: ${record.studentId}`
            subtitle = `Course: ${record.courseId}`
            break
            
          case 'class':
            // 按学生分组 - 当搜索班级时，显示该班级的所有学生
            key = record.studentId
            title = `Student: ${record.studentId}`
            subtitle = `Class: ${record.classId}`
            break
        }

        // 如果是新的分组，初始化
        if (!acc[key]) {
          acc[key] = {
            key,
            title,
            subtitle,
            attendances: [],
            latestTimestamp: record.timestamp,
            totalCount: 0,
            // 添加额外的统计信息
            uniqueCourses: new Set(),
            uniqueStudents: new Set()
          }
        }

        // 添加考勤记录
        acc[key].attendances.push({
          timestamp: record.timestamp,
          info: record.status === 'confirmed' ? 
            `Block #${record.blockIndex} (Confirmed)` : 
            'Pending confirmation',
          studentId: record.studentId,
          courseId: record.courseId,
          classId: record.classId,
          status: record.status,
          hash: record.hash
        })

        // 更新统计信息
        acc[key].uniqueCourses.add(record.courseId)
        acc[key].uniqueStudents.add(record.studentId)
        acc[key].totalCount++

        // 更新最新时间戳
        if (new Date(record.timestamp) > new Date(acc[key].latestTimestamp)) {
          acc[key].latestTimestamp = record.timestamp
        }

        return acc
      }, {})

      // 转换为数组并添加统计信息
      return Object.values(groupedData)
        .map(group => {
          let subtitle = ''
          switch (selectedSearchType.value) {
            case 'student':
              subtitle = `Total Courses: ${group.uniqueCourses.size}, Check-ins: ${group.totalCount}`
              break
            case 'course':
            case 'class':
              subtitle = `Total Students: ${group.uniqueStudents.size}, Check-ins: ${group.totalCount}`
              break
          }

          return {
            ...group,
            subtitle,
            // 转换 Set 为数组并删除
            attendances: group.attendances
              .sort((a, b) => new Date(b.timestamp) - new Date(a.timestamp))
          }
        })
        .sort((a, b) => new Date(b.latestTimestamp) - new Date(a.latestTimestamp))
    }

    const formatDateTime = (timestamp) => {
      if (!timestamp) return 'N/A'
      return new Date(timestamp).toLocaleString('en-US', {
        year: 'numeric',
        month: 'short',
        day: '2-digit',
        hour: '2-digit',
        minute: '2-digit',
        second: '2-digit'
      })
    }

    return {
      searchTypes,
      selectedSearchType,
      searchValue,
      dateRange,
      records,
      openStates,
      loading,
      hasSearched,
      error,
      getSearchLabel,
      selectSearchType,
      searchAttendance,
      toggleDetails,
      formatDateTime
    }
  }
}
</script>

<style scoped>
.transition-all {
  transition-property: all;
  transition-timing-function: cubic-bezier(0.4, 0, 0.2, 1);
  transition-duration: 300ms;
}

.hover\:scale-\[1\.02\]:hover {
  transform: scale(1.02);
}

/* 添加渐变文字动画 */
@keyframes gradient-shift {
  0% { background-position: 0% 50%; }
  50% { background-position: 100% 50%; }
  100% { background-position: 0% 50%; }
}

.bg-gradient-to-r {
  background-size: 200% auto;
  animation: gradient-shift 3s ease infinite;
}
</style> 