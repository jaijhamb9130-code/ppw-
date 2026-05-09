import { useState, useEffect } from 'react';
import { 
    Globe, Search, ArrowRight, Calendar, ShoppingCart, 
    ChevronDown, CheckCircle2, XCircle, Clock, 
    ChevronLeft, Edit3, Save, X, Check, RefreshCw
} from 'lucide-react';
import { 
    getOrders, getOrderById, getOrderDetails, 
    updateOrderItemStatus, editOrderItem, finalizeOrder, syncOnlineOrders 
} from '../api';
import { useNavigate } from 'react-router-dom';

type ViewType = 'pending' | 'completed';

export default function OnlineOrder() {
    const navigate = useNavigate();
    
    // Global State
    const [view, setView] = useState<ViewType>('pending');
    const [orders, setOrders] = useState<any[]>([]);
    const [loading, setLoading] = useState(true);
    const [showDropdown, setShowDropdown] = useState(false);
    const [searchQuery, setSearchQuery] = useState('');
    
    // Detail View State
    const [selectedOrder, setSelectedOrder] = useState<any | null>(null);
    const [items, setItems] = useState<any[]>([]);
    const [selectedItemIds, setSelectedItemIds] = useState<number[]>([]);
    const [isActionLoading, setIsActionLoading] = useState(false);
    
    // Edit Modal State
    const [editingItem, setEditingItem] = useState<any | null>(null);
    const [editForm, setEditForm] = useState({ quantity: 0, rate: 0, discount: 0 });

    useEffect(() => {
        if (!selectedOrder) {
            fetchOrders();
        }
    }, [view, selectedOrder, searchQuery]);

    const fetchOrders = async () => {
        setLoading(true);
        try {
            const statusFilter = view === 'pending' ? 'pending' : undefined;
            const data = await getOrders(1, 100, searchQuery, undefined, undefined, undefined, undefined, statusFilter, 'online');
            
            if (view === 'completed') {
                setOrders(data.data.filter((o: any) => o.status === 'completed' || o.status === 'fetched'));
            } else {
                setOrders(data.data.filter((o: any) => o.status === 'pending' || !o.status));
            }
        } catch (e) {
            console.error('Failed to fetch orders', e);
        } finally {
            setLoading(false);
        }
    };

    const handleOrderClick = async (order: any) => {
        setLoading(true);
        try {
            const fullOrder = await getOrderById(order.id);
            const details = await getOrderDetails(order.id);
            
            setSelectedOrder(fullOrder);
            
            // Only show Approved items in Completed/Synced view
            if (fullOrder.status === 'completed' || fullOrder.status === 'fetched') {
                setItems(details.filter((i: any) => i.status === 'approved'));
            } else {
                setItems(details);
            }
            setSelectedItemIds([]);
        } catch (e) {
            console.error('Failed to fetch order details', e);
        } finally {
            setLoading(false);
        }
    };

    const handleBulkStatus = async (status: 'approved' | 'rejected') => {
        if (selectedItemIds.length === 0) return;
        setIsActionLoading(true);
        try {
            await updateOrderItemStatus(selectedItemIds, status);
            const updatedDetails = await getOrderDetails(selectedOrder!.id);
            setItems(updatedDetails);
            setSelectedItemIds([]);
        } catch (e) {
            alert('Failed to update item status');
        } finally {
            setIsActionLoading(false);
        }
    };

    const handleEditSave = async () => {
        if (!editingItem) return;
        setIsActionLoading(true);
        try {
            await editOrderItem(editingItem.id, {
                quantity: editForm.quantity,
                rate: editForm.rate,
                discount_percentage: editForm.discount
            });
            const updatedDetails = await getOrderDetails(selectedOrder.id);
            const updatedOrder = await getOrderById(selectedOrder.id);
            setItems(updatedDetails);
            setSelectedOrder(updatedOrder);
            setEditingItem(null);
        } catch (e: any) {
            alert(e.response?.data?.message || 'Error saving changes');
        } finally {
            setIsActionLoading(false);
        }
    };

    const handleFinalize = async () => {
        if (!selectedOrder) return;
        
        const hasPending = items.some(i => i.status === 'pending');
        
        // If items are still pending, just save the current view (return to list)
        if (hasPending) {
            setSelectedOrder(null);
            return;
        }

        // If all items are processed, finalize and move to completed orders
        setIsActionLoading(true);
        try {
            await finalizeOrder(selectedOrder.id);
            setSelectedOrder(null);
            setView('completed');
        } catch (e: any) {
            alert(e.response?.data?.message || 'Failed to finalize order');
        } finally {
            setIsActionLoading(false);
        }
    };

    const handleGlobalSync = async () => {
        setIsActionLoading(true);
        try {
            await syncOnlineOrders();
            await fetchOrders();
        } catch (e) {
            alert('Sync failed. Please check backend connectivity.');
        } finally {
            setIsActionLoading(false);
        }
    };

    const toggleSelection = (id: number) => {
        setSelectedItemIds(prev => 
            prev.includes(id) ? prev.filter(i => i !== id) : [...prev, id]
        );
    };

    const isOrderEditable = selectedOrder?.status === 'pending';

    return (
        <div className="min-h-screen bg-white pb-32">
            {/* Header */}
            <div className="bg-white border-b border-slate-100 sticky top-0 z-40 px-4 py-4 shadow-sm">
                <div className="flex items-center justify-between">
                    <div className="relative">
                        <button 
                            onClick={() => setShowDropdown(!showDropdown)}
                            className="flex items-center gap-3 pr-4 bg-slate-50/50 hover:bg-slate-50 rounded-2xl transition-all border border-slate-100/50 p-1"
                        >
                            <div className={`w-10 h-10 rounded-xl flex items-center justify-center transition-colors ${view === 'pending' ? 'bg-amber-600 text-white shadow-lg shadow-amber-100' : 'bg-[#a96f46] text-white shadow-lg shadow-amber-100'}`}>
                                {view === 'pending' ? <Clock size={20} /> : <CheckCircle2 size={20} />}
                            </div>
                            <div className="text-left py-1">
                                <h1 className="text-xs font-black text-slate-800 uppercase tracking-tight">
                                    {view === 'pending' ? 'Pending Orders' : 'Completed Orders'}
                                </h1>
                                <p className="text-[8px] font-bold text-slate-400 uppercase tracking-widest leading-none mt-0.5">Reports Menu</p>
                            </div>
                            <ChevronDown size={14} className={`text-slate-300 ml-2 transition-transform ${showDropdown ? 'rotate-180' : ''}`} />
                        </button>

                        {showDropdown && (
                            <div className="absolute left-0 mt-3 w-64 bg-white border border-slate-100 rounded-3xl shadow-2xl overflow-hidden py-1 animate-in fade-in slide-in-from-top-2">
                                <button 
                                    onClick={() => { setView('pending'); setShowDropdown(false); setSelectedOrder(null); }}
                                    className={`w-full text-left px-5 py-3.5 text-xs font-black flex items-center gap-3 transition-colors ${view === 'pending' ? 'bg-amber-50 text-amber-700' : 'text-slate-500 hover:bg-slate-50'}`}
                                >
                                    <Clock size={18} /> Pending Approvals
                                </button>
                                <button 
                                    onClick={() => { setView('completed'); setShowDropdown(false); setSelectedOrder(null); }}
                                    className={`w-full text-left px-5 py-3.5 text-xs font-black flex items-center gap-3 transition-colors ${view === 'completed' ? 'bg-amber-50 text-[#a96f46]' : 'text-slate-500 hover:bg-slate-50'}`}
                                >
                                    <CheckCircle2 size={18} /> Finalized Orders
                                </button>
                            </div>
                        )}
                    </div>

                    <div className="flex items-center gap-2">
                        {view === 'completed' && !selectedOrder && (
                            <button 
                                onClick={handleGlobalSync}
                                disabled={isActionLoading || orders.filter(o => o.status === 'completed').length === 0}
                                className="flex items-center gap-2 px-5 py-2.5 bg-emerald-600 text-white rounded-xl font-black text-[10px] uppercase tracking-widest shadow-lg shadow-emerald-50 disabled:opacity-30 transition-all"
                            >
                                <RefreshCw size={14} className={isActionLoading ? 'animate-spin' : ''} />
                                Sync
                            </button>
                        )}
                        <button 
                            onClick={() => selectedOrder ? setSelectedOrder(null) : navigate('/')}
                            className="p-2.5 bg-white text-slate-400 rounded-xl border border-slate-200 active:scale-90 transition-all font-black"
                        >
                            <ChevronLeft size={22} />
                        </button>
                    </div>
                </div>
            </div>

            {/* Content Swapper */}
            {!selectedOrder ? (
                <div className="p-4 max-w-2xl mx-auto">
                    {/* Search */}
                    <div className="mb-6 relative group">
                        <input 
                            type="text"
                            placeholder="Search customer, ID or phone..."
                            value={searchQuery}
                            onChange={(e) => setSearchQuery(e.target.value)}
                            className="w-full pl-12 pr-4 py-4 bg-white border border-slate-200 rounded-2xl text-xs font-bold outline-none focus:border-[#a96f46] transition-all"
                        />
                        <Search className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400 group-focus-within:text-[#a96f46] transition-colors" size={18} />
                    </div>

                    <div className="space-y-3">
                        {loading ? (
                            [...Array(4)].map((_, i) => (
                                <div key={i} className="h-24 bg-white rounded-2xl border border-slate-100 animate-pulse"></div>
                            ))
                        ) : orders.length > 0 ? (
                            orders.map((order) => (
                                <div 
                                    key={order.id}
                                    onClick={() => handleOrderClick(order)}
                                    className="bg-white p-4 rounded-2xl border border-[#a96f46]/20 shadow-sm hover:border-[#a96f46]/40 transition-all flex justify-between items-center cursor-pointer group"
                                >
                                    <div className="min-w-0">
                                        <div className="flex items-center gap-2 mb-1">
                                            <span className="text-[10px] font-black text-[#a96f46] bg-amber-50 px-2 py-0.5 rounded-md">#ORD-{order.id}</span>
                                            <StatusBadge status={order.status} />
                                        </div>
                                        <h3 className="font-black text-slate-800 text-sm uppercase truncate">{order.customer_name || 'Customer Not Specified'}</h3>
                                        <div className="flex items-center gap-3 mt-1.5 text-slate-400 font-bold text-[9px] uppercase tracking-tighter">
                                            <span className="flex items-center gap-1"><Calendar size={11} /> {new Date(order.date).toLocaleDateString()}</span>
                                            <span className="flex items-center gap-1"><Globe size={11} /> Online Order</span>
                                        </div>
                                    </div>
                                    <div className="text-right">
                                        <p className="text-[11px] font-bold text-slate-900">₹{Math.round(order.total_amount).toLocaleString()}</p>
                                        <p className="text-[7px] font-black text-slate-400 uppercase mt-0.5 group-hover:text-[#a96f46] transition-colors">Manage <ArrowRight size={8} className="inline ml-0.5" /></p>
                                    </div>
                                </div>
                            ))
                        ) : (
                            <div className="text-center py-20">
                                <ShoppingCart size={32} className="text-slate-200 mx-auto mb-4" />
                                <h3 className="font-black text-slate-800 text-sm uppercase">No pending orders found</h3>
                                <p className="text-slate-400 text-[10px] uppercase font-bold tracking-widest mt-1">Check back later for new customer submissions.</p>
                            </div>
                        )}
                    </div>
                </div>
            ) : (
                /* Detail View (Redesigned) */
                <div className="animate-in fade-in slide-in-from-right-4 duration-300">
                    {/* Floating Selection Bar */}
                    {selectedItemIds.length > 0 && isOrderEditable && (
                        <div className="fixed bottom-0 left-0 right-0 z-50 p-4 bg-white/80 backdrop-blur-md border-t border-slate-100/50 animate-in slide-in-from-bottom-full duration-300">
                            <div className="max-w-xl mx-auto flex items-center justify-between bg-slate-900 text-white p-4 rounded-3xl shadow-2xl">
                                <div className="pl-2">
                                    <p className="text-[8px] font-black uppercase text-slate-400 tracking-widest">Selection</p>
                                    <p className="text-xs font-black text-amber-400 uppercase">{selectedItemIds.length} Items</p>
                                </div>
                                <div className="flex gap-2">
                                    <button 
                                        onClick={() => handleBulkStatus('rejected')}
                                        className="px-4 py-2.5 bg-white/10 hover:bg-white/20 text-red-400 rounded-xl font-black text-[9px] uppercase transition-all"
                                    >
                                        Reject
                                    </button>
                                    <button 
                                        onClick={() => handleBulkStatus('approved')}
                                        className="px-5 py-2.5 bg-amber-500 text-white rounded-xl font-black text-[9px] uppercase shadow-lg shadow-amber-500/20 transition-all"
                                    >
                                        Approve
                                    </button>
                                </div>
                            </div>
                        </div>
                    )}

                    {/* Order Summary (Minimal) */}
                    <div className="px-4 py-2 max-w-xl mx-auto">
                        <div className="mb-3 border-b border-slate-100 pb-3 flex justify-between items-end">
                            <div>
                                <p className="text-[7px] font-black text-slate-400 uppercase tracking-widest leading-none mb-1">Order Overview</p>
                                <h2 className="text-base font-bold text-slate-800 uppercase leading-none">{selectedOrder.customer_name}</h2>
                                <p className="text-slate-400 text-[9px] font-bold mt-1">{selectedOrder.customer_phone}</p>
                            </div>
                            <div className="text-right">
                                <p className="text-[7px] font-black text-slate-400 uppercase tracking-widest mb-1">Total Value</p>
                                <p className="text-base font-bold text-[#a96f46]">₹{Math.round(selectedOrder.total_amount).toLocaleString()}</p>
                            </div>
                        </div>

                        {/* Items Section */}
                        <div className="space-y-3">
                            <h4 className="text-[8px] font-bold text-slate-400 uppercase tracking-[0.2em] px-1 mb-2">Itemized Breakdown</h4>
                            {items.map((item) => (
                                <div key={item.id} className={`p-2.5 rounded-xl border transition-all ${selectedItemIds.includes(item.id) ? 'border-amber-500 bg-amber-50/20' : 'border-slate-100 bg-white'}`}>
                                    <div className="flex items-start gap-4">
                                        {isOrderEditable && item.status === 'pending' && (
                                            <div className="pt-0.5">
                                                <input 
                                                    type="checkbox"
                                                    checked={selectedItemIds.includes(item.id)}
                                                    onChange={() => toggleSelection(item.id)}
                                                    className="w-5 h-5 rounded-md border-2 border-slate-200 text-amber-600 focus:ring-transparent cursor-pointer"
                                                />
                                            </div>
                                        )}
                                        <div className="flex-1 min-w-0">
                                            <div className="flex justify-between items-start gap-4">
                                                <h5 className="font-black text-slate-800 text-xs uppercase leading-tight">{item.item_name}</h5>
                                                <ItemStatusBadge status={item.status} />
                                            </div>
                                            
                                            <div className="flex gap-4 mt-4 items-center">
                                                <div className="flex-1">
                                                    <p className="text-[8px] font-black text-slate-400 uppercase tracking-tighter mb-0.5">Specs</p>
                                                    <p className="text-[11px] font-bold text-slate-700">{item.quantity}{item.unit} @ ₹{Number(item.rate).toFixed(0)}</p>
                                                </div>
                                                <div className="flex-1">
                                                    <p className="text-[8px] font-black text-slate-400 uppercase tracking-tighter mb-0.5">Discount</p>
                                                    <p className="text-[11px] font-bold text-slate-700">{item.discount_percentage}% OFF</p>
                                                </div>
                                                <div className="text-right">
                                                    <p className="text-[8px] font-black text-slate-400 uppercase tracking-tighter mb-0.5">Final Amt</p>
                                                    <p className="text-sm font-black text-slate-900">₹{Math.round(item.amount).toLocaleString()}</p>
                                                </div>
                                            </div>

                                            {isOrderEditable && item.status === 'pending' && (
                                                <div className="mt-4 flex justify-end">
                                                    <button 
                                                        onClick={() => {
                                                            setEditingItem(item);
                                                            setEditForm({ quantity: item.quantity, rate: item.rate, discount: item.discount_percentage });
                                                        }}
                                                        className="flex items-center gap-1.5 text-[9px] font-black text-[#a96f46] uppercase tracking-wider"
                                                    >
                                                        <Edit3 size={11} /> Modify
                                                    </button>
                                                </div>
                                            )}
                                        </div>
                                    </div>
                                </div>
                            ))}
                        </div>

                        {/* Save / Finalize Button - Ultra Compact */}
                        {isOrderEditable && selectedItemIds.length === 0 && (
                            <div className="mt-8 flex justify-center sticky bottom-6 pb-4">
                                <button 
                                    onClick={handleFinalize}
                                    disabled={isActionLoading}
                                    className="px-10 py-3 rounded-full font-bold text-[9px] uppercase tracking-[0.2em] shadow-md transition-all active:scale-95 flex items-center justify-center gap-2 bg-[#a96f46] text-white shadow-[#a96f46]/10"
                                >
                                    {isActionLoading ? <RefreshCw className="animate-spin" size={12} /> : <Save size={12} />}
                                    Save
                                </button>
                            </div>
                        )}
                    </div>
                </div>
            )}

            {/* Minimal Edit Modal */}
            {editingItem && (
                <div className="fixed inset-0 z-[60] flex items-center justify-center p-6 bg-white/80 backdrop-blur-sm animate-in fade-in duration-200">
                    <div className="bg-white w-full max-w-sm rounded-[32px] border border-slate-100 shadow-2xl p-6 ring-1 ring-slate-900/5">
                        <div className="flex justify-between mb-8">
                            <div>
                                <h3 className="text-base font-black text-slate-800 uppercase tracking-tight">Adjust Metrics</h3>
                                <p className="text-[9px] font-bold text-slate-400 uppercase mt-0.5">Item Ref: {editingItem.id}</p>
                            </div>
                            <button onClick={() => setEditingItem(null)} className="p-2 text-slate-300 hover:text-slate-900"><X size={20} /></button>
                        </div>

                        <div className="space-y-4">
                            <MetricInput label="Quantity" value={editForm.quantity} onChange={(v) => setEditForm({...editForm, quantity: v})} />
                            <div className="grid grid-cols-2 gap-3">
                                <MetricInput label="Rate" value={editForm.rate} onChange={(v) => setEditForm({...editForm, rate: v})} />
                                <MetricInput label="Disc %" value={editForm.discount} onChange={(v) => setEditForm({...editForm, discount: v})} />
                            </div>
                        </div>

                        <button 
                            onClick={handleEditSave}
                            disabled={isActionLoading}
                            className="w-full mt-8 py-4 bg-[#a96f46] text-white rounded-2xl font-black text-[10px] uppercase tracking-widest shadow-lg shadow-amber-900/20 active:scale-95"
                        >
                            Update Details
                        </button>
                    </div>
                </div>
            )}
        </div>
    );
}

function MetricInput({ label, value, onChange }: { label: string, value: number, onChange: (v: number) => void }) {
    return (
        <div>
            <label className="text-[9px] font-black text-slate-400 uppercase tracking-widest mb-1.5 block pl-1">{label}</label>
            <input 
                type="number"
                value={value}
                onChange={(e) => onChange(Number(e.target.value))}
                className="w-full px-4 py-3.5 bg-slate-50 border border-slate-100 rounded-xl font-black text-sm text-slate-800 outline-none focus:border-[#a96f46] transition-all"
            />
        </div>
    );
}

function StatusBadge({ status }: { status: string }) {
    if (status === 'pending' || !status) return <span className="text-[8px] font-black text-amber-600 uppercase tracking-widest bg-amber-50 px-1.5 py-0.5 rounded">Pending</span>;
    if (status === 'completed') return <span className="text-[8px] font-black text-indigo-600 uppercase tracking-widest bg-indigo-50 px-1.5 py-0.5 rounded">Finalized</span>;
    if (status === 'fetched') return <span className="text-[8px] font-black text-emerald-600 uppercase tracking-widest bg-emerald-50 px-1.5 py-0.5 rounded">Synced</span>;
    return null;
}

function ItemStatusBadge({ status }: { status: string }) {
    if (status === 'pending' || !status) return <span className="text-[9px] font-black text-amber-500 uppercase tracking-widest border border-amber-100 px-2.5 py-1 rounded-lg">Pending</span>;
    if (status === 'approved') return <span className="text-[9px] font-black text-emerald-500 uppercase tracking-widest border border-emerald-100 px-2.5 py-1 rounded-lg">Approved</span>;
    if (status === 'rejected') return <span className="text-[9px] font-black text-red-500 uppercase tracking-widest border border-red-100 px-2.5 py-1 rounded-lg">Rejected</span>;
    return null;
}
