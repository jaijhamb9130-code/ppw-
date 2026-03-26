import { useState, useEffect, useCallback, useRef } from 'react';
import { getStockItems, getItemDetails, saveItemDetails, getUser } from '../api';
import { ArrowLeft, Save, Undo2, Loader, Search, ImagePlus, Trash2, Pencil, Camera } from 'lucide-react';
import BarcodeScanner from './BarcodeScanner';

interface StockItem {
    masterid: string;
    name: string;
    parent: string;
    ats_barcode: string;
    default_mrp: string;
    gst: string;
    base_units: string;
    hsn: string;
    closing_balance: string;
    rate_1: string;
    rate_2: string;
    rate_3: string;
    rate_3a: string;
    rate_4: string;
}

interface ImageSlot {
    slot: number;
    file: File | null;
    previewUrl: string | null;
    serverUrl: string | null;
    originalName: string | null;
}

interface Props {
    onClose: () => void;
}

export default function ItemDetailsPage({ onClose }: Props) {
    const [searchTerm, setSearchTerm] = useState('');
    const [searchResults, setSearchResults] = useState<StockItem[]>([]);
    const [showDropdown, setShowDropdown] = useState(false);
    const [selectedItem, setSelectedItem] = useState<StockItem | null>(null);
    const [description, setDescription] = useState('');
    const [savedDescription, setSavedDescription] = useState('');
    const [imageSlots, setImageSlots] = useState<ImageSlot[]>(
        [1, 2, 3, 4].map(slot => ({ slot, file: null, previewUrl: null, serverUrl: null, originalName: null }))
    );
    const [savedImageSlots, setSavedImageSlots] = useState<ImageSlot[]>(
        [1, 2, 3, 4].map(slot => ({ slot, file: null, previewUrl: null, serverUrl: null, originalName: null }))
    );
    const [loading, setLoading] = useState(false);
    const [saving, setSaving] = useState(false);
    const [searchLoading, setSearchLoading] = useState(false);
    const [hasChanges, setHasChanges] = useState(false);
    const [saveSuccess, setSaveSuccess] = useState(false);
    const [isEditingDesc, setIsEditingDesc] = useState(false);
    const [itemName, setItemName] = useState('');
    const [savedItemName, setSavedItemName] = useState('');
    const [isEditingName, setIsEditingName] = useState(false);
    const [showScanner, setShowScanner] = useState(false);
    const searchTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);
    const dropdownRef = useRef<HTMLDivElement>(null);
    const fileInputRefs = useRef<(HTMLInputElement | null)[]>([null, null, null, null]);

    // Lock body scroll to make it behave like a full page
    useEffect(() => {
        document.body.style.overflow = 'hidden';
        return () => {
            document.body.style.overflow = '';
        };
    }, []);

    // Search items with debounce
    const searchItems = useCallback(async (term: string) => {
        if (term.length < 1) {
            setSearchResults([]);
            return;
        }
        setSearchLoading(true);
        try {
            const result = await getStockItems(1, 20, term);
            setSearchResults(result.data);
        } catch (e) {
            console.error(e);
        } finally {
            setSearchLoading(false);
        }
    }, []);

    useEffect(() => {
        if (searchTimeoutRef.current) clearTimeout(searchTimeoutRef.current);
        searchTimeoutRef.current = setTimeout(() => searchItems(searchTerm), 300);
        return () => { if (searchTimeoutRef.current) clearTimeout(searchTimeoutRef.current); };
    }, [searchTerm, searchItems]);

    // Close dropdown on outside click
    useEffect(() => {
        const handler = (e: MouseEvent) => {
            if (dropdownRef.current && !dropdownRef.current.contains(e.target as Node)) {
                setShowDropdown(false);
            }
        };
        document.addEventListener('mousedown', handler);
        return () => document.removeEventListener('mousedown', handler);
    }, []);

    // Track changes
    useEffect(() => {
        if (!selectedItem) return;
        const nameChanged = itemName !== savedItemName;
        const descChanged = description !== savedDescription;
        const imgChanged = imageSlots.some((s, i) =>
            s.file !== null || s.serverUrl !== savedImageSlots[i].serverUrl
        );
        setHasChanges(nameChanged || descChanged || imgChanged);
    }, [itemName, savedItemName, description, savedDescription, imageSlots, savedImageSlots, selectedItem]);

    // Fetch details when item selected
    const loadItemDetails = useCallback(async (masterid: string) => {
        setLoading(true);
        try {
            const data = await getItemDetails(masterid);
            const desc = data.detail?.description || '';
            setDescription(desc);
            setSavedDescription(desc);

            const slots: ImageSlot[] = [1, 2, 3, 4].map(slot => {
                const img = data.images?.find((i: any) => i.image_slot === slot);
                return {
                    slot,
                    file: null,
                    previewUrl: img ? `/${img.image_url}` : null,
                    serverUrl: img ? `/${img.image_url}` : null,
                    originalName: img?.original_name || null,
                };
            });
            setImageSlots(slots);
            setSavedImageSlots(JSON.parse(JSON.stringify(slots)));
            setIsEditingDesc(false);
        } catch (e) {
            console.error(e);
        } finally {
            setLoading(false);
        }
    }, []);

    const handleSelectItem = (item: StockItem) => {
        setSelectedItem(item);
        setItemName(item.name);
        setSavedItemName(item.name);
        setSearchTerm(item.name);
        setShowDropdown(false);
        loadItemDetails(item.masterid);
    };

    const handleImageUpload = (slotIndex: number, file: File) => {
        const newSlots = [...imageSlots];
        newSlots[slotIndex] = {
            ...newSlots[slotIndex],
            file,
            previewUrl: URL.createObjectURL(file),
        };
        setImageSlots(newSlots);
    };

    const handleRemoveImage = (slotIndex: number) => {
        const newSlots = [...imageSlots];
        if (newSlots[slotIndex].previewUrl && newSlots[slotIndex].file) {
            URL.revokeObjectURL(newSlots[slotIndex].previewUrl!);
        }
        newSlots[slotIndex] = {
            ...newSlots[slotIndex],
            file: null,
            previewUrl: null,
            serverUrl: null,
            originalName: null,
        };
        setImageSlots(newSlots);
    };

    const handleSave = async () => {
        if (!selectedItem) return;
        setSaving(true);
        try {
            const user = getUser();
            const formData = new FormData();
            formData.append('description', description);
            if (itemName !== savedItemName) {
                formData.append('name', itemName);
            }
            formData.append('user_id', user.id?.toString() || '0');

            const removedSlots = savedImageSlots
                .filter((s, i) => s.serverUrl && !imageSlots[i].serverUrl && !imageSlots[i].file)
                .map(s => s.slot);
            formData.append('removed_slots', JSON.stringify(removedSlots));

            imageSlots.forEach((s) => {
                if (s.file) {
                    formData.append(`image_${s.slot}`, s.file);
                }
            });

            await saveItemDetails(selectedItem.masterid, formData);
            await loadItemDetails(selectedItem.masterid);
            setSaveSuccess(true);
            setTimeout(() => setSaveSuccess(false), 2500);
        } catch (e) {
            console.error(e);
            alert('Failed to save. Please try again.');
        } finally {
            setSaving(false);
        }
    };

    const handleDiscard = () => {
        setItemName(savedItemName);
        setDescription(savedDescription);
        setImageSlots(JSON.parse(JSON.stringify(savedImageSlots)));
        setIsEditingDesc(false);
        setIsEditingName(false);
        setHasChanges(false);
    };

    return (
        <div className="fixed inset-0 z-[999] bg-slate-50 flex flex-col" style={{ animation: 'slideInRight 0.25s ease-out' }}>
            <style>{`
                @keyframes slideInRight {
                    from { transform: translateX(100%); opacity: 0; }
                    to { transform: translateX(0); opacity: 1; }
                }
                @keyframes fadeInUp {
                    from { transform: translateY(8px); opacity: 0; }
                    to { transform: translateY(0); opacity: 1; }
                }
                @keyframes pulse-success {
                    0%, 100% { box-shadow: 0 0 0 0 rgba(16, 185, 129, 0.4); }
                    50% { box-shadow: 0 0 0 8px rgba(16, 185, 129, 0); }
                }
            `}</style>

            {/* Header */}
            <div className="bg-white border-b border-slate-200 px-4 py-3 flex items-center gap-3 shadow-sm shrink-0">
                <button
                    onClick={onClose}
                    className="w-9 h-9 flex items-center justify-center rounded-xl hover:bg-slate-100 active:scale-90 transition-all"
                >
                    <ArrowLeft size={20} className="text-slate-600" />
                </button>
                <div className="flex-1 min-w-0">
                    <h1 className="text-lg font-bold text-slate-800 leading-tight">Item Details</h1>
                    <p className="text-[11px] text-slate-400 font-medium">Manage item images & description</p>
                </div>
                {saveSuccess && (
                    <span
                        className="text-xs font-bold text-emerald-600 bg-emerald-50 border border-emerald-200 px-3 py-1.5 rounded-lg"
                        style={{ animation: 'fadeInUp 0.3s ease-out, pulse-success 1s ease-in-out 2' }}
                    >
                        ✓ Saved
                    </span>
                )}
            </div>



            {/* Scrollable Content */}
            <div className="flex-1 overflow-y-auto">
                <div className="p-4 space-y-4 pb-24">

                    {/* Item Selector */}
                    <div ref={dropdownRef} className="relative">
                        <label className="text-xs font-bold text-slate-500 uppercase tracking-wider mb-1.5 block">Select Item</label>
                        <div className="relative">
                            <Search className="absolute left-3 top-2.5 text-slate-400" size={15} />
                            <input
                                type="text"
                                className="w-full pl-9 pr-12 py-2.5 bg-white border border-slate-200 rounded-xl text-sm font-semibold focus:ring-2 focus:ring-indigo-500 focus:border-transparent outline-none shadow-sm transition-all"
                                placeholder="Search by name, barcode..."
                                value={searchTerm}
                                onChange={(e) => {
                                    setSearchTerm(e.target.value);
                                    setShowDropdown(true);
                                    if (!e.target.value) {
                                        setSelectedItem(null);
                                        setDescription('');
                                        setSavedDescription('');
                                        setImageSlots([1, 2, 3, 4].map(slot => ({ slot, file: null, previewUrl: null, serverUrl: null, originalName: null })));
                                        setSavedImageSlots([1, 2, 3, 4].map(slot => ({ slot, file: null, previewUrl: null, serverUrl: null, originalName: null })));
                                    }
                                }}
                                onFocus={() => searchTerm && setShowDropdown(true)}
                            />
                            <button 
                                onClick={() => setShowScanner(true)}
                                className="absolute right-2 top-2 p-1.5 bg-indigo-50 hover:bg-indigo-100 text-indigo-600 rounded-lg transition-colors"
                                title="Scan Barcode"
                            >
                                <Camera size={15} />
                            </button>
                            {searchLoading && (
                                <Loader className="absolute right-10 top-2.5 text-indigo-400 animate-spin" size={15} />
                            )}
                        </div>
                        {showScanner && (
                            <div className="z-50 relative">
                                <BarcodeScanner
                                    onResult={(text) => {
                                        setSearchTerm(text);
                                        searchItems(text);
                                        setShowDropdown(true);
                                        setShowScanner(false);
                                    }}
                                    onClose={() => setShowScanner(false)}
                                />
                            </div>
                        )}

                        {/* Dropdown */}
                        {showDropdown && searchResults.length > 0 && (
                            <div className="absolute top-full left-0 right-0 mt-1 bg-white border border-slate-200 rounded-xl shadow-2xl max-h-56 overflow-y-auto z-30">
                                {searchResults.map((item) => (
                                    <button
                                        key={item.masterid}
                                        className="w-full px-3 py-2.5 text-left hover:bg-indigo-50 border-b border-slate-50 last:border-0 transition-colors"
                                        onClick={() => handleSelectItem(item)}
                                    >
                                        <div className="font-bold text-[13px] text-slate-800 truncate">{item.name}</div>
                                        <div className="flex items-center gap-2 mt-0.5">
                                            <span className="text-[10px] font-medium text-slate-400">{item.parent}</span>
                                            <span className="text-[10px] text-slate-300">•</span>
                                            <span className="text-[10px] font-mono text-slate-400">{item.ats_barcode}</span>
                                        </div>
                                    </button>
                                ))}
                            </div>
                        )}
                    </div>

                    {/* Selected Item Info Card */}
                    {selectedItem && (
                        <div className="bg-gradient-to-r from-indigo-50 via-violet-50 to-purple-50 border border-indigo-100/60 rounded-2xl p-3.5" style={{ animation: 'fadeInUp 0.3s ease-out' }}>
                            <div className="flex items-start justify-between gap-2">
                                <div className="flex-1 min-w-0">
                                    <div className="flex items-center gap-1.5 mb-1 flex-wrap">
                                        <span className="text-[9px] font-bold bg-white/80 text-indigo-600 px-1.5 py-0.5 rounded-full border border-indigo-100">{selectedItem.parent || 'Item'}</span>
                                        {selectedItem.gst && <span className="text-[9px] font-bold text-orange-600 bg-orange-50 px-1.5 py-0.5 rounded-full border border-orange-100">GST {selectedItem.gst}%</span>}
                                    </div>
                                    <div className="flex items-start justify-between group mt-0.5">
                                        {isEditingName ? (
                                            <input
                                                type="text"
                                                autoFocus
                                                value={itemName}
                                                onChange={(e) => setItemName(e.target.value)}
                                                onBlur={() => { if (!itemName) setItemName(savedItemName); setIsEditingName(false); }}
                                                className="font-bold text-slate-800 text-[13px] leading-tight bg-white border border-indigo-200 rounded px-1.5 py-0.5 outline-none focus:ring-2 focus:ring-indigo-500 w-full"
                                            />
                                        ) : (
                                            <div 
                                                className="flex items-center gap-1.5 cursor-pointer" 
                                                onClick={() => setIsEditingName(true)}
                                            >
                                                <h3 className="font-bold text-slate-800 text-[13px] leading-tight">{itemName || selectedItem.name}</h3>
                                                <Pencil size={12} className="text-slate-400 group-hover:text-indigo-600 transition-colors shrink-0" />
                                            </div>
                                        )}
                                    </div>
                                    <div className="flex items-center gap-2 mt-1 text-[11px] text-slate-500">
                                        <span className="font-semibold">₹{selectedItem.default_mrp}/{selectedItem.base_units}</span>
                                        <span className="font-mono text-slate-400 text-[10px]">{selectedItem.ats_barcode}</span>
                                    </div>
                                </div>
                                <div className="font-bold text-indigo-700 bg-white/80 px-2.5 py-1 rounded-lg text-[13px] border border-indigo-100 shrink-0">
                                    {selectedItem.closing_balance || '0'} <span className="text-[9px] text-indigo-400 font-medium">{selectedItem.base_units}</span>
                                </div>
                            </div>
                        </div>
                    )}

                    {loading && (
                        <div className="flex justify-center py-10">
                            <div className="w-10 h-10 border-3 border-indigo-100 border-t-indigo-500 rounded-full animate-spin"></div>
                        </div>
                    )}

                    {selectedItem && !loading && (
                        <>
                            {/* Description Section - Editable */}
                            <div style={{ animation: 'fadeInUp 0.3s ease-out 0.1s both' }}>
                                <div className="flex items-center justify-between mb-1.5">
                                    <label className="text-xs font-bold text-slate-500 uppercase tracking-wider">Item Description</label>
                                    {!isEditingDesc && (
                                        <button
                                            onClick={() => setIsEditingDesc(true)}
                                            className="flex items-center gap-1 text-[11px] font-bold text-indigo-600 hover:text-indigo-700 px-2 py-1 rounded-lg hover:bg-indigo-50 transition-all active:scale-95"
                                        >
                                            <Pencil size={12} />
                                            Edit
                                        </button>
                                    )}
                                </div>
                                {isEditingDesc ? (
                                    <textarea
                                        autoFocus
                                        className="w-full bg-white border-2 border-indigo-200 rounded-xl p-3 text-sm font-medium focus:ring-2 focus:ring-indigo-500 focus:border-indigo-300 outline-none shadow-sm transition-all resize-none"
                                        rows={3}
                                        placeholder="Add a description about this item..."
                                        value={description}
                                        onChange={(e) => setDescription(e.target.value)}
                                        onBlur={() => { if (!description && !savedDescription) setIsEditingDesc(false); }}
                                    />
                                ) : (
                                    <div
                                        onClick={() => setIsEditingDesc(true)}
                                        className="w-full bg-white border border-slate-200 rounded-xl p-3 text-sm min-h-[48px] cursor-pointer hover:border-indigo-200 hover:bg-indigo-50/30 transition-all"
                                    >
                                        {description ? (
                                            <span className="text-slate-700 font-medium">{description}</span>
                                        ) : (
                                            <span className="text-slate-400 italic text-[13px]">Tap to add description...</span>
                                        )}
                                    </div>
                                )}
                            </div>

                            {/* Image Upload Section - Compact 4-in-a-row */}
                            <div style={{ animation: 'fadeInUp 0.3s ease-out 0.2s both' }}>
                                <label className="text-xs font-bold text-slate-500 uppercase tracking-wider mb-2 block">Product Images</label>
                                <div className="grid grid-cols-4 gap-2">
                                    {imageSlots.map((slot, index) => (
                                        <div
                                            key={slot.slot}
                                            className="relative bg-white border-2 border-dashed border-slate-200 rounded-xl aspect-square flex flex-col items-center justify-center overflow-hidden hover:border-indigo-300 transition-all group cursor-pointer"
                                            onClick={() => { if (!slot.previewUrl) fileInputRefs.current[index]?.click(); }}
                                        >
                                            {/* Slot Badge */}
                                            <div className="absolute top-1 left-1 w-4 h-4 rounded-full bg-slate-800/60 flex items-center justify-center z-10">
                                                <span className="text-[8px] font-bold text-white">{slot.slot}</span>
                                            </div>

                                            {slot.previewUrl ? (
                                                <>
                                                    <img
                                                        src={slot.previewUrl}
                                                        alt={`Image ${slot.slot}`}
                                                        className="w-full h-full object-cover"
                                                    />
                                                    {/* Remove */}
                                                    <button
                                                        onClick={(e) => { e.stopPropagation(); handleRemoveImage(index); }}
                                                        className="absolute top-1 right-1 w-5 h-5 bg-red-500/90 text-white rounded-full flex items-center justify-center hover:bg-red-600 active:scale-90 transition-all shadow-md"
                                                    >
                                                        <Trash2 size={10} />
                                                    </button>
                                                    {/* Replace: tap image to change */}
                                                    <button
                                                        onClick={(e) => { e.stopPropagation(); fileInputRefs.current[index]?.click(); }}
                                                        className="absolute inset-0 bg-black/0 hover:bg-black/20 transition-all flex items-center justify-center opacity-0 hover:opacity-100"
                                                    >
                                                        <span className="text-white text-[9px] font-bold bg-black/50 px-1.5 py-0.5 rounded">Change</span>
                                                    </button>
                                                    {/* New badge */}
                                                    {slot.file && (
                                                        <div className="absolute bottom-1 left-1">
                                                            <span className="text-[7px] font-bold text-white bg-emerald-500 px-1 py-0.5 rounded shadow">NEW</span>
                                                        </div>
                                                    )}
                                                </>
                                            ) : (
                                                <div className="flex flex-col items-center gap-0.5 text-slate-300">
                                                    <ImagePlus size={16} />
                                                    <span className="text-[8px] font-bold">Add</span>
                                                </div>
                                            )}

                                            <input
                                                ref={(el) => { fileInputRefs.current[index] = el; }}
                                                type="file"
                                                accept="image/*"
                                                className="hidden"
                                                onChange={(e) => {
                                                    if (e.target.files?.[0]) {
                                                        handleImageUpload(index, e.target.files[0]);
                                                        e.target.value = '';
                                                    }
                                                }}
                                            />
                                        </div>
                                    ))}
                                </div>
                            </div>
                        </>
                    )}
                </div>
            </div>

            {/* Bottom Action Bar - Always on top of everything */}
            {selectedItem && !loading && (
                <div className="shrink-0 bg-white border-t border-slate-200 px-4 pt-3 pb-[5.5rem] flex gap-3 shadow-[0_-4px_20px_rgba(0,0,0,0.08)]" style={{ animation: 'fadeInUp 0.3s ease-out' }}>
                    <button
                        onClick={handleDiscard}
                        disabled={!hasChanges || saving}
                        className="flex-1 flex items-center justify-center gap-1.5 bg-slate-100 text-slate-600 py-3 rounded-xl font-bold text-[13px] hover:bg-slate-200 disabled:opacity-30 transition-all active:scale-[0.97]"
                    >
                        <Undo2 size={15} />
                        Discard
                    </button>
                    <button
                        onClick={handleSave}
                        disabled={!hasChanges || saving}
                        className="flex-1 flex items-center justify-center gap-1.5 bg-indigo-600 text-white py-3 rounded-xl font-bold text-[13px] hover:bg-indigo-700 disabled:opacity-30 transition-all active:scale-[0.97] shadow-lg shadow-indigo-200/50"
                    >
                        {saving ? (
                            <Loader className="animate-spin" size={15} />
                        ) : (
                            <Save size={15} />
                        )}
                        {saving ? 'Saving...' : 'Save'}
                    </button>
                </div>
            )}
        </div>
    );
}
