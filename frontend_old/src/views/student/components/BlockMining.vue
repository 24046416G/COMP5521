<template>
  <div class="space-y-6">
    <!-- Balance Card -->
    <div class="bg-white shadow sm:rounded-lg">
      <div class="px-4 py-5 sm:p-6">
        <h3 class="text-xl leading-6 font-bold bg-gradient-to-r from-blue-600 to-indigo-600 bg-clip-text text-transparent">
          My Balance
        </h3>
        <div class="mt-5">
          <div class="rounded-md bg-gray-50 p-4">
            <p class="text-3xl font-extrabold bg-gradient-to-r from-indigo-600 to-purple-600 bg-clip-text text-transparent">
              {{ walletBalance }} Coins
            </p>
          </div>
        </div>
      </div>
    </div>

    <!-- Mining Operation Card -->
    <div class="bg-white shadow sm:rounded-lg">
      <div class="px-4 py-5 sm:p-6">
        <h3 class="text-xl leading-6 font-bold bg-gradient-to-r from-blue-600 to-indigo-600 bg-clip-text text-transparent">
          Block Mining
        </h3>
        <div class="mt-2 max-w-xl text-sm text-gray-500">
          <p>Click the button to start mining a new block. You will receive rewards upon success.</p>
        </div>
        <div class="mt-5">
          <button
            type="button"
            @click="startMining"
            :disabled="isMining"
            class="inline-flex items-center px-4 py-2 border border-transparent text-sm font-medium rounded-md shadow-sm text-white bg-gradient-to-r from-indigo-600 to-purple-600 hover:from-indigo-700 hover:to-purple-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500 disabled:opacity-50 transition-all duration-300"
          >
            {{ isMining ? 'Mining...' : 'Start Mining' }}
          </button>
        </div>
      </div>
    </div>

    <!-- Blockchain Display -->
    <div class="bg-white shadow-lg rounded-2xl overflow-hidden border border-gray-100">
      <div class="px-8 py-6">
        <h3 class="text-2xl font-semibold text-gray-900 flex items-center mb-8">
          <svg class="w-6 h-6 mr-2 text-indigo-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M13 10V3L4 14h7v7l9-11h-7z"/>
          </svg>
          Blockchain
        </h3>
        
        <div class="grid gap-6 sm:grid-cols-1 lg:grid-cols-2">
          <div 
            v-for="block in blocks" 
            :key="block.hash"
            class="group bg-white rounded-xl border border-gray-200 hover:border-indigo-300
                   shadow-sm hover:shadow-md transition-all duration-300 transform 
                   hover:scale-[1.02]"
          >
            <div class="p-6">
              <!-- Block Header -->
              <div class="flex justify-between items-start space-x-4">
                <div class="space-y-3 flex-1">
                  <div class="flex items-center space-x-3">
                    <span class="text-lg font-semibold bg-gradient-to-r from-indigo-600 to-purple-600 bg-clip-text text-transparent">
                      Block #{{ block.index }}
                    </span>
                    <span class="px-3 py-1 text-xs font-medium rounded-full bg-green-100 text-green-800">
                      Mined
                    </span>
                  </div>
                  
                  <!-- Block Details -->
                  <div class="grid grid-cols-2 gap-4 mt-4">
                    <div>
                      <p class="text-sm text-gray-500 font-medium">Mining Time</p>
                      <p class="text-sm font-bold text-gray-800">{{ formatTime(block.timestamp) }}</p>
                    </div>
                    <div>
                      <p class="text-sm text-gray-500 font-medium">Difficulty</p>
                      <p class="text-sm font-bold text-gray-800">{{ block.difficulty || 'N/A' }}</p>
                    </div>
                  </div>

                  <!-- Transactions Info -->
                  <div class="bg-gray-50 rounded-lg p-3 mt-3">
                    <p class="text-sm text-gray-500 font-medium">Transactions</p>
                    <p class="text-lg font-bold bg-gradient-to-r from-indigo-600 to-purple-600 bg-clip-text text-transparent">
                      {{ block.transactions?.length || 0 }} transactions
                    </p>
                  </div>

                  <!-- Hash -->
                  <div class="mt-3">
                    <p class="text-sm text-gray-500 font-medium">Block Hash</p>
                    <p class="font-mono text-xs font-semibold truncate text-gray-700 
                             hover:text-indigo-600 transition-colors duration-300 
                             bg-gray-50 p-2 rounded-lg" 
                       :title="block.hash">
                      {{ block.hash }}
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

<script>
import { ref, onMounted } from 'vue'
import { blockchainService } from '@/services/api'

export default {
  name: 'BlockMining',
  
  setup() {
    const blocks = ref([])
    const walletBalance = ref(0)
    const isMining = ref(false)

    // Get wallet ID from localStorage
    const getWalletId = () => {
      return localStorage.getItem('walletId')
    }

    const formatTime = (timestamp) => {
      if (!timestamp) return 'N/A'
      const date = new Date(timestamp)
      return new Intl.DateTimeFormat('en-US', {
        year: 'numeric',
        month: 'short',
        day: '2-digit',
        hour: '2-digit',
        minute: '2-digit',
        second: '2-digit'
      }).format(date)
    }

    // Fetch blockchain data
    const fetchBlocks = async () => {
      try {
        const response = await blockchainService.getBlocks()
        blocks.value = response.data || []
      } catch (error) {
        console.error('Failed to fetch blockchain data:', error)
        blocks.value = []
      }
    }

    // Fetch wallet balance
    const fetchWalletBalance = async () => {
      try {
        const walletId = getWalletId()
        if (!walletId) return
        const response = await blockchainService.getWallet(walletId)
        walletBalance.value = response.data?.balance || 0
      } catch (error) {
        console.error('Failed to fetch wallet balance:', error)
        walletBalance.value = 0
      }
    }

    // Start mining
    const startMining = async () => {
      if (isMining.value) return
      
      try {
        isMining.value = true
        const walletId = getWalletId()
        if (!walletId) {
          throw new Error('Wallet ID not found')
        }
        
        // Call mining API
        await blockchainService.mineBlock({
          rewardAddress: walletId
        })

        // Update blockchain and balance data
        await Promise.all([
          fetchBlocks(),
          fetchWalletBalance()
        ])
      } catch (error) {
        console.error('Mining failed:', error)
      } finally {
        isMining.value = false
      }
    }

    onMounted(async () => {
      await Promise.all([
        fetchBlocks(),
        fetchWalletBalance()
      ])

      // Set up auto-refresh
      setInterval(async () => {
        await Promise.all([
          fetchBlocks(),
          fetchWalletBalance()
        ])
      }, 10000) // Refresh every 10 seconds
    })

    return {
      blocks,
      walletBalance,
      isMining,
      startMining,
      formatTime
    }
  }
}
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

/* 添加卡片悬停效果 */
.hover\:scale-\[1\.02\]:hover {
  transform: scale(1.02);
}

/* 优化卡片内部间距 */
.space-y-3 > * + * {
  margin-top: 0.75rem;
}

/* 添加渐变文字动画 */
@keyframes gradient-shift {
  0% {
    background-position: 0% 50%;
  }
  50% {
    background-position: 100% 50%;
  }
  100% {
    background-position: 0% 50%;
  }
}

.bg-gradient-to-r {
  background-size: 200% auto;
  animation: gradient-shift 3s ease infinite;
}
</style> 