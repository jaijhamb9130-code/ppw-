import { useState, useEffect, useCallback } from 'react';
import { getUsers, createUser, deleteUser, updateUser, getStockParents, getStockCategories } from '../api';
import { Plus, Trash2, X, Edit2, Search, Check, ShieldCheck, Tag, Box } from 'lucide-react';

export default function AdminProfile() {
    const [users, setUsers] = useState<any[]>([]);
    const [showAddModal, setShowAddModal] = useState(false);
    const [editingUserId, setEditingUserId] = useState<number | null>(null);
    const [newUser, setNewUser] = useState({ username: '', password: '', name: '', number: '', role: 'employee' });

    // PermPicker State
    const [allowed_parents, setAllowedParents] = useState<string[]>([]);
    const [allowed_categories, setAllowedCategories] = useState<string[]>([]);

    useEffect(() => {
        fetchUsers();
    }, []);

    const fetchUsers = async () => {
        try {
            const data = await getUsers();
            setUsers(data);
        } catch (error) {
            console.error(error);
        }
    };

    const resetForm = () => {
        setNewUser({ username: '', password: '', name: '', number: '', role: 'employee', system_perms: [] });
        setAllowedParents([]);
        setAllowedCategories([]);
        setEditingUserId(null);
        setShowAddModal(false);
    };

    const handleSaveUser = async () => {
        try {
            const payload: any = { ...newUser };

            // Attach permissions if not admin
            if (newUser.role !== 'admin') {
                payload.permissions = {
                    allowedParents: allowed_parents,
                    allowedCategories: allowed_categories,
                    system: newUser.system_perms,
                };
            }

            if (editingUserId) {
                if (!payload.password) delete payload.password;
                await updateUser(editingUserId, payload);
                alert('User updated!');
            } else {
                await createUser(payload);
                alert('User created!');
            }
            resetForm();
            fetchUsers();
        } catch (error: any) {
            const msg = error?.response?.data?.message || 'Operation failed';
            alert(msg);
            console.error(error);
        }
    };

    const handleEditClick = (user: any) => {
        setEditingUserId(user.id);
        setNewUser({
            username: user.username,
            password: '',
            name: user.name || '',
            number: user.number || '',
            role: user.role,
            system_perms: user.permissions?.system || []
        });

        // Load permissions
        if (user.permissions) {
            setAllowedParents(user.permissions.allowedParents || []);
            setAllowedCategories(user.permissions.allowedCategories || []);
        } else {
            setAllowedParents([]);
            setAllowedCategories([]);
        }

        setShowAddModal(true);
    };

    const handleDeleteUser = async (id: number) => {
        if (!confirm('Are you sure?')) return;
        try {
            await deleteUser(id);
            fetchUsers();
        } catch (error) {
            console.error(error);
        }
    };

    return (
        <div className="p-6 space-y-6 pb-24">
            <div className="flex items-center gap-3 mb-2">
                <img src="/ppw-logo.png" alt="Logo" className="w-10 h-10 object-contain" />
                <h2 className="text-3xl font-bold text-slate-800">Roles Management</h2>
            </div>

            <div className="space-y-4">
                <div className="flex justify-between items-center">
                    <p className="text-sm text-slate-500">Manage access and roles.</p>
                    <button
                        onClick={() => { resetForm(); setShowAddModal(true); }}
                        className="px-4 py-2 bg-indigo-600 text-white font-bold rounded-xl flex items-center gap-2 text-sm shadow-lg shadow-indigo-200 active:scale-95 transition-transform"
                    >
                        <Plus size={18} />
                        Add Staff
                    </button>
                </div>

                <div className="space-y-3">
                    {users.map((user) => (
                        <div key={user.id} className="bg-white p-4 rounded-2xl border border-slate-100 shadow-sm flex items-center justify-between">
                            <div className="flex items-center gap-3">
                                <div className="w-10 h-10 bg-slate-100 rounded-full flex items-center justify-center text-slate-500 font-bold text-lg uppercase">
                                    {user.username.charAt(0)}
                                </div>
                                <div>
                                    <p className="font-bold text-slate-800">{user.name || user.username}</p>
                                    <p className="text-xs text-slate-500 capitalize flex items-center gap-1">
                                        {user.role} <span className="text-slate-300">•</span> {user.number || 'No Phone'}
                                    </p>
                                </div>
                            </div>
                            <div className="flex items-center gap-2">
                                <button
                                    onClick={() => handleEditClick(user)}
                                    className="p-2 text-slate-400 hover:text-indigo-600 hover:bg-indigo-50 rounded-lg transition-colors"
                                >
                                    <Edit2 size={18} />
                                </button>
                                {user.username !== 'admin' && (
                                    <button
                                        onClick={() => handleDeleteUser(user.id)}
                                        className="p-2 text-slate-400 hover:text-red-600 hover:bg-red-50 rounded-lg transition-colors"
                                        title="Delete User"
                                    >
                                        <Trash2 size={18} />
                                    </button>
                                )}
                            </div>
                        </div>
                    ))}
                </div>
            </div>

            {/* Add/Edit User Modal */}
            {showAddModal && (
                <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/20 backdrop-blur-sm animate-fade-in">
                    <div className="bg-white w-full max-w-md rounded-3xl shadow-2xl p-6 space-y-6 relative">
                        <button
                            onClick={resetForm}
                            className="absolute top-4 right-4 text-slate-400 hover:text-slate-600"
                        >
                            <X size={24} />
                        </button>

                        <div>
                            <h3 className="text-2xl font-bold text-slate-800">{editingUserId ? 'Edit Staff' : 'Add New Staff'}</h3>
                            <p className="text-slate-500">{editingUserId ? 'Update employee details.' : 'Create login credentials for a new employee.'}</p>
                        </div>

                        <div className="space-y-4">
                            <div className="grid grid-cols-2 gap-4">
                                <div className="space-y-1">
                                    <label className="text-xs font-bold text-slate-400 uppercase">Username</label>
                                    <input
                                        value={newUser.username}
                                        onChange={(e) => setNewUser({ ...newUser, username: e.target.value })}
                                        className="w-full p-3 bg-slate-50 border border-slate-200 rounded-xl focus:outline-none focus:border-indigo-500"
                                        disabled={!!editingUserId}
                                    />
                                </div>
                                <div className="space-y-1">
                                    <label className="text-xs font-bold text-slate-400 uppercase">Password</label>
                                    <input
                                        value={newUser.password || ''}
                                        onChange={(e) => setNewUser({ ...newUser, password: e.target.value })}
                                        placeholder={editingUserId ? "Leave empty to keep" : ""}
                                        className="w-full p-3 bg-slate-50 border border-slate-200 rounded-xl focus:outline-none focus:border-indigo-500"
                                    />
                                </div>
                            </div>
                            <div className="space-y-1">
                                <label className="text-xs font-bold text-slate-400 uppercase">Full Name</label>
                                <input
                                    value={newUser.name}
                                    onChange={(e) => setNewUser({ ...newUser, name: e.target.value })}
                                    className="w-full p-3 bg-slate-50 border border-slate-200 rounded-xl focus:outline-none focus:border-indigo-500"
                                />
                            </div>
                            <div className="grid grid-cols-2 gap-4">
                                <div className="space-y-1">
                                    <label className="text-xs font-bold text-slate-400 uppercase">Phone Number</label>
                                    <input
                                        value={newUser.number}
                                        onChange={(e) => setNewUser({ ...newUser, number: e.target.value })}
                                        className="w-full p-3 bg-slate-50 border border-slate-200 rounded-xl focus:outline-none focus:border-indigo-500"
                                    />
                                </div>
                                <div className="space-y-1">
                                    <label className="text-xs font-bold text-slate-400 uppercase">Role</label>
                                    <select
                                        value={newUser.role}
                                        onChange={(e) => {
                                            const role = e.target.value;
                                            setNewUser({ 
                                                ...newUser, 
                                                role,
                                                system_perms: role === 'manager' ? ['inventory'] : []
                                            });
                                        }}
                                        className="w-full p-3 bg-slate-50 border border-slate-200 rounded-xl focus:outline-none focus:border-indigo-500 appearance-none"
                                    >
                                        <option value="employee">Employee</option>
                                        <option value="manager">Manager</option>
                                        <option value="admin">Admin</option>
                                    </select>
                                </div>
                            </div>

                            {/* Permissions Section - Only for non-admins */}
                            {newUser.role !== 'admin' && (
                                <div className="space-y-6 pt-5 border-t border-slate-100">
                                    {/* 1. System Pages Access */}
                                    <div className="space-y-3">
                                        <div className="flex items-center gap-2">
                                            <ShieldCheck size={18} className="text-indigo-600" />
                                            <h4 className="text-sm font-black text-slate-700 uppercase tracking-tight">System Page Access</h4>
                                        </div>
                                        <p className="text-[10px] font-bold text-slate-400 leading-tight">
                                            Grant access to specific modules. Staff can ONLY open these pages.
                                        </p>
                                        <div className="grid grid-cols-2 gap-2">
                                            {[
                                                { id: 'dashboard', label: 'Dashboard' },
                                                { id: 'inventory', label: 'Inventory' },
                                                { id: 'orders', label: 'Orders List' },
                                                { id: 'staff', label: 'Roles/Staff' },
                                                { id: 'ledgers', label: 'Ledgers' },
                                                { id: 'sync', label: 'Sync Tally' }
                                            ].map(p => (
                                                <button
                                                    key={p.id}
                                                    type="button"
                                                    onClick={() => {
                                                        const current = newUser.system_perms;
                                                        const next = current.includes(p.id) ? current.filter(x => x !== p.id) : [...current, p.id];
                                                        setNewUser({ ...newUser, system_perms: next });
                                                    }}
                                                    className={`px-3 py-2.5 rounded-xl text-[11px] font-bold border transition-all text-left flex items-center justify-between ${
                                                        newUser.system_perms.includes(p.id) 
                                                        ? 'bg-indigo-600 border-indigo-600 text-white shadow-md shadow-indigo-100' 
                                                        : 'bg-slate-50 border-slate-200 text-slate-500 hover:bg-slate-100'
                                                    }`}
                                                >
                                                    {p.label}
                                                    {newUser.system_perms.includes(p.id) && <Check size={12} strokeWidth={4} />}
                                                </button>
                                            ))}
                                        </div>
                                    </div>

                                    {/* 2. Data Restrictions */}
                                    <div className="space-y-4 pt-5 border-t border-slate-100">
                                        <div className="flex items-center gap-2">
                                            <Tag size={18} className="text-violet-600" />
                                            <h4 className="text-sm font-black text-slate-700 uppercase tracking-tight">Data Restrictions (Brands/Categories)</h4>
                                        </div>
                                        <p className="text-[10px] font-bold text-slate-400 leading-tight">
                                            Restrict order creation and inventory view to specific data. If NONE selected, they have FULL access to all items.
                                        </p>

                                        {/* Perm Picker for Parents (Brands) */}
                                        <PermPicker
                                            label="Allowed Brands (Parents)"
                                            icon={<Box size={14} />}
                                            selectedItems={allowed_parents}
                                            fetchItems={getStockParents}
                                            onToggle={(item) => togglePermItem(item, allowed_parents, setAllowedParents)}
                                        />

                                        {/* Perm Picker for Categories */}
                                        <PermPicker
                                            label="Allowed Categories"
                                            icon={<Tag size={14} />}
                                            selectedItems={allowed_categories}
                                            fetchItems={getStockCategories}
                                            onToggle={(item) => togglePermItem(item, allowed_categories, setAllowedCategories)}
                                        />
                                    </div>
                                </div>
                            )}
                        </div>

                        <button
                            onClick={handleSaveUser}
                            className="w-full py-4 bg-indigo-600 text-white font-bold rounded-2xl shadow-xl shadow-indigo-200 active:scale-95 transition-transform"
                        >
                            {editingUserId ? 'Update Account' : 'Create Account'}
                        </button>
                    </div>
                </div>
            )}
        </div>
    );
}

// Helper to toggle items in a permission array
function togglePermItem(item: string, list: string[], setList: (l: string[]) => void) {
    if (list.includes(item)) {
        setList(list.filter(x => x !== item));
    } else {
        setList([...list, item]);
    }
}

// Reusable Permission Picker Component
function PermPicker({ label, icon, selectedItems, fetchItems, onToggle }: {
    label: string,
    icon: any,
    selectedItems: string[],
    fetchItems: (search: string) => Promise<string[]>,
    onToggle: (item: string) => void
}) {
    const [search, setSearch] = useState('');
    const [results, setResults] = useState<string[]>([]);
    const [loading, setLoading] = useState(false);

    const searchRef = useCallback(async (query: string) => {
        if (!query) {
            setResults([]);
            return;
        }
        setLoading(true);
        try {
            const data = await fetchItems(query);
            setResults(data.filter(x => x && x.trim() !== ''));
        } catch (e) {
            console.error(e);
        } finally {
            setLoading(false);
        }
    }, [fetchItems]);

    useEffect(() => {
        const timer = setTimeout(() => searchRef(search), 300);
        return () => clearTimeout(timer);
    }, [search, searchRef]);

    return (
        <div className="space-y-2">
            <div className="flex items-center gap-2 text-[10px] font-black text-slate-500 uppercase tracking-widest">
                {icon}
                {label}
                <span className="ml-auto text-indigo-600 bg-indigo-50 px-1.5 py-0.5 rounded-full">{selectedItems.length} Selected</span>
            </div>

            {/* Selected Pills */}
            {selectedItems.length > 0 && (
                <div className="flex flex-wrap gap-1.5 mb-2">
                    {selectedItems.map(item => (
                        <button
                            key={item}
                            onClick={() => onToggle(item)}
                            className="flex items-center gap-1 bg-indigo-100 text-indigo-700 px-2 py-1 rounded-lg text-[10px] font-bold border border-indigo-200 hover:bg-indigo-200"
                        >
                            {item}
                            <X size={12} />
                        </button>
                    ))}
                </div>
            )}

            {/* Search Input */}
            <div className="relative">
                <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
                <input
                    placeholder={`Search ${label}...`}
                    value={search}
                    onChange={(e) => setSearch(e.target.value)}
                    className="w-full pl-9 pr-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs font-bold outline-none focus:border-indigo-400"
                />
            </div>

            {/* Search Results */}
            {search.length > 0 && (
                <div className="max-h-32 overflow-y-auto border border-slate-100 rounded-xl bg-white shadow-lg divide-y divide-slate-50">
                    {loading ? (
                        <div className="p-2 text-center text-[10px] font-bold text-indigo-500 animate-pulse">Searching...</div>
                    ) : results.length === 0 ? (
                        <div className="p-2 text-center text-[10px] font-bold text-slate-400">No matches found</div>
                    ) : (
                        results.map(item => {
                            const isSelected = selectedItems.includes(item);
                            return (
                                <button
                                    key={item}
                                    onClick={() => onToggle(item)}
                                    className="w-full text-left px-3 py-2 text-[10px] font-bold hover:bg-slate-50 flex justify-between items-center"
                                >
                                    <span className={isSelected ? 'text-indigo-600' : 'text-slate-700'}>{item}</span>
                                    {isSelected && <Check size={14} className="text-indigo-600" />}
                                </button>
                            );
                        })
                    )}
                </div>
            )}
        </div>
    );
}
