import React, { useState, useEffect } from 'react';
import { 
  CustomerSession 
} from '../types';
import { 
  Palette, 
  Factory, 
  FileText, 
  Clock, 
  CheckCircle2, 
  AlertCircle, 
  LogOut, 
  RefreshCw, 
  Search, 
  Package, 
  Calendar, 
  Layers, 
  Sparkles, 
  ChevronRight, 
  ExternalLink,
  Eye,
  Scissors,
  Shirt,
  Truck,
  Check,
  Building2,
  Phone,
  MapPin,
  Maximize2,
  Download,
  Loader2
} from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import { cn, formatCurrency } from '../lib/utils';
import { Modal } from './ui/Modal';
import { CustomTableViewer } from './ui/CustomTableViewer';
import jsPDF from 'jspdf';
import html2canvas from 'html2canvas';
import { SPK_PAGE1_BG, SPK_PAGE2_BG } from '../assets/spkTemplates';
import { normalizeTableData } from './ui/CustomTableBuilder';

interface CustomerPortalProps {
  customer: CustomerSession;
  onLogout: () => void;
}

export const CustomerPortal: React.FC<CustomerPortalProps> = ({ customer, onLogout }) => {
  const [activeTab, setActiveTab] = useState<'monitoring' | 'spk' | 'designs'>('monitoring');
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [orders, setOrders] = useState<any[]>([]);
  const [spks, setSpks] = useState<any[]>([]);
  const [designs, setDesigns] = useState<any[]>([]);
  const [selectedSPK, setSelectedSPK] = useState<any | null>(null);
  const [previewImage, setPreviewImage] = useState<string | null>(null);
  const [isGeneratingPdf, setIsGeneratingPdf] = useState<string | null>(null);
  
  // Specific SPK filter state
  const [selectedSpkFilter, setSelectedSpkFilter] = useState<string>(customer.selectedSpkId || 'ALL');
  const [spkSearchQuery, setSpkSearchQuery] = useState<string>('');

  const formatDate = (dateStr: string) => {
    if (!dateStr) return '-';
    try {
      if (/^\d{2}\/\d{2}\/\d{4}$/.test(dateStr)) return dateStr;
      const date = new Date(dateStr);
      if (isNaN(date.getTime())) return dateStr;
      return `${date.getDate().toString().padStart(2, '0')}/${(date.getMonth() + 1).toString().padStart(2, '0')}/${date.getFullYear()}`;
    } catch (e) {
      return dateStr;
    }
  };

  const sanitizeColorsForHtml2Canvas = (clonedDoc: Document) => {
    const styleTags = clonedDoc.querySelectorAll('style');
    styleTags.forEach((styleTag) => {
      if (styleTag.textContent && (styleTag.textContent.includes('oklch') || styleTag.textContent.includes('oklab'))) {
        styleTag.textContent = styleTag.textContent
          .replace(/oklch\([^)]+\)/gi, '#0d9488')
          .replace(/oklab\([^)]+\)/gi, '#0d9488');
      }
    });

    const canvas = clonedDoc.createElement('canvas');
    canvas.width = 1;
    canvas.height = 1;
    const ctx = canvas.getContext('2d');

    const colorProperties = [
      'color',
      'background-color',
      'border-color',
      'border-top-color',
      'border-bottom-color',
      'border-left-color',
      'border-right-color',
      'outline-color',
      'text-decoration-color',
      'fill',
      'stroke'
    ];

    const elements = clonedDoc.querySelectorAll('*');
    elements.forEach((el) => {
      const htmlEl = el as HTMLElement;
      try {
        const style = window.getComputedStyle(htmlEl);
        for (const prop of colorProperties) {
          const val = style.getPropertyValue(prop);
          if (val && (val.includes('oklch') || val.includes('oklab') || val.includes('color(') || val.includes('color-mix'))) {
            if (ctx) {
              ctx.fillStyle = '#000000';
              ctx.fillStyle = val;
              htmlEl.style.setProperty(prop, ctx.fillStyle, 'important');
            } else {
              htmlEl.style.setProperty(prop, prop.includes('background') ? '#ffffff' : '#000000', 'important');
            }
          }
        }
      } catch (e) { }
    });
  };

  const generatePDF = async (spk: any) => {
    const elPage1 = document.getElementById(`customer-spk-template-${spk.id}-page1`);
    const elPage2 = document.getElementById(`customer-spk-template-${spk.id}-page2`);
    if (!elPage1 || !elPage2) {
      alert('Template SPK halaman 1 atau 2 tidak ditemukan di dokumen.');
      return;
    }

    try {
      setIsGeneratingPdf(spk.id);

      // Render Page 1 (Scale 2 for high-resolution print)
      const canvas1 = await html2canvas(elPage1, {
        scale: 2,
        useCORS: true,
        allowTaint: true,
        logging: false,
        backgroundColor: '#ffffff',
        onclone: (clonedDoc) => {
          sanitizeColorsForHtml2Canvas(clonedDoc);
        }
      });
      const imgData1 = canvas1.toDataURL('image/png');

      // Render Page 2
      const canvas2 = await html2canvas(elPage2, {
        scale: 2,
        useCORS: true,
        allowTaint: true,
        logging: false,
        backgroundColor: '#ffffff',
        onclone: (clonedDoc) => {
          sanitizeColorsForHtml2Canvas(clonedDoc);
        }
      });
      const imgData2 = canvas2.toDataURL('image/png');

      // Create Portrait A4 PDF (210mm x 297mm)
      const pdf = new jsPDF('p', 'mm', 'a4');
      const pdfWidth = pdf.internal.pageSize.getWidth();
      const pdfHeight = pdf.internal.pageSize.getHeight();

      // Page 1
      pdf.addImage(imgData1, 'PNG', 0, 0, pdfWidth, pdfHeight);

      // Page 2
      pdf.addPage('a4', 'p');
      pdf.addImage(imgData2, 'PNG', 0, 0, pdfWidth, pdfHeight);

      const safeFilename = `SPK-${String(spk.id || 'PRODUKSI').replace(/[^a-zA-Z0-9-_]/g, '_')}.pdf`;
      pdf.save(safeFilename);
    } catch (error: any) {
      console.error('Error generating 2-page PDF:', error);
      alert(`Gagal mengunduh file PDF SPK: ${error?.message || 'Terjadi kesalahan saat rendering dokumen'}`);
    } finally {
      setIsGeneratingPdf(null);
    }
  };

  // Fetch strictly isolated customer portal data from backend
  const fetchPortalData = async (isManualRefresh = false) => {
    try {
      if (isManualRefresh) setRefreshing(true);
      else setLoading(true);

      const response = await fetch(`/api/customer-portal/${encodeURIComponent(customer.id)}`);
      if (!response.ok) {
        throw new Error('Gagal memuat data pelanggan');
      }

      const data = await response.json();
      setOrders(data.orders || []);
      setSpks(data.spks || []);
      setDesigns(data.designs || []);
    } catch (error) {
      console.error('Error loading customer portal data:', error);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  useEffect(() => {
    fetchPortalData();
    if (customer.selectedSpkId) {
      setSelectedSpkFilter(customer.selectedSpkId);
    }
  }, [customer.id, customer.selectedSpkId]);

  // Filtered SPKs based on selected SPK filter pill & search
  const displayedSpks = spks.filter(s => {
    const matchesFilter = selectedSpkFilter === 'ALL' || s.id === selectedSpkFilter || s.orderId === selectedSpkFilter;
    const q = spkSearchQuery.toLowerCase().trim();
    const matchesSearch = !q || (s.id || '').toLowerCase().includes(q) || (s.productName || '').toLowerCase().includes(q) || (s.po || '').toLowerCase().includes(q);
    return matchesFilter && matchesSearch;
  });

  // Calculate overall stats for customer
  const totalOrders = orders.length;
  const activeSPKs = spks.filter(s => s.status !== 'Completed');
  const avgProgress = spks.length > 0 
    ? Math.round(spks.reduce((acc, s) => acc + (Number(s.progress) || 0), 0) / spks.length)
    : 0;

  return (
    <div className="min-h-screen bg-[#F8F9FB] text-gray-900 font-sans flex flex-col">
      {/* Top Header Bar */}
      <header className="bg-white border-b border-gray-100 sticky top-0 z-40 shadow-xs">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 h-20 flex items-center justify-between gap-4">
          {/* Logo & Portal Branding */}
          <div className="flex items-center gap-3.5">
            <div className="w-11 h-11 bg-white border border-gray-100 rounded-2xl flex items-center justify-center p-2 shadow-xs flex-shrink-0">
              <img src="/logo.png" alt="HIJ Logo" className="w-full h-full object-contain" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h1 className="text-lg sm:text-xl font-black tracking-tight text-gray-900 leading-none">
                  HIJ APPS
                </h1>
                <span className="px-2 py-0.5 bg-teal-50 text-teal-700 border border-teal-200/80 rounded-full text-[10px] font-extrabold uppercase tracking-wider">
                  Portal Pelanggan
                </span>
              </div>
              <p className="text-xs text-gray-500 font-medium mt-0.5 hidden sm:block">
                Sistem Pelacakan Produksi & Desain Konveksi
              </p>
            </div>
          </div>

          {/* Customer Info & Actions */}
          <div className="flex items-center gap-2 sm:gap-3">
            <button
              onClick={() => fetchPortalData(true)}
              disabled={refreshing}
              title="Perbarui Data"
              className="p-2.5 text-gray-500 hover:text-teal-600 hover:bg-teal-50 rounded-2xl transition-all border border-gray-200/80"
            >
              <RefreshCw size={18} className={refreshing ? 'animate-spin text-teal-600' : ''} />
            </button>

            {/* Customer Pill */}
            <div className="hidden md:flex items-center gap-2.5 px-3.5 py-2 bg-gray-50 border border-gray-200/80 rounded-2xl">
              <div className="w-8 h-8 rounded-xl bg-teal-600 text-white flex items-center justify-center font-bold text-xs">
                {customer.name?.charAt(0) || 'C'}
              </div>
              <div className="text-left">
                <p className="text-xs font-bold text-gray-900 truncate max-w-[180px]">{customer.name}</p>
                <p className="text-[10px] text-teal-600 font-bold uppercase tracking-wider font-mono">ID: {customer.id}</p>
              </div>
            </div>

            {/* Logout Button */}
            <button
              onClick={onLogout}
              className="flex items-center gap-2 px-3.5 py-2.5 bg-red-50 hover:bg-red-100 text-red-600 rounded-2xl text-xs font-bold transition-all border border-red-100"
            >
              <LogOut size={16} />
              <span className="hidden sm:inline">Keluar Portal</span>
            </button>
          </div>
        </div>
      </header>

      {/* Main Container */}
      <main className="flex-1 max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6 sm:py-8 w-full space-y-6">
        {/* Welcome Customer Hero Card */}
        <div className="bg-gradient-to-r from-teal-700 via-teal-800 to-emerald-900 rounded-3xl p-6 sm:p-8 text-white relative overflow-hidden shadow-xl shadow-teal-900/10">
          <div className="absolute top-0 right-0 -mr-12 -mt-12 w-64 h-64 bg-white/10 rounded-full blur-2xl pointer-events-none" />
          <div className="absolute bottom-0 left-0 -ml-12 -mb-12 w-48 h-48 bg-teal-400/10 rounded-full blur-xl pointer-events-none" />

          <div className="relative z-10 flex flex-col md:flex-row md:items-center justify-between gap-6">
            <div className="space-y-2">
              <div className="flex items-center gap-2">
                <span className="px-3 py-1 bg-white/15 backdrop-blur-md rounded-full text-xs font-bold tracking-wide uppercase text-teal-100">
                  ID: {customer.id}
                </span>
                <span className="px-3 py-1 bg-emerald-500/20 backdrop-blur-md rounded-full text-xs font-bold text-emerald-200">
                  Status: {customer.status || 'Aktif'}
                </span>
              </div>
              <h2 className="text-2xl sm:text-3xl font-black tracking-tight">{customer.name}</h2>
              {customer.company && (
                <p className="text-sm text-teal-100 font-medium flex items-center gap-1.5">
                  <Building2 size={16} className="text-teal-300" />
                  <span>{customer.company}</span>
                </p>
              )}
              {customer.address && (
                <p className="text-xs text-teal-200/80 flex items-center gap-1.5 pt-1">
                  <MapPin size={14} className="text-teal-300" />
                  <span>{customer.address}</span>
                </p>
              )}
            </div>

            {/* Quick Metrics */}
            <div className="grid grid-cols-3 gap-3 bg-white/10 backdrop-blur-md p-4 rounded-2xl border border-white/10">
              <div className="text-center px-2">
                <p className="text-[11px] text-teal-200 font-medium">Total Pesanan</p>
                <p className="text-xl sm:text-2xl font-black mt-0.5">{totalOrders}</p>
              </div>
              <div className="text-center px-2 border-x border-white/10">
                <p className="text-[11px] text-teal-200 font-medium">SPK Aktif</p>
                <p className="text-xl sm:text-2xl font-black mt-0.5 text-emerald-300">{activeSPKs.length}</p>
              </div>
              <div className="text-center px-2">
                <p className="text-[11px] text-teal-200 font-medium">Rata-rata Progres</p>
                <p className="text-xl sm:text-2xl font-black mt-0.5 text-teal-200">{avgProgress}%</p>
              </div>
            </div>
          </div>
        </div>

        {/* Tab Navigation */}
        <div className="bg-white p-2 rounded-2xl shadow-xs border border-gray-100">
          <div className="grid grid-cols-3 gap-2">
            <button
              onClick={() => setActiveTab('monitoring')}
              className={cn(
                "flex items-center justify-center gap-2 py-3 px-3 rounded-xl text-xs sm:text-sm font-bold transition-all",
                activeTab === 'monitoring'
                  ? "bg-teal-600 text-white shadow-md shadow-teal-600/20"
                  : "text-gray-600 hover:text-gray-900 hover:bg-gray-50"
              )}
            >
              <Factory size={18} />
              <span>Pemantauan Produksi</span>
            </button>

            <button
              onClick={() => setActiveTab('spk')}
              className={cn(
                "flex items-center justify-center gap-2 py-3 px-3 rounded-xl text-xs sm:text-sm font-bold transition-all",
                activeTab === 'spk'
                  ? "bg-teal-600 text-white shadow-md shadow-teal-600/20"
                  : "text-gray-600 hover:text-gray-900 hover:bg-gray-50"
              )}
            >
              <FileText size={18} />
              <span>SPK & Pesanan Aktif</span>
            </button>

            <button
              onClick={() => setActiveTab('designs')}
              className={cn(
                "flex items-center justify-center gap-2 py-3 px-3 rounded-xl text-xs sm:text-sm font-bold transition-all",
                activeTab === 'designs'
                  ? "bg-teal-600 text-white shadow-md shadow-teal-600/20"
                  : "text-gray-600 hover:text-gray-900 hover:bg-gray-50"
              )}
            >
              <Palette size={18} />
              <span>Desain & Mockup</span>
            </button>
          </div>
        </div>

        {/* SPK Selector & Quick Filter Pills */}
        {spks.length > 0 && (
          <div className="bg-white p-4 rounded-2xl border border-gray-100 shadow-xs space-y-3">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
              <div className="flex items-center gap-2">
                <Layers size={16} className="text-teal-600" />
                <span className="text-xs font-bold text-gray-900 uppercase tracking-wider">
                  Pilih SPK yang Ingin Dipantau:
                </span>
              </div>
              {selectedSpkFilter !== 'ALL' && (
                <button
                  onClick={() => setSelectedSpkFilter('ALL')}
                  className="text-xs font-bold text-teal-600 hover:text-teal-700 hover:underline self-start sm:self-auto"
                >
                  ← Tampilkan Semua SPK ({spks.length})
                </button>
              )}
            </div>

            <div className="flex items-center gap-2 overflow-x-auto pb-1.5 no-scrollbar">
              <button
                onClick={() => setSelectedSpkFilter('ALL')}
                className={cn(
                  "px-3.5 py-2 rounded-xl text-xs font-bold transition-all flex-shrink-0 flex items-center gap-1.5",
                  selectedSpkFilter === 'ALL'
                    ? "bg-teal-700 text-white shadow-xs"
                    : "bg-gray-50 text-gray-700 hover:bg-gray-100 border border-gray-200/70"
                )}
              >
                <span>Semua SPK</span>
                <span className="px-1.5 py-0.2 bg-white/20 rounded-full text-[10px]">{spks.length}</span>
              </button>

              {spks.map(spk => (
                <button
                  key={spk.id}
                  onClick={() => setSelectedSpkFilter(spk.id)}
                  className={cn(
                    "px-3.5 py-2 rounded-xl text-xs font-bold transition-all flex-shrink-0 flex items-center gap-2",
                    selectedSpkFilter === spk.id
                      ? "bg-teal-600 text-white shadow-xs"
                      : "bg-gray-50 text-gray-700 hover:bg-gray-100 border border-gray-200/70"
                  )}
                >
                  <span className="font-mono">{spk.id}</span>
                  <span className="opacity-40">•</span>
                  <span className="truncate max-w-[150px]">{spk.productName}</span>
                  <span className={cn(
                    "px-1.5 py-0.2 rounded-full text-[10px] font-extrabold",
                    selectedSpkFilter === spk.id ? "bg-white/20 text-white" : "bg-teal-50 text-teal-700"
                  )}>
                    {spk.progress || 0}%
                  </span>
                </button>
              ))}
            </div>
          </div>
        )}

        {/* Loading Spinner */}
        {loading ? (
          <div className="bg-white rounded-3xl p-12 text-center border border-gray-100 shadow-xs">
            <RefreshCw size={32} className="animate-spin text-teal-600 mx-auto mb-3" />
            <p className="text-sm font-bold text-gray-700">Memuat Data Pesanan Pelanggan...</p>
            <p className="text-xs text-gray-400 mt-1">Mengambil data SPK, Desain, dan Progres Produksi...</p>
          </div>
        ) : (
          /* TAB CONTENT */
          <div>
            {/* TAB 1: PEMANTAUAN PRODUKSI */}
            {activeTab === 'monitoring' && (
              <div className="space-y-6">
                {displayedSpks.length === 0 ? (
                  <div className="bg-white rounded-3xl p-12 text-center border border-gray-100 shadow-xs">
                    <Factory size={48} className="text-gray-300 mx-auto mb-3" />
                    <h3 className="text-base font-bold text-gray-800">Belum Ada SPK Produksi yang Cocok</h3>
                    <p className="text-xs text-gray-500 mt-1 max-w-md mx-auto">
                      Tidak ada SPK aktif yang sesuai dengan filter pencarian.
                    </p>
                    {selectedSpkFilter !== 'ALL' && (
                      <button
                        onClick={() => setSelectedSpkFilter('ALL')}
                        className="mt-3 px-4 py-2 bg-teal-600 text-white rounded-xl text-xs font-bold"
                      >
                        Tampilkan Semua SPK
                      </button>
                    )}
                  </div>
                ) : (
                  displayedSpks.map((spk) => {
                    const progress = Number(spk.progress) || 0;
                    const cuttingQty = Number(spk.cutting) || 0;
                    const sewingQty = Number(spk.sewing) || 0;
                    const finishingQty = Number(spk.finishing) || 0;
                    const qcQty = Number(spk.qc) || 0;
                    const targetQty = Number(spk.targetQty) || 0;

                    return (
                      <div 
                        key={spk.id}
                        className="bg-white rounded-3xl p-5 sm:p-7 border border-gray-100 shadow-[0_8px_30px_rgb(0,0,0,0.04)] space-y-6 transition-all hover:border-teal-100"
                      >
                        {/* Card Header */}
                        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-4 border-b border-gray-100">
                          <div>
                            <div className="flex items-center gap-2.5">
                              <span className="px-3 py-1 bg-teal-50 text-teal-700 border border-teal-200 rounded-xl text-xs font-black font-mono">
                                {spk.id}
                              </span>
                              {spk.po && (
                                <span className="px-2.5 py-1 bg-gray-100 text-gray-700 rounded-xl text-xs font-semibold">
                                  PO: {spk.po}
                                </span>
                              )}
                              <span className={cn(
                                "px-2.5 py-1 rounded-xl text-xs font-bold",
                                spk.status === 'Completed' ? "bg-emerald-50 text-emerald-700 border border-emerald-200" :
                                spk.status === 'In Progress' ? "bg-blue-50 text-blue-700 border border-blue-200" :
                                "bg-amber-50 text-amber-700 border border-amber-200"
                              )}>
                                {spk.status === 'In Progress' ? 'Sedang Diproduksi' : spk.status === 'Completed' ? 'Selesai' : 'Tahap Perencanaan'}
                              </span>
                            </div>
                            <h3 className="text-lg sm:text-xl font-black text-gray-900 mt-2">
                              {spk.productName || 'Produk Konveksi'}
                            </h3>
                            <p className="text-xs text-gray-500 font-medium">
                              Bahan: <strong className="text-gray-800">{spk.material || '-'}</strong> • Jumlah: <strong className="text-teal-700">{targetQty} pcs</strong>
                            </p>
                          </div>

                          <div className="sm:text-right bg-teal-50/50 p-3 sm:p-0 sm:bg-transparent rounded-2xl">
                            <p className="text-[10px] text-gray-500 font-bold uppercase tracking-wider">Estimasi Selesai</p>
                            <p className="text-sm font-black text-teal-800 mt-0.5 flex items-center sm:justify-end gap-1.5">
                              <Calendar size={15} className="text-teal-600" />
                              <span>{spk.tanggalSelesai || 'Sesuai Jadwal'}</span>
                            </p>
                          </div>
                        </div>

                        {/* Overall Progress Bar */}
                        <div className="space-y-2">
                          <div className="flex items-center justify-between text-xs">
                            <span className="font-bold text-gray-700 flex items-center gap-1.5">
                              <Sparkles size={14} className="text-teal-600" />
                              <span>Total Progres Pengerjaan</span>
                            </span>
                            <span className="font-black text-teal-700 text-sm">{progress}% Selesai</span>
                          </div>
                          <div className="w-full h-3.5 bg-gray-100 rounded-full overflow-hidden p-0.5 border border-gray-200/60">
                            <motion.div 
                              initial={{ width: 0 }}
                              animate={{ width: `${progress}%` }}
                              transition={{ duration: 0.8, ease: "easeOut" }}
                              className="h-full bg-gradient-to-r from-teal-500 to-emerald-500 rounded-full shadow-xs"
                            />
                          </div>
                        </div>

                        {/* 5-Stage Live Production Pipeline */}
                        <div className="space-y-3">
                          <h4 className="text-xs font-bold text-gray-400 uppercase tracking-wider">Tahapan Produksi</h4>
                          
                          <div className="grid grid-cols-2 sm:grid-cols-5 gap-2.5">
                            {/* Stage 1: Desain & Pola */}
                            <div className="p-3.5 bg-teal-50/70 border border-teal-200/70 rounded-2xl space-y-1">
                              <div className="flex items-center justify-between">
                                <span className="text-[10px] font-bold text-teal-600 uppercase">Tahap 1</span>
                                <CheckCircle2 size={16} className="text-teal-600" />
                              </div>
                              <p className="text-xs font-bold text-gray-900">Pola & Desain</p>
                              <p className="text-[11px] text-teal-700 font-semibold">Siap & Terverifikasi</p>
                            </div>

                            {/* Stage 2: Cutting */}
                            <div className={cn(
                              "p-3.5 rounded-2xl space-y-1 border transition-all",
                              cuttingQty >= targetQty && targetQty > 0
                                ? "bg-emerald-50/70 border-emerald-200 text-emerald-900"
                                : cuttingQty > 0
                                ? "bg-teal-50/70 border-teal-200 text-teal-900"
                                : "bg-gray-50 border-gray-200/70 text-gray-500"
                            )}>
                              <div className="flex items-center justify-between">
                                <span className="text-[10px] font-bold uppercase opacity-80">Tahap 2</span>
                                <Scissors size={16} />
                              </div>
                              <p className="text-xs font-bold text-gray-900">Pemotongan (Cutting)</p>
                              <p className="text-[11px] font-semibold">
                                {cuttingQty} / {targetQty} pcs
                              </p>
                            </div>

                            {/* Stage 3: Sewing */}
                            <div className={cn(
                              "p-3.5 rounded-2xl space-y-1 border transition-all",
                              sewingQty >= targetQty && targetQty > 0
                                ? "bg-emerald-50/70 border-emerald-200 text-emerald-900"
                                : sewingQty > 0
                                ? "bg-teal-50/70 border-teal-200 text-teal-900"
                                : "bg-gray-50 border-gray-200/70 text-gray-500"
                            )}>
                              <div className="flex items-center justify-between">
                                <span className="text-[10px] font-bold uppercase opacity-80">Tahap 3</span>
                                <Shirt size={16} />
                              </div>
                              <p className="text-xs font-bold text-gray-900">Jahit & Bordir/Sablon</p>
                              <p className="text-[11px] font-semibold">
                                {sewingQty} / {targetQty} pcs
                              </p>
                            </div>

                            {/* Stage 4: Finishing & QC */}
                            <div className={cn(
                              "p-3.5 rounded-2xl space-y-1 border transition-all",
                              finishingQty >= targetQty && targetQty > 0
                                ? "bg-emerald-50/70 border-emerald-200 text-emerald-900"
                                : finishingQty > 0
                                ? "bg-teal-50/70 border-teal-200 text-teal-900"
                                : "bg-gray-50 border-gray-200/70 text-gray-500"
                            )}>
                              <div className="flex items-center justify-between">
                                <span className="text-[10px] font-bold uppercase opacity-80">Tahap 4</span>
                                <Check size={16} />
                              </div>
                              <p className="text-xs font-bold text-gray-900">Finishing & QC</p>
                              <p className="text-[11px] font-semibold">
                                {finishingQty} / {targetQty} pcs
                              </p>
                            </div>

                            {/* Stage 5: Ready & Shipping */}
                            <div className={cn(
                              "p-3.5 rounded-2xl space-y-1 border transition-all col-span-2 sm:col-span-1",
                              progress >= 100
                                ? "bg-emerald-500 text-white border-emerald-600 shadow-sm"
                                : "bg-gray-50 border-gray-200/70 text-gray-500"
                            )}>
                              <div className="flex items-center justify-between">
                                <span className="text-[10px] font-bold uppercase opacity-80">Tahap 5</span>
                                <Truck size={16} />
                              </div>
                              <p className="text-xs font-bold">Siap Kirim / Ekspedisi</p>
                              <p className="text-[11px] font-semibold">
                                {progress >= 100 ? 'Siap Dikirim' : 'Menunggu QC Selesai'}
                              </p>
                            </div>
                          </div>
                        </div>

                        {/* Size Chart Breakdown & Mockup */}
                        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 pt-2">
                          {/* Size Chart */}
                          <div className="md:col-span-2 bg-gray-50/80 p-4 rounded-2xl border border-gray-100">
                            <p className="text-xs font-bold text-gray-700 mb-2">Rincian Ukuran (Size Chart Pesanan)</p>
                            <CustomTableViewer 
                              data={spk.sizeChart} 
                              compact 
                              emptyMessage="Ukuran standar sesuai pesanan"
                            />
                          </div>

                          {/* Action Details */}
                          <div className="bg-teal-50/60 p-4 rounded-2xl border border-teal-100 flex flex-col justify-center gap-2">
                            <p className="text-xs font-bold text-teal-900">Rincian Lengkap SPK</p>
                            <button
                              onClick={() => setSelectedSPK(spk)}
                              className="w-full py-2 bg-teal-600 hover:bg-teal-700 text-white rounded-xl text-xs font-bold transition-all shadow-xs flex items-center justify-center gap-1.5 cursor-pointer"
                            >
                              <FileText size={14} />
                              <span>Lihat Detail SPK</span>
                            </button>
                            <button
                              onClick={() => generatePDF(spk)}
                              disabled={isGeneratingPdf === spk.id}
                              className={cn(
                                "w-full py-2 bg-white hover:bg-teal-50 text-teal-700 border border-teal-200 rounded-xl text-xs font-bold transition-all shadow-xs flex items-center justify-center gap-1.5 cursor-pointer",
                                isGeneratingPdf === spk.id && "opacity-75 cursor-wait"
                              )}
                            >
                              {isGeneratingPdf === spk.id ? (
                                <>
                                  <Loader2 size={14} className="animate-spin text-teal-600" />
                                  <span>Memproses...</span>
                                </>
                              ) : (
                                <>
                                  <Download size={14} />
                                  <span>Download SPK</span>
                                </>
                              )}
                            </button>
                          </div>
                        </div>
                      </div>
                    );
                  })
                )}
              </div>
            )}

            {/* TAB 2: SPK & PESANAN AKTIF */}
            {activeTab === 'spk' && (
              <div className="space-y-4">
                {displayedSpks.length === 0 && orders.length === 0 ? (
                  <div className="bg-white rounded-3xl p-12 text-center border border-gray-100 shadow-xs">
                    <FileText size={48} className="text-gray-300 mx-auto mb-3" />
                    <h3 className="text-base font-bold text-gray-800">Tidak Ada Riwayat SPK atau Pesanan</h3>
                    <p className="text-xs text-gray-500 mt-1 max-w-md mx-auto">
                      Belum ada surat perintah kerja yang diterbitkan untuk akun atau filter ini.
                    </p>
                  </div>
                ) : (
                  displayedSpks.map((spk) => (
                    <div 
                      key={spk.id}
                      className="bg-white rounded-2xl p-5 border border-gray-100 shadow-xs flex flex-col sm:flex-row sm:items-center justify-between gap-4 hover:border-teal-200 transition-all"
                    >
                      <div className="space-y-1">
                        <div className="flex items-center gap-2">
                          <span className="font-mono text-xs font-black text-teal-700 bg-teal-50 px-2.5 py-1 rounded-lg border border-teal-200">
                            {spk.id}
                          </span>
                          <span className="text-xs font-bold text-gray-500">
                            Masuk: {spk.tanggalMasuk || '-'}
                          </span>
                        </div>
                        <h4 className="text-base font-bold text-gray-900">{spk.productName}</h4>
                        <p className="text-xs text-gray-500">
                          Bahan: <span className="font-semibold text-gray-700">{spk.material || '-'}</span> • Jumlah: <span className="font-bold text-teal-700">{spk.targetQty} Pcs</span>
                        </p>
                      </div>

                      <div className="flex items-center gap-2 sm:gap-3">
                        <div className="text-right hidden sm:block">
                          <p className="text-[10px] text-gray-400 uppercase font-bold">Progres</p>
                          <p className="text-sm font-black text-teal-700">{spk.progress || 0}%</p>
                        </div>
                        <button
                          onClick={() => setSelectedSPK(spk)}
                          className="px-3.5 py-2.5 bg-gray-100 hover:bg-teal-50 hover:text-teal-700 text-gray-700 rounded-xl text-xs font-bold transition-all cursor-pointer"
                        >
                          Rincian
                        </button>
                        <button
                          onClick={() => generatePDF(spk)}
                          disabled={isGeneratingPdf === spk.id}
                          className={cn(
                            "px-3.5 py-2.5 bg-teal-600 hover:bg-teal-700 text-white rounded-xl text-xs font-bold transition-all shadow-xs flex items-center gap-1.5 cursor-pointer",
                            isGeneratingPdf === spk.id && "opacity-75 cursor-wait"
                          )}
                          title="Download PDF SPK (2 Halaman)"
                        >
                          {isGeneratingPdf === spk.id ? (
                            <Loader2 size={14} className="animate-spin" />
                          ) : (
                            <Download size={14} />
                          )}
                          <span className="hidden sm:inline">Download SPK</span>
                        </button>
                      </div>
                    </div>
                  ))
                )}
              </div>
            )}

            {/* TAB 3: DESAIN & MOCKUP */}
            {activeTab === 'designs' && (
              <div>
                {designs.length === 0 && displayedSpks.every(s => !s.mockupDepan && !s.mockupBelakang) ? (
                  <div className="bg-white rounded-3xl p-12 text-center border border-gray-100 shadow-xs">
                    <Palette size={48} className="text-gray-300 mx-auto mb-3" />
                    <h3 className="text-base font-bold text-gray-800">Belum Ada Desain Terlampir</h3>
                    <p className="text-xs text-gray-500 mt-1 max-w-md mx-auto">
                      Desain atau mockup pesanan Anda akan otomatis tampil di sini begitu tim desainer mengunggahnya.
                    </p>
                  </div>
                ) : (
                  <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-5">
                    {/* Render from designs table */}
                    {designs.filter(d => selectedSpkFilter === 'ALL' || d.orderId === selectedSpkFilter || d.id === selectedSpkFilter).map((design) => (
                      <div key={design.id} className="bg-white rounded-3xl border border-gray-100 shadow-xs overflow-hidden flex flex-col">
                        <div className="h-48 bg-gray-100 relative group flex items-center justify-center overflow-hidden">
                          {design.imageUrl ? (
                            <img 
                              src={design.imageUrl} 
                              alt={design.name} 
                              className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300" 
                            />
                          ) : (
                            <Palette size={40} className="text-gray-300" />
                          )}
                          {design.imageUrl && (
                            <button
                              onClick={() => setPreviewImage(design.imageUrl)}
                              className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center text-white gap-1.5 text-xs font-bold backdrop-blur-2xs"
                            >
                              <Maximize2 size={16} />
                              <span>Perbesar Gambar</span>
                            </button>
                          )}
                        </div>
                        <div className="p-5 flex-1 flex flex-col justify-between space-y-3">
                          <div>
                            <div className="flex items-center justify-between mb-1.5">
                              <span className="text-[10px] font-mono font-bold text-teal-700 bg-teal-50 px-2 py-0.5 rounded-md">
                                {design.id}
                              </span>
                              <span className="text-[10px] font-bold text-emerald-700 bg-emerald-50 px-2 py-0.5 rounded-md">
                                {design.status || 'Disetujui'}
                              </span>
                            </div>
                            <h4 className="text-sm font-bold text-gray-900">{design.name}</h4>
                            <p className="text-xs text-gray-500 mt-1 line-clamp-2">{design.description || 'Artwork pesanan konveksi'}</p>
                          </div>
                        </div>
                      </div>
                    ))}

                    {/* Render from SPK mockups if available */}
                    {displayedSpks.filter(s => s.mockupDepan || s.mockupBelakang).map((spk) => (
                      <React.Fragment key={`mockup-${spk.id}`}>
                        {spk.mockupDepan && (
                          <div className="bg-white rounded-3xl border border-gray-100 shadow-xs overflow-hidden flex flex-col">
                            <div className="h-48 bg-gray-100 relative group flex items-center justify-center overflow-hidden">
                              <img src={spk.mockupDepan} alt="Mockup Depan" className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300" />
                              <button
                                onClick={() => setPreviewImage(spk.mockupDepan)}
                                className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center text-white gap-1.5 text-xs font-bold"
                              >
                                <Maximize2 size={16} />
                                <span>Perbesar Gambar</span>
                              </button>
                            </div>
                            <div className="p-5">
                              <span className="text-[10px] font-bold text-teal-700 bg-teal-50 px-2 py-0.5 rounded-md">Mockup Depan</span>
                              <h4 className="text-sm font-bold text-gray-900 mt-1">{spk.productName}</h4>
                              <p className="text-xs text-gray-500 mt-0.5">SPK: {spk.id}</p>
                            </div>
                          </div>
                        )}
                        {spk.mockupBelakang && (
                          <div className="bg-white rounded-3xl border border-gray-100 shadow-xs overflow-hidden flex flex-col">
                            <div className="h-48 bg-gray-100 relative group flex items-center justify-center overflow-hidden">
                              <img src={spk.mockupBelakang} alt="Mockup Belakang" className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300" />
                              <button
                                onClick={() => setPreviewImage(spk.mockupBelakang)}
                                className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center text-white gap-1.5 text-xs font-bold"
                              >
                                <Maximize2 size={16} />
                                <span>Perbesar Gambar</span>
                              </button>
                            </div>
                            <div className="p-5">
                              <span className="text-[10px] font-bold text-teal-700 bg-teal-50 px-2 py-0.5 rounded-md">Mockup Belakang</span>
                              <h4 className="text-sm font-bold text-gray-900 mt-1">{spk.productName}</h4>
                              <p className="text-xs text-gray-500 mt-0.5">SPK: {spk.id}</p>
                            </div>
                          </div>
                        )}
                      </React.Fragment>
                    ))}
                  </div>
                )}
              </div>
            )}
          </div>
        )}
      </main>

      {/* SPK Detail Modal */}
      {selectedSPK && (
        <Modal
          isOpen={!!selectedSPK}
          onClose={() => setSelectedSPK(null)}
          title={`Detail SPK: ${selectedSPK.id}`}
        >
          <div className="space-y-5">
            <div className="p-4 bg-teal-50/70 border border-teal-100 rounded-2xl flex flex-col sm:flex-row sm:items-center justify-between gap-3">
              <div>
                <h4 className="text-base font-black text-teal-900">{selectedSPK.productName}</h4>
                <p className="text-xs text-teal-700 font-medium mt-0.5">
                  Bahan: {selectedSPK.material || '-'} • Target: {selectedSPK.targetQty} Pcs
                </p>
              </div>
              <button
                onClick={() => generatePDF(selectedSPK)}
                disabled={isGeneratingPdf === selectedSPK.id}
                className={cn(
                  "px-4 py-2 bg-teal-600 hover:bg-teal-700 text-white rounded-xl text-xs font-bold transition-all shadow-md shadow-teal-600/20 flex items-center justify-center gap-1.5 self-start sm:self-auto flex-shrink-0 cursor-pointer",
                  isGeneratingPdf === selectedSPK.id && "opacity-75 cursor-wait"
                )}
              >
                {isGeneratingPdf === selectedSPK.id ? (
                  <>
                    <Loader2 size={15} className="animate-spin" />
                    <span>Memproses...</span>
                  </>
                ) : (
                  <>
                    <Download size={15} />
                    <span>Download SPK</span>
                  </>
                )}
              </button>
            </div>

            <div className="grid grid-cols-2 gap-3 text-xs">
              <div className="p-3 bg-gray-50 rounded-xl">
                <span className="text-gray-400 block font-bold">Tanggal Masuk</span>
                <span className="font-bold text-gray-800">{formatDate(selectedSPK.tanggalMasuk)}</span>
              </div>
              <div className="p-3 bg-gray-50 rounded-xl">
                <span className="text-gray-400 block font-bold">Target Selesai</span>
                <span className="font-bold text-teal-700">{formatDate(selectedSPK.tanggalSelesai || selectedSPK.targetDate)}</span>
              </div>
              <div className="p-3 bg-gray-50 rounded-xl">
                <span className="text-gray-400 block font-bold">Sablon / Bordir</span>
                <span className="font-bold text-gray-800">{selectedSPK.sablonBordir || 'Sesuai Desain'}</span>
              </div>
              <div className="p-3 bg-gray-50 rounded-xl">
                <span className="text-gray-400 block font-bold">Status Produksi</span>
                <span className="font-bold text-emerald-700">{selectedSPK.status || 'In Progress'}</span>
              </div>
            </div>

            {/* Size breakdown */}
            <div>
              <p className="text-xs font-bold text-gray-700 mb-2">Rincian Ukuran:</p>
              <CustomTableViewer 
                data={selectedSPK.sizeChart} 
                emptyMessage="Tidak ada rincian ukuran khusus"
              />
            </div>

            {selectedSPK.notes && (
              <div className="p-3 bg-amber-50 border border-amber-200/70 rounded-xl text-xs text-amber-900">
                <strong>Catatan Khusus:</strong> {selectedSPK.notes}
              </div>
            )}

            {/* Full Width Download Button */}
            <div className="pt-2">
              <button
                onClick={() => generatePDF(selectedSPK)}
                disabled={isGeneratingPdf === selectedSPK.id}
                className={cn(
                  "w-full py-3 bg-gradient-to-r from-teal-600 to-emerald-600 hover:from-teal-500 hover:to-emerald-500 text-white rounded-2xl text-xs sm:text-sm font-black shadow-lg shadow-teal-600/20 flex items-center justify-center gap-2 transition-all cursor-pointer",
                  isGeneratingPdf === selectedSPK.id && "opacity-75 cursor-wait"
                )}
              >
                {isGeneratingPdf === selectedSPK.id ? (
                  <>
                    <Loader2 size={18} className="animate-spin" />
                    <span>Mengunduh Dokumen SPK (PDF)...</span>
                  </>
                ) : (
                  <>
                    <Download size={18} />
                    <span>Download Dokumen SPK Lengkap (PDF 2 Halaman)</span>
                  </>
                )}
              </button>
            </div>
          </div>
        </Modal>
      )}

      {/* Image Preview Modal */}
      {previewImage && (
        <div 
          onClick={() => setPreviewImage(null)}
          className="fixed inset-0 z-50 bg-black/85 backdrop-blur-md flex items-center justify-center p-4"
        >
          <div className="relative max-w-4xl max-h-[90vh]">
            <img src={previewImage} alt="Preview Desain" className="max-w-full max-h-[85vh] object-contain rounded-2xl" />
            <button 
              onClick={() => setPreviewImage(null)}
              className="absolute top-3 right-3 px-3 py-1.5 bg-white/80 hover:bg-white text-gray-900 rounded-full text-xs font-bold shadow-lg"
            >
              Tutup
            </button>
          </div>
        </div>
      )}

      {/* Hidden Templates for 2-Page Portrait A4 PDF Generation */}
      <div
        style={{
          position: 'fixed',
          top: 0,
          left: 0,
          zIndex: -9999,
          pointerEvents: 'none',
          visibility: 'visible'
        }}
        aria-hidden="true"
      >
        {spks.map((spk, index) => {
          const clientName = customer.company ? `${customer.name} (${customer.company})` : (customer.name || spk.customerName || '-');

          return (
            <React.Fragment key={`${spk.id || index}-${index}`}>
              {/* PAGE 1: SPK INFO, SIZE CHART & MOCKUPS */}
              <div
                id={`customer-spk-template-${spk.id}-page1`}
                style={{
                  width: '1240px',
                  height: '1754px',
                  fontFamily: 'sans-serif',
                  position: 'relative',
                  backgroundColor: '#ffffff',
                  color: '#0f172a',
                  overflow: 'hidden',
                  userSelect: 'none',
                  backgroundImage: `url("${SPK_PAGE1_BG}")`,
                  backgroundSize: '100% 100%',
                  backgroundRepeat: 'no-repeat',
                  boxSizing: 'border-box'
                }}
              >
                {/* Box 1: ID COSTUMER */}
                <div style={{ position: 'absolute', top: '200px', left: '62px', width: '275px', height: '95px', display: 'flex', flexDirection: 'column', justifyContent: 'center' }}>
                  <p style={{ fontSize: '20px', fontWeight: '600', color: '#334155', margin: '2px 0 0 0', lineHeight: 1.4, paddingBottom: '6px', whiteSpace: 'nowrap' }}>
                    {clientName}
                  </p>
                </div>

                {/* Box 2: PO */}
                <div style={{ position: 'absolute', top: '200px', left: '363px', width: '285px', height: '95px', display: 'flex', alignItems: 'center' }}>
                  <p style={{ fontSize: '20px', fontWeight: 'bold', color: '#0f172a', margin: 0, lineHeight: 1.4, paddingBottom: '6px', whiteSpace: 'nowrap' }}>
                    {spk.po || spk.orderId || '-'}
                  </p>
                </div>

                {/* Box 3: SABLON/ BORDIR */}
                <div style={{ position: 'absolute', top: '320px', left: '62px', width: '275px', height: '80px', display: 'flex', alignItems: 'center' }}>
                  <p style={{ fontSize: '20px', fontWeight: 'bold', color: '#0f172a', lineHeight: 1.35, margin: 0, paddingBottom: '6px' }}>
                    {spk.sablonBordir || '-'}
                  </p>
                </div>

                {/* Box 4: TANGGAL MASUK */}
                <div style={{ position: 'absolute', top: '320px', left: '363px', width: '285px', height: '80px', display: 'flex', alignItems: 'center' }}>
                  <p style={{ fontSize: '22px', fontWeight: 'bold', color: '#0f172a', margin: 0, lineHeight: 1.4, paddingBottom: '6px' }}>
                    {formatDate(spk.tanggalMasuk)}
                  </p>
                </div>

                {/* Box 5: MATERIAL */}
                <div style={{ position: 'absolute', top: '435px', left: '62px', width: '275px', height: '80px', display: 'flex', alignItems: 'center' }}>
                  <p style={{ fontSize: '18px', fontWeight: 'bold', color: '#0f172a', lineHeight: 1.35, margin: 0, paddingBottom: '6px' }}>
                    {spk.material || '-'}
                  </p>
                </div>

                {/* Box 6: TANGGAL SELESAI */}
                <div style={{ position: 'absolute', top: '435px', left: '363px', width: '285px', height: '80px', display: 'flex', alignItems: 'center' }}>
                  <p style={{ fontSize: '22px', fontWeight: 'bold', color: '#0f766e', margin: 0, lineHeight: 1.4, paddingBottom: '6px' }}>
                    {formatDate(spk.tanggalSelesai || spk.targetDate)}
                  </p>
                </div>

                {/* SIZE CHART Area (Rows inside pre-printed table) */}
                <div style={{ position: 'absolute', top: '260px', left: '650px', width: '540px', height: '270px', overflow: 'hidden', display: 'flex', flexDirection: 'column', justifyContent: 'flex-start' }}>
                  {(() => {
                    const norm = normalizeTableData(spk.sizeChart);
                    if (!norm || norm.rows.length === 0) {
                      return (
                        <div style={{ height: '100%', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '16px', color: '#94a3b8', fontStyle: 'italic' }}>
                          Size chart standar / sesuai PO
                        </div>
                      );
                    }
                    return (
                      <div style={{ width: '100%', display: 'flex', flexDirection: 'column' }}>
                        {norm.rows.slice(0, 5).map((row, ri) => (
                          <div
                            key={ri}
                            style={{
                              display: 'flex',
                              alignItems: 'center',
                              justifyContent: 'space-between',
                              padding: '10px 25px',
                              borderBottom: ri < Math.min(norm.rows.length, 5) - 1 ? '1px solid rgba(0, 128, 128, 0.15)' : 'none',
                              fontSize: '20px'
                            }}
                          >
                            <span style={{ fontWeight: 'bold', color: '#0f172a', width: '35%', textAlign: 'left', lineHeight: 1.35, paddingBottom: '4px', whiteSpace: 'nowrap' }}>
                              {row[0] || '-'}
                            </span>
                            <span style={{ fontWeight: '600', color: '#334155', width: '65%', textAlign: 'center', lineHeight: 1.35, paddingBottom: '4px', whiteSpace: 'nowrap' }}>
                              {row.slice(1).join(' - ') || '-'}
                            </span>
                          </div>
                        ))}
                      </div>
                    );
                  })()}
                </div>

                {/* MOCKUP / LAYOUT PRODUCT Area */}
                <div style={{ position: 'absolute', top: '595px', left: '45px', width: '1150px', height: '1030px', display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '16px', boxSizing: 'border-box' }}>
                  {spk.mockupDepan && spk.mockupBelakang ? (
                    <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '24px', width: '100%', height: '100%' }}>
                      <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', backgroundColor: '#f8fafc', borderRadius: '24px', border: '2px solid #e2e8f0', padding: '20px', height: '100%', boxSizing: 'border-box' }}>
                        <span style={{ fontSize: '16px', fontWeight: 'bold', color: '#0f766e', backgroundColor: '#f0fdfa', padding: '6px 20px', borderRadius: '9999px', border: '1px solid #ccfbf1', marginBottom: '16px' }}>Tampak Depan</span>
                        <div style={{ flex: 1, width: '100%', display: 'flex', alignItems: 'center', justifyContent: 'center', overflow: 'hidden' }}>
                          <img src={spk.mockupDepan} crossOrigin="anonymous" alt="Mockup Depan" style={{ maxHeight: '100%', maxWidth: '100%', objectFit: 'contain' }} />
                        </div>
                      </div>
                      <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', backgroundColor: '#f8fafc', borderRadius: '24px', border: '2px solid #e2e8f0', padding: '20px', height: '100%', boxSizing: 'border-box' }}>
                        <span style={{ fontSize: '16px', fontWeight: 'bold', color: '#0f766e', backgroundColor: '#f0fdfa', padding: '6px 20px', borderRadius: '9999px', border: '1px solid #ccfbf1', marginBottom: '16px' }}>Tampak Belakang</span>
                        <div style={{ flex: 1, width: '100%', display: 'flex', alignItems: 'center', justifyContent: 'center', overflow: 'hidden' }}>
                          <img src={spk.mockupBelakang} crossOrigin="anonymous" alt="Mockup Belakang" style={{ maxHeight: '100%', maxWidth: '100%', objectFit: 'contain' }} />
                        </div>
                      </div>
                    </div>
                  ) : spk.mockupDepan || spk.mockupBelakang ? (
                    <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', backgroundColor: '#f8fafc', borderRadius: '24px', border: '2px solid #e2e8f0', padding: '24px', width: '100%', height: '100%', boxSizing: 'border-box' }}>
                      <span style={{ fontSize: '16px', fontWeight: 'bold', color: '#0f766e', backgroundColor: '#f0fdfa', padding: '6px 24px', borderRadius: '9999px', border: '1px solid #ccfbf1', marginBottom: '16px' }}>
                        {spk.mockupDepan ? 'Layout & Mockup Utama' : 'Mockup Belakang'}
                      </span>
                      <div style={{ flex: 1, width: '100%', display: 'flex', alignItems: 'center', justifyContent: 'center', overflow: 'hidden' }}>
                        <img src={spk.mockupDepan || spk.mockupBelakang} crossOrigin="anonymous" alt="Mockup" style={{ maxHeight: '100%', maxWidth: '100%', objectFit: 'contain' }} />
                      </div>
                    </div>
                  ) : (
                    <div style={{ width: '100%', height: '100%', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', border: '2px dashed #cbd5e1', borderRadius: '24px', backgroundColor: '#f8fafc', color: '#94a3b8', padding: '40px', boxSizing: 'border-box' }}>
                      <div style={{ width: '90px', height: '90px', borderRadius: '24px', backgroundColor: '#f0fdfa', color: '#0d9488', display: 'flex', alignItems: 'center', justifyContent: 'center', marginBottom: '20px' }}>
                        <FileText size={48} />
                      </div>
                      <p style={{ fontSize: '24px', fontWeight: '600', color: '#475569', margin: 0 }}>Mockup Desain Belum Dilampirkan</p>
                      <p style={{ fontSize: '18px', color: '#94a3b8', textAlign: 'center', maxWidth: '550px', margin: '10px 0 0 0' }}>
                        {spk.productName ? `Produk: ${spk.productName}` : 'SPK ini belum memiliki lampiran gambar mockup.'}
                      </p>
                    </div>
                  )}
                </div>
              </div>

              {/* PAGE 2: CATATAN PRODUKSI, MONITORING & TANDA TANGAN */}
              <div
                id={`customer-spk-template-${spk.id}-page2`}
                style={{
                  width: '1240px',
                  height: '1754px',
                  fontFamily: 'sans-serif',
                  position: 'relative',
                  backgroundColor: '#ffffff',
                  color: '#0f172a',
                  overflow: 'hidden',
                  userSelect: 'none',
                  backgroundImage: `url("${SPK_PAGE2_BG}")`,
                  backgroundSize: '100% 100%',
                  backgroundRepeat: 'no-repeat',
                  boxSizing: 'border-box'
                }}
              >
                {/* Top 3 Info Boxes on Page 2 */}
                {/* Box 1: NO. SPK */}
                <div style={{ position: 'absolute', top: '250px', left: '80px', width: '375px', height: '95px', display: 'flex', alignItems: 'center' }}>
                  <p style={{ fontSize: '24px', fontWeight: 'bold', color: '#0f172a', margin: 0, lineHeight: 1.4, paddingBottom: '8px', whiteSpace: 'nowrap' }}>
                    {spk.id}
                  </p>
                </div>

                {/* Box 2: NAMA PRODUK */}
                <div style={{ position: 'absolute', top: '250px', left: '455px', width: '375px', height: '95px', display: 'flex', alignItems: 'center' }}>
                  <p style={{ fontSize: '24px', fontWeight: 'bold', color: '#0f172a', margin: 0, lineHeight: 1.4, paddingBottom: '8px', whiteSpace: 'nowrap' }}>
                    {spk.productName || '-'}
                  </p>
                </div>

                {/* Box 3: TARGET QUANTITY */}
                <div style={{ position: 'absolute', top: '250px', left: '950px', width: '375px', height: '95px', display: 'flex', alignItems: 'center' }}>
                  <p style={{ fontSize: '24px', fontWeight: 'bold', color: '#0f172a', margin: 0, lineHeight: 1.4, paddingBottom: '8px' }}>
                    {spk.targetQty ? `${Number(spk.targetQty).toLocaleString('id-ID')} Pcs` : '-'}
                  </p>
                </div>

                {/* Middle Content: Instruksi Khusus, Catatan & Monitoring */}
                <div style={{ position: 'absolute', top: '360px', left: '45px', width: '1150px', height: '880px', display: 'flex', flexDirection: 'column', boxSizing: 'border-box' }}>
                  {/* Gambar 3: Main Catatan Box */}
                  <div style={{ flex: 1, border: '2px solid #e2e8f0', borderRadius: '24px', padding: '30px', marginBottom: '20px', display: 'flex', flexDirection: 'column', boxSizing: 'border-box' }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '12px', marginBottom: '16px', paddingBottom: '16px', borderBottom: '1px solid #e2e8f0' }}>
                      <div style={{ width: '14px', height: '50px', borderRadius: '9999px', backgroundColor: '#0d9488' }}></div>
                      <p style={{ fontSize: '20px', fontWeight: 'bold', color: '#134e4a', textTransform: 'uppercase', letterSpacing: '0.05em', margin: 0 }}>Instruksi Khusus & Catatan Produksi</p>
                    </div>
                    <div style={{ fontSize: '20px', color: '#334155', whiteSpace: 'pre-wrap', lineHeight: '1.8', flex: 1, overflow: 'hidden' }}>
                      {spk.notes || 'Tidak ada instruksi khusus tambahan. Ikuti spesifikasi bahan, ukuran, dan mockup pada Halaman 1.'}
                    </div>
                  </div>

                  {/* Gambar 1: Footer Info */}
                  <div style={{ textAlign: 'center' }}>
                    <p style={{ fontSize: '16px', color: '#94a3b8', margin: 0 }}>
                      Dokumen SPK ini dibuat otomatis oleh ERP PT Hasil Inti Jualan pada {new Date().toLocaleDateString('id-ID', { day: 'numeric', month: 'long', year: 'numeric' })}.
                    </p>
                  </div>
                </div>
              </div>
            </React.Fragment>
          );
        })}
      </div>
    </div>
  );
};
