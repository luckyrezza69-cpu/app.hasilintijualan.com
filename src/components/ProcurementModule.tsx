import React, { useState, useEffect, useMemo } from 'react';
import { Card } from '../App';
import { 
  Plus, 
  Search, 
  Filter, 
  ShoppingCart, 
  Clock, 
  CheckCircle2, 
  AlertCircle,
  ArrowRight,
  Loader2,
  Download,
  Trash2,
  ChevronDown,
  ChevronUp,
  Package,
  DollarSign,
  Calendar,
  Tag,
  X
} from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import { cn, formatCurrency, generateId } from '../lib/utils';
import { sheetsService } from '../services/googleService';
import { Modal } from './ui/Modal';

export const ProcurementModule = () => {
  const [activeTab, setActiveTab] = useState<'pending' | 'history'>('pending');
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [loading, setLoading] = useState(true);
  const [procurements, setProcurements] = useState<any[]>([]);
  const [quotations, setQuotations] = useState<any[]>([]);
  const [orders, setOrders] = useState<any[]>([]);
  const [searchQuery, setSearchQuery] = useState('');

  // Helper to get value from object with case-insensitive key and common aliases
  const getValue = (obj: any, key: string) => {
    if (!obj) return '';
    const normalizedKey = key.toLowerCase().replace(/\s/g, '');
    
    // Define aliases for common fields
    const aliases: Record<string, string[]> = {
      itemname: ['itemname', 'nama', 'namabarang', 'item', 'produk'],
      intendedfor: ['intendedfor', 'diperuntukan', 'untuk', 'pesanan', 'orderid'],
      quantity: ['quantity', 'qty', 'jumlah', 'pcs', 'vol'],
      price: ['price', 'harga', 'nominal', 'nominalharga', 'cost'],
      purchasedate: ['purchasedate', 'tanggal', 'tgl', 'tanggalpembelian'],
      category: ['category', 'kategori', 'tipe'],
      inventorycategory: ['inventorycategory', 'simpanke', 'inventaris'],
      status: ['status', 'kondisi', 'state'],
      id: ['id', 'no', 'kode', 'identity', 'key'],
      needsprocurement: ['needsprocurement', 'pengadaan', 'perlupengadaan']
    };

    const searchKeys = aliases[normalizedKey] || [normalizedKey];
    
    const actualKey = Object.keys(obj).find(k => {
      const nk = k.toLowerCase().replace(/\s/g, '');
      return searchKeys.includes(nk);
    });
    
    return actualKey ? obj[actualKey] : '';
  };

  const inventoryCategories = [
    { id: 'materials', label: 'Bahan Baku', sheet: 'Inventory_Bahan' },
    { id: 'finished', label: 'Barang Jadi', sheet: 'Inventory_Produk_Jadi' },
    { id: 'others', label: 'Keperluan Lainnya', sheet: 'Inventory_Lainnya' }
  ];

  const [formData, setFormData] = useState({
    intendedFor: '',
    referenceId: '',
    purchaseDate: new Date().toISOString().split('T')[0],
    category: '',
    items: [{
      itemName: '',
      quantity: 0,
      unit: 'Pcs',
      price: 0,
      inventoryCategory: inventoryCategories[0].id
    }]
  });

  const fetchData = async () => {
    try {
      setLoading(true);
      const [procData, quoData, ordData] = await Promise.all([
        sheetsService.getAll('Procurements'),
        sheetsService.getAll('Quotations'),
        sheetsService.getAll('Orders')
      ]);
      setProcurements(Array.isArray(procData) ? procData : []);
      setQuotations(Array.isArray(quoData) ? quoData : []);
      setOrders(Array.isArray(ordData) ? ordData : []);
    } catch (error) {
      console.error('Error fetching procurement data:', error);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
  }, []);

  // Filter quotations/orders that need procurement but aren't in Procurements yet
  const pendingFromOrders = useMemo(() => {
    const activeQuotations = quotations.filter(q => {
      const status = getValue(q, 'status');
      return status !== 'Converted' && status !== 'Rejected';
    });
    
    const activeOrders = orders.filter(o => {
      const status = getValue(o, 'status');
      return status !== 'Cancelled' && status !== 'Rejected';
    });

    const allItems = [...activeQuotations, ...activeOrders];
    
    return allItems.filter(item => {
      const needs = getValue(item, 'needsProcurement');
      const id = getValue(item, 'id');
      const quotationId = getValue(item, 'quotationId');
      
      const alreadyProcured = procurements.some(p => {
        const intendedFor = getValue(p, 'intendedFor');
        const refId = getValue(p, 'referenceId');
        return intendedFor === id || refId === id || (quotationId && (intendedFor === quotationId || refId === quotationId));
      });
      
      return needs === 'Perlu Pengadaan' && !alreadyProcured;
    });
  }, [quotations, orders, procurements]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      for (const item of formData.items) {
        const newItem = {
          id: generateId('PRC'),
          timestamp: new Date().toISOString(),
          user: 'Admin HIJ',
          status: 'Purchased',
          intendedFor: formData.intendedFor,
          referenceId: formData.referenceId,
          purchaseDate: formData.purchaseDate,
          category: formData.category,
          itemName: item.itemName,
          quantity: item.quantity,
          unit: item.unit,
          price: item.price,
          inventoryCategory: item.inventoryCategory
        };
        
        // 1. Save to Procurements
        await sheetsService.create('Procurements', newItem);
        
        // 2. Save to Inventory
        const invCat = inventoryCategories.find(c => c.id === item.inventoryCategory);
        if (invCat) {
          const inventoryItem = {
            id: generateId(item.inventoryCategory === 'materials' ? 'MAT' : item.inventoryCategory === 'finished' ? 'PRD' : 'OTH'),
            name: item.itemName,
            stock: item.quantity,
            unit: item.unit,
            price: item.price,
            minStock: 5,
            timestamp: new Date().toISOString(),
            user: 'Admin HIJ',
            source: 'Procurement',
            procurementId: newItem.id
          };
          await sheetsService.create(invCat.sheet, inventoryItem);
        }
      }

      setIsModalOpen(false);
      setFormData({
        intendedFor: '',
        referenceId: '',
        purchaseDate: new Date().toISOString().split('T')[0],
        category: '',
        items: [{
          itemName: '',
          quantity: 0,
          unit: 'Pcs',
          price: 0,
          inventoryCategory: inventoryCategories[0].id
        }]
      });
      fetchData();
      alert('Pengadaan berhasil disimpan dan masuk ke inventaris!');
    } catch (error) {
      alert('Gagal menyimpan pengadaan.');
    }
  };

  const filteredPendingFromOrders = useMemo(() => {
    if (!searchQuery.trim()) return pendingFromOrders;
    const q = searchQuery.toLowerCase().trim();
    return pendingFromOrders.filter(item => {
      const id = String(getValue(item, 'id') || '').toLowerCase();
      const customer = String(getValue(item, 'customerName') || '').toLowerCase();
      const product = String(getValue(item, 'productType') || getValue(item, 'product') || '').toLowerCase();
      const material = String(getValue(item, 'material') || '').toLowerCase();
      return id.includes(q) || customer.includes(q) || product.includes(q) || material.includes(q);
    });
  }, [pendingFromOrders, searchQuery]);

  const filteredProcurements = useMemo(() => {
    if (!searchQuery.trim()) return procurements;
    const q = searchQuery.toLowerCase().trim();
    return procurements.filter(p => {
      const itemName = String(getValue(p, 'itemName') || '').toLowerCase();
      const intendedFor = String(getValue(p, 'intendedFor') || '').toLowerCase();
      const category = String(getValue(p, 'category') || '').toLowerCase();
      const id = String(getValue(p, 'id') || '').toLowerCase();
      const referenceId = String(getValue(p, 'referenceId') || '').toLowerCase();
      return itemName.includes(q) || intendedFor.includes(q) || category.includes(q) || id.includes(q) || referenceId.includes(q);
    });
  }, [procurements, searchQuery]);

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
          <h2 className="text-2xl font-bold text-gray-900">Pengadaan Barang</h2>
          <p className="text-sm text-gray-500">Kelola pembelanjaan kain, aksesoris, dan kebutuhan konveksi.</p>
        </div>
        <button 
          onClick={() => {
            setFormData({
              intendedFor: '',
              referenceId: '',
              purchaseDate: new Date().toISOString().split('T')[0],
              category: '',
              items: [{
                itemName: '',
                quantity: 0,
                unit: 'Pcs',
                price: 0,
                inventoryCategory: inventoryCategories[0].id
              }]
            });
            setIsModalOpen(true);
          }}
          className="w-full sm:w-auto bg-gradient-to-r from-teal-600 to-emerald-600 hover:from-teal-700 hover:to-emerald-700 text-white px-6 py-2.5 rounded-2xl text-xs sm:text-sm font-semibold flex items-center justify-center gap-2 transition-all shadow-lg shadow-teal-600/20 cursor-pointer"
        >
          <Plus size={18} />
          Input Pengadaan Baru
        </button>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-4 sm:gap-6">
        <Card>
          <div className="flex items-center gap-4">
            <div className="w-12 h-12 rounded-2xl bg-teal-50 flex items-center justify-center text-teal-600">
              <ShoppingCart size={24} />
            </div>
            <div>
              <p className="text-xs font-bold text-gray-400 uppercase tracking-wider">Total Pengadaan</p>
              <h4 className="text-xl font-black">{procurements.length}</h4>
            </div>
          </div>
        </Card>
        <Card>
          <div className="flex items-center gap-4">
            <div className="w-12 h-12 rounded-2xl bg-orange-50 flex items-center justify-center text-orange-600">
              <Clock size={24} />
            </div>
            <div>
              <p className="text-xs font-bold text-gray-400 uppercase tracking-wider">Menunggu Pengadaan</p>
              <h4 className="text-xl font-black text-orange-600">{pendingFromOrders.length}</h4>
            </div>
          </div>
        </Card>
        <Card>
          <div className="flex items-center gap-4">
            <div className="w-12 h-12 rounded-2xl bg-green-50 flex items-center justify-center text-green-600">
              <DollarSign size={24} />
            </div>
            <div>
              <p className="text-xs font-bold text-gray-400 uppercase tracking-wider">Total Pengeluaran</p>
              <h4 className="text-xl font-black text-green-600">
                {formatCurrency(procurements.reduce((acc, p) => acc + (Number(getValue(p, 'price')) * Number(getValue(p, 'quantity'))), 0))}
              </h4>
            </div>
          </div>
        </Card>
      </div>

      <div className="flex flex-col sm:flex-row justify-between items-stretch sm:items-center gap-4">
        <div className="grid grid-cols-2 sm:flex gap-1.5 p-1.5 bg-gray-100 rounded-2xl w-full sm:w-auto">
          {[
            { id: 'pending', label: 'Antrian Pengadaan' },
            { id: 'history', label: 'Riwayat Pembelian' }
          ].map((tab) => (
            <button
              key={tab.id}
              onClick={() => {
                setActiveTab(tab.id as any);
                setSearchQuery('');
              }}
              className={cn(
                "px-3 sm:px-6 py-2.5 rounded-xl text-xs sm:text-sm font-semibold transition-all capitalize flex items-center justify-center gap-2 cursor-pointer",
                activeTab === tab.id ? "bg-white text-teal-700 shadow-sm" : "text-gray-500 hover:text-gray-700"
              )}
            >
              <span>{tab.label}</span>
              {tab.id === 'pending' && pendingFromOrders.length > 0 && (
                <span className="bg-orange-500 text-white text-[10px] px-1.5 py-0.5 rounded-full">
                  {pendingFromOrders.length}
                </span>
              )}
            </button>
          ))}
        </div>

        {/* Search Bar */}
        <div className="relative flex-1 sm:max-w-md">
          <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 text-gray-400" size={18} />
          <input 
            type="text" 
            placeholder="Cari nama barang, kategori, pesanan, atau pelanggan..." 
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
          <p className="text-gray-500 text-sm">Memuat data pengadaan...</p>
        </div>
      ) : (
        <Card>
          {activeTab === 'pending' ? (
            <div className="space-y-4">
              {/* Desktop Table View */}
              <div className="hidden md:block overflow-x-auto">
                <table className="w-full text-left">
                  <thead>
                    <tr className="border-b border-gray-100">
                      <th className="pb-4 font-bold text-xs text-gray-400 uppercase tracking-widest">ID Ref</th>
                      <th className="pb-4 font-bold text-xs text-gray-400 uppercase tracking-widest">Pelanggan</th>
                      <th className="pb-4 font-bold text-xs text-gray-400 uppercase tracking-widest">Produk</th>
                      <th className="pb-4 font-bold text-xs text-gray-400 uppercase tracking-widest">Bahan</th>
                      <th className="pb-4 font-bold text-xs text-gray-400 uppercase tracking-widest text-right">Aksi</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-50">
                    {filteredPendingFromOrders.length > 0 ? filteredPendingFromOrders.map((item, i) => {
                      const id = getValue(item, 'id');
                      const customer = getValue(item, 'customerName');
                      const product = getValue(item, 'productType');
                      const material = getValue(item, 'material');
                      
                      return (
                        <tr key={id || i} className="hover:bg-gray-50/50 transition-colors">
                          <td className="py-4 text-sm font-bold text-teal-600">{id}</td>
                          <td className="py-4 text-sm text-gray-900 font-medium">{customer}</td>
                          <td className="py-4 text-sm text-gray-600">{product}</td>
                          <td className="py-4 text-sm text-gray-600">{material}</td>
                          <td className="py-4 text-right">
                            <button 
                              onClick={() => {
                                setFormData({
                                  ...formData,
                                  intendedFor: customer || '',
                                  referenceId: id,
                                  items: [{
                                    itemName: material || product,
                                    quantity: Number(getValue(item, 'quantity')) || 0,
                                    unit: 'Pcs',
                                    price: 0,
                                    inventoryCategory: inventoryCategories[0].id
                                  }]
                                });
                                setIsModalOpen(true);
                              }}
                              className="bg-teal-600 text-white px-4 py-2 rounded-xl text-xs font-bold hover:bg-teal-700 transition-colors shadow-sm"
                            >
                              Proses Pengadaan
                            </button>
                          </td>
                        </tr>
                      );
                    }) : (
                      <tr>
                        <td colSpan={5} className="py-20 text-center text-gray-500 text-sm">
                          {searchQuery ? `Tidak ada antrian pengadaan yang cocok dengan "${searchQuery}".` : 'Tidak ada antrian pengadaan dari pesanan.'}
                        </td>
                      </tr>
                    )}
                  </tbody>
                </table>
              </div>

              {/* Mobile Unified Card View */}
              <div className="md:hidden space-y-3">
                {filteredPendingFromOrders.length > 0 ? filteredPendingFromOrders.map((item, i) => {
                  const id = getValue(item, 'id');
                  const customer = getValue(item, 'customerName');
                  const product = getValue(item, 'productType');
                  const material = getValue(item, 'material');
                  
                  return (
                    <div key={id || i} className="p-4 bg-gray-50 rounded-2xl border border-gray-100 space-y-3 shadow-sm">
                      <div className="flex items-start justify-between gap-2">
                        <div>
                          <span className="text-[10px] font-bold text-teal-700 bg-teal-50 px-2 py-0.5 rounded-md uppercase tracking-wider inline-block">
                            {id}
                          </span>
                          <h4 className="text-sm font-bold text-gray-900 mt-1">{customer}</h4>
                        </div>
                        <span className="px-2.5 py-1 bg-yellow-100 text-yellow-800 rounded-full text-[10px] font-bold uppercase tracking-wider flex-shrink-0">
                          Perlu Pengadaan
                        </span>
                      </div>

                      <div className="grid grid-cols-2 gap-2 py-2 border-y border-gray-200/60 text-xs">
                        <div>
                          <span className="text-[10px] text-gray-400 uppercase font-bold block">Produk</span>
                          <span className="font-semibold text-gray-800">{product}</span>
                        </div>
                        <div>
                          <span className="text-[10px] text-gray-400 uppercase font-bold block">Bahan</span>
                          <span className="font-medium text-gray-700">{material}</span>
                        </div>
                      </div>

                      <div className="flex justify-end pt-1">
                        <button 
                          onClick={() => {
                            setFormData({
                              ...formData,
                              intendedFor: customer || '',
                              referenceId: id,
                              items: [{
                                itemName: material || product,
                                quantity: Number(getValue(item, 'quantity')) || 0,
                                unit: 'Pcs',
                                price: 0,
                                inventoryCategory: inventoryCategories[0].id
                              }]
                            });
                            setIsModalOpen(true);
                          }}
                          className="w-full py-2 bg-teal-600 text-white rounded-xl text-xs font-bold hover:bg-teal-700 transition-colors shadow-sm text-center"
                        >
                          Proses Pengadaan
                        </button>
                      </div>
                    </div>
                  );
                }) : (
                  <div className="py-10 text-center text-gray-500 text-sm">
                    {searchQuery ? `Tidak ada antrian pengadaan yang cocok dengan "${searchQuery}".` : 'Tidak ada antrian pengadaan dari pesanan.'}
                  </div>
                )}
              </div>
            </div>
          ) : (
            <div className="space-y-4">
              {/* Desktop Table View */}
              <div className="hidden md:block overflow-x-auto">
                <table className="w-full text-left">
                  <thead>
                    <tr className="border-b border-gray-100">
                      <th className="pb-4 font-bold text-xs text-gray-400 uppercase tracking-widest">Tanggal</th>
                      <th className="pb-4 font-bold text-xs text-gray-400 uppercase tracking-widest">Barang</th>
                      <th className="pb-4 font-bold text-xs text-gray-400 uppercase tracking-widest">Kategori</th>
                      <th className="pb-4 font-bold text-xs text-gray-400 uppercase tracking-widest">Jumlah</th>
                      <th className="pb-4 font-bold text-xs text-gray-400 uppercase tracking-widest">Total Harga</th>
                      <th className="pb-4 font-bold text-xs text-gray-400 uppercase tracking-widest">Untuk</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-50">
                    {filteredProcurements.length > 0 ? filteredProcurements.map((p, i) => (
                      <tr key={getValue(p, 'id') || i} className="hover:bg-gray-50/50 transition-colors">
                        <td className="py-4 text-sm text-gray-600">{getValue(p, 'purchaseDate')}</td>
                        <td className="py-4 text-sm font-bold text-gray-900">{getValue(p, 'itemName')}</td>
                        <td className="py-4 text-sm text-gray-500">{getValue(p, 'category')}</td>
                        <td className="py-4 text-sm text-gray-600">{getValue(p, 'quantity')} {getValue(p, 'unit')}</td>
                        <td className="py-4 text-sm font-bold text-teal-700">
                          {formatCurrency(Number(getValue(p, 'price')) * Number(getValue(p, 'quantity')))}
                        </td>
                        <td className="py-4 text-sm text-teal-600 font-medium">{getValue(p, 'intendedFor')}</td>
                      </tr>
                    )) : (
                      <tr>
                        <td colSpan={6} className="py-20 text-center text-gray-500 text-sm">
                          {searchQuery ? `Tidak ada riwayat pengadaan yang cocok dengan "${searchQuery}".` : 'Belum ada riwayat pengadaan.'}
                        </td>
                      </tr>
                    )}
                  </tbody>
                </table>
              </div>

              {/* Mobile Unified Card View */}
              <div className="md:hidden space-y-3">
                {filteredProcurements.length > 0 ? filteredProcurements.map((p, i) => (
                  <div key={getValue(p, 'id') || i} className="p-4 bg-gray-50 rounded-2xl border border-gray-100 space-y-3 shadow-sm">
                    <div className="flex items-start justify-between gap-2">
                      <div>
                        <h4 className="text-sm font-bold text-gray-900">{getValue(p, 'itemName')}</h4>
                        <span className="text-[10px] text-gray-400 font-medium">Kategori: {getValue(p, 'category')}</span>
                      </div>
                      <span className="text-xs text-gray-500 font-medium whitespace-nowrap">
                        {getValue(p, 'purchaseDate')}
                      </span>
                    </div>

                    <div className="grid grid-cols-3 gap-2 py-2 border-y border-gray-200/60 text-xs">
                      <div>
                        <span className="text-[10px] text-gray-400 uppercase font-bold block">Jumlah</span>
                        <span className="font-semibold text-gray-800">{getValue(p, 'quantity')} {getValue(p, 'unit')}</span>
                      </div>
                      <div>
                        <span className="text-[10px] text-gray-400 uppercase font-bold block">Total Nilai</span>
                        <span className="font-bold text-teal-700">{formatCurrency(Number(getValue(p, 'price')) * Number(getValue(p, 'quantity')))}</span>
                      </div>
                      <div>
                        <span className="text-[10px] text-gray-400 uppercase font-bold block">Untuk</span>
                        <span className="font-medium text-gray-700 truncate block">{getValue(p, 'intendedFor') || '-'}</span>
                      </div>
                    </div>
                  </div>
                )) : (
                  <div className="py-10 text-center text-gray-500 text-sm">
                    {searchQuery ? `Tidak ada riwayat pengadaan yang cocok dengan "${searchQuery}".` : 'Belum ada riwayat pengadaan.'}
                  </div>
                )}
              </div>
            </div>
          )}
        </Card>
      )}

      <Modal 
        isOpen={isModalOpen} 
        onClose={() => setIsModalOpen(false)} 
        title="Form Pengadaan Barang"
      >
        <form onSubmit={handleSubmit} className="space-y-6">
          <div className="grid grid-cols-2 gap-6">
            <div className="space-y-2">
              <label className="text-xs font-bold text-gray-400 uppercase tracking-wider">Diperuntukan Untuk</label>
              <input 
                type="text" 
                value={formData.intendedFor}
                onChange={(e) => setFormData({...formData, intendedFor: e.target.value})}
                placeholder="ID Pesanan atau manual" 
                className="w-full p-3 bg-gray-50 border-none rounded-xl text-sm focus:ring-2 focus:ring-teal-500/20" 
              />
            </div>
            <div className="space-y-2">
              <label className="text-xs font-bold text-gray-400 uppercase tracking-wider">Tanggal Pembelian</label>
              <input 
                required
                type="date" 
                value={formData.purchaseDate}
                onChange={(e) => setFormData({...formData, purchaseDate: e.target.value})}
                className="w-full p-3 bg-gray-50 border-none rounded-xl text-sm focus:ring-2 focus:ring-teal-500/20" 
              />
            </div>
            <div className="space-y-2 col-span-2">
              <label className="text-xs font-bold text-gray-400 uppercase tracking-wider">Kategori Pengadaan</label>
              <input 
                required
                type="text"
                value={formData.category}
                onChange={(e) => setFormData({...formData, category: e.target.value})}
                placeholder="misal: Kain, Aksesoris, dll"
                className="w-full p-3 bg-gray-50 border-none rounded-xl text-sm focus:ring-2 focus:ring-teal-500/20"
              />
            </div>
          </div>

          <div className="space-y-4">
            <div className="flex justify-between items-center">
              <h3 className="text-sm font-bold text-gray-900">Daftar Barang</h3>
              <button 
                type="button"
                onClick={() => setFormData({
                  ...formData, 
                  items: [...formData.items, {
                    itemName: '',
                    quantity: 0,
                    unit: 'Pcs',
                    price: 0,
                    inventoryCategory: inventoryCategories[0].id
                  }]
                })}
                className="text-xs font-bold text-teal-600 flex items-center gap-1 hover:text-teal-700"
              >
                <Plus size={14} /> Tambah Barang
              </button>
            </div>

            {formData.items.map((item, index) => (
              <div key={index} className="p-4 bg-gray-50 rounded-2xl space-y-4 relative">
                {formData.items.length > 1 && (
                  <button
                    type="button"
                    onClick={() => {
                      const newItems = [...formData.items];
                      newItems.splice(index, 1);
                      setFormData({...formData, items: newItems});
                    }}
                    className="absolute top-4 right-4 text-red-500 hover:text-red-600"
                  >
                    <Trash2 size={16} />
                  </button>
                )}
                
                <div className="space-y-2 pr-8">
                  <label className="text-xs font-bold text-gray-400 uppercase tracking-wider">Nama Barang</label>
                  <input 
                    required
                    type="text" 
                    value={item.itemName}
                    onChange={(e) => {
                      const newItems = [...formData.items];
                      newItems[index].itemName = e.target.value;
                      setFormData({...formData, items: newItems});
                    }}
                    placeholder="misal: Kain Cotton Combed" 
                    className="w-full p-3 bg-white border-none rounded-xl text-sm focus:ring-2 focus:ring-teal-500/20" 
                  />
                </div>

                <div className="grid grid-cols-3 gap-4">
                  <div className="space-y-2">
                    <label className="text-xs font-bold text-gray-400 uppercase tracking-wider">Jumlah</label>
                    <input 
                      required
                      type="number" 
                      value={item.quantity}
                      onChange={(e) => {
                        const newItems = [...formData.items];
                        newItems[index].quantity = Number(e.target.value);
                        setFormData({...formData, items: newItems});
                      }}
                      className="w-full p-3 bg-white border-none rounded-xl text-sm focus:ring-2 focus:ring-teal-500/20" 
                    />
                  </div>
                  <div className="space-y-2">
                    <label className="text-xs font-bold text-gray-400 uppercase tracking-wider">Satuan</label>
                    <input 
                      required
                      type="text" 
                      value={item.unit}
                      onChange={(e) => {
                        const newItems = [...formData.items];
                        newItems[index].unit = e.target.value;
                        setFormData({...formData, items: newItems});
                      }}
                      placeholder="Pcs, Roll, Kg" 
                      className="w-full p-3 bg-white border-none rounded-xl text-sm focus:ring-2 focus:ring-teal-500/20" 
                    />
                  </div>
                  <div className="space-y-2">
                    <label className="text-xs font-bold text-gray-400 uppercase tracking-wider">Harga/Satuan</label>
                    <input 
                      required
                      type="number" 
                      value={item.price}
                      onChange={(e) => {
                        const newItems = [...formData.items];
                        newItems[index].price = Number(e.target.value);
                        setFormData({...formData, items: newItems});
                      }}
                      className="w-full p-3 bg-white border-none rounded-xl text-sm focus:ring-2 focus:ring-teal-500/20" 
                    />
                  </div>
                </div>

                <div className="space-y-2">
                  <label className="text-xs font-bold text-gray-400 uppercase tracking-wider">Simpan ke Inventaris</label>
                  <select 
                    required
                    value={item.inventoryCategory}
                    onChange={(e) => {
                      const newItems = [...formData.items];
                      newItems[index].inventoryCategory = e.target.value;
                      setFormData({...formData, items: newItems});
                    }}
                    className="w-full p-3 bg-white border-none rounded-xl text-sm focus:ring-2 focus:ring-teal-500/20"
                  >
                    {inventoryCategories.map(c => <option key={c.id} value={c.id}>{c.label}</option>)}
                  </select>
                </div>
              </div>
            ))}
          </div>

          <div className="p-6 bg-green-50 rounded-2xl flex items-center justify-between">
            <div>
              <p className="text-xs font-bold text-green-600 uppercase tracking-wider">Total Pembayaran</p>
              <p className="text-2xl font-black text-green-900">
                {formatCurrency(formData.items.reduce((acc, item) => acc + (item.quantity * item.price), 0))}
              </p>
            </div>
            <DollarSign size={32} className="text-green-200" />
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
              Simpan Pengadaan
            </button>
          </div>
        </form>
      </Modal>
    </div>
  );
};
