<template>
  <div class="min-h-screen bg-gray-100 flex flex-col justify-center py-12 sm:px-6 lg:px-8">
    <div class="sm:mx-auto sm:w-full sm:max-w-md">
      <h2 class="mt-6 text-center text-3xl font-extrabold text-gray-900">
        Create Your Account
      </h2>
    </div>

    <div class="mt-8 sm:mx-auto sm:w-full sm:max-w-md">
      <div class="bg-white py-8 px-4 shadow sm:rounded-lg sm:px-10">
        <form @submit.prevent="handleSignup" class="space-y-6">
          <div>
            <label for="studentId" class="block text-sm font-medium text-gray-700">
              Student ID
            </label>
            <div class="mt-1">
              <input 
                id="studentId" 
                v-model="form.studentId" 
                type="text" 
                required 
                class="appearance-none block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm placeholder-gray-400 focus:outline-none focus:ring-indigo-500 focus:border-indigo-500 sm:text-sm"
              >
            </div>
          </div>

          <div>
            <label for="password" class="block text-sm font-medium text-gray-700">
              Password
            </label>
            <div class="mt-1 relative">
              <input 
                :type="showPassword ? 'text' : 'password'" 
                id="password" 
                v-model="form.password" 
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
            <label for="classId" class="block text-sm font-medium text-gray-700">
              Class ID
            </label>
            <div class="mt-1">
              <input 
                id="classId" 
                v-model="form.classId" 
                type="text" 
                required 
                class="appearance-none block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm placeholder-gray-400 focus:outline-none focus:ring-indigo-500 focus:border-indigo-500 sm:text-sm"
              >
            </div>
          </div>

          <div>
            <button 
              type="submit" 
              class="w-full flex justify-center py-2 px-4 border border-transparent rounded-md shadow-sm text-sm font-medium text-white bg-indigo-600 hover:bg-indigo-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500"
            >
              Sign up
            </button>
          </div>
        </form>

        <div v-if="errorMessage" class="mt-4 text-red-600 text-sm text-center">
          {{ errorMessage }}
        </div>

        <!-- Link to Login Page -->
        <div class="mt-4 text-center">
          <router-link 
            to="/login" 
            class="font-medium text-indigo-600 hover:text-indigo-500"
          >
            Already have an account? Log in
          </router-link>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup>
import { ref, reactive } from 'vue'
import { useRouter } from 'vue-router'
import { useAuthStore } from '../stores/auth'
import { blockchainService } from '../services/api'

const router = useRouter()
const authStore = useAuthStore()

const form = reactive({
  studentId: '',
  password: '',
  classId: ''
})

const errorMessage = ref('')
const showPassword = ref(false)

const handleSignup = async () => {
  try {
    errorMessage.value = ''
    
    // 第一步：创建钱包
    const walletResponse = await blockchainService.createWallet({
      password: form.password,
      studentId: form.studentId,
      classId: form.classId
    })
    
    if (walletResponse.data.success) {
      const walletData = walletResponse.data.wallet
      console.log('Wallet created:', walletData)
      
      // 第二步：完成注册（创建注册交易）
      const registrationResponse = await blockchainService.completeRegistration({
        walletId: walletData.walletId,
        password: form.password,
        classId: form.classId,
        studentId: form.studentId
      })
      
      if (registrationResponse.status === 201) {
        console.log('Registration transaction created:', registrationResponse.data)
        
        // 等待交易被确认
        await new Promise(resolve => setTimeout(resolve, 1000))
        
        // 使用 blockchainService 来获取待处理交易
        const transactions = await blockchainService.getPendingTransactions()
        console.log('Current pending transactions:', transactions.data)
        
        // 保存用户信息到 localStorage
        localStorage.setItem('walletId', walletData.walletId)
        localStorage.setItem('studentId', walletData.studentId)
        localStorage.setItem('publicKey', walletData.publicKey)
        localStorage.setItem('password', form.password)
        
        // 保存到 auth store
        await authStore.setUser({
          studentId: walletData.studentId,
          walletId: walletData.walletId,
          publicKey: walletData.publicKey,
          role: 'student'
        })
        
        // 直接导航到学生仪表板
        const studentId = walletData.studentId
        if (!studentId) {
          throw new Error('Student ID not found')
        }
        
        await router.push({
          name: 'studentCheckIn',
          params: { studentId }
        })
      }
    } else {
      throw new Error(walletResponse.data.message || 'Failed to create wallet')
    }
  } catch (error) {
    console.error('Registration error:', error)
    errorMessage.value = error.response?.data?.message || error.message || 'Registration failed'
  }
}
</script>

<style scoped>
input {
  padding-right: 2.5rem;
}
</style> 