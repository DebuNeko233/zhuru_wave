<template>
  <div class="record-page">
    <!-- 页面标题 -->
    <div class="page-header">
      <h1 class="page-title">
        <RecordIcon />
        记录页面
      </h1>
      <p class="page-subtitle">实时监控设备状态，及时发现并处理异常情况</p>
    </div>

    <!-- 报警列表 -->
    <div class="alarm-section">
      <div class="section-header">
        <div class="section-title">
          <svg class="warning-icon" viewBox="0 0 24 24" width="20" height="20">
            <path
              fill="#ff4757"
              d="M12 2L1 21h22L12 2zm0 3.99L19.53 19H4.47L12 5.99zM11 16h2v2h-2v-2zm0-6h2v4h-2v-4z"
            />
          </svg>
          <span>实时报警列表</span>
        </div>
        <div class="current-channel">
          <span>当前通道：</span>

          <el-dropdown @command="handleCommand" trigger="click" size="large">
            <span class="el-dropdown-link">
              通道{{ currentChannel
              }}<el-icon class="el-icon--right" size="20"
                ><svg
                  t="1755521041838"
                  class="icon"
                  viewBox="0 0 1024 1024"
                  version="1.1"
                  xmlns="http://www.w3.org/2000/svg"
                  p-id="20399"
                  width="200"
                  height="200"
                >
                  <path
                    d="M722.773333 381.44a64 64 0 0 1 90.453334 90.453333l-252.970667 253.013334a68.266667 68.266667 0 0 1-96.512 0l-253.013333-253.013334a64 64 0 0 1 90.538666-90.453333L512 592.128l210.773333-210.773333z"
                    fill="#707070"
                    p-id="20400"
                    data-spm-anchor-id="a313x.search_index.0.i14.17373a81YajFjc"
                    class="selected"
                  ></path></svg
              ></el-icon>
            </span>
            <template #dropdown>
              <el-dropdown-menu>
                <el-dropdown-item command="1">通道1</el-dropdown-item>
                <el-dropdown-item command="2">通道2</el-dropdown-item>
                <el-dropdown-item command="3">通道3</el-dropdown-item>
                <el-dropdown-item command="4">通道4</el-dropdown-item>
              </el-dropdown-menu>
            </template>
          </el-dropdown>
        </div>
      </div>

      <!-- 表格 -->
      <div class="alarm-table">
        <div class="table-header">
          <div class="header-cell alarm-label">报警标题</div>
          <div class="header-cell filename">文件名</div>
          <div class="header-cell channel">报警通道</div>
          <div class="header-cell description">描述</div>
          <div class="header-cell current-duration">最高电压</div>
          <div class="header-cell current-value">最低电压</div>
          <div class="header-cell current-threshold">平均电压</div>
          <div class="header-cell current-deviationValue">偏差值</div>
          <div class="header-cell current-rangeValue">区间值</div>
          <div class="header-cell time">时间</div>
          <div class="header-cell actions">操作</div>
        </div>

        <div class="table-body">
          <div v-for="alarm in alarmList" :key="alarm.id" class="table-row">
            <div class="body-cell alarm-label">
              <span class="alarm-badge critical" :class="alarm.severity">{{
                alarm.severity === 'warning' ? '中风险' : '高风险'
              }}</span>
            </div>
            <div class="body-cell filename">
              <span class="filename-text" :title="alarm.fileName" :data-full-name="alarm.fileName">
                {{ alarm.fileName }}
              </span>
            </div>
            <div class="body-cell channel">{{ alarm.channelId }}</div>
            <div class="body-cell description">{{ alarm.analysisConclusion }}</div>
            <div class="body-cell current-duration">
              <span class="value-text">{{ alarm.snapshotData.statistics.peakVoltage }}</span>
            </div>
            <div class="body-cell current-value">
              <span class="value-text">{{ alarm.snapshotData.statistics.minimumVoltage }}</span>
            </div>
            <div class="body-cell current-threshold">
              <span class="value-text">{{ alarm.snapshotData.statistics.averageVoltage }}</span>
            </div>
            <div class="body-cell current-deviationValue">
              <span class="value-text">{{ alarm.snapshotData.statistics.deviation }}</span>
            </div>
            <div class="body-cell current-rangeValue">
              <span class="value-text">{{ alarm.snapshotData.statistics.range }}</span>
            </div>

            <div class="body-cell time">
              <svg class="time-icon" viewBox="0 0 24 24" width="16" height="16">
                <path
                  fill="#666"
                  d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm0 18c-4.41 0-8-3.59-8-8s3.59-8 8-8 8 3.59 8 8-3.59 8-8 8zm.5-13H11v6l5.25 3.15.75-1.23-4.5-2.67V7z"
                />
              </svg>
              <span>{{ formatDate(alarm.timestamp) }}</span>
            </div>
            <div class="body-cell actions">
              <button class="action-btn view-btn" @click="viewAlarm(alarm)">
                <svg viewBox="0 0 24 24" width="16" height="16">
                  <path
                    fill="currentColor"
                    d="M12 4.5C7 4.5 2.73 7.61 1 12c1.73 4.39 6 7.5 11 7.5s9.27-3.11 11-7.5c-1.73-4.39-6-7.5-11-7.5zM12 17c-2.76 0-5-2.24-5-5s2.24-5 5-5 5 2.24 5 5-2.24 5-5 5zm0-8c-1.66 0-3 1.34-3 3s1.34 3 3 3 3-1.34 3-3-1.34-3-3-3z"
                  />
                </svg>
                查看
              </button>
              <button class="action-btn delete-btn" @click="deleteAlarm(alarm)">
                <svg viewBox="0 0 24 24" width="16" height="16">
                  <path
                    fill="currentColor"
                    d="M6 19c0 1.1.9 2 2 2h8c1.1 0 2-.9 2-2V7H6v12zM19 4h-3.5l-1-1h-5l-1 1H5v2h14V4z"
                  />
                </svg>
                删除
              </button>
            </div>
          </div>
        </div>
      </div>

      <!-- 分页 -->
      <div class="pagination">
        <span class="pagination-info"
          >显示第 {{ startIndex }} 到 {{ endIndex }} 条，共
          {{ currentchannelState.totalCount }} 条记录</span
        >
        <div class="pagination-controls">
          <el-pagination
            :currentPage="currentchannelState.currentPage"
            :page-size="currentchannelState.pageSize"
            layout="prev, pager, next"
            :total="currentchannelState.totalCount"
            @current-change="handlePageChange"
          />
        </div>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, computed, onMounted, onUnmounted } from 'vue'
import { ElMessageBox, ElMessage } from 'element-plus'
import { useRouter } from 'vue-router'

import RecordIcon from '@renderer/assets/iconComponents/RecordIcon.vue'
import useAlarmDataStore from '@renderer/store/alarmDataStore'
import { formatDate } from '@renderer/utils/common'
import type { ChannelAlarmState, AlarmFileData } from '@renderer/types/alarmData'

const router = useRouter()

const alarmDataStore = useAlarmDataStore()
const currentChannel = ref(1)

const startIndex = computed(
  () => (currentchannelState.value.currentPage - 1) * currentchannelState.value.pageSize + 1
)
const endIndex = computed(() =>
  Math.min(
    currentchannelState.value.currentPage * currentchannelState.value.pageSize,
    currentchannelState.value.totalCount
  )
)

// 窗口尺寸响应变量
const windowHeight = ref(window.innerHeight)
const windowWidth = ref(window.innerWidth)

const calculatePageSize = () => {
  // 计算可用高度（减去页面标题、分页等固定元素的高度）
  const headerHeight = 200 // 页面标题区域高度
  const sectionHeaderHeight = 80 // 报警列表标题区域高度
  const paginationHeight = 80 // 分页区域高度
  const itemHeight = 60 // 每个报警项的高度
  const padding = 40 // 额外的内边距
  const restHeight = 200
  const availableHeight =
    windowHeight.value -
    headerHeight -
    sectionHeaderHeight -
    paginationHeight -
    padding -
    restHeight
  console.log('availableHeight', availableHeight)
  // 计算可以显示的行数
  const maxRows = Math.floor(availableHeight / itemHeight)

  // 设置最小和最大值
  const minPageSize = 4
  const maxPageSize = 15

  // 根据窗口宽度调整（小屏幕显示更少数据）
  let adjustedPageSize = maxRows
  if (windowWidth.value < 768) {
    adjustedPageSize = Math.max(minPageSize, Math.floor(maxRows * 0.7))
  } else if (windowWidth.value < 1200) {
    adjustedPageSize = Math.max(minPageSize, Math.floor(maxRows * 0.85))
  }

  return Math.min(Math.max(adjustedPageSize, minPageSize), maxPageSize)
}

// 窗口大小变化处理函数
const handleResize = () => {
  windowHeight.value = window.innerHeight
  windowWidth.value = window.innerWidth
  console.log('windowHeight', windowHeight.value)
  console.log('windowWidth', windowWidth.value)

  const newPageSize = calculatePageSize()
  alarmDataStore.setPageSize(currentChannel.value, newPageSize)
}

// 报警数据
const alarmList = computed(() => {
  return alarmDataStore.getAlarmList(currentChannel.value)
})

// 当前通道状态
const currentchannelState = computed<ChannelAlarmState>(() => {
  return alarmDataStore.getChannelState(currentChannel.value)
})

const handleCommand = (command) => {
  ElMessage({
    message: `切换到通道${command}的缺陷报警列表`,
    type: 'success'
  })
  currentChannel.value = command

  // 切换通道时重新计算页面大小
  const newPageSize = calculatePageSize()
  alarmDataStore.setPageSize(currentChannel.value, newPageSize)
}

const handlePageChange = async (page: number) => {
  await alarmDataStore.goToPage(currentChannel.value, page)
}

// 操作方法
const viewAlarm = (alarm: AlarmFileData) => {
  // 这里可以添加查看详情的逻辑
  router.push({
    path: `/channel/${currentChannel.value}`,
    query: {
      alarm: JSON.stringify(alarm)
    }
  })
}

const deleteAlarm = (alarm: AlarmFileData) => {
  ElMessageBox.confirm('确定要删除吗?', '删除确认', {
    confirmButtonText: '是的，删除', // 确认按钮文字
    cancelButtonText: '取消', // 取消按钮文字
    type: 'warning' // 弹窗类型（可选: warning, info, success, error）
  })
    .then(async () => {
      const index = alarmList.value.findIndex((item) => item.id === alarm.id)
      if (index > -1) {
        alarmList.value.splice(index, 1)
      }
      // 调用删除文件的 API
      await window.electronAPI.invoke('fs:delete-alarm-file', alarm.filePath)

      ElMessage({
        message: '删除成功',
        type: 'success'
      })

      // 重置列表
      alarmDataStore.refreshCurrentPage(currentChannel.value)
    })
    .catch(() => {
      // catch error
    })
}

// 组件挂载时的初始化
onMounted(() => {
  // 初始设置页面大小
  const initialPageSize = calculatePageSize()
  alarmDataStore.setPageSize(currentChannel.value, initialPageSize)

  // 添加窗口大小变化监听器
  window.addEventListener('resize', handleResize)
})

// 组件卸载时清理监听器
onUnmounted(() => {
  window.removeEventListener('resize', handleResize)
})
</script>

<style scoped lang="less">
.record-page {
  padding: 24px;
  background: #f5f7fa;
  min-height: 100vh;
}

.page-header {
  margin-bottom: 32px;
  display: flex;
  flex-direction: column;
  align-items: center;
  .page-title {
    font-size: 35px;
    font-weight: 600;
    display: flex;
    align-items: center;
    color: #2c3e50;
    margin: 0 0 8px 0;
  }

  .page-subtitle {
    font-size: 16px;
    color: #7f8c8d;
    margin: 0;
  }
}

.alarm-section {
  background: white;
  border-radius: 12px;
  box-shadow: 0 2px 12px rgba(0, 0, 0, 0.08);
  overflow: hidden;
}

.section-header {
  padding: 20px 24px;
  border-bottom: 1px solid #eee;
  display: flex;
  justify-content: space-between;
  align-items: center;
  .section-title {
    display: flex;
    align-items: center;
    gap: 8px;
    font-size: 18px;
    font-weight: 600;
    color: #2c3e50;

    .warning-icon {
      flex-shrink: 0;
    }
  }
  .current-channel {
    display: flex;
    align-items: center;
    span {
      font-size: 18px;
      font-weight: 500;
    }
    .el-dropdown-link {
      display: flex;
      align-items: center;
      font-size: 17px;
      font-weight: 500;
      cursor: pointer;
      padding: 8px 12px;
      border-radius: 6px;
      border: 1px solid #ebebeb;
      transition: all 0.2s ease;
    }
  }
}

.alarm-table {
  .table-header {
    display: grid;
    /* 优化列宽分配，确保内容不会溢出 */
    grid-template-columns:
      minmax(80px, 0.8fr) /* 报警标题 */
      minmax(200px, 2.5fr) /* 文件名 - 增加最小宽度 */
      minmax(80px, 0.8fr) /* 报警通道 */
      minmax(120px, 1.2fr) /* 描述 */
      minmax(100px, 1fr) /* 最高电压 */
      minmax(100px, 1fr) /* 最低电压 */
      minmax(100px, 1fr) /* 平均电压 */
      minmax(80px, 1fr) /* 偏差值 */
      minmax(80px, 1fr) /* 区间值 */
      minmax(120px, 1.2fr) /* 时间 */
      minmax(120px, 1.2fr); /* 操作 */
    gap: 0;
    border-bottom: 1px solid #eee;

    .header-cell {
      padding: 16px 8px; /* 减少左右padding */
      font-weight: 600;
      color: #555;
      font-size: 14px;
      overflow: hidden;
      text-overflow: ellipsis;
      white-space: nowrap;
    }
  }

  .table-body {
    .table-row {
      display: grid;
      /* 与表头保持完全一致的列宽 */
      grid-template-columns:
        minmax(80px, 0.8fr)
        minmax(200px, 2.5fr)
        minmax(80px, 0.8fr)
        minmax(120px, 1.2fr)
        minmax(100px, 1fr)
        minmax(100px, 1fr)
        minmax(100px, 1fr)
        minmax(80px, 1fr)
        minmax(80px, 1fr)
        minmax(120px, 1.2fr)
        minmax(120px, 1.2fr);
      gap: 0;
      border-bottom: 1px solid #f0f0f0;
      transition: background-color 0.2s;

      &:hover {
        background: #f8f9fa;
      }

      .body-cell {
        padding: 16px 8px; /* 与表头保持一致 */
        display: flex;
        align-items: center;
        font-size: 14px;
        overflow: hidden;

        &.alarm-label {
          gap: 12px;

          .alarm-badge {
            padding: 4px 8px;
            border-radius: 4px;
            font-size: 12px;
            font-weight: 500;
            white-space: nowrap;

            &.critical {
              background: #fee;
              color: #d63031;
              border: 1px solid #fab1a0;
            }

            &.warning {
              background: #fff8e1;
              color: #f39c12;
              border: 1px solid #f1c40f;
            }
          }

          .alarm-title {
            font-weight: 500;
            color: #2c3e50;
          }
        }

        &.description {
          color: #666;
          line-height: 1.4;
        }

        &.type {
          .type-badge {
            display: flex;
            align-items: center;
            gap: 6px;
            padding: 4px 8px;
            background: #f8f9fa;
            border-radius: 4px;

            .type-icon {
              flex-shrink: 0;
            }
          }
        }

        &.current-value {
          .value-text {
            font-weight: 600;
            color: #2c3e50;
          }
        }

        &.time {
          gap: 6px;
          color: #666;

          .time-icon {
            flex-shrink: 0;
          }
        }

        &.actions {
          gap: 8px;

          .action-btn {
            display: flex;
            align-items: center;
            gap: 4px;
            padding: 6px 12px;
            border: none;
            border-radius: 4px;
            font-size: 12px;
            cursor: pointer;
            transition: all 0.2s;

            svg {
              flex-shrink: 0;
            }

            &.view-btn {
              background: #e3f2fd;
              color: #1976d2;

              &:hover {
                background: #bbdefb;
              }
            }

            &.delete-btn {
              background: #ffebee;
              color: #d32f2f;

              &:hover {
                background: #ffcdd2;
              }
            }
          }
        }
      }

      /* 处理文件名过长的问题 */
      &.filename {
        .filename-text {
          overflow: hidden;
          text-overflow: ellipsis;
          white-space: nowrap;
          max-width: 100%;
          title: attr(data-full-name); /* 添加悬停提示 */
        }
      }

      /* 其他单元格也添加溢出处理 */
      .value-text {
        overflow: hidden;
        text-overflow: ellipsis;
        white-space: nowrap;
        max-width: 100%;
      }
    }
  }
}

.pagination {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 20px 24px;
  border-top: 1px solid #eee;

  .pagination-info {
    color: #666;
    font-size: 14px;
  }

  .pagination-controls {
    display: flex;
    align-items: center;
    gap: 16px;

    .pagination-btn {
      padding: 8px 16px;
      border: 1px solid #ddd;
      background: white;
      border-radius: 4px;
      cursor: pointer;
      font-size: 14px;
      transition: all 0.2s;

      &:hover:not(:disabled) {
        background: #f5f5f5;
        border-color: #bbb;
      }

      &:disabled {
        opacity: 0.5;
        cursor: not-allowed;
      }
    }

    .page-info {
      font-size: 14px;
      color: #666;
    }
  }
}

// @media screen and (max-width: 1920px) {
//   .alarm-table {
//     .table-header {
//       display: grid;
//       grid-template-columns: 1fr 2.5fr 1.5fr 2fr 1fr 1fr 1fr 1fr 1fr 1.5fr 1.5fr;
//     }
//     .table-body {
//       display: grid;
//       .table-row {
//         grid-template-columns: 1fr 2.5fr 1.5fr 2fr 1fr 1fr 1fr 1fr 1fr 1.5fr 1.5fr;
//       }
//     }
//   }
// }
</style>
