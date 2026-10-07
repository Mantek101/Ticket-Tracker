import React, { useState, useEffect } from 'react';
import { supabase } from '../lib/supabase';
import { Users, Plus, ShieldCheck, Trash2, RefreshCw, Shield } from 'lucide-react';

interface UserProfile {
  id: string;
  email: string;
  role: 'admin' | 'standard';
}

export default function AdminPanel() {
  const [users, setUsers] = useState<UserProfile[]>([]);
  const [loading, setLoading] = useState(true);
  const [showCreateForm, setShowCreateForm] = useState(false);
  const [newEmail, setNewEmail] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [newRole, setNewRole] = useState<'admin' | 'standard'>('standard');
  const [creating, setCreating] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');

  useEffect(() => {
    fetchUsers();
  }, []);

  async function fetchUsers() {
    setLoading(true);
    const { data, error } = await supabase
      .from('profiles')
      .select('*')
      .order('created_at', { ascending: false });

    if (!error && data) {
      setUsers(data);
    }
    setLoading(false);
  }

  async function handleCreateUser(e: React.FormEvent) {
    e.preventDefault();
    setError('');
    setSuccess('');
    setCreating(true);

    // Create auth user using signUp (works with anon key from frontend)
    // The database trigger will auto-create the profile entry
    const { data: authData, error: authError } = await supabase.auth.signUp({
      email: newEmail,
      password: newPassword,
    });

    if (authError) {
      setError(authError.message);
      setCreating(false);
      return;
    }

    // If user was created, update the role if it's admin (trigger creates as 'standard')
    if (authData.user && newRole === 'admin') {
      // Wait a moment for the trigger to create the profile
      await new Promise(resolve => setTimeout(resolve, 1000));
      
      const { error: updateError } = await supabase
        .from('profiles')
        .update({ role: 'admin' })
        .eq('id', authData.user.id);

      if (updateError) {
        setError('User created but role assignment failed. Please update role manually. Error: ' + updateError.message);
        setCreating(false);
        return;
      }
    }

    setSuccess(`User ${newEmail} created successfully with role: ${newRole}. They can now log in.`);
    setNewEmail('');
    setNewPassword('');
    setNewRole('standard');
    setShowCreateForm(false);
    fetchUsers();
    setCreating(false);
  }

  async function handleRoleChange(userId: string, newRole: 'admin' | 'standard') {
    const { error } = await supabase
      .from('profiles')
      .update({ role: newRole })
      .eq('id', userId);

    if (!error) {
      fetchUsers();
      setSuccess(`Role updated successfully.`);
      setTimeout(() => setSuccess(''), 3000);
    } else {
      setError('Failed to update role: ' + error.message);
    }
  }

  async function handleDeleteUser(userId: string, email: string) {
    if (!confirm(`Are you sure you want to delete user ${email}?\n\nNote: This will remove their profile. To fully delete the auth account, run this in Supabase SQL Editor:\nDELETE FROM auth.users WHERE id = '${userId}';`)) return;

    // Remove profile (auth user deletion requires service_role key via SQL)
    const { error } = await supabase.from('profiles').delete().eq('id', userId);
    if (!error) {
      fetchUsers();
      setSuccess(`Profile for ${email} removed. Run SQL to fully delete auth account.`);
      setTimeout(() => setSuccess(''), 5000);
    } else {
      setError('Failed to delete profile: ' + error.message);
    }
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 bg-purple-100 rounded-xl flex items-center justify-center">
            <Users className="w-5 h-5 text-purple-600" />
          </div>
          <div>
            <h2 className="text-lg font-bold text-gray-900">User Management</h2>
            <p className="text-sm text-gray-500">{users.length} registered users</p>
          </div>
        </div>
        <div className="flex items-center gap-2">
          <button
            onClick={fetchUsers}
            className="p-2 text-gray-500 hover:text-gray-700 hover:bg-gray-100 rounded-lg transition"
            title="Refresh"
          >
            <RefreshCw className="w-5 h-5" />
          </button>
          <button
            onClick={() => setShowCreateForm(!showCreateForm)}
            className="flex items-center gap-2 px-4 py-2 bg-purple-600 hover:bg-purple-700 text-white font-medium rounded-lg transition text-sm shadow-sm"
          >
            <Plus className="w-4 h-4" />
            Add User
          </button>
        </div>
      </div>

      {/* Messages */}
      {error && (
        <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded-lg text-sm">
          {error}
          <button onClick={() => setError('')} className="ml-2 font-bold">×</button>
        </div>
      )}
      {success && (
        <div className="bg-green-50 border border-green-200 text-green-700 px-4 py-3 rounded-lg text-sm">
          {success}
        </div>
      )}

      {/* Create User Form */}
      {showCreateForm && (
        <div className="bg-white rounded-xl border border-gray-200 p-6 shadow-sm">
          <h3 className="font-semibold text-gray-800 mb-4">Register New User</h3>
          <form onSubmit={handleCreateUser} className="space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Email *</label>
                <input
                  type="email"
                  value={newEmail}
                  onChange={(e) => setNewEmail(e.target.value)}
                  placeholder="user@company.com"
                  className="w-full px-3 py-2.5 border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-purple-500 text-sm"
                  required
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Password *</label>
                <input
                  type="password"
                  value={newPassword}
                  onChange={(e) => setNewPassword(e.target.value)}
                  placeholder="Minimum 6 characters"
                  className="w-full px-3 py-2.5 border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-purple-500 text-sm"
                  required
                  minLength={6}
                />
              </div>
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Role</label>
              <select
                value={newRole}
                onChange={(e) => setNewRole(e.target.value as 'admin' | 'standard')}
                className="w-full px-3 py-2.5 border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-purple-500 text-sm bg-white"
              >
                <option value="standard">Standard User</option>
                <option value="admin">Admin</option>
              </select>
            </div>
            <div className="flex items-center gap-3">
              <button
                type="submit"
                disabled={creating}
                className="px-5 py-2.5 bg-purple-600 hover:bg-purple-700 disabled:bg-gray-300 text-white font-medium rounded-lg transition text-sm shadow-sm"
              >
                {creating ? 'Creating...' : 'Create User'}
              </button>
              <button
                type="button"
                onClick={() => setShowCreateForm(false)}
                className="px-5 py-2.5 text-gray-700 hover:bg-gray-100 font-medium rounded-lg transition text-sm"
              >
                Cancel
              </button>
            </div>
          </form>
        </div>
      )}

      {/* Users Table */}
      <div className="bg-white rounded-xl border border-gray-200 shadow-sm overflow-hidden">
        {loading ? (
          <div className="p-12 text-center text-gray-500">
            <svg className="animate-spin w-8 h-8 mx-auto mb-3 text-purple-600" viewBox="0 0 24 24">
              <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" fill="none" />
              <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
            </svg>
            Loading users...
          </div>
        ) : users.length === 0 ? (
          <div className="p-12 text-center text-gray-500">
            <Users className="w-12 h-12 mx-auto mb-3 text-gray-300" />
            <p className="font-medium">No users found</p>
            <p className="text-sm mt-1">Create your first user above.</p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead className="bg-gray-50 border-b border-gray-200">
                <tr>
                  <th className="text-left px-5 py-3 text-xs font-semibold text-gray-500 uppercase tracking-wider">User</th>
                  <th className="text-left px-5 py-3 text-xs font-semibold text-gray-500 uppercase tracking-wider">Role</th>
                  <th className="text-left px-5 py-3 text-xs font-semibold text-gray-500 uppercase tracking-wider hidden md:table-cell">ID</th>
                  <th className="text-right px-5 py-3 text-xs font-semibold text-gray-500 uppercase tracking-wider">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100">
                {users.map((user) => (
                  <tr key={user.id} className="hover:bg-gray-50 transition">
                    <td className="px-5 py-4">
                      <div className="flex items-center gap-3">
                        <div className="w-9 h-9 bg-purple-100 rounded-full flex items-center justify-center">
                          <span className="text-sm font-medium text-purple-600">
                            {user.email.charAt(0).toUpperCase()}
                          </span>
                        </div>
                        <span className="text-sm font-medium text-gray-900">{user.email}</span>
                      </div>
                    </td>
                    <td className="px-5 py-4">
                      <select
                        value={user.role}
                        onChange={(e) => handleRoleChange(user.id, e.target.value as 'admin' | 'standard')}
                        className={`px-3 py-1.5 rounded-lg text-xs font-medium border cursor-pointer focus:outline-none focus:ring-2 focus:ring-purple-500 ${
                          user.role === 'admin'
                            ? 'bg-purple-100 text-purple-700 border-purple-200'
                            : 'bg-gray-100 text-gray-700 border-gray-200'
                        }`}
                      >
                        <option value="admin">Admin</option>
                        <option value="standard">Standard</option>
                      </select>
                    </td>
                    <td className="px-5 py-4 hidden md:table-cell">
                      <code className="text-xs text-gray-400 bg-gray-50 px-2 py-1 rounded">
                        {user.id.slice(0, 8)}...
                      </code>
                    </td>
                    <td className="px-5 py-4 text-right">
                      <button
                        onClick={() => handleDeleteUser(user.id, user.email)}
                        className="p-2 text-gray-400 hover:text-red-600 hover:bg-red-50 rounded-lg transition"
                        title="Delete user"
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Info Card */}
      <div className="bg-blue-50 border border-blue-200 rounded-xl p-5">
        <div className="flex items-start gap-3">
          <ShieldCheck className="w-5 h-5 text-blue-600 mt-0.5 flex-shrink-0" />
          <div>
            <h4 className="text-sm font-semibold text-blue-800">Admin Permissions</h4>
            <p className="text-sm text-blue-700 mt-1">
              As an admin, you can create and delete users, change user roles, create and delete tickets,
              and manage all aspects of the compliance tracking system.
            </p>
            <div className="flex items-center gap-4 mt-3">
              <div className="flex items-center gap-1.5">
                <Shield className="w-4 h-4 text-purple-600" />
                <span className="text-xs text-blue-700">Admin: Full access</span>
              </div>
              <div className="flex items-center gap-1.5">
                <Users className="w-4 h-4 text-gray-600" />
                <span className="text-xs text-blue-700">Standard: View assigned tickets, add notes & uploads</span>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
