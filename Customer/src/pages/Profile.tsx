import { useState } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { User, Package, MapPin, LogOut, Edit2, Save, X, ChevronRight, Phone, Mail, Shield } from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import { useOrders } from '../context/OrderContext';

const NAV_ITEMS = [
  { label: 'My Profile',    icon: <User size={16} />,    key: 'profile',   path: '/profile' },
  { label: 'My Orders',     icon: <Package size={16} />, key: 'orders',    path: '/orders' },
  { label: 'My Addresses',  icon: <MapPin size={16} />,  key: 'addresses', path: '/addresses' },
];

export default function Profile() {
  const { user, logout, updateUser, isLoggedIn } = useAuth();
  const { getOrderCount, getDeliveredCount } = useOrders();
  const navigate = useNavigate();
  const [editing, setEditing] = useState(false);
  const [form, setForm] = useState({ name: user?.name ?? '', phone: user?.phone ?? '' });

  if (!isLoggedIn) {
    return (
      <div className="max-w-md mx-auto px-4 py-24 text-center">
        <div className="w-20 h-20 rounded-3xl flex items-center justify-center text-4xl mx-auto mb-5"
          style={{ background: 'linear-gradient(145deg, rgba(193,136,91,0.12), rgba(141,88,56,0.08))', border: '1.5px solid rgba(193,136,91,0.2)' }}>
          🔐
        </div>
        <h2 className="text-xl font-bold mb-2" style={{ color: '#292524' }}>Sign in to view your profile</h2>
        <p className="text-sm mb-6" style={{ color: '#78716c' }}>Access your orders, saved addresses, and account details.</p>
        <button onClick={() => navigate('/login')}
          className="inline-flex justify-center items-center px-8 py-3 rounded-2xl text-sm font-bold transition-all hover:opacity-90 mt-2"
          style={{ background: 'linear-gradient(145deg, #c1885b, #a96f46)', color: 'white', boxShadow: '0 6px 20px rgba(169,111,70,0.5)' }}>
          Sign In
        </button>
      </div>
    );
  }

  const initial = user?.name?.[0]?.toUpperCase() ?? 'U';

  return (
    <div className="max-w-4xl mx-auto px-4 py-6" style={{ minHeight: '80vh' }}>
      <h1 className="text-xl font-bold mb-5" style={{ color: '#292524' }}>My Account</h1>

      <div className="flex flex-col md:flex-row gap-4">

        {/* ── Sidebar ── */}
        <aside className="md:w-64 flex-shrink-0">
          {/* User badge */}
          <div className="rounded-2xl p-5 mb-3 flex items-center gap-3"
            style={{ background: 'linear-gradient(135deg, #292524, #3d2f29)', boxShadow: '0 4px 20px rgba(41,37,36,0.2)' }}>
            <div className="w-12 h-12 rounded-2xl flex items-center justify-center text-lg font-bold flex-shrink-0"
              style={{ background: 'linear-gradient(145deg, #c1885b, #8d5838)', color: 'white', boxShadow: '0 4px 12px rgba(169,111,70,0.4)' }}>
              {initial}
            </div>
            <div className="overflow-hidden">
              <p className="font-bold text-white text-sm truncate">{user?.name}</p>
              <p className="text-xs truncate" style={{ color: 'rgba(255,255,255,0.5)' }}>{user?.email}</p>
            </div>
          </div>

          {/* Nav links */}
          <div className="rounded-2xl overflow-hidden" style={{ background: 'white', border: '1.5px solid rgba(193,136,91,0.12)' }}>
            {NAV_ITEMS.map((item, i) => (
              <Link key={item.key} to={item.path}
                className={`flex items-center justify-between px-4 py-3.5 transition-colors hover:bg-amber-50 ${i < NAV_ITEMS.length - 1 ? 'border-b' : ''}`}
                style={{ borderColor: 'rgba(193,136,91,0.1)' }}>
                <div className="flex items-center gap-2.5">
                  <span style={{ color: '#c1885b' }}>{item.icon}</span>
                  <span className="text-sm font-semibold" style={{ color: '#292524' }}>{item.label}</span>
                </div>
                <ChevronRight size={14} style={{ color: '#a8a29e' }} />
              </Link>
            ))}
            <button onClick={() => { logout(); navigate('/'); }}
              className="flex items-center gap-2.5 w-full px-4 py-3.5 text-left transition-colors hover:bg-red-50"
              style={{ color: '#dc2626' }}>
              <LogOut size={16} />
              <span className="text-sm font-semibold">Sign Out</span>
            </button>
          </div>
        </aside>

        {/* ── Main Content ── */}
        <div className="flex-1 space-y-4">

          {/* Personal Info Card */}
          <div className="rounded-2xl p-5" style={{ background: 'white', border: '1.5px solid rgba(193,136,91,0.12)' }}>
            <div className="flex items-center justify-between mb-5">
              <div>
                <h2 className="text-base font-bold" style={{ color: '#292524' }}>Personal Information</h2>
                <p className="text-xs mt-0.5" style={{ color: '#78716c' }}>Manage your name and contact details</p>
              </div>
              {!editing ? (
                <button onClick={() => setEditing(true)}
                  className="flex items-center gap-1.5 text-sm font-semibold px-3 py-1.5 rounded-xl transition-all hover:opacity-80"
                  style={{ background: 'rgba(193,136,91,0.1)', color: '#a96f46' }}>
                  <Edit2 size={13} /> Edit
                </button>
              ) : (
                <div className="flex gap-2">
                  <button onClick={() => setEditing(false)}
                    className="flex items-center gap-1 text-sm font-semibold px-3 py-1.5 rounded-xl"
                    style={{ background: 'rgba(0,0,0,0.05)', color: '#57534e' }}>
                    <X size={13} /> Cancel
                  </button>
                  <button onClick={() => {
                    updateUser({ name: form.name, phone: form.phone });
                    setEditing(false);
                  }}
                    className="flex items-center gap-1 text-sm font-semibold px-3 py-1.5 rounded-xl"
                    style={{ background: 'linear-gradient(145deg, #c1885b, #a96f46)', color: 'white', boxShadow: '0 3px 10px rgba(169,111,70,0.3)' }}>
                    <Save size={13} /> Save
                  </button>
                </div>
              )}
            </div>

            {/* Avatar row */}
            <div className="flex items-center gap-4 mb-5 pb-5" style={{ borderBottom: '1.5px solid rgba(193,136,91,0.1)' }}>
              <div className="w-16 h-16 rounded-2xl flex items-center justify-center text-2xl font-bold"
                style={{ background: 'linear-gradient(145deg, #c1885b, #8d5838)', color: 'white', boxShadow: '0 6px 20px rgba(169,111,70,0.35)' }}>
                {initial}
              </div>
              <div>
                <p className="font-bold text-base" style={{ color: '#292524' }}>{user?.name}</p>
                <p className="text-xs mt-0.5" style={{ color: '#78716c' }}>PPWStore Member</p>
              </div>
            </div>

            {/* Fields */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              {[
                { label: 'Full Name',      key: 'name',  icon: <User size={15} />,  value: form.name,   type: 'text' },
                { label: 'Email Address',  key: 'email', icon: <Mail size={15} />,  value: user?.email, type: 'email', disabled: true },
                { label: 'Phone Number',   key: 'phone', icon: <Phone size={15} />, value: form.phone,  type: 'tel' },
              ].map(f => (
                <div key={f.key}>
                  <label className="block text-xs font-bold mb-1.5 uppercase tracking-wider" style={{ color: '#57534e' }}>{f.label}</label>
                  <div className="relative">
                    <span className="absolute left-3 top-1/2 -translate-y-1/2" style={{ color: '#c1885b' }}>{f.icon}</span>
                    <input
                      type={f.type}
                      value={f.value ?? ''}
                      onChange={e => setForm(s => ({ ...s, [f.key]: e.target.value }))}
                      disabled={!editing || f.disabled}
                      className="w-full pl-10 px-4 py-2.5 rounded-xl text-sm font-medium outline-none transition-all"
                      style={(!editing || f.disabled) 
                        ? { background: '#faf7f4', color: '#a8a29e', cursor: 'default', border: '1.5px solid rgba(193,136,91,0.1)' } 
                        : { background: 'white', border: '1.5px solid rgba(193,136,91,0.3)', color: '#292524' }
                      }
                    />
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* Quick stats */}
          <div className="grid grid-cols-3 gap-3">
            {[
              { emoji: '📦', label: 'Total Orders',    value: String(getOrderCount()), path: '/orders' },
              { emoji: '✅', label: 'Delivered',       value: String(getDeliveredCount()), path: '/orders' },
              { emoji: '⭐', label: 'Reviews Given',   value: '0', path: '/orders' },
            ].map(s => (
              <button key={s.label} onClick={() => navigate(s.path)}
                className="rounded-2xl p-4 text-center transition-transform active:scale-95"
                style={{ background: 'white', border: '1.5px solid rgba(193,136,91,0.12)' }}>
                <span className="text-2xl">{s.emoji}</span>
                <p className="text-xl font-bold mt-1" style={{ color: '#292524' }}>{s.value}</p>
                <p className="text-xs mt-0.5" style={{ color: '#78716c' }}>{s.label}</p>
              </button>
            ))}
          </div>

          {/* Security notice */}
          <div className="rounded-2xl p-4 flex items-start gap-3"
            style={{ background: 'rgba(193,136,91,0.06)', border: '1.5px solid rgba(193,136,91,0.18)' }}>
            <Shield size={18} style={{ color: '#c1885b', flexShrink: 0, marginTop: 1 }} />
            <div>
              <p className="text-sm font-semibold" style={{ color: '#292524' }}>Account Security</p>
              <p className="text-xs mt-0.5" style={{ color: '#78716c' }}>
                Your account is protected. To change your password, use the Forgot Password option on the login page.
              </p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
