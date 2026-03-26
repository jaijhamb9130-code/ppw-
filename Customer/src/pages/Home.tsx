import { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { ArrowRight, ChevronLeft, ChevronRight, Truck, RefreshCw, Shield, Tag, Zap } from 'lucide-react';
import ProductCard, { type Product } from '../components/ProductCard';

/* ── DATA ── */

const BANNERS = [
  {
    tag: 'Fast Delivery',
    title: 'Stationery at your door in 10 mins',
    sub: 'Notebooks, pens, geometry & more — up to 40% off',
    cta: 'Shop Now',
    link: '/products',
    emoji: '🎒',
    bg: '#F8C420',
    tagBg: 'rgba(0,0,0,0.12)',
    tagColor: '#1C1C1C',
    textColor: '#1C1C1C',
    subColor: 'rgba(28,28,28,0.65)',
  },
  {
    tag: 'Office Essentials',
    title: 'Stock your office the smart way',
    sub: 'Staplers, A4 reams & printer supplies at bulk prices',
    cta: 'Explore Office',
    link: '/products?category=Office+Supplies',
    emoji: '🗂️',
    bg: '#0C831F',
    tagBg: 'rgba(255,255,255,0.2)',
    tagColor: 'white',
    textColor: 'white',
    subColor: 'rgba(255,255,255,0.75)',
  },
  {
    tag: 'Art Supplies',
    title: 'Unleash your creativity',
    sub: 'Premium brushes, colors, canvases and craft kits',
    cta: 'Shop Art',
    link: '/products?category=Art+%26+Craft',
    emoji: '🎨',
    bg: '#1C1C1C',
    tagBg: 'rgba(248,196,32,0.2)',
    tagColor: '#F8C420',
    textColor: 'white',
    subColor: 'rgba(255,255,255,0.65)',
  },
];

const CATEGORIES = [
  { name: 'Writing',   full: 'Writing Instruments', emoji: '✏️', bg: '#FFF9E6' },
  { name: 'Notebooks', full: 'Notebooks & Diaries',  emoji: '📒', bg: '#FFF3E0' },
  { name: 'Art',       full: 'Art & Craft',           emoji: '🎨', bg: '#FCE4EC' },
  { name: 'Office',    full: 'Office Supplies',       emoji: '📎', bg: '#E8F5E9' },
  { name: 'Paper',     full: 'Paper Products',        emoji: '📄', bg: '#E3F2FD' },
  { name: 'Geometry',  full: 'Geometry & Math',       emoji: '📐', bg: '#EDE7F6' },
  { name: 'Files',     full: 'Files & Folders',       emoji: '📁', bg: '#FFF8E1' },
  { name: 'Bags',      full: 'Bags & Pouches',        emoji: '🎒', bg: '#F3E5F5' },
];

const PERKS = [
  { icon: <Truck size={16} strokeWidth={2.5} />,     title: 'Express Delivery', desc: 'Fast dispatch available' },
  { icon: <Truck size={16} strokeWidth={2.5} />,     title: 'Free Delivery',   desc: 'Above ₹499' },
  { icon: <Tag size={16} strokeWidth={2.5} />,       title: 'Bulk Discounts',  desc: 'Buy more, save more' },
  { icon: <RefreshCw size={16} strokeWidth={2.5} />, title: 'Easy Returns',    desc: '7-day policy' },
  { icon: <Shield size={16} strokeWidth={2.5} />,    title: '100% Genuine',    desc: 'Authentic products' },
];

const BEST_SELLERS: Product[] = [
  { id: 1, name: 'Classmate Notebook 200pg — A5 Single Line', price: 49,  mrp: 65,  category: 'Notebooks & Diaries', rating: 4.5, reviews: 2341, unit: '1 pc' },
  { id: 2, name: 'Reynolds Trimax Pen — Pack of 10 (Blue)',   price: 89,  mrp: 110, category: 'Writing Instruments',  rating: 4.3, reviews: 5672, unit: 'Pack of 10' },
  { id: 3, name: 'Camlin Geometry Box — 9 Piece Set',         price: 129, mrp: 180, category: 'Geometry & Math',      rating: 4.6, reviews: 1890, unit: '1 set' },
  { id: 4, name: 'Faber-Castell Colour Pencils — 24 Shades',  price: 249, mrp: 340, category: 'Art & Craft',          rating: 4.7, reviews: 3210, unit: '1 tin box' },
  { id: 5, name: 'JK Copier A4 Paper — 500 Sheets 75 GSM',   price: 299, mrp: 380, category: 'Paper Products',       rating: 4.4, reviews: 7823, unit: '1 ream' },
  { id: 6, name: 'Solo Ring Binder File — A4 Blue (5 Pack)',  price: 199, mrp: 275, category: 'Files & Folders',      rating: 4.2, reviews: 934,  unit: 'Pack of 5' },
  { id: 7, name: 'Apsara Platinum Extra Dark — Set of 10',    price: 35,  mrp: 50,  category: 'Writing Instruments',  rating: 4.6, reviews: 4521, unit: 'Pack of 10' },
  { id: 8, name: 'Staedtler Noris Highlighters — 4 Neon',    price: 145, mrp: 199, category: 'Writing Instruments',  rating: 4.5, reviews: 1234, unit: '1 set' },
];

const NEW_ARRIVALS: Product[] = [
  { id: 9,  name: 'Luxor Ink Pen with Cartridges — Blue/Black', price: 179, mrp: 249, category: 'Writing Instruments', rating: 4.4, reviews: 892,  unit: '1 pc' },
  { id: 10, name: 'Navneet Youva Spiral Notebook — 300pg B5',   price: 89,  mrp: 120, category: 'Notebooks & Diaries', rating: 4.3, reviews: 1567, unit: '1 pc' },
  { id: 11, name: 'Camel Student Water Colors — 18 Shades',     price: 99,  mrp: 140, category: 'Art & Craft',          rating: 4.5, reviews: 2109, unit: '1 box' },
  { id: 12, name: 'Kangaro Stapler HD-10 with 1000 Staples',    price: 159, mrp: 225, category: 'Office Supplies',      rating: 4.6, reviews: 3402, unit: '1 pc' },
];

/* ── COMPONENT ── */

export default function Home() {
  const [bannerIdx, setBannerIdx] = useState(0);

  useEffect(() => {
    const t = setInterval(() => setBannerIdx(i => (i + 1) % BANNERS.length), 4500);
    return () => clearInterval(t);
  }, []);

  const b = BANNERS[bannerIdx];

  return (
    <div className="min-h-screen pb-4 md:pb-8" style={{ background: '#F2F2F2' }}>

      {/* ═══════════ 1. HERO BANNER ═══════════ */}
      <div className="px-3 sm:px-4 pt-3 max-w-7xl mx-auto">
        <div
          className="relative rounded-2xl overflow-hidden transition-colors duration-500"
          style={{ background: b.bg, minHeight: 156 }}
        >
          <div className="flex items-center px-5 py-6 sm:px-8 sm:py-8 md:px-10 gap-4 md:gap-8">
            {/* Text */}
            <div className="flex-1 min-w-0">
              <span className="inline-flex items-center gap-1 text-[10px] font-extrabold px-2.5 py-1 rounded-full mb-2"
                style={{ background: b.tagBg, color: b.tagColor }}>
                ⚡ {b.tag}
              </span>
              <h2 className="text-xl sm:text-2xl md:text-3xl font-extrabold leading-tight mb-1.5"
                style={{ color: b.textColor }}>
                {b.title}
              </h2>
              <p className="text-xs sm:text-sm font-medium mb-4 line-clamp-2"
                style={{ color: b.subColor, maxWidth: '38ch' }}>
                {b.sub}
              </p>
              <Link to={b.link}
                className="inline-flex items-center gap-1.5 px-5 py-2.5 rounded-xl text-sm font-extrabold transition-all hover:opacity-90 active:scale-95"
                style={{ background: 'white', color: '#1C1C1C', boxShadow: '0 2px 8px rgba(0,0,0,0.12)' }}>
                {b.cta} <ArrowRight size={14} />
              </Link>
            </div>
            {/* Emoji illustration */}
            <div className="flex-shrink-0 flex items-center justify-center w-20 sm:w-28 md:w-36">
              <span className="text-6xl sm:text-7xl md:text-[96px] select-none drop-shadow-lg leading-none block">
                {b.emoji}
              </span>
            </div>
          </div>

          {/* Dots */}
          <div className="absolute bottom-2.5 left-1/2 -translate-x-1/2 flex gap-1.5 z-10">
            {BANNERS.map((_, i) => (
              <button key={i} onClick={() => setBannerIdx(i)}
                className="rounded-full transition-all duration-300"
                style={{
                  width: i === bannerIdx ? 16 : 5,
                  height: 5,
                  background: i === bannerIdx ? 'rgba(255,255,255,0.95)' : 'rgba(255,255,255,0.4)',
                }} />
            ))}
          </div>

          {/* Arrows — desktop only */}
          <button onClick={() => setBannerIdx(i => (i - 1 + BANNERS.length) % BANNERS.length)}
            className="hidden md:flex absolute left-3 top-1/2 -translate-y-1/2 w-8 h-8 rounded-full items-center justify-center z-20 bg-white/80 hover:bg-white transition-all">
            <ChevronLeft size={16} strokeWidth={2.5} />
          </button>
          <button onClick={() => setBannerIdx(i => (i + 1) % BANNERS.length)}
            className="hidden md:flex absolute right-3 top-1/2 -translate-y-1/2 w-8 h-8 rounded-full items-center justify-center z-20 bg-white/80 hover:bg-white transition-all">
            <ChevronRight size={16} strokeWidth={2.5} />
          </button>
        </div>
      </div>

      {/* ═══════════ 2. PERKS STRIP ═══════════ */}
      <div className="px-3 sm:px-4 pt-3 max-w-7xl mx-auto">
        <div className="bg-white rounded-xl overflow-x-auto scrollbar-hide" style={{ border: '1px solid #E8E8E8' }}>
          <div className="flex min-w-max md:min-w-0" style={{ borderColor: '#F2F2F2' }}>
            {PERKS.map((p, i) => (
              <div key={p.title}
                className="flex items-center gap-2 px-4 py-3 flex-shrink-0"
                style={{ borderLeft: i > 0 ? '1px solid #F2F2F2' : 'none' }}>
                <div className="w-7 h-7 rounded-lg flex items-center justify-center flex-shrink-0"
                  style={{ background: '#EFF7EF', color: '#0C831F' }}>
                  {p.icon}
                </div>
                <div>
                  <p className="text-[11px] font-bold leading-tight text-gray-900">{p.title}</p>
                  <p className="text-[10px] leading-tight" style={{ color: '#9E9E9E' }}>{p.desc}</p>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* ═══════════ 3. CATEGORIES ═══════════ */}
      <div className="px-3 sm:px-4 pt-3 max-w-7xl mx-auto">
        <div className="bg-white rounded-2xl p-4" style={{ border: '1px solid #E8E8E8' }}>
          <SectionHeader title="Shop by Category" link="/products" />
          <div className="flex gap-2.5 overflow-x-auto scrollbar-hide pb-1 snap-x md:grid md:grid-cols-8 md:overflow-visible">
            {CATEGORIES.map(cat => (
              <Link
                key={cat.name}
                to={`/products?category=${encodeURIComponent(cat.full)}`}
                className="flex flex-col items-center gap-2 py-3 px-2 rounded-xl transition-all hover:-translate-y-0.5 hover:shadow-sm group snap-start flex-shrink-0"
                style={{ minWidth: 70, background: cat.bg }}
              >
                <span className="text-2xl sm:text-3xl group-hover:scale-110 transition-transform duration-200 leading-none">
                  {cat.emoji}
                </span>
                <span className="text-[10px] font-bold text-center leading-tight text-gray-800 whitespace-nowrap">
                  {cat.name}
                </span>
              </Link>
            ))}
          </div>
        </div>
      </div>

      {/* ═══════════ 4. BEST SELLERS ═══════════ */}
      <div className="px-3 sm:px-4 pt-3 max-w-7xl mx-auto">
        <div className="bg-white rounded-2xl p-4" style={{ border: '1px solid #E8E8E8' }}>
          <SectionHeader title="Best Sellers" badge="🔥 HOT" link="/products" />
          <div className="flex gap-3 overflow-x-auto scrollbar-hide pb-1 snap-x md:grid md:grid-cols-4 md:overflow-visible md:gap-4">
            {BEST_SELLERS.map(p => (
              <div key={p.id} className="snap-start flex-shrink-0 w-[44vw] sm:w-[38vw] md:w-auto">
                <ProductCard product={p} />
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* ═══════════ 5. BULK ORDER BANNER ═══════════ */}
      <div className="px-3 sm:px-4 pt-3 max-w-7xl mx-auto">
        <div className="rounded-2xl overflow-hidden" style={{ background: '#1C1C1C' }}>
          <div className="flex flex-col md:flex-row items-start md:items-center justify-between gap-4 px-5 py-6 md:px-8 md:py-7">
            <div>
              <span className="inline-block text-[9px] font-extrabold uppercase tracking-widest px-2.5 py-1 rounded-md mb-2"
                style={{ background: 'rgba(248,196,32,0.15)', color: '#F8C420' }}>
                Bulk Order Benefits
              </span>
              <h3 className="text-lg md:text-xl font-extrabold text-white mb-1">
                Ordering for your school or office?
              </h3>
              <p className="text-xs md:text-sm font-medium" style={{ color: 'rgba(255,255,255,0.5)' }}>
                Up to 25% off on orders above ₹2,000 — with dedicated account support.
              </p>
            </div>
            <div className="flex gap-2.5 flex-shrink-0">
              <Link to="/products"
                className="flex items-center gap-1.5 px-5 py-2.5 rounded-xl text-xs font-bold whitespace-nowrap transition-all hover:opacity-90"
                style={{ background: '#F8C420', color: '#1C1C1C' }}>
                <Zap size={13} /> Shop Bulk
              </Link>
              <Link to="/products"
                className="flex items-center gap-1.5 px-5 py-2.5 rounded-xl text-xs font-bold whitespace-nowrap"
                style={{ background: 'rgba(255,255,255,0.08)', color: 'white', border: '1px solid rgba(255,255,255,0.12)' }}>
                Learn More <ArrowRight size={12} />
              </Link>
            </div>
          </div>
        </div>
      </div>

      {/* ═══════════ 6. NEW ARRIVALS ═══════════ */}
      <div className="px-3 sm:px-4 pt-3 max-w-7xl mx-auto">
        <div className="bg-white rounded-2xl p-4" style={{ border: '1px solid #E8E8E8' }}>
          <SectionHeader title="New Arrivals" badge="✨ NEW" link="/products" />
          <div className="flex gap-3 overflow-x-auto scrollbar-hide pb-1 snap-x md:grid md:grid-cols-4 md:overflow-visible md:gap-4">
            {NEW_ARRIVALS.map(p => (
              <div key={p.id} className="snap-start flex-shrink-0 w-[44vw] sm:w-[38vw] md:w-auto">
                <ProductCard product={p} />
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* ═══════════ 7. WHY PPW ═══════════ */}
      <div className="px-3 sm:px-4 pt-3 max-w-7xl mx-auto">
        <div className="bg-white rounded-2xl overflow-hidden" style={{ border: '1px solid #E8E8E8' }}>
          <div className="px-5 py-4 text-center" style={{ background: '#EFF7EF', borderBottom: '1px solid #E8E8E8' }}>
            <p className="text-[9px] font-extrabold uppercase tracking-widest mb-0.5" style={{ color: '#0C831F' }}>
              Why choose us
            </p>
            <h2 className="text-base md:text-xl font-extrabold text-gray-900">
              Trusted by 500+ schools & offices
            </h2>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-3" style={{ borderColor: '#F2F2F2' }}>
            {[
              { emoji: '🏭', title: 'Direct from Distributors', desc: 'Source straight from manufacturers for maximum savings.' },
              { emoji: '⚡', title: 'Same-day Dispatch',         desc: 'Orders before 2 PM dispatched the same working day.' },
              { emoji: '🤝', title: 'Institution Accounts',      desc: 'Special pricing and credit for schools and offices.' },
            ].map((item, i) => (
              <div key={item.title}
                className="flex flex-col items-center text-center px-5 py-6"
                style={{ borderTop: i > 0 ? '1px solid #F2F2F2' : 'none' }}>
                <span className="text-3xl mb-2">{item.emoji}</span>
                <h3 className="text-xs font-extrabold mb-1 text-gray-900">{item.title}</h3>
                <p className="text-[11px] leading-relaxed" style={{ color: '#666666' }}>{item.desc}</p>
              </div>
            ))}
          </div>
        </div>
      </div>

    </div>
  );
}

/* ── Section Header ── */
function SectionHeader({ title, badge, link }: { title: string; badge?: string; link: string }) {
  return (
    <div className="flex items-center justify-between mb-3 gap-2">
      <div className="flex items-center gap-2">
        <span className="w-1 h-5 rounded-full flex-shrink-0" style={{ background: '#0C831F' }} />
        <h2 className="text-sm md:text-base font-extrabold text-gray-900">{title}</h2>
        {badge && (
          <span className="text-[9px] font-bold px-1.5 py-0.5 rounded-md"
            style={{ background: '#EFF7EF', color: '#0C831F' }}>
            {badge}
          </span>
        )}
      </div>
      <Link to={link}
        className="flex items-center gap-1 text-[11px] font-bold transition-all hover:gap-1.5 flex-shrink-0"
        style={{ color: '#0C831F' }}>
        See all <ArrowRight size={11} />
      </Link>
    </div>
  );
}
