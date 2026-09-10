import React, { useState, useEffect, useMemo } from 'react';
import { Card } from '../App';
import {
  Plus,
  Search,
  Filter,
  FileText,
  Clock,
  CheckCircle2,
  AlertCircle,
  ArrowRight,
  Loader2,
  Download,
  Trash2,
  ChevronDown,
  ChevronUp,
  User,
  X
} from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import { cn, formatCurrency, generateId } from '../lib/utils';
import { sheetsService } from '../services/googleService';
import { Modal } from './ui/Modal';
import jsPDF from 'jspdf';
import html2canvas from 'html2canvas';
import { CustomTableBuilder, normalizeTableData, TABLE_PRESETS } from './ui/CustomTableBuilder';
import { CustomTableViewer } from './ui/CustomTableViewer';
import { SPK_PAGE1_BG, SPK_PAGE2_BG } from '../assets/spkTemplates';

export const ProductionModule = ({ onNavigate }: { onNavigate?: (module: any) => void }) => {
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

  const [activeTab, setActiveTab] = useState<'planning' | 'spk' | 'monitoring' | 'settings'>('monitoring');
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [isEditMode, setIsEditMode] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [submitStatus, setSubmitStatus] = useState('In Progress');
  const [loading, setLoading] = useState(true);
  const [orders, setOrders] = useState<any[]>([]);
  const [spks, setSpks] = useState<any[]>([]);
  const [customers, setCustomers] = useState<any[]>([]);
  const [designs, setDesigns] = useState<any[]>([]);
  const [samples, setSamples] = useState<any[]>([]);
  const [lines, setLines] = useState<any[]>([]);
  const [operators, setOperators] = useState<any[]>([]);
  const [qcReports, setQcReports] = useState<any[]>([]);
  const [selectedSPK, setSelectedSPK] = useState<any>(null);
  const [isDetailModalOpen, setIsDetailModalOpen] = useState(false);
  const [activeStageModal, setActiveStageModal] = useState<string | null>(null);
  const [expandedSPKId, setExpandedSPKId] = useState<string | null>(null);
  const [isDeleteModalOpen, setIsDeleteModalOpen] = useState(false);
  const [itemToDelete, setItemToDelete] = useState<string | null>(null);
  const [searchQuery, setSearchQuery] = useState('');
  const [isGeneratingPdf, setIsGeneratingPdf] = useState<string | null>(null);

  const findOrder = (orderId: any) => {
    if (!orderId) return null;
    const searchId = String(orderId).trim().toLowerCase();
    return orders.find(o => {
      const oid = String(o.id || getValue(o, 'id')).trim().toLowerCase();
      return oid === searchId;
    });
  };

  const findCustomer = (customerId: any) => {
    if (!customerId) return null;
    const searchId = String(customerId).trim().toLowerCase();
    return customers.find(c => {
      const cid = String(c.id || getValue(c, 'id')).trim().toLowerCase();
      return cid === searchId;
    });
  };

  const filteredSpks = useMemo(() => {
    if (!searchQuery.trim()) return spks;
    const q = searchQuery.toLowerCase().trim();
    return spks.filter(spk => {
      const spkId = String(spk.id || getValue(spk, 'id') || '').toLowerCase();
      const po = String(spk.po || getValue(spk, 'po') || '').toLowerCase();
      const orderId = String(spk.orderId || getValue(spk, 'orderId') || '').toLowerCase();
      const product = String(spk.productName || getValue(spk, 'product') || '').toLowerCase();
      const material = String(spk.material || '').toLowerCase();
      const customerId = String(spk.customerId || getValue(spk, 'customerId') || '').toLowerCase();
      const order = findOrder(spk.orderId || spk.po);
      const cust = findCustomer(customerId || (order ? getValue(order, 'customerId') : ''));
      const customerName = String(cust?.name || (order ? getValue(order, 'customerName') : '') || '').toLowerCase();
      const customerCompany = String(cust?.company || '').toLowerCase();
      const status = String(spk.status || '').toLowerCase();

      return spkId.includes(q) || po.includes(q) || orderId.includes(q) ||
        product.includes(q) || material.includes(q) || customerId.includes(q) ||
        customerName.includes(q) || customerCompany.includes(q) || status.includes(q);
    });
  }, [spks, searchQuery, orders, customers]);

  const filteredPlannedOrders = useMemo(() => {
    const planned = orders.filter(order => {
      const orderId = getValue(order, 'id');
      const hasSpk = spks.some(spk => spk.orderId === orderId || spk.po === orderId);
      return !hasSpk && order.status !== 'Completed' && order.status !== 'Cancelled';
    });
    if (!searchQuery.trim()) return planned;
    const q = searchQuery.toLowerCase().trim();
    return planned.filter(order => {
      const orderId = String(getValue(order, 'id')).toLowerCase();
      const custId = String(getValue(order, 'customerId')).toLowerCase();
      const custName = String(getValue(order, 'customerName')).toLowerCase();
      const product = String(getValue(order, 'productType') || getValue(order, 'product')).toLowerCase();
      return orderId.includes(q) || custId.includes(q) || custName.includes(q) || product.includes(q);
    });
  }, [orders, spks, searchQuery]);

  const availableOrders = useMemo(() => {
    return orders.filter(order => {
      const orderId = getValue(order, 'id');
      const hasSpk = spks.some(spk => spk.orderId === orderId || spk.po === orderId);

      if (isEditMode && editingId) {
        const currentSPK = spks.find(s => s.id === editingId);
        if (currentSPK && currentSPK.orderId === orderId) return true;
      }

      return !hasSpk && order.status !== 'Completed' && order.status !== 'Cancelled';
    });
  }, [orders, spks, isEditMode, editingId]);

  const handleDelete = (id: string) => {
    setItemToDelete(id);
    setIsDeleteModalOpen(true);
  };

  const confirmDelete = async () => {
    if (!itemToDelete) return;
    try {
      setLoading(true);
      await sheetsService.delete('SPK_Produksi', itemToDelete);
      setIsDeleteModalOpen(false);
      setItemToDelete(null);
      fetchData();
    } catch (error) {
      console.error('Error deleting SPK:', error);
      alert('Gagal menghapus SPK.');
    } finally {
      setLoading(false);
    }
  };

  const handleLocalUpdate = (field: string, value: number) => {
    if (!selectedSPK) return;
    const updatedSPK = { ...selectedSPK, [field]: value };

    const totalTarget = Number(updatedSPK.targetQty) || 1;
    const cutting = Number(updatedSPK.cutting) || 0;
    const sewing = Number(updatedSPK.sewing) || 0;
    const finishing = Number(updatedSPK.finishing) || 0;
    const qc = Number(updatedSPK.qc) || 0;
    const progress = Math.round(((cutting + sewing + finishing + qc) / 4 / totalTarget) * 100);

    updatedSPK.progress = progress;
    updatedSPK.status = progress >= 100 ? 'Completed' : 'In Progress';

    setSelectedSPK(updatedSPK);
    setSpks(spks.map(spk => spk.id === updatedSPK.id ? updatedSPK : spk));
  };

  const handleEmployeeProgressUpdate = (stage: string, employeeId: string, value: number) => {
    if (!selectedSPK) return;

    let empProgress = {};
    try {
      empProgress = selectedSPK.employeeProgress ? JSON.parse(selectedSPK.employeeProgress) : {};
    } catch (e) {
      empProgress = {};
    }

    if (!empProgress[stage as keyof typeof empProgress]) {
      (empProgress as any)[stage] = {};
    }

    (empProgress as any)[stage][employeeId] = value;

    // Calculate new total for this stage
    const newTotal = Object.values((empProgress as any)[stage]).reduce((sum: any, val: any) => sum + (Number(val) || 0), 0);

    const updatedSPK = {
      ...selectedSPK,
      employeeProgress: JSON.stringify(empProgress),
      [stage]: newTotal
    };

    const totalTarget = Number(updatedSPK.targetQty) || 1;
    const cutting = Number(updatedSPK.cutting) || 0;
    const sewing = Number(updatedSPK.sewing) || 0;
    const finishing = Number(updatedSPK.finishing) || 0;
    const qc = Number(updatedSPK.qc) || 0;
    const progress = Math.round(((cutting + sewing + finishing + qc) / 4 / totalTarget) * 100);

    updatedSPK.progress = progress;
    updatedSPK.status = progress >= 100 ? 'Completed' : 'In Progress';

    setSelectedSPK(updatedSPK);
    setSpks(spks.map(spk => spk.id === updatedSPK.id ? updatedSPK : spk));
  };

  const handleSaveProgress = async () => {
    if (!selectedSPK) return;
    try {
      await sheetsService.update('SPK_Produksi', selectedSPK.id, selectedSPK);

      // Update Order status if SPK is completed
      if (selectedSPK.status === 'Completed') {
        const orderId = getValue(selectedSPK, 'orderId');
        if (orderId) {
          await sheetsService.update('Orders', orderId, { status: 'Completed' });
        }
      }
    } catch (error) {
      console.error('Error updating progress:', error);
      alert('Gagal memperbarui progres.');
    }
  };

  const initialFormData = {
    orderId: '',
    po: '',
    material: '',
    sablonBordir: '',
    tanggalMasuk: new Date().toISOString().split('T')[0],
    tanggalSelesai: '',
    notes: '',
    pjFinishing: '',
    pjCutting: '',
    pjKepalaProduksi: '',
    mockupDepan: '',
    mockupBelakang: '',
    sizeChart: TABLE_PRESETS[0].data
  };

  const [formData, setFormData] = useState(initialFormData);

  const fetchData = async () => {
    try {
      setLoading(true);
      const [ordData, spkData, custData, desData, samData, opData, qcData] = await Promise.all([
        sheetsService.getAll('Orders'),
        sheetsService.getAll('SPK_Produksi'),
        sheetsService.getAll('Customers'),
        sheetsService.getAll('Designs'),
        sheetsService.getAll('Samples'),
        sheetsService.getAll('Operators'),
        sheetsService.getAll('QC_Reports')
      ]);

      let lineData: any[] = [];
      try {
        lineData = await sheetsService.getAll('ProductionLines');
      } catch (e) {
        console.warn("ProductionLines sheet not found or error fetching it:", e);
      }

      setOrders(Array.isArray(ordData) ? ordData : []);
      setSpks(Array.isArray(spkData) ? spkData : []);
      setCustomers(Array.isArray(custData) ? custData : []);
      setDesigns(Array.isArray(desData) ? desData : []);
      setSamples(Array.isArray(samData) ? samData : []);
      setOperators(Array.isArray(opData) ? opData : []);
      setQcReports(Array.isArray(qcData) ? qcData : []);
      setLines(Array.isArray(lineData) && lineData.length > 0 ? lineData : [
        { id: 'A', name: 'Line A - T-Shirts', progress: 85, status: 'On Track', operator: 'Budi Santoso' },
        { id: 'B', name: 'Line B - Jackets', progress: 40, status: 'Delayed', operator: 'Siti Aminah' },
        { id: 'C', name: 'Line C - Pants', progress: 92, status: 'On Track', operator: 'Agus Wijaya' },
      ]);
    } catch (error) {
      console.error('Error fetching production data:', error);
      setOrders([]);
      setSpks([]);
      setCustomers([]);
      setDesigns([]);
      setSamples([]);
      setLines([]);
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
      const order = findOrder(formData.orderId);

      if (isEditMode && editingId) {
        const existingSPK = spks.find(s => s.id === editingId);
        const productName = order ? (getValue(order, 'productType') || order.productType) : (existingSPK?.productName || 'Unknown');
        const targetQty = order ? (getValue(order, 'quantity') || order.quantity) : (existingSPK?.targetQty || 0);
        const customerId = order ? (getValue(order, 'customerId') || order.customerId) : (existingSPK?.customerId || 'UNKNOWN');

        const updatedSPK = {
          ...existingSPK,
          ...formData,
          sizeChart: JSON.stringify(formData.sizeChart),
          productName: productName,
          targetQty: targetQty,
          customerId: customerId
        };
        await sheetsService.update('SPK_Produksi', editingId, updatedSPK);
      } else {
        const customerId = order ? (getValue(order, 'customerId') || order.customerId) : 'UNKNOWN';
        const productName = order ? (getValue(order, 'productType') || order.productType) : 'Unknown';
        const targetQty = order ? (getValue(order, 'quantity') || order.quantity) : 0;

        // Generate ID based on Order ID
        let spkId = `SPK-${formData.orderId}`;

        // Final safety check against all SPKs
        let nextNum = 1;
        const baseId = spkId;
        while (spks.some(s => (s.id || getValue(s, 'id')) === spkId)) {
          spkId = `${baseId}-${nextNum}`;
          nextNum++;
        }

        const newSPK = {
          id: spkId,
          timestamp: new Date().toISOString(),
          user: 'Admin HIJ',
          customerId: customerId,
          productName: productName,
          targetQty: targetQty,
          ...formData,
          sizeChart: JSON.stringify(formData.sizeChart),
          cutting: 0,
          sewing: 0,
          finishing: 0,
          qc: 0,
          progress: 0,
          status: submitStatus
        };
        await sheetsService.create('SPK_Produksi', newSPK);

        // Update Order status to 'In Production'
        if (order) {
          const orderId = order.id || getValue(order, 'id');
          await sheetsService.update('Orders', orderId, { status: 'In Production' });
        }
      }

      setIsModalOpen(false);
      setIsEditMode(false);
      setEditingId(null);
      setFormData(initialFormData);
      fetchData();
    } catch (error) {
      alert('Gagal menyimpan SPK.');
    }
  };

  const handleEdit = (spk: any) => {
    const chart = normalizeTableData(spk.sizeChart);

    setFormData({
      orderId: spk.orderId || '',
      po: spk.po || '',
      material: spk.material || '',
      sablonBordir: spk.sablonBordir || '',
      tanggalMasuk: spk.tanggalMasuk || '',
      tanggalSelesai: spk.tanggalSelesai || '',
      notes: spk.notes || '',
      pjFinishing: spk.pjFinishing || '',
      pjCutting: spk.pjCutting || '',
      pjKepalaProduksi: spk.pjKepalaProduksi || '',
      mockupDepan: spk.mockupDepan || '',
      mockupBelakang: spk.mockupBelakang || '',
      sizeChart: chart
    });
    setEditingId(spk.id);
    setIsEditMode(true);
    setIsModalOpen(true);
  };

  const formatDate = (dateStr: string) => {
    if (!dateStr) return '-';
    try {
      // Check if it's already in DD/MM/YYYY format
      if (/^\d{2}\/\d{2}\/\d{4}$/.test(dateStr)) return dateStr;

      const date = new Date(dateStr);
      if (isNaN(date.getTime())) return dateStr;
      return `${date.getDate().toString().padStart(2, '0')}/${(date.getMonth() + 1).toString().padStart(2, '0')}/${date.getFullYear()}`;
    } catch (e) {
      return dateStr;
    }
  };

  const sanitizeColorsForHtml2Canvas = (clonedDoc: Document) => {
    // 1. Sanitize all <style> tags by replacing any oklch(...) or oklab(...) rules from Tailwind v4
    const styleTags = clonedDoc.querySelectorAll('style');
    styleTags.forEach((styleTag) => {
      if (styleTag.textContent && (styleTag.textContent.includes('oklch') || styleTag.textContent.includes('oklab'))) {
        styleTag.textContent = styleTag.textContent
          .replace(/oklch\([^)]+\)/gi, '#0d9488')
          .replace(/oklab\([^)]+\)/gi, '#0d9488');
      }
    });

    // 2. Also check computed properties on cloned elements
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
    const elPage1 = document.getElementById(`spk-template-${spk.id}-page1`);
    const elPage2 = document.getElementById(`spk-template-${spk.id}-page2`);
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

  // const lines = [
  //   { id: 'A', name: 'Line A - T-Shirts', progress: 85, status: 'On Track', operator: 'Budi Santoso' },
  //   { id: 'B', name: 'Line B - Jackets', progress: 40, status: 'Delayed', operator: 'Siti Aminah' },
  //   { id: 'C', name: 'Line C - Pants', progress: 92, status: 'On Track', operator: 'Agus Wijaya' },
  // ];

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
          <h2 className="text-2xl font-bold text-gray-900">Kontrol Produksi (PPIC)</h2>
          <p className="text-sm text-gray-500">Kelola jadwal, SPK, dan pantau produksi secara real-time.</p>
        </div>
        <div className="flex flex-col sm:flex-row w-full sm:w-auto gap-2 sm:gap-3">
          <button className="w-full sm:w-auto bg-white text-gray-900 border border-gray-200 px-6 py-2.5 rounded-2xl text-sm font-semibold hover:bg-gray-50 transition-all text-center justify-center">
            Rencana Mingguan
          </button>
          <button
            onClick={() => setIsModalOpen(true)}
            className="w-full sm:w-auto bg-black text-white px-6 py-2.5 rounded-2xl text-sm font-semibold flex items-center justify-center gap-2 hover:bg-gray-800 transition-all shadow-lg shadow-black/10"
          >
            <Plus size={18} />
            Buat SPK
          </button>
        </div>
      </div>

      <div className="flex flex-col sm:flex-row justify-between items-stretch sm:items-center gap-4">
        <div className="grid grid-cols-2 sm:grid-cols-4 sm:flex sm:w-fit gap-1.5 p-1.5 bg-gray-100 rounded-2xl w-full sm:w-auto">
          {[
            { id: 'planning', label: 'Perencanaan' },
            { id: 'spk', label: 'SPK Aktif' },
            { id: 'monitoring', label: 'Pemantauan' },
            { id: 'settings', label: 'Pengaturan' }
          ].map((tab) => (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id as any)}
              className={cn(
                "px-3 sm:px-6 py-2.5 rounded-xl text-xs sm:text-sm font-semibold transition-all text-center justify-center cursor-pointer",
                activeTab === tab.id ? "bg-white text-black shadow-sm" : "text-gray-500 hover:text-gray-700"
              )}
            >
              {tab.label}
            </button>
          ))}
        </div>

        {/* Search Bar */}
        <div className="relative flex-1 sm:max-w-md">
          <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 text-gray-400" size={18} />
          <input
            type="text"
            placeholder="Cari SPK, PO, nama pelanggan, produk, ID..."
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
          <p className="text-gray-500 text-sm">Loading production data...</p>
        </div>
      ) : (
        <>
          {activeTab === 'monitoring' && (
            filteredSpks.filter(s => s.status !== 'Planned').length === 0 ? (
              <div className="bg-white rounded-3xl p-12 text-center border border-gray-100 text-gray-500 text-sm">
                {searchQuery ? `Tidak ada SPK pemantauan yang cocok dengan "${searchQuery}".` : 'Tidak ada SPK aktif untuk dipantau.'}
              </div>
            ) : (
              <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 items-start">
                {filteredSpks.filter(s => s.status !== 'Planned').map((spk) => {
                  const totalTarget = Number(spk.targetQty) || 1;
                  const cutting = Number(spk.cutting) || 0;
                  const sewing = Number(spk.sewing) || 0;
                  const finishing = Number(spk.finishing) || 0;
                  const qc = Number(spk.qc) || 0;
                  const progress = Math.round(((cutting + sewing + finishing + qc) / 4 / totalTarget) * 100);

                  return (
                    <Card key={spk.id}>
                      <div className="flex justify-between items-start mb-4 md:mb-6">
                        <div className="w-10 h-10 md:w-12 md:h-12 rounded-2xl bg-gray-50 flex items-center justify-center text-gray-900 font-bold text-lg md:text-xl">
                          {spk.id.substring(0, 3)}
                        </div>
                        <span className={cn(
                          "px-2 py-0.5 md:px-3 md:py-1 rounded-full text-[9px] md:text-[10px] font-bold uppercase tracking-wider",
                          progress === 100 ? "bg-green-100 text-green-700" : "bg-teal-100 text-teal-700"
                        )}>
                          {progress === 100 ? 'Completed' : 'In Progress'}
                        </span>
                      </div>
                      <h3 className="text-base md:text-lg font-bold text-gray-900 leading-tight">
                        {(() => {
                          const orderId = getValue(spk, 'orderId');
                          const order = findOrder(orderId);
                          const customerId = getValue(spk, 'customerId') || (order ? getValue(order, 'customerId') : '');
                          const customer = findCustomer(customerId);
                          const name = customer?.name || getValue(order, 'customerName') || 'Unknown Client';
                          const company = customer?.company || '';
                          const clientName = company ? `${name} (${company})` : name;
                          return (
                            <div className="flex flex-col">
                              <span>{clientName}</span>
                              <span className="text-[10px] text-gray-400 font-medium mt-0.5">ID: {customerId || '-'}</span>
                            </div>
                          );
                        })()}
                      </h3>
                      <p className="text-xs md:text-sm font-medium text-teal-600 mt-1">{spk.productName}</p>
                      <div className="mt-2 space-y-0.5">
                        <p className="text-[10px] md:text-xs text-gray-500">PO: {spk.po || '-'}</p>
                        <p className="text-[10px] md:text-xs text-gray-500">Start: {formatDate(spk.tanggalMasuk)} | Deadline: {formatDate(spk.tanggalSelesai)}</p>
                      </div>

                      <div className="mt-6 md:mt-8 space-y-3 md:space-y-4">
                        <div className="flex justify-between text-xs md:text-sm font-medium">
                          <span className="text-gray-500">Progress</span>
                          <span className="text-gray-900">{progress}%</span>
                        </div>
                        <div className="h-2 md:h-3 w-full bg-gray-100 rounded-full overflow-hidden">
                          <motion.div
                            initial={{ width: 0 }}
                            animate={{ width: `${progress}%` }}
                            className={cn(
                              "h-full rounded-full",
                              progress === 100 ? "bg-emerald-500" : "bg-teal-600"
                            )}
                          />
                        </div>
                      </div>

                      {(() => {
                        const qcReport = qcReports.find(q => getValue(q, 'orderId') === getValue(spk, 'orderId'));
                        const qcStatus = qcReport ? getValue(qcReport, 'status') : null;

                        if (progress === 100) {
                          return (
                            <div className="mt-4 space-y-2">
                              {qcStatus ? (
                                <div className={cn(
                                  "w-full py-2.5 rounded-xl text-xs font-bold flex items-center justify-center gap-2 border",
                                  qcStatus === 'Accept' ? "bg-emerald-50 text-emerald-700 border-emerald-100" :
                                    qcStatus === 'Repair' ? "bg-orange-50 text-orange-700 border-orange-100" :
                                      "bg-red-50 text-red-700 border-red-100"
                                )}>
                                  <CheckCircle2 size={14} />
                                  QC: {qcStatus === 'Accept' ? 'LULUS' : qcStatus === 'Repair' ? 'PERBAIKAN' : 'DITOLAK'}
                                </div>
                              ) : (
                                <button
                                  onClick={() => onNavigate?.('QC')}
                                  className="w-full bg-teal-50 text-teal-700 py-2.5 rounded-xl text-xs font-bold flex items-center justify-center gap-2 hover:bg-teal-100 transition-colors border border-teal-100"
                                >
                                  <CheckCircle2 size={14} />
                                  Kirim ke QC (Antrian)
                                </button>
                              )}
                            </div>
                          );
                        }
                        return null;
                      })()}

                      <div className="mt-6 md:mt-8 pt-4 md:pt-6 border-t border-gray-50 flex justify-between items-center">
                        <div className="flex items-center gap-2">
                          <button
                            onClick={() => setExpandedSPKId(expandedSPKId === spk.id ? null : spk.id)}
                            className="flex items-center gap-1 text-[10px] md:text-xs font-bold text-gray-500 hover:text-gray-900 transition-colors"
                          >
                            {expandedSPKId === spk.id ? <ChevronUp size={12} className="md:w-3.5 md:h-3.5" /> : <ChevronDown size={12} className="md:w-3.5 md:h-3.5" />}
                            Tim Produksi
                          </button>
                        </div>
                        <button
                          onClick={() => {
                            setSelectedSPK(spk);
                            setIsDetailModalOpen(true);
                          }}
                          className="text-xs md:text-sm font-semibold text-teal-600 hover:text-teal-700 flex items-center gap-1"
                        >
                          Details
                          <ArrowRight size={12} className="md:w-3.5 md:h-3.5" />
                        </button>
                      </div>

                      {/* Expanded Employee List */}
                      <AnimatePresence>
                        {expandedSPKId === spk.id && (
                          <motion.div
                            initial={{ height: 0, opacity: 0 }}
                            animate={{ height: 'auto', opacity: 1 }}
                            exit={{ height: 0, opacity: 0 }}
                            className="overflow-hidden"
                          >
                            <div className="mt-4 pt-4 border-t border-dashed border-gray-100 space-y-3">
                              {(() => {
                                let empProgress = {};
                                try {
                                  empProgress = spk.employeeProgress ? JSON.parse(spk.employeeProgress) : {};
                                } catch (e) { }

                                const contributors = new Map();

                                Object.entries(empProgress).forEach(([stage, data]: [string, any]) => {
                                  Object.entries(data).forEach(([empId, qty]: [string, any]) => {
                                    if (qty > 0) {
                                      if (!contributors.has(empId)) {
                                        contributors.set(empId, { stages: new Set(), total: 0 });
                                      }
                                      const c = contributors.get(empId);
                                      c.stages.add(stage);
                                      c.total += qty;
                                    }
                                  });
                                });

                                if (contributors.size === 0) {
                                  return <p className="text-[10px] text-gray-400 italic text-center py-2">Belum ada rincian pengerjaan karyawan.</p>;
                                }

                                return Array.from(contributors.entries()).map(([empId, data]) => {
                                  const operator = operators.find(op => op.id === empId);
                                  const name = operator?.name || 'Unknown';
                                  const role = operator?.role || '-';

                                  return (
                                    <div key={empId} className="flex items-center justify-between bg-gray-50/50 p-2 rounded-lg">
                                      <div className="flex items-center gap-2">
                                        <div className="w-6 h-6 rounded-full bg-teal-100 flex items-center justify-center text-teal-600">
                                          <User size={12} />
                                        </div>
                                        <div>
                                          <p className="text-[11px] font-bold text-gray-900">{name}</p>
                                          <p className="text-[9px] text-gray-500 uppercase tracking-wider">{role}</p>
                                        </div>
                                      </div>
                                      <div className="text-right">
                                        <p className="text-[11px] font-black text-teal-600">{data.total} pcs</p>
                                        <p className="text-[9px] text-gray-400 capitalize">{Array.from(data.stages).join(', ')}</p>
                                      </div>
                                    </div>
                                  );
                                });
                              })()}
                            </div>
                          </motion.div>
                        )}
                      </AnimatePresence>
                    </Card>
                  );
                })}
              </div>
            )
          )}

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
                  Apakah Anda yakin ingin menghapus SPK ini? Tindakan ini tidak dapat dibatalkan.
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
            onClose={() => {
              handleSaveProgress();
              setIsDetailModalOpen(false);
            }}
            title={`Production Details: ${selectedSPK?.id?.substring(0, 3) || ''} - ${selectedSPK?.productName || selectedSPK?.name || ''}`}
          >
            <div className="space-y-6">
              {selectedSPK && (
                <div className="bg-teal-50 p-4 rounded-xl mb-6">
                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <p className="text-xs text-gray-500 font-semibold uppercase tracking-wider">Customer</p>
                      <p className="text-sm font-bold text-gray-900">
                        {(() => {
                          const orderId = getValue(selectedSPK, 'orderId');
                          const order = findOrder(orderId);
                          const customerId = getValue(selectedSPK, 'customerId') || (order ? getValue(order, 'customerId') : '');
                          const customer = findCustomer(customerId);
                          const name = customer?.name || getValue(order, 'customerName') || 'Unknown Customer';
                          const company = customer?.company || '';
                          return company ? `${name} (${company})` : name;
                        })()}
                      </p>
                    </div>
                    <div>
                      <p className="text-xs text-gray-500 font-semibold uppercase tracking-wider">Target Quantity</p>
                      <p className="text-sm font-bold text-gray-900">{selectedSPK.targetQty || (findOrder(getValue(selectedSPK, 'orderId'))?.quantity) || 0} pcs</p>
                    </div>
                  </div>

                  <div className="mt-4 pt-4 border-t border-teal-100/50">
                    <CustomTableViewer data={selectedSPK.sizeChart} title="Tabel Ukuran & Rincian Pesanan" compact />
                  </div>
                </div>
              )}

              {['cutting', 'sewing', 'finishing', 'qc'].map((stage) => (
                <div key={stage} className="space-y-2">
                  <label className="text-xs font-bold text-gray-400 uppercase tracking-wider capitalize">Total {stage} (pcs)</label>
                  <div className="flex gap-2">
                    <input
                      type="number"
                      value={selectedSPK?.[stage] !== undefined ? selectedSPK[stage] : ''}
                      readOnly
                      className="flex-1 p-3 bg-gray-100 border-none rounded-xl text-sm text-gray-500 cursor-not-allowed"
                    />
                    <button
                      onClick={() => setActiveStageModal(stage)}
                      className="px-4 py-3 bg-teal-50 text-teal-600 rounded-xl font-bold hover:bg-teal-100 transition-colors text-sm"
                    >
                      Input {stage}
                    </button>
                  </div>
                </div>
              ))}

              <div className="pt-4 flex justify-end">
                <button
                  onClick={async () => {
                    await handleSaveProgress();
                    alert('Progress updated successfully!');
                    setIsDetailModalOpen(false);
                  }}
                  className="bg-teal-600 text-white px-6 py-3 rounded-xl font-bold hover:bg-teal-700 transition-colors"
                >
                  Update Progress
                </button>
              </div>
            </div>
          </Modal>

          <Modal
            isOpen={!!activeStageModal}
            onClose={() => {
              handleSaveProgress();
              setActiveStageModal(null);
            }}
            title={`Input Progress: ${activeStageModal ? activeStageModal.charAt(0).toUpperCase() + activeStageModal.slice(1) : ''}`}
          >
            <div className="space-y-4">
              <div className="bg-gray-50 p-4 rounded-xl mb-4">
                <p className="text-sm text-gray-600">Masukkan hasil kerja masing-masing karyawan untuk tahap <strong>{activeStageModal}</strong>. Total akan dihitung secara otomatis.</p>
              </div>

              <div className="max-h-[60vh] overflow-y-auto pr-2 space-y-3">
                {(() => {
                  const getRolesForStage = (stage: string) => {
                    switch (stage) {
                      case 'cutting': return ['Cutting', 'Cutting Specialist', 'Pattern Maker'];
                      case 'sewing': return ['Sewing', 'Tailor'];
                      case 'finishing': return ['Finishing', 'Operator', 'Tailor'];
                      case 'qc': return ['QC', 'QC Inspector'];
                      default: return [];
                    }
                  };

                  const filteredOperators = operators.filter(op => {
                    if (!activeStageModal) return false;
                    const allowedRoles = getRolesForStage(activeStageModal).map(r => r.toLowerCase());

                    // Case-insensitive property access
                    const roleKey = Object.keys(op).find(k => k.toLowerCase().trim() === 'role');
                    const opRole = roleKey ? (op[roleKey] || '').trim().toLowerCase() : '';

                    return allowedRoles.includes(opRole);
                  });

                  if (filteredOperators.length === 0) {
                    return <p className="text-center text-gray-500 py-8 text-sm">Belum ada karyawan dengan role yang sesuai untuk tahap ini.</p>;
                  }

                  return filteredOperators.map(op => {
                    let empProgress = {};
                    try {
                      empProgress = selectedSPK?.employeeProgress ? JSON.parse(selectedSPK.employeeProgress) : {};
                    } catch (e) { }

                    const currentValue = activeStageModal ? ((empProgress as any)[activeStageModal]?.[op.id] || '') : '';

                    // Case-insensitive property access for display
                    const nameKey = Object.keys(op).find(k => k.toLowerCase().trim() === 'name');
                    const roleKey = Object.keys(op).find(k => k.toLowerCase().trim() === 'role');
                    const skillKey = Object.keys(op).find(k => k.toLowerCase().trim() === 'skill');

                    const opName = nameKey ? op[nameKey] : 'Unknown';
                    const opRole = roleKey ? op[roleKey] : '-';
                    const opSkill = skillKey ? op[skillKey] : '-';

                    return (
                      <div key={op.id} className="flex items-center justify-between p-3 border border-gray-100 rounded-xl hover:border-teal-100 transition-colors">
                        <div>
                          <p className="font-bold text-gray-900 text-sm">{opName}</p>
                          <p className="text-xs text-gray-500">{opRole} • {opSkill}</p>
                        </div>
                        <div className="w-32">
                          <input
                            type="number"
                            placeholder="0 pcs"
                            value={currentValue}
                            onChange={(e) => {
                              if (activeStageModal) {
                                handleEmployeeProgressUpdate(activeStageModal, op.id, parseInt(e.target.value) || 0);
                              }
                            }}
                            className="w-full p-2 bg-gray-50 border-none rounded-lg text-sm text-right focus:ring-2 focus:ring-teal-500/20"
                          />
                        </div>
                      </div>
                    );
                  });
                })()}
              </div>

              <div className="pt-4 flex justify-between items-center border-t border-gray-100">
                <div>
                  <p className="text-xs text-gray-500 font-bold uppercase tracking-wider">Total {activeStageModal}</p>
                  <p className="text-xl font-black text-teal-600">
                    {activeStageModal && selectedSPK ? (selectedSPK[activeStageModal] || 0) : 0} pcs
                  </p>
                </div>
                <button
                  onClick={async () => {
                    await handleSaveProgress();
                    setActiveStageModal(null);
                  }}
                  className="bg-teal-600 text-white px-6 py-2.5 rounded-xl font-bold hover:bg-teal-700 transition-colors text-sm"
                >
                  Simpan & Tutup
                </button>
              </div>
            </div>
          </Modal>

          {activeTab === 'settings' && (
            <Card title="Production Lines Settings">
              <div className="space-y-4">
                {lines.map((line, index) => (
                  <div key={line.id} className="flex gap-4 items-center p-4 bg-gray-50 rounded-xl">
                    <input className="p-2 rounded border w-20" value={line.id} placeholder="ID" readOnly />
                    <input
                      className="p-2 rounded border flex-1"
                      value={line.name}
                      placeholder="Name"
                      onChange={(e) => {
                        const newLines = [...lines];
                        newLines[index].name = e.target.value;
                        setLines(newLines);
                      }}
                    />
                    <input
                      className="p-2 rounded border flex-1"
                      value={line.operator}
                      placeholder="Operator"
                      onChange={(e) => {
                        const newLines = [...lines];
                        newLines[index].operator = e.target.value;
                        setLines(newLines);
                      }}
                    />
                    <button
                      onClick={async () => {
                        try {
                          await sheetsService.update('ProductionLines', line.id, line);
                          alert('Line updated successfully!');
                        } catch (e) {
                          console.error('Failed to update line:', e);
                          // If it fails to update, it might not exist yet, try creating
                          try {
                            await sheetsService.create('ProductionLines', line);
                            alert('Line created successfully!');
                          } catch (err) {
                            alert('Failed to save line.');
                          }
                        }
                      }}
                      className="px-4 py-2 bg-teal-100 text-teal-700 rounded-xl text-sm font-semibold hover:bg-teal-200 transition-colors"
                    >
                      Save
                    </button>
                  </div>
                ))}
                <button
                  onClick={() => {
                    const newId = String.fromCharCode(65 + lines.length); // A, B, C, D...
                    setLines([...lines, { id: newId, name: `Line ${newId}`, operator: '', progress: 0, status: 'On Track' }]);
                  }}
                  className="mt-4 bg-black text-white px-4 py-2 rounded-xl text-sm font-semibold"
                >
                  Add New Line
                </button>
              </div>
            </Card>
          )}

          {activeTab === 'planning' && (
            <div className="space-y-6">
              <Card title="Perencanaan Produksi" subtitle="Pesanan menunggu pembuatan SPK">
                {/* Desktop Table View */}
                <div className="hidden md:block overflow-x-auto">
                  <table className="w-full text-left">
                    <thead>
                      <tr className="border-b border-gray-100">
                        <th className="pb-4 font-semibold text-sm text-gray-500">ID Pelanggan</th>
                        <th className="pb-4 font-semibold text-sm text-gray-500">Nama Pelanggan</th>
                        <th className="pb-4 font-semibold text-sm text-gray-500">Produk</th>
                        <th className="pb-4 font-semibold text-sm text-gray-500">Jumlah</th>
                        <th className="pb-4 font-semibold text-sm text-gray-500">Tenggat Waktu</th>
                        <th className="pb-4 font-semibold text-sm text-gray-500 text-right">Aksi</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-gray-50">
                      {(() => {
                        const plannedOrders = filteredPlannedOrders;

                        if (plannedOrders.length === 0) {
                          return (
                            <tr>
                              <td colSpan={6} className="py-20 text-center text-gray-500">
                                {searchQuery ? `Tidak ada pesanan cocok dengan "${searchQuery}".` : 'Tidak ada pesanan menunggu perencanaan.'}
                              </td>
                            </tr>
                          );
                        }

                        return plannedOrders.map((order) => {
                          const orderId = getValue(order, 'id');
                          const customerId = order?.customerId || getValue(order, 'customerId') || '-';
                          const customerName = getValue(order, 'customerName');
                          const productType = getValue(order, 'productType');
                          const quantity = getValue(order, 'quantity');
                          const deadline = getValue(order, 'deadline') || getValue(order, 'deliveryDate');

                          return (
                            <tr key={orderId} className="hover:bg-gray-50/50 transition-colors">
                              <td className="py-4 text-sm font-bold text-gray-900">{customerId}</td>
                              <td className="py-4 text-sm text-gray-600">
                                {(() => {
                                  const customer = findCustomer(customerId);
                                  const name = customer?.name || customerName || 'Unknown';
                                  const company = customer?.company || '';
                                  return company ? `${name} (${company})` : name;
                                })()}
                              </td>
                              <td className="py-4 text-sm text-gray-600">{productType}</td>
                              <td className="py-4 text-sm text-gray-600">{quantity} pcs</td>
                              <td className="py-4 text-sm text-gray-600">{deadline}</td>
                              <td className="py-4 text-right">
                                <button
                                  onClick={() => {
                                    setFormData({
                                      ...initialFormData,
                                      orderId: orderId,
                                      po: '', // Removed auto-populate with orderId
                                      material: getValue(order, 'material'),
                                      tanggalSelesai: getValue(order, 'deadline') || getValue(order, 'deliveryDate')
                                    });
                                    setIsModalOpen(true);
                                  }}
                                  className="px-4 py-2 bg-black text-white rounded-lg text-xs font-semibold hover:bg-gray-800 transition-colors"
                                >
                                  Buat SPK
                                </button>
                              </td>
                            </tr>
                          );
                        });
                      })()}
                    </tbody>
                  </table>
                </div>

                {/* Mobile Card View */}
                <div className="md:hidden space-y-4">
                  {(() => {
                    const plannedOrders = filteredPlannedOrders;

                    if (plannedOrders.length === 0) {
                      return (
                        <div className="py-10 text-center text-gray-500 text-sm">
                          {searchQuery ? `Tidak ada pesanan cocok dengan "${searchQuery}".` : 'Tidak ada pesanan.'}
                        </div>
                      );
                    }

                    return plannedOrders.map((order) => {
                      const orderId = getValue(order, 'id');
                      const customerName = getValue(order, 'customerName');
                      const productType = getValue(order, 'productType');
                      const quantity = getValue(order, 'quantity');
                      const deadline = getValue(order, 'deadline') || getValue(order, 'deliveryDate');
                      const customer = findCustomer(order?.customerId || getValue(order, 'customerId'));
                      const name = customer?.name || customerName || 'Unknown';
                      const company = customer?.company || '';
                      const clientInfo = company ? `${name} (${company})` : name;

                      return (
                        <div key={orderId} className="p-4 bg-gray-50 rounded-2xl border border-gray-100 space-y-3">
                          <div className="flex justify-between items-start">
                            <div>
                              <p className="text-[10px] font-bold text-teal-600 uppercase tracking-wider">{orderId}</p>
                              <p className="text-sm font-bold text-gray-900">{clientInfo}</p>
                            </div>
                            <p className="text-xs font-black text-gray-900">{quantity} pcs</p>
                          </div>
                          <div className="flex justify-between items-end">
                            <div>
                              <p className="text-[10px] font-bold text-gray-400 uppercase tracking-wider">Produk</p>
                              <p className="text-xs font-semibold text-gray-700">{productType}</p>
                              <p className="text-[10px] text-gray-400 mt-1">Deadline: {deadline}</p>
                            </div>
                            <button
                              onClick={() => {
                                setFormData({
                                  ...initialFormData,
                                  orderId: orderId,
                                  po: '', // Removed auto-populate with orderId
                                  material: getValue(order, 'material'),
                                  tanggalSelesai: getValue(order, 'deadline') || getValue(order, 'deliveryDate')
                                });
                                setIsModalOpen(true);
                              }}
                              className="px-4 py-2 bg-black text-white rounded-xl text-[10px] font-bold uppercase tracking-wider shadow-sm"
                            >
                              Buat SPK
                            </button>
                          </div>
                        </div>
                      );
                    });
                  })()}
                </div>
              </Card>

              <Card title="Draf SPK" subtitle="SPK terencana menunggu persetujuan untuk mulai produksi">
                {/* Desktop Table View */}
                <div className="hidden md:block overflow-x-auto">
                  <table className="w-full text-left">
                    <thead>
                      <tr className="border-b border-gray-100">
                        <th className="pb-4 font-semibold text-sm text-gray-500">SPK</th>
                        <th className="pb-4 font-semibold text-sm text-gray-500">Referensi PO</th>
                        <th className="pb-4 font-semibold text-sm text-gray-500">Pelanggan</th>
                        <th className="pb-4 font-semibold text-sm text-gray-500">Produk</th>
                        <th className="pb-4 font-semibold text-sm text-gray-500">Target Qty</th>
                        <th className="pb-4 font-semibold text-sm text-gray-500">Tenggat Waktu</th>
                        <th className="pb-4 font-semibold text-sm text-gray-500 text-right">Aksi</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-gray-50">
                      {(() => {
                        const draftSpks = filteredSpks.filter(spk => spk.status === 'Planned');

                        if (draftSpks.length === 0) {
                          return (
                            <tr>
                              <td colSpan={7} className="py-20 text-center text-gray-500">
                                {searchQuery ? `Tidak ada draf SPK cocok dengan "${searchQuery}".` : 'Tidak ada draf SPK.'}
                              </td>
                            </tr>
                          );
                        }

                        return draftSpks.map((spk) => (
                          <tr key={spk.id} className="hover:bg-gray-50/50 transition-colors">
                            <td className="py-4 text-sm font-bold text-gray-900">{spk.id?.substring(0, 3)}</td>
                            <td className="py-4 text-sm text-gray-600">{spk.po || spk.orderId}</td>
                            <td className="py-4 text-sm text-gray-600">
                              {(() => {
                                const orderId = getValue(spk, 'orderId');
                                const order = findOrder(orderId);
                                const customerId = getValue(spk, 'customerId') || (order ? getValue(order, 'customerId') : '');
                                const customer = findCustomer(customerId);
                                const name = customer?.name || getValue(order, 'customerName') || 'Unknown';
                                const company = customer?.company || '';
                                const clientName = company ? `${name} (${company})` : name;
                                return (
                                  <div className="flex flex-col">
                                    <span>{clientName}</span>
                                    <span className="text-[10px] text-gray-400 font-medium mt-0.5">ID: {customerId || '-'}</span>
                                  </div>
                                );
                              })()}
                            </td>
                            <td className="py-4 text-sm text-gray-600">{spk.productName}</td>
                            <td className="py-4 text-sm text-gray-600">{spk.targetQty} pcs</td>
                            <td className="py-4 text-sm text-gray-600">{spk.tanggalSelesai || spk.targetDate}</td>
                            <td className="py-4 text-right">
                              <button
                                onClick={async () => {
                                  try {
                                    setLoading(true);
                                    await sheetsService.update('SPK_Produksi', spk.id, { status: 'In Progress' });
                                    fetchData();
                                  } catch (error) {
                                    console.error('Error activating SPK:', error);
                                    alert('Gagal mengaktifkan SPK');
                                    setLoading(false);
                                  }
                                }}
                                className="px-4 py-2 bg-teal-600 text-white rounded-lg text-xs font-semibold hover:bg-teal-700 transition-colors"
                              >
                                Aktifkan SPK
                              </button>
                            </td>
                          </tr>
                        ));
                      })()}
                    </tbody>
                  </table>
                </div>

                {/* Mobile Card View */}
                <div className="md:hidden space-y-4">
                  {(() => {
                    const draftSpks = filteredSpks.filter(spk => spk.status === 'Planned');

                    if (draftSpks.length === 0) {
                      return (
                        <div className="py-10 text-center text-gray-500 text-sm">
                          {searchQuery ? `Tidak ada draf SPK cocok dengan "${searchQuery}".` : 'Tidak ada draf SPK.'}
                        </div>
                      );
                    }

                    return draftSpks.map((spk) => {
                      const orderId = getValue(spk, 'orderId');
                      const order = findOrder(orderId);
                      const customerId = getValue(spk, 'customerId') || (order ? getValue(order, 'customerId') : '');
                      const customer = findCustomer(customerId);
                      const name = customer?.name || getValue(order, 'customerName') || 'Unknown';
                      const company = customer?.company || '';
                      const clientInfo = company ? `${name} (${company})` : name;

                      return (
                        <div key={spk.id} className="p-4 bg-gray-50 rounded-2xl border border-gray-100 space-y-3">
                          <div className="flex justify-between items-start">
                            <div>
                              <p className="text-[10px] font-bold text-teal-600 uppercase tracking-wider">{spk.id?.substring(0, 3)}</p>
                              <div className="flex flex-col">
                                <p className="text-sm font-bold text-gray-900">{clientInfo}</p>
                                <p className="text-[10px] text-gray-400 font-medium">ID: {customerId || '-'}</p>
                              </div>
                            </div>
                            <span className="px-2 py-1 bg-orange-100 text-orange-700 rounded-lg text-[10px] font-bold uppercase tracking-wider">Draf</span>
                          </div>
                          <div className="grid grid-cols-2 gap-4 py-2 border-y border-gray-200/50">
                            <div>
                              <p className="text-[10px] font-bold text-gray-400 uppercase tracking-wider">Produk</p>
                              <p className="text-xs font-semibold text-gray-700">{spk.productName}</p>
                            </div>
                            <div>
                              <p className="text-[10px] font-bold text-gray-400 uppercase tracking-wider">Target</p>
                              <p className="text-xs font-semibold text-gray-700">{spk.targetQty} pcs</p>
                            </div>
                          </div>
                          <div className="flex justify-between items-center">
                            <p className="text-[10px] text-gray-400">Deadline: {spk.tanggalSelesai || spk.targetDate}</p>
                            <button
                              onClick={async () => {
                                try {
                                  setLoading(true);
                                  await sheetsService.update('SPK_Produksi', spk.id, { status: 'In Progress' });
                                  fetchData();
                                } catch (error) {
                                  console.error('Error activating SPK:', error);
                                  alert('Gagal mengaktifkan SPK');
                                  setLoading(false);
                                }
                              }}
                              className="px-4 py-2 bg-teal-600 text-white rounded-xl text-[10px] font-bold uppercase tracking-wider shadow-sm"
                            >
                              Aktifkan
                            </button>
                          </div>
                        </div>
                      );
                    });
                  })()}
                </div>
              </Card>
            </div>
          )}

          {activeTab === 'spk' && (
            <Card title="Produksi SPK Aktif" subtitle="Daftar semua pesanan produksi yang sedang berjalan">
              {/* Desktop Table View */}
              <div className="hidden md:block overflow-x-auto">
                <table className="w-full text-left">
                  <thead>
                    <tr className="border-b border-gray-100">
                      <th className="pb-4 font-semibold text-sm text-gray-500">SPK</th>
                      <th className="pb-4 font-semibold text-sm text-gray-500">Referensi PO</th>
                      <th className="pb-4 font-semibold text-sm text-gray-500">Pelanggan</th>
                      <th className="pb-4 font-semibold text-sm text-gray-500">Produk</th>
                      <th className="pb-4 font-semibold text-sm text-gray-500">Bahan</th>
                      <th className="pb-4 font-semibold text-sm text-gray-500">Tenggat Waktu</th>
                      <th className="pb-4 font-semibold text-sm text-gray-500">Status</th>
                      <th className="pb-4 font-semibold text-sm text-gray-500 text-right">Aksi</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-50">
                    {filteredSpks.filter(s => s.status !== 'Planned').length > 0 ? filteredSpks.filter(s => s.status !== 'Planned').map((spk, index) => (
                      <React.Fragment key={`${spk.id || index}-${index}`}>
                        <tr className="hover:bg-gray-50/50 transition-colors">
                          <td className="py-4 text-sm font-bold text-gray-900">{spk.id?.substring(0, 3)}</td>
                          <td className="py-4 text-sm text-gray-600">{spk.po || spk.orderId}</td>
                          <td className="py-4 text-sm text-gray-600">
                            {(() => {
                              const orderId = getValue(spk, 'orderId');
                              const order = findOrder(orderId);
                              const customerId = getValue(spk, 'customerId') || (order ? getValue(order, 'customerId') : '');
                              const customer = findCustomer(customerId);
                              const name = customer?.name || getValue(order, 'customerName') || 'Unknown';
                              const company = customer?.company || '';
                              const clientName = company ? `${name} (${company})` : name;
                              return (
                                <div className="flex flex-col">
                                  <span>{clientName}</span>
                                  <span className="text-[10px] text-gray-400 font-medium mt-0.5">ID: {customerId || '-'}</span>
                                </div>
                              );
                            })()}
                          </td>
                          <td className="py-4 text-sm text-gray-600">{spk.productName}</td>
                          <td className="py-4 text-sm text-gray-600">{spk.material}</td>
                          <td className="py-4 text-sm text-gray-600">{formatDate(spk.tanggalSelesai || spk.targetDate)}</td>
                          <td className="py-4">
                            <span className={cn(
                              "px-3 py-1 rounded-full text-[10px] font-bold uppercase tracking-wider",
                              spk.status === 'Completed' ? "bg-green-100 text-green-700" : "bg-teal-100 text-teal-700"
                            )}>
                              {spk.status || 'In Progress'}
                            </span>
                          </td>
                          <td className="py-4 text-right">
                            <div className="flex items-center justify-end gap-2">
                              <button
                                onClick={() => handleEdit(spk)}
                                className="p-2 hover:bg-gray-50 text-gray-600 rounded-lg transition-colors"
                                title="Edit SPK"
                              >
                                <FileText size={18} />
                              </button>
                              <button
                                onClick={() => generatePDF(spk)}
                                disabled={isGeneratingPdf === spk.id}
                                className={cn(
                                  "p-2 rounded-lg transition-colors",
                                  isGeneratingPdf === spk.id ? "bg-teal-100 text-teal-700 cursor-wait" : "hover:bg-teal-50 text-teal-600"
                                )}
                                title="Download PDF SPK (2 Halaman)"
                              >
                                {isGeneratingPdf === spk.id ? <Loader2 size={18} className="animate-spin" /> : <Download size={18} />}
                              </button>
                              <button
                                onClick={() => handleDelete(spk.id)}
                                className="p-2 hover:bg-red-50 text-red-600 rounded-lg transition-colors"
                                title="Hapus SPK"
                              >
                                <Trash2 size={18} />
                              </button>
                            </div>
                          </td>
                        </tr>
                      </React.Fragment>
                    )) : (
                      <tr>
                        <td colSpan={9} className="py-20 text-center text-gray-500">
                          {searchQuery ? `Tidak ada SPK cocok dengan "${searchQuery}".` : 'Tidak ada SPK aktif.'}
                        </td>
                      </tr>
                    )}
                  </tbody>
                </table>
              </div>

              {/* Mobile Card View */}
              <div className="md:hidden space-y-4">
                {filteredSpks.filter(s => s.status !== 'Planned').length > 0 ? filteredSpks.filter(s => s.status !== 'Planned').map((spk, index) => {
                  return (
                    <div key={`${spk.id || index}-${index}`} className="p-4 bg-gray-50 rounded-2xl border border-gray-100 space-y-4">
                      <div className="flex justify-between items-start">
                        <div>
                          <p className="text-xs font-bold text-teal-600 uppercase tracking-wider">{spk.id}</p>
                          <div className="flex flex-col">
                            <p className="text-sm font-bold text-gray-900">
                              {(() => {
                                const orderId = getValue(spk, 'orderId');
                                const order = findOrder(orderId);
                                const customerId = getValue(spk, 'customerId') || (order ? getValue(order, 'customerId') : '');
                                const customer = findCustomer(customerId);
                                const name = customer?.name || getValue(order, 'customerName') || 'Unknown';
                                const company = customer?.company || '';
                                return company ? `${name} (${company})` : name;
                              })()}
                            </p>
                            <p className="text-[10px] text-gray-400 font-medium mt-0.5">
                              ID: {(() => {
                                const orderId = getValue(spk, 'orderId');
                                const order = findOrder(orderId);
                                return getValue(spk, 'customerId') || (order ? getValue(order, 'customerId') : '-');
                              })()}
                            </p>
                          </div>
                        </div>
                        <span className={cn(
                          "px-2 py-1 rounded-lg text-[10px] font-bold uppercase tracking-wider",
                          spk.status === 'Completed' ? "bg-green-100 text-green-700" : "bg-teal-100 text-teal-700"
                        )}>
                          {spk.status || 'In Progress'}
                        </span>
                      </div>

                      <div className="grid grid-cols-2 gap-4 py-3 border-y border-gray-200/50">
                        <div>
                          <p className="text-[10px] font-bold text-gray-400 uppercase tracking-wider">Produk</p>
                          <p className="text-xs font-semibold text-gray-700">{spk.productName}</p>
                        </div>
                        <div>
                          <p className="text-[10px] font-bold text-gray-400 uppercase tracking-wider">Bahan</p>
                          <p className="text-xs font-semibold text-gray-700">{spk.material}</p>
                        </div>
                      </div>

                      <div className="flex items-center justify-between">
                        <div>
                          <p className="text-[10px] text-gray-400 mt-1">Deadline: {formatDate(spk.tanggalSelesai || spk.targetDate)}</p>
                        </div>
                        <div className="flex items-center gap-2">
                          <button
                            onClick={() => handleEdit(spk)}
                            className="p-3 bg-white border border-gray-100 text-gray-600 rounded-xl shadow-xs"
                            title="Edit SPK"
                          >
                            <FileText size={20} />
                          </button>
                          <button
                            onClick={() => generatePDF(spk)}
                            disabled={isGeneratingPdf === spk.id}
                            className={cn(
                              "p-3 bg-white border border-teal-100 text-teal-600 rounded-xl shadow-xs transition-colors",
                              isGeneratingPdf === spk.id && "bg-teal-50 cursor-wait"
                            )}
                            title="Download PDF SPK (2 Halaman)"
                          >
                            {isGeneratingPdf === spk.id ? <Loader2 size={20} className="animate-spin" /> : <Download size={20} />}
                          </button>
                          <button
                            onClick={() => handleDelete(spk.id)}
                            className="p-3 bg-white border border-red-100 text-red-600 rounded-xl shadow-xs"
                            title="Hapus SPK"
                          >
                            <Trash2 size={20} />
                          </button>
                        </div>
                      </div>
                    </div>
                  );
                }) : (
                  <div className="py-10 text-center text-gray-500 text-sm">
                    {searchQuery ? `Tidak ada SPK cocok dengan "${searchQuery}".` : 'Tidak ada SPK aktif.'}
                  </div>
                )}
              </div>
            </Card>
          )}
        </>
      )}

      <Modal
        isOpen={isModalOpen}
        onClose={() => setIsModalOpen(false)}
        title="Buat SPK Produksi Baru"
      >
        <form onSubmit={handleSubmit} className="space-y-6 max-h-[80vh] overflow-y-auto pr-2">
          {isEditMode && (
            <div className="p-4 bg-teal-50 rounded-2xl border border-teal-100 flex items-center gap-3">
              <div className="w-10 h-10 rounded-xl bg-teal-600 flex items-center justify-center text-white">
                <FileText size={20} />
              </div>
              <div>
                <p className="text-sm font-bold text-teal-900">Mode Edit SPK: {editingId}</p>
                <p className="text-[10px] text-teal-600 font-medium">Anda sedang mengubah data SPK yang sudah ada.</p>
              </div>
            </div>
          )}
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <label className="text-xs font-bold text-gray-400 uppercase tracking-wider">ID Penawaran</label>
              <select
                required
                value={formData.orderId}
                onChange={(e) => {
                  const selectedOrderId = e.target.value;
                  const order = findOrder(selectedOrderId);
                  if (order) {
                    let orderSizeChart = formData.sizeChart;
                    if (order.sizeChart) {
                      try {
                        orderSizeChart = normalizeTableData(order.sizeChart);
                      } catch (err) { }
                    }
                    setFormData({
                      ...formData,
                      orderId: selectedOrderId,
                      material: getValue(order, 'material') || formData.material,
                      tanggalSelesai: getValue(order, 'deadline') || getValue(order, 'deliveryDate') || formData.tanggalSelesai,
                      sizeChart: orderSizeChart
                    });
                  } else {
                    setFormData({ ...formData, orderId: selectedOrderId });
                  }
                }}
                className="w-full p-3 bg-gray-50 border-none rounded-xl text-sm focus:ring-2 focus:ring-teal-500/20"
              >
                <option value="">Pilih Penawaran / Order</option>
                {availableOrders.map(order => {
                  const orderId = getValue(order, 'id');
                  const customerId = getValue(order, 'customerId');
                  const customerName = getValue(order, 'customerName');
                  return (
                    <option key={orderId} value={orderId}>
                      {customerId ? `${customerId} - ` : ''}{customerName || 'Unknown'} (Order: {orderId})
                    </option>
                  );
                })}
              </select>
            </div>
            <div className="space-y-2">
              <label className="text-xs font-bold text-gray-400 uppercase tracking-wider">Referensi PO</label>
              <input
                type="text"
                value={formData.po}
                onChange={(e) => setFormData({ ...formData, po: e.target.value })}
                placeholder="Nomor PO"
                className="w-full p-3 bg-gray-50 border-none rounded-xl text-sm focus:ring-2 focus:ring-teal-500/20"
              />
            </div>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <label className="text-xs font-bold text-gray-400 uppercase tracking-wider">Bahan</label>
              <input
                type="text"
                value={formData.material}
                onChange={(e) => setFormData({ ...formData, material: e.target.value })}
                placeholder="misal: Cotton Combed 30s"
                className="w-full p-3 bg-gray-50 border-none rounded-xl text-sm focus:ring-2 focus:ring-teal-500/20"
              />
            </div>
            <div className="space-y-2">
              <label className="text-xs font-bold text-gray-400 uppercase tracking-wider">Sablon / Bordir</label>
              <input
                type="text"
                value={formData.sablonBordir}
                onChange={(e) => setFormData({ ...formData, sablonBordir: e.target.value })}
                placeholder="misal: Plastisol / Bordir Komputer"
                className="w-full p-3 bg-gray-50 border-none rounded-xl text-sm focus:ring-2 focus:ring-teal-500/20"
              />
            </div>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <label className="text-xs font-bold text-gray-400 uppercase tracking-wider">Tgl Masuk</label>
              <input
                required
                type="date"
                value={formData.tanggalMasuk}
                onChange={(e) => setFormData({ ...formData, tanggalMasuk: e.target.value })}
                className="w-full p-3 bg-gray-50 border-none rounded-xl text-sm focus:ring-2 focus:ring-teal-500/20"
              />
            </div>
            <div className="space-y-2">
              <label className="text-xs font-bold text-gray-400 uppercase tracking-wider">Tgl Selesai</label>
              <input
                required
                type="date"
                value={formData.tanggalSelesai}
                onChange={(e) => setFormData({ ...formData, tanggalSelesai: e.target.value })}
                className="w-full p-3 bg-gray-50 border-none rounded-xl text-sm focus:ring-2 focus:ring-teal-500/20"
              />
            </div>
          </div>

          {/* Dynamic Custom Matrix Table */}
          <CustomTableBuilder
            value={formData.sizeChart}
            onChange={(newChart) => setFormData(prev => ({ ...prev, sizeChart: newChart }))}
          />

          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <label className="text-xs font-bold text-gray-400 uppercase tracking-wider">Mockup Depan</label>
              <select
                value={formData.mockupDepan}
                onChange={(e) => setFormData({ ...formData, mockupDepan: e.target.value })}
                className="w-full p-3 bg-gray-50 border-none rounded-xl text-sm focus:ring-2 focus:ring-teal-500/20"
              >
                <option value="">Pilih Desain/Sampel</option>
                {[...designs, ...samples].map(item => (
                  <option key={item.id} value={item.imageUrl || item.image || ''}>{item.name}</option>
                ))}
              </select>
            </div>
            <div className="space-y-2">
              <label className="text-xs font-bold text-gray-400 uppercase tracking-wider">Mockup Belakang</label>
              <select
                value={formData.mockupBelakang}
                onChange={(e) => setFormData({ ...formData, mockupBelakang: e.target.value })}
                className="w-full p-3 bg-gray-50 border-none rounded-xl text-sm focus:ring-2 focus:ring-teal-500/20"
              >
                <option value="">Pilih Desain/Sampel</option>
                {[...designs, ...samples].map(item => (
                  <option key={item.id} value={item.imageUrl || item.image || ''}>{item.name}</option>
                ))}
              </select>
            </div>
          </div>

          <div className="grid grid-cols-3 gap-4">
            <div className="space-y-2">
              <label className="text-xs font-bold text-gray-400 uppercase tracking-wider">PJ Cutting</label>
              <input
                type="text"
                value={formData.pjCutting}
                onChange={(e) => setFormData({ ...formData, pjCutting: e.target.value })}
                className="w-full p-3 bg-gray-50 border-none rounded-xl text-sm focus:ring-2 focus:ring-teal-500/20"
              />
            </div>
            <div className="space-y-2">
              <label className="text-xs font-bold text-gray-400 uppercase tracking-wider">PJ Finishing</label>
              <input
                type="text"
                value={formData.pjFinishing}
                onChange={(e) => setFormData({ ...formData, pjFinishing: e.target.value })}
                className="w-full p-3 bg-gray-50 border-none rounded-xl text-sm focus:ring-2 focus:ring-teal-500/20"
              />
            </div>
            <div className="space-y-2">
              <label className="text-xs font-bold text-gray-400 uppercase tracking-wider">Kepala Produksi</label>
              <input
                type="text"
                value={formData.pjKepalaProduksi}
                onChange={(e) => setFormData({ ...formData, pjKepalaProduksi: e.target.value })}
                className="w-full p-3 bg-gray-50 border-none rounded-xl text-sm focus:ring-2 focus:ring-teal-500/20"
              />
            </div>
          </div>

          <div className="space-y-2">
            <label className="text-xs font-bold text-gray-400 uppercase tracking-wider">Catatan Produksi</label>
            <textarea
              value={formData.notes}
              onChange={(e) => setFormData({ ...formData, notes: e.target.value })}
              placeholder="Instruksi khusus untuk tim produksi..."
              className="w-full p-3 bg-gray-50 border-none rounded-xl text-sm focus:ring-2 focus:ring-teal-500/20 min-h-[80px]"
            />
          </div>

          <div className="pt-4 flex justify-end gap-4 sticky bottom-0 bg-white pb-2">
            <button
              type="button"
              onClick={() => {
                setIsModalOpen(false);
                setIsEditMode(false);
                setEditingId(null);
                setFormData(initialFormData);
              }}
              className="px-6 py-2.5 text-sm font-semibold text-gray-500 hover:text-gray-900"
            >
              Batal
            </button>
            {!isEditMode && (
              <button
                type="submit"
                onClick={() => setSubmitStatus('Planned')}
                className="px-6 py-2.5 bg-gray-100 text-gray-700 rounded-2xl text-sm font-semibold hover:bg-gray-200 transition-all"
              >
                Tambahkan ke Perencanaan
              </button>
            )}
            <button
              type="submit"
              onClick={() => setSubmitStatus('In Progress')}
              className="px-8 py-2.5 bg-black text-white rounded-2xl text-sm font-semibold shadow-lg shadow-black/10 hover:bg-gray-800 transition-all"
            >
              {isEditMode ? "Simpan Perubahan" : "Buat SPK"}
            </button>
          </div>
        </form>
      </Modal>

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
          const orderId = getValue(spk, 'orderId');
          const order = findOrder(orderId);
          const customerId = getValue(spk, 'customerId') || (order ? getValue(order, 'customerId') : '');
          const customer = findCustomer(customerId);
          const clientName = customer?.name || getValue(order, 'customerName') || spk.customerName || '-';

          return (
            <React.Fragment key={`${spk.id || index}-${index}`}>
              {/* PAGE 1: SPK INFO, SIZE CHART & MOCKUPS */}
              <div
                id={`spk-template-${spk.id}-page1`}
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
                    {spk.po || orderId || '-'}
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
                        {spk.productName ? `Produk: ${spk.productName}` : 'Upload file mockup depan/belakang di form edit SPK.'}
                      </p>
                    </div>
                  )}
                </div>
              </div>

              {/* PAGE 2: CATATAN PRODUKSI, MONITORING & TANDA TANGAN */}
              <div
                id={`spk-template-${spk.id}-page2`}
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
                {/* Top 3 Info Boxes on Page 2 (Values placed below pre-printed headers) */}
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

                  {/* Gambar 1: Footer Info inside Catatan */}
                  <div style={{ textAlign: 'center' }}>
                    <p style={{ fontSize: '16px', color: '#94a3b8', margin: 0 }}>
                      Dokumen SPK ini dibuat otomatis oleh ERP PT Hasil Inti Jualan pada {new Date().toLocaleDateString('id-ID', { day: 'numeric', month: 'long', year: 'numeric' })}.
                    </p>
                  </div>
                </div>

                {/* SIGNATURE BOXES: Left completely blank for manual signature & stamp as requested */}
              </div>
            </React.Fragment>
          );
        })}
      </div>
    </div>
  );
};
