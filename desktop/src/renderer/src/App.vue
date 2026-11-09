<script setup lang="ts">
import { onMounted, onUnmounted } from 'vue'
import NavBar from './components/NavBar/NavBar.vue'
import MainTitle from './components/MainTitle/MainTitle.vue'
import { useUserStore } from './store/user'
import { useChannelDataStore } from './store/channelDataStore'
import useAlarmDataStore from './store/alarmDataStore'
import { useThemeStore } from './store/theme'
import useParamSettingStore from './store/paramentSetting'

import AlarmNotification from '@renderer/components/AlarmNotification/AlarmNotification.vue'
import { useAlarmNotification } from '@renderer/components/AlarmNotification/useAlarmNotification'

const userStore = useUserStore()
const alarmDataStore = useAlarmDataStore()
const channelDataStore = useChannelDataStore()
const themeStore = useThemeStore()
const paramSettingStore = useParamSettingStore()

const { alarmState, hideAlarmNotification, acknowledgeAlarm, viewAlarmDetails } =
  useAlarmNotification()

// 应用启动时初始化用户状态
onMounted(async () => {
  userStore.initUserState()

  await paramSettingStore.loadSettings()
  // 设置IPC监听器
  channelDataStore.setupIpcListeners()

  try {
    await channelDataStore.initializeAndStart()
    // 不在启动时自动导入 analyze 目录的演示数据，以免覆盖实时采集结果。

    console.log('App: 数据采集系统初始化完成')
  } catch (error) {
    console.log('App: 数据采集系统初始化失败', error)
  }

  try {
    await alarmDataStore.initializeAllChannels()
    console.log('App: 报警数据系统初始化完成', alarmDataStore.channels)
  } catch (error) {
    console.log('App: 报警数据系统初始化失败', error)
  }

  // 初始化主题
  themeStore.loadSettings()
  themeStore.setupSystemThemeListener()
})
onUnmounted(() => {
  channelDataStore.removeIpcListeners()
  userStore.logout()
})
</script>

<template>
  <div class="mainBody">
    <div class="main_title">
      <MainTitle></MainTitle>
    </div>

    <div class="main">
      <div calss="nav">
        <NavBar></NavBar>
      </div>
      <div class="content">
        <router-view v-slot="{ Component, route }">
          <keep-alive>
            <component :is="Component" v-if="route.meta.KeepAlive" :key="route.fullPath" />
          </keep-alive>
          <component :is="Component" v-if="!route.meta.KeepAlive" key="route.fullPath"></component>
        </router-view>
        <!-- 报警通知组件 -->
        <AlarmNotification
          :visible="alarmState.visible"
          :alarm-data="alarmState.alarmData!"
          @close="hideAlarmNotification"
          @acknowledge="acknowledgeAlarm"
          @view-details="viewAlarmDetails"
          v-if="alarmState.alarmData"
        />
      </div>
    </div>
  </div>
</template>

<style lang="less" scoped>
.mainBody {
  height: 100vh;
  overflow: hidden;
  display: flex;
  flex-direction: column;
  background: var(--color-background);
  user-select: none;
  .main_title {
  }
  .main {
    flex: 1;
    overflow: hidden;
    display: flex;
    .nav {
      box-shadow: var(--box-shadow-base);
    }
    .content {
      flex: 1;
      overflow: hidden; // 确保内容区域也不产生滚动条
      display: flex; // 让子组件能够正确填充
      flex-direction: column;
    }
  }
}
</style>
