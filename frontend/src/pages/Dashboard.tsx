import { useState } from 'react';
import { Link } from 'react-router-dom';
import { CheckCircle, AlertCircle, Activity, ArrowUpRight, Zap, LogOut, Package, FileText, ClipboardList } from 'lucide-react';
import { getUser } from '../api';

import { useNavigate } from 'react-router-dom';
import { useEffect } from 'react';

export default function Dashboard() {
    const navigate = useNavigate();
    const [status, setStatus] = useState<{ type: 'success' | 'error' | null; message: string }>({ type: null, message: '' });

    // Redirect Employees to Orders
    useEffect(() => {
        const user = getUser();
        if (user.role !== 'admin') {
            navigate('/orders');
        }
    }, []);

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

    return (
        <div className="p-6 space-y-8">
            {/* Header */}
            <div className="relative z-10 flex justify-between items-start">
                <div className="space-y-1">
                    <div className="flex items-center gap-3 mb-2">
                        <img src="/ppw-logo.png" alt="PPW" className="w-10 h-10 object-contain" />
                        <span className="text-xs font-bold text-indigo-600 uppercase tracking-widest bg-indigo-50 px-2 py-1 rounded-md">
                            {getUser().role === 'admin' ? 'Admin Console' : (getUser().role === 'manager' ? 'Manager Console' : 'Employee Portal')}
                        </span>
                    </div>
                    <h2 className="text-4xl font-bold text-slate-900 tracking-tight">P.P.W.</h2>
                    <p className="text-slate-500 font-medium">Purbanchal Paper & Works</p>
                </div>
                <button
                    onClick={handleLogout}
                    className="p-3 bg-white border border-slate-200 rounded-full text-slate-400 hover:text-red-500 hover:border-red-100 hover:bg-red-50 transition-colors"
                    title="Logout"
                >
                    <LogOut size={20} />
                </button>
            </div>

            {/* Quick Stats / Highlights (Static for now to add premium feel) */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="glass-card p-4 rounded-3xl relative overflow-hidden group">
                    <div className="absolute top-0 right-0 p-3 opacity-10 group-hover:opacity-20 transition-opacity">
                        <Activity size={40} className="text-indigo-600" />
                    </div>
                    <div className="space-y-3 relative z-10">
                        <div className="w-10 h-10 rounded-2xl bg-indigo-50 flex items-center justify-center text-indigo-600">
                            <Zap size={20} />
                        </div>
                        <div>
                            <p className="text-xs font-bold text-slate-400 uppercase tracking-wider">System Status</p>
                            <p className="text-lg font-bold text-slate-800">Online</p>
                        </div>
                    </div>
                </div>
                <div className="glass-card p-4 rounded-3xl relative overflow-hidden group">
                    <div className="absolute top-0 right-0 p-3 opacity-10 group-hover:opacity-20 transition-opacity">
                        <ArrowUpRight size={40} className="text-emerald-600" />
                    </div>
                    <div className="space-y-3 relative z-10">
                        <div className="w-10 h-10 rounded-2xl bg-emerald-50 flex items-center justify-center text-emerald-600">
                            <CheckCircle size={20} />
                        </div>
                        <div>
                            <p className="text-xs font-bold text-slate-400 uppercase tracking-wider">Last Sync</p>
                            <p className="text-lg font-bold text-slate-800">Today</p>
                        </div>
                    </div>
                </div>

            </div>

            {/* operations & Reports - Admin Only */}
            {getUser().role === 'admin' && (
                <div className="space-y-4">
                    <p className="text-sm font-bold text-slate-400 uppercase tracking-widest px-1">Reports</p>
                    <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                        <Link to="/ledgers" className="block p-4 bg-white rounded-2xl shadow-sm border border-slate-100 active:scale-95 transition-transform">
                            <div className="flex items-center gap-2 mb-1">
                                <FileText size={16} className="text-indigo-500" />
                                <h3 className="font-bold text-slate-900">Ledgers</h3>
                            </div>
                            <p className="text-xs text-slate-500">View balances</p>
                        </Link>
                        <Link to="/stock-items" className="block p-4 bg-white rounded-2xl shadow-sm border border-slate-100 active:scale-95 transition-transform">
                            <div className="flex items-center gap-2 mb-1">
                                <Package size={16} className="text-indigo-500" />
                                <h3 className="font-bold text-slate-900">Stock</h3>
                            </div>
                            <p className="text-xs text-slate-500">Items & Rates</p>
                        </Link>
                        <Link to="/orders" className="block p-4 bg-white rounded-2xl shadow-sm border border-slate-100 active:scale-95 transition-transform">
                            <div className="flex items-center gap-2 mb-1">
                                <ClipboardList size={16} className="text-indigo-500" />
                                <h3 className="font-bold text-slate-900">Orders</h3>
                            </div>
                            <p className="text-xs text-slate-500">History</p>
                        </Link>
                    </div>
                </div>
            )}



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
                            <AlertCircle size={16} className="opacity-0" /> {/* Spacer */}
                        </button>
                    </div>
                )
            }
        </div >
    );
}

