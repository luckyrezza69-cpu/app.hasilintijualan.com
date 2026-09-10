import React, { useState, useEffect } from 'react';
import { Card } from '../App';
import { 
  Settings, 
  Wrench, 
  Activity, 
  AlertTriangle, 
  Calendar,
  Plus,
  Search,
  Loader2
} from 'lucide-react';
import { cn, generateId } from '../lib/utils';
import { sheetsService } from '../services/googleService';
import { Modal } from './ui/Modal';

export const MachinesModule = () => {
  const [activeTab, setActiveTab] = useState<'list' | 'maintenance' | 'downtime'>('list');
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [loading, setLoading] = useState(true);
  const [data, setData] = useState<any[]>([]);
  
  const [formData, setFormData] = useState({
    name: '',
    type: 'Single Needle',
    status: 'Running',
    lastMaint: new Date().toISOString().split('T')[0],
    health: 100
  });

  const fetchData = async () => {
    try {
      setLoading(true);
      const items = await sheetsService.getAll('Machines');
      setData(Array.isArray(items) ? items : []);
    } catch (error) {
      console.error('Error fetching machine data:', error);
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
      const newMachine = {
        id: generateId('MAC'),
        timestamp: new Date().toISOString(),
        user: 'Admin HIJ',
        ...formData
      };
      
      await sheetsService.create('Machines', newMachine);
      setIsModalOpen(false);
      fetchData();
    } catch (error) {
      alert('Gagal menyimpan data mesin.');
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
          <h2 className="text-2xl font-bold text-gray-900">Manajemen Mesin</h2>
          <p className="text-sm text-gray-500">Lacak aset mesin, jadwal perawatan, dan waktu henti.</p>
        </div>
        <button 
          onClick={() => setIsModalOpen(true)}
          className="w-full sm:w-auto bg-gradient-to-r from-teal-600 to-emerald-600 hover:from-teal-700 hover:to-emerald-700 text-white px-6 py-2.5 rounded-2xl text-xs sm:text-sm font-semibold flex items-center justify-center gap-2 transition-all shadow-lg shadow-teal-600/20"
        >
          <Plus size={18} />
          Tambah Mesin
        </button>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-4 sm:gap-6">
        <div className="bg-white rounded-3xl p-6 border border-gray-100 shadow-sm">
          <div className="flex items-center gap-4 mb-4">
            <div className="w-10 h-10 rounded-xl bg-teal-50 flex items-center justify-center text-teal-600">
              <Settings size={20} />
            </div>
            <span className="text-sm font-medium text-gray-500">Total Aset</span>
          </div>
          <h4 className="text-2xl font-bold">{data.length} Unit</h4>
          <p className="text-xs text-gray-400 mt-1">Peralatan produksi</p>
        </div>
        <div className="bg-white rounded-3xl p-6 border border-gray-100 shadow-sm">
          <div className="flex items-center gap-4 mb-4">
            <div className="w-10 h-10 rounded-xl bg-green-50 flex items-center justify-center text-green-600">
              <Activity size={20} />
            </div>
            <span className="text-sm font-medium text-gray-500">Berjalan</span>
          </div>
          <h4 className="text-2xl font-bold">{data.filter(i => i.status === 'Running').length} Unit</h4>
          <p className="text-xs text-green-600 mt-1 font-medium">Saat ini beroperasi</p>
        </div>
        <div className="bg-white rounded-3xl p-6 border border-gray-100 shadow-sm">
          <div className="flex items-center gap-4 mb-4">
            <div className="w-10 h-10 rounded-xl bg-red-50 flex items-center justify-center text-red-600">
              <Wrench size={20} />
            </div>
            <span className="text-sm font-medium text-gray-500">Perbaikan Aktif</span>
          </div>
          <h4 className="text-2xl font-bold">{data.filter(i => i.status === 'Repair' || i.status === 'Maintenance').length} Unit</h4>
          <p className="text-xs text-red-500 mt-1 font-medium">Memerlukan perhatian</p>
        </div>
      </div>

      <div className="grid grid-cols-3 sm:flex gap-1.5 p-1.5 bg-gray-100 rounded-2xl w-full sm:w-fit">
        {(['list', 'maintenance', 'downtime'] as const).map((tab) => (
          <button
            key={tab}
            onClick={() => setActiveTab(tab)}
            className={cn(
              "px-3 sm:px-6 py-2.5 rounded-xl text-xs sm:text-sm font-semibold transition-all capitalize text-center justify-center",
              activeTab === tab ? "bg-white text-teal-700 shadow-sm" : "text-gray-500 hover:text-gray-700"
            )}
          >
            {tab === 'list' ? 'Daftar' : tab === 'maintenance' ? 'Perawatan' : 'Waktu Henti'}
          </button>
        ))}
      </div>

      {loading ? (
        <div className="flex flex-col items-center justify-center py-20">
          <Loader2 className="animate-spin text-teal-600 mb-4" size={32} />
          <p className="text-gray-500 text-sm">Memuat mesin...</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {data.length > 0 ? data.map((mac, i) => (
            <Card key={mac.id || i}>
              <div className="flex justify-between items-start mb-6">
                <div className="flex items-center gap-4">
                  <div className="w-14 h-14 rounded-2xl bg-gray-50 flex items-center justify-center text-gray-400">
                    <Settings size={28} />
                  </div>
                  <div>
                    <h3 className="text-lg font-bold text-gray-900">{mac.name}</h3>
                    <p className="text-sm text-gray-500">{mac.type}</p>
                  </div>
                </div>
                <span className={cn(
                  "px-3 py-1 rounded-full text-[10px] font-bold uppercase tracking-wider",
                  mac.status === 'Running' ? "bg-green-100 text-green-700" : 
                  mac.status === 'Maintenance' ? "bg-teal-100 text-teal-700" : "bg-red-100 text-red-700"
                )}>
                  {mac.status === 'Running' ? 'Berjalan' : mac.status === 'Maintenance' ? 'Perawatan' : 'Perbaikan'}
                </span>
              </div>
              
              <div className="grid grid-cols-2 gap-6 mb-6">
                <div className="p-4 bg-gray-50 rounded-2xl">
                  <p className="text-[10px] font-bold text-gray-400 uppercase tracking-wider mb-1">Skor Kesehatan</p>
                  <div className="flex items-center gap-2">
                    <div className="flex-1 h-1.5 bg-gray-200 rounded-full overflow-hidden">
                      <div className={cn("h-full rounded-full", Number(mac.health) > 80 ? "bg-green-500" : Number(mac.health) > 50 ? "bg-orange-500" : "bg-red-500")} style={{ width: `${mac.health}%` }} />
                    </div>
                    <span className="text-sm font-bold">{mac.health}%</span>
                  </div>
                </div>
                <div className="p-4 bg-gray-50 rounded-2xl">
                  <p className="text-[10px] font-bold text-gray-400 uppercase tracking-wider mb-1">Perawatan Terakhir</p>
                  <p className="text-sm font-bold text-gray-900">{mac.lastMaint}</p>
                </div>
              </div>

              <div className="flex justify-end gap-3">
                <button className="px-4 py-2 text-xs font-bold text-gray-500 hover:text-gray-900 transition-colors">Lihat Log</button>
                <button className="px-4 py-2 bg-gradient-to-r from-teal-600 to-emerald-600 hover:from-teal-700 hover:to-emerald-700 text-white rounded-xl text-xs font-bold transition-all shadow-md shadow-teal-600/20">Jadwalkan Perawatan</button>
              </div>
            </Card>
          )) : (
            <div className="col-span-full py-20 text-center text-gray-500">Tidak ada mesin ditemukan.</div>
          )}
        </div>
      )}

      <Modal 
        isOpen={isModalOpen} 
        onClose={() => setIsModalOpen(false)} 
        title="Tambah Mesin Baru"
      >
        <form onSubmit={handleSubmit} className="space-y-6">
          <div className="space-y-2">
            <label className="text-xs font-bold text-gray-400 uppercase tracking-wider">Nama Mesin</label>
            <input 
              required
              type="text" 
              value={formData.name}
              onChange={(e) => setFormData({...formData, name: e.target.value})}
              placeholder="misal: Juki DDL-8700" 
              className="w-full p-3 bg-gray-50 border-none rounded-xl text-sm focus:ring-2 focus:ring-teal-500/20" 
            />
          </div>

          <div className="grid grid-cols-2 gap-6">
            <div className="space-y-2">
              <label className="text-xs font-bold text-gray-400 uppercase tracking-wider">Tipe Mesin</label>
              <select 
                required
                value={formData.type}
                onChange={(e) => setFormData({...formData, type: e.target.value})}
                className="w-full p-3 bg-gray-50 border-none rounded-xl text-sm focus:ring-2 focus:ring-teal-500/20"
              >
                <option>Jarum Tunggal</option>
                <option>Obras</option>
                <option>Karet</option>
                <option>Lubang Kancing</option>
                <option>Potong</option>
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
                <option>Berjalan</option>
                <option>Perawatan</option>
                <option>Perbaikan</option>
                <option>Menganggur</option>
              </select>
            </div>
          </div>

          <div className="grid grid-cols-2 gap-6">
            <div className="space-y-2">
              <label className="text-xs font-bold text-gray-400 uppercase tracking-wider">Skor Kesehatan (%)</label>
              <input 
                required
                type="number" 
                min="0"
                max="100"
                value={formData.health}
                onChange={(e) => setFormData({...formData, health: Number(e.target.value)})}
                className="w-full p-3 bg-gray-50 border-none rounded-xl text-sm focus:ring-2 focus:ring-teal-500/20" 
              />
            </div>
            <div className="space-y-2">
              <label className="text-xs font-bold text-gray-400 uppercase tracking-wider">Perawatan Terakhir</label>
              <input 
                required
                type="date" 
                value={formData.lastMaint}
                onChange={(e) => setFormData({...formData, lastMaint: e.target.value})}
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
              Simpan Mesin
            </button>
          </div>
        </form>
      </Modal>
    </div>
  );
};
