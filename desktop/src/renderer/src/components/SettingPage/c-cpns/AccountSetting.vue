<template>
  <div class="account-setting">
    <!-- 页面标题 -->
    <div class="setting-header">
      <h2 class="setting-title">账户设置</h2>
      <p class="setting-subtitle">管理您的个人信息和账户偏好</p>
    </div>

    <!-- 用户头像和基本信息 -->
    <div class="profile-section">
      <div class="avatar-container">
        <div class="avatar-wrapper">
          <img
            :src="userAvatar || avatarImg"
            :alt="userInfo?.username || '用户头像'"
            class="user-avatar"
          />
          <div class="avatar-overlay">
            <el-icon class="camera-icon" size="20">
              <Camera />
            </el-icon>
          </div>
        </div>
        <el-button link class="change-avatar-btn" @click="changeAvatar"> 更换头像 </el-button>
      </div>

      <div class="profile-info">
        <h3 class="user-name">{{ userInfo?.username || '未知用户' }}</h3>
        <p class="user-email">{{ userInfo?.email || '未设置邮箱' }}</p>
        <span class="user-status" :class="getStatusClass(userInfo?.role)">
          {{ getRoleText(userInfo?.role) }}
        </span>
      </div>
      <div class="addAccount" v-if="isAdmin">
        <!-- <el-button type="primary"  @click="showAddUserDialog">添加账户</el-button> -->
        <el-button @click="showUserManagementDialog">用户管理</el-button>
      </div>
    </div>

    <!-- 账户信息表单 -->
    <div class="form-section">
      <div class="form-group">
        <label class="form-label">用户名</label>
        <el-input
          v-model="safeUserInfo.username"
          class="form-input"
          placeholder="请输入用户名"
          :disabled="!editMode || !userInfo"
        />
      </div>

      <div class="form-group">
        <label class="form-label">邮箱地址</label>
        <el-input
          v-model="safeUserInfo.email"
          class="form-input"
          placeholder="请输入邮箱地址"
          :disabled="!editMode || !userInfo"
        />
      </div>

      <div class="form-group">
        <label class="form-label">手机号码</label>
        <el-input
          v-model="safeUserInfo.phone"
          class="form-input"
          placeholder="请输入手机号码"
          :disabled="!editMode || !userInfo"
        />
      </div>

      <div class="form-group">
        <label class="form-label">部门</label>
        <el-select
          v-model="safeUserInfo.department"
          class="form-input"
          placeholder="请选择部门"
          :disabled="!editMode || !userInfo"
        >
          <el-option label="注入" value="注入" />
          <el-option label="管理部" value="管理部" />
        </el-select>
      </div>

      <div class="form-group">
        <label class="form-label">用户角色</label>
        <el-input
          :value="getRoleText(userInfo?.role)"
          class="form-input"
          placeholder="用户角色"
          :disabled="true"
        />
      </div>

      <div class="form-group" v-if="userInfo?.lastLoginTime">
        <label class="form-label">最后登录时间</label>
        <el-input :value="formatTime(userInfo.lastLoginTime)" class="form-input" :disabled="true" />
      </div>
    </div>

    <!-- 安全设置 -->
    <div class="security-section">
      <h3 class="section-title">安全设置</h3>

      <div class="security-item">
        <div class="security-info">
          <div class="security-label">登录密码</div>
          <div class="security-desc">定期更新密码以保护账户安全</div>
        </div>
        <el-button link class="security-action" @click="showPasswordDialog = true">修改</el-button>
      </div>

      <div class="security-item">
        <div class="security-info">
          <div class="security-label">两步验证</div>
          <div class="security-desc">为账户添加额外的安全保护</div>
        </div>
        <el-switch v-model="securitySettings.twoFactor" class="security-switch" />
      </div>

      <div class="security-item">
        <div class="security-info">
          <div class="security-label">登录通知</div>
          <div class="security-desc">新设备登录时发送邮件通知</div>
        </div>
        <el-switch v-model="securitySettings.loginNotification" class="security-switch" />
      </div>
    </div>

    <!-- 操作按钮 -->
    <div class="action-section">
      <el-button v-if="!editMode" type="primary" class="action-btn primary" @click="enableEdit">
        编辑信息
      </el-button>

      <template v-else>
        <el-button class="action-btn secondary" @click="cancelEdit"> 取消 </el-button>
        <el-button type="primary" class="action-btn primary" @click="saveChanges" :loading="saving">
          保存更改
        </el-button>
      </template>
    </div>

    <!-- 头像选择对话框 -->
    <el-dialog
      v-model="showAvatarDialog"
      title="选择头像"
      width="500px"
      :before-close="handleAvatarDialogClose"
    >
      <div class="avatar-selection">
        <div class="avatar-options">
          <h4>选择预设头像</h4>
          <div class="preset-avatars">
            <div
              v-for="(avatarUrl, key) in avatarOptions"
              :key="key"
              class="avatar-option"
              :class="{ active: selectedAvatar === key }"
              @click="selectAvatar(key)"
            >
              <img :src="avatarUrl" :alt="`头像 ${key}`" />
              <div v-if="selectedAvatar === key" class="avatar-check">
                <el-icon size="12">
                  <Check />
                </el-icon>
              </div>
            </div>
          </div>
        </div>
      </div>

      <template #footer>
        <div class="dialog-footer">
          <el-button @click="handleAvatarDialogClose">取消</el-button>
          <el-button
            type="primary"
            @click="confirmAvatarChange"
            :loading="avatarChanging"
            :disabled="!selectedAvatar"
          >
            确认更换
          </el-button>
        </div>
      </template>
    </el-dialog>

    <!-- 添加用户对话框 -->
    <el-dialog
      v-model="showAddUserDialogVisible"
      title="添加新用户"
      width="600px"
      :before-close="handleAddUserDialogClose"
    >
      <el-form
        ref="addUserFormRef"
        :model="newUserForm"
        :rules="addUserRules"
        label-width="100px"
        class="add-user-form"
      >
        <el-form-item label="用户名" prop="username">
          <el-input v-model="newUserForm.username" placeholder="请输入用户名" clearable />
        </el-form-item>

        <el-form-item label="邮箱" prop="email">
          <el-input v-model="newUserForm.email" placeholder="请输入邮箱地址" clearable />
        </el-form-item>

        <el-form-item label="密码" prop="password">
          <el-input
            v-model="newUserForm.password"
            type="password"
            placeholder="请输入密码"
            show-password
            clearable
          />
        </el-form-item>

        <el-form-item label="确认密码" prop="confirmPassword">
          <el-input
            v-model="newUserForm.confirmPassword"
            type="password"
            placeholder="请再次输入密码"
            show-password
            clearable
          />
        </el-form-item>

        <el-form-item label="手机号" prop="phone">
          <el-input v-model="newUserForm.phone" placeholder="请输入手机号码" clearable />
        </el-form-item>

        <el-form-item label="部门" prop="department">
          <el-select v-model="newUserForm.department" placeholder="请选择部门" style="width: 100%">
            <el-option label="注入" value="注入" />
            <el-option label="管理部" value="管理部" />
          </el-select>
        </el-form-item>

        <el-form-item label="用户角色" prop="role">
          <el-select v-model="newUserForm.role" placeholder="请选择用户角色" style="width: 100%">
            <el-option label="超级管理员" value="admin" />
            <el-option label="工艺人员" value="user" />
            <el-option label="设备人员" value="manager" />
            <el-option label="生产人员" value="developer" />
          </el-select>
        </el-form-item>

        <el-form-item label="头像" prop="avatar">
          <div class="avatar-selection-mini">
            <div
              v-for="(avatarUrl, key) in avatarOptions"
              :key="key"
              class="avatar-option-mini"
              :class="{ active: newUserForm.avatar === key }"
              @click="newUserForm.avatar = key"
            >
              <img :src="avatarUrl" :alt="`头像 ${key}`" />
            </div>
          </div>
        </el-form-item>
      </el-form>

      <template #footer>
        <div class="dialog-footer">
          <el-button @click="handleAddUserDialogClose">取消</el-button>
          <el-button type="primary" @click="confirmAddUser" :loading="addingUser">
            添加用户
          </el-button>
        </div>
      </template>
    </el-dialog>

    <!-- 用户管理对话框 -->
    <el-dialog
      v-model="showUserManagementDialogVisible"
      title="用户管理"
      width="80%"
      :before-close="handleUserManagementDialogClose"
    >
      <div class="user-management-content">
        <!-- 搜索和操作栏 -->
        <div class="management-header">
          <div class="search-section">
            <el-input
              v-model="userSearchKeyword"
              placeholder="搜索用户名、邮箱或部门"
              @input="handleUserSearch"
              clearable
              style="width: 300px"
            >
              <template #prefix>
                <el-icon><Search /></el-icon>
              </template>
            </el-input>
          </div>
          <div class="action-section">
            <el-button @click="refreshUserList" :loading="loadingUsers">
              <el-icon><Refresh /></el-icon>
              刷新
            </el-button>
            <el-button type="primary" @click="showAddUserDialog">
              <el-icon><Plus /></el-icon>
              添加用户
            </el-button>
          </div>
        </div>

        <!-- 用户列表 -->
        <div class="user-list-section">
          <el-table
            :data="paginatedUserList"
            v-loading="loadingUsers"
            style="width: 100%"
            :header-cell-style="{ background: '#f5f7fa', color: '#606266' }"
          >
            <el-table-column label="头像" width="80" align="center">
              <template #default="{ row }">
                <el-avatar
                  :size="40"
                  :src="avatarOptions[row.avatar] || avatarOptions.default"
                  :alt="row.username"
                />
              </template>
            </el-table-column>

            <el-table-column prop="username" label="用户名" min-width="120" />

            <el-table-column prop="email" label="邮箱" min-width="180" />

            <el-table-column prop="phone" label="手机号" min-width="130" />

            <el-table-column prop="department" label="部门" min-width="120" />

            <el-table-column label="角色" min-width="100">
              <template #default="{ row }">
                <el-tag :type="getRoleTagType(row.role)">
                  {{ getRoleText(row.role) }}
                </el-tag>
              </template>
            </el-table-column>

            <el-table-column prop="lastLogin" label="最后登录" min-width="160">
              <template #default="{ row }">
                {{ formatTime(row.lastLoginTime) }}
              </template>
            </el-table-column>

            <el-table-column label="操作" width="150" fixed="right">
              <template #default="{ row }">
                <el-button
                  type="danger"
                  size="small"
                  @click="deleteUser(row)"
                  :disabled="row.id === userInfo?.id || row.role === 'admin'"
                >
                  删除
                </el-button>
              </template>
            </el-table-column>
          </el-table>

          <!-- 分页 -->
          <div class="pagination-section">
            <el-pagination
              v-model:current-page="currentPage"
              v-model:page-size="pageSize"
              :page-sizes="[5, 8]"
              :total="totalUsers"
              layout="total, sizes, prev, pager, next, jumper"
              @size-change="handleSizeChange"
              @current-change="handleCurrentChange"
            />
          </div>
        </div>
      </div>
    </el-dialog>

    <!-- 密码修改对话框 -->
    <el-dialog
      v-model="showPasswordDialog"
      title="修改登录密码"
      width="500px"
      :before-close="handlePasswordDialogClose"
    >
      <el-form
        ref="passwordFormRef"
        :model="passwordForm"
        :rules="passwordRules"
        label-width="100px"
        class="password-form"
      >
        <el-form-item label="当前密码" prop="currentPassword">
          <el-input
            v-model="passwordForm.currentPassword"
            type="password"
            placeholder="请输入当前密码"
            show-password
            clearable
          />
        </el-form-item>

        <el-form-item label="新密码" prop="newPassword">
          <el-input
            v-model="passwordForm.newPassword"
            type="password"
            placeholder="请输入新密码"
            show-password
            clearable
          />
        </el-form-item>

        <el-form-item label="确认密码" prop="confirmPassword">
          <el-input
            v-model="passwordForm.confirmPassword"
            type="password"
            placeholder="请再次输入新密码"
            show-password
            clearable
          />
        </el-form-item>

        <div class="password-tips">
          <h4>密码安全建议：</h4>
          <ul>
            <li>密码长度至少6位，建议8位以上</li>
            <li>包含大小写字母、数字和特殊字符</li>
            <li>不要使用常见的密码组合</li>
            <li>定期更换密码以保证账户安全</li>
          </ul>
        </div>
      </el-form>

      <template #footer>
        <div class="dialog-footer">
          <el-button @click="handlePasswordDialogClose">取消</el-button>
          <el-button type="primary" @click="confirmPasswordChange" :loading="passwordChanging">
            确认修改
          </el-button>
        </div>
      </template>
    </el-dialog>
  </div>
</template>

<script setup>
import { ref, reactive, computed, nextTick, onMounted } from 'vue'
import { useRouter } from 'vue-router'
import { Camera, Check, Plus, Refresh, Search } from '@element-plus/icons-vue'
import { ElMessage, ElMessageBox } from 'element-plus'
import { useUserStore } from '@renderer/store/user'
import { storeToRefs } from 'pinia'
import avatarImg from '@renderer/assets/img/OIP.webp'

const userStore = useUserStore()
const { userInfo, userAvatar, userRole } = storeToRefs(userStore)

// 编辑模式
const editMode = ref(false)
const saving = ref(false)
const router = useRouter()

// 头像相关状态
const showAvatarDialog = ref(false)
const selectedAvatar = ref('')
const avatarChanging = ref(false)

// 添加用户相关状态
const showAddUserDialogVisible = ref(false)
const addingUser = ref(false)
const addUserFormRef = ref()

// 用户管理相关状态
const showUserManagementDialogVisible = ref(false)
const userList = ref([])
const filteredUserList = ref([])
const loadingUsers = ref(false)
const userSearchKeyword = ref('')
const currentPage = ref(1)
const pageSize = ref(8)
const totalUsers = ref(0)

// 密码修改相关状态
const showPasswordDialog = ref(false)
const passwordChanging = ref(false)
const passwordFormRef = ref()

// 密码修改表单
const passwordForm = reactive({
  currentPassword: '',
  newPassword: '',
  confirmPassword: ''
})

// 获取头像选项
const avatarOptions = userStore.getAvatarOptions()

// 备份原始数据
const originalUserInfo = ref({})

// 安全的用户信息计算属性，防止userInfo为null时的访问错误
const safeUserInfo = computed({
  get: () =>
    userInfo.value || {
      username: '',
      email: '',
      phone: '',
      department: '',
      role: 'guest'
    },
  set: (value) => {
    if (userInfo.value) {
      Object.assign(userInfo.value, value)
    }
  }
})

// 安全设置
const securitySettings = reactive({
  twoFactor: false,
  loginNotification: true
})

// 新用户表单
const newUserForm = reactive({
  username: '',
  email: '',
  password: '',
  confirmPassword: '',
  phone: '',
  department: '',
  role: 'user',
  avatar: 'default'
})

// 密码修改验证规则
const passwordRules = {
  currentPassword: [{ required: true, message: '请输入当前密码', trigger: 'blur' }],
  newPassword: [
    { required: true, message: '请输入新密码', trigger: 'blur' },
    { min: 6, max: 20, message: '密码长度在 6 到 20 个字符', trigger: 'blur' },
    {
      validator: (rule, value, callback) => {
        if (value === passwordForm.currentPassword) {
          callback(new Error('新密码不能与当前密码相同'))
        } else {
          callback()
        }
      },
      trigger: 'blur'
    }
  ],
  confirmPassword: [
    { required: true, message: '请确认新密码', trigger: 'blur' },
    {
      validator: (rule, value, callback) => {
        if (value !== passwordForm.newPassword) {
          callback(new Error('两次输入密码不一致'))
        } else {
          callback()
        }
      },
      trigger: 'blur'
    }
  ]
}

// 表单验证规则
const addUserRules = {
  username: [
    { required: true, message: '请输入用户名', trigger: 'blur' },
    { min: 3, max: 20, message: '用户名长度在 3 到 20 个字符', trigger: 'blur' }
  ],
  email: [
    { required: true, message: '请输入邮箱地址', trigger: 'blur' },
    { type: 'email', message: '请输入正确的邮箱地址', trigger: 'blur' }
  ],
  password: [
    { required: true, message: '请输入密码', trigger: 'blur' },
    { min: 6, max: 20, message: '密码长度在 6 到 20 个字符', trigger: 'blur' }
  ],
  confirmPassword: [
    { required: true, message: '请再次输入密码', trigger: 'blur' },
    {
      validator: (rule, value, callback) => {
        if (value !== newUserForm.password) {
          callback(new Error('两次输入密码不一致'))
        } else {
          callback()
        }
      },
      trigger: 'blur'
    }
  ],
  phone: [{ pattern: /^1[3-9]\d{9}$/, message: '请输入正确的手机号码', trigger: 'blur' }],
  department: [{ required: true, message: '请选择部门', trigger: 'change' }],
  role: [{ required: true, message: '请选择用户角色', trigger: 'change' }]
}

// 计算属性：判断是否为管理员
const isAdmin = computed(() => {
  return userRole.value === 'admin'
})

// 分页用户列表
const paginatedUserList = computed(() => {
  if (!filteredUserList.value || !Array.isArray(filteredUserList.value)) {
    return []
  }
  const start = (currentPage.value - 1) * pageSize.value
  const end = start + pageSize.value
  return filteredUserList.value.slice(start, end)
})

// 获取角色文本
const getRoleText = (role) => {
  const roleMap = {
    admin: '超级管理员',
    technology: '工艺人员',
    product: '生产人员',
    equipment: '设备人员'
  }
  return roleMap[role] || '未知角色'
}

// 头像相关方法
const selectAvatar = (avatarKey) => {
  selectedAvatar.value = avatarKey
}

const changeAvatar = () => {
  showAvatarDialog.value = true
  selectedAvatar.value = '' // 重置选择
}

const handleAvatarDialogClose = () => {
  showAvatarDialog.value = false
  selectedAvatar.value = ''
}

const confirmAvatarChange = async () => {
  if (!selectedAvatar.value) {
    ElMessage.warning('请选择一个头像')
    return
  }

  avatarChanging.value = true
  try {
    // 调用 userStore 的方法更新头像
    await userStore.changeUserAvatar(selectedAvatar.value)
    ElMessage.success('头像更换成功!')
    showAvatarDialog.value = false
  } catch (error) {
    ElMessage.error('头像更换失败，请重试')
  } finally {
    avatarChanging.value = false
  }
}

// 管理员功能方法
const showAddUserDialog = () => {
  if (!isAdmin.value) {
    ElMessage.error('您没有权限执行此操作')
    return
  }

  // 重置表单
  Object.assign(newUserForm, {
    username: '',
    email: '',
    password: '',
    confirmPassword: '',
    phone: '',
    department: '',
    role: 'user',
    avatar: 'default'
  })

  showAddUserDialogVisible.value = true
}

const handleAddUserDialogClose = () => {
  showAddUserDialogVisible.value = false
  // 先重置表单数据
  Object.assign(newUserForm, {
    username: '',
    email: '',
    password: '',
    confirmPassword: '',
    phone: '',
    department: '',
    role: 'user',
    avatar: 'default'
  })

  // 延迟重置表单验证，确保表单已完全渲染
  nextTick(() => {
    if (addUserFormRef.value) {
      addUserFormRef.value.clearValidate()
    }
  })
}

const confirmAddUser = async () => {
  if (!addUserFormRef.value) return

  try {
    // 验证表单
    await addUserFormRef.value.validate()

    addingUser.value = true

    // 创建新用户数据
    const newUser = {
      username: newUserForm.username,
      email: newUserForm.email,
      password: newUserForm.password, // 在实际应用中应该加密
      phone: newUserForm.phone,
      department: newUserForm.department,
      role: newUserForm.role,
      avatar: newUserForm.avatar,
      lastLoginTime: null
    }

    await mockAddUser(newUser)

    userList.value.push(newUser)
    filteredUserList.value.push(newUser)
    totalUsers.value++
    ElMessage.success('用户添加成功!')
    showAddUserDialogVisible.value = false
  } catch (error) {
    if (error.message) {
      ElMessage.error(error.message)
    } else {
      ElMessage.error('添加用户失败，请重试')
    }
  } finally {
    addingUser.value = false
  }
}

// 模拟添加用户的方法
const mockAddUser = async (userData) => {
  return new Promise((resolve, reject) => {
    setTimeout(async () => {
      try {
        // 暂时使用 electron API 保存到本地
        const result = await window.electronAPI.invoke('user:add-user', userData)
        if (result.success) {
          resolve(result)
        } else {
          ElMessage.error(result.message || '添加用户失败')
          reject(new Error(result.message || '添加用户失败'))
        }
      } catch (error) {
        reject(error)
      }
    }, 1000)
  })
}

// 获取状态样式类
const getStatusClass = (role) => {
  return role === 'admin' ? 'online' : 'offline'
}

// 格式化时间
const formatTime = (time) => {
  if (!time) return '暂未进行过登录'
  return new Date(time).toLocaleString('zh-CN')
}

// 启用编辑模式
const enableEdit = () => {
  if (userInfo.value) {
    originalUserInfo.value = { ...userInfo.value }
    editMode.value = true
  }
}

// 取消编辑
const cancelEdit = () => {
  if (userInfo.value && originalUserInfo.value) {
    Object.assign(userInfo.value, originalUserInfo.value)
    editMode.value = false
  }
}

// 保存更改
const saveChanges = async () => {
  saving.value = true
  try {
    // 使用 userStore 的 updateUserInfo 方法
    if (userInfo.value) {
      userStore.updateUserInfo({
        username: userInfo.value.username,
        email: userInfo.value.email,
        phone: userInfo.value.phone,
        department: userInfo.value.department
      })
    }

    editMode.value = false
    ElMessage.success('账户信息更新成功')
  } catch (error) {
    ElMessage.error('保存失败，请重试')
  } finally {
    saving.value = false
  }
}

// 显示用户管理对话框
const showUserManagementDialog = () => {
  showUserManagementDialogVisible.value = true
  getUserList()
}

// 关闭用户管理对话框
const handleUserManagementDialogClose = () => {
  showUserManagementDialogVisible.value = false
  userSearchKeyword.value = ''
  currentPage.value = 1
}

// 获取用户列表
const getUserList = async () => {
  if (!isAdmin.value) return

  loadingUsers.value = true
  try {
    // 实际项目中应该调用API
    const result = await window.electronAPI.invoke('user:get-all-users')
    if (result.success) {
      userList.value = result.users
      filteredUserList.value = result.users
      totalUsers.value = result.users.length
    }
  } catch (error) {
    ElMessage.error('获取用户列表失败')
  } finally {
    loadingUsers.value = false
  }
}

// 刷新用户列表
const refreshUserList = () => {
  getUserList()
}

// 搜索用户
const handleUserSearch = () => {
  if (!userList.value || !Array.isArray(userList.value)) {
    filteredUserList.value = []
    return
  }
  const keyword = userSearchKeyword.value.toLowerCase()
  if (!keyword) {
    filteredUserList.value = userList.value
  } else {
    filteredUserList.value = userList.value.filter(
      (user) =>
        (user.username && user.username.toLowerCase().includes(keyword)) ||
        (user.email && user.email.toLowerCase().includes(keyword)) ||
        (user.department && user.department.toLowerCase().includes(keyword))
    )
  }
  totalUsers.value = filteredUserList.value.length
  currentPage.value = 1
}

// 分页大小改变
const handleSizeChange = (newSize) => {
  pageSize.value = newSize
  currentPage.value = 1
}

// 当前页改变
const handleCurrentChange = (newPage) => {
  currentPage.value = newPage
}

// 获取角色标签类型
const getRoleTagType = (role) => {
  const typeMap = {
    admin: 'danger',
    technology: 'warning',
    product: 'info',
    equipment: 'primary'
  }
  return typeMap[role] || 'info'
}

// 删除用户
const deleteUser = async (user) => {
  if (!isAdmin.value) {
    ElMessage.warning('您没有权限删除用户')
    return
  }

  // 不能删除自己
  if (user.id === userInfo.value?.id) {
    ElMessage.warning('不能删除自己的账户')
    return
  }

  // 不能删除管理员
  if (user.role === 'admin') {
    ElMessage.warning('不能删除管理员账户')
    return
  }

  try {
    await ElMessageBox.confirm(
      `确定要删除用户 "${user.username}" 吗？此操作不可恢复。`,
      '确认删除',
      {
        confirmButtonText: '确定',
        cancelButtonText: '取消',
        type: 'warning'
      }
    )

    // 实际项目中应该调用API
    const result = await window.electronAPI.invoke('user:delete-user', user.id)
    if (result.success) {
      ElMessage.success('用户删除成功')
      getUserList()
    }
  } catch (error) {
    if (error !== 'cancel') {
      ElMessage.error('删除用户失败')
    }
  }
}

// 密码修改相关方法
const handlePasswordDialogClose = () => {
  showPasswordDialog.value = false
  // 重置表单数据
  Object.assign(passwordForm, {
    currentPassword: '',
    newPassword: '',
    confirmPassword: ''
  })

  // 延迟重置表单验证
  nextTick(() => {
    if (passwordFormRef.value) {
      passwordFormRef.value.clearValidate()
    }
  })
}

const confirmPasswordChange = async () => {
  if (!passwordFormRef.value) return

  try {
    // 验证表单
    await passwordFormRef.value.validate()

    passwordChanging.value = true

    // 调用密码修改API
    const result = await changePassword({
      currentPassword: passwordForm.currentPassword,
      newPassword: passwordForm.newPassword
    })

    if (result.success) {
      ElMessage.success('密码修改成功！请重新登录')
      showPasswordDialog.value = false

      // 可以选择自动登出用户
      setTimeout(() => {
        // 这里可以调用登出方法
        userStore.logout()
        router.push('/login')
      }, 2000)
    } else {
      ElMessage.error(result.message || '密码修改失败')
    }
  } catch (error) {
    if (error.message) {
      ElMessage.error(error.message)
    } else {
      ElMessage.error('密码修改失败，请重试')
    }
  } finally {
    passwordChanging.value = false
  }
}

// 模拟密码修改API
const changePassword = async (passwordData) => {
  return new Promise((resolve, reject) => {
    setTimeout(async () => {
      try {
        // 验证当前密码

        // 首先验证当前密码是否正确
        const verifyResult = await window.electronAPI.invoke('user:verify-password', {
          userId: userInfo.value?.id,
          password: passwordData.currentPassword
        })

        if (!verifyResult.success) {
          reject(new Error(verifyResult.message || '当前密码不正确'))
          return
        }

        // 模拟密码修改
        const result = await window.electronAPI.invoke('user:change-password', {
          userId: userInfo.value?.id,
          currentPassword: passwordData.currentPassword,
          newPassword: passwordData.newPassword
        })

        if (result.success) {
          resolve(result)
        } else {
          reject(new Error(result.message || '密码修改失败'))
        }
      } catch (error) {
        reject(error)
      }
    }, 1000)
  })
}

// 组件挂载时获取用户列表
onMounted(() => {
  if (isAdmin.value) {
    getUserList()
  }
})
</script>
<style scoped lang="less">
.account-setting {
  max-width: 800px;
  margin: 10px auto;
  padding: 24px;
  background: #ffffff;
  border-radius: 16px;
  box-shadow: 0 1px 5px rgba(0, 0, 0, 0.3);
}

.setting-header {
  margin-bottom: 32px;
  text-align: center;

  .setting-title {
    font-size: 28px;
    font-weight: 600;
    color: #1d1d1f;
    margin: 0 0 8px 0;
    letter-spacing: -0.5px;
  }

  .setting-subtitle {
    font-size: 16px;
    color: #86868b;
    margin: 0;
    font-weight: 400;
  }
}

.profile-section {
  display: flex;
  align-items: center;
  gap: 24px;
  padding: 24px;
  background: #f5f5f7;
  border-radius: 12px;
  margin-bottom: 32px;

  .avatar-container {
    display: flex;
    flex-direction: column;
    align-items: center;
    gap: 12px;

    .avatar-wrapper {
      position: relative;

      .user-avatar {
        width: 80px;
        height: 80px;
        border-radius: 50%;
        object-fit: cover;
        border: 3px solid #ffffff;
        box-shadow: 0 4px 12px rgba(0, 0, 0, 0.15);
      }

      .avatar-overlay {
        position: absolute;
        bottom: 0;
        right: 0;
        width: 28px;
        height: 28px;
        background: #007aff;
        border-radius: 50%;
        display: flex;
        align-items: center;
        justify-content: center;
        border: 2px solid #ffffff;
        cursor: pointer;
        transition: all 0.2s ease;

        &:hover {
          background: #0056cc;
          transform: scale(1.1);
        }

        .camera-icon {
          color: white;
        }
      }
    }

    .change-avatar-btn {
      font-size: 14px;
      color: #007aff;
      padding: 0;

      &:hover {
        color: #0056cc;
      }
    }
  }

  .profile-info {
    flex: 1;

    .user-name {
      font-size: 24px;
      font-weight: 600;
      color: #1d1d1f;
      margin: 0 0 4px 0;
    }

    .user-email {
      font-size: 16px;
      color: #86868b;
      margin: 0 0 8px 0;
    }

    .user-status {
      display: inline-flex;
      align-items: center;
      padding: 4px 12px;
      border-radius: 20px;
      font-size: 12px;
      font-weight: 500;

      &.online {
        background: #d1f2eb;
        color: #00875a;
      }

      &.offline {
        background: #ffebe6;
        color: #de350b;
      }
    }
  }
}

.form-section {
  margin-bottom: 32px;

  .form-group {
    margin-bottom: 20px;

    .form-label {
      display: block;
      font-size: 14px;
      font-weight: 500;
      color: #1d1d1f;
      margin-bottom: 8px;
    }

    .form-input {
      width: 100%;

      :deep(.el-input__wrapper) {
        border-radius: 8px;
        border: 1px solid #d2d2d7;
        box-shadow: none;
        transition: all 0.2s ease;

        &:hover {
          border-color: #007aff;
        }

        &.is-focus {
          border-color: #007aff;
          box-shadow: 0 0 0 3px rgba(0, 122, 255, 0.1);
        }
      }

      :deep(.el-input__inner) {
        font-size: 16px;
        color: #1d1d1f;

        &::placeholder {
          color: #86868b;
        }
      }
    }
  }
}

.security-section {
  margin-bottom: 32px;

  .section-title {
    font-size: 20px;
    font-weight: 600;
    color: #1d1d1f;
    margin: 0 0 20px 0;
  }

  .security-item {
    display: flex;
    align-items: center;
    justify-content: space-between;
    padding: 16px 0;
    border-bottom: 1px solid #f5f5f7;

    &:last-child {
      border-bottom: none;
    }

    .security-info {
      .security-label {
        font-size: 16px;
        font-weight: 500;
        color: #1d1d1f;
        margin-bottom: 4px;
      }

      .security-desc {
        font-size: 14px;
        color: #86868b;
      }
    }

    .security-action {
      color: #007aff;
      font-size: 16px;
      padding: 0;

      &:hover {
        color: #0056cc;
      }
    }
  }
}

.action-section {
  display: flex;
  justify-content: flex-end;
  gap: 12px;
  padding-top: 24px;
  border-top: 1px solid #f5f5f7;

  .action-btn {
    padding: 12px 24px;
    border-radius: 8px;
    font-size: 16px;
    font-weight: 500;
    transition: all 0.2s ease;

    &.primary {
      background: #007aff;
      border-color: #007aff;

      &:hover {
        background: #0056cc;
        border-color: #0056cc;
      }
    }

    &.secondary {
      background: #f5f5f7;
      border-color: #d2d2d7;
      color: #1d1d1f;

      &:hover {
        background: #e5e5ea;
        border-color: #c7c7cc;
      }
    }
  }
}

// 头像选择对话框样式
.avatar-selection {
  .avatar-options {
    margin-bottom: 24px;

    h4 {
      margin: 0 0 16px 0;
      font-size: 16px;
      font-weight: 600;
      color: #1d1d1f;
    }

    .preset-avatars {
      display: grid;
      grid-template-columns: repeat(auto-fill, minmax(80px, 1fr));
      gap: 12px;

      .avatar-option {
        position: relative;
        width: 80px;
        height: 80px;
        border-radius: 50%;
        overflow: hidden;
        cursor: pointer;
        border: 3px solid transparent;
        transition: all 0.3s ease;

        &:hover {
          border-color: #007aff;
          transform: scale(1.05);
        }

        &.active {
          border-color: #007aff;
          box-shadow: 0 0 0 2px rgba(0, 122, 255, 0.2);
        }

        img {
          width: 100%;
          height: 100%;
          object-fit: cover;
        }

        .avatar-check {
          position: absolute;
          top: 50%;
          left: 50%;
          transform: translate(-50%, -50%);
          width: 24px;
          height: 24px;
          background: #007aff;
          border-radius: 50%;
          display: flex;
          align-items: center;
          justify-content: center;
          color: white;
        }
      }
    }
  }
}

// 添加用户表单样式
.add-user-form {
  .avatar-selection-mini {
    display: flex;
    gap: 8px;
    flex-wrap: wrap;

    .avatar-option-mini {
      width: 40px;
      height: 40px;
      border-radius: 50%;
      overflow: hidden;
      cursor: pointer;
      border: 2px solid transparent;
      transition: all 0.2s ease;

      &:hover {
        border-color: #007aff;
        transform: scale(1.1);
      }

      &.active {
        border-color: #007aff;
        box-shadow: 0 0 0 2px rgba(0, 122, 255, 0.2);
      }

      img {
        width: 100%;
        height: 100%;
        object-fit: cover;
      }
    }
  }
}

// 密码修改对话框样式
.password-form {
  .el-form-item {
    margin-bottom: 20px;
  }

  .password-tips {
    margin-top: 20px;
    padding: 16px;
    background-color: #f8f9fa;
    border-radius: 8px;
    border-left: 4px solid #007aff;

    h4 {
      margin: 0 0 12px 0;
      color: #333;
      font-size: 14px;
      font-weight: 600;
    }

    ul {
      margin: 0;
      padding-left: 20px;

      li {
        color: #666;
        font-size: 13px;
        line-height: 1.6;
        margin-bottom: 4px;

        &:last-child {
          margin-bottom: 0;
        }
      }
    }
  }
}

.dialog-footer {
  display: flex;
  justify-content: flex-end;
  gap: 12px;
}

// 管理员操作按钮样式
.admin-actions {
  display: flex;
  flex-direction: column;
  gap: 12px;

  .el-button {
    width: 120px;
  }
}

// 用户管理对话框样式
.user-management-content {
  .management-header {
    display: flex;
    justify-content: space-between;
    align-items: center;
    margin-bottom: 20px;
    flex-wrap: wrap;
    gap: 16px;

    .search-section {
      flex: 1;
      min-width: 200px;
    }

    .action-section {
      display: flex;
      gap: 12px;
      flex-wrap: wrap;
    }
  }

  .user-list-section {
    .el-table {
      border-radius: 8px;
      overflow: hidden;

      .el-table__header {
        background-color: #f5f7fa;
      }

      .el-table__row {
        &:hover {
          background-color: #f5f7fa;
        }
      }
    }

    .pagination-section {
      display: flex;
      justify-content: center;
      margin-top: 20px;
    }
  }
}

// 头像选择样式优化
.avatar-selection-mini {
  display: flex;
  gap: 8px;
  flex-wrap: wrap;

  .avatar-option-mini {
    width: 40px;
    height: 40px;
    border-radius: 50%;
    overflow: hidden;
    cursor: pointer;
    border: 2px solid transparent;
    transition: all 0.3s ease;

    &:hover {
      border-color: #409eff;
      transform: scale(1.1);
    }

    &.active {
      border-color: #409eff;
      box-shadow: 0 0 0 2px rgba(64, 158, 255, 0.2);
    }

    img {
      width: 100%;
      height: 100%;
      object-fit: cover;
    }
  }
}

// 表单样式优化
.el-form {
  .el-form-item {
    margin-bottom: 20px;

    .el-form-item__label {
      font-weight: 500;
      color: #303133;
    }

    .el-input,
    .el-select {
      width: 100%;
    }
  }
}

// 响应式设计 - 用户管理
@media (max-width: 768px) {
  .user-management-content {
    .management-header {
      flex-direction: column;
      align-items: stretch;

      .search-section {
        width: 100%;
      }

      .action-section {
        justify-content: center;
      }
    }

    .user-list-section {
      .el-table {
        font-size: 12px;
      }
    }
  }

  .admin-actions {
    .el-button {
      width: 100%;
    }
  }
}

// 响应式设计
@media (max-width: 768px) {
  .account-setting {
    padding: 16px;
  }

  .profile-section {
    flex-direction: column;
    text-align: center;
    gap: 16px;
  }

  .action-section {
    flex-direction: column;

    .action-btn {
      width: 100%;
    }
  }
}
</style>
