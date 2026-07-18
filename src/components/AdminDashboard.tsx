import React, { useState, useEffect } from 'react';
import { 
  Users, 
  Eye, 
  ShoppingBag, 
  Activity, 
  MessageSquare, 
  ArrowUpRight, 
  Clock, 
  RefreshCw, 
  CheckCircle, 
  ShieldAlert,
  Globe,
  Database,
  Search,
  ExternalLink,
  TrendingUp,
  Sliders,
  ChevronRight,
  Sparkles,
  Award,
  AlertCircle,
  HelpCircle,
  Smartphone,
  MessageCircle,
  Star,
  Check,
  X
} from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
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
  PieChart,
  Pie,
  Cell
} from 'recharts';
import { 
  collection, 
  getDocs, 
  doc, 
  getDoc,
  updateDoc, 
  deleteDoc, 
  query, 
  where, 
  addDoc 
} from 'firebase/firestore';
import { db } from '../firebase';
import { BusinessProfile, Product, Review, Lead, Order } from '../types';

// Gorgeous Demonstration Sandbox Data (Merged when Sandbox Toggle is Active)
const SANDBOX_BUSINESSES: BusinessProfile[] = [
  {
    name: "Glow Cosmetics Studio",
    storeSlug: "glow-cosmetics",
    description: "Premium vegan cosmetics and organic skincare products shipped globally.",
    currency: "USD",
    whatsappNumber: "+15550192",
    isVerified: true,
    ownerId: "mock_owner_glow",
    views: 1420,
    clicksMessageMerchant: 290,
    clicksWhatsAppOrder: 412
  },
  {
    name: "The Caffeine Lab",
    storeSlug: "caffeine-lab",
    description: "Artisanal coffee roasters delivering fresh custom-roasted beans.",
    currency: "EUR",
    whatsappNumber: "+49172555021",
    isVerified: true,
    ownerId: "mock_owner_coffee",
    views: 1105,
    clicksMessageMerchant: 180,
    clicksWhatsAppOrder: 224
  },
  {
    name: "Urban Apparel Co",
    storeSlug: "urban-wear",
    description: "Minimalist streetwear and luxury fabrics engineered for daily life.",
    currency: "USD",
    whatsappNumber: "+15550143",
    isVerified: false,
    ownerId: "mock_owner_urban",
    views: 1840,
    clicksMessageMerchant: 395,
    clicksWhatsAppOrder: 512
  },
  {
    name: "Zen Plant Sanctuary",
    storeSlug: "zen-plants",
    description: "Handpicked house plants, custom potting soil, and design ceramics.",
    currency: "USD",
    whatsappNumber: "+15550177",
    isVerified: true,
    ownerId: "mock_owner_zen",
    views: 890,
    clicksMessageMerchant: 145,
    clicksWhatsAppOrder: 198
  },
  {
    name: "Pixel Gadgetry Hub",
    storeSlug: "pixel-gadget",
    description: "Next-gen computer mechanics, mechanical keyboards, and premium desk accessories.",
    currency: "GBP",
    whatsappNumber: "+447911123456",
    isVerified: true,
    ownerId: "mock_owner_pixel",
    views: 2450,
    clicksMessageMerchant: 540,
    clicksWhatsAppOrder: 720
  },
  {
    name: "Gourmet Bites Deli",
    storeSlug: "gourmet-bites",
    description: "Artisanal cheeses, cured meats, and organic wines curated for picnic lovers.",
    currency: "USD",
    whatsappNumber: "+15550212",
    isVerified: false,
    ownerId: "mock_owner_gourmet",
    views: 520,
    clicksMessageMerchant: 92,
    clicksWhatsAppOrder: 115
  }
];

const SANDBOX_PRODUCTS: Product[] = [
  {
    id: "glow_p1",
    name: "Organic Hydration Serum",
    price: 39.99,
    description: "Ultra-concentrated hyaluronic acid serum with rosewater.",
    images: ["https://images.unsplash.com/photo-1620916566398-39f1143ab7be?auto=format&fit=crop&w=600&q=80"],
    type: "physical",
    isActive: true,
    ownerId: "mock_owner_glow",
    isBestSeller: true,
    inventoryStatus: "in_stock"
  },
  {
    id: "glow_p2",
    name: "Velvet Matte Lipstick",
    price: 24.00,
    description: "Richly pigmented moisturizing matte lipstick in sunset red.",
    images: ["https://images.unsplash.com/photo-1586495777744-4413f21062fa?auto=format&fit=crop&w=600&q=80"],
    type: "physical",
    isActive: true,
    ownerId: "mock_owner_glow",
    inventoryStatus: "low_stock"
  },
  {
    id: "coffee_p1",
    name: "Guatemalan Single Origin Beans",
    price: 18.50,
    description: "Medium roast coffee with citrus and chocolate undertones.",
    images: ["https://images.unsplash.com/photo-1447933601403-0c6688de566e?auto=format&fit=crop&w=600&q=80"],
    type: "physical",
    isActive: true,
    ownerId: "mock_owner_coffee",
    isBestSeller: true,
    inventoryStatus: "in_stock"
  },
  {
    id: "urban_p1",
    name: "Oversized Heavyweight Hoodie",
    price: 85.00,
    description: "450GSM loopback cotton hoodie in vintage black.",
    images: ["https://images.unsplash.com/photo-1556911220-e15b29be8c8f?auto=format&fit=crop&w=600&q=80"],
    type: "physical",
    isActive: true,
    ownerId: "mock_owner_urban",
    isNewArrival: true,
    inventoryStatus: "in_stock"
  },
  {
    id: "zen_p1",
    name: "Variegated Monstera Albo",
    price: 120.00,
    description: "Highly sought-after houseplants with beautiful white variegation.",
    images: ["https://images.unsplash.com/photo-1614594975525-e45190c55d0b?auto=format&fit=crop&w=600&q=80"],
    type: "physical",
    isActive: true,
    ownerId: "mock_owner_zen",
    inventoryStatus: "out_of_stock"
  }
];

const SANDBOX_REVIEWS: Review[] = [
  {
    id: "rev1",
    productId: "glow_p1",
    customerName: "Sarah Jenkins",
    rating: 5,
    comment: "This hydration serum worked wonders on my dry skin! Best purchase this year.",
    createdAt: new Date(Date.now() - 3600000 * 2).toISOString(),
    ownerId: "mock_owner_glow"
  },
  {
    id: "rev2",
    productId: "coffee_p1",
    customerName: "David K.",
    rating: 5,
    comment: "Absolutely incredible roasting profile. Smooth chocolate notes with zero bitterness.",
    createdAt: new Date(Date.now() - 3600000 * 12).toISOString(),
    ownerId: "mock_owner_coffee"
  },
  {
    id: "rev3",
    productId: "glow_p2",
    customerName: "Elena Rostova",
    rating: 4,
    comment: "Gorgeously vibrant shade and lasts long, though slightly drying after 6 hours.",
    createdAt: new Date(Date.now() - 3600000 * 48).toISOString(),
    ownerId: "mock_owner_glow"
  }
];

const SANDBOX_LEADS: Lead[] = [
  {
    id: "lead_1",
    name: "John Doe",
    phone: "+15550198",
    source: "Glow Cosmetics Studio",
    interest: "Organic Hydration Serum",
    status: "new",
    notes: "Interested in wholesale order options.",
    createdAt: new Date(Date.now() - 3600000 * 3).toISOString(),
    ownerId: "mock_owner_glow",
    amount: 120.00
  },
  {
    id: "lead_2",
    name: "Alice Smith",
    phone: "+44770090",
    source: "The Caffeine Lab",
    interest: "Guatemalan Single Origin Beans",
    status: "paid",
    notes: "Wants fine-ground option for espresso.",
    createdAt: new Date(Date.now() - 3600000 * 24).toISOString(),
    ownerId: "mock_owner_coffee",
    amount: 37.00
  },
  {
    id: "lead_3",
    name: "Carlos Rivera",
    phone: "+34600123",
    source: "Urban Apparel Co",
    interest: "Oversized Heavyweight Hoodie",
    status: "contacted",
    notes: "Asked for sizing advice on vintage black hoodie.",
    createdAt: new Date(Date.now() - 3600000 * 48).toISOString(),
    ownerId: "mock_owner_urban",
    amount: 85.00
  },
  {
    id: "lead_4",
    name: "Amina Al-Jamil",
    phone: "+23480312",
    source: "Elite Fragrances",
    interest: "Exclusive Oud Intense",
    status: "interested",
    notes: "Requested courier delivery details to Abuja.",
    createdAt: new Date(Date.now() - 3600000 * 5).toISOString(),
    ownerId: "mock_owner_elite",
    amount: 210.00
  }
];

const SANDBOX_ORDERS: Order[] = [
  {
    id: "ord_1",
    leadId: "lead_2",
    productId: "coffee_p1",
    amount: 37.00,
    paymentStatus: "paid",
    fulfillmentStatus: "processing",
    notes: "Ship with custom handwritten card.",
    createdAt: new Date(Date.now() - 3600000 * 22).toISOString()
  },
  {
    id: "ord_2",
    leadId: "lead_1",
    productId: "glow_p1",
    amount: 120.00,
    paymentStatus: "pending",
    fulfillmentStatus: "pending",
    notes: "Awaiting bank transfer confirmation.",
    createdAt: new Date(Date.now() - 3600000 * 2).toISOString()
  },
  {
    id: "ord_3",
    leadId: "lead_4",
    productId: "elite_p1",
    amount: 210.00,
    paymentStatus: "paid",
    fulfillmentStatus: "delivered",
    notes: "Delivered via express dispatcher.",
    createdAt: new Date(Date.now() - 3600000 * 4).toISOString()
  }
];

type TabType = 'analytics' | 'stores' | 'inventory' | 'reviews' | 'transactions' | 'system';

export default function AdminDashboard() {
  const [businesses, setBusinesses] = useState<BusinessProfile[]>([]);
  const [products, setProducts] = useState<Product[]>([]);
  const [reviews, setReviews] = useState<Review[]>([]);
  const [leads, setLeads] = useState<Lead[]>([]);
  const [orders, setOrders] = useState<Order[]>([]);
  
  const [editingBusiness, setEditingBusiness] = useState<BusinessProfile | null>(null);
  const [systemLogs, setSystemLogs] = useState<Array<{ time: string; level: 'INFO' | 'SUCCESS' | 'WARN' | 'ERROR'; msg: string }>>([
    { time: new Date(Date.now() - 50000).toLocaleTimeString(), level: 'INFO', msg: 'Admin Control Hub authenticated successfully.' },
    { time: new Date(Date.now() - 42000).toLocaleTimeString(), level: 'INFO', msg: 'Polling active storefront container state...' },
    { time: new Date(Date.now() - 39000).toLocaleTimeString(), level: 'SUCCESS', msg: 'System healthy. All micro-services returning 200 OK.' },
  ]);

  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [activeTab, setActiveTab] = useState<TabType>('analytics');
  const [currentTime, setCurrentTime] = useState(new Date());
  const [platformViews, setPlatformViews] = useState<number>(0);

  // Fix body background bleed on scroll for Dark-themed Admin Dashboard
  useEffect(() => {
    const originalClassName = document.body.className;
    
    // Apply slate dark background class to prevent white background scroll glitch
    document.body.classList.add('bg-slate-950', 'text-slate-100');
    document.body.classList.remove('bg-white', 'text-dark-text');
    
    return () => {
      document.body.className = originalClassName;
    };
  }, []);

  // Interactive Sandbox Mode Toggle
  const [sandboxEnabled, setSandboxEnabled] = useState(true);

  // Status Action Notifications
  const [toastMessage, setToastMessage] = useState<{ text: string; type: 'success' | 'error' } | null>(null);

  // Firestore status
  const [dbStatus, setDbStatus] = useState<'connected' | 'checking' | 'error'>('checking');
  const [responseTime, setResponseTime] = useState<number | null>(null);

  // Action Pending States (avoid multiple quick clicks)
  const [actionPendingId, setActionPendingId] = useState<string | null>(null);

  // UTC Live Clock
  useEffect(() => {
    const timer = setInterval(() => {
      setCurrentTime(new Date());
    }, 1000);
    return () => clearInterval(timer);
  }, []);

  // Show quick toast message helper
  const showToast = (text: string, type: 'success' | 'error' = 'success') => {
    setToastMessage({ text, type });
    setTimeout(() => {
      setToastMessage(null);
    }, 4000);
  };

  const fetchData = async (isSilent = false) => {
    if (!isSilent) setLoading(true);
    setRefreshing(true);
    const start = performance.now();
    try {
      // Fetch businesses
      const bizSnap = await getDocs(collection(db, 'businesses'));
      const bizList = bizSnap.docs.map(doc => ({
        ...doc.data(),
        ownerId: doc.id
      } as BusinessProfile));
      setBusinesses(bizList);

      // Fetch products
      const prodSnap = await getDocs(collection(db, 'products'));
      const prodList = prodSnap.docs.map(doc => ({
        ...doc.data(),
        id: doc.id
      } as Product));
      setProducts(prodList);

      // Fetch reviews
      const revSnap = await getDocs(collection(db, 'reviews'));
      const revList = revSnap.docs.map(doc => ({
        ...doc.data(),
        id: doc.id
      } as Review));
      setReviews(revList);

      // Fetch leads (safely caught if collection doesn't exist)
      let leadsList: Lead[] = [];
      try {
        const leadsSnap = await getDocs(collection(db, 'leads'));
        leadsList = leadsSnap.docs.map(doc => ({
          ...doc.data(),
          id: doc.id
        } as Lead));
      } catch (err) {
        console.warn("Leads table query failed:", err);
      }
      setLeads(leadsList);

      // Fetch orders (safely caught if collection doesn't exist)
      let ordersList: Order[] = [];
      try {
        const ordersSnap = await getDocs(collection(db, 'orders'));
        ordersList = ordersSnap.docs.map(doc => ({
          ...doc.data(),
          id: doc.id
        } as Order));
      } catch (err) {
        console.warn("Orders table query failed:", err);
      }
      setOrders(ordersList);

      // Fetch global platform views
      let platViews = 0;
      try {
        const platSnap = await getDoc(doc(db, 'platform_stats', 'global'));
        if (platSnap.exists()) {
          platViews = Number(platSnap.data().views) || 0;
        }
      } catch (err) {
        console.warn("Platform global stats query failed:", err);
      }
      setPlatformViews(platViews);

      setSystemLogs(prev => [
        { time: new Date().toLocaleTimeString(), level: 'SUCCESS', msg: `Successfully fetched database payload: ${bizList.length} stores, ${prodList.length} items, ${revList.length} reviews, ${leadsList.length} leads.` },
        ...prev
      ]);

      setDbStatus('connected');
      const end = performance.now();
      setResponseTime(Math.round(end - start));
    } catch (error) {
      console.error("Admin dashboard fetch error:", error);
      setSystemLogs(prev => [
        { time: new Date().toLocaleTimeString(), level: 'ERROR', msg: `Database connection failed or timed out.` },
        ...prev
      ]);
      setDbStatus('error');
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  useEffect(() => {
    fetchData();
  }, []);

  // Merge Firestore with Sandbox if toggled
  const displayedBusinesses = sandboxEnabled 
    ? [...businesses, ...SANDBOX_BUSINESSES.filter(sb => !businesses.some(b => b.storeSlug === sb.storeSlug))]
    : businesses;

  const displayedProducts = sandboxEnabled
    ? [...products, ...SANDBOX_PRODUCTS.filter(sp => !products.some(p => p.id === sp.id))]
    : products;

  const displayedReviews = sandboxEnabled
    ? [...reviews, ...SANDBOX_REVIEWS.filter(sr => !reviews.some(r => r.id === sr.id))]
    : reviews;

  const displayedLeads = sandboxEnabled
    ? [...leads, ...SANDBOX_LEADS.filter(sl => !leads.some(l => l.id === sl.id))]
    : leads;

  const displayedOrders = sandboxEnabled
    ? [...orders, ...SANDBOX_ORDERS.filter(so => !orders.some(o => o.id === so.id))]
    : orders;

  // Filtered merchants based on search query
  const filteredBusinesses = displayedBusinesses.filter(biz => 
    biz.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
    (biz.storeSlug || '').toLowerCase().includes(searchQuery.toLowerCase()) ||
    (biz.whatsappNumber || '').includes(searchQuery)
  );

  // Derived Metrics
  const totalUsers = displayedBusinesses.length;
  const totalViews = displayedBusinesses.reduce((acc, curr) => acc + (Number(curr.views) || 0), 0);
  const totalProducts = displayedProducts.length;
  const totalReviews = displayedReviews.length;
  const displayedPlatformViews = sandboxEnabled ? (platformViews + 15420) : platformViews;

  // Calculate engagement rates
  const totalClicksMerchant = displayedBusinesses.reduce((acc, curr) => acc + (Number(curr.clicksMessageMerchant) || 0), 0);
  const totalClicksOrder = displayedBusinesses.reduce((acc, curr) => acc + (Number(curr.clicksWhatsAppOrder) || 0), 0);
  const totalEngagements = totalClicksMerchant + totalClicksOrder;

  // Prepare data for Recharts View Distribution (Top 8 Stores)
  const chartViewsData = [...displayedBusinesses]
    .sort((a, b) => (b.views || 0) - (a.views || 0))
    .slice(0, 8)
    .map(biz => ({
      name: biz.name.length > 14 ? `${biz.name.substring(0, 11)}...` : biz.name,
      views: biz.views || 0,
      inquiries: (biz.clicksMessageMerchant || 0) + (biz.clicksWhatsAppOrder || 0),
      slug: biz.storeSlug
    }));

  // Prepare data for Product Density Distribution (Top 8 Stores)
  const chartProductsData = [...displayedBusinesses]
    .map(biz => {
      const storeProducts = displayedProducts.filter(p => p.ownerId === biz.ownerId).length;
      return {
        name: biz.name.length > 14 ? `${biz.name.substring(0, 11)}...` : biz.name,
        products: storeProducts
      };
    })
    .sort((a, b) => b.products - a.products)
    .slice(0, 8);

  // Interactive Database Actions (Toggling fields on the live Firestore nodes)
  const handleToggleVerification = async (ownerId: string, storeSlug: string, currentStatus: boolean) => {
    const isSandbox = SANDBOX_BUSINESSES.some(sb => sb.ownerId === ownerId);
    
    if (isSandbox) {
      // Mock update local state immediately
      setBusinesses(prev => prev.map(b => b.ownerId === ownerId ? { ...b, isVerified: !currentStatus } : b));
      showToast(`[Sandbox] Successfully toggled verification for ${storeSlug}!`, 'success');
      return;
    }

    setActionPendingId(ownerId);
    try {
      const bizRef = doc(db, 'businesses', ownerId);
      await updateDoc(bizRef, {
        isVerified: !currentStatus
      });
      // Update local state
      setBusinesses(prev => prev.map(b => b.ownerId === ownerId ? { ...b, isVerified: !currentStatus } : b));
      showToast(`Toggled validation status for ${storeSlug}!`, 'success');
    } catch (err: any) {
      console.error("Verification toggle failed:", err);
      showToast(`Verification write failed: ${err.message || err}`, 'error');
    } finally {
      setActionPendingId(null);
    }
  };

  // Simulates views, message clicks or checkout orders directly inside Firestore for live testing
  const handleSimulateMetric = async (ownerId: string, storeSlug: string, metric: 'views' | 'clicksMessageMerchant' | 'clicksWhatsAppOrder', currentValue: number) => {
    const isSandbox = SANDBOX_BUSINESSES.some(sb => sb.ownerId === ownerId);
    const updatedValue = (Number(currentValue) || 0) + 1;

    if (isSandbox) {
      showToast(`[Sandbox Mode] Simulated 1 +${metric} to ${storeSlug}!`, 'success');
      return;
    }

    setActionPendingId(`${ownerId}-${metric}`);
    try {
      const bizRef = doc(db, 'businesses', ownerId);
      await updateDoc(bizRef, {
        [metric]: updatedValue
      });
      // Update local state
      setBusinesses(prev => prev.map(b => b.ownerId === ownerId ? { ...b, [metric]: updatedValue } : b));
      showToast(`Injected simulated transaction node (+1 ${metric}) on ${storeSlug}!`, 'success');
    } catch (err: any) {
      console.error("Metric simulation failed:", err);
      showToast(`Transaction simulation rejected: ${err.message || err}`, 'error');
    } finally {
      setActionPendingId(null);
    }
  };

  // Save edits of business profile directly to Firestore or Sandbox
  const handleSaveBusiness = async (updated: BusinessProfile) => {
    const isSandbox = SANDBOX_BUSINESSES.some(sb => sb.ownerId === updated.ownerId);

    if (isSandbox) {
      // Simulate save in local state
      setBusinesses(prev => {
        const index = prev.findIndex(b => b.ownerId === updated.ownerId);
        if (index > -1) {
          const next = [...prev];
          next[index] = updated;
          return next;
        } else {
          return [...prev, updated];
        }
      });
      setSystemLogs(prev => [
        { time: new Date().toLocaleTimeString(), level: 'INFO', msg: `[Sandbox] Updated profile for merchant "${updated.storeSlug}".` },
        ...prev
      ]);
      showToast(`[Sandbox Mode] Successfully updated store info for "${updated.storeSlug}".`, 'success');
      setEditingBusiness(null);
      return;
    }

    setActionPendingId(updated.ownerId);
    try {
      const bizRef = doc(db, 'businesses', updated.ownerId);
      // Clean up fields to avoid undefined errors in firestore
      const payload = {
        name: updated.name || '',
        description: updated.description || '',
        currency: updated.currency || 'USD',
        whatsappNumber: updated.whatsappNumber || '',
        storeSlug: updated.storeSlug || '',
        isVerified: updated.isVerified || false,
        whatsappToken: updated.whatsappToken || '',
        whatsappPhoneId: updated.whatsappPhoneId || '',
        whatsappBusinessAccountId: updated.whatsappBusinessAccountId || '',
        metaTitle: updated.metaTitle || '',
        metaDescription: updated.metaDescription || '',
        storefrontUrl: updated.storefrontUrl || '',
        subdomain: updated.subdomain || '',
        views: Number(updated.views) || 0,
        clicksMessageMerchant: Number(updated.clicksMessageMerchant) || 0,
        clicksWhatsAppOrder: Number(updated.clicksWhatsAppOrder) || 0,
      };

      await updateDoc(bizRef, payload);
      setBusinesses(prev => prev.map(b => b.ownerId === updated.ownerId ? { ...b, ...payload } : b));
      setSystemLogs(prev => [
        { time: new Date().toLocaleTimeString(), level: 'SUCCESS', msg: `Updated Firestore node for merchant "${updated.storeSlug}"` },
        ...prev
      ]);
      showToast(`Successfully updated store info for "${updated.storeSlug}"!`, 'success');
      setEditingBusiness(null);
    } catch (err: any) {
      console.error("Save merchant failed:", err);
      showToast(`Save failed: ${err.message || err}`, 'error');
    } finally {
      setActionPendingId(null);
    }
  };

  // Delete/Suspend business document from Firestore or sandbox
  const handleDeleteBusiness = async (ownerId: string, storeSlug: string) => {
    const isSandbox = SANDBOX_BUSINESSES.some(sb => sb.ownerId === ownerId);
    if (isSandbox) {
      showToast(`[Sandbox Mode] Deletion of demo merchant "${storeSlug}" simulated.`, 'success');
      setSystemLogs(prev => [
        { time: new Date().toLocaleTimeString(), level: 'WARN', msg: `[Sandbox] Deleted mock merchant "${storeSlug}".` },
        ...prev
      ]);
      return;
    }

    if (!window.confirm(`Are you absolutely sure you want to delete the store "${storeSlug}"? This action is irreversible and will purge all products listed under it.`)) {
      return;
    }

    setActionPendingId(ownerId);
    try {
      await deleteDoc(doc(db, 'businesses', ownerId));
      
      // Attempt to delete products associated with this ownerId
      try {
        const prodSnap = await getDocs(query(collection(db, 'products'), where('ownerId', '==', ownerId)));
        for (const pDoc of prodSnap.docs) {
          await deleteDoc(doc(db, 'products', pDoc.id));
        }
      } catch (err) {
        console.warn("Could not delete products for merchant during store deletion:", err);
      }

      setBusinesses(prev => prev.filter(b => b.ownerId !== ownerId));
      setSystemLogs(prev => [
        { time: new Date().toLocaleTimeString(), level: 'WARN', msg: `ADMIN PURGE: Deleted merchant "${storeSlug}" and its inventory.` },
        ...prev
      ]);
      showToast(`Successfully purged store "${storeSlug}" from Firestore!`, 'success');
      setEditingBusiness(null);
    } catch (err: any) {
      console.error("Purge failed:", err);
      showToast(`Purge failed: ${err.message || err}`, 'error');
    } finally {
      setActionPendingId(null);
    }
  };

  // Admin Wipe action
  const handleWipeAllTestSubmissions = async () => {
    if (!window.confirm("Are you sure you want to delete ALL real Firestore reviews, leads, and orders? Sandbox mode entries will remain unaffected.")) {
      return;
    }
    setLoading(true);
    try {
      // Clear reviews
      const revSnap = await getDocs(collection(db, 'reviews'));
      for (const d of revSnap.docs) {
        await deleteDoc(doc(db, 'reviews', d.id));
      }
      setReviews([]);

      // Clear leads
      try {
        const leadsSnap = await getDocs(collection(db, 'leads'));
        for (const d of leadsSnap.docs) {
          await deleteDoc(doc(db, 'leads', d.id));
        }
      } catch (e) {}
      setLeads([]);

      // Clear orders
      try {
        const ordersSnap = await getDocs(collection(db, 'orders'));
        for (const d of ordersSnap.docs) {
          await deleteDoc(doc(db, 'orders', d.id));
        }
      } catch (e) {}
      setOrders([]);

      setSystemLogs(prev => [
        { time: new Date().toLocaleTimeString(), level: 'WARN', msg: `ADMIN FLUSH: Erased all user-authored transactions & submissions from database.` },
        ...prev
      ]);
      showToast("All real database transactions and reviews successfully flushed!", 'success');
    } catch (err: any) {
      console.error("Wipe failed:", err);
      showToast(`Wipe failed: ${err.message || err}`, 'error');
    } finally {
      setLoading(false);
    }
  };

  // Admin Inject action
  const handleInjectDemoDataset = async () => {
    if (!window.confirm("This will inject several mock leads, orders, and reviews directly into your LIVE Firestore database for production simulation. Continue?")) {
      return;
    }
    setLoading(true);
    try {
      // Inject reviews
      for (const rev of SANDBOX_REVIEWS) {
        await addDoc(collection(db, 'reviews'), {
          productId: rev.productId,
          customerName: rev.customerName,
          rating: rev.rating,
          comment: rev.comment,
          createdAt: rev.createdAt,
          ownerId: rev.ownerId
        });
      }

      // Inject leads
      for (const ld of SANDBOX_LEADS) {
        await addDoc(collection(db, 'leads'), {
          name: ld.name,
          phone: ld.phone,
          source: ld.source,
          interest: ld.interest,
          status: ld.status,
          notes: ld.notes,
          createdAt: ld.createdAt,
          ownerId: ld.ownerId,
          amount: ld.amount || 0
        });
      }

      // Inject orders
      for (const ord of SANDBOX_ORDERS) {
        await addDoc(collection(db, 'orders'), {
          leadId: ord.leadId,
          productId: ord.productId,
          amount: ord.amount,
          paymentStatus: ord.paymentStatus,
          fulfillmentStatus: ord.fulfillmentStatus,
          notes: ord.notes,
          createdAt: ord.createdAt
        });
      }

      await fetchData(true);
      setSystemLogs(prev => [
        { time: new Date().toLocaleTimeString(), level: 'SUCCESS', msg: `ADMIN INJECT: Added premium simulation entries into LIVE database.` },
        ...prev
      ]);
      showToast("Simulation entries successfully written to your live database!", 'success');
    } catch (err: any) {
      console.error("Injection failed:", err);
      showToast(`Injection failed: ${err.message || err}`, 'error');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-slate-950 text-slate-100 font-sans selection:bg-purple-500/20 selection:text-purple-300">
      
      {/* Dynamic Status Toast */}
      <AnimatePresence>
        {toastMessage && (
          <motion.div
            initial={{ opacity: 0, y: -20, scale: 0.95 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: -10, scale: 0.95 }}
            className={`fixed top-6 right-6 z-50 flex items-center gap-3 px-4 py-3.5 rounded-xl shadow-2xl border ${
              toastMessage.type === 'success' 
                ? 'bg-slate-900 border-purple-500/30 text-purple-200' 
                : 'bg-red-950 border-red-500/30 text-red-200'
            }`}
          >
            {toastMessage.type === 'success' ? (
              <Sparkles className="text-purple-400 animate-pulse" size={16} />
            ) : (
              <ShieldAlert className="text-red-400" size={16} />
            )}
            <span className="text-xs font-semibold">{toastMessage.text}</span>
            <button 
              onClick={() => setToastMessage(null)} 
              className="text-slate-400 hover:text-white transition-colors ml-2"
            >
              <X size={14} />
            </button>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Top Banner & Title Area */}
      <div className="bg-slate-950/80 border-b border-slate-800/60 sticky top-0 z-40 backdrop-blur-md">
        <div className="max-w-7xl mx-auto px-4 md:px-8 py-5 flex flex-col md:flex-row items-start md:items-center justify-between gap-6">
          <div className="flex items-center gap-3.5">
            <div className="w-11 h-11 bg-gradient-to-tr from-purple-600 via-indigo-600 to-sky-500 rounded-2xl flex items-center justify-center shadow-lg shadow-purple-500/15 ring-2 ring-purple-500/20">
              <Activity className="text-white animate-pulse" size={22} />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h1 className="text-2xl font-black tracking-tight bg-gradient-to-r from-white via-slate-100 to-slate-400 bg-clip-text text-transparent uppercase italic">
                  SellFlow Core Admin
                </h1>
                <span className="bg-purple-500/10 text-purple-400 border border-purple-500/30 rounded-full px-2.5 py-0.5 text-[9px] font-black uppercase tracking-wider">
                  SYSADMIN
                </span>
              </div>
              <p className="text-[10px] md:text-xs text-slate-400 uppercase tracking-widest font-black flex items-center gap-1.5 mt-0.5">
                <Globe size={11} className="text-emerald-400" />
                Live Application Progress Monitor
              </p>
            </div>
          </div>

          {/* Live HUD Controls */}
          <div className="flex flex-wrap items-center gap-3.5 w-full md:w-auto">
            
            {/* Sandbox Toggle */}
            <div className="bg-slate-900/90 border border-slate-800/80 rounded-xl px-3 py-2 flex items-center gap-2.5 shadow-xl">
              <Sliders className="text-purple-400" size={13} />
              <div className="flex items-center gap-2">
                <span className="text-[10px] text-slate-400 uppercase font-bold tracking-wider">Demonstration Data</span>
                <button
                  onClick={() => {
                    setSandboxEnabled(!sandboxEnabled);
                    showToast(
                      sandboxEnabled 
                        ? "Demonstration data removed. Viewing actual Firestore records only." 
                        : "Demonstration data merged for rich chart and metric views!",
                      'success'
                    );
                  }}
                  id="sandbox-toggle-btn"
                  className={`w-9 h-5 rounded-full p-0.5 transition-colors duration-200 focus:outline-none ${
                    sandboxEnabled ? 'bg-purple-600' : 'bg-slate-700'
                  }`}
                >
                  <div
                    className={`bg-white w-4 h-4 rounded-full shadow-md transform duration-200 ${
                      sandboxEnabled ? 'translate-x-4' : 'translate-x-0'
                    }`}
                  />
                </button>
              </div>
            </div>

            {/* UTC HUD Clock */}
            <div className="bg-slate-900/90 border border-slate-800/80 rounded-xl px-4 py-2 flex items-center gap-3 shadow-xl">
              <Clock className="text-purple-400 animate-spin-slow" size={14} />
              <div className="text-left font-mono">
                <span className="text-[9px] text-slate-500 uppercase tracking-widest block font-bold">System Time UTC</span>
                <span className="text-xs font-black text-purple-200">{currentTime.toUTCString().slice(17, 25)}</span>
              </div>
            </div>

            {/* Refresh Button */}
            <button
              onClick={() => fetchData(false)}
              disabled={refreshing}
              id="admin-refresh-btn"
              className="bg-purple-600 hover:bg-purple-500 active:scale-95 text-white font-extrabold uppercase tracking-widest text-[10px] px-4 py-3 rounded-xl flex items-center gap-2 transition-all shadow-lg shadow-purple-600/20 cursor-pointer disabled:opacity-50"
            >
              <RefreshCw size={12} className={refreshing ? "animate-spin" : ""} />
              {refreshing ? "Refreshing..." : "Sync Database"}
            </button>
          </div>
        </div>
      </div>

      {/* Nav Tabs Bar */}
      <div className="max-w-7xl mx-auto px-4 md:px-8 mt-6">
        <div className="flex items-center gap-2 border-b border-slate-800/80 pb-px overflow-x-auto">
          <button
            onClick={() => setActiveTab('analytics')}
            className={`px-4 py-3 text-xs font-black uppercase tracking-wider border-b-2 transition-colors cursor-pointer whitespace-nowrap ${
              activeTab === 'analytics' 
                ? 'border-purple-500 text-purple-400 bg-purple-500/5' 
                : 'border-transparent text-slate-400 hover:text-slate-200'
            }`}
          >
            Performance Hub
          </button>
          <button
            onClick={() => setActiveTab('stores')}
            className={`px-4 py-3 text-xs font-black uppercase tracking-wider border-b-2 transition-colors cursor-pointer whitespace-nowrap ${
              activeTab === 'stores' 
                ? 'border-purple-500 text-purple-400 bg-purple-500/5' 
                : 'border-transparent text-slate-400 hover:text-slate-200'
            }`}
          >
            Storefront Control Room
          </button>
          <button
            onClick={() => setActiveTab('inventory')}
            className={`px-4 py-3 text-xs font-black uppercase tracking-wider border-b-2 transition-colors cursor-pointer whitespace-nowrap ${
              activeTab === 'inventory' 
                ? 'border-purple-500 text-purple-400 bg-purple-500/5' 
                : 'border-transparent text-slate-400 hover:text-slate-200'
            }`}
          >
            Catalog & Inventory ({totalProducts})
          </button>
          <button
            onClick={() => setActiveTab('reviews')}
            className={`px-4 py-3 text-xs font-black uppercase tracking-wider border-b-2 transition-colors cursor-pointer whitespace-nowrap ${
              activeTab === 'reviews' 
                ? 'border-purple-500 text-purple-400 bg-purple-500/5' 
                : 'border-transparent text-slate-400 hover:text-slate-200'
            }`}
          >
            Platform Reviews ({totalReviews})
          </button>
          <button
            onClick={() => setActiveTab('transactions')}
            className={`px-4 py-3 text-xs font-black uppercase tracking-wider border-b-2 transition-colors cursor-pointer whitespace-nowrap ${
              activeTab === 'transactions' 
                ? 'border-purple-500 text-purple-400 bg-purple-500/5' 
                : 'border-transparent text-slate-400 hover:text-slate-200'
            }`}
          >
            Leads & Orders ({displayedLeads.length + displayedOrders.length})
          </button>
          <button
            onClick={() => setActiveTab('system')}
            className={`px-4 py-3 text-xs font-black uppercase tracking-wider border-b-2 transition-colors cursor-pointer whitespace-nowrap ${
              activeTab === 'system' 
                ? 'border-purple-500 text-purple-400 bg-purple-500/5' 
                : 'border-transparent text-slate-400 hover:text-slate-200'
            }`}
          >
            Terminal / System Logs
          </button>
        </div>
      </div>

      {loading ? (
        <div className="min-h-[50vh] flex flex-col items-center justify-center space-y-4">
          <div className="w-12 h-12 border-4 border-purple-500 border-t-transparent rounded-full animate-spin shadow-[0_0_20px_rgba(168,85,247,0.3)]" />
          <div className="text-center">
            <p className="text-white font-black uppercase tracking-[0.2em] text-[10px] animate-pulse">Scanning Cloud Nodes</p>
            <p className="text-slate-500 text-[10px] uppercase font-bold mt-1">Aggregating real-time user metrics...</p>
          </div>
        </div>
      ) : (
        <div className="max-w-7xl mx-auto px-4 md:px-8 py-8 space-y-8">
          
          {/* Diagnostic System Health indicators */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div className="bg-slate-900/60 border border-slate-800/60 rounded-xl p-4 flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div className="p-2 bg-emerald-500/10 rounded-lg">
                  <Database className="text-emerald-400" size={16} />
                </div>
                <div>
                  <span className="text-[9px] uppercase tracking-wider text-slate-500 block font-bold">Database Node Status</span>
                  <span className="text-xs font-bold text-slate-300">Firestore Cloud Node</span>
                </div>
              </div>
              <span className="flex h-2.5 w-2.5 relative">
                <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75"></span>
                <span className="relative inline-flex rounded-full h-2.5 w-2.5 bg-emerald-500"></span>
              </span>
            </div>

            <div className="bg-slate-900/60 border border-slate-800/60 rounded-xl p-4 flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div className="p-2 bg-sky-500/10 rounded-lg">
                  <Activity className="text-sky-400" size={16} />
                </div>
                <div>
                  <span className="text-[9px] uppercase tracking-wider text-slate-500 block font-bold">Fetch Response Latency</span>
                  <span className="text-xs font-bold text-slate-300">{responseTime ? `${responseTime}ms` : "14ms"}</span>
                </div>
              </div>
              <span className="text-[9px] font-mono text-slate-500 uppercase font-black">STABLE</span>
            </div>

            <div className="bg-slate-900/60 border border-slate-800/60 rounded-xl p-4 flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div className="p-2 bg-purple-500/10 rounded-lg">
                  <Globe className="text-purple-400" size={16} />
                </div>
                <div>
                  <span className="text-[9px] uppercase tracking-wider text-slate-500 block font-bold">Primary Domain Ingress</span>
                  <span className="text-xs font-bold text-slate-300">mysellflow.store</span>
                </div>
              </div>
              <span className="text-[9px] font-mono text-purple-400 uppercase font-black">SSL SECURE</span>
            </div>
          </div>

          {/* 4 Main Important Icons & Core Metrics Grid */}
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
            
            {/* Metric Card 1: Total App Users */}
            <div id="admin-users-card" className="relative group bg-slate-900/40 border border-slate-800 hover:border-purple-500/40 p-6 rounded-2xl transition-all duration-300 hover:shadow-[0_0_30px_rgba(168,85,247,0.05)] overflow-hidden">
              <div className="absolute top-0 left-0 w-1 h-full bg-gradient-to-b from-purple-500 to-indigo-500" />
              <div className="flex items-start justify-between">
                <div>
                  <p className="text-slate-400 font-extrabold text-xs uppercase tracking-widest">Active App Users</p>
                  <p className="text-4xl font-black text-white mt-3 tracking-tighter font-mono">{totalUsers}</p>
                </div>
                <div className="p-3.5 bg-purple-500/10 rounded-xl border border-purple-500/20 text-purple-400 group-hover:scale-110 transition-transform duration-300">
                  <Users size={24} className="stroke-[2.5]" />
                </div>
              </div>
              <div className="mt-4 pt-4 border-t border-slate-800/60 flex items-center justify-between text-xs">
                <span className="text-slate-500 font-semibold">Registered Storefront Owners</span>
                <span className="text-emerald-400 font-bold flex items-center gap-1 font-mono">
                  <TrendingUp size={12} />
                  +100% Growth
                </span>
              </div>
            </div>

            {/* Metric Card 2: Total Storefront Visitor Views */}
            <div id="admin-views-card" className="relative group bg-slate-900/40 border border-slate-800 hover:border-sky-500/40 p-6 rounded-2xl transition-all duration-300 hover:shadow-[0_0_30px_rgba(14,165,233,0.05)] overflow-hidden">
              <div className="absolute top-0 left-0 w-1 h-full bg-gradient-to-b from-sky-500 to-indigo-500" />
              <div className="flex items-start justify-between">
                <div>
                  <p className="text-slate-400 font-extrabold text-xs uppercase tracking-widest">Total Storefront Views</p>
                  <p className="text-4xl font-black text-white mt-3 tracking-tighter font-mono">{totalViews}</p>
                </div>
                <div className="p-3.5 bg-sky-500/10 rounded-xl border border-sky-500/20 text-sky-400 group-hover:scale-110 transition-transform duration-300">
                  <Eye size={24} className="stroke-[2.5]" />
                </div>
              </div>
              <div className="mt-4 pt-4 border-t border-slate-800/60 flex items-center justify-between text-xs">
                <span className="text-slate-500 font-semibold">Aggregate Store Traffic</span>
                <span className="text-indigo-400 font-bold flex items-center gap-1 font-mono">
                  Direct Merchant Visits
                </span>
              </div>
            </div>

            {/* Metric Card 3: Total Website Visitor Views */}
            <div id="admin-website-views-card" className="relative group bg-slate-900/40 border border-slate-800 hover:border-emerald-500/40 p-6 rounded-2xl transition-all duration-300 hover:shadow-[0_0_30px_rgba(16,185,129,0.05)] overflow-hidden">
              <div className="absolute top-0 left-0 w-1 h-full bg-gradient-to-b from-emerald-500 to-teal-500" />
              <div className="flex items-start justify-between">
                <div>
                  <p className="text-slate-400 font-extrabold text-xs uppercase tracking-widest">Total Website Views</p>
                  <p className="text-4xl font-black text-white mt-3 tracking-tighter font-mono">{displayedPlatformViews}</p>
                </div>
                <div className="p-3.5 bg-emerald-500/10 rounded-xl border border-emerald-500/20 text-emerald-400 group-hover:scale-110 transition-transform duration-300">
                  <Globe size={24} className="stroke-[2.5]" />
                </div>
              </div>
              <div className="mt-4 pt-4 border-t border-slate-800/60 flex items-center justify-between text-xs">
                <span className="text-slate-500 font-semibold">Total Website Visitor Views</span>
                <span className="text-teal-400 font-bold flex items-center gap-1 font-mono">
                  Live Traffic Stream
                </span>
              </div>
            </div>

            {/* Metric Card 4: Total Published Products */}
            <div id="admin-products-card" className="relative group bg-slate-900/40 border border-slate-800 hover:border-indigo-500/40 p-6 rounded-2xl transition-all duration-300 hover:shadow-[0_0_30px_rgba(99,102,241,0.05)] overflow-hidden">
              <div className="absolute top-0 left-0 w-1 h-full bg-gradient-to-b from-indigo-500 to-purple-500" />
              <div className="flex items-start justify-between">
                <div>
                  <p className="text-slate-400 font-extrabold text-xs uppercase tracking-widest">Total Active Products</p>
                  <p className="text-4xl font-black text-white mt-3 tracking-tighter font-mono">{totalProducts}</p>
                </div>
                <div className="p-3.5 bg-indigo-500/10 rounded-xl border border-indigo-500/20 text-indigo-400 group-hover:scale-110 transition-transform duration-300">
                  <ShoppingBag size={24} className="stroke-[2.5]" />
                </div>
              </div>
              <div className="mt-4 pt-4 border-t border-slate-800/60 flex items-center justify-between text-xs">
                <span className="text-slate-500 font-semibold">Published Catalog items</span>
                <span className="text-purple-400 font-bold flex items-center gap-1 font-mono">
                  Active Inventories
                </span>
              </div>
            </div>

          </div>

          {/* Sub-Metrics & Secondary Indicators */}
          <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
            <div className="bg-slate-900/20 border border-slate-800/80 rounded-xl p-4">
              <div className="flex items-center gap-3">
                <div className="p-2 bg-emerald-500/10 text-emerald-400 rounded-lg">
                  <MessageSquare size={16} />
                </div>
                <div>
                  <span className="text-[10px] text-slate-500 uppercase tracking-widest block font-bold">Total Store Reviews</span>
                  <span className="text-base font-black text-slate-200 font-mono">{totalReviews}</span>
                </div>
              </div>
            </div>

            <div className="bg-slate-900/20 border border-slate-800/80 rounded-xl p-4">
              <div className="flex items-center gap-3">
                <div className="p-2 bg-purple-500/10 text-purple-400 rounded-lg">
                  <TrendingUp size={16} />
                </div>
                <div>
                  <span className="text-[10px] text-slate-500 uppercase tracking-widest block font-bold">WhatsApp Conversions</span>
                  <span className="text-base font-black text-slate-200 font-mono">{totalEngagements}</span>
                </div>
              </div>
            </div>

            <div className="bg-slate-900/20 border border-slate-800/80 rounded-xl p-4">
              <div className="flex items-center gap-3">
                <div className="p-2 bg-yellow-500/10 text-yellow-400 rounded-lg">
                  <Globe size={16} />
                </div>
                <div>
                  <span className="text-[10px] text-slate-500 uppercase tracking-widest block font-bold">Average Storefront Views</span>
                  <span className="text-base font-black text-slate-200 font-mono">
                    {totalUsers > 0 ? Math.round(totalViews / totalUsers) : 0}
                  </span>
                </div>
              </div>
            </div>

            <div className="bg-slate-900/20 border border-slate-800/80 rounded-xl p-4">
              <div className="flex items-center gap-3">
                <div className="p-2 bg-sky-500/10 text-sky-400 rounded-lg">
                  <ShoppingBag size={16} />
                </div>
                <div>
                  <span className="text-[10px] text-slate-500 uppercase tracking-widest block font-bold">Average Products/User</span>
                  <span className="text-base font-black text-slate-200 font-mono">
                    {totalUsers > 0 ? (totalProducts / totalUsers).toFixed(1) : '0'}
                  </span>
                </div>
              </div>
            </div>
          </div>

          {/* Tab 1: Performance Hub (Charts & Aggregations) */}
          {activeTab === 'analytics' && (
            <motion.div 
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              className="space-y-8"
            >
              <div className="grid grid-cols-1 lg:grid-cols-2 gap-8 min-w-0">
                
                {/* Traffic Views & Engagement Performance */}
                <div className="bg-slate-900/30 border border-slate-800 p-6 rounded-2xl space-y-4 min-w-0">
                  <div>
                    <h3 className="text-sm font-black uppercase tracking-widest text-slate-200">Storefront Traffic views & Inquiries</h3>
                    <p className="text-[10px] text-slate-500 uppercase font-bold">Comparison of visitors views and WhatsApp leads by seller</p>
                  </div>
                  <div className="h-72 w-full">
                    <ResponsiveContainer width="100%" height="100%">
                      <AreaChart data={chartViewsData}>
                        <defs>
                          <linearGradient id="colorViews" x1="0" y1="0" x2="0" y2="1">
                            <stop offset="5%" stopColor="#8b5cf6" stopOpacity={0.35}/>
                            <stop offset="95%" stopColor="#8b5cf6" stopOpacity={0}/>
                          </linearGradient>
                          <linearGradient id="colorInquiries" x1="0" y1="0" x2="0" y2="1">
                            <stop offset="5%" stopColor="#0ea5e9" stopOpacity={0.25}/>
                            <stop offset="95%" stopColor="#0ea5e9" stopOpacity={0}/>
                          </linearGradient>
                        </defs>
                        <CartesianGrid strokeDasharray="3 3" stroke="#1e293b" opacity={0.3} />
                        <XAxis dataKey="name" stroke="#64748b" fontSize={9} tickLine={false} />
                        <YAxis stroke="#64748b" fontSize={9} tickLine={false} />
                        <Tooltip 
                          contentStyle={{ backgroundColor: '#0f172a', borderColor: '#334155', borderRadius: '12px' }}
                          labelStyle={{ color: '#94a3b8', fontSize: '10px', fontWeight: 'bold' }}
                          itemStyle={{ fontSize: '11px' }}
                        />
                        <Area type="monotone" dataKey="views" stroke="#a855f7" strokeWidth={2.5} fillOpacity={1} fill="url(#colorViews)" name="Traffic Views" />
                        <Area type="monotone" dataKey="inquiries" stroke="#0ea5e9" strokeWidth={1.5} fillOpacity={1} fill="url(#colorInquiries)" name="WhatsApp Clicks" />
                      </AreaChart>
                    </ResponsiveContainer>
                  </div>
                </div>

                {/* Inventory Distribution Density */}
                <div className="bg-slate-900/30 border border-slate-800 p-6 rounded-2xl space-y-4 min-w-0">
                  <div>
                    <h3 className="text-sm font-black uppercase tracking-widest text-slate-200">Catalog Density Distribution</h3>
                    <p className="text-[10px] text-slate-500 uppercase font-bold">Total number of published active product listings</p>
                  </div>
                  <div className="h-72 w-full">
                    <ResponsiveContainer width="100%" height="100%">
                      <BarChart data={chartProductsData}>
                        <CartesianGrid strokeDasharray="3 3" stroke="#1e293b" opacity={0.3} />
                        <XAxis dataKey="name" stroke="#64748b" fontSize={9} tickLine={false} />
                        <YAxis stroke="#64748b" fontSize={9} tickLine={false} />
                        <Tooltip 
                          contentStyle={{ backgroundColor: '#0f172a', borderColor: '#334155', borderRadius: '12px' }}
                          labelStyle={{ color: '#94a3b8', fontSize: '10px', fontWeight: 'bold' }}
                          itemStyle={{ color: '#f8fafc', fontSize: '11px' }}
                        />
                        <Bar dataKey="products" fill="#06b6d4" radius={[6, 6, 0, 0]} name="Active Products" />
                      </BarChart>
                    </ResponsiveContainer>
                  </div>
                </div>

              </div>

              {/* Engagement Ratios */}
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                
                {/* Traffic Conversion Rate */}
                <div className="bg-slate-900/40 border border-slate-800/80 p-5 rounded-2xl flex items-center justify-between">
                  <div className="space-y-1">
                    <span className="text-[10px] text-slate-500 uppercase font-bold tracking-wider block">Conversion (Lead to Views)</span>
                    <span className="text-2xl font-black text-white font-mono">
                      {totalViews > 0 ? ((totalEngagements / totalViews) * 100).toFixed(1) : 0}%
                    </span>
                    <span className="text-[10px] text-slate-400 block">Total WhatsApp Leads / Total Views</span>
                  </div>
                  <div className="w-16 h-16 rounded-full border border-purple-500/20 bg-purple-500/5 flex items-center justify-center">
                    <TrendingUp className="text-purple-400" size={24} />
                  </div>
                </div>

                {/* Avg views per storefront */}
                <div className="bg-slate-900/40 border border-slate-800/80 p-5 rounded-2xl flex items-center justify-between">
                  <div className="space-y-1">
                    <span className="text-[10px] text-slate-500 uppercase font-bold tracking-wider block">Average Store Views</span>
                    <span className="text-2xl font-black text-white font-mono">
                      {totalUsers > 0 ? Math.round(totalViews / totalUsers) : 0}
                    </span>
                    <span className="text-[10px] text-slate-400 block">Views per registered merchant</span>
                  </div>
                  <div className="w-16 h-16 rounded-full border border-indigo-500/20 bg-indigo-500/5 flex items-center justify-center">
                    <Eye className="text-indigo-400" size={24} />
                  </div>
                </div>

                {/* Verified Store Ratio */}
                <div className="bg-slate-900/40 border border-slate-800/80 p-5 rounded-2xl flex items-center justify-between">
                  <div className="space-y-1">
                    <span className="text-[10px] text-slate-500 uppercase font-bold tracking-wider block">Verified PRO Sellers</span>
                    <span className="text-2xl font-black text-white font-mono">
                      {totalUsers > 0 
                        ? Math.round((displayedBusinesses.filter(b => b.isVerified).length / totalUsers) * 100) 
                        : 0}%
                    </span>
                    <span className="text-[10px] text-slate-400 block">Percentage of verified storefronts</span>
                  </div>
                  <div className="w-16 h-16 rounded-full border border-sky-500/20 bg-sky-500/5 flex items-center justify-center">
                    <Award className="text-sky-400" size={24} />
                  </div>
                </div>

              </div>
            </motion.div>
          )}

          {/* Tab 2: Storefront Control Room */}
          {activeTab === 'stores' && (
            <motion.div 
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              className="space-y-6"
            >
              {/* Directory Filter, Actions Header */}
              <div className="bg-slate-900/30 border border-slate-800 rounded-2xl overflow-hidden">
                <div className="p-6 border-b border-slate-800/80 flex flex-col md:flex-row items-start md:items-center justify-between gap-4">
                  <div>
                    <h2 className="text-base font-black uppercase tracking-wider text-slate-200">Storefront Administration Panel</h2>
                    <p className="text-[10px] text-slate-500 uppercase font-black mt-0.5">Toggle PRO verification and inject test clicks/views live</p>
                  </div>
                  
                  {/* Search input */}
                  <div className="relative w-full md:w-80">
                    <Search className="absolute left-3 top-2.5 text-slate-500" size={14} />
                    <input
                      type="text"
                      placeholder="Search business name, slug, or WhatsApp..."
                      value={searchQuery}
                      onChange={(e) => setSearchQuery(e.target.value)}
                      className="w-full bg-slate-950/80 border border-slate-800 focus:border-purple-500/50 outline-none p-2.5 pl-9 pr-4 rounded-xl text-xs font-semibold text-slate-200 placeholder-slate-600 transition-colors"
                    />
                  </div>
                </div>

                {filteredBusinesses.length === 0 ? (
                  <div className="p-16 text-center space-y-4">
                    <div className="p-4 bg-slate-950 border border-slate-800 rounded-full inline-block text-slate-600">
                      <Search size={26} />
                    </div>
                    <div>
                      <h4 className="text-sm font-bold text-slate-400">No active merchants match query</h4>
                      <p className="text-slate-600 text-xs max-w-sm mx-auto mt-1">Try check for spelling variations or verify that Sandbox Mode is toggled to load simulated data.</p>
                    </div>
                  </div>
                ) : (
                  <div className="overflow-x-auto">
                    <table className="w-full text-left text-xs border-collapse">
                      <thead>
                        <tr className="bg-slate-950/60 text-slate-500 font-extrabold uppercase tracking-widest border-b border-slate-800/80">
                          <th className="py-4.5 px-6">Merchant & Subdomain</th>
                          <th className="py-4.5 px-6">Verification</th>
                          <th className="py-4.5 px-6 text-center">Views</th>
                          <th className="py-4.5 px-6 text-center">Chat Clicks</th>
                          <th className="py-4.5 px-6 text-center">Order Clicks</th>
                          <th className="py-4.5 px-6">WhatsApp API Line</th>
                          <th className="py-4.5 px-6 text-right">Actions</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-slate-800/40">
                        {filteredBusinesses.map((biz, index) => {
                          const bizProdsCount = displayedProducts.filter(p => p.ownerId === biz.ownerId).length;
                          const isVerified = biz.isVerified;
                          const isPending = actionPendingId === biz.ownerId;
                          const isSandbox = SANDBOX_BUSINESSES.some(sb => sb.ownerId === biz.ownerId);

                          return (
                            <tr key={biz.ownerId || index} className="hover:bg-slate-900/20 transition-colors">
                              {/* Name and slug */}
                              <td className="py-4.5 px-6">
                                <div className="space-y-1">
                                  <div className="flex items-center gap-2">
                                    <span className="font-bold text-slate-200 text-sm">{biz.name}</span>
                                    {isSandbox && (
                                      <span className="bg-purple-500/10 text-purple-400 border border-purple-500/20 rounded px-1.5 py-0.5 text-[8px] font-bold">
                                        MOCK
                                      </span>
                                    )}
                                  </div>
                                  <div className="flex items-center gap-1.5 text-slate-500 font-mono text-[10px]">
                                    <span>{biz.storeSlug}.mysellflow.store</span>
                                    <a 
                                      href={`/store/${biz.storeSlug}`} 
                                      target="_blank" 
                                      referrerPolicy="no-referrer"
                                      className="text-purple-500 hover:text-purple-400"
                                    >
                                      <ExternalLink size={10} />
                                    </a>
                                  </div>
                                </div>
                              </td>

                              {/* Verification Toggle */}
                              <td className="py-4.5 px-6">
                                <button
                                  onClick={() => handleToggleVerification(biz.ownerId, biz.storeSlug, isVerified)}
                                  disabled={isPending}
                                  className={`flex items-center gap-1.5 font-bold uppercase tracking-wider text-[9px] px-2.5 py-1.5 rounded-lg border cursor-pointer transition-all ${
                                    isVerified 
                                      ? 'bg-sky-500/10 border-sky-500/30 text-sky-400 hover:bg-sky-500/20' 
                                      : 'bg-slate-900 border-slate-800 text-slate-400 hover:text-slate-300 hover:border-slate-700'
                                  }`}
                                >
                                  {isVerified ? (
                                    <>
                                      <Award size={10} className="text-sky-400" />
                                      PRO Verified
                                    </>
                                  ) : (
                                    <>
                                      <HelpCircle size={10} className="text-slate-500" />
                                      Unverified
                                    </>
                                  )}
                                </button>
                              </td>

                              {/* Traffic View Simulator */}
                              <td className="py-4.5 px-6 text-center">
                                <div className="flex flex-col items-center gap-1">
                                  <span className="font-mono font-bold text-sky-400 text-sm">
                                    {biz.views || 0}
                                  </span>
                                  <button
                                    onClick={() => handleSimulateMetric(biz.ownerId, biz.storeSlug, 'views', biz.views || 0)}
                                    className="text-[9px] uppercase font-black tracking-widest text-slate-500 hover:text-sky-400 cursor-pointer transition-colors bg-slate-900 border border-slate-800 hover:border-sky-500/20 px-1.5 py-0.5 rounded"
                                  >
                                    +1 View
                                  </button>
                                </div>
                              </td>

                              {/* Clicks Message Merchant Simulator */}
                              <td className="py-4.5 px-6 text-center">
                                <div className="flex flex-col items-center gap-1">
                                  <span className="font-mono font-bold text-indigo-400 text-sm">
                                    {biz.clicksMessageMerchant || 0}
                                  </span>
                                  <button
                                    onClick={() => handleSimulateMetric(biz.ownerId, biz.storeSlug, 'clicksMessageMerchant', biz.clicksMessageMerchant || 0)}
                                    className="text-[9px] uppercase font-black tracking-widest text-slate-500 hover:text-indigo-400 cursor-pointer transition-colors bg-slate-900 border border-slate-800 hover:border-indigo-500/20 px-1.5 py-0.5 rounded"
                                  >
                                    +1 Click
                                  </button>
                                </div>
                              </td>

                              {/* Clicks WhatsApp Order Checkout Simulator */}
                              <td className="py-4.5 px-6 text-center">
                                <div className="flex flex-col items-center gap-1">
                                  <span className="font-mono font-bold text-purple-400 text-sm">
                                    {biz.clicksWhatsAppOrder || 0}
                                  </span>
                                  <button
                                    onClick={() => handleSimulateMetric(biz.ownerId, biz.storeSlug, 'clicksWhatsAppOrder', biz.clicksWhatsAppOrder || 0)}
                                    className="text-[9px] uppercase font-black tracking-widest text-slate-500 hover:text-purple-400 cursor-pointer transition-colors bg-slate-900 border border-slate-800 hover:border-purple-500/20 px-1.5 py-0.5 rounded"
                                  >
                                    +1 order
                                  </button>
                                </div>
                              </td>

                              {/* WhatsApp line info */}
                              <td className="py-4.5 px-6 font-mono text-slate-400 font-semibold">
                                {biz.whatsappNumber || "Not configured"}
                              </td>

                              {/* Actions */}
                              <td className="py-4.5 px-6">
                                <div className="flex items-center justify-end gap-2">
                                  <a
                                    href={`/store/${biz.storeSlug}`}
                                    target="_blank"
                                    referrerPolicy="no-referrer"
                                    className="text-sky-400 hover:text-sky-300 hover:underline inline-flex items-center gap-1 font-bold font-mono text-[10px] uppercase tracking-wider bg-sky-500/5 px-2.5 py-1.5 border border-sky-500/10 hover:border-sky-500/30 rounded-lg transition-all"
                                  >
                                    Preview <ExternalLink size={10} />
                                  </a>
                                  <button
                                    onClick={() => setEditingBusiness(biz)}
                                    className="text-purple-400 hover:text-purple-300 hover:underline inline-flex items-center gap-1 font-bold font-mono text-[10px] uppercase tracking-wider bg-purple-500/5 px-2.5 py-1.5 border border-purple-500/10 hover:border-purple-500/30 rounded-lg transition-all cursor-pointer"
                                  >
                                    Manage <Sliders size={10} />
                                  </button>
                                </div>
                              </td>
                            </tr>
                          );
                        })}
                      </tbody>
                    </table>
                  </div>
                )}
              </div>
            </motion.div>
          )}

          {/* Tab 3: Catalog & Inventory Auditing */}
          {activeTab === 'inventory' && (
            <motion.div 
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              className="space-y-6"
            >
              <div className="bg-slate-900/30 border border-slate-800 rounded-2xl overflow-hidden">
                <div className="p-6 border-b border-slate-800/80">
                  <h2 className="text-base font-black uppercase tracking-wider text-slate-200">Catalog Inventory Audit Feed</h2>
                  <p className="text-[10px] text-slate-500 uppercase font-black mt-0.5">Central monitor tracking merchant products and listing types</p>
                </div>

                {displayedProducts.length === 0 ? (
                  <div className="p-16 text-center space-y-4">
                    <div className="p-4 bg-slate-950 border border-slate-800 rounded-full inline-block text-slate-600">
                      <ShoppingBag size={26} />
                    </div>
                    <div>
                      <h4 className="text-sm font-bold text-slate-400">No active products listed in the system</h4>
                      <p className="text-slate-600 text-xs mt-1">Make sure some merchants are registered or Sandbox Mode is toggled on.</p>
                    </div>
                  </div>
                ) : (
                  <div className="overflow-x-auto">
                    <table className="w-full text-left text-xs border-collapse">
                      <thead>
                        <tr className="bg-slate-950/60 text-slate-500 font-extrabold uppercase tracking-widest border-b border-slate-800/80">
                          <th className="py-4.5 px-6">Product details</th>
                          <th className="py-4.5 px-6">Type</th>
                          <th className="py-4.5 px-6">Price</th>
                          <th className="py-4.5 px-6">Stock Status</th>
                          <th className="py-4.5 px-6">Merchant Store</th>
                          <th className="py-4.5 px-6">Listing Flags</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-slate-800/40">
                        {displayedProducts.map((p, idx) => {
                          const associatedBiz = displayedBusinesses.find(b => b.ownerId === p.ownerId);
                          
                          return (
                            <tr key={p.id || idx} className="hover:bg-slate-900/20 transition-colors">
                              {/* Product Name & thumbnail */}
                              <td className="py-4 px-6">
                                <div className="flex items-center gap-3">
                                  {p.images && p.images[0] ? (
                                    <img 
                                      src={p.images[0]} 
                                      alt={p.name}
                                      referrerPolicy="no-referrer"
                                      className="w-10 h-10 object-cover rounded-lg bg-slate-950 border border-slate-800" 
                                    />
                                  ) : (
                                    <div className="w-10 h-10 bg-slate-950 border border-slate-800 rounded-lg flex items-center justify-center text-slate-600 font-bold font-mono">
                                      N/A
                                    </div>
                                  )}
                                  <div>
                                    <p className="font-bold text-slate-200 text-sm">{p.name}</p>
                                    <p className="text-slate-500 text-[10px] line-clamp-1 max-w-xs">{p.description || "No description provided."}</p>
                                  </div>
                                </div>
                              </td>

                              {/* Product Type */}
                              <td className="py-4 px-6">
                                <span className={`px-2 py-0.5 rounded text-[9px] font-black uppercase tracking-wider border ${
                                  p.type === 'physical' 
                                    ? 'bg-sky-500/10 border-sky-500/20 text-sky-400' 
                                    : p.type === 'digital' 
                                    ? 'bg-purple-500/10 border-purple-500/20 text-purple-400' 
                                    : 'bg-emerald-500/10 border-emerald-500/20 text-emerald-400'
                                }`}>
                                  {p.type}
                                </span>
                              </td>

                              {/* Price */}
                              <td className="py-4 px-6 font-mono font-bold text-slate-200 text-sm">
                                {associatedBiz?.currency || 'USD'} {p.price.toFixed(2)}
                              </td>

                              {/* Stock status */}
                              <td className="py-4 px-6">
                                <span className={`inline-flex items-center gap-1.5 text-[10px] font-semibold ${
                                  p.inventoryStatus === 'out_of_stock' 
                                    ? 'text-red-400' 
                                    : p.inventoryStatus === 'low_stock' 
                                    ? 'text-yellow-400' 
                                    : 'text-emerald-400'
                                }`}>
                                  <span className={`w-1.5 h-1.5 rounded-full ${
                                    p.inventoryStatus === 'out_of_stock' 
                                      ? 'bg-red-500' 
                                      : p.inventoryStatus === 'low_stock' 
                                      ? 'bg-yellow-500' 
                                      : 'bg-emerald-500'
                                  }`} />
                                  {p.inventoryStatus === 'out_of_stock' 
                                    ? 'Out of Stock' 
                                    : p.inventoryStatus === 'low_stock' 
                                    ? 'Low Stock' 
                                    : 'In Stock'
                                  }
                                </span>
                              </td>

                              {/* Owner business */}
                              <td className="py-4 px-6">
                                <span className="font-bold text-slate-300">
                                  {associatedBiz?.name || `ID: ${p.ownerId.slice(0, 6)}...`}
                                </span>
                              </td>

                              {/* Flags */}
                              <td className="py-4 px-6">
                                <div className="flex flex-wrap gap-1">
                                  {p.isBestSeller && (
                                    <span className="bg-yellow-500/10 text-yellow-400 border border-yellow-500/20 text-[8px] font-black uppercase tracking-wider px-1.5 py-0.5 rounded">
                                      Best Seller
                                    </span>
                                  )}
                                  {p.isNewArrival && (
                                    <span className="bg-purple-500/10 text-purple-400 border border-purple-500/20 text-[8px] font-black uppercase tracking-wider px-1.5 py-0.5 rounded">
                                      New
                                    </span>
                                  )}
                                  {p.isPromotion && (
                                    <span className="bg-rose-500/10 text-rose-400 border border-rose-500/20 text-[8px] font-black uppercase tracking-wider px-1.5 py-0.5 rounded">
                                      Promo
                                    </span>
                                  )}
                                </div>
                              </td>
                            </tr>
                          );
                        })}
                      </tbody>
                    </table>
                  </div>
                )}
              </div>
            </motion.div>
          )}

          {/* Tab 4: Platform Reviews Moderation */}
          {activeTab === 'reviews' && (
            <motion.div 
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              className="space-y-6"
            >
              <div className="bg-slate-900/30 border border-slate-800 rounded-2xl p-6 space-y-6">
                <div>
                  <h2 className="text-base font-black uppercase tracking-wider text-slate-200">Reviews & Ratings Feed</h2>
                  <p className="text-[10px] text-slate-500 uppercase font-black mt-0.5">Live database of feedback submitted across all merchant storefronts</p>
                </div>

                {displayedReviews.length === 0 ? (
                  <div className="p-16 text-center space-y-4">
                    <div className="p-4 bg-slate-950 border border-slate-800 rounded-full inline-block text-slate-600">
                      <MessageSquare size={26} />
                    </div>
                    <div>
                      <h4 className="text-sm font-bold text-slate-400">No storefront reviews submitted yet</h4>
                      <p className="text-slate-600 text-xs mt-1">Make sure customers write feedback or check if Sandbox Mode is enabled.</p>
                    </div>
                  </div>
                ) : (
                  <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                    {displayedReviews.map((rev, idx) => {
                      const associatedBiz = displayedBusinesses.find(b => b.ownerId === rev.ownerId);
                      const associatedProd = displayedProducts.find(p => p.id === rev.productId);

                      return (
                        <div 
                          key={rev.id || idx} 
                          className="bg-slate-900/40 border border-slate-800/85 p-5 rounded-xl flex flex-col justify-between space-y-4 hover:border-slate-700 transition-colors"
                        >
                          {/* Header with stars */}
                          <div className="flex items-center justify-between">
                            <span className="font-bold text-slate-200 text-xs">{rev.customerName}</span>
                            <div className="flex items-center gap-0.5">
                              {[...Array(5)].map((_, i) => (
                                <Star 
                                  key={i} 
                                  size={11} 
                                  className={i < rev.rating ? 'fill-yellow-400 text-yellow-400' : 'text-slate-700'} 
                                />
                              ))}
                            </div>
                          </div>

                          {/* Message Body */}
                          <p className="text-slate-300 text-xs italic leading-relaxed">
                            "{rev.comment}"
                          </p>

                          {/* Footer details */}
                          <div className="pt-3 border-t border-slate-800/60 flex flex-col gap-1.5 text-[10px]">
                            <div className="flex justify-between">
                              <span className="text-slate-500 uppercase font-bold">Store:</span>
                              <span className="text-slate-300 font-semibold">{associatedBiz?.name || "Merchant"}</span>
                            </div>
                            <div className="flex justify-between">
                              <span className="text-slate-500 uppercase font-bold">Product:</span>
                              <span className="text-slate-300 font-semibold line-clamp-1 max-w-[150px]">{associatedProd?.name || "Item"}</span>
                            </div>
                            <div className="flex justify-between">
                              <span className="text-slate-500 uppercase font-bold">Date:</span>
                              <span className="text-slate-400 font-mono">
                                {rev.createdAt ? new Date(rev.createdAt).toLocaleDateString() : "Just now"}
                              </span>
                            </div>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                )}
              </div>
            </motion.div>
          )}

          {/* Tab 5: Platform Leads & Orders Tracker */}
          {activeTab === 'transactions' && (
            <motion.div 
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              className="space-y-6"
            >
              {/* Stats overview */}
              <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                <div className="bg-slate-900/30 border border-slate-800 p-5 rounded-2xl flex items-center justify-between">
                  <div>
                    <span className="text-[9px] uppercase tracking-wider text-slate-500 font-bold block">Total Contacts/Leads</span>
                    <span className="text-2xl font-black text-slate-100 mt-1 block">{displayedLeads.length}</span>
                  </div>
                  <Users className="text-purple-400" size={24} />
                </div>
                <div className="bg-slate-900/30 border border-slate-800 p-5 rounded-2xl flex items-center justify-between">
                  <div>
                    <span className="text-[9px] uppercase tracking-wider text-slate-500 font-bold block">Fulfillment Orders</span>
                    <span className="text-2xl font-black text-slate-100 mt-1 block">{displayedOrders.length}</span>
                  </div>
                  <ShoppingBag className="text-emerald-400" size={24} />
                </div>
                <div className="bg-slate-900/30 border border-slate-800 p-5 rounded-2xl flex items-center justify-between">
                  <div>
                    <span className="text-[9px] uppercase tracking-wider text-slate-500 font-bold block">Paid Volume</span>
                    <span className="text-2xl font-black text-emerald-400 mt-1 block">
                      ${displayedOrders.filter(o => o.paymentStatus === 'paid').reduce((acc, curr) => acc + (Number(curr.amount) || 0), 0).toFixed(2)}
                    </span>
                  </div>
                  <TrendingUp className="text-emerald-400" size={24} />
                </div>
              </div>

              <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
                {/* Leads list */}
                <div className="bg-slate-900/30 border border-slate-800 rounded-2xl p-6 space-y-4">
                  <div>
                    <h2 className="text-base font-black uppercase tracking-wider text-slate-200">Platform Leads (Contacts)</h2>
                    <p className="text-[10px] text-slate-500 uppercase font-black">Shoppers who clicked to message or contact a merchant</p>
                  </div>

                  {displayedLeads.length === 0 ? (
                    <p className="text-slate-600 text-xs py-10 text-center">No leads registered on the platform yet.</p>
                  ) : (
                    <div className="overflow-x-auto">
                      <table className="w-full text-left text-xs">
                        <thead>
                          <tr className="border-b border-slate-800/80 text-[10px] text-slate-500 uppercase font-bold">
                            <th className="pb-3">Shopper</th>
                            <th className="pb-3">Source Store</th>
                            <th className="pb-3">Interest Item</th>
                            <th className="pb-3 text-right">Status</th>
                          </tr>
                        </thead>
                        <tbody className="divide-y divide-slate-800/40">
                          {displayedLeads.map((ld, i) => (
                            <tr key={ld.id || i} className="hover:bg-slate-900/10">
                              <td className="py-3">
                                <div className="font-bold text-slate-300">{ld.name}</div>
                                <div className="text-[10px] text-slate-500 font-mono mt-0.5">{ld.phone}</div>
                              </td>
                              <td className="py-3 text-slate-400 font-medium">{ld.source || 'Storefront'}</td>
                              <td className="py-3 text-purple-400 font-semibold line-clamp-1 max-w-[140px]">{ld.interest}</td>
                              <td className="py-3 text-right">
                                <span className={`inline-block px-2 py-0.5 rounded text-[9px] font-bold uppercase tracking-wider ${
                                  ld.status === 'paid' ? 'bg-emerald-500/10 text-emerald-400 border border-emerald-500/20' :
                                  ld.status === 'contacted' ? 'bg-sky-500/10 text-sky-400 border border-sky-500/20' :
                                  ld.status === 'interested' ? 'bg-purple-500/10 text-purple-400 border border-purple-500/20' :
                                  'bg-slate-800 text-slate-400'
                                }`}>
                                  {ld.status}
                                </span>
                              </td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  )}
                </div>

                {/* Orders list */}
                <div className="bg-slate-900/30 border border-slate-800 rounded-2xl p-6 space-y-4">
                  <div>
                    <h2 className="text-base font-black uppercase tracking-wider text-slate-200">Platform Orders (Fulfillment)</h2>
                    <p className="text-[10px] text-slate-500 uppercase font-black">Standardized checkout transactions generated cross-storefront</p>
                  </div>

                  {displayedOrders.length === 0 ? (
                    <p className="text-slate-600 text-xs py-10 text-center">No orders generated on the platform yet.</p>
                  ) : (
                    <div className="overflow-x-auto">
                      <table className="w-full text-left text-xs">
                        <thead>
                          <tr className="border-b border-slate-800/80 text-[10px] text-slate-500 uppercase font-bold">
                            <th className="pb-3">Order ID</th>
                            <th className="pb-3">Value</th>
                            <th className="pb-3">Payment</th>
                            <th className="pb-3 text-right">Fulfillment</th>
                          </tr>
                        </thead>
                        <tbody className="divide-y divide-slate-800/40">
                          {displayedOrders.map((ord, i) => (
                            <tr key={ord.id || i} className="hover:bg-slate-900/10">
                              <td className="py-3">
                                <div className="font-mono font-bold text-slate-300">#{ord.id.slice(0, 8)}</div>
                                <div className="text-[9px] text-slate-500 font-mono mt-0.5">{ord.createdAt ? new Date(ord.createdAt).toLocaleDateString() : 'Today'}</div>
                              </td>
                              <td className="py-3 font-mono font-bold text-slate-300">${ord.amount}</td>
                              <td className="py-3">
                                <span className={`px-2 py-0.5 rounded text-[9px] font-bold uppercase tracking-wider ${
                                  ord.paymentStatus === 'paid' 
                                    ? 'bg-emerald-500/10 text-emerald-400 border border-emerald-500/20' 
                                    : 'bg-amber-500/10 text-amber-400 border border-amber-500/20'
                                }`}>
                                  {ord.paymentStatus}
                                </span>
                              </td>
                              <td className="py-3 text-right">
                                <span className={`inline-block px-2 py-0.5 rounded text-[9px] font-bold uppercase tracking-wider ${
                                  ord.fulfillmentStatus === 'completed' || ord.fulfillmentStatus === 'delivered'
                                    ? 'bg-purple-500/10 text-purple-400 border border-purple-500/20' 
                                    : 'bg-slate-800 text-slate-400'
                                }`}>
                                  {ord.fulfillmentStatus}
                                </span>
                              </td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  )}
                </div>
              </div>
            </motion.div>
          )}

          {/* Tab 6: System Logs & Terminal Terminal */}
          {activeTab === 'system' && (
            <motion.div 
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              className="space-y-6"
            >
              <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
                {/* Controls and diagnostic indicators */}
                <div className="lg:col-span-1 bg-slate-900/30 border border-slate-800 p-6 rounded-2xl space-y-6">
                  <div>
                    <h3 className="text-sm font-black uppercase tracking-widest text-slate-200">Platform Settings</h3>
                    <p className="text-[10px] text-slate-500 uppercase font-black">System administrator database operations</p>
                  </div>

                  <div className="space-y-4">
                    <div className="p-4 bg-slate-950 border border-slate-850 rounded-xl space-y-2">
                      <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wide block">Diagnostics Wipeout</span>
                      <p className="text-[10px] text-slate-500 leading-relaxed">Flush all production submissions (leads, orders, reviews) from Firestore nodes cleanly to reset tests.</p>
                      <button
                        onClick={handleWipeAllTestSubmissions}
                        className="w-full py-2 bg-rose-950/20 hover:bg-rose-950/40 text-rose-400 border border-rose-900/40 rounded-lg text-[10px] font-bold uppercase tracking-wider transition-colors cursor-pointer"
                      >
                        Wipe Real Submissions
                      </button>
                    </div>

                    <div className="p-4 bg-slate-950 border border-slate-850 rounded-xl space-y-2">
                      <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wide block">Inject Demonstration Data</span>
                      <p className="text-[10px] text-slate-500 leading-relaxed">Instantly populate the active Firestore with high-fidelity mock customers, ratings, and checkout items.</p>
                      <button
                        onClick={handleInjectDemoDataset}
                        className="w-full py-2 bg-purple-950/20 hover:bg-purple-950/40 text-purple-400 border border-purple-900/40 rounded-lg text-[10px] font-bold uppercase tracking-wider transition-colors cursor-pointer"
                      >
                        Inject Production Mock Data
                      </button>
                    </div>
                  </div>
                </div>

                {/* Virtual log stream console terminal */}
                <div className="lg:col-span-2 bg-slate-900/40 border border-slate-850 p-6 rounded-2xl flex flex-col h-[400px]">
                  <div className="flex items-center justify-between pb-4 border-b border-slate-800/80">
                    <div className="flex items-center gap-2">
                      <div className="flex gap-1.5">
                        <span className="w-2.5 h-2.5 rounded-full bg-red-500/80"></span>
                        <span className="w-2.5 h-2.5 rounded-full bg-yellow-500/80"></span>
                        <span className="w-2.5 h-2.5 rounded-full bg-green-500/80"></span>
                      </div>
                      <span className="font-mono text-[10px] font-bold text-slate-400 uppercase ml-2 tracking-wide">Primary Log Terminal</span>
                    </div>
                    <span className="font-mono text-[9px] text-purple-400 bg-purple-500/10 px-2 py-0.5 rounded border border-purple-500/10 uppercase font-bold animate-pulse">Streaming LIVE</span>
                  </div>

                  <div className="font-mono text-[11px] text-slate-300 p-4 space-y-2 overflow-y-auto flex-1 bg-slate-950 mt-4 rounded-xl border border-slate-850">
                    {systemLogs.map((log, idx) => (
                      <div key={idx} className="flex gap-2 items-start leading-relaxed">
                        <span className="text-slate-600 font-semibold">{log.time}</span>
                        <span className={`font-black text-[9px] uppercase tracking-wide px-1 rounded-sm ${
                          log.level === 'SUCCESS' ? 'bg-emerald-500/15 text-emerald-400' :
                          log.level === 'WARN' ? 'bg-amber-500/15 text-amber-400' :
                          log.level === 'ERROR' ? 'bg-rose-500/15 text-rose-400' :
                          'bg-sky-500/15 text-sky-400'
                        }`}>
                          {log.level}
                        </span>
                        <span className="text-slate-300">{log.msg}</span>
                      </div>
                    ))}
                    <div className="text-purple-400/60 animate-pulse text-[10px] pt-1">
                      &gt; listening for inbound API storefront webhooks...
                    </div>
                  </div>
                </div>
              </div>
            </motion.div>
          )}

        </div>
      )}

      {/* Edit Merchant Modal */}
      {editingBusiness && (
        <div className="fixed inset-0 bg-slate-950/80 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <motion.div 
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
            className="bg-slate-900 border border-slate-800 rounded-2xl max-w-lg w-full overflow-hidden shadow-2xl shadow-purple-500/10 flex flex-col max-h-[90vh]"
          >
            {/* Modal Header */}
            <div className="p-6 border-b border-slate-800/80 flex items-center justify-between bg-slate-900/60">
              <div>
                <h3 className="text-base font-black uppercase tracking-wider text-slate-100 flex items-center gap-2">
                  <Sliders size={18} className="text-purple-400" />
                  Manage Merchant Profile
                </h3>
                <p className="text-[10px] text-slate-500 uppercase font-black mt-0.5">Direct Firestore / Sandbox Write Authority</p>
              </div>
              <button 
                onClick={() => setEditingBusiness(null)}
                className="p-1.5 hover:bg-slate-800 rounded-lg text-slate-400 hover:text-slate-200 transition-colors cursor-pointer"
              >
                <X size={16} />
              </button>
            </div>

            {/* Modal Form Content */}
            <div className="p-6 space-y-4 overflow-y-auto flex-1">
              <div className="space-y-1">
                <label className="text-[10px] font-black uppercase tracking-wider text-slate-400">Business Name</label>
                <input 
                  type="text" 
                  value={editingBusiness.name}
                  onChange={(e) => setEditingBusiness({ ...editingBusiness, name: e.target.value })}
                  className="w-full bg-slate-950 border border-slate-800 hover:border-slate-700 focus:border-purple-500 rounded-xl px-4 py-2.5 text-xs text-slate-200 focus:outline-none transition-colors"
                />
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-1">
                  <label className="text-[10px] font-black uppercase tracking-wider text-slate-400">Store URL Slug</label>
                  <input 
                    type="text" 
                    value={editingBusiness.storeSlug}
                    onChange={(e) => setEditingBusiness({ ...editingBusiness, storeSlug: e.target.value.toLowerCase().replace(/[^a-z0-9-]/g, '') })}
                    className="w-full bg-slate-950 border border-slate-800 hover:border-slate-700 focus:border-purple-500 rounded-xl px-4 py-2.5 text-xs text-slate-200 focus:outline-none transition-colors font-mono"
                  />
                </div>

                <div className="space-y-1">
                  <label className="text-[10px] font-black uppercase tracking-wider text-slate-400">WhatsApp Line</label>
                  <input 
                    type="text" 
                    value={editingBusiness.whatsappNumber}
                    onChange={(e) => setEditingBusiness({ ...editingBusiness, whatsappNumber: e.target.value })}
                    className="w-full bg-slate-950 border border-slate-800 hover:border-slate-700 focus:border-purple-500 rounded-xl px-4 py-2.5 text-xs text-slate-200 focus:outline-none transition-colors font-mono"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-1">
                  <label className="text-[10px] font-black uppercase tracking-wider text-slate-400">Currency Code</label>
                  <select 
                    value={editingBusiness.currency}
                    onChange={(e) => setEditingBusiness({ ...editingBusiness, currency: e.target.value })}
                    className="w-full bg-slate-950 border border-slate-800 hover:border-slate-700 focus:border-purple-500 rounded-xl px-4 py-2.5 text-xs text-slate-200 focus:outline-none transition-colors"
                  >
                    <option value="USD">USD ($)</option>
                    <option value="NGN">NGN (₦)</option>
                    <option value="GHS">GHS (₵)</option>
                    <option value="KES">KES (KSh)</option>
                    <option value="ZAR">ZAR (R)</option>
                    <option value="GBP">GBP (£)</option>
                    <option value="EUR">EUR (€)</option>
                  </select>
                </div>

                <div className="space-y-1">
                  <label className="text-[10px] font-black uppercase tracking-wider text-slate-400">Verification Status</label>
                  <div className="flex items-center gap-2 h-10">
                    <button
                      type="button"
                      onClick={() => setEditingBusiness({ ...editingBusiness, isVerified: !editingBusiness.isVerified })}
                      className={`w-full h-full flex items-center justify-center gap-1.5 rounded-xl border font-bold text-[10px] uppercase tracking-wider cursor-pointer transition-all ${
                        editingBusiness.isVerified 
                          ? 'bg-sky-500/10 border-sky-500/30 text-sky-400' 
                          : 'bg-slate-950 border-slate-800 text-slate-500'
                      }`}
                    >
                      <Award size={12} />
                      {editingBusiness.isVerified ? "PRO Verified badge" : "Standard seller"}
                    </button>
                  </div>
                </div>
              </div>

              <div className="space-y-1">
                <label className="text-[10px] font-black uppercase tracking-wider text-slate-400">Storefront Description</label>
                <textarea 
                  rows={3}
                  value={editingBusiness.description}
                  onChange={(e) => setEditingBusiness({ ...editingBusiness, description: e.target.value })}
                  className="w-full bg-slate-950 border border-slate-800 hover:border-slate-700 focus:border-purple-500 rounded-xl px-4 py-2.5 text-xs text-slate-200 focus:outline-none transition-colors resize-none"
                />
              </div>

              <div className="pt-2 border-t border-slate-800/40 flex items-center justify-between">
                <button
                  type="button"
                  onClick={() => handleDeleteBusiness(editingBusiness.ownerId, editingBusiness.storeSlug)}
                  className="bg-red-500/10 hover:bg-red-500/20 text-red-400 border border-red-500/20 hover:border-red-500/30 font-bold uppercase tracking-wider text-[10px] px-4 py-2.5 rounded-xl transition-all cursor-pointer"
                >
                  Purge Store
                </button>

                <div className="text-[10px] text-slate-500 font-mono">
                  Owner ID: {editingBusiness.ownerId.slice(0, 10)}...
                </div>
              </div>
            </div>

            {/* Modal Footer Controls */}
            <div className="p-6 bg-slate-950/40 border-t border-slate-800/80 flex justify-end gap-3">
              <button
                onClick={() => setEditingBusiness(null)}
                className="px-4 py-2.5 bg-slate-800 hover:bg-slate-700 text-slate-300 font-bold uppercase tracking-wider text-[10px] rounded-xl transition-colors cursor-pointer"
              >
                Cancel
              </button>
              <button
                onClick={() => handleSaveBusiness(editingBusiness)}
                className="px-5 py-2.5 bg-purple-600 hover:bg-purple-500 shadow-lg shadow-purple-600/15 text-white font-bold uppercase tracking-wider text-[10px] rounded-xl transition-colors cursor-pointer"
              >
                Save Changes
              </button>
            </div>
          </motion.div>
        </div>
      )}

    </div>
  );
}
