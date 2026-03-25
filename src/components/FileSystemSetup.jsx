import { useState, useEffect } from 'react';
import { setStoredDirectoryHandle } from '../utils/fileSystem';
import { Folder, Download, CheckCircle2 } from 'lucide-react';

const REQUIRED_FOLDERS = [
  'Songs', 
  'Images', 
  'Videos', 
  'Music', 
  'Bible'
];

export default function FileSystemSetup({ onReady }) {
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const [deferredPrompt, setDeferredPrompt] = useState(null);
  const [isInstalled, setIsInstalled] = useState(false);

  useEffect(() => {
    const handleBeforeInstallPrompt = (e) => {
      e.preventDefault();
      setDeferredPrompt(e);
    };

    const handleAppInstalled = () => {
      setIsInstalled(true);
      setDeferredPrompt(null);
    };

    window.addEventListener('beforeinstallprompt', handleBeforeInstallPrompt);
    window.addEventListener('appinstalled', handleAppInstalled);

    if (window.matchMedia('(display-mode: standalone)').matches) {
      setIsInstalled(true);
    }

    return () => {
      window.removeEventListener('beforeinstallprompt', handleBeforeInstallPrompt);
      window.removeEventListener('appinstalled', handleAppInstalled);
    };
  }, []);

  const handleInstallClick = async () => {
    if (!deferredPrompt) return;
    deferredPrompt.prompt();
    const { outcome } = await deferredPrompt.userChoice;
    if (outcome === 'accepted') {
      setDeferredPrompt(null);
    }
  };

  const handleInitLibrary = async () => {
    try {
      setLoading(true);
      setError('');
      // Show directory picker
      const directoryHandle = await window.showDirectoryPicker({
        mode: 'readwrite'
      });
      
      // Check for and create subfolders
      for (const folderName of REQUIRED_FOLDERS) {
        await directoryHandle.getDirectoryHandle(folderName, { create: true });
      }

      // Store handle in IndexedDB
      await setStoredDirectoryHandle(directoryHandle);
      
      onReady(directoryHandle);
    } catch (err) {
      if (err.name !== 'AbortError') {
        setError(err.message || 'Failed to initialize library. Check browser permissions.');
      }
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-neutral-950 text-white flex flex-col items-center justify-center p-8">
      <div className="max-w-md w-full text-center space-y-8">
        <h1 className="text-5xl font-extrabold tracking-widest text-white">HALOS</h1>
        <p className="text-neutral-400 text-lg">Simply Powerful Presentation</p>
        
        <div className="flex flex-col gap-4 mt-12 bg-neutral-900/50 p-6 rounded-2xl border border-neutral-800/50">
          <p className="text-sm text-neutral-400 mb-2">Step 1</p>
          <button 
            onClick={handleInstallClick}
            disabled={!deferredPrompt || isInstalled}
            className={`w-full py-4 px-6 rounded-xl transition text-lg font-medium flex items-center justify-center gap-2 ${
              isInstalled 
                ? 'bg-green-950/30 text-green-400 border border-green-800/50 cursor-default' 
                : !deferredPrompt
                  ? 'bg-neutral-800 text-neutral-500 cursor-not-allowed opacity-50'
                  : 'bg-neutral-800 hover:bg-neutral-700 text-white shadow-lg'
            }`}
          >
            {isInstalled ? (
              <>
                <CheckCircle2 size={24} />
                Halos Installed
              </>
            ) : (
              <>
                <Download size={24} className={!deferredPrompt ? 'opacity-20' : ''} />
                {!deferredPrompt ? 'PWA Ready' : 'Install Halos (PWA)'}
              </>
            )}
          </button>
          
          <div className="w-full h-px bg-neutral-800 my-2"></div>
          
          <p className="text-sm text-neutral-400 mb-2 mt-2">Step 2</p>
          <button 
            onClick={handleInitLibrary}
            disabled={loading}
            className="w-full py-4 px-6 bg-blue-600 hover:bg-blue-500 rounded-xl transition text-lg font-medium flex items-center justify-center gap-2 shadow-lg shadow-blue-900/20"
          >
            <Folder size={24} />
            {loading ? 'Initializing...' : 'Initialize Library'}
          </button>
        </div>

        {error && (
          <div className="text-red-400 mt-4 p-4 bg-red-900/20 rounded-lg whitespace-pre-wrap">
            {error}
          </div>
        )}
      </div>
    </div>
  );
}
