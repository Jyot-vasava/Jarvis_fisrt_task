import React, { useCallback, useEffect, useState } from 'react';
import { usersAPI, rolesAPI } from '../../Services/api';
import { useAuth } from '../../Context/AuthContext';
import { useToast } from '../../Context/ToastContext';
import type { User, UserFormData, Role } from '../../types';
import { Users as UsersIcon, Search, Plus, Edit, Trash2, X, Download, Eye, Upload } from 'lucide-react';
import axios, { type AxiosError } from 'axios';

const hobbiesList = [
  'Reading',
  'Gaming',
  'Sports',
  'Cooking',
  'Travel',
  'Photography',
  'Music',
  'Painting',
];

const UserManagement: React.FC = () => {
  const {
    hasPermission,
    user: currentUser,
    refreshUser
  } = useAuth();
  
  const toast = useToast();

  const [users, setUsers] = useState<User[]>([]);
  const [roles, setRoles] = useState<Role[]>([]);
  const [loading, setLoading] = useState(false);
  const [showModal, setShowModal] = useState(false);
  const [showViewModal, setShowViewModal] = useState(false);
  const [showUploadModal, setShowUploadModal] = useState(false);
  const [viewingUser, setViewingUser] = useState<User | null>(null);
  const [editingUser, setEditingUser] = useState<User | null>(null);
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState<string>('');
  const [roleFilter, setRoleFilter] = useState<string>('');

  const [currentPage, setCurrentPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [totalUsers, setTotalUsers] = useState(0);

  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [uploading, setUploading] = useState(false);
  const [uploadError, setUploadError] = useState<string>('');

  const [formData, setFormData] = useState<UserFormData>({
    userName: '',
    email: '',
    password: '',
    roleId: '',
    hobbies: [],
    status: 'Active',
  });

  const canViewUsers = hasPermission('Users', 'list');
  const canCreateUser = hasPermission('Users', 'create');
  const canEditSelf = hasPermission('Users', 'edit_self');
  const canEditAny = hasPermission('Users', 'edit_any');
  const canDeleteUser = hasPermission('Users', 'delete');
  const canExportUsers = hasPermission('Users', 'export');
  const canUpload = hasPermission('Users','upload');

  const fetchUsers = useCallback(async () => {
    if (!canViewUsers) {
      toast.error('You do not have permission to view users');
      return;
    }

    setLoading(true);
    try {
      const res = await usersAPI.getAll({
        page: currentPage,
        limit: 5,
        search,
        status: statusFilter === "Active" || statusFilter === "Inactive" ? statusFilter as "Active" | "Inactive" : undefined,
        roleId: roleFilter || undefined,
        sortBy: 'createdAt',
        order: 'desc',
      });

      setUsers(res.data.users);
      setTotalUsers(res.data.pagination.total);
      setTotalPages(res.data.pagination.totalPages);
      setErrors({});
    } catch (error) {
      console.error('Failed to fetch users:', error);

      if (axios.isAxiosError(error)) {
        const axiosError = error as AxiosError<{ message: string }>;
        toast.error(axiosError.response?.data?.message || 'Failed to fetch users');
      } else {
        toast.error('Failed to fetch users');
      }
    } finally {
      setLoading(false);
    }
  }, [canViewUsers, currentPage, search, statusFilter, roleFilter, toast]);

  const fetchRoles = useCallback(async (): Promise<void> => {
    try {
      const res = await rolesAPI.getAll();
      const allRoles: Role[] = res.data.roles || res.data;
      const activeRoles = allRoles.filter((r: Role) => r.status === 'Active');
      setRoles(activeRoles);
    } catch (error) {
      console.error('Failed to fetch roles:', error);
      toast.error('Failed to load roles');
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => {
    if (canViewUsers) {
      fetchUsers();
      fetchRoles();
    }
  }, [canViewUsers, fetchUsers, fetchRoles]);


  const validateForm = (): boolean => {
    const e: Record<string, string> = {};

    if (!formData.userName.trim()) {
      e.userName = 'Username is required';
    } else if (formData.userName.length < 3 || formData.userName.length > 50) {
      e.userName = 'Username must be between 3 and 50 characters';
    }

    if (!formData.email.trim()) {
      e.email = 'Email is required';
    } else if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(formData.email)) {
      e.email = 'Invalid email format';
    }

    if (!editingUser && !formData.password) {
      e.password = 'Password is required';
    } else if (formData.password && formData.password.length < 6) {
      e.password = 'Password must be at least 6 characters';
    }

    if (!formData.roleId) {
      e.roleId = 'Please select a role';
    }

    setErrors(e);
    return Object.keys(e).length === 0;
  };

  const handleSubmit = async (e: React.FormEvent): Promise<void> => {
    e.preventDefault();
    if (!validateForm()) return;

    if (editingUser && !canEditAny && !canEditSelf) {
      toast.error('You do not have permission to edit users');
      return;
    }
    if (!editingUser && !canCreateUser) {
      toast.error('You do not have permission to create users');
      return;
    }

    try {
      if (editingUser) {
        const { password, ...rest } = formData;
        const payload = password ? { ...rest, password } : rest;
        await usersAPI.update(editingUser._id, payload);
        toast.success('User updated successfully');
      } else {
        await usersAPI.create(formData);
        toast.success('User created successfully');
      }

      if (editingUser && currentUser?._id === editingUser._id) {
        await refreshUser();
      }

      resetForm();
      fetchUsers();
    } catch (error) {
      console.error('Failed to save user:', error);
      const axiosError = error as AxiosError<{ message: string }>;
      const errorMsg = axiosError.response?.data?.message || 'Operation failed';
      toast.error(errorMsg);
      setErrors({ submit: errorMsg });
    }
  };

  const handleView = (user: User): void => {
    setViewingUser(user);
    setShowViewModal(true);
  };

  const handleEdit = (user: User): void => {
    const isSelf = currentUser?._id === user._id;

    if (!canEditAny && !isSelf) {
      toast.error('You do not have permission to edit other users');
      return;
    }

    if (!canEditSelf && isSelf) {
      toast.error('You do not have permission to edit your profile');
      return;
    }

    setEditingUser(user);
    
    const roleId = typeof user.roleId === 'string' ? user.roleId : user.roleId._id;
    
    setFormData({
      userName: user.userName,
      email: user.email,
      password: '',
      roleId: roleId,
      hobbies: user.hobbies,
      status: user.status,
    });
    setShowModal(true);
  };

  const handleDelete = async (id: string): Promise<void> => {
    if (!canDeleteUser) {
      toast.error('You do not have permission to delete users');
      return;
    }

    if (currentUser?._id === id) {
      toast.error('You cannot delete your own account');
      return;
    }

    if (!window.confirm('Are you sure you want to delete this user?')) return;

    try {
      await usersAPI.delete(id);
      toast.success('User deleted successfully');
      fetchUsers();
    } catch (error) {
      console.error('Failed to delete user:', error);
      const axiosError = error as AxiosError<{ message: string }>;
      toast.error(axiosError.response?.data?.message || 'Failed to delete user');
    }
  };

  const handleExportCSV = async (): Promise<void> => {
    if (!canExportUsers) {
      toast.error('You do not have permission to export users');
      return;
    }

    try {
      const res = await usersAPI.exportCSV();
      const blob = new Blob([res.data], { type: 'text/csv' });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = 'Users.csv';
      a.click();
      URL.revokeObjectURL(url);
      toast.success('Users exported successfully');
    } catch (error) {
      console.error('Failed to export CSV:', error);
      toast.error('Failed to export CSV');
    }
  };

  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>): void => {
    const file = e.target.files?.[0];
    if (file) {
      setSelectedFile(file);
      setUploadError('');
    }
  };

  const handleUploadSubmit = async (): Promise<void> => {
    if (!canUpload) {
      toast.error('You do not have permission to upload files');
      return;
    }

    if (!selectedFile) {
      setUploadError('Please select a file to upload');
      return;
    }

    setUploading(true);
    setUploadError('');

    try {
      const response = await usersAPI.uploadFile(selectedFile);
      toast.success(response.data.message || 'File uploaded successfully');
      setShowUploadModal(false);
      setSelectedFile(null);
    } catch (error) {
      console.error('Upload failed:', error);
      const axiosError = error as AxiosError<{ message: string }>;
      const errorMsg = axiosError.response?.data?.message || 'failed to upload'
      setUploadError(errorMsg);
    } finally {
      setUploading(false);
    }
  };

  const resetUploadModal = (): void => {
    setShowUploadModal(false);
    setSelectedFile(null);
    setUploadError('');
    setUploading(false);
  };

  const resetForm = (): void => {
    setFormData({
      userName: '',
      email: '',
      password: '',
      roleId: '',
      hobbies: [],
      status: 'Active',
    });
    setErrors({});
    setEditingUser(null);
    setShowModal(false);
  };

  const formatDateTime = (dateString?: string): string => {
    if (!dateString) return 'N/A';
    const date = new Date(dateString);
    return date.toLocaleString('en-US', {
      year: 'numeric',
      month: 'short',
      day: '2-digit',
      hour: '2-digit',
      minute: '2-digit',
      hour12: true
    });
  };

  const getRoleName = (user: User): string => {
    if (typeof user.roleId === 'string') return 'Role ID';
    if (user.roleId && 'roleName' in user.roleId) return user.roleId.roleName;
    return 'No Role';
  };

  const formatFileSize = (bytes: number): string => {
    if (bytes === 0) return '0 Bytes';
    const k = 1024;
    const sizes = ['Bytes', 'KB', 'MB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return Math.round(bytes / Math.pow(k, i) * 100) / 100 + ' ' + sizes[i];
  };

  return (
    <div className="p-6">
      {/* Header */}
      <div className="mb-6">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-bold text-gray-800 flex items-center gap-3">
              <UsersIcon size={32} className="text-blue-600" />
              User Management
            </h1>
          </div>
          <div className="flex gap-3">
            {canUpload && (
              <button
                onClick={() => setShowUploadModal(true)}
                className="flex items-center gap-2 rounded-lg bg-yellow-600 px-4 py-2.5 text-sm font-medium text-white hover:bg-yellow-700 transition shadow-sm"
              >
                <Upload size={18} />
                Upload
              </button>
            )}
            {canExportUsers && (
              <button
                onClick={handleExportCSV}
                className="flex items-center gap-2 rounded-lg bg-green-600 px-4 py-2.5 text-sm font-medium text-white hover:bg-green-700 transition shadow-sm"
              >
                <Download size={18} />
                Export CSV
              </button>
            )}
            {canCreateUser && (
              <button
                onClick={() => setShowModal(true)}
                className="flex items-center gap-2 rounded-lg bg-blue-600 px-4 py-2.5 text-sm font-medium text-white hover:bg-blue-700 transition shadow-sm"
              >
                <Plus size={18} />
                Add User
              </button>
            )}
          </div>
        </div>
      </div>

      {/* Error Display */}
      {errors.submit && (
        <div className="mb-4 rounded-lg bg-red-100 border border-red-400 px-4 py-3 text-sm text-red-700">
          {errors.submit}
        </div>
      )}

      {/* Filters */}
      <div className="bg-white rounded-lg shadow-sm p-4 mb-6">
        <div className="flex flex-col md:flex-row gap-4">
          <div className="flex-1">
            <div className="relative">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400" size={20} />
              <input
                type="text"
                placeholder="Search users by name or email..."
                value={search}
                onChange={(e) => {
                  setSearch(e.target.value);
                  setCurrentPage(1);
                }}
                className="w-full pl-10 pr-4 py-2.5 border border-gray-300 rounded-lg"
              />
            </div>
          </div>
          
          <select
            value={roleFilter}
            onChange={(e) => {
              setRoleFilter(e.target.value);
              setCurrentPage(1);
            }}
            className="px-4 py-2.5 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
          >
            <option value="">All Roles</option>
            {roles.map(role => (
              <option key={role._id} value={role._id}>{role.roleName}</option>
            ))}
          </select>

          <select
            value={statusFilter}
            onChange={(e) => {
              setStatusFilter(e.target.value);
              setCurrentPage(1);
            }}
            className="px-4 py-2.5 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
          >
            <option value="">All Status</option>
            <option value="Active">Active</option>
            <option value="Inactive">Inactive</option>
          </select>
        </div>
      </div>

      {/* Table */}
      {loading ? (
        <div className="flex justify-center items-center h-64">
          <div className="text-gray-500 font-medium">Loading users...</div>
        </div>
      ) : users.length === 0 ? (
        <div className="bg-white rounded-lg shadow-sm p-12 text-center">
          <p className="text-gray-500 mb-4">No users found</p>
          {canCreateUser && (
            <button
              onClick={() => setShowModal(true)}
              className="mt-4 px-6 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition"
            >
              Create User
            </button>
          )}
        </div>
      ) : (
        <>
          <div className="bg-white rounded-lg shadow-sm overflow-hidden">
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead className="bg-gray-50 border-b border-gray-200">
                  <tr>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Username</th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Email</th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Role</th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Created At</th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Status</th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Actions</th>
                  </tr>
                </thead>
                <tbody className="bg-white divide-y divide-gray-200">
                  {users.map(u => (
                    <tr key={u._id} className="hover:bg-gray-50">
                      <td className="px-6 py-4 whitespace-nowrap">
                        <div className="text-sm font-medium text-gray-900">{u.userName}</div>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <div className="text-sm text-gray-600">{u.email}</div>
                      </td>
                      <td className="px-6 py-4">
                        <span className="px-2 py-1 text-xs rounded-full bg-indigo-100 text-indigo-800">
                          {getRoleName(u)}
                        </span>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <div className="text-sm text-gray-600">{formatDateTime(u.createdAt)}</div>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <span
                          className={`px-2 py-1 inline-flex text-xs leading-5 font-semibold rounded-full ${u.status === 'Active'
                            ? 'bg-green-100 text-green-800'
                            : 'bg-gray-100 text-gray-800'}`}
                        >
                          {u.status}
                        </span>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm font-medium">
                        <div className="flex gap-2">
                          <button
                            onClick={() => handleView(u)}
                            className="text-blue-600 hover:text-blue-900"
                            title="View Details"
                          >
                            <Eye size={18} />
                          </button>
                          {(canEditAny || (canEditSelf && currentUser?._id === u._id)) && (
                            <button
                              onClick={() => handleEdit(u)}
                              className="text-yellow-600 hover:text-yellow-900"
                              title="Edit User"
                            >
                              <Edit size={18} />
                            </button>
                          )}
                          {canDeleteUser && currentUser?._id !== u._id && (
                            <button
                              onClick={() => handleDelete(u._id)}
                              className="text-red-600 hover:text-red-900"
                              title="Delete User"
                            >
                              <Trash2 size={18} />
                            </button>
                          )}
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>

          <div className="bg-white rounded-lg shadow px-6 py-4 mt-4 flex items-center justify-between">
            <div className="text-sm text-gray-700">
              Showing {users.length} of {totalUsers} users
            </div>

            <div className="flex gap-2">
              <button
                onClick={() => setCurrentPage(p => Math.max(1, p - 1))}
                disabled={currentPage === 1}
                className="px-4 py-2 border border-gray-300 rounded-lg disabled:opacity-50"
              >
                Previous
              </button>

              <span className="px-4 py-2 border border-gray-300 rounded-lg bg-blue-50">
                Page {currentPage} of {totalPages}
              </span>

              <button
                onClick={() => setCurrentPage(p => Math.min(totalPages, p + 1))}
                disabled={totalPages === 1 || currentPage === totalPages}
                className="px-4 py-2 border border-gray-300 rounded-lg disabled:opacity-50"
              >
                Next
              </button>
            </div>
          </div>
        </>
      )}

      {/* View Modal */}
      {showViewModal && viewingUser && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-lg shadow-xl max-w-2xl w-full max-h-[90vh] overflow-y-auto">
            <div className="p-6 border-b border-gray-200 flex justify-between items-center">
              <h3 className="text-xl font-semibold text-gray-900">User Details</h3>
              <button
                onClick={() => setShowViewModal(false)}
                className="text-gray-400 hover:text-gray-600"
              >
                <X size={24} />
              </button>
            </div>
            <div className="p-6 space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-500">Username</label>
                <p className="mt-1 text-lg font-semibold text-gray-900">{viewingUser.userName}</p>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-500">Email</label>
                <p className="mt-1 text-lg text-gray-900">{viewingUser.email}</p>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-500 mb-2">Role</label>
                <span className="px-3 py-1 text-sm rounded-full bg-indigo-100 text-indigo-800">
                  {getRoleName(viewingUser)}
                </span>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-500 mb-2">Hobbies</label>
                <div className="flex flex-wrap gap-2">
                  {viewingUser.hobbies && viewingUser.hobbies.length > 0 ? (
                    viewingUser.hobbies.map(h => (
                      <span key={h} className="px-3 py-1 text-sm rounded-full bg-green-100 text-green-800">
                        {h}
                      </span>
                    ))
                  ) : (
                    <span className="text-sm text-gray-400">No hobbies</span>
                  )}
                </div>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-500">Created At</label>
                <p className="mt-1 text-sm text-gray-900">{formatDateTime(viewingUser.createdAt)}</p>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-500">Status</label>
                <p className="mt-1">
                  <span className={`px-3 py-1 text-sm font-semibold rounded-full ${viewingUser.status === 'Active' ? 'bg-green-100 text-green-800' : 'bg-gray-100 text-gray-800'
                    }`}>
                    {viewingUser.status}
                  </span>
                </p>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Edit/Create Modal */}
      {showModal && (canCreateUser || canEditAny || canEditSelf) && (
        <div
          className="fixed inset-0 flex items-center justify-center bg-black/50 z-50"
          onClick={e => e.target === e.currentTarget && resetForm()}
        >
          <div className="w-full max-w-xl rounded-lg bg-white p-6 max-h-[90vh] overflow-y-auto">
            <h3 className="mb-4 text-xl font-bold">
              {editingUser ? 'Edit User' : 'Add User'}
            </h3>

            {errors.submit && (
              <div className="mb-4 rounded bg-red-100 px-4 py-2 text-sm text-red-700">
                {errors.submit}
              </div>
            )}

            <form onSubmit={handleSubmit} className="space-y-4">
              <div>
                <label className="block text-sm font-medium mb-1">Username *</label>
                <input
                  className={`w-full rounded border px-3 py-2 ${errors.userName ? 'border-red-500' : 'border-gray-300'}`}
                  placeholder="Enter username (3-50 characters)"
                  value={formData.userName}
                  onChange={e =>
                    setFormData({ ...formData, userName: e.target.value })
                  }
                />
                {errors.userName && (
                  <p className="text-sm text-red-600 mt-1">{errors.userName}</p>
                )}
              </div>

              <div>
                <label className="block text-sm font-medium mb-1">Email *</label>
                <input
                  type="email"
                  className={`w-full rounded border px-3 py-2 ${errors.email ? 'border-red-500' : 'border-gray-300'}`}
                  placeholder="Enter valid email address"
                  value={formData.email}
                  onChange={e =>
                    setFormData({ ...formData, email: e.target.value })
                  }
                />
                {errors.email && <p className="text-sm text-red-600 mt-1">{errors.email}</p>}
              </div>

              <div>
                <label className="block text-sm font-medium mb-1">
                  {editingUser ? 'Password (leave blank to keep current)' : 'Password *'}
                </label>
                <input
                  type="password"
                  className={`w-full rounded border px-3 py-2 ${errors.password ? 'border-red-500' : 'border-gray-300'}`}
                  placeholder={editingUser ? 'Leave blank to keep password' : 'At least 6 characters'}
                  value={formData.password}
                  onChange={e =>
                    setFormData({ ...formData, password: e.target.value })
                  }
                />
                {errors.password && <p className="text-sm text-red-600 mt-1">{errors.password}</p>}
              </div>

              <div>
                <label className="block text-sm font-medium mb-1">Role *</label>
                <select
                  className={`w-full rounded border px-3 py-2 ${errors.roleId ? 'border-red-500' : 'border-gray-300'}`}
                  value={formData.roleId}
                  onChange={e =>
                    setFormData({
                      ...formData,
                      roleId: e.target.value,
                    })
                  }
                >
                  <option value="">Select a role</option>
                  {roles.map(r => (
                    <option key={r._id} value={r._id}>
                      {r.roleName}
                    </option>
                  ))}
                </select>
                {errors.roleId && <p className="text-sm text-red-600 mt-1">{errors.roleId}</p>}
              </div>

              <div>
                <label className="block text-sm font-medium mb-1">
                  Hobbies (Hold Ctrl/Cmd to select multiple)
                </label>
                <select
                  multiple
                  className="w-full rounded border border-gray-300 px-3 py-2 min-h-25"
                  value={formData.hobbies}
                  onChange={e =>
                    setFormData({
                      ...formData,
                      hobbies: Array.from(e.target.selectedOptions, o => o.value),
                    })
                  }
                >
                  {hobbiesList.map(h => (
                    <option key={h}>{h}</option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-sm font-medium mb-2">Status</label>
                <div className="flex gap-4">
                  {['Active', 'Inactive'].map(s => (
                    <label key={s} className="flex items-center gap-2">
                      <input
                        type="radio"
                        checked={formData.status === s}
                        onChange={() =>
                          setFormData({
                            ...formData,
                            status: s as 'Active' | 'Inactive',
                          })
                        }
                      />
                      {s}
                    </label>
                  ))}
                </div>
              </div>

              <div className="flex justify-end gap-2 pt-4 border-t">
                <button
                  type="button"
                  onClick={resetForm}
                  className="rounded border border-gray-300 px-6 py-2 hover:bg-gray-50"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="rounded bg-blue-600 px-6 py-2 text-white hover:bg-blue-700"
                >
                  {editingUser ? 'Update' : 'Create'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Upload Modal */}
      {showUploadModal && canUpload && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-lg shadow-xl max-w-lg w-full">
            <div className="p-6 border-b border-gray-200 flex justify-between items-center">
              <h3 className="text-xl font-semibold text-gray-900">Upload Your Document </h3>
              <button
                onClick={resetUploadModal}
                className="text-gray-400 hover:text-gray-600"
                disabled={uploading}
              >
                <X size={24} />
              </button>
            </div>

            <div className="p-6 space-y-4">
              {uploadError && (
                <div className="bg-red-100 border border-red-400 text-red-700 px-4 py-3 rounded">
                  {uploadError}
                </div>
              )}

              <div >
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Select File
                </label>
                <input
                  type="file"
                  onChange={handleFileSelect}
                  disabled={uploading}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 disabled:bg-gray-100"
                />
                
              </div>

              {selectedFile && (
                <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-3">
                      <div className="bg-blue-100 p-2 rounded">
                        <Upload size={20} className="text-blue-600" />
                      </div>
                      <div>
                        <p className="text-sm font-medium text-gray-900">{selectedFile.name}</p>
                        <p className="text-xs text-gray-500">{formatFileSize(selectedFile.size)}</p>
                      </div>
                    </div>
                    {!uploading && (
                      <button
                        onClick={() => setSelectedFile(null)}
                        className="text-gray-400 hover:text-gray-600"
                      >
                        <X size={18} />
                      </button>
                    )}
                  </div>
                </div>
              )}

              <div className="flex justify-end gap-3 pt-4 border-t">
                <button
                  onClick={resetUploadModal}
                  disabled={uploading}
                  className="px-6 py-2 border border-gray-300 rounded-lg text-gray-700 hover:bg-gray-50 transition disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  Cancel
                </button>
                <button
                  onClick={handleUploadSubmit}
                  disabled={!selectedFile || uploading}
                  className="px-6 py-2 bg-yellow-600 text-white rounded-lg hover:bg-yellow-700 transition disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2"
                >
                  {uploading ? (
                    <>
                      <svg className="animate-spin h-5 w-5" viewBox="0 0 24 24">
                        <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" fill="none" />
                        <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" />
                      </svg>
                      Uploading...
                    </>
                  ) : (
                    <>
                      <Upload size={18} />
                      Upload File
                    </>
                  )}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default UserManagement;