import React, { useState, useEffect } from 'react';
import { UserProfile, UserRole, Territory, ExpenseCategory, UserStatus } from '../types';
import { getAllUsers, saveUser, deleteUser } from '../services/mockDatabase';
import { getCurrentPosition } from '../utils'; // Ensure this utility exists or use geoUtils
import { Button } from './Button';
import { Plus, Trash, Edit, Save, X, MapPin, Loader2, Lock, LogIn, User } from 'lucide-react';
import { v4 as uuidv4 } from 'uuid';

interface UserManagementProps {
  onLoginAs?: (user: UserProfile) => void;
}

export const UserManagement: React.FC<UserManagementProps> = ({ onLoginAs }) => {
  const [users, setUsers] = useState<UserProfile[]>([]);
  const [editingUser, setEditingUser] = useState<UserProfile | null>(null);
  const [isNew, setIsNew] = useState(false);
  const [loadingGps, setLoadingGps] = useState(false);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    loadUsers();
  }, []);

  const loadUsers = async () => {
    const data = await getAllUsers();
    setUsers(data);
  };

  const handleEdit = (user: UserProfile) => {
    // Deep copy to avoid mutating state directly
    setEditingUser(JSON.parse(JSON.stringify(user)));
    setIsNew(false);
  };

  const handleCreate = () => {
    const newUser: UserProfile = {
      uid: uuidv4(),
      email: '',
      displayName: '',
      role: UserRole.MR,
      status: UserStatus.CONFIRMED,
      hqLocation: '',
      territories: [],
      password: ''
    };
    setEditingUser(newUser);
    setIsNew(true);
  };

  const handleDelete = async (uid: string) => {
    if (confirm('Are you sure you want to delete this user?')) {
      await deleteUser(uid);
      loadUsers();
    }
  };

  const handleSave = async () => {
    if (!editingUser) return;

    if (!editingUser.displayName?.trim()) {
      alert("Full Name is required");
      return;
    }
    if (!editingUser.email?.trim()) {
      alert("Email is required");
      return;
    }
    if (isNew && !editingUser.password?.trim()) {
      alert("Password is required for new users.");
      return;
    }

    setSaving(true);
    try {
      const basePayload = {
        uid: editingUser.uid,
        email: editingUser.email.trim(),
        displayName: editingUser.displayName.trim(),
        role: editingUser.role,
        status: editingUser.status,
        password: editingUser.password || 'admin123'
      };

      let finalPayload: UserProfile;

      if (editingUser.role === UserRole.ADMIN) {
        finalPayload = {
          ...basePayload,
          hqLocation: 'Head Office',
          territories: [],
        } as UserProfile;
      } else {
        finalPayload = {
          ...basePayload,
          hqLocation: editingUser.hqLocation || '',
          // state: editingUser.state || '', // Removed 'state' if not in type definition
          territories: editingUser.territories || [],
          reportingManagerId: editingUser.reportingManagerId || undefined,
          hqLat: editingUser.hqLat,
          hqLng: editingUser.hqLng
        } as UserProfile;
      }

      await saveUser(finalPayload);
      await loadUsers();
      setEditingUser(null);
    } catch (error: any) {
      console.error("Save failed:", error);
      alert(`Failed to save user: ${error.message || 'Unknown error'}`);
    } finally {
      setSaving(false);
    }
  };

  const captureUserHqLocation = async () => {
    setLoadingGps(true);
    try {
      const pos = await getCurrentPosition();
      if (!editingUser) return;
      setEditingUser({
        ...editingUser,
        hqLat: parseFloat(pos.coords.latitude.toFixed(6)),
        hqLng: parseFloat(pos.coords.longitude.toFixed(6))
      });
    } catch (e) {
      alert("GPS Error. Ensure location services are enabled.");
    } finally {
      setLoadingGps(false);
    }
  };

  const addTerritory = () => {
    if (!editingUser) return;
    const t: Territory = {
      id: uuidv4(),
      name: 'New Territory',
      category: ExpenseCategory.HQ,
      fixedKm: 0,
      geoRadius: 2000
    };
    setEditingUser({
      ...editingUser,
      territories: [...editingUser.territories, t]
    });
  };

  const updateTerritory = (id: string, field: keyof Territory, value: any) => {
    if (!editingUser) return;
    setEditingUser({
      ...editingUser,
      territories: editingUser.territories.map(t => t.id === id ? { ...t, [field]: value } : t)
    });
  };

  const removeTerritory = (id: string) => {
    if (!editingUser) return;
    setEditingUser({
      ...editingUser,
      territories: editingUser.territories.filter(t => t.id !== id)
    });
  };

  const captureTerritoryLocation = async (territoryId: string) => {
    setLoadingGps(true);
    try {
      const pos = await getCurrentPosition();
      setEditingUser(prev => {
        if (!prev) return null;
        return {
          ...prev,
          territories: prev.territories.map(t => {
            if (t.id === territoryId) return { ...t, geoLat: pos.coords.latitude, geoLng: pos.coords.longitude };
            return t;
          })
        };
      });
    } catch (error) { alert("GPS Error"); } finally { setLoadingGps(false); }
  };

  const isAdminRole = editingUser?.role === UserRole.ADMIN;

  // ----------------------------------------------------------------------
  // RENDER: Edit Form (Modal Style within Dashboard)
  // ----------------------------------------------------------------------
  if (editingUser) {
    return (
      <div className="bg-[#0F172A]/90 backdrop-blur-xl border border-slate-700/50 p-6 rounded-2xl shadow-2xl max-w-4xl mx-auto relative overflow-hidden animate-in fade-in slide-in-from-bottom-4">
        {/* Glow Effect */}
        <div className="absolute top-0 right-0 w-64 h-64 bg-[#8B1E1E] opacity-5 blur-[100px] pointer-events-none"></div>

        <div className="flex justify-between items-center mb-6 relative z-10">
          <div>
            <h2 className="text-xl font-bold text-white flex items-center gap-2">
              {isNew ? <Plus className="text-[#8B1E1E]" /> : <Edit className="text-blue-400" />}
              {isNew ? 'Create New User' : 'Edit User Profile'}
            </h2>
            <p className="text-xs text-slate-400 mt-1">Manage credentials, roles, and territories.</p>
          </div>
          <Button variant="ghost" className="text-slate-400 hover:text-white hover:bg-white/10" onClick={() => setEditingUser(null)} disabled={saving}>
            <X size={20} />
          </Button>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-5 mb-6 relative z-10">
          <div className="space-y-4">
            {/* Name Input */}
            <div>
              <label className="block text-[10px] font-bold text-slate-400 uppercase tracking-widest mb-1">Full Name <span className="text-red-500">*</span></label>
              <div className="relative group">
                <User className="absolute left-3 top-3 text-slate-500 group-focus-within:text-[#8B1E1E] transition-colors h-4 w-4" />
                <input
                  className="w-full bg-[#020617]/50 border border-slate-700 text-white text-sm rounded-lg focus:ring-1 focus:ring-[#8B1E1E] focus:border-[#8B1E1E] block pl-10 p-2.5 placeholder-slate-600 transition-all outline-none"
                  value={editingUser.displayName}
                  onChange={e => setEditingUser({ ...editingUser, displayName: e.target.value })}
                  placeholder="John Doe"
                />
              </div>
            </div>

            {/* Email Input */}
            <div>
              <label className="block text-[10px] font-bold text-slate-400 uppercase tracking-widest mb-1">Email <span className="text-red-500">*</span></label>
              <input
                className="w-full bg-[#020617]/50 border border-slate-700 text-white text-sm rounded-lg focus:ring-1 focus:ring-[#8B1E1E] focus:border-[#8B1E1E] block p-2.5 placeholder-slate-600 transition-all outline-none"
                value={editingUser.email}
                onChange={e => setEditingUser({ ...editingUser, email: e.target.value })}
                placeholder="email@tertius.com"
              />
            </div>

            {/* Password Input */}
            <div>
              <label className="block text-[10px] font-bold text-slate-400 uppercase tracking-widest mb-1">Password {isNew && <span className="text-red-500">*</span>}</label>
              <div className="relative group">
                <input
                  type="text"
                  className="w-full bg-[#020617]/50 border border-slate-700 text-white text-sm rounded-lg focus:ring-1 focus:ring-[#8B1E1E] focus:border-[#8B1E1E] block pl-10 p-2.5 placeholder-slate-600 transition-all outline-none"
                  value={editingUser.password || ''}
                  onChange={e => setEditingUser({ ...editingUser, password: e.target.value })}
                  placeholder={isNew ? "Create password" : "Leave blank to keep current"}
                />
                <Lock size={14} className="absolute left-3 top-3 text-slate-500 group-focus-within:text-[#8B1E1E] transition-colors" />
              </div>
            </div>
          </div>

          <div className="space-y-4">
            {/* Role & Status */}
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-[10px] font-bold text-slate-400 uppercase tracking-widest mb-1">Role</label>
                <select
                  className="w-full bg-[#020617]/50 border border-slate-700 text-white text-sm rounded-lg focus:ring-1 focus:ring-[#8B1E1E] focus:border-[#8B1E1E] block p-2.5 outline-none"
                  value={editingUser.role}
                  onChange={e => setEditingUser({ ...editingUser, role: e.target.value as UserRole })}
                >
                  <option value={UserRole.MR}>Medical Rep</option>
                  <option value={UserRole.ASM}>ASM</option>
                  <option value={UserRole.RM}>Regional Manager</option>
                  <option value={UserRole.ZM}>Zonal Manager</option>
                  <option value={UserRole.ADMIN}>Admin (Office)</option>
                </select>
              </div>
              <div>
                <label className="block text-[10px] font-bold text-slate-400 uppercase tracking-widest mb-1">Status</label>
                <select
                  className="w-full bg-[#020617]/50 border border-slate-700 text-white text-sm rounded-lg focus:ring-1 focus:ring-[#8B1E1E] focus:border-[#8B1E1E] block p-2.5 outline-none"
                  value={editingUser.status}
                  onChange={e => setEditingUser({ ...editingUser, status: e.target.value as UserStatus })}
                >
                  <option value={UserStatus.PROBATION}>Probation</option>
                  <option value={UserStatus.CONFIRMED}>Confirmed</option>
                </select>
              </div>
            </div>

            {!isAdminRole && (
              <>
                <div>
                  <label className="block text-[10px] font-bold text-slate-400 uppercase tracking-widest mb-1">HQ Location</label>
                  <div className="flex gap-2">
                    <input
                      className="w-full bg-[#020617]/50 border border-slate-700 text-white text-sm rounded-lg focus:ring-1 focus:ring-[#8B1E1E] focus:border-[#8B1E1E] block p-2.5 placeholder-slate-600 outline-none"
                      value={editingUser.hqLocation}
                      onChange={e => setEditingUser({ ...editingUser, hqLocation: e.target.value })}
                      placeholder="City / Town"
                    />
                    <Button size="sm" variant="outline" className="border-slate-600 text-slate-300 hover:text-white hover:border-slate-400" onClick={captureUserHqLocation} disabled={loadingGps}>
                      <MapPin size={16} />
                    </Button>
                  </div>
                </div>

                {(editingUser.role === UserRole.MR || editingUser.role === UserRole.ASM) && (
                  <div>
                    <label className="block text-[10px] font-bold text-slate-400 uppercase tracking-widest mb-1">Reporting Manager</label>
                    <select
                      className="w-full bg-[#020617]/50 border border-slate-700 text-white text-sm rounded-lg focus:ring-1 focus:ring-[#8B1E1E] focus:border-[#8B1E1E] block p-2.5 outline-none"
                      value={editingUser.reportingManagerId || ''}
                      onChange={e => setEditingUser({ ...editingUser, reportingManagerId: e.target.value })}
                    >
                      <option value="">Select Manager</option>
                      {users.filter(u => (editingUser.role === UserRole.MR ? u.role === UserRole.ASM : u.role === UserRole.RM)).map(m => (
                        <option key={m.uid} value={m.uid}>{m.displayName}</option>
                      ))}
                    </select>
                  </div>
                )}
              </>
            )}
          </div>
        </div>

        {/* Territory Section */}
        {!isAdminRole && (
          <div className="border-t border-slate-700/50 pt-6 mb-4 relative z-10">
            <div className="flex justify-between items-center mb-4">
              <h3 className="font-bold text-slate-300 text-sm uppercase tracking-wide">Assigned Territories</h3>
              <Button size="sm" onClick={addTerritory} className="bg-slate-700 hover:bg-slate-600 text-white border-none"><Plus size={16} className="mr-2" /> Add Territory</Button>
            </div>
            <div className="space-y-2 max-h-60 overflow-y-auto pr-1 custom-scrollbar">
              {editingUser.territories.map((t) => (
                <div key={t.id} className="flex gap-2 items-center bg-slate-800/50 p-3 rounded-lg border border-slate-700/50">
                  <input
                    className="flex-1 bg-transparent border-b border-slate-600 text-white text-sm p-1 focus:border-[#8B1E1E] outline-none placeholder-slate-500"
                    value={t.name}
                    onChange={(e) => updateTerritory(t.id, 'name', e.target.value)}
                    placeholder="Territory Name"
                  />
                  <select
                    className="bg-slate-900 border border-slate-600 text-slate-300 text-xs rounded p-1 outline-none"
                    value={t.category}
                    onChange={(e) => updateTerritory(t.id, 'category', e.target.value)}
                  >
                    <option value="HQ">HQ</option><option value="EX_HQ">Ex-HQ</option><option value="OUTSTATION">Outstation</option>
                  </select>
                  <input
                    className="w-16 bg-transparent border-b border-slate-600 text-white text-sm p-1 text-center outline-none"
                    type="number"
                    value={t.fixedKm || 0}
                    onChange={(e) => updateTerritory(t.id, 'fixedKm', Number(e.target.value))}
                    placeholder="KM"
                  />
                  <Button size="sm" variant="ghost" className="text-slate-400 hover:text-blue-400" onClick={() => captureTerritoryLocation(t.id)} disabled={loadingGps} title="Capture Geo-Fence"><MapPin size={14} /></Button>
                  <button onClick={() => removeTerritory(t.id)} className="text-slate-500 hover:text-red-400 p-1 transition-colors"><Trash size={16} /></button>
                </div>
              ))}
              {editingUser.territories.length === 0 && (
                <div className="text-center py-4 text-slate-500 text-xs italic border border-dashed border-slate-700 rounded-lg">No territories assigned yet.</div>
              )}
            </div>
          </div>
        )}

        {/* Footer Actions */}
        <div className="flex justify-end gap-3 pt-6 border-t border-slate-700/50 mt-4 relative z-10">
          <Button variant="ghost" className="text-slate-400 hover:text-white" onClick={() => setEditingUser(null)} disabled={saving}>Cancel</Button>
          <Button
            onClick={handleSave}
            disabled={saving || loadingGps}
            className="bg-gradient-to-r from-[#6e1212] to-[#8B1E1E] hover:from-[#8B1E1E] hover:to-[#a02626] text-white shadow-lg shadow-red-900/20 border-none"
          >
            {saving ? <><Loader2 size={16} className="animate-spin mr-2" /> Saving...</> : <><Save size={16} className="mr-2" /> Save Changes</>}
          </Button>
        </div>
      </div>
    );
  }

  // ----------------------------------------------------------------------
  // RENDER: Main List View
  // ----------------------------------------------------------------------
  return (
    <div className="bg-[#0F172A]/60 backdrop-blur-xl border border-slate-700/50 p-6 rounded-2xl shadow-2xl relative overflow-hidden animate-in fade-in duration-500">
      {/* Background Ambient Glow */}
      <div className="absolute top-0 left-0 w-full h-1 bg-gradient-to-r from-transparent via-[#8B1E1E] to-transparent opacity-50"></div>

      <div className="flex justify-between items-center mb-8">
        <div>
          <h2 className="text-2xl font-bold text-white tracking-tight">User Management</h2>
          <p className="text-slate-400 text-sm mt-1">Manage system access, roles, and field hierarchies.</p>
        </div>
        <Button onClick={handleCreate} className="bg-slate-700 text-[#ffffff] hover:bg-slate-100 font-bold border-none shadow-md transition-all hover:scale-105">
          <Plus size={16} className="mr-2" /> Add User
        </Button>
      </div>

      <div className="overflow-x-auto rounded-xl border border-slate-700/50">
        <table className="w-full text-left text-sm">
          <thead className="bg-slate-800/80 text-xs uppercase text-slate-400 font-semibold tracking-wider">
            <tr>
              <th className="p-4 border-b border-slate-700">User Profile</th>
              <th className="p-4 border-b border-slate-700">Role & Status</th>
              <th className="p-4 border-b border-slate-700">Location</th>
              <th className="p-4 border-b border-slate-700 text-right">Actions</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-700/50 bg-[#0F172A]/40">
            {users.map(user => (
              <tr key={user.uid} className="hover:bg-white/5 transition-colors group">
                <td className="p-4">
                  <div className="flex items-center gap-3">
                    <div className="w-8 h-8 rounded-full bg-slate-700 flex items-center justify-center text-slate-300 font-bold text-xs border border-slate-600">
                      {user.displayName.charAt(0)}
                    </div>
                    <div>
                      <div className="font-medium text-slate-200 group-hover:text-white transition-colors">{user.displayName}</div>
                      <div className="text-xs text-slate-500 font-mono">{user.email}</div>
                    </div>
                  </div>
                </td>
                <td className="p-4">
                  <div className="flex flex-col items-start gap-1">
                    <span className={`px-2 py-0.5 rounded text-[10px] font-bold border ${user.role === UserRole.ADMIN ? 'bg-purple-900/30 text-purple-300 border-purple-800' :
                        user.role === UserRole.ASM ? 'bg-blue-900/30 text-blue-300 border-blue-800' :
                          'bg-slate-800 text-slate-400 border-slate-700'
                      }`}>
                      {user.role}
                    </span>
                    <span className="text-[10px] text-slate-500">{user.status}</span>
                  </div>
                </td>
                <td className="p-4 text-slate-400">
                  <div className="flex items-center gap-2">
                    <MapPin size={12} className="text-slate-600" />
                    {user.role === UserRole.ADMIN ? 'Head Office' : (user.hqLocation || 'Not Set')}
                  </div>
                </td>
                <td className="p-4 text-right">
                  <div className="flex justify-end gap-1 opacity-70 group-hover:opacity-100 transition-opacity">
                    {onLoginAs && (
                      <button onClick={() => onLoginAs(user)} className="p-2 text-slate-400 hover:text-white hover:bg-white/10 rounded transition-colors" title="Simulate Login">
                        <LogIn size={16} />
                      </button>
                    )}
                    <button onClick={() => handleEdit(user)} className="p-2 text-blue-400 hover:text-blue-300 hover:bg-blue-900/20 rounded transition-colors">
                      <Edit size={16} />
                    </button>
                    <button onClick={() => handleDelete(user.uid)} className="p-2 text-red-400 hover:text-red-300 hover:bg-red-900/20 rounded transition-colors">
                      <Trash size={16} />
                    </button>
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {users.length === 0 && (
        <div className="text-center py-12 text-slate-500">
          <div className="w-16 h-16 bg-slate-800/50 rounded-full flex items-center justify-center mx-auto mb-3">
            <User size={32} className="opacity-20" />
          </div>
          <p>No users found. Create your first user to get started.</p>
        </div>
      )}
    </div>
  );
};