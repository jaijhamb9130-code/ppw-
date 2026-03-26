import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { ChevronRight, MapPin, Plus, Trash2, Home, Briefcase } from 'lucide-react';
import { useAuth } from '../context/AuthContext';

interface Address {
  id: string;
  type: 'Home' | 'Work' | 'Other';
  street: string;
  city: string;
  isDefault: boolean;
}

export default function Addresses() {
  const navigate = useNavigate();
  const { isLoggedIn } = useAuth();
  const [addresses, setAddresses] = useState<Address[]>([]);
  
  useEffect(() => {
    const saved = localStorage.getItem('ppw_addresses');
    if (saved) {
      setAddresses(JSON.parse(saved));
    } else {
      setAddresses([
        { id: '1', type: 'Home', street: 'Flat 402, Sunshine Apartments', city: 'Mumbai, MH 400001', isDefault: true }
      ]);
    }
  }, []);

  const Header = () => (
    <div className="bg-white px-4 py-4 sticky top-0 z-10 flex items-center gap-3 border-b border-gray-100 shadow-sm">
      <button onClick={() => navigate(-1)} className="p-1.5 -ml-1 rounded-full hover:bg-gray-50 flex items-center justify-center transition-all pointer-events-auto cursor-pointer">
        <ChevronRight size={22} className="rotate-180" style={{ color: '#292524' }} />
      </button>
      <h1 className="text-lg font-extrabold" style={{ color: '#292524' }}>My Addresses</h1>
    </div>
  );

  if (!isLoggedIn) {
     return (
       <div className="bg-[#faf7f4] min-h-screen pb-16">
         <Header />
         <div className="max-w-md mx-auto px-4 py-24 text-center">
           <span className="text-6xl block mb-4">🔐</span>
           <h2 className="text-xl font-bold mb-2" style={{ color: '#1C1C1C' }}>Sign in to view addresses</h2>
           <button onClick={() => navigate('/login')}
             className="px-8 py-3 rounded-xl text-sm font-bold transition-all hover:opacity-90 mt-4"
             style={{ background: '#0C831F', color: 'white' }}>
             Sign In
           </button>
         </div>
       </div>
     );
  }

  const removeAddress = (id: string) => {
    const next = addresses.filter(a => a.id !== id);
    setAddresses(next);
    localStorage.setItem('ppw_addresses', JSON.stringify(next));
  };

  return (
    <div className="bg-[#faf7f4] min-h-screen pb-16">
      <Header />
      <div className="max-w-2xl mx-auto px-4 py-6">
        <div className="flex items-center justify-between mb-6">
          <div className="flex items-center gap-2.5">
            <MapPin size={20} style={{ color: '#0C831F' }} />
            <h2 className="text-xl font-bold" style={{ color: '#1C1C1C' }}>Saved Addresses</h2>
          </div>
          <button className="flex items-center gap-1 text-sm font-bold px-3 py-1.5 rounded-lg active:scale-95 transition-transform"
            style={{ background: 'rgba(12,131,31,0.1)', color: '#0C831F' }}>
            <Plus size={16} /> Add New
          </button>
        </div>

        <div className="space-y-4">
          {addresses.length === 0 ? (
            <div className="text-center py-10">
              <span className="text-4xl block mb-3">🏠</span>
              <p className="text-sm font-bold text-gray-800">No addresses saved</p>
              <p className="text-xs text-gray-500 mt-1">Add a new address for faster checkout.</p>
            </div>
          ) : (
            addresses.map(addr => (
              <div key={addr.id} className="bg-white p-4 rounded-2xl flex items-start justify-between transition-all hover:shadow-sm" style={{ border: '1px solid #E8E8E8' }}>
                <div className="flex gap-3">
                  <div className="mt-0.5">
                    {addr.type === 'Home' ? <Home size={18} style={{ color: '#666' }} /> : <Briefcase size={18} style={{ color: '#666' }} />}
                  </div>
                  <div>
                    <div className="flex items-center gap-2 mb-1">
                      <span className="font-bold text-sm" style={{ color: '#1C1C1C' }}>{addr.type}</span>
                      {addr.isDefault && (
                        <span className="text-[10px] font-extrabold px-2 py-0.5 rounded bg-amber-50" style={{ color: '#b8804a' }}>DEFAULT</span>
                      )}
                    </div>
                    <p className="text-sm" style={{ color: '#666' }}>{addr.street}</p>
                    <p className="text-sm" style={{ color: '#666' }}>{addr.city}</p>
                  </div>
                </div>
                <button onClick={() => removeAddress(addr.id)} 
                  className="p-2 hover:bg-red-50 rounded-lg transition-colors group cursor-pointer active:scale-90">
                  <Trash2 size={16} className="text-gray-400 group-hover:text-red-500" />
                </button>
              </div>
            ))
          )}
        </div>
      </div>
    </div>
  );
}
