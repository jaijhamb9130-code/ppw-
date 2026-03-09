import React, { useState, useEffect, useRef } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { Save, Scan, X, ChevronLeft, Search, ArrowRight, UserPlus, ChevronDown, MessageSquare, Info, Users, FileText, MapPin } from 'lucide-react';
import { getLedgers, getItemByBarcode, createOrder, getStockItems, createLedger, getOrderById, getOrderDetails, updateOrder, syncOrderToTally, getLiveStock, getDraftOrders, getStockGroups, getStockCategories } from '../api';
import { useToast } from '../context/ToastContext';

interface StockItem {
    masterid: string;
    name: string;
    ats_barcode: string;
    base_units: string;
    closing_balance: string;
    gst: string;
    default_mrp: string;
    rate_one_2: string;
    rate_one_3: string;
    rate_one_4: string;
    rate_one_5: string;
    mrp_disc_1: string;
    mrp_disc_2: string;
    mrp_disc_3: string;
    mrp_disc_4: string;
    rate_1?: string;
    rate_2?: string;
    rate_3?: string;
    rate_3a?: string;
    rate_4?: string;
    last_purchase_cost?: string;
    parent?: string;
    group?: string;
    category?: string;
}

interface OrderItem {
    stock_item_id: string;
    name: string;
    barcode: string;
    rate: number;
    unit: string;
    quantity: number;
    amount: number;
    gst: number;
    selected_scheme: string;
    selected_discount: number;
    livestock_type?: string;
    parent?: string;
    group?: string;
}

interface Ledger {
    id: number;
    name: string;
    phone_number?: string;
    gstin?: string;
    address?: string;
}

export default function CreateOrder() {
    const navigate = useNavigate();
    const { id } = useParams<{ id: string }>();
    const isEditMode = !!id;
    const { showToast } = useToast();
    const [isLocked, setIsLocked] = useState(false);

    // Fetch Groups and Categories on Mount
    useEffect(() => {
        const loadInitialData = async () => {
            try {
                const [g, p] = await Promise.all([
                    getStockGroups(),
                    getStockCategories()
                ]);
                setGroups(g);
                setParents(p);
            } catch (e) {
                console.error("Failed to load groups/categories", e);
            }
        };
        loadInitialData();
    }, []);

    // Form State
    const [ledgers, setLedgers] = useState<Ledger[]>([]);
    const [selectedLedger, setSelectedLedger] = useState<number | ''>('');
    const [selectedLedgerDetails, setSelectedLedgerDetails] = useState<any>(null);
    const [ledgerSearch, setLedgerSearch] = useState('');
    const [showLedgerDropdown, setShowLedgerDropdown] = useState(false);
    const [ledgerLoading, setLedgerLoading] = useState(false);
    
    // Draft Switching State
    const [draftOrders, setDraftOrders] = useState<any[]>([]);
    const [showDraftDropdown, setShowDraftDropdown] = useState(false);


    const [isSaving, setIsSaving] = useState(false);

    // New Ledger Modal
    const [showCreateLedger, setShowCreateLedger] = useState(false);
    const [newLedgerName, setNewLedgerName] = useState('');
    const [newLedgerAddress, setNewLedgerAddress] = useState('');
    const [newLedgerPerson, setNewLedgerPerson] = useState('');
    const [newLedgerPhone, setNewLedgerPhone] = useState('');
    const [newLedgerEmail, setNewLedgerEmail] = useState('');
    const [newLedgerGst, setNewLedgerGst] = useState('');
    const [newLedgerPincode, setNewLedgerPincode] = useState('');
    const [newLedgerState, setNewLedgerState] = useState('');
    const [creatingLedger, setCreatingLedger] = useState(false);
    
    // Customer Info Modal
    const [showCustomerInfo, setShowCustomerInfo] = useState(false);

    // Remarks Popup State
    const [showRemarkModal, setShowRemarkModal] = useState(false);
    const [tempRemark, setTempRemark] = useState('');

    // Cash Calculator State
    const [showCashCalc, setShowCashCalc] = useState(false);
    const [amountGiven, setAmountGiven] = useState('');

    // Fetch Drafts on Mount
    useEffect(() => {
        const fetchDrafts = async () => {
            try {
                const res = await getDraftOrders();
                const others = res.data.filter((d: any) => d.id !== (id ? parseInt(id) : -1));
                setDraftOrders(others);
            } catch (e) {
                console.error("Failed to fetch drafts", e);
            }
        };
        fetchDrafts();
    }, [id]);

    const handleSwitchOrder = (targetId: number) => {
        setShowDraftDropdown(false);
        const switchAction = () => {
            navigate(`/orders/edit/${targetId}`);
        };
        if (items.length > 0) {
            if (window.confirm('You have unsaved items. Click OK to Discard & Switch, or Cancel to Stay.')) {
                switchAction();
            }
        } else {
            switchAction();
        }
    };



    const [orderDate] = useState(new Date().toISOString().split('T')[0]);
    const [showRateDropdown, setShowRateDropdown] = useState(false);
    const [items, setItems] = useState<OrderItem[]>([]);
    const [orderType, setOrderType] = useState('Tax Invoice');
    const [remark, setRemark] = useState('');
    const [editingIndex, setEditingIndex] = useState<number | null>(null);
    const ledgerInputRef = useRef<HTMLInputElement>(null);

    useEffect(() => {
        if (!isEditMode) {
            ledgerInputRef.current?.focus();
        }
    }, [isEditMode]);

    useEffect(() => {
        const handleBeforeUnload = (e: BeforeUnloadEvent) => {
            if (items.length > 0) {
                e.preventDefault();
                e.returnValue = '';
            }
        };
        window.addEventListener('beforeunload', handleBeforeUnload);
        return () => window.removeEventListener('beforeunload', handleBeforeUnload);
    }, [items]);

    useEffect(() => {
        if (isEditMode && id) {
            const loadOrder = async () => {
                try {
                    const order = await getOrderById(parseInt(id));
                    if (order) {
                        setSelectedLedger(order.ledger.id);
                        setLedgerSearch(order.ledger.name);
                        setOrderType(order.order_type || 'Tax Invoice');
                        setRemark(order.remark || '');
                        setAmountGiven(order.amount_given ? String(order.amount_given) : '');
                        setSelectedLedgerDetails(order.ledger); 
                        setIsLocked(!!order.is_shared_to_tally);
                        const details = await getOrderDetails(parseInt(id));
                        const mappedItems = details.map((d: any) => ({
                            stock_item_id: d.stock_item_id,
                            name: d.item_name,
                            barcode: d.barcode,
                            rate: parseFloat(d.rate),
                            unit: d.unit,
                            quantity: parseFloat(d.quantity),
                            amount: parseFloat(d.amount),
                            gst: parseFloat(d.gst),
                            selected_scheme: d.selected_scheme,
                            selected_discount: parseFloat(d.discount_percentage),
                            livestock_type: d.livestock_type,
                            parent: d.parent,
                            group: d.group
                        }));
                        setItems(mappedItems);
                    }
                } catch (e) {
                    console.error("Failed to load order for edit", e);
                    showToast("Failed to load order", 'error');
                }
            };
            loadOrder();
        }
    }, [id, isEditMode]);

    const [itemSearch, setItemSearch] = useState('');
    const [itemSearchLoading, setItemSearchLoading] = useState(false);
    const [itemSearchResults, setItemSearchResults] = useState<StockItem[]>([]);
    const [groups, setGroups] = useState<string[]>([]);
    const [parents, setParents] = useState<string[]>([]);
    const [selectedParent, setSelectedParent] = useState<string | null>(null);
    const [selectedGroup, setSelectedGroup] = useState<string | null>(null);
    const [groupSearch, setGroupSearch] = useState('');
    const [parentSearch, setParentSearch] = useState('');
    const [showItemPopup, setShowItemPopup] = useState(false);
    const [barcodeQuery, setBarcodeQuery] = useState('');
    const [foundItem, setFoundItem] = useState<StockItem | null>(null);
    const [itemQty, setItemQty] = useState<string>('1');
    const [itemRate, setItemRate] = useState<string>('');
    const [itemDiscount, setItemDiscount] = useState<string>('0');
    const [itemLivestockType, setItemLivestockType] = useState<string>('');
    const [shopStock, setShopStock] = useState<string>('0');
    const [pbStock, setPbStock] = useState<string>('0');
    const [isFetchingLiveStock, setIsFetchingLiveStock] = useState(false);
    const [stockUnit, setStockUnit] = useState<string>('');
    const [itemUnit, setItemUnit] = useState<string>('');
    const [itemGst, setItemGst] = useState('');
    const [selectedSchemeName, setSelectedSchemeName] = useState<string>('');

    const handleFetchLiveStock = async (stockItemId: string) => {
        setIsFetchingLiveStock(true);
        try {
            const data = await getLiveStock(stockItemId);
            setShopStock(data.shop);
            setPbStock(data.pb);
            setStockUnit(data.unit);
        } catch (e) {
            console.error('Failed to fetch live stock', e);
        } finally {
            setIsFetchingLiveStock(false);
        }
    };

    useEffect(() => {
        const timer = setTimeout(() => {
            if (ledgerSearch.length >= 3) {
                searchLedgers(ledgerSearch);
            } else if (ledgerSearch.length === 0) {
                setLedgers([]);
                setShowLedgerDropdown(false);
            }
        }, 500);
        return () => clearTimeout(timer);
    }, [ledgerSearch]);

    const searchLedgers = async (query: string) => {
        setLedgerLoading(true);
        try {
            const result = await getLedgers(1, 20, query);
            if (result && result.data) {
                setLedgers(result.data);
                setShowLedgerDropdown(true);
            } else {
                setLedgers([]);
            }
        } catch (error) {
            console.error('Failed to search ledgers', error);
        } finally {
            setLedgerLoading(false);
        }
    };

    const handleSelectLedger = (ledger: any) => {
        setSelectedLedger(ledger.id);
        setLedgerSearch(ledger.name);
        setSelectedLedgerDetails(ledger);
        setShowLedgerDropdown(false);
    };

    const handleCreateLedger = async () => {
        if (!newLedgerName.trim() || !newLedgerAddress.trim() || !newLedgerPerson.trim() || !newLedgerPhone.trim()) {
            showToast('Name, Address, Person Name, and Phone are mandatory.', 'warning');
            return;
        }
        setCreatingLedger(true);
        try {
            const newLedgerData = {
                name: newLedgerName,
                address: newLedgerAddress,
                person_name: newLedgerPerson,
                phone_number: newLedgerPhone,
                email: newLedgerEmail,
                gstin: newLedgerGst,
                pincode: newLedgerPincode,
                state: newLedgerState
            };
            const newLedger = await createLedger(newLedgerData);
            handleSelectLedger(newLedger);
            setShowCreateLedger(false);
            setNewLedgerName('');
            setNewLedgerAddress('');
            setNewLedgerPerson('');
            setNewLedgerPhone('');
            setNewLedgerEmail('');
            setNewLedgerGst('');
            setNewLedgerPincode('');
            setNewLedgerState('');
            showToast('Customer created successfully!', 'success');
        } catch (e) {
            console.error(e);
            showToast('Failed to create customer', 'error');
        } finally {
            setCreatingLedger(false);
        }
    };

    useEffect(() => {
        const timer = setTimeout(() => {
            if (itemSearch || selectedGroup || selectedParent) {
                searchItems(itemSearch);
            }
        }, 500);
        return () => clearTimeout(timer);
    }, [itemSearch, selectedGroup, selectedParent]);

    const searchItems = async (query: string) => {
        if (!query && !selectedGroup && !selectedParent) return;
        setItemSearchLoading(true);
        try {
            const result = await getStockItems(
                1, 20, query, selectedGroup || '', selectedParent || ''
            );
            setItemSearchResults(result.data);
        } catch (error) {
            console.error('Failed to search items', error);
        } finally {
            setItemSearchLoading(false);
        }
    };

    const handleSelectItem = (item: StockItem) => {
        setFoundItem(item);
        setItemRate(String(item.default_mrp || ''));
        setItemUnit(item.base_units || 'Nos');
        setStockUnit(item.base_units || 'Nos');
        setShowItemPopup(true);
        setItemSearch('');
        setSelectedParent(null);
        setSelectedGroup(null);
        setParentSearch('');
        setGroupSearch('');
        handleFetchLiveStock(item.masterid);
    };

    const handleEditItem = async (idx: number) => {
        const item = items[idx];
        setEditingIndex(idx);
        setFoundItem({
            masterid: item.stock_item_id,
            name: item.name,
            ats_barcode: item.barcode,
            base_units: item.unit,
            closing_balance: '',
            gst: item.gst.toString(),
            default_mrp: '', 
            rate_one_2: '', rate_one_3: '', rate_one_4: '', rate_one_5: '',
            mrp_disc_1: '', mrp_disc_2: '', mrp_disc_3: '', mrp_disc_4: '',
            rate_1: '', rate_2: '', rate_3: '', rate_3a: '', rate_4: '',
            last_purchase_cost: ''
        });
        setItemQty(item.quantity.toString());
        setItemRate(item.rate.toString());
        setItemDiscount(item.selected_discount.toString());
        setSelectedSchemeName(item.selected_scheme);
        setItemGst(item.gst.toString());
        setItemUnit(item.unit);
        setItemLivestockType((item.livestock_type as any) || 'Shop');
        setShowItemPopup(true);
        try {
            handleFetchLiveStock(item.stock_item_id);
            const fullItem = await getItemByBarcode(item.barcode);
            if (fullItem) setFoundItem(fullItem);
        } catch (error) {
            console.error("Failed to fetch full item details for edit", error);
        }
    };

    const handleBarcodeSearch = async (e: React.KeyboardEvent<HTMLInputElement> | React.MouseEvent) => {
        if ((e as React.KeyboardEvent).key === 'Enter' || (e as React.MouseEvent).type === 'click') {
            try {
                const item = await getItemByBarcode(barcodeQuery);
                if (item) {
                    setFoundItem(item);
                    setItemUnit(item.base_units || 'Nos');
                    setItemGst(item.gst || '0');
                    const mrp = item.default_mrp ? item.default_mrp.split('/')[0] : '0';
                    setItemRate(mrp);
                    setSelectedSchemeName('MRP');
                } else {
                    showToast("Item not found", 'error');
                    setFoundItem(null);
                }
            } catch (error) {
                console.error('Error searching barcode', error);
                showToast('Error searching barcode', 'error');
            }
        }
    };

    const handleRateChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        setItemRate(e.target.value);
        setSelectedSchemeName('Custom');
    };

    const setPresetRate = (rate: string, label: string) => {
        setItemRate(rate);
        setSelectedSchemeName(label);
    };

    const getMinRate = () => {
        if (!foundItem || !foundItem.last_purchase_cost) return 0;
        const minRateStr = foundItem.last_purchase_cost.split('/')[0];
        const minRate = parseFloat(minRateStr);
        return isNaN(minRate) ? 0 : minRate;
    };

    const addItemToOrder = () => {
        if (!foundItem || !itemRate || !itemQty) { showToast('Please fill all item details.', 'warning'); return; }
        const qty = parseFloat(itemQty);
        let rate = parseFloat(itemRate);
        const discount = parseFloat(itemDiscount) || 0;
        const minRate = getMinRate();
        if (minRate > 0 && rate <= minRate) return;
        const baseAmount = rate * qty;
        const discountAmount = (baseAmount * discount) / 100;
        const amount = parseFloat((baseAmount - discountAmount).toFixed(2));
        const newItem: OrderItem = {
            stock_item_id: foundItem.masterid,
            name: foundItem.name,
            barcode: foundItem.ats_barcode,
            rate: rate,
            unit: itemUnit,
            quantity: qty,
            amount: amount,
            gst: parseFloat(itemGst) || 0,
            selected_scheme: selectedSchemeName,
            selected_discount: discount,
            livestock_type: itemLivestockType,
            parent: foundItem.parent,
            group: foundItem.group
        };
        if (editingIndex !== null) {
            const newItems = [...items];
            newItems[editingIndex] = newItem;
            setItems(newItems);
        } else {
            setItems([...items, newItem]);
        }
        resetPopup();
    };

    const resetPopup = () => {
        setShowItemPopup(false);
        setBarcodeQuery('');
        setFoundItem(null);
        setItemQty('1');
        setItemRate('');
        setItemDiscount('0');
        setItemLivestockType('');
        setSelectedSchemeName('');
        setEditingIndex(null);
        setShowRateDropdown(false);
    };

    const handleSaveOrder = async (shareToTally = false, shouldNavigate = true) => {
        if (!selectedLedger || items.length === 0) {
            showToast('Please select a customer and add at least one item.', 'warning');
            return;
        }
        if (isSaving) return;
        setIsSaving(true);
        const totalAmount = calculateTotalWithTax();
        try {
            const orderData = {
                ledger_id: selectedLedger,
                date: orderDate,
                total_amount: totalAmount,
                items: items,
                order_type: orderType,
                remark: remark,
                amount_given: amountGiven ? parseFloat(amountGiven) : null
            };
            let savedOrderId;
            if (isEditMode && id) {
                await updateOrder(parseInt(id), orderData);
                savedOrderId = id;
                showToast('Order updated successfully!', 'success');
            } else {
                const newOrder = await createOrder(orderData);
                savedOrderId = newOrder.id;
                if (!isEditMode) showToast('Order created successfully!', 'success');
            }
            if (shareToTally && savedOrderId) {
                try {
                    await syncOrderToTally(parseInt(savedOrderId.toString()));
                    showToast('Order saved and synced to Tally!', 'success');
                    setIsLocked(true);
                } catch (e) {
                    console.error("Sync failed", e);
                    showToast("Order saved but failed to mark for Tally sync.", 'warning');
                }
            }
            if (shouldNavigate) navigate('/orders');
        } catch (error) {
            console.error('Failed to save order', error);
            showToast('Failed to save order. Please try again.', 'error');
        } finally {
            setIsSaving(false);
        }
    };

    const calculateItemTotalWithTax = (item: OrderItem) => item.amount;
    const calculateTotalWithTax = () => items.reduce((sum, item) => sum + calculateItemTotalWithTax(item), 0);
    const calculateCurrentItemTotal = () => {
        const qty = parseFloat(itemQty || '0');
        const rate = parseFloat(itemRate || '0');
        const discount = parseFloat(itemDiscount || '0');
        const base = qty * rate;
        const discAmount = (base * discount) / 100;
        return parseFloat((base - discAmount).toFixed(2));
    };

    return (
        <div className="flex flex-col h-full min-h-screen bg-slate-50 relative pb-20">
            {/* Header */}
            <div className="bg-white border-b border-slate-200 px-3 py-2 sticky top-0 z-40 shadow-sm flex justify-between items-center">
                <div className="flex items-center gap-3">
                    <button onClick={() => navigate(-1)} className="p-1 rounded hover:bg-slate-100">
                        <ChevronLeft size={24} className="text-slate-600" />
                    </button>
                    <img src="/ppw-logo.png" alt="Logo" className="w-8 h-8 object-contain" />
                    <h1 className="text-xl font-bold text-slate-800">New Order</h1>
                    <div className="relative">
                        <button 
                            onClick={() => setShowDraftDropdown(!showDraftDropdown)}
                            disabled={draftOrders.length === 0}
                            className={`flex items-center gap-1.5 px-2 sm:px-3 py-1.5 text-xs font-bold rounded-lg border transition-colors ${draftOrders.length > 0 ? 'bg-indigo-50 text-indigo-700 hover:bg-indigo-100 border-indigo-100' : 'bg-slate-50 text-slate-400 border-slate-100 cursor-not-allowed'}`}
                        >
                            <span>Drafts ({draftOrders.length})</span>
                            <ChevronDown size={14} />
                        </button>
                        {showDraftDropdown && draftOrders.length > 0 && (
                            <>
                                <div className="fixed inset-0 z-[60]" onClick={() => setShowDraftDropdown(false)}></div>
                                <div className="fixed inset-x-4 top-16 sm:absolute sm:inset-auto sm:top-full sm:right-0 mt-3 sm:w-80 bg-white rounded-2xl shadow-2xl border border-slate-200 py-2 z-[100] max-h-[60vh] overflow-y-auto ring-1 ring-slate-200">
                                    <div className="px-4 py-2 border-b border-slate-100 text-[10px] font-bold text-slate-400 uppercase tracking-widest bg-slate-50/50">Your Draft Orders</div>
                                    <div className="p-1">
                                        {draftOrders.map(draft => (
                                            <button key={draft.id} onClick={() => handleSwitchOrder(draft.id)} className="w-full text-left px-3 py-3 hover:bg-slate-50 rounded-xl flex flex-col gap-1">
                                                <div className="flex justify-between items-center"><span className="font-bold text-slate-800 text-sm uppercase">{draft.ledger?.name || 'New Customer'}</span><span className="text-[10px] font-bold text-slate-400 bg-slate-100 px-2 py-0.5 rounded-full">#{draft.id}</span></div>
                                                <div className="flex justify-between items-center text-xs text-slate-500 font-medium"><span>{draft.date}</span><span className="font-bold text-slate-900 border-l border-slate-200 pl-2">₹{parseFloat(draft.total_amount || '0').toLocaleString()}</span></div>
                                            </button>
                                        ))}
                                    </div>
                                </div>
                            </>
                        )}
                    </div>
                </div>
                <div className="text-xs font-medium text-slate-500 bg-slate-100 px-2 py-1 rounded">{items.length} Items</div>
            </div>

            {/* Customer Info Modal */}
            {showCustomerInfo && selectedLedgerDetails && (
                <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-sm">
                    <div className="bg-white rounded-3xl w-full max-w-sm shadow-2xl overflow-hidden ring-1 ring-slate-200">
                        <div className="bg-indigo-600 px-6 py-6 text-white relative">
                            <button onClick={() => setShowCustomerInfo(false)} className="absolute top-4 right-4 p-2 bg-white/10 hover:bg-white/20 rounded-full"><X size={20} /></button>
                            <div className="w-16 h-16 bg-white/20 rounded-2xl flex items-center justify-center mb-4"><Users size={32} /></div>
                            <h2 className="text-2xl font-black">{selectedLedgerDetails.name}</h2>
                            <p className="text-indigo-100 text-sm font-medium opacity-80">{selectedLedgerDetails.person_name || 'Customer'}</p>
                        </div>
                        <div className="p-6 space-y-6">
                            <div className="grid grid-cols-1 gap-5">
                                <div className="flex gap-4"><div className="w-10 h-10 bg-slate-50 rounded-xl flex items-center justify-center border border-slate-100"><MessageSquare size={18} className="text-slate-400" /></div><div className="flex-1"><p className="text-[10px] font-bold text-slate-400 uppercase tracking-wider mb-1">Mobile Number</p><p className="text-slate-800 font-bold">{selectedLedgerDetails.phone_number || 'Not available'}</p></div></div>
                                {selectedLedgerDetails.gstin && <div className="flex gap-4"><div className="w-10 h-10 bg-slate-50 rounded-xl flex items-center justify-center border border-slate-100"><FileText size={18} className="text-slate-400" /></div><div className="flex-1"><p className="text-[10px] font-bold text-slate-400 uppercase tracking-wider mb-1">GSTIN</p><p className="text-slate-800 font-bold">{selectedLedgerDetails.gstin}</p></div></div>}
                                {selectedLedgerDetails.address && <div className="flex gap-4"><div className="w-10 h-10 bg-slate-50 rounded-xl flex items-center justify-center border border-slate-100"><MapPin size={18} className="text-slate-400" /></div><div className="flex-1"><p className="text-[10px] font-bold text-slate-400 uppercase tracking-wider mb-1">Address</p><p className="text-slate-800 font-bold">{selectedLedgerDetails.address}</p></div></div>}
                            </div>
                        </div>
                    </div>
                </div>
            )}

            <div className="p-2 space-y-2.5 max-w-2xl mx-auto">
                {/* Customer Selection Card */}
                <div className="bg-white rounded-lg border border-slate-200 p-2.5 shadow-sm space-y-2 relative z-50">
                    {selectedLedger ? (
                        <div className="flex justify-between items-center bg-indigo-50/50 border border-indigo-100 rounded-lg p-2.5">
                            <div className="flex items-center gap-3 flex-1 min-w-0">
                                <div className="w-8 h-8 rounded-lg bg-white border border-indigo-100 flex items-center justify-center text-indigo-600 font-bold shrink-0 shadow-sm">{selectedLedgerDetails?.name?.[0] || 'C'}</div>
                                <div className="truncate flex items-center gap-2"><h3 className="font-bold text-slate-800 text-sm truncate uppercase">{selectedLedgerDetails?.name}</h3><button onClick={() => setShowCustomerInfo(true)} className="p-1.5 hover:bg-white rounded-full transition-all text-indigo-500 shadow-sm"><Info size={14} /></button></div>
                            </div>
                            <button onClick={() => { setSelectedLedger(''); setLedgerSearch(''); setSelectedLedgerDetails(null); }} disabled={isLocked} className={`text-[10px] font-black underline px-2 py-1 uppercase tracking-tight ${isLocked ? 'text-slate-300 pointer-events-none' : 'text-indigo-600 hover:no-underline'}`}>Change</button>
                        </div>
                    ) : (
                        <div className="flex gap-2 items-end">
                            <div className="relative flex-1"><label className="text-[9px] font-black text-slate-400 uppercase tracking-widest block mb-0.5">Customer</label><div className="relative"><Search className="absolute left-3 top-2 text-slate-400" size={14} /><input ref={ledgerInputRef} type="text" disabled={isLocked} className="w-full pl-9 pr-3 py-1.5 bg-slate-50 border border-slate-200 rounded-lg text-sm font-bold outline-none" placeholder="Search customer..." value={ledgerSearch} onChange={(e) => { setLedgerSearch(e.target.value); if (e.target.value.length < 3) setSelectedLedger(''); }} />{usingDropdown(ledgerLoading, showLedgerDropdown, ledgers, handleSelectLedger)}</div></div>
                            <button onClick={() => setShowCreateLedger(true)} disabled={isLocked} className="bg-slate-100 hover:bg-slate-200 text-slate-700 p-2 rounded-lg border border-slate-200"><UserPlus size={18} /></button>
                        </div>
                    )}
                    <div className="grid grid-cols-2 gap-2">
                        <div><label className="text-[9px] font-black text-slate-400 uppercase tracking-widest block mb-0.5">Date</label><div className="w-full px-2.5 py-1.5 bg-slate-100 border border-slate-200 rounded-lg text-xs font-bold text-slate-600 uppercase">{orderDate}</div></div>
                        <div><label className="text-[9px] font-black text-slate-400 uppercase tracking-widest block mb-0.5">Order Type</label><select className="w-full px-2.5 py-1.5 bg-white border border-slate-200 rounded-lg text-xs font-bold text-indigo-700 outline-none" value={orderType} disabled={isLocked} onChange={(e) => setOrderType(e.target.value)}><option value="Tax Invoice">Tax Invoice</option><option value="Quotation">Quotation</option></select></div>
                    </div>
                </div>

                {/* Parent & Group Selection */}
                <div className="bg-white rounded-lg border border-slate-200 p-2.5 shadow-sm space-y-2 relative z-40">
                    <div className="flex items-center justify-between px-1"><label className="text-[9px] font-black text-slate-400 uppercase tracking-widest">STEP 1: SELECT PARENT & GROUP</label>{(selectedParent || selectedGroup) && !isLocked && <button onClick={() => { setSelectedParent(null); setSelectedGroup(null); setParentSearch(''); setGroupSearch(''); }} className="text-[10px] font-bold text-red-500 uppercase hover:underline">Clear All</button>}</div>
                    <div className="grid grid-cols-2 gap-2">
                        <div className="relative">
                            {selectedParent ? (
                                <div className="flex items-center justify-between w-full pl-2.5 pr-1 py-1 bg-indigo-50 border border-indigo-200 rounded-lg text-[9px] font-bold text-indigo-700 uppercase h-[32px]"><span className="truncate">{selectedParent}</span>{!isLocked && <button onClick={() => { setSelectedParent(null); setParentSearch(''); }} className="p-1 hover:bg-indigo-100 rounded-lg transition-colors"><X size={14} /></button>}</div>
                            ) : (
                                <><div className="relative"><Search className="absolute left-2.5 top-1/2 -translate-y-1/2 text-slate-400" size={12} /><input type="text" placeholder="Search Parent..." value={parentSearch} disabled={isLocked} onChange={(e) => setParentSearch(e.target.value)} className="w-full pl-8 pr-2 py-1.5 bg-slate-50 border border-slate-200 rounded-lg text-[9px] font-bold uppercase h-[32px]" /></div>{parentSearch.length > 0 && <div className="absolute z-50 left-0 right-0 top-full mt-1 max-h-48 overflow-y-auto border border-slate-200 rounded-xl bg-white shadow-xl p-1 space-y-1 uppercase">{parents.filter(p => p.toLowerCase().includes(parentSearch.toLowerCase())).map(p => <button key={p} onClick={() => { setSelectedParent(p); setParentSearch(''); setSelectedGroup(null); }} className="w-full text-left px-3 py-2 rounded-lg text-[10px] font-bold hover:bg-indigo-50 hover:text-indigo-700">{p}</button>)}</div>}</>
                            )}
                        </div>
                        <div className="relative">
                            {selectedGroup ? (
                                <div className="flex items-center justify-between w-full pl-2.5 pr-1 py-1 bg-indigo-50 border border-indigo-200 rounded-lg text-[9px] font-bold text-indigo-700 uppercase h-[32px]"><span className="truncate">{selectedGroup}</span>{!isLocked && <button onClick={() => { setSelectedGroup(null); setGroupSearch(''); }} className="p-1 hover:bg-indigo-100 rounded-lg transition-colors"><X size={14} /></button>}</div>
                            ) : (
                                <><div className="relative"><Search className="absolute left-2.5 top-1/2 -translate-y-1/2 text-slate-400" size={12} /><input type="text" placeholder="Search Group..." value={groupSearch} disabled={isLocked} onChange={(e) => setGroupSearch(e.target.value)} className="w-full pl-8 pr-2 py-1.5 bg-slate-50 border border-slate-200 rounded-lg text-[9px] font-bold uppercase h-[32px]" /></div>{groupSearch.length > 0 && <div className="absolute z-50 left-0 right-0 top-full mt-1 max-h-48 overflow-y-auto border border-slate-200 rounded-xl bg-white shadow-xl p-1 space-y-1 uppercase">{groups.filter(g => g.toLowerCase().includes(groupSearch.toLowerCase())).map(grp => <button key={grp} onClick={() => { setSelectedGroup(grp); setGroupSearch(''); }} className="w-full text-left px-3 py-2 rounded-lg text-[10px] font-bold hover:bg-indigo-50 hover:text-indigo-700">{grp}</button>)}</div>}</>
                            )}
                        </div>
                    </div>
                </div>

                {/* Item Selection */}
                <div className="bg-white rounded-lg border border-slate-200 p-2.5 shadow-sm space-y-2 relative z-30">
                    <label className="text-[9px] font-black text-slate-400 uppercase tracking-widest px-1">STEP 2: SELECT ITEM</label>
                    <div className="relative">
                        <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400" size={16} />
                        <input type="text" placeholder={isLocked ? "Order locked..." : "Type name or scan barcode..."} disabled={isLocked} className="w-full pl-11 pr-4 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-sm font-black outline-none uppercase disabled:opacity-50" value={itemSearch} onChange={(e) => setItemSearch(e.target.value)} />
                    </div>
                    {itemSearchLoading && (
                        <div className="mt-2 text-[10px] font-bold text-indigo-600 uppercase text-center animate-pulse">Searching...</div>
                    )}
                    {(selectedParent || selectedGroup || itemSearch.length >= 3) && (
                        <div className="mt-2 border border-slate-100 rounded-2xl bg-slate-50/30 max-h-[400px] overflow-y-auto divide-y divide-slate-100">
                            {itemSearchResults.length === 0 ? (
                                <div className="p-4 text-center text-[10px] font-bold text-slate-400 uppercase">No matching items found</div>
                            ) : (
                                itemSearchResults.map(item => (
                                    <button 
                                        key={item.masterid} 
                                        onClick={() => handleSelectItem(item)} 
                                        className="w-full text-left px-3 py-1.5 hover:bg-white flex justify-between items-center group active:scale-[0.99]"
                                    >
                                        <div className="flex-1 pr-3">
                                            <div className="flex items-center gap-1.5 flex-wrap">
                                                <h4 className="font-black text-slate-800 text-[11px] group-hover:text-indigo-600 uppercase transition-colors">{item.name}</h4>
                                                {item.parent && <span className="text-[7px] font-black text-slate-400 border border-slate-200 px-1 rounded uppercase bg-white">{item.parent}</span>}
                                                {item.group && <span className="text-[7px] font-black text-indigo-400 border border-indigo-100 px-1 rounded uppercase bg-indigo-50/50">{item.group}</span>}
                                            </div>
                                            <div className="flex items-center gap-2 mt-0.5">
                                                <span className="text-[9px] font-bold text-slate-400 uppercase">MRP: ₹{item.default_mrp}</span>
                                                <span className="text-[9px] font-bold text-indigo-500 uppercase bg-indigo-50 px-1 py-0.5 rounded">
                                                    Bal: {item.closing_balance} {item.base_units}
                                                </span>
                                            </div>
                                        </div>
                                        <ArrowRight size={14} className="text-slate-200 group-hover:text-indigo-400 transition-all" />
                                    </button>
                                ))
                            )}
                        </div>
                    )}
                </div>

                {/* Current Bill Contents */}
                {items.length > 0 && (
                    <div className="space-y-1.5 pb-2 border-t border-dashed border-slate-200 pt-3">
                        <label className="text-[9px] font-black text-slate-400 uppercase tracking-widest px-1">Current Bill Contents</label>
                        {items.map((item, idx) => (
                            <div key={idx} className="bg-white p-1.5 rounded-lg border border-slate-200 flex items-center gap-2 shadow-sm">
                                <div className="flex flex-col items-center justify-center bg-slate-50 border border-slate-100 rounded min-w-[20px] h-[38px] shrink-0"><span className="text-[9px] font-black text-slate-400">{idx + 1}</span></div>
                                <div className="flex-1 min-w-0 flex flex-col justify-center">
                                    <div className="flex items-center gap-1.5 mb-1 flex-wrap">
                                        <h4 className="font-bold text-slate-800 text-[10px] uppercase break-words">{item.name}</h4>
                                        {item.livestock_type && <span className="text-[7px] font-black text-emerald-500 bg-emerald-50 border border-emerald-100 px-1 rounded uppercase tracking-tighter shrink-0">{item.livestock_type}</span>}
                                        {item.parent && <span className="text-[7px] font-black text-slate-400 bg-white border border-slate-200 px-1 rounded uppercase tracking-tighter shrink-0">{item.parent}</span>}
                                        {item.group && <span className="text-[7px] font-black text-indigo-400 bg-indigo-50 border border-indigo-100 px-1 rounded uppercase tracking-tighter shrink-0">{item.group}</span>}
                                    </div>
                                    <div className="flex items-center gap-3 text-[9px] font-bold">
                                        <div className="flex flex-col">
                                            <span className="text-slate-400 uppercase text-[6px] mb-0.5 tracking-widest">Rate</span>
                                            <span className="text-slate-700 leading-none font-black text-[10px]">₹{Math.round(item.rate).toLocaleString('en-IN')}</span>
                                        </div>
                                        <div className="flex flex-col border-l border-slate-100 pl-2">
                                            <span className="text-slate-400 uppercase text-[6px] mb-0.5 tracking-widest">Qty</span>
                                            <div className="flex items-baseline gap-0.5">
                                                <span className="text-slate-700 leading-none">{item.quantity}</span>
                                                <span className="text-[7px] text-slate-400 uppercase">{item.unit}</span>
                                            </div>
                                        </div>
                                        <div className="flex flex-col border-l border-slate-100 pl-2">
                                            <span className="text-slate-400 uppercase text-[6px] mb-0.5 tracking-widest">Disc</span>
                                            <span className={`leading-none ${item.selected_discount > 0 ? 'text-emerald-600' : 'text-slate-300'}`}>
                                                {item.selected_discount > 0 ? `-${item.selected_discount}%` : '0%'}
                                            </span>
                                        </div>
                                    </div>
                                </div>
                                <div className="flex flex-col items-end justify-between self-stretch py-0.5 pl-2 border-l border-slate-100 min-w-[75px]">
                                    <div className="font-black text-slate-900 text-[11px] leading-none">₹{Math.round(item.amount).toLocaleString('en-IN')}</div>
                                    {!isLocked && (
                                        <div className="flex gap-1 mt-1">
                                            <button onClick={() => handleEditItem(idx)} className="p-1 bg-slate-50 text-slate-400 hover:text-indigo-600 rounded transition-colors border border-slate-100"><svg xmlns="http://www.w3.org/2000/svg" width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round"><path d="M17 3a2.828 2.828 0 1 1 4 4L7.5 20.5 2 22l1.5-5.5L17 3z"></path></svg></button>
                                            <button onClick={() => { if (window.confirm(`Remove "${item.name}"?`)) setItems(items.filter((_, i) => i !== idx)) }} className="p-1 bg-slate-50 text-slate-400 hover:text-red-500 rounded transition-colors border border-slate-100"><X size={12} strokeWidth={3} /></button>
                                        </div>
                                    )}
                                </div>
                            </div>
                        ))}
                    </div>
                )}
                <div className="h-24"></div>
            </div>

            {/* Floating Remarks Button */}
            <button
                onClick={() => { setTempRemark(remark); setShowRemarkModal(true); }}
                className={`fixed bottom-24 right-4 z-40 p-4 rounded-full shadow-2xl transition-all active:scale-90 flex items-center justify-center ${remark ? 'bg-indigo-600 text-white ring-4 ring-indigo-100' : 'bg-white text-slate-400 border border-slate-200'}`}
            >
                <MessageSquare size={24} className={remark ? 'animate-pulse' : ''} />
            </button>

            {/* Footer */}
            <div className="fixed bottom-0 left-0 right-0 bg-white/80 backdrop-blur-lg border-t border-slate-200 py-3 px-4 shadow-[0_-5px_20px_rgba(0,0,0,0.05)] z-[70]">
                <div className="flex items-center gap-3">
                    <button onClick={() => setShowCashCalc(true)} className="flex-none pr-4 border-r border-slate-200 text-left active:scale-95 transition-transform"><span className="text-[10px] font-extrabold text-slate-400 uppercase tracking-tighter block -mb-1">Total Amount</span><div className="text-2xl font-black text-slate-800 tracking-tight">₹{Math.round(calculateTotalWithTax()).toLocaleString('en-IN')}</div></button>
                    <div className="flex-1 flex gap-2">
                        <button onClick={() => { if (items.length > 0 && !confirm('Discard changes?')) return; navigate(-1); }} className="flex-1 py-3 text-slate-500 font-bold bg-slate-100/50 rounded-xl active:scale-95 text-xs uppercase">{isLocked ? 'Back' : 'Cancel'}</button>
                        {!isLocked && (
                            <>
                                <button onClick={() => handleSaveOrder(true)} disabled={items.length === 0 || !selectedLedger || isSaving} className="flex-[1.2] py-3 bg-indigo-50 text-indigo-700 font-bold rounded-xl active:scale-95 border border-indigo-100 flex items-center justify-center gap-1.5 text-xs disabled:opacity-50 uppercase"><ArrowRight size={16} /> Tally</button>
                                <button onClick={() => handleSaveOrder(false)} disabled={items.length === 0 || !selectedLedger || isSaving} className="flex-[1.5] py-3 bg-indigo-600 text-white font-bold rounded-xl active:scale-95 shadow-lg text-xs disabled:opacity-50 flex items-center justify-center gap-1.5 uppercase"><Save size={16} /> {isEditMode ? 'Update' : 'Save'}</button>
                            </>
                        )}
                        {isLocked && <div className="flex-[2.7] flex items-center justify-center bg-emerald-50 text-emerald-700 font-black rounded-xl border border-emerald-100 text-[10px] uppercase tracking-widest shadow-inner"><div className="flex items-center gap-2"><div className="w-2 h-2 bg-emerald-500 rounded-full animate-pulse"></div>Synced to Tally (Read-Only)</div></div>}
                    </div>
                </div>
            </div>

            {/* Item Popup / Bottom Sheet */}
            {showItemPopup && (
                <div className="fixed inset-0 z-[100] flex items-end justify-center sm:items-center p-0 sm:p-4 bg-slate-900/60 backdrop-blur-sm">
                    <div className="bg-white rounded-t-[2.5rem] sm:rounded-3xl w-full max-w-lg shadow-2xl overflow-hidden animate-in slide-in-from-bottom-10 h-[90vh] overflow-y-auto">
                        <div className="px-6 py-4 flex justify-between items-center border-b border-slate-50"><div><h3 className="text-lg font-black text-slate-800 uppercase tracking-tight">Add Item</h3><p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">Rate & Quantity</p></div><button onClick={resetPopup} className="p-2 hover:bg-slate-100 rounded-full transition-all text-slate-400"><X size={24} /></button></div>
                        <div className="p-6 pt-4 space-y-6">
                            {!foundItem ? (
                                <div className="relative"><Scan className="absolute left-3 top-3.5 text-indigo-500" size={20} /><input type="text" className="w-full pl-10 pr-12 py-3 bg-slate-50 border border-slate-200 rounded-lg font-bold outline-none" placeholder="Scan Barcode..." value={barcodeQuery} onChange={(e) => setBarcodeQuery(e.target.value)} onKeyDown={handleBarcodeSearch} autoFocus /><button onClick={handleBarcodeSearch} className="absolute right-2 top-2 bottom-2 bg-indigo-100 text-indigo-600 rounded-lg px-3"><ArrowRight size={20} /></button></div>
                            ) : (
                                <div className="space-y-4">
                                    <div className="bg-indigo-50 p-3 rounded-lg border border-indigo-100 text-sm font-bold uppercase text-slate-800">{foundItem.name}</div>
                                    <div className="flex justify-between items-center py-2 px-1">
                                        <div className="flex w-full gap-3">
                                            <button onClick={() => setItemLivestockType('Shop')} className={`flex-1 py-3 rounded-xl font-bold transition-all border flex justify-between px-4 items-center ${itemLivestockType === 'Shop' ? 'bg-indigo-600 text-white' : 'bg-white text-slate-600'}`}>
                                                <span>Shop</span>
                                                <span className="text-xs">{isFetchingLiveStock ? '...' : shopStock} {stockUnit}</span>
                                            </button>
                                            <button onClick={() => setItemLivestockType('Pb')} className={`flex-1 py-3 rounded-xl font-bold transition-all border flex justify-between px-4 items-center ${itemLivestockType === 'Pb' ? 'bg-indigo-600 text-white' : 'bg-white text-slate-600'}`}>
                                                <span>PB</span>
                                                <span className="text-xs">{isFetchingLiveStock ? '...' : pbStock} {stockUnit}</span>
                                            </button>
                                        </div>
                                    </div>
                                    <div className="grid grid-cols-2 gap-3">
                                        <div><label className="text-[10px] uppercase font-black text-slate-400">Quantity</label><input type="number" className="w-full px-2 py-2 bg-slate-50 border border-slate-200 rounded-lg font-bold text-lg outline-none" value={itemQty} onChange={(e) => setItemQty(e.target.value)} /></div>
                                        <div><label className="text-[10px] uppercase font-black text-slate-400">Rate (₹)</label><div className="relative"><input type="number" className="w-full px-2 py-2 bg-slate-50 border border-slate-200 rounded-lg font-bold text-lg outline-none" value={itemRate} onChange={handleRateChange} /><button onClick={() => setShowRateDropdown(!showRateDropdown)} className="absolute right-1 top-1 bottom-1 px-2 text-[10px] font-bold text-indigo-600 underline">Rates</button>{showRateDropdown && <div className="absolute right-0 top-full mt-1 bg-white border border-slate-200 shadow-xl rounded-lg z-20 w-48 p-1 uppercase">{['MRP', 'Rate 1', 'Rate 2', 'Rate 3', 'Rate 4'].map(label => { const r = (label === 'MRP' ? foundItem.default_mrp : (foundItem as any)[label.toLowerCase().replace(' ', '_')]); if (!r) return null; return <button key={label} onClick={() => { setPresetRate(r.split('/')[0], label); setShowRateDropdown(false); }} className="w-full text-left px-3 py-2 hover:bg-indigo-50 rounded text-xs font-bold flex justify-between"><span>{label}</span><span>₹{r}</span></button>; })}</div>}</div></div>
                                    </div>
                                    <div className="grid grid-cols-2 gap-3">
                                        <div><label className="text-[10px] uppercase font-black text-slate-400">Discount (%)</label><input type="number" className="w-full px-2 py-2 bg-slate-50 border border-slate-200 rounded-lg font-bold text-lg outline-none" value={itemDiscount} onChange={(e) => setItemDiscount(e.target.value)} /></div>
                                        <div><label className="text-[10px] uppercase font-black text-slate-400">Total</label><div className="w-full px-2 py-2 bg-indigo-50 rounded-lg font-bold text-xl text-indigo-700 flex items-center justify-center">₹{calculateCurrentItemTotal().toFixed(2)}</div></div>
                                    </div>
                                    <button onClick={addItemToOrder} disabled={!itemQty || !itemRate} className="mt-4 w-full bg-indigo-600 text-white py-3.5 rounded-xl font-bold uppercase active:scale-95 disabled:opacity-50">Confirm Add Item</button>
                                </div>
                            )}
                        </div>
                    </div>
                </div>
            )}

            {/* Create Ledger Modal */}
            {showCreateLedger && (
                <div className="fixed inset-0 z-[100] flex items-center justify-center bg-black/50 backdrop-blur-sm px-4">
                    <div className="bg-white rounded-2xl shadow-2xl p-6 w-full max-w-sm max-h-[90vh] overflow-y-auto">
                        <h3 className="text-xl font-black text-slate-800 mb-6 uppercase tracking-tight">New Customer</h3>
                        <div className="space-y-4">
                            <div><label className="text-[10px] font-black text-slate-400 uppercase tracking-widest block mb-1">Customer Name *</label><input type="text" className="w-full px-3 py-2.5 bg-slate-50 border border-slate-200 rounded-lg font-bold text-sm outline-none uppercase" value={newLedgerName} onChange={(e) => setNewLedgerName(e.target.value)} /></div>
                            <div><label className="text-[10px] font-black text-slate-400 uppercase tracking-widest block mb-1">Address *</label><textarea className="w-full px-3 py-2.5 bg-slate-50 border border-slate-200 rounded-lg font-bold text-sm outline-none resize-none h-20 uppercase" value={newLedgerAddress} onChange={(e) => setNewLedgerAddress(e.target.value)} /></div>
                            <div className="flex gap-3 mt-4"><button onClick={() => setShowCreateLedger(false)} className="flex-1 py-3 text-slate-600 font-bold bg-slate-100 rounded-xl hover:bg-slate-200 uppercase text-xs">Cancel</button><button onClick={handleCreateLedger} disabled={creatingLedger} className="flex-1 py-3 text-white font-bold bg-indigo-600 rounded-xl disabled:opacity-50 uppercase text-xs">Create</button></div>
                        </div>
                    </div>
                </div>
            )}

            {/* Remarks Modal */}
            {showRemarkModal && (
                <div className="fixed inset-0 z-[110] flex items-center justify-center bg-black/50 backdrop-blur-sm px-4">
                    <div className="bg-white rounded-2xl shadow-2xl w-full max-w-sm overflow-hidden ring-1 ring-slate-200 animate-in zoom-in-95">
                        <div className="px-5 py-4 border-b border-slate-100 flex justify-between items-center bg-slate-50/50">
                            <h3 className="font-bold text-slate-800 uppercase tracking-tight">Add Remark</h3>
                            <button onClick={() => setShowRemarkModal(false)} className="text-slate-400 hover:text-slate-600"><X size={20} /></button>
                        </div>
                        <div className="p-5">
                            <textarea className="w-full px-4 py-3 bg-slate-50 border border-slate-200 rounded-xl text-sm font-medium outline-none resize-none h-32 uppercase" value={tempRemark} onChange={(e) => setTempRemark(e.target.value)} autoFocus></textarea>
                            <div className="flex gap-3 mt-5">
                                <button onClick={() => setShowRemarkModal(false)} className="flex-1 py-3 text-slate-600 font-bold bg-slate-100 rounded-xl uppercase text-xs">Cancel</button>
                                <button onClick={() => { setRemark(tempRemark); setShowRemarkModal(false); showToast('Remark saved!', 'success'); }} className="flex-1 py-3 text-white font-bold bg-indigo-600 rounded-xl shadow-lg uppercase text-xs">Done</button>
                            </div>
                        </div>
                    </div>
                </div>
            )}

            {/* Cash Calculator Modal */}
            {showCashCalc && (
                <div className="fixed inset-0 z-[110] flex items-center justify-center bg-black/50 backdrop-blur-sm px-4 animate-in fade-in">
                    <div className="bg-white rounded-2xl shadow-2xl w-full max-w-sm overflow-hidden animate-in zoom-in-95">
                        <div className="px-5 py-4 border-b border-slate-100 flex justify-between items-center bg-slate-50/50">
                            <h3 className="font-bold text-slate-800 uppercase tracking-tight">Cash Calculator</h3>
                            <button onClick={() => setShowCashCalc(false)} className="text-slate-400 hover:text-slate-600"><X size={20} /></button>
                        </div>
                        <div className="p-5 space-y-5">
                            <div className="bg-indigo-50 border border-indigo-100 rounded-xl p-4 text-center">
                                <span className="text-[10px] font-black text-indigo-400 uppercase tracking-widest block mb-1">Bill Total</span>
                                <div className="text-3xl font-black text-indigo-700 tracking-tight">₹{Math.round(calculateTotalWithTax()).toLocaleString('en-IN')}</div>
                            </div>
                            <div>
                                <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest block mb-1.5">Amount Given</label>
                                <input type="number" className="w-full px-4 py-3.5 bg-slate-50 border border-slate-200 rounded-xl text-2xl font-black text-center outline-none" placeholder="0" value={amountGiven} onChange={(e) => setAmountGiven(e.target.value)} autoFocus />
                            </div>
                            {amountGiven && parseFloat(amountGiven) > 0 && (
                                <div className={`rounded-xl p-4 text-center border ${parseFloat(amountGiven) >= Math.round(calculateTotalWithTax()) ? 'bg-emerald-50 border-emerald-100' : 'bg-red-50 border-red-100'}`}>
                                    <span className={`text-[10px] font-black uppercase tracking-widest block mb-1 ${parseFloat(amountGiven) >= Math.round(calculateTotalWithTax()) ? 'text-emerald-400' : 'text-red-400'}`}>{parseFloat(amountGiven) >= Math.round(calculateTotalWithTax()) ? 'Return to Customer' : 'Amount Short'}</span>
                                    <div className={`text-3xl font-black tracking-tight ${parseFloat(amountGiven) >= Math.round(calculateTotalWithTax()) ? 'text-emerald-600' : 'text-red-600'}`}>₹{Math.abs(Math.round(parseFloat(amountGiven) - calculateTotalWithTax())).toLocaleString('en-IN')}</div>
                                </div>
                            )}
                            <button onClick={() => setShowCashCalc(false)} className="w-full py-3 text-white font-bold bg-indigo-600 rounded-xl shadow-lg uppercase text-xs active:scale-95 transition-transform">Done</button>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
}

function usingDropdown(loading: boolean, show: boolean, data: Ledger[], onSelect: (l: Ledger) => void) {
    if (!show) return null;
    if (!data || !Array.isArray(data)) return null;
    return (
        <div className="absolute top-full left-0 right-0 bg-white border border-slate-200 shadow-xl rounded-b-lg max-h-48 overflow-y-auto mt-1 divide-y divide-slate-100 z-50">
            {loading ? (
                <div className="p-3 text-center text-xs text-slate-500">Searching...</div>
            ) : data.length === 0 ? (
                <div className="p-3 text-center text-xs text-slate-500">No found</div>
            ) : (
                data.map(l => (
                    <div key={l.id} onMouseDown={(e) => { e.preventDefault(); onSelect(l); }} className="px-4 py-2.5 text-sm hover:bg-indigo-50 cursor-pointer text-slate-700">
                        <div className="font-bold">{l.name}</div>
                        {l.phone_number && <div className="text-xs text-slate-500">{l.phone_number}</div>}
                    </div>
                ))
            )}
        </div>
    );
}
