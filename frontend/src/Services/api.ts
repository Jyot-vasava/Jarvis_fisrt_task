import axios, { type AxiosResponse, type AxiosError } from 'axios';
import type { SignInData, UserFormData, RoleFormData, PaginationParams } from '../types';

const api = axios.create({
  baseURL: 'http://localhost:3000/api',
  headers: {
    'Content-Type': 'application/json',
  },
});

// Add request interceptor to attach token
api.interceptors.request.use(
  (config) => {
    const token = localStorage.getItem('token');
    if (token) {
      config.headers.Authorization = `Bearer ${token}`;
    }
    return config;
  },
  (error: AxiosError) => {
    return Promise.reject(error);
  }
);

// Add response interceptor to handle auth errors
api.interceptors.response.use(
  (response: AxiosResponse) => response,
  (error: AxiosError) => {
    if (error.response?.status === 401) {
      localStorage.removeItem('token');
      localStorage.removeItem('user');
      
      if (window.location.pathname !== '/') {
        window.location.href = '/';
      }
    }
    return Promise.reject(error);
  }
);

/* ---------- AUTH ---------- */
export const authAPI = {
  signIn: (data: SignInData) => api.post('/auth/signin', data),
};

/* ---------- USERS ---------- */
export const usersAPI = {
  getAll: (params?: PaginationParams) => api.get('/users', { params }),

  getById: (id: string) => api.get(`/users/${id}`),

  create: (data: UserFormData) => api.post('/users', data),

  update: (id: string, data: Partial<UserFormData>) => api.put(`/users/${id}`, data),

  delete: (id: string) => api.delete(`/users/${id}`),

  exportCSV: () =>
    api.get('/users/export', {
      responseType: 'blob',
    }),

  uploadFile: (file: File) => {
    const formData = new FormData();
    formData.append('file', file);
    return api.post('/upload', formData, {
      headers: {
        'Content-Type': 'multipart/form-data',
      },
    });
  },
};

/* ---------- ROLES ---------- */
export const rolesAPI = {
  getAll: (params?: {
    page?: number;
    limit?: number;
    search?: string;
    sortBy?: string;
    order?: 'asc' | 'desc';
    status?: 'Active' | 'Inactive';
  }) => api.get('/roles', { params }),

  getById: (id: string) => api.get(`/roles/${id}`),

  create: (data: RoleFormData) => api.post('/roles', data),

  update: (id: string, data: Partial<RoleFormData>) => api.put(`/roles/${id}`, data),

  delete: (id: string) => api.delete(`/roles/${id}`),
};

/* ---------- MODULES ---------- */
export const modulesAPI = {
  getAll: () => api.get('/modules'),
  
  getGrouped: () => api.get('/modules/grouped'),
};

export default api;