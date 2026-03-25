import { Share2, Smartphone, Monitor, ChevronRight, Info, Copy, Check } from 'lucide-react';
import { useState } from 'react';

export default function SettingsView() {
  const [copied, setCopied] = useState(false);
  const liveUrl = "https://jredsell.github.io/Halos/?network=true";
  const qrUrl = `https://api.qrserver.com/v1/create-qr-code/?size=200x200&data=${encodeURIComponent(liveUrl)}`;

  const handleCopy = () => {
    navigator.clipboard.writeText(liveUrl);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
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

      <div className="flex-1 overflow-y-auto custom-scrollbar space-y-4 pr-1">
        <div className="text-[10px] font-black text-neutral-500 uppercase tracking-widest border-b border-neutral-800 pb-2">Installation Guide (Followers)</div>
        
        {/* iOS Guide */}
        <div className="bg-neutral-800/30 border border-neutral-800 rounded-xl p-4 hover:bg-neutral-800/50 transition-colors group">
          <div className="flex items-center gap-3 mb-2">
            <div className="p-2 bg-blue-500/10 rounded-lg group-hover:bg-blue-500/20 transition-colors">
              <Smartphone size={16} className="text-blue-400" />
            </div>
            <div className="font-bold text-xs text-neutral-200">iPhone / iPad (Safari)</div>
          </div>
          <ol className="text-[11px] text-neutral-400 space-y-2 ml-1">
            <li className="flex gap-2 items-start">
               <span className="text-blue-500 font-black">1.</span>
               <span>Tap the <span className="text-neutral-200 font-bold">Share</span> icon (the box with upward arrow).</span>
            </li>
            <li className="flex gap-2 items-start">
               <span className="text-blue-500 font-black">2.</span>
               <span>Scroll down and select <span className="text-neutral-200 font-bold">"Add to Home Screen"</span>.</span>
            </li>
            <li className="flex gap-2 items-start">
               <span className="text-blue-500 font-black">3.</span>
               <span>Tap <span className="text-neutral-200 font-bold">Add</span> in the top right corner.</span>
            </li>
          </ol>
        </div>

        {/* Android Guide */}
        <div className="bg-neutral-800/30 border border-neutral-800 rounded-xl p-4 hover:bg-neutral-800/50 transition-colors group">
          <div className="flex items-center gap-3 mb-2">
            <div className="p-2 bg-green-500/10 rounded-lg group-hover:bg-green-500/20 transition-colors">
              <Smartphone size={16} className="text-green-400" />
            </div>
            <div className="font-bold text-xs text-neutral-200">Android (Chrome)</div>
          </div>
          <ol className="text-[11px] text-neutral-400 space-y-2 ml-1">
            <li className="flex gap-2 items-start">
               <span className="text-green-500 font-black">1.</span>
               <span>Tap the <span className="text-neutral-200 font-bold">three dots</span> (⋮) menu icon.</span>
            </li>
            <li className="flex gap-2 items-start">
               <span className="text-green-500 font-black">2.</span>
               <span>Select <span className="text-neutral-200 font-bold">"Install App"</span> or "Add to Home Screen".</span>
            </li>
            <li className="flex gap-2 items-start">
               <span className="text-green-500 font-black">3.</span>
               <span>Confirm by tapping <span className="text-neutral-200 font-bold">Install</span>.</span>
            </li>
          </ol>
        </div>

        {/* Desktop Guide */}
        <div className="bg-neutral-800/30 border border-neutral-800 rounded-xl p-4 hover:bg-neutral-800/50 transition-colors group">
          <div className="flex items-center gap-3 mb-2">
            <div className="p-2 bg-orange-500/10 rounded-lg group-hover:bg-orange-500/20 transition-colors">
              <Monitor size={16} className="text-orange-400" />
            </div>
            <div className="font-bold text-xs text-neutral-200">Desktop (PC / Mac)</div>
          </div>
          <ol className="text-[11px] text-neutral-400 space-y-2 ml-1">
            <li className="flex gap-2 items-start">
               <span className="text-orange-500 font-black">1.</span>
               <span>Look for the <span className="text-neutral-200 font-bold">Install</span> icon in the address bar.</span>
            </li>
            <li className="flex gap-2 items-start">
               <span className="text-orange-500 font-black">2.</span>
               <span>Click <span className="text-neutral-200 font-bold">Install</span> and run Halos like a native app.</span>
            </li>
          </ol>
        </div>

        <div className="bg-blue-600/10 border border-blue-500/20 rounded-xl p-4 flex gap-3 items-start">
           <Info size={16} className="text-blue-400 mt-0.5 flex-shrink-0" />
           <div className="text-[10px] text-blue-300 leading-normal">
              Installing Halos as a PWA allows it to run in a standalone window without browser tabs, providing a cleaner experience for both presenters and listeners.
           </div>
        </div>
      </div>
    </div>
  );
}
