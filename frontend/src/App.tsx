import React from 'react';
import { BrowserRouter as Router, Routes, Route, Link, useLocation, Navigate } from 'react-router-dom';

import Dashboard from './pages/Dashboard';
import LedgerReport from './pages/LedgerReport';
import StockReport from './pages/StockReport';
import CreateOrder from './pages/CreateOrder';
import OrderReport from './pages/OrderReport';
import OrderDetail from './pages/OrderDetail';
import Login from './pages/Login';
import AdminProfile from './pages/AdminProfile';
import Godown from './pages/Godown';
import { Plus, Users, LayoutGrid, ClipboardList } from 'lucide-react';
import { getUser } from './api';
import { ConfirmModal } from './components/ConfirmModal';
import { InstallPWA } from './components/InstallPWA';

// Simple Auth Guard
function AuthGuard({ children }: { children: React.ReactElement }) {
  const user = localStorage.getItem('user');
  if (!user) {
    return <Navigate to="/login" replace />;
  }
  return children;
}

function NavLink({ to, icon: Icon, label }: { to: string; icon: React.ElementType; label: string }) {
  const location = useLocation();
  const isActive = location.pathname === to;

  return (
    <Link
      to={to}
      className={`
        relative flex flex-col items-center justify-center py-2 space-y-1 transition-all duration-300
        ${isActive ? 'text-indigo-600' : 'text-slate-400 hover:text-slate-600'}
      `}
    >
      <div className={`
        relative transition-all duration-300
        ${isActive ? '-translate-y-1' : ''}
      `}>
        <Icon size={24} strokeWidth={isActive ? 2.5 : 2} />
        {isActive && (
          <span className="absolute -bottom-2 left-1/2 -translate-x-1/2 w-1 h-1 bg-indigo-600 rounded-full"></span>
        )}
      </div>
      <span className={`text-[10px] font-bold tracking-wide transition-all duration-300 ${isActive ? 'opacity-100' : 'opacity-100'}`}>
        {label}
      </span>
    </Link>
  );
}

function Layout() {
  const location = useLocation();
  const [showNapModal, setShowNapModal] = React.useState(false);

  // Close menu when location changes (unused now but safe to keep or remove if we had menu)
  React.useEffect(() => {
    // setIsReportsOpen(false); // Removed
  }, [location]);

  const forceLogout = () => {
    localStorage.removeItem('user');
    localStorage.removeItem('token');
    window.location.href = '/login';
  };

  // Auto-Logout Trigger & Navigation Guard
  React.useEffect(() => {
    const checkTime = () => {
      const now = new Date();
      const hrs = now.getHours();
      const mins = now.getMinutes();
      const totalMins = hrs * 60 + mins;

      // Logout Window: 11:45 PM (1425 mins) to 5:00 AM (300 mins)
      // Logic: If past 11:45 PM OR before 5:00 AM
      const isNapTime = totalMins >= 1425 || totalMins <= 300;

      if (isNapTime) {
        const userStr = localStorage.getItem('user');
        if (userStr && window.location.pathname !== '/login') {
          const userData = JSON.parse(userStr);
          // Allow Admin to bypass Nap Time if they are actively working
          if (userData.role === 'admin') return;

          // If it's EXACTLY 11:45 PM, show the polite popup first
          if (hrs === 23 && mins === 45) {
            if (!showNapModal) setShowNapModal(true);
          } else {
            // If it's anytime else in the window (e.g. 1:00 AM), force logout immediately
            forceLogout();
          }
        }
      }
    };

    // Check on interval
    const interval = setInterval(checkTime, 30000); // Check every 30s
    
    // Check on navigation (location change)
    checkTime();

    return () => clearInterval(interval);
  }, [location, showNapModal]);

  // Hide bottom nav on specific pages
  const hideNav = location.pathname === '/create-order' || location.pathname === '/login' || location.pathname.startsWith('/orders/edit/');

  // Get User Role
  const user = getUser();
  // Manager is now treated as Staff (only Godown access) per user request
  const isAdmin = user.role === 'admin';


  return (
    <div className="min-h-screen bg-slate-200 flex justify-center font-sans selection:bg-indigo-100">
      <div className="w-full max-w-md min-h-screen bg-slate-50 relative shadow-2xl overflow-x-hidden border-x border-slate-300">
        
        {/* Global Ambient Background */}
        <div className="absolute inset-0 pointer-events-none z-0 overflow-hidden">
          <div className="absolute top-[-10%] left-[-10%] w-[600px] h-[600px] bg-indigo-300/10 rounded-full blur-[120px]"></div>
          <div className="absolute bottom-[-10%] right-[-10%] w-[500px] h-[500px] bg-pink-300/10 rounded-full blur-[100px]"></div>
        </div>

        {/* Main Content Area */}
        <main className={`relative z-10 w-full h-full min-h-screen ${!hideNav ? 'pb-24' : ''}`}>
          <Routes>
            <Route path="/login" element={<Login />} />
            <Route path="/" element={<AuthGuard><Dashboard /></AuthGuard>} />
            <Route path="/orders" element={<AuthGuard><OrderReport /></AuthGuard>} />
            <Route path="/orders/:id" element={<AuthGuard><OrderDetail /></AuthGuard>} />
            <Route path="/ledgers" element={<AuthGuard><LedgerReport /></AuthGuard>} />
            <Route path="/stock-items" element={<AuthGuard><StockReport /></AuthGuard>} />
            <Route path="/create-order" element={<AuthGuard><CreateOrder /></AuthGuard>} />
            <Route path="/orders/edit/:id" element={<AuthGuard><CreateOrder /></AuthGuard>} />
            <Route path="/profile" element={<AuthGuard><AdminProfile /></AuthGuard>} />
            <Route path="/godown" element={<AuthGuard><Godown /></AuthGuard>} />
          </Routes>
        </main>

      {/* Bottom Navigation Bar */}
      {!hideNav && (
        <div className="fixed bottom-0 left-0 right-0 z-50">
          <nav className="bg-white/95 backdrop-blur-xl border-t border-slate-200 shadow-[0_-4px_20px_rgba(0,0,0,0.08)] pb-safe">
            {/* ... navigation remains same ... */}
            <div className={`grid ${isAdmin ? 'grid-cols-3' : 'grid-cols-2'} h-16 max-w-md mx-auto`}>
               {/* NavLinks here... (Keeping logic brief for replace tool) */}
               {isAdmin ? (
                   <NavLink to="/" icon={LayoutGrid} label="Home" />
               ) : (
                   <NavLink to="/orders" icon={ClipboardList} label="History" />
               )}

               <NavLink to="/create-order" icon={Plus} label="New" />
               {isAdmin && (
                 <NavLink to="/profile" icon={Users} label="Roles" />
               )}
            </div>
          </nav>
        </div>
      )}

      {/* Nap Time Modal */}
      <ConfirmModal 
        isOpen={showNapModal}
        onClose={() => setShowNapModal(false)}
        onConfirm={forceLogout}
        title="🌙 It's Nap Time!"
        message="The system is undergoing scheduled maintenance (Tally Sync). Please take a rest and log in tomorrow morning. Sweet dreams!"
        confirmText="Logout Now"
        cancelText="Close"
      />

      {/* PWA Install Prompt */}
      <InstallPWA />
      </div>
    </div>
  );
}

function App() {
  return (
    <Router>
      <Layout />
    </Router>
  );
}

export default App;
