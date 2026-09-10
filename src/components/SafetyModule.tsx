import React, { useState, useEffect } from 'react';
import { Card } from '../App';
import { 
  ShieldAlert, 
  ClipboardCheck, 
  AlertTriangle, 
  FileWarning, 
  HardHat,
  Plus,
  Search,
  ChevronRight,
  Loader2
} from 'lucide-react';
import { cn, generateId } from '../lib/utils';
import { sheetsService } from '../services/googleService';
import { Modal } from './ui/Modal';

export const SafetyModule = () => {
  const [activeTab, setActiveTab] = useState<'inspections' | 'incidents' | 'training'>('inspections');
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [loading, setLoading] = useState(true);
  const [data, setData] = useState<any[]>([]);
  
  const [formData, setFormData] = useState({
    type: 'Minor Cut',
    location: '',
    description: '',
    status: 'Investigating',
    date: new Date().toISOString().split('T')[0]
  });

  const fetchData = async () => {
    try {
      setLoading(true);
      const items = await sheetsService.getAll('Safety_Reports');
      setData(Array.isArray(items) ? items : []);
    } catch (error) {
      console.error('Error fetching safety data:', error);
      setData([]);
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
      const newReport = {
        id: generateId('INC'),
        timestamp: new Date().toISOString(),
        user: 'Admin HIJ',
        ...formData
      };
      
      await sheetsService.create('Safety_Reports', newReport);
      setIsModalOpen(false);
      fetchData();
    } catch (error) {
      alert('Gagal menyimpan laporan keselamatan.');
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
          <h2 className="text-2xl font-bold text-gray-900">Keselamatan Kerja (K3)</h2>
          <p className="text-sm text-gray-500">Inspeksi keselamatan kerja, laporan insiden, dan catatan bahaya.</p>
        </div>
        <button 
          onClick={() => setIsModalOpen(true)}
          className="w-full sm:w-auto bg-red-600 text-white px-6 py-2.5 rounded-2xl text-xs sm:text-sm font-semibold flex items-center justify-center gap-2 hover:bg-red-700 transition-all shadow-lg shadow-red-600/10"
        >
          <Plus size={18} />
          Laporkan Insiden
        </button>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-4 sm:gap-6">
        <div className="bg-white rounded-3xl p-6 border border-gray-100 shadow-sm">
          <div className="flex items-center gap-4 mb-4">
            <div className="w-10 h-10 rounded-xl bg-green-50 flex items-center justify-center text-green-600">
              <ClipboardCheck size={20} />
            </div>
            <span className="text-sm font-medium text-gray-500">Hari Aman</span>
          </div>
          <h4 className="text-2xl font-bold">124 Hari</h4>
          <p className="text-xs text-gray-400 mt-1">Sejak insiden terakhir</p>
        </div>
        <div className="bg-white rounded-3xl p-6 border border-gray-100 shadow-sm">
          <div className="flex items-center gap-4 mb-4">
            <div className="w-10 h-10 rounded-xl bg-orange-50 flex items-center justify-center text-orange-600">
              <AlertTriangle size={20} />
            </div>
            <span className="text-sm font-medium text-gray-500">Potensi Bahaya</span>
          </div>
          <h4 className="text-2xl font-bold">{data.filter(i => i.status === 'Investigating').length} Teridentifikasi</h4>
          <p className="text-xs text-orange-500 mt-1 font-medium">Dalam investigasi</p>
        </div>
        <div className="bg-white rounded-3xl p-6 border border-gray-100 shadow-sm">
          <div className="flex items-center gap-4 mb-4">
            <div className="w-10 h-10 rounded-xl bg-teal-50 flex items-center justify-center text-teal-600">
              <HardHat size={20} />
            </div>
            <span className="text-sm font-medium text-gray-500">Kepatuhan APD</span>
          </div>
          <h4 className="text-2xl font-bold">98%</h4>
          <p className="text-xs text-gray-400 mt-1">Berdasarkan audit mingguan</p>
        </div>
      </div>

      <div className="grid grid-cols-3 sm:flex gap-1.5 p-1.5 bg-gray-100 rounded-2xl w-full sm:w-fit">
        {(['inspections', 'incidents', 'training'] as const).map((tab) => (
          <button
            key={tab}
            onClick={() => setActiveTab(tab)}
            className={cn(
              "px-3 sm:px-6 py-2.5 rounded-xl text-xs sm:text-sm font-semibold transition-all capitalize text-center justify-center",
              activeTab === tab ? "bg-white text-teal-700 shadow-sm" : "text-gray-500 hover:text-gray-700"
            )}
          >
            {tab === 'inspections' ? 'Inspeksi' : tab === 'incidents' ? 'Insiden' : 'Pelatihan'}
          </button>
        ))}
      </div>

      {loading ? (
        <div className="flex flex-col items-center justify-center py-20">
          <Loader2 className="animate-spin text-teal-600 mb-4" size={32} />
          <p className="text-gray-500 text-sm">Memuat laporan keselamatan...</p>
        </div>
      ) : (
        <Card title="Laporan Insiden Terbaru" subtitle="Pelacakan insiden dan status investigasi">
          {/* Desktop Table View */}
          <div className="hidden md:block overflow-x-auto">
            <table className="w-full text-left">
              <thead>
                <tr className="border-b border-gray-100">
                  <th className="pb-4 font-semibold text-sm text-gray-500">ID</th>
                  <th className="pb-4 font-semibold text-sm text-gray-500">Tipe</th>
                  <th className="pb-4 font-semibold text-sm text-gray-500">Lokasi</th>
                  <th className="pb-4 font-semibold text-sm text-gray-500">Tanggal</th>
                  <th className="pb-4 font-semibold text-sm text-gray-500">Status</th>
                  <th className="pb-4 font-semibold text-sm text-gray-500 text-right">Aksi</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-50">
                {data.map((inc, i) => (
                  <tr key={inc.id || i} className="hover:bg-gray-50/50 transition-colors">
                    <td className="py-4 text-sm font-bold text-gray-900">{inc.id}</td>
                    <td className="py-4 text-sm text-gray-600 font-medium">{inc.type}</td>
                    <td className="py-4 text-sm text-gray-600">{inc.location}</td>
                    <td className="py-4 text-sm text-gray-600">{inc.date}</td>
                    <td className="py-4">
                      <span className={cn(
                        "px-3 py-1 rounded-full text-[10px] font-bold uppercase tracking-wider",
                        inc.status === 'Resolved' ? "bg-green-100 text-green-700" : "bg-orange-100 text-orange-700"
                      )}>
                        {inc.status}
                      </span>
                    </td>
                    <td className="py-4 text-right">
                      <button className="text-sm font-semibold text-teal-600 hover:text-teal-700 hover:underline">
                        Investigasi
                      </button>
                    </td>
                  </tr>
                ))}
                {data.length === 0 && (
                  <tr>
                    <td colSpan={6} className="py-10 text-center text-gray-500">Tidak ada laporan insiden ditemukan.</td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>

          {/* Mobile Unified Card View */}
          <div className="md:hidden space-y-3">
            {data.map((inc, i) => (
              <div key={inc.id || i} className="p-4 bg-gray-50 rounded-2xl border border-gray-100 space-y-3 shadow-sm">
                <div className="flex items-start justify-between gap-2">
                  <div>
                    <span className="text-[10px] font-bold text-teal-700 bg-teal-50 px-2 py-0.5 rounded-md uppercase tracking-wider inline-block">
                      {inc.id}
                    </span>
                    <h4 className="text-sm font-bold text-gray-900 mt-1">{inc.type}</h4>
                  </div>
                  <span className={cn(
                    "px-2.5 py-1 rounded-full text-[10px] font-bold uppercase tracking-wider whitespace-nowrap flex-shrink-0",
                    inc.status === 'Resolved' ? "bg-green-100 text-green-700" : "bg-orange-100 text-orange-700"
                  )}>
                    {inc.status}
                  </span>
                </div>

                <div className="grid grid-cols-2 gap-2 py-2 border-y border-gray-200/60 text-xs">
                  <div>
                    <span className="text-[10px] text-gray-400 uppercase font-bold block">Lokasi</span>
                    <span className="font-medium text-gray-700">{inc.location}</span>
                  </div>
                  <div>
                    <span className="text-[10px] text-gray-400 uppercase font-bold block">Tanggal</span>
                    <span className="font-semibold text-gray-800">{inc.date}</span>
                  </div>
                </div>

                <div className="flex justify-end pt-1">
                  <button className="px-3 py-1.5 bg-teal-50 text-teal-700 rounded-xl text-xs font-bold hover:bg-teal-100 transition-colors">
                    Investigasi
                  </button>
                </div>
              </div>
            ))}
            {data.length === 0 && (
              <div className="py-10 text-center text-gray-500 text-sm">Tidak ada laporan insiden ditemukan.</div>
            )}
          </div>
        </Card>
      )}

      <Modal 
        isOpen={isModalOpen} 
        onClose={() => setIsModalOpen(false)} 
        title="Laporkan Insiden Keselamatan"
      >
        <form onSubmit={handleSubmit} className="space-y-6">
          <div className="grid grid-cols-2 gap-6">
            <div className="space-y-2">
              <label className="text-xs font-bold text-gray-400 uppercase tracking-wider">Tipe Insiden</label>
              <select 
                required
                value={formData.type}
                onChange={(e) => setFormData({...formData, type: e.target.value})}
                className="w-full p-3 bg-gray-50 border-none rounded-xl text-sm focus:ring-2 focus:ring-teal-500/20"
              >
                <option>Minor Cut</option>
                <option>Near Miss</option>
                <option>Slip/Trip</option>
                <option>Equipment Failure</option>
                <option>Chemical Exposure</option>
                <option>Other</option>
              </select>
            </div>
            <div className="space-y-2">
              <label className="text-xs font-bold text-gray-400 uppercase tracking-wider">Tanggal</label>
              <input 
                required
                type="date" 
                value={formData.date}
                onChange={(e) => setFormData({...formData, date: e.target.value})}
                className="w-full p-3 bg-gray-50 border-none rounded-xl text-sm focus:ring-2 focus:ring-teal-500/20" 
              />
            </div>
          </div>

          <div className="space-y-2">
            <label className="text-xs font-bold text-gray-400 uppercase tracking-wider">Lokasi</label>
            <input 
              required
              type="text" 
              value={formData.location}
              onChange={(e) => setFormData({...formData, location: e.target.value})}
              placeholder="misal: Sewing Line A, Cutting Room" 
              className="w-full p-3 bg-gray-50 border-none rounded-xl text-sm focus:ring-2 focus:ring-teal-500/20" 
            />
          </div>

          <div className="space-y-2">
            <label className="text-xs font-bold text-gray-400 uppercase tracking-wider">Deskripsi</label>
            <textarea 
              required
              rows={3}
              value={formData.description}
              onChange={(e) => setFormData({...formData, description: e.target.value})}
              placeholder="Jelaskan detail insiden..."
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
              className="px-8 py-2.5 bg-red-600 text-white rounded-2xl text-sm font-semibold shadow-lg shadow-red-600/10 hover:bg-red-700 transition-all"
            >
              Kirim Laporan
            </button>
          </div>
        </form>
      </Modal>
    </div>
  );
};
