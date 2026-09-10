import React, { useState, useEffect, useMemo } from 'react';
import { Card } from '../App';
import { 
  UserCog, 
  Users, 
  Target, 
  TrendingUp, 
  Award,
  Plus,
  Search,
  X,
  ChevronRight,
  Loader2
} from 'lucide-react';
import { cn, formatCurrency, generateId } from '../lib/utils';
import { sheetsService } from '../services/googleService';
import { Modal } from './ui/Modal';

export const HRModule = () => {
  const [activeTab, setActiveTab] = useState<'operators' | 'wages' | 'skills'>('operators');
  const [searchQuery, setSearchQuery] = useState('');
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [isHistoryModalOpen, setIsHistoryModalOpen] = useState(false);
  const [selectedEmployee, setSelectedEmployee] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [data, setData] = useState<any[]>([]);
  const [spkData, setSpkData] = useState<any[]>([]);
  
  const [formData, setFormData] = useState({
    name: '',
    role: 'Cutting',
    skill: 'B',
    wage: 0,
    joinDate: new Date().toISOString().split('T')[0]
  });

  const fetchData = async () => {
    try {
      setLoading(true);
      const [items, spks] = await Promise.all([
        sheetsService.getAll('Operators'),
        sheetsService.getAll('SPK_Produksi')
      ]);
      setData(Array.isArray(items) ? items : []);
      setSpkData(Array.isArray(spks) ? spks : []);
    } catch (error) {
      console.error('Error fetching HR data:', error);
      setData([]);
      setSpkData([]);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
  }, []);

  const filteredData = useMemo(() => {
    if (!searchQuery.trim()) return data;
    const q = searchQuery.toLowerCase();
    return data.filter(op => {
      const nameKey = Object.keys(op).find(k => k.toLowerCase().trim() === 'name');
      const roleKey = Object.keys(op).find(k => k.toLowerCase().trim() === 'role');
      const skillKey = Object.keys(op).find(k => k.toLowerCase().trim() === 'skill');
      const joinDateKey = Object.keys(op).find(k => k.toLowerCase().trim() === 'joindate' || k.toLowerCase().trim() === 'join date');
      const wageKey = Object.keys(op).find(k => k.toLowerCase().trim() === 'wage');

      const opName = String(nameKey ? op[nameKey] : '').toLowerCase();
      const opRole = String(roleKey ? op[roleKey] : '').toLowerCase();
      const opSkill = String(skillKey ? op[skillKey] : '').toLowerCase();
      const opJoinDate = String(joinDateKey ? op[joinDateKey] : '').toLowerCase();
      const opWage = String(wageKey ? op[wageKey] : '').toLowerCase();
      const id = String(op.id || '').toLowerCase();
      const status = String(op.status || '').toLowerCase();

      return opName.includes(q) || 
             opRole.includes(q) || 
             opSkill.includes(q) || 
             opJoinDate.includes(q) || 
             opWage.includes(q) ||
             id.includes(q) ||
             status.includes(q);
    });
  }, [data, searchQuery]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      const newEmployee = {
        id: generateId('EMP'),
        timestamp: new Date().toISOString(),
        user: 'Admin HIJ',
        ...formData,
        status: 'Active'
      };
      
      await sheetsService.create('Operators', newEmployee);
      setIsModalOpen(false);
      fetchData();
    } catch (error) {
      alert('Gagal menyimpan data karyawan.');
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
          <h2 className="text-2xl font-bold text-gray-900">Sumber Daya Manusia (HR)</h2>
          <p className="text-sm text-gray-500">Kelola staf produksi, klasifikasi keterampilan, dan gaji.</p>
        </div>
        <button 
          onClick={() => setIsModalOpen(true)}
          className="w-full sm:w-auto bg-gradient-to-r from-teal-600 to-emerald-600 hover:from-teal-700 hover:to-emerald-700 text-white px-6 py-2.5 rounded-2xl text-xs sm:text-sm font-semibold flex items-center justify-center gap-2 transition-all shadow-lg shadow-teal-600/20"
        >
          <Plus size={18} />
          Tambah Karyawan
        </button>
      </div>

      <div className="grid grid-cols-2 md:grid-cols-4 gap-4 md:gap-6">
        <div className="bg-white rounded-3xl p-4 md:p-6 border border-gray-100 shadow-sm">
          <p className="text-[10px] md:text-xs font-bold text-gray-400 uppercase tracking-widest mb-1">Total Karyawan</p>
          <h4 className="text-xl md:text-2xl font-bold">{data.length}</h4>
        </div>
        <div className="bg-white rounded-3xl p-4 md:p-6 border border-gray-100 shadow-sm">
          <p className="text-[10px] md:text-xs font-bold text-gray-400 uppercase tracking-widest mb-1">Operator Aktif</p>
          <h4 className="text-xl md:text-2xl font-bold text-teal-600">{data.filter(i => i.status === 'Active').length}</h4>
        </div>
        <div className="bg-white rounded-3xl p-4 md:p-6 border border-gray-100 shadow-sm">
          <p className="text-[10px] md:text-xs font-bold text-gray-400 uppercase tracking-widest mb-1">Grade Skill A/A+</p>
          <h4 className="text-xl md:text-2xl font-bold text-green-600">{data.filter(i => i.skill?.includes('A')).length}</h4>
        </div>
        <div className="bg-white rounded-3xl p-4 md:p-6 border border-gray-100 shadow-sm">
          <p className="text-[10px] md:text-xs font-bold text-gray-400 uppercase tracking-widest mb-1">Total Gaji Bulanan</p>
          <h4 className="text-xl md:text-2xl font-bold">{formatCurrency(data.reduce((acc, i) => acc + Number(i.wage || 0), 0))}</h4>
        </div>
      </div>

      <div className="flex flex-col sm:flex-row justify-between items-stretch sm:items-center gap-4">
        <div className="grid grid-cols-3 sm:flex gap-1.5 p-1.5 bg-gray-100 rounded-2xl w-full sm:w-fit">
          {(['operators', 'wages', 'skills'] as const).map((tab) => (
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
              {tab === 'operators' ? 'Operator' : tab === 'wages' ? 'Gaji' : 'Keahlian'}
            </button>
          ))}
        </div>

        {/* Search Bar */}
        <div className="relative flex-1 sm:max-w-md">
          <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 text-gray-400" size={18} />
          <input 
            type="text" 
            placeholder="Cari nama karyawan, posisi, grade skill..." 
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
          <p className="text-gray-500 text-sm">Memuat data HR...</p>
        </div>
      ) : (
        <Card>
          {/* Desktop Table View */}
          <div className="hidden md:block overflow-x-auto">
            <table className="w-full text-left border-collapse">
              <thead>
                <tr className="border-b border-gray-100">
                  <th className="pb-4 font-bold text-sm text-gray-400 uppercase tracking-widest whitespace-nowrap pr-4">Karyawan</th>
                  <th className="pb-4 font-bold text-sm text-gray-400 uppercase tracking-widest whitespace-nowrap pr-4">Posisi</th>
                  <th className="pb-4 font-bold text-sm text-gray-400 uppercase tracking-widest whitespace-nowrap pr-4">Grade Skill</th>
                  <th className="pb-4 font-bold text-sm text-gray-400 uppercase tracking-widest whitespace-nowrap pr-4">Tgl Bergabung</th>
                  <th className="pb-4 font-bold text-sm text-gray-400 uppercase tracking-widest whitespace-nowrap pr-4">Gaji Pokok</th>
                  <th className="pb-4 font-bold text-sm text-gray-400 uppercase tracking-widest whitespace-nowrap text-right">Aksi</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-50">
                {filteredData.length > 0 ? filteredData.map((op, i) => {
                  const nameKey = Object.keys(op).find(k => k.toLowerCase().trim() === 'name');
                  const roleKey = Object.keys(op).find(k => k.toLowerCase().trim() === 'role');
                  const skillKey = Object.keys(op).find(k => k.toLowerCase().trim() === 'skill');
                  const joinDateKey = Object.keys(op).find(k => k.toLowerCase().trim() === 'joindate' || k.toLowerCase().trim() === 'join date');
                  const wageKey = Object.keys(op).find(k => k.toLowerCase().trim() === 'wage');

                  const opName = nameKey ? op[nameKey] : 'Unknown';
                  const opRole = roleKey ? op[roleKey] : '-';
                  const opSkill = skillKey ? op[skillKey] : '-';
                  const opJoinDate = joinDateKey ? op[joinDateKey] : '-';
                  const opWage = wageKey ? op[wageKey] : 0;

                  return (
                  <tr key={op.id || i} className="hover:bg-gray-50/50 transition-colors">
                    <td className="py-4 pr-4 whitespace-nowrap">
                      <div className="flex items-center gap-3">
                        <div className="w-8 h-8 rounded-full bg-gray-100 overflow-hidden flex-shrink-0">
                          <img src={`https://picsum.photos/seed/hr${op.id}/50/50`} alt={opName} referrerPolicy="no-referrer" />
                        </div>
                        <span className="text-sm font-bold text-gray-900">{opName}</span>
                      </div>
                    </td>
                    <td className="py-4 text-sm text-gray-600 whitespace-nowrap pr-4 font-medium">{opRole}</td>
                    <td className="py-4 whitespace-nowrap pr-4">
                      <span className="px-2.5 py-1 rounded-md bg-teal-50 text-teal-700 text-xs font-bold">
                        Grade {opSkill}
                      </span>
                    </td>
                    <td className="py-4 text-sm text-gray-600 whitespace-nowrap pr-4">{opJoinDate}</td>
                    <td className="py-4 text-sm text-gray-900 font-bold whitespace-nowrap pr-4">{formatCurrency(opWage)}</td>
                    <td className="py-4 text-right whitespace-nowrap">
                      <button 
                        onClick={() => {
                          setSelectedEmployee({ ...op, opName, opRole, opSkill });
                          setIsHistoryModalOpen(true);
                        }}
                        className="p-2 hover:bg-teal-50 rounded-lg text-gray-400 hover:text-teal-600 transition-colors"
                        title="Lihat Detail"
                      >
                        <ChevronRight size={18} />
                      </button>
                    </td>
                  </tr>
                  );
                }) : (
                  <tr>
                    <td colSpan={6} className="py-20 text-center text-gray-500 text-sm">
                      {searchQuery ? `Tidak ada karyawan yang cocok dengan "${searchQuery}".` : 'No employees found.'}
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>

          {/* Mobile Unified Card View */}
          <div className="md:hidden space-y-3">
            {filteredData.length > 0 ? filteredData.map((op, i) => {
              const nameKey = Object.keys(op).find(k => k.toLowerCase().trim() === 'name');
              const roleKey = Object.keys(op).find(k => k.toLowerCase().trim() === 'role');
              const skillKey = Object.keys(op).find(k => k.toLowerCase().trim() === 'skill');
              const joinDateKey = Object.keys(op).find(k => k.toLowerCase().trim() === 'joindate' || k.toLowerCase().trim() === 'join date');
              const wageKey = Object.keys(op).find(k => k.toLowerCase().trim() === 'wage');

              const opName = nameKey ? op[nameKey] : 'Unknown';
              const opRole = roleKey ? op[roleKey] : '-';
              const opSkill = skillKey ? op[skillKey] : '-';
              const opJoinDate = joinDateKey ? op[joinDateKey] : '-';
              const opWage = wageKey ? op[wageKey] : 0;

              return (
                <div key={op.id || i} className="p-4 bg-gray-50 rounded-2xl border border-gray-100 space-y-3 shadow-sm">
                  <div className="flex items-start justify-between gap-2">
                    <div className="flex items-center gap-3">
                      <div className="w-10 h-10 rounded-full bg-gray-200 overflow-hidden flex-shrink-0">
                        <img src={`https://picsum.photos/seed/hr${op.id}/50/50`} alt={opName} referrerPolicy="no-referrer" />
                      </div>
                      <div>
                        <h4 className="text-sm font-bold text-gray-900">{opName}</h4>
                        <span className="text-[10px] text-gray-400 font-medium block">{opRole}</span>
                      </div>
                    </div>
                    <span className="px-2.5 py-1 rounded-md bg-teal-50 text-teal-700 text-xs font-bold whitespace-nowrap">
                      Grade {opSkill}
                    </span>
                  </div>

                  <div className="grid grid-cols-2 gap-2 py-2 border-y border-gray-200/60 text-xs">
                    <div>
                      <span className="text-[10px] text-gray-400 uppercase font-bold block">Tgl Masuk</span>
                      <span className="font-medium text-gray-700">{opJoinDate}</span>
                    </div>
                    <div>
                      <span className="text-[10px] text-gray-400 uppercase font-bold block">Gaji Pokok</span>
                      <span className="font-bold text-teal-700">{formatCurrency(opWage)}</span>
                    </div>
                  </div>

                  <div className="flex justify-end pt-1">
                    <button 
                      onClick={() => {
                        setSelectedEmployee({ ...op, opName, opRole, opSkill });
                        setIsHistoryModalOpen(true);
                      }}
                      className="px-3 py-1.5 bg-teal-50 text-teal-700 rounded-xl text-xs font-bold flex items-center gap-1 hover:bg-teal-100 transition-colors"
                    >
                      <span>Lihat Riwayat</span>
                      <ChevronRight size={14} />
                    </button>
                  </div>
                </div>
              );
            }) : (
              <div className="py-12 text-center text-gray-500 text-sm">
                {searchQuery ? `Tidak ada karyawan yang cocok dengan "${searchQuery}".` : 'No employees found.'}
              </div>
            )}
          </div>
        </Card>
      )}

      <Modal 
        isOpen={isModalOpen} 
        onClose={() => setIsModalOpen(false)} 
        title="Add New Employee"
      >
        <form onSubmit={handleSubmit} className="space-y-6">
          <div className="space-y-2">
            <label className="text-xs font-bold text-gray-400 uppercase tracking-wider">Full Name</label>
            <input 
              required
              type="text" 
              value={formData.name}
              onChange={(e) => setFormData({...formData, name: e.target.value})}
              placeholder="misal: Budi Santoso" 
              className="w-full p-3 bg-gray-50 border-none rounded-xl text-sm focus:ring-2 focus:ring-teal-500/20" 
            />
          </div>

          <div className="grid grid-cols-2 gap-6">
            <div className="space-y-2">
              <label className="text-xs font-bold text-gray-400 uppercase tracking-wider">Posisi / Bagian</label>
              <select 
                required
                value={formData.role}
                onChange={(e) => setFormData({...formData, role: e.target.value})}
                className="w-full p-3 bg-gray-50 border-none rounded-xl text-sm focus:ring-2 focus:ring-teal-500/20"
              >
                <option>Cutting</option>
                <option>Sewing</option>
                <option>Finishing</option>
                <option>QC</option>
                <option>Tailor</option>
                <option>Pattern Maker</option>
                <option>Cutting Specialist</option>
                <option>QC Inspector</option>
                <option>Operator</option>
              </select>
            </div>
            <div className="space-y-2">
              <label className="text-xs font-bold text-gray-400 uppercase tracking-wider">Grade Skill</label>
              <select 
                required
                value={formData.skill}
                onChange={(e) => setFormData({...formData, skill: e.target.value})}
                className="w-full p-3 bg-gray-50 border-none rounded-xl text-sm focus:ring-2 focus:ring-teal-500/20"
              >
                <option>A+</option>
                <option>A</option>
                <option>B</option>
                <option>C</option>
              </select>
            </div>
          </div>

          <div className="grid grid-cols-2 gap-6">
            <div className="space-y-2">
              <label className="text-xs font-bold text-gray-400 uppercase tracking-wider">Gaji Pokok Bulanan</label>
              <input 
                required
                type="number" 
                value={formData.wage}
                onChange={(e) => setFormData({...formData, wage: Number(e.target.value)})}
                className="w-full p-3 bg-gray-50 border-none rounded-xl text-sm focus:ring-2 focus:ring-teal-500/20" 
              />
            </div>
            <div className="space-y-2">
              <label className="text-xs font-bold text-gray-400 uppercase tracking-wider">Tgl Bergabung</label>
              <input 
                required
                type="date" 
                value={formData.joinDate}
                onChange={(e) => setFormData({...formData, joinDate: e.target.value})}
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
              Simpan Karyawan
            </button>
          </div>
        </form>
      </Modal>

      <Modal
        isOpen={isHistoryModalOpen}
        onClose={() => setIsHistoryModalOpen(false)}
        title="Riwayat Pekerjaan Karyawan"
      >
        {selectedEmployee && (
          <div className="space-y-6">
            <div className="flex items-center gap-4 p-4 bg-gray-50 rounded-2xl">
              <div className="w-12 h-12 rounded-full bg-gray-200 overflow-hidden">
                <img src={`https://picsum.photos/seed/hr${selectedEmployee.id}/100/100`} alt={selectedEmployee.opName} referrerPolicy="no-referrer" />
              </div>
              <div>
                <h3 className="font-bold text-gray-900">{selectedEmployee.opName}</h3>
                <p className="text-sm text-gray-500">{selectedEmployee.opRole} • Grade {selectedEmployee.opSkill}</p>
              </div>
            </div>

            <div className="max-h-[50vh] overflow-y-auto pr-2 -mx-4 px-4 md:mx-0 md:px-0">
              <table className="w-full text-left border-collapse">
                <thead className="sticky top-0 bg-white z-10">
                  <tr>
                    <th className="py-3 font-bold text-[10px] md:text-xs text-gray-400 uppercase tracking-widest whitespace-nowrap pr-4">Project (SPK)</th>
                    <th className="py-3 font-bold text-[10px] md:text-xs text-gray-400 uppercase tracking-widest whitespace-nowrap pr-4">Tanggal</th>
                    <th className="py-3 font-bold text-[10px] md:text-xs text-gray-400 uppercase tracking-widest whitespace-nowrap pr-4">Detail Pekerjaan</th>
                    <th className="py-3 font-bold text-[10px] md:text-xs text-gray-400 uppercase tracking-widest whitespace-nowrap text-right">Total Qty</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-50">
                  {(() => {
                    const history: any[] = [];
                    
                    spkData.forEach(spk => {
                      if (!spk.employeeProgress) return;
                      
                      try {
                        const progress = JSON.parse(spk.employeeProgress);
                        let totalWork = 0;
                        const stages: string[] = [];
                        
                        Object.keys(progress).forEach(stage => {
                          if (progress[stage] && progress[stage][selectedEmployee.id]) {
                            const amount = progress[stage][selectedEmployee.id];
                            if (amount > 0) {
                              totalWork += amount;
                              stages.push(`${stage.charAt(0).toUpperCase() + stage.slice(1)}: ${amount}`);
                            }
                          }
                        });
                        
                        if (totalWork > 0) {
                          history.push({
                            spkId: spk.id,
                            productName: spk.productName || 'Unknown Project',
                            date: new Date(spk.timestamp).toLocaleDateString(),
                            totalWork,
                            stages: stages.join(', ')
                          });
                        }
                      } catch (e) {}
                    });

                    if (history.length === 0) {
                      return (
                        <tr>
                          <td colSpan={4} className="py-10 text-center text-gray-500 text-[11px] md:text-sm">
                            Belum ada riwayat pekerjaan untuk karyawan ini.
                          </td>
                        </tr>
                      );
                    }

                    return history.map((item, idx) => (
                      <tr key={idx} className="hover:bg-gray-50/50 transition-colors">
                        <td className="py-3 pr-4 whitespace-nowrap">
                          <p className="font-bold text-[11px] md:text-sm text-gray-900">{item.productName}</p>
                          <p className="text-[10px] md:text-xs text-gray-500">{item.spkId}</p>
                        </td>
                        <td className="py-3 text-[11px] md:text-sm text-gray-600 whitespace-nowrap pr-4">{item.date}</td>
                        <td className="py-3 text-[11px] md:text-sm text-gray-600 whitespace-nowrap pr-4">{item.stages}</td>
                        <td className="py-3 text-[11px] md:text-sm font-bold text-gray-900 text-right whitespace-nowrap">{item.totalWork} pcs</td>
                      </tr>
                    ));
                  })()}
                </tbody>
              </table>
            </div>

            <div className="pt-4 flex justify-end">
              <button 
                onClick={() => setIsHistoryModalOpen(false)} 
                className="px-6 py-2.5 bg-gray-100 text-gray-700 rounded-2xl text-sm font-semibold hover:bg-gray-200 transition-all"
              >
                Tutup
              </button>
            </div>
          </div>
        )}
      </Modal>
    </div>
  );
};
