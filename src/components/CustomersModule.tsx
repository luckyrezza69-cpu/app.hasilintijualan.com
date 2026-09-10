import React, { useState, useEffect } from 'react';
import { Card } from '../App';
import { Plus, Search, Filter, Users, ShoppingCart, ChevronRight, Loader2, Trash2, Pencil, Eye, Layers, Sparkles, X } from 'lucide-react';
import { cn } from '../lib/utils';
import { sheetsService } from '../services/googleService';
import { Modal } from './ui/Modal';
import { ConfirmModal } from './ui/ConfirmModal';
import { CustomerOverviewModal } from './CustomerOverviewModal';

export const CustomersModule = () => {
  const [searchQuery, setSearchQuery] = useState('');
  const [customers, setCustomers] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [isEditModalOpen, setIsEditModalOpen] = useState(false);
  const [isDetailsModalOpen, setIsDetailsModalOpen] = useState(false);
  const [isDeleteModalOpen, setIsDeleteModalOpen] = useState(false);
  const [isOverviewModalOpen, setIsOverviewModalOpen] = useState(false);
  const [customerToDelete, setCustomerToDelete] = useState<string | null>(null);
  const [customerToEdit, setCustomerToEdit] = useState<any>(null);
  const [selectedCustomer, setSelectedCustomer] = useState<any>(null);
  const [overviewCustomer, setOverviewCustomer] = useState<any>(null);
  const [saving, setSaving] = useState(false);
  
  const [formData, setFormData] = useState({
    id: '',
    name: '',
    company: '',
    contact: '',
    address: '',
    status: 'Active'
  });

  const [editFormData, setEditFormData] = useState({
    id: '',
    name: '',
    company: '',
    contact: '',
    address: '',
    status: 'Active'
  });

  const fetchCustomers = async () => {
    try {
      setLoading(true);
      const data = await sheetsService.getAll('Customers');
      setCustomers(Array.isArray(data) ? data : []);
    } catch (error) {
      console.error('Error fetching customers:', error);
      setCustomers([]);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchCustomers();
  }, []);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      // Check if ID already exists
      const idExists = customers.some(c => String(c.id).toLowerCase() === String(formData.id).trim().toLowerCase());
      if (idExists) {
        alert('ID Pelanggan sudah digunakan. Silakan gunakan ID lain.');
        return;
      }

      const newCustomer = {
        id: formData.id.trim(),
        timestamp: new Date().toISOString(),
        user: 'Admin HIJ',
        name: formData.name,
        company: formData.company,
        contact: formData.contact,
        address: formData.address,
        status: formData.status
      };
      await sheetsService.create('Customers', newCustomer);
      setIsModalOpen(false);
      setFormData({ id: '', name: '', company: '', contact: '', address: '', status: 'Active' });
      fetchCustomers();
    } catch (error) {
      alert('Gagal menyimpan data pelanggan.');
    }
  };

  const handleOpenOverview = (customer: any) => {
    setOverviewCustomer(customer);
    setIsOverviewModalOpen(true);
  };

  const handleOpenEdit = (customer: any) => {
    setCustomerToEdit(customer);
    setEditFormData({
      id: customer.id || '',
      name: customer.name || '',
      company: customer.company || '',
      contact: customer.contact || '',
      address: customer.address || '',
      status: customer.status || 'Active'
    });
    if (isDetailsModalOpen) {
      setIsDetailsModalOpen(false);
    }
    setIsEditModalOpen(true);
  };

  const handleEditSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!customerToEdit) return;

    try {
      setSaving(true);
      const updatedCustomer = {
        ...customerToEdit,
        name: editFormData.name,
        company: editFormData.company,
        contact: editFormData.contact,
        address: editFormData.address,
        status: editFormData.status,
        updatedAt: new Date().toISOString()
      };

      await sheetsService.update('Customers', customerToEdit.id, updatedCustomer);
      setIsEditModalOpen(false);
      setCustomerToEdit(null);
      fetchCustomers();
    } catch (error) {
      alert('Gagal memperbarui data pelanggan.');
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = (id: string) => {
    if (!id) {
      alert('ID tidak ditemukan. Data ini mungkin tidak dapat dihapus.');
      return;
    }
    setCustomerToDelete(id);
    setIsDeleteModalOpen(true);
  };

  const confirmDelete = async () => {
    if (!customerToDelete) return;
    
    try {
      console.log(`Attempting to delete customer with id: ${customerToDelete}`);
      await sheetsService.delete('Customers', customerToDelete);
      console.log('Delete successful');
      fetchCustomers();
    } catch (error: any) {
      console.error('Error deleting customer:', error);
      const message = error.response?.data?.error || error.message || 'Gagal menghapus data.';
      alert(`Gagal menghapus data: ${message}`);
    } finally {
      setCustomerToDelete(null);
    }
  };

  const handleUpdateStatus = async (customer: any, newStatus: string) => {
    try {
      await sheetsService.update('Customers', customer.id, { ...customer, status: newStatus, updatedAt: new Date().toISOString() });
      setIsDetailsModalOpen(false);
      fetchCustomers();
    } catch (error) {
      alert('Gagal memperbarui status.');
    }
  };

  const filteredCustomers = customers.filter(c => 
    c.name?.toLowerCase().includes(searchQuery.toLowerCase()) ||
    c.company?.toLowerCase().includes(searchQuery.toLowerCase()) ||
    c.contact?.toLowerCase().includes(searchQuery.toLowerCase()) ||
    c.id?.toLowerCase().includes(searchQuery.toLowerCase())
  );

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
          <h2 className="text-2xl font-bold text-gray-900">Database Pelanggan</h2>
          <p className="text-sm text-gray-500">Kelola data klien, hak akses pelacakan, dan detail kontak Anda.</p>
        </div>
        <button 
          onClick={() => setIsModalOpen(true)}
          className="w-full sm:w-auto bg-gradient-to-r from-teal-600 to-emerald-600 hover:from-teal-700 hover:to-emerald-700 text-white px-6 py-2.5 rounded-2xl text-xs sm:text-sm font-semibold flex items-center justify-center gap-2 transition-all shadow-lg shadow-teal-600/20 cursor-pointer"
        >
          <Plus size={18} />
          Tambah Pelanggan
        </button>
      </div>

      <div className="flex flex-col sm:flex-row justify-between items-stretch sm:items-center gap-3">
        <div className="relative flex-1">
          <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 text-gray-400" size={18} />
          <input 
            type="text" 
            placeholder="Cari pelanggan berdasarkan nama, perusahaan, kontak, atau ID..." 
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full pl-10 pr-10 py-2.5 bg-white border border-gray-200 rounded-2xl text-sm focus:ring-2 focus:ring-teal-500/20 focus:border-teal-500 transition-all outline-none"
          />
          {searchQuery && (
            <button
              onClick={() => setSearchQuery('')}
              className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600 p-1 rounded-full hover:bg-gray-100 cursor-pointer"
              title="Hapus pencarian"
            >
              <X size={16} />
            </button>
          )}
        </div>
        {searchQuery && (
          <div className="px-3 py-1.5 bg-teal-50 text-teal-700 border border-teal-100 rounded-xl text-xs font-semibold flex items-center gap-1.5 self-start sm:self-auto">
            <span>Ditemukan: <strong>{filteredCustomers.length}</strong> pelanggan</span>
          </div>
        )}
      </div>

      {loading ? (
        <div className="flex flex-col items-center justify-center py-20">
          <Loader2 className="animate-spin text-teal-600 mb-4" size={32} />
          <p className="text-gray-500 text-sm">Memuat pelanggan...</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {filteredCustomers.length > 0 ? filteredCustomers.map((customer, i) => (
            <div key={customer.id || i} className="bg-white rounded-3xl p-6 shadow-[0_8px_30px_rgb(0,0,0,0.04)] border border-gray-100 hover:shadow-[0_8px_30px_rgb(0,0,0,0.08)] transition-all group flex flex-col justify-between">
              <div>
                <div className="flex justify-between items-start mb-4">
                  <div className="w-12 h-12 rounded-2xl bg-teal-50 flex items-center justify-center text-teal-600">
                    <Users size={24} />
                  </div>
                  <div className="flex gap-1.5">
                    <button 
                      onClick={() => handleOpenOverview(customer)}
                      className="p-2 hover:bg-teal-50 rounded-xl transition-colors text-teal-600 cursor-pointer"
                      title="Lihat Keseluruhan Data (PO, SPK, Desain, Invoice, QC)"
                    >
                      <Eye size={17} />
                    </button>
                    <button 
                      onClick={() => handleOpenEdit(customer)}
                      className="p-2 hover:bg-teal-50 rounded-xl transition-colors text-teal-600 cursor-pointer"
                      title="Edit Data Pelanggan"
                    >
                      <Pencil size={17} />
                    </button>
                    <button 
                      onClick={() => handleDelete(customer.id)}
                      className="p-2 hover:bg-red-50 rounded-xl transition-colors text-red-500 cursor-pointer"
                      title="Hapus Pelanggan"
                    >
                      <Trash2 size={17} />
                    </button>
                  </div>
                </div>
                <h3 className="text-lg font-bold text-gray-900">{customer.name}</h3>
                <p className="text-[10px] font-bold text-teal-600 uppercase tracking-wider mb-1">{customer.id}</p>
                {customer.company && (
                  <p className="text-xs font-semibold text-gray-700">{customer.company}</p>
                )}
                <p className="text-sm text-gray-500 mt-1">{customer.address || 'Alamat tidak tersedia'}</p>
                
                <div className="mt-4 space-y-2">
                  <div className="flex items-center gap-3 text-sm text-gray-600">
                    <div className="w-8 h-8 rounded-lg bg-gray-50 flex items-center justify-center text-gray-500">
                      <ShoppingCart size={14} />
                    </div>
                    <span className="font-medium text-xs">{customer.contact || 'Kontak tidak tersedia'}</span>
                  </div>
                </div>

                {/* LIHAT KESELURUHAN BUTTON */}
                <button
                  onClick={() => handleOpenOverview(customer)}
                  className="w-full mt-4 py-2.5 px-4 bg-gradient-to-r from-teal-50 to-emerald-50 hover:from-teal-600 hover:to-emerald-600 text-teal-900 hover:text-white border border-teal-200/80 hover:border-transparent rounded-2xl text-xs font-black flex items-center justify-center gap-2 transition-all shadow-xs hover:shadow-md hover:shadow-teal-600/20 cursor-pointer group/btn"
                  title="Buka ringkasan menyeluruh: PO berjalan, SPK, desain, faktur, dan QC"
                >
                  <Layers size={15} className="text-teal-600 group-hover/btn:text-white transition-colors" />
                  <span>LIHAT KESELURUHAN</span>
                  <ChevronRight size={14} className="text-teal-500 group-hover/btn:text-white group-hover/btn:translate-x-0.5 transition-all" />
                </button>
              </div>

              <div className="mt-6 pt-5 border-t border-gray-100 flex justify-between items-center">
                <span className={cn(
                  "text-[10px] font-bold uppercase tracking-wider px-2.5 py-1 rounded-full border",
                  ['inactive', 'nonaktif', 'tidak aktif'].includes(String(customer.status).toLowerCase()) ? "bg-red-50 text-red-600 border-red-200" : 
                  ['blocked', 'diblokir'].includes(String(customer.status).toLowerCase()) ? "bg-gray-900 text-white border-gray-800" :
                  ['lead', 'prospek'].includes(String(customer.status).toLowerCase()) ? "bg-orange-50 text-orange-600 border-orange-200" :
                  "bg-teal-50 text-teal-700 border-teal-200"
                )}>
                  {['inactive', 'nonaktif', 'tidak aktif'].includes(String(customer.status).toLowerCase()) ? 'Nonaktif' :
                   ['blocked', 'diblokir'].includes(String(customer.status).toLowerCase()) ? 'Diblokir' :
                   ['lead', 'prospek'].includes(String(customer.status).toLowerCase()) ? 'Prospek' : 'Aktif'}
                </span>
                <div className="flex items-center gap-2">
                  <button 
                    onClick={() => handleOpenEdit(customer)}
                    className="text-xs font-bold text-teal-700 hover:text-teal-900 transition-colors cursor-pointer"
                  >
                    Edit
                  </button>
                  <span className="text-gray-300">|</span>
                  <button 
                    onClick={() => {
                      setSelectedCustomer(customer);
                      setIsDetailsModalOpen(true);
                    }}
                    className="text-xs font-semibold text-gray-700 hover:text-teal-600 transition-colors flex items-center gap-0.5 cursor-pointer"
                  >
                    Detail
                    <ChevronRight size={14} />
                  </button>
                </div>
              </div>
            </div>
          )) : (
            <div className="col-span-full py-20 text-center bg-white rounded-[32px] border border-dashed border-gray-200">
              <p className="text-gray-500">
                {searchQuery ? `Tidak ada pelanggan yang cocok dengan "${searchQuery}".` : 'Tidak ada pelanggan ditemukan. Tambahkan klien pertama Anda!'}
              </p>
            </div>
          )}
        </div>
      )}

      {/* DETAIL MODAL */}
      <Modal 
        isOpen={isDetailsModalOpen} 
        onClose={() => setIsDetailsModalOpen(false)} 
        title="Detail Pelanggan"
      >
        {selectedCustomer && (
          <div className="space-y-6">
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-1">
                <p className="text-[10px] font-bold text-gray-400 uppercase tracking-wider">ID Pelanggan</p>
                <p className="text-sm font-semibold text-gray-900">{selectedCustomer.id}</p>
              </div>
              <div className="space-y-1">
                <p className="text-[10px] font-bold text-gray-400 uppercase tracking-wider">Status Akses</p>
                <select 
                  value={selectedCustomer.status || 'Active'}
                  onChange={(e) => handleUpdateStatus(selectedCustomer, e.target.value)}
                  className="w-full text-xs font-bold uppercase tracking-wider bg-gray-50 border border-gray-200 rounded-xl px-2.5 py-1.5 focus:ring-2 focus:ring-teal-500/20 outline-none"
                >
                  <option value="Active">Aktif (Dapat Lacak Pesanan)</option>
                  <option value="Inactive">Nonaktif (Akses Lacak Ditutup)</option>
                  <option value="Blocked">Diblokir</option>
                  <option value="Lead">Prospek</option>
                </select>
              </div>
              <div className="space-y-1 col-span-2">
                <p className="text-[10px] font-bold text-gray-400 uppercase tracking-wider">Nama</p>
                <p className="text-sm font-semibold text-gray-900">{selectedCustomer.name}</p>
              </div>
              <div className="space-y-1 col-span-2">
                <p className="text-[10px] font-bold text-gray-400 uppercase tracking-wider">Perusahaan</p>
                <p className="text-sm font-semibold text-gray-900">{selectedCustomer.company || '-'}</p>
              </div>
              <div className="space-y-1 col-span-2">
                <p className="text-[10px] font-bold text-gray-400 uppercase tracking-wider">Kontak</p>
                <p className="text-sm font-semibold text-gray-900">{selectedCustomer.contact}</p>
              </div>
              <div className="space-y-1 col-span-2">
                <p className="text-[10px] font-bold text-gray-400 uppercase tracking-wider">Alamat</p>
                <p className="text-sm text-gray-600">{selectedCustomer.address || 'Alamat tidak tersedia'}</p>
              </div>
            </div>
            <div className="pt-4 flex flex-wrap justify-between gap-3 border-t border-gray-100">
              <div className="flex items-center gap-2">
                <button 
                  type="button"
                  onClick={() => {
                    setIsDetailsModalOpen(false);
                    handleOpenOverview(selectedCustomer);
                  }}
                  className="px-5 py-2.5 bg-gradient-to-r from-teal-600 to-emerald-600 hover:from-teal-700 hover:to-emerald-700 text-white rounded-2xl text-xs sm:text-sm font-bold flex items-center gap-2 shadow-md shadow-teal-600/20 transition-all cursor-pointer"
                >
                  <Layers size={16} />
                  Lihat Keseluruhan
                </button>
                <button 
                  type="button"
                  onClick={() => handleOpenEdit(selectedCustomer)}
                  className="px-5 py-2.5 bg-teal-50 text-teal-700 hover:bg-teal-100 rounded-2xl text-xs sm:text-sm font-bold flex items-center gap-2 transition-all cursor-pointer"
                >
                  <Pencil size={16} />
                  Edit Data
                </button>
              </div>
              <button 
                onClick={() => setIsDetailsModalOpen(false)}
                className="px-7 py-2.5 bg-gray-900 text-white rounded-2xl text-xs sm:text-sm font-semibold hover:bg-gray-800 transition-all cursor-pointer"
              >
                Tutup
              </button>
            </div>
          </div>
        )}
      </Modal>

      {/* EDIT CUSTOMER MODAL */}
      <Modal
        isOpen={isEditModalOpen}
        onClose={() => {
          setIsEditModalOpen(false);
          setCustomerToEdit(null);
        }}
        title="Edit Data Pelanggan"
      >
        <form onSubmit={handleEditSubmit} className="space-y-5">
          <div className="p-3.5 bg-teal-50/50 rounded-2xl border border-teal-100 flex items-center justify-between">
            <div>
              <span className="text-[10px] font-bold uppercase text-gray-400 block tracking-wider">ID Pelanggan</span>
              <span className="text-sm font-extrabold text-teal-800">{editFormData.id}</span>
            </div>
            <span className="text-xs text-gray-400 italic">ID tidak dapat diubah</span>
          </div>

          <div className="space-y-1.5">
            <label className="text-xs font-bold text-gray-700 uppercase tracking-wider block">Nama Pelanggan *</label>
            <input 
              required
              type="text" 
              value={editFormData.name}
              onChange={(e) => setEditFormData({...editFormData, name: e.target.value})}
              placeholder="Nama pelanggan atau PIC" 
              className="w-full p-3 bg-gray-50 border border-gray-200 rounded-xl text-sm focus:ring-2 focus:ring-teal-500/20 focus:bg-white outline-none" 
            />
          </div>

          <div className="space-y-1.5">
            <label className="text-xs font-bold text-gray-700 uppercase tracking-wider block">Nama Perusahaan / Brand</label>
            <input 
              type="text" 
              value={editFormData.company}
              onChange={(e) => setEditFormData({...editFormData, company: e.target.value})}
              placeholder="misal: PT. Fashion Global" 
              className="w-full p-3 bg-gray-50 border border-gray-200 rounded-xl text-sm focus:ring-2 focus:ring-teal-500/20 focus:bg-white outline-none" 
            />
          </div>

          <div className="space-y-1.5">
            <label className="text-xs font-bold text-gray-700 uppercase tracking-wider block">Info Kontak (No HP / WA) *</label>
            <input 
              required
              type="text" 
              value={editFormData.contact}
              onChange={(e) => setEditFormData({...editFormData, contact: e.target.value})}
              placeholder="08xxxxxxxxxx atau email" 
              className="w-full p-3 bg-gray-50 border border-gray-200 rounded-xl text-sm focus:ring-2 focus:ring-teal-500/20 focus:bg-white outline-none" 
            />
          </div>

          <div className="space-y-1.5">
            <label className="text-xs font-bold text-gray-700 uppercase tracking-wider block">Alamat Lengkap</label>
            <textarea 
              value={editFormData.address}
              onChange={(e) => setEditFormData({...editFormData, address: e.target.value})}
              placeholder="Alamat pengiriman / workshop..." 
              className="w-full p-3 bg-gray-50 border border-gray-200 rounded-xl text-sm focus:ring-2 focus:ring-teal-500/20 focus:bg-white outline-none min-h-[80px]"
            />
          </div>

          <div className="space-y-1.5">
            <label className="text-xs font-bold text-gray-700 uppercase tracking-wider block">Status Akses Portal</label>
            <select 
              value={editFormData.status}
              onChange={(e) => setEditFormData({...editFormData, status: e.target.value})}
              className="w-full p-3 bg-gray-50 border border-gray-200 rounded-xl text-sm font-semibold focus:ring-2 focus:ring-teal-500/20 focus:bg-white outline-none"
            >
              <option value="Active">Aktif (Dapat Lacak Pesanan)</option>
              <option value="Inactive">Nonaktif (Akses Lacak Ditutup)</option>
              <option value="Lead">Prospek</option>
              <option value="Blocked">Diblokir</option>
            </select>
          </div>

          <div className="pt-4 flex justify-end gap-3 border-t border-gray-100">
            <button 
              type="button"
              disabled={saving}
              onClick={() => {
                setIsEditModalOpen(false);
                setCustomerToEdit(null);
              }} 
              className="px-6 py-2.5 text-sm font-semibold text-gray-500 hover:text-gray-900 cursor-pointer"
            >
              Batal
            </button>
            <button 
              type="submit"
              disabled={saving}
              className="px-8 py-2.5 bg-gradient-to-r from-teal-600 to-emerald-600 hover:from-teal-700 hover:to-emerald-700 text-white rounded-2xl text-sm font-semibold shadow-lg shadow-teal-600/20 transition-all flex items-center gap-2 cursor-pointer disabled:opacity-60"
            >
              {saving && <Loader2 size={16} className="animate-spin" />}
              <span>Simpan Perubahan</span>
            </button>
          </div>
        </form>
      </Modal>

      {/* ADD CUSTOMER MODAL */}
      <Modal 
        isOpen={isModalOpen} 
        onClose={() => setIsModalOpen(false)} 
        title="Tambah Pelanggan Baru"
      >
        <form onSubmit={handleSubmit} className="space-y-5">
          <div className="space-y-1.5">
            <label className="text-xs font-bold text-gray-700 uppercase tracking-wider block">ID Pelanggan (Manual) *</label>
            <input 
              required
              type="text" 
              value={formData.id}
              onChange={(e) => setFormData({...formData, id: e.target.value})}
              placeholder="misal: CUST-001" 
              className="w-full p-3 bg-gray-50 border border-gray-200 rounded-xl text-sm font-bold uppercase focus:ring-2 focus:ring-teal-500/20 focus:bg-white outline-none" 
            />
          </div>
          <div className="space-y-1.5">
            <label className="text-xs font-bold text-gray-700 uppercase tracking-wider block">Nama Pelanggan *</label>
            <input 
              required
              type="text" 
              value={formData.name}
              onChange={(e) => setFormData({...formData, name: e.target.value})}
              placeholder="misal: John Doe" 
              className="w-full p-3 bg-gray-50 border border-gray-200 rounded-xl text-sm focus:ring-2 focus:ring-teal-500/20 focus:bg-white outline-none" 
            />
          </div>
          <div className="space-y-1.5">
            <label className="text-xs font-bold text-gray-700 uppercase tracking-wider block">Nama Perusahaan / Brand</label>
            <input 
              type="text" 
              value={formData.company}
              onChange={(e) => setFormData({...formData, company: e.target.value})}
              placeholder="misal: PT. Fashion Global" 
              className="w-full p-3 bg-gray-50 border border-gray-200 rounded-xl text-sm focus:ring-2 focus:ring-teal-500/20 focus:bg-white outline-none" 
            />
          </div>
          <div className="space-y-1.5">
            <label className="text-xs font-bold text-gray-700 uppercase tracking-wider block">Info Kontak (No HP / WA) *</label>
            <input 
              required
              type="text" 
              value={formData.contact}
              onChange={(e) => setFormData({...formData, contact: e.target.value})}
              placeholder="08xxxxxxxxxx atau email" 
              className="w-full p-3 bg-gray-50 border border-gray-200 rounded-xl text-sm focus:ring-2 focus:ring-teal-500/20 focus:bg-white outline-none" 
            />
          </div>
          <div className="space-y-1.5">
            <label className="text-xs font-bold text-gray-700 uppercase tracking-wider block">Alamat Lengkap</label>
            <textarea 
              value={formData.address}
              onChange={(e) => setFormData({...formData, address: e.target.value})}
              placeholder="Alamat pengiriman / workshop..." 
              className="w-full p-3 bg-gray-50 border border-gray-200 rounded-xl text-sm focus:ring-2 focus:ring-teal-500/20 focus:bg-white outline-none min-h-[80px]"
            />
          </div>
          <div className="space-y-1.5">
            <label className="text-xs font-bold text-gray-700 uppercase tracking-wider block">Status Akses</label>
            <select 
              value={formData.status}
              onChange={(e) => setFormData({...formData, status: e.target.value})}
              className="w-full p-3 bg-gray-50 border border-gray-200 rounded-xl text-sm font-semibold focus:ring-2 focus:ring-teal-500/20 focus:bg-white outline-none"
            >
              <option value="Active">Aktif (Dapat Lacak Pesanan)</option>
              <option value="Inactive">Nonaktif (Akses Lacak Ditutup)</option>
              <option value="Lead">Prospek</option>
              <option value="Blocked">Diblokir</option>
            </select>
          </div>
          <div className="pt-4 flex justify-end gap-3 border-t border-gray-100">
            <button 
              type="button"
              onClick={() => setIsModalOpen(false)} 
              className="px-6 py-2.5 text-sm font-semibold text-gray-500 hover:text-gray-900 cursor-pointer"
            >
              Batal
            </button>
            <button 
              type="submit"
              className="px-8 py-2.5 bg-gradient-to-r from-teal-600 to-emerald-600 hover:from-teal-700 hover:to-emerald-700 text-white rounded-2xl text-sm font-semibold shadow-lg shadow-teal-600/20 transition-all cursor-pointer"
            >
              Simpan Pelanggan
            </button>
          </div>
        </form>
      </Modal>

      <ConfirmModal
        isOpen={isDeleteModalOpen}
        onClose={() => {
          setIsDeleteModalOpen(false);
          setCustomerToDelete(null);
        }}
        onConfirm={confirmDelete}
        title="Konfirmasi Hapus"
        message="Apakah Anda yakin ingin menghapus klien ini? Data yang dihapus tidak dapat dikembalikan."
      />

      {/* 360-DEGREE CUSTOMER OVERVIEW MODAL */}
      <CustomerOverviewModal
        isOpen={isOverviewModalOpen}
        onClose={() => {
          setIsOverviewModalOpen(false);
          setOverviewCustomer(null);
        }}
        customerId={overviewCustomer?.id || null}
        customerName={overviewCustomer?.name || ''}
      />
    </div>
  );
};
