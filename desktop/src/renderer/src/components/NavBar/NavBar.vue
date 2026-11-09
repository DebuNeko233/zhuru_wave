<template>
  <el-menu
    default-active="1-1"
    class="el-menu-vertical-demo"
    :collapse="isCollapse"
    @select="handleSelect"
  >
    <el-sub-menu index="1">
      <template #title>
        <el-icon>
          <IconMenu />
        </el-icon>
        <span>通道</span>
      </template>
      <el-menu-item index="1-1">总页面</el-menu-item>
      <el-menu-item index="1-2">通道X1</el-menu-item>
      <el-menu-item index="1-3">通道X2</el-menu-item>
      <el-menu-item index="1-4">通道Y1</el-menu-item>
      <el-menu-item index="1-5">通道Y2</el-menu-item>
      <el-menu-item index="1-6">XY 李萨如</el-menu-item>
    </el-sub-menu>
    <el-menu-item index="2">
      <el-icon size="25">
        <WarnTriangleFilled />
      </el-icon>
      <template #title>报警记录</template>
    </el-menu-item>
    <el-menu-item index="3">
      <el-icon size="25">
        <document />
      </el-icon>
      <template #title>日志</template>
    </el-menu-item>
    <el-menu-item index="4">
      <el-icon size="25">
        <setting />
      </el-icon>
      <template #title>设置</template>
    </el-menu-item>
    <el-menu-item @click="resumeAlarm" index="5">
      <el-switch
        v-model="alarmFlag"
        class="ml-2"
        style="--el-switch-on-color: #13ce66; --el-switch-off-color: #ff4949"
      />
      <template #title>恢复报警</template>
    </el-menu-item>
  </el-menu>
</template>

<script lang="ts" setup>
import { ref } from 'vue'
import { Document, Menu as IconMenu, WarnTriangleFilled, Setting } from '@element-plus/icons-vue'
import { useRouter } from 'vue-router'
import { useAlarmNotification, alarmFlag } from '../AlarmNotification/useAlarmNotification'

const router = useRouter()
const { resumeAlarm } = useAlarmNotification()

const menuRouteMap: Record<string, string> = {
  '1-1': '/', // 主页面
  '1-2': '/channel/1',
  '1-3': '/channel/2',
  '1-4': '/channel/3',
  '1-5': '/channel/4',
  '1-6': '/lissajous',
  '2': '/record', // 报警记录
  '3': '/logs', // 日志
  '4': '/Setting' // 设置
}

const isCollapse = ref(true)

const handleSelect = (key: string): void => {
  const targetRoute = menuRouteMap[key]
  if (targetRoute) {
    router.push(targetRoute)
  }
}
</script>

<style>
.el-menu-vertical-demo {
  height: 100%;
  border-right: 0 !important;
}

.el-menu-vertical-demo:not(.el-menu--collapse) {
  width: 150px;
}
</style>
