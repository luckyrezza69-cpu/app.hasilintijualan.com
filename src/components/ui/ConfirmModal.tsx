import React from 'react';
import { Modal } from './Modal';
import { AlertCircle } from 'lucide-react';

interface ConfirmModalProps {
  isOpen: boolean;
  onClose: () => void;
  onConfirm: () => void;
  title: string;
  message: string;
  confirmText?: string;
  cancelText?: string;
  isDestructive?: boolean;
}

export const ConfirmModal = ({
  isOpen,
  onClose,
  onConfirm,
  title,
  message,
  confirmText = 'Hapus',
  cancelText = 'Batalkan',
  isDestructive = true,
}: ConfirmModalProps) => {
  return (
    <Modal isOpen={isOpen} onClose={onClose} title={title}>
      <div className="flex flex-col items-center text-center space-y-6">
        <div className={`p-4 rounded-full ${isDestructive ? 'bg-red-50 text-red-500' : 'bg-teal-50 text-teal-600'}`}>
          <AlertCircle size={48} />
        </div>
        
        <div className="space-y-2">
          <p className="text-gray-600 text-lg leading-relaxed">
            {message}
          </p>
        </div>

        <div className="flex gap-4 w-full pt-4">
          <button
            onClick={onClose}
            className="flex-1 px-6 py-4 rounded-2xl border border-gray-200 text-gray-600 font-semibold hover:bg-gray-50 transition-all active:scale-95"
          >
            {cancelText}
          </button>
          <button
            onClick={() => {
              onConfirm();
              onClose();
            }}
            className={`flex-1 px-6 py-4 rounded-2xl font-semibold text-white transition-all active:scale-95 shadow-lg ${
              isDestructive 
                ? 'bg-red-500 hover:bg-red-600 shadow-red-200' 
                : 'bg-teal-600 hover:bg-teal-700 shadow-teal-200'
            }`}
          >
            {confirmText}
          </button>
        </div>
      </div>
    </Modal>
  );
};
