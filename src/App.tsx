/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useEffect, useMemo, ReactNode } from 'react';
import { 
  LayoutDashboard, 
  ShoppingBag, 
  Users, 
  Clock, 
  Settings, 
  Plus, 
  Search, 
  ChevronRight, 
  Package, 
  MessageSquare, 
  ArrowUpRight, 
  ArrowDownRight,
  TrendingUp,
  TrendingDown,
  DollarSign,
  Store,
  ExternalLink,
  MoreVertical,
  Filter,
  CheckCircle2,
  AlertCircle,
  Star,
  LogOut,
  Trash2,
  Heart,
  ShoppingCart,
  Copy,
  Share2,
  Lock,
  Mail,
  RefreshCw,
  Eye,
  EyeOff,
  ShieldAlert,
  UploadCloud,
  ArrowLeft,
  Edit2,
  Check,
  X
} from 'lucide-react';
import { motion, AnimatePresence, animate } from 'framer-motion';
import LandingPage from './components/LandingPage';
import ExplorePage from './components/ExplorePage';
import { OnboardingFlow, SetupChecklistCard } from './components/OnboardingFlow';
import AdminPanel from './components/AdminPanel';
import { 
  BarChart, 
  Bar, 
  XAxis, 
  YAxis, 
  CartesianGrid, 
  Tooltip, 
  ResponsiveContainer,
  AreaChart,
  Area,
  LineChart,
  Line
} from 'recharts';
import { cn, formatCurrency, compressImage } from './lib/utils';
import { Product, Lead, Order, FollowUp, BusinessProfile, Review, LeadStatus, OrderStatus, ProductType, InventoryStatus } from './types';
import { sendWhatsAppMessage } from './services/whatsappService';
import { db, auth, OperationType, handleFirestoreError } from './firebase';
import { 
  onAuthStateChanged, 
  signInWithPopup, 
  GoogleAuthProvider, 
  signOut,
  User,
  createUserWithEmailAndPassword,
  signInWithEmailAndPassword,
  sendEmailVerification,
  sendPasswordResetEmail,
  setPersistence,
  browserLocalPersistence
} from 'firebase/auth';
import { 
  collection, 
  doc, 
  onSnapshot, 
  setDoc, 
  addDoc, 
  updateDoc, 
  query, 
  where,
  orderBy,
  deleteDoc,
  serverTimestamp,
  getDoc,
  getDocs,
  increment,
  deleteField
} from 'firebase/firestore';

// --- INITIAL MOCK DATA ---
const INITIAL_BUSINESS: BusinessProfile = {
  name: "My Business",
  description: "Welcome to our store. We are glad to have you here.",
  currency: "NGN",
  whatsappNumber: "",
  storeSlug: "myshop",
  isVerified: false,
  whatsappToken: "",
  whatsappPhoneId: "",
  whatsappBusinessAccountId: "",
  ownerId: "",
  metaTitle: "",
  metaDescription: "",
  storefrontUrl: "",
  subdomain: "",
  views: 0,
  clicksMessageMerchant: 0,
  clicksWhatsAppOrder: 0
};

const INITIAL_PRODUCTS: Product[] = [];
const INITIAL_LEADS: Lead[] = [];
const INITIAL_ORDERS: Order[] = [];
const INITIAL_REVIEWS: Review[] = [];

// --- FIREBASE ERROR HANDLING ---
// (Exposed and imported from ./firebase to avoid duplication)

// --- COMPONENTS ---

interface ToastItem {
  id: string;
  message: string;
  type: 'success' | 'error' | 'info';
}

const ToastContainer = ({ toasts, onClose }: { toasts: ToastItem[], onClose: (id: string) => void }) => {
  return (
    <div className="fixed bottom-4 right-4 z-[9999] flex flex-col gap-2 pointer-events-none max-w-sm w-full">
      <AnimatePresence>
        {toasts.map(toast => (
          <motion.div
            key={toast.id}
            initial={{ opacity: 0, y: 50, scale: 0.9 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, scale: 0.8, transition: { duration: 0.15 } }}
            className="pointer-events-auto"
          >
            <div className={cn(
              "p-4 rounded-xl shadow-xl flex items-center gap-3 border backdrop-blur-md",
              toast.type === 'success' && "bg-slate-900/95 text-white border-emerald-500/30",
              toast.type === 'error' && "bg-red-950/95 text-red-200 border-red-500/10",
              toast.type === 'info' && "bg-slate-900/95 text-white border-sky-500/20"
            )}>
              <div className="shrink-0">
                {toast.type === 'success' && <CheckCircle2 className="text-emerald-400" size={18} />}
                {toast.type === 'error' && <AlertCircle className="text-red-400" size={18} />}
                {toast.type === 'info' && <TrendingUp className="text-sky-400" size={18} />}
              </div>
              <p className="text-xs font-semibold leading-relaxed flex-1">{toast.message}</p>
              <button 
                onClick={() => onClose(toast.id)}
                className="text-slate-400 hover:text-white shrink-0 p-1 rounded-md hover:bg-white/10"
              >
                <Plus className="rotate-45" size={14} />
              </button>
            </div>
          </motion.div>
        ))}
      </AnimatePresence>
    </div>
  );
};

const Card = ({ children, className }: { children: ReactNode, className?: string }) => (
  <div className={cn("bg-white border border-slate-200 rounded-xl overflow-hidden shadow-sm", className)}>
    {children}
  </div>
);

const Badge = ({ children, variant = 'default' }: { children: ReactNode, variant?: 'default' | 'success' | 'warning' | 'error' | 'info' }) => {
  const variants = {
    default: 'bg-slate-100 text-slate-700',
    success: 'bg-[#DCFCE7] text-[#22C55E] font-bold border border-[#22C55E]/15',
    warning: 'bg-[#FFF7ED] text-[#F97316] font-bold border border-[#F97316]/15',
    error: 'bg-rose-50 text-rose-700 font-bold border border-rose-200/40',
    info: 'bg-[#EDE8FB] text-[#5B2FD4] font-bold border border-[#5B2FD4]/15'
  };
  return (
    <span className={cn("px-2 py-0.5 rounded-full text-xs font-medium uppercase tracking-wider", variants[variant])}>
      {children}
    </span>
  );
};

const ProductModal = ({ isOpen, onClose, onSave, product }: { isOpen: boolean, onClose: () => void, onSave: (product: any) => void, product?: Product | null }) => {
  const [name, setName] = React.useState('');
  const [price, setPrice] = React.useState('');
  const [originalPrice, setOriginalPrice] = React.useState('');
  const [description, setDescription] = React.useState('');
  const [type, setType] = React.useState<ProductType>('physical');
  const [images, setImages] = React.useState<string[]>([]);
  const [isBestSeller, setIsBestSeller] = React.useState(false);
  const [isNewArrival, setIsNewArrival] = React.useState(false);
  const [isPromotion, setIsPromotion] = React.useState(false);
  const [inventoryStatus, setInventoryStatus] = React.useState<InventoryStatus>('in_stock');
  const fileInputRef = React.useRef<HTMLInputElement>(null);

  React.useEffect(() => {
    if (product) {
      setName(product.name);
      setPrice(product.price.toString());
      setOriginalPrice(product.originalPrice?.toString() || '');
      setDescription(product.description);
      setType(product.type);
      setImages(product.images || []);
      setIsBestSeller(product.isBestSeller || false);
      setIsNewArrival(product.isNewArrival || false);
      setIsPromotion(product.isPromotion || false);
      setInventoryStatus(product.inventoryStatus || 'in_stock');
    } else {
      setName('');
      setPrice('');
      setOriginalPrice('');
      setDescription('');
      setType('physical');
      setImages([]);
      setIsBestSeller(false);
      setIsNewArrival(false);
      setIsPromotion(false);
      setInventoryStatus('in_stock');
    }
  }, [product, isOpen]);

  if (!isOpen) return null;

  const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (files) {
      const fileArray = Array.from(files) as File[];
      for (const file of fileArray) {
        try {
          const compressed = await compressImage(file, 600, 0.7);
          setImages(prev => [...prev, compressed].slice(0, 4));
        } catch (err) {
          console.error("Error compressing file:", err);
          const reader = new FileReader();
          reader.onloadend = () => {
            setImages(prev => [...prev, reader.result as string].slice(0, 4));
          };
          reader.readAsDataURL(file);
        }
      }
    }
  };

  const removeImage = (index: number) => {
    setImages(prev => prev.filter((_, i) => i !== index));
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (name && price && description) {
      onSave({
        ...product,
        name,
        price: Number(price),
        originalPrice: originalPrice ? Number(originalPrice) : undefined,
        description,
        type,
        images: images.length > 0 ? images : ['https://picsum.photos/seed/product/800/800'],
        isActive: true,
        isBestSeller,
        isNewArrival,
        isPromotion,
        inventoryStatus
      });
      onClose();
    }
  };

  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-sm">
      <motion.div 
        initial={{ opacity: 0, scale: 0.95 }}
        animate={{ opacity: 1, scale: 1 }}
        className="bg-white rounded-2xl shadow-2xl w-full max-w-lg overflow-hidden flex flex-col max-h-[90vh]"
      >
        <div className="p-6 border-b border-slate-100 flex justify-between items-center bg-slate-50">
          <h3 className="font-black text-slate-900 uppercase tracking-tighter italic">
            {product ? 'Edit Product' : 'Create New Product'}
          </h3>
          <button onClick={onClose} className="p-2 hover:bg-slate-200 rounded-lg text-slate-400">
            <Plus className="rotate-45" size={20} />
          </button>
        </div>
        <form onSubmit={handleSubmit} className="p-6 space-y-4 overflow-y-auto no-scrollbar">
          <div className="space-y-3">
            <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest pl-1">Product Images (Up to 4)</label>
            <div className="grid grid-cols-4 gap-2">
              {images.map((img, index) => (
                <div key={index} className="relative aspect-square rounded-xl overflow-hidden border border-slate-200 group">
                  <img src={img} className="w-full h-full object-cover" alt={`Preview ${index}`} referrerPolicy="no-referrer" />
                  <button 
                    type="button"
                    onClick={() => removeImage(index)}
                    className="absolute top-1 right-1 w-6 h-6 bg-rose-500 text-white rounded-full flex items-center justify-center scale-0 group-hover:scale-100 transition-transform"
                  >
                    <Plus className="rotate-45" size={14} />
                  </button>
                </div>
              ))}
              {images.length < 4 && (
                <button 
                  type="button"
                  onClick={() => fileInputRef.current?.click()}
                  className="aspect-square rounded-xl border-2 border-dashed border-slate-200 flex flex-col items-center justify-center text-slate-400 hover:border-sky-500 hover:text-sky-500 transition-all bg-slate-50/50"
                >
                  <Plus size={20} />
                  <span className="text-[10px] font-bold uppercase tracking-widest mt-1">Add</span>
                </button>
              )}
              <input 
                type="file" 
                ref={fileInputRef} 
                onChange={handleFileChange} 
                multiple 
                accept="image/*" 
                className="hidden" 
              />
            </div>
          </div>

          <div className="space-y-1.5">
            <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest pl-1">Product Name</label>
            <input 
              autoFocus
              type="text" 
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="e.g. Designer Ankara Fabric"
              className="w-full bg-slate-50 border border-slate-200 rounded-xl px-4 py-3 text-sm focus:outline-none focus:ring-2 focus:ring-sky-500/20 focus:border-sky-500 transition-all font-bold"
              required
            />
          </div>
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-1.5">
                <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest pl-1">Selling Price</label>
                <input 
                  type="number" 
                  value={price}
                  onChange={(e) => setPrice(e.target.value)}
                  placeholder="25000"
                  className="w-full bg-slate-50 border border-slate-200 rounded-xl px-4 py-3 text-sm focus:outline-none focus:ring-2 focus:ring-sky-500/20 focus:border-sky-500 transition-all font-mono"
                  required
                />
              </div>
              <div className="space-y-1.5">
                <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest pl-1">Original Price (Optional)</label>
                <input 
                  type="number" 
                  value={originalPrice}
                  onChange={(e) => setOriginalPrice(e.target.value)}
                  placeholder="30000"
                  className="w-full bg-slate-50 border border-slate-200 rounded-xl px-4 py-3 text-sm focus:outline-none focus:ring-2 focus:ring-sky-500/20 focus:border-sky-500 transition-all font-mono"
                />
              </div>
            </div>
            
            <div className="space-y-1.5">
              <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest pl-1">Product Type</label>
              <select 
                value={type}
                onChange={(e) => setType(e.target.value as ProductType)}
                className="w-full bg-slate-50 border border-slate-200 rounded-xl px-4 py-3 text-sm focus:outline-none focus:ring-2 focus:ring-sky-500/20 focus:border-sky-500 transition-all"
              >
                <option value="physical">Physical Product</option>
                <option value="digital">Digital Product</option>
                <option value="service">Service</option>
              </select>
            </div>

            <div className="space-y-1.5">
              <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest pl-1">Inventory Status</label>
              <div className="grid grid-cols-3 gap-2">
                <button
                  type="button"
                  onClick={() => setInventoryStatus('in_stock')}
                  className={cn(
                    "py-2.5 px-3 rounded-xl border font-bold text-xs flex flex-col items-center justify-center gap-1 transition-all",
                    inventoryStatus === 'in_stock'
                      ? "border-emerald-500 bg-emerald-50/50 text-emerald-700 shadow-sm"
                      : "border-slate-200 bg-white text-slate-600 hover:bg-slate-50"
                  )}
                >
                  <span className="w-2 h-2 rounded-full bg-emerald-500"></span>
                  <span>In Stock</span>
                </button>
                <button
                  type="button"
                  onClick={() => setInventoryStatus('low_stock')}
                  className={cn(
                    "py-2.5 px-3 rounded-xl border font-bold text-xs flex flex-col items-center justify-center gap-1 transition-all",
                    inventoryStatus === 'low_stock'
                      ? "border-amber-500 bg-amber-50/50 text-amber-700 shadow-sm"
                      : "border-slate-200 bg-white text-slate-600 hover:bg-slate-50"
                  )}
                >
                  <span className="w-2 h-2 rounded-full bg-amber-500 animate-pulse"></span>
                  <span>Low Stock</span>
                </button>
                <button
                  type="button"
                  onClick={() => setInventoryStatus('out_of_stock')}
                  className={cn(
                    "py-2.5 px-3 rounded-xl border font-bold text-xs flex flex-col items-center justify-center gap-1 transition-all",
                    inventoryStatus === 'out_of_stock'
                      ? "border-rose-500 bg-rose-50/50 text-rose-700 shadow-sm"
                      : "border-slate-200 bg-white text-slate-600 hover:bg-slate-50"
                  )}
                >
                  <span className="w-2 h-2 rounded-full bg-rose-500"></span>
                  <span>Out of Stock</span>
                </button>
              </div>
            </div>

          <div className="space-y-1.5">
            <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest pl-1">Description</label>
            <textarea 
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              rows={3}
              placeholder="Tell your customers what makes this product special..."
              className="w-full bg-slate-50 border border-slate-200 rounded-xl px-4 py-3 text-sm focus:outline-none focus:ring-2 focus:ring-sky-500/20 focus:border-sky-500 transition-all resize-none"
              required
            />
          </div>

          <div className="space-y-2 border-t border-slate-100 pt-3">
            <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest pl-1">Pin Product Groupings</label>
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-2">
              <label className={cn(
                "flex items-center gap-2.5 p-3 rounded-xl border border-slate-200 cursor-pointer transition-all select-none hover:bg-slate-50/50",
                isBestSeller && "border-amber-500 bg-amber-50/20"
              )}>
                <input 
                  type="checkbox" 
                  checked={isBestSeller} 
                  onChange={(e) => setIsBestSeller(e.target.checked)}
                  className="rounded text-amber-500 focus:ring-amber-500 h-4 w-4 border-slate-300"
                />
                <div className="flex flex-col min-w-0">
                  <span className="text-xs font-black text-slate-800 leading-none">Best Seller</span>
                  <span className="text-[8px] text-slate-400 font-bold uppercase tracking-wider mt-0.5">Hot Tag</span>
                </div>
              </label>

              <label className={cn(
                "flex items-center gap-2.5 p-3 rounded-xl border border-slate-200 cursor-pointer transition-all select-none hover:bg-slate-50/50",
                isNewArrival && "border-sky-500 bg-sky-50/20"
              )}>
                <input 
                  type="checkbox" 
                  checked={isNewArrival} 
                  onChange={(e) => setIsNewArrival(e.target.checked)}
                  className="rounded text-sky-500 focus:ring-sky-500 h-4 w-4 border-slate-300"
                />
                <div className="flex flex-col min-w-0">
                  <span className="text-xs font-black text-slate-800 leading-none">New Arrival</span>
                  <span className="text-[8px] text-slate-400 font-bold uppercase tracking-wider mt-0.5">Fresh</span>
                </div>
              </label>

              <label className={cn(
                "flex items-center gap-2.5 p-3 rounded-xl border border-slate-200 cursor-pointer transition-all select-none hover:bg-slate-50/50",
                isPromotion && "border-rose-500 bg-rose-50/20"
              )}>
                <input 
                  type="checkbox" 
                  checked={isPromotion} 
                  onChange={(e) => setIsPromotion(e.target.checked)}
                  className="rounded text-rose-500 focus:ring-rose-500 h-4 w-4 border-slate-300"
                />
                <div className="flex flex-col min-w-0">
                  <span className="text-xs font-black text-slate-800 leading-none">Promotion</span>
                  <span className="text-[8px] text-slate-400 font-bold uppercase tracking-wider mt-0.5">Sale</span>
                </div>
              </label>
            </div>
          </div>

          <div className="pt-2">
            <button 
              type="submit"
              className="w-full bg-slate-900 text-white py-4 rounded-xl font-bold uppercase tracking-widest text-xs shadow-xl shadow-slate-900/10 hover:bg-slate-800 transition-all flex items-center justify-center gap-2"
            >
              <ShoppingBag size={14} /> {product ? 'Update Product' : 'Publish to Storefront'}
            </button>
          </div>
        </form>
      </motion.div>
    </div>
  );
};

const QuickLeadModal = ({ isOpen, onClose, onAdd, products }: { isOpen: boolean, onClose: () => void, onAdd: (name: string, phone: string, interest: string, amount: number) => void, products: Product[] }) => {
  const [name, setName] = React.useState('');
  const [phone, setPhone] = React.useState('');
  const [selectedProdId, setSelectedProdId] = React.useState('custom');
  const [interest, setInterest] = React.useState('General Inquiry');
  const [amount, setAmount] = React.useState<number | string>('');

  if (!isOpen) return null;

  const handleProductChange = (prodId: string) => {
    setSelectedProdId(prodId);
    if (prodId === 'custom') {
      setInterest('General Inquiry');
      setAmount('');
    } else {
      const prod = products.find(p => p.id === prodId);
      if (prod) {
        setInterest(prod.name);
        setAmount(prod.price);
      }
    }
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (name && phone) {
      onAdd(name, phone, interest || 'General Inquiry', Number(amount) || 0);
      setName('');
      setPhone('');
      setSelectedProdId('custom');
      setInterest('General Inquiry');
      setAmount('');
      onClose();
    }
  };

  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-sm">
      <motion.div 
        initial={{ opacity: 0, scale: 0.95 }}
        animate={{ opacity: 1, scale: 1 }}
        className="bg-white rounded-2xl shadow-2xl w-full max-w-md overflow-hidden"
      >
        <div className="p-6 border-b border-slate-100 flex justify-between items-center bg-slate-50">
          <h3 className="font-black text-slate-900 uppercase tracking-tighter italic">Quick Add Lead</h3>
          <button onClick={onClose} className="p-2 hover:bg-slate-200 rounded-lg text-slate-400">
            <Plus className="rotate-45" size={20} />
          </button>
        </div>
        <form onSubmit={handleSubmit} className="p-6 space-y-4 max-h-[80vh] overflow-y-auto">
          <div className="space-y-1.5">
            <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest pl-1">Customer Name</label>
            <input 
              autoFocus
              type="text" 
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="e.g. John Doe"
              className="w-full bg-slate-50 border border-slate-200 rounded-xl px-4 py-3 text-sm focus:outline-none focus:ring-2 focus:ring-sky-500/20 focus:border-sky-500 transition-all"
              required
            />
          </div>
          <div className="space-y-1.5">
            <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest pl-1">WhatsApp Number</label>
            <input 
              type="tel" 
              value={phone}
              onChange={(e) => setPhone(e.target.value)}
              placeholder="e.g. 08012345678"
              className="w-full bg-slate-50 border border-slate-200 rounded-xl px-4 py-3 text-sm focus:outline-none focus:ring-2 focus:ring-sky-500/20 focus:border-sky-500 transition-all font-mono"
              required
            />
          </div>

          <div className="space-y-1.5">
            <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest pl-1">Link to Storefront Product</label>
            <select
              value={selectedProdId}
              onChange={(e) => handleProductChange(e.target.value)}
              className="w-full bg-slate-50 border border-slate-200 rounded-xl px-4 py-3 text-sm focus:outline-none focus:ring-2 focus:ring-sky-500/20 focus:border-sky-500 transition-all"
            >
              <option value="custom">Custom Inquiry / Other</option>
              {products.map(p => (
                <option key={p.id} value={p.id}>{p.name}</option>
              ))}
            </select>
          </div>

          <div className="space-y-1.5">
            <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest pl-1">Interest Item/Service</label>
            <input 
              type="text" 
              value={interest}
              onChange={(e) => setInterest(e.target.value)}
              placeholder="e.g. Red Designer Heels"
              className="w-full bg-slate-50 border border-slate-200 rounded-xl px-4 py-3 text-sm focus:outline-none focus:ring-2 focus:ring-sky-500/20 focus:border-sky-500 transition-all"
              required
            />
          </div>

          <div className="space-y-1.5">
            <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest pl-1">Lead Deal Value (Price)</label>
            <input 
              type="number" 
              value={amount}
              onChange={(e) => setAmount(e.target.value === '' ? '' : Number(e.target.value))}
              placeholder="e.g. 15000"
              className="w-full bg-slate-50 border border-slate-200 rounded-xl px-4 py-3 text-sm focus:outline-none focus:ring-2 focus:ring-sky-500/20 focus:border-sky-500 transition-all font-mono"
            />
          </div>

          <p className="text-[10px] text-slate-400 italic serif leading-tight">
            * This lead will be added with status "New". You can update status and details in the list.
          </p>
          <div className="pt-2">
            <button 
              type="submit"
              className="w-full bg-slate-900 text-white py-4 rounded-xl font-bold uppercase tracking-widest text-xs shadow-xl shadow-slate-900/10 hover:bg-slate-800 transition-all"
            >
              Add Lead Now
            </button>
          </div>
        </form>
      </motion.div>
    </div>
  );
};

const ImportLeadsModal = ({ isOpen, onClose, onImport, showToast }: { isOpen: boolean, onClose: () => void, onImport: (leads: {name: string, phone: string}[]) => void, showToast?: (m: string, t?: 'success' | 'error' | 'info') => void }) => {
  const [dragActive, setDragActive] = useState(false);
  const fileInputRef = React.useRef<HTMLInputElement>(null);

  if (!isOpen) return null;

  const handleDrag = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    if (e.type === "dragenter" || e.type === "dragover") {
      setDragActive(true);
    } else if (e.type === "dragleave") {
      setDragActive(false);
    }
  };

  const processFile = async (file: File) => {
    if (file && file.name.endsWith('.csv')) {
      const text = await file.text();
      const rows = text.split('\n').filter(row => row.trim().length > 0);
      const parsedLeads = [];
      let startIndex = 0;
      if (rows[0].toLowerCase().includes('name')) {
        startIndex = 1;
      }
      for (let i = startIndex; i < rows.length; i++) {
        // Handle basic CSV parsing, split by comma, remove quotes if any
        const columns = rows[i].split(',').map(col => col.trim().replace(/^"|"$/g, ''));
        if (columns.length >= 2) {
          parsedLeads.push({
            name: columns[0],
            phone: columns[1]
          });
        }
      }
      if (parsedLeads.length > 0) {
        onImport(parsedLeads);
        onClose();
      } else {
        if (showToast) showToast("No valid leads found in CSV.", "error");
        else alert("No valid leads found in CSV.");
      }
    } else {
      if (showToast) showToast("Please select a valid CSV file.", "error");
      else alert("Please select a valid CSV file.");
    }
  }

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setDragActive(false);
    if (e.dataTransfer.files && e.dataTransfer.files[0]) {
      processFile(e.dataTransfer.files[0]);
    }
  };

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    e.preventDefault();
    if (e.target.files && e.target.files[0]) {
      processFile(e.target.files[0]);
    }
  };

  const downloadTemplate = () => {
    const csvContent = "Name,Phone\nJohn Doe,08012345678\nJane Smith,+2349012345678";
    const encodedUri = "data:text/csv;charset=utf-8," + encodeURIComponent(csvContent);
    const link = document.createElement("a");
    link.setAttribute("href", encodedUri);
    link.setAttribute("download", "whatsapp_leads_template.csv");
    document.body.appendChild(link);
    link.click();
    link.remove();
  };

  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-sm">
      <motion.div 
        initial={{ opacity: 0, scale: 0.95 }}
        animate={{ opacity: 1, scale: 1 }}
        className="bg-white rounded-2xl shadow-2xl w-full max-w-md overflow-hidden relative"
      >
        <div className="p-6 border-b border-slate-100 flex justify-between items-center bg-slate-50">
          <h3 className="font-black text-slate-900 uppercase tracking-tighter italic">Import WhatsApp Leads</h3>
          <button onClick={onClose} className="p-2 hover:bg-slate-200 rounded-lg text-slate-400">
            <Plus className="rotate-45" size={20} />
          </button>
        </div>
        <div className="p-6 space-y-6">
          <p className="text-sm text-slate-500 leading-relaxed">
            Upload a CSV file containing your WhatsApp contacts. We expect two columns: <strong>Name</strong> and <strong>Phone</strong>.
          </p>

          <button onClick={downloadTemplate} className="text-xs font-bold text-sky-600 hover:text-sky-700 transition-colors uppercase tracking-widest text-center w-full bg-sky-50 py-3 rounded-xl border border-sky-100">
            Download Template CSV
          </button>

          <div
            onDragEnter={handleDrag}
            onDragLeave={handleDrag}
            onDragOver={handleDrag}
            onDrop={handleDrop}
            onClick={() => fileInputRef.current?.click()}
            className={cn(
               "border-2 border-dashed rounded-2xl p-10 flex flex-col items-center justify-center cursor-pointer transition-all",
               dragActive ? "border-sky-500 bg-sky-50 scale-95" : "border-slate-200 hover:bg-slate-50"
            )}
          >
            <input
              ref={fileInputRef}
              type="file"
              accept=".csv"
              className="hidden"
              onChange={handleChange}
            />
            <div className="w-16 h-16 rounded-full bg-slate-100 flex items-center justify-center mb-4">
              <MessageSquare size={24} className={dragActive ? "text-sky-500" : "text-slate-400"} />
            </div>
            <p className="text-sm font-bold text-slate-900">Drag & drop your CSV here</p>
            <p className="text-xs text-slate-500 mt-1">or click to browse files</p>
          </div>
        </div>
      </motion.div>
    </div>
  );
};

const ConfirmModal = ({ isOpen, onClose, onConfirm, title, message, confirmText = "Confirm" }: { isOpen: boolean, onClose: () => void, onConfirm: () => void, title: string, message: string, confirmText?: string }) => {
  if (!isOpen) return null;
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/50 backdrop-blur-sm">
      <motion.div
        initial={{ opacity: 0, scale: 0.95 }}
        animate={{ opacity: 1, scale: 1 }}
        exit={{ opacity: 0, scale: 0.95 }}
        className="bg-white rounded-2xl shadow-xl w-full max-w-sm overflow-hidden flex flex-col"
      >
        <div className="p-6 pb-4">
          <h3 className="font-bold text-lg text-slate-900 leading-tight">{title}</h3>
          <p className="text-slate-500 text-sm mt-2">{message}</p>
        </div>
        <div className="p-4 bg-slate-50 border-t border-slate-100 flex gap-2 justify-end">
          <button onClick={onClose} className="px-4 py-2 rounded-lg text-sm font-medium text-slate-600 hover:bg-slate-200 transition-colors">Cancel</button>
          <button onClick={() => { onConfirm(); onClose(); }} className="px-4 py-2 rounded-lg text-sm font-medium bg-red-600 text-white hover:bg-red-700 transition-colors">{confirmText}</button>
        </div>
      </motion.div>
    </div>
  );
};

// --- UI COMPONENTS ---

const Sidebar = ({ activePage, setActivePage, lowStockCount = 0, unseenReviewsCount = 0 }: { activePage: string, setActivePage: (p: string) => void, lowStockCount?: number, unseenReviewsCount?: number }) => {
  const menuItems = [
    { id: 'dashboard', label: 'Summary', icon: LayoutDashboard },
    { id: 'products', label: 'Products', icon: ShoppingBag },
    { id: 'leads', label: 'Leads', icon: Users },
    { id: 'followups', label: 'Follow-ups', icon: Clock },
    { id: 'orders', label: 'Orders', icon: Package },
    { id: 'reviews', label: 'Reviews', icon: Star },
    { id: 'storefront', label: 'Storefront', icon: Store },
    { id: 'settings', label: 'Settings', icon: Settings },
  ];

  return (
    <aside className="fixed left-0 top-0 h-screen w-64 bg-slate-900 text-slate-300 hidden lg:flex flex-col z-50 overflow-hidden">
      <div className="p-8">
        <div className="flex items-center gap-3 mb-8">
          <div className="w-10 h-10 bg-[#5B2FD4] rounded-xl flex items-center justify-center text-white shadow-lg shadow-[#5B2FD4]/20">
            <TrendingUp size={24} />
          </div>
          <div>
            <h1 className="text-xl font-black text-white tracking-tighter italic uppercase leading-none">mysellflow</h1>
            <p className="text-[10px] font-black text-[#5B2FD4] uppercase tracking-widest mt-1">Growth Hub</p>
          </div>
        </div>

        <nav className="space-y-1">
          {menuItems.map((item) => (
            <button
              key={item.id}
              onClick={() => setActivePage(item.id)}
              className={cn(
                "w-full flex items-center justify-between px-4 py-3 rounded-xl transition-all duration-200 group relative",
                activePage === item.id 
                  ? "bg-[#5B2FD4] text-white font-bold shadow-lg shadow-[#5B2FD4]/20" 
                  : "hover:bg-slate-800 hover:text-white"
              )}
            >
              <div className="flex items-center gap-3 min-w-0">
                <item.icon size={20} className={cn("transition-transform group-hover:scale-110 shrink-0", activePage === item.id ? "scale-110" : "opacity-50")} />
                <span className="text-sm tracking-tight truncate">{item.label}</span>
              </div>
              <div className="flex items-center gap-1.5 shrink-0">
                {item.id === 'products' && lowStockCount > 0 && (
                  <span className="bg-amber-500 text-slate-950 font-black text-[9px] px-1.5 py-0.5 rounded-full leading-none flex items-center justify-center min-w-[16px] h-4 tracking-normal animate-pulse shadow-sm">
                    {lowStockCount}
                  </span>
                )}
                {item.id === 'reviews' && unseenReviewsCount > 0 && (
                  <span className="bg-sky-500 text-white font-black text-[9px] px-1.5 py-0.5 rounded-full leading-none flex items-center justify-center min-w-[16px] h-4 tracking-normal animate-pulse shadow-sm shadow-sky-500/20">
                    {unseenReviewsCount}
                  </span>
                )}
                {activePage === item.id && (
                  <motion.div 
                    layoutId="activeTab"
                    className="w-1.5 h-1.5 rounded-full bg-white"
                  />
                )}
              </div>
            </button>
          ))}
        </nav>
      </div>

      <div className="mt-auto p-8 pt-0">
        <div className="bg-slate-800/50 rounded-2xl p-4 border border-slate-700/50">
          <p className="text-[10px] font-black text-slate-500 uppercase tracking-widest mb-2">Power Tip</p>
          <p className="text-xs text-slate-300 italic serif leading-relaxed">"Leads followed up within 5 mins convert 9x better."</p>
        </div>
      </div>
    </aside>
  );
};

const MobileNav = ({ activePage, setActivePage, lowStockCount = 0, unseenReviewsCount = 0 }: { activePage: string, setActivePage: (p: string) => void, lowStockCount?: number, unseenReviewsCount?: number }) => {
  const menuItems = [
    { id: 'dashboard', icon: LayoutDashboard, label: 'dashboard' },
    { id: 'products', icon: ShoppingBag, label: 'products' },
    { id: 'leads', icon: Users, label: 'leads' },
    { id: 'followups', icon: Clock, label: 'followups' },
    { id: 'reviews', icon: Star, label: 'reviews' },
    { id: 'storefront', icon: Store, label: 'storefront' },
  ];

  return (
    <nav className="fixed bottom-0 left-0 right-0 h-20 bg-white border-t border-slate-200 flex lg:hidden items-center justify-around z-50 px-2 pb-safe">
      {menuItems.map((item) => (
        <button
          key={item.id}
          onClick={() => setActivePage(item.id)}
          className={cn(
            "flex flex-col items-center justify-center p-2 rounded-xl transition-all active:scale-90 relative w-[4.5rem] h-[3.75rem]",
            activePage === item.id 
              ? "bg-[#5B2FD4] text-white shadow-lg shadow-[#5B2FD4]/20" 
              : "text-slate-500 hover:text-slate-800"
          )}
        >
          <item.icon size={18} strokeWidth={activePage === item.id ? 2.5 : 2} />
          <span className="text-[9px] font-bold tracking-wider lowercase mt-1 text-center scale-95 sm:scale-100">
            {item.label}
          </span>
          {item.id === 'products' && lowStockCount > 0 && (
            <span className="absolute top-1 right-2 bg-amber-500 text-slate-900 text-[8px] font-black w-4 h-4 rounded-full flex items-center justify-center border border-white leading-none shadow-sm animate-pulse">
              {lowStockCount}
            </span>
          )}
          {item.id === 'reviews' && unseenReviewsCount > 0 && (
            <span className="absolute top-1 right-2 bg-sky-500 text-white text-[8px] font-black w-4 h-4 rounded-full flex items-center justify-center border border-white leading-none shadow-sm animate-pulse">
              {unseenReviewsCount}
            </span>
          )}
        </button>
      ))}
    </nav>
  );
};

const UserProfile = ({ business, onClick }: { business: BusinessProfile, onClick: () => void }) => (
  <div className="fixed top-0 left-0 lg:left-64 right-0 h-16 bg-white/80 backdrop-blur-md border-b border-slate-100 z-40 px-4 md:px-8 flex items-center justify-between">
    <div className="flex items-center gap-3">
      <div className="lg:hidden w-8 h-8 bg-[#5B2FD4] rounded-lg flex items-center justify-center text-white">
        <TrendingUp size={18} />
      </div>
      <h2 className="text-sm font-black text-slate-900 uppercase tracking-tighter lg:hidden italic">mysellflow</h2>
    </div>
    <div className="flex items-center gap-6">
      <button 
        onClick={onClick}
        className="flex items-center gap-3 group text-right hover:bg-slate-50 p-1.5 rounded-2xl transition-all"
      >
        <div className="hidden sm:block">
          <div className="flex items-center justify-end gap-1 mb-0.5">
            <p className="text-xs font-black text-slate-900 uppercase tracking-tighter leading-none italic underline decoration-[#5B2FD4] group-hover:decoration-slate-900 transition-colors">{business.name || 'My Shop'}</p>
            {business.isVerified && <CheckCircle2 size={12} className="text-[#5B2FD4] fill-[#5B2FD4] text-white" />}
          </div>
          <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">{business.storeSlug || 'shop'}.mysellflow.store</p>
        </div>
        <div className="relative shrink-0">
          <div className="w-8 h-8 rounded-full bg-[#5B2FD4] border border-[#5B2FD4]/20 overflow-hidden flex items-center justify-center transition-all group-hover:ring-2 group-hover:ring-[#5B2FD4]/20 group-hover:scale-105">
            {business.logo ? (
              <img src={business.logo} alt={business.name} className="w-full h-full object-cover" referrerPolicy="no-referrer" />
            ) : (
              <span className="text-xs font-bold uppercase text-white">{(business.name || 'S')[0]}</span>
            )}
          </div>
          {business.isVerified && (
            <div className="absolute -right-1 -bottom-1 w-3.5 h-3.5 bg-[#5B2FD4] rounded-full border-2 border-white flex items-center justify-center text-white">
              <CheckCircle2 size={7} fill="currentColor" />
            </div>
          )}
        </div>
      </button>
    </div>
  </div>
);

// --- ANIMATED COUNTER ---
const AnimatedCounter = ({ value, currency }: { value: number; currency: string }) => {
  const nodeRef = React.useRef<HTMLSpanElement>(null);

  React.useEffect(() => {
    const node = nodeRef.current;
    if (!node) return;

    const controls = animate(0, value, {
      duration: 1.5,
      ease: [0.16, 1, 0.3, 1], // easeOutQuart
      onUpdate(v) {
        node.textContent = formatCurrency(Math.floor(v), currency);
      },
    });

    return () => controls.stop();
  }, [value, currency]);

  return <span ref={nodeRef}>{formatCurrency(value, currency)}</span>;
};

// --- PAGES ---

// --- SAFE DATE PARSER ---
const parseDate = (val: any): Date | null => {
  if (!val) return null;
  if (typeof val === 'string') {
    const d = new Date(val);
    return isNaN(d.getTime()) ? null : d;
  }
  if (typeof val.toDate === 'function') {
    return val.toDate();
  }
  if (typeof val.seconds === 'number') {
    return new Date(val.seconds * 1000);
  }
  const d = new Date(val);
  return isNaN(d.getTime()) ? null : d;
};

const Dashboard = ({ 
  business, 
  leads, 
  orders, 
  products, 
  reviews = [],
  onAiInsight, 
  onAddLead, 
  onAddProduct, 
  currency,
  onEditProduct,
  onViewProducts,
  onViewReviews,
  onViewLeads,
  onOpenWizard,
  showToast
}: { 
  business: BusinessProfile, 
  leads: Lead[], 
  orders: Order[], 
  products: Product[], 
  reviews?: Review[],
  onAiInsight: () => void, 
  onAddLead: () => void, 
  onAddProduct: () => void, 
  currency: string,
  onEditProduct?: (p: Product) => void,
  onViewProducts?: () => void,
  onViewReviews?: () => void,
  onViewLeads?: () => void,
  onOpenWizard: () => void,
  showToast: (msg: string, type: 'success' | 'error' | 'info') => void
}) => {
  const unreadReviews = (reviews || []).filter(r => !r.isRead);
  const totalRevenue = orders.reduce((sum, o) => sum + (o.paymentStatus === 'paid' ? o.amount : 0), 0);
  const views = business?.views || 0;
  const clicksMessageMerchant = business?.clicksMessageMerchant || 0;
  const clicksWhatsAppOrder = business?.clicksWhatsAppOrder || 0;
  
  // Compute conversion rate based on total custom storefront views, or fall back to leads if not viewed yet
  const conversionRate = views > 0 
    ? ((leads.filter(l => l.status === 'paid').length / views) * 100).toFixed(1)
    : (leads.length > 0 ? ((leads.filter(l => l.status === 'paid').length / leads.length) * 100).toFixed(1) : 0);

  const paidLeads = leads.filter(l => l.status === 'paid');
  const interestedLeads = leads.filter(l => l.status === 'interested');
  const newLeads = leads.filter(l => l.status === 'new');

  const getThisMonthSales = () => {
    const now = new Date();
    const currentYear = now.getFullYear();
    const currentMonth = now.getMonth();

    const paidOrdersSum = orders.filter(o => {
      if (o.paymentStatus !== 'paid' || !o.createdAt) return false;
      const d = parseDate(o.createdAt);
      if (!d) return false;
      return d.getFullYear() === currentYear && d.getMonth() === currentMonth;
    }).reduce((sum, o) => sum + (Number(o.amount) || 0), 0);

    const paidLeadsSum = leads.filter(l => {
      if (l.status !== 'paid') return false;
      const dateToUse = l.updatedAt || l.createdAt;
      if (!dateToUse) return false;
      const d = parseDate(dateToUse);
      if (!d) return false;
      return d.getFullYear() === currentYear && d.getMonth() === currentMonth;
    }).reduce((sum, lead) => {
      if (lead.amount !== undefined) {
        return sum + (Number(lead.amount) || 0);
      }
      try {
        const leadInterest = lead.interest || '';
        const matchedProduct = products.find(p => {
          const prodName = p.name || '';
          return prodName.toLowerCase() === leadInterest.toLowerCase() || 
                 leadInterest.toLowerCase().includes(prodName.toLowerCase()) ||
                 prodName.toLowerCase().includes(leadInterest.toLowerCase());
        });
        const saleAmount = matchedProduct ? Number(matchedProduct.price) || 0 : 100;
        return sum + saleAmount;
      } catch (e) {
        return sum + 100;
      }
    }, 0);

    return paidOrdersSum + paidLeadsSum;
  };

  const getAllTimeSales = () => {
    const paidOrdersSum = orders.filter(o => o.paymentStatus === 'paid')
      .reduce((sum, o) => sum + (Number(o.amount) || 0), 0);

    const paidLeadsSum = leads.filter(l => l.status === 'paid')
      .reduce((sum, lead) => {
        if (lead.amount !== undefined) {
          return sum + (Number(lead.amount) || 0);
        }
        try {
          const leadInterest = lead.interest || '';
          const matchedProduct = products.find(p => {
            const prodName = p.name || '';
            return prodName.toLowerCase() === leadInterest.toLowerCase() || 
                   leadInterest.toLowerCase().includes(prodName.toLowerCase()) ||
                   prodName.toLowerCase().includes(leadInterest.toLowerCase());
          });
          const saleAmount = matchedProduct ? Number(matchedProduct.price) || 0 : 100;
          return sum + saleAmount;
        } catch (e) {
          return sum + 100;
        }
      }, 0);

    return paidOrdersSum + paidLeadsSum;
  };

  const thisMonthSales = getThisMonthSales();
  const formattedThisMonthSales = formatCurrency(thisMonthSales, currency || 'NGN');

  const allTimeSales = getAllTimeSales();
  const formattedAllTimeSales = formatCurrency(allTimeSales, currency || 'NGN');

  const getDailyStats = () => {
    const days = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];
    const now = new Date();
    
    // Create an array for the last 7 calendar days
    const last7Days = Array.from({ length: 7 }, (_, i) => {
      const d = new Date();
      d.setDate(now.getDate() - (6 - i));
      return {
        dateStr: d.toDateString(),
        name: days[d.getDay()],
        sales: 0,
        leads: 0
      };
    });

    // Sum matching orders by date
    orders.forEach(order => {
      if (!order.createdAt) return;
      try {
        const orderDate = parseDate(order.createdAt);
        if (!orderDate) return;
        const orderDateStr = orderDate.toDateString();
        const match = last7Days.find(day => day.dateStr === orderDateStr);
        if (match) {
          if (order.paymentStatus === 'paid') {
            match.sales += Number(order.amount) || 0;
          }
        }
      } catch (e) {
        console.error("Error parsing order date:", e);
      }
    });

    // Populate leads count by date
    leads.forEach(lead => {
      // 1. Lead creation counts towards creation date
      if (lead.createdAt) {
        try {
          const leadCreatedDate = parseDate(lead.createdAt);
          if (leadCreatedDate) {
            const leadDateStr = leadCreatedDate.toDateString();
            const match = last7Days.find(day => day.dateStr === leadDateStr);
            if (match) {
              match.leads += 1;
            }
          }
        } catch (e) {
          console.error("Error parsing lead creation date:", e);
        }
      }

      // 2. Lead sales counts towards payment date (updatedAt or fallback to createdAt)
      if (lead.status === 'paid') {
        try {
          const dateToUse = lead.updatedAt || lead.createdAt;
          if (dateToUse) {
            const leadPaidDate = parseDate(dateToUse);
            if (leadPaidDate) {
              const leadPaidDateStr = leadPaidDate.toDateString();
              const match = last7Days.find(day => day.dateStr === leadPaidDateStr);
              if (match) {
                let saleAmount = 100;
                if (lead.amount !== undefined) {
                  saleAmount = Number(lead.amount) || 0;
                } else {
                  const leadInterest = lead.interest || '';
                  const matchedProduct = products.find(p => {
                    const prodName = p.name || '';
                    return prodName.toLowerCase() === leadInterest.toLowerCase() || 
                           leadInterest.toLowerCase().includes(prodName.toLowerCase()) ||
                           prodName.toLowerCase().includes(leadInterest.toLowerCase());
                  });
                  saleAmount = matchedProduct ? Number(matchedProduct.price) || 0 : 100;
                }
                match.sales += saleAmount;
              }
            }
          }
        } catch (e) {
          console.error("Error parsing lead payment date:", e);
        }
      }
    });

    return last7Days.map(({ name, sales, leads }) => ({
      name,
      sales,
      leads
    }));
  };

  const get30DaySalesStats = () => {
    const now = new Date();
    
    // Create an array for the last 30 calendar days
    const last30Days = Array.from({ length: 30 }, (_, i) => {
      const d = new Date();
      d.setDate(now.getDate() - (29 - i));
      return {
        dateStr: d.toDateString(),
        formattedDate: `${d.getDate()} ${d.toLocaleString('default', { month: 'short' })}`,
        sales: 0
      };
    });

    // Create an array for the previous 30 calendar days (day 31 to 60) for growth calculation
    const prev30Days = Array.from({ length: 30 }, (_, i) => {
      const d = new Date();
      d.setDate(now.getDate() - (59 - i));
      return {
        dateStr: d.toDateString(),
        sales: 0
      };
    });

    // Sum matching orders by date
    orders.forEach(order => {
      if (order.paymentStatus !== 'paid' || !order.createdAt) return;
      try {
        const orderDate = parseDate(order.createdAt);
        if (!orderDate) return;
        const orderDateStr = orderDate.toDateString();
        
        const matchLast = last30Days.find(day => day.dateStr === orderDateStr);
        if (matchLast) {
          matchLast.sales += Number(order.amount) || 0;
        } else {
          const matchPrev = prev30Days.find(day => day.dateStr === orderDateStr);
          if (matchPrev) {
            matchPrev.sales += Number(order.amount) || 0;
          }
        }
      } catch (e) {
        console.error("Error parsing order date for 30-day stats:", e);
      }
    });

    // Sum matching paid leads by date
    leads.forEach(lead => {
      if (lead.status !== 'paid') return;
      try {
        const dateToUse = lead.updatedAt || lead.createdAt;
        if (!dateToUse) return;
        const leadPaidDate = parseDate(dateToUse);
        if (!leadPaidDate) return;
        const leadPaidDateStr = leadPaidDate.toDateString();
        
        let saleAmount = 100;
        if (lead.amount !== undefined) {
          saleAmount = Number(lead.amount) || 0;
        } else {
          const leadInterest = lead.interest || '';
          const matchedProduct = products.find(p => {
            const prodName = p.name || '';
            return prodName.toLowerCase() === leadInterest.toLowerCase() || 
                   leadInterest.toLowerCase().includes(prodName.toLowerCase()) ||
                   prodName.toLowerCase().includes(leadInterest.toLowerCase());
          });
          saleAmount = matchedProduct ? Number(matchedProduct.price) || 0 : 100;
        }

        const matchLast = last30Days.find(day => day.dateStr === leadPaidDateStr);
        if (matchLast) {
          matchLast.sales += saleAmount;
        } else {
          const matchPrev = prev30Days.find(day => day.dateStr === leadPaidDateStr);
          if (matchPrev) {
            matchPrev.sales += saleAmount;
          }
        }
      } catch (e) {
        console.error("Error parsing lead date for 30-day stats:", e);
      }
    });

    const totalLast30 = last30Days.reduce((sum, d) => sum + d.sales, 0);
    const totalPrev30 = prev30Days.reduce((sum, d) => sum + d.sales, 0);

    let growthPercent = 0;
    if (totalPrev30 > 0) {
      growthPercent = Math.round(((totalLast30 - totalPrev30) / totalPrev30) * 100);
    } else if (totalLast30 > 0) {
      growthPercent = 100; // 100% growth from 0 baseline
    }

    return {
      chartData: last30Days.map(({ formattedDate, sales }) => ({
        date: formattedDate,
        sales
      })),
      growthPercent,
      totalLast30
    };
  };

  const chartData = getDailyStats();
  const { chartData: last30DaysSalesData, growthPercent: thirtyDayGrowthPercent } = get30DaySalesStats();
  const lowStockProducts = products.filter(p => p.inventoryStatus === 'low_stock');

  return (
    <div className="space-y-6">
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
        <div>
          <h1 className="text-2xl font-bold text-slate-900 leading-tight tracking-tight">Manager Dashboard</h1>
          <p className="text-slate-500 text-sm">Welcome back to your sales hub.</p>
        </div>
        <div className="flex gap-2">
          <button 
            onClick={onAiInsight}
            className="bg-sky-50 text-sky-600 px-4 py-2 rounded-lg text-sm font-bold flex items-center gap-2 hover:bg-sky-100 transition-colors"
          >
            <TrendingUp size={16} /> Get AI Strategy
          </button>
          <button 
            onClick={onAddProduct}
            className="bg-emerald-50 text-emerald-600 px-4 py-2 rounded-lg text-sm font-bold flex items-center gap-2 hover:bg-emerald-100 transition-colors"
          >
            <Plus size={16} /> New Product
          </button>
          <button 
            onClick={onAddLead}
            className="bg-slate-900 text-white px-4 py-2 rounded-lg text-sm font-medium flex items-center gap-2 hover:bg-slate-800 transition-colors"
          >
            <Plus size={16} /> Quick Lead
          </button>
        </div>
      </div>

      {/* Setup Checklist Getting Started card */}
      <SetupChecklistCard 
        business={business} 
        products={products} 
        onOpenWizard={onOpenWizard} 
        showToast={showToast} 
      />

      {/* New Total Sales Card */}
      <div id="total_sales_card_container" className="w-full bg-[#5B2FD4] rounded-xl p-5 sm:p-6 text-white shadow-sm relative overflow-hidden flex flex-col justify-between">
        <div className="absolute top-0 right-0 w-32 h-32 bg-white/5 rounded-full translate-x-8 -translate-y-8 pointer-events-none" />
        <div className="absolute bottom-0 right-1/4 w-24 h-24 bg-white/5 rounded-full translate-y-12 pointer-events-none" />

        <div className="flex justify-between items-start z-10">
          <div>
            <p className="text-white/80 text-xs font-semibold uppercase tracking-widest mb-1.5">Total Sales</p>
            <div className="flex items-baseline gap-2.5 flex-wrap">
              <span className="text-3xl sm:text-4xl font-extrabold tracking-tight">
                <AnimatedCounter value={allTimeSales} currency={currency || 'NGN'} />
              </span>
              <span className={cn(
                "inline-flex items-center gap-1 text-xs font-bold px-2.5 py-0.5 rounded-full select-none",
                thirtyDayGrowthPercent >= 0 
                  ? "bg-emerald-500/25 text-emerald-300" 
                  : "bg-rose-500/25 text-rose-300"
              )}>
                {thirtyDayGrowthPercent >= 0 ? '+' : ''}{thirtyDayGrowthPercent}%
              </span>
            </div>
            <p className="text-white/60 text-[10px] font-medium mt-1 uppercase tracking-wider">
              Last 30 Days Trend
            </p>
          </div>
          <div className="bg-white/10 p-2.5 rounded-xl border border-white/10 shadow-sm shrink-0">
            {thirtyDayGrowthPercent >= 0 ? (
              <TrendingUp size={20} className="text-emerald-300" />
            ) : (
              <TrendingDown size={20} className="text-rose-300" />
            )}
          </div>
        </div>

        {/* Small Elegant Sparkline Line Chart */}
        <div className="mt-4 h-16 z-10 bg-white/5 rounded-lg p-2 border border-white/10">
          <ResponsiveContainer width="100%" height="100%">
            <LineChart data={last30DaysSalesData}>
              <Tooltip 
                content={({ active, payload }) => {
                  if (active && payload && payload.length) {
                    return (
                      <div className="bg-slate-900 border border-white/10 text-white px-2 py-1.5 rounded-md text-[10px] font-bold shadow-md">
                        <p className="text-slate-300 font-medium mb-0.5">{payload[0].payload.date}</p>
                        <p className="font-mono text-emerald-400">{formatCurrency(payload[0].value as number, currency || 'NGN')}</p>
                      </div>
                    );
                  }
                  return null;
                }}
                cursor={{ stroke: 'rgba(255, 255, 255, 0.1)', strokeWidth: 1 }}
              />
              <Line 
                type="monotone" 
                dataKey="sales" 
                stroke="#C084FC" 
                strokeWidth={2} 
                dot={false}
                activeDot={{ r: 4, stroke: '#ffffff', strokeWidth: 1.5, fill: '#5B2FD4' }}
              />
            </LineChart>
          </ResponsiveContainer>
        </div>

        <div className="mt-4 pt-3.5 border-t border-white/10 flex justify-between items-center text-xs text-white/85 z-10">
          <span className="font-semibold tracking-tight">This Month: {formattedThisMonthSales}</span>
          <span className="text-white/60 text-[10px] font-mono">System-calculated KPI</span>
        </div>
      </div>

      {lowStockProducts.length > 0 && (
        <div className="bg-amber-50/70 border border-amber-200/80 rounded-2xl p-4 md:p-5">
          <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 mb-4">
            <div className="flex items-start gap-3">
              <div className="p-2 rounded-xl bg-amber-100 text-amber-600 shrink-0 mt-0.5">
                <AlertCircle size={20} className="animate-pulse" />
              </div>
              <div>
                <h4 className="text-sm font-extrabold text-slate-900 tracking-tight flex items-center gap-2">
                  <span>Replenishment Required</span>
                  <span className="bg-amber-500 text-slate-950 font-black text-[10px] px-2 py-0.5 rounded-full leading-none">
                    {lowStockProducts.length} Items Running Low
                  </span>
                </h4>
                <p className="text-xs text-slate-500 mt-0.5 leading-relaxed">
                  These active items are running low on stock. Restock them promptly to keep receiving orders from your storefront.
                </p>
              </div>
            </div>
            {onViewProducts && (
              <button 
                onClick={onViewProducts}
                className="text-xs font-black uppercase text-amber-800 tracking-widest hover:text-amber-900 transition-colors bg-white hover:bg-amber-50 border border-amber-200 px-3.5 py-2 rounded-xl flex items-center gap-1.5 self-start md:self-center shrink-0 shadow-sm"
              >
                <span>Manage Products</span>
                <ChevronRight size={14} />
              </button>
            )}
          </div>
          
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
            {lowStockProducts.map((prod) => (
              <div key={prod.id} className="bg-white border border-slate-100 rounded-xl p-3 flex items-center justify-between gap-3 shadow-xs">
                <div className="flex items-center gap-3 min-w-0">
                  <div className="w-10 h-10 bg-slate-50 border border-slate-100 rounded-lg flex items-center justify-center shrink-0 overflow-hidden">
                    {prod.images && prod.images[0] ? (
                      <img src={prod.images[0]} alt={prod.name} className="w-full h-full object-contain" referrerPolicy="no-referrer" />
                    ) : (
                      <Package size={16} className="text-slate-400" />
                    )}
                  </div>
                  <div className="min-w-0">
                    <p className="text-xs font-bold text-slate-900 truncate tracking-tight">{prod.name}</p>
                    <div className="flex items-center gap-1.5 mt-0.5">
                      <span className="text-[10px] font-black tracking-widest uppercase text-slate-400">{prod.type}</span>
                      <span className="text-[10px] text-slate-300">•</span>
                      <span className="bg-amber-50 text-amber-700 text-[8px] font-black uppercase px-1.5 py-0.5 rounded tracking-wide flex items-center gap-1">
                        <span className="w-1 h-1 rounded-full bg-amber-500 animate-pulse"></span>
                        Low Stock
                      </span>
                    </div>
                  </div>
                </div>
                
                {onEditProduct && (
                  <button
                    onClick={() => onEditProduct(prod)}
                    className="text-[9px] font-black uppercase tracking-widest text-slate-700 hover:text-sky-600 bg-slate-50 hover:bg-sky-50 border border-slate-100 hover:border-sky-100 px-3 py-2 rounded-xl transition-all font-sans shrink-0 hover:shadow-xs active:scale-95"
                  >
                    Restock
                  </button>
                )}
              </div>
            ))}
          </div>
        </div>
      )}

      {unreadReviews.length > 0 && (
        <div className="bg-sky-50/70 border border-sky-200/80 rounded-2xl p-4 md:p-5">
          <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 mb-4">
            <div className="flex items-start gap-3">
              <div className="p-2 rounded-xl bg-sky-100 text-sky-600 shrink-0 mt-0.5">
                <Star size={20} className="fill-sky-500 text-sky-500 animate-pulse" />
              </div>
              <div>
                <h4 className="text-sm font-extrabold text-slate-900 tracking-tight flex items-center gap-2">
                  <span>Recent Customer Feedback</span>
                  <span className="bg-sky-500 text-white font-black text-[10px] px-2 py-0.5 rounded-full leading-none shadow-sm">
                    {unreadReviews.length} New Unread
                  </span>
                </h4>
                <p className="text-xs text-slate-500 mt-0.5 leading-relaxed">
                  Your storefront shoppers left ratings. View their comments to monitor product satisfaction and address any issues.
                </p>
              </div>
            </div>
            {onViewReviews && (
              <button 
                onClick={onViewReviews}
                className="text-xs font-black uppercase text-sky-800 tracking-widest hover:text-sky-900 transition-colors bg-white hover:bg-sky-50 border border-sky-200 px-3.5 py-2 rounded-xl flex items-center gap-1.5 self-start md:self-center shrink-0 shadow-sm"
              >
                <span>Read Feedback</span>
                <ChevronRight size={14} />
              </button>
            )}
          </div>
          
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
            {unreadReviews.slice(0, 3).map((rev) => {
              const prod = products.find(p => p.id === rev.productId);
              return (
                <div key={rev.id} className="bg-white border border-slate-100 rounded-xl p-3 flex flex-col justify-between gap-2 shadow-xs">
                  <div>
                    <div className="flex items-center justify-between gap-2">
                      <span className="text-xs font-semibold text-slate-900 truncate tracking-tight">{rev.customerName}</span>
                      <div className="flex gap-0.5 shrink-0">
                        {[1, 2, 3, 4, 5].map(star => (
                          <Star key={star} size={10} className={star <= rev.rating ? "text-amber-500 fill-amber-500" : "text-slate-200 fill-slate-200"} />
                        ))}
                      </div>
                    </div>
                    {prod && (
                      <p className="text-[9px] text-slate-400 font-bold uppercase tracking-wider truncate mt-0.5">on {prod.name}</p>
                    )}
                    <p className="text-[11px] text-slate-600 line-clamp-2 italic bg-slate-50 p-2 rounded-lg border border-slate-100/50 mt-1.5 leading-relaxed">
                      "{rev.comment}"
                    </p>
                  </div>
                  <div className="flex items-center justify-between text-[8px] text-slate-400 font-mono mt-1 pt-1 border-t border-slate-50">
                    <span>{new Date(rev.createdAt).toLocaleDateString()}</span>
                    <span className="text-sky-600 font-sans font-black uppercase tracking-wider">New</span>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-4">
        <Card className="p-5 border-l-4 border-l-rose-500 bg-rose-50/10">
          <div>
            <div className="flex justify-between items-center mb-1">
              <p className="text-[10px] font-black text-rose-600 uppercase tracking-widest">Storefront Views</p>
              <Eye size={12} className="text-rose-500 shrink-0" />
            </div>
            <h3 className="text-3xl font-black text-slate-900 tracking-tighter italic">{views}</h3>
            <p className="text-xs text-slate-500 mt-1">Direct online visitors</p>
          </div>
        </Card>

        <Card className="p-5 border-l-4 border-l-emerald-600 bg-emerald-50/10">
          <div>
            <p className="text-[10px] font-black text-emerald-600 uppercase tracking-widest mb-1">Paid Customers</p>
            <h3 className="text-3xl font-black text-slate-900 tracking-tighter italic">{paidLeads.length}</h3>
            <p className="text-xs text-slate-500 mt-1">Total revenue recorded</p>
          </div>
        </Card>

        <Card className="p-5 border-l-4 border-l-sky-500 bg-sky-50/10">
          <div>
            <p className="text-[10px] font-black text-sky-600 uppercase tracking-widest mb-1">Highly Interested</p>
            <h3 className="text-3xl font-black text-slate-900 tracking-tighter italic">{interestedLeads.length}</h3>
            <p className="text-xs text-slate-500 mt-1">Potentially ready to buy</p>
          </div>
        </Card>

        <Card className="p-5 border-l-4 border-l-amber-500 bg-amber-50/10">
          <div>
            <p className="text-[10px] font-black text-amber-600 uppercase tracking-widest mb-1">New Inquiries</p>
            <h3 className="text-3xl font-black text-slate-900 tracking-tighter italic">{newLeads.length}</h3>
            <p className="text-xs text-slate-500 mt-1">Untouched conversations</p>
          </div>
        </Card>

        <Card className="p-5 border-l-4 border-l-slate-900 bg-slate-50/50">
          <div>
            <p className="text-[10px] font-black text-slate-500 uppercase tracking-widest mb-1">Conversion Rate</p>
            <h3 className="text-3xl font-black text-slate-900 tracking-tighter italic">{conversionRate}%</h3>
            <p className="text-xs text-slate-500 mt-1">{views > 0 ? "Visitor-to-Paid ratio" : "Visit-to-Paid efficiency"}</p>
          </div>
        </Card>
      </div>

      {/* Real-time Customer Engagement Analytics */}
      <div className="bg-gradient-to-r from-sky-500/5 to-emerald-500/5 border border-sky-100/80 p-5 rounded-2xl">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 mb-4">
          <div>
            <h4 className="text-xs font-black uppercase tracking-widest text-[#0ea5e9]">Storefront Engagement Levels</h4>
            <p className="text-[11px] text-slate-400 font-medium mt-0.5">Real-time counts of customer clicks on storefront action buttons</p>
          </div>
          <div className="bg-white px-2.5 py-1 rounded-full border border-sky-100 text-[10px] font-bold text-[#0ea5e9] flex items-center gap-1 shrink-0 self-start sm:self-auto shadow-xs">
            <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse"></span>
            Listening Live
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <Card className="p-4 bg-white border border-slate-100 flex items-center gap-4 shadow-xs">
            <div className="w-10 h-10 rounded-xl bg-emerald-50 border border-emerald-100/80 flex items-center justify-center text-emerald-500 shrink-0">
              <MessageSquare size={18} />
            </div>
            <div className="min-w-0 flex-1">
              <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest leading-none">Message Merchant</p>
              <h3 className="text-xl font-black text-slate-800 tracking-tight mt-1">{clicksMessageMerchant}</h3>
              <p className="text-[10px] text-slate-400 truncate mt-0.5">Clicks to start general chat</p>
            </div>
            {views > 0 && (
              <div className="bg-slate-50 px-2 py-1 rounded-lg border border-slate-100 text-[10px] font-black text-slate-500 shrink-0">
                {((clicksMessageMerchant / views) * 100).toFixed(1)}% CTR
              </div>
            )}
          </Card>

          <Card className="p-4 bg-white border border-slate-100 flex items-center gap-4 shadow-xs">
            <div className="w-10 h-10 rounded-xl bg-sky-50 border border-sky-100/80 flex items-center justify-center text-[#0ea5e9] shrink-0">
              <ShoppingCart size={18} />
            </div>
            <div className="min-w-0 flex-1">
              <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest leading-none">Send WhatsApp Order</p>
              <h3 className="text-xl font-black text-slate-800 tracking-tight mt-1">{clicksWhatsAppOrder}</h3>
              <p className="text-[10px] text-slate-400 truncate mt-0.5">Checkout/inquiry clicks</p>
            </div>
            {views > 0 && (
              <div className="bg-slate-50 px-2 py-1 rounded-lg border border-slate-100 text-[10px] font-black text-slate-500 shrink-0">
                {((clicksWhatsAppOrder / views) * 100).toFixed(1)}% CTR
              </div>
            )}
          </Card>

          <Card className="p-4 bg-white border border-slate-100 flex items-center gap-4 shadow-xs">
            <div className="w-10 h-10 rounded-xl bg-slate-100 border border-slate-200 flex items-center justify-center text-slate-700 shrink-0">
              <Heart size={18} />
            </div>
            <div className="min-w-0 flex-1">
              <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest leading-none">Total Action Clicks</p>
              <h3 className="text-xl font-black text-slate-800 tracking-tight mt-1">{clicksMessageMerchant + clicksWhatsAppOrder}</h3>
              <p className="text-[10px] text-slate-400 truncate mt-0.5">Combined customer intents</p>
            </div>
            {views > 0 && (
              <div className="bg-slate-50 text-slate-700 border border-slate-150 px-2 py-1 rounded-lg text-[10px] font-black shrink-0 font-sans">
                {(((clicksMessageMerchant + clicksWhatsAppOrder) / views) * 100).toFixed(1)}% Ratio
              </div>
            )}
          </Card>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <Card className="lg:col-span-2 p-6">
          <div className="flex justify-between items-center mb-6">
            <h3 className="font-bold text-slate-900">Sales Activity</h3>
          </div>
          <div className="w-full h-[320px]">
            <ResponsiveContainer width="100%" height={320}>
              <AreaChart data={chartData}>
                <defs>
                  <linearGradient id="colorSales" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="#0ea5e9" stopOpacity={0.1}/>
                    <stop offset="95%" stopColor="#0ea5e9" stopOpacity={0}/>
                  </linearGradient>
                </defs>
                <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f1f5f9" />
                <XAxis dataKey="name" axisLine={false} tickLine={false} tick={{ fontSize: 11, fill: '#64748b' }} dy={10} />
                <YAxis axisLine={false} tickLine={false} tick={{ fontSize: 11, fill: '#64748b' }} width={40} />
                <Tooltip contentStyle={{ borderRadius: '12px', border: 'none', boxShadow: '0 10px 15px -3px rgb(0 0 0 / 0.1)' }} />
                <Area type="monotone" dataKey="sales" stroke="#0ea5e9" strokeWidth={2} fillOpacity={1} fill="url(#colorSales)" />
              </AreaChart>
            </ResponsiveContainer>
          </div>
        </Card>

        <Card className="p-6">
          <div className="flex justify-between items-center mb-6">
            <h3 className="font-bold text-slate-900 text-sm italic serif">Recent Leads</h3>
            {onViewLeads && (
              <button 
                onClick={onViewLeads}
                className="text-xs font-bold text-sky-600 hover:text-sky-700 hover:underline transition-all flex items-center gap-1 cursor-pointer"
              >
                <span>View all</span>
                <ChevronRight size={14} />
              </button>
            )}
          </div>
          <div className="space-y-4">
            {leads.slice(0, 5).map((lead) => {
              const leadInterest = lead.interest || '';
              const matchedProduct = products.find(p => {
                const prodName = p.name || '';
                return prodName.toLowerCase() === leadInterest.toLowerCase() || 
                       leadInterest.toLowerCase().includes(prodName.toLowerCase()) ||
                       prodName.toLowerCase().includes(leadInterest.toLowerCase());
              });
              const price = matchedProduct ? Number(matchedProduct.price) || 0 : 100;
              const formattedPrice = formatCurrency(price, currency || 'NGN');

              const leadOrders = orders.filter(o => o.leadId === lead.id);
              const paidOrdersCount = leadOrders.filter(o => o.paymentStatus === 'paid' || o.fulfillmentStatus === 'completed' || o.fulfillmentStatus === 'delivered').length;
              const itemsCount = paidOrdersCount > 0 ? paidOrdersCount : (lead.status === 'paid' ? 1 : 0);

              return (
                <div key={lead.id} className="flex items-center gap-3 pb-3 border-bottom border-slate-50 last:border-0 last:pb-0">
                  <div className="w-10 h-10 rounded-full bg-[#5B2FD4] border border-[#5B2FD4]/20 flex items-center justify-center text-white font-bold text-xs uppercase shrink-0 shadow-sm shadow-[#5B2FD4]/10">
                    {lead.name[0]}
                  </div>
                  <div className="flex-1 min-w-0 pr-5 sm:pr-8">
                    <p className="text-sm font-bold text-slate-900 truncate">{lead.name}</p>
                    <p className="text-[11px] font-semibold text-emerald-600 mb-0.5">{itemsCount} {itemsCount === 1 ? 'item' : 'items'} purchased</p>
                    <p className="text-xs text-slate-500 truncate">{lead.interest}</p>
                  </div>
                  <div className="flex items-center gap-3 shrink-0">
                    <span className="text-sm font-extrabold text-slate-900 font-sans tracking-tight">{formattedPrice}</span>
                    <Badge variant={lead.status === 'paid' ? 'success' : lead.status === 'interested' ? 'info' : 'default'}>
                      {lead.status}
                    </Badge>
                  </div>
                </div>
              );
            })}
          </div>
        </Card>
      </div>
    </div>
  );
};

const ProductsPage = ({ products, onAddProduct, onEditProduct, onDeleteProduct, currency }: { products: Product[], onAddProduct: () => void, onEditProduct: (p: Product) => void, onDeleteProduct?: (id: string) => void, currency: string }) => {
  const [sortBy, setSortBy] = useState<string>('default');

  const sortedProducts = useMemo(() => {
    const items = [...products];
    if (sortBy === 'price-asc') {
      return items.sort((a, b) => a.price - b.price);
    } else if (sortBy === 'price-desc') {
      return items.sort((a, b) => b.price - a.price);
    } else if (sortBy === 'name-asc') {
      return items.sort((a, b) => a.name.localeCompare(b.name));
    } else if (sortBy === 'name-desc') {
      return items.sort((a, b) => b.name.localeCompare(a.name));
    }
    return items;
  }, [products, sortBy]);

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:justify-between sm:items-center gap-4">
        <div>
          <h1 className="text-2xl font-bold text-slate-900 leading-tight tracking-tight">Products</h1>
          <p className="text-slate-500 text-sm">Manage your inventory and catalog.</p>
        </div>
        <div className="flex items-center gap-3 self-end sm:self-auto">
          <div className="flex items-center gap-2 bg-white border border-slate-200 px-3 py-1.5 rounded-lg shadow-sm">
            <span className="text-[10px] sm:text-xs font-bold text-slate-400 uppercase tracking-widest">Sort by:</span>
            <select
              value={sortBy}
              onChange={(e) => setSortBy(e.target.value)}
              className="bg-transparent text-xs font-semibold text-slate-700 outline-none cursor-pointer pr-1"
            >
              <option value="default">Default</option>
              <option value="price-asc">Price: Low to High</option>
              <option value="price-desc">Price: High to Low</option>
              <option value="name-asc">Name: A to Z</option>
              <option value="name-desc">Name: Z to A</option>
            </select>
          </div>
          <button 
            onClick={onAddProduct}
            className="bg-slate-900 text-white px-4 py-2 rounded-lg text-sm font-medium flex items-center gap-2 hover:bg-slate-800 transition-colors shadow-lg shadow-slate-900/10"
          >
            <Plus size={16} /> New Product
          </button>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-6">
        {sortedProducts.map((product) => (
          <div key={product.id}>
            <Card className="group hover:border-slate-300 transition-all h-full relative">
              <div className="aspect-video bg-slate-100 relative overflow-hidden">
                {product.images && product.images.length > 0 ? (
                  <img src={product.images[0]} className="w-full h-full object-cover transition-transform group-hover:scale-105" alt={product.name} referrerPolicy="no-referrer" />
                ) : (
                  <div className="w-full h-full flex items-center justify-center text-slate-300">
                    <ShoppingBag size={48} strokeWidth={1} />
                  </div>
                )}
                <div className="absolute top-2 right-2 flex gap-1">
                  <Badge variant={product.isActive ? 'success' : 'default'}>{product.isActive ? 'Active' : 'Draft'}</Badge>
                </div>
                <div className="absolute bottom-2 left-2 flex flex-wrap gap-1">
                  {product.isBestSeller && (
                    <span className="bg-amber-500/90 backdrop-blur-sm text-white text-[8px] font-black uppercase px-1.5 py-0.5 rounded shadow-sm tracking-widest flex items-center gap-0.5">
                      ★ Best Seller
                    </span>
                  )}
                  {product.isNewArrival && (
                    <span className="bg-sky-500/90 backdrop-blur-sm text-white text-[8px] font-black uppercase px-1.5 py-0.5 rounded shadow-sm tracking-widest flex items-center gap-0.5">
                      ✦ New Arrival
                    </span>
                  )}
                  {product.isPromotion && (
                    <span className="bg-rose-500/90 backdrop-blur-sm text-white text-[8px] font-black uppercase px-1.5 py-0.5 rounded shadow-sm tracking-widest flex items-center gap-0.5">
                      % Promotion
                    </span>
                  )}
                </div>
                <div className="absolute top-2 left-2 flex gap-2 opacity-0 group-hover:opacity-100 transition-opacity">
                  <button 
                    onClick={() => onEditProduct(product)}
                    className="bg-white/90 backdrop-blur-sm p-2 rounded-lg shadow-sm hover:bg-white text-slate-600 hover:text-sky-600"
                  >
                    <Plus className="rotate-45" size={14} />
                  </button>
                  <button 
                    onClick={() => onDeleteProduct?.(product.id)}
                    className="bg-white/90 backdrop-blur-sm p-2 rounded-lg shadow-sm hover:bg-white text-slate-600 hover:text-red-600"
                  >
                    <Trash2 size={14} />
                  </button>
                </div>
                {product.images && product.images.length > 1 && (
                  <div className="absolute bottom-2 right-2 bg-slate-900/60 backdrop-blur-sm text-white px-2 py-1 rounded text-[10px] font-bold">
                    +{product.images.length - 1} More
                  </div>
                )}
              </div>
              <div className="p-5">
                <div className="flex justify-between items-start mb-2">
                  <h3 className="font-bold text-slate-900 group-hover:text-sky-600 transition-colors uppercase tracking-tight">{product.name}</h3>
                  <p className="font-bold text-slate-900 text-lg mono font-mono tracking-tighter">{formatCurrency(product.price, currency)}</p>
                </div>
                <p className="text-sm text-slate-500 line-clamp-2 mb-4 leading-relaxed">{product.description}</p>
                <div className="flex justify-between items-center">
                  <span className="text-xs font-medium text-slate-400 flex items-center gap-1.5 uppercase tracking-widest leading-none">
                    <Package size={12} /> {product.type}
                    <span>•</span>
                    {(product.inventoryStatus || 'in_stock') === 'out_of_stock' ? (
                      <span className="text-rose-600 font-extrabold flex items-center gap-1">
                        <span className="w-1.5 h-1.5 rounded-full bg-rose-500"></span> Out of Stock
                      </span>
                    ) : (product.inventoryStatus || 'in_stock') === 'low_stock' ? (
                      <span className="text-amber-600 font-extrabold flex items-center gap-1">
                        <span className="w-1.5 h-1.5 rounded-full bg-amber-500 animate-pulse"></span> Low Stock
                      </span>
                    ) : (
                      <span className="text-emerald-600 font-extrabold flex items-center gap-1">
                        <span className="w-1.5 h-1.5 rounded-full bg-emerald-500"></span> In Stock
                      </span>
                    )}
                  </span>
                  <div className="flex items-center gap-3">
                    <button 
                      onClick={() => onEditProduct(product)}
                      className="text-[10px] font-black uppercase text-sky-600 tracking-widest hover:underline transition-colors"
                    >
                      Edit
                    </button>
                    {onDeleteProduct && (
                      <>
                        <span className="text-slate-300 text-xs font-light select-none font-sans">•</span>
                        <button 
                          onClick={() => onDeleteProduct(product.id)}
                          className="text-[10px] font-black uppercase text-rose-600 tracking-widest hover:underline transition-colors flex items-center gap-1"
                        >
                          <Trash2 size={10} className="stroke-[2.5]" /> Delete
                        </button>
                      </>
                    )}
                  </div>
                </div>
              </div>
            </Card>
          </div>
        ))}
      </div>
    </div>
  );
};

const LeadsPage = ({ 
  leads, 
  products,
  currency,
  onAddLead, 
  onUpdateStatus, 
  onUpdateLead,
  onWhatsApp, 
  onOpenImport, 
  onDeleteLead 
}: { 
  leads: Lead[], 
  products: Product[],
  currency: string,
  onAddLead: () => void, 
  onUpdateStatus: (id: string, status: LeadStatus) => void, 
  onUpdateLead: (id: string, fields: Partial<Lead>) => void,
  onWhatsApp: (lead: Lead, message: string) => void, 
  onOpenImport: () => void, 
  onDeleteLead?: (id: string) => void 
}) => {
  const statusCycle: LeadStatus[] = ['new', 'contacted', 'interested', 'paid', 'lost'];
  
  const getNextStatus = (current: LeadStatus) => {
    const idx = statusCycle.indexOf(current);
    return statusCycle[(idx + 1) % statusCycle.length];
  };

  const [editingLeadId, setEditingLeadId] = useState<string | null>(null);
  const [editName, setEditName] = useState('');
  const [editPhone, setEditPhone] = useState('');
  const [editInterest, setEditInterest] = useState('');
  const [editAmount, setEditAmount] = useState<number | string>('');

  const handleStartEdit = (lead: Lead) => {
    setEditingLeadId(lead.id);
    setEditName(lead.name || '');
    setEditPhone(lead.phone || '');
    setEditInterest(lead.interest || '');
    
    let currentAmount = 0;
    if (lead.amount !== undefined) {
      currentAmount = lead.amount;
    } else {
      const matched = products.find(p => p.name.toLowerCase() === (lead.interest || '').toLowerCase());
      currentAmount = matched ? matched.price : 100;
    }
    setEditAmount(currentAmount);
  };

  const handleProductSelectChange = (prodId: string) => {
    if (prodId === 'custom') {
      setEditInterest('General Inquiry');
      setEditAmount('');
    } else {
      const prod = products.find(p => p.id === prodId);
      if (prod) {
        setEditInterest(prod.name);
        setEditAmount(prod.price);
      }
    }
  };

  const handleSaveEdit = (leadId: string) => {
    onUpdateLead(leadId, {
      name: editName,
      phone: editPhone,
      interest: editInterest,
      amount: Number(editAmount) || 0
    });
    setEditingLeadId(null);
  };

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-2xl font-bold text-slate-900 leading-tight tracking-tight">Leads</h1>
          <p className="text-slate-500 text-sm">Track conversations and potential customers.</p>
        </div>
        <div className="flex gap-2">
          <button 
            onClick={onOpenImport}
            className="bg-white border border-slate-200 px-4 py-2 rounded-lg text-sm font-medium flex items-center gap-2 hover:bg-slate-50 transition-colors"
          >
            <MessageSquare size={16} /> Import Leads (CSV)
          </button>
          <button 
            onClick={onAddLead}
            className="bg-slate-900 text-white px-4 py-2 rounded-lg text-sm font-medium flex items-center gap-2 hover:bg-slate-800 transition-colors"
          >
            <Plus size={16} /> Add Lead
          </button>
        </div>
      </div>

      <Card className="overflow-x-auto">
        <table className="w-full text-left border-collapse min-w-[850px]">
          <thead>
            <tr className="border-bottom border-slate-100 bg-slate-50/50">
              <th className="p-4 italic serif text-xs uppercase tracking-widest text-slate-400 font-medium">Customer</th>
              <th className="p-4 italic serif text-xs uppercase tracking-widest text-slate-400 font-medium">Interest</th>
              <th className="p-4 italic serif text-xs uppercase tracking-widest text-slate-400 font-medium">Deal Price</th>
              <th className="p-4 italic serif text-xs uppercase tracking-widest text-slate-400 font-medium">Status</th>
              <th className="p-4 italic serif text-xs uppercase tracking-widest text-slate-400 font-medium text-right">Action</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-50">
            {leads.map((lead) => {
              const isEditing = editingLeadId === lead.id;
              
              // Get current computed price
              let displayPrice = 100;
              if (lead.amount !== undefined) {
                displayPrice = lead.amount;
              } else {
                const leadInterest = lead.interest || '';
                const matchedProduct = products.find(p => {
                  const prodName = p.name || '';
                  return prodName.toLowerCase() === leadInterest.toLowerCase() || 
                         leadInterest.toLowerCase().includes(prodName.toLowerCase()) ||
                         prodName.toLowerCase().includes(leadInterest.toLowerCase());
                });
                displayPrice = matchedProduct ? matchedProduct.price : 100;
              }

              return (
                <tr key={lead.id} className="hover:bg-slate-50/50 transition-colors group">
                  {isEditing ? (
                    <>
                      {/* Editing Mode */}
                      <td className="p-4 space-y-2 min-w-[200px]">
                        <input
                          type="text"
                          value={editName}
                          onChange={(e) => setEditName(e.target.value)}
                          className="w-full bg-white border border-slate-200 rounded-lg px-2.5 py-1.5 text-xs font-bold focus:outline-none focus:ring-1 focus:ring-sky-500"
                          placeholder="Name"
                        />
                        <input
                          type="tel"
                          value={editPhone}
                          onChange={(e) => setEditPhone(e.target.value)}
                          className="w-full bg-white border border-slate-200 rounded-lg px-2.5 py-1.5 text-xs font-mono focus:outline-none focus:ring-1 focus:ring-sky-500"
                          placeholder="WhatsApp Phone"
                        />
                      </td>
                      <td className="p-4 space-y-2 min-w-[220px]">
                        <select
                          onChange={(e) => handleProductSelectChange(e.target.value)}
                          className="w-full bg-white border border-slate-200 rounded-lg px-2.5 py-1.5 text-xs focus:outline-none focus:ring-1 focus:ring-sky-500"
                        >
                          <option value="custom">-- Link Storefront Product --</option>
                          {products.map(p => (
                            <option key={p.id} value={p.id}>{p.name}</option>
                          ))}
                        </select>
                        <input
                          type="text"
                          value={editInterest}
                          onChange={(e) => setEditInterest(e.target.value)}
                          className="w-full bg-white border border-slate-200 rounded-lg px-2.5 py-1.5 text-xs focus:outline-none focus:ring-1 focus:ring-sky-500"
                          placeholder="Interest"
                        />
                      </td>
                      <td className="p-4 min-w-[120px]">
                        <input
                          type="number"
                          value={editAmount}
                          onChange={(e) => setEditAmount(e.target.value === '' ? '' : Number(e.target.value))}
                          className="w-full bg-white border border-slate-200 rounded-lg px-2.5 py-1.5 text-xs font-mono focus:outline-none focus:ring-1 focus:ring-sky-500"
                          placeholder="Price"
                        />
                      </td>
                      <td className="p-4">
                        <Badge variant={lead.status === 'paid' ? 'success' : lead.status === 'interested' ? 'info' : lead.status === 'lost' ? 'error' : lead.status === 'contacted' ? 'warning' : 'default'}>
                          {lead.status}
                        </Badge>
                      </td>
                      <td className="p-4 text-right">
                        <div className="flex justify-end gap-1.5">
                          <button
                            onClick={() => handleSaveEdit(lead.id)}
                            className="bg-emerald-500 hover:bg-emerald-600 text-white p-2 rounded-lg transition-colors shadow-xs"
                            title="Save changes"
                          >
                            <Check size={14} />
                          </button>
                          <button
                            onClick={() => setEditingLeadId(null)}
                            className="bg-slate-200 hover:bg-slate-300 text-slate-600 p-2 rounded-lg transition-colors"
                            title="Cancel"
                          >
                            <X size={14} />
                          </button>
                        </div>
                      </td>
                    </>
                  ) : (
                    <>
                      {/* Normal Mode */}
                      <td className="p-4">
                        <div className="flex items-center gap-3">
                          <div className="w-10 h-10 rounded-full bg-[#5B2FD4] border border-[#5B2FD4]/20 flex items-center justify-center text-white font-bold text-xs uppercase shrink-0 shadow-sm shadow-[#5B2FD4]/10">
                            {lead.name ? lead.name[0] : '?'}
                          </div>
                          <div>
                            <p className="font-bold text-slate-900 leading-tight">{lead.name}</p>
                            <p className="text-xs font-mono text-slate-400 mt-0.5">{lead.phone}</p>
                          </div>
                        </div>
                      </td>
                      <td className="p-4">
                        <div className="flex flex-col">
                          <span className="text-sm text-slate-600 italic leading-none mb-1">{lead.interest}</span>
                          <span className="text-[10px] text-slate-400 font-bold uppercase tracking-widest leading-none">Source: {lead.source}</span>
                        </div>
                      </td>
                      <td className="p-4">
                        {lead.status === 'paid' ? (
                          <div className="flex flex-col">
                            <span className="text-sm font-extrabold text-emerald-600 font-mono">
                              {formatCurrency(displayPrice, currency)}
                            </span>
                            <span className="text-[8px] text-emerald-500 font-black uppercase tracking-wider mt-0.5">
                              ✓ Paid Sale
                            </span>
                          </div>
                        ) : lead.status === 'lost' ? (
                          <div className="flex flex-col">
                            <span className="text-sm font-bold text-slate-400 font-mono line-through">
                              {formatCurrency(displayPrice, currency)}
                            </span>
                            <span className="text-[8px] text-rose-500 font-black uppercase tracking-wider mt-0.5">
                              ✗ Lost Deal
                            </span>
                          </div>
                        ) : (
                          <div className="flex flex-col">
                            <span className="text-sm font-bold text-slate-600 font-mono">
                              {formatCurrency(displayPrice, currency)}
                            </span>
                            <span className="text-[8px] text-sky-500 font-black uppercase tracking-wider mt-0.5">
                              ★ Potential
                            </span>
                          </div>
                        )}
                      </td>
                      <td className="p-4">
                        <button 
                          onClick={() => onUpdateStatus(lead.id, getNextStatus(lead.status))}
                          className="hover:scale-105 transition-transform active:scale-95"
                          title="Click to cycle status"
                        >
                          <Badge variant={lead.status === 'paid' ? 'success' : lead.status === 'interested' ? 'info' : lead.status === 'lost' ? 'error' : lead.status === 'contacted' ? 'warning' : 'default'}>
                            {lead.status}
                          </Badge>
                        </button>
                      </td>
                      <td className="p-4 text-right">
                        <div className="flex justify-end gap-1.5">
                          <button
                            onClick={() => handleStartEdit(lead)}
                            className="bg-sky-50 text-sky-600 hover:bg-sky-100 p-2 rounded-lg text-xs font-bold transition-all flex items-center gap-1 shadow-2xs hover:shadow-xs"
                            title="Edit lead details & price"
                          >
                            <Edit2 size={12} />
                          </button>
                          <button 
                            onClick={() => {
                              const message = `Hi ${lead.name}, checking back on your interest in ${lead.interest}!`;
                              onWhatsApp(lead, message);
                            }}
                            className="bg-emerald-50 text-emerald-600 hover:bg-emerald-100 p-2 rounded-lg text-xs font-bold transition-all flex items-center gap-1 shadow-2xs hover:shadow-xs"
                          >
                            <MessageSquare size={12} />
                          </button>
                          <button 
                            onClick={() => onDeleteLead?.(lead.id)}
                            className="bg-red-50 text-red-600 hover:bg-red-100 p-2 rounded-lg text-xs font-bold transition-all flex items-center gap-1 shadow-2xs hover:shadow-xs"
                            title="Delete lead"
                          >
                            <Trash2 size={12} />
                          </button>
                        </div>
                      </td>
                    </>
                  )}
                </tr>
              );
            })}
          </tbody>
        </table>
      </Card>
    </div>
  );
};

const FollowUpsPage = ({ leads, onWhatsApp, onRegenerate }: { leads: Lead[], onWhatsApp: (lead: Lead) => void, onRegenerate: (lead: Lead) => void }) => {
  const pendingLeads = leads.filter(l => l.status !== 'paid' && l.status !== 'lost');

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-2xl font-bold text-slate-900 leading-tight tracking-tight">Follow-ups</h1>
          <p className="text-slate-500 text-sm">Don't let interested customers go cold.</p>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {pendingLeads.map((lead) => (
          <div key={lead.id}>
            <Card className="p-5 flex flex-col justify-between h-full">
            <div>
              <div className="flex justify-between items-start mb-4">
                <div className="flex items-center gap-2">
                  <div className="w-8 h-8 rounded-full bg-[#5B2FD4] border border-[#5B2FD4]/20 flex items-center justify-center text-white font-bold text-xs uppercase shrink-0 shadow-sm shadow-[#5B2FD4]/10">
                    {lead.name[0]}
                  </div>
                  <div>
                    <h3 className="font-bold text-slate-900 text-sm">{lead.name}</h3>
                    <p className="text-[10px] text-slate-400 font-mono uppercase">{lead.phone}</p>
                  </div>
                </div>
                <Badge variant={lead.status === 'interested' ? 'info' : lead.status === 'contacted' ? 'warning' : 'default'}>
                  {lead.status}
                </Badge>
              </div>
              <p className="text-sm text-slate-600 mb-4 bg-slate-50 p-3 rounded-lg border border-slate-100 italic leading-relaxed">
                "{lead.notes}"
              </p>
            </div>
            <div className="flex gap-2">
              <button 
                onClick={() => onWhatsApp(lead)}
                className="flex-1 bg-slate-900 text-white py-2 rounded-lg text-xs font-bold hover:bg-slate-800 transition-colors"
              >
                Send WhatsApp
              </button>
              <button 
                onClick={() => onRegenerate(lead)}
                className="flex-1 border border-slate-200 text-slate-600 py-2 rounded-lg text-xs font-bold hover:bg-slate-50 transition-colors"
              >
                Regenerate Tip
              </button>
            </div>
          </Card>
        </div>
      ))}
        {pendingLeads.length === 0 && (
          <div className="col-span-full py-20 text-center space-y-2">
             <CheckCircle2 size={48} className="mx-auto text-emerald-500" />
             <p className="font-bold text-slate-900">All caught up!</p>
             <p className="text-xs text-slate-500">No pending follow-ups at the moment.</p>
          </div>
        )}
      </div>
    </div>
  );
};

const OrdersPage = ({ orders, leads, products, currency, showToast }: { orders: Order[], leads: Lead[], products: Product[], currency: string, showToast?: (m: string, t?: 'success' | 'error' | 'info') => void }) => {
  const getProduct = (id: string) => products.find(p => p.id === id);
  const getLead = (id: string) => leads.find(l => l.id === id);

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-2xl font-bold text-slate-900 leading-tight tracking-tight">Orders</h1>
          <p className="text-slate-500 text-sm">Track fulfillment and payment status.</p>
        </div>
        <button 
          onClick={() => {
            if (showToast) {
              showToast("Manual order creation is coming soon! Use the storefront to record new sales.", "info");
            } else {
              alert("Manual order creation is coming in the next update. Use the storefront to record new sales for now!");
            }
          }}
          className="bg-slate-900 text-white px-4 py-2 rounded-lg text-sm font-medium flex items-center gap-2 hover:bg-slate-800 transition-colors shadow-lg shadow-slate-900/10"
        >
          <Plus size={16} /> Create Order
        </button>
      </div>

      <Card className="overflow-hidden">
        <div className="p-4 bg-slate-50 border-b border-slate-200 flex gap-4 overflow-x-auto no-scrollbar">
          <button className="text-xs font-bold px-3 py-1 bg-white border border-slate-200 rounded-full shadow-sm">All Orders</button>
          <button className="text-xs font-bold px-3 py-1 hover:bg-white transition-colors rounded-full text-slate-400">Pending</button>
          <button className="text-xs font-bold px-3 py-1 hover:bg-white transition-colors rounded-full text-slate-400">Paid</button>
          <button className="text-xs font-bold px-3 py-1 hover:bg-white transition-colors rounded-full text-slate-400">Completed</button>
        </div>
        <div className="divide-y divide-slate-100">
          {orders.map((order) => {
            const product = getProduct(order.productId);
            const lead = getLead(order.leadId);
            return (
              <div key={order.id} className="p-4 flex items-center justify-between gap-4 hover:bg-slate-50 transition-colors group">
                <div className="flex items-center gap-3">
                  <div className="w-12 h-12 bg-white border border-slate-100 rounded-xl flex items-center justify-center text-slate-400 shadow-sm group-hover:border-sky-200 transition-colors">
                    <Package size={20} />
                  </div>
                  <div>
                    <h3 className="font-bold text-slate-900 text-sm italic tracking-tight">ORD-{order.id}</h3>
                    <p className="text-[10px] text-slate-500 uppercase tracking-widest font-black">{product?.name || 'Unknown Product'}</p>
                  </div>
                </div>
                <div className="hidden md:flex flex-col">
                  <span className="text-[10px] font-black text-slate-400 uppercase tracking-widest leading-none mb-1">Customer</span>
                  <span className="text-sm font-bold text-slate-900 truncate max-w-[150px]">{lead?.name || 'Walk-in Customer'}</span>
                </div>
                <div className="text-right">
                  <p className="font-bold text-slate-900 text-sm mono leading-none mb-1">{formatCurrency(order.amount, currency)}</p>
                  <Badge variant={order.fulfillmentStatus === 'completed' ? 'success' : 'warning'}>
                    {order.fulfillmentStatus}
                  </Badge>
                </div>
              </div>
            );
          })}
          {orders.length === 0 && (
            <div className="p-12 text-center text-slate-400">
              <Clock size={32} className="mx-auto mb-2 opacity-20" />
              <p className="text-xs font-bold uppercase tracking-widest">No orders recorded yet</p>
            </div>
          )}
        </div>
      </Card>
    </div>
  );
};

const ReviewsPage = ({ reviews, products }: { reviews: Review[], products: Product[] }) => {
  const getProduct = (id: string) => products.find(p => p.id === id);

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-2xl font-bold text-slate-900 leading-tight tracking-tight">Product Reviews</h1>
          <p className="text-slate-500 text-sm">Monitor user feedback and product ratings.</p>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {reviews.map((review) => {
          const product = getProduct(review.productId);
          return (
            <div key={review.id}>
              <Card className="p-6 h-full flex flex-col">
                <div className="flex justify-between items-start mb-4">
                  <div>
                    <h3 className="font-bold text-slate-900 text-sm">{review.customerName}</h3>
                    <p className="text-[10px] text-slate-400 font-bold uppercase tracking-widest leading-none mt-1">on {product?.name || 'Deleted Product'}</p>
                  </div>
                  <div className="flex gap-0.5">
                    {[1, 2, 3, 4, 5].map(star => (
                      <Star key={star} size={12} className={star <= review.rating ? "text-amber-500 fill-amber-500" : "text-slate-200 fill-slate-200"} />
                    ))}
                  </div>
                </div>
                <p className="text-sm text-slate-600 italic leading-relaxed bg-slate-50 p-4 rounded-xl border border-slate-100 flex-1">
                  "{review.comment}"
                </p>
                <div className="mt-4 pt-4 border-t border-slate-100 flex justify-between items-center">
                   <span className="text-[10px] text-slate-400 font-mono tracking-widest uppercase">{new Date(review.createdAt).toLocaleDateString()}</span>
                </div>
              </Card>
            </div>
          );
        })}
        {reviews.length === 0 && (
          <div className="col-span-full py-20 text-center space-y-2">
             <Star size={48} className="mx-auto text-slate-200" strokeWidth={1} />
             <p className="font-bold text-slate-900 italic serif">No reviews yet.</p>
             <p className="text-xs text-slate-500">Your customers haven't left any feedback on your storefront yet.</p>
          </div>
        )}
      </div>
    </div>
  );
};

const SettingsPage = ({ business, setBusiness, onLogout, showToast }: { business: BusinessProfile, setBusiness: (b: BusinessProfile) => void, onLogout: () => void, showToast?: (m: string, t?: 'success' | 'error' | 'info') => void }) => {
  const [activeTab, setActiveTab] = useState<'profile' | 'storefront' | 'whatsapp'>('profile');
  const [localBusiness, setLocalBusiness] = useState<BusinessProfile>(business);
  const [isDraggingLogo, setIsDraggingLogo] = useState(false);
  const logoInputRef = React.useRef<HTMLInputElement>(null);

  const handleLogoUpload = async (file: File) => {
    try {
      const compressed = await compressImage(file, 300, 0.7);
      setLocalBusiness(prev => ({ ...prev, logo: compressed }));
      showToast?.("Profile image uploaded successfully! Press 'Save Changes' to apply.", "success");
    } catch (err) {
      console.error("Error compressing logo:", err);
      const reader = new FileReader();
      reader.onloadend = () => {
        setLocalBusiness(prev => ({ ...prev, logo: reader.result as string }));
        showToast?.("Profile image uploaded successfully! Press 'Save Changes' to apply.", "success");
      };
      reader.readAsDataURL(file);
    }
  };

  const handleLogoDrop = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDraggingLogo(false);
    const file = e.dataTransfer.files?.[0];
    if (file && file.type.startsWith('image/')) {
      handleLogoUpload(file);
    } else if (file) {
      showToast?.("Please upload an image file (PNG, JPG, or GIF).", "error");
    }
  };

  // Sync local state when prop changes
  useEffect(() => {
    setLocalBusiness(business);
  }, [business]);

  const handleSave = () => {
    setBusiness(localBusiness);
  };

  const tabs = [
    { id: 'profile', label: 'Business Profile', icon: Users },
    { id: 'storefront', label: 'Storefront & Sales', icon: Store },
    { id: 'whatsapp', label: 'WhatsApp API', icon: MessageSquare },
  ];

  return (
    <div className="space-y-6">
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
        <div>
          <h1 className="text-2xl font-bold text-slate-900 leading-tight tracking-tight">System Settings</h1>
          <p className="text-slate-500 text-sm">Configure your brand identity and secure integrations.</p>
        </div>
        <div className="flex gap-2">
          <button 
            onClick={onLogout}
            className="flex items-center gap-2 px-4 py-2 border border-slate-200 rounded-xl text-slate-600 hover:bg-slate-100 transition-colors font-bold text-xs uppercase tracking-widest"
          >
            <LogOut size={14} /> Sign Out
          </button>
          <button 
            onClick={handleSave}
            className="bg-slate-900 text-white px-6 py-2 rounded-xl text-xs font-bold uppercase tracking-widest hover:bg-slate-800 transition-all shadow-lg shadow-slate-900/10"
          >
            Save Changes
          </button>
        </div>
      </div>

      <div className="flex flex-col lg:flex-row gap-8">
        {/* Navigation Sidebar */}
        <div className="lg:w-64 space-y-1">
          {tabs.map((tab) => (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id as any)}
              className={cn(
                "w-full flex items-center gap-3 px-4 py-3 rounded-xl transition-all text-left group",
                activeTab === tab.id 
                  ? "bg-white text-slate-900 font-bold shadow-sm border border-slate-200" 
                  : "text-slate-500 hover:bg-slate-200/50"
              )}
            >
              <tab.icon size={18} className={cn(activeTab === tab.id ? "text-sky-500" : "text-slate-400")} />
              <span className="text-sm tracking-tight">{tab.label}</span>
            </button>
          ))}
        </div>

        {/* Content Area */}
        <div className="flex-1">
          <Card className="p-8">
            <AnimatePresence mode="wait">
              {activeTab === 'profile' && (
                <motion.div 
                  key="profile"
                  initial={{ opacity: 0, x: 10 }}
                  animate={{ opacity: 1, x: 0 }}
                  exit={{ opacity: 0, x: -10 }}
                  className="space-y-6"
                >
                  <h3 className="text-xs font-black text-slate-400 uppercase tracking-widest pb-4 border-b border-slate-100 flex items-center gap-2">
                    <Users size={14} /> Brand Identity
                  </h3>
                  
                  <div className="flex flex-col md:flex-row gap-6 items-center bg-slate-50/50 border border-slate-150 p-6 rounded-2xl">
                    <div className="relative shrink-0 group">
                      <div className="w-24 h-24 rounded-full bg-white border border-slate-200 overflow-hidden flex items-center justify-center transition-all group-hover:ring-4 group-hover:ring-sky-500/10 shadow-md">
                        {localBusiness.logo ? (
                          <img src={localBusiness.logo} alt="Business logo" className="w-full h-full object-cover" referrerPolicy="no-referrer" />
                        ) : (
                          <span className="text-3xl font-black text-slate-400 capitalize">{(localBusiness.name || 'S')[0]}</span>
                        )}
                      </div>
                      {localBusiness.logo && (
                        <button
                          type="button"
                          onClick={() => {
                            setLocalBusiness(prev => ({ ...prev, logo: '' }));
                            showToast?.("Logo cleared. Save changes to apply.", "info");
                          }}
                          className="absolute -top-1 -right-1 bg-red-500 text-white p-1.5 rounded-full hover:bg-red-600 transition-colors shadow-lg shadow-red-500/20 hover:scale-110 active:scale-95 cursor-pointer z-10"
                          title="Remove Image"
                        >
                          <Trash2 size={12} />
                        </button>
                      )}
                    </div>

                    <div className="flex-1 w-full space-y-2">
                      <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest pl-1 block">Business Logo / Profile Image</label>
                      <div 
                        onDragOver={(e) => { e.preventDefault(); setIsDraggingLogo(true); }}
                        onDragLeave={() => setIsDraggingLogo(false)}
                        onDrop={handleLogoDrop}
                        onClick={() => logoInputRef.current?.click()}
                        className={cn(
                          "border border-dashed rounded-xl p-6 text-center cursor-pointer transition-all flex flex-col items-center justify-center bg-white hover:border-sky-500 hover:bg-sky-50/20",
                          isDraggingLogo ? "border-sky-500 bg-sky-50/35" : "border-slate-200"
                        )}
                      >
                        <UploadCloud size={24} className={cn("transition-colors", isDraggingLogo ? "text-sky-500" : "text-slate-400")} />
                        <p className="text-xs font-bold text-slate-700 tracking-tight mt-1">
                          Drag and drop your logo, or <span className="text-sky-500 hover:underline">browse</span>
                        </p>
                        <p className="text-[10px] text-slate-400 mt-0.5">Supports PNG, JPG, or GIF (max 2MB)</p>
                        <input 
                          type="file"
                          ref={logoInputRef}
                          onChange={(e) => {
                            const file = e.target.files?.[0];
                            if (file) handleLogoUpload(file);
                          }}
                          accept="image/*"
                          className="hidden"
                        />
                      </div>
                    </div>
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    <div className="space-y-2">
                      <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest block pl-1">Business Name</label>
                      <input 
                        type="text" 
                        value={localBusiness.name}
                        onChange={(e) => setLocalBusiness({...localBusiness, name: e.target.value})}
                        className="w-full bg-slate-50 border border-slate-200 p-3 rounded-xl text-sm font-bold focus:ring-2 focus:ring-sky-500/20 outline-none"
                      />
                    </div>
                    <div className="space-y-2">
                      <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest block pl-1">Or Paste Direct Logo URL</label>
                      <input 
                        type="text" 
                        value={localBusiness.logo || ''}
                        onChange={(e) => setLocalBusiness({...localBusiness, logo: e.target.value})}
                        placeholder="https://..."
                        className="w-full bg-slate-50 border border-slate-200 p-3 rounded-xl text-sm focus:ring-2 focus:ring-sky-500/20 outline-none"
                      />
                    </div>
                  </div>

                  <div className="space-y-2">
                    <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest block pl-1">Business Description</label>
                    <textarea 
                      value={localBusiness.description}
                      onChange={(e) => setLocalBusiness({...localBusiness, description: e.target.value})}
                      rows={4}
                      className="w-full bg-slate-50 border border-slate-200 p-3 rounded-xl text-sm leading-relaxed focus:ring-2 focus:ring-sky-500/20 outline-none resize-none"
                    />
                  </div>
                </motion.div>
              )}

              {activeTab === 'storefront' && (
                <motion.div 
                  key="storefront"
                  initial={{ opacity: 0, x: 10 }}
                  animate={{ opacity: 1, x: 0 }}
                  exit={{ opacity: 0, x: -10 }}
                  className="space-y-8"
                >
                  <h3 className="text-xs font-black text-slate-400 uppercase tracking-widest pb-4 border-b border-slate-100 flex items-center gap-2">
                    <Store size={14} /> Storefront Configuration
                  </h3>

                  <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    <div className="space-y-2">
                      <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest block pl-1">Store URL Subdomain</label>
                      <div className="flex items-center bg-slate-50 border border-slate-200 rounded-xl overflow-hidden focus-within:ring-2 focus-within:ring-sky-500/20">
                        <input 
                          type="text" 
                          value={localBusiness.storeSlug}
                          onChange={(e) => setLocalBusiness({...localBusiness, storeSlug: e.target.value})}
                          className="flex-1 bg-transparent p-3 text-sm font-bold outline-none text-right"
                          placeholder="yourstore"
                        />
                        <span className="px-3 py-3 text-[10px] font-bold text-slate-400 bg-slate-100 border-l border-slate-200">.mysellflow.store</span>
                      </div>
                    </div>
                    <div className="space-y-2">
                      <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest block pl-1">Storefront Currency</label>
                      <select 
                        value={localBusiness.currency}
                        onChange={(e) => setLocalBusiness({...localBusiness, currency: e.target.value})}
                        className="w-full bg-slate-50 border border-slate-200 p-3 rounded-xl text-sm font-bold outline-none"
                      >
                        <option value="NGN">Nigerian Naira (NGN)</option>
                        <option value="USD">US Dollar (USD)</option>
                        <option value="GHS">Ghanaian Cedi (GHS)</option>
                        <option value="KES">Kenyan Shilling (KES)</option>
                      </select>
                    </div>
                  </div>

                  {/* Share and Save Store Link Section */}
                  <div className="bg-slate-50 border border-slate-100 p-5 rounded-2xl space-y-4">
                    <div>
                      <h4 className="text-xs font-black text-slate-900 uppercase tracking-widest flex items-center gap-2">
                        <ExternalLink size={14} className="text-sky-500" /> Save & Share Your Storefront
                      </h4>
                      <p className="text-[10px] text-slate-500 mt-1">
                        Use these quick links to share your catalog with potential buyers across messaging/social platforms.
                      </p>
                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                      {/* Subdomain URL */}
                      <div className="bg-white border border-slate-200/60 p-4 rounded-xl space-y-2 flex flex-col justify-between">
                        <div>
                          <span className="text-[9px] font-black tracking-widest text-[#5B2FD4] uppercase flex items-center gap-1">
                            <span>Active Storefront URL</span>
                          </span>
                          <p className="text-[8px] text-slate-400 leading-normal mb-1">
                            Your official secure storefront URL. This handles paths, add-to-carts, payments, and invoices instantly.
                          </p>
                          <p className="text-xs font-mono font-bold text-slate-800 select-all leading-relaxed truncate">
                            {(localBusiness.storeSlug || 'shop').toLowerCase().trim()}.mysellflow.store
                          </p>
                        </div>
                        <div className="flex gap-2 pt-2 border-t border-slate-100 mt-2">
                          <button
                            type="button"
                            onClick={async () => {
                              const subdomain = `${(localBusiness.storeSlug || 'shop').toLowerCase().trim()}.mysellflow.store`;
                              try {
                                await navigator.clipboard.writeText(subdomain);
                                if (showToast) showToast("Storefront link copied!", "success");
                              } catch (e) {
                                console.error(e);
                              }
                            }}
                            className="flex-1 flex items-center justify-center gap-1.5 py-1.5 bg-violet-50 hover:bg-violet-100 border border-violet-100 text-[#5B2FD4] rounded-lg text-[10px] font-black uppercase tracking-wider transition-all"
                          >
                            <Copy size={11} /> Copy
                          </button>
                          <button
                            type="button"
                            onClick={() => {
                              const subdomain = `${(localBusiness.storeSlug || 'shop').toLowerCase().trim()}.mysellflow.store`;
                              window.open(`https://${subdomain}`, '_blank');
                            }}
                            className="flex-1 flex items-center justify-center gap-1.5 py-1.5 bg-slate-900 hover:bg-slate-800 text-white rounded-lg text-[10px] font-black uppercase tracking-wider transition-all"
                          >
                            <ExternalLink size={11} /> Open
                          </button>
                        </div>
                      </div>

                      {/* Share to WhatsApp */}
                      <div className="bg-white border border-slate-200/60 p-4 rounded-xl space-y-2 flex flex-col justify-between">
                        <div>
                          <span className="text-[9px] font-black tracking-widest text-slate-400 uppercase">WhatsApp Share Hub</span>
                          <p className="text-[8px] text-slate-400 leading-normal mb-1">
                            Quickly share your clean brand web address directly with your WhatsApp customers.
                          </p>
                          <p className="text-xs font-mono font-bold text-slate-800 select-all leading-relaxed truncate">
                            {(localBusiness.storeSlug || 'shop').toLowerCase().trim()}.mysellflow.store
                          </p>
                        </div>
                        <div className="flex gap-2 pt-2 border-t border-slate-100 mt-2">
                          <button
                            type="button"
                            onClick={async () => {
                              const subdomain = `${(localBusiness.storeSlug || 'shop').toLowerCase().trim()}.mysellflow.store`;
                              try {
                                await navigator.clipboard.writeText(subdomain);
                                if (showToast) showToast("WhatsApp link copied!", "success");
                              } catch (e) {
                                console.error(e);
                              }
                            }}
                            className="flex-1 flex items-center justify-center gap-1.5 py-1.5 bg-slate-50 hover:bg-slate-100 border border-slate-200 text-slate-700 rounded-lg text-[10px] font-black uppercase tracking-wider transition-all"
                          >
                            <Copy size={11} /> Copy
                          </button>
                          <button
                            type="button"
                            onClick={() => {
                              const subdomain = `${(localBusiness.storeSlug || 'shop').toLowerCase().trim()}.mysellflow.store`;
                              const message = `Check out my storefront on mysellflow! Browse and order directly: ${subdomain}`;
                              window.open(`https://wa.me/?text=${encodeURIComponent(message)}`, '_blank');
                            }}
                            className="flex-1 flex items-center justify-center gap-1.5 py-1.5 bg-emerald-50 text-emerald-700 hover:bg-emerald-100 border border-emerald-200 rounded-lg text-[10px] font-black uppercase tracking-wider transition-all"
                          >
                            <Share2 size={11} /> WhatsApp
                          </button>
                        </div>
                      </div>

                      {/* Local Sandbox Testing Link */}
                      <div className="bg-white border border-slate-200/60 p-4 rounded-xl space-y-2 flex flex-col justify-between">
                        <div>
                          <span className="text-[9px] font-black tracking-widest text-violet-600 uppercase flex items-center gap-1">
                            <span>Sandbox Preview Link</span>
                          </span>
                          <p className="text-[8px] text-slate-400 leading-normal mb-1">
                            For previewing your store styles directly inside the secure AI Studio iframe/development workflow using sandbox query parameter mapping.
                          </p>
                          <p className="text-xs font-mono font-bold text-slate-800 select-all leading-relaxed truncate">
                            {window.location.host}/?store={localBusiness.storeSlug || 'shop'}
                          </p>
                        </div>
                        <div className="flex gap-2 pt-2 border-t border-slate-100 mt-2">
                          <button
                            type="button"
                            onClick={async () => {
                              const link = `${window.location.protocol}//${window.location.host}/?store=${localBusiness.storeSlug || 'shop'}`;
                              try {
                                await navigator.clipboard.writeText(link);
                                if (showToast) showToast("Sandbox preview link copied!", "success");
                              } catch (e) {
                                console.error(e);
                              }
                            }}
                            className="flex-1 flex items-center justify-center gap-1.5 py-1.5 bg-violet-50 hover:bg-violet-100 border border-violet-100 text-violet-700 rounded-lg text-[10px] font-black uppercase tracking-wider transition-all"
                          >
                            <Copy size={11} /> Copy
                          </button>
                          <button
                            type="button"
                            onClick={() => {
                              const link = `${window.location.protocol}//${window.location.host}/?store=${localBusiness.storeSlug || 'shop'}`;
                              window.open(link, '_blank');
                            }}
                            className="flex-1 flex items-center justify-center gap-1.5 py-1.5 bg-slate-900 hover:bg-slate-800 text-white rounded-lg text-[10px] font-black uppercase tracking-wider transition-all"
                          >
                            <ExternalLink size={11} /> Open
                          </button>
                        </div>
                      </div>
                    </div>
                  </div>

                  <div className="pt-6 border-t border-slate-100">
                    <h4 className="text-[10px] font-black text-slate-900 uppercase tracking-widest mb-4">Search Engine Optimization (SEO)</h4>
                    <div className="grid grid-cols-1 gap-6">
                      <div className="space-y-2">
                        <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest block pl-1">Meta Title</label>
                        <input 
                          type="text" 
                          value={localBusiness.metaTitle || ''}
                          onChange={(e) => setLocalBusiness({...localBusiness, metaTitle: e.target.value})}
                          placeholder="e.g. Best Handmade Fabrics in Lagos | MyShop"
                          className="w-full bg-slate-50 border border-slate-200 p-3 rounded-xl text-sm focus:ring-2 focus:ring-sky-500/20 outline-none"
                        />
                        <p className="text-[10px] text-slate-400 italic">Recommended length: 50-60 characters.</p>
                      </div>
                      <div className="space-y-2">
                        <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest block pl-1">Meta Description</label>
                        <textarea 
                          value={localBusiness.metaDescription || ''}
                          onChange={(e) => setLocalBusiness({...localBusiness, metaDescription: e.target.value})}
                          rows={3}
                          placeholder="Describe your shop for Google search results..."
                          className="w-full bg-slate-50 border border-slate-200 p-3 rounded-xl text-sm leading-relaxed focus:ring-2 focus:ring-sky-500/20 outline-none resize-none"
                        />
                        <p className="text-[10px] text-slate-400 italic">Recommended length: 150-160 characters.</p>
                      </div>
                    </div>
                  </div>

                  <div className="space-y-2">
                    <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest block pl-1">Public WhatsApp Number (for Storefront)</label>
                    <input 
                      type="tel" 
                      value={localBusiness.whatsappNumber}
                      onChange={(e) => setLocalBusiness({...localBusiness, whatsappNumber: e.target.value})}
                      placeholder="e.g. 2348012345678"
                      className="w-full bg-slate-50 border border-slate-200 p-3 rounded-xl text-sm font-mono focus:ring-2 focus:ring-sky-500/20 outline-none"
                    />
                    <p className="text-[10px] text-slate-400 italic">This number will be used when customers click "Contact Seller" on your public store.</p>
                  </div>

                  <div className="p-4 bg-sky-50 rounded-2xl border border-sky-100 flex items-center justify-between">
                    <div>
                      <h4 className="text-sm font-bold text-slate-900">Verified Seller Status</h4>
                      <p className="text-[10px] text-slate-500 mt-0.5">Build trust with a blue verification badge on your profile.</p>
                    </div>
                    <button 
                      onClick={() => setLocalBusiness({...localBusiness, isVerified: !localBusiness.isVerified})}
                      className={cn(
                        "w-12 h-6 rounded-full transition-colors relative flex items-center px-1",
                        localBusiness.isVerified ? "bg-sky-500" : "bg-slate-300"
                      )}
                    >
                      <motion.div 
                        animate={{ x: localBusiness.isVerified ? 24 : 0 }}
                        className="w-4 h-4 bg-white rounded-full shadow-md"
                      />
                    </button>
                  </div>
                </motion.div>
              )}

              {activeTab === 'whatsapp' && (
                <motion.div 
                  key="whatsapp"
                  initial={{ opacity: 0, x: 10 }}
                  animate={{ opacity: 1, x: 0 }}
                  exit={{ opacity: 0, x: -10 }}
                  className="space-y-6"
                >
                  <h3 className="text-xs font-black text-slate-400 uppercase tracking-widest pb-4 border-b border-slate-100 flex items-center gap-2">
                    <MessageSquare size={14} /> WhatsApp Business API (Integration)
                  </h3>

                  <div className="p-4 bg-emerald-50 rounded-2xl border border-emerald-100 mb-6">
                    <p className="text-xs text-emerald-800 leading-relaxed font-medium">
                      Setup your Meta App to enable high-volume direct messaging. These credentials are required to send messages directly from the mysellflow dashboard.
                    </p>
                  </div>

                  <div className="space-y-4">
                    <div className="space-y-2">
                      <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest block pl-1">Permanent Access Token</label>
                      <input 
                        type="password" 
                        value={localBusiness.whatsappToken || ''}
                        onChange={(e) => setLocalBusiness({...localBusiness, whatsappToken: e.target.value})}
                        className="w-full bg-slate-50 border border-slate-200 p-3 rounded-xl text-xs font-mono focus:ring-2 focus:ring-emerald-500/20 outline-none"
                      />
                    </div>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      <div className="space-y-2">
                        <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest block pl-1">Phone Number ID</label>
                        <input 
                          type="text" 
                          value={localBusiness.whatsappPhoneId || ''}
                          onChange={(e) => setLocalBusiness({...localBusiness, whatsappPhoneId: e.target.value})}
                          className="w-full bg-slate-50 border border-slate-200 p-3 rounded-xl text-xs font-mono focus:ring-2 focus:ring-emerald-500/20 outline-none"
                        />
                      </div>
                      <div className="space-y-2">
                        <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest block pl-1">Business Account ID</label>
                        <input 
                          type="text" 
                          value={localBusiness.whatsappBusinessAccountId || ''}
                          onChange={(e) => setLocalBusiness({...localBusiness, whatsappBusinessAccountId: e.target.value})}
                          className="w-full bg-slate-50 border border-slate-200 p-3 rounded-xl text-xs font-mono focus:ring-2 focus:ring-emerald-500/20 outline-none"
                        />
                      </div>
                    </div>
                  </div>
                </motion.div>
              )}
            </AnimatePresence>
          </Card>
        </div>
      </div>
    </div>
  );
};

// Helper to identify if a path is a storefront slug in routing
const isStorefrontSlug = (path: string): boolean => {
  if (!path) return false;
  if (path.includes('.')) return false;
  const reserved = ['assets', 'api', 'dashboard', 'products', 'leads', 'followups', 'orders', 'reviews', 'settings', 'index.html', 'explore', 'store'];
  if (reserved.includes(path.toLowerCase())) return false;
  return /^[a-zA-Z0-9_\-]+$/.test(path);
};

// Helper to resolve storefront slug via subdomain, sandbox query parameter, or pathname
const resolveStorefrontSlug = (): string | null => {
  // 1. Allow testing on localhost and run.app environments via a URL query parameter (?store=joyfashion)
  const urlParams = new URLSearchParams(window.location.search);
  const testStore = urlParams.get('store') || urlParams.get('preview');
  if (testStore) {
    const cleanTest = testStore.toLowerCase().trim();
    if (isStorefrontSlug(cleanTest)) {
      return cleanTest;
    }
  }

  const pathname = window.location.pathname.replace(/^\/+|\/+$/g, '').toLowerCase().trim();

  // Support /store/[storeSlug] path
  if (pathname.startsWith('store/')) {
    const slugPart = pathname.substring(6).split('/')[0].trim();
    if (isStorefrontSlug(slugPart)) {
      return slugPart;
    }
  }

  // 2. Extract subdomain on custom domain
  const host = window.location.hostname.toLowerCase().trim();
  const hostWithoutPort = host.split(':')[0];
  
  const mainDomain = "mysellflow.store";
  if (hostWithoutPort.endsWith(mainDomain)) {
    const sIndex = hostWithoutPort.lastIndexOf(mainDomain);
    const subPart = hostWithoutPort.substring(0, sIndex);
    const cleanSub = subPart.replace(/\.$/, '').trim();
    
    if (cleanSub) {
      // Check reserved
      const reserved = ['www', 'admin', 'api', 'app', 'sales', 'dashboard', 'support', 'mail', 'blog'];
      if (!reserved.includes(cleanSub) && isStorefrontSlug(cleanSub)) {
        return cleanSub;
      }
    }
  }
  
  // 3. Support subdomains on localhost for local developer testing (e.g. joyasfashion.localhost:3000)
  if (hostWithoutPort.endsWith('localhost') || hostWithoutPort.includes('127.0.0.1')) {
    const parts = hostWithoutPort.split('.');
    if (parts.length > 1) {
      const sub = parts[0].trim();
      const reserved = ['www', 'admin', 'api', 'localhost'];
      if (!reserved.includes(sub) && isStorefrontSlug(sub)) {
        return sub;
      }
    }
  }

  // 4. Fallback to path-based storefront slug (e.g. `sellflow-*.run.app/Akwah` or `mysellflow.store/joysfashion`)
  const firstPathSegment = pathname.split('/')[0];
  const reservedPaths = [
    'www', 'admin', 'api', 'app', 'sales', 'dashboard', 'support', 'mail', 'blog', 'localhost',
    'explore', 'settings', 'signin', 'signup', 'orders', 'leads', 'products', 'reviews', 'followups', 'store', 'verification', 'auth', ''
  ];
  if (!reservedPaths.includes(firstPathSegment) && isStorefrontSlug(firstPathSegment)) {
    return firstPathSegment;
  }

  return null;
};

const StorefrontPreview = ({ 
  business, 
  products, 
  reviews, 
  onAddReview, 
  onStoreLead,
  isPreview = false
}: { 
  business: BusinessProfile, 
  products: Product[], 
  reviews: Review[], 
  onAddReview: (r: any) => void, 
  onStoreLead: (name: string, phone: string, interest: string, amount?: number) => void,
  isPreview?: boolean
}) => {
  const isPublicRoute = resolveStorefrontSlug() !== null;
  const activePreviewMode = isPreview && !isPublicRoute;

  const trackEngagementClick = async (type: 'message_merchant' | 'whatsapp_order') => {
    if (isPreview) return;
    try {
      const field = type === 'message_merchant' ? 'clicksMessageMerchant' : 'clicksWhatsAppOrder';
      await updateDoc(doc(db, 'businesses', business.ownerId), {
        [field]: increment(1)
      });
      console.log(`Successfully recorded engagement click: ${type}`);
    } catch (err) {
      console.error(`Failed to record click for ${type}:`, err);
    }
  };

  const [isInquiryOpen, setIsInquiryOpen] = useState(false);
  const [selectedProduct, setSelectedProduct] = useState<Product | null>(null);
  const [name, setName] = useState('');
  const [phone, setPhone] = useState('');
  
  const [reviewName, setReviewName] = useState('');
  const [reviewRating, setReviewRating] = useState(5);
  const [reviewComment, setReviewComment] = useState('');
  const [showReviewForm, setShowReviewForm] = useState(false);

  const [selectedCategory, setSelectedCategory] = useState<string>('All');
  const [searchQuery, setSearchQuery] = useState<string>('');

  const [favorites, setFavorites] = useState<string[]>(() => {
    try {
      const storageKey = `storefront_favs_${business.storeSlug || business.ownerId || 'default'}`;
      const saved = localStorage.getItem(storageKey);
      return saved ? JSON.parse(saved) : [];
    } catch {
      return [];
    }
  });

  const toggleFavorite = (productId: string, e: React.MouseEvent) => {
    e.stopPropagation();
    setFavorites(prev => {
      const isFav = prev.includes(productId);
      const updated = isFav ? prev.filter(id => id !== productId) : [...prev, productId];
      const storageKey = `storefront_favs_${business.storeSlug || business.ownerId || 'default'}`;
      localStorage.setItem(storageKey, JSON.stringify(updated));
      
      const pFound = products.find(p => p.id === productId);
      if (pFound) {
        showStoreToast(isFav ? `Removed from wishlist.` : `Heart added to wishlist!`, 'success');
      }
      return updated;
    });
  };

  const [storeToast, setStoreToast] = useState<{ message: string; type: 'success' | 'error' | 'info' } | null>(null);
  const showStoreToast = (message: string, type: 'success' | 'error' | 'info' = 'success') => {
    setStoreToast({ message, type });
  };
  useEffect(() => {
    if (storeToast) {
      const timer = setTimeout(() => setStoreToast(null), 3000);
      return () => clearTimeout(timer);
    }
  }, [storeToast]);

  const [cart, setCart] = useState<{product: Product, quantity: number}[]>(() => {
    try {
      const storageKey = `storefront_cart_${business.storeSlug || business.ownerId || 'default'}`;
      const saved = localStorage.getItem(storageKey);
      return saved ? JSON.parse(saved) : [];
    } catch {
      return [];
    }
  });
  const [isCartOpen, setIsCartOpen] = useState(false);

  useEffect(() => {
    const storageKey = `storefront_cart_${business.storeSlug || business.ownerId || 'default'}`;
    localStorage.setItem(storageKey, JSON.stringify(cart));
  }, [cart, business.storeSlug, business.ownerId]);

  const addToCart = (product: Product, e?: React.MouseEvent) => {
    if (e) e.stopPropagation();
    setCart(prev => {
      const existing = prev.find(item => item.product.id === product.id);
      if (existing) {
        return prev.map(item => item.product.id === product.id ? { ...item, quantity: item.quantity + 1 } : item);
      }
      return [...prev, { product, quantity: 1 }];
    });
    showStoreToast(`Added "${product.name}" to cart.`);
  };

  const updateCartQty = (productId: string, delta: number) => {
    setCart(prev => prev.map(item => {
      if (item.product.id === productId) {
        return { ...item, quantity: Math.max(0, item.quantity + delta) };
      }
      return item;
    }).filter(item => item.quantity > 0));
  };

  // SEO Updates
  useEffect(() => {
    const originalTitle = document.title;
    if (business.metaTitle) {
      document.title = business.metaTitle;
    } else {
      document.title = `${business.name} | Storefront`;
    }

    if (business.metaDescription) {
      let metaDesc = document.querySelector('meta[name="description"]');
      if (!metaDesc) {
        metaDesc = document.createElement('meta');
        metaDesc.setAttribute('name', 'description');
        document.head.appendChild(metaDesc);
      }
      metaDesc.setAttribute('content', business.metaDescription);
    }
    
    return () => {
      document.title = originalTitle;
    };
  }, [business.metaTitle, business.metaDescription, business.name]);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (name && phone) {
      trackEngagementClick('whatsapp_order');
      if (!selectedProduct && cart.length > 0) {
        const cartTotal = cart.reduce((sum, item) => sum + (item.product.price * item.quantity), 0);
        let message = `Hello! I want to place an order. My name is ${name}.\n\nOrder Details:\n`;
        cart.forEach(item => {
          message += `- ${item.quantity}x ${item.product.name} (${formatCurrency(item.product.price, business.currency)} each)\n`;
        });
        message += `\nTotal: ${formatCurrency(cartTotal, business.currency)}\n\nPlease let me know how to make payments.`;
        
        onStoreLead(name, phone, `Cart Checkout (${cart.length} items)`, cartTotal);
        const waUrl = `https://wa.me/${business.whatsappNumber.replace(/[^0-9]/g, '')}?text=${encodeURIComponent(message)}`;
        window.open(waUrl, '_blank');
        
        setCart([]);
        setIsInquiryOpen(false);
      } else {
        onStoreLead(name, phone, selectedProduct?.name || 'General Store Inquiry', selectedProduct?.price || 0);
        
        let message = "";
        if (selectedProduct) {
          const priceText = selectedProduct.price > 0 ? ` for ${formatCurrency(selectedProduct.price, business.currency)}` : '';
          message = `Hello! I want to buy this product: *${selectedProduct.name}*${priceText}. My name is ${name}. Please let me know how to make payments.`;
        } else {
          message = `Hello! I'm interested in your store. My name is ${name}.`;
        }
        
        const waUrl = `https://wa.me/${business.whatsappNumber.replace(/[^0-9]/g, '')}?text=${encodeURIComponent(message)}`;
        window.open(waUrl, '_blank');
        
        setIsInquiryOpen(false);
      }
      
      setName('');
      setPhone('');
      setSelectedProduct(null);
    }
  };

  const handleReviewSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (reviewName && reviewComment && selectedProduct) {
      onAddReview({
        productId: selectedProduct.id,
        customerName: reviewName,
        rating: reviewRating,
        comment: reviewComment
      });
      setReviewName('');
      setReviewComment('');
      setReviewRating(5);
      setShowReviewForm(false);
      showStoreToast("Thanks for your review!", "success");
    }
  };

  const productReviews = selectedProduct ? reviews.filter(r => r.productId === selectedProduct.id) : [];
  const averageRating = productReviews.length > 0 
    ? (productReviews.reduce((sum, r) => sum + r.rating, 0) / productReviews.length).toFixed(1)
    : null;

  // Filter products based on search query & category type
  const filteredProducts = useMemo(() => {
    return products.filter(product => {
      let matchesCategory = true;
      if (selectedCategory === 'Best Sellers') {
        matchesCategory = !!product.isBestSeller;
      } else if (selectedCategory === 'New Arrivals') {
        matchesCategory = !!product.isNewArrival;
      } else if (selectedCategory === 'Promotions') {
        matchesCategory = !!product.isPromotion;
      } else if (selectedCategory !== 'All') {
        matchesCategory = product.type.toLowerCase() === selectedCategory.toLowerCase();
      }
      
      const matchesSearch = product.name.toLowerCase().includes(searchQuery.toLowerCase()) || 
                            product.description.toLowerCase().includes(searchQuery.toLowerCase());
      return matchesCategory && matchesSearch;
    });
  }, [products, selectedCategory, searchQuery]);

  // -- BRANCH 1: SMARTPHONE PREVIEW VIEW (for Dashboard Inline Preview) --
  if (activePreviewMode) {
    return (
      <div className="max-w-md mx-auto bg-white min-h-[80vh] shadow-2xl rounded-[3rem] border-[8px] border-slate-900 overflow-hidden flex flex-col relative">
        {/* Phone Header */}
        <div className="h-14 bg-slate-900 flex items-center justify-center pt-4 shrink-0">
          <div className="w-24 h-6 bg-slate-950 rounded-full" />
        </div>
        
        <div className="flex-1 overflow-y-auto no-scrollbar">
          {/* Storefront Header */}
          <div className="absolute top-14 left-0 right-0 p-4 flex justify-between items-center z-10">
            <div className="bg-white/80 backdrop-blur-md rounded-full px-3 py-1.5 shadow-sm text-xs font-bold text-slate-800 flex items-center gap-2">
              <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse"></span>
              Online
            </div>
            <button 
              className="w-10 h-10 bg-white/80 backdrop-blur-md rounded-full flex items-center justify-center shadow-sm text-slate-800 relative cursor-pointer hover:bg-white"
              onClick={() => setIsCartOpen(true)}
            >
              <ShoppingCart size={18} />
              {cart.length > 0 && (
                <div className="absolute -top-1 -right-1 bg-red-500 text-white text-[10px] font-black w-4 h-4 rounded-full flex items-center justify-center">
                  {cart.reduce((sum, item) => sum + item.quantity, 0)}
                </div>
              )}
            </button>
          </div>

          {/* Business Hero */}
          <div className="p-8 pb-10 bg-slate-900 text-white text-center">
            <div className="relative w-24 h-24 mx-auto mb-4">
              <div className="w-full h-full bg-white rounded-3xl overflow-hidden flex items-center justify-center font-black text-3xl shadow-2xl border-4 border-slate-800">
                {business.logo ? (
                  <img src={business.logo} alt={business.name} className="w-full h-full object-cover" referrerPolicy="no-referrer" />
                ) : (
                  <div className="w-full h-full bg-sky-500 flex items-center justify-center text-white">
                    {(business.name || 'S')[0]}
                  </div>
                )}
              </div>
              {/* Verified Badge */}
              {business.isVerified && (
                <div className="absolute -right-2 -bottom-2 w-8 h-8 bg-sky-500 rounded-full border-4 border-slate-900 flex items-center justify-center text-white shadow-lg">
                  <CheckCircle2 size={16} fill="currentColor" className="text-white" />
                </div>
              )}
            </div>
            <div className="flex items-center justify-center gap-2 mb-2">
              <h2 className="text-2xl font-bold uppercase tracking-tighter italic">{business.name}</h2>
              {business.isVerified && <CheckCircle2 size={20} className="text-sky-500 fill-sky-500 text-white" />}
            </div>
            <p className="text-slate-400 text-xs leading-relaxed max-w-[220px] mx-auto italic serif">{business.description}</p>
          </div>

          {/* Categories */}
          <div className="flex gap-2 p-4 overflow-x-auto no-scrollbar">
            {['All', 'Best Sellers', 'New Arrivals', 'Promotions', 'physical', 'digital', 'service'].map((catType) => (
              <button 
                key={catType}
                onClick={() => setSelectedCategory(catType)}
                className={cn(
                  "px-4 py-1.5 rounded-full text-xs font-bold whitespace-nowrap transition-colors",
                  (selectedCategory === catType)
                    ? "bg-slate-900 text-white"
                    : "bg-slate-100 text-slate-600 border border-slate-200"
                )}
              >
                {catType === 'All' ? 'All' : catType === 'physical' ? 'Physical' : catType === 'digital' ? 'Digital' : catType === 'service' ? 'Service' : catType}
              </button>
            ))}
          </div>

          {/* Listing */}
          <div className="grid grid-cols-2 gap-2 p-2 bg-slate-50">
            {filteredProducts.map(product => {
              const prodReviews = reviews.filter(r => r.productId === product.id);
              const rating = prodReviews.length > 0 ? (prodReviews.reduce((sum, r) => sum + r.rating, 0) / prodReviews.length).toFixed(1) : null;
              const discount = product.originalPrice && product.originalPrice > product.price 
                ? Math.round(((product.originalPrice - product.price) / product.originalPrice) * 100) 
                : null;
              
              return (
                <div key={product.id} className="bg-white rounded-md hover:shadow-md transition-shadow relative flex flex-col group cursor-pointer border border-slate-100" onClick={() => {
                  setSelectedProduct(product);
                  setIsInquiryOpen(true);
                }}>
                  <div className="aspect-square bg-white flex items-center justify-center relative overflow-hidden rounded-t-md p-1">
                    {/* Tags overlay at top-left */}
                    <div className="absolute top-1.5 left-1.5 flex flex-col gap-0.5 z-10 items-start pointer-events-none">
                      {product.isBestSeller && (
                        <span className="bg-amber-500 text-[6px] font-black uppercase text-white px-1 py-0.5 rounded shadow-sm tracking-wider">
                          ★ Best Seller
                        </span>
                      )}
                      {product.isNewArrival && (
                        <span className="bg-sky-500 text-[6px] font-black uppercase text-white px-1 py-0.5 rounded shadow-sm tracking-wider">
                          ✦ New
                        </span>
                      )}
                      {product.isPromotion && (
                        <span className="bg-rose-500 text-[6px] font-black uppercase text-white px-1 py-0.5 rounded shadow-sm tracking-wider">
                          % Promo
                        </span>
                      )}
                      {product.inventoryStatus === 'out_of_stock' && (
                        <span className="bg-rose-600 text-[6px] font-black uppercase text-white px-1 py-0.5 rounded shadow-sm tracking-wider animate-pulse">
                          Sold Out
                        </span>
                      )}
                      {product.inventoryStatus === 'low_stock' && (
                        <span className="bg-amber-600 text-[6px] font-black uppercase text-white px-1 py-0.5 rounded shadow-sm tracking-wider">
                          Low Stock
                        </span>
                      )}
                    </div>

                    {product.images && product.images.length > 0 ? (
                      <img src={product.images[0]} className="w-full h-full object-contain group-hover:scale-105 transition-transform" alt={product.name} referrerPolicy="no-referrer" />
                    ) : (
                      <ShoppingBag size={32} strokeWidth={1} className="text-slate-300" />
                    )}
                    {discount && (
                      <div className="absolute top-2 right-2 bg-amber-100 text-amber-700 px-1 py-0.5 rounded text-[10px] font-bold z-10">
                        -{discount}%
                      </div>
                    )}
                    {/* Jumia-style Floating Favorite Button */}
                    <button 
                      onClick={(e) => toggleFavorite(product.id, e)}
                      className="absolute bottom-2 right-2 z-10 w-7 h-7 rounded-full bg-white/95 text-slate-400 hover:text-red-500 flex items-center justify-center shadow-md transition-all active:scale-90 border border-slate-100"
                      title={favorites.includes(product.id) ? "Remove from wishlist" : "Add to wishlist"}
                    >
                      <Heart 
                        size={12} 
                        className={cn(
                          "transition-all duration-200", 
                          favorites.includes(product.id) ? "fill-red-500 text-red-500" : ""
                        )} 
                        strokeWidth={favorites.includes(product.id) ? 0 : 2}
                      />
                    </button>
                  </div>
                  
                  <div className="p-2 flex-1 flex flex-col">
                    <div className="flex justify-between items-start gap-1">
                      <h4 className="text-[11px] sm:text-xs text-slate-800 line-clamp-2 leading-snug mb-1 min-h-[32px]">{product.name}</h4>
                      <button 
                        className={cn("p-1 rounded-full shrink-0 transition-colors hover:bg-slate-50", favorites.includes(product.id) ? "text-red-500" : "text-slate-400")} 
                        onClick={(e) => toggleFavorite(product.id, e)}
                      >
                        <Heart 
                          size={13} 
                          className={cn("transition-all duration-200", favorites.includes(product.id) ? "fill-red-500 text-red-500" : "")} 
                          strokeWidth={favorites.includes(product.id) ? 0 : 2} 
                        />
                      </button>
                    </div>
                    
                    <div className="mt-auto">
                      <p className="text-xs sm:text-sm font-bold text-slate-900 leading-none">{formatCurrency(product.price, business.currency)}</p>
                      {product.originalPrice && product.originalPrice > product.price ? (
                        <p className="text-[10px] text-slate-400 line-through mt-0.5 min-h-[14px]">{formatCurrency(product.originalPrice, business.currency)}</p>
                      ) : (
                        <div className="min-h-[14px] mt-0.5"></div>
                      )}
                      
                      {rating && (
                        <div className="flex items-center gap-1 mt-1 min-h-[12px]">
                          <div className="flex">
                            {[1,2,3,4,5].map(star => (
                              <Star key={star} size={8} className={star <= Number(rating) ? "text-amber-400 fill-amber-400" : "text-slate-200 fill-slate-200"} />
                            ))}
                          </div>
                          <span className="text-[10px] text-slate-500">({prodReviews.length})</span>
                        </div>
                      )}
                      {!rating && (
                         <div className="flex items-center gap-1 mt-1 min-h-[12px]">
                           <div className="flex">
                            {[1,2,3,4,5].map(star => (
                              <Star key={star} size={8} className="text-slate-200 fill-slate-200" />
                            ))}
                          </div>
                          <span className="text-[10px] text-slate-400">(0)</span>
                         </div>
                      )}
                      
                      <button 
                        disabled={product.inventoryStatus === 'out_of_stock'}
                        onClick={(e) => addToCart(product, e)}
                        className={cn(
                          "w-full mt-2 rounded text-[10px] sm:text-xs uppercase font-bold py-1.5 sm:py-2 transition-all shadow-sm tracking-wider",
                          product.inventoryStatus === 'out_of_stock'
                            ? "bg-slate-200 text-slate-400 cursor-not-allowed cursor-default"
                            : "bg-sky-500 hover:bg-sky-600 text-white"
                        )}
                      >
                        {product.inventoryStatus === 'out_of_stock' ? 'Sold Out' : 'Add to Cart'}
                      </button>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        </div>

        {/* Floating Checkout */}
        <div className="p-6 border-top border-slate-100 shrink-0">
          <button 
            onClick={() => {
              setSelectedProduct(null);
              setIsInquiryOpen(true);
            }}
            className="w-full bg-slate-900 text-white py-4 rounded-2xl font-bold flex items-center justify-center gap-2 shadow-xl shadow-slate-900/20 active:scale-95 transition-transform uppercase tracking-widest text-xs"
          >
            <MessageSquare size={16} /> Contact Seller
          </button>
        </div>

        {/* Customer Inquiry Form (Overlay) */}
        <AnimatePresence>
          {isInquiryOpen && (
            activePreviewMode ? (
              <motion.div 
                key="preview-modal"
                initial={{ y: "100%" }}
                animate={{ y: 0 }}
                exit={{ y: "100%" }}
                transition={{ type: "spring", damping: 25, stiffness: 200 }}
                className="absolute inset-0 z-50 bg-white flex flex-col pt-12"
              >
                <div className="p-6 flex justify-between items-center border-b border-slate-100">
                  <div>
                    <h3 className="text-lg font-black text-slate-900 uppercase italic tracking-tighter">{selectedProduct ? 'Order Inquiry' : 'Send Inquiry'}</h3>
                    <p className="text-[10px] text-slate-400 font-bold uppercase tracking-widest">To: {business.name}</p>
                  </div>
                  <button 
                    onClick={() => {
                      setIsInquiryOpen(false);
                      setSelectedProduct(null);
                    }}
                    className="w-10 h-10 bg-slate-100 rounded-full flex items-center justify-center text-slate-500"
                  >
                    <Plus size={20} className="rotate-45" />
                  </button>
                </div>

                <div className="flex-1 overflow-y-auto no-scrollbar pb-20">
                  {/* Product Gallery in Inquiry */}
                  {selectedProduct && (
                    <div className="p-6 space-y-4">
                      <div className="flex gap-2 overflow-x-auto no-scrollbar px-1 pb-2">
                        {selectedProduct.images.map((img, idx) => (
                          <div key={idx} className="w-48 aspect-square shrink-0 rounded-2xl border border-slate-100 overflow-hidden shadow-md">
                            <img src={img} className="w-full h-full object-cover" alt={`${selectedProduct.name} ${idx}`} referrerPolicy="no-referrer" />
                          </div>
                        ))}
                      </div>
                      <div className="bg-sky-50 p-4 rounded-2xl border border-sky-100">
                        <p className="text-[10px] font-black text-sky-600 uppercase tracking-widest mb-1">Inquiry for:</p>
                        <div className="flex justify-between items-center">
                          <p className="text-sm font-bold text-slate-900">{selectedProduct.name}</p>
                          <p className="text-sm font-black text-sky-600">{formatCurrency(selectedProduct.price, business.currency)}</p>
                        </div>
                        <div className="mt-4">
                          <button 
                            type="button"
                            disabled={selectedProduct.inventoryStatus === 'out_of_stock'}
                            onClick={() => {
                              addToCart(selectedProduct);
                              setIsInquiryOpen(false);
                              setIsCartOpen(true);
                            }}
                            className={cn(
                              "w-full py-3 rounded-xl font-bold uppercase tracking-widest text-xs transition-all",
                              selectedProduct.inventoryStatus === 'out_of_stock'
                                ? "bg-slate-200 text-slate-400 cursor-not-allowed cursor-default"
                                : "bg-sky-500 hover:bg-sky-600 text-white shadow-lg shadow-sky-500/20"
                            )}
                          >
                            {selectedProduct.inventoryStatus === 'out_of_stock' ? 'Sold Out / Out of Stock' : 'Add to Cart & Checkout'}
                          </button>
                        </div>
                      </div>
                    </div>
                  )}

                  {selectedProduct && (
                    <div className="px-8 space-y-6">
                      <div className="flex items-center justify-between">
                        <div>
                          <h4 className="text-sm font-bold text-slate-900">Customer Reviews</h4>
                          <p className="text-[10px] text-slate-400 font-bold uppercase tracking-widest leading-none">
                            {productReviews.length} {productReviews.length === 1 ? 'Review' : 'Reviews'}
                          </p>
                        </div>
                        {averageRating && (
                          <div className="flex items-center gap-1 bg-amber-50 text-amber-600 px-2 py-1 rounded-lg text-xs font-bold">
                            <CheckCircle2 size={12} className="fill-amber-600 text-white" />
                            {averageRating}
                          </div>
                        )}
                      </div>

                      <div className="space-y-4">
                        {productReviews.map((review) => (
                          <div key={review.id} className="border-b border-slate-50 pb-4 last:border-0">
                            <div className="flex items-center justify-between mb-1">
                              <p className="text-[10px] font-black text-slate-900 uppercase tracking-tighter italic underline decoration-sky-500">{review.customerName}</p>
                              <div className="flex gap-0.5">
                                {[1, 2, 3, 4, 5].map(star => (
                                  <CheckCircle2 key={star} size={10} className={star <= review.rating ? "text-amber-500 fill-amber-500 text-white" : "text-slate-200"} />
                                ))}
                              </div>
                            </div>
                            <p className="text-xs text-slate-500 leading-relaxed italic">{review.comment}</p>
                          </div>
                        ))}
                        {productReviews.length === 0 && (
                          <p className="text-[10px] text-slate-400 text-center italic serif">No reviews yet. Be the first to leave one!</p>
                        )}
                      </div>

                      {!showReviewForm ? (
                        <button 
                          onClick={() => setShowReviewForm(true)}
                          className="text-[10px] font-black uppercase text-sky-600 tracking-widest hover:underline block mx-auto pt-2"
                        >
                          Write a Review
                        </button>
                      ) : (
                        <form onSubmit={handleReviewSubmit} className="bg-slate-50 p-6 rounded-2xl border border-slate-100 space-y-4">
                          <div className="flex justify-between items-center">
                            <h5 className="text-[10px] font-black text-slate-900 uppercase tracking-widest">Post a Review</h5>
                            <button type="button" onClick={() => setShowReviewForm(false)} className="text-[10px] font-bold text-slate-400 underline italic">Cancel</button>
                          </div>
                          <div className="space-y-2">
                            <label className="text-[8px] font-black text-slate-400 uppercase tracking-widest">Rating</label>
                            <div className="flex gap-2">
                              {[1, 2, 3, 4, 5].map(star => (
                                <button 
                                  key={star} 
                                  type="button" 
                                  onClick={() => setReviewRating(star)}
                                  className={cn(
                                    "w-10 h-10 rounded-xl flex items-center justify-center transition-all",
                                    star <= reviewRating ? "bg-amber-100 text-amber-600" : "bg-white border border-slate-200 text-slate-300"
                                  )}
                                >
                                  {star}
                                </button>
                              ))}
                            </div>
                          </div>
                          <div className="space-y-2">
                            <label className="text-[8px] font-black text-slate-400 uppercase tracking-widest">Name</label>
                            <input 
                              type="text" 
                              value={reviewName}
                              onChange={(e) => setReviewName(e.target.value)}
                              placeholder="Your public name"
                              className="w-full bg-white border border-slate-200 p-2 text-xs rounded-lg focus:outline-none focus:border-slate-900"
                              required
                            />
                          </div>
                          <div className="space-y-2">
                            <label className="text-[8px] font-black text-slate-400 uppercase tracking-widest">Comment</label>
                            <textarea 
                              value={reviewComment}
                              onChange={(e) => setReviewComment(e.target.value)}
                              placeholder="What do you think of this product?"
                              rows={2}
                              className="w-full bg-white border border-slate-200 p-2 text-xs rounded-lg focus:outline-none focus:border-slate-900 resize-none"
                              required
                            />
                          </div>
                          <button 
                            type="submit"
                            className="w-full bg-slate-900 text-white py-3 rounded-xl text-[10px] font-black uppercase tracking-widest shadow-lg shadow-slate-900/10 active:scale-95 transition-transform"
                          >
                            Submit Review
                          </button>
                        </form>
                      )}

                      <div className="pt-8 pb-4 border-t border-slate-100">
                        <h4 className="text-sm font-bold text-slate-900 mb-4">Contact for Purchase</h4>
                      </div>
                    </div>
                  )}

                  <form onSubmit={handleSubmit} className="p-8 space-y-6 pt-2">
                    {!selectedProduct && (
                      <div className="bg-slate-50 p-4 rounded-2xl border border-slate-200">
                        <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-1">Subject:</p>
                        <p className="text-sm font-bold text-slate-900">
                          {isCartOpen && cart.length > 0 ? `Checkout (${cart.length} items)` : 'General Information Inquiry'}
                        </p>
                      </div>
                    )}

                    <div className="space-y-2">
                      <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Your Name</label>
                      <input 
                        type="text" 
                        value={name}
                        onChange={(e) => setName(e.target.value)}
                        placeholder="e.g. Ebuka Okafor"
                        className="w-full border-b-2 border-slate-100 p-2 text-lg font-medium focus:outline-none focus:border-slate-900 transition-colors"
                        required
                      />
                    </div>

                    <div className="space-y-2">
                      <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest">WhatsApp Number</label>
                      <input 
                        type="tel" 
                        value={phone}
                        onChange={(e) => setPhone(e.target.value)}
                        placeholder="e.g. 08123456789"
                        className="w-full border-b-2 border-slate-100 p-2 text-lg font-mono focus:outline-none focus:border-slate-900 transition-colors"
                        required
                      />
                    </div>

                    <div className="pt-8">
                      <button 
                        type="submit"
                        className="w-full bg-emerald-500 text-white py-5 rounded-[2rem] font-black uppercase tracking-widest text-xs shadow-2xl shadow-emerald-500/20 active:scale-95 transition-transform"
                      >
                        Send to WhatsApp
                      </button>
                      <p className="mt-4 text-center text-[10px] text-slate-400 italic serif">
                        This will notify the seller to reach out to you.
                      </p>
                    </div>
                  </form>
                </div>
              </motion.div>
            ) : (
              <div 
                key="real-modal-backdrop"
                className="fixed inset-0 z-50 bg-slate-950/60 backdrop-blur-md flex items-center justify-center p-4 md:p-6"
                onClick={() => {
                  setIsInquiryOpen(false);
                  setSelectedProduct(null);
                }}
              >
                <motion.div 
                  initial={{ scale: 0.95, opacity: 0, y: 15 }}
                  animate={{ scale: 1, opacity: 1, y: 0 }}
                  exit={{ scale: 0.95, opacity: 0, y: 15 }}
                  transition={{ type: "spring", damping: 25, stiffness: 220 }}
                  className="bg-white rounded-3xl w-full max-w-lg shadow-2xl overflow-hidden flex flex-col max-h-[90vh]"
                  onClick={(e) => e.stopPropagation()}
                >
                  <div className="p-6 flex justify-between items-center border-b border-slate-100 bg-white shrink-0">
                    <div>
                      <h3 className="text-md sm:text-lg font-black text-slate-900 uppercase italic tracking-tighter">{selectedProduct ? 'Product Specs & Inquiry' : 'Send Inquiry'}</h3>
                      <p className="text-[9px] text-slate-400 font-bold uppercase tracking-widest">To: {business.name}</p>
                    </div>
                    <button 
                      onClick={() => {
                        setIsInquiryOpen(false);
                        setSelectedProduct(null);
                      }}
                      className="w-9 h-9 bg-slate-50 hover:bg-slate-100 rounded-full flex items-center justify-center text-slate-500 transition-colors shrink-0"
                    >
                      <Plus size={18} className="rotate-45" />
                    </button>
                  </div>

                  <div className="flex-1 overflow-y-auto no-scrollbar p-6 space-y-6">
                    {/* Product Gallery in Inquiry */}
                    {selectedProduct && (
                      <div className="space-y-4">
                        <div className="flex gap-2 overflow-x-auto no-scrollbar pb-1.5 font-sans">
                          {selectedProduct.images && selectedProduct.images.length > 0 ? (
                            selectedProduct.images.map((img, idx) => (
                              <div key={idx} className="w-40 sm:w-48 aspect-square shrink-0 rounded-2xl border border-slate-100 overflow-hidden shadow-sm">
                                <img src={img} className="w-full h-full object-cover" alt={`${selectedProduct.name} ${idx}`} referrerPolicy="no-referrer" />
                              </div>
                            ))
                          ) : (
                            <div className="w-40 sm:w-48 aspect-square shrink-0 rounded-2xl border border-slate-100 bg-slate-50 flex items-center justify-center text-slate-300">
                              <ShoppingBag size={32} />
                            </div>
                          )}
                        </div>
                        
                        <div className="bg-sky-50 p-4 rounded-2xl border border-sky-100">
                          <p className="text-[10px] font-black text-sky-600 uppercase tracking-widest mb-1 font-sans">Inquiry details:</p>
                          <div className="flex justify-between items-center gap-2">
                            <p className="text-xs sm:text-sm font-bold text-slate-900 leading-snug">{selectedProduct.name}</p>
                            <p className="text-xs sm:text-sm font-black text-sky-600 shrink-0">{formatCurrency(selectedProduct.price, business.currency)}</p>
                          </div>
                          <div className="mt-4">
                            <button 
                              type="button"
                              onClick={() => {
                                addToCart(selectedProduct);
                                setIsInquiryOpen(false);
                                setIsCartOpen(true);
                              }}
                              className="w-full bg-sky-500 hover:bg-sky-600 text-white py-3 rounded-xl font-bold uppercase tracking-widest text-[10px] sm:text-xs shadow-md shadow-sky-500/20 active:scale-[0.98] transition-all"
                            >
                              Add to Basket & View checkout
                            </button>
                          </div>
                        </div>

                        {selectedProduct.description && (
                          <div className="border border-slate-100 bg-slate-50/50 p-4 rounded-2xl text-xs text-slate-600 leading-relaxed font-sans">
                            <p className="font-extrabold text-slate-800 uppercase tracking-wider text-[10px] mb-1">Product Description:</p>
                            {selectedProduct.description}
                          </div>
                        )}
                      </div>
                    )}

                    {selectedProduct && (
                      <div className="space-y-6">
                        <div className="flex items-center justify-between border-t border-slate-100 pt-4">
                          <div>
                            <h4 className="text-xs sm:text-sm font-bold text-slate-900">Customer Feedback</h4>
                            <p className="text-[9px] text-slate-400 font-bold uppercase tracking-widest leading-none">
                              {productReviews.length} {productReviews.length === 1 ? 'Review' : 'Reviews'}
                            </p>
                          </div>
                          {averageRating && (
                            <div className="flex items-center gap-1 bg-amber-50 text-amber-600 px-2 py-1 rounded-lg text-xs font-bold">
                              <CheckCircle2 size={12} className="fill-amber-600 text-white" />
                              {averageRating}
                            </div>
                          )}
                        </div>

                        <div className="space-y-4">
                          {productReviews.map((review) => (
                            <div key={review.id} className="border-b border-slate-50 pb-4 last:border-0 font-sans">
                              <div className="flex items-center justify-between mb-1">
                                <p className="text-[10px] font-black text-slate-900 uppercase tracking-tighter italic underline decoration-sky-500">{review.customerName}</p>
                                <div className="flex gap-0.5">
                                  {[1, 2, 3, 4, 5].map(star => (
                                    <CheckCircle2 key={star} size={10} className={star <= review.rating ? "text-amber-500 fill-amber-500 text-white" : "text-slate-200"} />
                                  ))}
                                </div>
                              </div>
                              <p className="text-xs text-slate-500 leading-relaxed italic">{review.comment}</p>
                            </div>
                          ))}
                          {productReviews.length === 0 && (
                            <p className="text-[9px] text-slate-400 text-center italic serif">No reviews yet. Be the first to leave one!</p>
                          )}
                        </div>

                        {!showReviewForm ? (
                          <button 
                            type="button"
                            onClick={() => setShowReviewForm(true)}
                            className="text-[9px] font-black uppercase text-sky-600 tracking-widest hover:underline block mx-auto pt-1 font-sans"
                          >
                            Write a Review
                          </button>
                        ) : (
                          <form onSubmit={handleReviewSubmit} className="bg-slate-50 p-4 sm:p-6 rounded-2xl border border-slate-100 space-y-4 font-sans font-sans">
                            <div className="flex justify-between items-center">
                              <h5 className="text-[9px] font-black text-slate-900 uppercase tracking-widest">Post a Review</h5>
                              <button type="button" onClick={() => setShowReviewForm(false)} className="text-[10px] font-bold text-slate-400 underline italic">Cancel</button>
                            </div>
                            <div className="space-y-2">
                              <label className="text-[8px] font-black text-slate-400 uppercase tracking-widest">Rating</label>
                              <div className="flex gap-2">
                                {[1, 2, 3, 4, 5].map(star => (
                                  <button 
                                    key={star} 
                                    type="button" 
                                    onClick={() => setReviewRating(star)}
                                    className={cn(
                                      "w-8 h-8 rounded-lg flex items-center justify-center transition-all text-xs font-bold",
                                      star <= reviewRating ? "bg-amber-100 text-amber-600" : "bg-white border border-slate-200 text-slate-300"
                                    )}
                                  >
                                    {star}
                                  </button>
                                ))}
                              </div>
                            </div>
                            <div className="space-y-2">
                              <label className="text-[8px] font-black text-slate-400 uppercase tracking-widest">Name</label>
                              <input 
                                type="text" 
                                value={reviewName}
                                onChange={(e) => setReviewName(e.target.value)}
                                placeholder="Your public name"
                                className="w-full bg-white border border-slate-200 p-2 text-xs rounded-lg focus:outline-none focus:border-slate-900"
                                required
                              />
                            </div>
                            <div className="space-y-2">
                              <label className="text-[8px] font-black text-slate-400 uppercase tracking-widest">Comment</label>
                              <textarea 
                                value={reviewComment}
                                onChange={(e) => setReviewComment(e.target.value)}
                                placeholder="What do you think of this product?"
                                rows={2}
                                className="w-full bg-white border border-slate-200 p-2 text-xs rounded-lg focus:outline-none focus:border-slate-900 resize-none"
                                required
                              />
                            </div>
                            <button 
                              type="submit"
                              className="w-full bg-slate-900 text-white py-2.5 rounded-lg text-[10px] font-black uppercase tracking-widest shadow-md shadow-slate-900/10 active:scale-95 transition-transform"
                            >
                              Submit Review
                            </button>
                          </form>
                        )}
                      </div>
                    )}

                    <div className="border-t border-slate-100 pt-6">
                      <h4 className="text-xs sm:text-sm font-bold text-slate-900 mb-4 uppercase tracking-wider">Contact & Pay Seller</h4>
                    </div>

                    <form onSubmit={handleSubmit} className="space-y-6 pt-2 font-sans">
                      {!selectedProduct && (
                        <div className="bg-slate-50 p-4 rounded-2xl border border-slate-200">
                          <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-1">Subject:</p>
                          <p className="text-sm font-bold text-slate-900">
                            {isCartOpen && cart.length > 0 ? `Checkout (${cart.length} items)` : 'General Information Inquiry'}
                          </p>
                        </div>
                      )}

                      <div className="space-y-2">
                        <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Your Name</label>
                        <input 
                          type="text" 
                          value={name}
                          onChange={(e) => setName(e.target.value)}
                          placeholder="e.g. Ebuka Okafor"
                          className="w-full border-b border-slate-100 p-2 text-sm sm:text-base font-medium focus:outline-none focus:border-slate-900 transition-colors bg-white/50"
                          required
                        />
                      </div>

                      <div className="space-y-2">
                        <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest">WhatsApp Number</label>
                        <input 
                          type="tel" 
                          value={phone}
                          onChange={(e) => setPhone(e.target.value)}
                          placeholder="e.g. 08123456789"
                          className="w-full border-b border-slate-100 p-2 text-sm sm:text-base font-mono focus:outline-none focus:border-slate-900 transition-colors bg-white/50"
                          required
                        />
                      </div>

                      <div className="pt-4">
                        <button 
                          type="submit"
                          className="w-full bg-emerald-500 text-white py-4 rounded-2xl font-black uppercase tracking-widest text-xs shadow-lg shadow-emerald-500/20 active:scale-95 transition-transform"
                        >
                          Send details to WhatsApp
                        </button>
                        <p className="mt-4 text-center text-[10px] text-slate-400 italic serif">
                          This will notify the seller to reach out to you.
                        </p>
                      </div>
                    </form>
                  </div>
                </motion.div>
              </div>
            )
          )}
        </AnimatePresence>

        {/* Cart Sideover Panel */}
        <AnimatePresence>
          {isCartOpen && (
            <motion.div 
              initial={{ x: "100%" }}
              animate={{ x: 0 }}
              exit={{ x: "100%" }}
              transition={{ type: "spring", damping: 25, stiffness: 200 }}
              className="absolute inset-0 z-50 bg-white flex flex-col"
            >
              <div className="h-14 bg-slate-900 flex items-center justify-center pt-4 shrink-0">
                <div className="w-24 h-6 bg-slate-950 rounded-full" />
              </div>
              
              <div className="p-4 flex justify-between items-center border-b border-slate-100 bg-white">
                <div className="flex items-center gap-2 text-slate-800">
                  <ShoppingCart size={20} />
                  <h3 className="text-lg font-black uppercase italic tracking-tighter">Your Cart</h3>
                </div>
                <button 
                  onClick={() => setIsCartOpen(false)}
                  className="w-8 h-8 bg-slate-100 rounded-full flex items-center justify-center text-slate-500"
                >
                  <Plus size={16} className="rotate-45" />
                </button>
              </div>

              <div className="flex-1 overflow-y-auto no-scrollbar p-4 bg-slate-50 space-y-4">
                {cart.length === 0 ? (
                  <div className="flex flex-col items-center justify-center h-full text-slate-400 gap-4">
                    <ShoppingCart size={48} className="opacity-20" />
                    <p className="font-medium text-sm">Your cart is empty.</p>
                    <button 
                      onClick={() => setIsCartOpen(false)}
                      className="bg-sky-500 text-white px-6 py-2 rounded-full font-bold text-xs uppercase tracking-widest shadow-lg"
                    >
                      Start Shopping
                    </button>
                  </div>
                ) : (
                  cart.map((item, index) => (
                    <div key={index} className="bg-white p-3 rounded-2xl flex gap-3 shadow-sm border border-slate-100">
                      <div className="w-16 h-16 rounded-xl overflow-hidden bg-slate-50 shrink-0">
                        {item.product.images[0] ? (
                          <img src={item.product.images[0]} className="w-full h-full object-cover" alt="" referrerPolicy="no-referrer" />
                        ) : (
                          <div className="w-full h-full flex items-center justify-center"><ShoppingBag size={16} className="text-slate-300"/></div>
                        )}
                      </div>
                      <div className="flex-1 flex flex-col justify-center">
                        <h5 className="text-xs font-bold text-slate-800 line-clamp-1 mb-1">{item.product.name}</h5>
                        <p className="text-sm font-black text-slate-900">{formatCurrency(item.product.price, business.currency)}</p>
                      </div>
                      <div className="flex flex-col justify-between items-end shrink-0">
                        <button 
                          onClick={() => updateCartQty(item.product.id, -item.quantity)}
                          className="text-slate-300 hover:text-red-500 p-1"
                        >
                          <Trash2 size={14} />
                        </button>
                        <div className="flex items-center gap-2 bg-slate-50 rounded-lg p-1 border border-slate-100">
                          <button onClick={() => updateCartQty(item.product.id, -1)} className="w-5 h-5 flex items-center justify-center bg-white rounded-md shadow-sm text-slate-600 font-bold">-</button>
                          <span className="text-xs font-black w-3 text-center">{item.quantity}</span>
                          <button onClick={() => updateCartQty(item.product.id, 1)} className="w-5 h-5 flex items-center justify-center bg-white rounded-md shadow-sm text-slate-600 font-bold">+</button>
                        </div>
                      </div>
                    </div>
                  ))
                )}
              </div>

              {cart.length > 0 && (
                <div className="p-4 bg-white border-t border-slate-100">
                  <div className="flex justify-between items-center mb-4 px-2">
                    <span className="text-sm font-bold text-slate-500 uppercase tracking-widest">Total</span>
                    <span className="text-xl font-black text-slate-900">{formatCurrency(cart.reduce((s, i) => s + (i.product.price * i.quantity), 0), business.currency)}</span>
                  </div>
                  <button 
                    onClick={() => {
                      setSelectedProduct(null);
                      setIsCartOpen(false);
                      setIsInquiryOpen(true);
                    }}
                    className="w-full bg-emerald-500 text-white py-4 rounded-xl font-black uppercase tracking-widest text-xs shadow-xl shadow-emerald-500/20 active:scale-95 transition-transform flex items-center justify-center gap-2"
                  >
                    Checkout via WhatsApp
                  </button>
                </div>
              )}
            </motion.div>
          )}
        </AnimatePresence>

        {/* Elegant Local Storefront Toast */}
        <AnimatePresence>
          {storeToast && (
            <motion.div
              initial={{ y: 20, opacity: 0 }}
              animate={{ y: 0, opacity: 1 }}
              exit={{ y: -20, opacity: 0 }}
              className="absolute bottom-20 left-4 right-4 z-[99]"
            >
              <div className="bg-slate-900 border border-slate-700/50 p-3 rounded-lg shadow-2xl flex items-center gap-2 max-w-sm mx-auto">
                <CheckCircle2 size={16} className="text-emerald-400 shrink-0 outline-none" />
                <span className="text-xs font-bold leading-tight text-white">{storeToast.message}</span>
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </div>
    );
  }

  // -- BRANCH 2: THE REAL, EXPANSIVE FULL-SCREEN MERCHANT STOREFRONT VIEW --
  return (
    <div className="min-h-screen bg-slate-50/60 pb-20 flex flex-col font-sans text-slate-900 animate-fade-in">
      {/* 1. Brand Stickable Topbar */}
      <header className="bg-white/95 backdrop-blur-md border-b border-slate-200/60 sticky top-0 z-40 px-4 md:px-8 py-4 transition-all duration-300">
        <div className="max-w-7xl mx-auto flex items-center justify-between gap-4">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-slate-100 border border-slate-200 overflow-hidden flex items-center justify-center font-black text-slate-800 shadow-xs">
              {business.logo ? (
                <img src={business.logo} alt={business.name} className="w-full h-full object-cover" referrerPolicy="no-referrer" />
              ) : (
                <div className="w-full h-full bg-slate-900 text-white flex items-center justify-center text-sm font-black uppercase">
                  {(business.name || 'S')[0]}
                </div>
              )}
            </div>
            <div>
              <div className="flex items-center gap-1.5">
                <span className="text-base font-black text-slate-900 uppercase tracking-tight italic underline decoration-sky-500 decoration-2">{business.name}</span>
                {business.isVerified && <CheckCircle2 size={14} className="text-sky-500 fill-sky-500 text-white" />}
              </div>
              <p className="text-[9px] font-black tracking-widest text-[#0ea5e9] uppercase leading-none mt-0.5">Verified Merchant</p>
            </div>
          </div>

          {/* Search middle bar (Desktop only) */}
          <div className="hidden md:flex items-center flex-1 max-w-md mx-8">
            <div className="relative w-full">
              <Search size={15} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400" />
              <input 
                type="text"
                placeholder="Search catalog items..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="w-full pl-10 pr-4 py-2.5 bg-slate-50 border border-slate-200/80 rounded-full text-xs outline-none focus:ring-2 focus:ring-sky-500/20 transition-all font-medium"
              />
            </div>
          </div>

          {/* Checkout Bag Counter & Quick Contact */}
          <div className="flex items-center gap-2 md:gap-3">
            <a 
              href={`https://wa.me/${business.whatsappNumber.replace(/[^0-9]/g, '')}`} 
              target="_blank" 
              rel="noopener noreferrer"
              onClick={() => trackEngagementClick('message_merchant')}
              className="px-4 py-2 bg-emerald-500 hover:bg-emerald-600 text-white rounded-full text-[10px] font-black uppercase tracking-wider transition-all h-10 flex items-center justify-center gap-1.5 shadow-md shadow-emerald-500/10 active:scale-95"
            >
              <MessageSquare size={13} /> <span className="hidden sm:inline">Message Merchant</span>
            </a>
            
            <button 
              onClick={() => setIsCartOpen(true)}
              className="relative w-10 h-10 bg-slate-900 hover:bg-slate-800 text-white rounded-full flex items-center justify-center transition-all shadow-md active:scale-95 cursor-pointer"
            >
              <ShoppingCart size={16} />
              {cart.length > 0 && (
                <span className="absolute -top-1 -right-1 bg-red-500 text-white text-[9px] font-black w-4 h-4 rounded-full flex items-center justify-center animate-bounce">
                  {cart.reduce((sum, item) => sum + item.quantity, 0)}
                </span>
              )}
            </button>
          </div>
        </div>
      </header>

      {/* 2. Visual Store Banner & Accent Area (Bespoke Glowing Card background) */}
      <section className="bg-slate-950 text-white py-16 px-6 md:py-24 relative overflow-hidden border-b border-slate-900">
        <div className="absolute -top-40 -left-40 w-[30rem] h-[30rem] bg-sky-500/10 rounded-full blur-3xl pointer-events-none" />
        <div className="absolute -bottom-40 -right-40 w-[30rem] h-[30rem] bg-emerald-500/10 rounded-full blur-3xl pointer-events-none" />

        <div className="max-w-4xl mx-auto text-center space-y-6 relative z-10">
          <div className="inline-flex items-center gap-2 px-3 py-1 bg-white/10 backdrop-blur-md rounded-full text-[9px] font-black uppercase tracking-widest text-emerald-400 border border-white/5">
            <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse" />
            Online & Accepting Orders
          </div>

          <div className="space-y-2">
            <h1 className="text-4xl md:text-6xl font-black uppercase italic tracking-tighter leading-none">
              {business.name}
            </h1>
            {business.isVerified && (
              <p className="text-[10px] tracking-widest font-black uppercase text-sky-400 flex items-center justify-center gap-1 mt-1">
                <CheckCircle2 size={11} className="fill-sky-400 text-slate-950" /> Fully Verified Storefront
              </p>
            )}
          </div>

          <p className="text-slate-300 text-xs md:text-sm leading-relaxed max-w-xl mx-auto italic font-medium serif opacity-90">
            {business.description || "Welcome! Browse our digital catalog, add your desired products to the cart, and checkout instantly to place your order via WhatsApp."}
          </p>

          <div className="flex flex-wrap items-center justify-center gap-x-6 gap-y-3 pt-4 text-xs font-bold text-slate-400">
            <span className="flex items-center gap-1.5"><Package size={14} className="text-sky-400" /> Full Catalog Delivery</span>
            <span className="text-slate-700 hidden sm:inline">•</span>
            <span className="flex items-center gap-1.5"><MessageSquare size={14} className="text-emerald-400" /> Direct-to-whatsapp Ordering</span>
          </div>
        </div>
      </section>

      {/* 3. Category pills & Mobile Search */}
      <section className="max-w-7xl mx-auto w-full px-4 md:px-8 pt-8">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 border-b border-slate-200 pb-6 mb-8">
          <div>
            <h2 className="text-lg font-black uppercase italic tracking-tighter text-slate-900 flex items-center gap-2">
              <ShoppingBag size={18} className="text-sky-500" /> Product Collections
            </h2>
            <p className="text-[10px] text-slate-400 font-bold uppercase tracking-widest mt-0.5">Showing {filteredProducts.length} items from {business.name}</p>
          </div>

          {/* Desktop Filtering Pills */}
          <div className="flex flex-wrap gap-2">
            {['All', 'Best Sellers', 'New Arrivals', 'Promotions', 'physical', 'digital', 'service'].map((catType) => (
              <button
                key={catType}
                onClick={() => setSelectedCategory(catType)}
                className={cn(
                  "px-4 py-2 rounded-xl text-[10px] font-black tracking-widest uppercase transition-all duration-150 border",
                  (selectedCategory === catType)
                    ? "bg-slate-900 border-slate-900 text-white shadow-lg shadow-slate-900/10"
                    : "bg-white border-slate-200 text-slate-600 hover:border-slate-300"
                )}
              >
                {catType === 'All' ? 'All' : catType === 'physical' ? 'Physical' : catType === 'digital' ? 'Digital' : catType === 'service' ? 'Service' : catType}
              </button>
            ))}
          </div>
        </div>

        {/* Mobile search bar */}
        <div className="md:hidden mb-6">
          <div className="relative">
            <Search size={15} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400" />
            <input 
              type="text"
              placeholder="Search catalog items..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full pl-10 pr-4 py-3 bg-white border border-slate-200 rounded-xl text-xs outline-none focus:ring-2 focus:ring-sky-500/20"
            />
          </div>
        </div>

        {/* 4. Beautiful Products Catalog Listing */}
        {filteredProducts.length === 0 ? (
          <div className="text-center py-20 bg-white rounded-3xl border border-dashed border-slate-200/80 p-6">
            <div className="w-16 h-16 bg-slate-50 border border-slate-100 rounded-full flex items-center justify-center mx-auto text-slate-400 mb-4">
              <ShoppingBag size={24} strokeWidth={1.5} />
            </div>
            <h3 className="text-sm font-bold text-slate-800 uppercase tracking-wider">No Products Found</h3>
            <p className="text-slate-400 text-xs mt-1 max-w-xs mx-auto">There are no matching products inside this collection right now. Try adjustments.</p>
          </div>
        ) : (
          <div className="grid grid-cols-2 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-3 sm:gap-6 md:gap-8">
            {filteredProducts.map((product) => {
              const prodReviews = reviews.filter(r => r.productId === product.id);
              const rating = prodReviews.length > 0 
                ? (prodReviews.reduce((sum, r) => sum + r.rating, 0) / prodReviews.length).toFixed(1) 
                : null;
              const discount = product.originalPrice && product.originalPrice > product.price 
                ? Math.round(((product.originalPrice - product.price) / product.originalPrice) * 100) 
                : null;

              return (
                <div 
                  key={product.id} 
                  onClick={() => {
                    setSelectedProduct(product);
                    setIsInquiryOpen(true);
                  }}
                  className="bg-white rounded-2xl border border-slate-150 shadow-sm hover:shadow-xl hover:-translate-y-1.5 transition-all duration-300 flex flex-col group cursor-pointer overflow-hidden relative"
                >
                  {/* Thumbnail Cover */}
                  <div className="aspect-square bg-slate-50/60 overflow-hidden flex items-center justify-center relative p-2 sm:p-6 border-b border-slate-50">
                    {product.images?.[0] ? (
                      <img 
                        src={product.images[0]} 
                        className="w-full h-full object-contain group-hover:scale-105 transition-transform duration-300" 
                        alt={product.name} 
                        referrerPolicy="no-referrer"
                      />
                    ) : (
                      <ShoppingBag size={32} strokeWidth={1} className="text-slate-300" />
                    )}
                    
                    {discount && (
                      <div className="absolute top-2 right-2 bg-red-500 text-white px-1.5 py-0.5 rounded-md text-[8px] sm:text-[9px] font-black uppercase tracking-wider shadow-sm z-10">
                        {discount}% OFF
                      </div>
                    )}
                    <div className="absolute top-2 left-2 bg-white/90 backdrop-blur-md px-1.5 py-0.5 rounded-md border border-slate-100 text-[7px] sm:text-[8px] font-black uppercase tracking-widest text-slate-500">
                      {product.type}
                    </div>

                    {/* Stacking tags below the product type badge */}
                    <div className="absolute top-9 left-2 flex flex-col gap-1 z-10 items-start pointer-events-none">
                      {product.isBestSeller && (
                        <span className="bg-amber-500 text-[6px] sm:text-[8px] font-black uppercase text-white px-1.5 py-0.5 rounded shadow-sm tracking-wider">
                          ★ Best Seller
                        </span>
                      )}
                      {product.isNewArrival && (
                        <span className="bg-sky-500 text-[6px] sm:text-[8px] font-black uppercase text-white px-1.5 py-0.5 rounded shadow-sm tracking-wider">
                          ✦ New Arrival
                        </span>
                      )}
                      {product.isPromotion && (
                        <span className="bg-rose-500 text-[6px] sm:text-[8px] font-black uppercase text-white px-1.5 py-0.5 rounded shadow-sm tracking-wider">
                          % Promotion
                        </span>
                      )}
                      {product.inventoryStatus === 'out_of_stock' && (
                        <span className="bg-rose-600 text-[6px] sm:text-[8px] font-black uppercase text-white px-1.5 py-0.5 rounded shadow-sm tracking-wider animate-pulse">
                          Sold Out
                        </span>
                      )}
                      {product.inventoryStatus === 'low_stock' && (
                        <span className="bg-amber-600 text-[6px] sm:text-[8px] font-black uppercase text-white px-1.5 py-0.5 rounded shadow-sm tracking-wider">
                          Low Stock
                        </span>
                      )}
                    </div>

                    {/* Jumia-style Favorite heart button */}
                    <button 
                      onClick={(e) => toggleFavorite(product.id, e)}
                      className="absolute bottom-2.5 right-2.5 z-10 w-8.5 h-8.5 rounded-full bg-white/95 backdrop-blur-md text-slate-400 hover:text-red-500 hover:scale-110 flex items-center justify-center shadow-md hover:shadow-lg transition-all duration-200 active:scale-95 border border-slate-150"
                      title={favorites.includes(product.id) ? "Remove from wishlist" : "Add to wishlist"}
                    >
                      <Heart 
                        size={15} 
                        className={cn(
                          "transition-all duration-200", 
                          favorites.includes(product.id) ? "fill-red-500 text-red-500 scale-115" : "text-slate-500 hover:text-red-500"
                        )} 
                        strokeWidth={favorites.includes(product.id) ? 0 : 2}
                      />
                    </button>
                  </div>

                  {/* Body Info */}
                  <div className="p-3 sm:p-4 flex-1 flex flex-col justify-between">
                    <div>
                      <h4 className="text-[11px] sm:text-xs md:text-sm font-bold text-slate-800 line-clamp-2 leading-snug mb-1.5 group-hover:text-[#0ea5e9] transition-colors min-h-[32px] sm:min-h-[38px]">
                        {product.name}
                      </h4>
                      
                      <div className="flex items-center gap-1 mb-2">
                        <div className="flex">
                          {[1,2,3,4,5].map(star => (
                            <Star key={star} size={8} className={star <= (rating ? Number(rating) : 5) ? (rating ? "text-amber-400 fill-amber-400" : "text-slate-200 fill-slate-200") : "text-slate-200 fill-slate-200"} />
                          ))}
                        </div>
                        <span className="text-[8px] sm:text-[9px] font-black text-slate-400">({prodReviews.length})</span>
                      </div>
                    </div>

                    <div>
                      <div className="flex items-baseline gap-1 sm:gap-2 mb-3">
                        <span className="text-xs sm:text-sm md:text-base font-black text-slate-900">{formatCurrency(product.price, business.currency)}</span>
                        {product.originalPrice && product.originalPrice > product.price && (
                          <span className="text-[8px] sm:text-[10px] md:text-xs text-slate-400 font-bold line-through">{formatCurrency(product.originalPrice, business.currency)}</span>
                        )}
                      </div>

                      {/* Direct action targets */}
                      <div className="flex flex-col sm:flex-row gap-1.5 mt-auto">
                        <button 
                          onClick={(e) => {
                            e.stopPropagation();
                            setSelectedProduct(product);
                            setIsInquiryOpen(true);
                          }}
                          className="flex-1 bg-slate-50 hover:bg-slate-100 border border-slate-200/80 text-slate-700 py-2 rounded-lg text-[9px] sm:text-[10px] font-black uppercase tracking-wider transition-colors outline-none text-center"
                        >
                          Specs
                        </button>
                        <button 
                          disabled={product.inventoryStatus === 'out_of_stock'}
                          onClick={(e) => addToCart(product, e)}
                          className={cn(
                            "flex-[1.5] py-2 rounded-lg text-[9px] sm:text-[10px] font-black uppercase tracking-widest transition-all shadow-sm flex items-center justify-center gap-0.5 outline-none",
                            product.inventoryStatus === 'out_of_stock'
                              ? "bg-slate-100 text-slate-400 cursor-not-allowed cursor-default"
                              : "bg-slate-900 hover:bg-slate-800 text-white"
                          )}
                        >
                          {product.inventoryStatus === 'out_of_stock' ? (
                            'Sold Out'
                          ) : (
                            <>
                              <Plus size={10} strokeWidth={3} /> Add
                            </>
                          )}
                        </button>
                      </div>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </section>

      {/* 5. Cart Sideover Responsive Slide Panel (Full Screen right side drawer) */}
      <AnimatePresence>
        {isCartOpen && (
          <div className="fixed inset-0 z-50 overflow-hidden">
            {/* Backdrop */}
            <motion.div 
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="absolute inset-0 bg-slate-950/60 backdrop-blur-sm transition-opacity" 
              onClick={() => setIsCartOpen(false)} 
            />

            <div className="fixed inset-y-0 right-0 max-w-full flex">
              <motion.div 
                initial={{ x: "100%" }}
                animate={{ x: 0 }}
                exit={{ x: "100%" }}
                transition={{ type: "spring", damping: 25, stiffness: 220 }}
                className="w-screen max-w-md bg-white shadow-2xl flex flex-col h-full overflow-hidden"
              >
                <div className="p-6 border-b border-slate-100 flex items-center justify-between bg-white">
                  <div className="flex items-center gap-2">
                    <ShoppingCart size={20} className="text-[#0ea5e9]" />
                    <h3 className="text-base font-black uppercase italic tracking-tighter text-slate-900">Your Basket</h3>
                  </div>
                  <button onClick={() => setIsCartOpen(false)} className="w-8 h-8 rounded-full bg-slate-50 hover:bg-slate-100 flex items-center justify-center text-slate-500 transition-colors">
                    <Plus size={16} className="rotate-45" />
                  </button>
                </div>

                <div className="flex-1 overflow-y-auto p-6 space-y-4 bg-slate-50">
                  {cart.length === 0 ? (
                    <div className="flex flex-col items-center justify-center h-full text-slate-400 space-y-4">
                      <ShoppingCart size={48} className="opacity-20" />
                      <p className="font-bold text-xs uppercase tracking-wider text-slate-400">Your basket is empty</p>
                      <button 
                        onClick={() => setIsCartOpen(false)}
                        className="bg-slate-900 text-white px-6 py-2.5 rounded-full text-xs font-black uppercase tracking-widest shadow-lg"
                      >
                        Start Shopping
                      </button>
                    </div>
                  ) : (
                    cart.map((item, idx) => (
                      <div key={idx} className="bg-white p-3.5 rounded-2xl flex gap-3.5 shadow-xs border border-slate-100">
                        <div className="w-16 h-16 rounded-xl overflow-hidden bg-slate-50 shrink-0">
                          {item.product.images?.[0] ? (
                            <img src={item.product.images[0]} className="w-full h-full object-cover" alt="" referrerPolicy="no-referrer" />
                          ) : (
                            <div className="w-full h-full flex items-center justify-center bg-slate-100"><ShoppingBag size={16} className="text-slate-300"/></div>
                          )}
                        </div>
                        <div className="flex-1 flex flex-col justify-center">
                          <h5 className="text-xs font-bold text-slate-800 line-clamp-1 mb-1">{item.product.name}</h5>
                          <p className="text-xs font-black text-slate-900">{formatCurrency(item.product.price, business.currency)}</p>
                        </div>
                        <div className="flex flex-col justify-between items-end shrink-0">
                          <button 
                            onClick={() => updateCartQty(item.product.id, -item.quantity)}
                            className="text-slate-300 hover:text-red-500 p-1 transition-colors"
                          >
                            <Trash2 size={13} />
                          </button>
                          <div className="flex items-center gap-1 bg-slate-50 rounded-lg p-0.5 border border-slate-100">
                            <button onClick={() => updateCartQty(item.product.id, -1)} className="w-5 h-5 flex items-center justify-center bg-white rounded-md shadow-xs text-slate-600 font-bold">-</button>
                            <span className="text-[11px] font-black w-3 text-center">{item.quantity}</span>
                            <button onClick={() => updateCartQty(item.product.id, 1)} className="w-5 h-5 flex items-center justify-center bg-white rounded-md shadow-xs text-slate-600 font-bold">+</button>
                          </div>
                        </div>
                      </div>
                    ))
                  )}
                </div>

                {cart.length > 0 && (
                  <div className="p-6 bg-white border-t border-slate-100 space-y-4">
                    <div className="flex justify-between items-center px-1">
                      <span className="text-xs font-black uppercase tracking-widest text-slate-400">Total Selection</span>
                      <span className="text-lg font-black text-slate-900">{formatCurrency(cart.reduce((s, i) => s + (i.product.price * i.quantity), 0), business.currency)}</span>
                    </div>
                    <button 
                      onClick={() => {
                        setSelectedProduct(null);
                        setIsCartOpen(false);
                        setIsInquiryOpen(true);
                      }}
                      className="w-full bg-slate-900 hover:bg-slate-800 text-white py-4 rounded-xl font-black uppercase tracking-widest text-xs transition-all text-center"
                    >
                      Proceed to Checkout Form
                    </button>
                  </div>
                )}
              </motion.div>
            </div>
          </div>
        )}
      </AnimatePresence>

      {/* 6. Product Specs & Reviews Center Dialog Modal Overlay */}
      <AnimatePresence>
        {isInquiryOpen && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
            {/* Backdrop */}
            <motion.div 
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="absolute inset-0 bg-slate-950/60 backdrop-blur-sm" 
              onClick={() => { setIsInquiryOpen(false); setSelectedProduct(null); }} 
            />

            {/* Modal Box */}
            <motion.div 
              initial={{ scale: 0.95, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.95, opacity: 0 }}
              className="bg-white rounded-3xl w-full max-w-4xl max-h-[90vh] overflow-y-auto no-scrollbar shadow-2xl relative z-10 grid grid-cols-1 md:grid-cols-2"
            >
              {/* Left Side cover: Images & Reviews */}
              <div className="p-6 md:p-8 border-b md:border-b-0 md:border-r border-slate-100 flex flex-col justify-between">
                <div className="space-y-4">
                  {selectedProduct ? (
                    <>
                      <div className="aspect-square bg-slate-100 rounded-2xl overflow-hidden flex items-center justify-center p-4 relative border border-slate-200/50">
                        {selectedProduct.images?.[0] ? (
                          <img src={selectedProduct.images[0]} className="max-h-full max-w-full object-contain rounded-xl" alt={selectedProduct.name} referrerPolicy="no-referrer" />
                        ) : (
                          <ShoppingBag size={64} className="text-slate-300" />
                        )}
                      </div>
                      {selectedProduct.images && selectedProduct.images.length > 1 && (
                        <div className="flex gap-2.5 overflow-x-auto pb-1 no-scrollbar">
                          {selectedProduct.images.map((img, idx) => (
                            <div key={idx} className="w-16 h-16 rounded-xl overflow-hidden border border-slate-200/60 p-0.5 shrink-0 bg-white">
                              <img src={img} className="w-full h-full object-cover rounded-lg" alt="" referrerPolicy="no-referrer" />
                            </div>
                          ))}
                        </div>
                      )}
                    </>
                  ) : (
                    <div className="bg-sky-50 border border-sky-100 p-6 rounded-2xl">
                      <h4 className="text-[10px] font-black text-sky-600 uppercase tracking-widest mb-1">Store Checkout Bag</h4>
                      <p className="text-sm font-bold text-slate-850">Direct Ordering Selection ({cart.length} items)</p>
                    </div>
                  )}
                </div>

                {/* Interactive Reviews Panel in full-screen modal */}
                {selectedProduct && (
                  <div className="pt-8 space-y-4">
                    <div className="flex justify-between items-center border-b border-slate-100 pb-2">
                      <h4 className="text-xs font-black uppercase tracking-wider text-slate-400">Customer Feedbacks ({productReviews.length})</h4>
                      {averageRating && (
                        <span className="flex items-center gap-1 bg-amber-50 text-amber-600 px-2 py-0.5 rounded-md text-[10px] font-bold">
                          ★ {averageRating}
                        </span>
                      )}
                    </div>
                    <div className="space-y-3 max-h-48 overflow-y-auto no-scrollbar">
                      {productReviews.map((rev) => (
                        <div key={rev.id} className="bg-slate-50/50 p-3 rounded-xl border border-slate-100">
                          <div className="flex justify-between items-center mb-1">
                            <span className="text-[10px] font-black text-slate-800">{rev.customerName}</span>
                            <div className="flex">
                              {[1,2,3,4,5].map(st => (
                                <Star key={st} size={8} className={st <= rev.rating ? "text-amber-400 fill-amber-400" : "text-slate-200"} />
                              ))}
                            </div>
                          </div>
                          <p className="text-xs text-slate-500 italic">"{rev.comment}"</p>
                        </div>
                      ))}
                      {productReviews.length === 0 && (
                        <p className="text-[11px] text-slate-400 italic text-center py-2">No reviews for this product yet.</p>
                      )}
                    </div>

                    {!showReviewForm ? (
                      <button 
                        onClick={() => setShowReviewForm(true)}
                        className="text-[10px] font-black uppercase tracking-widest text-[#0ea5e9] hover:underline"
                      >
                        Write Review feedback
                      </button>
                    ) : (
                      <form onSubmit={handleReviewSubmit} className="bg-slate-50 p-4 rounded-xl space-y-3">
                        <div className="flex gap-1.5 items-center">
                          <span className="text-[9px] font-black text-slate-400 uppercase tracking-wider">Rating:</span>
                          <div className="flex gap-1">
                            {[1,2,3,4,5].map(st => (
                              <button key={st} type="button" onClick={() => setReviewRating(st)} className="text-xs font-bold p-1">
                                <Star size={12} className={st <= reviewRating ? "text-amber-400 fill-amber-400" : "text-slate-300"} />
                              </button>
                            ))}
                          </div>
                        </div>
                        <input 
                          type="text" 
                          placeholder="Your Name" 
                          value={reviewName} 
                          onChange={e => setReviewName(e.target.value)} 
                          className="w-full bg-white border border-slate-200 p-2 text-xs rounded-lg outline-none"
                          required
                        />
                        <textarea 
                          placeholder="What did you think of this product?" 
                          value={reviewComment} 
                          onChange={e => setReviewComment(e.target.value)} 
                          className="w-full bg-white border border-slate-200 p-2 text-xs rounded-lg outline-none resize-none"
                          rows={2}
                          required
                        />
                        <div className="flex gap-2">
                          <button type="submit" className="flex-1 bg-slate-900 text-white text-[9px] font-black uppercase tracking-wider py-2 rounded-lg">Submit</button>
                          <button type="button" onClick={() => setShowReviewForm(false)} className="bg-slate-200 text-slate-600 text-[9px] font-black uppercase tracking-wider px-3 py-2 rounded-lg">Cancel</button>
                        </div>
                      </form>
                    )}
                  </div>
                )}
              </div>

              {/* Right Side form: Product checkout form & WhatsApp details validation */}
              <div className="p-6 md:p-8 flex flex-col justify-between relative">
                <button 
                  onClick={() => { setIsInquiryOpen(false); setSelectedProduct(null); }}
                  className="absolute top-4 right-4 w-8 h-8 rounded-full bg-slate-50 hover:bg-slate-100 flex items-center justify-center text-slate-500 transition-colors"
                >
                  <Plus size={16} className="rotate-45" />
                </button>

                <div className="space-y-6">
                  {selectedProduct ? (
                    <div>
                      <span className="text-[10px] font-black text-[#0ea5e9] uppercase tracking-widest">{selectedProduct.type}</span>
                      <h3 className="text-xl md:text-2xl font-black uppercase text-slate-900 mt-1 leading-snug">{selectedProduct.name}</h3>
                      <p className="text-sm font-black text-slate-900 mt-2">{formatCurrency(selectedProduct.price, business.currency)}</p>
                      <p className="text-xs text-slate-500 mt-4 leading-relaxed whitespace-pre-line">{selectedProduct.description || "No description provided."}</p>
                      
                      <button
                        disabled={selectedProduct.inventoryStatus === 'out_of_stock'}
                        onClick={() => {
                          addToCart(selectedProduct);
                          setIsInquiryOpen(false);
                          setIsCartOpen(true);
                        }}
                        className={cn(
                          "mt-6 w-full font-black uppercase tracking-widest text-xs py-3.5 rounded-xl transition-all text-center shadow-md",
                          selectedProduct.inventoryStatus === 'out_of_stock'
                            ? "bg-slate-100 text-slate-400 cursor-not-allowed cursor-default"
                            : "bg-slate-900 hover:bg-slate-800 text-white active:scale-95"
                        )}
                      >
                        {selectedProduct.inventoryStatus === 'out_of_stock' ? 'Sold Out / Out of Stock' : 'Add To Basket & Checkout'}
                      </button>
                    </div>
                  ) : (
                    <div>
                      <h3 className="text-lg font-black uppercase tracking-tight text-slate-900">Cart Checkout</h3>
                      <p className="text-[10px] text-slate-400 font-bold uppercase tracking-widest mt-0.5">Please fill your details below</p>
                      <div className="mt-4 bg-slate-50/50 p-4 rounded-xl space-y-2 border border-slate-100 max-h-48 overflow-y-auto no-scrollbar">
                        {cart.map((item, idx) => (
                          <div key={idx} className="flex justify-between items-center text-xs">
                            <span className="text-slate-600 font-bold">{item.quantity}x {item.product.name}</span>
                            <span className="font-bold text-slate-800">{formatCurrency(item.product.price * item.quantity, business.currency)}</span>
                          </div>
                        ))}
                        <div className="pt-2 border-t border-slate-200 flex justify-between font-bold text-sm">
                          <span>Total</span>
                          <span>{formatCurrency(cart.reduce((s,i) => s + (i.product.price * i.quantity), 0), business.currency)}</span>
                        </div>
                      </div>
                    </div>
                  )}

                  <form onSubmit={handleSubmit} className="space-y-4 pt-4 border-t border-slate-100">
                    <h4 className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-2">Buyer Information</h4>
                    
                    <div className="space-y-2">
                      <label className="text-[9px] font-black text-slate-400 uppercase tracking-widest block">Your Full Name</label>
                      <input 
                        type="text" 
                        placeholder="e.g. Ebuka Okafor" 
                        value={name} 
                        onChange={e => setName(e.target.value)} 
                        className="w-full bg-slate-50 border border-slate-200 p-3 rounded-xl text-xs font-bold outline-none focus:ring-2 focus:ring-sky-500/10"
                        required
                      />
                    </div>

                    <div className="space-y-2">
                      <label className="text-[9px] font-black text-slate-400 uppercase tracking-widest block">WhatsApp Mobile Number</label>
                      <input 
                        type="tel" 
                        placeholder="e.g. 08123456789" 
                        value={phone} 
                        onChange={e => setPhone(e.target.value)} 
                        className="w-full bg-slate-50 border border-slate-200 p-3 rounded-xl text-xs font-mono outline-none focus:ring-2 focus:ring-sky-500/10"
                        required
                      />
                    </div>

                    <button 
                      type="submit" 
                      className="w-full bg-emerald-500 hover:bg-emerald-600 text-white font-black uppercase tracking-widest text-xs py-4 rounded-xl transition-all shadow-lg active:scale-95 flex items-center justify-center gap-1.5"
                    >
                      <MessageSquare size={14} /> Send WhatsApp Order
                    </button>
                  </form>
                </div>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* Elegant Local Storefront Toast alerts */}
      <AnimatePresence>
        {storeToast && (
          <motion.div
            initial={{ y: 20, opacity: 0 }}
            animate={{ y: 0, opacity: 1 }}
            exit={{ y: -20, opacity: 0 }}
            className="fixed bottom-6 right-6 z-[99]"
          >
            <div className="bg-slate-900 border border-slate-700/50 p-3 px-4 rounded-xl shadow-2xl flex items-center gap-2 max-w-sm">
              <CheckCircle2 size={16} className="text-emerald-400 shrink-0 outline-none" />
              <span className="text-xs font-bold leading-tight text-white">{storeToast.message}</span>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
};

const AuthScreen = ({ 
  showToast,
  initialTab = 'signin',
  onBackToLanding
}: { 
  showToast?: (m: string, t?: 'success' | 'error' | 'info') => void;
  initialTab?: 'signin' | 'signup';
  onBackToLanding?: () => void;
}) => {
  const [activeTab, setActiveTab] = useState<'signin' | 'signup'>(initialTab);
  
  useEffect(() => {
    setActiveTab(initialTab);
  }, [initialTab]);

  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  
  // Forgot Password feature
  const [showForgotPassword, setShowForgotPassword] = useState(false);
  const [resetEmail, setResetEmail] = useState('');

  // Rate limiting states
  const [failedAttempts, setFailedAttempts] = useState(0);
  const [lockoutTime, setLockoutTime] = useState<number | null>(null);

  const getFriendlyErrorMessage = (error: any) => {
    const code = error?.code || '';
    switch (code) {
      case 'auth/invalid-credential':
      case 'auth/user-not-found':
      case 'auth/wrong-password':
        return "The email or password you entered is incorrect.";
      case 'auth/email-already-in-use':
        return "This email address is already in use by another account.";
      case 'auth/weak-password':
        return "The password must be at least 6 characters long.";
      case 'auth/invalid-email':
        return "Please enter a valid email address.";
      case 'auth/too-many-requests':
        return "Login blocked temporarily due to excessive attempts. Reset password or try later.";
      case 'auth/network-request-failed':
        return "Connection failed (auth/network-request-failed). This is common inside sandboxed iframes or due to strict browser privacy settings/ad-blockers. Please try disabling your ad-blocker, or click 'Open App' in the top-right to run the app in a dedicated window where network requests succeed.";
      default:
        if (error?.message && error.message.includes('network-request-failed')) {
          return "Connection failed. Ad-blockers or iframe sandbox restrictions might be blocking the login server. Please click the 'Open App' button in the top right to use the site in a dedicated tab.";
        }
        return error?.message || "Authentication failed. Please try again.";
    }
  };

  const checkRateLimit = (): boolean => {
    const now = Date.now();
    if (lockoutTime && now < lockoutTime) {
      const remaining = Math.ceil((lockoutTime - now) / 1000);
      if (showToast) {
        showToast(`Too many failed attempts. Locked out for ${remaining}s.`, "error");
      }
      return false;
    }
    return true;
  };

  const handleFailedAttempt = () => {
    const nextAttempts = failedAttempts + 1;
    setFailedAttempts(nextAttempts);
    if (nextAttempts >= 5) {
      const unlockTime = Date.now() + 30000; // 30 seconds lockout
      setLockoutTime(unlockTime);
      setFailedAttempts(0);
      if (showToast) {
        showToast("Security Lockout: Too many failed login attempts! Try again in 30 seconds.", "error");
      }
    }
  };

  const handleLogin = () => {
    const provider = new GoogleAuthProvider();
    signInWithPopup(auth, provider).catch((error: any) => {
      console.error("Google Auth error:", error);
      const isIframe = window.self !== window.top;
      let errorMsg = "Google sign in failed. Please try again or use Email login.";
      
      if (error?.code === 'auth/popup-blocked') {
        errorMsg = "Google pop-up was blocked. Please allow popups or use Email & Password instead.";
      } else if (isIframe) {
        errorMsg = "Google Sign-In failed. Sandboxed iframe environments often block authentication. Please click the Link below or 'Open App' to sign in!";
      } else if (error?.code === 'auth/auth-domain-config-required' || error?.message?.includes('auth-domain')) {
        errorMsg = "Firebase Authentication error: Please ensure this domain is added to 'Authorized Domains' in your Firebase console.";
      } else if (error?.message) {
        errorMsg = `Google sign-in error: ${error.message}`;
      }
      
      if (showToast) showToast(errorMsg, "error");
    });
  };

  const handleSignIn = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!checkRateLimit()) return;

    if (!email || !password) {
      if (showToast) showToast("Please input both email and password.", "error");
      return;
    }

    setLoading(true);
    try {
      await signInWithEmailAndPassword(auth, email, password);
      // Successful login reset
      setFailedAttempts(0);
      setLockoutTime(null);
      if (showToast) showToast("Signed in successfully!", "success");
    } catch (error: any) {
      handleFailedAttempt();
      const msg = getFriendlyErrorMessage(error);
      if (showToast) showToast(msg, "error");
    } finally {
      setLoading(false);
    }
  };

  const handleSignUp = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!checkRateLimit()) return;

    if (!email || !password || !confirmPassword) {
      if (showToast) showToast("All fields are required to sign up.", "error");
      return;
    }

    if (password !== confirmPassword) {
      if (showToast) showToast("Passwords do not match.", "error");
      return;
    }

    if (password.length < 6) {
      if (showToast) showToast("Password needs to be at least 6 characters.", "error");
      return;
    }

    setLoading(true);
    try {
      const credential = await createUserWithEmailAndPassword(auth, email, password);
      await sendEmailVerification(credential.user);
      if (showToast) showToast("Registration complete! A verification message is sent to your email.", "success");
    } catch (error: any) {
      handleFailedAttempt();
      const msg = getFriendlyErrorMessage(error);
      if (showToast) showToast(msg, "error");
    } finally {
      setLoading(false);
    }
  };

  const handleForgotPasswordSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!resetEmail) {
      if (showToast) showToast("Please provide your email address.", "error");
      return;
    }
    setLoading(true);
    try {
      await sendPasswordResetEmail(auth, resetEmail);
      if (showToast) showToast(`Instructions sent to ${resetEmail}. Check your inbox!`, "success");
      setShowForgotPassword(false);
    } catch (error: any) {
      const msg = getFriendlyErrorMessage(error);
      if (showToast) showToast(msg, "error");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-slate-950 flex flex-col items-center justify-center p-6 relative overflow-hidden">
      {onBackToLanding && (
        <button 
          onClick={onBackToLanding}
          className="absolute top-6 left-6 z-25 text-slate-400 hover:text-white font-bold text-xs flex items-center gap-2 cursor-pointer bg-slate-900/60 hover:bg-slate-900 border border-white/10 px-4 py-2.5 rounded-xl transition-all"
        >
          <ArrowLeft size={14} />
          <span>Back to Home</span>
        </button>
      )}

      {/* Background decorations */}
      <div className="absolute top-0 left-0 w-full h-full opacity-10 pointer-events-none">
        <div className="absolute top-[-10%] left-[-10%] w-[40%] h-[40%] bg-sky-500 rounded-full blur-[120px]" />
        <div className="absolute bottom-[-10%] right-[-10%] w-[40%] h-[40%] bg-emerald-500 rounded-full blur-[120px]" />
      </div>

      <motion.div 
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        className="max-w-md w-full text-center space-y-8 z-10"
      >
        <div className="space-y-2">
          <div className="w-16 h-16 bg-white rounded-2xl mx-auto flex items-center justify-center text-slate-900 shadow-2xl rotate-3">
            <TrendingUp size={32} />
          </div>
          <h1 className="text-4xl font-black text-white uppercase tracking-tighter italic">mysellflow</h1>
          <p className="text-slate-400 font-medium">The OS for your small business growth.</p>
        </div>

        <Card className="p-8 bg-slate-900/40 border-white/10 backdrop-blur-xl text-left">
          {showForgotPassword ? (
            <div className="space-y-4">
              <h2 className="text-xl font-bold text-white">Reset Password</h2>
              <p className="text-xs text-slate-400 leading-relaxed">
                Enter your email address and we'll send you a password reset link automatically.
              </p>
              <form onSubmit={handleForgotPasswordSubmit} className="space-y-4">
                <div className="space-y-1">
                  <label className="text-[9px] font-black text-slate-400 uppercase tracking-wider block">Email Address</label>
                  <div className="relative">
                    <Mail className="absolute left-3 top-3 px-0.5 text-slate-400" size={14} />
                    <input 
                      type="email" 
                      placeholder="you@example.com" 
                      value={resetEmail} 
                      onChange={e => setResetEmail(e.target.value)} 
                      className="w-full bg-slate-950/50 border border-slate-800 p-3 pl-9 rounded-xl text-xs font-medium text-white outline-none focus:border-sky-500 transition-colors"
                      required
                    />
                  </div>
                </div>
                <button 
                  type="submit" 
                  disabled={loading}
                  className="w-full bg-white hover:bg-sky-50 text-slate-950 font-black uppercase tracking-widest text-xs py-3.5 rounded-xl transition-all active:scale-95 flex items-center justify-center gap-2 cursor-pointer disabled:opacity-50"
                >
                  {loading ? 'Sending...' : 'Send Reset Link'}
                </button>
                <button 
                  type="button" 
                  onClick={() => setShowForgotPassword(false)}
                  className="text-center w-full text-[10px] uppercase font-black tracking-wider text-slate-400 hover:text-white transition-colors"
                >
                  Back to Sign In
                </button>
              </form>
            </div>
          ) : (
            <div className="space-y-6">
              {/* Tabs */}
              <div className="flex border-b border-white/10 pb-0.5 animate-fade-in">
                <button
                  type="button"
                  onClick={() => setActiveTab('signin')}
                  className={`flex-1 pb-3 text-xs font-black uppercase tracking-widest border-b-2 transition-all cursor-pointer ${
                    activeTab === 'signin' 
                      ? 'border-sky-500 text-sky-400' 
                      : 'border-transparent text-slate-400 hover:text-white'
                  }`}
                >
                  Sign In
                </button>
                <button
                  type="button"
                  onClick={() => setActiveTab('signup')}
                  className={`flex-1 pb-3 text-xs font-black uppercase tracking-widest border-b-2 transition-all cursor-pointer ${
                    activeTab === 'signup' 
                      ? 'border-sky-500 text-sky-400' 
                      : 'border-transparent text-slate-400 hover:text-white'
                  }`}
                >
                  Register
                </button>
              </div>

              {activeTab === 'signin' ? (
                <form onSubmit={handleSignIn} className="space-y-4">
                  <div className="space-y-1">
                    <label className="text-[9px] font-black text-slate-400 uppercase tracking-wider block">Email Address</label>
                    <div className="relative">
                      <Mail className="absolute left-3 top-3 px-0.5 text-slate-400" size={14} />
                      <input 
                        type="email" 
                        placeholder="you@example.com" 
                        value={email} 
                        onChange={e => setEmail(e.target.value)} 
                        className="w-full bg-slate-950/50 border border-slate-800 p-3 pl-9 rounded-xl text-xs font-medium text-white outline-none focus:border-sky-500 transition-colors"
                        required
                      />
                    </div>
                  </div>

                  <div className="space-y-1.5">
                    <div className="flex items-center justify-between">
                      <label className="text-[9px] font-black text-slate-400 uppercase tracking-wider block">Password</label>
                      <button 
                        type="button" 
                        onClick={() => setShowForgotPassword(true)}
                        className="text-[9px] font-bold text-sky-400 hover:underline hover:text-sky-300"
                      >
                        Forgot?
                      </button>
                    </div>
                    <div className="relative">
                      <Lock className="absolute left-3 top-3 px-0.5 text-slate-400" size={14} />
                      <input 
                        type={showPassword ? "text" : "password"} 
                        placeholder="••••••••" 
                        value={password} 
                        onChange={e => setPassword(e.target.value)} 
                        className="w-full bg-slate-950/50 border border-slate-800 p-3 pl-9 pr-10 rounded-xl text-xs font-medium text-white outline-none focus:border-sky-500 transition-colors"
                        required
                      />
                      <button 
                        type="button"
                        onClick={() => setShowPassword(!showPassword)}
                        className="absolute right-3 top-3 text-slate-400 hover:text-white transition-colors"
                      >
                        {showPassword ? <EyeOff size={14} /> : <Eye size={14} />}
                      </button>
                    </div>
                  </div>

                  <button 
                    type="submit" 
                    disabled={loading}
                    className="w-full bg-white hover:bg-sky-50 text-slate-950 font-black uppercase tracking-widest text-xs py-3.5 rounded-xl transition-all active:scale-95 flex items-center justify-center gap-2 cursor-pointer disabled:opacity-50 mt-2"
                  >
                    {loading ? 'Signing in...' : 'Sign In'}
                  </button>
                </form>
              ) : (
                <form onSubmit={handleSignUp} className="space-y-4">
                  <div className="space-y-1">
                    <label className="text-[9px] font-black text-slate-400 uppercase tracking-wider block">Email Address</label>
                    <div className="relative">
                      <Mail className="absolute left-3 top-3 px-0.5 text-slate-400" size={14} />
                      <input 
                        type="email" 
                        placeholder="you@example.com" 
                        value={email} 
                        onChange={e => setEmail(e.target.value)} 
                        className="w-full bg-slate-950/50 border border-slate-800 p-3 pl-9 rounded-xl text-xs font-medium text-white outline-none focus:border-sky-500 transition-colors"
                        required
                      />
                    </div>
                  </div>

                  <div className="space-y-1">
                    <label className="text-[9px] font-black text-slate-400 uppercase tracking-wider block">Password (at least 6 chars)</label>
                    <div className="relative">
                      <Lock className="absolute left-3 top-3 px-0.5 text-slate-400" size={14} />
                      <input 
                        type={showPassword ? "text" : "password"} 
                        placeholder="Choose secure password" 
                        value={password} 
                        onChange={e => setPassword(e.target.value)} 
                        className="w-full bg-slate-950/50 border border-slate-800 p-3 pl-9 pr-10 rounded-xl text-xs font-medium text-white outline-none focus:border-sky-500 transition-colors"
                        required
                      />
                      <button 
                        type="button"
                        onClick={() => setShowPassword(!showPassword)}
                        className="absolute right-3 top-3 text-slate-400 hover:text-white transition-colors"
                      >
                        {showPassword ? <EyeOff size={14} /> : <Eye size={14} />}
                      </button>
                    </div>
                  </div>

                  <div className="space-y-1">
                    <label className="text-[9px] font-black text-slate-400 uppercase tracking-wider block">Confirm Password</label>
                    <div className="relative">
                      <Lock className="absolute left-3 top-3 px-0.5 text-slate-400" size={14} />
                      <input 
                        type={showPassword ? "text" : "password"} 
                        placeholder="Repeat your password" 
                        value={confirmPassword} 
                        onChange={e => setConfirmPassword(e.target.value)} 
                        className="w-full bg-slate-950/50 border border-slate-800 p-3 pl-9 pr-10 rounded-xl text-xs font-medium text-white outline-none focus:border-sky-500 transition-colors"
                        required
                      />
                    </div>
                  </div>

                  <button 
                    type="submit" 
                    disabled={loading}
                    className="w-full bg-sky-500 hover:bg-sky-600 text-white font-black uppercase tracking-widest text-xs py-3.5 rounded-xl transition-all active:scale-95 flex items-center justify-center gap-2 cursor-pointer disabled:opacity-50 mt-2"
                  >
                    {loading ? 'Creating...' : 'Create Account'}
                  </button>
                </form>
              )}

              {/* Divider */}
              <div className="relative flex items-center justify-center my-6">
                <div className="absolute w-full border-t border-white/5" />
                <span className="relative z-10 bg-slate-900/80 px-4 text-[9px] font-black text-slate-500 uppercase tracking-widest">
                  or
                </span>
              </div>

              {/* Google Sign-In */}
              <button 
                type="button"
                onClick={handleLogin}
                className="w-full bg-white/5 border border-white/10 hover:bg-white/10 text-white py-3.5 rounded-xl font-black uppercase tracking-widest text-xs flex items-center justify-center gap-3 transition-all active:scale-95 shadow-xl cursor-pointer"
              >
                <img src="https://www.google.com/favicon.ico" className="w-4 h-4" alt="Google" />
                Continue with Google
              </button>

              {window.self !== window.top && (
                <div className="mt-4 p-3.5 rounded-xl bg-amber-500/10 border border-amber-500/20 text-[10px] text-amber-200 leading-normal font-medium max-w-sm mx-auto">
                  <p className="font-black uppercase tracking-wider text-amber-400 mb-1 flex items-center gap-1.5 justify-center">
                    <AlertCircle size={10} className="stroke-[2.5]" />
                    Development Iframe Active
                  </p>
                  Google Sign-In usually requires a top-level tab to launch popups without third-party cookie blocks. If authentication fails, please run the app in a new browser tab:
                  <a 
                    href={window.location.href} 
                    target="_blank" 
                    rel="noopener noreferrer" 
                    className="block mt-2 font-black uppercase tracking-[0.2em] text-sky-400 hover:underline text-[9px] text-center bg-sky-950/40 p-2 rounded-lg border border-sky-800/30"
                  >
                    Open App in New Tab ↗
                  </a>
                </div>
              )}
            </div>
          )}
        </Card>

        <p className="text-[10px] text-slate-500 uppercase tracking-widest font-bold">
          Trusted by 10,000+ businesses across Africa
        </p>
      </motion.div>
    </div>
  );
};

interface VerificationScreenProps {
  user: User;
  showToast?: (m: string, t?: 'success' | 'error' | 'info') => void;
  onBypass?: () => void;
}

const VerificationScreen = ({ user, showToast, onBypass }: VerificationScreenProps) => {
  const [checking, setChecking] = useState(false);
  const [resending, setResending] = useState(false);

  const handleCheckVerifyStatus = async () => {
    setChecking(true);
    try {
      await user.reload();
      if (user.emailVerified) {
        if (showToast) showToast("Account verified successfully! Welcome.", "success");
        window.location.reload();
      } else {
        if (showToast) showToast("Your email remains unverified. Did you open the link in the message?", "info");
      }
    } catch (e: any) {
      if (showToast) showToast(e?.message || "Failed to update verification status.", "error");
    } finally {
      setChecking(false);
    }
  };

  const handleResendMail = async () => {
    setResending(true);
    try {
      await sendEmailVerification(user);
      if (showToast) showToast("A secure token-based verification mail has been resent.", "success");
    } catch (e: any) {
      if (showToast) {
        if (e?.code === 'auth/too-many-requests') {
          showToast("Too many requests! Please wait a couple minutes before resending.", "error");
        } else {
          showToast(e?.message || "Failed to send confirmation email.", "error");
        }
      }
    } finally {
      setResending(false);
    }
  };

  return (
    <div className="min-h-screen bg-slate-950 flex flex-col items-center justify-center p-6 relative overflow-hidden">
      <div className="absolute top-0 left-0 w-full h-full opacity-10 pointer-events-none">
        <div className="absolute top-[-10%] left-[-10%] w-[40%] h-[40%] bg-amber-500 rounded-full blur-[120px]" />
      </div>

      <motion.div 
        initial={{ opacity: 0, scale: 0.95 }}
        animate={{ opacity: 1, scale: 1 }}
        className="max-w-md w-full text-center space-y-8 z-10"
      >
        <div className="space-y-2">
          <div className="w-16 h-16 bg-gradient-to-tr from-amber-500 via-amber-600 to-yellow-500 rounded-2xl mx-auto flex items-center justify-center text-slate-900 shadow-2xl">
            <ShieldAlert size={32} className="text-white" />
          </div>
          <h1 className="text-3xl font-black text-white uppercase tracking-tight">Verify Your Email</h1>
          <p className="text-slate-400 font-medium text-xs">Verify your account to protect endpoints from abuse.</p>
        </div>

        <Card className="p-8 bg-slate-900/60 border-white/10 backdrop-blur-xl space-y-6">
          <div className="space-y-3">
            <p className="text-xs text-slate-300 leading-relaxed text-left">
              To protect server systems and prevent identity exploitation, we require verified email addresses.
            </p>
            <div className="bg-slate-950/80 border border-white/5 p-4 rounded-xl text-left">
              <span className="text-[10px] font-black text-slate-500 uppercase tracking-wider block mb-1">Email Sent To</span>
              <span className="text-sm font-bold text-sky-400 font-mono break-all">{user.email}</span>
            </div>
            <p className="text-[11px] text-slate-400 text-left leading-normal">
              Click the secure link in that email, then return here to click <strong>Check Verification Status</strong>.
            </p>
          </div>

          <div className="space-y-3">
            <button
              onClick={handleCheckVerifyStatus}
              disabled={checking}
              className="w-full bg-white hover:bg-sky-50 text-slate-950 font-black uppercase tracking-widest text-xs py-3.5 rounded-xl transition-all active:scale-95 flex items-center justify-center gap-2 cursor-pointer disabled:opacity-50"
            >
              {checking ? (
                <RefreshCw size={14} className="animate-spin text-slate-950" />
              ) : (
                'Check Verification Status'
              )}
            </button>

            <div className="flex gap-3">
              <button
                onClick={handleResendMail}
                disabled={resending}
                className="flex-1 bg-white/5 hover:bg-white/10 border border-white/10 text-white font-bold text-xs py-3 rounded-xl transition-all active:scale-95 disabled:opacity-50 cursor-pointer"
              >
                {resending ? 'Sending...' : 'Resend Email'}
              </button>
              <button
                onClick={() => signOut(auth)}
                className="flex-1 bg-red-500/10 hover:bg-red-500/20 border border-red-500/20 text-red-400 font-bold text-xs py-3 rounded-xl transition-all active:scale-95 cursor-pointer"
              >
                Sign Out
              </button>
            </div>

            {onBypass && (
              <button
                onClick={onBypass}
                className="w-full bg-amber-500/10 hover:bg-amber-500/20 border border-amber-500/20 text-amber-400 font-extrabold uppercase tracking-widest text-[10px] py-3 rounded-xl transition-all active:scale-95 cursor-pointer mt-3 block"
              >
                Bypass Verification (Testing Mode)
              </button>
            )}
          </div>
        </Card>
      </motion.div>
    </div>
  );
};

export default function App() {
  const [user, setUser] = useState<User | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isFirestoreOffline, setIsFirestoreOffline] = useState(false);

  // Connection status listener
  useEffect(() => {
    const handleStatus = (e: Event) => {
      const isOff = (e as CustomEvent).detail?.isOffline;
      setIsFirestoreOffline(!!isOff);
    };
    window.addEventListener('firestore-connection-status', handleStatus);
    return () => {
      window.removeEventListener('firestore-connection-status', handleStatus);
    };
  }, []);

  // Routing State Manager
  const [currentPath, setCurrentPath] = useState(() => {
    return window.location.pathname.replace(/^\/+|\/+$/g, '').toLowerCase().trim();
  });

  const [selectedExploreProductId, setSelectedExploreProductId] = useState<string | null>(() => {
    const raw = window.location.pathname.replace(/^\/+|\/+$/g, '').toLowerCase().trim();
    if (raw.startsWith('explore/product/')) {
      return raw.substring(16).trim();
    }
    return null;
  });

  // Listener to keep currentPath and selectedExploreProductId updated
  useEffect(() => {
    const handleLocationChange = () => {
      const path = window.location.pathname.replace(/^\/+|\/+$/g, '').toLowerCase().trim();
      setCurrentPath(path);
      
      if (path.startsWith('explore/product/')) {
        const segments = window.location.pathname.replace(/^\/+|\/+$/g, '').trim().split('/');
        if (segments[2]) {
          setSelectedExploreProductId(segments[2]);
        }
      } else {
        setSelectedExploreProductId(null);
      }

      // Sync public slug if the route corresponds to standard storefront, otherwise clear
      const slug = resolveStorefrontSlug();
      setPublicSlug(slug);
    };

    window.addEventListener('popstate', handleLocationChange);
    window.addEventListener('pushstate_changed', handleLocationChange);
    
    // Initial check
    handleLocationChange();

    return () => {
      window.removeEventListener('popstate', handleLocationChange);
      window.removeEventListener('pushstate_changed', handleLocationChange);
    };
  }, []);

  const pushRoute = (path: string) => {
    const cleanPath = path.startsWith('/') ? path : `/${path}`;
    window.history.pushState(null, '', cleanPath);
    setTimeout(() => {
      window.dispatchEvent(new Event('pushstate_changed'));
    }, 0);
  };
  
  // Public buyer storefront states
  const [publicBusiness, setPublicBusiness] = useState<BusinessProfile | null>(null);
  const [publicProducts, setPublicProducts] = useState<Product[]>([]);
  const [publicReviews, setPublicReviews] = useState<Review[]>([]);
  const [isPublicLoading, setIsPublicLoading] = useState(false);
  const [publicSlug, setPublicSlug] = useState<string | null>(null);
  const [publicError, setPublicError] = useState<string | null>(null);

  const [activePage, setActivePage] = useState('dashboard');
  const [isImpersonating, setIsImpersonating] = useState(() => {
    return !!localStorage.getItem('impersonation_target_uid');
  });

  const handleImpersonate = (targetUid: string, targetSlug: string) => {
    localStorage.setItem('impersonation_target_uid', targetUid);
    setIsImpersonating(true);
    showToast(`Entering impersonation mode for store "${targetSlug}"`, "success");
    pushRoute('/dashboard');
    setTimeout(() => {
      window.location.reload();
    }, 1200);
  };

  const handleStopImpersonating = () => {
    localStorage.removeItem('impersonation_target_uid');
    setIsImpersonating(false);
    showToast("Impersonation mode ended. Returning to Admin Panel.", "info");
    pushRoute('/admin');
    setTimeout(() => {
      window.location.reload();
    }, 1200);
  };
  const [isWizardTriggered, setIsWizardTriggered] = useState(false);
  const [showAuth, setShowAuth] = useState(false);
  const [authTab, setAuthTab] = useState<'signin' | 'signup'>('signin');
  const [business, setBusiness] = useState<BusinessProfile>(INITIAL_BUSINESS);
  const [products, setProducts] = useState<Product[]>([]);
  const [leads, setLeads] = useState<Lead[]>([]);
  const [orders, setOrders] = useState<Order[]>(INITIAL_ORDERS);
  const [reviews, setReviews] = useState<Review[]>(INITIAL_REVIEWS);
  const [unseenReviewsCount, setUnseenReviewsCount] = useState(0);
  const isFirstReviewsLoad = React.useRef(true);
  const activePageRef = React.useRef(activePage);
  const updatingReviewIds = React.useRef<Set<string>>(new Set());

  const markReviewsAsRead = async (unreadRevs: Review[]) => {
    if (!user) return;
    const toUpdate = unreadRevs.filter(r => r.id && !r.isRead && !updatingReviewIds.current.has(r.id));
    if (toUpdate.length === 0) return;

    toUpdate.forEach(r => {
      if (r.id) {
        updatingReviewIds.current.add(r.id);
      }
    });

    try {
      await Promise.all(toUpdate.map(async (review) => {
        try {
          await updateDoc(doc(db, 'reviews', review.id), {
            isRead: true
          });
        } catch (err) {
          console.error(`Failed to mark review ${review.id} as read:`, err);
          if (review.id) {
            updatingReviewIds.current.delete(review.id);
          }
        }
      }));
      console.log("Successfully marked unread reviews as read in Firestore.");
    } catch (err) {
      console.error("Error in markReviewsAsRead batch:", err);
    }
  };

  const markReviewsAsReadRef = React.useRef(markReviewsAsRead);
  React.useEffect(() => {
    markReviewsAsReadRef.current = markReviewsAsRead;
  });

  const reviewsRef = React.useRef(reviews);
  React.useEffect(() => {
    reviewsRef.current = reviews;
  }, [reviews]);

  const [aiMessage, setAiMessage] = useState<string | null>(null);
  const [isAiLoading, setIsAiLoading] = useState(false);
  const [isLeadModalOpen, setIsLeadModalOpen] = useState(false);
  const [isProductModalOpen, setIsProductModalOpen] = useState(false);
  const [isImportModalOpen, setIsImportModalOpen] = useState(false);

  const [editingProduct, setEditingProduct] = useState<Product | null>(null);
  
  const [toasts, setToasts] = useState<ToastItem[]>([]);
  const showToast = (message: string, type: 'success' | 'error' | 'info' = 'success') => {
    const id = Math.random().toString(36).substring(2, 9);
    setToasts(prev => [...prev, { id, message, type }]);
    setTimeout(() => {
      setToasts(prev => prev.filter(t => t.id !== id));
    }, 4500);
  };
  
  const [deleteConf, setDeleteConf] = useState<{isOpen: boolean, type: 'product' | 'lead' | null, id: string | null}>({ isOpen: false, type: null, id: null });

  const sendEmailNotification = async (subject: string, html: string) => {
    if (!user?.email) return;
    try {
      await fetch('/api/notifications/email', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          to: user.email,
          subject,
          html
        })
      });
    } catch (error) {
      console.error("Failed to send email notification:", error);
    }
  };

  // Dynamic Public Storefront Hook
  useEffect(() => {
    // 1. Resolve storefront slug via subdomain, sandbox testing query param, or pathname
    const slug = resolveStorefrontSlug();
    
    if (slug) {
      console.log("Detected public buyer visiting storefront for slug:", slug);
      setIsPublicLoading(true);
      setPublicError(null);
      
      // Load slug mapping to identify ownerId
      const slugDocRef = doc(db, 'slugs', slug);
      getDoc(slugDocRef).then((slugSnap) => {
        if (slugSnap.exists()) {
          const { ownerId } = slugSnap.data();
          console.log("Resolved store slug owner:", ownerId);
          
          return Promise.all([
            getDoc(doc(db, 'businesses', ownerId)),
            getDocs(query(collection(db, 'products'), where('ownerId', '==', ownerId), where('isActive', '==', true))),
            getDocs(query(collection(db, 'reviews'), where('ownerId', '==', ownerId)))
          ]).then(([bizSnap, prodsSnap, reviewsSnap]) => {
            if (bizSnap.exists()) {
              const bizData = { ...bizSnap.data(), ownerId: bizSnap.id } as BusinessProfile;
              setPublicBusiness(bizData);
              
              const prods = prodsSnap.docs.map(d => ({ ...d.data(), id: d.id } as Product));
              setPublicProducts(prods);
              
              const revs = reviewsSnap.docs.map(d => ({ ...d.data(), id: d.id } as Review));
              setPublicReviews(revs);

              // Increment public storefront views in Firestore securely, using sessionStorage to prevent duplication
              const sessionKey = `viewed_${ownerId}`;
              if (!sessionStorage.getItem(sessionKey)) {
                sessionStorage.setItem(sessionKey, 'true');
                updateDoc(doc(db, 'businesses', ownerId), {
                  views: increment(1)
                }).then(() => {
                  console.log("Successfully recorded storefront visitor view.");
                }).catch((e) => {
                  console.error("Failed to increment views:", e);
                });
              }
            } else {
              setPublicError("This storefront is registered but the profile is empty.");
            }
            setIsPublicLoading(false);
          });
        } else {
          setPublicError("This storefront doesn't exist yet on mysellflow.");
          setIsPublicLoading(false);
        }
      }).catch((err) => {
        console.error("Error loading storefront:", err);
        setPublicError("Connection lookup failed. Please try again.");
        setIsPublicLoading(false);
      });
    } else {
      setPublicBusiness(null);
      setPublicProducts([]);
      setPublicReviews([]);
      setPublicError(null);
      setIsPublicLoading(false);
    }
  }, [publicSlug]);

  const handlePublicAddReview = async (reviewData: any) => {
    if (!publicBusiness) return;
    try {
      const reviewRef = doc(collection(db, 'reviews'));
      const newReview = {
        ...reviewData,
        ownerId: publicBusiness.ownerId,
        createdAt: new Date().toISOString(),
        isRead: false
      };
      await setDoc(reviewRef, newReview);
      setPublicReviews(prev => [...prev, { ...newReview, id: reviewRef.id }]);
      showToast("Review submitted successfully!", "success");
    } catch (e) {
      handleFirestoreError(e, OperationType.CREATE, 'reviews');
    }
  };

  const handlePublicStoreLead = async (name: string, phone: string, interest: string, amount?: number) => {
    if (!publicBusiness) return;
    try {
      const leadRef = doc(collection(db, 'leads'));
      const newLead = {
        name,
        phone,
        status: 'new',
        ownerId: publicBusiness.ownerId,
        createdAt: new Date().toISOString(),
        source: 'Storefront',
        interest,
        notes: `Customer contact from storefront for: ${interest}`,
        amount: amount !== undefined ? Number(amount) || 0 : 0
      };
      await setDoc(leadRef, newLead);
      showToast("Store order inquiry submitted successfully!", "success");
    } catch (e) {
      handleFirestoreError(e, OperationType.CREATE, 'leads');
    }
  };

  // Auth Listener
  useEffect(() => {
    console.log("App mounted, setting up auth listener...");
    window.onerror = (message, source, lineno, colno, error) => {
      console.error(`RUNTIME ERROR: ${message} at ${lineno}:${colno}`, error);
      const msgStr = String(message).toLowerCase();
      if (msgStr.includes('script error') || msgStr.includes('extension') || msgStr.includes('maps') || msgStr.includes('resizeobserver')) return;
      showToast(`A runtime error occurred: ${message}. If you face issues, please refresh.`, "error");
    };

    // Prioritize robust Client Session Persistence in Local Storage
    setPersistence(auth, browserLocalPersistence)
      .then(() => {
        console.log("Firebase storage session persistence prioritized robustly.");
      })
      .catch((err) => {
        console.warn("Failed to set persistent session storage:", err);
      });

    const unsubscribe = onAuthStateChanged(auth, (currentUser) => {
      console.log("Auth state changed - User:", currentUser?.uid || "None", "Verified:", currentUser?.emailVerified);
      if (!currentUser) {
        localStorage.removeItem('bypass_email_verification');
      }
      setUser(currentUser);
      setIsLoading(false);
    });
    return () => unsubscribe();
  }, []);

  // Data Persistence Listeners
  useEffect(() => {
    const isBypassed = localStorage.getItem('bypass_email_verification') === 'true' || user?.email?.toLowerCase() === 'godgiftakwah28@gmail.com';
    if (!user || (!user.emailVerified && !isBypassed)) return;
    isFirstReviewsLoad.current = true;

    const impersonationTargetUid = localStorage.getItem('impersonation_target_uid');
    const activeUid = impersonationTargetUid || user.uid;

    // 1. Business Profile
    console.log("Setting up Firestore listeners for UID:", activeUid);
    const unsubBusiness = onSnapshot(doc(db, 'businesses', activeUid), (snapshot) => {
      if (snapshot.exists()) {
        console.log("Business profile found in Firestore");
        const data = snapshot.data();
        setBusiness({
          ...INITIAL_BUSINESS,
          ...data,
          ownerId: activeUid // Ensure ownerId is correct
        } as BusinessProfile);
      } else {
        console.log("No business profile found, creating initial one...");
        const initialSlug = (INITIAL_BUSINESS.storeSlug || 'shop').toLowerCase().trim();
        const newBusiness: BusinessProfile = {
          ...INITIAL_BUSINESS,
          name: user.displayName || user.email?.split('@')[0] || 'New Business',
          ownerId: activeUid,
          storeSlug: initialSlug,
          storefrontUrl: `https://${initialSlug}.mysellflow.store`,
          subdomain: `${initialSlug}.mysellflow.store`
        };
        setDoc(doc(db, 'slugs', initialSlug), {
          ownerId: activeUid,
          businessName: newBusiness.name
        }).catch(e => console.error("Initial slug map write failed:", e));

        setDoc(doc(db, 'businesses', activeUid), newBusiness)
          .then(() => console.log("Initial business profile created successfully"))
          .catch(e => handleFirestoreError(e, OperationType.WRITE, 'businesses'));
      }
    }, (error) => handleFirestoreError(error, OperationType.GET, 'businesses'));

    // 2. Products
    const qProducts = query(collection(db, 'products'), where('ownerId', '==', activeUid));
    const unsubProducts = onSnapshot(qProducts, (snapshot) => {
      console.log(`Products Listener: Received ${snapshot.docs.length} docs`);
      const prods = snapshot.docs.map(d => ({ ...d.data(), id: d.id } as Product));
      setProducts(prods);
    }, (error) => handleFirestoreError(error, OperationType.LIST, 'products'));

    // 3. Leads
    const qLeads = query(collection(db, 'leads'), where('ownerId', '==', activeUid), orderBy('createdAt', 'desc'));
    const unsubLeads = onSnapshot(qLeads, (snapshot) => {
      console.log(`Leads Listener: Received ${snapshot.docs.length} docs`);
      const lds = snapshot.docs.map(d => ({ ...d.data(), id: d.id } as Lead));
      setLeads(lds);
    }, (error) => handleFirestoreError(error, OperationType.LIST, 'leads'));

    // 4. Orders
    const qOrders = query(collection(db, 'orders'), where('ownerId', '==', activeUid), orderBy('createdAt', 'desc'));
    const unsubOrders = onSnapshot(qOrders, (snapshot) => {
      console.log(`Orders Listener: Received ${snapshot.docs.length} docs`);
      const ords = snapshot.docs.map(d => ({ ...d.data(), id: d.id } as Order));
      setOrders(ords);
    }, (error) => handleFirestoreError(error, OperationType.LIST, 'orders'));

    // 5. Reviews
    const qReviews = query(collection(db, 'reviews'), where('ownerId', '==', activeUid), orderBy('createdAt', 'desc'));
    const unsubReviews = onSnapshot(qReviews, (snapshot) => {
      console.log(`Reviews Listener: Received ${snapshot.docs.length} docs`);
      const revs = snapshot.docs.map(d => ({ ...d.data(), id: d.id } as Review));
      
      if (isFirstReviewsLoad.current) {
        isFirstReviewsLoad.current = false;
        const unreadCount = revs.filter(r => !r.isRead).length;
        if (activePageRef.current !== 'reviews') {
          setUnseenReviewsCount(unreadCount);
        } else {
          setUnseenReviewsCount(0);
          const unread = revs.filter(r => !r.isRead);
          markReviewsAsReadRef.current(unread);
        }
      } else {
        snapshot.docChanges().forEach((change) => {
          if (change.type === 'added') {
            const r = { ...change.doc.data() as Review, id: change.doc.id };
            showToast(`New ${r.rating}-star review from ${r.customerName || 'a customer'}!`, "info");
            if (activePageRef.current !== 'reviews') {
              setUnseenReviewsCount(prev => prev + 1);
            } else {
              markReviewsAsReadRef.current([r]);
            }
          }
        });
      }
      
      setReviews(revs);
    }, (error) => handleFirestoreError(error, OperationType.LIST, 'reviews'));

    return () => {
      unsubBusiness();
      unsubProducts();
      unsubLeads();
      unsubOrders();
      unsubReviews();
    };
  }, [user]);

  // Track activePage and reset unseen review count when on reviews page
  useEffect(() => {
    activePageRef.current = activePage;
    if (activePage === 'reviews') {
      setUnseenReviewsCount(0);
      const unread = reviewsRef.current.filter(r => !r.isRead);
      markReviewsAsRead(unread);
    }
    window.scrollTo(0, 0);
  }, [activePage]);

  const handleAiAction = async () => {
    setIsAiLoading(true);
    const { getSalesInsight } = await import('./services/aiService');
    const insight = await getSalesInsight(leads, orders);
    setAiMessage(insight);
    setIsAiLoading(false);
  };

  const handleQuickLead = async (name: string, phone: string, interest?: string, amount?: number) => {
    if (!user) return;
    const newLead: Omit<Lead, 'id'> = {
      name,
      phone,
      source: 'Quick Add',
      interest: interest || 'General Inquiry',
      status: 'new',
      notes: 'Added via quick form.',
      createdAt: new Date().toISOString(),
      ownerId: user.uid,
      amount: amount !== undefined ? Number(amount) || 0 : 0
    };
    try {
      await addDoc(collection(db, 'leads'), newLead);
    } catch (e) {
      handleFirestoreError(e, OperationType.CREATE, 'leads');
    }
  };

  const handleImportLeads = async (importedLeads: {name: string, phone: string}[]) => {
    if (!user) return;
    
    setIsAiLoading(true); // Re-using this for loading indicator during batch import
    let count = 0;
    
    for (const lead of importedLeads) {
      if (!lead.name || !lead.phone) continue;
      
      const newLead: Omit<Lead, 'id'> = {
        name: lead.name,
        phone: lead.phone,
        source: 'CSV Import',
        interest: 'General Inquiry',
        status: 'new',
        notes: 'Imported via CSV.',
        createdAt: new Date().toISOString(),
        ownerId: user.uid
      };
      
      try {
        await addDoc(collection(db, 'leads'), newLead);
        count++;
      } catch (error) {
        console.error("Error importing lead:", error);
        handleFirestoreError(error, OperationType.CREATE, 'leads');
      }
    }
    
    setIsAiLoading(false);
    showToast(`Successfully imported ${count} leads!`, "success");
  };

  const handleSaveProduct = async (productData: Product | Omit<Product, 'id'>) => {
    if (!user) return;
    
    if ('id' in productData && productData.id) {
      // Update
      const { id, ...rest } = productData;
      
      // Sanitize fields to avoid undefined errors in Firestore.
      // For updates, use deleteField() for any key with an undefined value so it gets removed from the document.
      const sanitizedUpdate: Record<string, any> = {};
      Object.entries(rest).forEach(([key, value]) => {
        if (value === undefined) {
          sanitizedUpdate[key] = deleteField();
        } else {
          sanitizedUpdate[key] = value;
        }
      });

      try {
        await updateDoc(doc(db, 'products', id), {
          ...sanitizedUpdate,
          updatedAt: serverTimestamp()
        });
        showToast(`"${productData.name}" has been updated.`, "success");
      } catch (e) {
        handleFirestoreError(e, OperationType.UPDATE, 'products');
      }
    } else {
      // Create
      // Sanitize fields to avoid undefined errors in Firestore.
      // For creation, omit any key with an undefined value.
      const sanitizedCreate: Record<string, any> = {};
      Object.entries(productData).forEach(([key, value]) => {
        if (value !== undefined) {
          sanitizedCreate[key] = value;
        }
      });

      const newProduct = {
        ...sanitizedCreate,
        ownerId: user.uid,
        createdAt: serverTimestamp(),
        isActive: true
      };
      try {
        await addDoc(collection(db, 'products'), newProduct);
        showToast(`"${productData.name}" has been published to your storefront.`, "success");
      } catch (e) {
        handleFirestoreError(e, OperationType.CREATE, 'products');
      }
    }
    setEditingProduct(null);
  };

  const handleStoreLead = async (name: string, phone: string, interest: string, amount?: number) => {
    if (!user) return;
    const newLead: Omit<Lead, 'id'> = {
      name,
      phone,
      source: 'Storefront',
      interest,
      status: 'new',
      notes: `Customer inquiry from storefront for: ${interest}`,
      createdAt: new Date().toISOString(),
      ownerId: user.uid,
      amount: amount !== undefined ? Number(amount) || 0 : 0
    };
    
    try {
      await addDoc(collection(db, 'leads'), newLead);
    } catch (e) {
      handleFirestoreError(e, OperationType.CREATE, 'leads');
      return;
    }
    
    await sendEmailNotification(
      `📩 New Inquiry: ${name} is interested in ${interest}`,
      `
        <div style="font-family: sans-serif; padding: 20px; border: 1px solid #e2e8f0; border-radius: 12px;">
          <h2 style="color: #0ea5e9;">Hot Lead!</h2>
          <p><strong>${name}</strong> just sent an inquiry from your storefront.</p>
          <div style="background: #f8fafc; padding: 15px; border-radius: 8px; margin: 20px 0;">
            <p style="margin: 0;"><strong>Interested In:</strong> ${interest}</p>
            <p style="margin: 5px 0 0 0;"><strong>Phone:</strong> ${phone}</p>
          </div>
          <p style="font-size: 14px; color: #64748b;">Reach out to them on WhatsApp to close the sale!</p>
        </div>
      `
    );
  };

  const handleWhatsApp = async (lead: Lead, customMessage?: string) => {
    const message = customMessage || `Hi ${lead.name}, I saw your interest in ${lead.interest} on our mysellflow store. How can I help you complete your order?`;
    
    setIsAiLoading(true);
    try {
      const result = await sendWhatsAppMessage(
        lead.phone, 
        message, 
        { token: business.whatsappToken, phoneId: business.whatsappPhoneId }
      );
      if (result.success) {
        showToast(`Message sent to ${lead.name} via WhatsApp Business API!`, "success");
      } else {
        showToast(`WhatsApp API Error: ${result.error}. Falling back to wa.me link.`, "error");
        const url = `https://wa.me/${lead.phone.replace(/[^0-9]/g, '')}?text=${encodeURIComponent(message)}`;
        window.open(url, '_blank');
      }
    } catch (error) {
      console.error("WhatsApp Integration Error:", error);
      showToast("Critical error in WhatsApp integration. Falling back to wa.me link.", "error");
      const url = `https://wa.me/${lead.phone.replace(/[^0-9]/g, '')}?text=${encodeURIComponent(message)}`;
      window.open(url, '_blank');
    } finally {
      setIsAiLoading(false);
    }
  };

  const handleRegenerateTip = async (lead: Lead) => {
    setIsAiLoading(true);
    const { generateFollowUpMessage } = await import('./services/aiService');
    const tip = await generateFollowUpMessage(lead);
    setAiMessage(`Suggested Tip: ${tip}`);
    setIsAiLoading(false);
  };

  const executeDelete = async () => {
    if (!deleteConf.id || !deleteConf.type || !user) return;
    const itemType = deleteConf.type;
    const itemId = deleteConf.id;
    try {
      if (itemType === 'product') {
        const prod = products.find(p => p.id === itemId);
        const name = prod?.name || 'Product';
        await deleteDoc(doc(db, 'products', itemId));
        showToast(`"${name}" has been deleted successfully.`, "success");
      } else if (itemType === 'lead') {
        const leadItem = leads.find(l => l.id === itemId);
        const name = leadItem?.name || 'Lead';
        await deleteDoc(doc(db, 'leads', itemId));
        showToast(`Lead "${name}" has been deleted successfully.`, "success");
      }
    } catch (e) {
      handleFirestoreError(e, OperationType.DELETE, itemType === 'product' ? 'products' : 'leads');
    } finally {
      setDeleteConf({ isOpen: false, type: null, id: null });
    }
  };

  const handleCreateOrder = async (orderData: Omit<Order, 'id'>) => {
    if (!user) return;
    try {
      const docRef = await addDoc(collection(db, 'orders'), {
        ...orderData,
        ownerId: user.uid,
        createdAt: new Date().toISOString()
      });
    } catch (e) {
      handleFirestoreError(e, OperationType.CREATE, 'orders');
      return;
    }

    const product = products.find(p => p.id === orderData.productId);
    const lead = leads.find(l => l.id === orderData.leadId);

    if (product && lead) {
      await sendEmailNotification(
        `🛍️ New Order Received: ${product.name}`,
        `
          <div style="font-family: sans-serif; padding: 20px; border: 1px solid #e2e8f0; border-radius: 12px;">
            <h2 style="color: #0ea5e9;">New Sale!</h2>
            <p>You have a new order from <strong>${lead.name}</strong>.</p>
            <div style="background: #f8fafc; padding: 15px; border-radius: 8px; margin: 20px 0;">
              <p style="margin: 0;"><strong>Product:</strong> ${product.name}</p>
              <p style="margin: 5px 0;"><strong>Amount:</strong> ${formatCurrency(orderData.amount, business.currency)}</p>
              <p style="margin: 5px 0 0 0;"><strong>Status:</strong> ${orderData.paymentStatus.toUpperCase()}</p>
            </div>
            <p style="font-size: 14px; color: #64748b;">Visit your dashboard to manage fulfillment.</p>
          </div>
        `
      );
    }
  };

  const handleAddReview = async (reviewData: Omit<Review, 'id' | 'ownerId'>) => {
    if (!user) return;
    try {
      await addDoc(collection(db, 'reviews'), {
        ...reviewData,
        ownerId: user.uid,
        createdAt: new Date().toISOString(),
        isRead: false
      });
    } catch (e) {
      handleFirestoreError(e, OperationType.CREATE, 'reviews');
    }
  };

  const handleUpdateLeadStatus = async (id: string, status: LeadStatus) => {
    try {
      await updateDoc(doc(db, 'leads', id), { 
        status,
        updatedAt: new Date().toISOString()
      });
    } catch (e) {
      handleFirestoreError(e, OperationType.UPDATE, 'leads');
      return;
    }
    if (status === 'paid') {
      const lead = leads.find(l => l.id === id);
      if (lead) {
        await sendEmailNotification(
          `🎉 Goal Reached: ${lead.name} has paid!`,
          `
            <div style="font-family: sans-serif; padding: 20px; border: 1px solid #e2e8f0; border-radius: 12px;">
              <h2 style="color: #0ea5e9;">Congratulations!</h2>
              <p>Your lead <strong>${lead.name}</strong> (${lead.phone}) has just been marked as <strong>PAID</strong>.</p>
              <div style="background: #f8fafc; padding: 15px; border-radius: 8px; margin: 20px 0;">
                <p style="margin: 0;"><strong>Product Interest:</strong> ${lead.interest}</p>
                <p style="margin: 5px 0 0 0;"><strong>Source:</strong> ${lead.source}</p>
              </div>
              <p style="font-size: 14px; color: #64748b;">Keep up the great work with mysellflow!</p>
            </div>
          `
        );
      }
      showToast(`Celebration! Lead goal met! Record updated.`, "success");
    }
  };

  const handleUpdateLead = async (id: string, fields: Partial<Lead>) => {
    try {
      await updateDoc(doc(db, 'leads', id), {
        ...fields,
        updatedAt: new Date().toISOString()
      });
      showToast("Lead details updated.", "success");
    } catch (e) {
      handleFirestoreError(e, OperationType.UPDATE, 'leads');
    }
  };

  const saveSettings = async (updatedBusiness: BusinessProfile) => {
    if (!user) return;
    try {
      const slug = (updatedBusiness.storeSlug || '').toLowerCase().trim();
      if (!isStorefrontSlug(slug)) {
        showToast("Invalid storefront slug. Only letters, numbers, and dashes are allowed (no dots or special characters).", "error");
        return;
      }
      
      // Normalize and calculated and save to Firestore
      updatedBusiness.storeSlug = slug;
      updatedBusiness.storefrontUrl = `https://${slug}.mysellflow.store`;
      updatedBusiness.subdomain = `${slug}.mysellflow.store`;

      await setDoc(doc(db, 'slugs', slug), {
        ownerId: user.uid,
        businessName: updatedBusiness.name
      });
      
      await setDoc(doc(db, 'businesses', user.uid), updatedBusiness);
      showToast("Settings saved successfully!", "success");
    } catch (e) {
      handleFirestoreError(e, OperationType.WRITE, 'businesses');
    }
  };

  const isAdminRoute = currentPath === 'admin' || currentPath.startsWith('admin/') || window.location.hostname.startsWith('admin.');
  if (isAdminRoute) {
    return (
      <AdminPanel 
        currentPath={currentPath}
        adminUser={user}
        onLogout={() => {
          signOut(auth);
          window.location.reload();
        }}
        onImpersonate={handleImpersonate}
        isImpersonating={isImpersonating}
        onStopImpersonating={handleStopImpersonating}
        showToast={showToast}
      />
    );
  }

  if (currentPath === 'explore' || currentPath.startsWith('explore/')) {
    return (
      <div className="min-h-screen bg-gradient-to-b from-[#FFFFFF] to-[#F5F3FF] text-[#1E1B4B]">
        {/* Navigation Sticky Header */}
        <header className="bg-white/95 backdrop-blur-md border-b border-slate-200/60 sticky top-0 z-40 px-4 md:px-8 py-4 transition-all duration-300 shadow-sm">
          <div className="max-w-7xl mx-auto flex items-center justify-between gap-4">
            <div className="flex items-center gap-2 cursor-pointer" onClick={() => pushRoute('/')}>
              <div className="w-9 h-9 bg-slate-100/10 border border-[#5B2FD4] rounded-xl flex items-center justify-center font-black italic text-[#5B2FD4] text-lg select-none shadow-[0_2px_10px_rgba(91,47,212,0.1)]">
                M
              </div>
              <span className="font-sans font-black tracking-tight text-lg text-slate-950 uppercase italic">
                MySellFlow
              </span>
            </div>

            <div className="flex items-center gap-3">
              <button 
                onClick={() => pushRoute('/')}
                className="text-slate-600 hover:text-[#5B2FD4] font-black uppercase text-[10px] tracking-widest px-4 py-2 rounded-xl transition-all cursor-pointer"
              >
                Go Home
              </button>
              {user ? (
                <button 
                  onClick={() => {
                    localStorage.removeItem('bypass_email_verification');
                    pushRoute('/dashboard');
                    window.location.reload();
                  }}
                  className="bg-slate-950 hover:bg-[#5B2FD4] text-white font-black uppercase text-[10px] tracking-widest px-4 py-2.5 rounded-xl transition-all shadow-md cursor-pointer"
                >
                  Dashboard ↗
                </button>
              ) : (
                <button 
                  onClick={() => {
                    setAuthTab('signin');
                    setShowAuth(true);
                    pushRoute('/');
                  }}
                  className="bg-slate-950 hover:bg-[#5B2FD4] text-white font-black uppercase text-[10px] tracking-widest px-4 py-2.5 rounded-xl transition-all shadow-md cursor-pointer opacity-100"
                >
                  Log In ↗
                </button>
              )}
            </div>
          </div>
        </header>

        <ExplorePage 
          currentProductId={selectedExploreProductId || undefined}
          onSelectProduct={(id) => {
            if (id) {
              pushRoute(`explore/product/${id}`);
            } else {
              pushRoute('explore');
            }
          }}
          onNavigateToStore={(slug) => {
            pushRoute(`store/${slug}`);
          }}
          onAddToCartForStore={(prod, slug) => {
            try {
              const storageKey = `storefront_cart_${slug}`;
              const saved = localStorage.getItem(storageKey);
              let cart: any[] = saved ? JSON.parse(saved) : [];
              const existing = cart.find(item => item.product.id === prod.id);
              if (existing) {
                cart = cart.map(item => item.product.id === prod.id ? { ...item, quantity: item.quantity + 1 } : item);
              } else {
                cart.push({ product: prod, quantity: 1 });
              }
              localStorage.setItem(storageKey, JSON.stringify(cart));
            } catch (err) {
              console.error(err);
            }
          }}
          showToast={showToast}
        />
        <ToastContainer toasts={toasts} onClose={(id) => setToasts(prev => prev.filter(t => t.id !== id))} />
      </div>
    );
  }

  if (publicSlug) {
    if (isPublicLoading) {
      return (
        <div className="min-h-screen bg-slate-950 flex flex-col items-center justify-center space-y-4">
          <motion.div 
            animate={{ rotate: 360 }}
            transition={{ duration: 1, repeat: Infinity, ease: "linear" }}
            className="w-12 h-12 border-4 border-sky-500 border-t-transparent rounded-full shadow-[0_0_20px_rgba(14,165,233,0.3)]"
          />
          <div className="text-center">
            <p className="text-white font-black uppercase tracking-[0.3em] text-[10px] animate-pulse">Loading Storefront</p>
            <p className="text-slate-500 text-[10px] uppercase font-bold mt-1">Connecting to {publicSlug}...</p>
          </div>
        </div>
      );
    }

    if (publicError) {
      return (
        <div className="min-h-screen bg-slate-950 flex flex-col items-center justify-center p-6 text-center space-y-6">
          <div className="p-4 bg-red-500/10 text-red-500 rounded-full border border-red-500/20">
            <AlertCircle size={48} />
          </div>
          <div className="space-y-2 max-w-sm">
            <h2 className="text-2xl font-black text-white tracking-tighter uppercase italic">Storefront Offline</h2>
            <p className="text-slate-400 text-sm leading-relaxed">{publicError}</p>
          </div>
          <div className="space-y-4 pt-4">
            <p className="text-[10px] text-slate-500 uppercase tracking-widest font-black">Powered by mysellflow</p>
            <a 
              href="/"
              className="inline-block bg-white text-slate-950 px-6 py-2.5 rounded-xl text-xs font-bold uppercase tracking-widest hover:bg-slate-100 transition-all shadow-lg"
            >
              Go to mysellflow
            </a>
          </div>
        </div>
      );
    }

    if (publicBusiness) {
      return (
        <div className="min-h-screen w-full bg-slate-50 animate-fade-in">
          <StorefrontPreview 
            business={publicBusiness} 
            products={publicProducts} 
            reviews={publicReviews} 
            onAddReview={handlePublicAddReview} 
            onStoreLead={handlePublicStoreLead} 
            isPreview={false}
          />
          <ToastContainer toasts={toasts} onClose={(id) => setToasts(prev => prev.filter(t => t.id !== id))} />
        </div>
      );
    }
  }

  if (isLoading) {
    return (
      <div className="min-h-screen bg-slate-950 flex flex-col items-center justify-center space-y-4">
        <motion.div 
          animate={{ rotate: 360 }}
          transition={{ duration: 1, repeat: Infinity, ease: "linear" }}
          className="w-12 h-12 border-4 border-sky-500 border-t-transparent rounded-full shadow-[0_0_20px_rgba(14,165,233,0.3)]"
        />
        <div className="text-center">
          <p className="text-white font-black uppercase tracking-[0.3em] text-[10px] animate-pulse">Initializing mysellflow</p>
          <p className="text-slate-500 text-[10px] uppercase font-bold mt-1">Syncing secure data...</p>
        </div>
      </div>
    );
  }

  if (!user) {
    if (showAuth) {
      return (
        <>
          <AuthScreen 
            showToast={showToast} 
            initialTab={authTab}
            onBackToLanding={() => setShowAuth(false)}
          />
          <ToastContainer toasts={toasts} onClose={(id) => setToasts(prev => prev.filter(t => t.id !== id))} />
        </>
      );
    }

    return (
      <>
        <LandingPage 
          onGetStarted={() => {
            setAuthTab('signup');
            setShowAuth(true);
          }}
          onLogin={() => {
            setAuthTab('signin');
            setShowAuth(true);
          }}
        />
        <ToastContainer toasts={toasts} onClose={(id) => setToasts(prev => prev.filter(t => t.id !== id))} />
      </>
    );
  }

  // Verification Gate for Email/Password users
  const isBypassed = localStorage.getItem('bypass_email_verification') === 'true' || user?.email?.toLowerCase() === 'godgiftakwah28@gmail.com';
  if (!user.emailVerified && !isBypassed) {
    return (
      <>
        <VerificationScreen 
          user={user} 
          showToast={showToast} 
          onBypass={() => {
            localStorage.setItem('bypass_email_verification', 'true');
            if (showToast) showToast("Switched to offline testing/demo auth context!", "info");
            window.location.reload();
          }}
        />
        <ToastContainer toasts={toasts} onClose={(id) => setToasts(prev => prev.filter(t => t.id !== id))} />
      </>
    );
  }

  const lowStockCount = products.filter(p => (p.inventoryStatus || 'in_stock') === 'low_stock').length;

  const renderPage = () => {
    switch (activePage) {
      case 'dashboard': return (
        <Dashboard 
          business={business} 
          leads={leads} 
          orders={orders} 
          products={products} 
          reviews={reviews}
          onAiInsight={handleAiAction} 
          onAddLead={() => setIsLeadModalOpen(true)} 
          onAddProduct={() => setIsProductModalOpen(true)} 
          currency={business.currency} 
          onViewProducts={() => setActivePage('products')}
          onViewReviews={() => setActivePage('reviews')}
          onViewLeads={() => setActivePage('leads')}
          onEditProduct={(p) => {
            setEditingProduct(p);
            setIsProductModalOpen(true);
          }}
          onOpenWizard={() => setIsWizardTriggered(true)}
          showToast={showToast}
        />
      );
      case 'products': return (
        <ProductsPage 
          products={products} 
          onAddProduct={() => {
            setEditingProduct(null);
            setIsProductModalOpen(true);
          }} 
          onEditProduct={(p) => {
            setEditingProduct(p);
            setIsProductModalOpen(true);
          }}
          onDeleteProduct={(id) => setDeleteConf({ isOpen: true, type: 'product', id })}
          currency={business.currency} 
        />
      );
      case 'leads': return (
        <LeadsPage 
          leads={leads} 
          products={products}
          currency={business.currency}
          onAddLead={() => setIsLeadModalOpen(true)} 
          onUpdateStatus={handleUpdateLeadStatus} 
          onUpdateLead={handleUpdateLead}
          onWhatsApp={handleWhatsApp} 
          onOpenImport={() => setIsImportModalOpen(true)} 
          onDeleteLead={(id) => setDeleteConf({ isOpen: true, type: 'lead', id })} 
        />
      );
      case 'followups': return <FollowUpsPage leads={leads} onWhatsApp={handleWhatsApp} onRegenerate={handleRegenerateTip} />;
      case 'orders': return <OrdersPage orders={orders} leads={leads} products={products} currency={business.currency} showToast={showToast} />;
      case 'reviews': return <ReviewsPage reviews={reviews} products={products} />;
      case 'storefront': return <StorefrontPreview business={business} products={products} reviews={reviews} onAddReview={handleAddReview} onStoreLead={handleStoreLead} isPreview={true} />;
      case 'settings': return <SettingsPage business={business} setBusiness={saveSettings} onLogout={() => signOut(auth)} showToast={showToast} />;
      default: return (
        <div className="flex flex-col items-center justify-center p-20 text-center space-y-4">
          <div className="p-4 bg-amber-50 text-amber-600 rounded-full">
            <AlertCircle size={48} />
          </div>
          <h2 className="text-xl font-bold text-slate-900 tracking-tight italic serif">Coming Soon</h2>
          <p className="text-slate-500 max-w-xs mx-auto text-sm leading-relaxed">This section is part of the final build. We are polishing it for your success.</p>
          <button 
            onClick={() => setActivePage('dashboard')}
            className="text-sky-600 font-bold hover:underline"
          >
            Go back to Dashboard
          </button>
        </div>
      );
    }
  };

  const impersonationTargetUid = localStorage.getItem('impersonation_target_uid');

  return (
    <div className="min-h-screen bg-gradient-to-b from-[#FFFFFF] to-[#F5F3FF] font-sans selection:bg-[#5B2FD4]/10 selection:text-[#5B2FD4]">
      {impersonationTargetUid && (
        <div className="bg-red-600 text-white font-bold text-[10px] sm:text-xs py-3.5 px-6 text-center shrink-0 z-[10000] relative flex flex-col sm:flex-row items-center justify-between gap-3 shadow-lg uppercase tracking-widest border-b border-red-700">
          <div className="flex items-center gap-2.5">
            <span className="w-2.5 h-2.5 bg-white rounded-full animate-ping"></span>
            <span>ADMINISTRATIVE OPERATIONS: impersonating store owner "{business?.name || 'Merchant'}"</span>
          </div>
          <button
            onClick={() => {
              localStorage.removeItem('impersonation_target_uid');
              localStorage.removeItem('impersonation_admin_uid');
              localStorage.removeItem('impersonation_admin_email');
              window.location.href = '/admin';
            }}
            className="bg-white text-red-700 px-4 py-1.5 rounded-lg hover:bg-red-50 transition-all font-black shrink-0 cursor-pointer text-[10px]"
          >
            Terminate Session & Return to Admin Panel
          </button>
        </div>
      )}
      <Sidebar activePage={activePage} setActivePage={setActivePage} lowStockCount={lowStockCount} unseenReviewsCount={unseenReviewsCount} />
      <MobileNav activePage={activePage} setActivePage={setActivePage} lowStockCount={lowStockCount} unseenReviewsCount={unseenReviewsCount} />
      
      <main className="lg:ml-64 min-h-screen flex flex-col pb-20 lg:pb-8">
        <UserProfile business={business} onClick={() => setActivePage('settings')} />

         <QuickLeadModal 
          isOpen={isLeadModalOpen} 
          onClose={() => setIsLeadModalOpen(false)} 
          onAdd={handleQuickLead} 
          products={products}
        />

        <ImportLeadsModal 
          isOpen={isImportModalOpen}
          onClose={() => setIsImportModalOpen(false)}
          onImport={handleImportLeads}
          showToast={showToast}
        />

        <ProductModal 
          isOpen={isProductModalOpen}
          onClose={() => {
            setIsProductModalOpen(false);
            setEditingProduct(null);
          }}
          onSave={handleSaveProduct}
          product={editingProduct}
        />

        <ConfirmModal
          isOpen={deleteConf.isOpen}
          onClose={() => setDeleteConf({ isOpen: false, type: null, id: null })}
          onConfirm={executeDelete}
          title={`Delete ${deleteConf.type === 'product' ? 'Product' : 'Lead'}`}
          message={`Are you sure you want to delete this ${deleteConf.type}? This action cannot be undone.`}
          confirmText="Delete"
        />
        
        <div className="flex-1 p-4 md:p-8 pt-20 md:pt-24 max-w-7xl mx-auto w-full">
          {renderPage()}
        </div>

        {/* AI Insight Notification */}
        <AnimatePresence>
          {aiMessage && (
            <motion.div 
              initial={{ x: 300, opacity: 0 }}
              animate={{ x: 0, opacity: 1 }}
              exit={{ x: 300, opacity: 0 }}
              className="fixed top-20 right-4 z-[70] max-w-sm"
            >
              <Card className="p-4 bg-slate-900 text-white border-0 shadow-2xl relative overflow-hidden">
                <div className="absolute top-0 right-0 p-2">
                  <button onClick={() => setAiMessage(null)} className="text-white/40 hover:text-white">
                    <Plus className="rotate-45" size={16} />
                  </button>
                </div>
                <div className="flex gap-3 items-start">
                  <div className="w-8 h-8 bg-sky-500 rounded-lg flex items-center justify-center shrink-0">
                    <TrendingUp size={16} />
                  </div>
                  <div>
                    <h4 className="text-[10px] font-black uppercase tracking-widest text-sky-400 mb-1">mysellflow Insight</h4>
                    <p className="text-sm font-medium leading-relaxed italic serif">{aiMessage}</p>
                  </div>
                </div>
              </Card>
            </motion.div>
          )}
        </AnimatePresence>

        {/* Floating SellFlow AI Assistant */}
        <div className="fixed bottom-20 right-4 lg:bottom-10 lg:right-10 z-[60]">
          <button 
            onClick={handleAiAction}
            disabled={isAiLoading}
            className={cn(
              "w-14 h-14 bg-slate-900 text-white rounded-full shadow-2xl flex items-center justify-center hover:scale-105 transition-transform active:scale-95 group overflow-hidden",
              isAiLoading && "animate-pulse"
            )}
          >
             <motion.div 
               animate={{ rotate: 360 }} 
               transition={{ duration: 10, repeat: Infinity, ease: "linear" }}
               className="absolute inset-0 bg-gradient-to-tr from-sky-400 via-transparent to-purple-500 opacity-20 group-hover:opacity-40 transition-opacity"
             />
             {isAiLoading ? <Clock size={24} className="animate-spin" /> : <TrendingUp size={24} className="relative z-10" />}
          </button>
          <div className="absolute bottom-full right-0 mb-4 bg-white px-3 py-2 rounded-xl shadow-xl border border-slate-100 opacity-0 group-hover:opacity-100 transition-opacity pointer-events-none whitespace-nowrap">
            <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest">mysellflow AI</p>
            <p className="text-xs font-bold text-slate-900 underline decoration-sky-500 underline-offset-2">Quick Strategy</p>
          </div>
        </div>
      </main>

      {/* Complete Onboarding setup Wizard and celebrations overlay */}
      {user && (
        <OnboardingFlow 
          business={business} 
          products={products} 
          userId={user.uid} 
          showToast={showToast}
          triggerOpenWizard={isWizardTriggered}
          onCloseWizard={() => setIsWizardTriggered(false)}
        />
      )}

      {/* Render Toast Notifications */}
      <ToastContainer toasts={toasts} onClose={(id) => setToasts(prev => prev.filter(t => t.id !== id))} />
    </div>
  );
}
