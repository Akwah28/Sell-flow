import React, { useState, useEffect, useRef } from 'react';
import { 
  CheckCircle2, 
  Sparkles, 
  ArrowRight, 
  ArrowLeft, 
  X, 
  Share2, 
  Store, 
  MessageCircle, 
  Globe, 
  ShoppingBag, 
  Image as ImageIcon, 
  Check, 
  FileText, 
  Award, 
  ExternalLink,
  DollarSign
} from 'lucide-react';
import { db } from '../firebase';
import { doc, updateDoc, setDoc, getDoc, collection, addDoc, serverTimestamp } from 'firebase/firestore';
import { BusinessProfile, Product } from '../types';

// --- HIGH PERFORMANCE SELF-CONTAINED CANVAS CONFETTI EFFECT ---
export const CanvasConfetti: React.FC<{ trigger: boolean }> = ({ trigger }) => {
  const canvasRef = useRef<HTMLCanvasElement | null>(null);

  useEffect(() => {
    if (!trigger || !canvasRef.current) return;
    const canvas = canvasRef.current;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    let animationFrameId: number;
    let width = (canvas.width = window.innerWidth);
    let height = (canvas.height = window.innerHeight);

    const handleResize = () => {
      if (canvasRef.current) {
        width = canvasRef.current.width = window.innerWidth;
        height = canvasRef.current.height = window.innerHeight;
      }
    };
    window.addEventListener('resize', handleResize);

    // Particle class
    class Particle {
      x: number;
      y: number;
      size: number;
      color: string;
      speedX: number;
      speedY: number;
      rotation: number;
      rotationSpeed: number;

      constructor() {
        this.x = Math.random() * width;
        this.y = Math.random() * -height - 20;
        this.size = Math.random() * 8 + 6;
        const colors = ['#5B2FD4', '#10B981', '#3B82F6', '#F59E0B', '#EF4444', '#EC4899'];
        this.color = colors[Math.floor(Math.random() * colors.length)];
        this.speedX = Math.random() * 4 - 2;
        this.speedY = Math.random() * 5 + 4;
        this.rotation = Math.random() * 360;
        this.rotationSpeed = Math.random() * 4 - 2;
      }

      update() {
        this.x += this.speedX;
        this.y += this.speedY;
        this.rotation += this.rotationSpeed;
        if (this.y > height) {
          this.y = -20;
          this.x = Math.random() * width;
        }
      }

      draw() {
        if (!ctx) return;
        ctx.save();
        ctx.translate(this.x, this.y);
        ctx.rotate((this.rotation * Math.PI) / 180);
        ctx.fillStyle = this.color;
        // Draw squares and diamonds
        ctx.fillRect(-this.size / 2, -this.size / 2, this.size, this.size);
        ctx.restore();
      }
    }

    const particles: Particle[] = Array.from({ length: 110 }, () => new Particle());

    const render = () => {
      ctx.clearRect(0, 0, width, height);
      particles.forEach((p) => {
        p.update();
        p.draw();
      });
      animationFrameId = requestAnimationFrame(render);
    };

    render();

    // Cleanup after 4.5 seconds
    const timer = setTimeout(() => {
      cancelAnimationFrame(animationFrameId);
      if (ctx) ctx.clearRect(0, 0, width, height);
    }, 4500);

    return () => {
      window.removeEventListener('resize', handleResize);
      clearTimeout(timer);
      cancelAnimationFrame(animationFrameId);
    };
  }, [trigger]);

  return (
    <canvas
      ref={canvasRef}
      className="fixed inset-0 pointer-events-none z-[100] w-full h-full"
    />
  );
};

interface OnboardingFlowProps {
  business: BusinessProfile;
  products: Product[];
  userId: string;
  showToast: (msg: string, type: 'success' | 'error' | 'info') => void;
  onCloseWizard?: () => void;
  triggerOpenWizard?: boolean;
}

export const OnboardingFlow: React.FC<OnboardingFlowProps> = ({
  business,
  products,
  userId,
  showToast,
  onCloseWizard,
  triggerOpenWizard = false
}) => {
  // Wizard States
  const [isOpen, setIsOpen] = useState(false);
  const [currentStep, setCurrentStep] = useState(1);
  const [showCelebrate, setShowCelebrate] = useState(false);
  const [showFirstProductCeleb, setShowFirstProductCeleb] = useState(false);
  const [confettiActive, setConfettiActive] = useState(false);
  const [milestoneTriggered, setMilestoneTriggered] = useState<string | null>(null);

  // Field states bound directly to Profile/Products
  const [bizName, setBizName] = useState(business?.name || '');
  const [bizDesc, setBizDesc] = useState(business?.description || '');
  const [whatsappNum, setWhatsappNum] = useState(business?.whatsappNumber || '');
  const [storeSlug, setStoreSlug] = useState(business?.storeSlug || '');
  const [metaTitle, setMetaTitle] = useState(business?.metaTitle || '');
  const [metaDesc, setMetaDesc] = useState(business?.metaDescription || '');
  const [logoUrl, setLogoUrl] = useState(business?.logo || '');
  const [storeCurrency, setStoreCurrency] = useState(business?.currency || 'NGN');

  // Product Field states
  const [prodName, setProdName] = useState('');
  const [prodPrice, setProdPrice] = useState('');
  const [prodCategory, setProdCategory] = useState('Clothing');
  const [prodDesc, setProdDesc] = useState('');
  const [prodImage, setProdImage] = useState('');
  const [isSubmittingProd, setIsSubmittingProd] = useState(false);

  // Load state or detect new user
  useEffect(() => {
    // Check if we have an explicit trigger to open, or if it is a new user
    const isNewUser = localStorage.getItem('msf_is_new_signup') === 'true';
    if (isNewUser) {
      setShowCelebrate(true);
      setConfettiActive(true);
      localStorage.removeItem('msf_is_new_signup'); // Clean up so it won't pop up again
    } else if (triggerOpenWizard) {
      setIsOpen(true);
      // Resume from last completed or saved setup step index
      const savedStep = localStorage.getItem(`msf_onboarding_step_${userId}`);
      if (savedStep) {
        setCurrentStep(Number(savedStep));
      }
    }
  }, [triggerOpenWizard, userId]);

  // Synchronize internal states with profile updates
  useEffect(() => {
    if (business) {
      if (!bizName) setBizName(business.name || '');
      if (!bizDesc) setBizDesc(business.description || '');
      if (!whatsappNum) setWhatsappNum(business.whatsappNumber || '');
      if (!storeSlug) setStoreSlug(business.storeSlug || '');
      if (!logoUrl) setLogoUrl(business.logo || '');
      if (!metaTitle) setMetaTitle(business.metaTitle || business.name || '');
      if (!metaDesc) setMetaDesc(business.metaDescription || business.description || '');
      if (!storeCurrency) setStoreCurrency(business.currency || 'NGN');
    }
  }, [business]);

  // Save specific step changes locally and in Firestore for high continuity
  const saveProgress = async (fields: Partial<BusinessProfile>) => {
    try {
      const docRef = doc(db, 'businesses', userId);
      await updateDoc(docRef, fields);
      // Auto-save search indexing slug if slug was changed
      if (fields.storeSlug) {
        const slug = fields.storeSlug.toLowerCase().trim();
        await setDoc(doc(db, 'slugs', slug), {
          ownerId: userId,
          businessName: fields.name || business.name || 'My Store'
        });
      }
    } catch (e) {
      console.error("Failed to auto-save onboarding inputs:", e);
    }
  };

  const handleNextStep = async () => {
    // Save current step data on next click
    if (currentStep === 1) {
      if (!bizName.trim()) {
        showToast("Business Name is required to continue.", "error");
        return;
      }
      await saveProgress({ name: bizName, description: bizDesc });
    } else if (currentStep === 2) {
      await saveProgress({ logo: logoUrl, currency: storeCurrency });
    } else if (currentStep === 3) {
      if (!whatsappNum.trim()) {
        showToast("WhatsApp sales connection number is required.", "error");
        return;
      }
      // Clean and validate whatsapp number format
      let formattedNum = whatsappNum.replace(/\D/g, '');
      if (!formattedNum.startsWith('234') && formattedNum.startsWith('0')) {
        formattedNum = '234' + formattedNum.substring(1);
      } else if (!formattedNum.startsWith('234') && formattedNum.length > 0) {
        formattedNum = '234' + formattedNum;
      }
      await saveProgress({ whatsappNumber: formattedNum });
    } else if (currentStep === 4) {
      const cleanSlug = storeSlug.toLowerCase().replace(/[^a-z0-9_\-]/g, '').trim();
      if (!cleanSlug) {
        showToast("Please specify a custom store URL slug.", "error");
        return;
      }
      // Check if slug already exists to prevent intercepts
      try {
        const slugDoc = await getDoc(doc(db, 'slugs', cleanSlug));
        if (slugDoc.exists() && slugDoc.data().ownerId !== userId) {
          showToast(`The slug "${cleanSlug}" is already taken by another store. Please choose a unique name!`, "error");
          return;
        }
      } catch (e) {
        console.warn("Could not verify slug uniqueness:", e);
      }
      await saveProgress({ 
        storeSlug: cleanSlug,
        storefrontUrl: `https://${cleanSlug}.mysellflow.store`,
        subdomain: `${cleanSlug}.mysellflow.store`
      });
    } else if (currentStep === 5) {
      await saveProgress({ metaTitle, metaDescription: metaDesc });
    }

    // Step Increment
    const next = currentStep + 1;
    setCurrentStep(next);
    localStorage.setItem(`msf_onboarding_step_${userId}`, String(next));

    // Handle profile completion milestone indicator
    if (next === 6) {
      const isProfileDone = bizName && bizDesc && whatsappNum && storeSlug && logoUrl;
      if (isProfileDone && !localStorage.getItem('msf_milestone_profile')) {
        localStorage.setItem('msf_milestone_profile', 'true');
        triggerMilestone('Profile Completed');
      }
    }
  };

  const handlePrevStep = () => {
    if (currentStep > 1) {
      const prev = currentStep - 1;
      setCurrentStep(prev);
      localStorage.setItem(`msf_onboarding_step_${userId}`, String(prev));
    }
  };

  const handleSkipWizard = () => {
    setIsOpen(false);
    if (onCloseWizard) onCloseWizard();
  };

  // Submit First Product Real-time publication
  const handlePublishFirstProduct = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!prodName.trim() || !prodPrice.trim()) {
      showToast("Product name and price are required to publish.", "error");
      return;
    }

    setIsSubmittingProd(true);
    try {
      const productData = {
        name: prodName.trim(),
        price: parseFloat(prodPrice),
        description: prodDesc.trim(),
        images: prodImage ? [prodImage.trim()] : ['https://images.unsplash.com/photo-1542291026-7eec264c27ff?auto=format&fit=crop&q=80&w=600'],
        type: 'physical' as const,
        isActive: true,
        category: prodCategory, // Map custom attribute
        ownerId: userId,
        inventoryStatus: 'in_stock' as const,
        createdAt: serverTimestamp()
      };

      await addDoc(collection(db, 'products'), productData);
      
      // Clear product input forms
      setProdName('');
      setProdPrice('');
      setProdDesc('');
      setProdImage('');

      // Create first product milestone & trigger beautiful congratulations overlay
      localStorage.setItem('msf_milestone_product', 'true');
      setShowFirstProductCeleb(true);
      setConfettiActive(true);
    } catch (err: any) {
      console.error("Failed to post onboarding first product:", err);
      showToast("Could not publish product. Please check your network connection.", "error");
    } finally {
      setIsSubmittingProd(false);
    }
  };

  // Trigger custom interactive milestones alert
  const triggerMilestone = (title: string) => {
    setMilestoneTriggered(title);
    setConfettiActive(true);
    setTimeout(() => {
      setConfettiActive(false);
    }, 4000);
    setTimeout(() => {
      setMilestoneTriggered(null);
    }, 5000);
  };

  // Pre-made premium product image selectors for Lagos merchants to get started instantly if they don't have images
  const sampleImages = [
    { name: 'Fashion Shoes', url: 'https://images.unsplash.com/photo-1542291026-7eec264c27ff?auto=format&fit=crop&q=80&w=600' },
    { name: 'Smart Watch', url: 'https://images.unsplash.com/photo-1523275335684-37898b6baf30?auto=format&fit=crop&q=80&w=600' },
    { name: 'Perfume Gold', url: 'https://images.unsplash.com/photo-1541643600914-78b084683601?auto=format&fit=crop&q=80&w=600' },
    { name: 'Wireless Pods', url: 'https://images.unsplash.com/photo-1505740420928-5e560c06d30e?auto=format&fit=crop&q=80&w=600' }
  ];

  // Sharing tracking helper
  const handleWhatsAppShare = () => {
    localStorage.setItem('msf_shared_store', 'true');
    const slug = (business?.storeSlug || "yourstore").toLowerCase().trim();
    const subdomain = `${slug}.mysellflow.store`;
    const shareText = `Hi! Check out my newly launched storefront "${business.name}" of automated products! Click here to view and order directly on WhatsApp: ${subdomain}`;
    window.open(`https://api.whatsapp.com/send?text=${encodeURIComponent(shareText)}`, '_blank');
    triggerMilestone('Store Shared!');
  };

  const handleCopyLink = () => {
    localStorage.setItem('msf_shared_store', 'true');
    const slug = (business?.storeSlug || "yourstore").toLowerCase().trim();
    const subdomain = `${slug}.mysellflow.store`;
    navigator.clipboard.writeText(subdomain).then(() => {
      showToast("Store URL Link copied to clipboard successfully!", "success");
      triggerMilestone('Store Link Copied!');
    });
  };

  // Tasks progress state updates automatically
  const tasks = [
    { id: 'account_created', label: 'Account Created', desc: 'Secure register complete', check: () => true },
    { id: 'profile_name', label: 'Fill Store Profile & Bio', desc: 'Add store title and description', check: () => business?.name && business.name !== "My Business" && business.name !== "New Business" },
    { id: 'upload_logo', label: 'Upload Store Logo & Branding', desc: 'Set store icon image representation', check: () => !!business?.logo },
    { id: 'whatsapp_number', label: 'Connect WhatsApp Orders', desc: 'Link public numbers for order checks', check: () => !!business?.whatsappNumber },
    { id: 'store_slug', label: 'Claim Custom storefront URL', desc: 'Choose a memorable domain extension', check: () => business?.storeSlug && business.storeSlug !== "myshop" && business.storeSlug !== "shop" },
    { id: 'seo_details', label: 'Store Google SEO Tags', desc: 'Setup keywords and descriptive titles', check: () => !!business?.metaDescription },
    { id: 'add_product', label: 'Publish Your First Product', desc: 'Create first live inventory catalog', check: () => products?.length > 0 },
    { id: 'share_store', label: 'Share Store with WhatsApp Buyers', desc: 'Copy or click to share on social feeds', check: () => localStorage.getItem('msf_shared_store') === 'true' }
  ];

  const completedCount = tasks.filter(t => t.check()).length;
  const totalTasks = tasks.length;
  const progressPercent = Math.round((completedCount / totalTasks) * 100);

  // Auto-finish onboarding is shown if it is completely 100% completed or dismissed
  const isAllTasksCompleted = completedCount === totalTasks;

  // Track if wizard modal is completely closed but the user wants to see it
  const displayWizard = isOpen && !isAllTasksCompleted;

  return (
    <>
      {/* HIGH IMPACT CELEBRATIONS & TOURS OVERLAYS */}
      <CanvasConfetti trigger={confettiActive} />

      {/* 1. NEW USER ON DESIGN SIGNUP CELEBRATION MODAL */}
      {showCelebrate && (
        <div className="fixed inset-0 bg-slate-950/90 backdrop-blur-md z-[80] flex items-center justify-center p-4">
          <div className="bg-slate-900 border border-slate-800 rounded-3xl p-6 md:p-8 max-w-lg w-full text-center relative overflow-hidden shadow-2xl animate-fade-in">
            {/* Visual ambient accents */}
            <div className="absolute top-0 left-1/2 -translate-x-1/2 w-48 h-48 bg-purple-600/20 rounded-full blur-3xl pointer-events-none" />
            
            <div className="w-20 h-20 bg-gradient-to-tr from-[#5B2FD4] to-[#10B981] rounded-3xl flex items-center justify-center mx-auto mb-6 shadow-lg shadow-[#5B2FD4]/20 animate-bounce">
              <Sparkles size={40} className="text-white" />
            </div>

            <h2 className="text-3xl font-black text-white tracking-tighter uppercase italic mb-2">
              🎉 Welcome to MySellFlow!
            </h2>
            <p className="text-emerald-400 font-bold text-xs uppercase tracking-widest mb-4">
              Your account has been created successfully.
            </p>
            
            <p className="text-slate-400 text-sm leading-relaxed mb-6">
              You are just a few steps away from launching your online store. Join thousands of Nigerian digital merchants automating WhatsApp sales today.
            </p>

            <div className="flex flex-col sm:flex-row gap-3 justify-center">
              <button
                type="button"
                onClick={() => {
                  setShowCelebrate(false);
                  setIsOpen(true);
                  setCurrentStep(1);
                  setConfettiActive(false);
                }}
                className="bg-gradient-to-r from-[#5B2FD4] to-indigo-600 hover:from-purple-600 hover:to-indigo-700 text-white font-black uppercase text-xs tracking-wider px-6 py-4 rounded-xl shadow-lg shadow-[#5B2FD4]/20 transform transition duration-200 hover:-translate-y-0.5"
              >
                Start Setup Wizard
              </button>
              <button
                type="button"
                onClick={() => {
                  setShowCelebrate(false);
                  setConfettiActive(false);
                }}
                className="bg-slate-800 text-slate-300 hover:bg-slate-700 font-black uppercase text-xs tracking-wider px-6 py-4 rounded-xl transition-colors"
              >
                Skip For Now
              </button>
            </div>
          </div>
        </div>
      )}

      {/* 2. DYNAMIC MILESTONE BANNER POPUP OVERLAY */}
      {milestoneTriggered && (
        <div className="fixed top-6 right-6 z-[90] bg-slate-900 border border-slate-800 p-4 rounded-2xl shadow-2xl flex items-center gap-4 animate-slide-in max-w-sm">
          <div className="w-12 h-12 rounded-xl bg-gradient-to-r from-emerald-500 to-teal-500 flex items-center justify-center shrink-0">
            <Award className="text-white" size={24} />
          </div>
          <div>
            <p className="text-emerald-400 text-[10px] font-black uppercase tracking-widest">Milestone Completed!</p>
            <h4 className="text-sm font-black text-white mt-0.5">{milestoneTriggered}</h4>
            <p className="text-xs text-slate-400">Awesome! Your store completion goes up. Keep it up!</p>
          </div>
        </div>
      )}

      {/* 3. GUIDED ONBOARDING TOUR WIZARD (Dark backdrop overlay modal with isolated steps) */}
      {displayWizard && (
        <div className="fixed inset-0 bg-slate-950/85 backdrop-blur-sm z-[70] flex items-center justify-center p-4">
          <div className="bg-slate-900 border-2 border-slate-800 rounded-3xl shadow-3xl max-w-2xl w-full overflow-hidden relative flex flex-col max-h-[90vh]">
            
            {/* Header with detailed dynamic store completion tracking progress */}
            <div className="p-5 border-b border-slate-800 flex items-center justify-between bg-slate-950/50">
              <div className="flex items-center gap-2.5">
                <div className="w-8 h-8 rounded-lg bg-indigo-500/10 flex items-center justify-center border border-indigo-500/20 text-[#5B2FD4]">
                  <Store size={18} />
                </div>
                <div>
                  <h3 className="text-sm font-extrabold text-white uppercase tracking-wider">Storefront Registration Wizard</h3>
                  <p className="text-xs text-slate-400">{completedCount} of {totalTasks} tasks completed</p>
                </div>
              </div>
              
              <button 
                type="button" 
                onClick={handleSkipWizard}
                className="text-slate-400 hover:text-white transition-colors"
                title="Skip setup wizard"
              >
                <X size={20} />
              </button>
            </div>

            {/* Dynamic Step Progress Meter bar */}
            <div className="bg-slate-950 h-1.5 w-full relative">
              <div 
                className="bg-gradient-to-r from-[#5B2FD4] to-[#10B981] h-full transition-all duration-350"
                style={{ width: `${(currentStep / 6) * 100}%` }}
              />
            </div>

            {/* Scrollable Wizard content viewport */}
            <div className="p-6 md:p-8 overflow-y-auto max-h-[60vh] space-y-6">
              
              {/* STEP 1: BUSINESS IDENTITY NAME & DESCRIPTION */}
              {currentStep === 1 && (
                <div className="space-y-4 animate-fade-in">
                  <div className="bg-indigo-500/10 text-indigo-400 border border-indigo-500/20 px-4 py-3 rounded-2xl text-xs space-y-1">
                    <span className="font-black uppercase tracking-wider block">✍️ What to configure:</span>
                    <p className="text-slate-300">Choose a highly professional business brand name & a succinct storefront bio description that clearly explains your products.</p>
                    <span className="font-extrabold text-[10px] text-[#10B981] block mt-1">💡 Why it matters:</span>
                    <p className="text-slate-300">Customers who see a complete, detailed store name at checkout are 2.5x more likely to finish their order securely on WhatsApp.</p>
                  </div>

                  <div className="space-y-4">
                    <div className="space-y-1">
                      <label className="text-[10px] font-black text-slate-300 uppercase tracking-wider">Store / Business Brand Name</label>
                      <input 
                        type="text" 
                        placeholder="e.g. Joy Fashion & Clothing Lagos"
                        value={bizName}
                        onChange={e => setBizName(e.target.value)}
                        className="w-full bg-slate-950/70 border border-slate-800 p-3.5 rounded-xl text-xs font-medium text-white outline-none focus:border-[#5B2FD4] transition-colors"
                        required
                      />
                    </div>
                    <div className="space-y-1">
                      <label className="text-[10px] font-black text-slate-300 uppercase tracking-wider">Business Bio / Storefront Description</label>
                      <textarea 
                        rows={3}
                        placeholder="e.g. Grab premium luxury sandals, fabrics, bags and more shipped directly from Benin city to Lagos instantly. Order on WhatsApp."
                        value={bizDesc}
                        onChange={e => setBizDesc(e.target.value)}
                        className="w-full bg-slate-950/70 border border-slate-800 p-3.5 rounded-xl text-xs font-medium text-white outline-none focus:border-[#5B2FD4] transition-colors resize-none"
                      />
                    </div>
                  </div>
                </div>
              )}

              {/* STEP 2: BRANDING LOGO & CURRENCY CHOICE */}
              {currentStep === 2 && (
                <div className="space-y-4 animate-fade-in">
                  <div className="bg-indigo-500/10 text-indigo-400 border border-indigo-500/20 px-4 py-3 rounded-2xl text-xs space-y-1">
                    <span className="font-black uppercase tracking-wider block">🎨 Branding Design customization:</span>
                    <p className="text-slate-300">Upload a crisp square brand logo image link, and choose your local store default checkout transaction currency.</p>
                    <span className="font-extrabold text-[10px] text-[#10B981] block mt-1">💡 Why it matters:</span>
                    <p className="text-slate-300">A clear, memorable visual logo creates high confidence in buyers. Choosing the correct matching base currency prevents currency conversion friction at payment portals.</p>
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div className="space-y-2">
                      <label className="text-[10px] font-black text-slate-300 uppercase tracking-wider">Brand Logo Image Link URL</label>
                      <input 
                        type="text" 
                        placeholder="Paste image url or keep default logo"
                        value={logoUrl}
                        onChange={e => setLogoUrl(e.target.value)}
                        className="w-full bg-slate-950/70 border border-slate-800 p-3.5 rounded-xl text-xs font-medium text-white outline-none focus:border-[#5B2FD4] transition-colors"
                      />
                      <div className="flex items-center gap-3 mt-1 pl-1">
                        {logoUrl ? (
                          <img src={logoUrl} alt="Logo Preview" className="w-10 h-10 object-cover rounded-lg border border-slate-700" referrerPolicy="no-referrer" />
                        ) : (
                          <div className="w-10 h-10 rounded-lg bg-slate-850 flex items-center justify-center border border-slate-700">
                            <ImageIcon className="text-slate-500" size={16} />
                          </div>
                        )}
                        <span className="text-[10px] text-slate-400">Live logo preview representation</span>
                      </div>
                    </div>

                    <div className="space-y-2">
                      <label className="text-[10px] font-black text-slate-300 uppercase tracking-wider">Base Transaction Currency</label>
                      <select 
                        value={storeCurrency}
                        onChange={e => setStoreCurrency(e.target.value)}
                        className="w-full bg-slate-950/70 border border-slate-800 p-3.5 rounded-xl text-xs font-medium text-white outline-none focus:border-[#5B2FD4] transition-colors"
                      >
                        <option value="NGN">NGN (₦) Nigerian Naira</option>
                        <option value="USD">USD ($) United States Dollar</option>
                        <option value="GBP">GBP (£) British Pound</option>
                        <option value="GHS">GHS (₵) Ghanaian Cedi</option>
                      </select>
                      <p className="text-[10px] text-slate-400">Customers will see prices presented in this selected currency format.</p>
                    </div>
                  </div>
                </div>
              )}

              {/* STEP 3: SALES CHANNEL WHATSAPP CONNECTION */}
              {currentStep === 3 && (
                <div className="space-y-4 animate-fade-in">
                  <div className="bg-teal-500/10 text-teal-400 border border-teal-500/20 px-4 py-3 rounded-2xl text-xs space-y-1">
                    <span className="font-black uppercase tracking-wider block">📞 Connecting your checkout delivery phone:</span>
                    <p className="text-slate-300">Supply your active business WhatsApp number. All storefront automatic orders and buyer chats compile and push to this cell line.</p>
                    <span className="font-extrabold text-[10px] text-[#10B981] block mt-1">💡 Why it matters:</span>
                    <p className="text-slate-300">MySellFlow automates shopping receipts and compiles them as WhatsApp checkouts. If this field is incorrect, buyers can't message your sales account to close the deal!</p>
                  </div>

                  <div className="space-y-2">
                    <label className="text-[10px] font-black text-slate-300 uppercase tracking-wider block">WhatsApp Business Mobile Line</label>
                    <div className="relative">
                      <span className="absolute left-3.5 top-3.5 text-xs text-slate-500 font-bold select-none">+234</span>
                      <input 
                        type="text" 
                        placeholder="e.g. 8056224562"
                        value={whatsappNum}
                        onChange={e => setWhatsappNum(e.target.value)}
                        className="w-full bg-slate-950/70 border border-slate-800 p-3.5 pl-14 rounded-xl text-xs font-medium text-white outline-none focus:border-[#5B2FD4] transition-colors"
                        required
                      />
                    </div>
                    <p className="text-[10px] text-slate-400">Please provide the phone number with area code details (numbers only, e.g. 8056224562 or 0805...). We safely auto-format to Nigeria country indices (+234).</p>
                  </div>
                </div>
              )}

              {/* STEP 4: MEMORABLE SUBDOMAIN / STORE URL SLUG */}
              {currentStep === 4 && (
                <div className="space-y-4 animate-fade-in">
                  <div className="bg-indigo-500/10 text-indigo-400 border border-indigo-500/20 px-4 py-3 rounded-2xl text-xs space-y-1">
                    <span className="font-black uppercase tracking-wider block">🌐 Claiming your customized store URL:</span>
                    <p className="text-slate-300">Claim a cool, unique web address where customers visit. Keep it clean with letters and numbers (no spaces, e.g. "joyclothing").</p>
                    <span className="font-extrabold text-[10px] text-[#10B981] block mt-1">💡 Why it matters:</span>
                    <p className="text-slate-300">A branded, clean domain (e.g. joyclothing.mysellflow.store) builds 3x more brand memory recall than long, messy layout links.</p>
                  </div>

                  <div className="space-y-2">
                    <label className="text-[10px] font-black text-slate-300 uppercase tracking-wider block">Custom Store URL Slug</label>
                    <div className="bg-slate-950/80 border border-slate-800 rounded-xl p-3.5 flex items-center justify-between text-xs text-slate-400 gap-2 font-mono flex-wrap">
                      <span className="truncate">mysellflow.store/</span>
                      <input 
                        type="text" 
                        placeholder="yourshop"
                        value={storeSlug}
                        onChange={e => setStoreSlug(e.target.value.toLowerCase().replace(/[^a-z0-9_\-]/g, ''))}
                        className="bg-slate-900 border border-slate-800 rounded px-2.5 py-1 text-white outline-none focus:border-indigo-500 text-xs font-extrabold max-w-[150px] md:max-w-[200px]"
                        required
                      />
                    </div>
                    <p className="text-[10px] text-slate-400">No special symbols or spaces. This is your ultimate storefront link claimed in real-time.</p>
                  </div>
                </div>
              )}

              {/* STEP 5: STORE GOOGLE SEARCH ENGINE OPTIMIZATION (SEO DETAILS) */}
              {currentStep === 5 && (
                <div className="space-y-4 animate-fade-in">
                  <div className="bg-indigo-500/10 text-indigo-400 border border-indigo-500/20 px-4 py-3 rounded-2xl text-xs space-y-1">
                    <span className="font-black uppercase tracking-wider block">🚀 Google Search Rank Optimization (SEO):</span>
                    <p className="text-slate-300">Input meta titles and descriptive content to help indexing bots easily catalog and rank your store index on google organic listings.</p>
                    <span className="font-extrabold text-[10px] text-[#10B981] block mt-1">💡 Why it matters:</span>
                    <p className="text-slate-300">90% of local Nigerian buyers search on Google when looking for e-commerce. Having clean seo metadata represents your store instantly with the correct description.</p>
                  </div>

                  <div className="grid grid-cols-1 gap-4">
                    <div className="space-y-1">
                      <label className="text-[10px] font-black text-slate-300 uppercase tracking-wider block">SEO Google Meta Search Title</label>
                      <input 
                        type="text" 
                        placeholder="e.g. Best Ankara Dress Vendor in Ikeja Lagos | Joy Fashion"
                        value={metaTitle}
                        onChange={e => setMetaTitle(e.target.value)}
                        className="w-full bg-slate-950/70 border border-slate-800 p-3.5 rounded-xl text-xs font-medium text-white outline-none focus:border-[#5B2FD4] transition-colors"
                      />
                    </div>
                    <div className="space-y-1">
                      <label className="text-[10px] font-black text-slate-300 uppercase tracking-wider block">Google Search Meta Description</label>
                      <textarea 
                        rows={2}
                        placeholder="e.g. Purchase Ankara textiles, dresses, shoes and shirts on Lagos #1 WhatsApp Store. Fast shipping, responsive service and secure payments."
                        value={metaDesc}
                        onChange={e => setMetaDesc(e.target.value)}
                        className="w-full bg-slate-950/70 border border-slate-800 p-3.5 rounded-xl text-xs font-medium text-white outline-none focus:border-[#5B2FD4] transition-colors resize-none"
                      />
                    </div>
                  </div>
                </div>
              )}

              {/* STEP 6: PUBLISH YOUR VERY FIRST PRODUCT CATALOG */}
              {currentStep === 6 && (
                <div className="space-y-4 animate-fade-in">
                  <div className="bg-emerald-500/10 text-emerald-400 border border-emerald-500/20 px-4 py-3 rounded-2xl text-xs space-y-1">
                    <span className="font-black uppercase tracking-wider block">🛍️ Populate Your Storefront Inventory:</span>
                    <p className="text-slate-300">You are ready! Let's publish your very first product catalog so users can buy instantly.</p>
                    <span className="font-extrabold text-[10px] text-[#10B981] block mt-1">💡 Why it matters:</span>
                    <p className="text-slate-300">Storefronts with at least one highlighted inventory sample receive the highest share rate and double customer engagement on day 1.</p>
                  </div>

                  <form onSubmit={handlePublishFirstProduct} className="space-y-4">
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      <div className="space-y-1">
                        <label className="text-[10px] font-black text-slate-300 uppercase tracking-wider">Product Catalog Name</label>
                        <input 
                          type="text" 
                          placeholder="e.g. Classic Ankara Luxury Heels"
                          value={prodName}
                          onChange={e => setProdName(e.target.value)}
                          className="w-full bg-slate-950/70 border border-slate-800 p-3.5 rounded-xl text-xs font-medium text-white outline-none focus:border-[#5B2FD4] transition-colors"
                          required
                        />
                      </div>
                      <div className="space-y-1">
                        <label className="text-[10px] font-black text-slate-300 uppercase tracking-wider">Product Category Tag</label>
                        <input 
                          type="text" 
                          placeholder="e.g. Clothing, Electronics, Health"
                          value={prodCategory}
                          onChange={e => setProdCategory(e.target.value)}
                          className="w-full bg-slate-950/70 border border-slate-800 p-3.5 rounded-xl text-xs font-medium text-white outline-none focus:border-[#5B2FD4] transition-colors"
                        />
                      </div>
                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      <div className="space-y-1">
                        <label className="text-[10px] font-black text-slate-300 uppercase tracking-wider">Product Selling Price ({storeCurrency})</label>
                        <input 
                          type="number" 
                          placeholder="e.g., 25000"
                          value={prodPrice}
                          onChange={e => setProdPrice(e.target.value)}
                          className="w-full bg-slate-950/70 border border-slate-800 p-3.5 rounded-xl text-xs font-medium text-white outline-none focus:border-[#5B2FD4] transition-colors"
                          required
                        />
                      </div>
                      <div className="space-y-1">
                        <label className="text-[10px] font-black text-slate-300 uppercase tracking-wider">Catalog Image Link</label>
                        <input 
                          type="text" 
                          placeholder="Paste image URL, or choose down below"
                          value={prodImage}
                          onChange={e => setProdImage(e.target.value)}
                          className="w-full bg-slate-950/70 border border-slate-800 p-3.5 rounded-xl text-xs font-medium text-white outline-none focus:border-[#5B2FD4] transition-colors"
                        />
                      </div>
                    </div>

                    {/* Quick sample image picker selector */}
                    <div className="space-y-2">
                      <label className="text-[9px] font-black text-slate-400 uppercase tracking-wider block">No product image? Tap a premium Lagos sample template to populate instantly:</label>
                      <div className="grid grid-cols-4 gap-2">
                        {sampleImages.map((img, i) => (
                          <button
                            key={i}
                            type="button"
                            onClick={() => setProdImage(img.url)}
                            className={`p-1 bg-slate-850 rounded-lg border text-center transition-all ${prodImage === img.url ? 'border-emerald-400 ring-2 ring-emerald-500/20' : 'border-slate-800 hover:border-slate-600'}`}
                          >
                            <img src={img.url} alt={img.name} className="w-full h-12 object-cover rounded-md mb-1" referrerPolicy="no-referrer" />
                            <span className="text-[8px] font-black text-slate-400 uppercase tracking-wider block truncate">{img.name}</span>
                          </button>
                        ))}
                      </div>
                    </div>

                    <div className="space-y-1">
                      <label className="text-[10px] font-black text-slate-300 uppercase tracking-wider">Short Item Description / Highlights</label>
                      <textarea 
                        rows={2}
                        placeholder="e.g. Genuine Nigerian leather materials completely customizable, robust strap buckles, fits sizes 38-42."
                        value={prodDesc}
                        onChange={e => setProdDesc(e.target.value)}
                        className="w-full bg-slate-950/70 border border-slate-800 p-3.5 rounded-xl text-xs font-medium text-white outline-none focus:border-[#5B2FD4] transition-colors resize-none"
                      />
                    </div>

                    <button
                      type="submit"
                      disabled={isSubmittingProd}
                      className="w-full bg-gradient-to-r from-emerald-500 to-teal-500 hover:from-emerald-600 hover:to-teal-600 text-white font-black uppercase text-xs tracking-wider py-4 rounded-xl shadow-lg shadow-emerald-500/10 transition-all cursor-pointer disabled:opacity-50"
                    >
                      {isSubmittingProd ? 'Publishing product...' : '🚀 Publish Product & Launch storefront!'}
                    </button>
                  </form>
                </div>
              )}
            </div>

            {/* Bottom Navigation controls bar */}
            <div className="p-5 border-t border-slate-800 bg-slate-950/50 flex justify-between items-center bg-slate-900 overflow-hidden">
              <button
                type="button"
                onClick={handlePrevStep}
                disabled={currentStep === 1}
                className="flex items-center gap-2 bg-slate-800 hover:bg-slate-700 text-slate-300 font-extrabold text-[10px] uppercase tracking-wider px-4 py-3 rounded-xl disabled:opacity-30 disabled:pointer-events-none transition-colors cursor-pointer"
              >
                <ArrowLeft size={14} /> Back
              </button>

              <div className="flex gap-2">
                <button
                  type="button"
                  onClick={handleSkipWizard}
                  className="text-slate-400 hover:text-white font-extrabold text-[10px] uppercase tracking-wider px-3.5 py-3 transition-colors cursor-pointer"
                >
                  Skip Wizard
                </button>

                {currentStep < 6 ? (
                  <button
                    type="button"
                    onClick={handleNextStep}
                    className="flex items-center gap-2 bg-gradient-to-r from-[#5B2FD4] to-indigo-600 hover:from-purple-600 hover:to-indigo-700 text-white font-extrabold text-[10px] uppercase tracking-wider px-5 py-3 rounded-xl shadow-md cursor-pointer transition-all active:scale-95"
                  >
                    Next <ArrowRight size={14} />
                  </button>
                ) : (
                  <div className="w-[10px]" />
                )}
              </div>
            </div>
          </div>
        </div>
      )}

      {/* 4. FIRST PRODUCT CELEBRATION & STORE LINK ACTIVATION */}
      {showFirstProductCeleb && (
        <div className="fixed inset-0 bg-slate-950/90 backdrop-blur-md z-[80] flex items-center justify-center p-4">
          <div className="bg-slate-900 border border-slate-800 rounded-3xl p-6 md:p-8 max-w-lg w-full text-center relative overflow-hidden shadow-2xl animate-fade-in">
            {/* Ambient styling */}
            <div className="absolute top-0 left-1/2 -translate-x-1/2 w-48 h-48 bg-emerald-600/20 rounded-full blur-3xl pointer-events-none" />

            <div className="w-20 h-20 bg-emerald-500 rounded-2xl flex items-center justify-center mx-auto mb-6 shadow-lg shadow-emerald-500/20 animate-bounce">
              <ShoppingBag size={40} className="text-white" />
            </div>

            <h2 className="text-2xl font-black text-white tracking-tighter uppercase italic mb-2">
              🎉 Congratulations!
            </h2>
            <p className="text-emerald-400 font-bold text-xs uppercase tracking-widest mb-4">
              Your first product catalog is now live!
            </p>

            <p className="text-slate-400 text-xs md:text-sm leading-relaxed mb-6">
              Fantastic! Your storefront now has real visual merchandise. Active sharing is crucial to drive traffic. Share on WhatsApp status to start receiving alerts instantly.
            </p>

            {/* Sharing buttons inside the modal for high accessibility */}
            <div className="bg-slate-950 p-4 rounded-2xl border border-slate-800 text-left space-y-3.5 mb-6">
              <span className="text-[9px] font-black text-slate-400 uppercase tracking-widest block">Action Hub: Activate Store Link</span>
              <div className="flex items-center justify-between text-xs font-mono bg-slate-905 p-2 rounded-lg border border-slate-800 overflow-hidden truncate">
                <span className="text-slate-300 select-all truncate pr-3">
                  {(business?.storeSlug || "yourstore").toLowerCase().trim()}.mysellflow.store
                </span>
                <button 
                  onClick={handleCopyLink} 
                  className="bg-emerald-500 hover:bg-emerald-600 font-black text-[9px] uppercase tracking-wider px-3 py-1.5 rounded text-white shrink-0"
                >
                  Copy URL
                </button>
              </div>
              
              <div className="flex flex-col sm:flex-row gap-2 mt-4">
                <button
                  onClick={handleWhatsAppShare}
                  className="flex-1 bg-gradient-to-r from-emerald-500 to-teal-500 hover:from-emerald-600 hover:to-teal-600 text-white font-black uppercase text-[10px] tracking-wide py-3.5 rounded-xl flex items-center justify-center gap-2 cursor-pointer shadow-lg shadow-emerald-500/10"
                >
                  <MessageCircle size={14} className="fill-white stroke-none" /> Share to WhatsApp feed
                </button>
                <a
                  href={`https://${(business?.storeSlug || "yourstore").toLowerCase().trim()}.mysellflow.store`}
                  target="_blank"
                  rel="noreferrer"
                  className="flex-1 bg-slate-800 hover:bg-slate-700 text-slate-300 font-black uppercase text-[10px] tracking-wide py-3.5 rounded-xl flex items-center justify-center gap-2 cursor-pointer"
                >
                  <ExternalLink size={14} /> View Store Live
                </a>
              </div>
            </div>

            <div className="flex gap-2 justify-center">
              <button
                type="button"
                onClick={() => {
                  setShowFirstProductCeleb(false);
                  setConfettiActive(false);
                  setIsOpen(false);
                  if (onCloseWizard) onCloseWizard();
                }}
                className="bg-indigo-600 hover:bg-indigo-700 text-white font-black uppercase text-[10px] tracking-widest px-5 py-3 rounded-xl transition-all"
              >
                Go to Dashboard
              </button>
              <button
                type="button"
                onClick={() => {
                  setShowFirstProductCeleb(false);
                  setConfettiActive(false);
                  setCurrentStep(6); // Keep them on product addition
                }}
                className="bg-slate-800 hover:bg-slate-700 text-slate-300 font-black uppercase text-[10px] tracking-widest px-5 py-3 rounded-xl transition-all"
              >
                Add Another Product
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
};

// --- PERSISTENT CHECKLIST CARD COMPONENT FOR DASHBOARD AND PROFILE PAGES ---
interface SetupChecklistCardProps {
  business: BusinessProfile;
  products: Product[];
  onOpenWizard: () => void;
  showToast: (msg: string, type: 'success' | 'error' | 'info') => void;
  onNavigateToTab?: (tabId: string) => void;
}

export const SetupChecklistCard: React.FC<SetupChecklistCardProps> = ({
  business,
  products,
  onOpenWizard,
  showToast,
  onNavigateToTab
}) => {
  const [copied, setCopied] = useState(false);

  // Re-assess dynamic criteria to construct exact percentages
  const tasks = [
    { id: 'account_created', label: 'Create Store Account', check: () => true, key: 'Account Created' },
    { id: 'profile_name', label: 'Define Brand Name & Bio', check: () => business?.name && business.name !== "My Business" && business.name !== "New Business", key: 'Customize Name' },
    { id: 'upload_logo', label: 'Upload Brand Logo', check: () => !!business?.logo, key: 'Upload Logo' },
    { id: 'whatsapp_number', label: 'Link WhatsApp Sales channel', check: () => !!business?.whatsappNumber, key: 'Add WhatsApp' },
    { id: 'store_slug', label: 'Claim memorized store URL address', check: () => business?.storeSlug && business.storeSlug !== "myshop" && business.storeSlug !== "shop", key: 'Custom Link' },
    { id: 'seo_details', label: 'Optimize search meta index (SEO)', check: () => !!business?.metaDescription && !!business.metaTitle, key: 'Set SEO details' },
    { id: 'add_product', label: 'Publish Your First Product', check: () => products?.length > 0, key: 'Add First Product' },
    { id: 'share_store', label: 'Share Store URL on Social media', check: () => localStorage.getItem('msf_shared_store') === 'true', key: 'Share Store' }
  ];

  const completedCount = tasks.filter(t => t.check()).length;
  const totalTasks = tasks.length;
  const progressPercent = Math.round((completedCount / totalTasks) * 100);

  // If 100% complete, disappear as required by requirements
  if (progressPercent === 100) return null;

  const handleCopyLink = () => {
    localStorage.setItem('msf_shared_store', 'true');
    const slug = (business?.storeSlug || "yourstore").toLowerCase().trim();
    const subdomain = `${slug}.mysellflow.store`;
    navigator.clipboard.writeText(subdomain).then(() => {
      setCopied(true);
      showToast("Store link copied. Milestone reached!", "success");
      setTimeout(() => setCopied(false), 2000);
    });
  };

  const handleWhatsAppShare = () => {
    localStorage.setItem('msf_shared_store', 'true');
    const slug = (business?.storeSlug || "yourstore").toLowerCase().trim();
    const subdomain = `${slug}.mysellflow.store`;
    const shareText = `Explore my store "${business.name}" directly on WhatsApp! Check out our automatic inventory catalog here: ${subdomain}`;
    window.open(`https://api.whatsapp.com/send?text=${encodeURIComponent(shareText)}`, '_blank');
    showToast("Opening WhatsApp status creator!", "success");
  };

  return (
    <div className="bg-slate-900 border border-slate-800 rounded-2xl p-5 md:p-6 shadow-lg relative overflow-hidden transition-all hover:border-slate-700">
      {/* Decorative vector shape background */}
      <div className="absolute top-0 right-0 w-32 h-32 bg-purple-600/5 rounded-full pointer-events-none blur-xl" />
      
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4 mb-5">
        <div>
          <div className="flex items-center gap-2">
            <Sparkles className="text-yellow-400" size={16} />
            <h3 className="text-sm font-black text-white uppercase tracking-widest">
              MyStore launch checklist
            </h3>
          </div>
          <p className="text-xs text-slate-400 mt-1">Complete your profile to unlock public storefront checkouts.</p>
        </div>

        <div className="flex items-center gap-3">
          <div className="text-right shrink-0">
            <span className="text-xs font-black text-white block">{progressPercent}% Completed</span>
            <span className="text-[10px] font-black uppercase text-emerald-400 block tracking-widest">{completedCount} of {totalTasks} finished</span>
          </div>
          
          <button
            type="button"
            onClick={onOpenWizard}
            className="bg-indigo-600 hover:bg-indigo-700 text-white text-[10px] font-black uppercase tracking-widest px-4.5 py-2.5 rounded-xl transition-all shadow-md active:scale-95 cursor-pointer"
          >
            Launch Setup Wizard
          </button>
        </div>
      </div>

      {/* Progress Line */}
      <div className="h-2 bg-slate-800 w-full rounded-full overflow-hidden mb-5">
        <div 
          className="h-full bg-gradient-to-r from-[#5B2FD4] to-[#10B981] transition-all duration-350"
          style={{ width: `${progressPercent}%` }}
        />
      </div>

      {/* Interactive Grid List of tasks */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-3.5">
        {tasks.map((task, i) => {
          const isDone = task.check();
          return (
            <div 
              key={i}
              className={`p-3.5 rounded-xl border flex items-start gap-3 transition-colors ${
                isDone 
                  ? 'bg-slate-950/20 border-emerald-500/10 text-slate-400' 
                  : 'bg-slate-950/50 border-slate-800 hover:border-slate-700 text-slate-300'
              }`}
            >
              <div className="mt-0.5 shrink-0">
                {isDone ? (
                  <CheckCircle2 size={16} className="text-emerald-400 fill-emerald-500/10" />
                ) : (
                  <div className="w-4 h-4 rounded-full border-2 border-slate-600 flex items-center justify-center font-mono text-[8px] font-bold">
                    {i + 1}
                  </div>
                )}
              </div>
              <div className="min-w-0">
                <span className={`text-[11px] font-bold block leading-snug truncate ${isDone ? 'line-through text-slate-500' : 'text-slate-200'}`}>
                  {task.key}
                </span>
                <span className="text-[10px] text-slate-400 font-medium block truncate mt-0.5">
                  {task.label}
                </span>

                {/* Micro CTA links for high conversion setup acceleration */}
                {!isDone && (
                  <div className="mt-2.5 flex gap-2">
                    {task.id === 'share_store' ? (
                      <>
                        <button 
                          onClick={handleWhatsAppShare}
                          className="text-[9px] font-black uppercase text-emerald-400 hover:underline flex items-center gap-1 cursor-pointer"
                        >
                          Share Status
                        </button>
                        <button 
                          onClick={handleCopyLink}
                          className="text-[9px] font-black uppercase text-indigo-400 hover:underline flex items-center gap-1 cursor-pointer"
                        >
                          {copied ? 'Copied' : 'Copy URL'}
                        </button>
                      </>
                    ) : (
                      <button 
                        onClick={onOpenWizard}
                        className="text-[9px] font-black uppercase text-[#5B2FD4] hover:underline flex items-center gap-1 cursor-pointer"
                      >
                        Set up now <ArrowRight size={8} />
                      </button>
                    )}
                  </div>
                )}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
};
