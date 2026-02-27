import React, { useState, useEffect, useRef } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { Save, Scan, X, ChevronLeft, Search, ArrowRight, UserPlus, ChevronDown, MessageSquare } from 'lucide-react';
import { getLedgers, getItemByBarcode, createOrder, getStockItems, createLedger, getOrderById, getOrderDetails, updateOrder, syncOrderToTally, getLiveStock, getDraftOrders, getStockParents } from '../api';
import { useToast } from '../context/ToastContext';
import { ConfirmModal } from '../components/ConfirmModal';

interface StockItem {
    id: number;
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
    last_purchase_cost?: string; // Added for validation
}

interface OrderItem {
    stock_item_id: number;
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
}

interface Ledger {
    id: number;
    name: string;
    phone_number?: string;
    gstin?: string; // Expanded interface
    address?: string;
}

export default function CreateOrder() {
    const navigate = useNavigate();
    const { id } = useParams<{ id: string }>();
    const isEditMode = !!id;
    const { showToast } = useToast();

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

    // Confirm Modal State
    const [confirmModal, setConfirmModal] = useState<{
        isOpen: boolean;
        title: string;
        message: string;
        onConfirm: () => void;
        isDangerous?: boolean;
        confirmText?: string;
        secondaryConfirmText?: string;
        onSecondaryConfirm?: () => void;
    }>({
        isOpen: false, title: '', message: '', onConfirm: () => {}, isDangerous: false
    });

    const [isSaving, setIsSaving] = useState(false); // Validating Issue 1: Prevent duplicate submission

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
    const [fetchingState, setFetchingState] = useState(false);
    
    // Remarks Popup State
    const [showRemarkModal, setShowRemarkModal] = useState(false);
    const [tempRemark, setTempRemark] = useState('');
    
    // Fetch Drafts on Mount
    useEffect(() => {
        const fetchDrafts = async () => {
            try {
                const res = await getDraftOrders();
                // Filter out current order if in edit mode
                const others = res.data.filter((d: any) => d.id !== (id ? parseInt(id) : -1));
                setDraftOrders(others);
            } catch (e) {
                console.error("Failed to fetch drafts", e);
            }
        };
        fetchDrafts();
    }, [id]);

    const handleSwitchOrder = (targetId: number) => {
        // ALWAYS close the dropdown immediately when an action is triggered
        setShowDraftDropdown(false);

        const switchAction = () => {
            navigate(`/orders/edit/${targetId}`);
        };

        const saveAndSwitch = async () => {
            // Save current order logic (without Tally sync), and DO NOT navigate to /orders
            await handleSaveOrder(false, false); 
            switchAction();
        };

        if (items.length > 0) {
            setConfirmModal({
                isOpen: true,
                title: 'Unsaved Changes',
                message: 'You have unsaved items in the current order. What would you like to do?',
                isDangerous: true,
                confirmText: 'Discard & Switch',
                onConfirm: switchAction,
                secondaryConfirmText: 'Save & Switch',
                onSecondaryConfirm: saveAndSwitch
            });
        } else {
            switchAction();
        }
    };

    // Indian States list
    const INDIAN_STATES = [
        'Andhra Pradesh', 'Arunachal Pradesh', 'Assam', 'Bihar', 'Chhattisgarh',
        'Goa', 'Gujarat', 'Haryana', 'Himachal Pradesh', 'Jharkhand', 'Karnataka',
        'Kerala', 'Madhya Pradesh', 'Maharashtra', 'Manipur', 'Meghalaya', 'Mizoram',
        'Nagaland', 'Odisha', 'Punjab', 'Rajasthan', 'Sikkim', 'Tamil Nadu',
        'Telangana', 'Tripura', 'Uttar Pradesh', 'Uttarakhand', 'West Bengal',
        'Andaman and Nicobar Islands', 'Chandigarh', 'Dadra and Nagar Haveli and Daman and Diu',
        'Delhi', 'Jammu and Kashmir', 'Ladakh', 'Lakshadweep', 'Puducherry'
    ];

    // Auto-fetch state from pincode
    const handlePincodeChange = async (pincode: string) => {
        setNewLedgerPincode(pincode);
        if (pincode.length === 6) {
            setFetchingState(true);
            try {
                const res = await fetch(`https://api.postalpincode.in/pincode/${pincode}`);
                const data = await res.json();
                if (data[0]?.Status === 'Success' && data[0]?.PostOffice?.length > 0) {
                    setNewLedgerState(data[0].PostOffice[0].State);
                }
            } catch (e) {
                console.error('Failed to fetch state from pincode', e);
            } finally {
                setFetchingState(false);
            }
        }
    };

    // Bill number removed (handled by backend/tally)
    // const [billNumber, setBillNumber] = useState('');
    const [orderDate] = useState(new Date().toISOString().split('T')[0]);
    const [showRateDropdown, setShowRateDropdown] = useState(false);
    const [items, setItems] = useState<OrderItem[]>([]);
    const [orderType, setOrderType] = useState('Tax Invoice');
    const [remark, setRemark] = useState('');
    const [editingIndex, setEditingIndex] = useState<number | null>(null);
    const ledgerInputRef = useRef<HTMLInputElement>(null);

    // Auto-focus ledger search on mount
    useEffect(() => {
        if (!isEditMode) {
            ledgerInputRef.current?.focus();
        }
    }, [isEditMode]);

    // Issue 4: Warn on unsaved changes
    useEffect(() => {
        const handleBeforeUnload = (e: BeforeUnloadEvent) => {
            if (items.length > 0) {
                e.preventDefault();
                e.returnValue = ''; // Browser requires this to show the native dialog
            }
        };
        window.addEventListener('beforeunload', handleBeforeUnload);
        return () => window.removeEventListener('beforeunload', handleBeforeUnload);
    }, [items]);

    // Edit Mode Load
    useEffect(() => {
        if (isEditMode && id) {
            const loadOrder = async () => {
                try {
                    const order = await getOrderById(parseInt(id));
                    if (order) {
                        // selectedLedger state logic
                        setSelectedLedger(order.ledger.id);
                        setLedgerSearch(order.ledger.name);
                        setOrderType(order.order_type || 'Tax Invoice');
                        setRemark(order.remark || '');
                        // Load full details for edit
                        setSelectedLedgerDetails(order.ledger); 

                        // Load items
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
                            livestock_type: d.livestock_type
                        }));
                        setItems(mappedItems);
                    }
                } catch (e) {
                    console.error("Failed to load order for edit", e);
                    showToast("Failed to load order", 'error'); // Replaced alert
                }
            };
            loadOrder();
        }
    }, [id, isEditMode]);

    // Item Search State
    const [itemSearch, setItemSearch] = useState('');
    const [itemSearchResults, setItemSearchResults] = useState<StockItem[]>([]);
    const [showItemDropdown, setShowItemDropdown] = useState(false);
    const [itemSearchLoading, setItemSearchLoading] = useState(false);

    // Parent Search State
    const [selectedParent, setSelectedParent] = useState<string | null>(null);
    const [parentSearch, setParentSearch] = useState('');
    const [parentSearchResults, setParentSearchResults] = useState<string[]>([]);
    const [showParentDropdown, setShowParentDropdown] = useState(false);
    const [parentSearchLoading, setParentSearchLoading] = useState(false);

    // Popup State
    const [showItemPopup, setShowItemPopup] = useState(false);
    const [barcodeQuery, setBarcodeQuery] = useState('');
    const [foundItem, setFoundItem] = useState<StockItem | null>(null);
    const [itemRate, setItemRate] = useState('');
    const [itemUnit, setItemUnit] = useState('');
    const [itemQty, setItemQty] = useState('');
    const [itemGst, setItemGst] = useState('');
    const [itemDiscount, setItemDiscount] = useState(''); // New Discount State
    const [selectedSchemeName, setSelectedSchemeName] = useState('Default');
    const [itemLivestockType, setItemLivestockType] = useState<'Shop' | 'Pb' | ''>('');
    const [shopStock, setShopStock] = useState('0.00');
    const [pbStock, setPbStock] = useState('0.00');
    const [isFetchingLiveStock, setIsFetchingLiveStock] = useState(false);
    const [stockUnit, setStockUnit] = useState('Pcs');

    const handleFetchLiveStock = async (stockItemId: number) => {
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
    // const [isSearching, setIsSearching] = useState(false);

    // Ledger Search Debounce
    useEffect(() => {
        const timer = setTimeout(() => {
            if (ledgerSearch.length >= 3) {
                searchLedgers(ledgerSearch);
            } else if (ledgerSearch.length === 0) {
                setLedgers([]); // Clear if empty
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
            handleSelectLedger(newLedger); // Select immediately
            setShowCreateLedger(false);
            // Reset form
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

    // Parent Search Debounce
    useEffect(() => {
        const timer = setTimeout(() => {
            if (parentSearch.length >= 2) {
                searchParents(parentSearch);
            } else if (parentSearch.length === 0) {
                setParentSearchResults([]);
                setShowParentDropdown(false);
            }
        }, 500);
        return () => clearTimeout(timer);
    }, [parentSearch]);

    const searchParents = async (query: string) => {
        setParentSearchLoading(true);
        try {
            const result = await getStockParents(query);
            setParentSearchResults(result);
            setShowParentDropdown(true);
        } catch (error) {
            console.error('Failed to search parents', error);
        } finally {
            setParentSearchLoading(false);
        }
    };

    const handleSelectParent = (parent: string) => {
        setSelectedParent(parent);
        setShowParentDropdown(false);
        setParentSearch('');
        // Focus item search after small delay
        setTimeout(() => {
            document.getElementById('item-search-input')?.focus();
        }, 100);
    };

    // Item Search Debounce
    useEffect(() => {
        const timer = setTimeout(() => {
            if (itemSearch.length >= 2) {
                searchItems(itemSearch);
            } else if (itemSearch.length === 0) {
                setItemSearchResults([]);
                setShowItemDropdown(false);
            }
        }, 500);
        return () => clearTimeout(timer);
    }, [itemSearch, selectedParent]);

    const searchItems = async (query: string) => {
        setItemSearchLoading(true);
        try {
            const result = await getStockItems(1, 20, query, selectedParent || '');
            setItemSearchResults(result.data);
            setShowItemDropdown(true);
        } catch (error) {
            console.error('Failed to search items', error);
        } finally {
            setItemSearchLoading(false);
        }
    };

    const handleSelectItem = (item: StockItem) => {
        setFoundItem(item);
        setItemUnit(item.base_units || 'Nos');
        setItemGst(item.gst || '0');
        // By default, rate should be empty until user selects or enters one
        setItemRate('');
        setSelectedSchemeName('');

        setShowItemDropdown(false);
        setItemSearch(''); // Clear search on selection
        setEditingIndex(null);
        setItemLivestockType('Shop');
        handleFetchLiveStock(item.id);
        setShowItemPopup(true);
    };

    const handleEditItem = async (idx: number) => {
        const item = items[idx];
        setEditingIndex(idx);
        
        // Initial populate with known data (rates will be missing initially)
        setFoundItem({
            id: item.stock_item_id,
            name: item.name,
            ats_barcode: item.barcode,
            base_units: item.unit,
            closing_balance: '',
            gst: item.gst.toString(),
            default_mrp: '', 
            rate_one_2: '',
            rate_one_3: '',
            rate_one_4: '',
            rate_one_5: '',
            mrp_disc_1: '',
            mrp_disc_2: '',
            mrp_disc_3: '',
            mrp_disc_4: '',
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

        // Fetch full details to populate rates
        try {
            // Fetch live stock
            handleFetchLiveStock(item.stock_item_id);

            // Fetch full item details for rates
            const fullItem = await getItemByBarcode(item.barcode);
            if (fullItem) {
                setFoundItem(fullItem);
                
                // Optional: Update GST/Unit from master if needed, but usually keep order data
                // setItemGst(fullItem.gst);
            }
        } catch (error) {
            console.error("Failed to fetch full item details for edit", error);
        }
    };
    const handleBarcodeSearch = async (e: React.KeyboardEvent<HTMLInputElement> | React.MouseEvent) => {
        // Allow both Enter key and Click
        if ((e as React.KeyboardEvent).key === 'Enter' || (e as React.MouseEvent).type === 'click') {
            // setIsSearching(true);
            try {
                const item = await getItemByBarcode(barcodeQuery);
                // setIsSearching(false);
                if (item) {
                    // ... same logic ...
                    setFoundItem(item);
                    setItemUnit(item.base_units || 'Nos');
                    setItemGst(item.gst || '0');
                    const mrp = item.default_mrp ? item.default_mrp.split('/')[0] : '0';
                    setItemRate(mrp);
                    setSelectedSchemeName('MRP');
                } else {
                    alert("Item not found");
                    setFoundItem(null);
                }
            } catch (error) {
                console.error('Error searching barcode', error);
                // setIsSearching(false);
                alert('Error searching barcode');
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



    // Unified handler for manual discount input - REMOVED


    const getMinRate = () => {
        if (!foundItem || !foundItem.last_purchase_cost) return 0;
        const minRateStr = foundItem.last_purchase_cost.split('/')[0];
        const minRate = parseFloat(minRateStr);
        return isNaN(minRate) ? 0 : minRate;
    };

    const addItemToOrder = () => {
        if (!foundItem || !itemRate || !itemQty) return;

        const qty = parseFloat(itemQty);
        let rate = parseFloat(itemRate);
        const discount = parseFloat(itemDiscount) || 0;

        // Validation pre-check (button should be disabled anyway but safety first)
        const minRate = getMinRate();
        if (minRate > 0 && rate <= minRate) return;

        // Rate is inclusive of tax.
        // Formula: (Rate * Qty) - (Rate * Qty * Discount / 100)
        const baseAmount = rate * qty;
        const discountAmount = (baseAmount * discount) / 100;
        const amount = Math.round(baseAmount - discountAmount);

        const newItem: OrderItem = {
            stock_item_id: foundItem.id,
            name: foundItem.name,
            barcode: foundItem.ats_barcode,
            rate: rate,
            unit: itemUnit,
            quantity: qty,
            amount: amount,
            gst: parseFloat(itemGst) || 0,
            selected_scheme: selectedSchemeName,
            selected_discount: discount, // Save the percentage
            livestock_type: itemLivestockType
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
        setItemRate('');
        setItemUnit('');
        setItemQty('');
        setItemGst('');
        setItemDiscount('');
        setSelectedSchemeName('Default');
        setItemLivestockType('');
        setEditingIndex(null);
        setShowRateDropdown(false); // Close rate dropdown on popup reset
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
                remark: remark
            };

            let savedOrderId;

            if (isEditMode && id) {
                await updateOrder(parseInt(id), orderData);
                savedOrderId = id;
                showToast('Order updated successfully!', 'success');
            } else {
                const newOrder = await createOrder(orderData);
                savedOrderId = newOrder.id; // Ensure createOrder returns the object
                if (!isEditMode) showToast('Order created successfully!', 'success');
            }

            if (shareToTally && savedOrderId) {
                // Trigger share logic
                try {
                    await syncOrderToTally(parseInt(savedOrderId.toString()));
                    showToast('Order saved and synced to Tally!', 'success');
                } catch (e) {
                    console.error("Sync failed", e);
                    showToast("Order saved but failed to mark for Tally sync.", 'warning');
                }
            }

            if (shouldNavigate) {
                navigate('/orders');
            }
        } catch (error) {
            console.error('Failed to save order', error);
            showToast('Failed to save order. Please try again.', 'error');
        } finally {
            setIsSaving(false);
        }
    };

    const calculateItemTotalWithTax = (item: OrderItem) => {
        // Rate is inclusive, so Amount is already the final total
        return Math.round(item.amount);
    };

    const calculateTotalWithTax = () => {
        return items.reduce((sum, item) => sum + calculateItemTotalWithTax(item), 0);
    };

    const calculateCurrentItemTotal = () => {
        const qty = parseFloat(itemQty || '0');
        const rate = parseFloat(itemRate || '0');
        const discount = parseFloat(itemDiscount || '0');

        const base = qty * rate;
        const discAmount = (base * discount) / 100;
        return Math.round(base - discAmount);
    };

    return (
        <div className="flex flex-col h-full min-h-screen bg-slate-50 relative pb-20">
            {/* Header - Simple & Dense */}
            <div className="bg-white border-b border-slate-200 px-4 py-3 flex items-center justify-between sticky top-0 z-30 shadow-sm">
                <div className="flex items-center gap-3">
                    <button onClick={() => navigate(-1)} className="p-1 rounded hover:bg-slate-100">
                        <ChevronLeft size={24} className="text-slate-600" />
                    </button>
                    <img src="/ppw-logo.png" alt="Logo" className="w-8 h-8 object-contain" />
                    <h1 className="text-xl font-bold text-slate-800">New Order</h1>
                    
                    {/* Draft Switching Dropdown */}
                    <div className="relative">
                        <button 
                            onClick={() => setShowDraftDropdown(!showDraftDropdown)}
                            disabled={draftOrders.length === 0}
                            className={`flex items-center gap-1.5 px-2 sm:px-3 py-1.5 text-xs font-bold rounded-lg border transition-colors ${
                                draftOrders.length > 0 
                                ? 'bg-indigo-50 text-indigo-700 hover:bg-indigo-100 border-indigo-100' 
                                : 'bg-slate-50 text-slate-400 border-slate-100 cursor-not-allowed'
                            }`}
                        >
                            {/* Mobile: Compact text. Desktop: Full text */}
                            <span className="sm:hidden">Drafts ({draftOrders.length})</span> 
                            <span className="hidden sm:inline">Switch Draft ({draftOrders.length})</span>
                            <ChevronDown size={14} />
                        </button>
                        
                        {showDraftDropdown && draftOrders.length > 0 && (
                            <>
                                {/* Click outside to close - Higher Z to be above header */}
                                <div 
                                    className="fixed inset-0 z-[60] bg-transparent" 
                                    onClick={() => setShowDraftDropdown(false)}
                                ></div>
                                
                                {/* Dropdown Container - Responsive Positioning */}
                                <div className="fixed inset-x-4 top-16 sm:absolute sm:inset-auto sm:top-full sm:right-0 mt-3 sm:w-80 bg-white rounded-2xl shadow-2xl border border-slate-200 py-2 z-[100] max-h-[60vh] overflow-y-auto ring-1 ring-slate-200 animate-in fade-in slide-in-from-top-2 duration-200">
                                    <div className="px-4 py-2 border-b border-slate-100 text-[10px] font-bold text-slate-400 uppercase tracking-widest bg-slate-50/50">
                                        Your Draft Orders
                                    </div>
                                    <div className="p-1">
                                        {draftOrders.map(draft => (
                                            <button
                                                key={draft.id}
                                                onClick={() => {
                                                    handleSwitchOrder(draft.id);
                                                    setShowDraftDropdown(false);
                                                }}
                                                className="w-full text-left px-3 py-3 hover:bg-slate-50 rounded-xl flex flex-col gap-1 transition-colors group"
                                            >
                                                <div className="flex justify-between items-center w-full">
                                                    <span className="font-bold text-slate-800 text-sm group-hover:text-indigo-600 transition-colors">
                                                        {draft.ledger?.name || 'New Customer'}
                                                    </span>
                                                    <span className="text-[10px] font-bold text-slate-400 bg-slate-100 px-2 py-0.5 rounded-full">
                                                        #{draft.id}
                                                    </span>
                                                </div>
                                                <div className="flex justify-between items-center w-full text-xs text-slate-500 font-medium">
                                                    <span>{draft.date}</span>
                                                    <span className="font-bold text-slate-900 border-l border-slate-200 pl-2 ml-2">₹{parseFloat(draft.total_amount || '0').toLocaleString()}</span>
                                                </div>
                                            </button>
                                        ))}
                                    </div>
                                </div>
                            </>
                        )}
                    </div>
                </div>
                <div className="text-xs font-medium text-slate-500 bg-slate-100 px-2 py-1 rounded">
                    {items.length} Items
                </div>
            </div>

            <div className="p-3 space-y-3 flex-1 overflow-y-auto">
                {/* 1. Compact Customer Card */}
                <div className="bg-white rounded-lg border border-slate-200 p-3 shadow-sm space-y-3">
                    {/* Customer Selection Block */}
                    {selectedLedger ? (
                        <div className="flex justify-between items-start bg-indigo-50 border border-indigo-100 rounded-lg p-3">
                            <div className="flex-1">
                                <label className="text-xs font-bold text-indigo-500 uppercase tracking-wide block mb-0.5">Selected Customer</label>
                                <div className="text-lg font-bold text-slate-800 leading-tight">{ledgerSearch}</div>
                                {selectedLedgerDetails && (
                                    <div className="mt-1 text-xs text-slate-600 space-y-0.5 font-medium">
                                        {selectedLedgerDetails.gstin && <div><span className="text-slate-400">GST:</span> {selectedLedgerDetails.gstin}</div>}
                                        {selectedLedgerDetails.phone_number && <div><span className="text-slate-400">Ph:</span> {selectedLedgerDetails.phone_number}</div>}
                                        {selectedLedgerDetails.address && <div className="line-clamp-2"><span className="text-slate-400">Addr:</span> {selectedLedgerDetails.address}</div>}
                                    </div>
                                )}
                            </div>
                            <button
                                onClick={() => { setSelectedLedger(''); setLedgerSearch(''); setSelectedLedgerDetails(null); }}
                                className="text-sm font-bold text-indigo-600 hover:underline px-2 py-1 shrink-0"
                            >
                                Change
                            </button>
                        </div>
                    ) : (
                        <div className="flex gap-2 items-end">
                            <div className="relative z-20 flex-1">
                                <label className="text-xs font-bold text-slate-500 uppercase tracking-wide block mb-1">Customer (Search or Create)</label>
                                <div className="relative">
                                    <Search className="absolute left-3 top-2.5 text-slate-400" size={16} />
                                    <input
                                        ref={ledgerInputRef}
                                        type="text"
                                        className="w-full pl-9 pr-3 py-2 bg-slate-50 border border-slate-200 rounded-lg text-sm font-semibold focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 outline-none"
                                        placeholder="Search by Name, Phone or GST..."
                                        value={ledgerSearch}
                                        onChange={(e) => {
                                            setLedgerSearch(e.target.value);
                                            if (e.target.value.length < 3) setSelectedLedger('');
                                        }}
                                    />
                                    {usingDropdown(ledgerLoading, showLedgerDropdown, ledgers, handleSelectLedger)}
                                </div>
                            </div>
                            <button
                                onClick={() => setShowCreateLedger(true)}
                                className="bg-slate-100 hover:bg-slate-200 text-slate-700 p-2 rounded-lg border border-slate-200"
                                title="Create New Customer"
                            >
                                <UserPlus size={20} />
                            </button>
                        </div>
                    )}

                    <div className="grid grid-cols-2 gap-3">
                        <div>
                            <label className="text-xs font-bold text-slate-500 uppercase tracking-wide block mb-1">Date</label>
                            <div className="w-full px-3 py-2 bg-slate-100 border border-slate-200 rounded-lg text-sm font-semibold text-slate-600 uppercase">
                                {orderDate}
                            </div>
                        </div>
                        <div>
                            <label className="text-xs font-bold text-slate-500 uppercase tracking-wide block mb-1">Order Type</label>
                            <select
                                className="w-full px-3 py-2 bg-white border border-slate-200 rounded-lg text-sm font-bold text-indigo-700 outline-none focus:ring-2 focus:ring-indigo-500 appearance-none bg-[url('data:image/svg+xml;charset=US-ASCII,%3Csvg%20width%3D%2220%22%20height%3D%2220%22%20viewBox%3D%220%200%2020%2020%22%20fill%3D%22none%22%20xmlns%3D%22http%3A//www.w3.org/2000/svg%22%3E%3Cpath%20d%3D%22M5%207.5L10%2012.5L15%207.5%22%20stroke%3D%22%234F46E5%22%20stroke-width%3D%221.67%22%20stroke-linecap%3D%22round%22%20stroke-linejoin%3D%22round%22/%3E%3C/svg%3E')] bg-[length:20px_20px] bg-[right_8px_center] bg-no-repeat"
                                value={orderType}
                                onChange={(e) => setOrderType(e.target.value)}
                            >
                                <option value="Tax Invoice">Tax Invoice</option>
                                <option value="Quotation">Quotation</option>
                            </select>
                        </div>
                    </div>
                </div>

                {/* 2. Permanent Item Search & List */}
                <div className="space-y-3">
                    {/* Two-Step Search Implementation */}
                    {!selectedParent ? (
                        <div className="relative z-20">
                            <label className="text-xs font-bold text-slate-500 uppercase tracking-wide block mb-1">Step 1: Search Category / Parent (Min 2 chars)</label>
                            <div className="relative">
                                <Search className="absolute left-3 top-2.5 text-slate-400" size={16} />
                                <input
                                    type="text"
                                    className="w-full pl-9 pr-3 py-2 bg-white border border-slate-200 rounded-lg text-sm font-semibold focus:ring-2 focus:ring-indigo-500 outline-none shadow-sm"
                                    placeholder="Search Category (e.g. CAMLIN, CELLO)..."
                                    value={parentSearch}
                                    onChange={(e) => setParentSearch(e.target.value)}
                                />
                                {parentSearchLoading && (
                                    <div className="absolute right-3 top-2.5">
                                        <div className="animate-spin h-4 w-4 border-2 border-indigo-500 border-t-transparent rounded-full"></div>
                                    </div>
                                )}
                                {showParentDropdown && parentSearchResults.length > 0 && (
                                    <div className="absolute left-0 right-0 mt-1 bg-white border border-slate-200 rounded-xl shadow-2xl z-50 max-h-72 overflow-y-auto ring-1 ring-slate-200">
                                        {parentSearchResults.map((parent, idx) => (
                                            <button
                                                key={idx}
                                                onClick={() => handleSelectParent(parent)}
                                                className="w-full text-left px-4 py-3 hover:bg-slate-50 border-b border-slate-100 last:border-0 transition-colors flex items-center justify-between group"
                                            >
                                                <span className="font-bold text-slate-800 group-hover:text-indigo-600">{parent}</span>
                                                <ArrowRight size={14} className="text-slate-300 group-hover:text-indigo-400" />
                                            </button>
                                        ))}
                                    </div>
                                )}
                                {showParentDropdown && parentSearchResults.length === 0 && !parentSearchLoading && (
                                    <div className="absolute left-0 right-0 mt-1 bg-white border border-slate-200 rounded-xl p-4 text-center text-slate-500 text-sm shadow-xl">
                                        No categories found matching "{parentSearch}"
                                    </div>
                                )}
                            </div>
                        </div>
                    ) : (
                        <div className="space-y-3">
                            {/* Selected Parent Display */}
                            <div className="flex justify-between items-center bg-slate-100 border border-slate-200 rounded-lg px-3 py-2">
                                <div className="flex items-center gap-2">
                                    <span className="text-[10px] font-black text-slate-400 uppercase tracking-tighter bg-white px-1.5 py-0.5 rounded border border-slate-200">Category</span>
                                    <span className="font-bold text-slate-800 text-sm">{selectedParent}</span>
                                </div>
                                <button
                                    onClick={() => {
                                        setSelectedParent(null);
                                        setItemSearch('');
                                        setItemSearchResults([]);
                                    }}
                                    className="text-xs font-bold text-indigo-600 hover:text-indigo-800 flex items-center gap-1"
                                >
                                    <X size={14} /> Change
                                </button>
                            </div>

                            {/* Item Search Bar */}
                            <div className="relative z-10">
                                <label className="text-xs font-bold text-slate-500 uppercase tracking-wide block mb-1">Step 2: Add Items (Min 2 chars)</label>
                                <div className="relative">
                                    <Search className="absolute left-3 top-2.5 text-slate-400" size={16} />
                                    <input
                                        id="item-search-input"
                                        type="text"
                                        className="w-full pl-9 pr-3 py-2 bg-white border border-slate-200 rounded-lg text-sm font-semibold focus:ring-2 focus:ring-indigo-500 outline-none shadow-sm"
                                        placeholder={`Search in ${selectedParent}...`}
                                        value={itemSearch}
                                        onChange={(e) => setItemSearch(e.target.value)}
                                    />
                                    {usingItemDropdown(itemSearchLoading, showItemDropdown, itemSearchResults, handleSelectItem)}
                                </div>
                            </div>
                        </div>
                    )}

                    {/* Compact Item List */}
                    {items.length > 0 && (
                        <div className="space-y-2">
                            {items.map((item, idx) => (
                                <div key={idx} className="bg-white p-3 rounded-lg border border-slate-200 flex items-center gap-3 shadow-sm">
                                    {/* Serial Number */}
                                    <span className="text-xs font-bold text-slate-400 bg-slate-50 px-2 py-1 rounded border border-slate-100 min-w-[24px] text-center">
                                        {idx + 1}
                                    </span>

                                    <div className="flex-1 min-w-0 pr-3">
                                        <div className="flex justify-between items-start">
                                            <h4 className="font-bold text-slate-800 text-sm truncate">{item.name}</h4>
                                        </div>
                                        <div className="flex items-center gap-2 mt-1 text-xs text-slate-600">
                                            <span className="font-semibold bg-slate-100 px-1.5 py-0.5 rounded">{item.quantity} {item.unit}</span>
                                            <span className="text-slate-400">x</span>
                                            <span>₹{item.rate}</span>
                                            {item.selected_discount > 0 && (
                                                <span className="text-green-600 bg-green-50 px-1 rounded">-{item.selected_discount}%</span>
                                            )}
                                        </div>
                                    </div>
                                    <div className="flex flex-col items-end gap-1.5">
                                        <div className="font-bold text-slate-900 text-base">₹{Math.round(calculateItemTotalWithTax(item)).toLocaleString('en-IN')}</div>
                                        <div className="flex gap-1">
                                            <button
                                                onClick={() => handleEditItem(idx)}
                                                className="p-1.5 bg-slate-50 text-slate-500 hover:text-indigo-600 hover:bg-indigo-50 rounded-lg transition-colors border border-slate-100"
                                                title="Edit Item"
                                            >
                                                <svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><path d="M17 3a2.828 2.828 0 1 1 4 4L7.5 20.5 2 22l1.5-5.5L17 3z"></path></svg>
                                            </button>
                                            <button
                                                onClick={() => setItems(items.filter((_, i) => i !== idx))}
                                                className="p-1.5 bg-slate-50 text-slate-400 hover:text-red-500 hover:bg-red-50 rounded-lg transition-colors border border-slate-100"
                                                title="Remove Item"
                                            >
                                                <X size={14} />
                                            </button>
                                        </div>
                                    </div>
                                </div>
                            ))}
                        </div>
                    )}
                    {/* Compact Item List (as before) */}
                </div>

                {/* Spacer to prevent footer overlap */}
                <div className="h-24"></div>
            </div>

            {/* Floating Remarks Button */}
            <button
                onClick={() => { setTempRemark(remark); setShowRemarkModal(true); }}
                className={`fixed bottom-24 right-4 z-40 p-4 rounded-full shadow-2xl transition-all active:scale-90 flex items-center justify-center group ${
                    remark 
                    ? 'bg-indigo-600 text-white ring-4 ring-indigo-100' 
                    : 'bg-white text-slate-400 border border-slate-200 hover:border-indigo-300 hover:text-indigo-500'
                }`}
            >
                <MessageSquare size={24} className={remark ? 'animate-pulse' : ''} />
                
                {/* Visual indicator that text exists */}
                {remark && (
                    <span className="absolute -top-1 -right-1 flex h-4 w-4">
                        <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-green-400 opacity-75"></span>
                        <span className="relative inline-flex rounded-full h-4 w-4 bg-green-500 border-2 border-white"></span>
                    </span>
                )}

                {/* Tooltip on hover (desktop only) */}
                <span className="absolute right-full mr-3 px-2 py-1 bg-slate-800 text-white text-[10px] font-bold rounded opacity-0 group-hover:opacity-100 transition-opacity pointer-events-none whitespace-nowrap">
                    {remark ? 'Edit Remarks' : 'Add Remark'}
                </span>
            </button>

            {/* Footer - Single Row Premium Glassmorphic */}
            <div className="fixed bottom-0 left-0 right-0 bg-white/80 backdrop-blur-lg border-t border-slate-200 py-3 px-4 shadow-[0_-5px_20px_rgba(0,0,0,0.05)] z-30">
                <div className="flex items-center gap-3">
                    {/* Total Section */}
                    <div className="flex-none pr-4 border-r border-slate-200">
                        <span className="text-[10px] font-extrabold text-slate-400 uppercase tracking-tighter block -mb-1">Total</span>
                        <div className="text-2xl font-black text-slate-800 tracking-tight">
                            ₹{Math.round(calculateTotalWithTax()).toLocaleString('en-IN')}
                        </div>
                    </div>

                    {/* Action Buttons */}
                    <div className="flex-1 flex gap-2">
                        {/* Cancel Button */}
                        <button
                            onClick={() => {
                                if (items.length > 0 && !confirm('Discard unsold changes?')) return;
                                navigate(-1);
                            }}
                            className="flex-1 py-3 text-slate-500 font-bold bg-slate-100/50 hover:bg-slate-200/50 rounded-xl active:scale-95 transition-all text-xs"
                        >
                            Cancel
                        </button>

                        <button
                            onClick={() => handleSaveOrder(true)}
                            disabled={items.length === 0 || !selectedLedger || isSaving}
                            className={`flex-[1.2] py-3 bg-indigo-50 text-indigo-700 font-bold rounded-xl active:scale-95 transition-all border border-indigo-100 flex items-center justify-center gap-1.5 text-xs disabled:opacity-50 ${isSaving ? 'cursor-not-allowed' : ''}`}
                        >
                            <ArrowRight size={16} />
                            <span>Tally</span>
                        </button>

                        <button
                            onClick={() => handleSaveOrder(false)}
                            disabled={items.length === 0 || !selectedLedger || isSaving}
                            className="flex-[1.5] py-3 bg-indigo-600 text-white font-bold rounded-xl active:scale-95 transition-all shadow-lg shadow-indigo-200 disabled:opacity-50 disabled:shadow-none flex items-center justify-center gap-1.5 text-xs"
                        >
                            <Save size={16} />
                            <span>{isEditMode ? 'Update' : 'Save'}</span>
                        </button>
                    </div>
                </div>
            </div>

            {/* Dense Bottom Sheet */}
            {showItemPopup && (
                <div className="fixed inset-0 z-50 flex flex-col justify-end">
                    <div className="absolute inset-0 bg-black/50 backdrop-blur-sm" onClick={resetPopup}></div>
                    <div className="relative w-full bg-white rounded-t-xl shadow-2xl flex flex-col max-h-[90vh] animate-in slide-in-from-bottom duration-200">

                        {/* Header */}
                        <div className="flex justify-between items-center px-4 py-3 border-b border-slate-100">
                            <h3 className="font-bold text-lg text-slate-800">Add Item</h3>
                            <button onClick={resetPopup}><X size={20} className="text-slate-400" /></button>
                        </div>

                        <div className="p-4 overflow-y-auto space-y-4">
                            {/* Barcode Search - Show only if no item found yet */}
                            {!foundItem && (
                                <div className="relative">
                                    <Scan className="absolute left-3 top-3.5 text-indigo-500" size={20} />
                                    <input
                                        type="text"
                                        className="w-full pl-10 pr-12 py-3 bg-slate-50 border border-slate-200 rounded-lg text-base font-bold text-slate-800 focus:ring-2 focus:ring-indigo-500 outline-none"
                                        placeholder="Scan Barcode..."
                                        value={barcodeQuery}
                                        onChange={(e) => setBarcodeQuery(e.target.value)}
                                        onKeyDown={handleBarcodeSearch}
                                        autoFocus
                                        enterKeyHint="search"
                                        inputMode="search"
                                    />
                                    <button
                                        onClick={handleBarcodeSearch}
                                        className="absolute right-2 top-2 bottom-2 bg-indigo-100 text-indigo-600 rounded-lg px-3 flex items-center justify-center active:scale-95 transition-transform"
                                    >
                                        <ArrowRight size={20} />
                                    </button>
                                </div>
                            )}

                            {foundItem && (
                                <div className="space-y-4 animate-in fade-in slide-in-from-bottom-2">
                                    <div className="bg-indigo-50 p-3 rounded-lg border border-indigo-100">
                                        <div className="flex justify-between items-start mb-1">
                                            <h4 className="font-bold text-slate-800 text-base leading-tight">{foundItem.name}</h4>
                                            <span className="bg-white text-indigo-600 border border-indigo-200 text-[10px] font-bold px-1.5 py-0.5 rounded">{foundItem.ats_barcode}</span>
                                        </div>
                                        <div className="flex items-center gap-2">
                                            <span className="text-xs font-bold text-indigo-500 uppercase tracking-wide">
                                                MRP: ₹{foundItem.default_mrp || '0.00'}
                                            </span>
                                        </div>
                                    </div>

                                    {/* Livestock Selection - Top Row */}
                                    <div className="flex justify-between items-center py-2 px-1">
                                        <div className="flex w-full gap-3">
                                            <button
                                                onClick={() => setItemLivestockType(itemLivestockType === 'Shop' ? '' : 'Shop')}
                                                className={`flex-1 py-3 rounded-xl font-bold text-sm transition-all border flex justify-between px-4 items-center ${itemLivestockType === 'Shop'
                                                    ? 'bg-indigo-600 text-white border-indigo-600 shadow-md'
                                                    : 'bg-white text-slate-600 border-slate-200 hover:border-indigo-300'
                                                    }`}
                                            >
                                                <span>Shop</span>
                                                <span className={`${itemLivestockType === 'Shop' ? 'text-indigo-100' : 'text-slate-400'} text-xs`} >
                                                    {isFetchingLiveStock ? '...' : `${shopStock} ${stockUnit}`}
                                                </span>
                                            </button>
                                            <button
                                                onClick={() => setItemLivestockType(itemLivestockType === 'Pb' ? '' : 'Pb')}
                                                className={`flex-1 py-3 rounded-xl font-bold text-sm transition-all border flex justify-between px-4 items-center ${itemLivestockType === 'Pb'
                                                    ? 'bg-indigo-600 text-white border-indigo-600 shadow-md'
                                                    : 'bg-white text-slate-600 border-slate-200 hover:border-indigo-300'
                                                    }`}
                                            >
                                                <span>PB</span>
                                                <span className={`${itemLivestockType === 'Pb' ? 'text-indigo-100' : 'text-slate-400'} text-xs`} >
                                                    {isFetchingLiveStock ? '...' : `${pbStock} ${stockUnit}`}
                                                </span>
                                            </button>
                                        </div>
                                    </div>

                                    {/* Grid Form - Quantity & Rate */}
                                    <div className="grid grid-cols-2 gap-x-3 gap-y-4">
                                        <div className="space-y-1">
                                            <label className="text-[10px] uppercase font-extrabold text-slate-400 tracking-wider">Quantity</label>
                                            <div className="relative">
                                                <input
                                                    type="number"
                                                    className="w-full px-2 py-2 bg-slate-50 border border-slate-200 rounded-lg font-bold text-lg text-slate-800 focus:ring-2 focus:ring-indigo-500 outline-none"
                                                    value={itemQty}
                                                    onChange={(e) => setItemQty(e.target.value)}
                                                    placeholder="0"
                                                    autoFocus
                                                />
                                                <span className="absolute right-3 top-2.5 text-xs font-bold text-slate-400">{itemUnit}</span>
                                            </div>
                                        </div>

                                        <div className="space-y-1">
                                            <label className="text-[10px] uppercase font-extrabold text-slate-400 tracking-wider">Rate (₹)</label>
                                            <div className="relative">
                                                <input
                                                    type="number"
                                                    className="w-full px-2 py-2 bg-slate-50 border border-slate-200 rounded-lg font-bold text-lg text-slate-800 focus:ring-2 focus:ring-indigo-500 outline-none"
                                                    value={itemRate}
                                                    onChange={handleRateChange}
                                                    placeholder="Rate"
                                                />
                                                {/* Rate Selector Dropdown Trigger */}
                                                <button
                                                    onClick={() => setShowRateDropdown(!showRateDropdown)}
                                                    className="absolute right-1 top-1 bottom-1 px-2 bg-white border border-slate-200 rounded text-[10px] font-bold text-indigo-600 hover:bg-indigo-50 flex items-center gap-1"
                                                >
                                                    {selectedSchemeName}
                                                    <ChevronDown size={12} />
                                                </button>

                                                {/* Rate Dropdown - Fixed Position for Mobile or Smart Absolute */}
                                                {showRateDropdown && (
                                                    <>
                                                        <div className="fixed inset-0 z-10" onClick={() => setShowRateDropdown(false)}></div>
                                                        <div className="absolute right-0 top-full mt-1 bg-white border border-slate-200 shadow-xl rounded-lg z-20 w-48 overflow-hidden animate-in fade-in slide-in-from-top-2 ring-1 ring-black/5">
                                                            <div className="bg-slate-50 px-3 py-2 border-b border-slate-100 text-[10px] font-bold text-slate-400 uppercase tracking-wider">
                                                                Select Rate
                                                            </div>
                                                            <div className="p-1 space-y-0.5 max-h-48 overflow-y-auto">
                                                                <button
                                                                    onClick={() => {
                                                                        const mrp = foundItem.default_mrp ? foundItem.default_mrp.split('/')[0] : '0';
                                                                        setPresetRate(mrp, 'MRP');
                                                                        setShowRateDropdown(false);
                                                                    }}
                                                                    className="w-full text-left px-3 py-2 hover:bg-indigo-50 rounded-md text-sm font-bold text-slate-700 flex justify-between items-center group"
                                                                >
                                                                    <span>MRP</span>
                                                                    <span className="text-indigo-600">₹{foundItem.default_mrp}</span>
                                                                </button>
                                                                {foundItem.rate_1 && (
                                                                    <button
                                                                        onClick={() => { setPresetRate(foundItem.rate_1!, 'R1'); setShowRateDropdown(false); }}
                                                                        className="w-full text-left px-3 py-2 hover:bg-indigo-50 rounded-md text-sm font-medium text-slate-600 flex justify-between items-center"
                                                                    >
                                                                        <span>Rate 1</span>
                                                                        <span>₹{foundItem.rate_1}</span>
                                                                    </button>
                                                                )}
                                                                {foundItem.rate_2 && (
                                                                    <button
                                                                        onClick={() => { setPresetRate(foundItem.rate_2!, 'R2'); setShowRateDropdown(false); }}
                                                                        className="w-full text-left px-3 py-2 hover:bg-indigo-50 rounded-md text-sm font-medium text-slate-600 flex justify-between items-center"
                                                                    >
                                                                        <span>Rate 2</span>
                                                                        <span>₹{foundItem.rate_2}</span>
                                                                    </button>
                                                                )}
                                                                {foundItem.rate_3 && (
                                                                    <button
                                                                        onClick={() => { setPresetRate(foundItem.rate_3!, 'R3'); setShowRateDropdown(false); }}
                                                                        className="w-full text-left px-3 py-2 hover:bg-indigo-50 rounded-md text-sm font-medium text-slate-600 flex justify-between items-center"
                                                                    >
                                                                        <span>Rate 3</span>
                                                                        <span>₹{foundItem.rate_3}</span>
                                                                    </button>
                                                                )}
                                                                {foundItem.rate_3a && (
                                                                    <button
                                                                        onClick={() => { setPresetRate(foundItem.rate_3a!, 'R3a'); setShowRateDropdown(false); }}
                                                                        className="w-full text-left px-3 py-2 hover:bg-indigo-50 rounded-md text-sm font-medium text-slate-600 flex justify-between items-center"
                                                                    >
                                                                        <span>Rate 3a</span>
                                                                        <span>₹{foundItem.rate_3a}</span>
                                                                    </button>
                                                                )}
                                                                {foundItem.rate_4 && (
                                                                    <button
                                                                        onClick={() => { setPresetRate(foundItem.rate_4!, 'R4'); setShowRateDropdown(false); }}
                                                                        className="w-full text-left px-3 py-2 hover:bg-indigo-50 rounded-md text-sm font-medium text-slate-600 flex justify-between items-center"
                                                                    >
                                                                        <span>Rate 4</span>
                                                                        <span>₹{foundItem.rate_4}</span>
                                                                    </button>
                                                                )}
                                                            </div>
                                                        </div>
                                                    </>
                                                )}
                                            </div>
                                            {/* Old Horizontal Scroll Removed */}

                                        </div>
                                    </div>

                                    {/* Discount & Total in a single row */}
                                    <div className="grid grid-cols-2 gap-3">
                                        <div className="space-y-1">
                                            <label className="text-[10px] uppercase font-extrabold text-slate-400 tracking-wider">Discount (%)</label>
                                            <div className="relative">
                                                <input
                                                    type="number"
                                                    className="w-full px-2 py-2 bg-slate-50 border border-slate-200 rounded-lg font-bold text-lg text-slate-800 focus:ring-2 focus:ring-indigo-500 outline-none"
                                                    value={itemDiscount}
                                                    onChange={(e) => setItemDiscount(e.target.value)}
                                                    placeholder="0"
                                                />
                                                <span className="absolute right-3 top-2.5 text-xs font-bold text-slate-400">%</span>
                                            </div>
                                        </div>

                                        <div className="space-y-1">
                                            <label className="text-[10px] uppercase font-extrabold text-slate-400 tracking-wider">Total</label>
                                            <div className="w-full px-2 py-2 bg-indigo-50 border border-indigo-100 rounded-lg font-bold text-xl text-indigo-700 h-[46px] flex items-center justify-center">
                                                ₹{calculateCurrentItemTotal().toFixed(2)}
                                            </div>
                                        </div>
                                    </div>

                                    <button
                                        onClick={addItemToOrder}
                                        disabled={!itemQty || !itemRate || (getMinRate() > 0 && parseFloat(itemRate) <= getMinRate())}
                                        className="mt-4 w-full bg-indigo-600 text-white py-3.5 rounded-xl font-bold text-base shadow active:scale-95 transition-transform disabled:opacity-50 disabled:bg-slate-400 disabled:shadow-none"
                                    >
                                        {getMinRate() > 0 && parseFloat(itemRate) <= getMinRate() ? 'Rate too low' : 'Confirm Add Item'}
                                    </button>
                                </div>
                            )}
                        </div>
                    </div>
                </div>
            )}


            {/* Create Ledger Modal */}
            {
                showCreateLedger && (
                    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm px-4">
                        <div className="bg-white rounded-xl shadow-2xl p-5 w-full max-w-sm max-h-[90vh] overflow-y-auto">
                            <h3 className="text-lg font-bold text-slate-800 mb-4">New Customer</h3>
                            <div className="space-y-3">
                                <div>
                                    <label className="text-xs font-bold text-slate-500 uppercase">Customer Name *</label>
                                    <input
                                        type="text"
                                        className="w-full px-3 py-2 mt-1 border border-slate-300 rounded-lg font-semibold focus:ring-2 focus:ring-indigo-500 outline-none"
                                        value={newLedgerName}
                                        onChange={(e) => setNewLedgerName(e.target.value)}
                                        placeholder="Enter company/firm name..."
                                    />
                                </div>

                                <div>
                                    <label className="text-xs font-bold text-slate-500 uppercase">Address *</label>
                                    <textarea
                                        className="w-full px-3 py-2 mt-1 border border-slate-300 rounded-lg font-semibold focus:ring-2 focus:ring-indigo-500 outline-none resize-none h-20"
                                        value={newLedgerAddress}
                                        onChange={(e) => setNewLedgerAddress(e.target.value)}
                                        placeholder="Full address required for billing"
                                    />
                                </div>

                                <div>
                                    <label className="text-xs font-bold text-slate-500 uppercase">Contact Person</label>
                                    <input
                                        type="text"
                                        className="w-full px-3 py-2 mt-1 border border-slate-300 rounded-lg font-semibold focus:ring-2 focus:ring-indigo-500 outline-none"
                                        value={newLedgerPerson}
                                        onChange={(e) => setNewLedgerPerson(e.target.value)}
                                        placeholder="Name of contact person"
                                    />
                                </div>

                                <div className="grid grid-cols-2 gap-3">
                                    <div>
                                        <label className="text-xs font-bold text-slate-500 uppercase">Phone</label>
                                        <input
                                            type="tel"
                                            className="w-full px-3 py-2 mt-1 border border-slate-300 rounded-lg font-semibold focus:ring-2 focus:ring-indigo-500 outline-none"
                                            value={newLedgerPhone}
                                            onChange={(e) => setNewLedgerPhone(e.target.value)}
                                            placeholder="Mobile"
                                        />
                                    </div>
                                    <div>
                                        <label className="text-xs font-bold text-slate-500 uppercase">Email</label>
                                        <input
                                            type="email"
                                            className="w-full px-3 py-2 mt-1 border border-slate-300 rounded-lg font-semibold focus:ring-2 focus:ring-indigo-500 outline-none"
                                            value={newLedgerEmail}
                                            onChange={(e) => setNewLedgerEmail(e.target.value)}
                                            placeholder="Email (Optional)"
                                        />
                                    </div>
                                </div>

                                <div>
                                    <label className="text-xs font-bold text-slate-500 uppercase">GSTIN (Optional)</label>
                                    <input
                                        type="text"
                                        className="w-full px-3 py-2 mt-1 border border-slate-300 rounded-lg font-semibold focus:ring-2 focus:ring-indigo-500 outline-none uppercase"
                                        value={newLedgerGst}
                                        onChange={(e) => setNewLedgerGst(e.target.value.toUpperCase())}
                                        maxLength={15}
                                        placeholder="GSTIN"
                                    />
                                </div>

                                <div className="grid grid-cols-2 gap-3">
                                    <div>
                                        <label className="text-xs font-bold text-slate-500 uppercase">Pincode</label>
                                        <input
                                            type="text"
                                            className="w-full px-3 py-2 mt-1 border border-slate-300 rounded-lg font-semibold focus:ring-2 focus:ring-indigo-500 outline-none"
                                            value={newLedgerPincode}
                                            onChange={(e) => handlePincodeChange(e.target.value)}
                                            maxLength={6}
                                            placeholder="Zip Code"
                                        />
                                    </div>
                                    <div>
                                        <label className="text-xs font-bold text-slate-500 uppercase">State</label>
                                        <div className="relative">
                                            <select
                                                className="w-full px-3 py-2 mt-1 border border-slate-300 rounded-lg font-semibold focus:ring-2 focus:ring-indigo-500 outline-none appearance-none bg-white"
                                                value={newLedgerState}
                                                onChange={(e) => setNewLedgerState(e.target.value)}
                                                disabled={fetchingState}
                                            >
                                                <option value="">Select State</option>
                                                {INDIAN_STATES.map((state) => (
                                                    <option key={state} value={state}>{state}</option>
                                                ))}
                                            </select>
                                            <ChevronDown size={14} className="absolute right-3 top-4 text-slate-400 pointer-events-none" />
                                        </div>
                                    </div>
                                </div>

                                <div className="flex gap-3 mt-4 pt-2">
                                    <button
                                        onClick={() => setShowCreateLedger(false)}
                                        className="flex-1 py-3 text-slate-600 font-bold bg-slate-100 rounded-lg hover:bg-slate-200"
                                    >
                                        Cancel
                                    </button>
                                    <button
                                        onClick={handleCreateLedger}
                                        disabled={creatingLedger}
                                        className="flex-1 py-3 text-white font-bold bg-indigo-600 rounded-lg hover:bg-indigo-700 disabled:opacity-50"
                                    >
                                        {creatingLedger ? 'Creating...' : 'Create Customer'}
                                    </button>
                                </div>
                            </div>
                        </div>
                    </div>
                )
            }


            {/* Custom Alert Component */}
             <ConfirmModal 
                isOpen={confirmModal.isOpen}
                onClose={() => setConfirmModal(prev => ({ ...prev, isOpen: false }))}
                onConfirm={confirmModal.onConfirm}
                title={confirmModal.title}
                message={confirmModal.message}
                isDangerous={confirmModal.isDangerous}
                confirmText={confirmModal.confirmText || "Yes, Discard"}
                secondaryConfirmText={confirmModal.secondaryConfirmText}
                onSecondaryConfirm={confirmModal.onSecondaryConfirm}
            />

            {/* Remarks Modal Overlay */}
            {showRemarkModal && (
                <div className="fixed inset-0 z-[100] flex items-center justify-center bg-black/50 backdrop-blur-sm px-4 animate-in fade-in duration-200">
                    <div className="bg-white rounded-2xl shadow-2xl w-full max-w-sm overflow-hidden animate-in zoom-in-95 duration-200">
                        <div className="px-5 py-4 border-b border-slate-100 flex justify-between items-center bg-slate-50/50">
                            <h3 className="font-bold text-slate-800">Add Remark</h3>
                            <button onClick={() => setShowRemarkModal(false)} className="text-slate-400 hover:text-slate-600 transition-colors">
                                <X size={20} />
                            </button>
                        </div>
                        <div className="p-5">
                            <textarea
                                className="w-full px-4 py-3 bg-slate-50 border border-slate-200 rounded-xl text-sm font-medium focus:ring-2 focus:ring-indigo-500 outline-none resize-none h-32 placeholder:text-slate-400 border-dashed"
                                placeholder="Enter comments for Tally (Narration)..."
                                value={tempRemark}
                                onChange={(e) => setTempRemark(e.target.value)}
                                autoFocus
                            ></textarea>
                            <div className="flex gap-3 mt-5">
                                <button
                                    onClick={() => setShowRemarkModal(false)}
                                    className="flex-1 py-3 text-slate-600 font-bold bg-slate-100 rounded-xl hover:bg-slate-200"
                                >
                                    Cancel
                                </button>
                                <button
                                    onClick={() => {
                                        setRemark(tempRemark);
                                        setShowRemarkModal(false);
                                        showToast('Remark saved!', 'success');
                                    }}
                                    className="flex-1 py-3 text-white font-bold bg-indigo-600 rounded-xl hover:bg-indigo-700 shadow-lg shadow-indigo-100"
                                >
                                    Done
                                </button>
                            </div>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
}

// Helper for Dropdown Logic to keep JSX clean
function usingDropdown(loading: boolean, show: boolean, data: Ledger[], onSelect: (l: Ledger) => void) {
    if (!show) return null;
    // Safety check for data
    if (!data || !Array.isArray(data)) return null;

    return (
        <div className="absolute top-full left-0 right-0 bg-white border border-slate-200 shadow-xl rounded-b-lg max-h-48 overflow-y-auto mt-1 divide-y divide-slate-100 z-50">
            {loading ? (
                <div className="p-3 text-center text-xs text-slate-500">Searching...</div>
            ) : data.length === 0 ? (
                <div className="p-3 text-center text-xs text-slate-500">No customers found</div>
            ) : (
                data.map(l => (
                    <div
                        key={l.id}
                        onMouseDown={(e) => {
                            e.preventDefault();
                            onSelect(l);
                        }}
                        className="px-4 py-2.5 text-sm hover:bg-indigo-50 cursor-pointer text-slate-700"
                    >
                        <div className="font-bold">{l.name}</div>
                        {l.phone_number && <div className="text-xs text-slate-500">{l.phone_number}</div>}
                    </div>
                ))
            )}
        </div>
    );
}

function usingItemDropdown(loading: boolean, show: boolean, data: StockItem[], onSelect: (i: StockItem) => void) {
    if (!show) return null;
    return (
        <div className="absolute top-full left-0 right-0 bg-white border border-slate-200 shadow-xl rounded-b-lg max-h-60 overflow-y-auto mt-1 divide-y divide-slate-100 z-50">
            {loading ? (
                <div className="p-3 text-center text-xs text-slate-500">Searching...</div>
            ) : data.length === 0 ? (
                <div className="p-3 text-center text-xs text-slate-500">No items found</div>
            ) : (
                data.map(i => (
                    <div
                        key={i.id}
                        onMouseDown={(e) => {
                            e.preventDefault(); // Prevent blur before click
                            onSelect(i);
                        }}
                        className="px-4 py-2 text-sm hover:bg-indigo-50 cursor-pointer text-slate-700"
                    >
                        <div className="font-bold">{i.name}</div>
                        <div className="text-xs text-slate-500 flex justify-between mt-0.5">
                            <span>MRP: ₹{i.default_mrp}</span>
                            <span>Bal: {i.closing_balance}</span>
                        </div>
                    </div>
                ))
            )}
        </div>
    );
}
