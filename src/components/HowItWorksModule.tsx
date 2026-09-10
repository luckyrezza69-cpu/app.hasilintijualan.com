import React from 'react';
import { 
  Users, 
  ShoppingCart, 
  Palette, 
  Factory, 
  Package, 
  CheckCircle2, 
  Truck, 
  Wallet, 
  UserCog, 
  Settings, 
  ShieldAlert,
  HelpCircle,
  ArrowRight,
  Info
} from 'lucide-react';
import { motion } from 'motion/react';
import { cn } from '../lib/utils';

const WorkflowStep = ({ 
  icon: Icon, 
  title, 
  description, 
  index 
}: { 
  icon: any, 
  title: string, 
  description: string, 
  index: number,
  key?: any
}) => (
  <motion.div 
    initial={{ opacity: 0, x: -20 }}
    animate={{ opacity: 1, x: 0 }}
    transition={{ delay: index * 0.1 }}
    className="flex gap-4 md:gap-6 p-4 md:p-6 bg-white rounded-3xl border border-gray-100 shadow-sm hover:shadow-md transition-all group"
  >
    <div className="flex-shrink-0">
      <div className="w-10 h-10 md:w-14 md:h-14 rounded-2xl bg-teal-50 flex items-center justify-center text-teal-600 group-hover:bg-teal-600 group-hover:text-white transition-colors duration-300">
        <Icon size={20} className="md:w-7 md:h-7" />
      </div>
    </div>
    <div className="flex-1">
      <div className="flex items-center gap-2 mb-1 md:mb-2">
        <span className="text-[9px] md:text-xs font-black text-teal-600/40 uppercase tracking-widest">Step {index + 1}</span>
        <h3 className="text-base md:text-lg font-bold text-gray-900">{title}</h3>
      </div>
      <p className="text-xs md:text-sm text-gray-500 leading-relaxed">{description}</p>
    </div>
  </motion.div>
);

export const HowItWorksModule: React.FC = () => {
  const steps = [
    {
      icon: Users,
      title: "Manajemen Pelanggan",
      description: "Langkah awal dimulai dengan mendaftarkan data pelanggan baru. Di sini kita mencatat nama, kontak, dan alamat perusahaan untuk memudahkan komunikasi dan pengiriman di masa mendatang."
    },
    {
      icon: ShoppingCart,
      title: "Pesanan & Penawaran",
      description: "Setelah pelanggan terdaftar, kita dapat membuat penawaran harga (Quotation). Jika disetujui, penawaran tersebut akan berubah menjadi Pesanan (Order) aktif yang akan diproses ke tahap selanjutnya."
    },
    {
      icon: Palette,
      title: "Desain & Sampel",
      description: "Tim desain akan membuat visualisasi produk sesuai permintaan pelanggan. Setelah desain disetujui, sampel fisik akan dibuat untuk memastikan kualitas dan spesifikasi sudah sesuai sebelum produksi massal."
    },
    {
      icon: Factory,
      title: "Perencanaan & Produksi (PPIC)",
      description: "Tahap inti di mana Surat Perintah Kerja (SPK) dibuat. PPIC merencanakan jadwal, menentukan lini produksi, dan memantau progres pengerjaan setiap divisi secara real-time."
    },
    {
      icon: Package,
      title: "Inventaris & Gudang",
      description: "Mengelola stok bahan baku yang dibutuhkan untuk produksi serta menyimpan barang jadi yang siap dikirim. Sistem akan memberikan peringatan jika stok bahan mulai menipis."
    },
    {
      icon: CheckCircle2,
      title: "Kontrol Kualitas (QC)",
      description: "Setiap produk melewati pemeriksaan ketat, baik saat proses berlangsung (In-Line) maupun setelah selesai (Final). Ini menjamin hanya produk terbaik yang sampai ke tangan pelanggan."
    },
    {
      icon: Truck,
      title: "Pengiriman & Logistik",
      description: "Produk yang sudah lulus QC akan dikemas dan dijadwalkan untuk pengiriman. Kita dapat melacak status pengiriman dan memastikan barang sampai tepat waktu."
    },
    {
      icon: Wallet,
      title: "Keuangan & Faktur",
      description: "Sistem secara otomatis dapat menghasilkan faktur berdasarkan pesanan yang telah selesai. Di sini kita juga memantau status pembayaran dan arus kas perusahaan."
    },
    {
      icon: UserCog,
      title: "Sumber Daya Manusia",
      description: "Mengelola data karyawan, absensi, dan penilaian kinerja. Kinerja karyawan juga dapat dipantau berdasarkan kontribusi mereka dalam setiap tugas produksi."
    },
    {
      icon: Settings,
      title: "Pemeliharaan Mesin",
      description: "Menjaga kelancaran produksi dengan jadwal perawatan rutin mesin. Setiap kendala teknis dicatat untuk mencegah downtime produksi yang tidak terencana."
    },
    {
      icon: ShieldAlert,
      title: "Keselamatan (K3)",
      description: "Memastikan lingkungan kerja tetap aman dengan memantau protokol kesehatan dan keselamatan kerja di seluruh area pabrik."
    }
  ];

  return (
    <div className="space-y-10 pb-10">
      {/* Hero Section */}
      <div className="relative overflow-hidden rounded-[2rem] md:rounded-[2.5rem] bg-gradient-to-br from-teal-600 via-teal-700 to-emerald-800 p-6 md:p-12 text-white shadow-2xl shadow-teal-600/20">
        <div className="relative z-10 max-w-2xl">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            className="inline-flex items-center gap-2 px-3 py-1.5 md:px-4 md:py-2 rounded-full bg-white/10 backdrop-blur-md border border-white/20 text-[10px] md:text-xs font-bold uppercase tracking-widest mb-4 md:mb-6"
          >
            <HelpCircle size={12} className="md:w-3.5 md:h-3.5" />
            Panduan Sistem
          </motion.div>
          <motion.h1 
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.1 }}
            className="text-2xl md:text-5xl font-black tracking-tight mb-4 md:mb-6 leading-tight"
          >
            Bagaimana HIJ Apps <br className="hidden md:block"/> Mengelola Bisnis Anda?
          </motion.h1>
          <motion.p 
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.2 }}
            className="text-sm md:text-lg text-teal-50/90 leading-relaxed"
          >
            HIJ Apps dirancang untuk mengintegrasikan seluruh proses bisnis mulai dari manajemen pelanggan hingga pengiriman barang dalam satu sistem yang terpadu dan aman.
          </motion.p>
        </div>
        
        {/* Abstract Background Shapes */}
        <div className="absolute top-0 right-0 -translate-y-1/4 translate-x-1/4 w-96 h-96 bg-white/10 rounded-full blur-3xl" />
        <div className="absolute bottom-0 left-0 translate-y-1/4 -translate-x-1/4 w-64 h-64 bg-teal-400/20 rounded-full blur-2xl" />
      </div>

      {/* Main Workflow */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {steps.map((step, idx) => (
          <WorkflowStep 
            key={idx}
            index={idx}
            icon={step.icon}
            title={step.title}
            description={step.description}
          />
        ))}
      </div>

      {/* Security Info */}
      <motion.div 
        initial={{ opacity: 0, scale: 0.95 }}
        whileInView={{ opacity: 1, scale: 1 }}
        viewport={{ once: true }}
        className="bg-teal-50 rounded-[2rem] p-8 border border-teal-100 flex flex-col md:flex-row items-center gap-8"
      >
        <div className="w-20 h-20 rounded-3xl bg-gradient-to-br from-teal-600 to-emerald-700 flex items-center justify-center text-white shadow-lg shadow-teal-600/20 flex-shrink-0">
          <Info size={32} />
        </div>
        <div>
          <h3 className="text-xl font-bold text-gray-900 mb-2">Keamanan Data Terjamin</h3>
          <p className="text-gray-600 leading-relaxed">
            Aplikasi ini dilengkapi dengan sistem keamanan PIN (2112) untuk mencegah akses yang tidak sah. Menu-menu sensitif seperti Keuangan, SDM, dan Pemeliharaan Mesin memerlukan verifikasi PIN tambahan untuk memastikan kerahasiaan data perusahaan Anda tetap terjaga.
          </p>
        </div>
      </motion.div>

      {/* Footer Note */}
      <div className="text-center py-10">
        <p className="text-sm text-gray-400 font-medium italic">
          "Satu Sistem, Satu Alur, Efisiensi Tanpa Batas."
        </p>
      </div>
    </div>
  );
};
