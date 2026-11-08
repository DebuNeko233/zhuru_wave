import './assets/main.css'

import { createApp } from 'vue'
import App from './App.vue'
import router from './router/index'
import pinia from './store/index'
import ElementPlus from 'element-plus'
import 'element-plus/dist/index.css'
// 导入响应式字体管理器
import '@renderer/utils/responsive'

const app = createApp(App)

app.use(pinia)
app.use(router)
app.use(ElementPlus)
app.mount('#app')
