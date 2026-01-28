export interface Module {
  _id: string;
  moduleName: string;
  action: string;
  // description?: string;
}

export interface ModuleGroup {
  moduleName: string;
  actions: {
    _id: string;
    action: string;
    description?: string;
  }[];
}

// Role types
export interface Role {
  _id: string;
  roleName: string;
  status: 'Active' | 'Inactive';
  permissions: Module[] ; 
  createdAt?: string;
  updatedAt?: string;
}

export interface RoleFormData {
  roleName: string;
  status: 'Active' | 'Inactive';
  permissions: string[]; 
}

// User types
export interface User {
  _id: string;
  userName: string;
  email: string;
  roleId: Role | string; // Can be populated or just ID
  hobbies: string[];
  status: 'Active' | 'Inactive';
  createdAt?: string;
  updatedAt?: string;
}

export interface UserFormData {
  userName: string;
  email: string;
  password: string;
  roleId: string; 
  hobbies: string[];
  status: 'Active' | 'Inactive';
}

// Auth types
export interface SignInData {
  email: string;
  password: string;
}

export interface AuthUser {
  id: string;
  userName: string;
  email: string;
  status: 'Active' | 'Inactive';
  role: Role;
  permissions: {
    moduleId: string;
    moduleName: string;
    action: string;
  }[];
}

// API types
export interface PaginationParams {
  page?: number;
  limit?: number;
  search?: string;
  sortBy?: string;
  order?: 'asc' | 'desc';
  status?: 'Active' | 'Inactive';
  roleId?: string;
}

export interface ApiResponse<T> {
  data: T;
  message?: string;
}

export interface PaginatedResponse<T> {
  data: T[];
  pagination: {
    total: number;
    page: number;
    limit: number;
    totalPages: number;
  };
}