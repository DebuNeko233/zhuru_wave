import { defineStore } from 'pinia'
import { ref, computed } from 'vue'

import defaultAvatar from '@renderer/assets/img/OIP.webp'
import rabbitAvatar from '@renderer/assets/img/rabbit.jpg'
import avatar1 from '@renderer/assets/img/avatar.jpeg'
import avatar2 from '@renderer/assets/img/avatar1.jpeg'
import avatar3 from '@renderer/assets/img/avatar2.jpg'
import avatar4 from '@renderer/assets/img/avatar4.webp'
import avatar5 from '@renderer/assets/img/avatar5.webp'
import avatar6 from '@renderer/assets/img/avatar6.jpeg'

// 添加更多头像选项
const avatarOptions = {
  default: defaultAvatar,
  rabbit: rabbitAvatar,
  avatar1: avatar1, // 可以添加更多头像图片
  avatar2: avatar2,
  avatar3: avatar3,
  avatar4: avatar4,
  avatar5: avatar5,
  avatar6: avatar6
}

export interface UserInfo {
  id: string
  username: string
  email: string
  avatar: string
  phone?: string
  department?: string
  role: string
  lastLoginTime?: string
}

export const useUserStore = defineStore('user', () => {
  //状态
  const userInfo = ref<UserInfo | null>({
    id: 'null',
    username: '暂未登录',
    email: '未知',
    avatar: 'rabbit',
    role: 'guest'
  })
  const isLoggedIn = ref(false)
  const token = ref('')

  const userName = computed(() => userInfo.value?.username || '未登录')
  const userAvatar = computed(() => {
    if (!userInfo.value?.avatar) return defaultAvatar
    return avatarOptions[userInfo.value.avatar] || defaultAvatar
  })
  const userRole = computed(() => userInfo.value?.role || 'guest')

  // 添加获取所有头像选项的方法
  const getAvatarOptions = () => avatarOptions

  // 添加更换头像的方法
  const changeUserAvatar = (avatarKey: string) => {
    if (userInfo.value) {
      updateUserInfo({ avatar: avatarKey })
    }
  }

  const login = async (username: string, password: string) => {
    try {
      const response = await mockLogin(username, password)

      if (response.success) {
        userInfo.value = response.data.userInfo
        token.value = response.data.token
        isLoggedIn.value = true

        localStorage.setItem('userToken', token.value)
        localStorage.setItem('userInfo', JSON.stringify(userInfo.value))

        return { success: true, message: '登录成功' }
      } else {
        return { success: false, message: response.message }
      }
    } catch (error) {
      return { success: false, message: '登录失败，请重试' }
    }
  }

  const logout = () => {
    userInfo.value = {
      id: 'null',
      username: '暂未登录',
      email: '未知',
      avatar: 'rabbit',
      role: 'guest'
    }
    token.value = ''
    isLoggedIn.value = false

    localStorage.removeItem('userToken')
    localStorage.removeItem('userInfo')
  }

  const updateUserInfo = (newInfo: Partial<UserInfo>) => {
    if (userInfo.value) {
      userInfo.value = { ...userInfo.value, ...newInfo }
      // 确保传递纯对象给 saveUserProfile
      const plainUserInfo = JSON.parse(JSON.stringify(userInfo.value))
      saveUserProfile(plainUserInfo)
      localStorage.setItem('userInfo', JSON.stringify(userInfo.value))
    }
  }
  const initUserState = () => {
    // const savedToken = localStorage.getItem('userToken');
    // const savedUserInfo = localStorage.getItem('userInfo');
    // if(savedToken && savedUserInfo){
    //     token.value = savedToken;
    //     userInfo.value = JSON.parse(savedUserInfo);
    //     isLoggedIn.value = true;
    // }
  }

  return {
    userInfo,
    isLoggedIn,
    token,
    userName,
    userAvatar,
    userRole,
    login,
    logout,
    updateUserInfo,
    getAvatarOptions,
    changeUserAvatar,
    initUserState
  }
})

const saveUserProfile = async (userInfo: UserInfo) => {
  try {
    const res = await window.electronAPI.invoke('user:save-profile', userInfo)
    if (res.success) {
      return { success: true, message: res.message }
    } else {
      return { success: false, message: res.message }
    }
  } catch (error) {
    console.error('保存用户配置失败:', error)
    return { success: false, message: `保存用户配置失败,原因${error}` }
  }
}

const mockLogin = (username: string, password: string) => {
  return new Promise<any>(async (resolve) => {
    setTimeout(async () => {
      let result = await window.electronAPI.invoke('user:get-profile-login', username, password)

      if (result.success) {
        // 更新最后登录时间
        result.data.lastLoginTime = new Date().toISOString()
        // 保存更新后的配置
        let SaveRes = await saveUserProfile(result.data)
        if (SaveRes.success) {
          resolve({
            success: true,
            data: {
              token: 'mock-jwt-token-' + Date.now(),
              userInfo: result.data
            }
          })
        } else {
          resolve({
            success: false,
            message: SaveRes.message
          })
        }
      } else {
        resolve({
          succsee: false,
          message: result.message
        })
      }
    }, 1000)
  })
}
