import React, { useState, useEffect } from 'react';
import { Card } from '../App';
import { 
  Truck, 
  Package, 
  Plus, 
  Search, 
  MapPin, 
  Calendar,
  CheckCircle2,
  Clock,
  Loader2,
  ExternalLink
} from 'lucide-react';
import { cn, generateId } from '../lib/utils';
import { sheetsService } from '../services/googleService';
import { Modal } from './ui/Modal';

export const ShippingModule = () => {
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [loading, setLoading] = useState(true);
  const [shipments, setShipments] = useState<any[]>([]);
  const [orders, setOrders] = useState<any[]>([]);
  
  const [formData, setFormData] = useState({
    orderId: '',
    courier: 'JNE',
    trackingNumber: '',
    status: 'Pending',
    destination: '',
    estimatedArrival: new Date().toISOString().split('T')[0]
  });

  const fetchData = async () => {
    try {
      setLoading(true);
      const [shipmentData, orderData] = await Promise.all([
        sheetsService.getAll('Shipments'),
        sheetsService.getAll('Orders')
      ]);
      setShipments(Array.isArray(shipmentData) ? shipmentData : []);
      setOrders(Array.isArray(orderData) ? orderData : []);
    } catch (error) {
      console.error('Error fetching shipping data:', error);
      setShipments([]);
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
      const newShipment = {
        id: generateId('SHP'),
        timestamp: new Date().toISOString(),
        user: 'Admin HIJ',
        ...formData
      };
      
      await sheetsService.create('Shipments', newShipment);
      setIsModalOpen(false);
      fetchData();
    } catch (error) {
      alert('Gagal menyimpan data pengiriman.');
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
          <h2 className="text-2xl font-bold text-gray-900">Pengiriman & Logistik</h2>
          <p className="text-sm text-gray-500">SOP 13: Kelola pengiriman produk, nomor resi, dan status pengantaran.</p>
        </div>
        <button 
          onClick={() => setIsModalOpen(true)}
          className="w-full sm:w-auto bg-gradient-to-r from-teal-600 to-emerald-600 hover:from-teal-700 hover:to-emerald-700 text-white px-6 py-2.5 rounded-2xl text-xs sm:text-sm font-semibold flex items-center justify-center gap-2 transition-all shadow-lg shadow-teal-600/20"
        >
          <Plus size={18} />
          Pengiriman Baru
        </button>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-4 sm:gap-6">
        <div className="bg-white rounded-3xl p-6 border border-gray-100 shadow-sm">
          <div className="flex items-center gap-4 mb-4">
            <div className="w-10 h-10 rounded-xl bg-teal-50 flex items-center justify-center text-teal-600">
              <Truck size={20} />
            </div>
            <span className="text-sm font-medium text-gray-500">Dalam Perjalanan</span>
          </div>
          <h4 className="text-2xl font-bold">{shipments.filter(s => s.status === 'In Transit').length} Pengiriman</h4>
          <p className="text-xs text-gray-400 mt-1">Sedang dalam proses antar</p>
        </div>
        <div className="bg-white rounded-3xl p-6 border border-gray-100 shadow-sm">
          <div className="flex items-center gap-4 mb-4">
            <div className="w-10 h-10 rounded-xl bg-green-50 flex items-center justify-center text-green-600">
              <CheckCircle2 size={20} />
            </div>
            <span className="text-sm font-medium text-gray-500">Terkirim</span>
          </div>
          <h4 className="text-2xl font-bold">{shipments.filter(s => s.status === 'Delivered').length} Selesai</h4>
          <p className="text-xs text-green-600 mt-1 font-medium">Bulan ini</p>
        </div>
        <div className="bg-white rounded-3xl p-6 border border-gray-100 shadow-sm">
          <div className="flex items-center gap-4 mb-4">
            <div className="w-10 h-10 rounded-xl bg-red-50 flex items-center justify-center text-red-600">
              <Clock size={20} />
            </div>
            <span className="text-sm font-medium text-gray-500">Tertunda</span>
          </div>
          <h4 className="text-2xl font-bold">{shipments.filter(s => s.status === 'Pending').length} Pengiriman</h4>
          <p className="text-xs text-red-500 mt-1 font-medium">Menunggu pickup kurir</p>
        </div>
      </div>

      {loading ? (
        <div className="flex flex-col items-center justify-center py-20">
          <Loader2 className="animate-spin text-teal-600 mb-4" size={32} />
          <p className="text-gray-500 text-sm">Memuat pengiriman...</p>
        </div>
      ) : (
        <div className="bg-white rounded-3xl border border-gray-100 overflow-hidden shadow-sm">
          {/* Desktop Table View */}
          <div className="hidden md:block overflow-x-auto">
            <table className="w-full text-left border-collapse">
              <thead>
                <tr className="bg-gray-50/50 border-b border-gray-100">
                  <th className="px-6 py-4 text-[10px] font-bold text-gray-400 uppercase tracking-wider">ID Pengiriman</th>
                  <th className="px-6 py-4 text-[10px] font-bold text-gray-400 uppercase tracking-wider">ID Pesanan</th>
                  <th className="px-6 py-4 text-[10px] font-bold text-gray-400 uppercase tracking-wider">Kurir</th>
                  <th className="px-6 py-4 text-[10px] font-bold text-gray-400 uppercase tracking-wider">Tujuan</th>
                  <th className="px-6 py-4 text-[10px] font-bold text-gray-400 uppercase tracking-wider">Status</th>
                  <th className="px-6 py-4 text-[10px] font-bold text-gray-400 uppercase tracking-wider">Estimasi Tiba</th>
                  <th className="px-6 py-4 text-[10px] font-bold text-gray-400 uppercase tracking-wider text-right">Aksi</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-50">
                {shipments.map((shp, i) => (
                  <tr key={shp.id || i} className="hover:bg-gray-50/50 transition-colors group">
                    <td className="px-6 py-4">
                      <span className="text-sm font-bold text-gray-900">{shp.id}</span>
                    </td>
                    <td className="px-6 py-4">
                      <span className="text-sm text-gray-600">{shp.orderId}</span>
                    </td>
                    <td className="px-6 py-4">
                      <div className="flex flex-col">
                        <span className="text-sm font-medium text-gray-900">{shp.courier}</span>
                        <span className="text-[10px] text-gray-400 font-mono">{shp.trackingNumber}</span>
                      </div>
                    </td>
                    <td className="px-6 py-4">
                      <div className="flex items-center gap-2 text-sm text-gray-600">
                        <MapPin size={14} className="text-gray-400" />
                        {shp.destination}
                      </div>
                    </td>
                    <td className="px-6 py-4">
                      <span className={cn(
                        "px-3 py-1 rounded-full text-[10px] font-bold uppercase tracking-wider",
                        shp.status === 'Delivered' ? "bg-green-100 text-green-700" : 
                        shp.status === 'In Transit' ? "bg-teal-100 text-teal-700" : "bg-gray-100 text-gray-700"
                      )}>
                        {shp.status === 'In Transit' ? 'Dalam Perjalanan' : shp.status === 'Delivered' ? 'Terkirim' : shp.status}
                      </span>
                    </td>
                    <td className="px-6 py-4">
                      <div className="flex items-center gap-2 text-sm text-gray-600">
                        <Calendar size={14} className="text-gray-400" />
                        {shp.estimatedArrival}
                      </div>
                    </td>
                    <td className="px-6 py-4 text-right">
                      <button className="p-2 hover:bg-white rounded-xl transition-all text-gray-400 hover:text-teal-600 border border-transparent hover:border-gray-100">
                        <ExternalLink size={16} />
                      </button>
                    </td>
                  </tr>
                ))}
                {shipments.length === 0 && (
                  <tr>
                    <td colSpan={7} className="px-6 py-10 text-center text-gray-500">Tidak ada pengiriman ditemukan.</td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>

          {/* Mobile Unified Card View */}
          <div className="md:hidden p-4 space-y-3">
            {shipments.map((shp, i) => (
              <div key={shp.id || i} className="p-4 bg-gray-50 rounded-2xl border border-gray-100 space-y-3 shadow-sm">
                <div className="flex items-start justify-between gap-2">
                  <div>
                    <span className="text-[10px] font-bold text-teal-700 bg-teal-50 px-2 py-0.5 rounded-md uppercase tracking-wider inline-block">
                      {shp.id}
                    </span>
                    <h4 className="text-sm font-bold text-gray-900 mt-1">Order: {shp.orderId}</h4>
                    <span className="text-xs text-gray-500">{shp.courier} • {shp.trackingNumber}</span>
                  </div>
                  <span className={cn(
                    "px-2.5 py-1 rounded-full text-[10px] font-bold uppercase tracking-wider whitespace-nowrap flex-shrink-0",
                    shp.status === 'Delivered' ? "bg-green-100 text-green-700" : 
                    shp.status === 'In Transit' ? "bg-teal-100 text-teal-700" : "bg-gray-100 text-gray-700"
                  )}>
                    {shp.status === 'In Transit' ? 'Dalam Perjalanan' : shp.status === 'Delivered' ? 'Terkirim' : shp.status}
                  </span>
                </div>

                <div className="space-y-1.5 py-2 border-y border-gray-200/60 text-xs">
                  <div className="flex items-center gap-2 text-gray-700">
                    <MapPin size={14} className="text-teal-600 flex-shrink-0" />
                    <span>{shp.destination}</span>
                  </div>
                  <div className="flex items-center gap-2 text-gray-500 text-[11px]">
                    <Calendar size={14} className="text-gray-400 flex-shrink-0" />
                    <span>Estimasi: {shp.estimatedArrival}</span>
                  </div>
                </div>

                <div className="flex justify-end pt-1">
                  <button className="px-3 py-1.5 bg-teal-50 text-teal-700 rounded-xl text-xs font-bold flex items-center gap-1.5 hover:bg-teal-100 transition-colors">
                    <span>Lacak Pengiriman</span>
                    <ExternalLink size={14} />
                  </button>
                </div>
              </div>
            ))}
            {shipments.length === 0 && (
              <div className="py-10 text-center text-gray-500 text-sm">Tidak ada pengiriman ditemukan.</div>
            )}
          </div>
        </div>
      )}

      <Modal 
        isOpen={isModalOpen} 
        onClose={() => setIsModalOpen(false)} 
        title="Pengiriman Baru"
      >
        <form onSubmit={handleSubmit} className="space-y-6">
          <div className="space-y-2">
            <label className="text-xs font-bold text-gray-400 uppercase tracking-wider">Pilih Pesanan</label>
            <select 
              required
              value={formData.orderId}
              onChange={(e) => setFormData({...formData, orderId: e.target.value})}
              className="w-full p-3 bg-gray-50 border-none rounded-xl text-sm focus:ring-2 focus:ring-teal-500/20"
            >
              <option value="">Pilih pesanan...</option>
              {orders.map(order => (
                <option key={order.id} value={order.id}>{order.id} - {order.customerName}</option>
              ))}
            </select>
          </div>

          <div className="grid grid-cols-2 gap-6">
            <div className="space-y-2">
              <label className="text-xs font-bold text-gray-400 uppercase tracking-wider">Kurir</label>
              <select 
                required
                value={formData.courier}
                onChange={(e) => setFormData({...formData, courier: e.target.value})}
                className="w-full p-3 bg-gray-50 border-none rounded-xl text-sm focus:ring-2 focus:ring-teal-500/20"
              >
                <option>JNE</option>
                <option>J&T</option>
                <option>SiCepat</option>
                <option>GoSend</option>
                <option>GrabExpress</option>
                <option>Pengiriman Internal</option>
              </select>
            </div>
            <div className="space-y-2">
              <label className="text-xs font-bold text-gray-400 uppercase tracking-wider">Status</label>
              <select 
                required
                value={formData.status}
                onChange={(e) => setFormData({...formData, status: e.target.value})}
                className="w-full p-3 bg-gray-50 border-none rounded-xl text-sm focus:ring-2 focus:ring-teal-500/20"
              >
                <option value="Pending">Tertunda</option>
                <option value="In Transit">Dalam Perjalanan</option>
                <option value="Delivered">Terkirim</option>
                <option value="Returned">Dikembalikan</option>
              </select>
            </div>
          </div>

          <div className="space-y-2">
            <label className="text-xs font-bold text-gray-400 uppercase tracking-wider">Nomor Resi</label>
            <input 
              required
              type="text" 
              value={formData.trackingNumber}
              onChange={(e) => setFormData({...formData, trackingNumber: e.target.value})}
              placeholder="misal: JNE123456789" 
              className="w-full p-3 bg-gray-50 border-none rounded-xl text-sm focus:ring-2 focus:ring-teal-500/20" 
            />
          </div>

          <div className="space-y-2">
            <label className="text-xs font-bold text-gray-400 uppercase tracking-wider">Alamat Tujuan</label>
            <textarea 
              required
              rows={2}
              value={formData.destination}
              onChange={(e) => setFormData({...formData, destination: e.target.value})}
              placeholder="Alamat lengkap pengiriman..."
              className="w-full p-3 bg-gray-50 border-none rounded-xl text-sm focus:ring-2 focus:ring-teal-500/20"
            />
          </div>

          <div className="space-y-2">
            <label className="text-xs font-bold text-gray-400 uppercase tracking-wider">Estimasi Tiba</label>
            <input 
              required
              type="date" 
              value={formData.estimatedArrival}
              onChange={(e) => setFormData({...formData, estimatedArrival: e.target.value})}
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
              Simpan Pengiriman
            </button>
          </div>
        </form>
      </Modal>
    </div>
  );
};
