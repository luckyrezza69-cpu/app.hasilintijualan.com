import React, { useState, useEffect } from 'react';
import { 
  Building2, 
  Phone, 
  MapPin, 
  ShoppingBag, 
  Factory, 
  Palette, 
  FileText, 
  Truck, 
  ShieldCheck, 
  RefreshCw, 
  X, 
  Loader2, 
  Calendar, 
  Shirt, 
  UserCheck, 
  CreditCard 
} from 'lucide-react';
import { cn, formatCurrency } from '../lib/utils';
import { CustomTableViewer } from './ui/CustomTableViewer';

interface CustomerOverviewModalProps {
  isOpen: boolean;
  onClose: () => void;
  customerId: string | null;
  customerName?: string;
}

export const CustomerOverviewModal: React.FC<CustomerOverviewModalProps> = ({
  isOpen,
  onClose,
  customerId,
  customerName
}) => {
  const [activeTab, setActiveTab] = useState<'orders_spk' | 'designs_samples' | 'invoices' | 'qc_shipments' | 'info'>('orders_spk');
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [data, setData] = useState<{
    customer?: any;
    orders?: any[];
    spks?: any[];
    designs?: any[];
    samples?: any[];
    invoices?: any[];
    payments?: any[];
    qcReports?: any[];
    shipments?: any[];
    quotations?: any[];
  }>({});
  const [previewImage, setPreviewImage] = useState<string | null>(null);

  const fetchOverview = async (isManualRefresh = false) => {
    if (!customerId) return;
    try {
      if (isManualRefresh) setRefreshing(true);
      else setLoading(true);

      const response = await fetch(`/api/admin/customer-overview/${encodeURIComponent(customerId)}`);
      if (!response.ok) {
        throw new Error('Gagal mengambil data keseluruhan pelanggan');
      }
      const json = await response.json();
      setData(json);
    } catch (error) {
      console.error('Error loading customer 360 view:', error);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  useEffect(() => {
    if (isOpen && customerId) {
      fetchOverview();
      setActiveTab('orders_spk');
    }
  }, [isOpen, customerId]);

  if (!isOpen) return null;

  const customer = data.customer || {};
  const orders = data.orders || [];
  const spks = data.spks || [];
  const designs = data.designs || [];
  const samples = data.samples || [];
  const invoices = data.invoices || [];
  const qcReports = data.qcReports || [];
  const shipments = data.shipments || [];

  // Summary Metrics
  const totalOrderValue = orders.reduce((sum, o) => sum + (Number(o.totalPrice) || 0), 0);
  const avgProgress = spks.length > 0
    ? Math.round(spks.reduce((sum, s) => sum + (Number(s.progress) || 0), 0) / spks.length)
    : 0;
  const totalInvoiceValue = invoices.reduce((sum, i) => sum + (Number(i.total || i.amount) || 0), 0);

  const tabs = [
    { 
      id: 'orders_spk', 
      label: 'Pesanan & SPK', 
      count: orders.length + spks.length, 
      icon: ShoppingBag 
    },
    { 
      id: 'designs_samples', 
      label: 'Desain & Sampel', 
      count: designs.length + samples.length, 
      icon: Palette 
    },
    { 
      id: 'invoices', 
      label: 'Faktur & Tagihan', 
      count: invoices.length, 
      icon: CreditCard 
    },
    { 
      id: 'qc_shipments', 
      label: 'QC & Pengiriman', 
      count: qcReports.length + shipments.length, 
      icon: ShieldCheck 
    },
    { 
      id: 'info', 
      label: 'Profil Klien', 
      icon: UserCheck 
    }
  ];

  return (
    <div className="fixed inset-0 z-50 overflow-y-auto bg-slate-900/40 backdrop-blur-xs flex items-center justify-center p-2 sm:p-4 md:p-6 animate-in fade-in duration-150">
      <div className="bg-white w-full max-w-5xl h-[94vh] sm:h-auto sm:max-h-[90vh] rounded-2xl sm:rounded-3xl shadow-2xl border border-gray-100 flex flex-col overflow-hidden text-gray-900">
        
        {/* TOP HEADER: Sticky clean header */}
        <div className="px-4 py-3.5 sm:px-6 sm:py-4 bg-white border-b border-gray-100 flex items-center justify-between gap-3 flex-shrink-0 z-20">
          <div className="flex items-center gap-3 min-w-0">
            <div className="w-10 h-10 sm:w-12 sm:h-12 rounded-2xl bg-teal-50 border border-teal-100 text-teal-700 flex items-center justify-center font-bold text-lg sm:text-xl flex-shrink-0 shadow-xs">
              {customer.name?.charAt(0) || customerName?.charAt(0) || 'C'}
            </div>
            <div className="min-w-0">
              <div className="flex items-center gap-2 flex-wrap">
                <h2 className="text-base sm:text-lg font-bold tracking-tight text-gray-900 truncate">
                  {customer.name || customerName || 'Detail Pelanggan'}
                </h2>
                <span className="px-2 py-0.5 bg-gray-50 text-gray-600 border border-gray-200 rounded-md text-[10px] sm:text-xs font-mono font-semibold">
                  {customer.id || customerId}
                </span>
                <span className={cn(
                  "px-2 py-0.5 rounded-full text-[10px] sm:text-[11px] font-bold uppercase tracking-wider border",
                  ['inactive', 'nonaktif', 'tidak aktif'].includes(String(customer.status).toLowerCase()) 
                    ? "bg-red-50 text-red-600 border-red-200" 
                    : "bg-teal-50 text-teal-700 border-teal-200"
                )}>
                  {customer.status || 'Aktif'}
                </span>
              </div>
              <div className="flex items-center gap-2 sm:gap-3.5 mt-0.5 text-[11px] sm:text-xs text-gray-500 font-medium truncate">
                {customer.company && (
                  <span className="flex items-center gap-1 text-gray-700 truncate">
                    <Building2 size={12} className="text-teal-600 flex-shrink-0" />
                    <span className="truncate">{customer.company}</span>
                  </span>
                )}
                {customer.contact && (
                  <span className="hidden sm:flex items-center gap-1">
                    <Phone size={12} className="text-teal-600 flex-shrink-0" />
                    <span>{customer.contact}</span>
                  </span>
                )}
                {customer.address && (
                  <span className="hidden md:flex items-center gap-1 text-gray-400 truncate">
                    <MapPin size={12} className="text-teal-600 flex-shrink-0" />
                    <span className="truncate max-w-[200px]">{customer.address}</span>
                  </span>
                )}
              </div>
            </div>
          </div>

          <div className="flex items-center gap-1 flex-shrink-0">
            <button
              onClick={() => fetchOverview(true)}
              disabled={refreshing}
              className="p-2 text-gray-400 hover:text-teal-600 hover:bg-teal-50/60 rounded-xl transition-all cursor-pointer"
              title="Perbarui Data"
            >
              <RefreshCw size={16} className={refreshing ? 'animate-spin text-teal-600' : ''} />
            </button>
            <button
              onClick={onClose}
              className="p-2 text-gray-400 hover:text-gray-700 hover:bg-gray-100 rounded-xl transition-all cursor-pointer"
              title="Tutup Modal"
            >
              <X size={18} />
            </button>
          </div>
        </div>

        {/* SCROLLABLE MAIN CONTAINER: Has min-h-0 and flex-1 so mobile can scroll all the way down smoothly! */}
        <div className="flex-1 min-h-0 overflow-y-auto overscroll-contain p-4 sm:p-6 bg-white space-y-4 sm:space-y-5 touch-pan-y">
          
          {/* METRICS ROW: Clean White Minimalist Cards */}
          <div className="bg-gray-50/70 p-2.5 sm:p-3.5 rounded-2xl border border-gray-100 grid grid-cols-2 lg:grid-cols-4 gap-2.5">
            <div className="bg-white p-2.5 sm:p-3 rounded-xl border border-gray-100 shadow-xs flex items-center gap-2.5">
              <div className="w-8 h-8 rounded-lg bg-teal-50 text-teal-600 flex items-center justify-center flex-shrink-0">
                <ShoppingBag size={15} />
              </div>
              <div className="min-w-0">
                <p className="text-[9px] sm:text-[10px] font-bold uppercase text-gray-400 tracking-wider">Total Pesanan</p>
                <p className="text-xs sm:text-sm font-bold text-gray-900 leading-tight mt-0.5">
                  {orders.length} <span className="text-[10px] text-gray-400 font-normal">PO</span> • <span className="text-teal-600 font-black">{formatCurrency(totalOrderValue)}</span>
                </p>
              </div>
            </div>

            <div className="bg-white p-2.5 sm:p-3 rounded-xl border border-gray-100 shadow-xs flex items-center gap-2.5">
              <div className="w-8 h-8 rounded-lg bg-teal-50 text-teal-600 flex items-center justify-center flex-shrink-0">
                <Factory size={15} />
              </div>
              <div className="min-w-0">
                <p className="text-[9px] sm:text-[10px] font-bold uppercase text-gray-400 tracking-wider">SPK Produksi</p>
                <p className="text-xs sm:text-sm font-bold text-gray-900 leading-tight mt-0.5">
                  {spks.length} <span className="text-[10px] text-gray-400 font-normal">SPK</span> • <span className="text-teal-600 font-bold">{avgProgress}% Selesai</span>
                </p>
              </div>
            </div>

            <div className="bg-white p-2.5 sm:p-3 rounded-xl border border-gray-100 shadow-xs flex items-center gap-2.5">
              <div className="w-8 h-8 rounded-lg bg-teal-50 text-teal-600 flex items-center justify-center flex-shrink-0">
                <Palette size={15} />
              </div>
              <div className="min-w-0">
                <p className="text-[9px] sm:text-[10px] font-bold uppercase text-gray-400 tracking-wider">Desain & Sampel</p>
                <p className="text-xs sm:text-sm font-bold text-gray-900 leading-tight mt-0.5">
                  {designs.length} <span className="text-[10px] text-gray-400 font-normal">Desain</span> • <span className="text-gray-600 font-bold">{samples.length} Sampel</span>
                </p>
              </div>
            </div>

            <div className="bg-white p-2.5 sm:p-3 rounded-xl border border-gray-100 shadow-xs flex items-center gap-2.5">
              <div className="w-8 h-8 rounded-lg bg-teal-50 text-teal-600 flex items-center justify-center flex-shrink-0">
                <CreditCard size={15} />
              </div>
              <div className="min-w-0">
                <p className="text-[9px] sm:text-[10px] font-bold uppercase text-gray-400 tracking-wider">Faktur & QC</p>
                <p className="text-xs sm:text-sm font-bold text-gray-900 leading-tight mt-0.5">
                  {invoices.length} <span className="text-[10px] text-gray-400 font-normal">Faktur</span> • <span className="text-gray-600 font-bold">{qcReports.length} QC</span>
                </p>
              </div>
            </div>
          </div>

          {/* STICKY SEGMENTED TABS: Fits neatly across width, sticky while scrolling down */}
          <div className="sticky top-0 z-10 bg-white/95 backdrop-blur-xs pt-1 pb-2">
            <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-1.5 sm:gap-2 bg-gray-100/80 p-1 rounded-2xl shadow-xs">
              {tabs.map((tab) => {
                const Icon = tab.icon;
                const isActive = activeTab === tab.id;
                return (
                  <button
                    key={tab.id}
                    onClick={() => setActiveTab(tab.id as any)}
                    className={cn(
                      "py-2 px-2.5 rounded-xl text-xs font-bold flex items-center justify-center gap-1.5 transition-all cursor-pointer text-center",
                      isActive 
                        ? "bg-white text-teal-700 shadow-xs border border-gray-200/70" 
                        : "text-gray-500 hover:text-gray-900 hover:bg-white/40"
                    )}
                  >
                    <Icon size={14} className={isActive ? "text-teal-600" : "text-gray-400"} />
                    <span className="truncate">{tab.label}</span>
                    {tab.count !== undefined && tab.count > 0 && (
                      <span className={cn(
                        "px-1.5 py-0.2 text-[10px] font-extrabold rounded-md",
                        isActive ? "bg-teal-50 text-teal-700 border border-teal-200" : "bg-gray-200 text-gray-600"
                      )}>
                        {tab.count}
                      </span>
                    )}
                  </button>
                );
              })}
            </div>
          </div>

          {/* TAB CONTENT SECTIONS */}
          {loading ? (
            <div className="flex flex-col items-center justify-center py-20">
              <Loader2 className="animate-spin text-teal-600 mb-3" size={32} />
              <p className="text-gray-500 font-medium text-xs">Memuat data pelanggan...</p>
            </div>
          ) : (
            <div className="space-y-6">
              {/* TAB 1: PESANAN & SPK */}
              {activeTab === 'orders_spk' && (
                <div className="space-y-6">
                  {/* PO Section */}
                  <div>
                    <div className="flex items-center justify-between mb-3">
                      <h3 className="text-sm font-bold text-gray-900 flex items-center gap-2">
                        <ShoppingBag size={16} className="text-teal-600" />
                        Pesanan / PO Berjalan ({orders.length})
                      </h3>
                      <span className="text-xs font-semibold text-gray-500">
                        Total: <strong className="text-teal-700 font-bold">{formatCurrency(totalOrderValue)}</strong>
                      </span>
                    </div>

                    {orders.length > 0 ? (
                      <div className="space-y-3">
                        {orders.map((order) => (
                          <div key={order.id} className="bg-gray-50/70 rounded-2xl p-4 border border-gray-100 hover:border-gray-200 transition-all">
                            <div className="flex flex-col sm:flex-row justify-between sm:items-center gap-2 pb-3 border-b border-gray-100">
                              <div className="flex items-center gap-2.5">
                                <span className="font-mono font-bold text-sm text-gray-900">{order.id}</span>
                                <span className={cn(
                                  "px-2.5 py-0.5 rounded-full text-[10px] font-bold uppercase",
                                  order.status === 'In Production' ? "bg-amber-50 text-amber-700 border border-amber-200" :
                                  order.status === 'Delivered' || order.status === 'Completed' ? "bg-emerald-50 text-emerald-700 border border-emerald-200" :
                                  "bg-teal-50 text-teal-700 border border-teal-200"
                                )}>
                                  {order.status || 'In Production'}
                                </span>
                              </div>
                              <div className="text-left sm:text-right">
                                <p className="text-xs font-bold text-teal-700">{formatCurrency(Number(order.totalPrice || 0))}</p>
                              </div>
                            </div>

                            <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 mt-3 text-xs">
                              <div>
                                <p className="text-gray-400 font-medium text-[10px] uppercase">Produk</p>
                                <p className="font-bold text-gray-900 mt-0.5">{order.productType || '-'}</p>
                              </div>
                              <div>
                                <p className="text-gray-400 font-medium text-[10px] uppercase">Jumlah (Qty)</p>
                                <p className="font-bold text-gray-900 mt-0.5">{order.quantity || 0} Pcs/Set</p>
                              </div>
                              <div>
                                <p className="text-gray-400 font-medium text-[10px] uppercase">Bahan</p>
                                <p className="font-medium text-gray-700 mt-0.5">{order.material || '-'}</p>
                              </div>
                              <div>
                                <p className="text-gray-400 font-medium text-[10px] uppercase">Tenggat (Deadline)</p>
                                <p className="font-semibold text-rose-600 mt-0.5 flex items-center gap-1">
                                  <Calendar size={12} />
                                  {order.deadline || 'Sesuai Jadwal'}
                                </p>
                              </div>
                            </div>

                            {order.notes && (
                              <div className="mt-3 p-2.5 bg-amber-50/60 border border-amber-100 rounded-xl text-xs text-amber-800">
                                <strong>Catatan:</strong> {order.notes}
                              </div>
                            )}
                          </div>
                        ))}
                      </div>
                    ) : (
                      <div className="py-10 text-center bg-gray-50 rounded-2xl border border-dashed border-gray-200 text-xs text-gray-400">
                        Tidak ada pesanan aktif untuk pelanggan ini.
                      </div>
                    )}
                  </div>

                  {/* SPK Section */}
                  <div className="pt-4 border-t border-gray-100">
                    <div className="flex items-center justify-between mb-3">
                      <h3 className="text-sm font-bold text-gray-900 flex items-center gap-2">
                        <Factory size={16} className="text-teal-600" />
                        SPK & Monitoring Produksi ({spks.length})
                      </h3>
                    </div>

                    {spks.length > 0 ? (
                      <div className="space-y-4">
                        {spks.map((spk) => {
                          const progress = Number(spk.progress) || 0;

                          return (
                            <div key={spk.id} className="bg-gray-50/70 rounded-2xl p-4 border border-gray-100">
                              <div className="flex flex-col sm:flex-row justify-between sm:items-center gap-2 pb-3 border-b border-gray-100">
                                <div>
                                  <div className="flex items-center gap-2">
                                    <span className="font-mono font-bold text-sm text-gray-900">{spk.id}</span>
                                    {spk.po && (
                                      <span className="px-2 py-0.5 bg-gray-100 text-gray-600 rounded text-[10px] font-semibold">
                                        PO: {spk.po}
                                      </span>
                                    )}
                                    <span className={cn(
                                      "px-2.5 py-0.5 rounded-full text-[10px] font-bold uppercase",
                                      spk.status === 'Completed' ? "bg-emerald-50 text-emerald-700 border border-emerald-200" : "bg-teal-50 text-teal-700 border border-teal-200"
                                    )}>
                                      {spk.status || 'In Progress'}
                                    </span>
                                  </div>
                                  <p className="text-xs font-semibold text-gray-800 mt-0.5">{spk.productName || 'Produk'}</p>
                                </div>

                                <div className="w-full sm:w-44">
                                  <div className="flex justify-between items-center text-xs font-bold mb-1">
                                    <span className="text-gray-400">Progres</span>
                                    <span className="text-teal-700">{progress}%</span>
                                  </div>
                                  <div className="w-full bg-gray-200/80 h-2 rounded-full overflow-hidden">
                                    <div 
                                      className="bg-teal-600 h-full rounded-full transition-all duration-300"
                                      style={{ width: `${Math.min(100, Math.max(0, progress))}%` }}
                                    />
                                  </div>
                                </div>
                              </div>

                              {/* Stages Checkpoints */}
                              <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 mt-3 text-xs">
                                <div className="p-2.5 rounded-xl bg-white border border-gray-100 flex items-center justify-between">
                                  <span className="text-gray-500 font-medium">Cutting</span>
                                  <span className="font-bold text-gray-900">{spk.cutting || 0} Pcs</span>
                                </div>
                                <div className="p-2.5 rounded-xl bg-white border border-gray-100 flex items-center justify-between">
                                  <span className="text-gray-500 font-medium">Sewing</span>
                                  <span className="font-bold text-gray-900">{spk.sewing || 0} Pcs</span>
                                </div>
                                <div className="p-2.5 rounded-xl bg-white border border-gray-100 flex items-center justify-between">
                                  <span className="text-gray-500 font-medium">Finishing</span>
                                  <span className="font-bold text-gray-900">{spk.finishing || 0} Pcs</span>
                                </div>
                                <div className="p-2.5 rounded-xl bg-white border border-gray-100 flex items-center justify-between">
                                  <span className="text-teal-700 font-semibold">QC Passed</span>
                                  <span className="font-bold text-teal-700">{spk.qc || 0} Pcs</span>
                                </div>
                              </div>

                              {/* Size Chart table */}
                              {spk.sizeChart && (
                                <div className="mt-3 p-3 bg-white rounded-xl border border-gray-100">
                                  <CustomTableViewer 
                                    data={spk.sizeChart} 
                                    compact 
                                    title="Size Chart / Rincian Ukuran" 
                                  />
                                </div>
                              )}
                            </div>
                          );
                        })}
                      </div>
                    ) : (
                      <div className="py-10 text-center bg-gray-50 rounded-2xl border border-dashed border-gray-200 text-xs text-gray-400">
                        Tidak ada SPK produksi aktif.
                      </div>
                    )}
                  </div>
                </div>
              )}

              {/* TAB 2: DESAIN & SAMPEL */}
              {activeTab === 'designs_samples' && (
                <div className="space-y-6">
                  <div>
                    <h3 className="text-sm font-bold text-gray-900 mb-3 flex items-center gap-2">
                      <Palette size={16} className="text-teal-600" />
                      Desain & Artwork ({designs.length})
                    </h3>

                    {designs.length > 0 ? (
                      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
                        {designs.map((design) => (
                          <div key={design.id} className="bg-gray-50/70 rounded-2xl p-3 border border-gray-100 flex flex-col justify-between">
                            <div>
                              <div 
                                onClick={() => design.imageUrl && setPreviewImage(design.imageUrl)}
                                className="w-full aspect-[4/3] bg-white rounded-xl overflow-hidden mb-2.5 border border-gray-100 flex items-center justify-center cursor-pointer hover:opacity-90 transition-opacity"
                              >
                                {design.imageUrl ? (
                                  <img src={design.imageUrl} alt={design.title} className="w-full h-full object-cover" />
                                ) : (
                                  <Palette size={24} className="text-gray-300" />
                                )}
                              </div>
                              <div className="flex items-center justify-between mb-1">
                                <span className="font-mono text-[10px] font-bold text-gray-600">{design.id}</span>
                                <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-teal-50 text-teal-700 border border-teal-200">
                                  {design.status || 'Approved'}
                                </span>
                              </div>
                              <h4 className="text-xs font-bold text-gray-900 truncate">{design.title || 'Desain Konveksi'}</h4>
                              <p className="text-[11px] text-gray-500 mt-0.5 line-clamp-1">{design.description || '-'}</p>
                            </div>
                          </div>
                        ))}
                      </div>
                    ) : (
                      <div className="py-10 text-center bg-gray-50 rounded-2xl border border-dashed border-gray-200 text-xs text-gray-400">
                        Belum ada file desain khusus yang terhubung dengan pelanggan ini.
                      </div>
                    )}
                  </div>

                  {/* Samples */}
                  <div className="pt-4 border-t border-gray-100">
                    <h3 className="text-sm font-bold text-gray-900 mb-3 flex items-center gap-2">
                      <Shirt size={16} className="text-teal-600" />
                      Sampel & Prototype ({samples.length})
                    </h3>

                    {samples.length > 0 ? (
                      <div className="space-y-3">
                        {samples.map((sample) => (
                          <div key={sample.id} className="bg-gray-50/70 rounded-2xl p-4 border border-gray-100 flex flex-col sm:flex-row justify-between sm:items-center gap-3">
                            <div>
                              <div className="flex items-center gap-2">
                                <span className="font-mono font-bold text-xs text-gray-900">{sample.id}</span>
                                <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-teal-50 text-teal-700 border border-teal-200">
                                  {sample.status || 'In Progress'}
                                </span>
                              </div>
                              <p className="text-xs font-semibold text-gray-800 mt-0.5">{sample.productName || 'Sample Produk'}</p>
                              {sample.vendor && (
                                <p className="text-[11px] text-gray-500 mt-0.5">Vendor: {sample.vendor}</p>
                              )}
                            </div>
                            {sample.qcNote && (
                              <p className="text-xs text-gray-600 bg-white p-2.5 rounded-xl border border-gray-100 max-w-sm">
                                <strong>Catatan:</strong> {sample.qcNote}
                              </p>
                            )}
                          </div>
                        ))}
                      </div>
                    ) : (
                      <div className="py-10 text-center bg-gray-50 rounded-2xl border border-dashed border-gray-200 text-xs text-gray-400">
                        Tidak ada catatan sampel untuk pelanggan ini.
                      </div>
                    )}
                  </div>
                </div>
              )}

              {/* TAB 3: FAKTUR & TAGIHAN */}
              {activeTab === 'invoices' && (
                <div className="space-y-4">
                  <div className="flex items-center justify-between mb-2">
                    <h3 className="text-sm font-bold text-gray-900 flex items-center gap-2">
                      <CreditCard size={16} className="text-teal-600" />
                      Faktur & Riwayat Tagihan ({invoices.length})
                    </h3>
                    <span className="text-xs font-semibold text-gray-500">
                      Total: <strong className="text-teal-700 font-bold">{formatCurrency(totalInvoiceValue)}</strong>
                    </span>
                  </div>

                  {invoices.length > 0 ? (
                    <div className="space-y-3">
                      {invoices.map((inv) => (
                        <div key={inv.id} className="bg-gray-50/70 rounded-2xl p-4 border border-gray-100 flex flex-col sm:flex-row justify-between sm:items-center gap-3">
                          <div>
                            <div className="flex items-center gap-2">
                              <span className="font-mono font-bold text-xs text-gray-900">{inv.id}</span>
                              <span className={cn(
                                "text-[10px] font-bold px-2 py-0.5 rounded-full border",
                                String(inv.status).toLowerCase().includes('lunas') ? "bg-emerald-50 text-emerald-700 border-emerald-200" : "bg-amber-50 text-amber-700 border-amber-200"
                              )}>
                                {inv.status || 'Pending'}
                              </span>
                            </div>
                            <p className="text-xs text-gray-500 mt-0.5">Jatuh Tempo: {inv.dueDate || 'Sesuai Kontrak'}</p>
                          </div>
                          <div className="text-left sm:text-right">
                            <p className="text-sm font-black text-teal-700">{formatCurrency(Number(inv.total || inv.amount || 0))}</p>
                            {inv.notes && <p className="text-[11px] text-gray-400 mt-0.5">{inv.notes}</p>}
                          </div>
                        </div>
                      ))}
                    </div>
                  ) : (
                    <div className="py-10 text-center bg-gray-50 rounded-2xl border border-dashed border-gray-200 text-xs text-gray-400">
                      Belum ada faktur tagihan yang diterbitkan untuk pelanggan ini.
                    </div>
                  )}
                </div>
              )}

              {/* TAB 4: QC & PENGIRIMAN */}
              {activeTab === 'qc_shipments' && (
                <div className="space-y-6">
                  <div>
                    <h3 className="text-sm font-bold text-gray-900 mb-3 flex items-center gap-2">
                      <ShieldCheck size={16} className="text-teal-600" />
                      Laporan Quality Control (QC) ({qcReports.length})
                    </h3>

                    {qcReports.length > 0 ? (
                      <div className="space-y-3">
                        {qcReports.map((qc) => (
                          <div key={qc.id} className="bg-gray-50/70 rounded-2xl p-4 border border-gray-100">
                            <div className="flex justify-between items-center pb-2 border-b border-gray-100">
                              <div className="flex items-center gap-2">
                                <span className="font-mono font-bold text-xs text-gray-900">{qc.id}</span>
                                <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-teal-50 text-teal-700 border border-teal-200">
                                  {qc.status || 'Passed'}
                                </span>
                              </div>
                              <span className="text-xs font-semibold text-gray-600">Inspeksi: {qc.qty || 0} Pcs</span>
                            </div>
                            {qc.notes && (
                              <p className="text-xs text-gray-600 mt-2 bg-white p-2.5 rounded-xl border border-gray-100">
                                <strong>Catatan Inspector:</strong> {qc.notes}
                              </p>
                            )}
                          </div>
                        ))}
                      </div>
                    ) : (
                      <div className="py-10 text-center bg-gray-50 rounded-2xl border border-dashed border-gray-200 text-xs text-gray-400">
                        Belum ada laporan QC terbit untuk pesanan pelanggan ini.
                      </div>
                    )}
                  </div>

                  {/* Shipments */}
                  <div className="pt-4 border-t border-gray-100">
                    <h3 className="text-sm font-bold text-gray-900 mb-3 flex items-center gap-2">
                      <Truck size={16} className="text-teal-600" />
                      Riwayat Pengiriman ({shipments.length})
                    </h3>

                    {shipments.length > 0 ? (
                      <div className="space-y-3">
                        {shipments.map((shp) => (
                          <div key={shp.id} className="bg-gray-50/70 rounded-2xl p-4 border border-gray-100 flex flex-col sm:flex-row justify-between sm:items-center gap-3">
                            <div>
                              <div className="flex items-center gap-2">
                                <span className="font-mono font-bold text-xs text-gray-900">{shp.id}</span>
                                <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-teal-50 text-teal-700 border border-teal-200">
                                  {shp.status || 'Shipped'}
                                </span>
                              </div>
                              <p className="text-xs font-semibold text-gray-800 mt-0.5">Kurir: {shp.courier || '-'} • Resi: <strong className="font-mono text-teal-700">{shp.trackingNumber || '-'}</strong></p>
                            </div>
                            <div className="text-left sm:text-right text-xs text-gray-500">
                              <p>Estimasi Tiba: <strong className="text-gray-800">{shp.estimatedArrival || 'Dalam Perjalanan'}</strong></p>
                            </div>
                          </div>
                        ))}
                      </div>
                    ) : (
                      <div className="py-10 text-center bg-gray-50 rounded-2xl border border-dashed border-gray-200 text-xs text-gray-400">
                        Belum ada riwayat nomor resi pengiriman untuk pelanggan ini.
                      </div>
                    )}
                  </div>
                </div>
              )}

              {/* TAB 5: PROFIL */}
              {activeTab === 'info' && (
                <div className="bg-gray-50/70 rounded-2xl p-4 sm:p-5 border border-gray-100 space-y-4">
                  <h3 className="text-sm font-bold text-gray-900 flex items-center gap-2">
                    <UserCheck size={16} className="text-teal-600" />
                    Profil & Data Kontak Pelanggan
                  </h3>

                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-xs">
                    <div className="p-3 bg-white rounded-xl border border-gray-100 space-y-1">
                      <p className="text-[10px] font-bold text-gray-400 uppercase">ID Pelanggan (Kode Portal)</p>
                      <p className="font-mono font-bold text-teal-700">{customer.id || customerId}</p>
                    </div>
                    <div className="p-3 bg-white rounded-xl border border-gray-100 space-y-1">
                      <p className="text-[10px] font-bold text-gray-400 uppercase">Status Akses</p>
                      <p className="font-bold text-gray-900">{customer.status || 'Aktif'}</p>
                    </div>
                    <div className="p-3 bg-white rounded-xl border border-gray-100 space-y-1">
                      <p className="text-[10px] font-bold text-gray-400 uppercase">Nama Lengkap / PIC</p>
                      <p className="font-bold text-gray-900">{customer.name || '-'}</p>
                    </div>
                    <div className="p-3 bg-white rounded-xl border border-gray-100 space-y-1">
                      <p className="text-[10px] font-bold text-gray-400 uppercase">Perusahaan / Brand</p>
                      <p className="font-bold text-gray-900">{customer.company || '-'}</p>
                    </div>
                    <div className="p-3 bg-white rounded-xl border border-gray-100 space-y-1">
                      <p className="text-[10px] font-bold text-gray-400 uppercase">Kontak / WhatsApp</p>
                      <p className="font-semibold text-gray-800">{customer.contact || '-'}</p>
                    </div>
                    <div className="p-3 bg-white rounded-xl border border-gray-100 space-y-1">
                      <p className="text-[10px] font-bold text-gray-400 uppercase">Tanggal Bergabung</p>
                      <p className="font-semibold text-gray-800">{customer.timestamp ? new Date(customer.timestamp).toLocaleDateString('id-ID', { dateStyle: 'long' }) : '-'}</p>
                    </div>
                    <div className="p-3 bg-white rounded-xl border border-gray-100 space-y-1 sm:col-span-2">
                      <p className="text-[10px] font-bold text-gray-400 uppercase">Alamat Workshop / Pengiriman</p>
                      <p className="font-medium text-gray-700">{customer.address || 'Alamat belum diisi'}</p>
                    </div>
                  </div>
                </div>
              )}
            </div>
          )}
        </div>

        {/* BOTTOM FOOTER: Sticky clean footer */}
        <div className="px-4 py-3 sm:px-6 sm:py-3.5 bg-white border-t border-gray-100 flex items-center justify-between flex-shrink-0 z-20">
          <span className="text-[11px] sm:text-xs text-gray-400">
            HIJ Apps • 360° Customer Hub
          </span>
          <button
            onClick={onClose}
            className="px-5 sm:px-6 py-2 bg-gray-900 hover:bg-gray-800 text-white rounded-xl text-xs font-bold transition-all cursor-pointer"
          >
            Tutup
          </button>
        </div>

      </div>

      {/* Image Preview Modal */}
      {previewImage && (
        <div 
          className="fixed inset-0 z-60 bg-black/80 flex items-center justify-center p-4 cursor-pointer"
          onClick={() => setPreviewImage(null)}
        >
          <div className="relative max-w-4xl max-h-[90vh]">
            <img src={previewImage} alt="Preview" className="max-w-full max-h-[85vh] object-contain rounded-2xl shadow-2xl" />
            <button 
              onClick={() => setPreviewImage(null)}
              className="absolute -top-3 -right-3 p-2 bg-white text-gray-900 rounded-full shadow-lg"
            >
              <X size={16} />
            </button>
          </div>
        </div>
      )}
    </div>
  );
};
