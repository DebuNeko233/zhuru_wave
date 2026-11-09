import { contextBridge, ipcRenderer } from 'electron'
import { electronAPI } from '@electron-toolkit/preload'

// 有效的 IPC 通道列表
const validChannels = [
  'read-image',
  'dialog:showOpenDialog',
  'fs:read-analyze-csv-files',
  'fs:read-analyze-csv-batch',
  'config:changeEnerageLevelConfig',
  'app:restart',
  'data:init-device',
  'data:get-single-channel',
  'data:get-all-channels',
  'data:get-sample-rate',
  'data:lookup-sample-rate',
  'data:get-chart-data',
  'data:run-sample-case',
  'data:get-device-status',
  'data:start-collection',
  'data:stop-collection',
  'data:deinit-device',
  'data:initialize-device',
  'data:start-device-polling',
  'data:stop-device-polling',
  'data:reinitialize-device-with-new-worker',
  'data:reset-device',
  'data:isTriangle',
  'data:detector-health',
  'data:lissajous',
  'fs:read-alarm-files',
  'fs:save-alarm-file',
  'fs:delete-alarm-file',
  'user:get-profile-by-id',
  'user:add-user',
  'user:delete-user',
  'user:get-all-users',
  'user:verify-password',
  'user:change-password',
  'user:get-profile-by-username',
  'user:save-profile',
  'user:get-user-setting',
  'user:set-user-setting',
  'user:get-profile-login',
  'fs:ensureDir',
  'fs:fileExists',
  'fs:appendFile',
  'fs:readFile',
  'fs:writeFile',
  'fs:writeCSVFile',
  'fs:appendCSVFile',
  'fs:cleanupOldLogs',
  'config:get-enerage-level-map',
  'config:set-enerage-level-map'
]

// Custom APIs for renderer
const api = {
  invoke: (channel: string, ...args: any[]) => {
    if (validChannels.includes(channel)) {
      return ipcRenderer.invoke(channel, ...args)
    }
    throw new Error(`不允许调用未授权的 IPC 通道: ${channel}`)
  },
  on: (channel: string, callback: (...args: any[]) => void) => {
    ipcRenderer.on(channel, (_, ...args) => callback(...args))
  },
  off: (channel: string, callback: (...args: any[]) => void) => {
    ipcRenderer.removeListener(channel, callback)
  }
}

// Use `contextBridge` APIs to expose Electron APIs to
// renderer only if context isolation is enabled, otherwise
// just add to the DOM global.
if (process.contextIsolated) {
  try {
    contextBridge.exposeInMainWorld('electron', electronAPI)
    contextBridge.exposeInMainWorld('electronAPI', api)
  } catch (error) {
    console.error(error)
  }
} else {
  // @ts-ignore (define in dts)
  window.electron = electronAPI
  // @ts-ignore (define in dts)
  window.electronAPI = api
}
