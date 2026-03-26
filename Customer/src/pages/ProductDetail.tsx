import { useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { Star, ShoppingCart, Zap, ChevronRight, Truck, RefreshCw, Shield, Minus, Plus } from 'lucide-react';
import { useCart } from '../context/CartContext';

const PRODUCTS: Record<number, { name: string; price: number; mrp: number; category: string; unit: string; emoji: string; rating: number; reviews: number; description: string; highlights: string[]; }> = {
  1:  { name: 'Classmate Notebook 200 Pages A5 — Single Line',      price: 49,  mrp: 65,  category: 'Notebooks & Diaries',  unit: 'pcs',  emoji: '📒', rating: 4.5, reviews: 2341, description: 'Premium quality single-line notebook with 200 pages. Acid-free paper for smooth writing. Ideal for school and college students with a sturdy cover that withstands daily use.', highlights: ['200 pages, A5 size', 'Acid-free 60 GSM paper', 'Sturdy laminated cover', 'Single line ruling', 'Ideal for classes 1–10'] },
  2:  { name: 'Reynolds Trimax Ball Pen Blue — Pack of 10',          price: 89,  mrp: 110, category: 'Writing Instruments',  unit: 'pack', emoji: '✏️', rating: 4.3, reviews: 5672, description: 'Smooth-flow Reynolds Trimax ball pens in vibrant blue ink. Ergonomic grip for long writing sessions. Refillable and leak-proof design trusted by students and professionals.', highlights: ['Pack of 10 pens', 'Smooth-flow blue ink', 'Ergonomic grip', 'Leak-proof design', 'Refillable cartridge'] },
  3:  { name: 'Camlin Geometry Box 9 Piece Set',                     price: 129, mrp: 180, category: 'Geometry & Math',      unit: 'pcs',  emoji: '📐', rating: 4.6, reviews: 1890, description: 'Complete 9-piece geometry set including compass, divider, set squares, protractor, and scale. Precision-crafted metal instruments in a premium storage case.', highlights: ['9 precision instruments', 'Metal compass & divider', 'Protractor & set squares', 'Hard storage case', 'Suitable for Class 6+'] },
  4:  { name: 'Faber-Castell Colour Pencils 24 Shades Tin Box',      price: 249, mrp: 340, category: 'Art & Craft',          unit: 'box',  emoji: '🎨', rating: 4.7, reviews: 3210, description: 'Premium Faber-Castell colour pencils in a sturdy tin box. Vibrant, break-resistant leads with smooth laydown. Perfect for students, artists and creative projects.', highlights: ['24 vibrant shades', 'Break-resistant leads', 'Sturdy tin storage box', 'Smooth colour laydown', 'Suitable for all ages'] },
  5:  { name: 'JK Copier A4 Paper 500 Sheets 75 GSM',                price: 299, mrp: 380, category: 'Paper Products',       unit: 'ream', emoji: '📄', rating: 4.4, reviews: 7823, description: 'JK Copier multipurpose A4 paper. 75 GSM weight ensures minimal show-through and jam-free printing on all inkjet and laser printers. Bright white finish for sharp prints.', highlights: ['500 sheets per ream', '75 GSM weight', 'Works with all printers', 'Bright white 102% ISO brightness', 'Acid-free archival quality'] },
};

function getMockProduct(id: number) {
  return PRODUCTS[id] ?? {
    name: `Premium Stationery Item ${id}`, price: 149 + id * 25, mrp: 200 + id * 30,
    category: 'Writing Instruments', unit: 'pcs', emoji: '📦',
    rating: 4.2, reviews: 500 + id * 37,
    description: 'High-quality stationery product for students and office use. Designed for durability and daily performance.',
    highlights: ['Premium quality', 'Durable build', 'Value for money', 'Trusted brand', 'Wide compatibility'],
  };
}

export default function ProductDetail() {
  const { id }    = useParams();
  const navigate  = useNavigate();
  const { addItem, isInCart, getQty, updateQty } = useCart();

  const product   = getMockProduct(Number(id));
  const [qty, setQty] = useState(1);
  const [tab, setTab] = useState<'desc' | 'specs'>('desc');

  const discount  = Math.round(((product.mrp - product.price) / product.mrp) * 100);
  const inCart    = isInCart(Number(id));
  const cartQty   = getQty(Number(id));

  const addToCart = () => addItem({ productId: Number(id), name: product.name, price: product.price, mrp: product.mrp, quantity: qty, unit: product.unit });
  const buyNow    = () => { if (!inCart) addToCart(); navigate('/cart'); };

  return (
    <div className="max-w-5xl mx-auto px-4 py-5">
      {/* Breadcrumb */}
      <nav className="flex items-center gap-1.5 text-xs mb-5 flex-wrap">
        <button onClick={() => navigate('/')} className="font-medium transition-colors hover:underline" style={{ color: '#a96f46' }}>Home</button>
        <ChevronRight size={12} style={{ color: '#a8a29e' }} />
        <button onClick={() => navigate('/products')} className="font-medium transition-colors hover:underline" style={{ color: '#a96f46' }}>Products</button>
        <ChevronRight size={12} style={{ color: '#a8a29e' }} />
        <button onClick={() => navigate(`/products?category=${encodeURIComponent(product.category)}`)} className="font-medium transition-colors hover:underline" style={{ color: '#a96f46' }}>{product.category}</button>
        <ChevronRight size={12} style={{ color: '#a8a29e' }} />
        <span className="truncate max-w-40" style={{ color: '#78716c' }}>{product.name}</span>
      </nav>

      <div className="rounded-3xl p-5 md:p-8" style={{ background: 'white', border: '1.5px solid rgba(193,136,91,0.12)' }}>
        <div className="flex flex-col md:flex-row gap-8">

          {/* Image */}
          <div className="md:w-72 flex-shrink-0">
            <div className="aspect-square rounded-2xl flex items-center justify-center text-8xl"
              style={{ background: '#fdf8f3', border: '1.5px solid rgba(193,136,91,0.15)' }}>
              {product.emoji}
            </div>
            {/* Thumbnail row */}
            <div className="flex gap-2 mt-3">
              {[product.emoji, product.emoji, product.emoji].map((e, i) => (
                <div key={i} className="w-14 h-14 rounded-xl flex items-center justify-center text-2xl cursor-pointer transition-all hover:scale-105"
                  style={{ background: '#fdf8f3', border: `2px solid ${i === 0 ? '#c1885b' : 'rgba(193,136,91,0.2)'}` }}>
                  {e}
                </div>
              ))}
            </div>
          </div>

          {/* Info */}
          <div className="flex-1 min-w-0">
            <p className="text-xs font-bold mb-1 uppercase tracking-wider" style={{ color: '#c1885b' }}>{product.category}</p>
            <h1 className="text-xl font-bold leading-snug mb-3" style={{ color: '#292524' }}>{product.name}</h1>

            {/* Rating */}
            <div className="flex items-center gap-2 mb-4">
              <span className="flex items-center gap-1 text-xs font-bold px-2 py-1 rounded-lg"
                style={{ background: product.rating >= 4 ? '#16a34a' : '#ca8a04', color: 'white' }}>
                {product.rating} <Star size={10} fill="white" />
              </span>
              <span className="text-sm" style={{ color: '#78716c' }}>{product.reviews.toLocaleString()} ratings</span>
              <span className="text-xs px-2 py-0.5 rounded-full font-medium" style={{ background: 'rgba(34,197,94,0.08)', color: '#16a34a' }}>In Stock</span>
            </div>

            {/* Price */}
            <div className="py-4 mb-4" style={{ borderTop: '1.5px solid rgba(193,136,91,0.1)', borderBottom: '1.5px solid rgba(193,136,91,0.1)' }}>
              <div className="flex items-baseline gap-3 mb-1">
                <span className="text-3xl font-bold" style={{ color: '#292524' }}>₹{product.price}</span>
                {discount > 0 && <>
                  <span className="text-base line-through" style={{ color: '#a8a29e' }}>₹{product.mrp}</span>
                  <span className="text-base font-bold" style={{ color: '#16a34a' }}>{discount}% off</span>
                </>}
              </div>
              <p className="text-xs" style={{ color: '#78716c' }}>Inclusive of all taxes</p>
            </div>

            {/* Offers */}
            <div className="mb-4">
              <p className="text-xs font-bold mb-2 uppercase tracking-wider" style={{ color: '#57534e' }}>Available Offers</p>
              <div className="space-y-1.5">
                {['10% off on orders above ₹499', 'Free delivery on this order', 'Buy 3+ notebooks — extra 5% off'].map(offer => (
                  <div key={offer} className="flex items-center gap-2 text-xs font-medium" style={{ color: '#57534e' }}>
                    <span className="w-4 h-4 rounded-full flex items-center justify-center text-white text-xs flex-shrink-0"
                      style={{ background: 'linear-gradient(145deg, #c1885b, #a96f46)' }}>✓</span>
                    {offer}
                  </div>
                ))}
              </div>
            </div>

            {/* Qty */}
            <div className="flex items-center gap-3 mb-5">
              <span className="text-sm font-semibold" style={{ color: '#57534e' }}>Quantity:</span>
              <div className="flex items-center rounded-xl overflow-hidden"
                style={{ border: '1.5px solid rgba(193,136,91,0.3)' }}>
                <button onClick={() => setQty(Math.max(1, qty - 1))}
                  className="w-9 h-9 flex items-center justify-center transition-colors hover:bg-amber-50"
                  style={{ color: '#a96f46' }}><Minus size={14} /></button>
                <span className="w-10 text-center text-sm font-bold" style={{ color: '#292524' }}>{qty}</span>
                <button onClick={() => setQty(qty + 1)}
                  className="w-9 h-9 flex items-center justify-center transition-colors hover:bg-amber-50"
                  style={{ color: '#a96f46' }}><Plus size={14} /></button>
              </div>
              <span className="text-xs" style={{ color: '#a8a29e' }}>per {product.unit}</span>
            </div>

            {/* CTA Buttons */}
            <div className="flex gap-3 mb-5">
              {inCart ? (
                <div className="flex-1 flex items-center rounded-2xl overflow-hidden"
                  style={{ border: '2px solid rgba(193,136,91,0.4)' }}>
                  <button onClick={() => updateQty(Number(id), cartQty - 1)}
                    className="px-4 py-3 font-bold text-lg transition-colors hover:bg-amber-50 flex-shrink-0"
                    style={{ color: '#a96f46' }}>−</button>
                  <span className="flex-1 text-center text-sm font-bold" style={{ color: '#a96f46' }}>{cartQty} in cart</span>
                  <button onClick={() => updateQty(Number(id), cartQty + 1)}
                    className="px-4 py-3 font-bold text-lg transition-colors hover:bg-amber-50 flex-shrink-0"
                    style={{ color: '#a96f46' }}>+</button>
                </div>
              ) : (
                <button onClick={addToCart}
                  className="flex-1 flex items-center justify-center gap-2 py-3 rounded-2xl text-sm font-bold transition-all hover:opacity-90"
                  style={{ background: 'rgba(193,136,91,0.1)', color: '#a96f46', border: '2px solid rgba(193,136,91,0.3)' }}>
                  <ShoppingCart size={16} /> Add to Cart
                </button>
              )}
              <button onClick={buyNow}
                className="flex-1 flex items-center justify-center gap-2 py-3 rounded-2xl text-sm font-bold transition-all hover:opacity-90"
                style={{ background: 'linear-gradient(145deg, #c1885b, #a96f46)', color: 'white', boxShadow: '0 4px 16px rgba(169,111,70,0.35)' }}>
                <Zap size={16} /> Buy Now
              </button>
            </div>

            {/* Delivery info */}
            <div className="grid grid-cols-3 gap-2">
              {[
                { icon: <Truck size={14} />,     label: 'Free Delivery', sub: 'Above ₹499' },
                { icon: <RefreshCw size={14} />, label: '7-Day Return',  sub: 'Easy process' },
                { icon: <Shield size={14} />,    label: 'Genuine',       sub: '100% authentic' },
              ].map(item => (
                <div key={item.label} className="flex flex-col items-center text-center p-2.5 rounded-xl"
                  style={{ background: '#fdf8f3', border: '1.5px solid rgba(193,136,91,0.12)' }}>
                  <span style={{ color: '#c1885b' }}>{item.icon}</span>
                  <p className="text-xs font-bold mt-1" style={{ color: '#292524' }}>{item.label}</p>
                  <p className="text-xs" style={{ color: '#a8a29e' }}>{item.sub}</p>
                </div>
              ))}
            </div>
          </div>
        </div>

        {/* Tabs */}
        <div className="mt-8 pt-6" style={{ borderTop: '1.5px solid rgba(193,136,91,0.12)' }}>
          <div className="flex gap-1 mb-5 p-1 rounded-2xl w-fit" style={{ background: '#fdf8f3' }}>
            {(['desc', 'specs'] as const).map(t => (
              <button key={t} onClick={() => setTab(t)}
                className="px-5 py-2 rounded-xl text-sm font-bold transition-all"
                style={{
                  background: tab === t ? 'linear-gradient(145deg, #c1885b, #a96f46)' : 'transparent',
                  color: tab === t ? 'white' : '#78716c',
                  boxShadow: tab === t ? '0 3px 10px rgba(169,111,70,0.3)' : 'none',
                }}>
                {t === 'desc' ? 'Description' : 'Highlights'}
              </button>
            ))}
          </div>

          {tab === 'desc' && (
            <p className="text-sm leading-relaxed" style={{ color: '#57534e' }}>{product.description}</p>
          )}
          {tab === 'specs' && (
            <ul className="space-y-2">
              {product.highlights.map((h, i) => (
                <li key={i} className="flex items-center gap-2.5 text-sm" style={{ color: '#57534e' }}>
                  <span className="w-5 h-5 rounded-full flex items-center justify-center text-xs font-bold text-white flex-shrink-0"
                    style={{ background: 'linear-gradient(145deg, #c1885b, #a96f46)' }}>✓</span>
                  {h}
                </li>
              ))}
            </ul>
          )}
        </div>
      </div>
    </div>
  );
}
