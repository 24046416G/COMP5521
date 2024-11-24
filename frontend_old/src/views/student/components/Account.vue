<template>
  <div class="min-h-screen bg-gray-50 py-8">
    <div class="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8">
      <!-- 钱包容器 -->
      <div class="wallet-container" 
           :class="{ 'wallet-open': isWalletOpen }" 
           @mouseenter="handleMouseEnter"
           @mouseleave="handleMouseLeave">
        <!-- 钱包图标和边框 -->
        <div class="wallet-frame" :class="{ 'fade-out': isWalletOpen }">
          <!-- 钱包边框装饰 -->
          <div class="wallet-border">
            <div class="wallet-corner top-left"></div>
            <div class="wallet-corner top-right"></div>
            <div class="wallet-corner bottom-left"></div>
            <div class="wallet-corner bottom-right"></div>
          </div>
          <!-- 钱包图标 -->
          <svg class="w-96 h-96 text-indigo-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="1.5" 
                  d="M3 10h18M7 15h1m4 0h1m-7 4h12a3 3 0 003-3V8a3 3 0 00-3-3H6a3 3 0 00-3 3v8a3 3 0 003 3z"/>
          </svg>
        </div>

        <!-- 钱包信息卡片 -->
        <div class="wallet-details" :class="{ 'show-details': isWalletOpen }">
          <div class="bg-white rounded-2xl shadow-xl overflow-hidden transform transition-all duration-500">
            <!-- 卡片头部 -->
            <div class="px-8 py-6 bg-gradient-to-r from-indigo-500 to-purple-600">
              <div class="flex items-center space-x-4">
                <div class="avatar-container">
                  <div class="avatar">
                    <svg class="w-16 h-16 text-white" fill="currentColor" viewBox="0 0 20 20">
                      <path fill-rule="evenodd" d="M10 9a3 3 0 100-6 3 3 0 000 6zm-7 9a7 7 0 1114 0H3z" clip-rule="evenodd"/>
                    </svg>
                  </div>
                </div>
                <div>
                  <h3 class="text-2xl font-bold text-white">Digital Wallet</h3>
                  <p class="text-indigo-100">Student Account</p>
                </div>
              </div>
            </div>

            <!-- 卡片内容 -->
            <div class="px-8 py-6">
              <div class="grid grid-cols-2 gap-6">
                <!-- 基本信息卡片 -->
                <div class="info-card">
                  <div class="info-icon bg-indigo-100 text-indigo-600">
                    <svg class="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z"/>
                    </svg>
                  </div>
                  <div class="info-content">
                    <label>Student ID</label>
                    <p>{{ walletInfo.studentId }}</p>
                  </div>
                </div>

                <div class="info-card">
                  <div class="info-icon bg-purple-100 text-purple-600">
                    <svg class="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M19 21V5a2 2 0 00-2-2H7a2 2 0 00-2 2v16m14 0h2m-2 0h-5m-9 0H3m2 0h5M9 7h1m-1 4h1m4-4h1m-1 4h1m-5 10v-5a1 1 0 011-1h2a1 1 0 011 1v5m-4 0h4"/>
                    </svg>
                  </div>
                  <div class="info-content">
                    <label>Class ID</label>
                    <p>{{ walletInfo.classId }}</p>
                  </div>
                </div>

                <div class="info-card">
                  <div class="info-icon bg-green-100 text-green-600">
                    <svg class="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 8c-1.657 0-3 .895-3 2s1.343 2 3 2 3 .895 3 2-1.343 2-3 2m0-8c1.11 0 2.08.402 2.599 1M12 8V7m0 1v8m0 0v1m0-1c-1.11 0-2.08-.402-2.599-1M21 12a9 9 0 11-18 0 9 9 0 0118 0z"/>
                    </svg>
                  </div>
                  <div class="info-content">
                    <label>Balance</label>
                    <p class="text-green-600 font-semibold">{{ walletInfo.balance }} Coins</p>
                  </div>
                </div>

                <div class="info-card">
                  <div class="info-icon bg-blue-100 text-blue-600">
                    <svg class="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M15 7a2 2 0 012 2m4 0a6 6 0 01-7.743 5.743L11 17H9v2H7v2H4a1 1 0 01-1-1v-2.586a1 1 0 01.293-.707l5.964-5.964A6 6 0 1121 9z"/>
                    </svg>
                  </div>
                  <div class="info-content">
                    <label>Address</label>
                    <p class="text-sm font-mono truncate" :title="walletInfo.addresses[0]?.publicKey || 'N/A'">
                      {{ formatAddress(walletInfo.addresses[0]?.publicKey) }}
                    </p>
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
import { ref, onMounted } from 'vue'
import { studentService } from '../../../services/api'

const isWalletOpen = ref(false)
const walletInfo = ref({
  studentId: '',
  classId: '',
  balance: 0,
  addresses: [],
  id: ''
})

const formatAddress = (address) => {
  if (!address || typeof address !== 'string') return 'N/A'
  return `${address.substring(0, 6)}...${address.substring(address.length - 4)}`
}

const handleMouseEnter = () => {
  console.log('Mouse enter')
  isWalletOpen.value = true
}

const handleMouseLeave = () => {
  console.log('Mouse leave')
  isWalletOpen.value = false
}

const fetchWalletInfo = async () => {
  try {
    const walletId = localStorage.getItem('walletId')
    if (!walletId) {
      console.error('Wallet ID not found')
      return
    }

    console.log('Fetching wallet info for:', walletId)
    const response = await studentService.getWallet(walletId)
    console.log('Wallet response:', response.data)

    if (response.data) {
      walletInfo.value = {
        studentId: response.data.studentId || 'N/A',
        classId: response.data.classId || 'N/A',
        balance: response.data.balance || 0,
        addresses: response.data.addresses || [],
        id: response.data.id || 'N/A'
      }
    }
  } catch (error) {
    console.error('Error fetching wallet info:', error)
  }
}

onMounted(() => {
  fetchWalletInfo()
})
</script>

<style scoped>
/* 钱包边框样式 */
.wallet-frame {
  position: relative;
  padding: 20px;
  transition: all 0.8s cubic-bezier(0.4, 0, 0.2, 1);
  opacity: 1;
  transform: scale(1);
  z-index: 20;
}

.wallet-border {
  position: absolute;
  top: 0;
  left: 0;
  right: 0;
  bottom: 0;
  border: 2px solid rgba(79, 70, 229, 0.2);
  border-radius: 20px;
  pointer-events: none;
}

.wallet-corner {
  position: absolute;
  width: 20px;
  height: 20px;
  border: 2px solid #4F46E5;
}

.top-left {
  top: -2px;
  left: -2px;
  border-right: none;
  border-bottom: none;
  border-top-left-radius: 8px;
}

.top-right {
  top: -2px;
  right: -2px;
  border-left: none;
  border-bottom: none;
  border-top-right-radius: 8px;
}

.bottom-left {
  bottom: -2px;
  left: -2px;
  border-right: none;
  border-top: none;
  border-bottom-left-radius: 8px;
}

.bottom-right {
  bottom: -2px;
  right: -2px;
  border-left: none;
  border-top: none;
  border-bottom-right-radius: 8px;
}

/* 修改容器样式 */
.wallet-container {
  position: relative;
  min-height: 700px;
  display: flex;
  justify-content: center;
  align-items: center;
  perspective: 2000px;
}

/* 修改钱包图标的淡出效果 */
.wallet-frame.fade-out {
  opacity: 0;
  transform: scale(0.8) rotateY(-180deg);
  pointer-events: none;
  z-index: 10;
}

/* 修改详情页的显示效果 */
.wallet-details {
  position: absolute;
  width: 100%;
  max-width: 800px;
  opacity: 0;
  transform: rotateY(-90deg);
  transition: all 0.8s cubic-bezier(0.4, 0, 0.2, 1);
  transform-origin: left center;
  z-index: 5;
  visibility: hidden;
}

.wallet-details.show-details {
  opacity: 1;
  transform: rotateY(0);
  z-index: 15;
  visibility: visible;
}

/* 添加钱包悬停效果 */
.wallet-container:hover .wallet-frame:not(.fade-out) {
  transform: scale(1.05);
  filter: drop-shadow(0 0 20px rgba(79, 70, 229, 0.3));
}

/* 添加呼吸动画 */
@keyframes breathe {
  0%, 100% { transform: scale(1); }
  50% { transform: scale(1.02); }
}

.wallet-frame:not(.fade-out) {
  animation: breathe 3s infinite ease-in-out;
}

.wallet-container:hover .wallet-frame:not(.fade-out) {
  animation: none;
}

/* 修改卡片样式 */
.info-card {
  background-color: white;
  border-radius: 0.75rem;
  padding: 1rem;
  display: flex;
  align-items: center;
  gap: 1rem;
  box-shadow: 0 1px 2px 0 rgba(0, 0, 0, 0.05);
  border: 1px solid rgb(243, 244, 246);
  transition: all 0.3s ease;
}

.info-icon {
  padding: 0.75rem;
  border-radius: 9999px;
  flex-shrink: 0;
}

.info-content {
  flex: 1;
  min-width: 0;
}

/* 添加卡片悬停效果 */
.info-card:hover {
  transform: scale(1.05);
  border-color: rgb(199, 210, 254);
  box-shadow: 0 4px 6px -1px rgba(0, 0, 0, 0.1), 0 2px 4px -1px rgba(0, 0, 0, 0.06);
}

/* 其他动画样式保持不变 */
</style> 