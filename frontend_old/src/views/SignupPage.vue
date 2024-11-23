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

    <!-- Keys Modal -->
    <div v-if="showModal" class="fixed inset-0 bg-gray-500 bg-opacity-75 flex items-center justify-center">
      <div class="bg-white p-8 rounded-lg max-w-lg w-full mx-4">
        <h3 class="text-lg font-medium text-gray-900 mb-4">Your Keys</h3>
        <div class="space-y-4">
          <div>
            <label class="block text-sm font-medium text-gray-700">Public Key</label>
            <div class="mt-1 relative">
              <input 
                type="text" 
                readonly 
                :value="keys.publicKey"
                class="block w-full pr-10 border-gray-300 rounded-md"
              >
              <button 
                @click="copyToClipboard(keys.publicKey, 'public')"
                type="button"
                class="absolute inset-y-0 right-0 px-3 flex items-center hover:bg-gray-200 transition duration-200"
              >
                <font-awesome-icon icon="copy" />
              </button>
            </div>
            <span v-if="copiedMessagePublicKey" class="text-green-600 text-sm">{{ copiedMessagePublicKey }}</span>
          </div>
          <div>
            <label class="block text-sm font-medium text-gray-700">Private Key</label>
            <div class="mt-1 relative">
              <input 
                type="text" 
                readonly 
                :value="keys.privateKey"
                class="block w-full pr-10 border-gray-300 rounded-md"
              >
              <button 
                @click="copyToClipboard(keys.privateKey, 'private')"
                type="button"
                class="absolute inset-y-0 right-0 px-3 flex items-center hover:bg-gray-200 transition duration-200"
              >
                <font-awesome-icon icon="copy" />
              </button>
            </div>
            <span v-if="copiedMessagePrivateKey" class="text-green-600 text-sm">{{ copiedMessagePrivateKey }}</span>
          </div>
        </div>
        <div class="mt-6">
          <button 
            @click="confirmKeys"
            type="button"
            class="w-full inline-flex justify-center py-2 px-4 border border-transparent rounded-md shadow-sm text-sm font-medium text-white bg-indigo-600 hover:bg-indigo-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500"
          >
            I have saved my keys
          </button>
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
const showModal = ref(false)
const keys = reactive({
  publicKey: '',
  privateKey: ''
})

const showPassword = ref(false)
const copiedMessagePublicKey = ref('')
const copiedMessagePrivateKey = ref('')

const handleSignup = async () => {
  try {
    errorMessage.value = ''
    
    // 第一步：创建钱包
    const walletResponse = await blockchainService.createWallet({
      password: form.password,
      studentId: form.studentId,
      classId: form.classId
    })
    
    if (walletResponse.status === 201) {
      const walletData = walletResponse.data
      console.log('Wallet created:', walletData) // 添加日志
      
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
        
        // 验证交易是否被记录
        const transactions = await blockchainService.getPendingTransactions()
        console.log('Current pending transactions:', transactions.data) // 添加日志
        
        const registrationTx = transactions.data.find(tx => 
          tx.type === 'studentRegistration' && 
          tx.data.outputs[0].metadata?.studentId === form.studentId
        )
        
        if (!registrationTx) {
          console.error('Transaction not found in pending transactions')
          throw new Error('Registration transaction failed')
        }
        
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
        
        // 显示密钥对模态框
        keys.publicKey = walletData.publicKey
        keys.walletId = walletData.walletId
        showModal.value = true
      }
    }
  } catch (error) {
    console.error('Registration error:', error)
    errorMessage.value = error.response?.data || error.message || 'Registration failed'
  }
}

const copyToClipboard = async (text, type) => {
  try {
    await navigator.clipboard.writeText(text)
    if (type === 'public') {
      copiedMessagePublicKey.value = 'Copied!'
      setTimeout(() => {
        copiedMessagePublicKey.value = ''
      }, 2000)
    } else {
      copiedMessagePrivateKey.value = 'Copied!'
      setTimeout(() => {
        copiedMessagePrivateKey.value = ''
      }, 2000)
    }
  } catch (err) {
    console.error('Failed to copy text: ', err)
  }
}

const confirmKeys = async () => {
  try {
    showModal.value = false
    console.log('Navigating to dashboard...')  // 添加日志
    
    const studentId = localStorage.getItem('studentId')
    if (!studentId) {
      throw new Error('Student ID not found')
    }
    
    // 使用 name 进行导航
    await router.push({
      name: 'studentCheckIn',
      params: { studentId }
    })
  } catch (error) {
    console.error('Navigation error:', error)
    errorMessage.value = 'Failed to navigate to dashboard'
  }
}
</script>

<style scoped>
input {
  padding-right: 2.5rem;
}
</style> 