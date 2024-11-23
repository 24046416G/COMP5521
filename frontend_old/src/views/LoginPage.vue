<template>
  <div class="min-h-screen bg-gray-100 flex flex-col justify-center py-12 sm:px-6 lg:px-8">
    <div class="sm:mx-auto sm:w-full sm:max-w-md">
      <div class="bg-white py-8 px-4 shadow sm:rounded-lg sm:px-10 mb-4">
        <h2 class="text-center text-3xl font-extrabold text-gray-900">
          Sign In
        </h2>
        
        <div class="mt-6 flex justify-center space-x-4">
          <button 
            @click="selectedRole = 'student'"
            type="button"
            :class="[
              'px-6 py-2 rounded-md transition-colors duration-200',
              selectedRole === 'student' 
                ? 'bg-indigo-600 text-white' 
                : 'bg-gray-50 text-gray-700 border border-gray-300 hover:bg-gray-100'
            ]"
          >
            Student
          </button>
          <button 
            @click="selectedRole = 'teacher'"
            type="button"
            :class="[
              'px-6 py-2 rounded-md transition-colors duration-200',
              selectedRole === 'teacher' 
                ? 'bg-indigo-600 text-white' 
                : 'bg-gray-50 text-gray-700 border border-gray-300 hover:bg-gray-100'
            ]"
          >
            Teacher
          </button>
        </div>
      </div>
    </div>

    <div class="sm:mx-auto sm:w-full sm:max-w-md">
      <div class="bg-white py-8 px-4 shadow sm:rounded-lg sm:px-10">
        <!-- Student Login Form -->
        <form v-if="selectedRole === 'student'" @submit.prevent="handleStudentLogin" class="space-y-6">
          <div>
            <label for="studentId" class="block text-sm font-medium text-gray-700">
              Student ID
            </label>
            <div class="mt-1">
              <input 
                id="studentId" 
                v-model="studentForm.studentId" 
                type="text" 
                required 
                class="appearance-none block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm placeholder-gray-400 focus:outline-none focus:ring-indigo-500 focus:border-indigo-500 sm:text-sm"
              >
            </div>
          </div>

          <div>
            <label for="studentPassword" class="block text-sm font-medium text-gray-700">
              Password
            </label>
            <div class="mt-1 relative">
              <input 
                :type="showPassword ? 'text' : 'password'" 
                id="studentPassword" 
                v-model="studentForm.password" 
                required 
                class="appearance-none block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm placeholder-gray-400 focus:outline-none focus:ring-indigo-500 focus:border-indigo-500 sm:text-sm"
              >
              <button 
                @click="showPassword = !showPassword"
                type="button"
                class="absolute inset-y-0 right-0 px-3 flex items-center hover:text-gray-700"
              >
                <font-awesome-icon :icon="showPassword ? 'eye-slash' : 'eye'" />
              </button>
            </div>
          </div>

          <div class="flex items-center justify-between">
            <button 
              type="submit" 
              class="w-full inline-flex justify-center py-2 px-4 border border-transparent rounded-md shadow-sm text-sm font-medium text-white bg-indigo-600 hover:bg-indigo-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500"
            >
              Sign in
            </button>
          </div>
          
          <div class="text-center">
            <router-link 
              to="/signup" 
              class="font-medium text-indigo-600 hover:text-indigo-500"
            >
              Sign up
            </router-link>
          </div>
        </form>

        <!-- Teacher Login Form -->
        <form v-else @submit.prevent="handleTeacherLogin" class="space-y-6">
          <div>
            <label for="email" class="block text-sm font-medium text-gray-700">
              Email
            </label>
            <div class="mt-1">
              <input 
                id="email" 
                v-model="teacherForm.email" 
                type="email" 
                required 
                class="appearance-none block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm placeholder-gray-400 focus:outline-none focus:ring-indigo-500 focus:border-indigo-500 sm:text-sm"
              >
            </div>
          </div>

          <div>
            <label for="teacherPassword" class="block text-sm font-medium text-gray-700">
              Password
            </label>
            <div class="mt-1 relative">
              <input 
                :type="showPassword ? 'text' : 'password'" 
                id="teacherPassword" 
                v-model="teacherForm.password" 
                required 
                class="appearance-none block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm placeholder-gray-400 focus:outline-none focus:ring-indigo-500 focus:border-indigo-500 sm:text-sm"
              >
              <button 
                @click="showPassword = !showPassword"
                type="button"
                class="absolute inset-y-0 right-0 px-3 flex items-center hover:text-gray-700"
              >
                <font-awesome-icon :icon="showPassword ? 'eye-slash' : 'eye'" />
              </button>
            </div>
          </div>

          <div>
            <button 
              type="submit" 
              class="w-full inline-flex justify-center py-2 px-4 border border-transparent rounded-md shadow-sm text-sm font-medium text-white bg-indigo-600 hover:bg-indigo-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500"
            >
              Sign in
            </button>
          </div>
        </form>

        <!-- Error Message -->
        <div v-if="errorMessage" class="mt-4 text-red-600 text-sm text-center">
          {{ errorMessage }}
        </div>
      </div>
    </div>
  </div>
</template>

<script setup>
import { ref, reactive } from 'vue'
import { useRouter } from 'vue-router'
import { useAuthStore } from '../stores/auth'
import { authService } from '../services/api'
import { blockchainService } from '../services/api'

const router = useRouter()
const authStore = useAuthStore()

const selectedRole = ref('student')
const errorMessage = ref('')

const studentForm = reactive({
  studentId: '',
  password: ''
})

const teacherForm = reactive({
  email: '',
  password: ''
})

const showPassword = ref(false)

const handleStudentLogin = async () => {
  try {
    errorMessage.value = ''
    console.log('Sending login request:', studentForm)
    
    // 先尝试获取钱包信息
    const walletResponse = await blockchainService.getWallet(studentForm.walletId)
    
    if (!walletResponse.data) {
      throw new Error('Student not registered')
    }
    
    // 验证密码和学生ID
    if (walletResponse.data.studentId !== studentForm.studentId) {
      throw new Error('Invalid student ID')
    }
    
    // 验证密码
    const loginResponse = await authService.studentLogin({
      walletId: studentForm.walletId,
      password: studentForm.password,
      studentId: studentForm.studentId
    })
    
    if (loginResponse.data) {
      // 保存用户信息到 localStorage
      localStorage.setItem('walletId', loginResponse.data.id)
      localStorage.setItem('studentId', loginResponse.data.studentId)
      localStorage.setItem('publicKey', loginResponse.data.addresses[0])
      localStorage.setItem('password', studentForm.password)
      
      // ��存到 auth store
      await authStore.setUser({
        studentId: loginResponse.data.studentId,
        walletId: loginResponse.data.id,
        publicKey: loginResponse.data.addresses[0],
        role: 'student'
      })
      
      console.log('Navigating to dashboard with studentId:', loginResponse.data.studentId)
      
      // 使用完整的路径进行导航
      await router.push({
        name: 'studentCheckIn',
        params: { studentId: loginResponse.data.studentId }
      })
    }
  } catch (error) {
    console.error('Login error:', error)
    errorMessage.value = error.message || 'Invalid credentials'
  }
}

const handleTeacherLogin = async () => {
  try {
    errorMessage.value = ''
    
    // 调用前端验证服务
    const response = await authService.teacherLogin({
      email: teacherForm.email,
      password: teacherForm.password
    });

    if (response.data) {
      // 保存教师信息到 localStorage
      localStorage.setItem('teacherId', response.data.id)
      localStorage.setItem('teacherEmail', response.data.email)
      localStorage.setItem('role', 'teacher')
      
      // 保存到 auth store
      await authStore.setUser({
        id: response.data.id,
        email: response.data.email,
        role: 'teacher'
      })
      
      // 导航到教师仪表板
      await router.push('/teacher/dashboard')
    }
  } catch (error) {
    console.error('Teacher login error:', error)
    errorMessage.value = 'Invalid email or password'
  }
}
</script> 