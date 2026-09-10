import React, { useState, useEffect } from 'react';
import { Card } from '../App';
import { 
  Package, 
  ArrowUpRight, 
  ArrowDownLeft, 
  History, 
  AlertTriangle,
  Plus,
  Search,
  Loader2,
  X
} from 'lucide-react';
import { cn, formatCurrency, generateId } from '../lib/utils';
import { sheetsService } from '../services/googleService';
import { Modal } from './ui/Modal';

export const InventoryModule = () => {
  const [activeTab, setActiveTab] = useState<'materials' | 'finished' | 'others' | 'history'>('materials');
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [loading, setLoading] = useState(true);
  const [data, setData] = useState<any[]>([]);
  const [searchQuery, setSearchQuery] = useState('');
  
  const [formData, setFormData] = useState({
    name: '',
    stock: 0,
    unit: 'Roll',
    minStock: 10,
    price: 0,
    category: 'Bahan Baku'
  });

  const fetchData = async () => {
    try {
      setLoading(true);
      let sheetName = 'Inventory_Bahan';
      if (activeTab === 'finished') sheetName = 'Inventory_Produk_Jadi';
      if (activeTab === 'others') sheetName = 'Inventory_Lainnya';
      
      const items = await sheetsService.getAll(sheetName);
      setData(Array.isArray(items) ? items : []);
    } catch (error) {
      console.error('Error fetching inventory data:', error);
      setData([]);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
  }, [activeTab]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      let sheetName = 'Inventory_Bahan';
      let prefix = 'MAT';
      
      if (activeTab === 'finished') {
        sheetName = 'Inventory_Produk_Jadi';
        prefix = 'PRD';
      } else if (activeTab === 'others') {
        sheetName = 'Inventory_Lainnya';
        prefix = 'OTH';
      }
      
      const newItem = {
        id: generateId(prefix),
        timestamp: new Date().toISOString(),
        user: 'Admin HIJ',
        ...formData
      };
      
      await sheetsService.create(sheetName, newItem);
      setIsModalOpen(false);
      fetchData();
    } catch (error) {
      alert('Gagal menyimpan data inventaris.');
    }
  };

  const filteredData = data.filter(item => {
    if (!searchQuery.trim()) return true;
    const q = searchQuery.toLowerCase().trim();
    const name = String(item.name || '').toLowerCase();
    const id = String(item.id || '').toLowerCase();
    const category = String(item.category || '').toLowerCase();
    const unit = String(item.unit || '').toLowerCase();
    return name.includes(q) || id.includes(q) || category.includes(q) || unit.includes(q);
  });

  const lowStockCount = data.filter(item => Number(item.stock) <= Number(item.minStock)).length;

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
          <h2 className="text-2xl font-bold text-gray-900">Manajemen Inventaris</h2>
          <p className="text-sm text-gray-500">Lacak tingkat stok bahan baku dan produk jadi.</p>
        </div>
        <div className="flex flex-wrap gap-2 sm:gap-3 w-full sm:w-auto">
          <button className="flex-1 sm:flex-initial bg-white text-gray-900 border border-gray-200 px-4 sm:px-6 py-2.5 rounded-2xl text-xs sm:text-sm font-semibold hover:bg-gray-50 transition-all">
            Stock Opname
          </button>
          <button 
            onClick={() => setIsModalOpen(true)}
            className="flex-1 sm:flex-initial bg-gradient-to-r from-teal-600 to-emerald-600 hover:from-teal-700 hover:to-emerald-700 text-white px-4 sm:px-6 py-2.5 rounded-2xl text-xs sm:text-sm font-semibold flex items-center justify-center gap-2 transition-all shadow-lg shadow-teal-600/20"
          >
            <Plus size={18} />
            Tambah Stok
          </button>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-4 sm:gap-6">
        <div className="bg-white rounded-3xl p-6 border border-gray-100 shadow-sm">
          <div className="flex items-center gap-4 mb-4">
            <div className="w-10 h-10 rounded-xl bg-teal-50 flex items-center justify-center text-teal-600">
              <Package size={20} />
            </div>
            <span className="text-sm font-medium text-gray-500">Total Item</span>
          </div>
          <h4 className="text-2xl font-bold">{data.length}</h4>
          <p className="text-xs text-gray-400 mt-1">Dalam kategori ini</p>
        </div>
        <div className="bg-white rounded-3xl p-6 border border-gray-100 shadow-sm">
          <div className="flex items-center gap-4 mb-4">
            <div className="w-10 h-10 rounded-xl bg-red-50 flex items-center justify-center text-red-600">
              <AlertTriangle size={20} />
            </div>
            <span className="text-sm font-medium text-gray-500">Peringatan Stok Rendah</span>
          </div>
          <h4 className="text-2xl font-bold">{lowStockCount} Item</h4>
          <p className="text-xs text-red-500 mt-1 font-medium">Tindakan diperlukan segera</p>
        </div>
        <div className="bg-white rounded-3xl p-6 border border-gray-100 shadow-sm">
          <div className="flex items-center gap-4 mb-4">
            <div className="w-10 h-10 rounded-xl bg-green-50 flex items-center justify-center text-green-600">
              <ArrowUpRight size={20} />
            </div>
            <span className="text-sm font-medium text-gray-500">Nilai Inventaris</span>
          </div>
          <h4 className="text-2xl font-bold">
            {formatCurrency(data.reduce((acc, item) => acc + (Number(item.price) * Number(item.stock)), 0))}
          </h4>
          <p className="text-xs text-gray-400 mt-1">Perkiraan nilai total</p>
        </div>
      </div>

      <div className="flex flex-col sm:flex-row justify-between items-stretch sm:items-center gap-4">
        <div className="grid grid-cols-2 sm:flex gap-1.5 p-1.5 bg-gray-100 rounded-2xl w-full sm:w-auto">
          {(['materials', 'finished', 'others', 'history'] as const).map((tab) => (
            <button
              key={tab}
              onClick={() => {
                setActiveTab(tab);
                setSearchQuery('');
              }}
              className={cn(
                "px-3 sm:px-6 py-2.5 rounded-xl text-xs sm:text-sm font-semibold transition-all capitalize text-center justify-center cursor-pointer",
                activeTab === tab ? "bg-white text-teal-700 shadow-sm" : "text-gray-500 hover:text-gray-700"
              )}
            >
              {tab === 'materials' ? 'Bahan Baku' : tab === 'finished' ? 'Barang Jadi' : tab === 'others' ? 'Keperluan Lainnya' : 'Riwayat Stok'}
            </button>
          ))}
        </div>

        {/* Search Bar */}
        <div className="relative flex-1 sm:max-w-md">
          <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 text-gray-400" size={18} />
          <input 
            type="text" 
            placeholder="Cari nama barang, kategori, ID, atau satuan..." 
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full pl-10 pr-10 py-2.5 bg-white border border-gray-200 rounded-2xl text-xs sm:text-sm focus:ring-2 focus:ring-teal-500/20 focus:border-teal-500 transition-all outline-none"
          />
          {searchQuery && (
            <button 
              onClick={() => setSearchQuery('')}
              className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600 p-1 rounded-full hover:bg-gray-100 cursor-pointer"
              title="Hapus pencarian"
            >
              <X size={15} />
            </button>
          )}
        </div>
      </div>

      {loading ? (
        <div className="flex flex-col items-center justify-center py-20">
          <Loader2 className="animate-spin text-teal-600 mb-4" size={32} />
          <p className="text-gray-500 text-sm">Memuat inventaris...</p>
        </div>
      ) : (
        <Card>

          {/* Desktop Table View */}
          <div className="hidden md:block overflow-x-auto">
            <table className="w-full text-left border-collapse">
              <thead>
                <tr className="border-b border-gray-100">
                  <th className="pb-4 font-bold text-sm text-gray-400 uppercase tracking-widest whitespace-nowrap pr-4">Nama Item</th>
                  <th className="pb-4 font-bold text-sm text-gray-400 uppercase tracking-widest whitespace-nowrap pr-4">Stok Saat Ini</th>
                  <th className="pb-4 font-bold text-sm text-gray-400 uppercase tracking-widest whitespace-nowrap pr-4">Satuan</th>
                  <th className="pb-4 font-bold text-sm text-gray-400 uppercase tracking-widest whitespace-nowrap pr-4">Min. Stok</th>
                  <th className="pb-4 font-bold text-sm text-gray-400 uppercase tracking-widest whitespace-nowrap pr-4">Nilai (Est)</th>
                  <th className="pb-4 font-bold text-sm text-gray-400 uppercase tracking-widest whitespace-nowrap text-right">Status</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-50">
                {filteredData.length > 0 ? filteredData.map((item, i) => (
                  <tr key={item.id || i} className="hover:bg-gray-50/50 transition-colors">
                    <td className="py-4 text-sm font-bold text-gray-900 whitespace-nowrap pr-4">{item.name}</td>
                    <td className="py-4 text-sm text-gray-600 whitespace-nowrap pr-4 font-semibold">{item.stock}</td>
                    <td className="py-4 text-sm text-gray-600 whitespace-nowrap pr-4">{item.unit}</td>
                    <td className="py-4 text-sm text-gray-600 whitespace-nowrap pr-4">{item.minStock}</td>
                    <td className="py-4 text-sm text-teal-700 font-bold whitespace-nowrap pr-4">{formatCurrency(Number(item.price) * Number(item.stock))}</td>
                    <td className="py-4 whitespace-nowrap text-right">
                      <span className={cn(
                        "px-3 py-1 rounded-full text-[10px] font-bold uppercase tracking-wider",
                        Number(item.stock) > Number(item.minStock) ? "bg-green-100 text-green-700" : "bg-red-100 text-red-700"
                      )}>
                        {Number(item.stock) > Number(item.minStock) ? 'Sehat' : 'Stok Rendah'}
                      </span>
                    </td>
                  </tr>
                )) : (
                  <tr>
                    <td colSpan={6} className="py-20 text-center text-gray-500 text-sm">
                      {searchQuery ? `Tidak ada item yang cocok dengan "${searchQuery}".` : 'Tidak ada item ditemukan.'}
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>

          {/* Mobile Unified Card View */}
          <div className="md:hidden space-y-3">
            {filteredData.length > 0 ? filteredData.map((item, i) => (
              <div key={item.id || i} className="p-4 bg-gray-50 rounded-2xl border border-gray-100 space-y-3 shadow-sm">
                <div className="flex items-start justify-between gap-2">
                  <div>
                    <h4 className="text-sm font-bold text-gray-900">{item.name}</h4>
                    <span className="text-[10px] text-gray-400 font-medium">Satuan: {item.unit}</span>
                  </div>
                  <span className={cn(
                    "px-2.5 py-1 rounded-full text-[10px] font-bold uppercase tracking-wider whitespace-nowrap flex-shrink-0",
                    Number(item.stock) > Number(item.minStock) ? "bg-green-100 text-green-700" : "bg-red-100 text-red-700"
                  )}>
                    {Number(item.stock) > Number(item.minStock) ? 'Sehat' : 'Stok Rendah'}
                  </span>
                </div>

                <div className="grid grid-cols-3 gap-2 py-2 border-y border-gray-200/60 text-xs">
                  <div>
                    <span className="text-[10px] text-gray-400 uppercase font-bold block">Stok</span>
                    <span className="font-bold text-gray-800">{item.stock}</span>
                  </div>
                  <div>
                    <span className="text-[10px] text-gray-400 uppercase font-bold block">Min. Stok</span>
                    <span className="font-medium text-gray-600">{item.minStock}</span>
                  </div>
                  <div>
                    <span className="text-[10px] text-gray-400 uppercase font-bold block">Nilai (Est)</span>
                    <span className="font-bold text-teal-700">{formatCurrency(Number(item.price) * Number(item.stock))}</span>
                  </div>
                </div>
              </div>
            )) : (
              <div className="py-12 text-center text-gray-500 text-sm">
                {searchQuery ? `Tidak ada item yang cocok dengan "${searchQuery}".` : 'Tidak ada item ditemukan.'}
              </div>
            )}
          </div>
        </Card>
      )}

      <Modal 
        isOpen={isModalOpen} 
        onClose={() => setIsModalOpen(false)} 
        title={activeTab === 'materials' ? 'Tambah Bahan Baku' : activeTab === 'finished' ? 'Tambah Barang Jadi' : 'Tambah Keperluan Lainnya'}
      >
        <form onSubmit={handleSubmit} className="space-y-6">
          <div className="space-y-2">
            <label className="text-xs font-bold text-gray-400 uppercase tracking-wider">Nama Item</label>
            <input 
              required
              type="text" 
              value={formData.name}
              onChange={(e) => setFormData({...formData, name: e.target.value})}
              placeholder="misal: Cotton Combed 30s Hitam" 
              className="w-full p-3 bg-gray-50 border-none rounded-xl text-sm focus:ring-2 focus:ring-teal-500/20" 
            />
          </div>

          <div className="grid grid-cols-2 gap-6">
            <div className="space-y-2">
              <label className="text-xs font-bold text-gray-400 uppercase tracking-wider">Stok Awal</label>
              <input 
                required
                type="number" 
                value={formData.stock}
                onChange={(e) => setFormData({...formData, stock: Number(e.target.value)})}
                className="w-full p-3 bg-gray-50 border-none rounded-xl text-sm focus:ring-2 focus:ring-teal-500/20" 
              />
            </div>
            <div className="space-y-2">
              <label className="text-xs font-bold text-gray-400 uppercase tracking-wider">Satuan</label>
              <select 
                required
                value={formData.unit}
                onChange={(e) => setFormData({...formData, unit: e.target.value})}
                className="w-full p-3 bg-gray-50 border-none rounded-xl text-sm focus:ring-2 focus:ring-teal-500/20"
              >
                <option>Roll</option>
                <option>Kg</option>
                <option>Pcs</option>
                <option>Meter</option>
              </select>
            </div>
          </div>

          <div className="grid grid-cols-2 gap-6">
            <div className="space-y-2">
              <label className="text-xs font-bold text-gray-400 uppercase tracking-wider">Peringatan Min. Stok</label>
              <input 
                required
                type="number" 
                value={formData.minStock}
                onChange={(e) => setFormData({...formData, minStock: Number(e.target.value)})}
                className="w-full p-3 bg-gray-50 border-none rounded-xl text-sm focus:ring-2 focus:ring-teal-500/20" 
              />
            </div>
            <div className="space-y-2">
              <label className="text-xs font-bold text-gray-400 uppercase tracking-wider">Harga per Satuan</label>
              <input 
                required
                type="number" 
                value={formData.price}
                onChange={(e) => setFormData({...formData, price: Number(e.target.value)})}
                className="w-full p-3 bg-gray-50 border-none rounded-xl text-sm focus:ring-2 focus:ring-teal-500/20" 
              />
            </div>
          </div>

          <div className="pt-4 flex justify-end gap-4">
            <button 
              type="button"
              onClick={() => setIsModalOpen(false)} 
              className="px-6 py-2.5 text-sm font-semibold text-gray-500 hover:text-gray-900"
            >
              Batal
            </button>
            <button 
              type="submit"
              className="px-8 py-2.5 bg-gradient-to-r from-teal-600 to-emerald-600 hover:from-teal-700 hover:to-emerald-700 text-white rounded-2xl text-sm font-semibold shadow-lg shadow-teal-600/20 transition-all"
            >
              Simpan Item
            </button>
          </div>
        </form>
      </Modal>
    </div>
  );
};
