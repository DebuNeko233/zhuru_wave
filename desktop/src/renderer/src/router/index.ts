import { useUserStore } from '@renderer/store/user'
import { createRouter, createWebHashHistory } from 'vue-router'

import type { RouteRecordRaw } from 'vue-router'

const MainWindow = () => import('@renderer/components/MainWindow/MainWindow.vue')
const LissajousPage = () => import('@renderer/components/Lissajous/LissajousPage.vue')
const RecordPage = () => import('@renderer/components/RecordPage/RecordPage.vue')
const Login = () => import('@renderer/components/Login/Login.vue')
const Channelinfo = () => import('@renderer/components/ChannelInfo/ChannelInfo.vue')
const Setting = () => import('@renderer/components/SettingPage/SettingPage.vue')
const AccountSetting = () => import('@renderer/components/SettingPage/c-cpns/AccountSetting.vue')
const AppearanceSetting = () =>
  import('@renderer/components/SettingPage/c-cpns/AppearanceSetting.vue')
const ParamentSetting = () => import('@renderer/components/SettingPage/c-cpns/ParamentSetting.vue')
const Logs = () => import('@renderer/components/Logs/Logs.vue')
const ProgramingParamentSetting = () =>
  import('@renderer/components/SettingPage/c-cpns/ProgramingParament.vue')

const routes: RouteRecordRaw[] = [
  {
    path: '/',
    name: 'Home',
    component: MainWindow,
    meta: { requiresAuth: false, KeepAlive: true }
  },
  {
    path: '/lissajous',
    name: 'Lissajous',
    component: LissajousPage,
    meta: { requiresAuth: false, KeepAlive: true }
  },
  {
    path: '/channel/:channelId',
    name: 'Channel',
    component: Channelinfo,
    meta: { requiresAuth: false, KeepAlive: true }
  },
  {
    path: '/record',
    name: 'About',
    component: RecordPage,
    meta: { requiresAuth: false, KeepAlive: false }
  },
  {
    path: '/logs',
    name: 'logs',
    component: Logs,
    meta: { requiresAuth: true, KeepAlive: false }
  },
  {
    path: '/login',
    name: 'Login',
    component: Login,
    meta: { requiresAuth: false, KeepAlive: false }
  },
  {
    path: '/Setting',
    name: 'Setting',
    component: Setting,
    meta: { requiresAuth: true, KeepAlive: false },
    children: [
      {
        path: '',
        name: 'SettingDefault',
        redirect: '/Setting/account'
      },
      {
        path: 'account',
        name: 'AccountSetting',
        component: AccountSetting
      },
      {
        path: 'parament',
        name: 'ParamentSetting',
        component: ParamentSetting
      },
      {
        path: 'programingParament',
        name: 'ProgramingParamentSetting',
        component: ProgramingParamentSetting
      },
      {
        path: 'appearance',
        name: 'AppearanceSetting',
        component: AppearanceSetting
      }
    ]
  }
]

const router = createRouter({
  history: createWebHashHistory(),
  routes
})

router.beforeEach((to, _, next) => {
  const userStore = useUserStore()

  if (!userStore.isLoggedIn) {
    userStore.initUserState()
  }
  if (to.meta.requiresAuth && !userStore.isLoggedIn) {
    next({
      path: '/login',
      query: { redirect: to.path }
    })
  } else if (to.path === '/login' && userStore.isLoggedIn) {
    next('/')
  } else {
    next()
  }
})

export default router
