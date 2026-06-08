import axios from 'axios';
import { Guest, Stats, ApiResponse, CreateGuestInput, UpdateGuestInput } from '../types';

const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:5000/api';

const api = axios.create({
  baseURL: API_URL,
  headers: {
    'Content-Type': 'application/json',
  },
});

// Add token to requests
api.interceptors.request.use((config) => {
  const token = localStorage.getItem('luma_guests_token');
  if (token) {
    config.headers.Authorization = `Bearer ${token}`;
  }
  return config;
});

// Guest endpoints
export const guestService = {
  getAll: async (): Promise<Guest[]> => {
    const response = await api.get<ApiResponse<Guest[]>>('/guests');
    if (!response.data.success) {
      throw new Error(response.data.error || 'Failed to fetch guests');
    }
    return response.data.data || [];
  },

  getById: async (id: string): Promise<Guest> => {
    const response = await api.get<ApiResponse<Guest>>(`/guests/${id}`);
    if (!response.data.success) {
      throw new Error(response.data.error || 'Failed to fetch guest');
    }
    return response.data.data!;
  },

  create: async (data: CreateGuestInput): Promise<Guest> => {
    const response = await api.post<ApiResponse<Guest>>('/guests', data);
    if (!response.data.success) {
      throw new Error(response.data.error || 'Failed to create guest');
    }
    return response.data.data!;
  },

  update: async (id: string, data: UpdateGuestInput): Promise<Guest> => {
    const response = await api.put<ApiResponse<Guest>>(`/guests/${id}`, data);
    if (!response.data.success) {
      throw new Error(response.data.error || 'Failed to update guest');
    }
    return response.data.data!;
  },

  delete: async (id: string): Promise<void> => {
    const response = await api.delete<ApiResponse<null>>(`/guests/${id}`);
    if (!response.data.success) {
      throw new Error(response.data.error || 'Failed to delete guest');
    }
  },
};

// Stats endpoint
export const statsService = {
  getStats: async (): Promise<Stats> => {
    const response = await api.get<ApiResponse<Stats>>('/stats');
    if (!response.data.success) {
      throw new Error(response.data.error || 'Failed to fetch stats');
    }
    return response.data.data!;
  },
};

// Auth endpoints
export const authService = {
  login: async (email: string, password: string): Promise<{ user: any; token: string }> => {
    const response = await api.post<ApiResponse<any>>('/auth/login', { email, password });
    if (!response.data.success) {
      throw new Error(response.data.error || 'Login failed');
    }
    if (!response.data.data?.token) {
      throw new Error('No token received from server');
    }
    return response.data.data;
  },

  register: async (
    email: string,
    password: string,
    name?: string
  ): Promise<{ user: any; token: string }> => {
    const response = await api.post<ApiResponse<any>>('/auth/register', { email, password, name });
    if (!response.data.success) {
      throw new Error(response.data.error || 'Registration failed');
    }
    if (!response.data.data?.token) {
      throw new Error('No token received from server');
    }
    return response.data.data;
  },

  getCurrentUser: async (): Promise<any> => {
    const response = await api.get<ApiResponse<any>>('/auth/me');
    if (!response.data.success) {
      throw new Error(response.data.error || 'Failed to fetch user');
    }
    return response.data.data;
  },
};

export default api;
