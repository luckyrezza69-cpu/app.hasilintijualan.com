/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useEffect } from 'react';
import { 
  LayoutDashboard, 
  Users, 
  ShoppingCart, 
  Palette, 
  Factory, 
  Package, 
  CheckCircle2, 
  Truck, 
  Wallet, 
  UserCog, 
  Settings, 
  ShieldAlert,
  HelpCircle,
  ChevronRight,
  Search,
  Bell,
  Menu,
  X,
  Lock,
  KeyRound,
  FileSpreadsheet,
  LogOut
} from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import { cn } from './lib/utils';
import { SOPModule, User, AuthSession } from './types';
import { Dashboard } from './components/Dashboard';
import { CustomersModule } from './components/CustomersModule';
import { ProductionModule } from './components/ProductionModule';
import { InventoryModule } from './components/InventoryModule';
import { QCModule } from './components/QCModule';
import { OrdersModule } from './components/OrdersModule';
import { FinanceModule } from './components/FinanceModule';
import { HRModule } from './components/HRModule';
import { MachinesModule } from './components/MachinesModule';
import { SafetyModule } from './components/SafetyModule';
import { DesignsModule } from './components/DesignsModule';
import { ShippingModule } from './components/ShippingModule';
import { ProcurementModule } from './components/ProcurementModule';
import { AccountsModule } from './components/AccountsModule';
import { ImportModule } from './components/ImportModule';
import { HowItWorksModule } from './components/HowItWorksModule';
import { LoginModal } from './components/LoginModal';
import { CustomerPortal } from './components/CustomerPortal';

// --- Components ---

const SidebarItem = ({ 
  icon: Icon, 
  label, 
  active, 
  locked,
  onClick 
}: { 
  icon: any, 
  label: string, 
  active: boolean, 
  locked?: boolean,
  onClick: () => void,
  key?: React.Key
}) => (
  <button
    onClick={onClick}
    className={cn(
      "w-full flex items-center gap-3 px-4 py-3 rounded-xl transition-all duration-200 group relative",
      active 
        ? "bg-white shadow-sm text-black" 
        : locked
          ? "text-gray-400 hover:bg-gray-100/30"
          : "text-gray-500 hover:bg-gray-100/50 hover:text-gray-900"
    )}
  >
    <Icon size={20} className={cn(active ? "text-teal-600" : locked ? "text-gray-300" : "group-hover:text-gray-900")} />
    <span className={cn("font-medium text-sm flex-1 text-left", locked && "text-gray-400")}>{label}</span>
    {locked && (
      <Lock size={12} className="text-gray-300 ml-auto" />
    )}
    {active && !locked && (
      <motion.div 
        layoutId="active-pill"
        className="ml-auto w-1.5 h-1.5 rounded-full bg-teal-600"
      />
    )}
  </button>
);

export const Card = ({ children, title, subtitle, action }: { children: React.ReactNode, title?: string, subtitle?: string, action?: React.ReactNode, key?: React.Key }) => (
  <div className="bg-white rounded-3xl p-4 md:p-6 shadow-[0_8px_30px_rgb(0,0,0,0.04)] border border-gray-100">
    {(title || action) && (
      <div className="flex items-center justify-between mb-4 md:mb-6">
        <div>
          {title && <h3 className="text-base md:text-lg font-bold text-gray-900 tracking-tight">{title}</h3>}
          {subtitle && <p className="text-xs md:text-sm text-gray-500 font-medium">{subtitle}</p>}
        </div>
        {action}
      </div>
    )}
    {children}
  </div>
);

export const StatCard = ({ label, value, trend, color }: { label: string, value: string, trend?: string, color: string }) => (
  <div className="bg-white rounded-3xl p-4 md:p-6 shadow-[0_8px_30px_rgb(0,0,0,0.04)] border border-gray-100">
    <p className="text-xs md:text-sm font-bold text-gray-400 uppercase tracking-wider mb-1">{label}</p>
    <h4 className="text-xl md:text-2xl font-black text-gray-900 tracking-tight">{value}</h4>
    {trend && (
      <p className={cn("text-[10px] mt-2 font-bold uppercase tracking-wide", color)}>
        {trend}
      </p>
    )}
  </div>
);

// --- Main App ---

export default function App() {
  const [activeModule, setActiveModule] = useState<SOPModule>('Dashboard');
  const [isSidebarOpen, setIsSidebarOpen] = useState(window.innerWidth >= 1024);
  const [connectionError, setConnectionError] = useState<string | null>(null);
  const [currentTime, setCurrentTime] = useState(new Date());
  
  // User Authentication / Door Session State
  const [authSession, setAuthSession] = useState<AuthSession | null>(() => {
    try {
      const saved = localStorage.getItem('hij_auth_session');
      if (saved) return JSON.parse(saved);
      const oldUser = localStorage.getItem('hij_active_user');
      if (oldUser) return { type: 'internal', user: JSON.parse(oldUser) };
      return null;
    } catch (e) {
      return null;
    }
  });

  const currentUser = authSession?.type === 'internal' ? authSession.user : null;

  const handleLoginSuccess = (session: AuthSession) => {
    setAuthSession(session);
    try {
      localStorage.setItem('hij_auth_session', JSON.stringify(session));
      if (session.type === 'internal') {
        localStorage.setItem('hij_active_user', JSON.stringify(session.user));
      }
    } catch (e) {}
  };

  const handleLogout = () => {
    if (window.confirm("Apakah Anda yakin ingin keluar dari sistem?")) {
      setAuthSession(null);
      try {
        localStorage.removeItem('hij_auth_session');
        localStorage.removeItem('hij_active_user');
      } catch (e) {}
    }
  };

  const hasModuleAccess = (moduleId: SOPModule): boolean => {
    if (!currentUser) return false;
    if (currentUser.role === 'Super Admin') return true;
    if (!currentUser.allowedModules) return true;
    if (Array.isArray(currentUser.allowedModules)) {
      if (currentUser.allowedModules.includes('*' as any)) return true;
      return currentUser.allowedModules.includes(moduleId);
    }
    if (typeof currentUser.allowedModules === 'string') {
      try {
        const parsed = JSON.parse(currentUser.allowedModules);
        if (Array.isArray(parsed)) {
          return parsed.includes('*') || parsed.includes(moduleId);
        }
      } catch {
        return currentUser.allowedModules === '*' || currentUser.allowedModules === moduleId;
      }
    }
    return true;
  };

  const handleModuleNavigation = (moduleId: SOPModule) => {
    if (!hasModuleAccess(moduleId)) {
      alert(`Akses Ditolak: Akun Anda (${currentUser?.role}) tidak memiliki izin untuk mengakses menu "${menuItems.find(i => i.id === moduleId)?.label || moduleId}". Hubungi Super Admin jika membutuhkan akses.`);
      return;
    }
    setActiveModule(moduleId);
    if (window.innerWidth < 1024) setIsSidebarOpen(false);
  };

  useEffect(() => {
    const handleResize = () => {
      if (window.innerWidth >= 1024) {
        setIsSidebarOpen(true);
      } else {
        setIsSidebarOpen(false);
      }
    };
    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, []);

  useEffect(() => {
    const timer = setInterval(() => {
      setCurrentTime(new Date());
    }, 1000);
    return () => clearInterval(timer);
  }, []);

  const formatIndonesianDate = (date: Date) => {
    const dayName = new Intl.DateTimeFormat('id-ID', { weekday: 'long' }).format(date);
    const dateStr = new Intl.DateTimeFormat('id-ID', { day: 'numeric', month: 'long', year: 'numeric' }).format(date);
    const timeStr = new Intl.DateTimeFormat('id-ID', { hour: '2-digit', minute: '2-digit', second: '2-digit' }).format(date);
    return { dayName, dateStr, timeStr };
  };

  const { dayName, dateStr, timeStr } = formatIndonesianDate(currentTime);

  useEffect(() => {
    const checkConnection = async () => {
      try {
        const response = await fetch('/api/health');
        const data = await response.json();
        if (data.status !== 'ok') {
          setConnectionError("Backend server tidak merespon dengan benar.");
        } else {
          setConnectionError(null);
        }
      } catch (err) {
        setConnectionError("Tidak dapat terhubung ke server backend. Pastikan server lokal sudah berjalan.");
      }
    };
    checkConnection();
  }, []);

  const menuItems = [
    { id: 'Dashboard', icon: LayoutDashboard, label: 'Dasbor' },
    { id: 'Customers', icon: Users, label: 'Pelanggan' },
    { id: 'Orders', icon: ShoppingCart, label: 'Pesanan & Penawaran' },
    { id: 'Designs', icon: Palette, label: 'Desain & Sampel' },
    { id: 'Production', icon: Factory, label: 'Produksi PPIC' },
    { id: 'Inventory', icon: Package, label: 'Inventaris & Gudang' },
    { id: 'Procurement', icon: ShoppingCart, label: 'Pengadaan' },
    { id: 'QC', icon: CheckCircle2, label: 'Kontrol Kualitas' },
    { id: 'Shipping', icon: Truck, label: 'Pengiriman & Logistik' },
    { id: 'Finance', icon: Wallet, label: 'Keuangan & Faktur' },
    { id: 'HR', icon: UserCog, label: 'Sumber Daya Manusia' },
    { id: 'Machines', icon: Settings, label: 'Pemeliharaan Mesin' },
    { id: 'Safety', icon: ShieldAlert, label: 'Keselamatan (K3)' },
    { id: 'Import', icon: FileSpreadsheet, label: 'Import Data' },
    { id: 'Accounts', icon: KeyRound, label: 'Manajemen Akun' },
    { id: 'HowItWorks', icon: HelpCircle, label: 'Cara Kerja Aplikasi' },
  ];

  // If active session is a Customer, render the dedicated Customer Portal
  if (authSession?.type === 'customer') {
    return (
      <CustomerPortal 
        customer={authSession.customer} 
        onLogout={handleLogout} 
      />
    );
  }

  return (
    <div className="min-h-screen bg-[#F8F9FB] flex font-sans text-gray-900 relative overflow-x-hidden">
      {/* Sidebar Overlay for Mobile */}
      <AnimatePresence>
        {isSidebarOpen && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={() => setIsSidebarOpen(false)}
            className="fixed inset-0 bg-black/20 backdrop-blur-sm z-40 lg:hidden"
          />
        )}
      </AnimatePresence>

      {/* Sidebar */}
      <aside 
        className={cn(
          "fixed inset-y-0 left-0 z-50 bg-white border-r border-gray-100 transition-all duration-500 ease-[cubic-bezier(0.4,0,0.2,1)] lg:relative",
          isSidebarOpen ? "w-72 translate-x-0 shadow-2xl lg:shadow-none" : "w-0 lg:w-20 -translate-x-full lg:translate-x-0 overflow-hidden"
        )}
      >
        <div className="h-full flex flex-col p-6">
          <div className="flex items-center justify-between mb-8 px-2">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 bg-white border border-gray-100 rounded-xl flex items-center justify-center p-1.5 shadow-sm flex-shrink-0">
                <img src="/logo.png" alt="HIJ Logo" className="w-full h-full object-contain" />
              </div>
              {isSidebarOpen && (
                <div className="flex flex-col">
                  <h1 className="text-xl font-bold tracking-tight leading-none text-gray-900">HIJ Apps</h1>
                  <span className="text-[10px] text-teal-600 font-bold uppercase tracking-widest mt-1">Management System</span>
                </div>
              )}
            </div>
            {/* Close button for mobile */}
            <button 
              onClick={() => setIsSidebarOpen(false)}
              className="p-2 hover:bg-gray-100 rounded-xl lg:hidden text-gray-400"
            >
              <X size={20} />
            </button>
          </div>

          <nav className="flex-1 space-y-1 overflow-y-auto no-scrollbar">
            {menuItems.map((item) => {
              const locked = !hasModuleAccess(item.id as SOPModule);
              return (
                <SidebarItem
                  key={item.id}
                  icon={item.icon}
                  label={isSidebarOpen ? item.label : ''}
                  active={activeModule === item.id}
                  locked={locked}
                  onClick={() => handleModuleNavigation(item.id as SOPModule)}
                />
              );
            })}
          </nav>

          {/* User Profile & Logout */}
          <div className="mt-auto pt-4 border-t border-gray-100 px-1">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3 min-w-0">
                <div className="w-10 h-10 rounded-xl bg-gradient-to-tr from-teal-600 to-emerald-600 text-white flex items-center justify-center font-bold overflow-hidden border border-teal-100 shadow-sm flex-shrink-0">
                  {currentUser?.avatar ? (
                    <img src={currentUser.avatar} alt={currentUser.name} className="w-full h-full object-cover" referrerPolicy="no-referrer" />
                  ) : (
                    <span>{currentUser?.name?.charAt(0) || 'U'}</span>
                  )}
                </div>
                {isSidebarOpen && (
                  <div className="min-w-0">
                    <p className="text-sm font-bold truncate text-gray-900">{currentUser?.name || 'Rezza'}</p>
                    <p className="text-[11px] text-teal-600 font-medium truncate">{currentUser?.role || 'Super Admin'}</p>
                  </div>
                )}
              </div>
              {isSidebarOpen && (
                <button 
                  onClick={handleLogout}
                  title="Keluar dari Aplikasi"
                  className="p-2 text-gray-400 hover:text-red-600 hover:bg-red-50 rounded-xl transition-colors"
                >
                  <LogOut size={16} />
                </button>
              )}
            </div>
            {!isSidebarOpen && (
              <button 
                onClick={handleLogout}
                title="Keluar dari Aplikasi"
                className="w-full mt-2 flex justify-center p-2 text-gray-400 hover:text-red-600 hover:bg-red-50 rounded-xl transition-colors"
              >
                <LogOut size={18} />
              </button>
            )}
          </div>
        </div>
      </aside>

      {/* Main Content */}
      <main className="flex-1 flex flex-col min-w-0 pb-20 lg:pb-0">
        {/* Header */}
        <header className="h-16 md:h-20 bg-white/80 backdrop-blur-md border-b border-gray-100 flex items-center justify-between px-4 md:px-8 sticky top-0 z-40">
          <div className="flex items-center gap-2 md:gap-4">
            <button 
              onClick={() => setIsSidebarOpen(!isSidebarOpen)}
              className="p-1.5 md:p-2 hover:bg-gray-100 rounded-xl transition-colors"
            >
              <Menu size={18} className="md:w-5 md:h-5" />
            </button>
            <div className="relative hidden lg:block">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" size={18} />
              <input 
                type="text" 
                placeholder="Search anything..." 
                className="pl-10 pr-4 py-2 bg-gray-100 border-none rounded-xl text-sm w-64 focus:ring-2 focus:ring-teal-500/20 transition-all"
              />
            </div>
            <div className="lg:hidden flex items-center gap-2">
              <img src="/logo.png" alt="HIJ Logo" className="w-7 h-7 object-contain flex-shrink-0" />
              <div className="flex flex-col">
                <h2 className="text-xs md:text-sm font-bold text-gray-900 truncate max-w-[120px]">
                  {menuItems.find(i => i.id === activeModule)?.label}
                </h2>
                <p className="text-[9px] md:text-[10px] text-teal-600 font-bold uppercase tracking-wider">{timeStr}</p>
              </div>
            </div>
          </div>

          <div className="flex items-center gap-2 md:gap-4">
            <button className="p-2 md:p-2.5 hover:bg-gray-100 rounded-xl transition-colors relative">
              <Bell size={18} className="md:w-5 md:h-5" />
              <span className="absolute top-2 right-2 w-1.5 h-1.5 md:w-2 md:h-2 bg-red-500 rounded-full border-2 border-white"></span>
            </button>
            <div className="h-6 md:h-8 w-px bg-gray-200 mx-0.5 md:mx-2"></div>
            <div className="text-right hidden sm:block">
              <p className="text-[10px] md:text-xs font-medium text-gray-500 capitalize">{dayName}</p>
              <p className="text-xs md:text-sm font-bold">{dateStr}</p>
              <p className="text-[9px] md:text-[10px] font-mono text-teal-600 mt-0.5">{timeStr}</p>
            </div>
            <div className="sm:hidden w-8 h-8 rounded-full bg-teal-100 text-teal-700 flex items-center justify-center font-bold text-xs border border-teal-200">
              {currentUser?.name?.charAt(0) || 'R'}
            </div>
          </div>
        </header>

        {/* Content Area */}
        <div className="p-4 md:p-8 max-w-[1600px] mx-auto w-full">
          {connectionError && (
            <div className="mb-8 p-4 bg-red-50 border border-red-100 rounded-2xl flex items-center gap-3 text-red-600">
              <ShieldAlert size={20} />
              <div className="flex-1">
                <p className="text-sm font-bold">Connection Error</p>
                <p className="text-xs opacity-80">{connectionError}</p>
              </div>
              <button 
                onClick={() => window.location.reload()}
                className="px-4 py-1.5 bg-red-600 text-white rounded-xl text-xs font-bold hover:bg-red-700 transition-colors"
              >
                Retry
              </button>
            </div>
          )}
          <AnimatePresence mode="wait">
            <motion.div
              key={activeModule}
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -10 }}
              transition={{ duration: 0.2 }}
            >
              {activeModule === 'Dashboard' && <Dashboard onNavigate={handleModuleNavigation} />}
              {activeModule === 'Customers' && <CustomersModule />}
              {activeModule === 'Production' && <ProductionModule onNavigate={handleModuleNavigation} />}
              {activeModule === 'Inventory' && <InventoryModule />}
              {activeModule === 'Procurement' && <ProcurementModule />}
              {activeModule === 'QC' && <QCModule />}
              {activeModule === 'Orders' && <OrdersModule onNavigate={handleModuleNavigation} />}
              {activeModule === 'Finance' && <FinanceModule />}
              {activeModule === 'HR' && <HRModule />}
              {activeModule === 'Machines' && <MachinesModule />}
              {activeModule === 'Safety' && <SafetyModule />}
              {activeModule === 'Designs' && <DesignsModule />}
              {activeModule === 'Shipping' && <ShippingModule />}
              {activeModule === 'Import' && <ImportModule onNavigate={handleModuleNavigation} />}
              {activeModule === 'Accounts' && <AccountsModule />}
              {activeModule === 'HowItWorks' && <HowItWorksModule />}
            </motion.div>
          </AnimatePresence>
        </div>
      </main>

      {/* Mobile Bottom Navigation */}
      <AnimatePresence>
        {!isSidebarOpen && (
          <motion.nav
            initial={{ y: 20, opacity: 0 }}
            animate={{ y: 0, opacity: 1 }}
            exit={{ y: 20, opacity: 0 }}
            transition={{ duration: 0.2 }}
            className="fixed bottom-0 left-0 right-0 bg-white/80 backdrop-blur-xl border-t border-gray-100 px-4 py-2 flex items-center justify-between z-40 lg:hidden"
          >
            {menuItems.slice(0, 5).map((item) => {
              const Icon = item.icon;
              const active = activeModule === item.id;
              return (
                <button
                  key={item.id}
                  onClick={() => handleModuleNavigation(item.id as SOPModule)}
                  className={cn(
                    "flex flex-col items-center gap-0.5 transition-all duration-300",
                    active ? "text-teal-600 scale-105" : "text-gray-400 hover:text-gray-600"
                  )}
                >
                  <div className={cn(
                    "p-1.5 rounded-xl transition-all",
                    active ? "bg-teal-50 shadow-sm" : ""
                  )}>
                    <Icon size={18} strokeWidth={active ? 2.5 : 2} />
                  </div>
                  <span className={cn("text-[9px] font-bold tracking-tight", active ? "opacity-100" : "opacity-0 h-0 overflow-hidden")}>
                    {item.label.split(' ')[0]}
                  </span>
                </button>
              );
            })}
            <button
              onClick={() => setIsSidebarOpen(true)}
              className="flex flex-col items-center gap-0.5 text-gray-400 hover:text-gray-600"
            >
              <div className="p-1.5 rounded-xl">
                <Menu size={18} />
              </div>
              <span className="text-[9px] font-bold opacity-0 h-0 overflow-hidden">Menu</span>
            </button>
          </motion.nav>
        )}
      </AnimatePresence>

      {/* Authentication Security Modal */}
      {!authSession && (
        <LoginModal onLoginSuccess={handleLoginSuccess} />
      )}
    </div>
  );
}
