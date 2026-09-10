import React, { useState, useEffect } from 'react';
import { Card } from '../App';
import { 
  Palette, 
  Beaker, 
  Plus, 
  Search, 
  Image as ImageIcon,
  Clock, 
  Loader2, 
  Upload, 
  X as XIcon, 
  Trash2,
  Users,
  CheckCircle2,
  AlertCircle
} from 'lucide-react';
import { cn, generateId } from '../lib/utils';
import { sheetsService, imageService } from '../services/googleService';
import { Modal } from './ui/Modal';
import { ConfirmModal } from './ui/ConfirmModal';

export const DesignsModule = () => {
  const [activeTab, setActiveTab] = useState<'designs' | 'samples'>('designs');
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [isDetailsOpen, setIsDetailsOpen] = useState(false);
  const [isDeleteModalOpen, setIsDeleteModalOpen] = useState(false);
  const [itemToDelete, setItemToDelete] = useState<string | null>(null);
  const [selectedItem, setSelectedItem] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [uploading, setUploading] = useState(false);
  const [uploadProgress, setUploadProgress] = useState(0);
  const [designs, setDesigns] = useState<any[]>([]);
  const [samples, setSamples] = useState<any[]>([]);
  const [customers, setCustomers] = useState<any[]>([]);
  const [searchQuery, setSearchQuery] = useState('');
  
  const [formData, setFormData] = useState({
    name: '',
    category: 'Kaos / T-Shirt',
    status: 'Draft',
    description: '',
    imageUrl: '',
    customerId: ''
  });

  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    try {
      setUploading(true);
      setUploadProgress(0);
      
      const result = await imageService.upload(file, (progress) => {
        setUploadProgress(progress);
      });
      
      setFormData(prev => ({ ...prev, imageUrl: result.url }));
    } catch (error: any) {
      console.error('Upload failed:', error);
      const message = error.response?.data?.error || error.message || 'Gagal mengunggah foto.';
      alert(message);
    } finally {
      setUploading(false);
    }
  };

  const fetchData = async () => {
    try {
      setLoading(true);
      const [designData, sampleData, customerData] = await Promise.all([
        sheetsService.getAll('Designs'),
        sheetsService.getAll('Samples'),
        sheetsService.getAll('Customers')
      ]);
      setDesigns(Array.isArray(designData) ? designData : []);
      setSamples(Array.isArray(sampleData) ? sampleData : []);
      setCustomers(Array.isArray(customerData) ? customerData : []);
    } catch (error) {
      console.error('Error fetching design/sample data:', error);
      setDesigns([]);
      setSamples([]);
      setCustomers([]);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
  }, []);

  const handleOpenModal = () => {
    setFormData({
      name: '',
      category: 'Kaos / T-Shirt',
      status: activeTab === 'designs' ? 'Draft' : 'In Progress',
      description: '',
      imageUrl: '',
      customerId: ''
    });
    setIsModalOpen(true);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      const sheetName = activeTab === 'designs' ? 'Designs' : 'Samples';
      const prefix = activeTab === 'designs' ? 'DSN' : 'SMP';
      
      const selectedCustomer = customers.find(c => 
        String(c.id).trim().toLowerCase() === String(formData.customerId).trim().toLowerCase()
      );

      const newItem = {
        id: generateId(prefix),
        timestamp: new Date().toISOString(),
        user: 'Admin HIJ',
        name: formData.name,
        category: formData.category,
        status: formData.status,
        description: formData.description,
        imageUrl: formData.imageUrl,
        customerId: formData.customerId ? formData.customerId.trim() : '',
        customerName: selectedCustomer ? selectedCustomer.name : undefined
      };
      
      await sheetsService.create(sheetName, newItem);
      setIsModalOpen(false);
      setFormData({
        name: '',
        category: 'Kaos / T-Shirt',
        status: activeTab === 'designs' ? 'Draft' : 'In Progress',
        description: '',
        imageUrl: '',
        customerId: ''
      });
      fetchData();
    } catch (error) {
      alert('Gagal menyimpan data.');
    }
  };

  const handleDelete = (id: string) => {
    if (!id) {
      alert('ID tidak ditemukan. Data ini mungkin tidak dapat dihapus.');
      return;
    }
    setItemToDelete(id);
    setIsDeleteModalOpen(true);
  };

  const confirmDelete = async () => {
    if (!itemToDelete) return;
    
    try {
      const sheetName = activeTab === 'designs' ? 'Designs' : 'Samples';
      await sheetsService.delete(sheetName, itemToDelete);
      fetchData();
      if (isDetailsOpen) setIsDetailsOpen(false);
    } catch (error: any) {
      console.error('Error deleting item:', error);
      const message = error.response?.data?.error || error.message || 'Gagal menghapus data.';
      alert(`Gagal menghapus data: ${message}`);
    } finally {
      setItemToDelete(null);
    }
  };

  const handleUpdateItemStatus = async (item: any, newStatus: string) => {
    try {
      const sheetName = activeTab === 'designs' ? 'Designs' : 'Samples';
      const updatedItem = { ...item, status: newStatus, updatedAt: new Date().toISOString() };
      await sheetsService.update(sheetName, item.id, updatedItem);
      setSelectedItem(updatedItem);
      fetchData();
    } catch (error) {
      alert('Gagal memperbarui status item.');
    }
  };

  const handleViewDetails = (item: any) => {
    setSelectedItem(item);
    setIsDetailsOpen(true);
  };

  const getImageUrl = (item: any) => {
    if (!item) return null;
    if (item.imageUrl) return item.imageUrl;
    
    // Check for common variations of image column names
    const variations = ['image', 'photo', 'gambar', 'foto', 'url', 'image url', 'link', 'preview', 'sketch', 'imageurl'];
    const keys = Object.keys(item);
    
    for (const variation of variations) {
      const foundKey = keys.find(k => k.toLowerCase().trim() === variation);
      if (foundKey && item[foundKey]) return item[foundKey];
    }
    
    return null;
  };

  const currentList = activeTab === 'designs' ? designs : samples;
  const filteredList = currentList.filter(item => 
    item.name?.toLowerCase().includes(searchQuery.toLowerCase()) ||
    item.category?.toLowerCase().includes(searchQuery.toLowerCase()) ||
    item.id?.toLowerCase().includes(searchQuery.toLowerCase()) ||
    item.customerId?.toLowerCase().includes(searchQuery.toLowerCase()) ||
    item.customerName?.toLowerCase().includes(searchQuery.toLowerCase())
  );

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
          <h2 className="text-2xl font-bold text-gray-900">Desain & Sampel</h2>
          <p className="text-sm text-gray-500">SOP 4 & 5: Kelola katalog desain produk, sampel prototipe, dan keterhubungan pelanggan.</p>
        </div>
        <button 
          onClick={handleOpenModal}
          className="w-full sm:w-auto bg-gradient-to-r from-teal-600 to-emerald-600 hover:from-teal-700 hover:to-emerald-700 text-white px-6 py-2.5 rounded-2xl text-xs sm:text-sm font-semibold flex items-center justify-center gap-2 transition-all shadow-lg shadow-teal-600/20 cursor-pointer"
        >
          <Plus size={18} />
          {activeTab === 'designs' ? 'Tambah Desain Baru' : 'Tambah Sampel Baru'}
        </button>
      </div>

      <div className="flex flex-col sm:flex-row justify-between items-stretch sm:items-center gap-4">
        <div className="grid grid-cols-2 sm:flex gap-1.5 p-1.5 bg-gray-100 rounded-2xl w-full sm:w-fit">
          <button
            onClick={() => {
              setActiveTab('designs');
              setSearchQuery('');
            }}
            className={cn(
              "px-4 sm:px-6 py-2.5 rounded-xl text-xs sm:text-sm font-semibold transition-all flex items-center justify-center gap-2 cursor-pointer",
              activeTab === 'designs' ? "bg-white text-teal-700 shadow-sm" : "text-gray-500 hover:text-gray-700"
            )}
          >
            <Palette size={16} />
            Desain ({designs.length})
          </button>
          <button
            onClick={() => {
              setActiveTab('samples');
              setSearchQuery('');
            }}
            className={cn(
              "px-4 sm:px-6 py-2.5 rounded-xl text-xs sm:text-sm font-semibold transition-all flex items-center justify-center gap-2 cursor-pointer",
              activeTab === 'samples' ? "bg-white text-teal-700 shadow-sm" : "text-gray-500 hover:text-gray-700"
            )}
          >
            <Beaker size={16} />
            Sampel ({samples.length})
          </button>
        </div>

        <div className="relative flex-1 sm:max-w-md">
          <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 text-gray-400" size={17} />
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Cari nama desain, kategori, ID, atau pelanggan..."
            className="w-full pl-10 pr-10 py-2.5 bg-white border border-gray-200 rounded-2xl text-xs sm:text-sm focus:ring-2 focus:ring-teal-500/20 focus:border-teal-500 outline-none transition-all"
          />
          {searchQuery && (
            <button
              onClick={() => setSearchQuery('')}
              className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600 p-1 rounded-full hover:bg-gray-100 cursor-pointer"
              title="Hapus pencarian"
            >
              <XIcon size={15} />
            </button>
          )}
        </div>
      </div>

      {loading ? (
        <div className="flex flex-col items-center justify-center py-20">
          <Loader2 className="animate-spin text-teal-600 mb-4" size={32} />
          <p className="text-gray-500 text-sm">Memuat data...</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {filteredList.map((item, i) => {
            const displayImageUrl = getImageUrl(item);
            return (
              <Card key={item.id || i}>
                <div className="aspect-square bg-gray-100 rounded-2xl mb-4 overflow-hidden relative group">
                  {displayImageUrl ? (
                    <img 
                      src={displayImageUrl} 
                      alt={item.name} 
                      className="w-full h-full object-cover transition-transform group-hover:scale-105"
                      referrerPolicy="no-referrer"
                    />
                  ) : (
                    <div className="w-full h-full flex items-center justify-center text-gray-300">
                      <ImageIcon size={48} />
                    </div>
                  )}
                  
                  {/* Status Badge */}
                  <div className="absolute top-3 right-3">
                    <span className={cn(
                      "px-3 py-1 rounded-full text-[10px] font-bold uppercase tracking-wider backdrop-blur-md border shadow-xs",
                      ['approved', 'disetujui'].includes(String(item.status).toLowerCase()) ? "bg-emerald-500/20 text-emerald-800 border-emerald-300/50 bg-white/90" : 
                      ['in progress', 'dalam proses', 'in review'].includes(String(item.status).toLowerCase()) ? "bg-teal-500/20 text-teal-800 border-teal-300/50 bg-white/90" : 
                      ['rejected', 'ditolak'].includes(String(item.status).toLowerCase()) ? "bg-red-500/20 text-red-800 border-red-300/50 bg-white/90" :
                      ['revision', 'revisi', 'rework'].includes(String(item.status).toLowerCase()) ? "bg-orange-500/20 text-orange-800 border-orange-300/50 bg-white/90" :
                      "bg-gray-500/20 text-gray-800 border-gray-300/50 bg-white/90"
                    )}>
                      {item.status || 'Draft'}
                    </span>
                  </div>
                </div>

                <div className="space-y-2.5">
                  <div className="flex justify-between items-start">
                    <div>
                      <h3 className="font-bold text-gray-900 leading-snug">{item.name}</h3>
                      <p className="text-xs text-gray-500 font-medium">{item.category}</p>
                    </div>
                    <span className="text-[10px] font-bold text-gray-400 bg-gray-50 px-2 py-0.5 rounded border border-gray-100">{item.id || 'NO ID'}</span>
                  </div>

                  {/* Customer Linked Badge */}
                  {item.customerId ? (
                    <div className="flex items-center gap-1.5 text-[11px] font-bold text-teal-800 bg-teal-50 border border-teal-200/80 px-2.5 py-1 rounded-xl w-fit">
                      <Users size={13} className="text-teal-600 flex-shrink-0" />
                      <span className="truncate max-w-[220px]">
                        {item.customerId} {item.customerName ? `• ${item.customerName}` : ''}
                      </span>
                    </div>
                  ) : (
                    <div className="flex items-center gap-1.5 text-[10px] font-semibold text-gray-400 bg-gray-50 border border-gray-100 px-2 py-0.5 rounded-md w-fit">
                      <span>Umum / Internal</span>
                    </div>
                  )}

                  <p className="text-xs text-gray-600 line-clamp-2">{item.description || 'Tidak ada catatan tambahan.'}</p>
                  
                  <div className="pt-3.5 flex items-center justify-between border-t border-gray-100">
                    <div className="flex items-center gap-3">
                      <div className="flex items-center gap-1.5 text-[11px] text-gray-400">
                        <Clock size={13} />
                        {new Date(item.timestamp).toLocaleDateString()}
                      </div>
                      <button 
                        onClick={() => handleDelete(item.id)}
                        className="p-1 text-red-500 hover:bg-red-50 rounded-lg transition-colors cursor-pointer"
                        title="Hapus Item"
                      >
                        <Trash2 size={15} />
                      </button>
                    </div>
                    <button 
                      onClick={() => handleViewDetails(item)}
                      className="text-xs font-bold text-teal-600 hover:text-teal-700 cursor-pointer"
                    >
                      Lihat Detail →
                    </button>
                  </div>
                </div>
              </Card>
            );
          })}
          {filteredList.length === 0 && (
            <div className="col-span-full py-20 text-center bg-white rounded-[32px] border border-dashed border-gray-200">
              <p className="text-gray-500 font-medium">Tidak ada {activeTab === 'designs' ? 'desain' : 'sampel'} ditemukan.</p>
            </div>
          )}
        </div>
      )}

      {/* DETAIL MODAL */}
      <Modal 
        isOpen={isDetailsOpen} 
        onClose={() => setIsDetailsOpen(false)} 
        title={activeTab === 'designs' ? 'Detail Desain Produk' : 'Detail Sampel Prototipe'}
      >
        {selectedItem && (
          <div className="space-y-6">
            <div className="aspect-video bg-gray-100 rounded-2xl overflow-hidden border border-gray-200">
              {getImageUrl(selectedItem) ? (
                <img 
                  src={getImageUrl(selectedItem)} 
                  alt={selectedItem.name} 
                  className="w-full h-full object-contain bg-white"
                  referrerPolicy="no-referrer"
                />
              ) : (
                <div className="w-full h-full flex items-center justify-center text-gray-300">
                  <ImageIcon size={64} />
                </div>
              )}
            </div>
            
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-1">
                <p className="text-[10px] font-bold text-gray-400 uppercase tracking-wider">ID Item</p>
                <p className="text-sm font-bold text-gray-900">{selectedItem.id}</p>
              </div>

              <div className="space-y-1">
                <p className="text-[10px] font-bold text-gray-400 uppercase tracking-wider">Ubah Status</p>
                <select
                  value={selectedItem.status || 'Draft'}
                  onChange={(e) => handleUpdateItemStatus(selectedItem, e.target.value)}
                  className="w-full text-xs font-bold uppercase tracking-wider bg-gray-50 border border-gray-200 rounded-xl px-2.5 py-1.5 focus:ring-2 focus:ring-teal-500/20 outline-none"
                >
                  {activeTab === 'designs' ? (
                    <>
                      <option value="Draft">Draft</option>
                      <option value="In Review">Dalam Peninjauan (In Review)</option>
                      <option value="Approved">Disetujui (Approved)</option>
                      <option value="Revision">Perlu Revisi (Revision)</option>
                      <option value="Rejected">Ditolak</option>
                    </>
                  ) : (
                    <>
                      <option value="In Progress">Dalam Proses (In Progress)</option>
                      <option value="Approved">Disetujui (Approved)</option>
                      <option value="Approved with notes">Disetujui dengan Catatan</option>
                      <option value="Rework">Perbaikan / Rework</option>
                      <option value="Rejected">Ditolak</option>
                    </>
                  )}
                </select>
              </div>

              <div className="space-y-1 col-span-2">
                <p className="text-[10px] font-bold text-gray-400 uppercase tracking-wider">Pelanggan Terhubung</p>
                <div className="p-3 bg-teal-50/50 rounded-xl border border-teal-100 flex items-center gap-2">
                  <Users size={16} className="text-teal-600 flex-shrink-0" />
                  {selectedItem.customerId ? (
                    <span className="text-sm font-bold text-teal-900">
                      {selectedItem.customerId} - {selectedItem.customerName || 'Pelanggan HIJ'}
                    </span>
                  ) : (
                    <span className="text-xs text-gray-500 italic">
                      Umum / Tidak terhubung ke pelanggan tertentu (Bisa dilihat di semua katalog internal)
                    </span>
                  )}
                </div>
              </div>

              <div className="space-y-1 col-span-2">
                <p className="text-[10px] font-bold text-gray-400 uppercase tracking-wider">Nama Item</p>
                <p className="text-sm font-semibold text-gray-900">{selectedItem.name}</p>
              </div>

              <div className="space-y-1">
                <p className="text-[10px] font-bold text-gray-400 uppercase tracking-wider">Kategori</p>
                <p className="text-sm font-semibold text-gray-900">{selectedItem.category}</p>
              </div>

              <div className="space-y-1">
                <p className="text-[10px] font-bold text-gray-400 uppercase tracking-wider">Dibuat Oleh</p>
                <p className="text-sm font-semibold text-gray-900">{selectedItem.user || 'Admin HIJ'}</p>
              </div>

              <div className="space-y-1 col-span-2">
                <p className="text-[10px] font-bold text-gray-400 uppercase tracking-wider">Deskripsi & Catatan Spesifikasi</p>
                <p className="text-sm text-gray-600 bg-gray-50 p-3 rounded-xl border border-gray-100 whitespace-pre-wrap">
                  {selectedItem.description || 'Tidak ada deskripsi.'}
                </p>
              </div>

              <div className="space-y-1 col-span-2">
                <p className="text-[10px] font-bold text-gray-400 uppercase tracking-wider">Tanggal Dibuat</p>
                <p className="text-xs text-gray-500 font-medium">{new Date(selectedItem.timestamp).toLocaleString('id-ID')}</p>
              </div>
            </div>

            <div className="pt-4 flex justify-between gap-3 border-t border-gray-100">
              <button
                type="button"
                onClick={() => {
                  setIsDetailsOpen(false);
                  handleDelete(selectedItem.id);
                }}
                className="px-5 py-2.5 bg-red-50 hover:bg-red-100 text-red-600 rounded-2xl text-xs font-bold transition-all flex items-center gap-1.5 cursor-pointer"
              >
                <Trash2 size={15} />
                Hapus Item
              </button>
              <button 
                onClick={() => setIsDetailsOpen(false)}
                className="px-8 py-2.5 bg-gray-900 text-white rounded-2xl text-sm font-semibold hover:bg-gray-800 transition-all cursor-pointer"
              >
                Tutup
              </button>
            </div>
          </div>
        )}
      </Modal>

      {/* CREATE NEW ITEM MODAL */}
      <Modal 
        isOpen={isModalOpen} 
        onClose={() => setIsModalOpen(false)} 
        title={activeTab === 'designs' ? 'Tambah Desain Baru' : 'Tambah Sampel Prototipe Baru'}
      >
        <form onSubmit={handleSubmit} className="space-y-5">
          <div className="space-y-1.5">
            <label className="text-xs font-bold text-gray-700 uppercase tracking-wider block">
              Nama {activeTab === 'designs' ? 'Desain' : 'Sampel'} *
            </label>
            <input 
              required
              type="text" 
              value={formData.name}
              onChange={(e) => setFormData({...formData, name: e.target.value})}
              placeholder="misal: Kaos Event Summer Festival 2026" 
              className="w-full p-3 bg-gray-50 border border-gray-200 rounded-xl text-sm focus:ring-2 focus:ring-teal-500/20 focus:bg-white outline-none" 
            />
          </div>

          {/* CUSTOMER ASSOCIATION DROPDOWN (Requirement 2) */}
          <div className="space-y-1.5">
            <label className="text-xs font-bold text-teal-900 uppercase tracking-wider block flex items-center gap-1.5">
              <Users size={14} className="text-teal-600" />
              <span>Hubungkan ke Pelanggan (Opsional)</span>
            </label>
            <select
              value={formData.customerId}
              onChange={(e) => setFormData({...formData, customerId: e.target.value})}
              className="w-full p-3 bg-teal-50/40 border border-teal-200/80 rounded-xl text-sm font-semibold focus:ring-2 focus:ring-teal-500/20 focus:bg-white outline-none text-gray-800"
            >
              <option value="">-- Gambar Umum / Tidak Terhubung ke Pelanggan Tertentu --</option>
              {customers.map(c => (
                <option key={c.id} value={c.id}>
                  {c.id} - {c.name} {c.company ? `(${c.company})` : ''}
                </option>
              ))}
            </select>
            <p className="text-[11px] text-gray-400">
              Pilih pelanggan jika gambar ini adalah pesanan khusus pelanggan tersebut agar muncul di Portal Pelanggannya.
            </p>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            {/* CATEGORY DROPDOWN */}
            <div className="space-y-1.5">
              <label className="text-xs font-bold text-gray-700 uppercase tracking-wider block">Kategori Produk</label>
              <select 
                value={formData.category}
                onChange={(e) => setFormData({...formData, category: e.target.value})}
                className="w-full p-3 bg-gray-50 border border-gray-200 rounded-xl text-sm font-semibold focus:ring-2 focus:ring-teal-500/20 focus:bg-white outline-none" 
              >
                <option value="Kaos / T-Shirt">Kaos / T-Shirt</option>
                <option value="Polo Shirt">Polo Shirt</option>
                <option value="Kemeja / PDH / PDL">Kemeja / PDH / PDL</option>
                <option value="Jaket / Hoodie / Zipper">Jaket / Hoodie / Zipper</option>
                <option value="Jersey Olahraga">Jersey Olahraga</option>
                <option value="Rompi / Vest">Rompi / Vest</option>
                <option value="Celana / Training">Celana / Training</option>
                <option value="Topi / Aksesoris">Topi / Aksesoris</option>
                <option value="Lainnya">Lainnya</option>
              </select>
            </div>

            {/* STATUS DROPDOWN (Requirement 3: Replaced manual input with select dropdown) */}
            <div className="space-y-1.5">
              <label className="text-xs font-bold text-gray-700 uppercase tracking-wider block">Status</label>
              <select 
                value={formData.status}
                onChange={(e) => setFormData({...formData, status: e.target.value})}
                className="w-full p-3 bg-gray-50 border border-gray-200 rounded-xl text-sm font-semibold focus:ring-2 focus:ring-teal-500/20 focus:bg-white outline-none" 
              >
                {activeTab === 'designs' ? (
                  <>
                    <option value="Draft">Draft (Konsep Awal)</option>
                    <option value="In Review">Dalam Peninjauan (In Review)</option>
                    <option value="Approved">Disetujui (Approved)</option>
                    <option value="Revision">Perlu Revisi (Revision)</option>
                    <option value="Rejected">Ditolak (Rejected)</option>
                  </>
                ) : (
                  <>
                    <option value="In Progress">Dalam Proses (In Progress)</option>
                    <option value="Approved">Disetujui (Approved)</option>
                    <option value="Approved with notes">Disetujui dengan Catatan</option>
                    <option value="Rework">Perbaikan / Rework</option>
                    <option value="Rejected">Ditolak (Rejected)</option>
                  </>
                )}
              </select>
            </div>
          </div>

          <div className="space-y-1.5">
            <label className="text-xs font-bold text-gray-700 uppercase tracking-wider block">Deskripsi & Spesifikasi</label>
            <textarea 
              rows={3}
              value={formData.description}
              onChange={(e) => setFormData({...formData, description: e.target.value})}
              placeholder="Spesifikasi teknis, jenis sablon/bordir, detail kain, dll."
              className="w-full p-3 bg-gray-50 border border-gray-200 rounded-xl text-sm focus:ring-2 focus:ring-teal-500/20 focus:bg-white outline-none"
            />
          </div>

          <div className="space-y-1.5">
            <label className="text-xs font-bold text-gray-700 uppercase tracking-wider block">Foto / Sketsa Desain</label>
            <div className="flex flex-col gap-4">
              {formData.imageUrl ? (
                <div className="relative aspect-video bg-gray-100 rounded-2xl overflow-hidden group border border-gray-200">
                  <img 
                    src={formData.imageUrl} 
                    alt="Preview" 
                    className="w-full h-full object-contain bg-white"
                    referrerPolicy="no-referrer"
                  />
                  <button 
                    type="button"
                    onClick={() => setFormData({...formData, imageUrl: ''})}
                    className="absolute top-2 right-2 px-3 py-1.5 bg-black/70 hover:bg-red-600 text-white text-xs font-semibold rounded-xl flex items-center gap-1.5 transition-colors shadow-sm cursor-pointer"
                  >
                    <XIcon size={14} />
                    <span>Hapus Foto</span>
                  </button>
                </div>
              ) : (
                <>
                  <label className="flex flex-col items-center justify-center aspect-video border-2 border-dashed border-gray-200 rounded-2xl cursor-pointer hover:bg-teal-50/50 hover:border-teal-300 transition-all group">
                    {uploading ? (
                      <div className="flex flex-col items-center gap-2 w-full px-10">
                        <Loader2 className="animate-spin text-teal-600" size={28} />
                        <div className="w-full bg-gray-100 h-2 rounded-full overflow-hidden mt-2">
                          <div 
                            className="bg-teal-600 h-full transition-all duration-300" 
                            style={{ width: `${uploadProgress}%` }}
                          ></div>
                        </div>
                        <span className="text-xs font-bold text-teal-700">{uploadProgress}% Mengunggah ke server lokal...</span>
                      </div>
                    ) : (
                      <>
                        <Upload className="text-gray-300 group-hover:text-teal-600 transition-colors mb-2" size={32} />
                        <span className="text-xs font-bold text-gray-600 group-hover:text-teal-700 transition-colors">Klik untuk mengunggah foto dari file lokal</span>
                        <span className="text-[10px] text-gray-400 mt-1">JPG, PNG, GIF hingga 10MB</span>
                      </>
                    )}
                    <input 
                      type="file" 
                      className="hidden" 
                      accept="image/*"
                      onChange={handleFileUpload}
                      disabled={uploading}
                    />
                  </label>
                  
                  <div className="flex items-center gap-2 my-1">
                    <div className="h-px flex-1 bg-gray-200"></div>
                    <span className="text-[10px] font-bold text-gray-400 uppercase">ATAU TEMPEL LINK GAMBAR</span>
                    <div className="h-px flex-1 bg-gray-200"></div>
                  </div>

                  <input 
                    type="text" 
                    value={formData.imageUrl}
                    onChange={(e) => setFormData({...formData, imageUrl: e.target.value})}
                    placeholder="https://example.com/foto-desain.jpg (Opsional jika tidak upload file)" 
                    className="w-full p-3 bg-gray-50 border border-gray-200 rounded-xl text-sm focus:ring-2 focus:ring-teal-500/20 focus:bg-white outline-none" 
                  />
                </>
              )}
            </div>
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
              Simpan {activeTab === 'designs' ? 'Desain' : 'Sampel'}
            </button>
          </div>
        </form>
      </Modal>

      <ConfirmModal
        isOpen={isDeleteModalOpen}
        onClose={() => {
          setIsDeleteModalOpen(false);
          setItemToDelete(null);
        }}
        onConfirm={confirmDelete}
        title="Konfirmasi Hapus"
        message={`Apakah Anda yakin ingin menghapus ${activeTab === 'designs' ? 'desain' : 'sampel'} ini? Data yang dihapus tidak dapat dikembalikan.`}
      />
    </div>
  );
};
