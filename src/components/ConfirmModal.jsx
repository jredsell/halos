import { AlertTriangle, X } from 'lucide-react';

export default function ConfirmModal({ 
  isOpen, 
  title, 
  message, 
  onConfirm, 
  onCancel, 
  confirmText = 'Confirm', 
  cancelText = 'Cancel',
  variant = 'danger' 
}) {
  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center p-6 animate-in fade-in duration-300">
      {/* Backdrop */}
      <div 
        className="absolute inset-0 bg-black/60 backdrop-blur-md" 
        onClick={onCancel}
      />
      
      {/* Modal Card */}
      <div className="relative w-full max-w-md bg-neutral-900 border border-neutral-800 rounded-3xl shadow-2xl overflow-hidden animate-in zoom-in-95 slide-in-from-bottom-4 duration-300">
        <div className="p-8">
          <div className="flex items-center gap-4 mb-6">
            <div className={`w-12 h-12 rounded-2xl flex items-center justify-center ${
              variant === 'danger' ? 'bg-red-500/20 text-red-400' : 'bg-blue-500/20 text-blue-400'
            }`}>
              <AlertTriangle size={24} />
            </div>
            <div>
              <h3 className="text-xl font-extrabold text-white tracking-tight">{title}</h3>
              <p className="text-xs font-bold text-neutral-500 uppercase tracking-widest mt-1">Action Required</p>
            </div>
          </div>
          
          <p className="text-neutral-300 text-sm leading-relaxed font-medium mb-8">
            {message}
          </p>
          
          <div className="flex gap-3">
            <button 
              onClick={onCancel}
              className="flex-1 px-6 py-4 bg-neutral-800 hover:bg-neutral-700 text-neutral-300 font-bold rounded-2xl transition-all border border-neutral-700/50 hover:text-white"
            >
              {cancelText}
            </button>
            <button 
              onClick={() => {
                onConfirm();
                onCancel(); // Close after confirming
              }}
              className={`flex-1 px-6 py-4 font-bold rounded-2xl transition-all shadow-lg active:scale-95 ${
                variant === 'danger' 
                  ? 'bg-red-600 hover:bg-red-500 text-white shadow-red-900/20' 
                  : 'bg-blue-600 hover:bg-blue-500 text-white shadow-blue-900/20'
              }`}
            >
              {confirmText}
            </button>
          </div>
        </div>
        
        <button 
          onClick={onCancel}
          className="absolute top-4 right-4 p-2 text-neutral-500 hover:text-white transition-colors"
        >
          <X size={20} />
        </button>
      </div>
    </div>
  );
}
