import React, { useState } from 'react';
import Logo from './components/Logo';
import { Rocket, Library, Music, Book, ScrollText, Headphones, HelpCircle, MessageSquare, BookOpen, FileText, Settings, PlayCircle, Video, Image as ImageIcon, X } from 'lucide-react';

const navigationTree = [
  {
    category: "Getting Started",
    icon: Rocket,
    items: [
      { id: "installation", title: "Installation & Setup" },
      { id: "interface", title: "The Interface" }
    ]
  },
  {
    category: "Media Assets",
    icon: Library,
    items: [
      { id: "songs", title: "Songs", icon: Music },
      { id: "images", title: "Images", icon: ImageIcon },
      { id: "bible", title: "Bible", icon: Book },
      { id: "liturgy", title: "Liturgy", icon: ScrollText },
      { id: "videos", title: "Videos", icon: Video },
      { id: "music", title: "Background Music", icon: Headphones }
    ]
  },
  {
    category: "Presenting",
    icon: PlayCircle,
    items: [
      { id: "presenting-overview", title: "Overview" },
      { id: "presenting-controls", title: "Asset Controls" }
    ]
  },
  {
    category: "Advanced",
    icon: Settings,
    items: [
      { id: "settings", title: "Settings & Networking" }
    ]
  },
  {
    category: "Support",
    icon: HelpCircle,
    items: [
      { id: "feedback", title: "Provide Feedback", icon: MessageSquare }
    ]
  }
];

export default function DocsPage() {
  const base = import.meta.env.BASE_URL || '/';
  const [activeTab, setActiveTab] = useState('landing');
  const [selectedImage, setSelectedImage] = useState(null);
  const [isZoomed, setIsZoomed] = useState(false);
  const [formStatus, setFormStatus] = useState('idle');

  const handleFeedbackSubmit = (e) => {
    e.preventDefault();
    setFormStatus('submitting');
    
    const formData = new FormData(e.target);
    
    fetch('/', {
      method: 'POST',
      headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
      body: new URLSearchParams(formData).toString()
    })
      .then(() => setFormStatus('success'))
      .catch((error) => {
        console.error('Error submitting form:', error);
        setFormStatus('error');
      });
  };

  const navigateToHome = () => {
    window.location.href = base;
  };

  const navigateToApp = () => {
    window.location.href = base.replace(/\/$/, '') + '/app';
  };

  const renderContent = () => {
    if (activeTab === 'landing') {
      return (
        <div className="max-w-4xl">
          <h1 className="text-4xl font-black tracking-tight mb-4">Halos Documentation</h1>
          <p className="text-xl text-neutral-400 mb-12">Welcome to the Halos knowledge base. Choose a category below to get started, or select a specific topic from the sidebar.</p>
          
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {navigationTree.map((section, index) => (
              <div 
                key={index}
                onClick={() => setActiveTab(section.items[0].id)}
                className="bg-neutral-900/40 hover:bg-neutral-900 border border-neutral-800 hover:border-neutral-700 rounded-2xl p-6 transition-all cursor-pointer group"
              >
                <div className="w-12 h-12 bg-blue-500/10 text-blue-400 rounded-xl flex items-center justify-center mb-6 group-hover:scale-110 transition-transform">
                  <section.icon size={24} />
                </div>
                <h3 className="text-xl font-bold text-white mb-2">{section.category}</h3>
                <p className="text-neutral-400 text-sm mb-4 leading-relaxed">
                  {section.items.map(item => item.title).join(', ')}
                </p>
                <div className="text-blue-400 text-sm font-bold flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                  View articles <span className="text-lg leading-none">→</span>
                </div>
              </div>
            ))}
          </div>
        </div>
      );
    }

    if (activeTab === 'installation') {
      return (
        <>
          <h1 className="text-4xl font-black tracking-tight mb-4">Installation & Setup</h1>
          <p className="text-xl text-neutral-400 mb-12">Halos is a modern, lightweight application built to run smoothly on your device. Once installed, you can even use the application completely offline!</p>
          
          <div className="prose prose-invert prose-blue max-w-3xl">
            <p className="leading-relaxed text-neutral-300 mb-8">Follow these simple steps to get set up:</p>
            
            <h3 className="text-xl font-bold text-white mb-4">Step 1: Launch the App</h3>
            <p className="leading-relaxed text-neutral-300 mb-6">Click the <strong>Launch App</strong> button at the top of the screen.</p>
            <img 
              src={`${base}docs/installation/installation-step-1.png`} 
              alt="Launch App Button" 
              className="rounded-xl border border-neutral-800 shadow-lg mb-12 cursor-pointer hover:ring-2 hover:ring-blue-500 transition-all"
              onClick={() => setSelectedImage(`${base}docs/installation/installation-step-1.png`)}
            />

            <h3 className="text-xl font-bold text-white mb-4">Step 2: Install Halos</h3>
            <p className="leading-relaxed text-neutral-300 mb-6">Then click on the <strong>Install Halos</strong> button.</p>
            <img 
              src={`${base}docs/installation/installation-step-2.png`} 
              alt="Install Halos Button" 
              className="rounded-xl border border-neutral-800 shadow-lg mb-12 cursor-pointer hover:ring-2 hover:ring-blue-500 transition-all"
              onClick={() => setSelectedImage(`${base}docs/installation/installation-step-2.png`)}
            />

            <h3 className="text-xl font-bold text-white mb-4">Step 3: Confirm Installation</h3>
            <p className="leading-relaxed text-neutral-300 mb-6">This will ask you to confirm the app installation.</p>
            <img 
              src={`${base}docs/installation/installation-step-3.png`} 
              alt="Confirm App Installation" 
              className="rounded-xl border border-neutral-800 shadow-lg mb-12 cursor-pointer hover:ring-2 hover:ring-blue-500 transition-all"
              onClick={() => setSelectedImage(`${base}docs/installation/installation-step-3.png`)}
            />
            
            <h3 className="text-xl font-bold text-white mb-4">Step 4: Select Library Folder</h3>
            <p className="leading-relaxed text-neutral-300 mb-6">Once installed, the app will open in another window. You need to set the location where you want the application to store and read your files. Click on <strong>Select Library Folder</strong>.</p>
            <img 
              src={`${base}docs/installation/installation-step-4.png`} 
              alt="Select Library Folder" 
              className="rounded-xl border border-neutral-800 shadow-lg mb-12 cursor-pointer hover:ring-2 hover:ring-blue-500 transition-all"
              onClick={() => setSelectedImage(`${base}docs/installation/installation-step-4.png`)}
            />

            <h3 className="text-xl font-bold text-white mb-4">Step 5: Create a New Folder</h3>
            <p className="leading-relaxed text-neutral-300 mb-6">This will open up an explorer window. Browse to where you want the folder to be (for example, your Documents folder), and click on <strong>New Folder</strong>.</p>
            <img 
              src={`${base}docs/installation/installation-step-5.png`} 
              alt="Create New Folder" 
              className="rounded-xl border border-neutral-800 shadow-lg mb-12 cursor-pointer hover:ring-2 hover:ring-blue-500 transition-all"
              onClick={() => setSelectedImage(`${base}docs/installation/installation-step-5.png`)}
            />

            <h3 className="text-xl font-bold text-white mb-4">Step 6: Select the Folder</h3>
            <p className="leading-relaxed text-neutral-300 mb-6">Call the folder "Halos", then highlight it and press <strong>Select Folder</strong>.</p>
            <img 
              src={`${base}docs/installation/installation-step-6.png`} 
              alt="Select Folder" 
              className="rounded-xl border border-neutral-800 shadow-lg mb-12 cursor-pointer hover:ring-2 hover:ring-blue-500 transition-all"
              onClick={() => setSelectedImage(`${base}docs/installation/installation-step-6.png`)}
            />

            <h3 className="text-xl font-bold text-white mb-4">Step 7: Grant Permissions</h3>
            <p className="leading-relaxed text-neutral-300 mb-6">You must allow the application to have access to the folder to read and write. The pop-up will ask you to confirm if you allow this site to edit files — click <strong>Allow</strong>.</p>
            
            <div className="bg-blue-900/30 border border-blue-500/30 rounded-xl p-6 mb-8 relative overflow-hidden">
              <div className="absolute top-0 left-0 w-1 h-full bg-blue-500"></div>
              <p className="text-blue-200 m-0"><strong className="text-blue-400">💡 Tip:</strong> Giving permission ensures your songs, liturgies, and images are saved securely directly on your own computer, which is what allows you to use Halos even when you don't have internet access!</p>
            </div>
            
            <img 
              src={`${base}docs/installation/installation-step-7.png`} 
              alt="Allow Permissions Pop-up" 
              className="rounded-xl border border-neutral-800 shadow-lg mb-12 cursor-pointer hover:ring-2 hover:ring-blue-500 transition-all"
              onClick={() => setSelectedImage(`${base}docs/installation/installation-step-7.png`)}
            />

            <h3 className="text-xl font-bold text-white mb-4">Step 8: Welcome to Halos!</h3>
            <p className="leading-relaxed text-neutral-300 mb-6">Congratulations. Welcome to Halos — Church Presentation Software.</p>
            <img 
              src={`${base}docs/installation/installation-step-8.png`} 
              alt="Welcome to Halos" 
              className="rounded-xl border border-neutral-800 shadow-lg mb-12 cursor-pointer hover:ring-2 hover:ring-blue-500 transition-all"
              onClick={() => setSelectedImage(`${base}docs/installation/installation-step-8.png`)}
            />
          </div>
        </>
      );
    }

    if (activeTab === 'interface') {
      return (
        <>
          <h1 className="text-4xl font-black tracking-tight mb-4">The Interface</h1>
          <p className="text-xl text-neutral-400 mb-12">Welcome to the main interface of Halos. Let's take a quick look around to get familiar with where everything is. We will go into the finer details of each feature in the following sections.</p>
          
          <div className="prose prose-invert prose-blue max-w-3xl">
            <h3 className="text-xl font-bold text-white mb-4">Overview</h3>
            <img 
              src={`${base}docs/interface/Interface-1.png`} 
              alt="Interface Overview" 
              className="rounded-xl border border-neutral-800 shadow-lg mb-12 cursor-pointer hover:ring-2 hover:ring-blue-500 transition-all"
              onClick={() => setSelectedImage(`${base}docs/interface/Interface-1.png`)}
            />

            <h3 className="text-xl font-bold text-white mb-4">The Service Tab</h3>
            <p className="leading-relaxed text-neutral-300 mb-6">The <strong>Service</strong> tab is the first screen you see when starting Halos, and it's where you run and control your service.</p>
            <p className="leading-relaxed text-neutral-300 mb-6">On the left-hand side is your <strong>Service Flow</strong>, which lists all the items you have added to your service. At the top of this section, you'll find a few helpful buttons:</p>
            <ul className="leading-relaxed text-neutral-300 mb-6 list-disc pl-6 space-y-2">
              <li><strong>Clear Service:</strong> Removes all items from your current service flow.</li>
              <li><strong>Reset Played State:</strong> As you go through your service, items are marked as 'played' so you always know where you are. This button resets all items to 'unplayed' – which is especially handy after a rehearsal or run-through!</li>
              <li><strong>Load:</strong> Opens an existing service file.</li>
              <li><strong>Save:</strong> Saves your current service flow for future use.</li>
            </ul>
            <img 
              src={`${base}docs/interface/Interface-2.png`} 
              alt="Service Tab Controls" 
              className="rounded-xl border border-neutral-800 shadow-lg mb-12 cursor-pointer hover:ring-2 hover:ring-blue-500 transition-all"
              onClick={() => setSelectedImage(`${base}docs/interface/Interface-2.png`)}
            />

            <h3 className="text-xl font-bold text-white mb-4">Preview Area</h3>
            <p className="leading-relaxed text-neutral-300 mb-6">The middle section is your <strong>Preview</strong> area. This displays all the content for your selected item, such as song lyrics, presentations, images, Bible verses, liturgies, and videos. It allows you to see exactly what you are about to present before sending it live to the main projector.</p>
            <img 
              src={`${base}docs/interface/Interface-3.png`} 
              alt="Preview Area" 
              className="rounded-xl border border-neutral-800 shadow-lg mb-12 cursor-pointer hover:ring-2 hover:ring-blue-500 transition-all"
              onClick={() => setSelectedImage(`${base}docs/interface/Interface-3.png`)}
            />
            
            <h3 className="text-xl font-bold text-white mb-4">Live Controls & Audio</h3>
            <p className="leading-relaxed text-neutral-300 mb-6">On the right-hand side, you have your <strong>Live Controls</strong>:</p>
            <ul className="leading-relaxed text-neutral-300 mb-6 list-disc pl-6 space-y-2">
              <li><strong>Go Live:</strong> Starts your presentation and sends the selected content to the main screen.</li>
              <li><strong>Clear Text:</strong> Instantly removes any text (like lyrics, Bible verses, or liturgy) from the screen, whilst keeping the background visible.</li>
              <li><strong>Black Screen:</strong> Instantly turns the main screen black, overriding whatever is currently being displayed.</li>
              <li><strong>Show Logo:</strong> Displays a full-screen image, such as your church logo.</li>
            </ul>
            <p className="leading-relaxed text-neutral-300 mb-6">You will also find the <strong>Background Music</strong> controls here. This allows you to play audio from the Halos music folder without affecting what is being displayed on the screen – perfect for playing a welcoming track whilst showing notices before the service begins!</p>
            <img 
              src={`${base}docs/interface/Interface-4.png`} 
              alt="Live Controls" 
              className="rounded-xl border border-neutral-800 shadow-lg mb-12 cursor-pointer hover:ring-2 hover:ring-blue-500 transition-all"
              onClick={() => setSelectedImage(`${base}docs/interface/Interface-4.png`)}
            />

            <h3 className="text-xl font-bold text-white mb-4">Navigation Tabs</h3>
            <p className="leading-relaxed text-neutral-300 mb-6">At the top (centre), you'll see your main navigation <strong>Tabs</strong>: Service, Songs, Images, Bible, Liturgy, Videos, and Music. We will look at each of these separately later, but this is where you organise and manage all your different media assets within Halos.</p>
            <img 
              src={`${base}docs/interface/Interface-5.png`} 
              alt="Navigation Tabs" 
              className="rounded-xl border border-neutral-800 shadow-lg mb-12 cursor-pointer hover:ring-2 hover:ring-blue-500 transition-all"
              onClick={() => setSelectedImage(`${base}docs/interface/Interface-5.png`)}
            />

            <h3 className="text-xl font-bold text-white mb-4">Settings, Help & Support</h3>
            <p className="leading-relaxed text-neutral-300 mb-6">Finally, in the top right corner, you will find a few more helpful icons:</p>
            <ul className="leading-relaxed text-neutral-300 mb-6 list-disc pl-6 space-y-2">
              <li><strong>Settings (Cog icon):</strong> Access your organisation's display name, view your CCLI reporting history, manage remote display and control settings, and choose your preferred display font.</li>
              <li><strong>Documentation (Document icon):</strong> Access these help guides and read up on any new features and updates.</li>
              <li><strong>Support Us (Heart icon):</strong> Halos is completely free for everyone to use! However, if you would like to support us and contribute towards its ongoing development, please consider giving a one-off or monthly donation by clicking the heart icon.</li>
            </ul>
            <img 
              src={`${base}docs/interface/Interface-6.png`} 
              alt="Settings and Support" 
              className="rounded-xl border border-neutral-800 shadow-lg mb-12 cursor-pointer hover:ring-2 hover:ring-blue-500 transition-all"
              onClick={() => setSelectedImage(`${base}docs/interface/Interface-6.png`)}
            />
          </div>
        </>
      );
    }

    if (activeTab === 'feedback') {
      return (
        <>
          <h1 className="text-4xl font-black tracking-tight mb-4">Feedback & Support</h1>
          <p className="text-xl text-neutral-400 mb-12">Have a question, found a bug, or want to request a feature? Let us know!</p>
          
          <div className="max-w-2xl bg-neutral-900/50 border border-neutral-800 rounded-2xl p-8">
            {formStatus === 'success' ? (
              <div className="text-center py-12">
                <div className="w-16 h-16 bg-green-500/20 text-green-400 rounded-full flex items-center justify-center mx-auto mb-6">
                  <svg className="w-8 h-8" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                  </svg>
                </div>
                <h3 className="text-2xl font-bold text-white mb-2">Message Sent!</h3>
                <p className="text-neutral-400">Thank you for your feedback. We'll get back to you shortly.</p>
                <button 
                  onClick={() => setFormStatus('idle')}
                  className="mt-8 text-blue-400 hover:text-blue-300 transition"
                >
                  Send another message
                </button>
              </div>
            ) : (
              <form 
                name="feedback" 
                method="POST" 
                data-netlify="true" 
                netlify-honeypot="bot-field"
                onSubmit={handleFeedbackSubmit}
                className="space-y-6"
              >
                <input type="hidden" name="form-name" value="feedback" />
                <p className="hidden">
                  <label>Don't fill this out if you're human: <input name="bot-field" /></label>
                </p>

                <div>
                  <label htmlFor="name" className="block text-sm font-medium text-neutral-300 mb-2">Name</label>
                  <input 
                    type="text" 
                    id="name" 
                    name="name" 
                    required 
                    className="w-full bg-neutral-950 border border-neutral-800 rounded-xl px-4 py-3 text-white focus:outline-none focus:ring-2 focus:ring-blue-500 transition"
                    placeholder="Your name"
                  />
                </div>

                <div>
                  <label htmlFor="email" className="block text-sm font-medium text-neutral-300 mb-2">Email Address</label>
                  <input 
                    type="email" 
                    id="email" 
                    name="email" 
                    required 
                    className="w-full bg-neutral-950 border border-neutral-800 rounded-xl px-4 py-3 text-white focus:outline-none focus:ring-2 focus:ring-blue-500 transition"
                    placeholder="hello@example.com"
                  />
                </div>

                <div>
                  <label htmlFor="type" className="block text-sm font-medium text-neutral-300 mb-2">What is this regarding?</label>
                  <div className="relative">
                    <select 
                      id="type" 
                      name="type" 
                      defaultValue="feature"
                      className="w-full bg-neutral-950 border border-neutral-800 rounded-xl px-4 py-3 pr-10 text-white focus:outline-none focus:ring-2 focus:ring-blue-500 transition appearance-none cursor-pointer"
                    >
                      <option value="bug">Bug Report</option>
                      <option value="feature">Feature Request</option>
                      <option value="other">Something Else</option>
                    </select>
                    <div className="pointer-events-none absolute inset-y-0 right-0 flex items-center px-4 text-neutral-400">
                      <svg className="h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M19 9l-7 7-7-7"></path>
                      </svg>
                    </div>
                  </div>
                </div>

                <div>
                  <label htmlFor="message" className="block text-sm font-medium text-neutral-300 mb-2">Message</label>
                  <textarea 
                    id="message" 
                    name="message" 
                    required 
                    rows={5}
                    className="w-full bg-neutral-950 border border-neutral-800 rounded-xl px-4 py-3 text-white focus:outline-none focus:ring-2 focus:ring-blue-500 transition resize-none"
                    placeholder="How can we help?"
                  />
                </div>

                <button 
                  type="submit" 
                  disabled={formStatus === 'submitting'}
                  className="w-full bg-blue-600 hover:bg-blue-500 disabled:bg-blue-600/50 disabled:cursor-not-allowed text-white font-medium px-6 py-3.5 rounded-xl transition shadow-[0_0_20px_rgba(37,99,235,0.2)] hover:shadow-[0_0_30px_rgba(37,99,235,0.4)] flex justify-center items-center"
                >
                  {formStatus === 'submitting' ? (
                    <>
                      <svg className="animate-spin -ml-1 mr-3 h-5 w-5 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                        <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                        <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                      </svg>
                      Sending...
                    </>
                  ) : 'Send Message'}
                </button>
                
                {formStatus === 'error' && (
                  <p className="text-red-400 text-sm text-center mt-4">Something went wrong. Please try again later.</p>
                )}
              </form>
            )}
          </div>
        </>
      );
    }

    if (activeTab === 'songs') {
      return (
        <>
          <h1 className="text-4xl font-black tracking-tight mb-12">Managing Songs</h1>
          
          <div className="prose prose-invert prose-blue max-w-3xl">
            <p className="leading-relaxed text-neutral-300 mb-6">When you click on the <strong>Songs</strong> tab on the left, it brings you to the main songs page. From here, you can Add, Edit, or Delete songs from your database.</p>

            <h3 className="text-xl font-bold text-white mb-4">Adding a Song</h3>
            <p className="leading-relaxed text-neutral-300 mb-6">To add a song to your database, simply press the <strong>New</strong> icon towards the top left of the Songs tab. Here you can choose to add a song manually, import a TXT or XML file, or import directly from SongSelect.</p>
            <img 
              src={`${base}docs/songs/adding/add_song_1.png`} 
              alt="Add a Song Options" 
              className="rounded-xl border border-neutral-800 shadow-lg mb-12 cursor-pointer hover:ring-2 hover:ring-blue-500 transition-all"
              onClick={() => setSelectedImage(`${base}docs/songs/adding/add_song_1.png`)}
            />

            <h2 className="text-2xl font-bold text-white mb-6 border-b border-neutral-800 pb-2">Methods for Adding Songs</h2>
            
            <h3 className="text-xl font-bold text-white mb-4">Adding a Song Manually</h3>
            <p className="leading-relaxed text-neutral-300 mb-6">To add a song manually, start by entering the <strong>Name</strong> of the song, the <strong>Artist</strong>, and the <strong>CCLI license number</strong> (if you know it). Then, in the lyrics box, simply type or paste your lyrics.</p>
            <img 
              src={`${base}docs/songs/adding/manually/manual-1.png`} 
              alt="Adding Song Metadata" 
              className="rounded-xl border border-neutral-800 shadow-lg mb-6 cursor-pointer hover:ring-2 hover:ring-blue-500 transition-all"
              onClick={() => setSelectedImage(`${base}docs/songs/adding/manually/manual-1.png`)}
            />

            <p className="leading-relaxed text-neutral-300 mb-6">Halos uses a simple tagging system to organise your song structure. By typing the <code>/</code> (forward slash) command in the lyrics box, you can tag verses, choruses, bridges, or other elements.</p>
            <img 
              src={`${base}docs/songs/adding/manually/manual-2.png`} 
              alt="Using the slash command" 
              className="rounded-xl border border-neutral-800 shadow-lg mb-6 cursor-pointer hover:ring-2 hover:ring-blue-500 transition-all"
              onClick={() => setSelectedImage(`${base}docs/songs/adding/manually/manual-2.png`)}
            />

            <p className="leading-relaxed text-neutral-300 mb-6">You can click on the pre-built tags from the dropdown menu to quickly assign labels. This makes it incredibly easy to see exactly how the song is structured when you are presenting.</p>
            <img 
              src={`${base}docs/songs/adding/manually/manual-3.png`} 
              alt="Selecting pre-built tags" 
              className="rounded-xl border border-neutral-800 shadow-lg mb-6 cursor-pointer hover:ring-2 hover:ring-blue-500 transition-all"
              onClick={() => setSelectedImage(`${base}docs/songs/adding/manually/manual-3.png`)}
            />

            <p className="leading-relaxed text-neutral-300 mb-6">If your song has more parts than the standard list provides (for example, if you need a Verse 11, Chorus 5, or Bridge 5), you can just type <code>/v11</code>, <code>/c5</code>, or <code>/b5</code> to create them instantly!</p>
            <img 
              src={`${base}docs/songs/adding/manually/manual-4.png`} 
              alt="Creating numbered tags" 
              className="rounded-xl border border-neutral-800 shadow-lg mb-6 cursor-pointer hover:ring-2 hover:ring-blue-500 transition-all"
              onClick={() => setSelectedImage(`${base}docs/songs/adding/manually/manual-4.png`)}
            />

            <h3 className="text-xl font-bold text-white mb-4 mt-8 border-t border-neutral-800 pt-6">Importing a File</h3>
            <p className="leading-relaxed text-neutral-300 mb-6">You can import any TXT or XML file (which is especially handy if you are moving over from another system). Simply click the <strong>Import from File</strong> option.</p>
            <img 
              src={`${base}docs/songs/adding/import/import_1.png`} 
              alt="Select Import from File" 
              className="rounded-xl border border-neutral-800 shadow-lg mb-6 cursor-pointer hover:ring-2 hover:ring-blue-500 transition-all"
              onClick={() => setSelectedImage(`${base}docs/songs/adding/import/import_1.png`)}
            />

            <p className="leading-relaxed text-neutral-300 mb-6">Browse and select the file you want to import from your computer.</p>
            <img 
              src={`${base}docs/songs/adding/import/import_2.png`} 
              alt="Select File" 
              className="rounded-xl border border-neutral-800 shadow-lg mb-6 cursor-pointer hover:ring-2 hover:ring-blue-500 transition-all"
              onClick={() => setSelectedImage(`${base}docs/songs/adding/import/import_2.png`)}
            />

            <p className="leading-relaxed text-neutral-300 mb-6">Then, make any changes you need—like adding in a title, artist, or CCLI number if they aren't already included. Finally, add in your tags and click <strong>Save Song</strong>.</p>
            <img 
              src={`${base}docs/songs/adding/import/import_3.png`} 
              alt="Edit and Save Imported Song" 
              className="rounded-xl border border-neutral-800 shadow-lg mb-12 cursor-pointer hover:ring-2 hover:ring-blue-500 transition-all"
              onClick={() => setSelectedImage(`${base}docs/songs/adding/import/import_3.png`)}
            />

            <h3 className="text-xl font-bold text-white mb-4">Importing from SongSelect</h3>
            <p className="leading-relaxed text-neutral-300 mb-6">Find the song you want to add from <a href="https://songselect.ccli.com/" target="_blank" rel="noopener noreferrer" className="text-blue-400 hover:text-blue-300 underline">SongSelect</a>, then under the lyrics &gt; sheet music options, select the copy button (the copy button is under lyrics, then there is a sheet music section, and then the copy button).</p>
            <img 
              src={`${base}docs/songs/adding/song_select/song_select_1.png`} 
              alt="Copy from SongSelect" 
              className="rounded-xl border border-neutral-800 shadow-lg mb-6 cursor-pointer hover:ring-2 hover:ring-blue-500 transition-all"
              onClick={() => setSelectedImage(`${base}docs/songs/adding/song_select/song_select_1.png`)}
            />

            <p className="leading-relaxed text-neutral-300 mb-6">Then, within Halos, select the <strong>Import from SongSelect</strong> option when adding a new song.</p>
            <img 
              src={`${base}docs/songs/adding/song_select/song_select_2.png`} 
              alt="Select Import Option" 
              className="rounded-xl border border-neutral-800 shadow-lg mb-6 cursor-pointer hover:ring-2 hover:ring-blue-500 transition-all"
              onClick={() => setSelectedImage(`${base}docs/songs/adding/song_select/song_select_2.png`)}
            />

            <p className="leading-relaxed text-neutral-300 mb-6">You may be asked to allow the application to paste, to which you should click <strong>Allow</strong>.</p>
            <img 
              src={`${base}docs/songs/adding/song_select/song_select_3.png`} 
              alt="Allow paste prompt" 
              className="rounded-xl border border-neutral-800 shadow-lg mb-6 cursor-pointer hover:ring-2 hover:ring-blue-500 transition-all"
              onClick={() => setSelectedImage(`${base}docs/songs/adding/song_select/song_select_3.png`)}
            />

            <p className="leading-relaxed text-neutral-300 mb-6">This will copy all the song data (artists, title, CCLI number, and song lyrics), which can then be edited before clicking <strong>Save Song</strong>.</p>
            <img 
              src={`${base}docs/songs/adding/song_select/song_select_4.png`} 
              alt="Save imported song" 
              className="rounded-xl border border-neutral-800 shadow-lg mb-6 cursor-pointer hover:ring-2 hover:ring-blue-500 transition-all"
              onClick={() => setSelectedImage(`${base}docs/songs/adding/song_select/song_select_4.png`)}
            />

            <h3 className="text-xl font-bold text-white mb-4 mt-8 border-t border-neutral-800 pt-6">Viewing Your Added Songs</h3>
            <p className="leading-relaxed text-neutral-300 mb-6">Once you click Save (regardless of which add method you used), the newly added songs can instantly be seen on the left-hand side panel in your database.</p>
            <img 
              src={`${base}docs/songs/adding/manually/manual-5.png`} 
              alt="Viewing added songs" 
              className="rounded-xl border border-neutral-800 shadow-lg mb-12 cursor-pointer hover:ring-2 hover:ring-blue-500 transition-all"
              onClick={() => setSelectedImage(`${base}docs/songs/adding/manually/manual-5.png`)}
            />
          </div>
        </>
      );
    }

    if (activeTab === 'settings') {
      return (
        <>
          <h1 className="text-4xl font-black tracking-tight mb-4">Settings & Networking</h1>
          <p className="text-xl text-neutral-400 mb-12">Configure Halos to match your environment, manage your media library, and export CCLI reporting data.</p>
          
          <div className="prose prose-invert prose-blue max-w-3xl">
            <h3 className="text-xl font-bold text-white mb-4">Accessing Settings</h3>
            <p className="leading-relaxed text-neutral-300 mb-6">To access settings, click on the <strong>settings cog icon</strong> in the top right-hand corner of the application.</p>
            <img 
              src={`${base}docs/settings/Settings-1.png`} 
              alt="Settings Icon" 
              className="rounded-xl border border-neutral-800 shadow-lg mb-12 cursor-pointer hover:ring-2 hover:ring-blue-500 transition-all"
              onClick={() => setSelectedImage(`${base}docs/settings/Settings-1.png`)}
            />

            <h3 className="text-xl font-bold text-white mb-4">Settings Overview</h3>
            <p className="leading-relaxed text-neutral-300 mb-6">Doing so will open the Settings panel which displays your church organisation name, the display font used, remote view and remote control URLs. You can also select the storage location of your media library and export your song play history for CCLI licensing.</p>
            <img 
              src={`${base}docs/settings/Settings-2.png`} 
              alt="Settings Overview" 
              className="rounded-xl border border-neutral-800 shadow-lg mb-12 cursor-pointer hover:ring-2 hover:ring-blue-500 transition-all"
              onClick={() => setSelectedImage(`${base}docs/settings/Settings-2.png`)}
            />

            <h3 className="text-xl font-bold text-white mb-4">Organisation Name</h3>
            <p className="leading-relaxed text-neutral-300 mb-6">You can change the name of the organisation that is displayed on the live output screen. This is displayed when not currently presenting any content. This is there so that you know the projector and monitors are working, and it means you can customise this welcoming message.</p>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-12">
              <img 
                src={`${base}docs/settings/Settings-3.png`} 
                alt="Organisation Name Setting" 
                className="rounded-xl border border-neutral-800 shadow-lg cursor-pointer hover:ring-2 hover:ring-blue-500 transition-all"
                onClick={() => setSelectedImage(`${base}docs/settings/Settings-3.png`)}
              />
              <img 
                src={`${base}docs/settings/Settings-3a.png`} 
                alt="Live Output Display" 
                className="rounded-xl border border-neutral-800 shadow-lg cursor-pointer hover:ring-2 hover:ring-blue-500 transition-all"
                onClick={() => setSelectedImage(`${base}docs/settings/Settings-3a.png`)}
              />
            </div>

            <h3 className="text-xl font-bold text-white mb-4">Display Font</h3>
            <p className="leading-relaxed text-neutral-300 mb-6">Using the dropdown list, you can change the font in which songs, liturgy, and Bible verses are displayed on the main screen.</p>
            <p className="leading-relaxed text-neutral-300 mb-6">The available fonts are:</p>
            <ul className="leading-relaxed text-neutral-300 mb-6 list-disc pl-6 space-y-1">
              <li>Inter (Modern)</li>
              <li>Roboto (Clean)</li>
              <li>Open Sans (Friendly)</li>
              <li>Montserrat (Geometric)</li>
              <li>Lato (Classic)</li>
              <li>Merriweather (Serif)</li>
              <li>Lora (Elegant)</li>
              <li>Playfair Display (Traditional)</li>
              <li>Crimson Pro (Formal)</li>
              <li>EB Garamond (Historic)</li>
            </ul>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-12">
              <img 
                src={`${base}docs/settings/Settings-4.png`} 
                alt="Display Font Setting" 
                className="rounded-xl border border-neutral-800 shadow-lg cursor-pointer hover:ring-2 hover:ring-blue-500 transition-all"
                onClick={() => setSelectedImage(`${base}docs/settings/Settings-4.png`)}
              />
              <img 
                src={`${base}docs/settings/Settings-5.png`} 
                alt="Display Font List" 
                className="rounded-xl border border-neutral-800 shadow-lg cursor-pointer hover:ring-2 hover:ring-blue-500 transition-all"
                onClick={() => setSelectedImage(`${base}docs/settings/Settings-5.png`)}
              />
            </div>

            <h3 className="text-xl font-bold text-white mb-4">Remote Control</h3>
            <p className="leading-relaxed text-neutral-300 mb-6">If you want to control Halos from a remote device, such as a phone or tablet, you can use the URL or QR code to launch the web app that is then dedicated to your unique code. Every install of Halos has a unique code. In order to control Halos remotely, it needs to be connected to the internet (not just a local network) as it uses WebRTC to communicate.</p>
            <img 
              src={`${base}docs/settings/Settings-6.png`} 
              alt="Remote Control" 
              className="rounded-xl border border-neutral-800 shadow-lg mb-12 cursor-pointer hover:ring-2 hover:ring-blue-500 transition-all"
              onClick={() => setSelectedImage(`${base}docs/settings/Settings-6.png`)}
            />

            <h3 className="text-xl font-bold text-white mb-4">Remote Viewing</h3>
            <p className="leading-relaxed text-neutral-300 mb-6">If you have participants who prefer to view the service and follow along on their own device, they can use the QR code or URL to view songs, presentations, liturgy, and Bibles. (Note: video and music are not currently displayed remotely). Again, each URL is unique to the installation and won't change, meaning they can save the URL as a bookmark for easy access. It also requires an internet connection.</p>
            <img 
              src={`${base}docs/settings/Settings-7.png`} 
              alt="Remote Viewing" 
              className="rounded-xl border border-neutral-800 shadow-lg mb-12 cursor-pointer hover:ring-2 hover:ring-blue-500 transition-all"
              onClick={() => setSelectedImage(`${base}docs/settings/Settings-7.png`)}
            />

            <h3 className="text-xl font-bold text-white mb-4">Storage Location</h3>
            <p className="leading-relaxed text-neutral-300 mb-6">This allows you to change the location of where you want your Halos library folder to be.</p>
            <img 
              src={`${base}docs/settings/Settings-8.png`} 
              alt="Storage Location" 
              className="rounded-xl border border-neutral-800 shadow-lg mb-6 cursor-pointer hover:ring-2 hover:ring-blue-500 transition-all"
              onClick={() => setSelectedImage(`${base}docs/settings/Settings-8.png`)}
            />

            <p className="leading-relaxed text-neutral-300 mb-6">When you click <strong>Change Media Library Folder</strong>, the app will ask you to confirm that you want to reload the application.</p>
            <img 
              src={`${base}docs/settings/Settings-8a.png`} 
              alt="Confirm Reload" 
              className="rounded-xl border border-neutral-800 shadow-lg mb-6 cursor-pointer hover:ring-2 hover:ring-blue-500 transition-all"
              onClick={() => setSelectedImage(`${base}docs/settings/Settings-8a.png`)}
            />

            <p className="leading-relaxed text-neutral-300 mb-6">Once confirmed, Halos will restart and bring you back to the initial setup screen, just like when you first opened the app.</p>
            <img 
              src={`${base}docs/settings/Settings-8b.png`} 
              alt="Initial Setup Screen" 
              className="rounded-xl border border-neutral-800 shadow-lg mb-6 cursor-pointer hover:ring-2 hover:ring-blue-500 transition-all"
              onClick={() => setSelectedImage(`${base}docs/settings/Settings-8b.png`)}
            />

            <p className="leading-relaxed text-neutral-300 mb-6">From there, simply click the <strong>Choose Library Folder</strong> button and select the new location on your computer. Make sure to grant the browser permission to access and save files in this new folder!</p>
            <img 
              src={`${base}docs/settings/Settings-8c.png`} 
              alt="Grant Folder Permissions" 
              className="rounded-xl border border-neutral-800 shadow-lg mb-12 cursor-pointer hover:ring-2 hover:ring-blue-500 transition-all"
              onClick={() => setSelectedImage(`${base}docs/settings/Settings-8c.png`)}
            />

            <h3 className="text-xl font-bold text-white mb-4">CCLI Export</h3>
            <p className="leading-relaxed text-neutral-300 mb-6">You may need to report a history of songs played to CCLI. To aid in reporting, you can enter the start and end dates (DD/MM/YYYY) and select export to CSV. This will download a log of any songs played to a file in your default downloads directory, called <code>halos_ccli_report_(date of export).csv</code> (for example, <code>halos_ccli_report_2026-09-08.csv</code>).</p>
            <img 
              src={`${base}docs/settings/settings-10.png`} 
              alt="CCLI Export Setting" 
              className="rounded-xl border border-neutral-800 shadow-lg mb-6 cursor-pointer hover:ring-2 hover:ring-blue-500 transition-all"
              onClick={() => setSelectedImage(`${base}docs/settings/settings-10.png`)}
            />
            <p className="leading-relaxed text-neutral-300 mb-6">When opened in a spreadsheet application, it will look like this, providing the Date Played, Artist, Song Title, and CCLI Number (if it was added to the song's data).</p>
            <img 
              src={`${base}docs/settings/settings-11.png`} 
              alt="CCLI Export CSV Preview" 
              className="rounded-xl border border-neutral-800 shadow-lg mb-12 cursor-pointer hover:ring-2 hover:ring-blue-500 transition-all"
              onClick={() => setSelectedImage(`${base}docs/settings/settings-11.png`)}
            />
          </div>
        </>
      );
    }
    
    // Fallback for placeholders
    const activeSection = navigationTree.flatMap(s => s.items).find(i => i.id === activeTab);
    return (
      <div className="flex flex-col items-center justify-center text-center py-20">
        <div className="w-24 h-24 bg-neutral-900 text-neutral-600 rounded-full flex items-center justify-center mb-8">
          {activeSection?.icon ? <activeSection.icon size={48} /> : <FileText size={48} />}
        </div>
        <h1 className="text-4xl font-black tracking-tight mb-4">{activeSection?.title || 'Coming Soon'}</h1>
        <p className="text-xl text-neutral-400 max-w-lg mb-8">We are actively working on writing the documentation for this feature. Check back soon!</p>
        <button 
          onClick={() => setActiveTab('landing')}
          className="text-blue-400 hover:text-blue-300 font-medium transition"
        >
          ← Back to Overview
        </button>
      </div>
    );
  };

  return (
    <div className="min-h-screen bg-neutral-950 text-white font-sans flex flex-col">
      {/* Lightbox Modal */}
      {selectedImage && (
        <div 
          className="fixed inset-0 z-[100] bg-black/95 backdrop-blur-sm overflow-auto flex"
          onClick={() => { setSelectedImage(null); setIsZoomed(false); }}
        >
          <button 
            className="fixed top-6 right-6 md:top-8 md:right-8 z-50 text-neutral-400 hover:text-white transition bg-neutral-900/80 p-3 rounded-full hover:bg-neutral-800 shadow-lg"
            onClick={(e) => { e.stopPropagation(); setSelectedImage(null); setIsZoomed(false); }}
          >
            <X size={24} />
          </button>
          
          <div className={`m-auto p-4 md:p-8 flex items-center justify-center transition-all duration-300 ${isZoomed ? 'min-w-[150vw] min-h-[150vh]' : 'w-full h-full'}`}>
            <img 
              src={selectedImage} 
              alt="Expanded view" 
              className={`rounded-xl shadow-2xl border border-neutral-800 transition-all duration-300 ease-out ${isZoomed ? 'cursor-zoom-out w-full max-w-none' : 'cursor-zoom-in max-w-full max-h-[85vh] object-contain'}`}
              onClick={(e) => { 
                e.stopPropagation(); 
                setIsZoomed(!isZoomed); 
              }} 
            />
          </div>
        </div>
      )}

      {/* Navigation */}
      <nav className="w-full fixed top-0 z-50 bg-neutral-950/80 backdrop-blur-xl border-b border-neutral-800/80">
        <div className="max-w-7xl mx-auto px-6 h-20 flex items-center justify-between">
          <button onClick={() => setActiveTab('landing')} className="flex items-center">
            <Logo />
          </button>
          <div className="flex items-center gap-8 text-sm font-bold tracking-widest uppercase">
            <button onClick={navigateToHome} className="text-neutral-400 hover:text-white transition">Home</button>
            <button onClick={() => setActiveTab('landing')} className="text-white">Docs</button>
            <button 
              onClick={navigateToApp}
              className="bg-blue-600 hover:bg-blue-500 text-white px-6 py-2.5 rounded-full transition shadow-[0_0_20px_rgba(37,99,235,0.3)] hover:shadow-[0_0_30px_rgba(37,99,235,0.5)]"
            >
              Launch App
            </button>
          </div>
        </div>
      </nav>

      {/* Docs Layout */}
      <div className="flex-1 flex max-w-7xl mx-auto w-full pt-20">
        
        {/* Sidebar */}
        <aside className="w-64 border-r border-neutral-800/50 hidden md:block py-10 pr-8 sticky top-20 h-[calc(100vh-80px)] overflow-y-auto">
          {navigationTree.map((section, index) => (
            <div key={index} className={index > 0 ? "mt-10" : ""}>
              <div className="flex items-center gap-2 text-xs font-black tracking-widest uppercase text-neutral-500 mb-6">
                <section.icon size={14} />
                {section.category}
              </div>
              <ul className="space-y-3">
                {section.items.map((item) => (
                  <li key={item.id}>
                    <button 
                      onClick={() => setActiveTab(item.id)}
                      className={`transition font-medium flex items-center gap-2 ${activeTab === item.id ? 'text-blue-400' : 'text-neutral-400 hover:text-white'}`}
                    >
                      {item.icon && <item.icon size={16} />}
                      {item.title}
                    </button>
                  </li>
                ))}
              </ul>
            </div>
          ))}
        </aside>

        {/* Main Content Area */}
        <main className="flex-1 py-10 px-6 md:pl-16">
          {renderContent()}
        </main>
      </div>

    </div>
  );
}
