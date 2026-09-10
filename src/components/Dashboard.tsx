import React, { useState, useEffect } from 'react';
import { 
  ChevronRight, 
  Loader2, 
  ShieldAlert, 
  ShoppingCart,
  Factory,
  CheckCircle,
  Wallet
} from 'lucide-react';
import { motion } from 'motion/react';
import { cn, formatCurrency } from '../lib/utils';
import { Card } from '../App';
import { sheetsService } from '../services/googleService';

const StatCard = ({ label, value, trend, color, icon: Icon }: { label: string, value: string, trend?: string, color: string, icon: any }) => (
  <div className="bg-white rounded-3xl p-4 md:p-6 shadow-[0_8px_30px_rgb(0,0,0,0.04)] border border-gray-100 relative overflow-hidden group hover:shadow-xl transition-all duration-300">
    <div className={cn("absolute top-0 right-0 w-20 h-20 md:w-24 md:h-24 -mr-8 -mt-8 rounded-full opacity-5 group-hover:opacity-10 transition-opacity", color.replace('text-', 'bg-'))} />
    <div className="flex items-start justify-between relative z-10">
      <div>
        <p className="text-[10px] md:text-xs font-bold text-gray-400 uppercase tracking-wider mb-1">{label}</p>
        <h4 className="text-xl md:text-2xl font-black text-gray-900 tracking-tight">{value}</h4>
        {trend && (
          <p className={cn("text-[9px] md:text-[10px] mt-2 font-bold uppercase tracking-wide", color)}>
            {trend}
          </p>
        )}
      </div>
      <div className={cn("p-2 md:p-3 rounded-2xl", color.replace('text-', 'bg-').replace('-600', '-50'))}>
        <Icon size={18} className={cn("md:w-5 md:h-5", color)} />
      </div>
    </div>
  </div>
);

export const Dashboard = ({ onNavigate }: { onNavigate?: (module: string) => void }) => {
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [stats, setStats] = useState({
    orders: 0,
    production: 0,
    qc: 0,
    revenue: 0
  });
  const [recentOrders, setRecentOrders] = useState<any[]>([]);
  const [recentSpks, setRecentSpks] = useState<any[]>([]);

  useEffect(() => {
    const fetchDashboardData = async () => {
      try {
        setLoading(true);
        setError(null);

        const [ordersRaw, spksRaw, qcRaw, invoicesRaw] = await Promise.all([
          sheetsService.getAll('Orders'),
          sheetsService.getAll('SPK_Produksi'),
          sheetsService.getAll('QC_Reports'),
          sheetsService.getAll('Invoices')
        ]);

        const orders = Array.isArray(ordersRaw) ? ordersRaw : [];
        const spks = Array.isArray(spksRaw) ? spksRaw : [];
        const qc = Array.isArray(qcRaw) ? qcRaw : [];
        const invoices = Array.isArray(invoicesRaw) ? invoicesRaw : [];

        const totalRevenue = invoices.reduce((sum, inv) => sum + (Number(inv.total) || 0), 0);

        setStats({
          orders: orders.length,
          production: spks.filter(s => s.status === 'In Progress').length,
          qc: qc.filter(q => q.status === 'Pending').length,
          revenue: totalRevenue
        });

        setRecentOrders(orders.slice(-5).reverse());
        
        // Sort SPKs by progress descending and take top 3
        const activeSpks = (Array.isArray(spks) ? spks : []).filter(s => s.status !== 'Planned');
        const sortedSpks = [...activeSpks].sort((a, b) => {
          const progressA = Number(a.progress) || 0;
          const progressB = Number(b.progress) || 0;
          return progressB - progressA;
        }).slice(0, 3);
        setRecentSpks(sortedSpks);
      } catch (err: any) {
        console.error('Error fetching dashboard data:', err);
        const message = err.response?.data?.error || err.message || "Failed to fetch dashboard data.";
        setError(message);
      } finally {
        setLoading(false);
      }
    };

    fetchDashboardData();
  }, []);

  if (loading) {
    return (
      <div className="flex flex-col items-center justify-center py-40">
        <Loader2 className="animate-spin text-teal-600 mb-4" size={40} />
        <p className="text-gray-500 font-medium">Loading dashboard data...</p>
      </div>
    );
  }

  if (error) {
    return (
      <div className="flex flex-col items-center justify-center py-40 text-center">
        <div className="w-16 h-16 bg-red-50 rounded-2xl flex items-center justify-center text-red-600 mb-4">
          <ShieldAlert size={32} />
        </div>
        <h3 className="text-lg font-bold text-gray-900">Dashboard Error</h3>
        <p className="text-gray-500 mt-2 max-w-md">{error}</p>
        <button 
          onClick={() => window.location.reload()}
          className="mt-6 px-6 py-2 bg-teal-600 text-white rounded-xl text-sm font-bold hover:bg-teal-700 transition-colors"
        >
          Retry
        </button>
      </div>
    );
  }

  return (
    <div className="space-y-8">
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 md:gap-6">
        <StatCard label="Total Pesanan" value={stats.orders.toString()} trend="+12% dari bulan lalu" color="text-emerald-600" icon={ShoppingCart} />
        <StatCard label="Produksi Berjalan" value={stats.production.toString()} trend="Sesuai target" color="text-teal-600" icon={Factory} />
        <StatCard label="Menunggu QC" value={stats.qc.toString()} trend="Perlu perhatian" color="text-orange-600" icon={CheckCircle} />
        <StatCard label="Pendapatan" value={formatCurrency(stats.revenue)} trend="+5% dari target" color="text-emerald-600" icon={Wallet} />
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
        <Card title="Pesanan Terbaru" subtitle="5 pesanan terakhir di sistem">
          <div className="space-y-4">
            {recentOrders.length > 0 ? recentOrders.map((order, i) => (
              <div key={order.id || i} className="flex items-center justify-between p-4 rounded-2xl bg-gray-50 hover:bg-gray-100 transition-colors cursor-pointer group">
                <div className="flex items-center gap-4">
                  <div className="w-10 h-10 rounded-full bg-teal-100 flex items-center justify-center text-teal-700 font-bold text-xs">
                    {order.id?.slice(-3) || i}
                  </div>
                  <div>
                    <p className="font-semibold text-sm text-gray-900">Pesanan #{order.id}</p>
                    <p className="text-xs text-gray-500">Pelanggan: {order.customerName}</p>
                  </div>
                </div>
                <div className="flex items-center gap-3">
                  <span className={cn(
                    "px-3 py-1 rounded-full text-[10px] font-bold uppercase tracking-wider",
                    order.status === 'Completed' ? "bg-emerald-100 text-emerald-700" : "bg-teal-100 text-teal-700"
                  )}>
                    {order.status}
                  </span>
                  <ChevronRight size={16} className="text-gray-400 group-hover:text-gray-600" />
                </div>
              </div>
            )) : (
              <div className="py-10 text-center text-gray-500">Tidak ada pesanan.</div>
            )}
          </div>
        </Card>

        <Card title="Jadwal Produksi" subtitle="Jalur aktif hari ini">
          <div className="space-y-6">
            {recentSpks.length > 0 ? recentSpks.map((spk, i) => {
              const progress = Number(spk.progress) || 0;
              return (
                <div key={spk.id || i} className="space-y-2">
                  <div className="flex justify-between text-sm">
                    <span className="font-medium text-gray-700">{spk.productName || 'Produk Tidak Diketahui'} ({spk.id})</span>
                    <span className="text-gray-500">{progress}% Selesai</span>
                  </div>
                  <div className="h-2 w-full bg-gray-100 rounded-full overflow-hidden">
                    <motion.div 
                      initial={{ width: 0 }}
                      animate={{ width: `${progress}%` }}
                      className={cn(
                        "h-full rounded-full",
                        progress >= 100 ? "bg-emerald-500" : "bg-teal-600"
                      )}
                    />
                  </div>
                </div>
              );
            }) : (
              <div className="py-10 text-center text-gray-500 text-sm">Tidak ada produksi aktif.</div>
            )}
            
            {onNavigate && (
              <button 
                onClick={() => onNavigate('Production')}
                className="w-full mt-4 py-3 border border-gray-200 rounded-xl text-sm font-semibold text-gray-600 hover:bg-gray-50 hover:text-gray-900 transition-colors flex items-center justify-center gap-2"
              >
                Lihat selengkapnya
                <ChevronRight size={16} />
              </button>
            )}
          </div>
        </Card>
      </div>
    </div>
  );
};
