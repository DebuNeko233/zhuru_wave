// 通过 preload 脚本暴露的 API
declare global {
  interface Window {
    electronAPI: {
      invoke: (channel: string, ...args: any[]) => Promise<any>
    }
  }
}

export const useDataProvider = () => {
  const initDevice = async (): Promise<boolean> => {
    return await window.electronAPI.invoke('data:init-device')
  }

  const getSingleChannelData = async (channelIndex: number, maxLen: number = 10000) => {
    return await window.electronAPI.invoke('data:get-single-channel', channelIndex, maxLen)
  }

  const getAllChannelData = async (maxLen: number = 1000) => {
    return await window.electronAPI.invoke('data:get-all-channels', maxLen)
  }

  const getSampleRate = async (): Promise<number> => {
    return await window.electronAPI.invoke('data:get-sample-rate')
  }

  const lookupSampleRateHz = async (timeDivIdx: number, channelCount: number): Promise<number> => {
    return await window.electronAPI.invoke('data:lookup-sample-rate', timeDivIdx, channelCount)
  }

  const getChartData = async (channelIndex: number, maxLen: number = 1000) => {
    return await window.electronAPI.invoke('data:get-chart-data', channelIndex, maxLen)
  }

  const runSampleCase = async () => {
    return await window.electronAPI.invoke('data:run-sample-case')
  }

  return {
    initDevice,
    getSingleChannelData,
    getAllChannelData,
    getSampleRate,
    lookupSampleRateHz,
    getChartData,
    runSampleCase
  }
}
