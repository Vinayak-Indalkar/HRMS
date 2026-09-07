import React, { useState, useEffect, useMemo } from 'react';
import {
  ShieldCheck,
  Plus,
  Edit2,
  Trash2,
  CheckCircle2,
  Users,
  Lock,
  Search,
  Check,
  Info,
  Sliders,
  Shield,
  KeyRound,
  Layers,
  ArrowRight
} from 'lucide-react';
import { api } from '../../services/api';
import Badge from '../../components/common/Badge';
import Modal from '../../components/common/Modal';
import ConfirmDialog from '../../components/common/ConfirmDialog';

export const RolesPermissionsPage = () => {
  const [roles, setRoles] = useState([]);
  const [permissionCatalog, setPermissionCatalog] = useState([]);
  const [loading, setLoading] = useState(true);
  const [selectedRole, setSelectedRole] = useState(null);
  const [searchQuery, setSearchQuery] = useState('');

  // Create / Edit Role Modal State
  const [isRoleModalOpen, setIsRoleModalOpen] = useState(false);
  const [editingRole, setEditingRole] = useState(null);
  const [roleFormData, setRoleFormData] = useState({
    name: '',
    description: '',
    permissions: []
  });
  const [savingRole, setSavingRole] = useState(false);
  const [roleModalError, setRoleModalError] = useState('');

  // Delete Confirmation State
  const [deleteTargetRole, setDeleteTargetRole] = useState(null);
  const [deleting, setDeleting] = useState(false);

  // Success Notification banner
  const [successMessage, setSuccessMessage] = useState('');

  const loadData = async () => {
    setLoading(true);
    try {
      const [rolesData, permData] = await Promise.all([
        api.getRoles(),
        api.getPermissionsCatalog()
      ]);
      setRoles(rolesData || []);
      setPermissionCatalog(permData?.categories || []);

      // If no role selected, or previously selected role exists, select it
      if (rolesData && rolesData.length > 0) {
        if (!selectedRole) {
          setSelectedRole(rolesData[0]);
        } else {
          const updatedSelected = rolesData.find(r => r.id === selectedRole.id || r.key === selectedRole.key);
          setSelectedRole(updatedSelected || rolesData[0]);
        }
      }
    } catch (err) {
      console.error('Failed to load roles and permissions:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadData();
  }, []);

  const openCreateRoleModal = () => {
    setEditingRole(null);
    setRoleFormData({
      name: '',
      description: '',
      permissions: []
    });
    setRoleModalError('');
    setIsRoleModalOpen(true);
  };

  const openEditRoleModal = (role) => {
    setEditingRole(role);
    setRoleFormData({
      name: role.name,
      description: role.description || '',
      permissions: role.permissions || []
    });
    setRoleModalError('');
    setIsRoleModalOpen(true);
  };

  const handleTogglePermission = (permId) => {
    setRoleFormData(prev => {
      const current = prev.permissions || [];
      const has = current.includes(permId);
      return {
        ...prev,
        permissions: has ? current.filter(p => p !== permId) : [...current, permId]
      };
    });
  };

  const handleToggleCategory = (categoryPermissions) => {
    const permIds = categoryPermissions.map(p => p.id);
    setRoleFormData(prev => {
      const current = prev.permissions || [];
      const allSelected = permIds.every(id => current.includes(id));
      if (allSelected) {
        // Deselect all in category
        return {
          ...prev,
          permissions: current.filter(id => !permIds.includes(id))
        };
      } else {
        // Select all in category
        const newSet = new Set([...current, ...permIds]);
        return {
          ...prev,
          permissions: Array.from(newSet)
        };
      }
    });
  };

  const handleSaveRole = async (e) => {
    e.preventDefault();
    if (!roleFormData.name.trim()) {
      setRoleModalError('Role name is required');
      return;
    }

    setSavingRole(true);
    setRoleModalError('');
    try {
      if (editingRole) {
        await api.updateRole(editingRole.id, roleFormData);
        setSuccessMessage(`Role "${roleFormData.name}" updated successfully!`);
      } else {
        await api.createRole(roleFormData);
        setSuccessMessage(`Role "${roleFormData.name}" created successfully!`);
      }
      setIsRoleModalOpen(false);
      await loadData();
      setTimeout(() => setSuccessMessage(''), 4000);
    } catch (err) {
      setRoleModalError(err.message || 'Failed to save role');
    } finally {
      setSavingRole(false);
    }
  };

  const handleDeleteRole = async () => {
    if (!deleteTargetRole) return;
    setDeleting(true);
    try {
      await api.deleteRole(deleteTargetRole.id);
      setSuccessMessage(`Role "${deleteTargetRole.name}" deleted successfully.`);
      setDeleteTargetRole(null);
      await loadData();
      setTimeout(() => setSuccessMessage(''), 4000);
    } catch (err) {
      alert(err.message || 'Failed to delete role');
    } finally {
      setDeleting(false);
    }
  };

  // Filtered roles based on search
  const filteredRoles = useMemo(() => {
    if (!searchQuery.trim()) return roles;
    const q = searchQuery.toLowerCase();
    return roles.filter(r =>
      r.name?.toLowerCase().includes(q) ||
      r.description?.toLowerCase().includes(q) ||
      r.key?.toLowerCase().includes(q)
    );
  }, [roles, searchQuery]);

  // Total permissions count across all categories
  const totalAvailablePermissions = useMemo(() => {
    return permissionCatalog.reduce((acc, cat) => acc + (cat.permissions?.length || 0), 0);
  }, [permissionCatalog]);

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <div className="w-8 h-8 border-4 border-indigo-600 border-t-transparent rounded-full animate-spin"></div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h2 className="text-2xl font-bold text-slate-900">Roles & Permissions Management</h2>
          <p className="text-xs sm:text-sm text-slate-500 mt-1">
            Define organizational roles, configure module access controls, and assign specific operational permissions
          </p>
        </div>

        <button
          type="button"
          onClick={openCreateRoleModal}
          className="flex items-center gap-1.5 px-4 py-2.5 bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl text-xs font-semibold shadow-md shadow-indigo-600/20 transition-all cursor-pointer self-start sm:self-auto"
        >
          <Plus className="w-4 h-4" />
          <span>Create New Role</span>
        </button>
      </div>

      {/* Success Notification Alert */}
      {successMessage && (
        <div className="p-3.5 rounded-2xl bg-emerald-50 border border-emerald-200 text-xs font-medium text-emerald-800 flex items-center gap-2 animate-fade-in shadow-xs">
          <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
          <span>{successMessage}</span>
        </div>
      )}

      {/* Main 2-Column Layout: Roles Master List & Selected Role Permission Matrix */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
        {/* Left Column: Roles Directory (5 Cols) */}
        <div className="lg:col-span-4 bg-white rounded-3xl p-5 border border-slate-200/80 shadow-sm space-y-4">
          <div className="flex items-center justify-between pb-3 border-b border-slate-100">
            <div className="flex items-center gap-2">
              <Shield className="w-4 h-4 text-indigo-600" />
              <h3 className="text-sm font-bold text-slate-900">Configured Roles ({roles.length})</h3>
            </div>
            <span className="text-[10px] uppercase font-bold text-slate-400">Security Groups</span>
          </div>

          {/* Search Box */}
          <div className="relative">
            <Search className="w-3.5 h-3.5 absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
            <input
              type="text"
              placeholder="Search roles..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full text-xs pl-8 pr-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-slate-700 focus:outline-none focus:ring-2 focus:ring-indigo-500"
            />
          </div>

          {/* Role Cards List */}
          <div className="space-y-2.5 max-h-[580px] overflow-y-auto pr-1">
            {filteredRoles.length === 0 ? (
              <div className="py-8 text-center text-xs text-slate-400">
                No roles match your search.
              </div>
            ) : (
              filteredRoles.map((role) => {
                const isSelected = selectedRole?.id === role.id || selectedRole?.key === role.key;
                const isSuperAdmin = role.key === 'super_admin';
                const permCount = isSuperAdmin ? totalAvailablePermissions : (role.permissions?.length || 0);

                return (
                  <div
                    key={role.id || role.key}
                    onClick={() => setSelectedRole(role)}
                    className={`p-3.5 rounded-2xl border transition-all cursor-pointer text-left ${
                      isSelected
                        ? 'border-indigo-500 bg-indigo-50/30 shadow-sm ring-1 ring-indigo-500/20'
                        : 'border-slate-200/80 bg-white hover:border-slate-300 hover:bg-slate-50/50'
                    }`}
                  >
                    <div className="flex items-start justify-between gap-2">
                      <div className="min-w-0">
                        <div className="flex items-center gap-1.5 flex-wrap">
                          <h4 className="text-xs font-bold text-slate-900 truncate">{role.name}</h4>
                          {role.is_system ? (
                            <span className="text-[9px] font-semibold px-1.5 py-0.5 rounded bg-slate-100 text-slate-600 flex items-center gap-0.5">
                              <Lock className="w-2.5 h-2.5" /> Core
                            </span>
                          ) : (
                            <span className="text-[9px] font-semibold px-1.5 py-0.5 rounded bg-indigo-100 text-indigo-700">
                              Custom
                            </span>
                          )}
                        </div>
                        <p className="text-[11px] text-slate-500 mt-1 line-clamp-2 leading-relaxed">
                          {role.description}
                        </p>
                      </div>

                      {/* Role Actions */}
                      <div className="flex items-center gap-1 shrink-0" onClick={(e) => e.stopPropagation()}>
                        <button
                          type="button"
                          onClick={() => openEditRoleModal(role)}
                          title="Edit role & permissions"
                          className="p-1.5 text-slate-400 hover:text-indigo-600 hover:bg-white rounded-lg transition-colors cursor-pointer"
                        >
                          <Edit2 className="w-3.5 h-3.5" />
                        </button>
                        {!role.is_system && (
                          <button
                            type="button"
                            onClick={() => setDeleteTargetRole(role)}
                            title="Delete custom role"
                            className="p-1.5 text-slate-400 hover:text-rose-600 hover:bg-white rounded-lg transition-colors cursor-pointer"
                          >
                            <Trash2 className="w-3.5 h-3.5" />
                          </button>
                        )}
                      </div>
                    </div>

                    <div className="mt-3 pt-2.5 border-t border-slate-100 flex items-center justify-between text-[10px] text-slate-500">
                      <span className="flex items-center gap-1 font-semibold text-indigo-700">
                        <KeyRound className="w-3 h-3" />
                        {permCount} of {totalAvailablePermissions} permissions
                      </span>
                      <span className="flex items-center gap-1 text-slate-400">
                        <Users className="w-3 h-3" />
                        {role.user_count || 0} user{role.user_count === 1 ? '' : 's'}
                      </span>
                    </div>
                  </div>
                );
              })
            )}
          </div>
        </div>

        {/* Right Column: Selected Role Permission Matrix View (7 Cols) */}
        <div className="lg:col-span-8 bg-white rounded-3xl p-6 sm:p-7 border border-slate-200/80 shadow-sm space-y-6">
          {selectedRole ? (
            <>
              {/* Selected Role Header Info */}
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-5 border-b border-slate-100">
                <div>
                  <div className="flex items-center gap-2 flex-wrap">
                    <h3 className="text-lg font-bold text-slate-900">{selectedRole.name}</h3>
                    {selectedRole.is_system ? (
                      <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-slate-100 text-slate-600">
                        System Default
                      </span>
                    ) : (
                      <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-indigo-50 text-indigo-700 border border-indigo-200/60">
                        Custom Role
                      </span>
                    )}
                    <span className="text-[10px] font-mono text-slate-400">key: {selectedRole.key}</span>
                  </div>
                  <p className="text-xs text-slate-500 mt-1">{selectedRole.description}</p>
                </div>

                <div className="flex items-center gap-2 shrink-0">
                  <button
                    type="button"
                    onClick={() => openEditRoleModal(selectedRole)}
                    className="flex items-center gap-1.5 px-3.5 py-2 bg-indigo-50 hover:bg-indigo-100 text-indigo-700 rounded-xl text-xs font-bold transition-all cursor-pointer"
                  >
                    <Edit2 className="w-3.5 h-3.5" />
                    <span>Configure Permissions</span>
                  </button>
                </div>
              </div>

              {/* Permission Coverage Progress Bar */}
              {(() => {
                const isSuper = selectedRole.key === 'super_admin';
                const activeCount = isSuper ? totalAvailablePermissions : (selectedRole.permissions?.length || 0);
                const pct = Math.round((activeCount / (totalAvailablePermissions || 1)) * 100);

                return (
                  <div className="bg-slate-50 rounded-2xl p-4 border border-slate-100 space-y-2">
                    <div className="flex items-center justify-between text-xs font-semibold">
                      <span className="text-slate-700">Privilege & Scope Coverage</span>
                      <span className="text-indigo-600 font-bold">{activeCount} / {totalAvailablePermissions} ({pct}%)</span>
                    </div>
                    <div className="w-full bg-slate-200 rounded-full h-2 overflow-hidden">
                      <div
                        className="bg-indigo-600 h-2 rounded-full transition-all duration-500"
                        style={{ width: `${pct}%` }}
                      ></div>
                    </div>
                  </div>
                );
              })()}

              {/* Detailed Categorized Permission Checkboxes/Indicators */}
              <div className="space-y-5">
                <div className="flex items-center justify-between">
                  <h4 className="text-xs font-bold uppercase tracking-wider text-slate-400">
                    Granted Permissions by Functional Area
                  </h4>
                  <span className="text-[11px] text-slate-400 italic">
                    Click "Configure Permissions" above to add or remove capabilities
                  </span>
                </div>

                <div className="space-y-4">
                  {permissionCatalog.map((category) => {
                    const isSuper = selectedRole.key === 'super_admin';
                    const catPerms = category.permissions || [];
                    const activeInCat = isSuper
                      ? catPerms.length
                      : catPerms.filter(p => selectedRole.permissions?.includes(p.id)).length;

                    return (
                      <div key={category.category} className="rounded-2xl border border-slate-200/70 overflow-hidden">
                        <div className="bg-slate-50/80 px-4 py-2.5 border-b border-slate-200/70 flex items-center justify-between">
                          <span className="text-xs font-bold text-slate-800">{category.category}</span>
                          <span className="text-[11px] font-semibold text-slate-500">
                            {activeInCat} of {catPerms.length} enabled
                          </span>
                        </div>

                        <div className="p-3.5 grid grid-cols-1 sm:grid-cols-2 gap-2 bg-white">
                          {catPerms.map((perm) => {
                            const isGranted = isSuper || (selectedRole.permissions || []).includes(perm.id);

                            return (
                              <div
                                key={perm.id}
                                className={`p-2.5 rounded-xl border flex items-start gap-2.5 transition-all ${
                                  isGranted
                                    ? 'border-emerald-200 bg-emerald-50/20'
                                    : 'border-slate-100 bg-slate-50/30 opacity-60'
                                }`}
                              >
                                <div
                                  className={`w-4 h-4 rounded-full flex items-center justify-center shrink-0 mt-0.5 ${
                                    isGranted ? 'bg-emerald-600 text-white' : 'bg-slate-200 text-slate-400'
                                  }`}
                                >
                                  {isGranted ? <Check className="w-2.5 h-2.5 stroke-[3]" /> : null}
                                </div>
                                <div>
                                  <span className={`text-xs block font-bold leading-snug ${isGranted ? 'text-slate-900' : 'text-slate-400'}`}>
                                    {perm.label}
                                  </span>
                                  <p className="text-[10px] text-slate-500 mt-0.5 leading-relaxed">
                                    {perm.description}
                                  </p>
                                </div>
                              </div>
                            );
                          })}
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>
            </>
          ) : (
            <div className="py-20 text-center text-xs text-slate-400">
              Select a role from the left to view its assigned permissions.
            </div>
          )}
        </div>
      </div>

      {/* CREATE / EDIT ROLE & PERMISSION MODAL */}
      <Modal
        isOpen={isRoleModalOpen}
        onClose={() => setIsRoleModalOpen(false)}
        title={editingRole ? `Configure Role — ${editingRole.name}` : 'Create New Role & Assign Permissions'}
        maxWidth="max-w-3xl"
      >
        <form onSubmit={handleSaveRole} className="space-y-5 text-xs">
          {roleModalError && (
            <div className="p-3 rounded-xl bg-rose-50 border border-rose-200 text-rose-700 font-semibold">
              {roleModalError}
            </div>
          )}

          {/* Role Details */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="block font-semibold text-slate-700 mb-1">
                Role Name <span className="text-rose-500 font-bold">*</span>
              </label>
              <input
                type="text"
                placeholder="e.g. Payroll Auditor, Project Lead, Compliance Officer..."
                value={roleFormData.name}
                onChange={(e) => setRoleFormData({ ...roleFormData, name: e.target.value })}
                disabled={editingRole?.is_system}
                className="w-full p-2.5 bg-slate-50 border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-indigo-500 disabled:opacity-60 disabled:cursor-not-allowed font-medium text-slate-800"
                required
              />
              {editingRole?.is_system && (
                <span className="text-[10px] text-slate-400 mt-1 block">
                  Core system role name is locked to preserve platform compatibility.
                </span>
              )}
            </div>

            <div>
              <label className="block font-semibold text-slate-700 mb-1">
                Role Description
              </label>
              <input
                type="text"
                placeholder="Summary of responsibilities and scope..."
                value={roleFormData.description}
                onChange={(e) => setRoleFormData({ ...roleFormData, description: e.target.value })}
                className="w-full p-2.5 bg-slate-50 border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-indigo-500 font-medium text-slate-800"
              />
            </div>
          </div>

          {/* Permissions Matrix Assignment */}
          <div className="pt-2 border-t border-slate-100">
            <div className="flex items-center justify-between mb-3">
              <div>
                <h4 className="font-bold text-slate-900 text-xs">Assign Operational Permissions</h4>
                <p className="text-[11px] text-slate-400">
                  Select which features, controls, and workflows this role has permission to execute
                </p>
              </div>
              <span className="text-xs font-bold text-indigo-600 bg-indigo-50 px-2.5 py-1 rounded-lg">
                {roleFormData.permissions?.length || 0} selected
              </span>
            </div>

            <div className="space-y-4 max-h-[360px] overflow-y-auto pr-1">
              {permissionCatalog.map((category) => {
                const catPerms = category.permissions || [];
                const allSelected = catPerms.every(p => roleFormData.permissions?.includes(p.id));

                return (
                  <div key={category.category} className="rounded-2xl border border-slate-200 bg-white overflow-hidden">
                    <div className="bg-slate-50 px-4 py-2 flex items-center justify-between border-b border-slate-200">
                      <span className="text-xs font-bold text-slate-800">{category.category}</span>
                      <button
                        type="button"
                        onClick={() => handleToggleCategory(catPerms)}
                        className="text-[11px] font-bold text-indigo-600 hover:text-indigo-800 cursor-pointer"
                      >
                        {allSelected ? 'Deselect Category' : 'Select All'}
                      </button>
                    </div>

                    <div className="p-3 grid grid-cols-1 sm:grid-cols-2 gap-2">
                      {catPerms.map((perm) => {
                        const isChecked = roleFormData.permissions?.includes(perm.id);

                        return (
                          <label
                            key={perm.id}
                            className={`p-2.5 rounded-xl border flex items-start gap-2.5 cursor-pointer transition-all select-none ${
                              isChecked
                                ? 'border-indigo-300 bg-indigo-50/30'
                                : 'border-slate-100 bg-slate-50/20 hover:border-slate-200'
                            }`}
                          >
                            <input
                              type="checkbox"
                              checked={isChecked}
                              onChange={() => handleTogglePermission(perm.id)}
                              className="mt-0.5 rounded border-slate-300 text-indigo-600 focus:ring-indigo-500 cursor-pointer"
                            />
                            <div>
                              <span className={`text-xs font-bold block leading-tight ${isChecked ? 'text-indigo-950' : 'text-slate-800'}`}>
                                {perm.label}
                              </span>
                              <p className="text-[10px] text-slate-400 mt-0.5 leading-tight">
                                {perm.description}
                              </p>
                            </div>
                          </label>
                        );
                      })}
                    </div>
                  </div>
                );
              })}
            </div>
          </div>

          {/* Modal Footer Buttons */}
          <div className="pt-3 border-t border-slate-100 flex justify-end gap-2">
            <button
              type="button"
              onClick={() => setIsRoleModalOpen(false)}
              className="px-4 py-2 border border-slate-200 text-slate-600 rounded-xl font-medium hover:bg-slate-50 cursor-pointer"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={savingRole}
              className="px-5 py-2 bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl font-bold shadow-sm transition-all cursor-pointer disabled:opacity-50"
            >
              {savingRole ? 'Saving Role...' : editingRole ? 'Save Role Changes' : 'Create Role'}
            </button>
          </div>
        </form>
      </Modal>

      {/* DELETE CONFIRMATION DIALOG */}
      <ConfirmDialog
        isOpen={!!deleteTargetRole}
        onClose={() => setDeleteTargetRole(null)}
        onConfirm={handleDeleteRole}
        title="Delete Custom Role"
        message={`Are you sure you want to permanently delete the role "${deleteTargetRole?.name}"?`}
        warningMessage="This role will be deleted from the system. Ensure no active personnel are assigned to this role."
        confirmText="Delete Role"
        danger={true}
        loading={deleting}
      />
    </div>
  );
};

export default RolesPermissionsPage;
