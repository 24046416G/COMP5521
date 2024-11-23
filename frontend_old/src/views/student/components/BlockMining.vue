<template>
  <div class="space-y-6">
    <!-- 余额卡片 -->
    <div class="bg-white shadow sm:rounded-lg">
      <div class="px-4 py-5 sm:p-6">
        <h3 class="text-lg leading-6 font-medium text-gray-900">
          我的余额
        </h3>
        <div class="mt-5">
          <div class="rounded-md bg-gray-50 p-4">
            <p class="text-2xl font-bold text-gray-900">
              {{ walletBalance }} 个币
            </p>
          </div>
        </div>
      </div>
    </div>

    <!-- 挖矿操作卡片 -->
    <div class="bg-white shadow sm:rounded-lg">
      <div class="px-4 py-5 sm:p-6">
        <h3 class="text-lg leading-6 font-medium text-gray-900">
          区块挖掘
        </h3>
        <div class="mt-2 max-w-xl text-sm text-gray-500">
          <p>点击按钮开始挖掘新区块,成功后可获得奖励</p>
        </div>
        <div class="mt-5">
          <button
            type="button"
            @click="startMining"
            :disabled="isMining"
            class="inline-flex items-center px-4 py-2 border border-transparent text-sm font-medium rounded-md shadow-sm text-white bg-indigo-600 hover:bg-indigo-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500 disabled:opacity-50"
          >
            {{ isMining ? '挖掘中...' : '开始挖掘' }}
          </button>
        </div>
      </div>
    </div>

    <!-- 区块链展示 -->
    <div class="bg-white shadow sm:rounded-lg">
      <div class="px-4 py-5 sm:p-6">
        <h3 class="text-lg leading-6 font-medium text-gray-900 mb-4">
          区块链
        </h3>
        <div class="flex flex-wrap gap-4">
          <div 
            v-for="block in blocks" 
            :key="block.hash"
            class="p-4 border rounded-lg bg-gray-50 w-64"
          >
            <div class="text-sm space-y-2">
              <p><span class="font-medium">区块高度:</span> {{ block.index }}</p>
              <p><span class="font-medium">时间戳:</span> {{ formatTime(block.timestamp) }}</p>
              <p><span class="font-medium">交易数:</span> {{ block.transactions?.length || 0 }}</p>
              <p class="truncate"><span class="font-medium">哈希:</span> {{ block.hash }}</p>
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

    // 从 localStorage 获取钱包ID
    const getWalletId = () => {
      return localStorage.getItem('walletId')
    }

    const formatTime = (timestamp) => {
      if (!timestamp) return ''
      return new Date(timestamp).toLocaleString()
    }

    // 获取区块链数据
    const fetchBlocks = async () => {
      try {
        const response = await blockchainService.getBlocks()
        blocks.value = response.data || []
      } catch (error) {
        console.error('获取区块链数据失败:', error)
        blocks.value = []
      }
    }

    // 获取钱包余额
    const fetchWalletBalance = async () => {
      try {
        const walletId = getWalletId()
        if (!walletId) return
        const response = await blockchainService.getWallet(walletId)
        walletBalance.value = response.data?.balance || 0
      } catch (error) {
        console.error('获取钱包余额失败:', error)
        walletBalance.value = 0
      }
    }

    // 开始挖矿
    const startMining = async () => {
      if (isMining.value) return
      
      try {
        isMining.value = true
        const walletId = getWalletId()
        if (!walletId) {
          throw new Error('未找到钱包ID')
        }
        
        // 调用挖矿接口
        await blockchainService.mineBlock({
          rewardAddress: walletId
        })

        // 更新区块链和余额数据
        await Promise.all([
          fetchBlocks(),
          fetchWalletBalance()
        ])
      } catch (error) {
        console.error('挖矿失败:', error)
      } finally {
        isMining.value = false
      }
    }

    onMounted(async () => {
      await Promise.all([
        fetchBlocks(),
        fetchWalletBalance()
      ])

      // 设置定时刷新
      setInterval(async () => {
        await Promise.all([
          fetchBlocks(),
          fetchWalletBalance()
        ])
      }, 10000) // 每10秒刷新一次
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