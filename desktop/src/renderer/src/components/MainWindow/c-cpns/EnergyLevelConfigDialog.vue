<template>
  <div class="energy-config-dialog">
    <!-- 现有配置列表 -->
    <div class="config-section">
      <div class="section-header">
        <h3>现有配置</h3>
        <el-button type="primary" size="small" @click="startAddConfig">添加新配置</el-button>
      </div>
      <div class="config-list">
        <div
          v-for="(config, level) in enerageLevelMap"
          :key="level"
          class="config-item"
          :class="{ selected: selectedLevel === level.toString() }"
          @click="selectConfig(level.toString(), config)"
        >
          <div class="config-info">
            <span class="level">级别 {{ level }}</span>
            <span class="epsilon">ε: {{ config.epsilon }}</span>
            <span class="step1">step1: {{ config.step1 }}</span>
            <span class="step2">step2: {{ config.step2 }}</span>
          </div>
          <div class="config-actions" @click.stop>
            <el-button size="small" @click="editConfig(level.toString(), config)">编辑</el-button>
            <el-button size="small" type="danger" @click="deleteConfig(level.toString())"
              >删除</el-button
            >
          </div>
        </div>
      </div>
    </div>

    <!-- 配置详情/编辑表单 -->
    <div class="form-section">
      <h3>{{ getFormTitle() }}</h3>

      <!-- 只读模式：显示当前选择的配置详情 -->
      <div v-if="mode === 'view'" class="config-detail">
        <div class="detail-item">
          <label>级别:</label>
          <span>{{ selectedConfig?.level || '未选择' }}</span>
        </div>
        <div class="detail-item">
          <label>Epsilon:</label>
          <span>{{ selectedConfig?.epsilon || '-' }}</span>
        </div>
        <div class="detail-item">
          <label>Step:</label>
          <span>{{ selectedConfig?.step1 || '-' }}</span>
        </div>
        <div class="detail-item">
          <label>Step2:</label>
          <span>{{ selectedConfig?.step2 || '-' }}</span>
        </div>
      </div>

      <!-- 编辑/添加模式：显示表单 -->
      <el-form v-else :model="formData" :rules="formRules" ref="formRef" label-width="80px">
        <el-form-item label="级别" prop="level">
          <el-input-number
            v-model="formData.level"
            :min="1"
            :max="1000"
            :disabled="mode === 'edit'"
          />
        </el-form-item>
        <el-form-item label="Epsilon" prop="epsilon">
          <el-input-number v-model="formData.epsilon" :min="0" :step="0.01" :precision="2" />
        </el-form-item>
        <el-form-item label="Step1" prop="step1">
          <el-input-number v-model="formData.step1" :min="0" :step="1" />
        </el-form-item>
        <el-form-item label="Step2" prop="step1">
          <el-input-number v-model="formData.step2" :min="0" :step="1" />
        </el-form-item>
      </el-form>
    </div>

    <!-- 底部按钮 -->
    <div class="dialog-footer">
      <template v-if="mode === 'view'">
        <el-button @click="$emit('close')">关闭</el-button>
      </template>
      <template v-else>
        <el-button @click="cancelEdit">取消</el-button>
        <el-button type="primary" @click="saveConfig">保存</el-button>
      </template>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, reactive, computed, onMounted } from 'vue'
import { storeToRefs } from 'pinia'
import useParamSettingStore from '@renderer/store/paramentSetting'
import { ElMessage, ElMessageBox } from 'element-plus'
import type { FormInstance, FormRules } from 'element-plus'

interface Props {
  currentLevel?: number
}

const props = withDefaults(defineProps<Props>(), {
  currentLevel: undefined
})

defineEmits<{
  close: []
}>()

const { enerageLevelMap } = storeToRefs(useParamSettingStore())
const { updateEnerageLevelConfig, saveEnerageLevelMap } = useParamSettingStore()

const formRef = ref<FormInstance>()
const mode = ref<'view' | 'add' | 'edit'>('view')
const selectedLevel = ref('')
const editingLevel = ref('')

const formData = reactive({
  level: 0,
  epsilon: 0,
  step1: 0,
  step2: 0,
  rate: 0
})

const selectedConfig = computed(() => {
  if (!selectedLevel.value) return null
  const config = enerageLevelMap.value[parseInt(selectedLevel.value)]
  return config
    ? {
        level: parseInt(selectedLevel.value),
        epsilon: config.epsilon,
        step1: config.step1,
        step2: config.step2,
        rate: config.rate
      }
    : null
})

const formRules: FormRules = {
  level: [
    { required: true, message: '请输入级别', trigger: 'blur' },
    {
      validator: (_, value, callback) => {
        if (mode.value === 'add' && enerageLevelMap.value[value]) {
          callback(new Error('该级别已存在'))
        } else {
          callback()
        }
      },
      trigger: 'blur'
    }
  ],
  epsilon: [{ required: true, message: '请输入epsilon值', trigger: 'blur' }],
  rate: [{ required: true, message: '请输入rate值', trigger: 'blur' }]
}

const getFormTitle = () => {
  switch (mode.value) {
    case 'add':
      return '添加新配置'
    case 'edit':
      return '编辑配置'
    default:
      return '配置详情'
  }
}

const selectConfig = (level: string, _: any) => {
  if (mode.value !== 'view') return
  selectedLevel.value = level
}

const startAddConfig = () => {
  mode.value = 'add'
  resetFormData()
}

const editConfig = (level: string, config: any) => {
  mode.value = 'edit'
  editingLevel.value = level
  selectedLevel.value = level
  formData.level = parseInt(level)
  formData.epsilon = config.epsilon
  formData.rate = config.rate
  formData.step1 = config.step1
  formData.step2 = config.step2
}

const cancelEdit = () => {
  mode.value = 'view'
  resetFormData()
  formRef.value?.clearValidate()
}

const deleteConfig = async (level: string) => {
  try {
    await ElMessageBox.confirm('确定要删除这个配置吗？', '确认删除', {
      type: 'warning'
    })

    const numLevel = parseInt(level)
    delete enerageLevelMap.value[numLevel]
    await saveEnerageLevelMap()

    // 如果删除的是当前选择的配置，清空选择
    if (selectedLevel.value === level) {
      selectedLevel.value = ''
    }

    ElMessage.success('删除成功')
  } catch (error) {
    console.error('删除配置失败:', error)
  }
}

const saveConfig = async () => {
  if (!formRef.value) return

  try {
    await formRef.value.validate()

    const levelKey = formData.level
    const newConfig = {
      epsilon: formData.epsilon,
      step1: formData.step1,
      step2: formData.step2,
      rate: formData.rate
    }

    if (mode.value === 'edit') {
      // 如果编辑的是不同的级别，删除旧的
      const oldLevelKey = parseInt(editingLevel.value)
      if (oldLevelKey !== levelKey) {
        delete enerageLevelMap.value[oldLevelKey]
      }
    }

    await updateEnerageLevelConfig(levelKey, newConfig)

    ElMessage.success(mode.value === 'edit' ? '修改成功' : '添加成功')

    // 保存成功后，选择新配置并切换到查看模式
    selectedLevel.value = levelKey.toString()
    mode.value = 'view'
    resetFormData()
  } catch (error) {
    console.error('保存配置失败:', error)
    ElMessage.error('保存失败')
  }
}

const resetFormData = () => {
  formData.level = 0
  formData.epsilon = 0
  formData.step1 = 0
  formData.step2 = 0
  formData.rate = 0
  editingLevel.value = ''
}

// 初始化时选择当前级别或第一个配置
onMounted(() => {
  const levels = Object.keys(enerageLevelMap.value)
  if (levels.length > 0) {
    if (props.currentLevel && enerageLevelMap.value[props.currentLevel]) {
      selectedLevel.value = props.currentLevel.toString()
    } else {
      selectedLevel.value = levels[0]
    }
  }
})
</script>

<style scoped lang="less">
.energy-config-dialog {
  .config-section {
    margin-bottom: 24px;

    .section-header {
      display: flex;
      justify-content: space-between;
      align-items: center;
      margin-bottom: 16px;

      h3 {
        margin: 0;
        color: #303133;
        font-size: 16px;
      }
    }

    .config-list {
      max-height: 200px;
      overflow-y: auto;
      border: 1px solid #dcdfe6;
      border-radius: 4px;

      .config-item {
        display: flex;
        justify-content: space-between;
        align-items: center;
        padding: 12px 16px;
        border-bottom: 1px solid #f0f0f0;
        cursor: pointer;
        transition: background-color 0.2s;

        &:last-child {
          border-bottom: none;
        }

        &:hover {
          background-color: #f5f7fa;
        }

        &.selected {
          background-color: #ecf5ff;
          border-color: #b3d8ff;
        }

        .config-info {
          display: flex;
          gap: 16px;

          .level {
            font-weight: 600;
            color: #303133;
          }

          .epsilon,
          .rate {
            color: #606266;
            font-size: 14px;
          }
        }

        .config-actions {
          display: flex;
          gap: 8px;
        }
      }
    }
  }

  .form-section {
    margin-bottom: 24px;

    h3 {
      margin-bottom: 16px;
      color: #303133;
      font-size: 16px;
    }

    .config-detail {
      .detail-item {
        display: flex;
        align-items: center;
        margin-bottom: 12px;

        label {
          width: 80px;
          color: #606266;
          font-size: 14px;
        }

        span {
          color: #303133;
          font-size: 14px;
          font-weight: 500;
        }
      }
    }
  }

  .dialog-footer {
    display: flex;
    justify-content: flex-end;
    gap: 12px;
    padding-top: 16px;
    border-top: 1px solid #f0f0f0;
  }
}
</style>
