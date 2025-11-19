import axios, { AxiosInstance, AxiosRequestConfig, AxiosResponse, AxiosError } from 'axios'
import { toast } from 'sonner'

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

export interface ApiErrorResponse {
  success: false
  message: string
  errors?: { field: string; message: string }[]
  statusCode?: number
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

        // Add request ID for tracking
        config.headers['X-Request-ID'] = this.generateRequestId()

        return config
      },
      (error) => {
        console.error('Request error:', error)
        return Promise.reject(error)
      }
    )

    // Response interceptor
    this.client.interceptors.response.use(
      (response) => response,
      async (error: AxiosError<ApiErrorResponse>) => {
        // Handle different error scenarios
        if (error.response) {
          const { status, data } = error.response

          switch (status) {
            case 401:
              // Unauthorized - clear auth and redirect
              this.clearToken()
              if (typeof window !== 'undefined' && !window.location.pathname.includes('/auth/login')) {
                toast.error('Session expired. Please login again.')
                window.location.href = '/auth/login'
              }
              break

            case 403:
              toast.error('You do not have permission to perform this action')
              break

            case 404:
              toast.error(data?.message || 'Resource not found')
              break

            case 422:
              // Validation errors
              if (data?.errors && data.errors.length > 0) {
                data.errors.forEach((err) => {
                  toast.error(`${err.field}: ${err.message}`)
                })
              } else {
                toast.error(data?.message || 'Validation error')
              }
              break

            case 500:
              toast.error('Internal server error. Please try again later.')
              break

            default:
              toast.error(data?.message || 'An error occurred')
          }
        } else if (error.request) {
          // Request made but no response
          toast.error('Network error. Please check your connection.')
        } else {
          // Something else happened
          toast.error('An unexpected error occurred')
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
      localStorage.removeItem('user')
      document.cookie = 'token=; path=/; max-age=0'
    }
  }

  private generateRequestId(): string {
    return `${Date.now()}-${Math.random().toString(36).substr(2, 9)}`
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
