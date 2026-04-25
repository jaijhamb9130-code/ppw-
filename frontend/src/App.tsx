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
import AttachBarcode from './pages/AttachBarcode';
import { Plus, Users, LayoutGrid, ClipboardList, Package } from 'lucide-react';
import { getUser } from './api';
import { ConfirmModal } from './components/ConfirmModal';
import { InstallPWA } from './components/InstallPWA';
import { ProfileHeader } from './components/ProfileHeader';
import { canAccess, getDefaultRoute } from './utils';

// Auth + role-aware guard. Logged-in users without permission for the path
// are bounced to whichever default route their role allows.
function AuthGuard({ children, path }: { children: React.ReactElement; path?: string }) {
  const userStr = localStorage.getItem('user');
  if (!userStr) return <Navigate to="/login" replace />;
  const user = JSON.parse(userStr);
  if (path && !canAccess(user, path)) {
    return <Navigate to={getDefaultRoute(user)} replace />;
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
  const hideNav = location.pathname === '/create-order' || location.pathname === '/login' || location.pathname.startsWith('/orders/edit/') || location.pathname === '/attach-barcode';

  // Get User Role
  const user = getUser();
  const role = user?.role;
  const isAdmin = role === 'admin';
  const isManager = role === 'manager';
  const isEmployee = role === 'employee';
  const isLoggedIn = !!user?.username;


  return (
    <div className="min-h-screen bg-slate-200 flex justify-center font-sans selection:bg-indigo-100">
      <div className="w-full max-w-md min-h-screen bg-slate-50 relative shadow-2xl overflow-x-hidden border-x border-slate-300">
        
        {/* Global Ambient Background */}
        <div className="absolute inset-0 pointer-events-none z-0 overflow-hidden">
          <div className="absolute top-[-10%] left-[-10%] w-[600px] h-[600px] bg-indigo-300/10 rounded-full blur-[120px]"></div>
          <div className="absolute bottom-[-10%] right-[-10%] w-[500px] h-[500px] bg-pink-300/10 rounded-full blur-[100px]"></div>
        </div>

        {/* Top Profile Header (hidden on login) */}
        {isLoggedIn && location.pathname !== '/login' && <ProfileHeader />}

        {/* Main Content Area */}
        <main className={`relative z-10 w-full h-full min-h-screen ${isLoggedIn && location.pathname !== '/login' ? 'pt-14' : ''} ${!hideNav ? 'pb-24' : ''}`}>
          <Routes>
            <Route path="/login" element={<Login />} />
            <Route path="/" element={<AuthGuard path="/"><Dashboard /></AuthGuard>} />
            <Route path="/orders" element={<AuthGuard path="/orders"><OrderReport /></AuthGuard>} />
            <Route path="/orders/:id" element={<AuthGuard path="/orders/:id"><OrderDetail /></AuthGuard>} />
            <Route path="/ledgers" element={<AuthGuard path="/ledgers"><LedgerReport /></AuthGuard>} />
            <Route path="/stock-items" element={<AuthGuard path="/stock-items"><StockReport /></AuthGuard>} />
            <Route path="/create-order" element={<AuthGuard path="/create-order"><CreateOrder /></AuthGuard>} />
            <Route path="/orders/edit/:id" element={<AuthGuard path="/orders/edit"><CreateOrder /></AuthGuard>} />
            <Route path="/profile" element={<AuthGuard path="/profile"><AdminProfile /></AuthGuard>} />
            <Route path="/godown" element={<AuthGuard path="/godown"><Godown /></AuthGuard>} />
            <Route path="/attach-barcode" element={<AuthGuard path="/attach-barcode"><AttachBarcode /></AuthGuard>} />
          </Routes>
        </main>

      {/* Bottom Navigation Bar — filtered by role */}
      {!hideNav && isLoggedIn && (
        <div className="fixed bottom-0 left-0 right-0 z-50">
          <nav className="bg-white/95 backdrop-blur-xl border-t border-slate-200 shadow-[0_-4px_20px_rgba(0,0,0,0.08)] pb-safe">
            <div className={`grid h-16 max-w-md mx-auto ${
              isAdmin ? 'grid-cols-4' :
              isManager ? 'grid-cols-1' :
              isEmployee ? 'grid-cols-2' :
              'grid-cols-1'
            }`}>
              {isAdmin && <NavLink to="/" icon={LayoutGrid} label="Home" />}
              {isAdmin && <NavLink to="/stock-items" icon={Package} label="Inventory" />}
              {isAdmin && <NavLink to="/create-order" icon={Plus} label="New" />}
              {isAdmin && <NavLink to="/profile" icon={Users} label="Users" />}

              {isManager && <NavLink to="/stock-items" icon={Package} label="Inventory" />}

              {isEmployee && <NavLink to="/orders" icon={ClipboardList} label="History" />}
              {isEmployee && <NavLink to="/create-order" icon={Plus} label="New" />}
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
