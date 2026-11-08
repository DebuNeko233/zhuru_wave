<template>
  <div class="mainTitle">
    <div class="title">
      <span>电源波形缺陷检测系统</span>
    </div>
    <div class="avator">
      <el-dropdown @command="handleCommand">
        <el-avatar :src="userStore.userAvatar || avatarImg" :alt="userStore.userName" />
        <template #dropdown>
          <el-dropdown-menu>
            <!-- 只有登录后才显示个人信息和系统设置 -->
            <el-dropdown-item command="profile" v-if="userStore.isLoggedIn">
              <el-icon><User /></el-icon>
              个人信息
            </el-dropdown-item>
            <el-dropdown-item command="settings" v-if="userStore.isLoggedIn">
              <el-icon><Setting /></el-icon>
              系统设置
            </el-dropdown-item>
            <!-- 未登录时显示登录选项 -->
            <el-dropdown-item command="login" v-if="!userStore.isLoggedIn">
              <el-icon><SwitchButton /></el-icon>
              登录
            </el-dropdown-item>
            <!-- 已登录时显示退出登录选项 -->
            <el-dropdown-item divided command="logout" v-if="userStore.isLoggedIn">
              <el-icon><SwitchButton /></el-icon>
              退出登录
            </el-dropdown-item>
          </el-dropdown-menu>
        </template>
      </el-dropdown>
      <span class="username">{{ userStore.userName }}</span>
    </div>
  </div>
</template>

<script setup lang="ts">
import { useRouter, useRoute } from 'vue-router'
import { ElMessage, ElMessageBox } from 'element-plus'
import { User, Setting, SwitchButton } from '@element-plus/icons-vue'
import { useUserStore } from '@renderer/store/user'
import { useLogStore } from '@renderer/store/logStore'
import { storeToRefs } from 'pinia'
import avatarImg from '@renderer/assets/img/OIP.webp'

const router = useRouter()
const route = useRoute()
const userStore = useUserStore()
const logStore = useLogStore()
const { userInfo } = storeToRefs(userStore)

const handleCommand = async (command: string) => {
  switch (command) {
    case 'profile':
      router.push('/setting/account')
      break
    case 'settings':
      router.push('/setting/programingParament')
      break
    case 'login':
      if (route.path === '/login') {
        ElMessage.warning('已经在登录页面了')
      } else {
        router.push('/login')
        ElMessage.success('正在前往登录页面')
      }
      break // 这里必须加上 break！
    case 'logout':
      try {
        await ElMessageBox.confirm('确定要退出登录吗？', '提示', {
          confirmButtonText: '确定',
          cancelButtonText: '取消',
          type: 'warning'
        })
        logStore.addLog({
          level: 'info',
          message: `${userInfo.value?.username}退出`,
          details: `退出时间${new Date().toLocaleString()}`,
          source: '用户信息'
        })
        userStore.logout()
        ElMessage.success('已退出登录')

        router.push('/login')
      } catch {
        // 用户取消
      }
      break
  }
}
</script>

<style scoped lang="less">
.mainTitle {
  display: flex;
  justify-content: center;
  align-items: center;
  position: relative;
  padding: 6px 0;
  background: var(--color-background-soft);
  box-shadow: var(--box-shadow-base);
  border-bottom: 1px solid var(--border-color);
  .title {
    font-size: 40px;
    text-align: center;
    color: var(--ev-c-text-1);
  }

  .avator {
    position: absolute;
    right: 10px;
    display: flex;
    align-items: center;
    gap: 10px;
    cursor: pointer;

    .username {
      font-size: 14px;
      color: #666;
      font-weight: 500;
    }

    &:hover {
      .username {
        color: #409eff;
      }
    }
  }
}
@media screen and (max-width: 1920px) {
  .mainTitle {
    .title {
      font-size: 30px;
    }
  }
}
</style>
