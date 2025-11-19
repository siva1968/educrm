import axios, { AxiosInstance, AxiosRequestConfig, AxiosResponse } from 'axios'

export interface ApiResponse<T = any> {
  success: boolean
  data?: T
  message?: string
  errors?: any[]
  pagination?: {
    page: number
    limit: number
    total: number
    totalPages: number
    hasNextPage: boolean
    hasPrevPage: boolean
  }
}

class ApiClient {
  private client: AxiosInstance

  constructor(baseURL: string) {
    this.client = axios.create({
      baseURL,
      timeout: 30000,
      headers: {
        'Content-Type': 'application/json',
      },
    })

    // Request interceptor
    this.client.interceptors.request.use(
      (config) => {
        // Add auth token if available
        const token = this.getToken()
        if (token) {
          config.headers.Authorization = `Bearer ${token}`
        }
        return config
      },
      (error) => Promise.reject(error)
    )

    // Response interceptor
    this.client.interceptors.response.use(
      (response) => response,
      (error) => {
        if (error.response?.status === 401) {
          // Handle unauthorized
          this.clearToken()
          if (typeof window !== 'undefined') {
            window.location.href = '/auth/login'
          }
        }
        return Promise.reject(error)
      }
    )
  }

  private getToken(): string | null {
    if (typeof window !== 'undefined') {
      return localStorage.getItem('token')
    }
    return null
  }

  private clearToken(): void {
    if (typeof window !== 'undefined') {
      localStorage.removeItem('token')
    }
  }

  async get<T = any>(url: string, config?: AxiosRequestConfig): Promise<ApiResponse<T>> {
    const response: AxiosResponse<ApiResponse<T>> = await this.client.get(url, config)
    return response.data
  }

  async post<T = any>(url: string, data?: any, config?: AxiosRequestConfig): Promise<ApiResponse<T>> {
    const response: AxiosResponse<ApiResponse<T>> = await this.client.post(url, data, config)
    return response.data
  }

  async put<T = any>(url: string, data?: any, config?: AxiosRequestConfig): Promise<ApiResponse<T>> {
    const response: AxiosResponse<ApiResponse<T>> = await this.client.put(url, data, config)
    return response.data
  }

  async delete<T = any>(url: string, config?: AxiosRequestConfig): Promise<ApiResponse<T>> {
    const response: AxiosResponse<ApiResponse<T>> = await this.client.delete(url, config)
    return response.data
  }

  async patch<T = any>(url: string, data?: any, config?: AxiosRequestConfig): Promise<ApiResponse<T>> {
    const response: AxiosResponse<ApiResponse<T>> = await this.client.patch(url, data, config)
    return response.data
  }
}

// Create API client instances for each microservice
export const studentApi = new ApiClient(process.env.NEXT_PUBLIC_STUDENT_SERVICE_URL || 'http://localhost:4100')
export const attendanceApi = new ApiClient(process.env.NEXT_PUBLIC_ATTENDANCE_SERVICE_URL || 'http://localhost:4101')
export const feeApi = new ApiClient(process.env.NEXT_PUBLIC_FEE_SERVICE_URL || 'http://localhost:4140')
export const gradebookApi = new ApiClient(process.env.NEXT_PUBLIC_GRADEBOOK_SERVICE_URL || 'http://localhost:4111')
export const timetableApi = new ApiClient(process.env.NEXT_PUBLIC_TIMETABLE_SERVICE_URL || 'http://localhost:4110')
export const lmsApi = new ApiClient(process.env.NEXT_PUBLIC_LMS_SERVICE_URL || 'http://localhost:4115')

export default ApiClient
