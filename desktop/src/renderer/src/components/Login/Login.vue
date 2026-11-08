<template>
  <div class="login-container">
    <div class="login-box">
      <div class="login-header">
        <h2>电源波形缺陷检测系统</h2>
        <p>请登录您的账户</p>
      </div>

      <el-form
        ref="loginFormRef"
        :model="loginForm"
        :rules="loginRules"
        class="login-form"
        @submit.prevent="handleLogin"
      >
        <el-form-item prop="username">
          <el-input
            v-model="loginForm.username"
            placeholder="请输入用户名"
            size="large"
            prefix-icon="User"
          />
        </el-form-item>

        <el-form-item prop="password">
          <el-input
            v-model="loginForm.password"
            type="password"
            placeholder="请输入密码"
            size="large"
            prefix-icon="Lock"
            show-password
            @keyup.enter="handleLogin"
          />
        </el-form-item>

        <el-form-item>
          <el-checkbox v-model="loginForm.remember">记住密码</el-checkbox>
        </el-form-item>

        <el-form-item>
          <el-button
            type="primary"
            size="large"
            class="login-button"
            :loading="loading"
            @click="handleLogin"
          >
            登录
          </el-button>
        </el-form-item>
      </el-form>

      <div class="login-tips">
        <p>默认账户：admin / 123456</p>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, reactive } from 'vue'
import { useRouter, useRoute } from 'vue-router'
import { ElMessage, type FormInstance } from 'element-plus'
import { useUserStore } from '@renderer/store/user'
import { useLogStore } from '@renderer/store/logStore'
import { storeToRefs } from 'pinia'

const router = useRouter()
const route = useRoute()
const userStore = useUserStore()
const logStore = useLogStore()
const { userInfo } = storeToRefs(userStore)

const loginFormRef = ref<FormInstance>()
const loading = ref(false)

const loginForm = reactive({
  username: '',
  password: '',
  remember: false
})

const loginRules = {
  username: [
    { required: true, message: '请输入用户名', trigger: 'blur' },
    { min: 2, max: 20, message: '用户名长度在 2 到 20 个字符', trigger: 'blur' }
  ],
  password: [
    { required: true, message: '请输入密码', trigger: 'blur' },
    { min: 6, max: 20, message: '密码长度在 6 到 20 个字符', trigger: 'blur' }
  ]
}

const handleLogin = async () => {
  if (!loginFormRef.value) return

  await loginFormRef.value.validate(async (valid) => {
    if (valid) {
      loading.value = true

      try {
        const result = await userStore.login(loginForm.username, loginForm.password)

        if (result.success) {
          ElMessage.success(result.message)
          const redirect = (route.query.redirect as string) || '/setting/account'
          console.log('currentRedict', redirect, 'fullPath', route.query.redirec)
          router.push(redirect)
          logStore.addLog({
            level: 'info',
            message: `${userInfo.value?.username}登录成功`,
            details: `登录时间${userInfo.value?.lastLoginTime}`,
            source: '用户信息'
          })
        } else {
          ElMessage.error(result.message)
        }
      } catch (error) {
        ElMessage.error('登录失败，请重试')
      } finally {
        loading.value = false
      }
    }
  })
}
</script>

<style scoped lang="less">
.login-container {
  height: 100vh;
  background: #f5f7fa;
  display: flex;
  justify-content: center;
  align-items: center;
}

.login-box {
  width: 400px;
  padding: 40px;
  background: rgba(255, 255, 255, 0.95);
  border-radius: 10px;
  box-shadow: 0 15px 35px rgba(0, 0, 0, 0.1);
  backdrop-filter: blur(10px);
}

.login-header {
  text-align: center;
  margin-bottom: 30px;

  h2 {
    color: #333;
    margin-bottom: 10px;
    font-size: 24px;
  }

  p {
    color: #666;
    font-size: 14px;
  }
}

.login-form {
  .login-button {
    width: 100%;
    height: 45px;
    font-size: 16px;
  }
}

.login-tips {
  text-align: center;
  margin-top: 20px;

  p {
    color: #999;
    font-size: 12px;
  }
}
</style>
