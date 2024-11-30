import { defineStore } from 'pinia'
import { ref } from 'vue'

export const useAuthStore = defineStore('auth', () => {
  const user = ref(null)
  const keys = ref({
    publicKey: null,
    privateKey: null
  })

  const setUser = async (userData) => {
    user.value = userData
  }

  const setKeys = async (keyPair) => {
    keys.value = keyPair
  }

  const logout = () => {
    user.value = null
    keys.value = {
      publicKey: null,
      privateKey: null
    }
  }

  const isAuthenticated = () => {
    return !!user.value
  }

  const getUser = () => {
    return user.value
  }

  const getKeys = () => {
    return keys.value
  }

  return {
    user,
    keys,
    setUser,
    setKeys,
    logout,
    isAuthenticated,
    getUser,
    getKeys
  }
}) 