import axios from 'axios'
import { User } from '@/types'

const API_URL = process.env.NEXT_PUBLIC_SSO_SERVICE_URL || 'http://localhost:4007'

export interface LoginCredentials {
  email: string
  password: string
}

export interface LoginResponse {
  success: boolean
  data?: {
    user: User
    token: string
  }
  message?: string
}

export interface RegisterData {
  email: string
  password: string
  firstName: string
  lastName: string
  role: 'admin' | 'teacher' | 'student' | 'parent' | 'staff'
}

export const authService = {
  async login(credentials: LoginCredentials): Promise<LoginResponse> {
    try {
      const response = await axios.post<LoginResponse>(
        `${API_URL}/api/auth/login`,
        credentials
      )
      return response.data
    } catch (error: any) {
      return {
        success: false,
        message: error.response?.data?.message || 'Login failed',
      }
    }
  },

  async register(data: RegisterData): Promise<LoginResponse> {
    try {
      const response = await axios.post<LoginResponse>(
        `${API_URL}/api/auth/register`,
        data
      )
      return response.data
    } catch (error: any) {
      return {
        success: false,
        message: error.response?.data?.message || 'Registration failed',
      }
    }
  },

  async logout(): Promise<void> {
    localStorage.removeItem('token')
    localStorage.removeItem('user')
  },

  async getCurrentUser(token: string): Promise<User | null> {
    try {
      const response = await axios.get<{ success: boolean; data: User }>(
        `${API_URL}/api/auth/me`,
        {
          headers: {
            Authorization: `Bearer ${token}`,
          },
        }
      )
      return response.data.data
    } catch (error) {
      return null
    }
  },
}
