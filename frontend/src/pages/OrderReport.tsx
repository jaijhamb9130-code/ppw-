import { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { Loader, Search, FileText, Calendar, ArrowRight, Trash2, LogOut } from 'lucide-react';
import { getOrders, deleteOrder, getUser, syncOrderToTally } from '../api';

// Define interfaces locally if not exported from api
interface Order {
    id: number;
    bill_number: string;
    date: string;
    total_amount: string;
    status: string;
    ledger?: { name: string };
    creator?: { username: string };
    order_type?: string;
}

const ORDER_FILTERS = [
    { label: 'All', value: '', category: 'all' },
    { label: 'Pending', value: 'pending', category: 'status' },
    { label: 'Completed', value: 'fetched', category: 'status' },
    { label: 'Quotation', value: 'Quotation', category: 'type' },
    { label: 'Tax Invoice', value: 'Tax Invoice', category: 'type' },
];

export default function OrderReport() {
    const [orders, setOrders] = useState<Order[]>([]);
    const [loading, setLoading] = useState(true);
    const [searchTerm, setSearchTerm] = useState('');
    const [activeFilter, setActiveFilter] = useState({ value: '', category: 'all' });
    const [pagination, setPagination] = useState({
        page: 1,
        limit: 20,
        total: 0,
        totalPages: 0
    });

    const fetchOrders = async (page = 1, search = '', filter = activeFilter) => {
        setLoading(true);
        try {
            const params: any = { page, limit: pagination.limit, search };
            if (filter.category === 'type') params.order_type = filter.value;
            if (filter.category === 'status') params.status = filter.value;
            
            const data = await getOrders(page, pagination.limit, search, params.order_type);
            
            // If filtering by status, we might need a separate API or client-side filter
            // But let's check if the getOrders API supports status
            let filteredData = data.data;
            if (filter.category === 'status') {
                // If backend doesn't support status param yet, filter client-side for now
                // but checking api.ts it seems getOrders takes orderType.
                // Let's assume we might need to filter manually if status isn't a backend param.
                filteredData = data.data.filter((o: any) => o.status === filter.value);
            }

            setOrders(filteredData);
            setPagination({
                page: data.pagination.page,
                limit: data.pagination.limit,
                total: data.pagination.total,
                totalPages: data.pagination.totalPages
            });
        } catch (error) {
            console.error('Failed to fetch orders', error);
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        fetchOrders(1, '');
    }, []);

    // Debounce search
    useEffect(() => {
        const timer = setTimeout(() => {
            fetchOrders(1, searchTerm);
        }, 500);
        return () => clearTimeout(timer);
    }, [searchTerm]);

    const handleFilterChange = (filter: { value: string, category: string }) => {
        setActiveFilter(filter);
        fetchOrders(1, searchTerm, filter);
    };

    const handleKeyPress = (e: React.KeyboardEvent) => {
        if (e.key === 'Enter') {
            fetchOrders(1, searchTerm);
        }
    };

    const goToPage = (page: number) => {
        if (page >= 1 && page <= pagination.totalPages) {
            fetchOrders(page, searchTerm);
        }
    };

    const handleSync = async (e: React.MouseEvent, id: number) => {
        e.preventDefault();
        e.stopPropagation();
        if (!confirm('Mark this order as Pending for Tally sync?')) return;
        try {
            await syncOrderToTally(id);
            alert('Order marked as Pending for Tally!');
            fetchOrders(pagination.page, searchTerm);
        } catch (error) {
            console.error('Failed to sync order', error);
            alert('Failed to sync order');
        }
    };

    const handleDelete = async (e: React.MouseEvent, id: number) => {
        e.preventDefault(); // Prevent link navigation
        if (!confirm('Are you sure you want to delete this order?')) return;

        try {
            await deleteOrder(id);
            // Refresh list
            fetchOrders(pagination.page, searchTerm);
        } catch (error) {
            console.error('Failed to delete order', error);
            alert('Failed to delete order');
        }
    };

    return (
        <div className="flex flex-col h-full bg-slate-50 min-h-screen pb-20">
            {/* Simple Header */}
            <div className="bg-white border-b border-slate-200 px-4 py-3 sticky top-0 z-20 shadow-sm">
                <div className="flex justify-between items-center mb-3">
                    <div className="flex items-center gap-2">
                        <img src="/ppw-logo.png" alt="Logo" className="w-8 h-8 object-contain" />
                        <h1 className="text-xl font-bold text-slate-800">Day Book</h1>
                    </div>
                    <div className="flex items-center gap-2">
                        <span className="text-xs font-medium text-slate-500 bg-slate-100 px-2 py-1 rounded">
                            {pagination.total} Orders
                        </span>

                        {getUser().role === 'employee' && (
                            <button
                                onClick={() => {
                                    if (confirm('Are you sure you want to log out?')) {
                                        localStorage.removeItem('token');
                                        localStorage.removeItem('user');
                                        window.location.href = '/login';
                                    }
                                }}
                                className="flex items-center gap-1 bg-red-50 text-red-600 px-2 py-1 rounded text-xs font-bold hover:bg-red-100 transition-colors"
                            >
                                <LogOut size={12} />
                                Log Out
                            </button>
                        )}
                    </div>
                </div>
                {/* Search Bar */}
                <div className="relative mb-2">
                    <Search className="absolute left-3 top-2.5 text-slate-400" size={16} />
                    <input
                        type="text"
                        className="w-full pl-9 pr-3 py-2 bg-slate-50 border border-slate-200 rounded-lg text-sm font-semibold focus:ring-2 focus:ring-indigo-50 outline-none"
                        placeholder="Search by Bill No or Customer..."
                        value={searchTerm}
                        onChange={(e) => setSearchTerm(e.target.value)}
                        onKeyDown={handleKeyPress}
                    />
                </div>
                {/* Order Type Filter Chips */}
                <div className="flex gap-2 overflow-x-auto pb-1 no-scrollbar">
                    {ORDER_FILTERS.map((f) => (
                        <button
                            key={f.label}
                            onClick={() => handleFilterChange({ value: f.value, category: f.category })}
                            className={`px-3 py-1 rounded-full text-xs font-bold transition-colors whitespace-nowrap ${
                                activeFilter.value === f.value && activeFilter.category === f.category
                                    ? 'bg-indigo-600 text-white shadow-sm'
                                    : 'bg-slate-100 text-slate-600 hover:bg-slate-200 border border-transparent'
                            }`}
                        >
                            {f.label}
                        </button>
                    ))}
                </div>
            </div>

            {/* List */}
            <div className="p-3 space-y-2 flex-1">
                {loading ? (
                    <div className="flex justify-center py-10">
                        <Loader className="animate-spin text-indigo-500" />
                    </div>
                ) : orders.length === 0 ? (
                    <div className="text-center py-10 text-slate-400">No orders found.</div>
                ) : (
                    orders.map(order => (
                        <Link
                            to={order.status === 'inedit' ? `/orders/edit/${order.id}` : `/orders/${order.id}`}
                            key={order.id}
                            className="block bg-white border border-slate-200 rounded-lg p-2.5 hover:border-indigo-300 hover:shadow-sm active:scale-[0.99] transition-all group relative"
                        >
                            <div className="flex justify-between items-start">
                                {/* Left Content */}
                                <div className="min-w-0 flex-1 pr-2">
                                    <div className="flex items-center gap-2 mb-1">
                                        <h3 className="font-bold text-slate-800 text-sm truncate">
                                            {order.ledger?.name || 'Unknown Customer'}
                                        </h3>
                                        {/* Status moved next to name for compactness */}
                                        {order.status === 'pending' && (
                                            <span className="text-[9px] font-bold text-amber-600 bg-amber-50 px-1.5 py-0.5 rounded uppercase tracking-wide">Pending</span>
                                        )}
                                        {order.status === 'fetched' && (
                                            <span className="text-[9px] font-bold text-emerald-600 bg-emerald-50 px-1.5 py-0.5 rounded uppercase tracking-wide">Synced</span>
                                        )}
                                        {/* Order Type Badge */}
                                        <span className="text-[9px] font-bold text-indigo-600 bg-indigo-50 px-1.5 py-0.5 rounded uppercase tracking-wide border border-indigo-100">
                                            {order.order_type || 'Tax Invoice'}
                                        </span>
                                    </div>

                                    {/* Meta Row - Single Line if possible */}
                                    <div className="flex flex-wrap items-center gap-x-3 gap-y-1 text-xs text-slate-500">
                                        <span className="flex items-center gap-1 font-medium bg-slate-50 px-1.5 py-0.5 rounded">
                                            <FileText size={10} className="text-slate-400" />
                                            <span className="truncate max-w-[80px]">{order.bill_number || '-'}</span>
                                        </span>
                                        <span className="flex items-center gap-1 font-medium bg-slate-50 px-1.5 py-0.5 rounded">
                                            <Calendar size={10} className="text-slate-400" />
                                            {new Date(order.date).toLocaleDateString()}
                                        </span>
                                        {order.creator && (
                                            <span className="text-[10px] font-semibold text-slate-400">
                                                By {order.creator.username}
                                            </span>
                                        )}
                                    </div>
                                </div>

                                {/* Right: Amount & Actions */}
                                <div className="text-right flex-shrink-0">
                                    <div className="text-base font-black text-slate-800 tracking-tight leading-none">
                                        ₹{Math.round(parseFloat(order.total_amount)).toLocaleString('en-IN')}
                                    </div>

                                    <div className="flex items-center justify-end gap-1.5 mt-1 opacity-100 sm:opacity-0 sm:group-hover:opacity-100 transition-opacity">
                                        {order.status === 'inedit' && (
                                            <div className="flex gap-1">
                                                <button
                                                    onClick={(e) => handleSync(e, order.id)}
                                                    className="p-1 text-slate-300 hover:text-indigo-600 hover:bg-indigo-50 rounded transition-colors flex items-center gap-1 border border-slate-100"
                                                    title="Mark for Tally Sync"
                                                >
                                                    <ArrowRight size={14} className="rotate-[-45deg]" />
                                                    <span className="text-[10px] font-bold uppercase pr-1">Sync</span>
                                                </button>
                                                <button
                                                    onClick={(e) => handleDelete(e, order.id)}
                                                    className="p-1 text-slate-300 hover:text-red-600 hover:bg-red-50 rounded transition-colors border border-slate-100"
                                                    title="Delete Order"
                                                >
                                                    <Trash2 size={14} />
                                                </button>
                                            </div>
                                        )}
                                        <span className="p-1 text-slate-200 group-hover:text-indigo-500 transition-colors">
                                            <ArrowRight size={16} strokeWidth={2.5} />
                                        </span>
                                    </div>
                                </div>
                            </div>
                        </Link>
                    ))
                )}
            </div>

            {/* Pagination Controls - Fixed Bottom */}
            {!loading && orders.length > 0 && (
                <div className="fixed bottom-[56px] left-0 right-0 bg-white border-t border-slate-200 p-2 px-4 flex items-center justify-between shadow-up-lg z-10">
                    <span className="text-xs font-bold text-slate-500">
                        Page {pagination.page} of {pagination.totalPages}
                    </span>
                    <div className="flex gap-2">
                        <button
                            onClick={() => goToPage(pagination.page - 1)}
                            disabled={pagination.page <= 1}
                            className="px-3 py-1.5 bg-slate-100 hover:bg-slate-200 disabled:opacity-50 text-slate-700 rounded text-xs font-bold transition-colors"
                        >
                            Previous
                        </button>
                        <button
                            onClick={() => goToPage(pagination.page + 1)}
                            disabled={pagination.page >= pagination.totalPages}
                            className="px-3 py-1.5 bg-indigo-50 text-indigo-700 hover:bg-indigo-100 disabled:opacity-50 rounded text-xs font-bold transition-colors"
                        >
                            Next
                        </button>
                    </div>
                </div>
            )}
        </div>
    );
}
