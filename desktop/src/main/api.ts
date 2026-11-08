import axios from 'axios'
import { WaveCheckRequest } from './type'
const apiClient = axios.create({
  baseURL: 'http://localhost:5001',
  timeout: 30000,
  headers: {
    'X-Custom-Header': 'foobar',
    'Content-Type': 'application/json'
  }
})

// POST请求封装函数
export const postRequest = async <T = any>(url: string, data?: any, config?: any): Promise<T> => {
  try {
    const response = await apiClient.post<T>(url, data, config)
    return response.data
  } catch (error) {
    console.error('POST请求错误:', error)
    throw error
  }
}

// GET请求封装函数
export const getRequest = async <T = any>(url: string, config?: any): Promise<T> => {
  try {
    const response = await apiClient.get<T>(url, config)
    return response.data
  } catch (error) {
    console.error('GET请求错误:', error)
    throw error
  }
}

// PUT请求封装函数
export const putRequest = async <T = any>(url: string, data?: any, config?: any): Promise<T> => {
  try {
    const response = await apiClient.put<T>(url, data, config)
    return response.data
  } catch (error) {
    console.error('PUT请求错误:', error)
    throw error
  }
}

// DELETE请求封装函数
export const deleteRequest = async <T = any>(url: string, config?: any): Promise<T> => {
  try {
    const response = await apiClient.delete<T>(url, config)
    return response.data
  } catch (error) {
    console.error('DELETE请求错误:', error)
    throw error
  }
}

// 具体的API调用示例
export const apiService = {
  // 检测三角波
  waveChekFnc: async (waveOptions: WaveCheckRequest) => {
    return postRequest('/wave_check', {
      data: waveOptions
    })
  }
}

// 导出axios实例，以便在其他地方直接使用
export { apiClient }
export default apiClient
