import { Share2, Copy, Check, Building2 } from 'lucide-react';
import { useState } from 'react';

export default function SettingsView({ roomId, churchName, setChurchName }) {
  const [copied, setCopied] = useState(false);
  const base = window.location.origin + window.location.pathname;
  const liveUrl = `${base}${base.endsWith('/') ? '' : '/'}?network=true${roomId ? `&room=${roomId}` : ''}`;
  const qrUrl = `https://api.qrserver.com/v1/create-qr-code/?size=200x200&data=${encodeURIComponent(liveUrl)}`;

  const handleCopy = () => {
    navigator.clipboard.writeText(liveUrl);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const handleNameBlur = async () => {
    try {
      const { set } = await import('idb-keyval');
      await set('halos_church_name', churchName);
    } catch(e) {}
  };

  return (
    <div className="flex flex-col h-full gap-6 pt-2 w-full animate-in fade-in slide-in-from-bottom-2 duration-500">
      <div className="text-xs font-bold text-neutral-400 uppercase tracking-widest flex items-center gap-2">
         <Share2 size={14} className="text-blue-400" /> Network Setup & Sharing
      </div>

      <div className="bg-neutral-900 border border-neutral-800 rounded-2xl p-5 flex flex-col items-center gap-4 shadow-xl">
        <div className="bg-white p-2 rounded-xl shadow-[0_0_30px_rgba(255,255,255,0.1)]">
          <img src={qrUrl} alt="QR Code" className="w-32 h-32" />
        </div>
        <div className="text-center">
            <div className="text-[10px] font-black text-neutral-500 uppercase tracking-widest mb-1">Live Broadcast URL</div>
            <div className="flex items-center gap-2 bg-neutral-950 px-3 py-2 rounded-lg border border-neutral-800 group cursor-pointer hover:border-blue-500/50 transition-colors" onClick={handleCopy}>
                <code className="text-[11px] text-blue-400 font-bold">{liveUrl}</code>
                {copied ? <Check size={12} className="text-green-500" /> : <Copy size={12} className="text-neutral-600 group-hover:text-blue-400 transition-colors" />}
            </div>
            {copied && <div className="text-[9px] text-green-500 font-bold mt-1 animate-pulse">Copied to clipboard!</div>}
        </div>
      </div>

      <div className="bg-neutral-900 border border-neutral-800 rounded-2xl p-5 flex flex-col gap-4 shadow-xl mt-4">
        <div className="text-xs font-bold text-neutral-400 uppercase tracking-widest flex items-center gap-2 mb-2">
           <Building2 size={14} className="text-blue-400" /> Organization Profile
        </div>
        
        <div className="flex flex-col gap-2">
            <label className="text-[10px] font-black text-neutral-500 uppercase tracking-widest">Church / Organization Name</label>
            <input 
               type="text" 
               value={churchName || ""} 
               onChange={(e) => setChurchName(e.target.value)}
               onBlur={handleNameBlur}
               placeholder="e.g. Grace Fellowship"
               className="w-full bg-neutral-950 border border-neutral-800 rounded-lg px-4 py-3 text-sm text-white placeholder-neutral-600 focus:outline-none focus:border-blue-500/50 focus:ring-1 focus:ring-blue-500/50 transition-all font-medium"
            />
            <p className="text-[10px] text-neutral-500 mt-1 leading-relaxed">
               This name will be displayed gracefully on the network waiting screens and the main projector output when no media is playing.
            </p>
        </div>
      </div>

      <div className="bg-neutral-900 border border-neutral-800 rounded-2xl p-5 flex flex-col gap-4 shadow-xl mt-4">
        <div className="text-xs font-bold text-neutral-400 uppercase tracking-widest flex items-center gap-2 mb-2">
           <Building2 size={14} className="text-blue-400" /> Storage Settings
        </div>
        
        <div className="flex flex-col gap-2">
            <label className="text-[10px] font-black text-neutral-500 uppercase tracking-widest">Media Library Location</label>
            <button 
               onClick={onChangeLibrary}
               className="w-full bg-neutral-800 hover:bg-neutral-700 active:bg-neutral-600 border border-neutral-700/50 text-white font-semibold py-3 rounded-xl transition text-sm flex items-center justify-center gap-2 shadow-sm"
            >
               Change Media Library Folder
            </button>
            <p className="text-[10px] text-neutral-500 mt-1 leading-relaxed">
               Click this to select a new base folder for your HALOS library. This will reload the application.
            </p>
        </div>
      </div>

    </div>
  );
}
