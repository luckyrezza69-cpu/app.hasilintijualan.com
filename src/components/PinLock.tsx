import React, { useState, useEffect } from 'react';
import { Lock, Delete, ChevronRight, ShieldCheck } from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import { cn } from '../lib/utils';

interface PinLockProps {
  onSuccess: () => void;
  title?: string;
  subtitle?: string;
}

export const PinLock: React.FC<PinLockProps> = ({ onSuccess, title = "Akses Terkunci", subtitle = "Masukkan PIN Keamanan untuk melanjutkan" }) => {
  const [pin, setPin] = useState<string>('');
  const [error, setError] = useState<boolean>(false);
  const CORRECT_PIN = "2112";

  const handleNumberClick = (num: string) => {
    if (pin.length < 4) {
      setPin(prev => prev + num);
      setError(false);
    }
  };

  const handleDelete = () => {
    setPin(prev => prev.slice(0, -1));
    setError(false);
  };

  useEffect(() => {
    if (pin.length === 4) {
      if (pin === CORRECT_PIN) {
        // Success animation or sound could go here
        setTimeout(() => onSuccess(), 300);
      } else {
        setError(true);
        setTimeout(() => setPin(''), 500);
      }
    }
  }, [pin, onSuccess]);

  return (
    <div className="fixed inset-0 z-[9999] bg-white flex flex-col items-center justify-center p-6">
      <div className="max-w-sm w-full space-y-8 text-center">
        <motion.div 
          initial={{ scale: 0.5, opacity: 0 }}
          animate={{ scale: 1, opacity: 1 }}
          className="flex justify-center"
        >
          <div className={cn(
            "w-20 h-20 rounded-3xl flex items-center justify-center transition-all duration-300",
            error ? "bg-red-50 text-red-600 animate-shake" : "bg-teal-50 text-teal-600"
          )}>
            {error ? <Lock size={32} /> : <ShieldCheck size={32} />}
          </div>
        </motion.div>

        <div className="space-y-2">
          <h2 className="text-2xl font-black text-gray-900 tracking-tight">{title}</h2>
          <p className="text-sm text-gray-500 font-medium">{subtitle}</p>
        </div>

        {/* Dots */}
        <div className="flex justify-center gap-4 py-4">
          {[...Array(4)].map((_, i) => (
            <motion.div
              key={i}
              animate={{ 
                scale: pin.length > i ? 1.2 : 1,
                backgroundColor: error ? '#EF4444' : (pin.length > i ? '#0D9488' : '#E5E7EB')
              }}
              className="w-4 h-4 rounded-full border border-transparent"
            />
          ))}
        </div>

        {/* Keypad */}
        <div className="grid grid-cols-3 gap-4 max-w-[280px] mx-auto">
          {['1', '2', '3', '4', '5', '6', '7', '8', '9'].map((num) => (
            <button
              key={num}
              onClick={() => handleNumberClick(num)}
              className="w-16 h-16 rounded-2xl bg-gray-50 text-xl font-bold text-gray-700 hover:bg-gray-100 active:scale-95 transition-all flex items-center justify-center"
            >
              {num}
            </button>
          ))}
          <div />
          <button
            onClick={() => handleNumberClick('0')}
            className="w-16 h-16 rounded-2xl bg-gray-50 text-xl font-bold text-gray-700 hover:bg-gray-100 active:scale-95 transition-all flex items-center justify-center"
          >
            0
          </button>
          <button
            onClick={handleDelete}
            className="w-16 h-16 rounded-2xl bg-gray-50 text-gray-500 hover:bg-gray-100 active:scale-95 transition-all flex items-center justify-center"
          >
            <Delete size={20} />
          </button>
        </div>

        <p className="text-[10px] text-gray-400 uppercase tracking-widest font-bold pt-8">
          HIJ Management System Security
        </p>
      </div>

      <style dangerouslySetInnerHTML={{ __html: `
        @keyframes shake {
          0%, 100% { transform: translateX(0); }
          25% { transform: translateX(-8px); }
          75% { transform: translateX(8px); }
        }
        .animate-shake {
          animation: shake 0.2s ease-in-out 0s 2;
        }
      `}} />
    </div>
  );
};
