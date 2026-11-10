/**
 * Run the vendor acquisition code in a separate OS process.
 *
 * A native access violation in a Node Worker thread can terminate Electron's
 * main process. Electron's utilityProcess isolates the crash instead while
 * preserving the same postMessage/on('message') interface.
 */
import { utilityProcess } from 'electron'
import { EventEmitter } from 'node:events'
import workerScriptPath from './data-worker?modulePath'

export class AcquisitionProcess extends EventEmitter {
  private child: Electron.UtilityProcess
  private exited = false

  constructor(libPath: string) {
    super()
    this.child = utilityProcess.fork(
      workerScriptPath,
      [`--wave-lib-path=${libPath}`],
      { serviceName: 'Wave device acquisition', stdio: 'pipe' }
    )
    this.child.on('message', (message) => this.emit('message', message))
    this.child.on('error', (details: any) => {
      const reason = [details?.type, details?.location].filter(Boolean).join(' · ')
      this.emit('error', new Error(`采集子进程出错：${reason || '未知错误'}`))
    })
    this.child.on('exit', (code) => {
      this.exited = true
      this.emit('exit', code)
    })
    this.child.stdout?.on('data', (chunk) => console.log('[采集进程]', String(chunk).trimEnd()))
    this.child.stderr?.on('data', (chunk) => console.error('[采集进程]', String(chunk).trimEnd()))
  }

  postMessage(message: unknown): void {
    if (this.exited) throw new Error('采集子进程已退出，请重新初始化设备')
    this.child.postMessage(message)
  }

  async terminate(): Promise<number> {
    if (this.exited) return 0
    return new Promise((resolve) => {
      const timer = setTimeout(() => { this.off('exit', onExit); resolve(-1) }, 2000)
      const onExit = (code: number) => { clearTimeout(timer); resolve(code) }
      this.once('exit', onExit)
      if (!this.child.kill()) {
        clearTimeout(timer)
        this.off('exit', onExit)
        resolve(-1)
      }
    })
  }
}
