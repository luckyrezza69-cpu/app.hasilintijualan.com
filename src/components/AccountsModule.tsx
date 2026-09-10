import React, { useState, useEffect } from 'react';
import { 
  User, 
  SOPModule 
} from '../types';
import { 
  UserCheck, 
  Users, 
  ShieldCheck, 
  ShieldAlert, 
  Plus, 
  Search, 
  Lock, 
  Eye, 
  EyeOff, 
  Edit3, 
  Trash2, 
  CheckCircle2, 
  AlertCircle, 
  KeyRound, 
  Layers, 
  LayoutDashboard, 
  ShoppingCart, 
  Palette, 
  Factory, 
  Package, 
  Truck, 
  Wallet, 
  UserCog, 
  Settings, 
  HelpCircle, 
  RefreshCw, 
  Sparkles,
  Check,
  Shield
} from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import { cn, generateId } from '../lib/utils';
import { sheetsService } from '../services/googleService';
import { Modal } from './ui/Modal';
import { ConfirmModal } from './ui/ConfirmModal';

// List of all available modules in the system
const ALL_MODULES_CONFIG: { id: SOPModule; label: string; desc: string; icon: any; category: string }[] = [
  { id: 'Dashboard', label: 'Dasbor', desc: 'Ringkasan KPI, statistik & analitik sistem', icon: LayoutDashboard, category: 'Utama' },
  { id: 'Customers', label: 'Pelanggan', desc: 'Database pelanggan & kontak klien', icon: Users, category: 'Penjualan' },
  { id: 'Orders', label: 'Pesanan & Penawaran', desc: 'Kelola order masuk, harga & penawaran', icon: ShoppingCart, category: 'Penjualan' },
  { id: 'Designs', label: 'Desain & Sampel', desc: 'Upload artwork, mockup depan/belakang & sampel', icon: Palette, category: 'Produksi' },
  { id: 'Production', label: 'Produksi PPIC', desc: 'Penerbitan SPK, alur cutting, sewing, finishing', icon: Factory, category: 'Produksi' },
  { id: 'Inventory', label: 'Inventaris & Gudang', desc: 'Stok kain, aksesoris & produk jadi', icon: Package, category: 'Gudang' },
  { id: 'Procurement', label: 'Pengadaan', desc: 'PO pembelian bahan & kain supplier', icon: ShoppingCart, category: 'Gudang' },
  { id: 'QC', label: 'Kontrol Kualitas', desc: 'Inspeksi cacat, perbaikan & keputusan QC', icon: CheckCircle2, category: 'Produksi' },
  { id: 'Shipping', label: 'Pengiriman & Logistik', desc: 'Surat jalan, kurir resi & ekspedisi', icon: Truck, category: 'Logistik' },
  { id: 'Finance', label: 'Keuangan & Faktur', desc: 'Penerbitan invoice, riwayat pembayaran & arus kas', icon: Wallet, category: 'Keuangan' },
  { id: 'HR', label: 'Sumber Daya Manusia', desc: 'Data operator, gaji pokok, skill grading', icon: UserCog, category: 'Manajemen' },
  { id: 'Machines', label: 'Pemeliharaan Mesin', desc: 'Jadwal servis mesin jahit, cutting, bordir', icon: Settings, category: 'Fasilitas' },
  { id: 'Safety', label: 'Keselamatan (K3)', desc: 'Laporan insiden & standar keselamatan kerja', icon: ShieldAlert, category: 'Fasilitas' },
  { id: 'Accounts', label: 'Manajemen Akun', desc: 'Kelola user, username, password & hak akses', icon: KeyRound, category: 'Admin' },
  { id: 'HowItWorks', label: 'Cara Kerja Aplikasi', desc: 'Panduan operasional dan SOP konveksi', icon: HelpCircle, category: 'Utama' },
];

// Quick Access Presets
const PRESET_ROLES = [
  {
    name: 'Super Admin',
    desc: 'Akses penuh tanpa batas ke seluruh 15 modul',
    modules: ['*'] as any
  },
  {
    name: 'Kepala Produksi (PPIC)',
    desc: 'Operasional produksi, pesanan, gudang, dan QC',
    modules: ['Dashboard', 'Orders', 'Designs', 'Production', 'Inventory', 'Procurement', 'QC', 'HowItWorks'] as SOPModule[]
  },
  {
    name: 'Staff Desain & Sampel',
    desc: 'Kelola artwork desain, mockup dan sampel produk',
    modules: ['Dashboard', 'Designs', 'Orders', 'HowItWorks'] as SOPModule[]
  },
  {
    name: 'Inspector QC',
    desc: 'Pemeriksaan kualitas hasil produksi & laporan inspeksi',
    modules: ['Dashboard', 'Production', 'QC', 'Orders', 'HowItWorks'] as SOPModule[]
  },
  {
    name: 'Staff Keuangan',
    desc: 'Kelola invoice, pembayaran faktur & data pelanggan',
    modules: ['Dashboard', 'Customers', 'Orders', 'Finance', 'HowItWorks'] as SOPModule[]
  },
  {
    name: 'Admin Gudang & Logistik',
    desc: 'Kelola stok bahan, pengadaan PO & ekspedisi pengiriman',
    modules: ['Dashboard', 'Inventory', 'Procurement', 'Shipping', 'HowItWorks'] as SOPModule[]
  }
];

export const AccountsModule: React.FC = () => {
  const [users, setUsers] = useState<User[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [roleFilter, setRoleFilter] = useState('All');
  
  // Modal State
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [isEditing, setIsEditing] = useState(false);
  const [editingUserId, setEditingUserId] = useState<string | null>(null);
  
  // Delete Modal State
  const [isDeleteModalOpen, setIsDeleteModalOpen] = useState(false);
  const [userToDelete, setUserToDelete] = useState<User | null>(null);

  // Form State
  const [formData, setFormData] = useState({
    name: '',
    username: '',
    password: '',
    role: 'Staff Operasional',
    avatar: '',
    allowedModules: ['Dashboard', 'HowItWorks'] as SOPModule[] | ['*']
  });

  const [showFormPassword, setShowFormPassword] = useState(false);
  const [visiblePasswords, setVisiblePasswords] = useState<Record<string, boolean>>({});
  const [error, setError] = useState<string | null>(null);

  // Fetch users from backend
  const fetchUsers = async () => {
    try {
      setLoading(true);
      const data = await sheetsService.getAll('Users');
      setUsers(Array.isArray(data) ? data : []);
    } catch (err) {
      console.error('Error fetching users:', err);
      setUsers([]);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchUsers();
  }, []);

  const togglePasswordVisibility = (userId: string) => {
    setVisiblePasswords(prev => ({
      ...prev,
      [userId]: !prev[userId]
    }));
  };

  const handleOpenAddModal = () => {
    setIsEditing(false);
    setEditingUserId(null);
    setFormData({
      name: '',
      username: '',
      password: '',
      role: 'Staff Operasional',
      avatar: `https://picsum.photos/seed/${Date.now()}/100/100`,
      allowedModules: ['Dashboard', 'HowItWorks']
    });
    setError(null);
    setIsModalOpen(true);
  };

  const handleOpenEditModal = (user: User) => {
    setIsEditing(true);
    setEditingUserId(user.id);
    setFormData({
      name: user.name || '',
      username: user.username || '',
      password: '', // Blank by default on edit so existing hash is preserved
      role: user.role || 'Staff Operasional',
      avatar: user.avatar || `https://picsum.photos/seed/${user.id}/100/100`,
      allowedModules: Array.isArray(user.allowedModules) ? user.allowedModules : ['Dashboard', 'HowItWorks']
    });
    setError(null);
    setIsModalOpen(true);
  };

  // Toggle Module in Checkbox
  const handleToggleModule = (moduleId: SOPModule) => {
    setFormData(prev => {
      // If currently all '*', switch to full array minus/plus
      let current = prev.allowedModules.includes('*' as any)
        ? ALL_MODULES_CONFIG.map(m => m.id)
        : [...prev.allowedModules];

      if (current.includes(moduleId)) {
        const next = current.filter(m => m !== moduleId);
        return { ...prev, allowedModules: next as SOPModule[] };
      } else {
        const next = [...current, moduleId];
        // If all modules are selected, simplify to ['*']
        if (next.length === ALL_MODULES_CONFIG.length) {
          return { ...prev, allowedModules: ['*'] };
        }
        return { ...prev, allowedModules: next as SOPModule[] };
      }
    });
  };

  // Apply Preset
  const handleApplyPreset = (preset: typeof PRESET_ROLES[0]) => {
    setFormData(prev => ({
      ...prev,
      role: preset.name,
      allowedModules: preset.modules
    }));
  };

  const handleSelectAllModules = () => {
    setFormData(prev => ({ ...prev, allowedModules: ['*'] }));
  };

  const handleDeselectAllModules = () => {
    setFormData(prev => ({ ...prev, allowedModules: [] }));
  };

  // Submit Handler
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!formData.name.trim() || !formData.username.trim()) {
      setError('Harap lengkapi nama dan username.');
      return;
    }
    if (!isEditing && !formData.password.trim()) {
      setError('Password wajib diisi untuk akun baru.');
      return;
    }

    const trimmedUsername = formData.username.trim().toLowerCase();

    // Check username uniqueness
    const duplicate = users.find(u => 
      u.username.toLowerCase() === trimmedUsername && (!isEditing || u.id !== editingUserId)
    );
    if (duplicate) {
      setError(`Username "${formData.username}" sudah digunakan oleh akun lain.`);
      return;
    }

    try {
      if (isEditing && editingUserId) {
        // Update existing user
        const updatedPayload: any = {
          ...formData,
          username: formData.username.trim(),
          updatedAt: new Date().toISOString()
        };
        // Only update password if a new one is provided
        if (formData.password && formData.password.trim() !== '') {
          updatedPayload.password = formData.password.trim();
        } else {
          delete updatedPayload.password;
        }
        await sheetsService.update('Users', editingUserId, updatedPayload);
      } else {
        // Create new user
        const newId = generateId('USR');
        const newPayload = {
          id: newId,
          ...formData,
          username: formData.username.trim(),
          password: formData.password.trim(),
          timestamp: new Date().toISOString(),
          user: 'Admin HIJ'
        };
        await sheetsService.create('Users', newPayload);
      }

      setIsModalOpen(false);
      fetchUsers();
    } catch (err: any) {
      console.error('Error saving user:', err);
      setError('Gagal menyimpan data akun. Silakan coba lagi.');
    }
  };

  // Delete Handler
  const handleDeleteUser = (user: User) => {
    if (user.username === 'admin.rezza') {
      alert('Akun Super Admin Utama (admin.rezza) diproteksi dan tidak dapat dihapus.');
      return;
    }
    setUserToDelete(user);
    setIsDeleteModalOpen(true);
  };

  const confirmDelete = async () => {
    if (!userToDelete) return;
    try {
      await sheetsService.delete('Users', userToDelete.id);
      setIsDeleteModalOpen(false);
      setUserToDelete(null);
      fetchUsers();
    } catch (err) {
      console.error('Error deleting user:', err);
      alert('Gagal menghapus akun pengguna.');
    }
  };

  // Filtered Users List
  const filteredUsers = users.filter(user => {
    const q = searchQuery.toLowerCase();
    const matchesSearch = 
      (user.name || '').toLowerCase().includes(q) ||
      (user.username || '').toLowerCase().includes(q) ||
      (user.role || '').toLowerCase().includes(q);
    
    const matchesRole = roleFilter === 'All' || user.role === roleFilter;
    return matchesSearch && matchesRole;
  });

  const totalUsers = users.length;
  const superAdminCount = users.filter(u => {
    if (u.role === 'Super Admin') return true;
    if (Array.isArray(u.allowedModules)) return u.allowedModules.includes('*' as any);
    if (typeof u.allowedModules === 'string') return u.allowedModules.includes('*');
    return false;
  }).length;
  const staffCount = totalUsers - superAdminCount;

  return (
    <div className="space-y-6">
      {/* Header & Stats Banner */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2">
            <h2 className="text-2xl font-black text-gray-900 tracking-tight">Manajemen Akun & Hak Akses</h2>
            <span className="px-2.5 py-0.5 bg-teal-50 text-teal-700 border border-teal-200 rounded-full text-xs font-bold font-mono">
              RBAC
            </span>
          </div>
          <p className="text-xs sm:text-sm text-gray-500 mt-1">
            Buat akun username & password untuk staf internal, tentukan peran, dan batasi menu modul yang dapat dikelola.
          </p>
        </div>

        <button
          onClick={handleOpenAddModal}
          className="flex items-center justify-center gap-2 px-4 py-3 bg-gradient-to-r from-teal-600 to-emerald-600 hover:from-teal-700 hover:to-emerald-700 text-white rounded-2xl text-xs sm:text-sm font-bold shadow-lg shadow-teal-600/20 transition-all active:scale-[0.99]"
        >
          <Plus size={18} />
          <span>Buat Akun Baru</span>
        </button>
      </div>

      {/* KPI Cards */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-4">
        <div className="bg-white p-4 sm:p-5 rounded-3xl border border-gray-100 shadow-xs space-y-1">
          <p className="text-xs font-bold text-gray-400 uppercase tracking-wider">Total Akun</p>
          <h3 className="text-2xl sm:text-3xl font-black text-gray-900">{totalUsers}</h3>
          <p className="text-[10px] text-teal-600 font-bold uppercase tracking-wide">Pengguna Terdaftar</p>
        </div>

        <div className="bg-white p-4 sm:p-5 rounded-3xl border border-gray-100 shadow-xs space-y-1">
          <p className="text-xs font-bold text-gray-400 uppercase tracking-wider">Super Admin</p>
          <h3 className="text-2xl sm:text-3xl font-black text-purple-600">{superAdminCount}</h3>
          <p className="text-[10px] text-purple-600 font-bold uppercase tracking-wide">Akses Penuh 100%</p>
        </div>

        <div className="bg-white p-4 sm:p-5 rounded-3xl border border-gray-100 shadow-xs space-y-1">
          <p className="text-xs font-bold text-gray-400 uppercase tracking-wider">Staf Operasional</p>
          <h3 className="text-2xl sm:text-3xl font-black text-teal-600">{staffCount}</h3>
          <p className="text-[10px] text-teal-600 font-bold uppercase tracking-wide">Akses Modul Terpilih</p>
        </div>

        <div className="bg-white p-4 sm:p-5 rounded-3xl border border-gray-100 shadow-xs space-y-1">
          <p className="text-xs font-bold text-gray-400 uppercase tracking-wider">Total Modul</p>
          <h3 className="text-2xl sm:text-3xl font-black text-gray-900">{ALL_MODULES_CONFIG.length}</h3>
          <p className="text-[10px] text-emerald-600 font-bold uppercase tracking-wide">Modul Siap Dibagikan</p>
        </div>
      </div>

      {/* Filter and Search Bar */}
      <div className="bg-white p-4 rounded-2xl border border-gray-100 shadow-xs flex flex-col sm:flex-row gap-3 items-center justify-between">
        <div className="relative w-full sm:w-80">
          <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 text-gray-400" size={18} />
          <input
            type="text"
            placeholder="Cari nama, username, atau peran..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full pl-10 pr-4 py-2.5 bg-gray-50 hover:bg-gray-100/80 focus:bg-white border border-gray-200 focus:border-teal-500 rounded-xl text-xs sm:text-sm font-medium outline-none transition-all"
          />
        </div>

        <div className="flex items-center gap-2 w-full sm:w-auto overflow-x-auto pb-1 sm:pb-0">
          <span className="text-xs font-bold text-gray-400 uppercase tracking-wider flex-shrink-0">Filter:</span>
          {['All', 'Super Admin', 'Kepala Produksi (PPIC)', 'Inspector QC', 'Staff Keuangan'].map(role => (
            <button
              key={role}
              onClick={() => setRoleFilter(role)}
              className={cn(
                "px-3 py-1.5 rounded-xl text-xs font-bold transition-all flex-shrink-0",
                roleFilter === role
                  ? "bg-teal-600 text-white shadow-xs"
                  : "bg-gray-50 text-gray-600 hover:bg-gray-100"
              )}
            >
              {role === 'All' ? 'Semua Peran' : role}
            </button>
          ))}
        </div>
      </div>

      {/* User Accounts List */}
      {loading ? (
        <div className="bg-white rounded-3xl p-12 text-center border border-gray-100 shadow-xs">
          <RefreshCw size={32} className="animate-spin text-teal-600 mx-auto mb-3" />
          <p className="text-sm font-bold text-gray-700">Memuat Data Pengguna & Hak Akses...</p>
        </div>
      ) : filteredUsers.length === 0 ? (
        <div className="bg-white rounded-3xl p-12 text-center border border-gray-100 shadow-xs">
          <Users size={48} className="text-gray-300 mx-auto mb-3" />
          <h4 className="text-base font-bold text-gray-800">Tidak Ada Akun Ditemukan</h4>
          <p className="text-xs text-gray-500 mt-1">Coba sesuaikan kata kunci pencarian atau buat akun baru.</p>
        </div>
      ) : (
        <div className="space-y-4">
          {/* Desktop & Mobile Card-Based Grid */}
          <div className="grid grid-cols-1 gap-4">
            {filteredUsers.map(user => {
              const isSuper = user.role === 'Super Admin' || user.allowedModules?.includes('*' as any);
              const allowedList = Array.isArray(user.allowedModules) ? user.allowedModules : [];
              const showPw = visiblePasswords[user.id] || false;

              return (
                <div 
                  key={user.id}
                  className="bg-white rounded-3xl p-5 sm:p-6 border border-gray-100 shadow-[0_8px_30px_rgb(0,0,0,0.03)] hover:border-teal-100 transition-all space-y-4"
                >
                  {/* Top Row: Profile & Role & Actions */}
                  <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-4 border-b border-gray-100">
                    <div className="flex items-center gap-3.5">
                      <div className="w-12 h-12 rounded-2xl bg-gradient-to-tr from-teal-600 to-emerald-600 text-white flex items-center justify-center font-bold text-base shadow-sm overflow-hidden flex-shrink-0 border border-teal-100">
                        {user.avatar ? (
                          <img src={user.avatar} alt={user.name} className="w-full h-full object-cover" />
                        ) : (
                          <span>{user.name?.charAt(0) || 'U'}</span>
                        )}
                      </div>
                      <div>
                        <div className="flex items-center gap-2">
                          <h3 className="text-base sm:text-lg font-black text-gray-900">{user.name}</h3>
                          <span className={cn(
                            "px-2.5 py-0.5 rounded-full text-[10px] font-extrabold uppercase tracking-wider",
                            isSuper ? "bg-purple-50 text-purple-700 border border-purple-200" : "bg-teal-50 text-teal-700 border border-teal-200"
                          )}>
                            {user.role}
                          </span>
                        </div>
                        <p className="text-xs text-gray-400 font-mono mt-0.5">ID: {user.id}</p>
                      </div>
                    </div>

                    {/* Action Buttons */}
                    <div className="flex items-center gap-2 self-end sm:self-auto">
                      <button
                        onClick={() => handleOpenEditModal(user)}
                        className="flex items-center gap-1.5 px-3.5 py-2 bg-gray-50 hover:bg-teal-50 hover:text-teal-700 text-gray-700 rounded-xl text-xs font-bold transition-all border border-gray-200/70"
                      >
                        <Edit3 size={15} />
                        <span>Edit Akun</span>
                      </button>

                      <button
                        onClick={() => handleDeleteUser(user)}
                        disabled={user.username === 'admin.rezza'}
                        title={user.username === 'admin.rezza' ? 'Super Admin Utama tidak dapat dihapus' : 'Hapus Akun'}
                        className="p-2 text-gray-400 hover:text-red-600 hover:bg-red-50 rounded-xl transition-all border border-gray-200/70 disabled:opacity-30"
                      >
                        <Trash2 size={16} />
                      </button>
                    </div>
                  </div>

                  {/* Middle Row: Login Credentials */}
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 bg-gray-50/80 p-4 rounded-2xl border border-gray-100">
                    <div className="flex items-center gap-3">
                      <div className="w-8 h-8 rounded-xl bg-white border border-gray-200/80 flex items-center justify-center text-gray-500 flex-shrink-0">
                        <Users size={16} />
                      </div>
                      <div>
                        <span className="text-[10px] font-bold text-gray-400 uppercase tracking-wider block">Username Login</span>
                        <span className="text-xs font-mono font-bold text-gray-900">{user.username}</span>
                      </div>
                    </div>

                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-3">
                        <div className="w-8 h-8 rounded-xl bg-white border border-gray-200/80 flex items-center justify-center text-gray-500 flex-shrink-0">
                          <Lock size={16} />
                        </div>
                        <div>
                          <span className="text-[10px] font-bold text-gray-400 uppercase tracking-wider block">Password</span>
                          <span className="text-xs font-mono font-bold text-gray-900">
                            {showPw ? (user.password || '••••••••') : '••••••••'}
                          </span>
                        </div>
                      </div>

                      <button
                        onClick={() => togglePasswordVisibility(user.id)}
                        className="p-2 text-gray-400 hover:text-gray-700 rounded-lg text-xs flex items-center gap-1 font-semibold"
                      >
                        {showPw ? <EyeOff size={15} /> : <Eye size={15} />}
                        <span className="hidden sm:inline">{showPw ? 'Sembunyikan' : 'Lihat'}</span>
                      </button>
                    </div>
                  </div>

                  {/* Bottom Row: Allowed Modules Badges */}
                  <div className="space-y-2">
                    <div className="flex items-center justify-between">
                      <span className="text-xs font-bold text-gray-500 flex items-center gap-1.5">
                        <Shield size={14} className="text-teal-600" />
                        <span>Hak Akses Menu & Modul:</span>
                      </span>
                      <span className="text-xs font-bold text-teal-700">
                        {isSuper ? '15/15 Modul (Akses Penuh)' : `${allowedList.length} Modul Diizinkan`}
                      </span>
                    </div>

                    {isSuper ? (
                      <div className="p-3 bg-purple-50/70 border border-purple-100 rounded-2xl flex items-center gap-2 text-purple-900 text-xs font-bold">
                        <Sparkles size={16} className="text-purple-600 flex-shrink-0" />
                        <span>Super Administrator — Memiliki izin membuka dan mengelola seluruh modul ERP.</span>
                      </div>
                    ) : (
                      <div className="flex flex-wrap gap-1.5">
                        {allowedList.map(modId => {
                          const conf = ALL_MODULES_CONFIG.find(m => m.id === modId);
                          const Icon = conf?.icon || Layers;
                          return (
                            <span 
                              key={modId} 
                              className="inline-flex items-center gap-1.5 px-3 py-1 bg-teal-50 text-teal-800 border border-teal-200/80 rounded-xl text-xs font-semibold"
                            >
                              <Icon size={13} className="text-teal-600" />
                              <span>{conf?.label || modId}</span>
                            </span>
                          );
                        })}
                      </div>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* CREATE / EDIT ACCOUNT MODAL */}
      <Modal
        isOpen={isModalOpen}
        onClose={() => setIsModalOpen(false)}
        title={isEditing ? `Edit Akun: ${formData.username}` : 'Buat Akun Pengguna Baru'}
      >
        <form onSubmit={handleSubmit} className="space-y-5">
          {error && (
            <div className="p-3.5 bg-red-50 border border-red-200 rounded-2xl flex items-center gap-2.5 text-red-700 text-xs font-medium">
              <AlertCircle size={16} className="flex-shrink-0" />
              <span>{error}</span>
            </div>
          )}

          {/* Preset Roles Quick Buttons */}
          <div className="space-y-2">
            <label className="text-xs font-bold text-gray-500 uppercase tracking-wider">Pilihan Cepat Peran & Akses Modul:</label>
            <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
              {PRESET_ROLES.map(preset => (
                <button
                  key={preset.name}
                  type="button"
                  onClick={() => handleApplyPreset(preset)}
                  className={cn(
                    "p-2.5 text-left rounded-xl border text-xs transition-all",
                    formData.role === preset.name
                      ? "bg-teal-50 border-teal-400 text-teal-900 font-bold ring-2 ring-teal-500/20"
                      : "bg-gray-50 border-gray-200/80 text-gray-700 hover:bg-gray-100"
                  )}
                >
                  <p className="font-bold truncate">{preset.name}</p>
                  <p className="text-[10px] text-gray-500 mt-0.5 line-clamp-1">{preset.desc}</p>
                </button>
              ))}
            </div>
          </div>

          {/* Form Inputs Grid */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            {/* Full Name */}
            <div className="space-y-1.5">
              <label className="text-xs font-bold text-gray-700">Nama Lengkap</label>
              <input
                type="text"
                required
                placeholder="Contoh: Budi Santoso"
                value={formData.name}
                onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                className="w-full px-3.5 py-2.5 bg-gray-50 border border-gray-200 rounded-xl text-xs sm:text-sm font-medium focus:bg-white focus:border-teal-500 outline-none"
              />
            </div>

            {/* Role / Jabatan */}
            <div className="space-y-1.5">
              <label className="text-xs font-bold text-gray-700">Peran / Jabatan</label>
              <input
                type="text"
                required
                placeholder="Contoh: Kepala Produksi"
                value={formData.role}
                onChange={(e) => setFormData({ ...formData, role: e.target.value })}
                className="w-full px-3.5 py-2.5 bg-gray-50 border border-gray-200 rounded-xl text-xs sm:text-sm font-medium focus:bg-white focus:border-teal-500 outline-none"
              />
            </div>

            {/* Username */}
            <div className="space-y-1.5">
              <label className="text-xs font-bold text-gray-700">Username Login</label>
              <input
                type="text"
                required
                placeholder="Contoh: produksi.budi"
                value={formData.username}
                onChange={(e) => setFormData({ ...formData, username: e.target.value.toLowerCase().replace(/\s+/g, '') })}
                className="w-full px-3.5 py-2.5 bg-gray-50 border border-gray-200 rounded-xl text-xs sm:text-sm font-mono font-medium focus:bg-white focus:border-teal-500 outline-none"
              />
            </div>

            {/* Password */}
            <div className="space-y-1.5">
              <label className="text-xs font-bold text-gray-700">
                Password {isEditing && <span className="text-gray-400 font-normal">(opsional)</span>}
              </label>
              <div className="relative">
                <input
                  type={showFormPassword ? "text" : "password"}
                  required={!isEditing}
                  placeholder={isEditing ? "Kosongkan jika tidak ingin mengubah password" : "Masukkan password akun baru"}
                  value={formData.password}
                  onChange={(e) => setFormData({ ...formData, password: e.target.value })}
                  className="w-full pl-3.5 pr-10 py-2.5 bg-gray-50 border border-gray-200 rounded-xl text-xs sm:text-sm font-mono font-medium focus:bg-white focus:border-teal-500 outline-none"
                />
                <button
                  type="button"
                  onClick={() => setShowFormPassword(!showFormPassword)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600"
                >
                  {showFormPassword ? <EyeOff size={16} /> : <Eye size={16} />}
                </button>
              </div>
              {isEditing && (
                <p className="text-[10px] text-gray-400">
                  Biarkan kosong jika tidak ingin mengganti password akun saat ini.
                </p>
              )}
            </div>
          </div>

          {/* Module Permissions Checkbox Grid */}
          <div className="space-y-3 pt-2">
            <div className="flex items-center justify-between">
              <div>
                <h4 className="text-xs font-bold text-gray-900 uppercase tracking-wider">Hak Akses Modul</h4>
                <p className="text-[11px] text-gray-500">Centang modul yang diizinkan untuk dikelola oleh akun ini.</p>
              </div>
              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={handleSelectAllModules}
                  className="text-xs font-bold text-teal-600 hover:text-teal-700 hover:underline"
                >
                  Pilih Semua
                </button>
                <span className="text-gray-300">•</span>
                <button
                  type="button"
                  onClick={handleDeselectAllModules}
                  className="text-xs font-bold text-gray-500 hover:text-gray-700 hover:underline"
                >
                  Batal Semua
                </button>
              </div>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 max-h-64 overflow-y-auto p-1 border border-gray-100 rounded-2xl bg-gray-50/50">
              {ALL_MODULES_CONFIG.map(mod => {
                const Icon = mod.icon;
                const isChecked = Array.isArray(formData.allowedModules) 
                  ? (formData.allowedModules.includes('*' as any) || formData.allowedModules.includes(mod.id))
                  : true;

                return (
                  <label
                    key={mod.id}
                    className={cn(
                      "flex items-start gap-3 p-3 rounded-xl border cursor-pointer transition-all",
                      isChecked 
                        ? "bg-white border-teal-300 shadow-2xs" 
                        : "bg-white/60 border-gray-200/60 opacity-60 hover:opacity-100"
                    )}
                  >
                    <input
                      type="checkbox"
                      checked={isChecked}
                      onChange={() => handleToggleModule(mod.id)}
                      className="mt-0.5 rounded text-teal-600 focus:ring-teal-500 w-4 h-4"
                    />
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-1.5">
                        <Icon size={14} className={isChecked ? "text-teal-600" : "text-gray-400"} />
                        <span className={cn("text-xs font-bold truncate", isChecked ? "text-gray-900" : "text-gray-500")}>
                          {mod.label}
                        </span>
                      </div>
                      <p className="text-[10px] text-gray-400 mt-0.5 line-clamp-1">{mod.desc}</p>
                    </div>
                  </label>
                );
              })}
            </div>
          </div>

          {/* Modal Footer */}
          <div className="flex items-center justify-end gap-2.5 pt-4 border-t border-gray-100">
            <button
              type="button"
              onClick={() => setIsModalOpen(false)}
              className="px-4 py-2.5 bg-gray-100 hover:bg-gray-200 text-gray-700 rounded-xl text-xs font-bold transition-all"
            >
              Batal
            </button>
            <button
              type="submit"
              className="px-5 py-2.5 bg-teal-600 hover:bg-teal-700 text-white rounded-xl text-xs font-bold shadow-md shadow-teal-600/20 transition-all"
            >
              {isEditing ? 'Simpan Perubahan' : 'Buat Akun'}
            </button>
          </div>
        </form>
      </Modal>

      {/* DELETE CONFIRMATION MODAL */}
      <ConfirmModal
        isOpen={isDeleteModalOpen}
        onClose={() => setIsDeleteModalOpen(false)}
        onConfirm={confirmDelete}
        title="Hapus Akun Pengguna?"
        message={`Apakah Anda yakin ingin menghapus akun "${userToDelete?.name}" (@${userToDelete?.username})? Pengguna tidak akan dapat login lagi ke dalam sistem.`}
      />
    </div>
  );
};
