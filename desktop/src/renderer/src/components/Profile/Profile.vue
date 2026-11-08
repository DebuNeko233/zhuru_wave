<template>
  <div class="profile-container">
    <div class="profile-header">
      <h2>个人信息</h2>
    </div>

    <div class="profile-content">
      <div class="avatar-section">
        <el-avatar :size="120" :src="userStore.userAvatar" />
        <el-button type="primary" size="small" class="upload-btn"> 更换头像 </el-button>
      </div>

      <div class="info-section">
        <el-form
          ref="profileFormRef"
          :model="profileForm"
          :rules="profileRules"
          label-width="100px"
          class="profile-form"
        >
          <el-form-item label="用户名" prop="username">
            <el-input v-model="profileForm.username" disabled />
          </el-form-item>

          <el-form-item label="邮箱" prop="email">
            <el-input v-model="profileForm.email" />
          </el-form-item>

          <el-form-item label="手机号" prop="phone">
            <el-input v-model="profileForm.phone" />
          </el-form-item>

          <el-form-item label="部门" prop="department">
            <el-input v-model="profileForm.department" />
          </el-form-item>

          <el-form-item label="角色">
            <el-tag :type="roleTagType">{{ roleText }}</el-tag>
          </el-form-item>

          <el-form-item label="最后登录">
            <span>{{ formatTime(userStore.userInfo?.lastLoginTime) }}</span>
          </el-form-item>

          <el-form-item>
            <el-button type="primary" @click="handleSave" :loading="saving"> 保存修改 </el-button>
            <el-button @click="handleReset">重置</el-button>
          </el-form-item>
        </el-form>
      </div>
    </div>

    <div class="password-section">
      <h3>修改密码</h3>
      <el-form
        ref="passwordFormRef"
        :model="passwordForm"
        :rules="passwordRules"
        label-width="100px"
        class="password-form"
      >
        <el-form-item label="当前密码" prop="currentPassword">
          <el-input v-model="passwordForm.currentPassword" type="password" show-password />
        </el-form-item>

        <el-form-item label="新密码" prop="newPassword">
          <el-input v-model="passwordForm.newPassword" type="password" show-password />
        </el-form-item>

        <el-form-item label="确认密码" prop="confirmPassword">
          <el-input v-model="passwordForm.confirmPassword" type="password" show-password />
        </el-form-item>

        <el-form-item>
          <el-button type="primary" @click="handlePasswordChange"> 修改密码 </el-button>
        </el-form-item>
      </el-form>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, reactive, computed, onMounted } from 'vue'
import { ElMessage, type FormInstance } from 'element-plus'
import { useUserStore } from '@renderer/store/user'

const userStore = useUserStore()
const profileFormRef = ref<FormInstance>()
const passwordFormRef = ref<FormInstance>()
const saving = ref(false)

const profileForm = reactive({
  username: '',
  email: '',
  phone: '',
  department: ''
})

const passwordForm = reactive({
  currentPassword: '',
  newPassword: '',
  confirmPassword: ''
})

const profileRules = {
  email: [
    { required: true, message: '请输入邮箱', trigger: 'blur' },
    { type: 'email', message: '请输入正确的邮箱格式', trigger: 'blur' }
  ],
  phone: [{ pattern: /^1[3-9]\d{9}$/, message: '请输入正确的手机号', trigger: 'blur' }]
}

const passwordRules = {
  currentPassword: [{ required: true, message: '请输入当前密码', trigger: 'blur' }],
  newPassword: [
    { required: true, message: '请输入新密码', trigger: 'blur' },
    { min: 6, max: 20, message: '密码长度在 6 到 20 个字符', trigger: 'blur' }
  ],
  confirmPassword: [
    { required: true, message: '请确认新密码', trigger: 'blur' },
    {
      validator: (_: any, value: string, callback: Function) => {
        if (value !== passwordForm.newPassword) {
          callback(new Error('两次输入的密码不一致'))
        } else {
          callback()
        }
      },
      trigger: 'blur'
    }
  ]
}

const roleTagType = computed(() => {
  const role = userStore.userRole
  return role === 'admin' ? 'danger' : role === 'user' ? 'success' : 'info'
})

const roleText = computed(() => {
  const role = userStore.userRole
  const roleMap: Record<string, string> = {
    admin: '管理员',
    user: '普通用户',
    developer: '开发人员',
    tester: '测试人员',
    guest: '访客'
  }
  return roleMap[role] || '未知'
})

const formatTime = (time?: string) => {
  if (!time) return '未知'
  return new Date(time).toLocaleString('zh-CN')
}

const initForm = () => {
  if (userStore.userInfo) {
    profileForm.username = userStore.userInfo.username
    profileForm.email = userStore.userInfo.email
    profileForm.phone = userStore.userInfo.phone || ''
    profileForm.department = userStore.userInfo.department || ''
  }
}

const handleSave = async () => {
  if (!profileFormRef.value) return

  await profileFormRef.value.validate(async (valid) => {
    if (valid) {
      saving.value = true

      try {
        userStore.updateUserInfo({
          email: profileForm.email,
          phone: profileForm.phone,
          department: profileForm.department
        })

        ElMessage.success('保存成功')
      } catch (error) {
        ElMessage.error('保存失败')
      } finally {
        saving.value = false
      }
    }
  })
}

const handleReset = () => {
  initForm()
}

const handlePasswordChange = async () => {
  if (!passwordFormRef.value) return

  await passwordFormRef.value.validate(async (valid) => {
    if (valid) {
      // 这里应该调用修改密码的API
      ElMessage.success('密码修改成功')

      // 重置表单
      passwordForm.currentPassword = ''
      passwordForm.newPassword = ''
      passwordForm.confirmPassword = ''
    }
  })
}

onMounted(() => {
  initForm()
})
</script>

<style scoped lang="less">
.profile-container {
  padding: 20px;
  max-width: 800px;
  margin: 0 auto;
}

.profile-header {
  margin-bottom: 30px;

  h2 {
    color: #333;
    border-bottom: 2px solid #409eff;
    padding-bottom: 10px;
  }
}

.profile-content {
  display: flex;
  gap: 40px;
  margin-bottom: 40px;

  .avatar-section {
    display: flex;
    flex-direction: column;
    align-items: center;
    gap: 15px;

    .upload-btn {
      width: 100px;
    }
  }

  .info-section {
    flex: 1;
  }
}

.password-section {
  border-top: 1px solid #eee;
  padding-top: 30px;

  h3 {
    color: #333;
    margin-bottom: 20px;
  }

  .password-form {
    max-width: 400px;
  }
}
</style>
