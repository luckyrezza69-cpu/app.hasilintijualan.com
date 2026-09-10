import React, { useState, useEffect } from 'react';
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
  Calculator,
  Send,
  Download,
  X,
  Loader2,
  Check,
  XCircle,
  FileCheck,
  Play,
  Truck,
  PackageCheck,
  Trash2,
  Table,
  FileSpreadsheet,
  Edit3,
  Percent,
  DollarSign
} from 'lucide-react';
import { cn, formatCurrency, generateId, terbilang } from '../lib/utils';
import { motion } from 'motion/react';
import { sheetsService } from '../services/googleService';
import { Modal } from './ui/Modal';
import { CustomTableBuilder, DynamicTableData, TABLE_PRESETS } from './ui/CustomTableBuilder';
import { CustomTableViewer } from './ui/CustomTableViewer';
import { SOPModule } from '../types';
import jsPDF from 'jspdf';
import html2canvas from 'html2canvas';
import { QUOTATION_BG, STAMP_HIJ, TTD_HIJ } from '../assets/quotationTemplates';
import { INVOICE_BG } from '../assets/invoiceTemplates';

interface OrdersModuleProps {
  onNavigate?: (module: SOPModule) => void;
}

export const OrdersModule: React.FC<OrdersModuleProps> = ({ onNavigate }) => {
  const [activeTab, setActiveTab] = useState<'quotations' | 'orders'>('quotations');
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingItem, setEditingItem] = useState<any | null>(null);
  const [isDeleteModalOpen, setIsDeleteModalOpen] = useState(false);
  const [selectedItemForTable, setSelectedItemForTable] = useState<any>(null);
  const [itemToDelete, setItemToDelete] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [data, setData] = useState<any[]>([]);
  const [customers, setCustomers] = useState<any[]>([]);
  const [searchQuery, setSearchQuery] = useState('');
  const [isGeneratingPdf, setIsGeneratingPdf] = useState<string | null>(null);
  const [convertingQuotation, setConvertingQuotation] = useState<any | null>(null);

  // Helper to get value from object with case-insensitive key and common aliases
  const getValue = (obj: any, key: string) => {
    if (!obj) return '';
    const normalizedKey = key.toLowerCase().replace(/\s/g, '');
    
    // Define aliases for common fields
    const aliases: Record<string, string[]> = {
      customername: ['customername', 'namacustomer', 'customer', 'nama', 'client'],
      producttype: ['producttype', 'product', 'produk', 'namaproduk', 'item'],
      totalprice: ['totalprice', 'total', 'hargatotal', 'harga', 'value', 'amount'],
      status: ['status', 'kondisi', 'keterangan', 'state'],
      quantity: ['quantity', 'qty', 'jumlah', 'pcs', 'vol'],
      id: ['id', 'no', 'kode', 'identity', 'key'],
      material: ['material', 'bahan', 'kain', 'tipebahan'],
      pricebelowmoq: ['pricebelowmoq', 'hargadibawahmoq', 'dibawahmoq', 'belowmoq'],
      size: ['size', 'ukuran', 'sizes', 'sizechart'],
      discount: ['discount', 'diskon', 'potongan', 'discountsample'],
      downpayment: ['downpayment', 'dp', 'uangmuka', 'uang_muka'],
      dppercent: ['dppercent', 'persendp', 'persentasedp', 'percentdp'],
      discountpercent: ['discountpercent', 'persendiskon', 'persentasediskon'],
      moq: ['moq', 'minimalmoq', 'minmoq', 'jumlahmoq', 'moqqty']
    };

    const searchKeys = aliases[normalizedKey] || [normalizedKey];
    
    const actualKey = Object.keys(obj).find(k => {
      const nk = k.toLowerCase().replace(/\s/g, '');
      return searchKeys.includes(nk);
    });
    
    return actualKey ? obj[actualKey] : '';
  };

  const findCustomer = (customerId: any) => {
    if (!customerId) return null;
    const searchId = String(customerId).trim().toLowerCase();
    return customers.find(c => {
      const cid = String(c.id || getValue(c, 'id')).trim().toLowerCase();
      return cid === searchId;
    });
  };

  const formatDateIndonesian = (dateStr?: string) => {
    const months = [
      'Januari', 'Februari', 'Maret', 'April', 'Mei', 'Juni',
      'Juli', 'Agustus', 'September', 'Oktober', 'November', 'Desember'
    ];
    if (!dateStr) {
      const now = new Date();
      return `${now.getDate().toString().padStart(2, '0')} ${months[now.getMonth()]} ${now.getFullYear()}`;
    }
    try {
      const date = new Date(dateStr);
      if (isNaN(date.getTime())) return dateStr;
      return `${date.getDate().toString().padStart(2, '0')} ${months[date.getMonth()]} ${date.getFullYear()}`;
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
      'color', 'background-color', 'border-color', 'border-top-color',
      'border-bottom-color', 'border-left-color', 'border-right-color',
      'outline-color', 'text-decoration-color', 'fill', 'stroke'
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
      } catch (e) {}
    });
  };

  const generateQuotationPDF = async (quotation: any) => {
    const quoId = quotation.id || getValue(quotation, 'id') || 'Quotation';
    const el = document.getElementById(`quotation-template-${quoId}`);
    if (!el) {
      alert(`Template Penawaran ${quoId} tidak ditemukan.`);
      return;
    }

    try {
      setIsGeneratingPdf(quoId);
      const canvas = await html2canvas(el, {
        scale: 2,
        useCORS: true,
        allowTaint: true,
        logging: false,
        backgroundColor: '#ffffff',
        onclone: (clonedDoc) => {
          sanitizeColorsForHtml2Canvas(clonedDoc);
        }
      });

      const imgData = canvas.toDataURL('image/png');
      const pdf = new jsPDF('p', 'mm', 'a4');
      const pdfWidth = pdf.internal.pageSize.getWidth();
      const pdfHeight = pdf.internal.pageSize.getHeight();

      pdf.addImage(imgData, 'PNG', 0, 0, pdfWidth, pdfHeight);
      const cleanId = String(quoId).replace(/[\/\\?%*:|"<>]/g, '_');
      pdf.save(`Surat_Penawaran_${cleanId}.pdf`);
    } catch (error) {
      console.error('Error generating Quotation PDF:', error);
      alert('Gagal mengunduh dokumen penawaran.');
    } finally {
      setIsGeneratingPdf(null);
    }
  };

  const generateInvoicePDF = async (order: any) => {
    const ordId = order.id || getValue(order, 'id') || 'Invoice';
    const el = document.getElementById(`invoice-template-${ordId}`);
    if (!el) {
      alert(`Template Invoice ${ordId} tidak ditemukan.`);
      return;
    }

    try {
      setIsGeneratingPdf(ordId);
      const canvas = await html2canvas(el, {
        scale: 2,
        useCORS: true,
        allowTaint: true,
        logging: false,
        backgroundColor: '#ffffff',
        onclone: (clonedDoc) => {
          sanitizeColorsForHtml2Canvas(clonedDoc);
        }
      });

      const imgData = canvas.toDataURL('image/png');
      const pdf = new jsPDF('p', 'mm', 'a4');
      const pdfWidth = pdf.internal.pageSize.getWidth();
      const pdfHeight = pdf.internal.pageSize.getHeight();

      pdf.addImage(imgData, 'PNG', 0, 0, pdfWidth, pdfHeight);
      const cleanId = String(ordId).replace(/[\/\\?%*:|"<>]/g, '_');
      pdf.save(`Invoice_${cleanId}.pdf`);
    } catch (error) {
      console.error('Error generating Invoice PDF:', error);
      alert('Gagal mengunduh dokumen invoice.');
    } finally {
      setIsGeneratingPdf(null);
    }
  };

  const initialFormData = {
    id: '',
    customerId: '',
    productType: '',
    moq: 100,
    quantity: 100,
    price: 0,
    priceBelowMoq: 0,
    deadline: '',
    material: '',
    color: '',
    size: '',
    dpOption: '50',
    dpPercent: 50,
    downPayment: 0,
    discountOption: '0',
    discountPercent: 0,
    discount: 0,
    accessories: '',
    needsProcurement: 'Tanpa Pengadaan',
    sizeChart: TABLE_PRESETS[0].data
  };

  const [formData, setFormData] = useState(initialFormData);

  // Dynamic calculation helpers
  const handleQuantityPriceChange = (newQty: number, newPrice: number) => {
    const sub = newQty * newPrice;
    let newDp = formData.downPayment;
    if (formData.dpOption !== 'custom_nominal') {
      newDp = Math.round(sub * (formData.dpPercent / 100));
    }
    let newDisc = formData.discount;
    if (formData.discountOption !== 'custom_nominal') {
      newDisc = Math.round(sub * (formData.discountPercent / 100));
    }
    setFormData(prev => ({
      ...prev,
      quantity: newQty,
      price: newPrice,
      downPayment: newDp,
      discount: newDisc
    }));
  };

  const handleSelectDpPreset = (preset: string) => {
    const sub = formData.quantity * formData.price;
    if (preset === '0') {
      setFormData(prev => ({ ...prev, dpOption: '0', dpPercent: 0, downPayment: 0 }));
    } else if (preset === '30') {
      setFormData(prev => ({ ...prev, dpOption: '30', dpPercent: 30, downPayment: Math.round(sub * 0.3) }));
    } else if (preset === '50') {
      setFormData(prev => ({ ...prev, dpOption: '50', dpPercent: 50, downPayment: Math.round(sub * 0.5) }));
    } else if (preset === '70') {
      setFormData(prev => ({ ...prev, dpOption: '70', dpPercent: 70, downPayment: Math.round(sub * 0.7) }));
    } else if (preset === '100') {
      setFormData(prev => ({ ...prev, dpOption: '100', dpPercent: 100, downPayment: sub }));
    } else {
      setFormData(prev => ({ ...prev, dpOption: 'custom' }));
    }
  };

  const handleCustomDpPercent = (pct: number) => {
    const sub = formData.quantity * formData.price;
    const nominal = Math.round(sub * (pct / 100));
    setFormData(prev => ({
      ...prev,
      dpOption: 'custom',
      dpPercent: pct,
      downPayment: nominal
    }));
  };

  const handleCustomDpNominal = (nom: number) => {
    const sub = formData.quantity * formData.price;
    const pct = sub > 0 ? Number(((nom / sub) * 100).toFixed(1)) : 0;
    setFormData(prev => ({
      ...prev,
      dpOption: 'custom_nominal',
      dpPercent: pct,
      downPayment: nom
    }));
  };

  const handleSelectDiscountPreset = (preset: string) => {
    const sub = formData.quantity * formData.price;
    if (preset === '0') {
      setFormData(prev => ({ ...prev, discountOption: '0', discountPercent: 0, discount: 0 }));
    } else if (preset === '50') {
      setFormData(prev => ({ ...prev, discountOption: '50', discountPercent: 50, discount: Math.round(sub * 0.5) }));
    } else if (preset === '100') {
      setFormData(prev => ({ ...prev, discountOption: '100', discountPercent: 100, discount: sub }));
    } else {
      setFormData(prev => ({ ...prev, discountOption: 'custom' }));
    }
  };

  const handleCustomDiscountNominal = (nom: number) => {
    const sub = formData.quantity * formData.price;
    const pct = sub > 0 ? Number(((nom / sub) * 100).toFixed(1)) : 0;
    setFormData(prev => ({
      ...prev,
      discountOption: 'custom_nominal',
      discountPercent: pct,
      discount: nom
    }));
  };

  const handleOpenCreateModal = () => {
    setEditingItem(null);
    setConvertingQuotation(null);
    setFormData({
      ...initialFormData,
      id: ''
    });
    setIsModalOpen(true);
  };

  const handleOpenEditModal = (item: any) => {
    setEditingItem(item);
    setConvertingQuotation(null);
    const moq = Number(getValue(item, 'moq') || item.moq || 100);
    const q = Number(getValue(item, 'quantity') || item.quantity || moq);
    const p = Number(getValue(item, 'price') || item.price || 0);
    const pBelow = Number(getValue(item, 'priceBelowMoq') || getValue(item, 'pricebelowmoq') || item.priceBelowMoq || 0);
    const dp = Number(getValue(item, 'downPayment') || getValue(item, 'downpayment') || getValue(item, 'dp') || item.downPayment || 0);
    const disc = Number(getValue(item, 'discount') || item.discount || 0);
    const sub = q * p;
    const dpPct = item.dpPercent !== undefined && item.dpPercent !== '' 
      ? Number(item.dpPercent) 
      : (sub > 0 && dp > 0 ? Number(((dp / sub) * 100).toFixed(1)) : (dp > 0 ? 50 : 0));
    const discPct = item.discountPercent !== undefined && item.discountPercent !== '' 
      ? Number(item.discountPercent) 
      : (sub > 0 && disc > 0 ? Number(((disc / sub) * 100).toFixed(1)) : 0);

    let parsedSizeChart = TABLE_PRESETS[0].data;
    try {
      if (typeof item.sizeChart === 'string') {
        parsedSizeChart = JSON.parse(item.sizeChart || '[]');
      } else if (Array.isArray(item.sizeChart) || item.sizeChart?.headers) {
        parsedSizeChart = item.sizeChart;
      }
    } catch (e) {}

    setFormData({
      id: String(item.id || getValue(item, 'id') || ''),
      customerId: String(item.customerId || getValue(item, 'customerId') || ''),
      productType: String(item.productType || getValue(item, 'productType') || ''),
      moq: moq,
      quantity: q,
      price: p,
      priceBelowMoq: pBelow,
      deadline: String(item.deadline || getValue(item, 'deadline') || ''),
      material: String(item.material || getValue(item, 'material') || ''),
      color: String(item.color || getValue(item, 'color') || ''),
      size: String(item.size || getValue(item, 'size') || ''),
      dpOption: dpPct === 0 ? '0' : dpPct === 30 ? '30' : dpPct === 50 ? '50' : dpPct === 70 ? '70' : dpPct === 100 ? '100' : 'custom',
      dpPercent: dpPct,
      downPayment: dp,
      discountOption: discPct === 0 ? '0' : discPct === 50 ? '50' : discPct === 100 ? '100' : 'custom',
      discountPercent: discPct,
      discount: disc,
      accessories: String(item.accessories || getValue(item, 'accessories') || ''),
      needsProcurement: String(item.needsProcurement || getValue(item, 'needsProcurement') || 'Tanpa Pengadaan'),
      sizeChart: parsedSizeChart
    });
    setIsModalOpen(true);
  };

  const handleOpenConvertModal = (quotation: any) => {
    setEditingItem(null);
    setConvertingQuotation(quotation);
    
    const moq = Number(getValue(quotation, 'moq') || quotation.moq || 100);
    const q = Number(getValue(quotation, 'quantity') || quotation.quantity || moq);
    const p = Number(getValue(quotation, 'price') || quotation.price || 0);
    const pBelow = Number(getValue(quotation, 'priceBelowMoq') || quotation.priceBelowMoq || 0);
    
    // Automatically apply below MOQ price if order quantity is less than MOQ
    const effectivePrice = (q < moq && pBelow > 0) ? pBelow : p;
    const sub = q * effectivePrice;
    
    // Default DP 50%
    const defaultDpPct = 50;
    const defaultDp = Math.round(sub * 0.5);

    let parsedSizeChart = TABLE_PRESETS[0].data;
    try {
      if (typeof quotation.sizeChart === 'string') {
        parsedSizeChart = JSON.parse(quotation.sizeChart || '[]');
      } else if (Array.isArray(quotation.sizeChart) || quotation.sizeChart?.headers) {
        parsedSizeChart = quotation.sizeChart;
      }
    } catch (e) {}

    const qId = quotation.id || getValue(quotation, 'id') || getValue(quotation, 'no') || getValue(quotation, 'kode') || '';

    setFormData({
      id: generateId('ORD'),
      customerId: String(quotation.customerId || getValue(quotation, 'customerId') || ''),
      productType: String(quotation.productType || getValue(quotation, 'productType') || ''),
      moq: moq,
      quantity: q,
      price: effectivePrice,
      priceBelowMoq: pBelow,
      deadline: String(quotation.deadline || getValue(quotation, 'deadline') || ''),
      material: String(quotation.material || getValue(quotation, 'material') || ''),
      color: String(quotation.color || getValue(quotation, 'color') || ''),
      size: String(quotation.size || getValue(quotation, 'size') || ''),
      dpOption: '50',
      dpPercent: defaultDpPct,
      downPayment: defaultDp,
      discountOption: '0',
      discountPercent: 0,
      discount: 0,
      accessories: String(quotation.accessories || getValue(quotation, 'accessories') || ''),
      needsProcurement: String(quotation.needsProcurement || getValue(quotation, 'needsProcurement') || 'Tanpa Pengadaan'),
      sizeChart: parsedSizeChart
    });
    setIsModalOpen(true);
  };

  const fetchData = async () => {
    try {
      setLoading(true);
      const sheetName = activeTab === 'quotations' ? 'Quotations' : 'Orders';
      const [items, custs] = await Promise.all([
        sheetsService.getAll(sheetName),
        sheetsService.getAll('Customers')
      ]);
      setData(Array.isArray(items) ? items : []);
      setCustomers(Array.isArray(custs) ? custs : []);
    } catch (error) {
      console.error('Error fetching data:', error);
      setData([]);
      setCustomers([]);
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
      if (convertingQuotation) {
        const qId = convertingQuotation.id || getValue(convertingQuotation, 'id') || getValue(convertingQuotation, 'no') || getValue(convertingQuotation, 'kode');
        const customer = customers.find(c => c.id === formData.customerId) || findCustomer(formData.customerId);
        
        const newOrder = {
          ...formData,
          id: formData.id.trim() || generateId('ORD'),
          user: 'Admin HIJ',
          customerName: customer?.name || getValue(convertingQuotation, 'customerName') || 'Unknown',
          totalPrice: formData.quantity * formData.price,
          status: 'Order',
          quotationId: qId,
          sizeChart: JSON.stringify(formData.sizeChart),
          timestamp: new Date().toISOString()
        };
        
        // 1. Create Order in sheet 'Orders'
        await sheetsService.create('Orders', newOrder);
        
        // 2. Update Quotation status in sheet 'Quotations'
        if (qId) {
          await sheetsService.update('Quotations', qId, { status: 'Converted' });
        }
        
        alert(`Penawaran ${qId} berhasil di-ACC & dikonversi menjadi Pesanan ${newOrder.id}! Beralih ke menu Pesanan.`);
        
        setIsModalOpen(false);
        setConvertingQuotation(null);
        setEditingItem(null);
        setFormData(initialFormData);
        
        setActiveTab('orders');
        fetchData();
        return;
      }

      const sheetName = activeTab === 'quotations' ? 'Quotations' : 'Orders';
      const customer = customers.find(c => c.id === formData.customerId) || findCustomer(formData.customerId);
      
      const isQuotation = activeTab === 'quotations';
      const effectiveUnitPrice = isQuotation 
        ? (formData.quantity < (formData.moq || 100) && (formData.priceBelowMoq || 0) > 0 ? formData.priceBelowMoq : formData.price)
        : formData.price;

      const payload = {
        id: formData.id.trim(),
        user: 'Admin HIJ',
        customerName: customer?.name || 'Unknown',
        totalPrice: formData.quantity * effectiveUnitPrice,
        status: editingItem ? (editingItem.status || getValue(editingItem, 'status') || (activeTab === 'quotations' ? 'Sent' : 'Order')) : (activeTab === 'quotations' ? 'Sent' : 'Order'),
        ...formData,
        sizeChart: JSON.stringify(formData.sizeChart)
      };

      if (editingItem) {
        const editId = editingItem.id || getValue(editingItem, 'id');
        await sheetsService.update(sheetName, editId, payload);
        alert('Data berhasil diperbarui!');
      } else {
        await sheetsService.create(sheetName, {
          ...payload,
          timestamp: new Date().toISOString()
        });
      }
      
      setIsModalOpen(false);
      setEditingItem(null);
      setConvertingQuotation(null);
      setFormData(initialFormData);
      fetchData();
    } catch (error: any) {
      console.error('Submit Error:', error);
      alert(`Gagal menyimpan data: ${error.message || ''}`);
    }
  };

  const handleUpdateStatus = async (id: string, newStatus: string) => {
    if (!id) {
      alert('ID tidak ditemukan. Pastikan kolom ID/No/Kode di Google Sheets sudah terisi.');
      return;
    }
    try {
      const sheetName = activeTab === 'quotations' ? 'Quotations' : 'Orders';
      await sheetsService.update(sheetName, id, { status: newStatus });
      fetchData();
    } catch (error: any) {
      console.error('Update Error:', error);
      alert(`Gagal memperbarui status: ${error.response?.data?.error || error.message}`);
    }
  };

  const handleDeleteClick = (id: string) => {
    setItemToDelete(id);
    setIsDeleteModalOpen(true);
  };

  const confirmDelete = async () => {
    if (!itemToDelete) return;
    
    try {
      const sheetName = activeTab === 'quotations' ? 'Quotations' : 'Orders';
      await sheetsService.delete(sheetName, itemToDelete);
      fetchData();
      setIsDeleteModalOpen(false);
      setItemToDelete(null);
    } catch (error: any) {
      console.error('Delete Error:', error);
      alert(`Gagal menghapus data: ${error.response?.data?.error || error.message}`);
    }
  };

  const handleConvertToOrder = async (quotation: any) => {
    handleOpenConvertModal(quotation);
  };

  const filteredData = data.filter(item => {
    if (!searchQuery.trim()) return true;
    const q = searchQuery.toLowerCase().trim();
    const id = String(item.id || getValue(item, 'id') || getValue(item, 'no') || getValue(item, 'kode') || '').toLowerCase();
    const customerId = String(getValue(item, 'customerId') || '').toLowerCase();
    const customerName = String(getValue(item, 'customerName') || '').toLowerCase();
    const productType = String(getValue(item, 'productType') || getValue(item, 'product') || '').toLowerCase();
    const status = String(getValue(item, 'status') || '').toLowerCase();
    const material = String(getValue(item, 'material') || '').toLowerCase();
    const notes = String(getValue(item, 'notes') || '').toLowerCase();

    return id.includes(q) || customerId.includes(q) || customerName.includes(q) ||
           productType.includes(q) || status.includes(q) || material.includes(q) || notes.includes(q);
  });

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
          <h2 className="text-2xl font-bold text-gray-900">Pesanan & Penawaran</h2>
          <p className="text-sm text-gray-500">SOP 01: Kelola permintaan pelanggan, kalkulasi harga, dan form pesanan.</p>
        </div>
        <div className="flex flex-wrap items-center gap-2.5 w-full sm:w-auto">
          {onNavigate && (
            <button
              onClick={() => onNavigate('Import')}
              className="w-full sm:w-auto bg-teal-50 hover:bg-teal-100 text-teal-800 border border-teal-200 px-4 py-2.5 rounded-2xl text-sm font-semibold flex items-center justify-center gap-2 transition-all cursor-pointer shadow-2xs"
            >
              <FileSpreadsheet size={18} />
              <span>Import Excel / PO</span>
            </button>
          )}
          <button 
            onClick={handleOpenCreateModal}
            className="w-full sm:w-auto bg-black text-white px-6 py-2.5 rounded-2xl text-sm font-semibold flex items-center justify-center gap-2 hover:bg-gray-800 transition-all shadow-lg shadow-black/10 cursor-pointer"
          >
            <Plus size={18} />
            {activeTab === 'quotations' ? 'Penawaran Baru' : 'Pesanan Baru'}
          </button>
        </div>
      </div>

      <div className="flex flex-col sm:flex-row justify-between items-stretch sm:items-center gap-4">
        <div className="grid grid-cols-2 sm:flex sm:w-fit gap-1.5 p-1.5 bg-gray-100 rounded-2xl w-full sm:w-auto">
          {[
            { id: 'quotations', label: 'Penawaran' },
            { id: 'orders', label: 'Pesanan' }
          ].map((tab) => (
            <button
              key={tab.id}
              onClick={() => {
                setActiveTab(tab.id as 'quotations' | 'orders');
                setSearchQuery('');
              }}
              className={cn(
                "px-4 sm:px-6 py-2.5 rounded-xl text-sm font-semibold transition-all text-center justify-center cursor-pointer",
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
            placeholder={`Cari ${activeTab === 'quotations' ? 'penawaran' : 'pesanan'}, pelanggan, produk, status...`}
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
          <p className="text-gray-500 text-sm">Memuat {activeTab === 'quotations' ? 'Penawaran' : 'Pesanan'}...</p>
        </div>
      ) : (
        <Card>
          {/* Desktop Table View */}
          <div className="hidden md:block overflow-x-auto">
            <table className="w-full text-left border-collapse">
              <thead>
                <tr className="border-b border-gray-100">
                  <th className="pb-4 font-bold text-sm text-gray-400 uppercase tracking-widest whitespace-nowrap pr-4">ID Pelanggan</th>
                  <th className="pb-4 font-bold text-sm text-gray-400 uppercase tracking-widest whitespace-nowrap pr-4">Produk</th>
                  <th className="pb-4 font-bold text-sm text-gray-400 uppercase tracking-widest whitespace-nowrap pr-4">Jumlah</th>
                  <th className="pb-4 font-bold text-sm text-gray-400 uppercase tracking-widest whitespace-nowrap pr-4">Total Nilai</th>
                  <th className="pb-4 font-bold text-sm text-gray-400 uppercase tracking-widest whitespace-nowrap pr-4">Status</th>
                  <th className="pb-4 font-bold text-sm text-gray-400 uppercase tracking-widest whitespace-nowrap text-right">Aksi</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-50">
                {filteredData.length > 0 ? filteredData.map((item) => {
                  const status = String(getValue(item, 'status') || '').trim();
                  const customerId = getValue(item, 'customerId') || 'Unknown';
                  const productType = getValue(item, 'productType') || getValue(item, 'product') || '-';
                  const totalPrice = getValue(item, 'totalPrice') || getValue(item, 'total') || 0;
                  const id = item.id || getValue(item, 'id') || getValue(item, 'no') || getValue(item, 'kode');

                  return (
                    <tr key={id} className="hover:bg-gray-50/50 transition-colors">
                      <td className="py-4 text-sm text-gray-600 whitespace-nowrap pr-4 font-medium">{customerId}</td>
                      <td className="py-4 text-sm text-gray-900 whitespace-nowrap pr-4 font-bold">{productType}</td>
                      <td className="py-4 text-sm text-gray-600 whitespace-nowrap pr-4">{getValue(item, 'quantity') || 0} pcs</td>
                      <td className="py-4 text-sm text-teal-700 font-black whitespace-nowrap pr-4">{formatCurrency(Number(totalPrice))}</td>
                      <td className="py-4 whitespace-nowrap pr-4">
                        <span className={cn(
                          "px-3 py-1 rounded-full text-[10px] font-bold uppercase tracking-wider",
                          status === 'Approved' || status === 'Order' ? "bg-green-100 text-green-700" : 
                          status === 'Sent' ? "bg-teal-100 text-teal-700" : 
                          status === 'Converted' ? "bg-purple-100 text-purple-700" :
                          status === 'Rejected' ? "bg-red-100 text-red-700" :
                          status === 'Processing' ? "bg-yellow-100 text-yellow-700" :
                          status === 'Shipped' ? "bg-orange-100 text-orange-700" :
                          status === 'Completed' ? "bg-emerald-100 text-emerald-700" :
                          "bg-gray-100 text-gray-700"
                        )}>
                          {status || 'Pending'}
                        </span>
                      </td>
                      <td className="py-4 whitespace-nowrap text-right">
                        <div className="flex justify-end gap-1.5">
                          {activeTab === 'quotations' && (status === 'Sent' || status === 'Pending' || !status) && (
                            <>
                              <button 
                                onClick={() => handleOpenConvertModal(item)}
                                className="p-2 hover:bg-green-50 rounded-lg text-gray-400 hover:text-green-600 transition-colors"
                                title="Setujui (ACC) & Konversi ke Pesanan"
                              >
                                <Check size={16} />
                              </button>
                              <button 
                                onClick={() => handleUpdateStatus(id, 'Rejected')}
                                className="p-2 hover:bg-red-50 rounded-lg text-gray-400 hover:text-red-600 transition-colors"
                                title="Tolak"
                              >
                                <XCircle size={16} />
                              </button>
                            </>
                          )}
                          
                          {activeTab === 'quotations' && status === 'Approved' && (
                            <button 
                              onClick={() => handleOpenConvertModal(item)}
                              className="p-2 hover:bg-purple-50 rounded-lg text-purple-600 hover:text-purple-700 bg-purple-50/50 transition-colors"
                              title="Konversi ke Pesanan & Atur DP"
                            >
                              <FileCheck size={16} />
                            </button>
                          )}

                          {activeTab === 'orders' && (
                            <>
                              {(status === 'Order' || status === 'Pending') && (
                                <button 
                                  onClick={() => handleUpdateStatus(id, 'Processing')}
                                  className="p-2 hover:bg-teal-50 rounded-lg text-gray-400 hover:text-teal-600 transition-colors"
                                  title="Mulai Proses"
                                >
                                  <Play size={16} />
                                </button>
                              )}
                              {status === 'Processing' && (
                                <button 
                                  onClick={() => handleUpdateStatus(id, 'Shipped')}
                                  className="p-2 hover:bg-orange-50 rounded-lg text-gray-400 hover:text-orange-600 transition-colors"
                                  title="Kirim Pesanan"
                                >
                                  <Truck size={16} />
                                </button>
                              )}
                              {status === 'Shipped' && (
                                <button 
                                  onClick={() => handleUpdateStatus(id, 'Completed')}
                                  className="p-2 hover:bg-green-50 rounded-lg text-gray-400 hover:text-green-600 transition-colors"
                                  title="Selesaikan Pesanan"
                                >
                                  <PackageCheck size={16} />
                                </button>
                              )}
                            </>
                          )}

                          {item.sizeChart && (
                            <button 
                              onClick={() => setSelectedItemForTable(item)}
                              className="p-2 hover:bg-teal-50 rounded-lg text-teal-600 hover:text-teal-800 transition-colors" 
                              title="Lihat Tabel Ukuran & Jumlah"
                            >
                              <Table size={16} />
                            </button>
                          )}
                          <button 
                            onClick={() => alert(`Mengirim ${activeTab === 'quotations' ? 'Penawaran' : 'Pesanan'} ${id} ke pelanggan...`)}
                            className="p-2 hover:bg-gray-100 rounded-lg text-gray-400 hover:text-teal-600 transition-colors" 
                            title="Kirim"
                          >
                            <Send size={16} />
                          </button>
                          {activeTab === 'quotations' ? (
                            <button 
                              onClick={() => generateQuotationPDF(item)}
                              disabled={isGeneratingPdf === id}
                              className="p-2 hover:bg-teal-50 rounded-lg text-gray-400 hover:text-teal-700 transition-colors disabled:opacity-50" 
                              title="Unduh Surat Penawaran Harga (PDF)"
                            >
                              {isGeneratingPdf === id ? <Loader2 size={16} className="animate-spin text-teal-600" /> : <Download size={16} />}
                            </button>
                          ) : (
                            <button 
                              onClick={() => generateInvoicePDF(item)}
                              disabled={isGeneratingPdf === id}
                              className="p-2 hover:bg-teal-50 rounded-lg text-gray-400 hover:text-teal-700 transition-colors disabled:opacity-50" 
                              title="Unduh Invoice (PDF)"
                            >
                              {isGeneratingPdf === id ? <Loader2 size={16} className="animate-spin text-teal-600" /> : <Download size={16} />}
                            </button>
                          )}
                          <button 
                            onClick={() => handleOpenEditModal(item)}
                            className="p-2 hover:bg-blue-50 rounded-lg text-gray-400 hover:text-blue-600 transition-colors" 
                            title={`Edit ${activeTab === 'quotations' ? 'Penawaran' : 'Pesanan & DP'}`}
                          >
                            <Edit3 size={16} />
                          </button>
                          <button 
                            onClick={() => handleDeleteClick(id)}
                            className="p-2 hover:bg-red-50 rounded-lg text-gray-400 hover:text-red-600 transition-colors" 
                            title="Hapus"
                          >
                            <Trash2 size={16} />
                          </button>
                        </div>
                      </td>
                    </tr>
                  );
                }) : (
                  <tr>
                    <td colSpan={6} className="py-20 text-center text-gray-500 text-sm">
                      {searchQuery ? `Tidak ada ${activeTab === 'quotations' ? 'penawaran' : 'pesanan'} yang cocok dengan "${searchQuery}".` : `Tidak ada ${activeTab === 'quotations' ? 'penawaran' : 'pesanan'} ditemukan.`}
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>

          {/* Mobile Unified Card View */}
          <div className="md:hidden space-y-3">
            {filteredData.length > 0 ? filteredData.map((item) => {
              const status = String(getValue(item, 'status') || '').trim();
              const customerId = getValue(item, 'customerId') || 'Unknown';
              const productType = getValue(item, 'productType') || getValue(item, 'product') || '-';
              const totalPrice = getValue(item, 'totalPrice') || getValue(item, 'total') || 0;
              const id = item.id || getValue(item, 'id') || getValue(item, 'no') || getValue(item, 'kode');

              return (
                <div key={id} className="p-4 bg-gray-50 rounded-2xl border border-gray-100 space-y-3 shadow-sm">
                  <div className="flex items-start justify-between gap-2">
                    <div>
                      <span className="text-[10px] font-bold text-teal-700 bg-teal-50 px-2 py-0.5 rounded-md uppercase tracking-wider inline-block">
                        {customerId}
                      </span>
                      <h4 className="text-sm font-bold text-gray-900 mt-1">{productType}</h4>
                    </div>
                    <span className={cn(
                      "px-2.5 py-1 rounded-full text-[10px] font-bold uppercase tracking-wider whitespace-nowrap flex-shrink-0",
                      status === 'Approved' || status === 'Order' ? "bg-green-100 text-green-700" : 
                      status === 'Sent' ? "bg-teal-100 text-teal-700" : 
                      status === 'Converted' ? "bg-purple-100 text-purple-700" :
                      status === 'Rejected' ? "bg-red-100 text-red-700" :
                      status === 'Processing' ? "bg-yellow-100 text-yellow-700" :
                      status === 'Shipped' ? "bg-orange-100 text-orange-700" :
                      status === 'Completed' ? "bg-emerald-100 text-emerald-700" :
                      "bg-gray-100 text-gray-700"
                    )}>
                      {status || 'Pending'}
                    </span>
                  </div>

                  <div className="grid grid-cols-2 gap-2 py-2 border-y border-gray-200/60 text-xs">
                    <div>
                      <span className="text-[10px] text-gray-400 uppercase font-bold block">Jumlah</span>
                      <span className="font-semibold text-gray-800">{getValue(item, 'quantity') || 0} pcs</span>
                    </div>
                    <div>
                      <span className="text-[10px] text-gray-400 uppercase font-bold block">Total Harga</span>
                      <span className="font-black text-teal-700">{formatCurrency(Number(totalPrice))}</span>
                    </div>
                  </div>

                  <div className="flex items-center justify-between gap-2 pt-1 flex-wrap">
                    <div className="flex items-center gap-2">
                      {item.sizeChart && (
                        <button 
                          onClick={() => setSelectedItemForTable(item)}
                          className="px-2.5 py-1.5 bg-teal-50 text-teal-700 rounded-xl text-xs font-bold flex items-center gap-1 hover:bg-teal-100 transition-colors"
                        >
                          <Table size={13} />
                          <span>Tabel Ukuran</span>
                        </button>
                      )}
                    </div>
                    <div className="flex items-center gap-2">
                      {activeTab === 'quotations' && (status === 'Sent' || status === 'Pending' || !status) && (
                        <>
                          <button 
                            onClick={() => handleOpenConvertModal(item)}
                            className="px-3 py-1.5 bg-green-50 text-green-700 rounded-xl text-xs font-bold flex items-center gap-1 hover:bg-green-100"
                            title="Setujui (ACC) & Konversi ke Pesanan"
                          >
                            <Check size={14} />
                            <span>Setujui (ACC)</span>
                          </button>
                          <button 
                            onClick={() => handleUpdateStatus(id, 'Rejected')}
                            className="px-3 py-1.5 bg-red-50 text-red-700 rounded-xl text-xs font-bold flex items-center gap-1 hover:bg-red-100"
                            title="Tolak Penawaran"
                          >
                            <XCircle size={14} />
                            <span>Tolak</span>
                          </button>
                        </>
                      )}

                      {activeTab === 'quotations' && status === 'Approved' && (
                        <button 
                          onClick={() => handleOpenConvertModal(item)}
                          className="px-3 py-1.5 bg-purple-50 text-purple-700 rounded-xl text-xs font-bold flex items-center gap-1 hover:bg-purple-100"
                          title="Konversi ke Pesanan & Atur DP"
                        >
                          <FileCheck size={14} />
                          <span>Konversi Order</span>
                        </button>
                      )}

                      {activeTab === 'orders' && (
                        <>
                          {(status === 'Order' || status === 'Pending') && (
                            <button 
                              onClick={() => handleUpdateStatus(id, 'Processing')}
                              className="px-3 py-1.5 bg-teal-50 text-teal-700 rounded-xl text-xs font-bold flex items-center gap-1"
                              title="Mulai Proses"
                            >
                              <Play size={14} />
                              <span>Proses</span>
                            </button>
                          )}
                          {status === 'Processing' && (
                            <button 
                              onClick={() => handleUpdateStatus(id, 'Shipped')}
                              className="px-3 py-1.5 bg-orange-50 text-orange-700 rounded-xl text-xs font-bold flex items-center gap-1"
                              title="Kirim Pesanan"
                            >
                              <Truck size={14} />
                              <span>Kirim</span>
                            </button>
                          )}
                          {status === 'Shipped' && (
                            <button 
                              onClick={() => handleUpdateStatus(id, 'Completed')}
                              className="px-3 py-1.5 bg-green-50 text-green-700 rounded-xl text-xs font-bold flex items-center gap-1"
                              title="Selesaikan Pesanan"
                            >
                              <PackageCheck size={14} />
                              <span>Selesai</span>
                            </button>
                          )}
                        </>
                      )}

                      <button 
                        onClick={() => alert(`Mengirim ${activeTab === 'quotations' ? 'Penawaran' : 'Pesanan'} ${id} ke pelanggan...`)}
                        className="p-2 bg-gray-100 text-gray-600 rounded-xl hover:text-teal-600 transition-colors" 
                        title="Kirim"
                      >
                        <Send size={14} />
                      </button>
                      {activeTab === 'quotations' ? (
                        <button 
                          onClick={() => generateQuotationPDF(item)}
                          disabled={isGeneratingPdf === id}
                          className="p-2 bg-teal-50 text-teal-700 rounded-xl hover:bg-teal-100 transition-colors disabled:opacity-50" 
                          title="Unduh Surat Penawaran Harga (PDF)"
                        >
                          {isGeneratingPdf === id ? <Loader2 size={14} className="animate-spin text-teal-600" /> : <Download size={14} />}
                        </button>
                      ) : (
                        <button 
                          onClick={() => generateInvoicePDF(item)}
                          disabled={isGeneratingPdf === id}
                          className="p-2 bg-teal-50 text-teal-700 rounded-xl hover:bg-teal-100 transition-colors disabled:opacity-50" 
                          title="Unduh Invoice (PDF)"
                        >
                          {isGeneratingPdf === id ? <Loader2 size={14} className="animate-spin text-teal-600" /> : <Download size={14} />}
                        </button>
                      )}
                      <button 
                        onClick={() => handleOpenEditModal(item)}
                        className="p-2 bg-blue-50 text-blue-600 rounded-xl hover:bg-blue-100 transition-colors" 
                        title={`Edit ${activeTab === 'quotations' ? 'Penawaran' : 'Pesanan & DP'}`}
                      >
                        <Edit3 size={14} />
                      </button>
                      <button 
                        onClick={() => handleDeleteClick(id)}
                        className="p-2 bg-red-50 text-red-600 rounded-xl hover:bg-red-100 transition-colors" 
                        title="Hapus"
                      >
                        <Trash2 size={14} />
                      </button>
                    </div>
                  </div>
                </div>
              );
            }) : (
              <div className="py-12 text-center text-gray-500 text-sm">
                {searchQuery ? `Tidak ada ${activeTab === 'quotations' ? 'penawaran' : 'pesanan'} yang cocok dengan "${searchQuery}".` : `Tidak ada ${activeTab === 'quotations' ? 'penawaran' : 'pesanan'} ditemukan.`}
              </div>
            )}
          </div>
        </Card>
      )}

      <Modal 
        isOpen={isModalOpen} 
        onClose={() => {
          setIsModalOpen(false);
          setEditingItem(null);
          setConvertingQuotation(null);
        }} 
        title={
          convertingQuotation 
            ? `ACC Penawaran & Konversi ke Pesanan: ${convertingQuotation.id || getValue(convertingQuotation, 'id')}` 
            : editingItem 
            ? (activeTab === 'quotations' ? `Edit Penawaran: ${formData.id}` : `Edit Pesanan & DP: ${formData.id}`) 
            : (activeTab === 'quotations' ? 'Buat Penawaran Baru' : 'Buat Pesanan Baru')
        }
      >
        <form onSubmit={handleSubmit} className="space-y-6 max-h-[80vh] overflow-y-auto pr-2">
          {convertingQuotation && (
            <div className="p-4 bg-purple-50 border border-purple-200 rounded-2xl flex items-start gap-3 shadow-xs">
              <div className="p-2 bg-purple-100 text-purple-700 rounded-xl flex-shrink-0">
                <FileCheck size={20} />
              </div>
              <div className="text-xs">
                <p className="font-bold text-purple-900">Konfirmasi ACC & Pengaturan DP Pesanan</p>
                <p className="text-purple-700 mt-0.5 leading-relaxed">
                  Penawaran <span className="font-bold">{convertingQuotation.id || getValue(convertingQuotation, 'id')}</span> telah disetujui (ACC). Silakan sesuaikan jumlah pesanan, ukuran, dan tentukan Down Payment (DP) client di bawah ini. Setelah disimpan, pesanan langsung diterbitkan dan Anda akan dialihkan ke daftar Pesanan.
                </p>
              </div>
            </div>
          )}

          <div className="grid grid-cols-2 gap-6">
            <div className="space-y-2">
              <label className="text-xs font-bold text-gray-400 uppercase tracking-wider">
                {activeTab === 'quotations' && !convertingQuotation ? 'No. Surat / ID Penawaran' : 'ID Pesanan (Otomatis/Manual)'}
              </label>
              <input 
                required
                type="text" 
                value={formData.id}
                onChange={(e) => setFormData({...formData, id: e.target.value})}
                placeholder={activeTab === 'quotations' && !convertingQuotation ? 'misal: 007/HIJ/SPH/VII/2026 atau QUO-001' : 'misal: ORD-001'} 
                className="w-full p-3 bg-gray-50 border-none rounded-xl text-sm focus:ring-2 focus:ring-teal-500/20" 
              />
            </div>
            <div className="space-y-2">
              <label className="text-xs font-bold text-gray-400 uppercase tracking-wider">Pelanggan</label>
              <select 
                required
                value={formData.customerId}
                onChange={(e) => setFormData({...formData, customerId: e.target.value})}
                className="w-full p-3 bg-gray-50 border-none rounded-xl text-sm focus:ring-2 focus:ring-teal-500/20"
              >
                <option value="">Pilih Pelanggan</option>
                {customers.map(c => (
                  <option key={c.id} value={c.id}>{c.id} - {c.name}</option>
                ))}
              </select>
            </div>
          </div>

          <div className="grid grid-cols-2 gap-6">
            <div className="space-y-2">
              <label className="text-xs font-bold text-gray-400 uppercase tracking-wider">Tipe Produk / Item</label>
              <input 
                required
                type="text" 
                value={formData.productType}
                onChange={(e) => setFormData({...formData, productType: e.target.value})}
                placeholder="misal: Wearpack, Kemeja, Kaos" 
                className="w-full p-3 bg-gray-50 border-none rounded-xl text-sm focus:ring-2 focus:ring-teal-500/20" 
              />
            </div>
            <div className="space-y-2">
              <label className="text-xs font-bold text-gray-400 uppercase tracking-wider">Bahan / Material</label>
              <input 
                type="text" 
                value={formData.material}
                onChange={(e) => setFormData({...formData, material: e.target.value})}
                placeholder="misal: American drill, Katun Combed 30s" 
                className="w-full p-3 bg-gray-50 border-none rounded-xl text-sm focus:ring-2 focus:ring-teal-500/20" 
              />
            </div>
          </div>

          {activeTab === 'quotations' && !convertingQuotation ? (
            <div className="space-y-4">
              <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-3">
                <div className="space-y-1.5">
                  <label className="text-[11px] font-bold text-gray-500 uppercase tracking-wider block">Minimal MOQ (Pcs)</label>
                  <input 
                    required
                    type="number" 
                    min="1"
                    value={formData.moq || ''}
                    onChange={(e) => setFormData({...formData, moq: Number(e.target.value)})}
                    placeholder="100" 
                    className="w-full p-2.5 bg-gray-50 border border-gray-200 rounded-xl text-xs sm:text-sm font-bold text-gray-900 focus:ring-2 focus:ring-teal-500/20 outline-none" 
                  />
                </div>
                <div className="space-y-1.5">
                  <label className="text-[11px] font-bold text-gray-500 uppercase tracking-wider block">Jumlah Pesanan (Pcs)</label>
                  <input 
                    required
                    type="number" 
                    min="1"
                    value={formData.quantity || ''}
                    onChange={(e) => setFormData({...formData, quantity: Number(e.target.value)})}
                    placeholder="100" 
                    className="w-full p-2.5 bg-gray-50 border border-gray-200 rounded-xl text-xs sm:text-sm font-bold text-teal-800 focus:ring-2 focus:ring-teal-500/20 outline-none" 
                  />
                </div>
                <div className="space-y-1.5">
                  <label className="text-[11px] font-bold text-gray-500 uppercase tracking-wider block">Harga Sesuai MOQ</label>
                  <input 
                    required
                    type="number" 
                    min="0"
                    value={formData.price || ''}
                    onChange={(e) => setFormData({...formData, price: Number(e.target.value)})}
                    placeholder="50000" 
                    className="w-full p-2.5 bg-gray-50 border border-gray-200 rounded-xl text-xs sm:text-sm font-bold text-gray-900 focus:ring-2 focus:ring-teal-500/20 outline-none" 
                  />
                </div>
                <div className="space-y-1.5">
                  <label className="text-[11px] font-bold text-gray-500 uppercase tracking-wider block">Harga Dibawah MOQ</label>
                  <input 
                    type="number" 
                    min="0"
                    value={formData.priceBelowMoq || ''}
                    onChange={(e) => setFormData({...formData, priceBelowMoq: Number(e.target.value)})}
                    placeholder="55000" 
                    className="w-full p-2.5 bg-gray-50 border border-gray-200 rounded-xl text-xs sm:text-sm font-bold text-gray-900 focus:ring-2 focus:ring-teal-500/20 outline-none" 
                  />
                </div>
                <div className="space-y-1.5 col-span-2 sm:col-span-1">
                  <label className="text-[11px] font-bold text-gray-500 uppercase tracking-wider block">Tenggat Waktu</label>
                  <input 
                    required
                    type="date" 
                    value={formData.deadline}
                    onChange={(e) => setFormData({...formData, deadline: e.target.value})}
                    className="w-full p-2.5 bg-gray-50 border border-gray-200 rounded-xl text-xs sm:text-sm focus:ring-2 focus:ring-teal-500/20 outline-none" 
                  />
                </div>
              </div>

              {/* Dynamic MOQ Rule Notification Card */}
              <div className={cn(
                "p-3.5 rounded-2xl border flex flex-col sm:flex-row items-start sm:items-center justify-between gap-2 text-xs transition-all shadow-2xs",
                (formData.quantity < (formData.moq || 100) && (formData.priceBelowMoq || 0) > 0)
                  ? "bg-amber-50/80 border-amber-200 text-amber-900"
                  : "bg-teal-50/80 border-teal-200 text-teal-900"
              )}>
                <div className="flex items-center gap-2 flex-wrap">
                  <span className={cn(
                    "px-2.5 py-0.5 rounded-md text-[10px] font-black uppercase tracking-wider shadow-2xs",
                    (formData.quantity < (formData.moq || 100) && (formData.priceBelowMoq || 0) > 0)
                      ? "bg-amber-500 text-white"
                      : "bg-teal-700 text-white"
                  )}>
                    {(formData.quantity < (formData.moq || 100) && (formData.priceBelowMoq || 0) > 0) ? "Harga Dibawah MOQ Aktif" : "Harga Sesuai MOQ Aktif"}
                  </span>
                  <span className="font-medium">
                    Jumlah: <strong>{formData.quantity} pcs</strong> {(formData.quantity < (formData.moq || 100)) ? `< Minimal MOQ (${formData.moq || 100} pcs)` : `≥ Minimal MOQ (${formData.moq || 100} pcs)`}
                  </span>
                </div>
                <div className="font-bold flex items-center gap-1 text-xs">
                  <span className="opacity-75">Harga Satuan Diterapkan:</span>
                  <span className="font-black text-sm text-teal-900">
                    {formatCurrency(formData.quantity < (formData.moq || 100) && (formData.priceBelowMoq || 0) > 0 ? formData.priceBelowMoq : formData.price)}
                  </span>
                  <span className="text-[10px] text-gray-500 font-normal">/ pcs</span>
                </div>
              </div>
            </div>
          ) : (
            <>
              <div className="grid grid-cols-3 gap-6">
                <div className="space-y-2">
                  <label className="text-xs font-bold text-gray-400 uppercase tracking-wider">Jumlah Total (Pcs)</label>
                  <input 
                    required
                    type="number" 
                    value={formData.quantity}
                    onChange={(e) => handleQuantityPriceChange(Number(e.target.value), formData.price)}
                    placeholder="0" 
                    className="w-full p-3 bg-gray-50 border-none rounded-xl text-sm focus:ring-2 focus:ring-teal-500/20" 
                  />
                </div>
                <div className="space-y-2">
                  <label className="text-xs font-bold text-gray-400 uppercase tracking-wider">Harga per Pcs (Rp)</label>
                  <input 
                    required
                    type="number" 
                    value={formData.price}
                    onChange={(e) => handleQuantityPriceChange(formData.quantity, Number(e.target.value))}
                    placeholder="0" 
                    className="w-full p-3 bg-gray-50 border-none rounded-xl text-sm focus:ring-2 focus:ring-teal-500/20" 
                  />
                </div>
                <div className="space-y-2">
                  <label className="text-xs font-bold text-gray-400 uppercase tracking-wider">Tenggat Waktu</label>
                  <input 
                    required
                    type="date" 
                    value={formData.deadline}
                    onChange={(e) => setFormData({...formData, deadline: e.target.value})}
                    className="w-full p-3 bg-gray-50 border-none rounded-xl text-sm focus:ring-2 focus:ring-teal-500/20" 
                  />
                </div>
              </div>

              <div className="space-y-2">
                <label className="text-xs font-bold text-gray-400 uppercase tracking-wider">Ukuran / Size (Opsional)</label>
                <input 
                  type="text" 
                  value={formData.size || ''}
                  onChange={(e) => setFormData({...formData, size: e.target.value})}
                  placeholder="misal: XL atau S, M, L, XL" 
                  className="w-full p-3 bg-gray-50 border-none rounded-xl text-sm focus:ring-2 focus:ring-teal-500/20" 
                />
              </div>

              {/* Smart Down Payment (DP) Interactive Card */}
              <div className="p-4 bg-teal-50/60 rounded-2xl border border-teal-100 space-y-3">
                <div className="flex items-center justify-between">
                  <div>
                    <span className="text-xs font-bold text-teal-900 uppercase tracking-wider block">Down Payment (DP) Client</span>
                    <span className="text-[11px] text-teal-600">Pilih persentase cepat atau ketik langsung nominal rupiahnya:</span>
                  </div>
                  <span className="px-3 py-1 bg-teal-600 text-white rounded-full text-xs font-black shadow-sm">
                    {formData.dpPercent}% ({formatCurrency(formData.downPayment)})
                  </span>
                </div>

                {/* Preset Pills */}
                <div className="flex flex-wrap gap-2 pt-1">
                  {[
                    { id: '0', label: 'Tanpa DP (0%)' },
                    { id: '30', label: 'DP 30%' },
                    { id: '50', label: 'DP 50% (Standar)' },
                    { id: '70', label: 'DP 70%' },
                    { id: '100', label: 'Lunas (100%)' }
                  ].map(p => (
                    <button
                      key={p.id}
                      type="button"
                      onClick={() => handleSelectDpPreset(p.id)}
                      className={cn(
                        "px-3 py-1.5 rounded-xl text-xs font-bold transition-all cursor-pointer",
                        formData.dpPercent === Number(p.id) && formData.dpOption !== 'custom_nominal'
                          ? "bg-teal-700 text-white shadow-sm"
                          : "bg-white text-gray-700 hover:bg-teal-100/60 border border-teal-200/80"
                      )}
                    >
                      {p.label}
                    </button>
                  ))}
                </div>

                {/* Dual Inputs */}
                <div className="grid grid-cols-2 gap-3 pt-1">
                  <div>
                    <label className="text-[11px] font-bold text-gray-500 block mb-1">Ketik Persentase (%)</label>
                    <div className="relative">
                      <input 
                        type="number"
                        min="0"
                        max="100"
                        step="any"
                        value={formData.dpPercent || ''}
                        onChange={(e) => handleCustomDpPercent(Number(e.target.value))}
                        placeholder="50" 
                        className="w-full p-2.5 bg-white border border-gray-200 rounded-xl text-xs sm:text-sm font-bold text-gray-900 focus:ring-2 focus:ring-teal-500/20 outline-none" 
                      />
                      <span className="absolute right-3 top-1/2 -translate-y-1/2 text-xs font-bold text-gray-400">%</span>
                    </div>
                  </div>
                  <div>
                    <label className="text-[11px] font-bold text-gray-500 block mb-1">Atau Ketik Nominal Rupiah (Rp)</label>
                    <input 
                      type="number" 
                      min="0"
                      value={formData.downPayment || ''}
                      onChange={(e) => handleCustomDpNominal(Number(e.target.value))}
                      placeholder="0" 
                      className="w-full p-2.5 bg-white border border-gray-200 rounded-xl text-xs sm:text-sm font-bold text-teal-800 focus:ring-2 focus:ring-teal-500/20 outline-none" 
                    />
                  </div>
                </div>
              </div>

              {/* Smart Diskon Sample Interactive Card */}
              <div className="p-4 bg-gray-50 rounded-2xl border border-gray-200 space-y-3">
                <div className="flex items-center justify-between">
                  <div>
                    <span className="text-xs font-bold text-gray-800 uppercase tracking-wider block">Diskon Sample (Opsional)</span>
                    <span className="text-[11px] text-gray-500">Potongan harga jika ada kesepakatan sample:</span>
                  </div>
                  {formData.discount > 0 && (
                    <span className="px-3 py-1 bg-amber-600 text-white rounded-full text-xs font-black shadow-sm">
                      -{formatCurrency(formData.discount)} ({formData.discountPercent}%)
                    </span>
                  )}
                </div>

                <div className="flex flex-wrap gap-2">
                  {[
                    { id: '0', label: 'Tanpa Diskon' },
                    { id: '50', label: 'Diskon 50%' },
                    { id: '100', label: 'Free Sample (100%)' }
                  ].map(p => (
                    <button
                      key={p.id}
                      type="button"
                      onClick={() => handleSelectDiscountPreset(p.id)}
                      className={cn(
                        "px-3 py-1.5 rounded-xl text-xs font-bold transition-all cursor-pointer",
                        formData.discountPercent === Number(p.id) && formData.discountOption !== 'custom_nominal'
                          ? "bg-amber-600 text-white shadow-sm"
                          : "bg-white text-gray-600 hover:bg-gray-100 border border-gray-200"
                      )}
                    >
                      {p.label}
                    </button>
                  ))}
                </div>

                <div>
                  <label className="text-[11px] font-semibold text-gray-500 block mb-1">Nominal Diskon Manual (Rp)</label>
                  <input 
                    type="number" 
                    min="0"
                    value={formData.discount || ''}
                    onChange={(e) => handleCustomDiscountNominal(Number(e.target.value))}
                    placeholder="0" 
                    className="w-full p-2.5 bg-white border border-gray-200 rounded-xl text-xs sm:text-sm font-bold text-gray-800 focus:ring-2 focus:ring-teal-500/20 outline-none" 
                  />
                </div>
              </div>
            </>
          )}

          {/* Dynamic Size & Quantity Custom Matrix Builder */}
          <CustomTableBuilder
            value={formData.sizeChart}
            onChange={(newChart) => setFormData(prev => ({ ...prev, sizeChart: newChart }))}
            onTotalQtyChange={(tot) => {
              if (tot > 0) {
                if (activeTab === 'quotations' && !convertingQuotation) {
                  setFormData(prev => ({ ...prev, quantity: tot }));
                } else {
                  handleQuantityPriceChange(tot, formData.price);
                }
              }
            }}
          />

          {/* Live Payment Breakdown Summary */}
          <div className="p-5 bg-gradient-to-br from-teal-50 to-white rounded-2xl border border-teal-200/80 space-y-3 shadow-xs">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-xs font-bold text-teal-600 uppercase tracking-wider">
                  {activeTab === 'quotations' && !convertingQuotation ? 'Estimasi Nilai Penawaran' : 'Sub Total Produksi'}
                </p>
                <p className="text-2xl font-black text-teal-950">
                  {formatCurrency(
                    formData.quantity * (
                      activeTab === 'quotations' && !convertingQuotation && formData.quantity < (formData.moq || 100) && (formData.priceBelowMoq || 0) > 0
                        ? formData.priceBelowMoq
                        : formData.price
                    )
                  )}
                </p>
                {activeTab === 'quotations' && !convertingQuotation && (
                  <p className="text-[11px] text-gray-500 font-medium mt-0.5">
                    ({formData.quantity} pcs × {formatCurrency(formData.quantity < (formData.moq || 100) && (formData.priceBelowMoq || 0) > 0 ? formData.priceBelowMoq : formData.price)})
                  </p>
                )}
              </div>
              <Calculator size={30} className="text-teal-400" />
            </div>

            {(activeTab === 'orders' || convertingQuotation) && (
              <div className="pt-3 border-t border-teal-200/70 space-y-2">
                <div className="grid grid-cols-2 sm:grid-cols-3 gap-2 text-xs">
                  {formData.discount > 0 && (
                    <div className="bg-amber-50 p-2 rounded-xl border border-amber-200/60">
                      <span className="text-gray-500 font-semibold block text-[10px]">Diskon ({formData.discountPercent}%):</span>
                      <span className="font-bold text-amber-800">-{formatCurrency(formData.discount)}</span>
                    </div>
                  )}
                  <div className="bg-teal-100/50 p-2 rounded-xl border border-teal-200/60">
                    <span className="text-gray-500 font-semibold block text-[10px]">Down Payment ({formData.dpPercent}%):</span>
                    <span className="font-bold text-teal-800">-{formatCurrency(formData.downPayment)}</span>
                  </div>
                  <div className="bg-red-50 p-2 rounded-xl border border-red-200/60 col-span-2 sm:col-span-1">
                    <span className="text-red-600 font-bold block text-[10px]">End Payment (Sisa):</span>
                    <span className="font-black text-red-700 text-sm">
                      {formatCurrency(Math.max(0, (formData.quantity * formData.price) - (formData.discount || 0) - (formData.downPayment || 0)))}
                    </span>
                  </div>
                </div>

                <div className="text-[11px] text-gray-600 italic bg-white/80 p-2.5 rounded-xl border border-teal-100">
                  <span className="font-bold text-gray-700 not-italic">Terbilang (Sisa Bayar): </span>
                  <span className="text-red-600 font-bold">
                    {terbilang(Math.max(0, (formData.quantity * formData.price) - (formData.discount || 0) - (formData.downPayment || 0)))} Rupiah
                  </span>
                </div>
              </div>
            )}
          </div>

          <div className="space-y-2">
            <label className="text-xs font-bold text-gray-400 uppercase tracking-wider">Pengadaan Barang</label>
            <select 
              value={formData.needsProcurement}
              onChange={(e) => setFormData({...formData, needsProcurement: e.target.value})}
              className="w-full p-3 bg-gray-50 border-none rounded-xl text-sm focus:ring-2 focus:ring-teal-500/20"
            >
              <option value="Tanpa Pengadaan">Tanpa Pengadaan</option>
              <option value="Perlu Pengadaan">Perlu Pengadaan</option>
            </select>
            <p className="text-[10px] text-gray-400">Jika pilih "Perlu Pengadaan", data ini akan muncul di menu Pengadaan.</p>
          </div>

          <div className="pt-4 flex justify-end gap-4 sticky bottom-0 bg-white pb-2">
            <button 
              type="button"
              onClick={() => {
                setIsModalOpen(false);
                setEditingItem(null);
                setConvertingQuotation(null);
              }} 
              className="px-6 py-2.5 text-sm font-semibold text-gray-500 hover:text-gray-900 cursor-pointer"
            >
              Batal
            </button>
            <button 
              type="submit"
              className={cn(
                "px-8 py-2.5 rounded-2xl text-sm font-semibold shadow-lg transition-all cursor-pointer",
                convertingQuotation
                  ? "bg-purple-700 text-white shadow-purple-700/20 hover:bg-purple-800"
                  : "bg-black text-white shadow-black/10 hover:bg-gray-800"
              )}
            >
              {convertingQuotation ? 'ACC & Terbitkan Pesanan' : editingItem ? 'Simpan Perubahan' : (activeTab === 'quotations' ? 'Buat Penawaran' : 'Simpan Pesanan')}
            </button>
          </div>
        </form>
      </Modal>

      {/* Detail Size Chart Table Modal */}
      <Modal
        isOpen={!!selectedItemForTable}
        onClose={() => setSelectedItemForTable(null)}
        title={`Rincian Ukuran & Jumlah: ${selectedItemForTable?.id || getValue(selectedItemForTable, 'id') || ''}`}
      >
        <div className="space-y-4">
          <div className="p-3 bg-gray-50 rounded-xl text-xs flex justify-between items-center">
            <div>
              <p className="font-bold text-gray-900">{getValue(selectedItemForTable, 'customerName') || 'Unknown Customer'}</p>
              <p className="text-gray-500">{getValue(selectedItemForTable, 'productType') || '-'}</p>
            </div>
            <div className="text-right">
              <span className="font-bold text-teal-700">{getValue(selectedItemForTable, 'quantity') || 0} pcs</span>
            </div>
          </div>

          <CustomTableViewer data={selectedItemForTable?.sizeChart} />

          <div className="flex justify-end pt-2">
            <button
              onClick={() => setSelectedItemForTable(null)}
              className="px-5 py-2 bg-gray-100 hover:bg-gray-200 text-gray-700 font-semibold rounded-xl text-xs transition-colors cursor-pointer"
            >
              Tutup
            </button>
          </div>
        </div>
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
          <p className="text-gray-600">Apakah Anda yakin ingin menghapus data ini? Tindakan ini tidak dapat dibatalkan.</p>
          <div className="flex justify-end gap-3 pt-4">
            <button
              onClick={() => {
                setIsDeleteModalOpen(false);
                setItemToDelete(null);
              }}
              className="px-6 py-2.5 text-sm font-semibold text-gray-500 hover:bg-gray-100 rounded-xl transition-colors"
            >
              Batal
            </button>
            <button
              onClick={confirmDelete}
              className="px-6 py-2.5 bg-red-600 text-white rounded-xl text-sm font-semibold shadow-lg shadow-red-600/20 hover:bg-red-700 transition-all"
            >
              Hapus
            </button>
          </div>
        </div>
      </Modal>

      {/* Offscreen Quotation PDF Templates */}
      <div style={{ position: 'fixed', left: '-9999px', top: '-9999px', zIndex: -100, pointerEvents: 'none' }}>
        {activeTab === 'quotations' && data.map((item) => {
          const quoId = item.id || getValue(item, 'id') || 'Quotation';
          const custId = getValue(item, 'customerId') || item.customerId;
          const cust = findCustomer(custId);
          const customerName = cust?.company || cust?.name || getValue(item, 'customerName') || item.customerName || 'Pelanggan';
          const customerAddress = cust?.address || getValue(item, 'customerAddress') || 'Tempat';
          const productType = getValue(item, 'productType') || getValue(item, 'product') || item.productType || 'Pakaian';
          const material = getValue(item, 'material') || item.material || '-';
          const moq = Number(getValue(item, 'moq') || item.moq || 100);
          const quantity = getValue(item, 'quantity') || item.quantity || moq;
          const price = Number(getValue(item, 'price') || item.price || 0);
          const priceBelowMoq = getValue(item, 'priceBelowMoq') || item.priceBelowMoq;
          const itemDate = getValue(item, 'timestamp') || item.timestamp;

          return (
            <div
              key={`quo-tpl-${quoId}`}
              id={`quotation-template-${quoId}`}
              style={{
                width: '1240px',
                height: '1754px',
                position: 'relative',
                backgroundColor: '#ffffff',
                color: '#000000',
                boxSizing: 'border-box',
                backgroundImage: `url("${QUOTATION_BG}")`,
                backgroundSize: '100% 100%',
                backgroundRepeat: 'no-repeat',
                overflow: 'hidden',
                fontFamily: 'Arial, sans-serif'
              }}
            >
              <div
                style={{
                  position: 'absolute',
                  top: '155px',
                  left: '70px',
                  width: '1100px',
                  boxSizing: 'border-box'
                }}
              >
                {/* No Surat di Kanan Atas */}
                <div
                  style={{
                    textAlign: 'right',
                    fontSize: '20px',
                    fontWeight: 'bold',
                    marginBottom: '35px',
                    color: '#000000'
                  }}
                >
                  No : {quoId}
                </div>

                {/* Hal & Kepada Yth */}
                <div
                  style={{
                    fontSize: '18px',
                    lineHeight: '1.6',
                    marginBottom: '30px',
                    color: '#000000'
                  }}
                >
                  <div>Hal : <strong>Surat Penawaran Harga</strong></div>
                  <div style={{ height: '25px' }}></div>
                  <div>Kepada Yth,</div>
                  <div style={{ fontWeight: 'bold', textTransform: 'uppercase' }}>{customerName}</div>
                  <div>di – {customerAddress}</div>
                </div>

                {/* Paragraf Pembuka */}
                <div
                  style={{
                    fontSize: '18px',
                    lineHeight: '1.7',
                    textAlign: 'justify',
                    marginBottom: '30px',
                    color: '#000000'
                  }}
                >
                  Dalam rangka menindak-lanjuti pembicaraan sebelumnya perihal penawaran kerja sama untuk pembuatan {productType ? productType.toLowerCase() : 'produk'} maka bersamaan dengan ini, perkenankan kami untuk mengajukan surat penawaran harga sebagai berikut;
                </div>

                {/* Tabel Penawaran Harga */}
                <table
                  style={{
                    width: '100%',
                    borderCollapse: 'collapse',
                    marginBottom: '30px',
                    border: '1.5px solid #000000'
                  }}
                >
                  <thead>
                    <tr>
                      <th style={{ border: '1.5px solid #000000', padding: '10px 8px', fontSize: '15px', backgroundColor: '#55b3b5', fontWeight: 'bold', textAlign: 'center', color: '#000000', width: '50px' }}>NO</th>
                      <th style={{ border: '1.5px solid #000000', padding: '10px 8px', fontSize: '15px', backgroundColor: '#55b3b5', fontWeight: 'bold', textAlign: 'center', color: '#000000', width: '170px' }}>ITEM</th>
                      <th style={{ border: '1.5px solid #000000', padding: '10px 8px', fontSize: '15px', backgroundColor: '#55b3b5', fontWeight: 'bold', textAlign: 'center', color: '#000000', width: '190px' }}>BAHAN</th>
                      <th style={{ border: '1.5px solid #000000', padding: '10px 8px', fontSize: '15px', backgroundColor: '#55b3b5', fontWeight: 'bold', textAlign: 'center', color: '#000000', width: '90px' }}>QTY</th>
                      <th style={{ border: '1.5px solid #000000', padding: '10px 8px', fontSize: '15px', backgroundColor: '#55b3b5', fontWeight: 'bold', textAlign: 'center', color: '#000000', width: '300px' }}>HARGA SESUAI MOQ ({moq}PCS)</th>
                      <th style={{ border: '1.5px solid #000000', padding: '10px 8px', fontSize: '15px', backgroundColor: '#55b3b5', fontWeight: 'bold', textAlign: 'center', color: '#000000', width: '300px' }}>HARGA DIBAWAH MOQ ({moq}PCS)</th>
                    </tr>
                  </thead>
                  <tbody>
                    <tr>
                      <td style={{ border: '1.5px solid #000000', padding: '12px 8px', fontSize: '16px', textAlign: 'center', fontWeight: 'bold', color: '#000000' }}>1</td>
                      <td style={{ border: '1.5px solid #000000', padding: '12px 8px', fontSize: '16px', textAlign: 'center', color: '#000000' }}>{productType}</td>
                      <td style={{ border: '1.5px solid #000000', padding: '12px 8px', fontSize: '16px', textAlign: 'center', color: '#000000' }}>{material || '-'}</td>
                      <td style={{ border: '1.5px solid #000000', padding: '12px 8px', fontSize: '16px', textAlign: 'center', color: '#000000' }}>{quantity ? `${quantity} Pcs` : `${moq} Pcs`}</td>
                      <td style={{ border: '1.5px solid #000000', padding: '12px 14px', fontSize: '16px', color: '#000000' }}>
                        <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                          <span>Rp</span>
                          <span>{Number(price).toLocaleString('id-ID')}</span>
                        </div>
                      </td>
                      <td style={{ border: '1.5px solid #000000', padding: '12px 14px', fontSize: '16px', color: '#000000' }}>
                        <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                          <span>Rp</span>
                          <span>{priceBelowMoq ? Number(priceBelowMoq).toLocaleString('id-ID') : '-'}</span>
                        </div>
                      </td>
                    </tr>
                  </tbody>
                </table>

                {/* Paragraf Penutup */}
                <div
                  style={{
                    fontSize: '18px',
                    lineHeight: '1.7',
                    textAlign: 'justify',
                    marginBottom: '30px',
                    color: '#000000'
                  }}
                >
                  Demikian surat penawaran harga ini kami buat, untuk informasi detail lebih lanjut bisa dibahas kemudian, besar harapan kami agar rencana kerjasama ini bisa berjalan dengan baik, atas perhatian dan kerjasamanya kami ucapkan banyak terima kasih.
                </div>

                {/* TTD & Stampel */}
                <div
                  style={{
                    marginTop: '140px',
                    marginLeft: 'auto',
                    width: '450px',
                    textAlign: 'center',
                    fontSize: '19px',
                    color: '#000000'
                  }}
                >
                  <div style={{ marginBottom: '10px' }}>Depok, {formatDateIndonesian(itemDate)}</div>
                  <div
                    style={{
                      position: 'relative',
                      height: '240px',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      margin: '0 auto'
                    }}
                  >
                    {/* Cap Stempel HIJ (Tegak & Ditengah) */}
                    <img
                      src={STAMP_HIJ}
                      style={{
                        position: 'absolute',
                        width: '230px',
                        height: 'auto',
                        opacity: 0.95,
                        left: '50%',
                        top: '50%',
                        transform: 'translate(-50%, -50%)',
                        zIndex: 1
                      }}
                      alt="Stampel"
                    />
                    {/* Tanda Tangan Basah (Tepat Menimpa Stempel) */}
                    <img
                      src={TTD_HIJ}
                      style={{
                        position: 'absolute',
                        width: '320px',
                        height: 'auto',
                        left: '50%',
                        top: '52%',
                        transform: 'translate(-48%, -50%)',
                        zIndex: 2
                      }}
                      alt="Tanda Tangan"
                    />
                  </div>
                  <div style={{ marginTop: '10px', fontWeight: 'bold', letterSpacing: '0.05em', fontSize: '20px', color: '#000000' }}>
                    PT HASIL INTI JUALAN
                  </div>
                </div>
              </div>
            </div>
          );
        })}

        {/* Offscreen Invoice PDF Templates */}
        {activeTab === 'orders' && data.map((item) => {
          const ordId = item.id || getValue(item, 'id') || 'Invoice';
          const custId = getValue(item, 'customerId') || item.customerId;
          const cust = findCustomer(custId);
          const customerName = cust?.company || cust?.name || getValue(item, 'customerName') || item.customerName || 'Pelanggan';
          const customerAddress = cust?.address || getValue(item, 'customerAddress') || 'Tempat';
          const productType = getValue(item, 'productType') || getValue(item, 'product') || item.productType || 'Pakaian';
          const size = getValue(item, 'size') || item.size || 'All Size';
          const quantity = Number(getValue(item, 'quantity') || item.quantity || 1);
          const price = Number(getValue(item, 'price') || item.price || 0);
          const subTotal = Number(getValue(item, 'totalPrice') || getValue(item, 'total') || (quantity * price));
          const discount = Number(getValue(item, 'discount') || item.discount || 0);
          const downPayment = Number(getValue(item, 'downPayment') || getValue(item, 'downpayment') || getValue(item, 'dp') || item.downPayment || 0);
          const endPayment = Math.max(0, subTotal - discount - downPayment);
          const isBelowMoq = quantity < 100;
          const itemDate = getValue(item, 'timestamp') || item.timestamp;

          const dpPercent = item.dpPercent !== undefined && item.dpPercent !== '' 
            ? Number(item.dpPercent) 
            : (subTotal > 0 && downPayment > 0 ? Math.round((downPayment / subTotal) * 100) : (downPayment > 0 ? 50 : 0));

          const discPercent = item.discountPercent !== undefined && item.discountPercent !== '' 
            ? Number(item.discountPercent) 
            : (subTotal > 0 && discount > 0 ? Math.round((discount / subTotal) * 100) : 50);

          return (
            <div
              key={`inv-tpl-${ordId}`}
              id={`invoice-template-${ordId}`}
              style={{
                width: '1240px',
                height: '1754px',
                position: 'relative',
                backgroundColor: '#ffffff',
                color: '#000000',
                boxSizing: 'border-box',
                backgroundImage: `url("${INVOICE_BG}")`,
                backgroundSize: '100% 100%',
                backgroundRepeat: 'no-repeat',
                overflow: 'hidden',
                fontFamily: 'Arial, sans-serif'
              }}
            >
              <div
                style={{
                  position: 'absolute',
                  top: '155px',
                  left: '70px',
                  width: '1100px',
                  boxSizing: 'border-box'
                }}
              >
                {/* No Invoice di Kanan Atas */}
                <div
                  style={{
                    textAlign: 'right',
                    fontSize: '20px',
                    fontWeight: 'bold',
                    marginBottom: '30px',
                    color: '#000000'
                  }}
                >
                  No : {ordId}
                </div>

                {/* Hal & Kepada Yth */}
                <div
                  style={{
                    fontSize: '18px',
                    lineHeight: '1.6',
                    marginBottom: '25px',
                    color: '#000000'
                  }}
                >
                  <div>Hal : <strong>Invoice</strong></div>
                  <div style={{ height: '20px' }}></div>
                  <div>Kepada Yth,</div>
                  <div style={{ fontWeight: 'bold', textTransform: 'uppercase' }}>{customerName}</div>
                  <div>di – {customerAddress}</div>
                </div>

                {/* Paragraf Pembuka */}
                <div
                  style={{
                    fontSize: '18px',
                    lineHeight: '1.7',
                    textAlign: 'justify',
                    marginBottom: '25px',
                    color: '#000000'
                  }}
                >
                  Berikut adalah invoice produksi {productType ? productType.toLowerCase() : 'produk'} dengan total produksi sebanyak {quantity} pcs {isBelowMoq ? '(dibawah MOQ)' : '(sesuai MOQ)'}.
                </div>

                {/* Tabel Invoice */}
                <table
                  style={{
                    width: '100%',
                    borderCollapse: 'collapse',
                    marginBottom: '12px'
                  }}
                >
                  <thead>
                    <tr style={{ backgroundColor: '#55b3b5', color: '#000000', height: '36px' }}>
                      <th style={{ border: '1px solid #55b3b5', padding: '9px 4px', fontSize: '15px', fontWeight: 'bold', textAlign: 'center', width: '50px' }}>NO</th>
                      <th style={{ border: '1px solid #55b3b5', padding: '9px 4px', fontSize: '15px', fontWeight: 'bold', textAlign: 'center', width: '260px' }}>ITEM</th>
                      <th style={{ border: '1px solid #55b3b5', padding: '9px 4px', fontSize: '15px', fontWeight: 'bold', textAlign: 'center', width: '90px' }}>SIZE</th>
                      <th colSpan={2} style={{ border: '1px solid #55b3b5', padding: '9px 4px', fontSize: '15px', fontWeight: 'bold', textAlign: 'center', width: '140px' }}>QTY</th>
                      <th colSpan={2} style={{ border: '1px solid #55b3b5', padding: '9px 4px', fontSize: '15px', fontWeight: 'bold', textAlign: 'center', width: '260px' }}>PRICE/ PCS</th>
                      <th colSpan={2} style={{ border: '1px solid #55b3b5', padding: '9px 4px', fontSize: '15px', fontWeight: 'bold', textAlign: 'center', width: '280px' }}>SUB TOTAL</th>
                    </tr>
                  </thead>
                  <tbody>
                    {/* Item Row 1 */}
                    <tr style={{ backgroundColor: '#ffffff', color: '#000000' }}>
                      <td style={{ border: '1px solid #c8c8c8', padding: '7px 6px', fontSize: '15px', textAlign: 'center', width: '50px' }}>1</td>
                      <td style={{ border: '1px solid #c8c8c8', padding: '7px 12px', fontSize: '15px', textAlign: 'left', width: '260px' }}>{productType}</td>
                      <td style={{ border: '1px solid #c8c8c8', padding: '7px 6px', fontSize: '15px', textAlign: 'center', width: '90px' }}>{size}</td>
                      <td style={{ border: '1px solid #c8c8c8', padding: '7px 6px', fontSize: '15px', textAlign: 'center', width: '70px' }}>{quantity}</td>
                      <td style={{ border: '1px solid #c8c8c8', padding: '7px 6px', fontSize: '15px', textAlign: 'center', width: '70px' }}>PCS</td>
                      <td style={{ border: '1px solid #c8c8c8', padding: '7px 6px', fontSize: '15px', textAlign: 'center', width: '50px' }}>Rp</td>
                      <td style={{ border: '1px solid #c8c8c8', padding: '7px 12px', fontSize: '15px', textAlign: 'right', width: '210px' }}>{Number(price).toLocaleString('id-ID')}</td>
                      <td style={{ border: '1px solid #c8c8c8', padding: '7px 6px', fontSize: '15px', textAlign: 'center', width: '50px' }}>Rp</td>
                      <td style={{ border: '1px solid #c8c8c8', padding: '7px 12px', fontSize: '15px', textAlign: 'right', width: '230px' }}>{Number(subTotal).toLocaleString('id-ID')}</td>
                    </tr>

                    {/* Summary Row 1: TOTAL QUANTITY PRODUKSI */}
                    <tr style={{ backgroundColor: '#e0e0e0', color: '#000000', fontWeight: 'bold' }}>
                      <td colSpan={3} style={{ border: 'none', padding: '7px 10px', fontSize: '15px', textAlign: 'left' }}>TOTAL QUANTITY PRODUKSI</td>
                      <td style={{ border: 'none', padding: '7px 6px', fontSize: '15px', textAlign: 'center' }}>{quantity}</td>
                      <td style={{ border: 'none', padding: '7px 6px', fontSize: '15px', textAlign: 'center' }}>PCS</td>
                      <td colSpan={4} style={{ border: 'none', padding: '7px 10px', fontSize: '15px' }}></td>
                    </tr>

                    {/* Summary Row 2: SUB TOTAL */}
                    <tr style={{ backgroundColor: '#ffffff', color: '#000000', fontWeight: 'bold' }}>
                      <td colSpan={7} style={{ border: 'none', padding: '7px 10px', fontSize: '15px', textAlign: 'left' }}>SUB TOTAL</td>
                      <td style={{ border: 'none', padding: '7px 6px', fontSize: '15px', textAlign: 'center' }}>Rp</td>
                      <td style={{ border: 'none', padding: '7px 12px', fontSize: '15px', textAlign: 'right' }}>{Number(subTotal).toLocaleString('id-ID')}</td>
                    </tr>

                    {/* Summary Row 3: DISCOUNT SAMPLE */}
                    <tr style={{ backgroundColor: '#e0e0e0', color: '#000000', fontWeight: 'bold' }}>
                      <td colSpan={7} style={{ border: 'none', padding: '7px 10px', fontSize: '15px', textAlign: 'left' }}>
                        DISCOUNT SAMPLE {discount > 0 ? `(${discPercent}%)` : '(50%)'}
                      </td>
                      <td style={{ border: 'none', padding: '7px 6px', fontSize: '15px', textAlign: 'center' }}>{discount > 0 ? 'Rp' : ''}</td>
                      <td style={{ border: 'none', padding: '7px 12px', fontSize: '15px', textAlign: 'right' }}>{discount > 0 ? Number(discount).toLocaleString('id-ID') : ''}</td>
                    </tr>

                    {/* Summary Row 4: DOWN PAYMENT */}
                    <tr style={{ backgroundColor: '#ffffff', color: '#000000', fontWeight: 'bold' }}>
                      <td colSpan={7} style={{ border: 'none', padding: '7px 10px', fontSize: '15px', textAlign: 'left' }}>
                        DOWN PAYMENT {downPayment > 0 ? `${dpPercent}%` : '50%'}
                      </td>
                      <td style={{ border: 'none', padding: '7px 6px', fontSize: '15px', textAlign: 'center' }}>{downPayment > 0 ? 'Rp' : ''}</td>
                      <td style={{ border: 'none', padding: '7px 12px', fontSize: '15px', textAlign: 'right' }}>{downPayment > 0 ? Number(downPayment).toLocaleString('id-ID') : ''}</td>
                    </tr>

                    {/* Summary Row 5: END PAYMENT */}
                    <tr style={{ backgroundColor: '#e0e0e0', color: '#ff0000', fontWeight: 'bold' }}>
                      <td colSpan={7} style={{ border: 'none', padding: '7px 10px', fontSize: '15px', textAlign: 'left', color: '#ff0000' }}>END PAYMENT</td>
                      <td style={{ border: 'none', padding: '7px 6px', fontSize: '15px', textAlign: 'center', color: '#ff0000' }}>Rp</td>
                      <td style={{ border: 'none', padding: '7px 12px', fontSize: '15px', textAlign: 'right', color: '#ff0000' }}>{Number(endPayment).toLocaleString('id-ID')}</td>
                    </tr>
                  </tbody>
                </table>

                {/* Terbilang Block */}
                <div
                  style={{
                    marginTop: '12px',
                    marginBottom: '25px',
                    fontSize: '15px',
                    lineHeight: '1.5',
                    color: '#000000'
                  }}
                >
                  <span style={{ fontWeight: 'bold', color: '#000000' }}>Terbilang </span>
                  <span style={{ fontWeight: 'bold', color: '#ff0000' }}>(END PAYMENT)</span>
                  <span style={{ fontWeight: 'bold', color: '#000000' }}> : </span>
                  <span style={{ fontWeight: 'bold', fontStyle: 'italic', color: '#ff0000' }}>{terbilang(endPayment)} Rupiah</span>
                </div>

                {/* Info Transfer Bank */}
                <div style={{ marginTop: '20px', fontSize: '16px', lineHeight: '1.7', color: '#000000' }}>
                  <div style={{ fontWeight: 'bold', marginBottom: '4px' }}>Transfer ke:</div>
                  <table style={{ border: 'none', borderCollapse: 'collapse', fontSize: '16px', color: '#000000' }}>
                    <tbody>
                      <tr>
                        <td style={{ padding: '2px 10px 2px 0', border: 'none', fontWeight: 'bold', width: '120px', color: '#000000' }}>Bank</td>
                        <td style={{ padding: '2px 0', border: 'none', color: '#000000' }}>: <strong>MANDIRI</strong></td>
                      </tr>
                      <tr>
                        <td style={{ padding: '2px 10px 2px 0', border: 'none', fontWeight: 'bold', color: '#000000' }}>No Rekening</td>
                        <td style={{ padding: '2px 0', border: 'none', color: '#000000' }}>: <strong>1150011767581</strong></td>
                      </tr>
                      <tr>
                        <td style={{ padding: '2px 10px 2px 0', border: 'none', fontWeight: 'bold', color: '#000000' }}>Atas Nama</td>
                        <td style={{ padding: '2px 0', border: 'none', color: '#000000' }}>: <strong>PT HASIL INTI JUALAN</strong></td>
                      </tr>
                    </tbody>
                  </table>
                </div>

                {/* Paragraf Penutup */}
                <div
                  style={{
                    fontSize: '18px',
                    lineHeight: '1.7',
                    textAlign: 'justify',
                    marginTop: '20px',
                    marginBottom: '20px',
                    color: '#000000'
                  }}
                >
                  Demikian surat ini kami buat, atas perhatiam dan kerjasamanya kami ucapkan terima kasih.
                </div>

                {/* TTD & Stampel */}
                <div
                  style={{
                    marginTop: '50px',
                    marginLeft: 'auto',
                    width: '450px',
                    textAlign: 'center',
                    fontSize: '19px',
                    color: '#000000'
                  }}
                >
                  <div style={{ marginBottom: '8px' }}>Depok, {formatDateIndonesian(itemDate)}</div>
                  <div
                    style={{
                      position: 'relative',
                      height: '220px',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      margin: '0 auto'
                    }}
                  >
                    {/* Cap Stempel HIJ (Tegak & Ditengah) */}
                    <img
                      src={STAMP_HIJ}
                      style={{
                        position: 'absolute',
                        width: '230px',
                        height: 'auto',
                        opacity: 0.95,
                        left: '50%',
                        top: '50%',
                        transform: 'translate(-50%, -50%)',
                        zIndex: 1
                      }}
                      alt="Stampel"
                    />
                    {/* Tanda Tangan Basah (Tepat Menimpa Stempel) */}
                    <img
                      src={TTD_HIJ}
                      style={{
                        position: 'absolute',
                        width: '320px',
                        height: 'auto',
                        left: '50%',
                        top: '52%',
                        transform: 'translate(-48%, -50%)',
                        zIndex: 2
                      }}
                      alt="Tanda Tangan"
                    />
                  </div>
                  <div style={{ marginTop: '8px', fontWeight: 'bold', letterSpacing: '0.05em', fontSize: '20px', color: '#000000' }}>
                    PT HASIL INTI JUALAN
                  </div>
                </div>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
};
