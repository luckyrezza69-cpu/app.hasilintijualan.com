import React, { useState, useEffect, useMemo } from 'react';
import { Card } from '../App';
import { 
  CheckCircle2, 
  XCircle, 
  AlertCircle, 
  Search, 
  Plus,
  FileCheck,
  ClipboardList,
  Loader2,
  Upload,
  Image as ImageIcon,
  X as XIcon,
  Trash2,
  Edit2,
  Wrench
} from 'lucide-react';
import { cn, generateId } from '../lib/utils';
import { sheetsService, imageService } from '../services/googleService';
import { Modal } from './ui/Modal';

export const QCModule = () => {
  const [activeTab, setActiveTab] = useState<'sampling' | 'final' | 'reports' | 'queue'>('queue');
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [loading, setLoading] = useState(true);
  const [uploading, setUploading] = useState(false);
  const [data, setData] = useState<any[]>([]);
  const [orders, setOrders] = useState<any[]>([]);
  const [spks, setSpks] = useState<any[]>([]);
  const [customers, setCustomers] = useState<any[]>([]);
  
  const [selectedReport, setSelectedReport] = useState<any>(null);
  const [isDetailModalOpen, setIsDetailModalOpen] = useState(false);
  const [isDeleteModalOpen, setIsDeleteModalOpen] = useState(false);
  const [itemToDelete, setItemToDelete] = useState<string | null>(null);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [isRepairMode, setIsRepairMode] = useState(false);
  const [previewImage, setPreviewImage] = useState<string | null>(null);
  const [searchQuery, setSearchQuery] = useState('');
  
  const [formData, setFormData] = useState({
    orderId: '',
    product: '',
    qty: 0,
    defects: 0,
    repairable: 0,
    nonRepairable: 0,
    status: 'Accept',
    notes: '',
    imageUrls: [] as string[]
  });

  // Helper to get value from object with case-insensitive key and common aliases
  const getValue = (obj: any, key: string) => {
    if (!obj) return '';
    const normalizedKey = key.toLowerCase().replace(/\s/g, '');
    
    // Define aliases for common fields
    const aliases: Record<string, string[]> = {
      orderid: ['orderid', 'idorder', 'pesanan', 'idpesanan', 'ref', 'orderref'],
      product: ['product', 'produk', 'namaproduk', 'item', 'producttype', 'productname'],
      qty: ['qty', 'quantity', 'jumlah', 'pcs', 'inspectedqty', 'targetqty'],
      defects: ['defects', 'defect', 'cacat', 'jumlahcacat'],
      repairable: ['repairable', 'dapatdiperbaiki', 'fixed', 'bagus'],
      nonrepairable: ['nonrepairable', 'tidakdapatdiperbaiki', 'reject', 'rusak'],
      status: ['status', 'keputusan', 'decision'],
      notes: ['notes', 'catatan', 'keterangan', 'detail'],
      imageurl: ['imageurl', 'foto', 'evidence', 'url'],
      id: ['id', 'no', 'kode', 'identity', 'key'],
      type: ['type', 'kategori', 'tahap', 'stage']
    };

    const searchKeys = aliases[normalizedKey] || [normalizedKey];
    
    const actualKey = Object.keys(obj).find(k => {
      const nk = k.toLowerCase().replace(/\s/g, '');
      return searchKeys.includes(nk);
    });
    
    return actualKey ? obj[actualKey] : '';
  };

  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (!files || files.length === 0) return;

    try {
      setUploading(true);
      const newUrls = [...formData.imageUrls];
      for (let i = 0; i < files.length; i++) {
        const result = await imageService.upload(files[i]);
        newUrls.push(result.url);
      }
      setFormData(prev => ({ ...prev, imageUrls: newUrls }));
    } catch (error: any) {
      console.error('Upload failed:', error);
      const message = error.response?.data?.error || error.message || 'Gagal mengunggah foto QC.';
      alert(message);
    } finally {
      setUploading(false);
    }
  };

  const removeImage = (index: number) => {
    setFormData(prev => ({
      ...prev,
      imageUrls: prev.imageUrls.filter((_, i) => i !== index)
    }));
  };

  const fetchData = async () => {
    try {
      setLoading(true);
      const [qcData, orderData, spkData, customerData] = await Promise.all([
        sheetsService.getAll('QC_Reports'),
        sheetsService.getAll('Orders'),
        sheetsService.getAll('SPK_Produksi'),
        sheetsService.getAll('Customers')
      ]);
      setData(Array.isArray(qcData) ? qcData : []);
      setCustomers(Array.isArray(customerData) ? customerData : []);
      setSpks(Array.isArray(spkData) ? spkData : []);
      
      // Combine Orders and SPKs for selection
      const combinedOrders = [
        ...(Array.isArray(orderData) ? orderData : []),
        ...(Array.isArray(spkData) ? spkData : [])
      ];
      
      // Remove duplicates by ID
      const uniqueOrders = combinedOrders.reduce((acc: any[], current: any) => {
        const id = current.id || getValue(current, 'id');
        if (!acc.find(item => (item.id || getValue(item, 'id')) === id)) {
          acc.push(current);
        }
        return acc;
      }, []);

      setOrders(uniqueOrders);
    } catch (error) {
      console.error('Error fetching QC data:', error);
      setData([]);
      setOrders([]);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
  }, []);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      const dataToSave = {
        ...formData,
        imageUrl: JSON.stringify(formData.imageUrls), // Save as stringified array
        notes: isRepairMode && !formData.notes.includes('Hasil Perbaikan') 
          ? `Hasil Perbaikan: ${formData.notes}` 
          : formData.notes
      };
      delete (dataToSave as any).imageUrls;

      if (editingId) {
        await sheetsService.update('QC_Reports', editingId, dataToSave);
      } else {
        const order = orders.find(o => (o.id || getValue(o, 'id')) === formData.orderId);
        const customerId = order?.customerId || getValue(order, 'customerId') || 'UNKNOWN';
        
        // Generate sequential ID: QC-CUSTOMERID-XXX
        // Find the maximum sequence number for this customer to avoid duplicates
        const customerQcs = data.filter(q => (q.customerId || getValue(q, 'customerId')) === customerId);
        let maxSeq = 0;
        customerQcs.forEach(q => {
          const id = q.id || getValue(q, 'id');
          if (typeof id === 'string' && id.includes('-')) {
            const parts = id.split('-');
            const seqStr = parts[parts.length - 1];
            const seq = parseInt(seqStr);
            if (!isNaN(seq) && seq > maxSeq) maxSeq = seq;
          }
        });

        let nextNum = maxSeq + 1;
        let qcId = `QC-${customerId}-${String(nextNum).padStart(3, '0')}`;
        
        // Final safety check against all QC reports
        while (data.some(q => (q.id || getValue(q, 'id')) === qcId)) {
          nextNum++;
          qcId = `QC-${customerId}-${String(nextNum).padStart(3, '0')}`;
        }

        const newQC = {
          id: qcId,
          timestamp: new Date().toISOString(),
          user: 'Admin HIJ',
          customerId: customerId,
          ...dataToSave,
          type: activeTab
        };
        await sheetsService.create('QC_Reports', newQC);
      }
      
      setIsModalOpen(false);
      setEditingId(null);
      setIsRepairMode(false);
      setFormData({
        orderId: '',
        product: '',
        qty: 0,
        defects: 0,
        repairable: 0,
        nonRepairable: 0,
        status: 'Accept',
        notes: '',
        imageUrls: []
      });
      fetchData();
    } catch (error) {
      alert('Gagal menyimpan laporan QC.');
    }
  };

  const handleEdit = (item: any) => {
    const id = item.id || getValue(item, 'id');
    const type = getValue(item, 'type');
    
    setIsRepairMode(false);
    if (activeTab === 'final' && type === 'sampling') {
      setEditingId(null);
    } else {
      setEditingId(id);
    }

    const rawImageUrl = getValue(item, 'imageUrl');
    let urls: string[] = [];
    try {
      if (rawImageUrl) {
        if (rawImageUrl.startsWith('[') && rawImageUrl.endsWith(']')) {
          urls = JSON.parse(rawImageUrl);
        } else {
          urls = [rawImageUrl];
        }
      }
    } catch (e) {
      urls = rawImageUrl ? [rawImageUrl] : [];
    }

    setFormData({
      orderId: getValue(item, 'orderId'),
      product: getValue(item, 'product'),
      qty: Number(getValue(item, 'qty')) || 0,
      defects: Number(getValue(item, 'defects')) || 0,
      repairable: Number(getValue(item, 'repairable')) || 0,
      nonRepairable: Number(getValue(item, 'nonRepairable')) || 0,
      status: getValue(item, 'status') || 'Accept',
      notes: getValue(item, 'notes'),
      imageUrls: urls
    });
    setIsModalOpen(true);
  };

  const handleRepair = (item: any) => {
    const id = item.id || getValue(item, 'id');
    
    setIsRepairMode(true);
    setEditingId(id); // Always update the SAME record
    
    const rawImageUrl = getValue(item, 'imageUrl');
    let urls: string[] = [];
    try {
      if (rawImageUrl) {
        if (rawImageUrl.startsWith('[') && rawImageUrl.endsWith(']')) {
          urls = JSON.parse(rawImageUrl);
        } else {
          urls = [rawImageUrl];
        }
      }
    } catch (e) {
      urls = rawImageUrl ? [rawImageUrl] : [];
    }
    
    setFormData({
      orderId: getValue(item, 'orderId'),
      product: getValue(item, 'product'),
      qty: Number(getValue(item, 'qty')) || 0,
      defects: Number(getValue(item, 'defects')) || 0,
      repairable: Number(getValue(item, 'repairable')) || Number(getValue(item, 'defects')) || 0,
      nonRepairable: Number(getValue(item, 'nonRepairable')) || 0,
      status: 'Accept',
      notes: getValue(item, 'notes')?.includes('Perbaikan dari') ? getValue(item, 'notes') : `Perbaikan dari ${id}`,
      imageUrls: urls
    });
    setIsModalOpen(true);
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
      setLoading(true);
      await sheetsService.delete('QC_Reports', itemToDelete);
      setIsDeleteModalOpen(false);
      setItemToDelete(null);
      fetchData();
    } catch (error) {
      alert('Gagal menghapus laporan QC.');
    } finally {
      setLoading(false);
    }
  };

  const passRate = data.length > 0 
    ? ((data.filter(item => getValue(item, 'status') === 'Accept').length / data.length) * 100).toFixed(1)
    : '0';

  const pendingInspections = useMemo(() => {
    const list = spks.filter(spk => {
      const progress = Number(getValue(spk, 'progress')) || 0;
      if (progress < 100) return false;
      
      const orderId = getValue(spk, 'orderId');
      // Check if there is already a FINAL QC report for this order
      const hasFinalQC = data.some(qc => getValue(qc, 'orderId') === orderId && getValue(qc, 'type') === 'final');
      return !hasFinalQC;
    });

    if (!searchQuery.trim()) return list;
    const q = searchQuery.toLowerCase().trim();
    return list.filter(spk => {
      const id = String(spk.id || getValue(spk, 'id') || '').toLowerCase();
      const orderId = String(getValue(spk, 'orderId') || '').toLowerCase();
      const product = String(getValue(spk, 'productName') || '').toLowerCase();
      const order = orders.find(o => (o.id || getValue(o, 'id')) === orderId);
      const customer = customers.find(c => (c.id || getValue(c, 'id')) === (getValue(spk, 'customerId') || getValue(order, 'customerId')));
      const customerName = String(customer?.name || getValue(order, 'customerName') || '').toLowerCase();

      return id.includes(q) || orderId.includes(q) || product.includes(q) || customerName.includes(q);
    });
  }, [spks, data, searchQuery, orders, customers]);

  const filteredData = useMemo(() => {
    const tabFiltered = data.filter(item => {
      const type = getValue(item, 'type');
      const defects = Number(getValue(item, 'defects')) || 0;
      const status = getValue(item, 'status');

      if (activeTab === 'sampling') {
        return type === 'sampling';
      }
      if (activeTab === 'final') {
        return type === 'final' || (defects > 0 || status === 'Repair' || status === 'Reject');
      }
      if (activeTab === 'reports') {
        return defects > 0 || status === 'Repair' || status === 'Reject';
      }
      return true;
    });

    if (!searchQuery.trim()) return tabFiltered;
    const q = searchQuery.toLowerCase().trim();
    return tabFiltered.filter(item => {
      const id = String(item.id || getValue(item, 'id') || '').toLowerCase();
      const orderId = String(getValue(item, 'orderId') || '').toLowerCase();
      const product = String(getValue(item, 'product') || '').toLowerCase();
      const status = String(getValue(item, 'status') || '').toLowerCase();
      const notes = String(getValue(item, 'notes') || '').toLowerCase();
      const order = orders.find(o => (o.id || getValue(o, 'id')) === orderId);
      const customer = customers.find(c => (c.id || getValue(c, 'id')) === (getValue(item, 'customerId') || getValue(order, 'customerId')));
      const customerName = String(customer?.name || getValue(order, 'customerName') || '').toLowerCase();

      return id.includes(q) || orderId.includes(q) || product.includes(q) || 
             status.includes(q) || notes.includes(q) || customerName.includes(q);
    });
  }, [data, activeTab, searchQuery, orders, customers]);

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
          <h2 className="text-2xl font-bold text-gray-900">Kontrol Kualitas</h2>
          <p className="text-sm text-gray-500">Pantau standar kualitas produk dan laporan cacat.</p>
        </div>
        <button 
          onClick={() => {
            setFormData({
              orderId: '',
              product: '',
              qty: 0,
              defects: 0,
              repairable: 0,
              nonRepairable: 0,
              status: 'Accept',
              notes: '',
              imageUrls: []
            });
            setIsModalOpen(true);
          }}
          className="w-full sm:w-auto bg-gradient-to-r from-teal-600 to-emerald-600 hover:from-teal-700 hover:to-emerald-700 text-white px-6 py-2.5 rounded-2xl text-xs sm:text-sm font-semibold flex items-center justify-center gap-2 transition-all shadow-lg shadow-teal-600/20 cursor-pointer"
        >
          <Plus size={18} />
          Inspeksi Baru
        </button>
      </div>

      <div className="grid grid-cols-2 md:grid-cols-4 gap-4 sm:gap-6">
        <div className="bg-white rounded-3xl p-6 border border-gray-100 shadow-sm">
          <p className="text-xs font-bold text-gray-400 uppercase tracking-widest mb-1">Tingkat Kelulusan</p>
          <h4 className="text-2xl font-bold text-green-600">{passRate}%</h4>
        </div>
        <div className="bg-white rounded-3xl p-6 border border-gray-100 shadow-sm">
          <p className="text-xs font-bold text-gray-400 uppercase tracking-widest mb-1">Total Inspeksi</p>
          <h4 className="text-2xl font-bold text-teal-600">{data.length}</h4>
        </div>
        <div className="bg-white rounded-3xl p-6 border border-gray-100 shadow-sm">
          <p className="text-xs font-bold text-gray-400 uppercase tracking-widest mb-1">Item Perbaikan</p>
          <h4 className="text-2xl font-bold text-orange-500">{data.filter(i => getValue(i, 'status') === 'Repair').length}</h4>
        </div>
        <div className="bg-white rounded-3xl p-6 border border-gray-100 shadow-sm">
          <p className="text-xs font-bold text-gray-400 uppercase tracking-widest mb-1">Item Ditolak</p>
          <h4 className="text-2xl font-bold text-red-700">{data.filter(i => getValue(i, 'status') === 'Reject').length}</h4>
        </div>
      </div>

      <div className="flex flex-col sm:flex-row justify-between items-stretch sm:items-center gap-4">
        <div className="grid grid-cols-2 sm:flex gap-1.5 p-1.5 bg-gray-100 rounded-2xl w-full sm:w-auto">
          {(['queue', 'sampling', 'final', 'reports'] as const).map((tab) => (
            <button
              key={tab}
              onClick={() => {
                setActiveTab(tab);
                setSearchQuery('');
              }}
              className={cn(
                "px-3 sm:px-6 py-2.5 rounded-xl text-xs sm:text-sm font-semibold transition-all capitalize flex items-center justify-center gap-2 cursor-pointer",
                activeTab === tab ? "bg-white text-teal-700 shadow-sm" : "text-gray-500 hover:text-gray-700"
              )}
            >
              <span>{tab === 'queue' ? 'Antrian' : tab === 'sampling' ? 'Sampling In-Line' : tab === 'final' ? 'Inspeksi Akhir' : 'Laporan Cacat'}</span>
              {tab === 'queue' && pendingInspections.length > 0 && (
                <span className="bg-red-500 text-white text-[10px] px-1.5 py-0.5 rounded-full min-w-[18px] text-center">
                  {pendingInspections.length}
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
            placeholder="Cari QC, SPK, order, pelanggan, status, catatan..." 
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
              <XIcon size={15} />
            </button>
          )}
        </div>
      </div>

      {loading ? (
        <div className="flex flex-col items-center justify-center py-20">
          <Loader2 className="animate-spin text-teal-600 mb-4" size={32} />
          <p className="text-gray-500 text-sm">Memuat data QC...</p>
        </div>
      ) : (
        <Card>
          {activeTab === 'queue' ? (
            <div className="space-y-4">
              <div className="hidden md:block overflow-x-auto">
                <table className="w-full text-left">
                  <thead>
                    <tr className="border-b border-gray-100">
                      <th className="pb-4 font-semibold text-sm text-gray-500">SPK ID</th>
                      <th className="pb-4 font-semibold text-sm text-gray-500">Pelanggan</th>
                      <th className="pb-4 font-semibold text-sm text-gray-500">Produk</th>
                      <th className="pb-4 font-semibold text-sm text-gray-500">Jumlah</th>
                      <th className="pb-4 font-semibold text-sm text-gray-500">Status Produksi</th>
                      <th className="pb-4 font-semibold text-sm text-gray-500">Aksi</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-50">
                    {pendingInspections.length > 0 ? pendingInspections.map((spk, index) => {
                      const id = spk.id || getValue(spk, 'id');
                      const orderId = getValue(spk, 'orderId');
                      const product = getValue(spk, 'productName');
                      const qty = getValue(spk, 'targetQty');
                      const order = orders.find(o => (o.id || getValue(o, 'id')) === orderId);
                      const customerId = getValue(spk, 'customerId') || (order ? getValue(order, 'customerId') : '');
                      const customer = customers.find(c => (c.id || getValue(c, 'id')) === customerId);
                      const name = customer?.name || getValue(order, 'customerName') || 'Unknown';

                      return (
                        <tr key={id || index} className="hover:bg-gray-50/50 transition-colors">
                          <td className="py-4 text-sm font-bold text-gray-900">{id}</td>
                          <td className="py-4 text-sm text-gray-600">{name}</td>
                          <td className="py-4 text-sm text-gray-600">{product}</td>
                          <td className="py-4 text-sm text-gray-600 font-bold">{qty} pcs</td>
                          <td className="py-4">
                            <span className="px-3 py-1 rounded-full text-[10px] font-bold uppercase tracking-wider bg-green-100 text-green-700">
                              Selesai Produksi
                            </span>
                          </td>
                          <td className="py-4">
                              <button 
                                onClick={() => {
                                 setFormData({
                                   orderId: orderId,
                                   product: product,
                                   qty: Number(qty) || 0,
                                   defects: 0,
                                   repairable: 0,
                                   nonRepairable: 0,
                                   status: 'Accept',
                                   notes: `Inspeksi otomatis dari SPK ${id}`,
                                   imageUrls: []
                                 });
                                 setActiveTab('final');
                                 setIsModalOpen(true);
                               }}
                              className="bg-teal-600 text-white px-4 py-2 rounded-xl text-xs font-bold hover:bg-teal-700 transition-colors"
                            >
                              Inspeksi
                            </button>
                          </td>
                        </tr>
                      );
                    }) : (
                      <tr>
                        <td colSpan={6} className="py-20 text-center text-gray-500">
                          {searchQuery ? `Tidak ada antrian inspeksi cocok dengan "${searchQuery}".` : 'Tidak ada antrian inspeksi.'}
                        </td>
                      </tr>
                    )}
                  </tbody>
                </table>
              </div>

              {/* Mobile View for Queue */}
              <div className="md:hidden space-y-4">
                {pendingInspections.length > 0 ? pendingInspections.map((spk, index) => {
                  const id = spk.id || getValue(spk, 'id');
                  const orderId = getValue(spk, 'orderId');
                  const product = getValue(spk, 'productName');
                  const qty = getValue(spk, 'targetQty');
                  const order = orders.find(o => (o.id || getValue(o, 'id')) === orderId);
                  const customerId = getValue(spk, 'customerId') || (order ? getValue(order, 'customerId') : '');
                  const customer = customers.find(c => (c.id || getValue(c, 'id')) === customerId);
                  const name = customer?.name || getValue(order, 'customerName') || 'Unknown';

                  return (
                    <div key={id || index} className="p-4 bg-gray-50 rounded-2xl border border-gray-100 space-y-3">
                      <div className="flex justify-between items-start">
                        <div>
                          <p className="text-xs font-bold text-teal-600 uppercase tracking-wider">{id}</p>
                          <p className="text-sm font-bold text-gray-900">{name}</p>
                        </div>
                        <span className="px-2 py-1 rounded-lg text-[10px] font-bold uppercase tracking-wider bg-green-100 text-green-700">
                          100%
                        </span>
                      </div>
                      <div className="flex justify-between items-center text-xs text-gray-500">
                        <span>{product}</span>
                        <span className="font-bold">{qty} pcs</span>
                      </div>
                      <button 
                        onClick={() => {
                          setFormData({
                            orderId: orderId,
                            product: product,
                            qty: Number(qty) || 0,
                            defects: 0,
                            repairable: 0,
                            nonRepairable: 0,
                            status: 'Accept',
                            notes: `Inspeksi otomatis dari SPK ${id}`,
                            imageUrls: []
                          });
                          setActiveTab('final');
                          setIsModalOpen(true);
                        }}
                        className="w-full bg-teal-600 text-white py-3 rounded-xl text-sm font-bold hover:bg-teal-700 transition-colors"
                      >
                        Mulai Inspeksi
                      </button>
                    </div>
                  );
                }) : (
                  <div className="py-10 text-center text-gray-500 text-sm">
                    {searchQuery ? `Tidak ada antrian inspeksi cocok dengan "${searchQuery}".` : 'Tidak ada antrian inspeksi.'}
                  </div>
                )}
              </div>
            </div>
          ) : (
            <>
              {/* Desktop Table View */}
              <div className="hidden md:block overflow-x-auto">
                <table className="w-full text-left">
              <thead>
                <tr className="border-b border-gray-100">
                  <th className="pb-4 font-semibold text-sm text-gray-500">ID QC</th>
                  <th className="pb-4 font-semibold text-sm text-gray-500">Foto</th>
                  <th className="pb-4 font-semibold text-sm text-gray-500">Pelanggan</th>
                  <th className="pb-4 font-semibold text-sm text-gray-500">Ref Pesanan</th>
                  <th className="pb-4 font-semibold text-sm text-gray-500">Produk</th>
                  <th className="pb-4 font-semibold text-sm text-gray-500">Cacat Ditemukan</th>
                  <th className="pb-4 font-semibold text-sm text-gray-500">Keputusan</th>
                  <th className="pb-4 font-semibold text-sm text-gray-500">Aksi</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-50">
                {filteredData.length > 0 ? filteredData.map((item, index) => {
                  const id = item.id || getValue(item, 'id');
                  const orderId = getValue(item, 'orderId');
                  const product = getValue(item, 'product');
                  const defects = getValue(item, 'defects');
                  const status = getValue(item, 'status');
                  const rawImageUrl = getValue(item, 'imageUrl');
                  let displayUrl = '';
                  try {
                    if (rawImageUrl) {
                      if (rawImageUrl.startsWith('[') && rawImageUrl.endsWith(']')) {
                        const urls = JSON.parse(rawImageUrl);
                        displayUrl = urls[0] || '';
                      } else {
                        displayUrl = rawImageUrl;
                      }
                    }
                  } catch (e) {
                    displayUrl = rawImageUrl;
                  }

                  return (
                    <tr key={`${id || index}-${index}`} className="hover:bg-gray-50/50 transition-colors">
                      <td className="py-4 text-sm font-bold text-gray-900">{id}</td>
                      <td className="py-4">
                        {displayUrl ? (
                          <div 
                            onClick={() => setPreviewImage(displayUrl)}
                            className="w-10 h-10 rounded-lg overflow-hidden bg-gray-100 border border-gray-200 cursor-pointer hover:opacity-80 transition-opacity"
                          >
                            <img 
                              src={displayUrl} 
                              alt="QC" 
                              className="w-full h-full object-cover"
                              referrerPolicy="no-referrer"
                            />
                          </div>
                        ) : (
                          <div className="w-10 h-10 rounded-lg bg-gray-50 flex items-center justify-center text-gray-300">
                            <ImageIcon size={16} />
                          </div>
                        )}
                      </td>
                      <td className="py-4 text-sm text-gray-600">
                        {(() => {
                          const order = orders.find(o => (o.id || getValue(o, 'id')) === orderId);
                          const customerId = getValue(item, 'customerId') || (order ? (order.customerId || getValue(order, 'customerId')) : '');
                          const customer = customers.find(c => (c.id || getValue(c, 'id')) === customerId);
                          const name = customer?.name || getValue(order, 'customerName') || 'Unknown';
                          const company = customer?.company || '';
                          return company ? `${name} (${company})` : name;
                        })()}
                      </td>
                      <td className="py-4 text-sm text-gray-600">{orderId}</td>
                      <td className="py-4 text-sm text-gray-600">{product}</td>
                      <td className="py-4 text-sm text-gray-600">
                        <span className={cn(
                          "font-bold",
                          Number(defects) > 10 ? "text-red-600" : Number(defects) > 0 ? "text-orange-600" : "text-green-600"
                        )}>
                          {defects} pcs
                        </span>
                      </td>
                      <td className="py-4">
                        <span className={cn(
                          "px-3 py-1 rounded-full text-[10px] font-bold uppercase tracking-wider",
                          status === 'Accept' ? "bg-green-100 text-green-700" : 
                          status === 'Repair' ? "bg-orange-100 text-orange-700" : "bg-red-100 text-red-700"
                        )}>
                          {status === 'Accept' ? 'Terima' : status === 'Repair' ? 'Perbaikan' : 'Tolak'}
                        </span>
                      </td>
                      <td className="py-4">
                        <div className="flex items-center gap-2">
                          <button 
                            onClick={() => {
                              setSelectedReport(item);
                              setIsDetailModalOpen(true);
                            }}
                            className="p-2 hover:bg-teal-50 rounded-lg text-teal-600 transition-colors"
                            title="Lihat Laporan"
                          >
                            <ClipboardList size={16} />
                          </button>
                          
                          {(status === 'Repair' || status === 'Reject' || Number(defects) > 0) && (
                            <button 
                              onClick={() => handleRepair(item)}
                              className="p-2 hover:bg-green-50 rounded-lg text-green-600 transition-colors"
                              title="Perbaiki Item"
                            >
                              <Wrench size={16} />
                            </button>
                          )}

                          {activeTab !== 'sampling' && (
                            <button 
                              onClick={() => handleEdit(item)}
                              className="p-2 hover:bg-gray-50 rounded-lg text-gray-400 hover:text-gray-600 transition-colors"
                              title="Ubah Laporan"
                            >
                              <Edit2 size={16} />
                            </button>
                          )}

                          <button 
                            onClick={() => handleDelete(id)}
                            className="p-2 hover:bg-red-50 rounded-lg text-red-400 hover:text-red-600 transition-colors"
                            title="Hapus Laporan"
                          >
                            <Trash2 size={16} />
                          </button>
                        </div>
                      </td>
                    </tr>
                  );
                }) : (
                  <tr>
                    <td colSpan={8} className="py-20 text-center text-gray-500">
                      {searchQuery ? `Tidak ada laporan QC cocok dengan "${searchQuery}".` : 'Tidak ada laporan QC ditemukan untuk kategori ini.'}
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>

          {/* Mobile Card View */}
          <div className="md:hidden space-y-4">
            {filteredData.length > 0 ? filteredData.map((item, index) => {
              const id = item.id || getValue(item, 'id');
              const orderId = getValue(item, 'orderId');
              const product = getValue(item, 'product');
              const defects = getValue(item, 'defects');
              const status = getValue(item, 'status');
              const rawImageUrl = getValue(item, 'imageUrl');
              let displayUrl = '';
              try {
                if (rawImageUrl) {
                  if (rawImageUrl.startsWith('[') && rawImageUrl.endsWith(']')) {
                    const urls = JSON.parse(rawImageUrl);
                    displayUrl = urls[0] || '';
                  } else {
                    displayUrl = rawImageUrl;
                  }
                }
              } catch (e) {
                displayUrl = rawImageUrl;
              }
              const order = orders.find(o => (o.id || getValue(o, 'id')) === orderId);
              const customerId = getValue(item, 'customerId') || (order ? (order.customerId || getValue(order, 'customerId')) : '');
              const customer = customers.find(c => (c.id || getValue(c, 'id')) === customerId);
              const name = customer?.name || getValue(order, 'customerName') || 'Unknown';
              const company = customer?.company || '';
              const clientInfo = company ? `${name} (${company})` : name;

              return (
                <div key={`${id || index}-${index}`} className="p-4 bg-gray-50 rounded-2xl border border-gray-100 space-y-4">
                  <div className="flex justify-between items-start">
                    <div className="flex items-center gap-3">
                      {displayUrl ? (
                        <div 
                          onClick={() => setPreviewImage(displayUrl)}
                          className="w-12 h-12 rounded-xl overflow-hidden bg-white border border-gray-200 cursor-pointer"
                        >
                          <img src={displayUrl} alt="QC" className="w-full h-full object-cover" referrerPolicy="no-referrer" />
                        </div>
                      ) : (
                        <div className="w-12 h-12 rounded-xl bg-white flex items-center justify-center text-gray-300 border border-gray-200">
                          <ImageIcon size={20} />
                        </div>
                      )}
                      <div>
                        <p className="text-xs font-bold text-teal-600 uppercase tracking-wider">{id}</p>
                        <p className="text-sm font-bold text-gray-900 truncate max-w-[150px]">{clientInfo}</p>
                      </div>
                    </div>
                    <span className={cn(
                      "px-2 py-1 rounded-lg text-[10px] font-bold uppercase tracking-wider",
                      status === 'Accept' ? "bg-green-100 text-green-700" : 
                      status === 'Repair' ? "bg-orange-100 text-orange-700" : "bg-red-100 text-red-700"
                    )}>
                      {status === 'Accept' ? 'Terima' : status === 'Repair' ? 'Perbaikan' : 'Tolak'}
                    </span>
                  </div>
                  
                  <div className="grid grid-cols-2 gap-4 py-3 border-y border-gray-200/50">
                    <div>
                      <p className="text-[10px] font-bold text-gray-400 uppercase tracking-wider">Produk</p>
                      <p className="text-xs font-semibold text-gray-700 truncate">{product}</p>
                    </div>
                    <div>
                      <p className="text-[10px] font-bold text-gray-400 uppercase tracking-wider">Ref Pesanan</p>
                      <p className="text-xs font-semibold text-gray-700">{orderId}</p>
                    </div>
                  </div>

                  <div className="flex items-center justify-between">
                    <div>
                      <p className="text-[10px] font-bold text-gray-400 uppercase tracking-wider">Cacat</p>
                      <p className={cn(
                        "text-sm font-black",
                        Number(defects) > 10 ? "text-red-600" : Number(defects) > 0 ? "text-orange-600" : "text-green-600"
                      )}>
                        {defects} pcs
                      </p>
                    </div>
                    <div className="flex items-center gap-2">
                      <button 
                        onClick={() => {
                          setSelectedReport(item);
                          setIsDetailModalOpen(true);
                        }}
                        className="p-2.5 bg-white border border-gray-200 text-gray-600 rounded-xl shadow-sm"
                      >
                        <ClipboardList size={18} />
                      </button>
                      
                      {(status === 'Repair' || status === 'Reject' || Number(defects) > 0) && (
                        <button 
                          onClick={() => handleRepair(item)}
                          className="p-2.5 bg-white border border-green-100 text-green-600 rounded-xl shadow-sm"
                        >
                          <Wrench size={18} />
                        </button>
                      )}

                      <button 
                        onClick={() => handleDelete(id)}
                        className="p-2.5 bg-white border border-red-100 text-red-600 rounded-xl shadow-sm"
                      >
                        <Trash2 size={18} />
                      </button>
                    </div>
                  </div>
                </div>
              );
            }) : (
              <div className="py-10 text-center text-gray-500">
                {searchQuery ? `Tidak ada laporan QC cocok dengan "${searchQuery}".` : 'Tidak ada laporan QC.'}
              </div>
            )}
          </div>
        </>
      )}
    </Card>
  )}

      <Modal 
        isOpen={isModalOpen} 
        onClose={() => {
          setIsModalOpen(false);
          setEditingId(null);
          setIsRepairMode(false);
        }} 
        title={isRepairMode ? "Proses Perbaikan QC" : editingId ? "Ubah Laporan QC" : "Inspeksi QC Baru"}
      >
        <form onSubmit={handleSubmit} className="space-y-6">
          <div className="space-y-2">
            <label className="text-xs font-bold text-gray-400 uppercase tracking-wider">Pilih Pesanan</label>
            <select 
              required
              value={formData.orderId}
              onChange={(e) => {
                const order = orders.find(o => (o.id || getValue(o, 'id')) === e.target.value);
                setFormData({
                  ...formData, 
                  orderId: e.target.value,
                  product: getValue(order, 'product') || ''
                });
              }}
              className="w-full p-3 bg-gray-50 border-none rounded-xl text-sm focus:ring-2 focus:ring-teal-500/20"
            >
              <option value="">Pilih pesanan...</option>
              {orders.map(order => {
                const orderId = order.id || getValue(order, 'id');
                const product = getValue(order, 'product');
                const customer = customers.find(c => c.id === order?.customerId);
                const name = customer?.name || order?.customerName || 'Unknown';
                const company = customer?.company || '';
                const clientInfo = company ? `${name} (${company})` : name;
                return (
                  <option key={orderId} value={orderId}>{orderId} - {clientInfo} - {product}</option>
                );
              })}
            </select>
          </div>

          <div className="grid grid-cols-2 gap-6">
            <div className="space-y-2">
              <label className="text-xs font-bold text-gray-400 uppercase tracking-wider">Jml Diinspeksi</label>
              <input 
                required
                type="number" 
                value={formData.qty}
                disabled={isRepairMode}
                onChange={(e) => setFormData({...formData, qty: Number(e.target.value)})}
                className={cn(
                  "w-full p-3 bg-gray-50 border-none rounded-xl text-sm focus:ring-2 focus:ring-teal-500/20",
                  isRepairMode && "opacity-60 cursor-not-allowed"
                )} 
              />
            </div>
            <div className="space-y-2">
              <label className="text-xs font-bold text-gray-400 uppercase tracking-wider">Cacat Ditemukan</label>
              <input 
                required
                type="number" 
                value={formData.defects}
                disabled={isRepairMode}
                onChange={(e) => setFormData({...formData, defects: Number(e.target.value)})}
                className={cn(
                  "w-full p-3 bg-gray-50 border-none rounded-xl text-sm focus:ring-2 focus:ring-teal-500/20",
                  isRepairMode && "opacity-60 cursor-not-allowed"
                )} 
              />
            </div>
          </div>

          {isRepairMode && (
            <div className="grid grid-cols-2 gap-6 p-4 bg-teal-50 rounded-2xl border border-teal-100">
              <div className="space-y-2">
                <label className="text-xs font-bold text-teal-600 uppercase tracking-wider">Dapat Diperbaiki</label>
                <input 
                  required
                  type="number" 
                  value={formData.repairable}
                  onChange={(e) => {
                    const val = Number(e.target.value);
                    setFormData({
                      ...formData, 
                      repairable: val,
                      nonRepairable: Math.max(0, formData.defects - val)
                    });
                  }}
                  className="w-full p-3 bg-white border-none rounded-xl text-sm focus:ring-2 focus:ring-teal-500/20" 
                />
              </div>
              <div className="space-y-2">
                <label className="text-xs font-bold text-teal-600 uppercase tracking-wider">Tidak Dapat Diperbaiki</label>
                <input 
                  required
                  type="number" 
                  value={formData.nonRepairable}
                  onChange={(e) => {
                    const val = Number(e.target.value);
                    setFormData({
                      ...formData, 
                      nonRepairable: val,
                      repairable: Math.max(0, formData.defects - val)
                    });
                  }}
                  className="w-full p-3 bg-white border-none rounded-xl text-sm focus:ring-2 focus:ring-teal-500/20" 
                />
              </div>
            </div>
          )}

          <div className="space-y-2">
            <label className="text-xs font-bold text-gray-400 uppercase tracking-wider">Keputusan</label>
            <div className="flex gap-4">
              {['Accept', 'Repair', 'Reject'].map((status) => (
                <button
                  key={status}
                  type="button"
                  onClick={() => setFormData({...formData, status})}
                  className={cn(
                    "flex-1 py-3 rounded-xl text-sm font-bold transition-all",
                    formData.status === status 
                      ? (status === 'Accept' ? "bg-green-600 text-white" : status === 'Repair' ? "bg-orange-600 text-white" : "bg-red-600 text-white")
                      : "bg-gray-100 text-gray-500 hover:bg-gray-200"
                  )}
                >
                  {status === 'Accept' ? 'Terima' : status === 'Repair' ? 'Perbaiki' : 'Tolak'}
                </button>
              ))}
            </div>
          </div>

          <div className="space-y-2">
            <label className="text-xs font-bold text-gray-400 uppercase tracking-wider">Catatan / Detail Cacat</label>
            <textarea 
              value={formData.notes}
              onChange={(e) => setFormData({...formData, notes: e.target.value})}
              rows={3}
              className="w-full p-3 bg-gray-50 border-none rounded-xl text-sm focus:ring-2 focus:ring-teal-500/20" 
            />
          </div>

          <div className="space-y-2">
            <label className="text-xs font-bold text-gray-400 uppercase tracking-wider">Foto Bukti (Bisa lebih dari satu)</label>
            <div className="grid grid-cols-2 gap-4">
              {formData.imageUrls.map((url, index) => (
                <div key={index} className="relative aspect-video bg-gray-100 rounded-2xl overflow-hidden group">
                  <img 
                    src={url} 
                    alt={`Preview ${index}`} 
                    className="w-full h-full object-cover"
                    referrerPolicy="no-referrer"
                  />
                  <button 
                    type="button"
                    onClick={() => removeImage(index)}
                    className="absolute top-2 right-2 p-1.5 bg-black/50 text-white rounded-full hover:bg-black transition-colors"
                  >
                    <XIcon size={16} />
                  </button>
                </div>
              ))}
              
              <label className="flex flex-col items-center justify-center aspect-video border-2 border-dashed border-gray-200 rounded-2xl cursor-pointer hover:bg-gray-50 transition-all group">
                {uploading ? (
                  <div className="flex flex-col items-center gap-2">
                    <Loader2 className="animate-spin text-teal-600" size={24} />
                    <span className="text-[10px] font-bold text-gray-400">Mengunggah...</span>
                  </div>
                ) : (
                  <>
                    <Upload className="text-gray-300 group-hover:text-teal-600 transition-colors mb-2" size={32} />
                    <span className="text-[10px] font-bold text-gray-400 text-center px-2">Tambah Foto Bukti</span>
                  </>
                )}
                <input 
                  type="file" 
                  className="hidden" 
                  multiple
                  accept="image/*"
                  onChange={handleFileUpload}
                  disabled={uploading}
                />
              </label>
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
              {isRepairMode ? "Selesaikan Perbaikan" : editingId ? "Simpan Perubahan" : "Kirim Laporan"}
            </button>
          </div>
        </form>
      </Modal>

      <Modal
        isOpen={isDeleteModalOpen}
        onClose={() => {
          setIsDeleteModalOpen(false);
          setItemToDelete(null);
        }}
        title="Konfirmasi Hapus"
      >
        <div className="space-y-6">
          <div className="flex items-center gap-4 p-4 bg-red-50 rounded-2xl text-red-700">
            <AlertCircle size={24} />
            <p className="text-sm font-medium">
              Apakah Anda yakin ingin menghapus laporan QC ini? Tindakan ini tidak dapat dibatalkan.
            </p>
          </div>
          
          <div className="flex justify-end gap-4">
            <button 
              onClick={() => {
                setIsDeleteModalOpen(false);
                setItemToDelete(null);
              }}
              className="px-6 py-2.5 text-sm font-semibold text-gray-500 hover:text-gray-900"
            >
              Batal
            </button>
            <button 
              onClick={confirmDelete}
              disabled={loading}
              className="px-8 py-2.5 bg-red-600 text-white rounded-2xl text-sm font-semibold shadow-lg shadow-red-600/20 hover:bg-red-700 transition-all disabled:opacity-50"
            >
              {loading ? "Menghapus..." : "Ya, Hapus"}
            </button>
          </div>
        </div>
      </Modal>

      <Modal 
        isOpen={isDetailModalOpen} 
        onClose={() => setIsDetailModalOpen(false)} 
        title="Detail Laporan QC"
      >
        {selectedReport && (
          <div className="space-y-6">
            <div className="grid grid-cols-2 gap-6">
              <div className="p-4 bg-gray-50 rounded-2xl">
                <p className="text-[10px] font-bold text-gray-400 uppercase tracking-wider mb-1">Pelanggan</p>
                <p className="text-sm font-bold text-gray-900">
                  {(() => {
                    const orderId = getValue(selectedReport, 'orderId');
                    const order = orders.find(o => (o.id || getValue(o, 'id')) === orderId);
                    const customer = customers.find(c => c.id === order?.customerId);
                    const name = customer?.name || order?.customerName || 'Unknown';
                    const company = customer?.company || '';
                    return company ? `${name} (${company})` : name;
                  })()}
                </p>
              </div>
              <div className="p-4 bg-gray-50 rounded-2xl">
                <p className="text-[10px] font-bold text-gray-400 uppercase tracking-wider mb-1">Status</p>
                <span className={cn(
                  "px-3 py-1 rounded-full text-[10px] font-bold uppercase tracking-wider",
                  getValue(selectedReport, 'status') === 'Accept' ? "bg-green-100 text-green-700" : 
                  getValue(selectedReport, 'status') === 'Repair' ? "bg-orange-100 text-orange-700" : "bg-red-100 text-red-700"
                )}>
                  {getValue(selectedReport, 'status') === 'Accept' ? 'Terima' : getValue(selectedReport, 'status') === 'Repair' ? 'Perbaikan' : 'Tolak'}
                </span>
              </div>
            </div>

            <div className="grid grid-cols-3 gap-6">
              <div className="p-4 bg-gray-50 rounded-2xl">
                <p className="text-[10px] font-bold text-gray-400 uppercase tracking-wider mb-1">ID QC</p>
                <p className="text-sm font-bold text-gray-900">{selectedReport.id}</p>
              </div>
              <div className="p-4 bg-gray-50 rounded-2xl">
                <p className="text-[10px] font-bold text-gray-400 uppercase tracking-wider mb-1">Ref Pesanan</p>
                <p className="text-sm font-bold text-gray-900">{getValue(selectedReport, 'orderId')}</p>
              </div>
              <div className="p-4 bg-gray-50 rounded-2xl">
                <p className="text-[10px] font-bold text-gray-400 uppercase tracking-wider mb-1">Produk</p>
                <p className="text-sm font-bold text-gray-900">{getValue(selectedReport, 'product')}</p>
              </div>
            </div>

            <div className="grid grid-cols-2 gap-6">
              <div className="p-4 bg-gray-50 rounded-2xl">
                <p className="text-[10px] font-bold text-gray-400 uppercase tracking-wider mb-1">Jml Diinspeksi</p>
                <p className="text-sm font-bold text-gray-900">{getValue(selectedReport, 'qty')} pcs</p>
              </div>
              <div className="p-4 bg-gray-50 rounded-2xl">
                <p className="text-[10px] font-bold text-gray-400 uppercase tracking-wider mb-1">Cacat Ditemukan</p>
                <p className="text-sm font-bold text-red-600">{getValue(selectedReport, 'defects')} pcs</p>
              </div>
            </div>

            {(Number(getValue(selectedReport, 'repairable')) > 0 || Number(getValue(selectedReport, 'nonRepairable')) > 0) && (
              <div className="grid grid-cols-2 gap-6 p-4 bg-teal-50 rounded-2xl border border-teal-100">
                <div>
                  <p className="text-[10px] font-bold text-teal-600 uppercase tracking-wider mb-1">Dapat Diperbaiki</p>
                  <p className="text-sm font-bold text-teal-700">{getValue(selectedReport, 'repairable')} pcs</p>
                </div>
                <div>
                  <p className="text-[10px] font-bold text-teal-600 uppercase tracking-wider mb-1">Tidak Dapat Diperbaiki</p>
                  <p className="text-sm font-bold text-red-700">{getValue(selectedReport, 'nonRepairable')} pcs</p>
                </div>
              </div>
            )}

            <div className="p-4 bg-gray-50 rounded-2xl">
              <p className="text-[10px] font-bold text-gray-400 uppercase tracking-wider mb-1">Catatan / Detail Cacat</p>
              <p className="text-sm text-gray-700 whitespace-pre-wrap">{getValue(selectedReport, 'notes') || 'Tidak ada catatan.'}</p>
            </div>

            {getValue(selectedReport, 'imageUrl') && (
              <div className="space-y-2">
                <p className="text-[10px] font-bold text-gray-400 uppercase tracking-wider">Foto Bukti</p>
                <div className="aspect-video bg-gray-100 rounded-2xl overflow-hidden border border-gray-200">
                  <img 
                    src={getValue(selectedReport, 'imageUrl')} 
                    alt="QC Evidence" 
                    className="w-full h-full object-contain"
                    referrerPolicy="no-referrer"
                  />
                </div>
              </div>
            )}

            <div className="pt-4 flex justify-end">
              <button 
                onClick={() => setIsDetailModalOpen(false)}
                className="px-8 py-2.5 bg-black text-white rounded-2xl text-sm font-semibold shadow-lg shadow-black/10 hover:bg-gray-800 transition-all"
              >
                Tutup
              </button>
            </div>
          </div>
        )}
      </Modal>

      {/* Photo Preview Modal */}
      <Modal
        isOpen={!!previewImage}
        onClose={() => setPreviewImage(null)}
        title="Preview Foto QC"
      >
        <div className="flex items-center justify-center p-2">
          {previewImage && (
            <img 
              src={previewImage} 
              alt="QC Preview" 
              className="max-w-full max-h-[70vh] rounded-2xl shadow-2xl"
              referrerPolicy="no-referrer"
            />
          )}
        </div>
        <div className="mt-6 flex justify-center">
          <button
            onClick={() => setPreviewImage(null)}
            className="px-8 py-2.5 bg-black text-white rounded-2xl text-sm font-semibold hover:bg-gray-800 transition-all"
          >
            Tutup
          </button>
        </div>
      </Modal>
    </div>
  );
};
