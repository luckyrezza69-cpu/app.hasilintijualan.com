import React, { useState, useEffect, useMemo } from 'react';
import { Card } from '../App';
import { 
  Wallet, 
  ArrowUpRight, 
  ArrowDownLeft, 
  FileText, 
  CreditCard, 
  Clock,
  Plus,
  Search,
  X,
  Download,
  Loader2
} from 'lucide-react';
import { formatCurrency, cn, generateId } from '../lib/utils';
import { sheetsService } from '../services/googleService';
import { Modal } from './ui/Modal';

export const FinanceModule = () => {
  const [activeTab, setActiveTab] = useState<'invoices' | 'payments' | 'reports'>('invoices');
  const [searchQuery, setSearchQuery] = useState('');
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [data, setData] = useState<any[]>([]);
  const [customers, setCustomers] = useState<any[]>([]);
  const [spks, setSpks] = useState<any[]>([]);
  const [orders, setOrders] = useState<any[]>([]);
  const [qcReports, setQcReports] = useState<any[]>([]);
  
  // Helper to get value from object with case-insensitive key and common aliases
  const getValue = (obj: any, key: string) => {
    if (!obj) return '';
    const normalizedKey = key.toLowerCase().replace(/\s/g, '');
    
    // Define aliases for common fields
    const aliases: Record<string, string[]> = {
      orderid: ['orderid', 'idorder', 'pesanan', 'idpesanan', 'ref', 'orderref'],
      customerid: ['customerid', 'idcustomer', 'customer', 'idpelanggan'],
      customername: ['customername', 'namacustomer', 'customer', 'nama', 'client'],
      producttype: ['producttype', 'product', 'produk', 'namaproduk', 'item'],
      totalprice: ['totalprice', 'total', 'hargatotal', 'harga', 'value', 'amount'],
      status: ['status', 'kondisi', 'keterangan', 'state'],
      quantity: ['quantity', 'qty', 'jumlah', 'pcs', 'vol'],
      id: ['id', 'no', 'kode', 'identity', 'key']
    };

    const searchKeys = aliases[normalizedKey] || [normalizedKey];
    
    const actualKey = Object.keys(obj).find(k => {
      const nk = k.toLowerCase().replace(/\s/g, '');
      return searchKeys.includes(nk);
    });
    
    return actualKey ? obj[actualKey] : '';
  };

  const [formData, setFormData] = useState({
    id: '',
    orderId: '',
    customerId: '',
    customerName: '',
    amount: 0,
    dueDate: new Date().toISOString().split('T')[0],
    status: 'Tertunda',
    notes: ''
  });

  const fetchData = async () => {
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 15000); // 15s timeout

    try {
      setLoading(true);
      setError(null);
      const sheetName = activeTab === 'invoices' ? 'Invoices' : 'Payments';
      
      // Use a helper to fetch with timeout
      const fetchWithTimeout = async (name: string) => {
        try {
          return await sheetsService.getAll(name);
        } catch (err) {
          console.warn(`Failed to fetch ${name}:`, err);
          return []; // Return empty array on failure to allow other data to load
        }
      };

      const [items, customerList, spkList, orderList, qcList] = await Promise.all([
        fetchWithTimeout(sheetName),
        fetchWithTimeout('Customers'),
        fetchWithTimeout('SPK_Produksi'),
        fetchWithTimeout('Orders'),
        fetchWithTimeout('QC_Reports')
      ]);

      setData(Array.isArray(items) ? items : []);
      setCustomers(Array.isArray(customerList) ? customerList : []);
      setSpks(Array.isArray(spkList) ? spkList : []);
      setOrders(Array.isArray(orderList) ? orderList : []);
      setQcReports(Array.isArray(qcList) ? qcList : []);
    } catch (error: any) {
      console.error('Error fetching finance data:', error);
      setError(error.message || 'Gagal memuat data keuangan. Silakan coba lagi.');
    } finally {
      clearTimeout(timeoutId);
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
  }, [activeTab]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      const prefix = activeTab === 'invoices' ? 'INV' : 'PAY';
      const sheetName = activeTab === 'invoices' ? 'Invoices' : 'Payments';
      
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
      alert('Gagal menyimpan data keuangan.');
    }
  };

  const handleUpdateStatus = async (id: string, newStatus: string) => {
    try {
      setLoading(true);
      const sheetName = activeTab === 'invoices' ? 'Invoices' : 'Payments';
      await sheetsService.update(sheetName, id, { status: newStatus });
      
      // If marked as Paid, we update the related Order and SPK as well
      if (newStatus === 'Paid' || newStatus === 'Dibayar') {
        const invoice = data.find(inv => getValue(inv, 'id') === id);
        const orderId = invoice ? getValue(invoice, 'orderId') : null;
        
        if (orderId) {
          await Promise.all([
            sheetsService.update('Orders', orderId, { status: 'Completed' }),
            // Also update SPK status if it exists
            ...spks.filter(s => getValue(s, 'orderId') === orderId).map(s => 
              sheetsService.update('SPK_Produksi', getValue(s, 'id'), { status: 'Finished' })
            )
          ]);
        }
      }
      
      await fetchData();
      alert('Status berhasil diperbarui!');
    } catch (error) {
      console.error('Error updating status:', error);
      alert('Gagal memperbarui status.');
    } finally {
      setLoading(false);
    }
  };

  const readyForInvoice = spks.filter(spk => {
    const status = getValue(spk, 'status');
    const progress = Number(getValue(spk, 'progress')) || 0;
    const orderId = getValue(spk, 'orderId');
    
    return (status === 'Completed' || status === 'Finished' || progress >= 100) && 
           !data.some(inv => getValue(inv, 'orderId') === orderId);
  });

  const completedOrders = orders.filter(order => {
    const status = getValue(order, 'status');
    return status === 'Paid' || status === 'Dibayar' || status === 'Completed' || status === 'Finished';
  });

  const filteredData = useMemo(() => {
    if (!searchQuery.trim()) return data;
    const q = searchQuery.toLowerCase();
    return data.filter(item => {
      const id = String(getValue(item, 'id') || '').toLowerCase();
      const customerName = String(getValue(item, 'customerName') || '').toLowerCase();
      const orderId = String(getValue(item, 'orderId') || '').toLowerCase();
      const status = String(getValue(item, 'status') || '').toLowerCase();
      const amount = String(getValue(item, 'amount') || '').toLowerCase();
      const notes = String(getValue(item, 'notes') || '').toLowerCase();
      
      return id.includes(q) || 
             customerName.includes(q) || 
             orderId.includes(q) || 
             status.includes(q) || 
             amount.includes(q) || 
             notes.includes(q);
    });
  }, [data, searchQuery]);

  const filteredCompletedOrders = useMemo(() => {
    if (!searchQuery.trim()) return completedOrders;
    const q = searchQuery.toLowerCase();
    return completedOrders.filter(order => {
      const id = String(getValue(order, 'id') || '').toLowerCase();
      const customerName = String(getValue(order, 'customerName') || '').toLowerCase();
      const productType = String(getValue(order, 'productType') || '').toLowerCase();
      const status = String(getValue(order, 'status') || '').toLowerCase();
      const totalPrice = String(getValue(order, 'totalPrice') || '').toLowerCase();
      
      return id.includes(q) || 
             customerName.includes(q) || 
             productType.includes(q) || 
             status.includes(q) || 
             totalPrice.includes(q);
    });
  }, [completedOrders, searchQuery]);

  const getQCStats = (orderId: string) => {
    const reports = qcReports.filter(r => getValue(r, 'orderId') === orderId);
    if (reports.length === 0) return null;
    
    const totalDefects = reports.reduce((acc, r) => acc + (Number(getValue(r, 'defects')) || 0), 0);
    const totalRepairable = reports.reduce((acc, r) => acc + (Number(getValue(r, 'repairable')) || 0), 0);
    const totalNonRepairable = reports.reduce((acc, r) => acc + (Number(getValue(r, 'nonRepairable')) || 0), 0);
    
    return {
      defects: totalDefects,
      repairable: totalRepairable,
      nonRepairable: totalNonRepairable
    };
  };

  const totalRevenue = data
    .filter(item => getValue(item, 'status') === 'Paid' || getValue(item, 'status') === 'Dibayar')
    .reduce((acc, item) => acc + Number(getValue(item, 'amount')), 0);

  const outstandingAR = data
    .filter(item => {
      const status = getValue(item, 'status');
      return status === 'Pending' || status === 'Tertunda' || status === 'Overdue' || status === 'Jatuh Tempo';
    })
    .reduce((acc, item) => acc + Number(getValue(item, 'amount')), 0);

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
          <h2 className="text-2xl font-bold text-gray-900">Keuangan & Penagihan</h2>
          <p className="text-sm text-gray-500">Kelola faktur, pembayaran, dan pelacakan keuangan.</p>
        </div>
        <button 
          onClick={() => setIsModalOpen(true)}
          className="w-full sm:w-auto bg-gradient-to-r from-teal-600 to-emerald-600 hover:from-teal-700 hover:to-emerald-700 text-white px-6 py-2.5 rounded-2xl text-xs sm:text-sm font-semibold flex items-center justify-center gap-2 transition-all shadow-lg shadow-teal-600/20"
        >
          <Plus size={18} />
          {activeTab === 'invoices' ? 'Buat Faktur' : 'Catat Pembayaran'}
        </button>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-4 sm:gap-6">
        <div className="bg-white rounded-3xl p-6 border border-gray-100 shadow-sm">
          <div className="flex items-center gap-4 mb-4">
            <div className="w-10 h-10 rounded-xl bg-green-50 flex items-center justify-center text-green-600">
              <ArrowUpRight size={20} />
            </div>
            <span className="text-sm font-medium text-gray-500">Total Pendapatan</span>
          </div>
          <h4 className="text-2xl font-bold">{formatCurrency(totalRevenue)}</h4>
          <p className="text-xs text-green-600 mt-1 font-medium">Dari faktur yang dibayar</p>
        </div>
        <div className="bg-white rounded-3xl p-6 border border-gray-100 shadow-sm">
          <div className="flex items-center gap-4 mb-4">
            <div className="w-10 h-10 rounded-xl bg-orange-50 flex items-center justify-center text-orange-600">
              <Clock size={20} />
            </div>
            <span className="text-sm font-medium text-gray-500">Piutang Beredar</span>
          </div>
          <h4 className="text-2xl font-bold">{formatCurrency(outstandingAR)}</h4>
          <p className="text-xs text-orange-500 mt-1 font-medium">Tertunda & Jatuh Tempo</p>
        </div>
        <div className="bg-white rounded-3xl p-6 border border-gray-100 shadow-sm">
          <div className="flex items-center gap-4 mb-4">
            <div className="w-10 h-10 rounded-xl bg-teal-50 flex items-center justify-center text-teal-600">
              <CreditCard size={20} />
            </div>
            <span className="text-sm font-medium text-gray-500">Total Transaksi</span>
          </div>
          <h4 className="text-2xl font-bold">{data.length}</h4>
          <p className="text-xs text-gray-400 mt-1">Faktur & Pembayaran</p>
        </div>
      </div>

      <div className="flex flex-col sm:flex-row justify-between items-stretch sm:items-center gap-4">
        <div className="grid grid-cols-3 sm:flex gap-1.5 p-1.5 bg-gray-100 rounded-2xl w-full sm:w-fit">
          {(['invoices', 'payments', 'reports'] as const).map((tab) => (
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
              {tab === 'invoices' ? 'Faktur' : tab === 'payments' ? 'Pembayaran' : 'Laporan'}
            </button>
          ))}
        </div>

        {/* Search Bar */}
        <div className="relative flex-1 sm:max-w-md">
          <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 text-gray-400" size={18} />
          <input 
            type="text" 
            placeholder={
              activeTab === 'invoices' ? "Cari nomor faktur, pelanggan, status..." :
              activeTab === 'payments' ? "Cari nomor pembayaran, pelanggan, status..." :
              "Cari nomor pesanan selesai, pelanggan, produk..."
            }
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

      {activeTab === 'invoices' && readyForInvoice.length > 0 && (
        <div className="space-y-4">
          <div className="flex items-center gap-2 text-teal-600">
            <Clock size={18} />
            <h3 className="font-bold">Produksi Selesai (Siap Faktur)</h3>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {readyForInvoice.map(spk => {
              const spkId = getValue(spk, 'id');
              const spkOrderId = getValue(spk, 'orderId');
              const spkCustomerId = getValue(spk, 'customerId');
              const spkProductName = getValue(spk, 'productName');
              const spkTargetQty = getValue(spk, 'targetQty');
              
              const order = orders.find(o => getValue(o, 'id') === spkOrderId);
              return (
                <div key={spkId} className="bg-teal-50 rounded-2xl p-4 border border-teal-100 flex justify-between items-center">
                  <div>
                    <p className="text-xs font-bold text-teal-600 uppercase tracking-wider">{spkId}</p>
                    <h4 className="font-bold text-gray-900">{getValue(order, 'customerName') || 'Unknown'}</h4>
                    <p className="text-xs text-gray-500">{spkProductName} - {spkTargetQty} pcs</p>
                  </div>
                  <button 
                    onClick={() => {
                      setFormData({
                        ...formData,
                        orderId: spkOrderId,
                        customerId: spkCustomerId,
                        customerName: getValue(order, 'customerName') || '',
                        amount: Number(getValue(order, 'totalPrice')) || 0,
                        status: 'Tertunda'
                      });
                      setIsModalOpen(true);
                    }}
                    className="p-2 bg-teal-600 text-white rounded-xl hover:bg-teal-700 transition-all"
                  >
                    <Plus size={16} />
                  </button>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {loading ? (
        <div className="flex flex-col items-center justify-center py-20">
          <Loader2 className="animate-spin text-teal-600 mb-4" size={32} />
          <p className="text-gray-500 text-sm">Memuat data keuangan...</p>
        </div>
      ) : error ? (
        <div className="flex flex-col items-center justify-center py-20 bg-red-50 rounded-3xl border border-red-100">
          <p className="text-red-600 font-medium mb-4">{error}</p>
          <button 
            onClick={() => fetchData()}
            className="px-6 py-2 bg-red-600 text-white rounded-xl text-sm font-bold hover:bg-red-700 transition-all"
          >
            Coba Lagi
          </button>
        </div>
      ) : activeTab === 'reports' ? (
        <div className="space-y-6">
          <Card>
            <div className="p-4 border-b border-gray-100">
              <h3 className="font-bold text-gray-900">Laporan Keseluruhan Order Selesai</h3>
              <p className="text-xs text-gray-500">Daftar semua pesanan yang telah dibayar dan diselesaikan.</p>
            </div>
            
            {/* Desktop Table View */}
            <div className="hidden md:block overflow-x-auto">
              <table className="w-full text-left border-collapse">
                <thead>
                  <tr className="border-b border-gray-100">
                    <th className="p-4 font-bold text-xs text-gray-400 uppercase tracking-widest">ID Pesanan</th>
                    <th className="p-4 font-bold text-xs text-gray-400 uppercase tracking-widest">Pelanggan</th>
                    <th className="p-4 font-bold text-xs text-gray-400 uppercase tracking-widest">Produk</th>
                    <th className="p-4 font-bold text-xs text-gray-400 uppercase tracking-widest">QC Info</th>
                    <th className="p-4 font-bold text-xs text-gray-400 uppercase tracking-widest">Total Nilai</th>
                    <th className="p-4 font-bold text-xs text-gray-400 uppercase tracking-widest text-right">Status</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-50">
                  {filteredCompletedOrders.length > 0 ? filteredCompletedOrders.map((order) => {
                    const orderId = getValue(order, 'id');
                    const qc = getQCStats(orderId);
                    return (
                      <tr key={orderId} className="hover:bg-gray-50/50 transition-colors">
                        <td className="p-4 text-sm font-bold text-gray-900">{orderId}</td>
                        <td className="p-4 text-sm text-gray-600 font-medium">{getValue(order, 'customerName')}</td>
                        <td className="p-4 text-sm text-gray-600">{getValue(order, 'productType')}</td>
                        <td className="p-4 text-xs">
                          {qc ? (
                            <div className="space-y-1">
                              <p className="text-red-600 font-bold">Cacat: {qc.defects}</p>
                              <p className="text-gray-400 text-[10px]">R: {qc.repairable} | NR: {qc.nonRepairable}</p>
                            </div>
                          ) : (
                            <span className="text-gray-400">No QC Data</span>
                          )}
                        </td>
                        <td className="p-4 text-sm font-black text-teal-700">{formatCurrency(getValue(order, 'totalPrice'))}</td>
                        <td className="p-4 text-right">
                          <span className="px-3 py-1 bg-green-100 text-green-700 rounded-full text-[10px] font-bold uppercase tracking-wider">
                            {getValue(order, 'status')}
                          </span>
                        </td>
                      </tr>
                    );
                  }) : (
                    <tr>
                      <td colSpan={6} className="p-10 text-center text-gray-500 text-sm">
                        {searchQuery ? `Tidak ada laporan pesanan selesai yang cocok dengan "${searchQuery}".` : 'Belum ada order selesai.'}
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>

            {/* Mobile Unified Card View */}
            <div className="md:hidden space-y-3 p-4">
              {filteredCompletedOrders.length > 0 ? filteredCompletedOrders.map((order) => {
                const orderId = getValue(order, 'id');
                const qc = getQCStats(orderId);
                return (
                  <div key={orderId} className="p-4 bg-gray-50 rounded-2xl border border-gray-100 space-y-3 shadow-sm">
                    <div className="flex items-start justify-between gap-2">
                      <div>
                        <span className="text-[10px] font-bold text-teal-700 bg-teal-50 px-2 py-0.5 rounded-md uppercase tracking-wider inline-block">
                          {orderId}
                        </span>
                        <h4 className="text-sm font-bold text-gray-900 mt-1">{getValue(order, 'customerName')}</h4>
                        <span className="text-xs text-gray-500">{getValue(order, 'productType')}</span>
                      </div>
                      <span className="px-2.5 py-1 bg-green-100 text-green-700 rounded-full text-[10px] font-bold uppercase tracking-wider flex-shrink-0">
                        {getValue(order, 'status')}
                      </span>
                    </div>

                    <div className="grid grid-cols-2 gap-2 py-2 border-y border-gray-200/60 text-xs">
                      <div>
                        <span className="text-[10px] text-gray-400 uppercase font-bold block">QC Status</span>
                        {qc ? (
                          <span className="text-red-600 font-bold">Cacat: {qc.defects} (R:{qc.repairable}/NR:{qc.nonRepairable})</span>
                        ) : (
                          <span className="text-gray-400">No Data</span>
                        )}
                      </div>
                      <div>
                        <span className="text-[10px] text-gray-400 uppercase font-bold block">Total Nilai</span>
                        <span className="font-black text-teal-700">{formatCurrency(getValue(order, 'totalPrice'))}</span>
                      </div>
                    </div>
                  </div>
                );
              }) : (
                <div className="py-10 text-center text-gray-500 text-sm">
                  {searchQuery ? `Tidak ada laporan pesanan selesai yang cocok dengan "${searchQuery}".` : 'Belum ada order selesai.'}
                </div>
              )}
            </div>
          </Card>
        </div>
      ) : (
        <Card>
          {/* Desktop Table View */}
          <div className="hidden md:block overflow-x-auto">
            <table className="w-full text-left border-collapse">
              <thead>
                <tr className="border-b border-gray-100">
                  <th className="pb-4 font-bold text-sm text-gray-400 uppercase tracking-widest whitespace-nowrap pr-4">{activeTab === 'invoices' ? 'ID Faktur' : 'ID Pembayaran'}</th>
                  <th className="pb-4 font-bold text-sm text-gray-400 uppercase tracking-widest whitespace-nowrap pr-4">Pelanggan</th>
                  <th className="pb-4 font-bold text-sm text-gray-400 uppercase tracking-widest whitespace-nowrap pr-4">Jumlah</th>
                  <th className="pb-4 font-bold text-sm text-gray-400 uppercase tracking-widest whitespace-nowrap pr-4">{activeTab === 'invoices' ? 'Jatuh Tempo' : 'Tanggal'}</th>
                  <th className="pb-4 font-bold text-sm text-gray-400 uppercase tracking-widest whitespace-nowrap pr-4">Status</th>
                  <th className="pb-4 font-bold text-sm text-gray-400 uppercase tracking-widest whitespace-nowrap text-right">Aksi</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-50">
                {filteredData.length > 0 ? filteredData.map((item) => {
                  const itemId = getValue(item, 'id');
                  const status = getValue(item, 'status');
                  const amount = getValue(item, 'amount');
                  const customerName = getValue(item, 'customerName');
                  const dueDate = getValue(item, 'dueDate') || getValue(item, 'timestamp')?.split('T')[0];

                  return (
                  <tr key={itemId} className="hover:bg-gray-50/50 transition-colors">
                    <td className="py-4 text-sm font-bold text-gray-900 whitespace-nowrap pr-4">{itemId}</td>
                    <td className="py-4 text-sm text-gray-600 whitespace-nowrap pr-4 font-medium">{customerName}</td>
                    <td className="py-4 text-sm text-teal-700 font-black whitespace-nowrap pr-4">{formatCurrency(amount)}</td>
                    <td className="py-4 text-sm text-gray-600 whitespace-nowrap pr-4">{dueDate}</td>
                    <td className="py-4 whitespace-nowrap pr-4">
                      <span className={cn(
                        "px-3 py-1 rounded-full text-[10px] font-bold uppercase tracking-wider",
                        status === 'Paid' || status === 'Dibayar' ? "bg-green-100 text-green-700" : 
                        status === 'Pending' || status === 'Tertunda' ? "bg-teal-100 text-teal-700" : "bg-red-100 text-red-700"
                      )}>
                        {status}
                      </span>
                    </td>
                    <td className="py-4 text-right whitespace-nowrap">
                      <div className="flex justify-end gap-2">
                        {(status === 'Pending' || status === 'Tertunda') && (
                          <button 
                            onClick={() => handleUpdateStatus(itemId, 'Dibayar')}
                            className="px-3 py-1 bg-green-600 text-white rounded-lg text-xs font-bold hover:bg-green-700 transition-all shadow-sm"
                          >
                            Sudah Bayar
                          </button>
                        )}
                        <button className="p-2 hover:bg-gray-100 rounded-lg text-gray-400 hover:text-gray-900 transition-colors" title="Unduh">
                          <Download size={16} />
                        </button>
                      </div>
                    </td>
                  </tr>
                )}) : (
                  <tr>
                    <td colSpan={6} className="py-20 text-center text-gray-500 text-sm">
                      {searchQuery ? `Tidak ada ${activeTab === 'invoices' ? 'faktur' : 'pembayaran'} yang cocok dengan "${searchQuery}".` : 'Tidak ada catatan ditemukan.'}
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>

          {/* Mobile Unified Card View */}
          <div className="md:hidden space-y-3">
            {filteredData.length > 0 ? filteredData.map((item) => {
              const itemId = getValue(item, 'id');
              const status = getValue(item, 'status');
              const amount = getValue(item, 'amount');
              const customerName = getValue(item, 'customerName');
              const dueDate = getValue(item, 'dueDate') || getValue(item, 'timestamp')?.split('T')[0];

              return (
                <div key={itemId} className="p-4 bg-gray-50 rounded-2xl border border-gray-100 space-y-3 shadow-sm">
                  <div className="flex items-start justify-between gap-2">
                    <div>
                      <span className="text-[10px] font-bold text-teal-700 bg-teal-50 px-2 py-0.5 rounded-md uppercase tracking-wider inline-block">
                        {itemId}
                      </span>
                      <h4 className="text-sm font-bold text-gray-900 mt-1">{customerName}</h4>
                    </div>
                    <span className={cn(
                      "px-2.5 py-1 rounded-full text-[10px] font-bold uppercase tracking-wider whitespace-nowrap flex-shrink-0",
                      status === 'Paid' || status === 'Dibayar' ? "bg-green-100 text-green-700" : 
                      status === 'Pending' || status === 'Tertunda' ? "bg-teal-100 text-teal-700" : "bg-red-100 text-red-700"
                    )}>
                      {status}
                    </span>
                  </div>

                  <div className="grid grid-cols-2 gap-2 py-2 border-y border-gray-200/60 text-xs">
                    <div>
                      <span className="text-[10px] text-gray-400 uppercase font-bold block">{activeTab === 'invoices' ? 'Jatuh Tempo' : 'Tanggal'}</span>
                      <span className="font-medium text-gray-700">{dueDate}</span>
                    </div>
                    <div>
                      <span className="text-[10px] text-gray-400 uppercase font-bold block">Jumlah</span>
                      <span className="font-black text-teal-700">{formatCurrency(amount)}</span>
                    </div>
                  </div>

                  <div className="flex items-center justify-end gap-2 pt-1">
                    {(status === 'Pending' || status === 'Tertunda') && (
                      <button 
                        onClick={() => handleUpdateStatus(itemId, 'Dibayar')}
                        className="px-3 py-1.5 bg-green-600 text-white rounded-xl text-xs font-bold hover:bg-green-700 transition-all shadow-sm"
                      >
                        Sudah Bayar
                      </button>
                    )}
                    <button className="p-2 bg-gray-100 text-gray-600 rounded-xl hover:text-gray-900 transition-colors" title="Unduh">
                      <Download size={14} />
                    </button>
                  </div>
                </div>
              );
            }) : (
              <div className="py-12 text-center text-gray-500 text-sm">
                {searchQuery ? `Tidak ada ${activeTab === 'invoices' ? 'faktur' : 'pembayaran'} yang cocok dengan "${searchQuery}".` : 'Tidak ada catatan ditemukan.'}
              </div>
            )}
          </div>
        </Card>
      )}

      <Modal 
        isOpen={isModalOpen} 
        onClose={() => setIsModalOpen(false)} 
        title={activeTab === 'invoices' ? 'Buat Faktur Baru' : 'Catat Pembayaran Baru'}
      >
        <form onSubmit={handleSubmit} className="space-y-6">
          <div className="space-y-2">
            <label className="text-xs font-bold text-gray-400 uppercase tracking-wider">Pilih Pelanggan</label>
            <select 
              required
              value={formData.customerId}
              onChange={(e) => {
                const customer = customers.find(c => c.id === e.target.value);
                setFormData({
                  ...formData, 
                  customerId: e.target.value,
                  customerName: customer?.name || ''
                });
              }}
              className="w-full p-3 bg-gray-50 border-none rounded-xl text-sm focus:ring-2 focus:ring-teal-500/20"
            >
              <option value="">Pilih pelanggan...</option>
              {customers.map(customer => (
                <option key={customer.id} value={customer.id}>{customer.name}</option>
              ))}
            </select>
          </div>

          <div className="grid grid-cols-2 gap-6">
            <div className="space-y-2">
              <label className="text-xs font-bold text-gray-400 uppercase tracking-wider">Jumlah</label>
              <input 
                required
                type="number" 
                value={formData.amount}
                onChange={(e) => setFormData({...formData, amount: Number(e.target.value)})}
                className="w-full p-3 bg-gray-50 border-none rounded-xl text-sm focus:ring-2 focus:ring-teal-500/20" 
              />
            </div>
            <div className="space-y-2">
              <label className="text-xs font-bold text-gray-400 uppercase tracking-wider">{activeTab === 'invoices' ? 'Jatuh Tempo' : 'Tanggal Pembayaran'}</label>
              <input 
                required
                type="date" 
                value={formData.dueDate}
                onChange={(e) => setFormData({...formData, dueDate: e.target.value})}
                className="w-full p-3 bg-gray-50 border-none rounded-xl text-sm focus:ring-2 focus:ring-teal-500/20" 
              />
            </div>
          </div>

          <div className="space-y-2">
            <label className="text-xs font-bold text-gray-400 uppercase tracking-wider">Status</label>
            <select 
              required
              value={formData.status}
              onChange={(e) => setFormData({...formData, status: e.target.value})}
              className="w-full p-3 bg-gray-50 border-none rounded-xl text-sm focus:ring-2 focus:ring-teal-500/20"
            >
              <option>Tertunda</option>
              <option>Dibayar</option>
              {activeTab === 'invoices' && <option>Jatuh Tempo</option>}
            </select>
          </div>

          <div className="space-y-2">
            <label className="text-xs font-bold text-gray-400 uppercase tracking-wider">Catatan</label>
            <textarea 
              value={formData.notes}
              onChange={(e) => setFormData({...formData, notes: e.target.value})}
              rows={3}
              className="w-full p-3 bg-gray-50 border-none rounded-xl text-sm focus:ring-2 focus:ring-teal-500/20" 
            />
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
              {activeTab === 'invoices' ? 'Buat Faktur' : 'Catat Pembayaran'}
            </button>
          </div>
        </form>
      </Modal>
    </div>
  );
};
