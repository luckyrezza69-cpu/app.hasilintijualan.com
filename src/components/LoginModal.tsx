import React, { useState } from 'react';
import { 
  Lock, 
  User as UserIcon, 
  Eye, 
  EyeOff, 
  AlertCircle, 
  Loader2, 
  ArrowRight,
  Search,
  Package,
  Send
} from 'lucide-react';
import { motion } from 'motion/react';
import { AuthSession } from '../types';

interface LoginModalProps {
  onLoginSuccess: (session: AuthSession) => void;
}

export const LoginModal: React.FC<LoginModalProps> = ({ onLoginSuccess }) => {
  // Primary default view is customer tracking portal
  const [activeDoor, setActiveDoor] = useState<'customer' | 'internal'>('customer');
  
  // Customer Login State
  const [customerId, setCustomerId] = useState('');
  const [spkId, setSpkId] = useState('');

  // Internal Login State
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  
  // Status State
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Handle Customer Login
  const handleCustomerSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!customerId.trim() && !spkId.trim()) {
      setError('Harap masukkan nomor ID Customer atau nomor ID SPK Anda.');
      return;
    }

    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 10000);

    try {
      setLoading(true);
      setError(null);

      const response = await fetch('/api/customer-login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          customerId: customerId.trim(),
          spkId: spkId.trim()
        }),
        signal: controller.signal
      });

      clearTimeout(timeoutId);
      const data = await response.json();

      if (!response.ok || !data.success) {
        throw new Error(data.error || 'Data Customer atau SPK tidak ditemukan.');
      }

      onLoginSuccess({
        type: 'customer',
        customer: data.customer
      });
    } catch (err: any) {
      if (err.name === 'AbortError') {
        setError('Koneksi ke server timeout. Pastikan server lokal sedang berjalan.');
      } else {
        setError(err.message || 'Gagal memverifikasi ID. Silakan periksa kembali.');
      }
    } finally {
      clearTimeout(timeoutId);
      setLoading(false);
    }
  };

  // Handle Internal Login
  const handleInternalSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!username.trim() || !password.trim()) {
      setError('Harap masukkan username dan password.');
      return;
    }

    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 10000);

    try {
      setLoading(true);
      setError(null);

      const response = await fetch('/api/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          username: username.trim(),
          password: password.trim()
        }),
        signal: controller.signal
      });

      clearTimeout(timeoutId);
      const data = await response.json();

      if (!response.ok || !data.success) {
        throw new Error(data.error || 'Username atau password salah.');
      }

      onLoginSuccess({
        type: 'internal',
        user: data.user
      });
    } catch (err: any) {
      if (err.name === 'AbortError') {
        setError('Koneksi ke server timeout. Pastikan server lokal sedang berjalan.');
      } else {
        setError(err.message || 'Gagal login. Silakan periksa kredensial Anda.');
      }
    } finally {
      clearTimeout(timeoutId);
      setLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 z-[9999] bg-slate-900/30 backdrop-blur-md flex items-center justify-center p-3 sm:p-6 overflow-y-auto">
      {/* Background glowing ambient elements */}
      <div className="absolute w-[500px] h-[500px] bg-teal-400/15 rounded-full blur-3xl pointer-events-none -top-20 -left-20 animate-pulse" />
      <div className="absolute w-[450px] h-[450px] bg-emerald-400/15 rounded-full blur-3xl pointer-events-none -bottom-20 -right-20" />

      <motion.div 
        initial={{ scale: 0.96, opacity: 0, y: 15 }}
        animate={{ scale: 1, opacity: 1, y: 0 }}
        transition={{ duration: 0.35, ease: "easeOut" }}
        className="max-w-4xl w-full bg-white rounded-[32px] sm:rounded-[40px] shadow-[0_25px_70px_rgba(13,148,136,0.15)] border border-teal-100 overflow-hidden relative my-auto"
      >
        <div className="grid grid-cols-1 md:grid-cols-12 min-h-[500px]">
          {/* LEFT COLUMN: FORM SECTION */}
          <div className="md:col-span-7 p-6 sm:p-10 flex flex-col justify-between space-y-6">
            <div>
              {/* Title Header (No duplicate logo above) */}
              {activeDoor === 'customer' ? (
                <div className="space-y-1.5">
                  <h1 className="text-2xl sm:text-3xl font-black text-gray-900 tracking-tight">
                    Lacak Pesanan 👋
                  </h1>
                  <p className="text-xs sm:text-sm text-gray-500 font-medium">
                    Masukkan ID Customer atau ID SPK untuk memantau progres produksi konveksi Anda.
                  </p>
                </div>
              ) : (
                <div className="space-y-1.5">
                  <h1 className="text-2xl sm:text-3xl font-black text-gray-900 tracking-tight">
                    Masuk Pengelola 🏢
                  </h1>
                  <p className="text-xs sm:text-sm text-gray-500 font-medium">
                    Kredensial khusus staf internal dan manajemen operasional ERP.
                  </p>
                </div>
              )}

              {/* Error Notification */}
              {error && (
                <motion.div 
                  initial={{ opacity: 0, y: -6 }}
                  animate={{ opacity: 1, y: 0 }}
                  className="mt-4 p-3.5 bg-red-50 border border-red-200 rounded-2xl flex items-start gap-2.5 text-red-600 text-xs font-semibold leading-relaxed"
                >
                  <AlertCircle size={16} className="flex-shrink-0 text-red-500 mt-0.5" />
                  <span>{error}</span>
                </motion.div>
              )}

              {/* FORM SECTIONS */}
              <div className="mt-6">
                {activeDoor === 'customer' ? (
                  /* CUSTOMER TRACKING FORM */
                  <form onSubmit={handleCustomerSubmit} className="space-y-4">
                    {/* Customer ID Input */}
                    <div className="space-y-1.5">
                      <label className="text-[11px] font-bold text-teal-900/80 uppercase tracking-wider block">
                        ID Customer
                      </label>
                      <div className="relative">
                        <div className="absolute left-4 top-1/2 -translate-y-1/2 text-teal-600">
                          <Search size={18} />
                        </div>
                        <input
                          type="text"
                          value={customerId}
                          onChange={(e) => {
                            setCustomerId(e.target.value);
                            setError(null);
                          }}
                          placeholder="Contoh: CUST-001"
                          className="w-full pl-11 pr-4 py-3.5 bg-teal-50/40 hover:bg-teal-50/70 focus:bg-white border border-teal-200/80 focus:border-teal-600 focus:ring-4 focus:ring-teal-600/10 rounded-2xl text-sm font-semibold uppercase text-gray-900 placeholder:text-gray-400 placeholder:normal-case outline-none transition-all"
                        />
                      </div>
                    </div>

                    {/* SPK ID Input */}
                    <div className="space-y-1.5">
                      <div className="flex items-center justify-between">
                        <label className="text-[11px] font-bold text-teal-900/80 uppercase tracking-wider block">
                          ID SPK Aktif <span className="text-gray-400 font-normal lowercase">(opsional)</span>
                        </label>
                      </div>
                      <div className="relative">
                        <div className="absolute left-4 top-1/2 -translate-y-1/2 text-teal-600">
                          <Package size={18} />
                        </div>
                        <input
                          type="text"
                          value={spkId}
                          onChange={(e) => {
                            setSpkId(e.target.value);
                            setError(null);
                          }}
                          placeholder="Contoh: SPK-ORD-001"
                          className="w-full pl-11 pr-4 py-3.5 bg-teal-50/40 hover:bg-teal-50/70 focus:bg-white border border-teal-200/80 focus:border-teal-600 focus:ring-4 focus:ring-teal-600/10 rounded-2xl text-sm font-semibold uppercase text-gray-900 placeholder:text-gray-400 placeholder:normal-case outline-none transition-all"
                        />
                      </div>
                    </div>

                    {/* Submit Pill Button (Tosca) */}
                    <button
                      type="submit"
                      disabled={loading}
                      className="w-full mt-2 py-4 bg-gradient-to-r from-teal-600 to-emerald-600 hover:from-teal-500 hover:to-emerald-500 active:scale-[0.99] text-white rounded-full text-sm font-black shadow-lg shadow-teal-600/25 flex items-center justify-center gap-2.5 transition-all disabled:opacity-60 cursor-pointer"
                    >
                      {loading ? (
                        <>
                          <Loader2 size={18} className="animate-spin" />
                          <span>Mencari Data Pesanan...</span>
                        </>
                      ) : (
                        <>
                          <span>Buka & Lacak Pesanan</span>
                          <Send size={16} />
                        </>
                      )}
                    </button>
                  </form>
                ) : (
                  /* INTERNAL ADMIN LOGIN FORM */
                  <form onSubmit={handleInternalSubmit} className="space-y-4">
                    {/* Username Input */}
                    <div className="space-y-1.5">
                      <label className="text-[11px] font-bold text-teal-900/80 uppercase tracking-wider block">
                        Username
                      </label>
                      <div className="relative">
                        <div className="absolute left-4 top-1/2 -translate-y-1/2 text-teal-600">
                          <UserIcon size={18} />
                        </div>
                        <input
                          type="text"
                          required
                          autoFocus
                          value={username}
                          onChange={(e) => {
                            setUsername(e.target.value);
                            setError(null);
                          }}
                          placeholder="Masukkan username admin"
                          className="w-full pl-11 pr-4 py-3.5 bg-teal-50/40 hover:bg-teal-50/70 focus:bg-white border border-teal-200/80 focus:border-teal-600 focus:ring-4 focus:ring-teal-600/10 rounded-2xl text-sm font-medium text-gray-900 placeholder:text-gray-400 outline-none transition-all"
                        />
                      </div>
                    </div>

                    {/* Password Input */}
                    <div className="space-y-1.5">
                      <label className="text-[11px] font-bold text-teal-900/80 uppercase tracking-wider block">
                        Password
                      </label>
                      <div className="relative">
                        <div className="absolute left-4 top-1/2 -translate-y-1/2 text-teal-600">
                          <Lock size={18} />
                        </div>
                        <input
                          type={showPassword ? "text" : "password"}
                          required
                          value={password}
                          onChange={(e) => {
                            setPassword(e.target.value);
                            setError(null);
                          }}
                          placeholder="••••••••"
                          className="w-full pl-11 pr-11 py-3.5 bg-teal-50/40 hover:bg-teal-50/70 focus:bg-white border border-teal-200/80 focus:border-teal-600 focus:ring-4 focus:ring-teal-600/10 rounded-2xl text-sm font-medium text-gray-900 placeholder:text-gray-400 outline-none transition-all"
                        />
                        <button
                          type="button"
                          onClick={() => setShowPassword(!showPassword)}
                          className="absolute right-3.5 top-1/2 -translate-y-1/2 p-1 text-gray-400 hover:text-teal-600 transition-colors"
                        >
                          {showPassword ? <EyeOff size={18} /> : <Eye size={18} />}
                        </button>
                      </div>
                    </div>

                    {/* Submit Pill Button (Tosca) */}
                    <button
                      type="submit"
                      disabled={loading}
                      className="w-full mt-2 py-4 bg-gradient-to-r from-teal-600 to-emerald-600 hover:from-teal-500 hover:to-emerald-500 active:scale-[0.99] text-white rounded-full text-sm font-black shadow-lg shadow-teal-600/25 flex items-center justify-center gap-2.5 transition-all disabled:opacity-60 cursor-pointer"
                    >
                      {loading ? (
                        <>
                          <Loader2 size={18} className="animate-spin" />
                          <span>Memverifikasi Akun...</span>
                        </>
                      ) : (
                        <>
                          <span>Masuk Internal ERP</span>
                          <ArrowRight size={16} />
                        </>
                      )}
                    </button>
                  </form>
                )}
              </div>
            </div>

            {/* Bottom Subtle Admin Entry / Switcher (DISCREET & UNASSUMING) */}
            <div className="pt-4 border-t border-gray-100 text-center">
              {activeDoor === 'customer' ? (
                <p className="text-[11px] text-gray-400">
                  Akses operasional internal?{' '}
                  <button
                    type="button"
                    onClick={() => {
                      setActiveDoor('internal');
                      setError(null);
                    }}
                    className="text-teal-700 hover:text-teal-800 font-medium transition-colors underline underline-offset-2 cursor-pointer"
                  >
                    Masuk sebagai Pengelola
                  </button>
                </p>
              ) : (
                <button
                  type="button"
                  onClick={() => {
                    setActiveDoor('customer');
                    setError(null);
                  }}
                  className="text-[11px] text-teal-700 hover:text-teal-800 font-medium transition-colors flex items-center justify-center gap-1 mx-auto cursor-pointer"
                >
                  <span>← Kembali ke Pelacakan Pelanggan</span>
                </button>
              )}
            </div>
          </div>

          {/* RIGHT COLUMN: CUKUP LOGO HIJ SAJA DENGAN BACKGROUND PUTIH */}
          <div className="hidden md:flex md:col-span-5 p-4 sm:p-6 items-center justify-center bg-teal-50/30 rounded-r-[32px] sm:rounded-r-[40px] border-l border-teal-100/80">
            <div className="w-full h-full min-h-[440px] bg-white rounded-[24px] sm:rounded-[28px] p-8 flex flex-col items-center justify-center shadow-xs border border-teal-100/60 relative">
              <img 
                src="/logo.png" 
                alt="HIJ Logo" 
                className="max-w-[200px] max-h-[200px] w-auto h-auto object-contain transition-transform duration-300 hover:scale-105 filter drop-shadow-sm" 
              />
            </div>
          </div>
        </div>
      </motion.div>
    </div>
  );
};
