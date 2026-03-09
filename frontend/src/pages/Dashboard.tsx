import { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { CheckCircle, AlertCircle, LogOut, Package, FileText, ClipboardList, RefreshCw, ShoppingCart, IndianRupee, Calendar } from 'lucide-react';
import { getUser, getDashboardStats, syncLedgers, syncStockItems } from '../api';

import { useNavigate } from 'react-router-dom';

interface DashboardStats {
    today: { orders: number; sales: number };
    staffActivity: { id: number; name: string; bills: number; sales: number }[];
    ledgerCount: number;
    stockCount: number;
    fyOrders: number;
}

export default function Dashboard() {
    const navigate = useNavigate();
    const [status, setStatus] = useState<{ type: 'success' | 'error' | null; message: string }>({ type: null, message: '' });
    const [stats, setStats] = useState<DashboardStats | null>(null);
    const [loadingStats, setLoadingStats] = useState(true);
    const [syncingLedgers, setSyncingLedgers] = useState(false);
    const [syncingStock, setSyncingStock] = useState(false);

    // Redirect Employees to Orders
    useEffect(() => {
        const user = getUser();
        if (user.role !== 'admin') {
            navigate('/orders');
        }
    }, []);

    useEffect(() => {
        fetchStats();
    }, []);

    const fetchStats = async () => {
        try {
            setLoadingStats(true);
            const data = await getDashboardStats();
            setStats(data);
        } catch (e) {
            console.error('Failed to fetch dashboard stats', e);
        } finally {
            setLoadingStats(false);
        }
    };

    const handleSyncLedgers = async (e: React.MouseEvent) => {
        e.preventDefault();
        e.stopPropagation();
        setSyncingLedgers(true);
        try {
            await syncLedgers();
            setStatus({ type: 'success', message: 'Ledgers synced successfully' });
            fetchStats();
        } catch {
            setStatus({ type: 'error', message: 'Failed to sync ledgers' });
        } finally {
            setSyncingLedgers(false);
            setTimeout(() => setStatus({ type: null, message: '' }), 3000);
        }
    };

    const handleSyncStock = async (e: React.MouseEvent) => {
        e.preventDefault();
        e.stopPropagation();
        setSyncingStock(true);
        try {
            await syncStockItems();
            setStatus({ type: 'success', message: 'Stock items synced successfully' });
            fetchStats();
        } catch {
            setStatus({ type: 'error', message: 'Failed to sync stock items' });
        } finally {
            setSyncingStock(false);
            setTimeout(() => setStatus({ type: null, message: '' }), 3000);
        }
    };

    const handleLogout = () => {
        if (window.confirm('Are you sure you want to log out?')) {
            setStatus({ type: 'success', message: 'Logged out successfully' });
            setTimeout(() => {
                localStorage.removeItem('user');
                localStorage.removeItem('token');
                window.location.href = '/login';
            }, 1000);
        }
    };

    const getFYLabel = () => {
        const now = new Date();
        if (now.getMonth() >= 3) {
            return `FY ${now.getFullYear()}-${(now.getFullYear() + 1).toString().slice(2)}`;
        }
        return `FY ${now.getFullYear() - 1}-${now.getFullYear().toString().slice(2)}`;
    };

    return (
        <div className="p-6 space-y-6">
            {/* Header */}
            <div className="relative z-10 flex justify-between items-start">
                <div className="space-y-1">
                    <div className="flex items-center gap-3 mb-2">
                        <img src="/ppw-logo.png" alt="PPW" className="w-10 h-10 object-contain" />
                        <span className="text-xs font-bold text-indigo-600 uppercase tracking-widest bg-indigo-50 px-2 py-1 rounded-md">
                            Admin Console
                        </span>
                    </div>
                    <h2 className="text-4xl font-bold text-slate-900 tracking-tight">P.P.W.</h2>
                    <p className="text-slate-500 font-medium">Purbanchal Papers & Works</p>
                </div>
                <button
                    onClick={handleLogout}
                    className="p-3 bg-white border border-slate-200 rounded-full text-slate-400 hover:text-red-500 hover:border-red-100 hover:bg-red-50 transition-colors"
                    title="Logout"
                >
                    <LogOut size={20} />
                </button>
            </div>

            {/* Today's Stats */}
            <div className="grid grid-cols-2 gap-3">
                <div className="glass-card p-4 rounded-3xl relative overflow-hidden">
                    <div className="space-y-2">
                        <div className="w-9 h-9 rounded-2xl bg-indigo-50 flex items-center justify-center text-indigo-600">
                            <ShoppingCart size={18} />
                        </div>
                        <div>
                            <p className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">Today's Orders</p>
                            <p className="text-2xl font-black text-slate-800">
                                {loadingStats ? '...' : stats?.today.orders ?? 0}
                            </p>
                        </div>
                    </div>
                </div>
                <div className="glass-card p-4 rounded-3xl relative overflow-hidden">
                    <div className="space-y-2">
                        <div className="w-9 h-9 rounded-2xl bg-emerald-50 flex items-center justify-center text-emerald-600">
                            <IndianRupee size={18} />
                        </div>
                        <div>
                            <p className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">Today's Sales</p>
                            <p className="text-2xl font-black text-slate-800">
                                {loadingStats ? '...' : `₹${Math.round(stats?.today.sales ?? 0).toLocaleString('en-IN')}`}
                            </p>
                        </div>
                    </div>
                </div>
            </div>

            {/* Staff Activity */}
            {stats && (
                <div className="space-y-2">
                    <p className="text-sm font-bold text-slate-400 uppercase tracking-widest px-1">Staff Activity Today</p>
                    {stats.staffActivity.length > 0 ? (
                        <div className="flex gap-3 overflow-x-auto pb-2 -mx-1 px-1 snap-x snap-mandatory" style={{ scrollbarWidth: 'none' }}>
                            {stats.staffActivity.map((staff) => (
                                <div key={staff.id} className="min-w-[160px] snap-start bg-white p-3 rounded-2xl border border-slate-100 shadow-sm flex-shrink-0">
                                    <div className="flex items-center gap-2 mb-2">
                                        <div className="w-8 h-8 bg-indigo-50 rounded-full flex items-center justify-center text-indigo-600 font-bold text-sm uppercase">
                                            {(staff.name || '?').charAt(0)}
                                        </div>
                                        <span className="font-bold text-slate-800 text-sm truncate">{staff.name}</span>
                                    </div>
                                    <div className="flex justify-between text-xs">
                                        <span className="text-slate-500">{staff.bills} bills</span>
                                        <span className="font-bold text-slate-700">₹{Math.round(staff.sales).toLocaleString('en-IN')}</span>
                                    </div>
                                </div>
                            ))}
                        </div>
                    ) : (
                        <div className="bg-white p-4 rounded-2xl border border-slate-100 shadow-sm text-center text-slate-500 text-xs font-semibold">
                            No bills generated today.
                        </div>
                    )}
                </div>
            )}

            {/* Reports */}
            <div className="space-y-3">
                <p className="text-sm font-bold text-slate-400 uppercase tracking-widest px-1">Reports</p>
                <div className="grid grid-cols-1 gap-3">
                    <Link to="/ledgers" className="block p-4 bg-white rounded-2xl shadow-sm border border-slate-100 active:scale-95 transition-transform">
                        <div className="flex items-center justify-between">
                            <div className="flex items-center gap-3">
                                <div className="w-9 h-9 rounded-xl bg-indigo-50 flex items-center justify-center text-indigo-500">
                                    <FileText size={18} />
                                </div>
                                <div>
                                    <h3 className="font-bold text-slate-900">Ledgers</h3>
                                    <p className="text-xs text-slate-500">
                                        {loadingStats ? '...' : `${stats?.ledgerCount ?? 0} total`}
                                    </p>
                                </div>
                            </div>
                            <button
                                onClick={handleSyncLedgers}
                                disabled={syncingLedgers}
                                className="p-2 text-slate-400 hover:text-indigo-600 hover:bg-indigo-50 rounded-lg transition-colors disabled:opacity-50"
                                title="Sync Ledgers"
                            >
                                <RefreshCw size={16} className={syncingLedgers ? 'animate-spin' : ''} />
                            </button>
                        </div>
                    </Link>
                    <Link to="/stock-items" className="block p-4 bg-white rounded-2xl shadow-sm border border-slate-100 active:scale-95 transition-transform">
                        <div className="flex items-center justify-between">
                            <div className="flex items-center gap-3">
                                <div className="w-9 h-9 rounded-xl bg-indigo-50 flex items-center justify-center text-indigo-500">
                                    <Package size={18} />
                                </div>
                                <div>
                                    <h3 className="font-bold text-slate-900">Stock</h3>
                                    <p className="text-xs text-slate-500">
                                        {loadingStats ? '...' : `${stats?.stockCount ?? 0} items`}
                                    </p>
                                </div>
                            </div>
                            <button
                                onClick={handleSyncStock}
                                disabled={syncingStock}
                                className="p-2 text-slate-400 hover:text-indigo-600 hover:bg-indigo-50 rounded-lg transition-colors disabled:opacity-50"
                                title="Sync Stock Items"
                            >
                                <RefreshCw size={16} className={syncingStock ? 'animate-spin' : ''} />
                            </button>
                        </div>
                    </Link>
                    <Link to="/orders" className="block p-4 bg-white rounded-2xl shadow-sm border border-slate-100 active:scale-95 transition-transform">
                        <div className="flex items-center gap-3">
                            <div className="w-9 h-9 rounded-xl bg-indigo-50 flex items-center justify-center text-indigo-500">
                                <ClipboardList size={18} />
                            </div>
                            <div>
                                <h3 className="font-bold text-slate-900">Orders</h3>
                                <p className="text-xs text-slate-500">History</p>
                            </div>
                        </div>
                    </Link>
                    <div className="block p-4 bg-white rounded-2xl shadow-sm border border-slate-100">
                        <div className="flex items-center gap-3">
                            <div className="w-9 h-9 rounded-xl bg-amber-50 flex items-center justify-center text-amber-500">
                                <Calendar size={18} />
                            </div>
                            <div>
                                <h3 className="font-bold text-slate-900">{getFYLabel()}</h3>
                                <p className="text-xs text-slate-500">
                                    {loadingStats ? '...' : `${stats?.fyOrders ?? 0} total orders`}
                                </p>
                            </div>
                        </div>
                    </div>
                </div>
            </div>

            {/* Status Notification */}
            {
                status.message && (
                    <div className={`fixed top-4 left-4 right-4 z-50 p-4 rounded-2xl shadow-xl flex items-center gap-3 animate-fade-in ${status.type === 'success' ? 'bg-emerald-500 text-white' : 'bg-red-500 text-white'
                        }`}>
                        <div className="p-2 bg-white/20 rounded-full backdrop-blur-sm">
                            {status.type === 'success' ? <CheckCircle size={20} /> : <AlertCircle size={20} />}
                        </div>
                        <span className="font-bold text-sm">
                            {status.message}
                        </span>
                        <button
                            onClick={() => setStatus({ type: null, message: '' })}
                            className="ml-auto p-1 bg-white/20 rounded-full"
                        >
                            <AlertCircle size={16} className="opacity-0" />
                        </button>
                    </div>
                )
            }
        </div>
    );
}
