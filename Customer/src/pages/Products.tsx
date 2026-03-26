import { useState, useEffect } from 'react';
import { useSearchParams } from 'react-router-dom';
import { SlidersHorizontal, X } from 'lucide-react';
import ProductCard, { type Product } from '../components/ProductCard';

const CATEGORIES = [
  { name: 'All',                  emoji: '🛒' },
  { name: 'Writing Instruments',  emoji: '✏️' },
  { name: 'Notebooks & Diaries',  emoji: '📒' },
  { name: 'Art & Craft',          emoji: '🎨' },
  { name: 'Office Supplies',      emoji: '📎' },
  { name: 'Paper Products',       emoji: '📄' },
  { name: 'Geometry & Math',      emoji: '📐' },
  { name: 'Files & Folders',      emoji: '📁' },
  { name: 'Bags & Pouches',       emoji: '🎒' },
];

const SORT_OPTIONS = [
  { label: 'Relevance',          value: 'relevance' },
  { label: 'Price: Low to High', value: 'price_asc' },
  { label: 'Price: High to Low', value: 'price_desc' },
  { label: 'Top Rated',          value: 'rating' },
];

const MOCK: Product[] = [
  { id: 1,  name: 'Classmate Notebook 200 Pages A5 — Single Line',      price: 49,  mrp: 65,  category: 'Notebooks & Diaries',  rating: 4.5, reviews: 2341, unit: '1 pc' },
  { id: 2,  name: 'Reynolds Trimax Ball Pen Blue — Pack of 10',          price: 89,  mrp: 110, category: 'Writing Instruments',   rating: 4.3, reviews: 5672, unit: 'Pack of 10' },
  { id: 3,  name: 'Camlin Geometry Box 9 Piece Set',                     price: 129, mrp: 180, category: 'Geometry & Math',       rating: 4.6, reviews: 1890, unit: '1 set' },
  { id: 4,  name: 'Faber-Castell Colour Pencils 24 Shades Tin Box',      price: 249, mrp: 340, category: 'Art & Craft',            rating: 4.7, reviews: 3210, unit: '1 tin box' },
  { id: 5,  name: 'JK Copier A4 Paper 500 Sheets 75 GSM',                price: 299, mrp: 380, category: 'Paper Products',         rating: 4.4, reviews: 7823, unit: '1 ream' },
  { id: 6,  name: 'Solo Ring Binder File A4 — Pack of 5 Blue',           price: 199, mrp: 275, category: 'Files & Folders',        rating: 4.2, reviews: 934,  unit: 'Pack of 5' },
  { id: 7,  name: 'Apsara Platinum Extra Dark Pencils — Set of 10',      price: 35,  mrp: 50,  category: 'Writing Instruments',   rating: 4.6, reviews: 4521, unit: 'Pack of 10' },
  { id: 8,  name: 'Staedtler Noris Highlighters 4 Neon Colors',          price: 145, mrp: 199, category: 'Writing Instruments',   rating: 4.5, reviews: 1234, unit: '1 set' },
  { id: 9,  name: 'Luxor Ink Pen with Cartridges Blue/Black',            price: 179, mrp: 249, category: 'Writing Instruments',   rating: 4.4, reviews: 892,  unit: '1 pc' },
  { id: 10, name: 'Navneet Youva Spiral Notebook 300 Pages B5',          price: 89,  mrp: 120, category: 'Notebooks & Diaries',  rating: 4.3, reviews: 1567, unit: '1 pc' },
  { id: 11, name: 'Camel Student Water Colors 18 Shades Box',            price: 99,  mrp: 140, category: 'Art & Craft',            rating: 4.5, reviews: 2109, unit: '1 box' },
  { id: 12, name: 'Kangaro Stapler HD-10 with 1000 Staples',             price: 159, mrp: 225, category: 'Office Supplies',        rating: 4.6, reviews: 3402, unit: '1 pc' },
  { id: 13, name: 'Cello Butterflow Pens Assorted Colors Pack of 5',     price: 55,  mrp: 75,  category: 'Writing Instruments',   rating: 4.2, reviews: 2876, unit: 'Pack of 5' },
  { id: 14, name: 'Classmate 5 Subject Spiral Notebook A4 — 300 Pages', price: 149, mrp: 199, category: 'Notebooks & Diaries',  rating: 4.4, reviews: 1890, unit: '1 pc' },
  { id: 15, name: 'Fevicol MR Adhesive 1kg White',                       price: 189, mrp: 240, category: 'Office Supplies',        rating: 4.7, reviews: 6721, unit: '1 kg' },
  { id: 16, name: 'Rorito Eraser White Dust-Free — Pack of 20',          price: 79,  mrp: 100, category: 'Writing Instruments',   rating: 4.1, reviews: 543,  unit: 'Pack of 20' },
  { id: 17, name: 'Camlin Drawing Brushes Set of 7 Sizes',               price: 119, mrp: 160, category: 'Art & Craft',            rating: 4.6, reviews: 1023, unit: '1 set' },
  { id: 18, name: 'Lexi Pen Classic Ball Pens Blue — Box of 50',         price: 175, mrp: 250, category: 'Writing Instruments',   rating: 4.5, reviews: 4302, unit: 'Box of 50' },
  { id: 19, name: 'Transparent PVC File Folder A4 — Pack of 10',        price: 129, mrp: 180, category: 'Files & Folders',        rating: 4.3, reviews: 782,  unit: 'Pack of 10' },
  { id: 20, name: 'Cosco School Bag 18 Inch Blue for Class 1–5',        price: 649, mrp: 899, category: 'Bags & Pouches',         rating: 4.2, reviews: 2134, unit: '1 pc' },
  { id: 21, name: 'Nataraj 621 Drawing Pencils HB — Pack of 10',        price: 45,  mrp: 60,  category: 'Writing Instruments',   rating: 4.4, reviews: 3401, unit: 'Pack of 10' },
  { id: 22, name: 'Bilt Copy Power A4 Paper 70 GSM — 500 Sheets',       price: 249, mrp: 330, category: 'Paper Products',         rating: 4.3, reviews: 5432, unit: '1 ream' },
  { id: 23, name: 'Staedtler Ruler 30cm Anti-Slip — Clear',             price: 59,  mrp: 80,  category: 'Geometry & Math',       rating: 4.5, reviews: 923,  unit: '1 pc' },
  { id: 24, name: 'Zipit Pencil Pouch Double Layer — Assorted Colors',  price: 199, mrp: 280, category: 'Bags & Pouches',         rating: 4.3, reviews: 1567, unit: '1 pc' },
];

export default function Products() {
  const [searchParams, setSearchParams] = useSearchParams();
  const [sort, setSort]         = useState('relevance');
  const [maxPrice, setMaxPrice] = useState(1500);
  const [minRating, setMinRating] = useState(0);
  const [filtersOpen, setFilters] = useState(false);
  const [filtered, setFiltered] = useState<Product[]>(MOCK);

  const search   = searchParams.get('search')   ?? '';
  const category = searchParams.get('category') ?? 'All';

  useEffect(() => {
    let r = [...MOCK];
    if (search)                     r = r.filter(p => p.name.toLowerCase().includes(search.toLowerCase()));
    if (category && category !== 'All') r = r.filter(p => p.category === category);
    r = r.filter(p => p.price <= maxPrice);
    if (minRating > 0)              r = r.filter(p => (p.rating ?? 0) >= minRating);
    if (sort === 'price_asc')       r.sort((a, b) => a.price - b.price);
    else if (sort === 'price_desc') r.sort((a, b) => b.price - a.price);
    else if (sort === 'rating')     r.sort((a, b) => (b.rating ?? 0) - (a.rating ?? 0));
    setFiltered(r);
  }, [search, category, sort, maxPrice, minRating]);

  const setCategory = (cat: string) => {
    const p = new URLSearchParams(searchParams);
    cat === 'All' ? p.delete('category') : p.set('category', cat);
    setSearchParams(p);
  };

  const hasFilters = category !== 'All' || !!search || minRating > 0 || maxPrice < 1500;

  return (
    <div className="max-w-7xl mx-auto px-3 sm:px-4 py-3">

      {/* ── Top bar ── */}
      <div className="flex items-center justify-between mb-3 gap-2">
        <div>
          <h1 className="text-base font-extrabold text-gray-900">
            {search ? `Results for "${search}"` : category !== 'All' ? category : 'All Products'}
          </h1>
          <p className="text-xs" style={{ color: '#9E9E9E' }}>{filtered.length} products</p>
        </div>
        <div className="flex items-center gap-2">
          <select value={sort} onChange={e => setSort(e.target.value)}
            className="text-sm font-medium rounded-lg px-3 py-1.5 outline-none bg-white"
            style={{ border: '1px solid #E8E8E8', color: '#1C1C1C' }}>
            {SORT_OPTIONS.map(o => <option key={o.value} value={o.value}>{o.label}</option>)}
          </select>
          <button onClick={() => setFilters(!filtersOpen)}
            className="md:hidden flex items-center gap-1.5 text-sm font-semibold px-3 py-1.5 rounded-lg bg-white"
            style={{ border: '1px solid #E8E8E8', color: '#1C1C1C' }}>
            <SlidersHorizontal size={14} /> Filters
          </button>
        </div>
      </div>

      <div className="flex gap-3">

        {/* ── Category Sidebar (Blinkit-style vertical) ── */}
        <aside
          className={`${filtersOpen ? 'block' : 'hidden'} md:block flex-shrink-0`}
          style={{ width: 200 }}
        >
          {/* Categories */}
          <div className="bg-white rounded-xl overflow-hidden mb-3" style={{ border: '1px solid #E8E8E8' }}>
            <div className="px-3 py-2.5" style={{ borderBottom: '1px solid #F2F2F2' }}>
              <h3 className="text-xs font-extrabold text-gray-900 uppercase tracking-wide">Category</h3>
            </div>
            <ul>
              {CATEGORIES.map(cat => {
                const active = category === cat.name;
                return (
                  <li key={cat.name}>
                    <button
                      onClick={() => setCategory(cat.name)}
                      className="flex items-center gap-2.5 w-full text-left px-3 py-2.5 text-sm font-medium transition-colors"
                      style={{
                        background: active ? '#F8C420' : 'transparent',
                        color: active ? '#1C1C1C' : '#444444',
                        fontWeight: active ? 700 : 500,
                        borderLeft: active ? '3px solid #0C831F' : '3px solid transparent',
                      }}
                    >
                      <span>{cat.emoji}</span>
                      <span className="truncate">{cat.name === 'All' ? 'All Products' : cat.name}</span>
                    </button>
                  </li>
                );
              })}
            </ul>
          </div>

          {/* Price filter */}
          <div className="bg-white rounded-xl p-3 mb-3" style={{ border: '1px solid #E8E8E8' }}>
            <h3 className="text-xs font-extrabold text-gray-900 uppercase tracking-wide mb-3">Max Price</h3>
            <input type="range" min={50} max={1500} step={50} value={maxPrice}
              onChange={e => setMaxPrice(Number(e.target.value))}
              className="w-full" style={{ accentColor: '#0C831F' }} />
            <div className="flex justify-between text-xs font-semibold mt-1.5">
              <span style={{ color: '#9E9E9E' }}>₹50</span>
              <span style={{ color: '#0C831F', fontWeight: 700 }}>₹{maxPrice}</span>
            </div>
          </div>

          {/* Rating filter */}
          <div className="bg-white rounded-xl p-3 mb-3" style={{ border: '1px solid #E8E8E8' }}>
            <h3 className="text-xs font-extrabold text-gray-900 uppercase tracking-wide mb-3">Min Rating</h3>
            <div className="space-y-1.5">
              {[0, 3, 4, 4.5].map(r => (
                <label key={r} className="flex items-center gap-2 cursor-pointer">
                  <input type="radio" name="rating" checked={minRating === r}
                    onChange={() => setMinRating(r)}
                    style={{ accentColor: '#0C831F' }} />
                  <span className="text-sm" style={{ color: '#444444' }}>
                    {r === 0 ? 'All ratings' : `${r}★ & above`}
                  </span>
                </label>
              ))}
            </div>
          </div>

          {/* Clear filters */}
          {hasFilters && (
            <button
              onClick={() => {
                setCategory('All'); setMinRating(0); setMaxPrice(1500);
                setSearchParams(new URLSearchParams());
              }}
              className="flex items-center gap-1.5 w-full justify-center text-sm font-bold py-2.5 rounded-xl transition-all"
              style={{ background: 'rgba(226,55,68,0.08)', color: '#E23744', border: '1.5px solid rgba(226,55,68,0.18)' }}>
              <X size={13} /> Clear filters
            </button>
          )}
        </aside>

        {/* ── Product Grid ── */}
        <div className="flex-1 min-w-0">
          {filtered.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-20 rounded-2xl bg-white"
              style={{ border: '1px solid #E8E8E8' }}>
              <span className="text-5xl mb-3">🔍</span>
              <p className="text-base font-extrabold text-gray-900">No products found</p>
              <p className="text-sm mt-1" style={{ color: '#9E9E9E' }}>Try adjusting your filters or search term</p>
            </div>
          ) : (
            <div className="grid grid-cols-2 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-2.5">
              {filtered.map(p => <ProductCard key={p.id} product={p} />)}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
