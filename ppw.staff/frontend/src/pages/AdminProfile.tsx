import { useState, useEffect } from 'react';
import { getUsers, createUser, deleteUser, updateUser, getStockParents, getStockCategories } from '../api';
import { Plus, Trash2, X, Edit2, Search } from 'lucide-react';

interface NewUserState {
    username: string;
    password: string;
    name: string;
    number: string;
    role: string;
    allowed_parents: string[];
    allowed_categories: string[];
}

const emptyUser: NewUserState = { username: '', password: '', name: '', number: '', role: 'employee', allowed_parents: [], allowed_categories: [] };

export default function AdminProfile() {
    const [users, setUsers] = useState<any[]>([]);
    const [showAddModal, setShowAddModal] = useState(false);
    const [editingUserId, setEditingUserId] = useState<number | null>(null);
    const [newUser, setNewUser] = useState<NewUserState>(emptyUser);
    const [allParents, setAllParents] = useState<string[]>([]);
    const [allCategories, setAllCategories] = useState<string[]>([]);
    const [parentSearch, setParentSearch] = useState('');
    const [categorySearch, setCategorySearch] = useState('');

    useEffect(() => {
        fetchUsers();
        Promise.all([getStockParents(), getStockCategories()])
            .then(([p, c]) => { setAllParents(p || []); setAllCategories(c || []); })
            .catch((e) => console.error('Failed to load parents/categories', e));
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
        setNewUser(emptyUser);
        setParentSearch('');
        setCategorySearch('');
        setEditingUserId(null);
        setShowAddModal(false);
    };

    const buildSavePayload = (): any => {
        const { allowed_parents, allowed_categories, ...base } = newUser;
        const payload: any = { ...base };
        if (newUser.role === 'admin') {
            payload.permissions = null;
        } else {
            payload.permissions = {
                allowedParents: allowed_parents,
                allowedCategories: allowed_categories,
            };
        }
        return payload;
    };

    const handleSaveUser = async () => {
        try {
            if (editingUserId) {
                const updatePayload = buildSavePayload();
                if (!updatePayload.password) delete updatePayload.password;
                await updateUser(editingUserId, updatePayload);
                alert('User updated!');
            } else {
                await createUser(buildSavePayload());
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
            allowed_parents: user.permissions?.allowedParents || [],
            allowed_categories: user.permissions?.allowedCategories || [],
        });
        setParentSearch('');
        setCategorySearch('');
        setShowAddModal(true);
    };

    const togglePermItem = (key: 'allowed_parents' | 'allowed_categories', value: string) => {
        setNewUser((prev) => {
            const current = prev[key];
            const next = current.includes(value) ? current.filter((v) => v !== value) : [...current, value];
            return { ...prev, [key]: next };
        });
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
                    <div className="bg-white w-full max-w-md rounded-3xl shadow-2xl p-6 space-y-6 relative max-h-[90vh] overflow-y-auto">
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
                                        value={newUser.password}
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
                                        onChange={(e) => setNewUser({ ...newUser, role: e.target.value })}
                                        className="w-full p-3 bg-slate-50 border border-slate-200 rounded-xl focus:outline-none focus:border-indigo-500 appearance-none"
                                    >
                                        <option value="employee">Employee</option>
                                        <option value="manager">Manager</option>
                                        <option value="admin">Admin</option>
                                    </select>
                                </div>
                            </div>

                            {newUser.role !== 'admin' && (
                                <div className="space-y-4 pt-2 border-t border-slate-100">
                                    <p className="text-[11px] font-semibold text-slate-500">
                                        Restrict order creation to specific parents and categories. Leave empty for no restriction.
                                    </p>

                                    <PermPicker
                                        label="Allowed Parents"
                                        all={allParents}
                                        selected={newUser.allowed_parents}
                                        onToggle={(v) => togglePermItem('allowed_parents', v)}
                                        search={parentSearch}
                                        setSearch={setParentSearch}
                                        emptyText="All parents allowed"
                                    />

                                    <PermPicker
                                        label="Allowed Categories"
                                        all={allCategories}
                                        selected={newUser.allowed_categories}
                                        onToggle={(v) => togglePermItem('allowed_categories', v)}
                                        search={categorySearch}
                                        setSearch={setCategorySearch}
                                        emptyText="All categories allowed"
                                    />
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

interface PermPickerProps {
    label: string;
    all: string[];
    selected: string[];
    onToggle: (value: string) => void;
    search: string;
    setSearch: (v: string) => void;
    emptyText: string;
}

function PermPicker({ label, all, selected, onToggle, search, setSearch, emptyText }: PermPickerProps) {
    const filtered = search.trim()
        ? all.filter((v) => v.toLowerCase().includes(search.toLowerCase()))
        : all;
    const showResults = search.trim().length > 0;
    return (
        <div className="space-y-1.5">
            <div className="flex items-center justify-between">
                <label className="text-xs font-bold text-slate-400 uppercase">{label}</label>
                <span className="text-[10px] font-bold text-indigo-500 bg-indigo-50 px-2 py-0.5 rounded-full">
                    {selected.length === 0 ? emptyText : `${selected.length} selected`}
                </span>
            </div>

            {selected.length > 0 && (
                <div className="flex flex-wrap gap-1.5">
                    {selected.map((v) => (
                        <span key={v} className="inline-flex items-center gap-1 bg-indigo-50 border border-indigo-100 text-indigo-700 text-[11px] font-bold uppercase px-2 py-1 rounded-lg">
                            {v}
                            <button type="button" onClick={() => onToggle(v)} className="hover:text-indigo-900">
                                <X size={12} strokeWidth={3} />
                            </button>
                        </span>
                    ))}
                </div>
            )}

            <div className="relative">
                <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
                <input
                    type="text"
                    placeholder={`Search ${label.toLowerCase()}...`}
                    value={search}
                    onChange={(e) => setSearch(e.target.value)}
                    className="w-full pl-9 pr-3 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-sm focus:outline-none focus:border-indigo-500"
                />
            </div>

            {showResults && (
                <div className="max-h-40 overflow-y-auto border border-slate-100 rounded-xl bg-white shadow-sm divide-y divide-slate-50">
                    {filtered.length === 0 ? (
                        <div className="px-3 py-2 text-[11px] font-bold text-slate-400 uppercase text-center">No matches</div>
                    ) : (
                        filtered.slice(0, 30).map((v) => {
                            const isSelected = selected.includes(v);
                            return (
                                <button
                                    type="button"
                                    key={v}
                                    onClick={() => onToggle(v)}
                                    className={`w-full text-left px-3 py-2 text-[11px] font-bold uppercase flex items-center justify-between hover:bg-slate-50 ${isSelected ? 'text-indigo-700 bg-indigo-50/40' : 'text-slate-700'}`}
                                >
                                    <span className="truncate pr-2">{v}</span>
                                    {isSelected && <span className="text-[9px] text-indigo-500">✓ ADDED</span>}
                                </button>
                            );
                        })
                    )}
                </div>
            )}
        </div>
    );
}
