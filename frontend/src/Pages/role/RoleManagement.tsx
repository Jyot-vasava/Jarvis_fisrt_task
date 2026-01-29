import React, { useState, useEffect, useCallback } from 'react';
import { rolesAPI, modulesAPI } from '../../Services/api';
import { useAuth } from '../../Context/AuthContext';
import { useToast } from '../../Context/ToastContext';
import type { Role, RoleFormData, ModuleGroup } from '../../types';
import { Search, Plus, Edit, Trash2, X, Shield, CheckSquare, Square } from 'lucide-react';
import type { AxiosError } from 'axios';

const RoleManagement: React.FC = () => {
  const { hasPermission, refreshUser } = useAuth();
  const toast = useToast();
  
  const [roles, setRoles] = useState<Role[]>([]);
  const [modules, setModules] = useState<ModuleGroup[]>([]);
  const [loading, setLoading] = useState(false);
  const [modulesLoading, setModulesLoading] = useState(false);
  const [showModal, setShowModal] = useState(false);
  const [editingRole, setEditingRole] = useState<Role | null>(null);
  const [errors, setErrors] = useState<{ roleName?: string; submit?: string }>({});

  const canViewRoles = hasPermission('Roles', 'list');
  const canCreateRole = hasPermission('Roles', 'create');
  const canEditRole = hasPermission('Roles', 'edit');
  const canDeleteRole = hasPermission('Roles', 'delete');

  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState<string>('');
  const [currentPage, setCurrentPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [totalRoles, setTotalRoles] = useState(0);

  const [formData, setFormData] = useState<RoleFormData>({
    roleName: '',
    status: 'Active',
    permissions: [],
  });

  // Fetch modules/permissions
  const fetchModules = useCallback(async () => {
    setModulesLoading(true);
    try {
      const res = await modulesAPI.getGrouped();
      
      if (res.data && res.data.modules && Array.isArray(res.data.modules)) {
        setModules(res.data.modules);

        res.data.modules.forEach((mod: ModuleGroup) => {
          console.log(`Module: ${mod.moduleName}`);
        });
      } else {
        setModules([]);
        toast.error('Invalid modules data format');
      }
    } catch (error) {
      const axiosError = error as AxiosError<{ message: string }>;
      toast.error(axiosError.response?.data?.message || 'Failed to load permissions');
      setModules([]);
    } finally {
      setModulesLoading(false);
    }
  }, [toast]);

  const fetchRoles = useCallback(async () => {
    if (!canViewRoles) return;
    
    setLoading(true);
    try {
      const res = await rolesAPI.getAll({
        page: currentPage,
        limit: 5,
        search,
        status: (statusFilter as 'Active' | 'Inactive' | undefined) || undefined,
        sortBy: 'createdAt',
        order: 'desc',
      });
      setRoles(res.data.roles || []);
      setTotalRoles(res.data.pagination?.total || 0);
      setTotalPages(res.data.pagination?.totalPages || 1);
    } catch (error) {
      const axiosError = error as AxiosError<{ message: string }>;
      toast.error(axiosError.response?.data?.message || 'Failed to fetch roles');
    } finally {
      setLoading(false);
    }
  }, [canViewRoles, currentPage, search, statusFilter, toast]);

  useEffect(() => {
    if (canViewRoles) {
      fetchRoles();
    }
  }, [canViewRoles, fetchRoles]);

  useEffect(() => {
    if (canCreateRole || canEditRole) {
      fetchModules();
    }
  }, [canCreateRole, canEditRole, fetchModules]);

  const validateForm = (): boolean => {
    const e: { roleName?: string } = {};

    if (!formData.roleName.trim()) {
      e.roleName = 'Role name is required';
    } else if (formData.roleName.length < 2) {
      e.roleName = 'Role name must be at least 2 characters';
    } else if (formData.roleName.length > 20) {
      e.roleName = 'Role name must be less than 20 characters';
    }

    setErrors(e);
    return Object.keys(e).length === 0;
  };

  const handleSubmit = async (e: React.FormEvent): Promise<void> => {
    e.preventDefault();
    if (!validateForm()) return;

    if (editingRole && !canEditRole) {
      toast.error('You do not have permission to edit roles');
      return;
    }
    if (!editingRole && !canCreateRole) {
      toast.error('You do not have permission to create roles');
      return;
    }

    try {
      console.log('Submitting role data:', formData);
      
      if (editingRole) {
        await rolesAPI.update(editingRole._id, formData);
        toast.success('Role updated successfully');
      } else {
        await rolesAPI.create(formData);
        toast.success('Role created successfully');
      }
      
      await refreshUser();
      resetForm();
      fetchRoles();
    } catch (error) {
      console.error('Role operation error:', error);
      const axiosError = error as AxiosError<{ message: string }>;
      const message = axiosError.response?.data?.message || 'Operation failed';
      toast.error(message);
      setErrors({ submit: message });
    }
  };

  const handleEdit = (role: Role): void => {
    if (!canEditRole) {
      toast.error('You do not have permission to edit roles');
      return;
    }
    
    console.log('Editing role:', role);
    setEditingRole(role);
    
    // Extract permission IDs
    const permissionIds = Array.isArray(role.permissions) 
      ? role.permissions.map(p => typeof p === 'string' ? p : p._id)
      : [];
    
    console.log('Permission IDs:', permissionIds);
    
    setFormData({
      roleName: role.roleName,
      status: role.status,
      permissions: permissionIds,
    });
    setShowModal(true);
  };

  const handleDelete = async (id: string): Promise<void> => {
    if (!canDeleteRole) {
      toast.error('You do not have permission to delete roles');
      return;
    }

    if (!window.confirm('Are you sure you want to delete this role? Users with this role will lose their permissions.')) return;

    try {
      await rolesAPI.delete(id);
      toast.success('Role deleted successfully');
      await refreshUser();
      fetchRoles();
    } catch (error) {
      const axiosError = error as AxiosError<{ message: string }>;
      toast.error(axiosError.response?.data?.message || 'Failed to delete role');
    }
  };

  const resetForm = (): void => {
    setFormData({ roleName: '', status: 'Active', permissions: [] });
    setEditingRole(null);
    setErrors({});
    setShowModal(false);
  };

  const togglePermission = (permissionId: string): void => {
    setFormData((prev) => ({
      ...prev,
      permissions: prev.permissions.includes(permissionId)
        ? prev.permissions.filter((p) => p !== permissionId)
        : [...prev.permissions, permissionId],
    }));
  };

  const toggleModulePermissions = (moduleGroup: ModuleGroup): void => {
    const modulePermissionIds = moduleGroup.actions.map(a => a._id);
    const allSelected = modulePermissionIds.every(id => formData.permissions.includes(id));
    
    setFormData((prev) => ({
      ...prev,
      permissions: allSelected
        ? prev.permissions.filter(p => !modulePermissionIds.includes(p))
        : [...new Set([...prev.permissions, ...modulePermissionIds])]
    }));
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

  const getPermissionDisplay = (role: Role): string => {
    if (!role.permissions || role.permissions.length === 0) return 'No permissions';
    return `${role.permissions.length} permission(s)`;
  };

  const isModuleFullySelected = (moduleGroup: ModuleGroup): boolean => {
    const modulePermissionIds = moduleGroup.actions.map(a => a._id);
    return modulePermissionIds.every(id => formData.permissions.includes(id));
  };


  return (
    <div className="p-6">
      <div className="mb-6">
        <h1 className="text-3xl font-bold text-gray-800">Role Management</h1>
      </div>

      <div className="bg-white rounded-lg shadow p-4 mb-6">
        <div className="flex flex-col md:flex-row gap-4">
          <div className="flex-1">
            <div className="relative">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400" size={20} />
              <input
                type="text"
                placeholder="Search roles..."
                value={search}
                onChange={(e) => {
                  setSearch(e.target.value);
                  setCurrentPage(1);
                }}
                className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
            </div>
          </div>

          <select
            value={statusFilter}
            onChange={(e) => {
              setStatusFilter(e.target.value);
              setCurrentPage(1);
            }}
            className="px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
          >
            <option value="">All Status</option>
            <option value="Active">Active</option>
            <option value="Inactive">Inactive</option>
          </select>

          {canCreateRole && (
            <button
              onClick={() => setShowModal(true)}
              className="flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition"
            >
              <Plus size={18} />
              Add Role
            </button>
          )}
        </div>
      </div>

      {loading ? (
        <div className="flex justify-center items-center h-64">
          <div className="text-gray-500">Loading...</div>
        </div>
      ) : roles.length === 0 ? (
        <div className="bg-white rounded-lg shadow p-12 text-center">
          <p className="text-gray-500 mb-4">No roles found</p>
          {canCreateRole && (
            <button
              onClick={() => setShowModal(true)}
              className="mt-4 px-6 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition"
            >
              Create Role
            </button>
          )}
        </div>
      ) : (
        <>
          <div className="bg-white rounded-lg shadow overflow-hidden">
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead className="bg-gray-50 border-b border-gray-200">
                  <tr>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Role Name
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Permissions
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Created At
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Status
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Actions
                    </th>
                  </tr>
                </thead>
                <tbody className="bg-white divide-y divide-gray-200">
                  {roles.map((role) => (
                    <tr key={role._id} className="hover:bg-gray-50">
                      <td className="px-6 py-4 whitespace-nowrap">
                        <div className="flex items-center">
                          <Shield className="text-blue-600 mr-2" size={18} />
                          <div className="text-sm font-medium text-gray-900">
                            {role.roleName}
                          </div>
                        </div>
                      </td>
                      <td className="px-6 py-4">
                        <span className="px-3 py-1 text-sm rounded-full bg-purple-100 text-purple-800">
                          {getPermissionDisplay(role)}
                        </span>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <div className="text-sm text-gray-600">{formatDateTime(role.createdAt)}</div>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <span
                          className={`px-2 py-1 text-xs font-medium rounded-full ${
                            role.status === 'Active'
                              ? 'bg-green-100 text-green-800'
                              : 'bg-gray-100 text-gray-800'
                          }`}
                        >
                          {role.status}
                        </span>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm font-medium">
                        <div className="flex gap-2">
                          {canEditRole && (
                            <button
                              onClick={() => handleEdit(role)}
                              className="text-blue-600 hover:text-blue-900"
                              title="Edit"
                            >
                              <Edit size={18} />
                            </button>
                          )}
                          {canDeleteRole && (
                            <button
                              onClick={() => handleDelete(role._id)}
                              className="text-red-600 hover:text-red-900"
                              title="Delete"
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
              Showing {roles.length} of {totalRoles} roles
            </div>
            <div className="flex gap-2">
              <button
                onClick={() => setCurrentPage((p) => Math.max(1, p - 1))}
                disabled={currentPage === 1}
                className="px-4 py-2 border border-gray-300 rounded-lg disabled:opacity-50 disabled:cursor-not-allowed hover:bg-gray-50"
              >
                Previous
              </button>
              <span className="px-4 py-2 border border-gray-300 rounded-lg bg-blue-50">
                Page {currentPage} of {totalPages}
              </span>
              <button
                onClick={() => setCurrentPage((p) => Math.min(totalPages, p + 1))}
                disabled={currentPage === totalPages}
                className="px-4 py-2 border border-gray-300 rounded-lg disabled:opacity-50 disabled:cursor-not-allowed hover:bg-gray-50"
              >
                Next
              </button>
            </div>
          </div>
        </>
      )}

      {showModal && (canCreateRole || canEditRole) && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-lg shadow-xl max-w-3xl w-full max-h-[90vh] overflow-y-auto">
            <div className="p-6 border-b border-gray-200 flex justify-between items-center sticky top-0 bg-white z-10">
              <h3 className="text-xl font-semibold text-gray-900">
                {editingRole ? 'Edit Role' : 'Add New Role'}
              </h3>
              <button
                onClick={resetForm}
                className="text-gray-400 hover:text-gray-600"
              >
                <X size={24} />
              </button>
            </div>

            <form onSubmit={handleSubmit} className="p-6 space-y-6">
              {errors.submit && (
                <div className="bg-red-100 border border-red-400 text-red-700 px-4 py-3 rounded">
                  {errors.submit}
                </div>
              )}

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Role Name 
                </label>
                <input
                  type="text"
                  value={formData.roleName}
                  onChange={(e) =>
                    setFormData({ ...formData, roleName: e.target.value })
                  }
                  className={`w-full px-4 py-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 ${
                    errors.roleName ? 'border-red-500' : 'border-gray-300'
                  }`}
                  placeholder="Enter role name (e.g., Manager, Editor)"
                />
                {errors.roleName && (
                  <p className="text-sm text-red-600 mt-1">{errors.roleName}</p>
                )}
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-3">
                  Status
                </label>
                <div className="flex gap-6">
                  <label className="flex items-center space-x-2 cursor-pointer">
                    <input
                      type="radio"
                      checked={formData.status === 'Active'}
                      onChange={() =>
                        setFormData({ ...formData, status: 'Active' })
                      }
                      className="w-4 h-4 text-blue-600 focus:ring-blue-500"
                    />
                    <span className="text-sm text-gray-700">Active</span>
                  </label>
                  <label className="flex items-center space-x-2 cursor-pointer">
                    <input
                      type="radio"
                      checked={formData.status === 'Inactive'}
                      onChange={() =>
                        setFormData({ ...formData, status: 'Inactive' })
                      }
                      className="w-4 h-4 text-blue-600 focus:ring-blue-500"
                    />
                    <span className="text-sm text-gray-700">Inactive</span>
                  </label>
                </div>
              </div>

              <div>
                <div className="flex justify-between items-center mb-3">
                  <label className="block text-sm font-medium text-gray-700">
                    Permissions
                  </label>
                 
                </div>
                
                {modulesLoading ? (
                  <div className="p-4 bg-gray-50 rounded-lg text-center">
                    <p className="text-sm text-gray-500">Loading permissions...</p>
                  </div>
                ) : modules.length === 0 ? (
                  <div className="p-4 bg-yellow-50 rounded-lg text-center">
                    <p className="text-sm text-yellow-700">No permissions available. Please contact administrator.</p>
                  </div>
                ) : (
                  <div className="space-y-4 p-4 bg-gray-50 rounded-lg max-h-96 overflow-y-auto">
                    {modules.map((moduleGroup) => {
                      const isFullySelected = isModuleFullySelected(moduleGroup);
                      
                      return (
                        <div key={moduleGroup.moduleName} className="bg-white rounded-lg p-4 shadow-sm border border-gray-200">
                          <div className="flex items-center justify-between mb-3 pb-2 border-b border-gray-200">
                            <div className="flex items-center gap-2">
                              <Shield className="text-blue-600" size={18} />
                              <h4 className="font-semibold text-gray-800">{moduleGroup.moduleName}</h4>
                            </div>
                            <button
                              type="button"
                              onClick={() => toggleModulePermissions(moduleGroup)}
                              className="flex items-center gap-1 text-sm text-blue-600 hover:text-blue-800 font-medium"
                            >
                              {isFullySelected ? (
                                <>
                                  <CheckSquare size={16} />
                                  Deselect All
                                </>
                              ) : (
                                <>
                                  <Square size={16} />
                                  Select All
                                </>
                              )}
                            </button>
                          </div>
                          <div className="grid grid-cols-1 md:grid-cols-2 gap-2">
                            {moduleGroup.actions.map((action) => (
                              <label
                                key={action._id}
                                className="flex items-start space-x-2 cursor-pointer p-2 rounded hover:bg-gray-50 transition"
                              >
                                <input
                                  type="checkbox"
                                  checked={formData.permissions.includes(action._id)}
                                  onChange={() => togglePermission(action._id)}
                                  className="w-4 h-4 text-blue-600 rounded focus:ring-blue-500 mt-0.5"
                                />
                                <div className="flex-1">
                                  <span className="text-sm font-medium text-gray-700">
                                    {action.action}
                                  </span>
                                  {action.description && (
                                    <span className="text-xs text-gray-500 block mt-0.5">
                                      {action.description}
                                    </span>
                                  )}
                                </div>
                              </label>
                            ))}
                          </div>
                        </div>
                      );
                    })}
                  </div>
                )}
                <p className="text-xs text-gray-500 mt-2">
                  Selected: {formData.permissions.length} permission(s)
                </p>
              </div>

              <div className="flex justify-end gap-3 pt-4 border-t border-gray-200">
                <button
                  type="button"
                  onClick={resetForm}
                  className="px-6 py-2 border border-gray-300 rounded-lg text-gray-700 hover:bg-gray-50 transition"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-6 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition"
                >
                  {editingRole ? 'Update Role' : 'Create Role'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};

export default RoleManagement;