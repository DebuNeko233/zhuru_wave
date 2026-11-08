<template>
  <LoadingOverlay v-if="logStore.isLoading" :visible="logStore.isLoading"></LoadingOverlay>
  <div class="logs-container" v-else>
    <!-- 头部工具栏 -->
    <div class="logs-header">
      <div class="header-left">
        <h2 class="logs-title">
          <el-icon><Document /></el-icon>
          系统日志
        </h2>
        <el-badge :value="logs.length" class="logs-count" type="info" />
      </div>

      <div class="header-right">
        <!-- 搜索框 -->
        <el-input
          v-model="searchKeyword"
          placeholder="搜索日志内容... (Ctrl+F)"
          class="search-input"
          clearable
        >
          <template #prefix>
            <el-icon><Search /></el-icon>
          </template>
        </el-input>

        <!-- 级别筛选 -->
        <el-select v-model="selectedLevel" placeholder="日志级别" class="level-select" clearable>
          <el-option
            v-for="item in visibInfo"
            :key="item.value"
            :label="item.label"
            :value="item.value"
          />
        </el-select>

        <!--  高级过滤-->
        <!-- <el-popover
          placement="bottom"
          title="高级过滤"
          width="320"
          trigger="click"
        >
          <template #reference>
            <el-button :icon="Filter">高级过滤</el-button>
          </template>
          
          <div class="advanced-filter">
            <el-form label-width="80px" size="small">
              <el-form-item label="时间范围">
                <el-date-picker
                  v-model="dateRange"
                  type="datetimerange"
                  range-separator="至"
                  start-placeholder="开始时间"
                  end-placeholder="结束时间"
                  size="small"
                  style="width: 100%"
                />
              </el-form-item>
              
              <el-form-item label="来源">
                <el-select v-model="selectedSources" multiple size="small" style="width: 100%">
                  <el-option
                    v-for="source in uniqueSources"
                    :key="source"
                    :label="source"
                    :value="source"
                  />
                </el-select>
              </el-form-item>
              
              <el-form-item>
                <el-button type="primary" size="small" @click="applyAdvancedFilter">
                  应用过滤
                </el-button>
                <el-button size="small" @click="resetAdvancedFilter">
                  重置
                </el-button>
              </el-form-item>
            </el-form>
          </div>
        </el-popover> -->

        <!-- 操作按钮 -->
        <el-button-group>
          <el-tooltip content="刷新 (Ctrl+R)">
            <el-button @click="refreshLogs" :icon="Refresh" />
          </el-tooltip>
          <el-tooltip content="清空日志">
            <el-button @click="clearLogs" :icon="Delete" type="danger" />
          </el-tooltip>
          <el-tooltip content="导出日志 (Ctrl+E)">
            <el-button @click="exportLogs" :icon="Download" />
          </el-tooltip>
        </el-button-group>
      </div>
    </div>

    <!-- 统计卡片 -->
    <div class="stats-cards" v-if="isAdmin">
      <div class="stat-card info">
        <div class="stat-icon">
          <el-icon><InfoFilled /></el-icon>
        </div>
        <div class="stat-content">
          <div class="stat-number">{{ getLogCount('info') }}</div>
          <div class="stat-label">信息</div>
        </div>
      </div>

      <div class="stat-card warning">
        <div class="stat-icon">
          <el-icon><WarningFilled /></el-icon>
        </div>
        <div class="stat-content">
          <div class="stat-number">{{ getLogCount('warn') }}</div>
          <div class="stat-label">警告</div>
        </div>
      </div>

      <div class="stat-card error">
        <div class="stat-icon">
          <el-icon><CircleCloseFilled /></el-icon>
        </div>
        <div class="stat-content">
          <div class="stat-number">{{ getLogCount('error') }}</div>
          <div class="stat-label">错误</div>
        </div>
      </div>

      <div class="stat-card debug">
        <div class="stat-icon">
          <el-icon><Tools /></el-icon>
        </div>
        <div class="stat-content">
          <div class="stat-number">{{ getLogCount('debug') }}</div>
          <div class="stat-label">调试</div>
        </div>
      </div>
    </div>

    <!-- 主要内容区域 -->
    <div class="main-content">
      <!-- 日志内容区域 -->
      <div class="logs-content">
        <el-scrollbar class="logs-scrollbar">
          <div class="logs-timeline">
            <div
              v-for="(log, index) in paginatedLogs"
              :key="log.id"
              class="log-item"
              :style="{ animationDelay: `${index * 0.1}s` }"
              @click="showLogDetail(log)"
            >
              <div class="timeline-dot" :class="`dot-${log.level}`">
                <el-icon v-if="log.level === 'info'"><InfoFilled /></el-icon>
                <el-icon v-else-if="log.level === 'warn'"><WarningFilled /></el-icon>
                <el-icon v-else-if="log.level === 'error'"><CircleCloseFilled /></el-icon>
                <el-icon v-else><Tools /></el-icon>
              </div>

              <div class="log-content">
                <div class="log-header">
                  <div class="log-meta">
                    <el-tag :type="getLogTypeTag(log.level)" size="small">
                      {{ log.level.toUpperCase() }}
                    </el-tag>
                    <span class="log-source">{{ log.source }}</span>
                    <span class="log-time">{{ formatTime(log.timestamp) }}</span>
                  </div>

                  <div class="log-actions">
                    <el-button size="small" text @click.stop="copyLog(log)" :icon="CopyDocument" />
                    <el-button size="small" text @click.stop="shareLog(log)" :icon="Share" />
                  </div>
                </div>

                <div class="log-message" v-html="highlightKeyword(log.message)"></div>

                <div v-if="log.details" class="log-details">
                  <el-collapse>
                    <el-collapse-item title="详细信息">
                      <pre>{{ log.details }}</pre>
                    </el-collapse-item>
                  </el-collapse>
                </div>
              </div>
            </div>

            <!-- 空状态 -->
            <el-empty v-if="filteredLogs.length === 0" description="暂无日志数据" />
          </div>
        </el-scrollbar>

        <!-- 分页 -->
        <div class="pagination-container" v-if="filteredLogs.length > pageSize">
          <el-pagination
            v-model:current-page="currentPage"
            :page-size="pageSize"
            :total="filteredLogs.length"
            layout="prev, pager, next, jumper, total"
            background
          />
        </div>
      </div>

      <!-- 图表区域 -->
      <div class="charts-section">
        <div class="charts-header">
          <div class="charts-title">
            <el-icon><DataAnalysis /></el-icon>
            <span>数据分析</span>
            <el-tag size="small" type="info">{{ logs.length }}条日志</el-tag>
          </div>
        </div>
        <el-scrollbar class="logs-scrollbar">
          <div class="charts-content">
            <!-- 日志趋势图 -->
            <div class="chart-container trend-container">
              <div class="chart-header">
                <h3>
                  <el-icon><TrendCharts /></el-icon>
                  日志趋势
                </h3>
                <div class="chart-controls">
                  <el-radio-group v-model="trendTimeRange" size="small">
                    <el-radio-button value="1h">1小时</el-radio-button>
                    <el-radio-button value="6h">6小时</el-radio-button>
                    <el-radio-button value="24h">24小时</el-radio-button>
                    <el-radio-button value="7d">7天</el-radio-button>
                  </el-radio-group>
                </div>
              </div>

              <!-- 将原来的SVG图表部分替换为 -->
              <div class="trend-chart">
                <div class="chart-content">
                  <!-- ECharts趋势图 -->
                  <div class="echarts-trend-chart">
                    <VChart
                      class="trend-chart-container"
                      :option="trendChartOption"
                      :autoresize="true"
                      @click="onChartClick"
                      @mouseover="onChartMouseover"
                      @mouseout="onChartMouseout"
                    />
                  </div>
                </div>
              </div>
            </div>

            <div class="secondColumn">
              <!-- 级别分布饼图 -->
              <div class="chart-container pie-container">
                <div class="chart-header">
                  <h3>
                    <el-icon
                      ><svg
                        t="1760686084635"
                        class="icon"
                        viewBox="0 0 1024 1024"
                        version="1.1"
                        xmlns="http://www.w3.org/2000/svg"
                        p-id="8257"
                        width="200"
                        height="200"
                      >
                        <path
                          d="M1006.344 441.38c0-234.02-189.704-423.724-423.724-423.724V441.38h423.724z"
                          fill="#FFC117"
                          p-id="8258"
                        ></path>
                        <path
                          d="M494.344 335.448V52.966c-263.274 0-476.69 213.416-476.69 476.69h282.482c0.002-107.256 86.954-194.208 194.208-194.208z"
                          fill="#F5F1EF"
                          p-id="8259"
                        ></path>
                        <path
                          d="M688.552 529.656c0 107.256-86.952 194.206-194.206 194.206v282.482c263.274 0 476.69-213.416 476.69-476.69H688.552z"
                          fill="#DEDAD8"
                          p-id="8260"
                        ></path>
                        <path
                          d="M300.138 529.656H17.656c0 263.274 213.416 476.69 476.69 476.69V723.862c-107.256 0-194.208-86.952-194.208-194.206z"
                          fill="#55A9DB"
                          p-id="8261"
                        ></path>
                        <path
                          d="M582.62 0c-9.746 0-17.656 7.91-17.656 17.656V441.38c0 9.746 7.91 17.656 17.656 17.656h423.724c9.746 0 17.656-7.91 17.656-17.656C1023.736 197.72 826.28 0.264 582.62 0z m17.656 423.724V35.682c210.29 9.428 378.616 177.752 388.044 388.044H600.276z"
                          fill=""
                          p-id="8262"
                        ></path>
                        <path
                          d="M776.828 353.104h35.31v35.31h-35.31zM706.206 353.104h35.31v35.31h-35.31zM635.586 353.104h35.31v35.31h-35.31z"
                          fill=""
                          p-id="8263"
                        ></path>
                        <path
                          d="M494.344 1024c272.896-0.318 494.028-221.448 494.344-494.344 0-9.746-7.91-17.656-17.656-17.656h-282.48c-9.746 0-17.656 7.91-17.656 17.656 0 97.51-79.042 176.552-176.552 176.552s-176.552-79.042-176.552-176.552 79.042-176.552 176.552-176.552c9.746 0 17.656-7.91 17.656-17.656V52.966c0-9.746-7.91-17.656-17.656-17.656C221.326 35.31 0 256.636 0 529.656S221.326 1024 494.344 1024z m211.14-476.69h247.56C943.51 786.82 751.51 978.768 512 988.248V740.67c102.982-8.722 184.708-90.378 193.484-193.36z m-228.794 193.306v247.632c-239.474-9.498-431.44-201.464-440.938-440.938h247.632c8.72 102.93 90.376 184.586 193.306 193.306z m0-669.66v247.56c-102.982 8.774-184.638 90.5-193.36 193.484H35.752C45.232 272.49 237.18 80.49 476.69 70.956z"
                          fill=""
                          p-id="8264"
                        ></path>
                        <path
                          d="M105.932 370.758h52.966v35.31H105.932zM105.932 441.38h141.242v35.31H105.932zM741.518 582.62h52.966v35.31h-52.966zM741.518 653.242h141.242v35.31h-141.242zM211.862 706.206h52.966v35.31h-52.966zM211.862 776.828h141.242v35.31h-141.242z"
                          fill=""
                          p-id="8265"
                        ></path></svg
                    ></el-icon>
                    级别分布
                  </h3>
                  <div class="chart-controls">
                    <el-switch
                      v-model="showPercentage"
                      active-text="百分比"
                      inactive-text="数量"
                      size="small"
                    />
                  </div>
                </div>

                <div class="pie-chart">
                  <div class="pie-visual">
                    <!-- SVG 饼图 -->
                    <svg viewBox="0 0 200 200" class="pie-svg">
                      <circle
                        cx="100"
                        cy="100"
                        r="80"
                        fill="none"
                        stroke="#f0f0f0"
                        stroke-width="20"
                      />

                      <!-- 动态饼图段 -->
                      <circle
                        v-for="(segment, index) in pieSegments"
                        :key="segment.level"
                        cx="100"
                        cy="100"
                        r="80"
                        fill="none"
                        :stroke="segment.color"
                        stroke-width="20"
                        :stroke-dasharray="`${segment.percentage * 5.02} 502`"
                        :stroke-dashoffset="segment.offset"
                        :style="{ animationDelay: `${index * 0.2}s` }"
                        class="pie-segment"
                      />

                      <!-- 中心文字 -->
                      <text x="100" y="95" text-anchor="middle" class="pie-center-text">
                        <tspan class="pie-total">{{ logs.length }}</tspan>
                      </text>
                      <text x="100" y="115" text-anchor="middle" class="pie-center-label">
                        <tspan>总日志</tspan>
                      </text>
                    </svg>
                  </div>

                  <!-- 图例 -->
                  <div class="pie-legend">
                    <div v-for="item in levelStats" :key="item.level" class="legend-item">
                      <div class="legend-color" :style="{ backgroundColor: item.color }"></div>
                      <span class="legend-label">{{ item.label }}</span>
                      <span class="legend-value">
                        {{ showPercentage ? `${item.percentage}%` : item.count }}
                      </span>
                    </div>
                  </div>
                </div>
              </div>

              <!-- 实时活动监控 -->
              <div class="chart-container activity-container">
                <div class="chart-header">
                  <h3>
                    <el-icon><Monitor /></el-icon>
                    实时活动
                  </h3>
                  <div class="activity-status">
                    <el-tag :type="isRealTimeActive ? 'success' : 'info'" size="small">
                      {{ isRealTimeActive ? '实时监控中' : '已暂停' }}
                    </el-tag>
                  </div>
                </div>

                <div class="activity-chart">
                  <!-- 实时日志流 -->
                  <div
                    v-for="activity in recentActivities"
                    :key="activity.id"
                    class="activity-item"
                    :class="activity.level"
                  >
                    <div class="activity-time">{{ formatActivityTime(activity.timestamp) }}</div>
                    <div class="activity-content">
                      <el-icon class="activity-icon">
                        <InfoFilled v-if="activity.level === 'info'" />
                        <WarningFilled v-else-if="activity.level === 'warn'" />
                        <CircleCloseFilled v-else-if="activity.level === 'error'" />
                        <Tools v-else />
                      </el-icon>
                      <span class="activity-message">{{ activity.message }}</span>
                    </div>
                    <div class="activity-pulse"></div>
                  </div>
                </div>
              </div>
            </div>

            <!-- 来源分析 -->
            <div class="chart-container source-container">
              <div class="chart-header">
                <h3>
                  <el-icon><DataAnalysis /></el-icon>
                  来源分析
                </h3>
              </div>

              <div class="source-chart">
                <div class="source-bars">
                  <div v-for="source in sourceStats" :key="source.name" class="source-bar">
                    <div class="bar-container">
                      <div
                        class="bar-fill"
                        :style="{ width: `${source.percentage}%` }"
                        :class="`bar-${source.level}`"
                      ></div>
                    </div>
                    <div class="bar-info">
                      <span class="bar-label">{{ source.name }}</span>
                      <span class="bar-value">{{ source.count }}</span>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </el-scrollbar>
      </div>
    </div>

    <!-- 底部状态栏 -->
    <div class="logs-footer">
      <div class="footer-left">
        <span class="status-text">
          显示:{{ paginatedLogs.length }} / {{ filteredLogs.length }} / {{ logs.length }} 条日志
        </span>
        <!-- <el-switch
          v-model="autoRefresh"
          active-text="自动刷新"
          inactive-text="手动刷新"
          class="auto-refresh-switch"
        /> -->
      </div>

      <div class="footer-right">
        <span class="last-update">最后更新: {{ lastUpdateTime }}</span>
      </div>
    </div>

    <!-- 日志详情弹窗 -->
    <el-dialog
      v-model="showLogDetailDialog"
      title="日志详情"
      width="60%"
      :before-close="closeLogDetail"
      class="log-detail-dialog"
    >
      <div v-if="selectedLog" class="log-detail-content">
        <div class="detail-header">
          <el-tag :type="getLogTypeTag(selectedLog.level)" size="large">
            {{ selectedLog.level.toUpperCase() }}
          </el-tag>
          <span class="detail-time">{{ formatTime(selectedLog.timestamp) }}</span>
        </div>

        <div class="detail-body">
          <h4>消息内容</h4>
          <p class="detail-message">{{ selectedLog.message }}</p>

          <h4>来源</h4>
          <p class="detail-source">{{ selectedLog.source }}</p>

          <div v-if="selectedLog.details">
            <h4>详细信息</h4>
            <pre class="detail-stack">{{ selectedLog.details }}</pre>
          </div>

          <h4>时间戳</h4>
          <p class="detail-timestamp">{{ selectedLog.timestamp }}</p>
        </div>
      </div>

      <template #footer>
        <el-button @click="copyLogDetail">复制详情</el-button>
        <el-button type="primary" @click="closeLogDetail">关闭</el-button>
      </template>
    </el-dialog>
  </div>
</template>

<script setup lang="ts">
import { ref, computed, onMounted, onUnmounted, watch } from 'vue'
import {
  Document,
  Search,
  Refresh,
  Delete,
  Download,
  InfoFilled,
  WarningFilled,
  CircleCloseFilled,
  Tools,
  CopyDocument,
  Share,
  // Filter,
  TrendCharts,
  Monitor,
  DataAnalysis
} from '@element-plus/icons-vue'

import VChart from 'vue-echarts'
import { use } from 'echarts/core'
import { CanvasRenderer } from 'echarts/renderers'
import { LineChart, PieChart } from 'echarts/charts'
import {
  TitleComponent,
  TooltipComponent,
  LegendComponent,
  GridComponent
} from 'echarts/components'

// 注册必要的组件
use([
  CanvasRenderer,
  LineChart,
  PieChart,
  TitleComponent,
  TooltipComponent,
  LegendComponent,
  GridComponent
])

import { debounce } from 'lodash-es'
import { ElMessage, ElMessageBox } from 'element-plus'
import { useLogStore } from '@renderer/store/logStore'
import type { LogEntry } from '@renderer/types/log'
import LoadingOverlay from '../LoadingOverlay/LoadingOverlay.vue'
import { useUserStore } from '@renderer/store/user'

interface ActivityItem {
  id: string
  level: LogEntry['level']
  message: string
  timestamp: Date
}

// 级别统计
interface LevelStat {
  level: string
  label: string
  color: string
  count: number
  percentage: number
}

// 饼图段数据
interface PieSegment {
  level: string
  percentage: number
  color: string
  offset: number
}

// 修改来源统计
interface SourceStat {
  name: string
  count: number
  percentage: number
  level: 'error' | 'warning' | 'info'
}

let realtimeTimer: NodeJS.Timeout | null = null

const logStore = useLogStore()
const userStore = useUserStore()

// 基础状态
const searchKeyword = ref('')
const debouncedSearchKeyword = ref('')
const selectedLevel = ref('')
const selectedSources = ref<string[]>([])
const dateRange = ref<[Date, Date] | []>([])
const autoRefresh = ref(true)
const lastUpdateTime = ref('')
const currentPage = ref(1)
const pageSize = ref(20)
const showLogDetailDialog = ref(false)
const selectedLog = ref<LogEntry | null>(null)
let refreshTimer: NodeJS.Timeout | null = null

// 实时活动相关
const isRealTimeActive = ref(true)
const isAdmin = computed(() => userStore.userRole === 'admin')
const recentActivities = ref<ActivityItem[]>([])

// 图表相关
const activeTimeIndex = ref(-1)
const selectedPointIndex = ref(-1) // 添加这行

const visibInfo = computed(() => {
  if (isAdmin.value) {
    return [
      { label: '全部', value: '' },
      { label: '信息', value: 'info' },
      { label: '警告', value: 'warn' },
      { label: '错误', value: 'error' },
      { label: '调试', value: 'debug' }
    ]
  } else {
    return [{ label: '信息', value: 'info' }]
  }
})

const visibleLines = ref({
  total: isAdmin.value ? true : false,
  error: isAdmin.value ? true : false,
  warn: isAdmin.value ? true : false,
  info: true
})

const debouncedSearch = debounce((value: string) => {
  debouncedSearchKeyword.value = value
}, 300) // 300ms防抖

// 监听搜索关键词变化
watch(searchKeyword, (newValue) => {
  debouncedSearch(newValue)
})

const drillDownToLogs = (point: any) => {
  // 根据选中的数据点过滤日志
  console.log('钻取到日志详情:', point)
  // 可以在这里实现具体的日志过滤逻辑
  ElMessage.info(`查看 ${point.time} 的详细日志`)
}

const trendChartOption = computed(() => {
  const xAxisData = detailedTrendData.value.map((item) => item.date)
  const totalData = detailedTrendData.value.map((item) => item.total)
  const errorData = detailedTrendData.value.map((item) => item.error)
  const warnData = detailedTrendData.value.map((item) => item.warn)
  const infoData = detailedTrendData.value.map((item) => item.info)

  // 明确定义series类型
  const series: any[] = []

  if (visibleLines.value.total) {
    series.push({
      name: '总计',
      type: 'line',
      data: totalData,
      smooth: true,
      symbol: 'circle',
      symbolSize: 6,
      lineStyle: {
        color: '#4facfe',
        width: 3
      },
      itemStyle: {
        color: '#4facfe'
      },
      areaStyle: {
        color: {
          type: 'linear',
          x: 0,
          y: 0,
          x2: 0,
          y2: 1,
          colorStops: [
            { offset: 0, color: 'rgba(79, 172, 254, 0.3)' },
            { offset: 1, color: 'rgba(79, 172, 254, 0.1)' }
          ]
        }
      }
    })
  }

  if (visibleLines.value.error) {
    series.push({
      name: '错误',
      type: 'line',
      data: errorData,
      smooth: true,
      symbol: 'circle',
      symbolSize: 4,
      lineStyle: {
        color: '#ff6b6b',
        width: 2
      },
      itemStyle: {
        color: '#ff6b6b'
      }
    })
  }

  if (visibleLines.value.warn) {
    series.push({
      name: '警告',
      type: 'line',
      data: warnData,
      smooth: true,
      symbol: 'circle',
      symbolSize: 4,
      lineStyle: {
        color: '#feca57',
        width: 2
      },
      itemStyle: {
        color: '#feca57'
      }
    })
  }

  if (visibleLines.value.info) {
    series.push({
      name: '信息',
      type: 'line',
      data: infoData,
      smooth: true,
      symbol: 'circle',
      symbolSize: 4,
      lineStyle: {
        color: '#48cae4',
        width: 2
      },
      itemStyle: {
        color: '#48cae4'
      }
    })
  }

  return {
    title: {
      text: '趋势分析',
      left: 'center',
      textStyle: {
        fontSize: 16,
        fontWeight: 'bold',
        color: '#333'
      }
    },
    tooltip: {
      trigger: 'axis',
      backgroundColor: 'rgba(255, 255, 255, 0.95)',
      borderColor: '#e5e7eb',
      borderWidth: 1,
      textStyle: {
        color: '#333'
      },
      formatter: (params: any) => {
        let result = `<div style="font-weight: bold; margin-bottom: 8px;">${params[0].axisValue}</div>`
        params.forEach((param: any) => {
          const color = param.color
          result += `<div style="margin: 4px 0;">
            <span style="display: inline-block; width: 10px; height: 10px; background: ${color}; border-radius: 50%; margin-right: 8px;"></span>
            ${param.seriesName}: <strong>${param.value}</strong>
          </div>`
        })
        return result
      }
    },
    legend: {
      data: series.map((s) => s.name),
      bottom: 10,
      itemGap: 20
    },
    grid: {
      left: '3%',
      right: '4%',
      bottom: '15%',
      top: '15%',
      containLabel: true
    },
    xAxis: {
      type: 'category',
      data: xAxisData,
      boundaryGap: false,
      axisLine: {
        lineStyle: {
          color: '#e5e7eb'
        }
      },
      axisLabel: {
        color: '#6b7280',
        fontSize: 12
      }
    },
    yAxis: {
      type: 'value',
      axisLine: {
        lineStyle: {
          color: '#e5e7eb'
        }
      },
      axisLabel: {
        color: '#6b7280',
        fontSize: 12
      },
      splitLine: {
        lineStyle: {
          color: '#f3f4f6',
          type: 'dashed'
        }
      }
    },
    series
    // 移除 dataZoom 和 toolbox 配置以禁用缩放功能
  }
})

// ECharts事件处理
const onChartClick = (params: any) => {
  if (params.componentType === 'series') {
    const dataIndex = params.dataIndex
    const point = detailedTrendData.value[dataIndex]
    if (point) {
      selectedPointIndex.value = dataIndex
      drillDownToLogs({
        time: point.date,
        total: point.total,
        error: point.error,
        warn: point.warn,
        info: point.info
      })
    }
  }
}

const onChartMouseover = (params: any) => {
  if (params.componentType === 'series') {
    activeTimeIndex.value = params.dataIndex
  }
}

const onChartMouseout = () => {
  activeTimeIndex.value = -1
}
// 趋势时间范围
const trendTimeRange = ref('24')
const showPercentage = ref(false)

const logs = computed(() => logStore.roleLogs)

// 修改 detailedTrendData 计算属性，使用 store 中的 trendData
const detailedTrendData = computed(() => {
  return logStore.trendData.map((item) => ({
    date: item.date,
    total: item.count,
    error: item.errors,
    warn: item.warns,
    info: item.infos,
    debug: item.debugs
  }))
})

const levelStats = computed(() => {
  const storeStats = logStore.stats
  const stats: LevelStat[] = [
    { level: 'info', label: '信息', color: '#3498db', count: storeStats.info, percentage: 0 },
    { level: 'warning', label: '警告', color: '#f39c12', count: storeStats.warn, percentage: 0 },
    { level: 'error', label: '错误', color: '#e74c3c', count: storeStats.error, percentage: 0 },
    { level: 'debug', label: '调试', color: '#9b59b6', count: storeStats.debug, percentage: 0 }
  ]

  const total = storeStats.total || 1
  stats.forEach((stat) => {
    stat.percentage = Math.round((stat.count / total) * 100)
  })

  return stats.filter((stat) => stat.count > 0)
})

const pieSegments = computed(() => {
  let offset = 0
  return levelStats.value.map((stat) => {
    const segment: PieSegment = {
      level: stat.level,
      percentage: stat.percentage,
      color: stat.color,
      offset: -offset * 5.02
    }
    offset += stat.percentage
    return segment
  })
})

const sourceStats = computed(() => {
  const sourceMap: Record<string, { count: number; errors: number; warnings: number }> = {}
  logStore.roleLogs.forEach((log) => {
    if (!sourceMap[log.source]) {
      sourceMap[log.source] = { count: 0, errors: 0, warnings: 0 }
    }
    sourceMap[log.source].count++
    if (log.level === 'error') sourceMap[log.source].errors++
    if (log.level === 'warn') sourceMap[log.source].warnings++
  })

  const maxCount = Math.max(...Object.values(sourceMap).map((s) => s.count))

  return Object.entries(sourceMap)
    .map(
      ([name, data]): SourceStat => ({
        name,
        count: data.count,
        percentage: (data.count / maxCount) * 100,
        level: data.errors > 0 ? 'error' : data.warnings > 0 ? 'warning' : 'info'
      })
    )
    .sort((a, b) => b.count - a.count)
    .slice(0, 6)
})

// 格式化活动时间
const formatActivityTime = (timestamp: Date) => {
  return new Date(timestamp).toLocaleTimeString('zh-CN', {
    hour: '2-digit',
    minute: '2-digit',
    second: '2-digit'
  })
}

// 修改实时活动更新
const updateRealtimeActivity = () => {
  if (!isRealTimeActive.value) return

  recentActivities.value = logStore.roleLogs.slice(0, 3).map((log) => ({
    id: log.id,
    level: log.level,
    message: log.message.substring(0, 30) + (log.message.length > 30 ? '...' : ''),
    timestamp: log.timestamp
  }))
}

// 监听 store 中的日志变化
watch(
  () => logStore.logs,
  () => {
    updateRealtimeActivity()
  },
  { deep: true }
)

// 监听分页变化，滚动到顶部
watch(currentPage, () => {
  // 滚动到日志内容区域的顶部
  const logsScrollbar = document.querySelector('.logs-scrollbar .el-scrollbar__wrap')
  if (logsScrollbar) {
    logsScrollbar.scrollTo({
      top: 0,
      behavior: 'smooth'
    })
  }
})

// // 修改 uniqueSources 计算属性
// const uniqueSources = computed(() => {
//   return [...new Set(logStore.logs.map(log => log.source))]
// })

const filteredLogs = computed(() => {
  // 直接从原始日志开始过滤，避免重复调用 store 的过滤
  let filtered = logStore.roleLogs

  // 级别过滤
  if (selectedLevel.value && selectedLevel.value !== '') {
    filtered = filtered.filter((log) => log.level === selectedLevel.value)
  }

  // 搜索过滤
  if (debouncedSearchKeyword.value) {
    const query = debouncedSearchKeyword.value.toLowerCase()
    filtered = filtered.filter(
      (log) =>
        log.message.toLowerCase().includes(query) ||
        log.source.toLowerCase().includes(query) ||
        (log.details && JSON.stringify(log.details).toLowerCase().includes(query))
    )
  }

  // 来源过滤
  if (selectedSources.value.length > 0) {
    filtered = filtered.filter((log) => selectedSources.value.includes(log.source))
  }

  // 时间范围过滤
  if (dateRange.value && dateRange.value.length === 2) {
    const [start, end] = dateRange.value
    filtered = filtered.filter((log) => {
      const logTime = new Date(log.timestamp)
      return logTime >= start && logTime <= end
    })
  }

  return filtered.sort((a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime())
})

const paginatedLogs = computed(() => {
  const start = (currentPage.value - 1) * pageSize.value
  const end = start + pageSize.value
  return filteredLogs.value.slice(start, end)
})

const formatTime = (timestamp: Date) => {
  return new Date(timestamp).toLocaleString('zh-CN')
}

const highlightKeyword = (text: string) => {
  if (!searchKeyword.value) return text
  const regex = new RegExp(`(${searchKeyword.value})`, 'gi')
  return text.replace(regex, '<mark>$1</mark>')
}

const refreshLogs = () => {
  // 调用 logStore 的刷新方法
  logStore.loadLastSevenDays()
  ElMessage.success('日志已刷新')
}

const clearLogs = async () => {
  try {
    await ElMessageBox.confirm('确定要清空所有日志吗？', '警告', {
      confirmButtonText: '确定',
      cancelButtonText: '取消',
      type: 'warning'
    })
    logStore.clearLogs()
    ElMessage.success('日志已清空')
  } catch {
    // 用户取消
  }
}

const exportLogs = () => {
  try {
    const csvContent = logStore.exportLogs('csv')
    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' })
    const link = document.createElement('a')
    const url = URL.createObjectURL(blob)
    link.setAttribute('href', url)
    link.setAttribute('download', `logs_${new Date().toISOString().split('T')[0]}.csv`)
    link.style.visibility = 'hidden'
    document.body.appendChild(link)
    link.click()
    document.body.removeChild(link)
    ElMessage.success('日志导出成功')
  } catch (error) {
    ElMessage.error('导出失败')
  }
}

const copyLog = (log: LogEntry) => {
  const text = `[${log.level.toUpperCase()}] ${formatTime(log.timestamp)} - ${log.source}: ${log.message}`
  navigator.clipboard.writeText(text)
  ElMessage.success('日志已复制到剪贴板')
}

const shareLog = (_: LogEntry) => {
  // 实现分享功能
  ElMessage.info('分享功能待实现')
}

const showLogDetail = (log: LogEntry) => {
  selectedLog.value = log
  showLogDetailDialog.value = true
}

const closeLogDetail = () => {
  showLogDetailDialog.value = false
  selectedLog.value = null
}

const copyLogDetail = () => {
  if (selectedLog.value) {
    const detail = JSON.stringify(selectedLog.value, null, 2)
    navigator.clipboard.writeText(detail)
    ElMessage.success('详情已复制到剪贴板')
  }
}

// const applyAdvancedFilter = () => {
//   // 高级过滤逻辑已在 filteredLogs 计算属性中实现
//   ElMessage.success('过滤条件已应用')
// }

// const resetAdvancedFilter = () => {
//   selectedSources.value = []
//   dateRange.value = []
//   ElMessage.success('过滤条件已重置')
// }

const getLogCount = (level: string) => {
  return logStore.stats[level as keyof typeof logStore.stats] || 0
}

const getLogTypeTag = (level: string) => {
  const typeMap: Record<string, string> = {
    info: 'info',
    warn: 'warning',
    error: 'danger',
    debug: 'success'
  }
  return typeMap[level] || 'info'
}

// 生命周期
onMounted(async () => {
  logStore.loadLastSevenDays()
  updateRealtimeActivity()

  // 设置自动刷新
  if (autoRefresh.value) {
    refreshTimer = setInterval(() => {
      updateRealtimeActivity()
      lastUpdateTime.value = new Date().toLocaleTimeString()
    }, 5000)
  }
})

onUnmounted(() => {
  if (refreshTimer) {
    clearInterval(refreshTimer)
  }
  if (realtimeTimer) {
    clearInterval(realtimeTimer)
  }
})
</script>

<style scoped lang="less">
.logs-container {
  height: 100vh;
  display: flex;
  flex-direction: column;
  background: linear-gradient(135deg, #f5f7fa 0%, #c3cfe2 100%);
  padding: 20px;
  box-sizing: border-box;
  overflow: hidden;
}

.logs-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 20px;
  padding: 20px;
  background: rgba(255, 255, 255, 0.9);
  backdrop-filter: blur(10px);
  border-radius: 16px;
  box-shadow: 0 8px 32px rgba(0, 0, 0, 0.1);
  border: 1px solid rgba(255, 255, 255, 0.2);
  flex-shrink: 0;

  .header-left {
    display: flex;
    align-items: center;
    gap: 12px;

    .logs-title {
      display: flex;
      align-items: center;
      gap: 8px;
      margin: 0;
      font-size: 24px;
      font-weight: 600;
      color: #2c3e50;

      .el-icon {
        font-size: 28px;
        color: var(--primary-color);
      }
    }

    .logs-count {
      :deep(.el-badge__content) {
        background: var(--primary-color);
      }
    }
  }

  .header-right {
    display: flex;
    align-items: center;
    gap: 12px;

    .search-input {
      width: 280px;

      :deep(.el-input__wrapper) {
        transition: all 0.3s ease;

        &:focus-within {
          box-shadow: 0 0 0 2px rgba(64, 158, 255, 0.2);
          transform: scale(1.02);
        }
      }
    }

    .level-select {
      width: 120px;
    }
  }
}

.stats-cards {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(200px, 1fr));
  gap: 16px;
  margin-bottom: 20px;

  .stat-card {
    display: flex;
    align-items: center;
    gap: 16px;
    padding: 20px;
    background: rgba(255, 255, 255, 0.9);
    backdrop-filter: blur(10px);
    border-radius: 16px;
    box-shadow: 0 8px 32px rgba(0, 0, 0, 0.1);
    border: 1px solid rgba(255, 255, 255, 0.2);
    transition: all 0.3s cubic-bezier(0.4, 0, 0.2, 1);
    cursor: pointer;

    &:hover {
      transform: translateY(-4px);
      box-shadow: 0 12px 40px rgba(0, 0, 0, 0.15);
    }

    .stat-icon {
      width: 48px;
      height: 48px;
      border-radius: 12px;
      display: flex;
      align-items: center;
      justify-content: center;
      font-size: 24px;
      color: white;
    }

    .stat-content {
      .stat-number {
        font-size: 28px;
        font-weight: 700;
        color: #2c3e50;
        line-height: 1;
      }

      .stat-label {
        font-size: 14px;
        color: #7f8c8d;
        margin-top: 4px;
      }
    }

    &.info .stat-icon {
      background: linear-gradient(45deg, #3498db, #2980b9);
    }

    &.warning .stat-icon {
      background: linear-gradient(45deg, #f39c12, #e67e22);
    }

    &.error .stat-icon {
      background: linear-gradient(45deg, #e74c3c, #c0392b);
    }

    &.debug .stat-icon {
      background: linear-gradient(45deg, #9b59b6, #8e44ad);
    }
  }
}

/* 主要内容区域 - 水平布局 */
.main-content {
  display: flex;
  gap: 20px;
  flex: 1;
  min-height: 0;
}

/* 日志内容区域 - 左侧 */
.logs-content {
  flex: 4;
  min-width: 0;
  background: rgba(255, 255, 255, 0.9);
  backdrop-filter: blur(10px);
  border-radius: 16px;
  box-shadow: 0 8px 32px rgba(0, 0, 0, 0.1);
  border: 1px solid rgba(255, 255, 255, 0.2);
  overflow: hidden;
  display: flex;
  flex-direction: column;

  .logs-scrollbar {
    flex: 1;
    padding: 20px;
  }

  .pagination-container {
    padding: 16px 20px;
    border-top: 1px solid rgba(0, 0, 0, 0.1);
    display: flex;
    justify-content: center;
    flex-shrink: 0;
  }

  .logs-timeline {
    position: relative;

    &::before {
      content: '';
      position: absolute;
      left: 24px;
      top: 0;
      bottom: 0;
      width: 2px;
      background: linear-gradient(to bottom, #e3f2fd, #bbdefb);
    }

    .log-item {
      position: relative;
      margin-bottom: 20px;
      padding-left: 60px;
      animation: slideInUp 0.3s ease-out;
      animation-fill-mode: both;
      cursor: pointer;
      transition: all 0.3s ease;

      &:hover {
        transform: translateY(-10px);
      }

      .timeline-dot {
        position: absolute;
        left: 16px;
        top: 8px;
        width: 16px;
        height: 16px;
        border-radius: 50%;
        display: flex;
        align-items: center;
        justify-content: center;
        font-size: 10px;
        color: white;
        z-index: 2;

        &.dot-info {
          background: linear-gradient(135deg, #3498db, #2980b9);
        }

        &.dot-warning {
          background: linear-gradient(135deg, #f39c12, #e67e22);
        }

        &.dot-error {
          background: linear-gradient(135deg, #e74c3c, #c0392b);
        }

        &.dot-debug {
          background: linear-gradient(135deg, #9b59b6, #8e44ad);
        }
      }

      .log-content {
        background: rgba(255, 255, 255, 0.8);
        backdrop-filter: blur(5px);
        border-radius: 12px;
        padding: 16px;
        box-shadow: 0 4px 16px rgba(0, 0, 0, 0.1);
        border: 1px solid rgba(255, 255, 255, 0.3);
        transition: all 0.3s ease;

        &:hover {
          box-shadow: 0 8px 24px rgba(0, 0, 0, 0.15);
          border-color: rgba(52, 152, 219, 0.3);
        }

        .log-header {
          display: flex;
          justify-content: space-between;
          align-items: center;
          margin-bottom: 8px;
          gap: 20px;
          .log-meta {
            display: flex;
            align-items: center;
            gap: 8px;
            flex: 1;

            .log-source {
              color: #7f8c8d;
              font-size: 12px;
              background: rgba(127, 140, 141, 0.1);
              padding: 2px 6px;
              border-radius: 4px;
            }

            .log-time {
              color: #95a5a6;
              font-size: 11px;
              margin-left: auto;
            }
          }

          .log-actions {
            display: flex;
            opacity: 0;
            transition: opacity 0.3s ease;
          }
        }

        &:hover .log-actions {
          opacity: 1;
        }

        .log-message {
          color: #2c3e50;
          line-height: 1.5;
          word-break: break-word;

          .highlight {
            background: linear-gradient(120deg, #f1c40f, #f39c12);
            color: #2c3e50;
            padding: 1px 3px;
            border-radius: 3px;
            font-weight: 600;
          }
        }

        .log-details {
          margin-top: 12px;

          pre {
            background: rgba(44, 62, 80, 0.05);
            padding: 12px;
            border-radius: 8px;
            font-size: 12px;
            line-height: 1.4;
            color: #34495e;
            white-space: pre-wrap;
            word-break: break-word;
          }
        }
      }
    }
  }
}

.charts-section {
  flex: 3;
  flex-shrink: 0;
  background: rgba(255, 255, 255, 0.9);
  backdrop-filter: blur(10px);
  border-radius: 16px;
  box-shadow: 0 8px 32px rgba(0, 0, 0, 0.1);
  border: 1px solid rgba(255, 255, 255, 0.2);
  overflow: hidden;
  display: flex;
  flex-direction: column; /* 修改为 column，让内容垂直排列 */

  .charts-header {
    height: 50px;
    border-bottom: 1px solid rgba(0, 0, 0, 0.1);
    background: rgba(255, 255, 255, 0.5);
    flex-shrink: 0;
    display: flex; /* 添加 flex 布局 */
    align-items: center; /* 垂直居中 */
    padding: 0 20px; /* 添加内边距 */

    .charts-title {
      display: flex;
      align-items: center;
      gap: 8px;
      font-size: 16px;
      font-weight: 600;
      color: #2c3e50;
      .el-icon {
        font-size: 18px;
        color: #3498db;
      }
    }
  }

  .charts-content {
    flex: 1;
    padding: 20px;
    display: flex;
    flex-direction: column;
    gap: 16px;

    .chart-container {
      flex: 1;
      background: rgba(255, 255, 255, 0.7);
      backdrop-filter: blur(5px);
      border-radius: 12px;
      padding: 16px;
      box-shadow: 0 4px 16px rgba(0, 0, 0, 0.05);
      border: 1px solid rgba(255, 255, 255, 0.3);
      flex-shrink: 0; /* 防止图表容器被压缩 */
      min-height: 0; /* 添加这行，允许flex子项收缩 */
      .chart-header {
        display: flex;
        justify-content: space-between;
        align-items: center;
        margin-bottom: 12px;
        h3 {
          margin: 0;
          color: #2c3e50;
          font-size: 14px;
          font-weight: 600;
          display: flex;
          align-items: center;
          gap: 6px;

          .el-icon {
            font-size: 16px;
            color: #3498db;
          }
        }

        .chart-controls {
          .el-radio-group {
            .el-radio-button {
              --el-radio-button-font-size: 11px;
            }
          }
        }
      }
      // 趋势图样式 - 简约风格
      .trend-chart {
        height: 100%;
        min-height: 280px; /* 增加最小高度确保正确显示 */

        .chart-content {
          .trend-chart-container {
            width: 100%;
            height: 400px;
          }

          .pie-chart-container {
            width: 100%;
            height: 300px;
          }

          .echarts-trend-chart {
            background: white;
            border-radius: 12px;
            padding: 16px;
            box-shadow: 0 2px 8px rgba(0, 0, 0, 0.1);
          }

          .chart-legend {
            display: flex;
            justify-content: center;
            gap: 20px;
            margin-top: 16px;
            padding: 12px;
            background: #f8f9fa;
            border-radius: 8px;
          }

          .legend-item {
            display: flex;
            align-items: center;
            gap: 8px;
            cursor: pointer;
            padding: 6px 12px;
            border-radius: 6px;
            transition: all 0.3s ease;
            opacity: 0.7;
          }

          .legend-item.active {
            opacity: 1;
            background: white;
            box-shadow: 0 2px 4px rgba(0, 0, 0, 0.1);
          }

          .legend-color {
            width: 12px;
            height: 12px;
            border-radius: 50%;
          }

          .legend-color.total {
            background: #4facfe;
          }
          .legend-color.error {
            background: #ff6b6b;
          }
          .legend-color.warn {
            background: #feca57;
          }
          .legend-color.info {
            background: #48cae4;
          }
        }
      }

      // 饼图样式
      .pie-chart {
        display: flex;
        align-items: center;
        gap: 20px;

        .pie-visual {
          flex-shrink: 0;

          .pie-svg {
            width: 120px;
            height: 120px;

            .pie-segment {
              animation: drawPie 1s ease-out;
              transform-origin: center;
            }

            .pie-center-text {
              font-size: 14px;
              fill: #2c3e50;

              .pie-total {
                font-weight: 700;
                font-size: 18px;
              }
            }

            .pie-center-label {
              font-size: 12px;
              fill: #7f8c8d;
            }
          }
        }

        .pie-legend {
          flex: 1;

          .legend-item {
            display: flex;
            align-items: center;
            gap: 8px;
            margin-bottom: 8px;

            .legend-color {
              width: 12px;
              height: 12px;
              border-radius: 2px;
            }

            .legend-label {
              flex: 1;
              font-size: 14px;
              color: #2c3e50;
            }

            .legend-value {
              font-weight: 600;
              color: #7f8c8d;
              font-size: 14px;
            }
          }
        }
      }

      // 实时活动样式
      .activity-chart {
        .activity-item {
          display: flex;
          box-sizing: border-box;
          align-items: center;
          gap: 12px;
          padding: 8px;
          margin-bottom: 8px;
          background: rgba(255, 255, 255, 0.5);
          border-radius: 8px;
          border-left: 3px solid #ddd;
          position: relative;
          animation: slideInRight 0.3s ease-out;

          &.info {
            border-left-color: #3498db;
          }

          &.warning {
            border-left-color: #f39c12;
          }

          &.error {
            border-left-color: #e74c3c;
          }

          .activity-time {
            font-size: 12px;
            color: #7f8c8d;
            font-family: 'Courier New', monospace;
            min-width: 60px;
          }

          .activity-content {
            flex: 1;
            display: flex;
            align-items: center;
            gap: 8px;

            .activity-icon {
              font-size: 16px;
            }

            .activity-message {
              font-size: 14px;
              color: #2c3e50;
            }
          }

          .activity-pulse {
            width: 8px;
            height: 8px;
            border-radius: 50%;
            background: #2ecc71;
            animation: pulse 2s infinite;
          }
        }
        .activity-stats {
          display: flex;
          gap: 20px;

          .stat-item {
            text-align: center;

            .stat-label {
              display: block;
              font-size: 12px;
              color: #7f8c8d;
              margin-bottom: 4px;
            }

            .stat-value {
              display: block;
              font-size: 18px;
              font-weight: 700;
              color: #2c3e50;
            }
          }
        }
      }

      // 来源分析样式
      .source-chart {
        .source-bars {
          .source-bar {
            margin-bottom: 12px;

            .bar-container {
              height: 20px;
              background: #f8f9fa;
              border-radius: 10px;
              overflow: hidden;
              margin-bottom: 4px;

              .bar-fill {
                height: 100%;
                border-radius: 10px;
                transition: width 0.8s ease-out;

                &.bar-info {
                  background: linear-gradient(90deg, #3498db, #2980b9);
                }

                &.bar-warning {
                  background: linear-gradient(90deg, #f39c12, #e67e22);
                }

                &.bar-error {
                  background: linear-gradient(90deg, #e74c3c, #c0392b);
                }
              }
            }

            .bar-info {
              display: flex;
              justify-content: space-between;
              align-items: center;

              .bar-label {
                font-size: 14px;
                color: #2c3e50;
              }

              .bar-value {
                font-size: 12px;
                color: #7f8c8d;
                font-weight: 600;
              }
            }
          }
        }
      }
    }
    .activity-container {
    }
  }
  .secondColumn {
    display: flex;
    gap: 10px;
  }
}

// 日志详情弹窗样式
.log-detail-dialog {
  .log-detail-content {
    .detail-header {
      display: flex;
      align-items: center;
      gap: 12px;
      margin-bottom: 20px;
      padding-bottom: 12px;
      border-bottom: 1px solid #eee;

      .detail-time {
        color: #7f8c8d;
        font-family: 'Courier New', monospace;
      }
    }

    .detail-body {
      h4 {
        margin: 16px 0 8px 0;
        color: #2c3e50;
        font-size: 16px;
      }

      .detail-message {
        background: #f8f9fa;
        padding: 12px;
        border-radius: 8px;
        margin: 0;
        line-height: 1.6;
      }

      .detail-source,
      .detail-timestamp {
        margin: 0;
        color: #7f8c8d;
      }

      .detail-stack {
        background: #f8f9fa;
        padding: 12px;
        border-radius: 8px;
        font-size: 12px;
        line-height: 1.4;
        overflow-x: auto;
        margin: 0;
      }
    }
  }
}

.logs-footer {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-top: 20px;
  padding: 16px 20px;
  background: rgba(255, 255, 255, 0.9);
  backdrop-filter: blur(10px);
  border-radius: 16px;
  box-shadow: 0 8px 32px rgba(0, 0, 0, 0.1);
  border: 1px solid rgba(255, 255, 255, 0.2);
  flex-shrink: 0;

  .footer-left {
    display: flex;
    align-items: center;
    gap: 16px;

    .status-text {
      color: #7f8c8d;
      font-size: 14px;
    }

    .auto-refresh-switch {
      :deep(.el-switch__label) {
        color: #7f8c8d;
      }
    }
  }

  .footer-right {
    display: flex;
    align-items: center;
    gap: 12px;

    .last-update {
      color: #7f8c8d;
      font-size: 14px;
    }
  }
}

// 高级过滤样式
.advanced-filter {
  .el-form-item {
    margin-bottom: 16px;
  }
}

// 按钮动画效果
.el-button {
  transition: all 0.3s ease;
  position: relative;
  overflow: hidden;

  &::before {
    content: '';
    position: absolute;
    top: 0;
    left: -100%;
    width: 100%;
    height: 100%;
    background: linear-gradient(90deg, transparent, rgba(255, 255, 255, 0.2), transparent);
    transition: left 0.5s;
  }

  &:hover::before {
    left: 100%;
  }
}

// 动画定义
@keyframes slideUp {
  from {
    transform: translateY(100%);
    opacity: 0;
  }
  to {
    transform: translateY(0);
    opacity: 1;
  }
}

@keyframes drawPie {
  from {
    stroke-dasharray: 0 502;
  }
}

@keyframes slideInRight {
  from {
    transform: translateX(20px);
    opacity: 0;
  }
  to {
    transform: translateX(0);
    opacity: 1;
  }
}
</style>
