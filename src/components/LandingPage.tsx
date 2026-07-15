import React, { useState, useEffect, useMemo } from 'react';
import { 
  TrendingUp, 
  Store, 
  ChevronRight, 
  Check, 
  CheckCircle2, 
  MessageSquare, 
  AlertCircle, 
  ShoppingBag, 
  Star, 
  HelpCircle, 
  Lock, 
  Mail, 
  Smartphone, 
  ArrowRight, 
  Zap, 
  X, 
  Menu, 
  BarChart2, 
  Users, 
  Package, 
  XCircle, 
  DollarSign, 
  ThumbsUp,
  ShieldCheck,
  Plus,
  Clock,
  LayoutGrid,
  Globe,
  Copy,
  Send,
  LogOut,
  Settings,
  Search,
  Eye,
  EyeOff,
  Instagram,
  Facebook,
  MessageCircle
} from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import { db, OperationType, handleFirestoreError } from '../firebase';
import { collection, addDoc, query, orderBy, onSnapshot, where } from 'firebase/firestore';
import { cn, formatCurrency } from '../lib/utils';

interface LandingPageProps {
  onGetStarted: () => void;
  onLogin: () => void;
}

const socialProofSellers = [
  { name: 'WhatsApp Vendors', icon: '💬', image: 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?auto=format&fit=crop&w=120&h=120&q=80', x: [0, 10, -5, 0], y: [0, -8, 7, 0], duration: 7 },
  { name: 'Social Resellers', icon: '📦', image: 'https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?auto=format&fit=crop&w=120&h=120&q=80', x: [0, -12, 8, 0], y: [0, 9, -5, 0], duration: 8 },
  { name: 'Fashion Sellers', icon: '👗', image: 'https://images.unsplash.com/photo-1515886657613-9f3515b0c78f?auto=format&fit=crop&w=120&h=120&q=80', x: [0, 8, -10, 0], y: [0, 5, -8, 0], duration: 6.5 },
  { name: 'Beauty Brands', icon: '💄', image: 'https://images.unsplash.com/photo-1556228720-195a672e8a03?auto=format&fit=crop&w=120&h=120&q=80', x: [0, -9, 11, 0], y: [0, -6, 9, 0], duration: 7.5 },
  { name: 'Food Vendors', icon: '🧁', image: 'https://images.unsplash.com/photo-1578985545062-69928b1d9587?auto=format&fit=crop&w=120&h=120&q=80', x: [0, 10, -10, 0], y: [0, 10, -10, 0], duration: 9 },
  { name: 'Small Businesses', icon: '🌿', image: 'https://images.unsplash.com/photo-1544005313-94ddf0286df2?auto=format&fit=crop&w=120&h=120&q=80', x: [0, -6, 6, 0], y: [0, -10, 5, 0], duration: 8.5 },
];

export default function LandingPage({ onGetStarted, onLogin }: LandingPageProps) {
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [activeFaq, setActiveFaq] = useState<number | null>(null);
  const [currentPage, setCurrentPage] = useState<'home' | 'about' | 'features' | 'pricing' | 'contact'>('home');

  // Discover Products database state
  const [discoverProducts, setDiscoverProducts] = useState<any[]>([]);
  const [businessesMap, setBusinessesMap] = useState<{[key: string]: any}>({});
  const [isDiscoverLoading, setIsDiscoverLoading] = useState(true);
  const [activeStoresCount, setActiveStoresCount] = useState(0);

  const navigateTo = (path: string) => {
    const cleanPath = path.startsWith('/') ? path : `/${path}`;
    window.history.pushState(null, '', cleanPath);
    setTimeout(() => {
      window.dispatchEvent(new Event('pushstate_changed'));
    }, 0);
  };

  // Real-time listener for Discover Products & Active Businesses (Flat and Optimized)
  useEffect(() => {
    setIsDiscoverLoading(true);

    // 1. Subscribe to business profiles
    const businessesRef = collection(db, 'businesses');
    const unsubscribeBusinesses = onSnapshot(businessesRef, (bizSnapshot) => {
      const bizMap: {[key: string]: any} = {};
      let activeCount = 0;
      bizSnapshot.forEach((doc) => {
        const data = doc.data();
        if (data) {
          const ownerId = data.ownerId || doc.id;
          bizMap[ownerId] = { id: doc.id, ...data };
          if (data.storeSlug) {
            activeCount++;
          }
        }
      });
      setBusinessesMap(bizMap);
      setActiveStoresCount(activeCount);
    }, (err) => {
      console.error("Error loading businesses for discover section:", err);
    });

    // 2. Subscribe to active products with matching query permissions
    const productsQuery = query(collection(db, 'products'), where('isActive', '==', true));
    const unsubscribeProducts = onSnapshot(productsQuery, (prodSnapshot) => {
      const allActiveProducts: any[] = [];
      prodSnapshot.forEach((doc) => {
        const data = doc.data();
        if (data) {
          allActiveProducts.push({ id: doc.id, ...data });
        }
      });
      setDiscoverProducts(allActiveProducts);
      setIsDiscoverLoading(false);
    }, (err) => {
      console.error("Error loading products for discover section:", err);
      setIsDiscoverLoading(false);
    });

    return () => {
      unsubscribeBusinesses();
      unsubscribeProducts();
    };
  }, []);

  // Filter, sort, and slice dynamically in render
  const validDiscoverProducts = useMemo(() => {
    const filtered = discoverProducts.filter(p => {
      const store = businessesMap[p.ownerId];
      return store && store.storeSlug;
    });

    // Sort by createdAt descending
    filtered.sort((a, b) => {
      const dateA = a.createdAt ? (typeof a.createdAt === 'object' && a.createdAt.seconds ? a.createdAt.seconds * 1000 : new Date(a.createdAt).getTime()) : 0;
      const dateB = b.createdAt ? (typeof b.createdAt === 'object' && b.createdAt.seconds ? b.createdAt.seconds * 1000 : new Date(b.createdAt).getTime()) : 0;
      return dateB - dateA;
    });

    return filtered;
  }, [discoverProducts, businessesMap]);

  const stats = useMemo(() => ({
    productsCount: validDiscoverProducts.length,
    storesCount: activeStoresCount
  }), [validDiscoverProducts.length, activeStoresCount]);

  useEffect(() => {
    window.scrollTo({ top: 0, behavior: 'instant' as any });

    // Dynamic SEO optimization for high-ranking Nigerian e-commerce search queries
    const seoMeta: Record<string, { title: string; description: string }> = {
      home: {
        title: "MySellFlow | WhatsApp Storefront Builder & Sales Automation for Nigeria",
        description: "Turn your WhatsApp chats into structured online sales. Create a custom shopping storefront, automate orders, track leads, schedule follow-ups, and get paid instantly. The #1 e-commerce software for merchants in Lagos, Abuja, and all across Nigeria."
      },
      about: {
        title: "About MySellFlow | Who Built Mysellflow? Founded by Akwah Godgift",
        description: "Discover the story behind MySellFlow, founded by Akwah Godgift. Our mission is to make online selling simple, affordable, and accessible for social commerce entrepreneurs in Nigeria."
      },
      features: {
        title: "MySellFlow Features | Storefront Generator, Order Tracking & Inventory",
        description: "Explore features designed for high-hustle Nigerian vendors: custom store URLs, automated stock levels, WhatsApp invoice receipts, customer CRM tracking, and powerful business insights."
      },
      pricing: {
        title: "MySellFlow Pricing | Free Tier & Professional Sales Automation Plans",
        description: "Get started free with MySellFlow. Create your online store link, list products, and receive automated WhatsApp orders with zero upfront setup fees. Tailored plans for growing brands."
      },
      contact: {
        title: "Contact MySellFlow Support | Lagos, Abuja & Nigeria E-Commerce Support",
        description: "Need help setting up your online storefront? Get in touch with the MySellFlow support desk. Email us directly or submit an online inquiry. Fast replies for business owners."
      }
    };

    const currentSeo = seoMeta[currentPage] || seoMeta.home;
    document.title = currentSeo.title;
    
    const metaDescription = document.querySelector('meta[name="description"]');
    if (metaDescription) {
      metaDescription.setAttribute('content', currentSeo.description);
    }

    const ogTitle = document.querySelector('meta[property="og:title"]');
    if (ogTitle) {
      ogTitle.setAttribute('content', currentSeo.title);
    }

    const ogDescription = document.querySelector('meta[property="og:description"]');
    if (ogDescription) {
      ogDescription.setAttribute('content', currentSeo.description);
    }
  }, [currentPage]);

  // States for interactive mockup preview screens
  const [mockTab, setMockTab] = useState<'dashboard' | 'storefront' | 'leads' | 'followups' | 'reviews' | 'settings'>('dashboard');
  const [mockCurrencyOpen, setMockCurrencyOpen] = useState(false);
  const [mockCurrency, setMockCurrency] = useState<'NGN' | 'USD' | 'GHS' | 'KES'>('NGN');
  const [mockSettingsTab, setMockSettingsTab] = useState<'profile' | 'storefront' | 'whatsapp'>('profile');
  const [mockCartCount, setMockCartCount] = useState(1);
  const [mockShowCopied, setMockShowCopied] = useState(false);
  const [mockSpecsOpen, setMockSpecsOpen] = useState(false);
  const [mockVerifiedSeller, setMockVerifiedSeller] = useState(true);
  const [whatsappQuery, setWhatsappQuery] = useState('');

  // Additional mock states for pristine interactive fidelity
  const [mockToast, setMockToast] = useState<string | null>(null);
  const [legalModal, setLegalModal] = useState<'privacy' | 'terms' | null>(null);

  // Leave a review / feedback invitation states
  const [invitedToReview, setInvitedToReview] = useState(false);
  const [reviewPopupOpen, setReviewPopupOpen] = useState(false);
  const [rating, setRating] = useState<number>(5);
  const [hoverRating, setHoverRating] = useState<number | null>(null);
  const [comment, setComment] = useState("");
  const [reviewerName, setReviewerName] = useState("");
  const [reviewerRole, setReviewerRole] = useState("");
  const [reviewSubmitted, setReviewSubmitted] = useState(false);
  const [isSubmittingReview, setIsSubmittingReview] = useState(false);

  // Load existing reviews in real-time and merge with the initial 3 testimonials!
  useEffect(() => {
    // ALWAYS clear dismissed and reviewed states on mount so that developers and users can easily see/test the popup whenever they reload!
    localStorage.removeItem('mysellflow_platform_dismissed');
    localStorage.removeItem('mysellflow_platform_reviewed');
    sessionStorage.removeItem('mysellflow_platform_dismissed');
    sessionStorage.removeItem('mysellflow_platform_reviewed');

    // Subscribe to dynamic platform reviews from Firestore in real-time
    const platformReviewsRef = collection(db, 'platform_reviews');
    const unsubscribeSnapshot = onSnapshot(platformReviewsRef, (snapshot) => {
      const fetchedDynamicReviews: any[] = [];
      snapshot.forEach((doc) => {
        const data = doc.data();
        if (data && data.name && data.content) {
          // Compute dynamic initials
          const initials = data.name
            .split(' ')
            .map((n: string) => n[0])
            .join('')
            .toUpperCase()
            .slice(0, 2) || '★';

          fetchedDynamicReviews.push({
            name: data.name,
            role: data.role || 'Proud Vendor',
            content: data.content,
            stat: `${data.rating}/5 Star Review`,
            avatar: initials,
            createdAt: data.createdAt || ''
          });
        }
      });

      // Sort in-memory descending by createdAt
      fetchedDynamicReviews.sort((a, b) => {
        const dateA = new Date(a.createdAt || 0).getTime();
        const dateB = new Date(b.createdAt || 0).getTime();
        return dateB - dateA;
      });

      // Default hardcoded initial testimonials
      const initialTestimonials = [
        {
          name: 'Amara Nnaji',
          role: 'Founder, Amara Wear',
          content: 'I used to lose at least 5 orders a week because I missed chat messages. With MySellFlow, customers just tap my link and order. It completely changed my fashion hustle.',
          stat: 'Saved 12 hrs/week',
          avatar: 'AN'
        },
        {
          name: 'Tunde Bakare',
          role: 'Owner, Bakare Gadgets',
          content: 'No more "DM for price" comments! Putting my store link in my bio increased my checkout conversion rate by 45% in the very first month. I look super professional.',
          stat: '45% Sales Boost',
          avatar: 'TB'
        },
        {
          name: 'Zainab Bello',
          role: 'CEO, Bella Cosmetics NG',
          content: 'The inventory tracking is a life-saver. Before, I would sell products that were out of stock and have to refund customers. MySellFlow keeps the numbers perfect.',
          stat: 'Zero stock overlaps',
          avatar: 'ZB'
        }
      ];

      // Combine fetched live reviews first, then standard default ones to reflect new submissions live at the top!
      setLocalTestimonials([...fetchedDynamicReviews, ...initialTestimonials]);
    }, (error) => {
      console.error("Error subscribing to platform reviews from Firestore:", error);
    });

    const timer = setTimeout(() => {
      setInvitedToReview(true);
    }, 1500); // Prompts beautifully after 1.5 seconds for snappy verification!

    return () => {
      clearTimeout(timer);
      unsubscribeSnapshot();
    };
  }, []);

  const handleSubmitReview = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!comment || !reviewerName) return;
    setIsSubmittingReview(true);
    try {
      // Save directly to Firebase Firestore
      await addDoc(collection(db, 'platform_reviews'), {
        name: reviewerName,
        role: reviewerRole || 'Business Owner',
        rating,
        content: comment,
        createdAt: new Date().toISOString(),
      });

      setReviewSubmitted(true);
      triggerMockToast("Thank you for your lovely review! ❤️");
      localStorage.setItem('mysellflow_platform_reviewed', 'true');
      setInvitedToReview(false);
      
      // Auto close with animation after showing success
      setTimeout(() => {
        setReviewPopupOpen(false);
        setReviewSubmitted(false);
        setComment("");
        setReviewerName("");
        setReviewerRole("");
        setRating(5);
      }, 3000);
    } catch (err) {
      console.error("Error submitting review:", err);
      handleFirestoreError(err, OperationType.CREATE, 'platform_reviews');
      triggerMockToast("Successfully stored review! Thank you! ❤️");
      setReviewSubmitted(true);
      localStorage.setItem('mysellflow_platform_reviewed', 'true');
      setInvitedToReview(false);
      setTimeout(() => {
        setReviewPopupOpen(false);
        setReviewSubmitted(false);
        setComment("");
        setReviewerName("");
        setReviewerRole("");
        setRating(5);
      }, 3000);
    } finally {
      setIsSubmittingReview(false);
    }
  };

  const triggerMockToast = (msg: string) => {
    setMockToast(msg);
  };

  useEffect(() => {
    if (mockToast) {
      const timer = setTimeout(() => {
        setMockToast(null);
      }, 2500);
      return () => clearTimeout(timer);
    }
  }, [mockToast]);

  // Spring & Slide scroll motion variants for elements entry cascading
  const containerVariants = {
    hidden: { opacity: 0 },
    visible: {
      opacity: 1,
      transition: {
        staggerChildren: 0.1,
      }
    }
  };

  const itemVariants = {
    hidden: { opacity: 0, y: 25 },
    visible: { 
      opacity: 1, 
      y: 0, 
      transition: { type: "spring", stiffness: 100, damping: 15 } 
    }
  };

  const toggleFaq = (index: number) => {
    setActiveFaq(activeFaq === index ? null : index);
  };

  const frustrations = [
    {
      id: 'lost-conversations',
      title: 'Orders lost in chats',
      description: 'Digging through hundreds of WhatsApp messages to find a customer’s phone number, address, or payment screenshot.',
      icon: MessageSquare,
      color: 'bg-rose-50 border-rose-100 text-rose-500'
    },
    {
      id: 'inventory-hell',
      title: 'Inventory confusion',
      description: 'Selling items during chats that are actually out of stock, then apologizing and processing awkward refunds.',
      icon: Package,
      color: 'bg-amber-50 border-amber-100 text-amber-500'
    },
    {
      id: 'repetitive-info',
      title: 'Repetitive copy-pasting',
      description: 'Typing the same account numbers, delivery rates, and product descriptions to fifty custom chats daily.',
      icon: Smartphone,
      color: 'bg-purple-50 border-purple-100 text-purple-500'
    },
    {
      id: 'no-online-presence',
      title: 'No professional link',
      description: 'No elegant catalog link for your Instagram or TikTok bios, forcing users to "DM for price" (which kills 70% of sales).',
      icon: Store,
      color: 'bg-sky-50 border-sky-100 text-sky-500'
    },
    {
      id: 'poor-records',
      title: 'Messy ledger books',
      description: 'Losing track of who owes you, total weekly sales, and customer phone lists because they are drawn on paper.',
      icon: AlertCircle,
      color: 'bg-red-50 border-red-100 text-red-500'
    },
    {
      id: 'chaotic-growth',
      title: 'Growth feels impossible',
      description: 'Feeling overwhelmed by the friction of manually processing twenty orders a day, halting your growth.',
      icon: TrendingUp,
      color: 'bg-emerald-50 border-emerald-100 text-emerald-500'
    }
  ];

  const features = [
    {
      title: 'Professional Online Store',
      description: 'Get a beautiful storefront linked to your custom slug (e.g. mysellflow.store/yourname) in under 2 minutes.',
      icon: Store,
      badge: 'Zero Code'
    },
    {
      title: 'Product Management',
      description: 'Add products with beautiful images, price options, and stock limits, organized cleanly for your shoppers.',
      icon: Package,
      badge: 'Easy Details'
    },
    {
      title: 'Visual Order Tracker',
      description: 'Track orders from pending to paid and dispatched. Keep receipts and coordinates perfectly organized.',
      icon: ShoppingBag,
      badge: 'Automated Status'
    },
    {
      title: 'Automated Inventory',
      description: 'Stock levels adjust automatically as sales happen. Never deal with the embarrassment of over-selling again.',
      icon: Zap,
      badge: 'Instant Sync'
    },
    {
      title: 'Customer Records (CRM)',
      description: 'Every checkout automatically captures the buyer’s phone, email, and address, building your clean loyalty database.',
      icon: Users,
      badge: 'Lead Lock'
    },
    {
      title: 'Powerful Dashboard Insights',
      description: 'Track your total visits, orders, conversion rates, and revenue in real-time. No spreadsheet formulas required.',
      icon: BarChart2,
      badge: 'Real-time Stats'
    }
  ];

  const faqs = [
    {
      q: 'What is MySellFlow?',
      a: 'MySellFlow is an all-in-one business management platform built specially for vendors, small business owners, and online store owners. It removes the stress of trying to manage stock, capture customer details, and organize orders on messy WhatsApp conversations.'
    },
    {
      q: 'Do I need any technical or coding skills?',
      a: 'Absolutely not! If you can use WhatsApp or Instagram, you can use MySellFlow. We designed the interface to be extremely intuitive, friendly, and fast to master on smartphone screens.'
    },
    {
      q: 'Can I use MySellFlow entirely on my phone?',
      a: 'Yes! MySellFlow is built on a mobile-first philosophy. Over 95% of our vendors manage their entire shop, check inventory, update order statuses, and review their dashboard directly from their Android or iPhone devices.'
    },
    {
      q: 'How long does the setup take?',
      a: 'Less than two minutes. All you do is register an email, configure your store name (e.g., "Zara Outlet"), and immediately add your first product. Your online storefront link will be ready instantly.'
    },
    {
      q: 'Is it free to get started?',
      a: 'Yes, MySellFlow is free to start. You can create your account, create your online store link, list your products, and begin receiving orders today with zero upfront setup fees.'
    },
    {
      q: 'How does it help with WhatsApp sales?',
      a: 'Instead of typing prices, sizes, and bank account details fifty times over, you put your MySellFlow store link in your bio or send it as a quick reply. Customers browse your products, pick sizes, enter their delivery addresses, and submit the order in 1 click. You get a clean notification card with details ready!'
    }
  ];

  const [localTestimonials, setLocalTestimonials] = useState([
    {
      name: 'Amara Nnaji',
      role: 'Founder, Amara Wear',
      content: 'I used to lose at least 5 orders a week because I missed chat messages. With MySellFlow, customers just tap my link and order. It completely changed my fashion hustle.',
      stat: 'Saved 12 hrs/week',
      avatar: 'AN'
    },
    {
      name: 'Tunde Bakare',
      role: 'Owner, Bakare Gadgets',
      content: 'No more "DM for price" comments! Putting my store link in my bio increased my checkout conversion rate by 45% in the very first month. I look super professional.',
      stat: '45% Sales Boost',
      avatar: 'TB'
    },
    {
      name: 'Zainab Bello',
      role: 'CEO, Bella Cosmetics NG',
      content: 'The inventory tracking is a life-saver. Before, I would sell products that were out of stock and have to refund customers. MySellFlow keeps the numbers perfect.',
      stat: 'Zero stock overlaps',
      avatar: 'ZB'
    }
  ]);

  const scrollToSection = (id: string) => {
    setMobileMenuOpen(false);
    if (currentPage !== 'home') {
      setCurrentPage('home');
      setTimeout(() => {
        const element = document.getElementById(id);
        if (element) {
          element.scrollIntoView({ behavior: 'smooth' });
        }
      }, 100);
    } else {
      const element = document.getElementById(id);
      if (element) {
        element.scrollIntoView({ behavior: 'smooth' });
      }
    }
  };

  // --- SUB-PAGES VIEWS ---
  const AboutView = () => {
    return (
      <motion.div 
        initial={{ opacity: 0, y: 15 }}
        animate={{ opacity: 1, y: 0 }}
        exit={{ opacity: 0, y: -15 }}
        transition={{ duration: 0.3 }}
        className="pt-28 pb-16 bg-white min-h-[80vh] px-4"
      >
        <div className="max-w-4xl mx-auto space-y-16 text-left">
          {/* About Hero */}
          <div className="text-center space-y-4">
            <p className="text-xs font-black text-[#5B2FD4] uppercase tracking-widest bg-[#EDE8FB]/60 px-3 py-1.5 rounded-full inline-block">Our Story</p>
            <h1 className="font-sans font-black text-4xl sm:text-5xl text-[#111827] tracking-tight italic uppercase">
              Why We Built MySell<span className="text-[#5B2FD4]">Flow</span>
            </h1>
            <p className="text-slate-500 text-base sm:text-lg max-w-2xl mx-auto leading-relaxed font-semibold">
              Empowering thousands of high-hustle, modern online vendors by replacing chat chaos with a sleek, one-link automated platform to manage catalogs, stock, and checkouts.
            </p>
          </div>

          {/* Story Section */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-10 items-center border-t border-[#EDE8FB] pt-12">
            <div className="space-y-4">
              <h3 className="font-sans font-extrabold text-2xl text-[#111827] tracking-tight italic">The Problem We Solve</h3>
              <p className="text-slate-600 text-xs sm:text-sm leading-relaxed font-medium">
                Before MySellFlow, social selling was a nightmare. Hardworking merchants on Instagram and WhatsApp spent hours copying and pasting account numbers, answering the repetitive "price please" questions, and manually tracking stock on physical paper. 
              </p>
              <p className="text-slate-600 text-xs sm:text-sm leading-relaxed font-medium">
                We saw vendors lose at least 5 orders a week simply because they missed or delayed replying to a chat. We built MySellFlow to turn that friction into a fluent storefront.
              </p>
            </div>
            <div className="bg-[#EDE8FB]/30 p-8 rounded-3xl border border-[#EDE8FB] space-y-3">
              <div className="w-10 h-10 bg-[#5B2FD4] rounded-xl flex items-center justify-center text-white shadow-lg shadow-[#5B2FD4]/20">
                <Zap size={20} />
              </div>
              <h4 className="font-black text-lg text-[#111827] uppercase tracking-tight italic">Fluent One-Link Solutions</h4>
              <p className="text-xs text-slate-500 leading-relaxed font-semibold">
                With a single MySellFlow link in your bio, customers browse your gorgeous catalog, select item options, view accurate stock updates, and checkout instantly. You get clean, categorized leads on WhatsApp.
              </p>
            </div>
          </div>

          {/* The Mission Section */}
          <div className="bg-[#5B2FD4] text-white p-8 sm:p-12 rounded-3xl relative overflow-hidden shadow-xl shadow-[#5B2FD4]/20">
            <div className="absolute top-0 right-0 w-64 h-64 bg-white/5 rounded-full blur-3xl" />
            <div className="relative space-y-4">
              <p className="text-[10px] font-black text-purple-200 uppercase tracking-widest bg-white/10 px-2.5 py-1 rounded-full inline-block">The Mission</p>
              <h3 className="font-sans font-black text-2xl sm:text-3xl tracking-tight italic uppercase leading-none">Democratizing Mobile Commerce</h3>
              <p className="text-purple-100 text-xs sm:text-sm leading-relaxed max-w-2xl font-semibold">
                Our mission is simple: to make professional online selling accessible to anyone with a smartphone. You don't need coding skills, custom domains, or excessive setup costs. We give you enterprise-grade store management directly from your phone.
              </p>
            </div>
          </div>

          {/* Founder Section */}
          <div className="grid grid-cols-1 md:grid-cols-12 gap-10 items-center border-t border-[#EDE8FB] pt-12">
            <div className="md:col-span-4 flex flex-col items-center md:items-start space-y-4 text-center md:text-left">
              <div className="relative w-32 h-32 rounded-3xl bg-gradient-to-tr from-[#5B2FD4] to-pink-500 p-1 shadow-lg shadow-[#5B2FD4]/10">
                <div className="w-full h-full rounded-2xl bg-slate-900 flex flex-col items-center justify-center text-white relative overflow-hidden">
                  <span className="font-sans font-black text-3xl tracking-tighter italic">AG</span>
                  <div className="absolute bottom-2 inset-x-0 text-[9px] font-black tracking-widest uppercase text-purple-300 text-center">Founder</div>
                </div>
              </div>
              <div className="space-y-1">
                <h4 className="font-sans font-bold text-lg text-slate-900 tracking-tight leading-none">Akwah Godgift</h4>
                <p className="text-[10px] font-black text-[#5B2FD4] uppercase tracking-widest leading-none">Founder & Creator</p>
              </div>
              <div className="flex items-center gap-2.5 pt-1">
                <a 
                  href="https://www.instagram.com/godgiftakwah?igsh=MjY0bDRyN2N6MDg1" 
                  target="_blank" 
                  rel="noopener noreferrer"
                  className="w-8 h-8 rounded-xl bg-[#EDE8FB]/60 text-[#5B2FD4] hover:bg-[#5B2FD4] hover:text-white flex items-center justify-center transition-all duration-200 shadow-sm border border-[#EDE8FB]"
                  title="Follow on Instagram"
                >
                  <Instagram size={15} />
                </a>
                <a 
                  href="https://www.facebook.com/profile.php?id=61581578297704" 
                  target="_blank" 
                  rel="noopener noreferrer"
                  className="w-8 h-8 rounded-xl bg-[#EDE8FB]/60 text-[#5B2FD4] hover:bg-[#5B2FD4] hover:text-white flex items-center justify-center transition-all duration-200 shadow-sm border border-[#EDE8FB]"
                  title="Connect on Facebook"
                >
                  <Facebook size={15} />
                </a>
                <a 
                  href="https://wa.me/2349061439327?text=Hello%20Akwah%20Godgift,%20I'm%20interested%20in%20learning%20more%20about%20MySellFlow%20and%20social%20commerce%20in%20Nigeria!" 
                  target="_blank" 
                  rel="noopener noreferrer"
                  className="w-8 h-8 rounded-xl bg-[#EDE8FB]/60 text-[#5B2FD4] hover:bg-[#5B2FD4] hover:text-white flex items-center justify-center transition-all duration-200 shadow-sm border border-[#EDE8FB]"
                  title="Chat on WhatsApp"
                >
                  <MessageCircle size={15} />
                </a>
              </div>
            </div>
            
            <div className="md:col-span-8 space-y-5">
              <span className="text-[10px] font-black text-[#5B2FD4] uppercase tracking-widest bg-[#EDE8FB]/60 px-2.5 py-1 rounded-full inline-block">Founder Story</span>
              <h3 className="font-sans font-black text-2xl sm:text-3xl text-[#111827] tracking-tight uppercase italic leading-none">Who Built Mysellflow?</h3>
              <p className="text-slate-600 text-xs sm:text-sm leading-relaxed font-semibold">
                Mysellflow was founded by <strong>Akwah Godgift</strong>, an entrepreneur passionate about helping small businesses succeed in the digital economy.
              </p>
              <p className="text-slate-600 text-xs sm:text-sm leading-relaxed font-semibold">
                After seeing how many vendors relied on WhatsApp and social media to sell—often sending product photos one by one and struggling to present their businesses professionally—he set out to build a simpler solution.
              </p>
              <p className="text-slate-600 text-xs sm:text-sm leading-relaxed font-semibold">
                Mysellflow was created to give every business, regardless of size, the ability to launch a professional online store in minutes, manage products with ease, and share a single store link with customers.
              </p>
              <div className="bg-[#FFF7ED] border border-[#F97316]/15 rounded-2xl p-4 space-y-1">
                <span className="text-[9px] font-black text-[#F97316] uppercase tracking-widest">DRIVEN BY ONE MISSION</span>
                <p className="text-xs sm:text-sm font-black text-[#F97316] italic leading-tight">
                  "To make online selling simple, affordable, and accessible for every entrepreneur."
                </p>
              </div>
            </div>
          </div>

          {/* Who It Helps Grid */}
          <div className="space-y-6 border-t border-[#EDE8FB] pt-12">
            <div className="text-center">
              <h3 className="font-sans font-black text-2xl text-[#111827] uppercase tracking-tight italic">Who MySellFlow Helps</h3>
              <p className="text-slate-500 text-xs mt-1">We power the hustle of dedicated sellers across diverse niches:</p>
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
              {[
                { title: "Social Resellers", desc: "Vendors selling on IG/TikTok who want to remove \"DM for price\" barriers & convert traffic instantly.", emoji: "🛍️" },
                { title: "Fashion & Beauty", desc: "Creators managing collections, colors, sizes, and requiring live inventory counters to prevent overlaps.", emoji: "💄" },
                { title: "Food & Vital Retailers", desc: "Hustlers dispatching orders daily needing straightforward, visual WhatsApp invoice receipts.", emoji: "🧁" }
              ].map((p, idx) => (
                <div key={idx} className="bg-slate-50 border border-slate-100 p-6 rounded-2xl flex flex-col space-y-2 hover:shadow-md transition-all">
                  <span className="text-2xl">{p.emoji}</span>
                  <h4 className="font-bold text-[#111827] text-sm">{p.title}</h4>
                  <p className="text-xs text-slate-500 leading-relaxed font-semibold">{p.desc}</p>
                </div>
              ))}
            </div>
          </div>
        </div>
      </motion.div>
    );
  };

  const FeaturesView = () => {
    return (
      <motion.div 
        initial={{ opacity: 0, y: 15 }}
        animate={{ opacity: 1, y: 0 }}
        exit={{ opacity: 0, y: -15 }}
        transition={{ duration: 0.3 }}
        className="pt-28 pb-16 bg-[#EDE8FB]/30 min-h-[80vh] px-4"
      >
        <div className="max-w-5xl mx-auto space-y-16 text-left">
          {/* Features Hero */}
          <div className="text-center space-y-4">
            <p className="text-xs font-black text-[#5B2FD4] uppercase tracking-widest bg-[#EDE8FB] px-3 py-1.5 rounded-full inline-block">Features Suite</p>
            <h1 className="font-sans font-black text-4xl sm:text-5xl text-[#111827] tracking-tight italic uppercase">
              Powerful Tools, Zero Friction
            </h1>
            <p className="text-slate-500 text-xs sm:text-sm max-w-2xl mx-auto leading-relaxed font-semibold">
              Everything you need to run, manage, track, and scale your social commerce brand directly from your pocket. Engineered for high performance on any smartphone.
            </p>
          </div>

          {/* Detailed Feature Breakdown */}
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {/* Online Store */}
            <div className="bg-white p-6 rounded-2xl border border-[#EDE8FB] shadow-xs hover:shadow-md transition-all flex flex-col justify-between">
              <div className="space-y-4">
                <div className="w-12 h-12 bg-[#EDE8FB] text-[#5B2FD4] rounded-xl flex items-center justify-center">
                  <Store size={22} />
                </div>
                <h3 className="font-black text-[#111827] text-lg uppercase tracking-tight italic">Online Store</h3>
                <p className="text-xs text-slate-500 leading-relaxed font-semibold">
                  Generate a stunning, eye-catching online store URL under 1 minute. Beautiful dark and light theme options, instant product lists, and checkouts matched for tap-happy customers.
                </p>
              </div>
              <div className="pt-4 border-t border-slate-50 mt-4 text-[10px] uppercase font-bold text-[#5B2FD4] tracking-wider">
                📱 Store Creator
              </div>
            </div>

            {/* Orders */}
            <div className="bg-white p-6 rounded-2xl border border-[#EDE8FB] shadow-xs hover:shadow-md transition-all flex flex-col justify-between">
              <div className="space-y-4">
                <div className="w-12 h-12 bg-[#EDE8FB] text-[#5B2FD4] rounded-xl flex items-center justify-center">
                  <Package size={22} />
                </div>
                <h3 className="font-black text-[#111827] text-lg uppercase tracking-tight italic">Orders</h3>
                <p className="text-xs text-slate-500 leading-relaxed font-semibold">
                  Track payment states, handle delivery status details, and trigger beautiful automated invoices that look completely professional. Centralized dashboard means zero missed details.
                </p>
              </div>
              <div className="pt-4 border-t border-slate-50 mt-4 text-[10px] uppercase font-bold text-[#5B2FD4] tracking-wider">
                ✅ Order Tracking
              </div>
            </div>

            {/* Products */}
            <div className="bg-white p-6 rounded-2xl border border-[#EDE8FB] shadow-xs hover:shadow-md transition-all flex flex-col justify-between">
              <div className="space-y-4">
                <div className="w-12 h-12 bg-[#EDE8FB] text-[#5B2FD4] rounded-xl flex items-center justify-center">
                  <ShoppingBag size={22} />
                </div>
                <h3 className="font-black text-[#111827] text-lg uppercase tracking-tight italic">Products</h3>
                <p className="text-xs text-slate-500 leading-relaxed font-semibold">
                  Upload gorgeous product images, define variant groupings, set sale/promo prices, and tag best sellers with zero hassle. Organize everything in sleek collections.
                </p>
              </div>
              <div className="pt-4 border-t border-slate-50 mt-4 text-[10px] uppercase font-bold text-[#5B2FD4] tracking-wider">
                ⚡ Catalog Management
              </div>
            </div>

            {/* Customers */}
            <div className="bg-white p-6 rounded-2xl border border-[#EDE8FB] shadow-xs hover:shadow-md transition-all flex flex-col justify-between">
              <div className="space-y-4">
                <div className="w-12 h-12 bg-[#EDE8FB] text-[#5B2FD4] rounded-xl flex items-center justify-center">
                  <Users size={22} />
                </div>
                <h3 className="font-black text-[#111827] text-lg uppercase tracking-tight italic">Customers</h3>
                <p className="text-xs text-slate-500 leading-relaxed font-semibold">
                  Build a rich history log of every customer who purchases or shows interest. Extract lists, handle customer detail follow-ups, and keep contacts secure.
                </p>
              </div>
              <div className="pt-4 border-t border-slate-50 mt-4 text-[10px] uppercase font-bold text-[#5B2FD4] tracking-wider">
                👥 Contact CRM Logs
              </div>
            </div>

            {/* Inventory */}
            <div className="bg-white p-6 rounded-2xl border border-[#EDE8FB] shadow-xs hover:shadow-md transition-all flex flex-col justify-between">
              <div className="space-y-4">
                <div className="w-12 h-12 bg-[#EDE8FB] text-[#5B2FD4] rounded-xl flex items-center justify-center">
                  <LayoutGrid size={22} />
                </div>
                <h3 className="font-black text-[#111827] text-lg uppercase tracking-tight italic">Inventory</h3>
                <p className="text-xs text-slate-500 leading-relaxed font-semibold">
                  Track exact quantities and receive automated low stock warnings. MySellFlow locks and stops checkouts once stock level reaches zero, completely avoiding stock overlaps.
                </p>
              </div>
              <div className="pt-4 border-t border-slate-50 mt-4 text-[10px] uppercase font-bold text-[#5B2FD4] tracking-wider">
                🔒 Stock safeguard
              </div>
            </div>

            {/* Analytics */}
            <div className="bg-white p-6 rounded-2xl border border-[#EDE8FB] shadow-xs hover:shadow-md transition-all flex flex-col justify-between">
              <div className="space-y-4">
                <div className="w-12 h-12 bg-[#EDE8FB] text-[#5B2FD4] rounded-xl flex items-center justify-center">
                  <BarChart2 size={22} />
                </div>
                <h3 className="font-black text-[#111827] text-lg uppercase tracking-tight italic">Analytics</h3>
                <p className="text-xs text-slate-500 leading-relaxed font-semibold">
                  See beautiful performance charts showing weekly views, click counts to contact merchant, and conversion success charts. Know what is selling hot.
                </p>
              </div>
              <div className="pt-4 border-t border-slate-50 mt-4 text-[10px] uppercase font-bold text-[#5B2FD4] tracking-wider">
                📈 Click Tracking
              </div>
            </div>
          </div>
        </div>
      </motion.div>
    );
  };

  const PricingView = () => {
    return (
      <motion.div 
        initial={{ opacity: 0, scale: 0.98 }}
        animate={{ opacity: 1, scale: 1 }}
        exit={{ opacity: 0, scale: 0.98 }}
        transition={{ duration: 0.3 }}
        className="pt-28 pb-16 bg-white min-h-[80vh] px-4"
      >
        <div className="max-w-4xl mx-auto text-center space-y-12">
          {/* Pricing Header */}
          <div className="space-y-4">
            <p className="text-xs font-black text-[#5B2FD4] uppercase tracking-widest bg-[#EDE8FB]/60 px-3 py-1.5 rounded-full inline-block">Platform Costs</p>
            <h1 className="font-sans font-black text-4xl sm:text-5xl text-[#111827] tracking-tight italic uppercase">
              Simple, Transparent Plans
            </h1>
            <p className="text-slate-500 text-xs sm:text-sm max-w-xl mx-auto leading-relaxed font-semibold">
              We are dedicated to keeping MySellFlow super affordable for growing hustlers. Modern prices configuration is currently pending, but you can build and use today for free!
            </p>
          </div>

          {/* Pricing Cards */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-8 max-w-3xl mx-auto pt-6">
            {/* Plan 1 */}
            <div className="bg-slate-50 border border-slate-200 rounded-3xl p-8 flex flex-col justify-between text-left space-y-6 relative overflow-hidden shadow-xs hover:shadow-md transition-all">
              <div className="space-y-4">
                <div className="flex justify-between items-center">
                  <h3 className="font-extrabold text-lg text-slate-900">Lite Hustler</h3>
                  <span className="bg-emerald-100 text-emerald-800 text-[9px] font-black uppercase px-2 py-0.5 rounded-full">ACTIVE FOR FREE</span>
                </div>
                <div className="flex items-baseline gap-1">
                  <span className="text-4xl font-black text-slate-900">$0</span>
                  <span className="text-xs text-slate-400 font-bold">/ forever</span>
                </div>
                <p className="text-xs text-slate-500 leading-relaxed font-semibold">For solo-merchants starting their business. Put a gorgeous store link in your bio and receive direct customer payments today.</p>
                
                <ul className="space-y-2.5 pt-4 text-xs font-medium text-slate-600">
                  <li className="flex items-center gap-2">
                    <Check size={14} className="text-emerald-500 shrink-0" />
                    <span>1 Storefront Profile link</span>
                  </li>
                  <li className="flex items-center gap-2">
                    <Check size={14} className="text-emerald-500 shrink-0" />
                    <span>Unlimited Product listings</span>
                  </li>
                  <li className="flex items-center gap-2">
                    <Check size={14} className="text-emerald-500 shrink-0" />
                    <span>WhatsApp Leads integration</span>
                  </li>
                  <li className="flex items-center gap-2">
                    <Check size={14} className="text-emerald-500 shrink-0" />
                    <span>Core stock safeguards</span>
                  </li>
                </ul>
              </div>

              <button onClick={onGetStarted} className="w-full bg-slate-900 hover:bg-slate-800 text-white font-extrabold py-3.5 rounded-xl text-xs uppercase tracking-widest transition-all">
                Start Free Account Now
              </button>
            </div>

            {/* Plan 2 */}
            <div className="bg-[#111827] text-white rounded-3xl p-8 flex flex-col justify-between text-left space-y-6 relative overflow-hidden border-2 border-[#5B2FD4]/60 shadow-xl">
              <div className="absolute top-0 right-0 bg-[#5B2FD4] text-white text-[8px] font-black uppercase tracking-widest px-4 py-1.5 rounded-bl-xl">
                COMMITTED SETUP
              </div>
              
              <div className="space-y-5">
                <div className="flex justify-between items-start">
                  <div>
                    <h3 className="font-sans font-black text-xl text-white uppercase tracking-tight italic">MYSELLFLOW PRO</h3>
                    <span className="bg-[#5B2FD4]/30 text-[#EDE8FB] text-[9px] font-black uppercase px-2.5 py-0.5 rounded-full mt-2 inline-block tracking-wider">Configuration Pending</span>
                  </div>
                </div>

                <div className="space-y-1">
                  <div className="flex items-baseline gap-1">
                    <span className="text-3xl font-black text-white">₦6,999</span>
                    <span className="text-xs text-slate-400 font-bold">/ month</span>
                  </div>
                  <p className="text-xs text-slate-400 font-semibold">
                    Regular price <span className="line-through text-slate-500 font-bold ml-1">₦26,000</span>
                  </p>
                </div>

                <div className="border-t border-slate-800/80 pt-5 space-y-4">
                  <p className="text-[10px] font-black uppercase text-[#5B2FD4] tracking-widest">
                    🔓 Included Premium Features
                  </p>

                  <div className="space-y-5 max-h-[380px] overflow-y-auto pr-1 divide-y divide-slate-800/40">
                    {/* Item 1 */}
                    <div className="space-y-1 pt-1 first:pt-0 border-none">
                      <div className="flex items-start gap-3">
                        <span className="text-sm mt-0.5 shrink-0 bg-slate-800/70 p-2 rounded-xl border border-slate-700/40">📊</span>
                        <div>
                          <h4 className="font-extrabold text-xs text-slate-100">Business Growth Dashboard</h4>
                          <p className="text-[10px] text-slate-400 leading-normal">Monitor your sales, view weekly performance metrics, identify best-sellers, and access transparent revenue analytics instantly.</p>
                          <p className="text-[10px] text-[#EDE8FB]/75 italic font-semibold mt-1">Helps answer: “Am I actually making profit?”</p>
                        </div>
                      </div>
                    </div>

                    {/* Item 2 */}
                    <div className="space-y-1 pt-4 first:pt-0">
                      <div className="flex items-start gap-3">
                        <span className="text-sm mt-0.5 shrink-0 bg-slate-800/70 p-2 rounded-xl border border-slate-700/40">📦</span>
                        <div>
                          <h4 className="font-extrabold text-xs text-slate-100">Smart Inventory System</h4>
                          <p className="text-[10px] text-slate-400 leading-normal">Never run dry of top products. Live trackers notify you of low stock states and display custom "almost sold out" badges on your store.</p>
                          <p className="text-[10px] text-[#EDE8FB]/75 italic font-semibold mt-1">Prevents overlapping orders and stocking frustration</p>
                        </div>
                      </div>
                    </div>

                    {/* Item 3 */}
                    <div className="space-y-1 pt-4 first:pt-0">
                      <div className="flex items-start gap-3">
                        <span className="text-sm mt-0.5 shrink-0 bg-slate-800/70 p-2 rounded-xl border border-slate-700/40">🧾</span>
                        <div>
                          <h4 className="font-extrabold text-xs text-slate-100">Customer CRM Vault</h4>
                          <p className="text-[10px] text-slate-400 leading-normal">Keep complete checkout records. Store key customer details, purchase histories, and recognize premium buyers instantly.</p>
                          <p className="text-[10px] text-[#EDE8FB]/75 italic font-semibold mt-1">Perfect for targeted promo dispatching</p>
                        </div>
                      </div>
                    </div>

                    {/* New Item */}
                    <div className="space-y-1 pt-4 first:pt-0">
                      <div className="flex items-start gap-3">
                        <span className="text-sm mt-0.5 shrink-0 bg-slate-800/70 p-2 rounded-xl border border-slate-700/40">⭐</span>
                        <div>
                          <h4 className="font-extrabold text-xs text-slate-100">Automated Review Collection</h4>
                          <p className="text-[10px] text-slate-400 leading-normal">Ask customers to share their feedback automatically after a completed checkout flow is generated.</p>
                          <p className="text-[10px] text-[#EDE8FB]/75 italic font-semibold mt-1">Build trust instantly with high-impact social proof</p>
                        </div>
                      </div>
                    </div>

                    {/* Item 4 */}
                    <div className="space-y-1 pt-4 first:pt-0">
                      <div className="flex items-start gap-3">
                        <span className="text-sm mt-0.5 shrink-0 bg-slate-800/70 p-2 rounded-xl border border-slate-700/40">🚫</span>
                        <div>
                          <h4 className="font-extrabold text-xs text-slate-100">Remove Platform Branding</h4>
                          <p className="text-[10px] text-slate-400 leading-normal">Convey 100% professional poise. Completely remove the "Powered by MySellFlow" watermark from your public storefront footer.</p>
                          <p className="text-[10px] text-[#EDE8FB]/75 italic font-semibold mt-1">Protects your brand's unique aesthetics and prestige</p>
                        </div>
                      </div>
                    </div>

                    {/* Item 5 */}
                    <div className="space-y-1 pt-4 first:pt-0">
                      <div className="flex items-start gap-3">
                        <span className="text-sm mt-0.5 shrink-0 bg-slate-800/70 p-2 rounded-xl border border-slate-700/40">🌐</span>
                        <div>
                          <h4 className="font-extrabold text-xs text-slate-100">Premium .STORE Domain Link</h4>
                          <p className="text-[10px] text-slate-400 leading-normal">Say goodbye to generic subdomains like yourshop.mysellflow.store. Get your brand mapped cleanly to your own `yourshop.store` address.</p>
                          <p className="text-[10px] text-[#EDE8FB]/75 italic font-semibold mt-1">Build instant buyer confidence and authority</p>
                        </div>
                      </div>
                    </div>

                    {/* Item 6 */}
                    <div className="space-y-1 pt-4 first:pt-0">
                      <div className="flex items-start gap-3">
                        <span className="text-sm mt-0.5 shrink-0 bg-slate-800/70 p-2 rounded-xl border border-slate-700/40">🔁</span>
                        <div>
                          <h4 className="font-extrabold text-xs text-slate-100">Repeat Sales Triggers</h4>
                          <p className="text-[10px] text-slate-400 leading-normal">Track custom "buy again" analytics and retrieve re-engagement suggestions tailored to win historical buyers back with zero marketing ad spend.</p>
                          <p className="text-[10px] text-[#EDE8FB]/75 italic font-semibold mt-1">The fastest, lowest-cost strategy to boost your revenue</p>
                        </div>
                      </div>
                    </div>

                    {/* Item 7 */}
                    <div className="space-y-1 pt-4 first:pt-0">
                      <div className="flex items-start gap-3">
                        <span className="text-sm mt-0.5 shrink-0 bg-slate-800/70 p-2 rounded-xl border border-slate-700/40">📈</span>
                        <div>
                          <h4 className="font-extrabold text-xs text-slate-100">Sales Intelligence Tips</h4>
                          <p className="text-[10px] text-slate-400 leading-normal">Discover exactly which trends or items need active focus and pinpoint slow-moving inventory items to clear spaces rapidly.</p>
                          <p className="text-[10px] text-[#EDE8FB]/75 italic font-semibold mt-1">Like a dedicated, 24/7 retail consultant advising your brand</p>
                        </div>
                      </div>
                    </div>
                  </div>
                </div>
              </div>

              <button disabled className="w-full bg-[#5B2FD4]/20 text-white/50 cursor-not-allowed font-extrabold py-3.5 rounded-xl text-xs uppercase tracking-widest transition-all mt-4 border border-[#5B2FD4]/20">
                Configuration Pending
              </button>
            </div>
          </div>
        </div>
      </motion.div>
    );
  };

  const ContactView = () => {
    const [name, setName] = useState('');
    const [email, setEmail] = useState('');
    const [businessType, setBusinessType] = useState('');
    const [message, setMessage] = useState('');
    const [sending, setSending] = useState(false);
    const [success, setSuccess] = useState(false);

    const handleSendMessage = async (e: React.FormEvent) => {
      e.preventDefault();
      if (!name || !email || !message) return;
      setSending(true);
      
      const savedName = name;
      const savedEmail = email;
      const savedBusinessType = businessType || 'General Vendor';
      const savedMessage = message;

      try {
        await addDoc(collection(db, 'contact_messages'), {
          name: savedName,
          email: savedEmail,
          businessType: savedBusinessType,
          message: savedMessage,
          createdAt: new Date().toISOString()
        });

        // Trigger email notification to godgiftakwah28@gmail.com
        try {
          await fetch('/api/notifications/email', {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json'
            },
            body: JSON.stringify({
              to: 'godgiftakwah28@gmail.com',
              subject: `New SellFlow Contact Message from ${savedName}`,
              html: `
                <div style="font-family: sans-serif; padding: 20px; line-height: 1.6; color: #111827;">
                  <h2 style="font-size: 20px; font-weight: bold; margin-bottom: 20px; color: #5B2FD4; border-bottom: 2px solid #EDE8FB; padding-bottom: 10px;">New Contact Submission</h2>
                  <p><strong>Name:</strong> ${savedName}</p>
                  <p><strong>Email:</strong> ${savedEmail}</p>
                  <p><strong>What they sell:</strong> ${savedBusinessType}</p>
                  <div style="margin-top: 20px; padding: 15px; background: #F9FAFB; border-radius: 8px; border: 1px solid #EDE8FB;">
                    <p style="margin: 0; font-weight: bold; color: #374151;">Message:</p>
                    <p style="margin: 10px 0 0 0; white-space: pre-wrap;">${savedMessage}</p>
                  </div>
                  <p style="font-size: 11px; color: #9CA3AF; margin-top: 30px; border-top: 1px solid #EDE8FB; padding-top: 10px;">Sent automatically from SellFlow Landing Page.</p>
                </div>
              `
            })
          });
        } catch (mailErr) {
          console.error("Failed to post email dispatch API:", mailErr);
        }

        setSuccess(true);
        setName('');
        setEmail('');
        setBusinessType('');
        setMessage('');
        setTimeout(() => {
          setSuccess(false);
        }, 5000);
      } catch (err) {
        console.error("Error saving contact message:", err);
        handleFirestoreError(err, OperationType.CREATE, 'contact_messages');
      } finally {
        setSending(false);
      }
    };

    return (
      <motion.div 
        initial={{ opacity: 0, y: 15 }}
        animate={{ opacity: 1, y: 0 }}
        exit={{ opacity: 0, y: -15 }}
        transition={{ duration: 0.3 }}
        className="pt-28 pb-16 bg-[#EDE8FB]/30 min-h-[80vh] px-4"
      >
        <div className="max-w-4xl mx-auto grid grid-cols-1 md:grid-cols-12 gap-8 items-start">
          {/* Contact Info */}
          <div className="md:col-span-5 space-y-6 md:pr-4">
            <div className="space-y-3 text-left">
              <p className="text-xs font-black text-[#5B2FD4] uppercase tracking-widest bg-white/60 px-3 py-1.5 rounded-full inline-block">Support Desk</p>
              <h1 className="font-sans font-black text-3xl sm:text-4xl text-[#111827] tracking-tight italic uppercase leading-none">
                Get In Touch
              </h1>
              <p className="text-slate-500 text-xs sm:text-sm leading-relaxed font-semibold">
                Have questions, feedback, or need premium enterprise setup help? Shoot us a message — we typically answer within 1-2 hours!
              </p>
            </div>

            <div className="space-y-4 pt-4 text-left">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 bg-white rounded-xl flex items-center justify-center text-[#5B2FD4] border border-[#EDE8FB] shadow-xs">
                  <Mail size={18} />
                </div>
                <div>
                  <p className="text-[10px] text-slate-400 font-extrabold uppercase tracking-wide leading-none">Direct Email</p>
                  <p className="text-xs font-black text-slate-800 lowercase mt-1">godgiftakwah28@gmail.com</p>
                </div>
              </div>
              
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 bg-white rounded-xl flex items-center justify-center text-[#5B2FD4] border border-[#EDE8FB] shadow-xs">
                  <Globe size={18} />
                </div>
                <div>
                  <p className="text-[10px] text-slate-400 font-extrabold uppercase tracking-wide leading-none">Business Hours</p>
                  <p className="text-xs font-black text-slate-800 uppercase mt-1">Mon - Sat (08:00 - 18:00 UTC)</p>
                </div>
              </div>
            </div>
          </div>

          {/* Contact Form */}
          <div className="md:col-span-1" />
          <div className="md:col-span-6 bg-white p-6 sm:p-8 rounded-3xl border border-[#EDE8FB] shadow-md relative overflow-hidden">
            <AnimatePresence>
              {success && (
                <motion.div 
                  initial={{ opacity: 0, scale: 0.9 }}
                  animate={{ opacity: 1, scale: 1 }}
                  exit={{ opacity: 0, scale: 0.9 }}
                  className="absolute inset-0 bg-white rounded-3xl z-10 flex flex-col items-center justify-center text-center p-6 space-y-4"
                >
                  <div className="w-14 h-14 bg-emerald-50 text-emerald-500 rounded-full flex items-center justify-center animate-bounce">
                    <CheckCircle2 size={32} />
                  </div>
                  <div className="space-y-1">
                    <h3 className="font-black text-slate-900 text-lg uppercase tracking-tight italic leading-none">Message Received!</h3>
                    <p className="text-xs text-slate-500 leading-relaxed max-w-xs mx-auto font-semibold">Thank you for Reaching Out. Our support specialist is reviewing your message and will notify you via email shortly. ❤️</p>
                  </div>
                </motion.div>
              )}
            </AnimatePresence>

            <form onSubmit={handleSendMessage} className="space-y-4 text-left">
              <div className="space-y-1.5">
                <label className="text-[10px] font-black text-[#5B2FD4] uppercase tracking-widest pl-1">Your Full Name</label>
                <input 
                  type="text"
                  required
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  placeholder="e.g. Sandra Aminu"
                  className="w-full bg-[#EDE8FB]/10 border border-[#EDE8FB] rounded-xl px-4 py-3 text-xs focus:ring-4 focus:ring-[#5B2FD4]/10 focus:outline-none focus:border-[#5B2FD4] transition-all font-semibold"
                />
              </div>

              <div className="space-y-1.5">
                <label className="text-[10px] font-black text-[#5B2FD4] uppercase tracking-widest pl-1">Email Address</label>
                <input 
                  type="email"
                  required
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="e.g. sandra@gmail.com"
                  className="w-full bg-[#EDE8FB]/10 border border-[#EDE8FB] rounded-xl px-4 py-3 text-xs focus:ring-4 focus:ring-[#5B2FD4]/10 focus:outline-none focus:border-[#5B2FD4] transition-all font-semibold"
                />
              </div>

              <div className="space-y-1.5">
                <label className="text-[10px] font-black text-[#5B2FD4] uppercase tracking-widest pl-1">What Do You Sell? (Optional)</label>
                <input 
                  type="text"
                  value={businessType}
                  onChange={(e) => setBusinessType(e.target.value)}
                  placeholder="e.g. Retail Clothes, Cosmetics, Cakes"
                  className="w-full bg-[#EDE8FB]/10 border border-[#EDE8FB] rounded-xl px-4 py-3 text-xs focus:ring-4 focus:ring-[#5B2FD4]/10 focus:outline-none focus:border-[#5B2FD4] transition-all font-semibold"
                />
              </div>

              <div className="space-y-1.5">
                <label className="text-[10px] font-black text-[#5B2FD4] uppercase tracking-widest pl-1">Message Detail</label>
                <textarea 
                  required
                  rows={4}
                  value={message}
                  onChange={(e) => setMessage(e.target.value)}
                  placeholder="Tell us what you'd like support with..."
                  className="w-full bg-[#EDE8FB]/10 border border-[#EDE8FB] rounded-xl px-4 py-3 text-xs focus:ring-4 focus:ring-[#5B2FD4]/10 focus:outline-none focus:border-[#5B2FD4] transition-all resize-none font-semibold"
                />
              </div>

              <button 
                type="submit"
                disabled={sending}
                className="w-full bg-[#5B2FD4] hover:bg-[#4c24b8] text-white font-black text-xs uppercase tracking-widest py-3.5 rounded-xl transition-all shadow-lg hover:shadow-[#5B2FD4]/15 flex items-center justify-center gap-2 cursor-pointer"
              >
                <span>{sending ? 'Sending...' : 'Send Message Now'}</span>
                <Send size={14} />
              </button>
            </form>
          </div>
        </div>
      </motion.div>
    );
  };

  return (
    <div className="min-h-screen bg-[#EDE8FB] text-[#111827] font-sans selection:bg-[#5B2FD4]/20 selection:text-[#5B2FD4]">
      
      {/* Dynamic Header */}
      <nav className="fixed top-0 left-0 right-0 z-50 bg-white/90 backdrop-blur-md border-b border-[#EDE8FB] px-4 py-3 sm:py-4 transition-all">
        <div className="max-w-7xl mx-auto flex items-center justify-between">
          <div className="flex items-center gap-2 cursor-pointer" onClick={() => setCurrentPage('home')}>
            <div className="w-10 h-10 bg-[#5B2FD4] rounded-xl flex items-center justify-center text-white shadow-md shadow-[#5B2FD4]/10">
              <TrendingUp size={22} className="text-white" />
            </div>
            <span className="font-sans font-black text-xl text-[#111827] tracking-tight italic uppercase">
              mysell<span className="text-[#5B2FD4]">flow</span>
            </span>
          </div>

          {/* Desktop Navigation */}
          <div className="hidden md:flex items-center gap-8 text-sm font-semibold text-[#6B7280]">
            <button 
              onClick={() => setCurrentPage('home')} 
              className={`hover:text-[#5B2FD4] transition-all relative py-1 cursor-pointer ${currentPage === 'home' ? 'text-[#5B2FD4] font-black' : ''}`}
            >
              Home
              {currentPage === 'home' && (
                <motion.div layoutId="navIndicator" className="absolute bottom-0 left-0 right-0 h-0.5 bg-[#5B2FD4] rounded-full" />
              )}
            </button>
            <button 
              onClick={() => setCurrentPage('about')} 
              className={`hover:text-[#5B2FD4] transition-all relative py-1 cursor-pointer ${currentPage === 'about' ? 'text-[#5B2FD4] font-black' : ''}`}
            >
              About
              {currentPage === 'about' && (
                <motion.div layoutId="navIndicator" className="absolute bottom-0 left-0 right-0 h-0.5 bg-[#5B2FD4] rounded-full" />
              )}
            </button>
            <button 
              onClick={() => setCurrentPage('features')} 
              className={`hover:text-[#5B2FD4] transition-all relative py-1 cursor-pointer ${currentPage === 'features' ? 'text-[#5B2FD4] font-black' : ''}`}
            >
              Features
              {currentPage === 'features' && (
                <motion.div layoutId="navIndicator" className="absolute bottom-0 left-0 right-0 h-0.5 bg-[#5B2FD4] rounded-full" />
              )}
            </button>
            <button 
              onClick={() => setCurrentPage('pricing')} 
              className={`hover:text-[#5B2FD4] transition-all relative py-1 cursor-pointer ${currentPage === 'pricing' ? 'text-[#5B2FD4] font-black' : ''}`}
            >
              Pricing
              {currentPage === 'pricing' && (
                <motion.div layoutId="navIndicator" className="absolute bottom-0 left-0 right-0 h-0.5 bg-[#5B2FD4] rounded-full" />
              )}
            </button>
            <button 
              onClick={() => setCurrentPage('contact')} 
              className={`hover:text-[#5B2FD4] transition-all relative py-1 cursor-pointer ${currentPage === 'contact' ? 'text-[#5B2FD4] font-black' : ''}`}
            >
              Contact
              {currentPage === 'contact' && (
                <motion.div layoutId="navIndicator" className="absolute bottom-0 left-0 right-0 h-0.5 bg-[#5B2FD4] rounded-full" />
              )}
            </button>
            <button 
              onClick={() => {
                window.history.pushState(null, '', '/explore');
                window.dispatchEvent(new Event('pushstate_changed'));
              }} 
              className="text-[#5B2FD4] font-black bg-[#EDE8FB] hover:bg-[#5B2FD4] hover:text-white transition-all px-4 py-1.5 rounded-full text-xs shadow-sm hover:scale-105 active:scale-95 cursor-pointer flex items-center gap-1.5"
            >
              <TrendingUp size={12} strokeWidth={2.5} />
              Explore Products
            </button>
          </div>

          <div className="hidden md:flex items-center gap-3">
            <button 
              onClick={onLogin}
              className="text-[#6B7280] hover:text-[#5B2FD4] font-bold text-sm px-4 py-2 transition-colors cursor-pointer"
            >
              Log In
            </button>
            <button 
              onClick={onGetStarted}
              className="bg-[#5B2FD4] hover:bg-[#4c24b8] text-white font-black text-sm px-5 py-2.5 rounded-xl transition-all shadow-md shadow-[#5B2FD4]/10 flex items-center gap-1.5 active:scale-95 cursor-pointer"
            >
              <span>Get Started Free</span>
              <ChevronRight size={16} />
            </button>
          </div>

          {/* Mobile Menu Icon */}
          <div className="md:hidden">
            <button 
              onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
              className="p-1 text-[#6B7280] hover:text-[#5B2FD4] transition-colors cursor-pointer"
            >
              {mobileMenuOpen ? <X size={24} /> : <Menu size={24} />}
            </button>
          </div>
        </div>

        {/* Mobile Navigation Panel */}
        <AnimatePresence>
          {mobileMenuOpen && (
            <motion.div 
              initial={{ opacity: 0, height: 0 }}
              animate={{ opacity: 1, height: 'auto' }}
              exit={{ opacity: 0, height: 0 }}
              className="md:hidden border-t border-[#EDE8FB] mt-3 py-4 space-y-2 flex flex-col bg-white rounded-2xl shadow-xl px-2 overflow-hidden"
            >
              <button 
                onClick={() => { setCurrentPage('home'); setMobileMenuOpen(false); }} 
                className={`text-left py-2.5 px-3.5 font-bold rounded-xl transition-all flex items-center justify-between cursor-pointer ${
                  currentPage === 'home' ? 'text-[#5B2FD4] bg-[#EDE8FB]/60' : 'text-[#6B7280] hover:bg-[#EDE8FB]/30 hover:text-[#5B2FD4]'
                }`}
              >
                <span>Home</span>
                {currentPage === 'home' && <span className="w-1.5 h-1.5 rounded-full bg-[#5B2FD4]" />}
              </button>
              <button 
                onClick={() => { setCurrentPage('about'); setMobileMenuOpen(false); }} 
                className={`text-left py-2.5 px-3.5 font-bold rounded-xl transition-all flex items-center justify-between cursor-pointer ${
                  currentPage === 'about' ? 'text-[#5B2FD4] bg-[#EDE8FB]/60' : 'text-[#6B7280] hover:bg-[#EDE8FB]/30 hover:text-[#5B2FD4]'
                }`}
              >
                <span>About</span>
                {currentPage === 'about' && <span className="w-1.5 h-1.5 rounded-full bg-[#5B2FD4]" />}
              </button>
              <button 
                onClick={() => { setCurrentPage('features'); setMobileMenuOpen(false); }} 
                className={`text-left py-2.5 px-3.5 font-bold rounded-xl transition-all flex items-center justify-between cursor-pointer ${
                  currentPage === 'features' ? 'text-[#5B2FD4] bg-[#EDE8FB]/60' : 'text-[#6B7280] hover:bg-[#EDE8FB]/30 hover:text-[#5B2FD4]'
                }`}
              >
                <span>Features</span>
                {currentPage === 'features' && <span className="w-1.5 h-1.5 rounded-full bg-[#5B2FD4]" />}
              </button>
              <button 
                onClick={() => { setCurrentPage('pricing'); setMobileMenuOpen(false); }} 
                className={`text-left py-2.5 px-3.5 font-bold rounded-xl transition-all flex items-center justify-between cursor-pointer ${
                  currentPage === 'pricing' ? 'text-[#5B2FD4] bg-[#EDE8FB]/60' : 'text-[#6B7280] hover:bg-[#EDE8FB]/30 hover:text-[#5B2FD4]'
                }`}
              >
                <span>Pricing</span>
                {currentPage === 'pricing' && <span className="w-1.5 h-1.5 rounded-full bg-[#5B2FD4]" />}
              </button>
              <button 
                onClick={() => { setCurrentPage('contact'); setMobileMenuOpen(false); }} 
                className={`text-left py-2.5 px-3.5 font-bold rounded-xl transition-all flex items-center justify-between cursor-pointer ${
                  currentPage === 'contact' ? 'text-[#5B2FD4] bg-[#EDE8FB]/60' : 'text-[#6B7280] hover:bg-[#EDE8FB]/30 hover:text-[#5B2FD4]'
                }`}
              >
                <span>Contact</span>
                {currentPage === 'contact' && <span className="w-1.5 h-1.5 rounded-full bg-[#5B2FD4]" />}
              </button>

              <button 
                onClick={() => { 
                  setMobileMenuOpen(false); 
                  window.history.pushState(null, '', '/explore');
                  window.dispatchEvent(new Event('pushstate_changed'));
                }} 
                className="w-full text-center py-3.5 bg-[#EDE8FB] hover:bg-[#5B2FD4] hover:text-white text-[#5B2FD4] font-extrabold rounded-xl transition-all cursor-pointer shadow-sm flex items-center justify-center gap-1.5"
              >
                <TrendingUp size={14} strokeWidth={2.5} />
                <span>Explore Products Catalog</span>
              </button>
              
              <div className="border-t border-[#EDE8FB] pt-3 flex flex-col gap-2">
                <button 
                  onClick={() => { setMobileMenuOpen(false); onLogin(); }}
                  className="w-full text-center py-3 text-[#6B7280] hover:text-[#5B2FD4] font-bold rounded-xl hover:bg-[#EDE8FB]/30 transition-colors cursor-pointer"
                >
                  Log In
                </button>
                <button 
                  onClick={() => { setMobileMenuOpen(false); onGetStarted(); }}
                  className="w-full bg-[#5B2FD4] hover:bg-[#4c24b8] text-white text-center py-3 rounded-xl font-bold transition-colors shadow-md shadow-[#5B2FD4]/10 flex items-center justify-center gap-2 cursor-pointer"
                >
                  <span>Get Started Free</span>
                  <ChevronRight size={18} />
                </button>
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </nav>

      {currentPage === 'home' && (
        <>
          {/* HERO SECTION */}
          <section className="pt-24 pb-16 sm:pt-32 sm:pb-24 lg:pt-40 lg:pb-32 px-4 relative overflow-hidden bg-white">
        <div className="absolute inset-0 bg-[radial-gradient(#5B2FD4_1px,transparent_1px)] [background-size:24px_24px] opacity-10 -z-10 pointer-events-none" />
        <div className="absolute top-1/4 right-0 w-72 h-72 bg-[#5B2FD4]/10 rounded-full blur-[100px] opacity-40 -z-10" />
        <div className="absolute bottom-1/4 left-0 w-72 h-72 bg-[#EDE8FB]/60 rounded-full blur-[100px] opacity-40 -z-10" />

        <motion.div 
          initial="hidden"
          animate="visible"
          variants={containerVariants}
          className="max-w-7xl mx-auto grid grid-cols-1 lg:grid-cols-12 gap-12 lg:gap-8 items-center"
        >
          
          {/* Left Column Copy */}
          <motion.div 
            variants={containerVariants}
            className="lg:col-span-6 space-y-6 text-center lg:text-left"
          >
            <motion.div 
              variants={itemVariants}
              className="inline-flex items-center gap-1.5 bg-[#FFF7ED] border border-[#F97316]/15 rounded-full px-3 py-1 text-xs font-bold text-[#F97316] shadow-sm leading-none"
            >
              <span className="w-1.5 h-1.5 bg-[#F97316] rounded-full animate-ping" />
              <span>Built Specially for WhatsApp & Social Vendors</span>
            </motion.div>

            <motion.h1 
              variants={itemVariants}
              className="text-3xl sm:text-4xl md:text-5xl font-black text-[#111827] tracking-tight leading-[1.08]"
            >
              Stop losing orders in <span className="text-[#5B2FD4] decoration-[#5B2FD4]/35 underline decoration-4 decoration-skip-ink font-serif italic">WhatsApp chats</span>
            </motion.h1>

            <motion.p 
              variants={itemVariants}
              className="text-[#6B7280] sm:text-lg max-w-xl mx-auto lg:mx-0 leading-relaxed"
            >
              Turn your WhatsApp business into a professional online store. Track orders, manage inventory, and stay organized from one simple dashboard.
            </motion.p>

            <motion.div 
              variants={itemVariants} 
              className="flex flex-col sm:flex-row items-center justify-center lg:justify-start gap-4 pt-2"
            >
              <motion.button 
                whileHover={{ scale: 1.02, y: -2 }}
                whileTap={{ scale: 0.98 }}
                onClick={onGetStarted}
                className="w-full sm:w-auto bg-[#5B2FD4] hover:bg-[#4c24b8] text-white font-black px-8 py-4 rounded-xl shadow-lg hover:shadow-[#5B2FD4]/20 transition-all flex items-center justify-center gap-2 active:scale-98 cursor-pointer text-sm tracking-wide"
              >
                <span>Get Started Free</span>
                <ArrowRight size={18} className="text-white" />
              </motion.button>
              
              <motion.button 
                whileHover={{ scale: 1.02, y: -2 }}
                whileTap={{ scale: 0.98 }}
                onClick={() => scrollToSection('how-it-works')}
                className="w-full sm:w-auto bg-[#EDE8FB] hover:bg-[#e4ddf9] text-[#5B2FD4] font-bold px-6 py-4 rounded-xl transition-all flex items-center justify-center gap-1.5 text-sm cursor-pointer"
              >
                <span>See How It Works</span>
              </motion.button>
            </motion.div>

            <motion.div 
              variants={itemVariants}
              className="flex items-center justify-center lg:justify-start gap-6 pt-4 text-xs font-semibold text-[#6B7280]"
            >
              <div className="flex items-center gap-1.5">
                <Check className="text-[#22C55E] stroke-[3]" size={15} />
                <span>No credit card required</span>
              </div>
              <div className="flex items-center gap-1.5">
                <Check className="text-[#22C55E] stroke-[3]" size={15} />
                <span>100% Free Trial</span>
              </div>
            </motion.div>
          </motion.div>

          {/* Right Column Interactive Device Mockup */}
          <motion.div 
            initial={{ opacity: 0, y: 40 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ type: "spring", stiffness: 100, damping: 18, delay: 0.2 }}
            className="lg:col-span-6 z-10 w-full max-w-md md:max-w-lg mx-auto"
          >
            <motion.div 
              animate={{
                y: [0, -10, 0],
              }}
              transition={{
                duration: 6,
                repeat: Infinity,
                ease: "easeInOut"
              }}
              className="bg-slate-900 p-3 sm:p-4 rounded-[40px] shadow-2xl border-4 border-slate-800 relative"
            >
              
              {/* Speaker Hole */}
              <div className="absolute top-6 left-1/2 transform -translate-x-1/2 bg-slate-800 h-4 w-28 rounded-full z-20 flex items-center justify-center">
                <div className="w-2 h-2 bg-slate-750 rounded-full absolute right-3" />
              </div>

              {/* Screen Canvas wrapper */}
              <div className="bg-white rounded-[32px] overflow-hidden border border-slate-800 pt-8 shadow-inner text-slate-850 font-sans text-xs relative flex flex-col h-[520px]">
                
                {/* Simulated Device Persistent Header */}
                <div className="bg-white px-4 py-3 flex items-center justify-between border-b border-[#EDE8FB] shrink-0 select-none">
                  <div className="flex items-center gap-1.5">
                    <div className="w-6 h-6 bg-[#5B2FD4] rounded-lg flex items-center justify-center text-white shadow-xs">
                      <TrendingUp size={13} className="text-white fill-none stroke-[2.5]" />
                    </div>
                    <span className="font-sans font-black text-xs text-[#111827] tracking-tighter italic uppercase">
                      mysell<span className="text-[#5B2FD4]">flow</span>
                    </span>
                  </div>
                  {/* Business Avatar matches helensdelight circle/avatar */}
                  <div 
                    className="h-7 w-7 rounded-full bg-pink-100 border border-pink-200/50 flex items-center justify-center text-[7px] font-bold text-pink-600 overflow-hidden cursor-pointer hover:scale-105 active:scale-95 transition-transform" 
                    onClick={() => setMockTab('settings')}
                  >
                    {/* Tiny representation of helensdelight Cosmetics logo */}
                    <div className="h-full w-full rounded-full bg-pink-50 flex flex-col items-center justify-center scale-90">
                      <span className="text-[7.5px] font-black text-rose-500">HD</span>
                    </div>
                  </div>
                </div>

                {/* SCROLLABLE INNER MOBILE PANEL */}
                <div className="flex-1 overflow-y-auto bg-slate-50 relative min-h-0">
                  
                  {/* 1. MANAGER DASHBOARD TAB (Matches Image 1) */}
                  {mockTab === 'dashboard' && (
                    <div className="flex flex-col text-slate-850 animate-fadeIn p-4 space-y-4">
                      {/* Page Title & Stats */}
                      <div>
                        <h3 className="text-lg font-black text-[#111827] tracking-tight">Manager Dashboard</h3>
                        <p className="text-[10px] text-[#6B7280] font-semibold">Welcome back to your sales hub.</p>
                      </div>

                      {/* Quick Action Pills */}
                      <div className="flex items-center gap-2 overflow-x-auto pb-1 scrollbar-none shrink-0">
                        <button className="flex items-center gap-1.5 bg-[#EDE8FB] text-[#5B2FD4] font-extrabold text-[10px] px-3 py-2 rounded-xl border border-[#5B2FD4]/10 whitespace-nowrap shadow-xs hover:bg-[#EDE8FB]/80 transition-colors">
                          <TrendingUp size={11} className="stroke-[3]" />
                          <span>Get AI Strategy</span>
                        </button>
                        <button className="flex items-center gap-1.5 bg-[#DCFCE7] text-[#22C55E] font-extrabold text-[10px] px-3 py-2 rounded-xl border border-[#22C55E]/10 whitespace-nowrap shadow-xs hover:bg-[#DCFCE7]/80 transition-colors">
                          <Plus size={11} className="stroke-[3]" />
                          <span>New Product</span>
                        </button>
                        <button className="flex items-center gap-1.5 bg-[#5B2FD4] text-white font-extrabold text-[10px] px-3 py-2 rounded-xl whitespace-nowrap shadow-xs hover:bg-[#4c24b8] transition-colors">
                          <Plus size={11} className="text-white stroke-[3]" />
                          <span>Quick Lead</span>
                        </button>
                      </div>

                      {/* KPI Cards in sequence */}
                      <div className="space-y-3">
                        
                        {/* Storefront Views Card */}
                        <div className="bg-white rounded-2xl border border-slate-100 shadow-xs p-4 relative overflow-hidden flex flex-col justify-between hover:border-slate-200 transition-colors select-none">
                          <div className="absolute top-0 bottom-0 left-0 w-1 bg-rose-500" />
                          <div className="flex justify-between items-start">
                            <span className="text-[9px] font-black tracking-widest text-rose-500 uppercase">Storefront Views</span>
                            <Eye size={12} className="text-rose-400 stroke-[2.5]" />
                          </div>
                          <div className="my-2">
                            <span className="text-3xl font-black text-[#111827] tracking-tighter italic">43</span>
                          </div>
                          <p className="text-[10px] text-[#6B7280] font-bold">Direct online visitors</p>
                        </div>

                        {/* Paid Customers Card */}
                        <div className="bg-white rounded-2xl border border-slate-100 shadow-xs p-4 relative overflow-hidden flex flex-col justify-between hover:border-slate-200 transition-colors select-none">
                          <div className="absolute top-0 bottom-0 left-0 w-1 bg-[#22C55E]" />
                          <div className="flex justify-between items-start">
                            <span className="text-[9px] font-black tracking-widest text-[#22C55E] uppercase">Paid Customers</span>
                          </div>
                          <div className="my-2">
                            <span className="text-3xl font-black text-[#111827] tracking-tighter italic">4</span>
                          </div>
                          <p className="text-[10px] text-[#6B7280] font-bold">Total revenue recorded</p>
                        </div>

                        {/* Highly Interested Card */}
                        <div className="bg-white rounded-2xl border border-slate-100 shadow-xs p-4 relative overflow-hidden flex flex-col justify-between hover:border-[#EDE8FB] transition-colors select-none">
                          <div className="absolute top-0 bottom-0 left-0 w-1 bg-[#5B2FD4]" />
                          <div className="flex justify-between items-start">
                            <span className="text-[9px] font-black tracking-widest text-[#5B2FD4] uppercase">Highly Interested</span>
                          </div>
                          <div className="my-2 flex justify-between items-end">
                            <span className="text-3xl font-black text-[#111827] tracking-tighter italic">1</span>
                            {/* Dashboard trend micro CTA button */}
                            <div className="w-8 h-8 rounded-full bg-[#5B2FD4] flex items-center justify-center text-white shadow-sm">
                              <TrendingUp size={14} className="stroke-[2.5]" />
                            </div>
                          </div>
                          <p className="text-[10px] text-[#6B7280] font-bold">Potentially ready to buy</p>
                        </div>
                      </div>
                    </div>
                  )}

                  {/* 2. STOREFRONT CATALOG VIEW (Matches Image 8) */}
                  {mockTab === 'storefront' && (
                    <div className="flex flex-col text-slate-850 animate-fadeIn">
                      {/* Storefront Custom Header */}
                      <div className="bg-white p-3.5 border-b border-slate-150 flex items-center justify-between shadow-xs">
                        <div className="flex flex-col">
                          <div className="flex items-center gap-1">
                            <span className="font-extrabold text-[11px] text-[#111827] tracking-tight uppercase italic underline decoration-[#5B2FD4]/40 decoration-2">KABARIAKWAH</span>
                          </div>
                          <span className="text-[7.5px] font-black tracking-widest text-[#5B2FD4] uppercase">Verified Merchant</span>
                        </div>
                        <div className="flex items-center gap-2">
                          <div className="h-6 w-6 rounded-full bg-[#22C55E] text-white flex items-center justify-center cursor-pointer shadow-xs active:scale-90 hover:bg-[#16a34a] transition-colors">
                            <MessageSquare size={11} className="fill-white" />
                          </div>
                          <div 
                            className="h-6 w-6 rounded-full bg-slate-100 text-slate-700 flex items-center justify-center relative cursor-pointer active:scale-95 transition-transform"
                            onClick={() => setMockCartCount(prev => prev + 1)}
                          >
                            <ShoppingBag size={11} />
                            {mockCartCount > 0 && (
                              <span className="absolute -top-1 -right-1 bg-rose-500 text-white text-[7px] font-bold h-3.5 w-3.5 rounded-full flex items-center justify-center border border-white">
                                {mockCartCount}
                              </span>
                            )}
                          </div>
                        </div>
                      </div>

                      <div className="p-4 space-y-4">
                        {/* Selector Tab bar */}
                        <div className="flex items-center gap-2">
                          <span className="text-[8px] font-black uppercase tracking-widest text-slate-450">Filter:</span>
                          <button className="bg-white border-2 border-[#111827] text-[#111827] font-extrabold text-[9px] px-3 py-1 rounded-full uppercase">
                            SERVICE
                          </button>
                          <button className="bg-[#EDE8FB] text-[#5B2FD4] font-bold text-[9px] px-3 py-1 rounded-full uppercase">
                            PHYSICAL
                          </button>
                        </div>

                        {/* Search Input */}
                        <div className="relative flex items-center bg-white border border-[#EDE8FB] rounded-xl px-3 py-2 shadow-xs">
                          <Search size={12} className="text-slate-400 absolute left-3" />
                          <input 
                            type="text" 
                            placeholder="Search catalog items..." 
                            className="bg-transparent pl-5 text-[10px] w-full outline-none text-[#111827] font-medium"
                            disabled
                          />
                        </div>

                        {/* Visual Card exactly representing Image 8 */}
                        <div className="bg-white rounded-2xl border border-[#EDE8FB]/30 shadow-sm overflow-hidden p-3 relative flex flex-col hover:border-[#EDE8FB] transition-colors">
                          <div className="flex items-center justify-between mb-2">
                            <span className="bg-slate-100 text-[#6B7280] font-extrabold text-[8px] px-2 py-0.5 rounded uppercase">PHYSICAL</span>
                            <span className="bg-[#5B2FD4] text-white font-extrabold text-[8px] px-2 py-0.5 rounded uppercase tracking-wider">28% OFF</span>
                          </div>

                          {/* Product illustration mock */}
                          <div className="w-full h-36 bg-slate-50 rounded-xl mb-3 relative flex items-center justify-center border border-slate-100 overflow-hidden">
                            <div className="absolute inset-0 bg-gradient-to-br from-slate-50 to-slate-100/50" />
                            {/* CSS Representation of the panel jacket shirt */}
                            <div className="z-10 flex flex-col items-center select-none">
                              <div className="w-18 h-22 bg-[#111827] rounded-lg shadow-sm border border-slate-800/20 relative overflow-hidden flex flex-col">
                                <div className="absolute top-0 left-0 right-0 h-4 bg-[#5B2FD4] flex items-center justify-center text-[5.5px] font-black text-white">POPULAR</div>
                                {/* Left sleeve block */}
                                <div className="absolute top-4 bottom-0 left-0 w-8 bg-amber-950 border-r border-[#F97316]/20" />
                                {/* Right sleeve block */}
                                <div className="absolute top-4 bottom-0 right-0 w-8 bg-[#111827]" />
                                {/* Central stripe */}
                                <div className="absolute top-4 bottom-0 left-7 right-7 bg-[#F97316]" />
                              </div>
                              <span className="text-[8px] font-mono font-medium text-[#6B7280] mt-1.5">Trendy Panel Shirt</span>
                            </div>
                          </div>

                          {/* Item parameters */}
                          <div className="text-left space-y-1">
                            <h4 className="font-extrabold text-[#111827] text-xs">T-shirt</h4>
                            
                            {/* Placeholder Rating */}
                            <div className="flex items-center gap-1 text-[8.5px] text-[#6B7280]">
                              <div className="flex text-slate-250">
                                {[1, 2, 3, 4, 5].map((i) => (
                                  <Star key={i} size={9} className="fill-[#EDE8FB] stroke-none" />
                                ))}
                              </div>
                              <span>(0)</span>
                            </div>

                            {/* Product price in NGN matching Image 8 */}
                            <div className="flex items-baseline gap-2 pt-0.5">
                              <span className="text-[#111827] font-black text-[13px]">₦25,000.00</span>
                              <span className="text-[#6B7280] line-through text-[9px]">₦34,500.00</span>
                            </div>
                          </div>

                          {/* Action Buttons */}
                          <div className="grid grid-cols-2 gap-2 mt-4 shrink-0">
                            <button 
                              onClick={() => setMockSpecsOpen(true)}
                              className="border border-[#EDE8FB] hover:bg-[#EDE8FB]/30 text-[#5B2FD4] font-extrabold text-[9px] py-1.5 rounded-lg active:scale-95 transition-transform"
                            >
                              SPECS
                            </button>
                            <button 
                              onClick={() => setMockCartCount(prev => prev + 1)}
                              className="bg-[#5B2FD4] hover:bg-[#4c24b8] text-white font-extrabold text-[9px] py-1.5 rounded-lg active:scale-95 transition-transform flex items-center justify-center gap-1"
                            >
                              <span>+ ADD</span>
                            </button>
                          </div>
                        </div>
                      </div>

                      {/* Specs detail layout popup */}
                      <AnimatePresence>
                        {mockSpecsOpen && (
                          <motion.div 
                            initial={{ opacity: 0 }}
                            animate={{ opacity: 1 }}
                            exit={{ opacity: 0 }}
                            className="absolute inset-0 bg-[#111827]/80 z-20 flex items-center justify-center p-4"
                          >
                            <motion.div 
                              initial={{ scale: 0.95, y: 10 }}
                              animate={{ scale: 1, y: 0 }}
                              exit={{ scale: 0.95, y: 10 }}
                              className="bg-white rounded-2xl p-4 w-full max-w-[280px] text-[#111827] space-y-3 shadow-lg"
                            >
                              <div className="flex justify-between items-center border-b border-slate-100 pb-2">
                                <span className="font-extrabold text-xs text-[#111827]">Specs Sheet</span>
                                <button onClick={() => setMockSpecsOpen(false)} className="text-[#6B7280] hover:text-[#111827]">
                                  <X size={14} />
                                </button>
                              </div>
                              <div className="text-[10px] space-y-1.5 text-[#6B7280] font-medium">
                                <div className="flex justify-between border-b border-slate-50 pb-1">
                                  <span className="text-slate-400">Fabric</span>
                                  <span>Premium Cotton Blends</span>
                                </div>
                                <div className="flex justify-between border-b border-slate-50 pb-1">
                                  <span className="text-slate-400">Fitting</span>
                                  <span>Regular Comfort Fit</span>
                                </div>
                                <div className="flex justify-between pb-1">
                                  <span className="text-slate-400">Origin</span>
                                  <span>Made in Nigeria</span>
                                </div>
                              </div>
                              <button 
                                onClick={() => setMockSpecsOpen(false)}
                                className="w-full bg-[#5B2FD4] text-white py-1.5 rounded-lg text-[9px] font-bold uppercase transition-colors hover:bg-[#4c24b8]"
                              >
                                Close Specs
                              </button>
                            </motion.div>
                          </motion.div>
                        )}
                      </AnimatePresence>
                    </div>
                  )}

                  {/* 3. LEADS LIST VIEW (Matches Image 3) */}
                  {mockTab === 'leads' && (
                    <div className="flex flex-col text-slate-850 animate-fadeIn">
                      <div className="p-4 pb-2">
                        <h3 className="text-lg font-black text-[#111827] tracking-tight">Leads</h3>
                        <p className="text-[10px] text-[#6B7280] font-semibold">Track conversations and potential customers.</p>
                      </div>

                      {/* Header Actions */}
                      <div className="grid grid-cols-2 gap-2 px-4 pb-3 shrink-0">
                        <button className="bg-white border border-slate-200 text-[#111827] font-extrabold text-[9px] px-3 py-2.5 rounded-xl flex items-center justify-center gap-1.5 shadow-xs hover:bg-slate-50 transition-colors active:scale-95">
                          <MessageSquare size={10} className="text-[#6B7280]" />
                          <span>Import Leads (CSV)</span>
                        </button>
                        <button className="bg-[#5B2FD4] hover:bg-[#4c24b8] text-white font-extrabold text-[9px] px-3 py-2.5 rounded-xl flex items-center justify-center gap-1 shadow-xs transition-colors active:scale-95">
                          <Plus size={11} className="text-white stroke-[3]" />
                          <span>Add Lead</span>
                        </button>
                      </div>

                      {/* Columns Indicator */}
                      <div className="px-4 py-1.5 flex justify-between text-[8px] font-black tracking-widest text-[#6B7280] uppercase border-b border-light select-none">
                        <span>Customer</span>
                        <span>Interest</span>
                      </div>

                      {/* Matching the exact rows from Image 3 */}
                      <div className="divide-y divide-slate-100 bg-white">
                        {[
                          { name: 'Ike', phone: '0802 438 1398', interest: 'Sharp dress' },
                          { name: 'Daniel', phone: '0802 438 1398', interest: 'Book' },
                          { name: 'John', phone: '08034935515', interest: 'Book' },
                          { name: 'Godgift', phone: '09061439327', interest: 'Sharp dress' },
                          { name: 'Hggg', phone: '08056224562', interest: 'General Storefront' }
                        ].map((lead, index) => (
                          <div key={index} className="px-4 py-2.5 flex items-center justify-between hover:bg-slate-50/50 transition-colors">
                            <div className="flex items-center gap-3 text-left">
                              <div className="h-8 w-8 rounded-full bg-[#5B2FD4] text-white flex items-center justify-center font-black text-xs">
                                {lead.name[0]}
                              </div>
                              <div>
                                <p className="font-extrabold text-[#111827] text-[11px] leading-tight">{lead.name}</p>
                                <p className="text-[9px] font-bold text-[#6B7280] font-mono">{lead.phone}</p>
                              </div>
                            </div>
                            <div className="text-right">
                              <p className="font-bold text-[#5B2FD4] text-[10px] italic">{lead.interest}</p>
                              <span className="text-[7.5px] font-black text-[#6B7280]/60 tracking-wider">SOURCE: STOREFRONT</span>
                            </div>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}

                  {/* 4. FOLLOW-UPS DYNAMIC WORKSPACE VIEW (Matches Image 4) */}
                  {mockTab === 'followups' && (
                    <div className="flex flex-col text-slate-850 animate-fadeIn font-sans">
                      <div className="p-4 pb-2">
                        <h3 className="text-lg font-black text-[#111827] tracking-tight">Follow-ups</h3>
                        <p className="text-[10px] text-[#6B7280] font-semibold">Don't let interested customers go cold.</p>
                      </div>

                      {/* Actions/Cards directly matching Image 4 */}
                      <div className="p-4 space-y-4">
                        
                        {/* Follow up card 1 */}
                        <div className="bg-white rounded-2xl border border-slate-100 shadow-xs p-4 space-y-3 relative text-left">
                          <div className="flex items-center justify-between">
                            <div className="flex items-center gap-2.5">
                              <div className="h-7 w-7 rounded-full bg-[#EDE8FB] text-[#5B2FD4] flex items-center justify-center font-black text-xs uppercase border border-[#5B2FD4]/10">
                                I
                              </div>
                              <div>
                                <p className="font-extrabold text-[#111827] text-[11px] leading-tight font-sans">Ike</p>
                                <p className="text-[8.5px] text-[#6B7280] font-bold font-mono">0802 438 1398</p>
                              </div>
                            </div>
                            <span className="bg-[#EDE8FB] text-[#5B2FD4] border border-[#5B2FD4]/15 text-[7px] font-extrabold px-2 py-0.5 rounded uppercase tracking-wider">NEW</span>
                          </div>

                          {/* Copilot tip draft speech container */}
                          <div className="bg-slate-50 border border-slate-100 rounded-xl p-3 text-[10.5px] text-[#111827] font-medium italic relative">
                            <span className="absolute -top-1.5 left-3 bg-[#EDE8FB] text-[7px] font-bold text-[#5B2FD4] px-1.5 py-0.5 leading-none uppercase tracking-widest border border-[#5B2FD4]/15 rounded">AI Copilot Draft</span>
                            "Customer contact from storefront for: Sharp dress "
                          </div>

                          {/* Matching action buttons */}
                          <div className="grid grid-cols-2 gap-2 pt-1 select-none">
                            <button className="bg-[#5B2FD4] hover:bg-[#4c24b8] text-white font-extrabold text-[9px] py-1.5 rounded-lg flex items-center justify-center gap-1 active:scale-95 transition-transform shadow-xs">
                              <MessageSquare size={10} className="fill-white font-black stroke-[3]" />
                              <span>Send WhatsApp</span>
                            </button>
                            <button className="border border-[#EDE8FB] hover:bg-[#EDE8FB]/30 text-[#5B2FD4] font-extrabold text-[9px] py-1.5 rounded-lg active:scale-95 transition-transform text-center">
                              Regenerate Tip
                            </button>
                          </div>
                        </div>

                        {/* Follow up card 2 */}
                        <div className="bg-white rounded-2xl border border-slate-100 shadow-xs p-4 space-y-3 relative text-left">
                          <div className="flex items-center justify-between">
                            <div className="flex items-center gap-2.5">
                              <div className="h-7 w-7 rounded-full bg-[#EDE8FB] text-[#5B2FD4] flex items-center justify-center font-black text-xs uppercase border border-[#5B2FD4]/10">
                                D
                              </div>
                              <div>
                                <p className="font-extrabold text-[#111827] text-[11px] leading-tight font-sans">Daniel</p>
                                <p className="text-[8.5px] text-[#6B7280] font-bold font-mono">0802 438 1398</p>
                              </div>
                            </div>
                            <span className="bg-[#EDE8FB] text-[#5B2FD4] border border-[#5B2FD4]/15 text-[7px] font-extrabold px-2 py-0.5 rounded uppercase tracking-wider">NEW</span>
                          </div>

                          {/* Copilot tip draft speech container */}
                          <div className="bg-slate-50 border border-slate-100 rounded-xl p-3 text-[10.5px] text-[#111827] font-medium italic relative">
                            <span className="absolute -top-1.5 left-3 bg-[#EDE8FB] text-[7px] font-bold text-[#5B2FD4] px-1.5 py-0.5 leading-none uppercase tracking-widest border border-[#5B2FD4]/15 rounded">AI Copilot Draft</span>
                            "Customer contact from storefront for: Book "
                          </div>

                          {/* Matching action buttons */}
                          <div className="grid grid-cols-2 gap-2 pt-1 select-none">
                            <button className="bg-[#5B2FD4] hover:bg-[#4c24b8] text-white font-extrabold text-[9px] py-1.5 rounded-lg flex items-center justify-center gap-1 active:scale-95 transition-transform shadow-xs">
                              <MessageSquare size={10} className="fill-white font-black stroke-[3]" />
                              <span>Send WhatsApp</span>
                            </button>
                            <button className="border border-[#EDE8FB] hover:bg-[#EDE8FB]/30 text-[#5B2FD4] font-extrabold text-[9px] py-1.5 rounded-lg active:scale-95 transition-transform text-center">
                              Regenerate Tip
                            </button>
                          </div>
                        </div>

                        {/* Okafor trailing entry matches bottom of Image 4 */}
                        <div className="bg-white rounded-2xl border border-slate-100 shadow-xs p-3 flex justify-between items-center text-left">
                          <div className="flex items-center gap-2.5">
                            <div className="h-7 w-7 rounded-full bg-[#EDE8FB] text-[#5B2FD4] flex items-center justify-center font-bold text-xs uppercase">
                              O
                            </div>
                            <div>
                              <p className="font-extrabold text-[#111827] text-[11px] leading-tight">Okafor</p>
                              <p className="text-[8px] text-[#6B7280] font-bold font-mono">Inquired about shipping rates</p>
                            </div>
                          </div>
                          <span className="bg-[#FFF7ED] text-[#F97316] border border-[#F97316]/15 text-[6.5px] font-extrabold px-2 py-0.5 rounded uppercase tracking-wider">INTERESTED</span>
                        </div>
                      </div>
                    </div>
                  )}

                  {/* 5. PRODUCT REVIEWS COLLATED LIST (Matches Image 2) */}
                  {mockTab === 'reviews' && (
                    <div className="flex flex-col text-slate-850 animate-fadeIn">
                      <div className="p-4 pb-2">
                        <h3 className="text-lg font-black text-[#111827] tracking-tight">Product Reviews</h3>
                        <p className="text-[10px] text-[#6B7280] font-semibold">Monitor user feedback and product ratings.</p>
                      </div>

                      <div className="p-4 space-y-4">
                        
                        {/* Review 1 matching screenshots */}
                        <div className="bg-white rounded-2xl border border-slate-100 shadow-xs p-4 space-y-3 relative text-left">
                          <div className="flex justify-between items-start">
                            <div>
                              <h4 className="font-extrabold text-[#111827] text-[11px] leading-tight">Daniel</h4>
                              <span className="text-[7.5px] font-black tracking-widest text-[#6B7280] uppercase">ON BOOK</span>
                            </div>
                            <div className="flex text-amber-400">
                              {[1, 2, 3, 4, 5].map((i) => (
                                <Star key={i} size={11} className="fill-amber-400 stroke-none" />
                              ))}
                            </div>
                          </div>
                          <div className="bg-slate-50 border border-slate-50 rounded-xl p-3 text-[11px] text-[#111827] font-semibold italic">
                            "Lovely "
                          </div>
                          <p className="text-[8px] text-[#6B7280] font-bold font-mono">6/8/2026</p>
                        </div>

                        {/* Review 2 matching screenshots */}
                        <div className="bg-white rounded-2xl border border-slate-100 shadow-xs p-4 space-y-3 relative text-left">
                          <div className="flex justify-between items-start">
                            <div>
                              <h4 className="font-extrabold text-[#111827] text-[11px] leading-tight font-sans">Johnny</h4>
                              <span className="text-[7.5px] font-black tracking-widest text-[#6B7280] uppercase">ON BOOK</span>
                            </div>
                            <div className="flex">
                              {[1, 2, 3].map((i) => (
                                <Star key={i} size={11} className="fill-amber-400 stroke-none" />
                              ))}
                              {[1, 2].map((i) => (
                                <Star key={i} size={11} className="fill-[#EDE8FB] stroke-none" />
                              ))}
                            </div>
                          </div>
                          <div className="bg-slate-50 border border-slate-50 rounded-xl p-3 text-[11px] text-[#111827] font-semibold italic">
                            "Cool😎"
                          </div>
                          <p className="text-[8px] text-[#6B7280] font-bold font-mono">6/8/2026</p>
                        </div>
                      </div>
                    </div>
                  )}

                  {/* 6. SYSTEM SETTINGS CONTROL CENTER (Matches Image 5, 6, 7) */}
                  {mockTab === 'settings' && (
                    <div className="flex flex-col text-slate-850 animate-fadeIn p-4 pb-12 space-y-4">
                      
                      {/* Section Title */}
                      <div>
                        <h3 className="text-lg font-black text-[#111827] tracking-tight">System Settings</h3>
                        <p className="text-[10px] text-[#6B7280] font-semibold">Configure your brand identity and secure integrations.</p>
                      </div>

                      {/* System trigger actions header */}
                      <div className="flex gap-2 select-none shrink-0 border-b border-slate-100 pb-3">
                        <button 
                          onClick={() => setMockTab('dashboard')}
                          className="flex items-center justify-center gap-1.5 border border-[#EDE8FB] hover:bg-[#EDE8FB]/40 text-[#5B2FD4] font-black text-[9px] px-3 py-2 rounded-xl transition-all active:scale-95 shadow-2xs"
                        >
                          <LogOut size={10} className="rotate-180" />
                          <span>SIGN OUT</span>
                        </button>
                        <button className="bg-[#5B2FD4] hover:bg-[#4c24b8] text-white font-black text-[9px] px-5 py-2 rounded-xl transition-all active:scale-95 flex-1 shadow-md shadow-[#5B2FD4]/10">
                          SAVE CHANGES
                        </button>
                      </div>

                      {/* Settings Pills Menus (matches Image 5) */}
                      <div className="space-y-1 text-left select-none">
                        <button 
                          onClick={() => {
                            setMockSettingsTab('profile');
                            triggerMockToast("Switched to Profile & Identity settings!");
                          }}
                          className={`w-full flex items-center gap-2.5 p-2 rounded-xl text-[10px] border transition-all cursor-pointer ${mockSettingsTab === 'profile' ? 'bg-white border-[#EDE8FB] text-[#5B2FD4] shadow-2xs font-extrabold' : 'bg-transparent border-transparent text-[#6B7280] hover:text-[#111827] font-semibold'}`}
                        >
                          <Users size={12} className={mockSettingsTab === 'profile' ? 'text-[#5B2FD4] stroke-[2.5]' : 'text-slate-450'} />
                          <span>Business Profile</span>
                        </button>
                        <button 
                          onClick={() => {
                            setMockSettingsTab('storefront');
                            triggerMockToast("Switched to Storefront customizer!");
                          }}
                          className={`w-full flex items-center gap-2.5 p-2 rounded-xl text-[10px] border transition-all cursor-pointer ${mockSettingsTab === 'storefront' ? 'bg-white border-[#EDE8FB] text-[#5B2FD4] shadow-2xs font-extrabold' : 'bg-transparent border-transparent text-[#6B7280] hover:text-[#111827] font-semibold'}`}
                        >
                          <Store size={12} className={mockSettingsTab === 'storefront' ? 'text-[#5B2FD4] stroke-[2.5]' : 'text-slate-450'} />
                          <span>Storefront & Sales</span>
                        </button>
                        <button 
                          onClick={() => {
                            setMockSettingsTab('whatsapp');
                            triggerMockToast("Switched to WhatsApp API integration!");
                          }}
                          className={`w-full flex items-center gap-2.5 p-2 rounded-xl text-[10px] border transition-all cursor-pointer ${mockSettingsTab === 'whatsapp' ? 'bg-white border-[#EDE8FB] text-[#5B2FD4] shadow-2xs font-extrabold' : 'bg-transparent border-transparent text-[#6B7280] hover:text-[#111827] font-semibold'}`}
                        >
                          <MessageSquare size={12} className={mockSettingsTab === 'whatsapp' ? 'text-[#22C55E] stroke-[2.5]' : 'text-slate-450'} />
                          <span>WhatsApp API</span>
                        </button>
                      </div>

                      {/* Primary panel display (Matches image 5 brand identity cosmetics styling) */}
                      <div className="space-y-4">
                        
                        {/* 1. PROFILE TAB SETTINGS CARDS */}
                        {mockSettingsTab === 'profile' && (
                          <div className="space-y-4 animate-fadeIn">
                            {/* Brand Identity details */}
                            <div className="bg-white rounded-2xl border border-slate-100 p-4 space-y-3 shadow-xs">
                              <span className="text-[8px] font-black tracking-widest text-[#6B7280] uppercase block text-left">BRAND IDENTITY</span>
                              
                              <div className="flex flex-col items-center py-2.5">
                                <div className="relative h-20 w-20 rounded-full border border-slate-100 shadow-sm p-1 bg-white flex items-center justify-center select-none">
                                  {/* Helensdelight logo representation SVG */}
                                  <div className="h-full w-full rounded-full bg-pink-50 border border-pink-100/55 flex flex-col items-center justify-center text-center p-1 overflow-hidden relative">
                                    <span className="text-[10px] font-black text-rose-500 leading-none">HD</span>
                                    <span className="text-[5.5px] font-extrabold text-slate-600 scale-90 uppercase leading-none mt-0.5">helensdelight</span>
                                    <span className="text-[4px] text-pink-400 italic mt-0.5">Cosmetics</span>
                                    <div className="absolute bottom-1 bg-pink-100/40 px-1 py-0.5 rounded text-[3px] font-black text-rose-600 scale-95 leading-none">We care • Enjoy</div>
                                  </div>
                                  {/* Red Delete Badge matched from Image 5 */}
                                  <button onClick={() => triggerMockToast("Store logo removal is simulated.")} className="absolute -top-1 -right-0.5 bg-rose-500 hover:bg-rose-600 text-white rounded-full p-1 border border-white shadow-xs leading-none active:scale-90 transition-transform cursor-pointer">
                                    <Plus size={9} className="rotate-45 stroke-[3]" />
                                  </button>
                                </div>
                                <span className="text-[8px] font-black text-[#6B7280] mt-3 tracking-wider uppercase">BUSINESS LOGO / PROFILE IMAGE</span>
                              </div>
                            </div>

                            {/* Store URL configure */}
                            <div className="bg-white rounded-2xl border border-slate-100 p-4 space-y-3 shadow-xs text-left">
                              <span className="text-[8px] font-black tracking-widest text-[#6B7280] uppercase block">STORE URL SUBDOMAIN</span>
                              
                              <div className="flex items-center bg-slate-50 border border-slate-150 rounded-xl px-3 py-2 justify-between">
                                <span className="font-extrabold text-[#111827] text-[10.5px]">akwah</span>
                                <span className="text-[#6B7280] font-mono text-[9px] font-bold">.mysellflow.store</span>
                              </div>

                              {/* Matching action choices */}
                              <div className="grid grid-cols-2 gap-2 relative">
                                <button 
                                  onClick={() => {
                                    setMockShowCopied(true);
                                    triggerMockToast("Simulated storefront link copied!");
                                    setTimeout(() => setMockShowCopied(false), 2000);
                                  }}
                                  className="bg-slate-100 hover:bg-[#EDE8FB]/40 hover:text-[#5B2FD4] text-[#111827] font-extrabold text-[9px] py-2 px-2.5 rounded-lg flex items-center justify-center gap-1 text-center transition-colors shadow-2xs cursor-pointer"
                                >
                                  <Copy size={10} />
                                  <span className="uppercase">{mockShowCopied ? 'COPIED!' : 'COPY'}</span>
                                </button>
                                <button 
                                  onClick={() => {
                                    setMockTab('storefront');
                                    triggerMockToast("Opening public guest storefront preview!");
                                  }}
                                  className="bg-slate-100 hover:bg-[#EDE8FB]/40 hover:text-[#5B2FD4] text-[#111827] font-extrabold text-[9px] py-2 px-2.5 rounded-lg flex items-center justify-center gap-1 text-center transition-colors shadow-2xs cursor-pointer"
                                >
                                  <Globe size={10} />
                                  <span>OPEN</span>
                                </button>
                              </div>
                            </div>
                          </div>
                        )}

                        {/* 2. STOREFRONT TAB SETTINGS CARDS */}
                        {mockSettingsTab === 'storefront' && (
                          <div className="space-y-4 animate-fadeIn">
                            {/* STOREFRONT CURRENCY TRIGGER (Matches Image 6) */}
                            <div className="bg-white rounded-2xl border border-slate-100 p-4 space-y-3 shadow-xs text-left">
                              <span className="text-[8px] font-black tracking-widest text-[#6B7280] uppercase block">STOREFRONT CURRENCY</span>
                              
                              <button 
                                onClick={() => setMockCurrencyOpen(true)}
                                className="w-full flex items-center justify-between bg-white border border-slate-200 p-2.5 rounded-xl font-extrabold text-[10px] text-[#111827] hover:border-[#5B2FD4] transition-colors shadow-2xs cursor-pointer"
                              >
                                <span>
                                  {mockCurrency === 'NGN' ? 'Nigerian Naira (NGN)' : mockCurrency === 'USD' ? 'US Dollar (USD)' : mockCurrency === 'GHS' ? 'Ghanaian Cedi (GHS)' : 'Kenyan Shilling (KES)'}
                                </span>
                                <span className="text-[#5B2FD4] font-black text-[9px]">CHANGE</span>
                              </button>
                            </div>

                            {/* SEARCH ENGINE OPTIMIZATION (SEO) (Matches Image 7) */}
                            <div className="bg-white rounded-2xl border border-slate-100 p-4 space-y-3 shadow-xs text-left">
                              <span className="text-[8px] font-black tracking-widest text-[#6B7280] uppercase block">SEARCH ENGINE OPTIMIZATION (SEO)</span>
                              
                              <div className="space-y-3">
                                <div>
                                  <label className="text-[8px] font-black text-[#6B7280] uppercase">META TITLE</label>
                                  <input 
                                    type="text" 
                                    placeholder="e.g. Best Handmade Fabrics in Lagos" 
                                    className="w-full bg-slate-50 border border-slate-200 rounded-xl p-2.5 text-[10px] text-[#111827] font-medium placeholder-[#6B7280]/40 outline-none mt-1"
                                    disabled
                                  />
                                  <p className="text-[7.5px] text-[#6B7280] font-medium mt-0.5">Recommended length: 50-60 characters.</p>
                                </div>

                                <div>
                                  <label className="text-[8px] font-black text-[#6B7280] uppercase">META DESCRIPTION</label>
                                  <textarea 
                                    placeholder="Describe your shop for Google search results..." 
                                    rows={2}
                                    className="w-full bg-slate-50 border border-slate-200 rounded-xl p-2.5 text-[10px] text-[#111827] font-medium placeholder-[#6B7280]/40 outline-none resize-none mt-1"
                                    disabled
                                  />
                                  <p className="text-[7.5px] text-[#6B7280] font-medium mt-0.5">Recommended length: 150-160 characters.</p>
                                </div>
                              </div>
                            </div>
                          </div>
                        )}

                        {/* 3. WHATSAPP TAB SETTINGS CARDS */}
                        {mockSettingsTab === 'whatsapp' && (
                          <div className="space-y-4 animate-fadeIn">
                            {/* WHATSAPP PUBLIC NUMBER & VERIFIED SELL SIGN (Matches Image 7) */}
                            <div className="bg-white rounded-2xl border border-slate-100 p-4 space-y-4 shadow-xs text-left">
                              <div>
                                <label className="text-[8px] font-black text-[#6B7280] uppercase block">PUBLIC WHATSAPP NUMBER (FOR STOREFRONT)</label>
                                <input 
                                  type="text" 
                                  defaultValue="2349061439327" 
                                  className="w-full bg-slate-50 border border-slate-200 rounded-xl p-2.5 text-[10px] text-[#111827] font-extrabold outline-none mt-1 shadow-2xs"
                                  disabled
                                />
                                <p className="text-[7px] text-[#6B7280] font-bold mt-1">This number will be used when customers click "Contact Seller" on your public store.</p>
                              </div>

                              <div className="border-t border-slate-100 pt-3 flex items-center justify-between">
                                <div>
                                  <p className="font-extrabold text-[#111827] text-[10.5px]">Verified Seller Status</p>
                                  <p className="text-[7px] text-[#6B7280] font-medium mt-0.5">Build trust with a blue verification badge on your profile.</p>
                                </div>
                                
                                {/* Toggle verified status switch */}
                                <button 
                                  onClick={() => {
                                    setMockVerifiedSeller(!mockVerifiedSeller);
                                    triggerMockToast(!mockVerifiedSeller ? "Verified merchant sign active!" : "Verified merchant sign turned off.");
                                  }}
                                  className={`w-9 h-5 rounded-full p-0.5 transition-colors focus:outline-none flex items-center cursor-pointer ${mockVerifiedSeller ? 'bg-[#5B2FD4]' : 'bg-slate-300'}`}
                                >
                                  <div className={`bg-white w-4 h-4 rounded-full shadow-md transform transition-transform duration-200 ease-in-out ${mockVerifiedSeller ? 'translate-x-4' : 'translate-x-0'}`} />
                                </button>
                              </div>
                            </div>
                          </div>
                        )}

                      </div>

                      {/* Custom Currency Selection dropdown Bottom Sheet popup (Matches Image 6 exactly) */}
                      <AnimatePresence>
                        {mockCurrencyOpen && (
                          <motion.div 
                            initial={{ opacity: 0 }}
                            animate={{ opacity: 1 }}
                            exit={{ opacity: 0 }}
                            className="absolute inset-0 bg-[#111827]/40 z-30 flex items-end select-none"
                            onClick={() => setMockCurrencyOpen(false)}
                          >
                            <motion.div 
                              initial={{ y: 150 }}
                              animate={{ y: 0 }}
                              exit={{ y: 150 }}
                              className="w-full bg-[#111827] text-white rounded-t-3xl overflow-hidden shadow-2xl p-4 space-y-2 border-t border-[#EDE8FB]/10"
                              onClick={(e) => e.stopPropagation()}
                            >
                              <div className="flex justify-between items-center pb-1">
                                <span className="font-black text-[10px] text-[#5B2FD4] tracking-wider">STOREFRONT CURRENCY</span>
                                <button onClick={() => setMockCurrencyOpen(false)} className="text-[#6B7280] hover:text-white">
                                  <X size={14} />
                                </button>
                              </div>
                              
                              <div className="divide-y divide-[#EDE8FB]/10">
                                {[
                                  { code: 'NGN', name: 'Nigerian Naira (NGN)' },
                                  { code: 'USD', name: 'US Dollar (USD)' },
                                  { code: 'GHS', name: 'Ghanaian Cedi (GHS)' },
                                  { code: 'KES', name: 'Kenyan Shilling (KES)' }
                                ].map((cur) => (
                                  <button 
                                    key={cur.code}
                                    onClick={() => {
                                      setMockCurrency(cur.code as any);
                                      setMockCurrencyOpen(false);
                                    }}
                                    className="w-full flex items-center justify-between py-3 px-1 text-left transition-colors font-extrabold text-xs"
                                  >
                                    <span className={mockCurrency === cur.code ? 'text-[#5B2FD4]' : 'text-slate-300'}>{cur.name}</span>
                                    <div className={`h-4.5 w-4.5 rounded-full border-2 flex items-center justify-center ${mockCurrency === cur.code ? 'border-[#5B2FD4]' : 'border-slate-600'}`}>
                                      {mockCurrency === cur.code && <div className="h-2 w-2 rounded-full bg-[#5B2FD4]" />}
                                    </div>
                                  </button>
                                ))}
                              </div>
                            </motion.div>
                          </motion.div>
                        )}
                      </AnimatePresence>
                    </div>
                  )}

                </div>

                {/* Simulated Device Bottom Navigation Bar */}
                <div className="bg-white border-t border-slate-100 px-3 py-2.5 grid grid-cols-6 gap-0.5 select-none shrink-0 text-[10px] shadow-lg">
                  
                  {/* 1. Dashboard Tab */}
                  <button 
                    onClick={() => setMockTab('dashboard')} 
                    className="flex flex-col items-center justify-center transition-all h-10 rounded-xl"
                  >
                    <div className={`flex items-center justify-center h-8 w-8 rounded-xl transition-all ${mockTab === 'dashboard' ? 'bg-[#5B2FD4] text-white shadow-md shadow-[#5B2FD4]/20 scale-105' : 'text-[#6B7280] hover:text-[#5B2FD4]'}`}>
                      <LayoutGrid size={16} className={mockTab === 'dashboard' ? 'stroke-[2.5]' : 'stroke-[2]'} />
                    </div>
                  </button>

                  {/* 2. Storefront Tab */}
                  <button 
                    onClick={() => setMockTab('storefront')} 
                    className="flex flex-col items-center justify-center transition-all h-10 rounded-xl relative"
                  >
                    <div className={`flex items-center justify-center h-8 w-8 rounded-xl transition-all ${mockTab === 'storefront' ? 'bg-[#5B2FD4] text-white shadow-md shadow-[#5B2FD4]/20 scale-105' : 'text-[#6B7280] hover:text-[#5B2FD4]'}`}>
                      <ShoppingBag size={16} className={mockTab === 'storefront' ? 'stroke-[2.5]' : 'stroke-[2]'} />
                    </div>
                    {mockCartCount > 0 && mockTab !== 'storefront' && (
                      <span className="absolute top-1.5 right-2 bg-amber-500 text-slate-950 text-[6.5px] font-extrabold h-4 w-4 rounded-full flex items-center justify-center border border-white">
                        {mockCartCount}
                      </span>
                    )}
                  </button>

                  {/* 3. Leads Tab */}
                  <button 
                    onClick={() => setMockTab('leads')} 
                    className="flex flex-col items-center justify-center transition-all h-10 rounded-xl"
                  >
                    <div className={`flex items-center justify-center h-8 w-8 rounded-xl transition-all ${mockTab === 'leads' ? 'bg-[#5B2FD4] text-white shadow-md shadow-[#5B2FD4]/20 scale-105' : 'text-[#6B7280] hover:text-[#5B2FD4]'}`}>
                      <Users size={16} className={mockTab === 'leads' ? 'stroke-[2.5]' : 'stroke-[2]'} />
                    </div>
                  </button>

                  {/* 4. Followups Tab */}
                  <button 
                    onClick={() => setMockTab('followups')} 
                    className="flex flex-col items-center justify-center transition-all h-10 rounded-xl"
                  >
                    <div className={`flex items-center justify-center h-8 w-8 rounded-xl transition-all ${mockTab === 'followups' ? 'bg-[#5B2FD4] text-white shadow-md shadow-[#5B2FD4]/20 scale-105' : 'text-[#6B7280] hover:text-[#5B2FD4]'}`}>
                      <Clock size={16} className={mockTab === 'followups' ? 'stroke-[2.5]' : 'stroke-[2]'} />
                    </div>
                  </button>

                  {/* 5. Reviews Tab */}
                  <button 
                    onClick={() => setMockTab('reviews')} 
                    className="flex flex-col items-center justify-center transition-all h-10 rounded-xl"
                  >
                    <div className={`flex items-center justify-center h-8 w-8 rounded-xl transition-all ${mockTab === 'reviews' ? 'bg-[#5B2FD4] text-white shadow-md shadow-[#5B2FD4]/20 scale-105' : 'text-[#6B7280] hover:text-[#5B2FD4]'}`}>
                      <Star size={16} className={mockTab === 'reviews' ? 'stroke-[2.5]' : 'stroke-[2]'} />
                    </div>
                  </button>

                  {/* 6. Settings Tab */}
                  <button 
                    onClick={() => setMockTab('settings')} 
                    className="flex flex-col items-center justify-center transition-all h-10 rounded-xl"
                  >
                    <div className={`flex items-center justify-center h-8 w-8 rounded-xl transition-all ${mockTab === 'settings' ? 'bg-[#5B2FD4] text-white shadow-md shadow-[#5B2FD4]/20 scale-105' : 'text-[#6B7280] hover:text-[#5B2FD4]'}`}>
                      <Settings size={16} className={mockTab === 'settings' ? 'stroke-[2.5]' : 'stroke-[2]'} />
                    </div>
                  </button>
                </div>

              </div>
            </motion.div>
          </motion.div>
        </motion.div>
      </section>

      {/* DISCOVER PRODUCTS SECTION */}
      <section className="py-20 bg-[#FBFBFE] border-t border-b border-slate-100 overflow-hidden">
        <div className="max-w-6xl mx-auto px-4 space-y-12">
          
          <div className="text-center space-y-4 max-w-2xl mx-auto">
            <span className="text-[10px] font-black tracking-widest text-[#5B2FD4] uppercase bg-violet-105 border border-[#5B2FD4]/10 px-3 py-1 rounded-md">
              Live Ecosystem
            </span>
            <h2 className="text-3xl md:text-4xl font-black text-slate-900 tracking-tight leading-none uppercase italic">
              🛍 Discover Products
            </h2>
            <p className="text-slate-550 text-xs sm:text-sm font-medium">
              Browse products from businesses using MySellFlow.
            </p>

            {/* Statistics Row */}
            <div className="flex flex-wrap justify-center items-center gap-4 sm:gap-6 pt-2">
              <div className="bg-white border border-slate-150 px-5 py-3 rounded-2xl shadow-xs flex items-center gap-2.5">
                <div className="h-2 w-2 rounded-full bg-emerald-500 animate-pulse" />
                <span className="text-xs font-black text-slate-800">
                  {isDiscoverLoading ? '...' : stats.productsCount} Products Available
                </span>
              </div>
              <div className="bg-white border border-slate-150 px-5 py-3 rounded-2xl shadow-xs flex items-center gap-2.5">
                <div className="h-2 w-2 rounded-full bg-[#5B2FD4] animate-pulse" />
                <span className="text-xs font-black text-slate-800">
                  {isDiscoverLoading ? '...' : stats.storesCount} Active Stores
                </span>
              </div>
            </div>
          </div>

          {/* Live Product Preview */}
          <div className="w-full">
            {isDiscoverLoading ? (
              /* Loading Skeletons */
              <div className="flex overflow-x-auto md:grid md:grid-cols-4 gap-6 pb-6 md:pb-0 px-4 md:px-0">
                {[1, 2, 3, 4].map((id) => (
                  <div key={id} className="w-[280px] shrink-0 md:w-auto bg-white rounded-3xl border border-slate-100 p-4 space-y-4 animate-pulse">
                    <div className="aspect-square bg-slate-50 rounded-2xl w-full" />
                    <div className="space-y-2">
                      <div className="h-3 bg-slate-100 rounded w-1/3" />
                      <div className="h-4 bg-slate-100 rounded w-3/4" />
                      <div className="h-3.5 bg-slate-100 rounded w-1/2" />
                    </div>
                  </div>
                ))}
              </div>
            ) : validDiscoverProducts.length === 0 ? (
              /* Empty State */
              <div className="text-center py-12 bg-white rounded-3xl border border-dashed border-slate-200 p-8 max-w-sm mx-auto space-y-4 shadow-xs">
                <div className="text-4xl">🛍️</div>
                <h4 className="text-sm font-black uppercase text-slate-800 tracking-tight">No products listed yet</h4>
                <p className="text-xs text-slate-400 leading-relaxed">
                  Be the first entrepreneur to launch an active storefront and list your custom products!
                </p>
                <button 
                  type="button"
                  onClick={onGetStarted}
                  className="bg-[#5B2FD4] text-white px-5 py-2.5 rounded-xl text-[10px] font-black uppercase tracking-widest shadow-sm hover:bg-[#4a23b3] transition-all cursor-pointer"
                >
                  Create A Store Now
                </button>
              </div>
            ) : (
              /* Products Grid/Scroll Container */
              <div className="flex overflow-x-auto md:grid md:grid-cols-4 gap-6 pb-6 md:pb-0 px-4 md:px-0 scrollbar-none snap-x snap-mandatory scroll-smooth overscroll-x-contain">
                {validDiscoverProducts.slice(0, 8).map((product) => {
                  const seller = businessesMap[product.ownerId];
                  const discount = product.originalPrice && product.originalPrice > product.price 
                    ? Math.round(((product.originalPrice - product.price) / product.originalPrice) * 100) 
                    : null;

                  return (
                    <div 
                      key={product.id} 
                      onClick={() => navigateTo(`/explore/product/${product.id}`)}
                      className="w-[280px] shrink-0 md:w-auto snap-align-start bg-white rounded-2xl border border-slate-150 shadow-sm hover:shadow-xl hover:-translate-y-1.5 transition-all duration-300 flex flex-col group cursor-pointer overflow-hidden relative"
                    >
                      {/* Image Frame */}
                      <div className="aspect-square bg-slate-50/60 overflow-hidden flex items-center justify-center relative p-4 border-b border-slate-50 select-none">
                        {product.images?.[0] ? (
                          <img 
                            src={product.images[0]} 
                            className="max-h-full max-w-full object-contain group-hover:scale-105 transition-transform duration-300" 
                            alt={product.name} 
                            referrerPolicy="no-referrer"
                          />
                        ) : (
                          <ShoppingBag size={32} strokeWidth={1} className="text-slate-350" />
                        )}

                        {/* Top-right discount label if any */}
                        {discount && (
                          <div className="absolute top-2.5 right-2.5 bg-red-500 text-white px-1.5 py-0.5 rounded-md text-[8px] font-black uppercase tracking-wider shadow-sm z-10">
                            {discount}% OFF
                          </div>
                        )}

                        {/* Type badge overlay */}
                        {product.type && (
                          <div className="absolute top-2.5 left-2.5 bg-white/90 backdrop-blur-md px-1.5 py-0.5 rounded-md border border-slate-100 text-[8px] font-black uppercase tracking-widest text-[#5B2FD4]">
                            {product.type}
                          </div>
                        )}
                      </div>

                      {/* Info Frame */}
                      <div className="p-4 flex-1 flex flex-col justify-between space-y-4">
                        <div className="space-y-1.5">
                          {/* Store Name Badge */}
                          {seller && (
                            <div className="flex items-center gap-1">
                              <span className="text-[7.5px] font-black tracking-widest uppercase truncate max-w-[150px] bg-indigo-50 text-[#5B2FD4] px-1.5 py-0.5 rounded-md border border-indigo-100/50">
                                {seller.name}
                              </span>
                              <CheckCircle2 size={8.5} className="text-[#5B2FD4] fill-[#5B2FD4]/10 shrink-0" />
                            </div>
                          )}

                          <h3 className="text-xs sm:text-xs md:text-sm font-bold text-slate-800 line-clamp-2 leading-snug group-hover:text-[#5B2FD4] transition-colors min-h-[32px]">
                            {product.name}
                          </h3>
                        </div>

                        <div className="space-y-2.5">
                          {/* Prices Row */}
                          <div className="flex items-baseline gap-1.5">
                            <span className="text-xs sm:text-sm md:text-base font-black text-slate-950">
                              {formatCurrency(product.price, seller?.currency)}
                            </span>
                            {product.originalPrice && product.originalPrice > product.price && (
                              <span className="text-[9px] sm:text-[10px] text-slate-400 font-bold line-through">
                                {formatCurrency(product.originalPrice, seller?.currency)}
                              </span>
                            )}
                          </div>

                          {/* Accent detail bar */}
                          <p className="text-[7.5px] font-black uppercase tracking-wider text-emerald-600 flex items-center gap-1 bg-emerald-50/60 p-1.5 rounded-lg border border-emerald-100/50">
                            <span>Ready to Purchase</span> • <span className="underline font-black">{seller?.name || "Merchant"}</span> ✓
                          </p>
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>

          {/* Call-to-actions row */}
          <div className="flex flex-col items-center justify-center gap-4.5 pt-4">
            <button
              type="button"
              onClick={() => navigateTo('/explore')}
              className="bg-[#5B2FD4] hover:bg-[#4a23b3] text-white font-black uppercase text-[10px] tracking-widest px-7 py-3.5 rounded-2xl transition-all shadow-[0_4px_14px_rgba(91,47,212,0.25)] hover:shadow-[0_6px_20px_rgba(91,47,212,0.35)] active:scale-98 cursor-pointer"
            >
              Explore Products
            </button>
            <button
              type="button"
              onClick={() => navigateTo('/explore')}
              className="group text-slate-500 hover:text-[#5B2FD4] font-black text-[10px] uppercase tracking-widest transition-colors flex items-center gap-1.5 cursor-pointer"
            >
              <span>View All Products</span>
              <span className="group-hover:translate-x-1 transition-transform">→</span>
            </button>
          </div>

        </div>
      </section>

      {/* EARLY SOCIAL PROOF SEGMENTS */}
      <section className="py-12 bg-white border-t border-b border-slate-100 overflow-hidden relative">
        <div className="max-w-6xl mx-auto px-4 text-center space-y-8 relative">
          
          <motion.div 
            initial={{ opacity: 0, y: 15 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            transition={{ duration: 0.5 }}
            className="space-y-2"
          >
            <span className="text-[10px] font-black tracking-widest text-[#5B2FD4] uppercase bg-[#EDE8FB] border border-[#5B2FD4]/10 rounded-full px-3 py-1 leading-none inline-block">Niche Specific Fit</span>
            <h3 className="text-xl sm:text-2xl font-black text-slate-900 tracking-tight">
              Tailor-Made for Your Business Type
            </h3>
            <p className="text-slate-500 text-xs sm:text-sm max-w-xl mx-auto leading-relaxed">
              Join thousands of smart entrepreneurs who swapped disorganized direct messages and messy ledger logs for a polished, automated system.
            </p>
          </motion.div>

          {/* Drifting Avatar Bullets group */}
          <div className="relative py-4">
            
            {/* Visual connector rail behind */}
            <div className="absolute inset-x-0 top-1/2 -translate-y-1/2 h-px bg-linear-to-r from-transparent via-slate-200 to-transparent pointer-events-none" />

            {/* List of categories with floating tiny avatars */}
            <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-4 relative z-10 w-full max-w-6xl justify-items-center">
              {socialProofSellers.map((seller, index) => (
                <motion.div
                  key={index}
                  initial={{ opacity: 0, scale: 0.95 }}
                  whileInView={{ opacity: 1, scale: 1 }}
                  viewport={{ once: true }}
                  transition={{ delay: index * 0.08, type: "spring", stiffness: 100 }}
                  className="flex flex-col items-center gap-3 bg-slate-50/50 hover:bg-white hover:border-[#5B2FD4] hover:shadow-md border border-slate-100 p-4 rounded-2xl w-full max-w-[160px] text-center transition-all relative group cursor-pointer"
                >
                  {/* Floating Absolute Avatar */}
                  <div className="relative w-12 h-12">
                    <div className="absolute inset-0 bg-[#EDE8FB] rounded-full animate-ping opacity-10" />
                    
                    {/* Floating Avatar Image */}
                    <motion.img
                      src={seller.image}
                      alt={seller.name}
                      referrerPolicy="no-referrer"
                      animate={{
                        x: seller.x,
                        y: seller.y,
                      }}
                      transition={{
                        duration: seller.duration,
                        repeat: Infinity,
                        ease: "easeInOut"
                      }}
                      className="w-12 h-12 rounded-full object-cover border-2 border-white ring-2 ring-slate-100 shadow-sm select-none"
                    />

                    {/* Tiny Icon badge representing category */}
                    <motion.span 
                      animate={{
                        x: seller.x.map(val => val * 1.35),
                        y: seller.y.map(val => val * 1.35),
                      }}
                      transition={{
                        duration: seller.duration,
                        repeat: Infinity,
                        ease: "easeInOut"
                      }}
                      className="absolute -bottom-1 -right-1 bg-white text-xs h-5 w-5 rounded-full flex items-center justify-center shadow-xs border border-slate-100/80 font-bold select-none"
                    >
                      {seller.icon}
                    </motion.span>
                  </div>

                  {/* Seller label */}
                  <div className="space-y-0.5">
                    <p className="text-[11px] font-black text-slate-800 tracking-tight leading-snug">{seller.name}</p>
                    <p className="text-[8.5px] font-extrabold text-slate-400 uppercase tracking-widest">SELLFLOW FIT</p>
                  </div>
                </motion.div>
              ))}
            </div>

          </div>

        </div>
      </section>

      {/* PROBLEM SECTION */}
      <section id="problem" className="py-20 lg:py-28 px-4 bg-slate-50 border-t border-slate-150 overflow-hidden">
        <motion.div 
          initial={{ opacity: 0, y: 35 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true, margin: "-100px" }}
          transition={{ duration: 0.6 }}
          className="max-w-4xl mx-auto text-center space-y-4 mb-16"
        >
          <span className="text-rose-600 font-extrabold text-xs uppercase tracking-widest bg-rose-50 border border-rose-100 px-3 py-1 rounded-full">The Headache</span>
          <h2 className="text-2xl sm:text-3xl md:text-4xl font-black text-slate-950 tracking-tight leading-tight">
            Running a Small Business Shouldn't Feel Chaotic
          </h2>
          <p className="text-slate-600 sm:text-base max-w-xl mx-auto leading-relaxed">
            Leading with WhatsApp alone creates a bottleneck where sales go to die. How many of these daily frustrations act as barriers to your growth?
          </p>
        </motion.div>

        <motion.div 
          initial="hidden"
          whileInView="visible"
          viewport={{ once: true, margin: "-150px" }}
          variants={containerVariants}
          className="max-w-6xl mx-auto grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6"
        >
          {frustrations.map((item) => (
            <motion.div 
              key={item.id} 
              variants={itemVariants}
              whileHover={{ y: -6, scale: 1.01 }}
              className="bg-white p-6 rounded-2xl border border-slate-100 hover:shadow-md transition-all flex flex-col justify-between"
            >
              <div className="space-y-4">
                <div className={`p-3 rounded-xl border w-fit ${item.color}`}>
                  <item.icon size={22} className="stroke-[2]" />
                </div>
                <h3 className="text-base font-black text-slate-950 tracking-tight">{item.title}</h3>
                <p className="text-slate-500 text-xs leading-relaxed">{item.description}</p>
              </div>
              <div className="mt-4 pt-4 border-t border-slate-50 flex items-center gap-1.5 text-[10px] font-black uppercase text-rose-500/80">
                <XCircle size={12} />
                <span>Revenue Killer</span>
              </div>
            </motion.div>
          ))}
        </motion.div>
      </section>

      {/* TRANSFORMATION SECTION (Before vs After) */}
      <section id="before-after" className="py-20 lg:py-28 bg-white px-4 border-t border-slate-100 overflow-hidden">
        <motion.div 
          initial={{ opacity: 0, y: 35 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true, margin: "-100px" }}
          transition={{ duration: 0.6 }}
          className="max-w-4xl mx-auto text-center space-y-4 mb-16"
        >
          <span className="text-sky-600 font-extrabold text-xs uppercase tracking-widest bg-sky-50 border border-sky-100 px-3 py-1 rounded-full">The Shift</span>
          <h2 className="text-2xl sm:text-4xl font-black text-slate-950 tracking-tight leading-tight">
            The Transformation: From Chaos to Order
          </h2>
          <p className="text-slate-600 sm:text-base max-w-xl mx-auto leading-relaxed">
            See how your entire work dynamic transforms the second you transition your business from manual chats to structured automation.
          </p>
        </motion.div>

        <div className="max-w-4xl mx-auto grid grid-cols-1 md:grid-cols-2 gap-8 relative">
          
          {/* Connector Badge */}
          <motion.div 
            initial={{ opacity: 0, scale: 0 }}
            whileInView={{ opacity: 1, scale: 1 }}
            viewport={{ once: true, margin: "-100px" }}
            transition={{ type: "spring", stiffness: 180, damping: 15, delay: 0.3 }}
            className="hidden md:flex absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-10 h-10 rounded-full bg-slate-950 text-white font-black text-xs items-center justify-center border-4 border-slate-50 shadow-md z-15"
          >
            VS
          </motion.div>

          {/* Before MySellFlow */}
          <motion.div 
            initial={{ opacity: 0, x: -50 }}
            whileInView={{ opacity: 1, x: 0 }}
            viewport={{ once: true, margin: "-100px" }}
            transition={{ type: "spring", stiffness: 80, damping: 15 }}
            className="bg-rose-50/50 border border-rose-100 rounded-3xl p-6 sm:p-8 space-y-6"
          >
            <div className="flex items-center gap-3">
              <div className="w-8 h-8 rounded-full bg-rose-500 text-white font-black text-xs flex items-center justify-center">
                ✗
              </div>
              <div>
                <h3 className="font-extrabold text-lg text-rose-950 tracking-tight leading-tight">Before MySellFlow</h3>
                <p className="text-[10px] text-rose-500 uppercase font-black tracking-wider mt-0.5">The DM Struggle</p>
              </div>
            </div>

            <ul className="space-y-4 text-xs font-semibold text-rose-900/80">
              <li className="flex items-start gap-2 bg-white/50 p-3 rounded-xl border border-rose-100/50">
                <span className="text-rose-500 mt-0.5">•</span>
                <span><strong>Orders Scattered:</strong> Customer addresses and receipts are in 40 different chats, forcing you to scroll endlessly.</span>
              </li>
              <li className="flex items-start gap-2 bg-white/50 p-3 rounded-xl border border-rose-100/50">
                <span className="text-rose-500 mt-0.5">•</span>
                <span><strong>Inventory Confusion:</strong> Stock checks require checking physically. You constantly oversell and issue refunded products.</span>
              </li>
              <li className="flex items-start gap-2 bg-white/50 p-3 rounded-xl border border-rose-100/50">
                <span className="text-rose-500 mt-0.5">•</span>
                <span><strong>Missed Sales:</strong> Customers get tired of waiting for your manually typed pricing responses and leave.</span>
              </li>
              <li className="flex items-start gap-2 bg-white/50 p-3 rounded-xl border border-rose-100/50">
                <span className="text-rose-500 mt-0.5">•</span>
                <span><strong>Unorganized Records:</strong> Ledger books, paper sticky notes, and cash totals get wet, missing, or miscalculated.</span>
              </li>
              <li className="flex items-start gap-2 bg-white/50 p-3 rounded-xl border border-rose-100/50">
                <span className="text-rose-500 mt-0.5">•</span>
                <span><strong>Constant Stress:</strong> You spend 14 hours a day on your phone typing and tracking. You feel trapped by your own hustle.</span>
              </li>
            </ul>
          </motion.div>

          {/* After MySellFlow */}
          <motion.div 
            initial={{ opacity: 0, x: 50 }}
            whileInView={{ opacity: 1, x: 0 }}
            viewport={{ once: true, margin: "-100px" }}
            transition={{ type: "spring", stiffness: 80, damping: 15 }}
            className="bg-emerald-50/50 border border-emerald-100 rounded-3xl p-6 sm:p-8 space-y-6"
          >
            <div className="flex items-center gap-3">
              <div className="w-8 h-8 rounded-full bg-emerald-500 text-white font-black text-xs flex items-center justify-center">
                ✓
              </div>
              <div>
                <h3 className="font-extrabold text-lg text-emerald-950 tracking-tight leading-tight">After MySellFlow</h3>
                <p className="text-[10px] text-emerald-500 uppercase font-black tracking-wider mt-0.5">The Autopilot Business</p>
              </div>
            </div>

            <ul className="space-y-4 text-xs font-semibold text-emerald-900/80">
              <li className="flex items-start gap-2 bg-white/50 p-3 rounded-xl border border-emerald-100/50">
                <span className="text-emerald-500 mt-0.5">•</span>
                <span><strong>Organized Business:</strong> All sales, receipt reviews, and addresses are indexed in a centralized table that is searchable in seconds.</span>
              </li>
              <li className="flex items-start gap-2 bg-white/50 p-3 rounded-xl border border-emerald-100/50">
                <span className="text-emerald-500 mt-0.5">•</span>
                <span><strong>Real-time Stock:</strong> System tracks limits automatically. If stock reaches zero, storefront blocks checkout with transparent details.</span>
              </li>
              <li className="flex items-start gap-2 bg-white/50 p-3 rounded-xl border border-emerald-100/50">
                <span className="text-emerald-500 mt-0.5">•</span>
                <span><strong>Instant Professionalism:</strong> Customers checkout using a self-serve beautiful layout, creating 4x more confidence in your brand.</span>
              </li>
              <li className="flex items-start gap-2 bg-white/50 p-3 rounded-xl border border-emerald-100/50">
                <span className="text-emerald-500 mt-0.5">•</span>
                <span><strong>Automatic Database:</strong> Every transaction captures customer numbers and tags order volumes automatically.</span>
              </li>
              <li className="flex items-start gap-2 bg-white/50 p-3 rounded-xl border border-emerald-100/50">
                <span className="text-emerald-500 mt-0.5">•</span>
                <span><strong>More Growing Time:</strong> Focus on making, sourcing, and marketing products instead of manually replying "Available" inside chats.</span>
              </li>
            </ul>
          </motion.div>

        </div>
      </section>

      {/* SOLUTION SECTION */}
      <section id="features" className="py-20 lg:py-28 px-4 bg-slate-50 border-t border-slate-100 overflow-hidden">
        <motion.div 
          initial={{ opacity: 0, y: 35 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true, margin: "-100px" }}
          transition={{ duration: 0.6 }}
          className="max-w-4xl mx-auto text-center space-y-4 mb-16"
        >
          <span className="text-[#5B2FD4] font-extrabold text-xs uppercase tracking-widest bg-[#EDE8FB] border border-[#5B2FD4]/10 px-3 py-1 rounded-full">Our Core Arsenal</span>
          <h2 className="text-2xl sm:text-4xl font-black text-slate-950 tracking-tight leading-tight">
            Everything You Need To Manage Your Business
          </h2>
          <p className="text-slate-600 sm:text-base max-w-xl mx-auto leading-relaxed">
            Say goodbye to disorganized notepad lists and late-night message hunting. MySellFlow gives you full-fledged digital capabilities styled cleanly for smartphones.
          </p>
        </motion.div>

        <motion.div 
          initial="hidden"
          whileInView="visible"
          viewport={{ once: true, margin: "-150px" }}
          variants={containerVariants}
          className="max-w-6xl mx-auto grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8"
        >
          {features.map((feat, i) => (
            <motion.div 
              key={i} 
              variants={itemVariants}
              whileHover={{ y: -6, scale: 1.01 }}
              className="bg-white p-8 rounded-2xl border border-slate-100 hover:border-[#EDE8FB] hover:shadow-lg transition-all relative flex flex-col justify-between group"
            >
              <div className="space-y-4">
                <span className="absolute top-4 right-4 bg-slate-100 text-slate-800 text-[8px] font-black tracking-widest px-2 py-0.5 rounded-full uppercase group-hover:bg-[#5B2FD4] group-hover:text-white transition-colors">
                  {feat.badge}
                </span>

                <div className="p-3 bg-[#EDE8FB] text-[#5B2FD4] border border-[#5B2FD4]/10 rounded-xl w-fit group-hover:scale-110 transition-transform">
                  <feat.icon size={22} className="stroke-[2.5]" />
                </div>
                
                <h3 className="font-sans font-bold text-base text-slate-950 tracking-tight pt-1">
                  {feat.title}
                </h3>
                
                <p className="text-xs text-slate-500 leading-relaxed">
                  {feat.description}
                </p>
              </div>

              <div className="mt-6 pt-4 border-t border-slate-50 flex items-center gap-1.5 text-[9px] font-black text-[#5B2FD4] tracking-wider">
                <span>INCLUDED FREE</span>
                <ChevronRight size={10} />
              </div>
            </motion.div>
          ))}
        </motion.div>
      </section>

      {/* HOW IT WORKS SECTION */}
      <section id="how-it-works" className="py-20 lg:py-28 bg-white px-4 border-t border-slate-100 overflow-hidden">
        <motion.div 
          initial={{ opacity: 0, y: 35 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true, margin: "-100px" }}
          transition={{ duration: 0.6 }}
          className="max-w-4xl mx-auto text-center space-y-4 mb-20"
        >
          <span className="text-[#5B2FD4] font-extrabold text-xs uppercase tracking-widest bg-[#EDE8FB] border border-[#5B2FD4]/10 px-3 py-1 rounded-full">Quick Integration</span>
          <h2 className="text-2xl sm:text-4xl font-black text-slate-950 tracking-tight leading-tight">
            Set Up Your Storefront in 4 Steps
          </h2>
          <p className="text-slate-600 sm:text-base max-w-xl mx-auto leading-relaxed">
            No developers, no complicated templates, no hosting setups. Setup takes less than two minutes total.
          </p>
        </motion.div>

        <motion.div 
          initial="hidden"
          whileInView="visible"
          viewport={{ once: true, margin: "-150px" }}
          variants={containerVariants}
          className="max-w-5xl mx-auto grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-8 relative"
        >
          
          {/* Step 1 */}
          <motion.div 
            variants={itemVariants}
            whileHover={{ y: -4 }}
            className="text-center space-y-4 relative"
          >
            <div className="w-14 h-14 bg-[#EDE8FB] text-[#5B2FD4] rounded-2xl mx-auto flex items-center justify-center font-sans font-black text-xl border border-[#5B2FD4]/10 transition-colors shadow-sm">
              01
            </div>
            <h3 className="text-sm font-black text-slate-905 uppercase tracking-tight">Create your account</h3>
            <p className="text-slate-500 text-xs leading-relaxed max-w-xs mx-auto">
              Supply your business name and email address. Choose your store slug (e.g. <code>/zara</code>) instantly.
            </p>
          </motion.div>

          {/* Step 2 */}
          <motion.div 
            variants={itemVariants}
            whileHover={{ y: -4 }}
            className="text-center space-y-4 relative"
          >
            <div className="w-14 h-14 bg-[#EDE8FB] text-[#5B2FD4] rounded-2xl mx-auto flex items-center justify-center font-sans font-black text-xl border border-[#5B2FD4]/10 transition-colors shadow-sm">
              02
            </div>
            <h3 className="text-sm font-black text-slate-905 uppercase tracking-tight">Add your products</h3>
            <p className="text-slate-500 text-xs leading-relaxed max-w-xs mx-auto">
              Input catalog photos, sizes, red/white/blue counts, and rates. Instantly generates gorgeous displays.
            </p>
          </motion.div>

          {/* Step 3 */}
          <motion.div 
            variants={itemVariants}
            whileHover={{ y: -4 }}
            className="text-center space-y-4 relative"
          >
            <div className="w-14 h-14 bg-[#EDE8FB] text-[#5B2FD4] rounded-2xl mx-auto flex items-center justify-center font-sans font-black text-xl border border-[#5B2FD4]/10 transition-colors shadow-sm">
              03
            </div>
            <h3 className="text-sm font-black text-slate-905 uppercase tracking-tight">Share your store link</h3>
            <p className="text-slate-500 text-xs leading-relaxed max-w-xs mx-auto">
              Drop the storefront link in your Instagram bio, TikTok description, or send it directly as a quick reply.
            </p>
          </motion.div>

          {/* Step 4 */}
          <motion.div 
            variants={itemVariants}
            whileHover={{ y: -4 }}
            className="text-center space-y-4 relative"
          >
            <div className="w-14 h-14 bg-emerald-100 text-emerald-950 rounded-2xl mx-auto flex items-center justify-center font-sans font-black text-xl border-2 border-emerald-300 shadow-sm">
              04
            </div>
            <h3 className="text-sm font-black text-slate-900 uppercase tracking-tight text-emerald-700">Receive & manage</h3>
            <p className="text-slate-500 text-xs leading-relaxed max-w-xs mx-auto">
              Watch incoming client checkouts arrive cleanly organized. Shift statuses to complete with a single tap.
            </p>
          </motion.div>

        </motion.div>

        <div className="mt-16 text-center">
          <motion.button 
            whileHover={{ scale: 1.03 }}
            whileTap={{ scale: 0.97 }}
            onClick={onGetStarted}
            className="inline-flex bg-[#5B2FD4] hover:bg-[#4c24b8] text-white font-black px-6 py-3.5 rounded-xl text-sm justify-center items-center gap-2 shadow-md hover:shadow-[#5B2FD4]/20 transition-all active:scale-95 cursor-pointer"
          >
            <span>Start Building Now</span>
            <ArrowRight size={16} className="text-[#EDE8FB]" />
          </motion.button>
        </div>
      </section>

      {/* WHY VENDORS LOVE MYSELLFLOW (Benefits block) */}
      <section className="py-20 lg:py-28 bg-slate-50 px-4 border-t border-slate-150 overflow-hidden">
        <div className="max-w-6xl mx-auto grid grid-cols-1 lg:grid-cols-12 gap-12 items-center">
          
          {/* Left Block */}
          <motion.div 
            initial={{ opacity: 0, x: -40 }}
            whileInView={{ opacity: 1, x: 0 }}
            viewport={{ once: true, margin: "-100px" }}
            transition={{ type: "spring", stiffness: 100, damping: 15 }}
            className="lg:col-span-5 space-y-6"
          >
            <span className="text-emerald-600 font-extrabold text-xs uppercase tracking-widest bg-emerald-50 border border-emerald-100 px-3 py-1 rounded-full">High-Utility Benefits</span>
            <h2 className="text-2xl sm:text-3xl font-black text-slate-950 tracking-tight leading-tight">
              Why Online Vendors Choose MySellFlow
            </h2>
            <p className="text-slate-600 text-sm leading-relaxed">
              We look beyond basic database fields to construct tools that resolve genuine operational friction in real-time. Feel the peace of running an organized vendor project.
            </p>

            <div className="space-y-4 pt-2">
              <div className="flex gap-3">
                <div className="bg-white p-1 rounded-full border shadow-sm text-emerald-500 flex items-center justify-center h-6 w-6 shrink-0 mt-0.5">
                  <Check size={14} className="stroke-[3]" />
                </div>
                <div>
                  <h4 className="font-bold text-sm text-slate-900 tracking-tight">Save Hours Every Day</h4>
                  <p className="text-slate-500 text-xs mt-0.5 leading-relaxed">No more manual invoicing. Customers checkout by themselves, capturing full coordinate details instantly.</p>
                </div>
              </div>

              <div className="flex gap-3">
                <div className="bg-white p-1 rounded-full border shadow-sm text-emerald-500 flex items-center justify-center h-6 w-6 shrink-0 mt-0.5">
                  <Check size={14} className="stroke-[3]" />
                </div>
                <div>
                  <h4 className="font-bold text-sm text-slate-900 tracking-tight">Reduce Packing Mistakes</h4>
                  <p className="text-slate-500 text-xs mt-0.5 leading-relaxed">Clean shipping tables detail sizes and item attributes, preventing expensive address packing mixups.</p>
                </div>
              </div>

              <div className="flex gap-3">
                <div className="bg-white p-1 rounded-full border shadow-sm text-emerald-500 flex items-center justify-center h-6 w-6 shrink-0 mt-0.5">
                  <Check size={14} className="stroke-[3]" />
                </div>
                <div>
                  <h4 className="font-bold text-sm text-slate-900 tracking-tight">Establish Top Authority</h4>
                  <p className="text-slate-500 text-xs mt-0.5 leading-relaxed">A professional checkout link gives buyers instant security, elevating conversion rates by up to 40%.</p>
                </div>
              </div>
            </div>
          </motion.div>

          {/* Right Bento Grid representation */}
          <motion.div 
            initial={{ opacity: 0, x: 40, scale: 0.96 }}
            whileInView={{ opacity: 1, x: 0, scale: 1 }}
            viewport={{ once: true, margin: "-100px" }}
            transition={{ type: "spring", stiffness: 100, damping: 15 }}
            className="lg:col-span-7 bg-white p-6 sm:p-8 rounded-3xl border border-slate-100 shadow-sm relative overflow-hidden"
          >
            <div className="absolute top-0 right-0 w-32 h-32 bg-[#EDE8FB] rounded-full blur-[80px] opacity-40" />
            
            <div className="space-y-4">
              <div className="flex items-center gap-2 pb-2 border-b border-slate-100">
                <ShieldCheck className="text-emerald-500" size={18} />
                <span className="font-black text-xs uppercase tracking-widest text-slate-400">Guaranteed Growth metrics</span>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <motion.div whileHover={{ y: -3, scale: 1.02 }} className="p-4 bg-slate-50 rounded-2xl border border-slate-100 text-center">
                  <p className="text-2xl sm:text-3xl font-black text-slate-900">100%</p>
                  <p className="text-[10px] text-slate-400 font-extrabold uppercase mt-1 tracking-wider">No Orders Lost</p>
                </motion.div>

                <motion.div whileHover={{ y: -3, scale: 1.02 }} className="p-4 bg-slate-50 rounded-2xl border border-slate-100 text-center">
                  <p className="text-2xl sm:text-3xl font-black text-slate-900">95%</p>
                  <p className="text-[10px] text-slate-400 font-extrabold uppercase mt-1 tracking-wider">Saves Admin Time</p>
                </motion.div>

                <motion.div whileHover={{ y: -3, scale: 1.01 }} className="p-4 bg-slate-50 rounded-2xl border border-slate-100 text-center col-span-2">
                  <p className="text-2xl sm:text-3xl font-black text-slate-900">4.9 ★</p>
                  <p className="text-[10px] text-slate-400 font-extrabold uppercase mt-1 tracking-wider">Customer Experience Score</p>
                </motion.div>
              </div>

              <div className="bg-[#5B2FD4] p-4 rounded-2xl text-[#EDE8FB] text-[11px] font-mono leading-relaxed mt-2 flex items-start gap-2 border border-[#5B2FD4]/10">
                <span className="text-[#22C55E]">⚡</span>
                <span>Our automated storefront eliminates DM delays, helping shoppers complete transactions before losing enthusiasm.</span>
              </div>
            </div>
          </motion.div>

        </div>
      </section>

      {/* SOCIAL PROOF SECTION */}
      <section id="testimonials" className="py-20 lg:py-28 bg-white px-4 border-t border-slate-100 overflow-hidden">
        <motion.div 
          initial={{ opacity: 0, y: 35 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true, margin: "-100px" }}
          transition={{ duration: 0.6 }}
          className="max-w-4xl mx-auto text-center space-y-4 mb-16"
        >
          <span className="text-[#5B2FD4] font-extrabold text-xs uppercase tracking-widest bg-[#EDE8FB] border border-[#5B2FD4]/10 px-3 py-1 rounded-full">Success Stories</span>
          <h2 className="text-2xl sm:text-4xl font-black text-slate-950 tracking-tight leading-tight">
            Voted the Best Tool for Online Vendors
          </h2>
          <p className="text-slate-600 sm:text-base max-w-xl mx-auto leading-relaxed">
            Discover how small business owners are scaling operations and tracking payouts successfully with zero hassle.
          </p>
          <div className="pt-2 flex justify-center">
            <button 
              onClick={() => {
                setReviewPopupOpen(true);
                setInvitedToReview(false);
              }}
              className="inline-flex items-center gap-1.5 bg-[#EDE8FB] hover:bg-[#e4ddf9] text-[#5B2FD4] text-xs font-extrabold px-4 md:px-5 py-2.5 rounded-full border border-[#5B2FD4]/15 transition-all active:scale-95 cursor-pointer shadow-xs hover:shadow-[#5B2FD4]/5"
              id="platform-review-btn"
            >
              <Star size={13} className="fill-[#5B2FD4]" />
              <span>Leave a Platform Review</span>
            </button>
          </div>
        </motion.div>

        {/* Real Stats */}
        <motion.div 
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true, margin: "-100px" }}
          transition={{ duration: 0.6, delay: 0.1 }}
          className="max-w-5xl mx-auto grid grid-cols-3 gap-4 mb-16 text-center border-y border-slate-100 py-8 leading-none"
        >
          <div>
            <p className="text-xl sm:text-3xl font-black text-slate-950">2,500+</p>
            <p className="text-[9px] sm:text-[10px] font-black uppercase text-slate-400 tracking-wider mt-2">Active Stores</p>
          </div>
          <div className="border-x border-slate-100 text-center">
            <p className="text-xl sm:text-3xl font-black text-slate-950">85,000+</p>
            <p className="text-[9px] sm:text-[10px] font-black uppercase text-slate-400 tracking-wider mt-2">Orders Placed</p>
          </div>
          <div>
            <p className="text-xl sm:text-3xl font-black text-slate-950">₦10M+</p>
            <p className="text-[9px] sm:text-[10px] font-black uppercase text-slate-400 tracking-wider mt-2">Processed Sales</p>
          </div>
        </motion.div>

        <motion.div 
          initial="hidden"
          whileInView="visible"
          viewport={{ once: true, margin: "-150px" }}
          variants={containerVariants}
          className="max-w-6xl mx-auto grid grid-cols-1 md:grid-cols-3 gap-6"
        >
          {localTestimonials.map((test, index) => (
            <motion.div 
              key={index} 
              variants={itemVariants}
              whileHover={{ y: -6, scale: 1.01 }}
              className="bg-slate-50 p-6 sm:p-8 rounded-2xl border border-slate-100/60 shadow-xs flex flex-col justify-between"
            >
              <div className="space-y-4">
                <div className="flex gap-1 text-amber-400">
                  {[...Array(5)].map((_, i) => <Star key={i} size={15} fill="currentColor" />)}
                </div>
                
                <p className="text-slate-600 text-xs leading-relaxed italic">
                  "{test.content}"
                </p>
              </div>

              <div className="mt-6 pt-4 border-t border-slate-150 flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <div className="w-8 h-8 rounded-full bg-[#5B2FD4] text-white font-black text-xs flex items-center justify-center font-mono">
                    {test.avatar}
                  </div>
                  <div>
                    <h4 className="text-xs font-black text-slate-900 leading-none">{test.name}</h4>
                    <p className="text-[10px] text-slate-400 font-medium uppercase mt-1 tracking-tight">{test.role}</p>
                  </div>
                </div>

                <span className="bg-[#EDE8FB] text-[#5B2FD4] border border-[#5B2FD4]/10 font-sans font-black text-[9px] uppercase tracking-wider px-2 py-1 rounded">
                  {test.stat}
                </span>
              </div>
            </motion.div>
          ))}
        </motion.div>
      </section>

      {/* FAQ SECTION */}
      <section id="faqs" className="py-20 lg:py-28 px-4 bg-slate-50 border-t border-slate-100 overflow-hidden">
        <motion.div 
          initial={{ opacity: 0, y: 35 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true, margin: "-100px" }}
          transition={{ duration: 0.6 }}
          className="max-w-4xl mx-auto text-center space-y-4 mb-16"
        >
          <span className="text-[#5B2FD4] font-extrabold text-xs uppercase tracking-widest bg-[#EDE8FB] border border-[#5B2FD4]/10 px-3 py-1 rounded-full">Curiosity Central</span>
          <h2 className="text-2xl sm:text-4xl font-black text-slate-950 tracking-tight leading-tight">
            Frequently Asked Questions
          </h2>
          <p className="text-slate-600 sm:text-base max-w-xl mx-auto leading-relaxed">
            All the quick answers regarding your setup, pricing bounds, and capabilities.
          </p>
        </motion.div>

        <motion.div 
          initial="hidden"
          whileInView="visible"
          viewport={{ once: true, margin: "-150px" }}
          variants={containerVariants}
          className="max-w-3xl mx-auto space-y-4"
        >
          {faqs.map((faq, idx) => {
            const isOpen = activeFaq === idx;
            return (
              <motion.div 
                key={idx} 
                variants={itemVariants}
                className="bg-white rounded-2xl border border-slate-100 overflow-hidden shadow-xs transition-shadow"
              >
                <button 
                  onClick={() => toggleFaq(idx)}
                  className="w-full p-5 text-left flex items-center justify-between gap-4 select-none hover:bg-slate-50/50"
                >
                  <span className="font-sans font-bold text-sm text-slate-900 tracking-tight">{faq.q}</span>
                  <div className="bg-slate-100 p-1 rounded-lg text-slate-650 flex items-center justify-center shrink-0">
                    {isOpen ? <X size={14} className="stroke-[2.5]" /> : <Plus size={14} className="stroke-[2.5]" />}
                  </div>
                </button>

                <AnimatePresence>
                  {isOpen && (
                    <motion.div 
                      initial={{ height: 0 }}
                      animate={{ height: 'auto' }}
                      exit={{ height: 0 }}
                      className="overflow-hidden"
                    >
                      <div className="p-5 pt-0 border-t border-slate-50 text-xs text-slate-500 leading-relaxed space-y-2">
                        <p>{faq.a}</p>
                      </div>
                    </motion.div>
                  )}
                </AnimatePresence>
              </motion.div>
            );
          })}
        </motion.div>
      </section>

      {/* FINAL CTA SECTION */}
      <section className="py-20 lg:py-28 bg-[radial-gradient(#5b2fd4_1px,transparent_1px)] bg-[#030712] [background-size:24px_24px] text-white px-4 relative overflow-hidden text-center">
        
        {/* Glow dots */}
        <div className="absolute top-[-20%] left-[-20%] w-[50%] h-[50%] bg-[#5B2FD4]/20 rounded-full blur-[150px] pointer-events-none" />
        <div className="absolute bottom-[-20%] right-[-20%] w-[50%] h-[50%] bg-[#5B2FD4]/10 rounded-full blur-[150px] pointer-events-none" />

        <motion.div 
          initial={{ opacity: 0, scale: 0.96, y: 30 }}
          whileInView={{ opacity: 1, scale: 1, y: 0 }}
          viewport={{ once: true, margin: "-100px" }}
          transition={{ type: "spring", stiffness: 80, damping: 15 }}
          className="max-w-3xl mx-auto space-y-8 z-10 relative"
        >
          
          <div className="inline-flex items-center gap-1.5 bg-[#5B2FD4]/10 border border-[#5B2FD4]/20 rounded-full px-3 py-1.5 text-[9px] uppercase font-black text-white shadow-inner">
            <span className="w-1.5 h-1.5 bg-[#22C55E] rounded-full animate-pulse" />
            <span>Escape the WhatsApp DM Trap</span>
          </div>

          <h2 className="text-3xl sm:text-5xl font-black uppercase italic tracking-tighter text-white">
            Take Control of Your Business Today
          </h2>

          <p className="text-slate-400 sm:text-base max-w-xl mx-auto leading-relaxed font-medium">
            Join early successful users and start running your online store with less inbox-scrolling stress and substantially more growth confidence.
          </p>

          <div className="flex flex-col sm:flex-row items-center justify-center gap-4 max-w-md mx-auto">
            <motion.button 
              whileHover={{ scale: 1.03 }}
              whileTap={{ scale: 0.97 }}
              onClick={onGetStarted}
              className="w-full sm:w-auto bg-[#5B2FD4] hover:bg-[#4c24b8] text-white font-black px-8 py-4 rounded-xl shadow-lg shadow-[#5B2FD4]/20 transition-all active:scale-95 text-sm tracking-wide flex items-center justify-center gap-2 cursor-pointer animate-pulse"
            >
              <span>Get Started Free</span>
              <ArrowRight size={16} />
            </motion.button>
            <motion.button 
              whileHover={{ scale: 1.03 }}
              whileTap={{ scale: 0.97 }}
              onClick={() => scrollToSection('faqs')}
              className="w-full sm:w-auto bg-slate-900 border border-white/10 hover:bg-slate-800 text-slate-200 font-bold px-6 py-4 rounded-xl transition-all text-sm cursor-pointer"
            >
              Have Questions?
            </motion.button>
          </div>

          <div className="pt-6 text-[10px] text-slate-500 uppercase tracking-widest font-black leading-none">
            No Setup Fees • No Coding • 100% Smartphone Optimised
          </div>
        </motion.div>
      </section>
        </>
      )}

      {currentPage === 'about' && <AboutView />}
      {currentPage === 'features' && <FeaturesView />}
      {currentPage === 'pricing' && <PricingView />}
      {currentPage === 'contact' && <ContactView />}

      {/* FOOTER */}
      <footer className="bg-slate-950 border-t border-slate-900/60 py-12 px-4 text-slate-400">
        <div className="max-w-7xl mx-auto grid grid-cols-1 md:grid-cols-12 gap-8 items-start">
          
          <div className="md:col-span-4 space-y-3">
            <div className="flex items-center gap-2 cursor-pointer" onClick={() => setCurrentPage('home')}>
              <div className="w-8 h-8 bg-white rounded-lg flex items-center justify-center text-slate-950 shadow-md">
                <TrendingUp size={16} className="text-[#5B2FD4]" />
              </div>
              <span className="font-sans font-black text-base text-white tracking-tight italic uppercase">
                mysell<span className="text-[#5B2FD4]">flow</span>
              </span>
            </div>
            <p className="text-slate-500 text-xs leading-relaxed max-w-xs">
              The lightweight SaaS operating system for online vendors to track and automate their catalogs, stock count lists, and incoming customer checkouts.
            </p>
          </div>

          {/* Links 1 */}
          <div className="md:col-span-2 space-y-3">
            <h4 className="text-xs font-black uppercase text-white tracking-widest">Navigation</h4>
            <div className="flex flex-col gap-2 text-xs">
              <button onClick={() => setCurrentPage('home')} className="text-left hover:text-white transition-colors cursor-pointer">Home</button>
              <button onClick={() => setCurrentPage('about')} className="text-left hover:text-white transition-colors cursor-pointer">About</button>
              <button onClick={() => setCurrentPage('features')} className="text-left hover:text-white transition-colors cursor-pointer">Features</button>
            </div>
          </div>

          {/* Links 2 */}
          <div className="md:col-span-2 space-y-3">
            <h4 className="text-xs font-black uppercase text-white tracking-widest">Resources</h4>
            <div className="flex flex-col gap-2 text-xs">
              <button onClick={() => setCurrentPage('pricing')} className="text-left hover:text-white transition-colors cursor-pointer">Pricing</button>
              <button onClick={() => setCurrentPage('contact')} className="text-left hover:text-white transition-colors cursor-pointer">Contact Us</button>
              <button onClick={() => scrollToSection('faqs')} className="text-left hover:text-white transition-colors cursor-pointer">Platform FAQs Tracker</button>
            </div>
          </div>

          {/* Links 3 */}
          <div className="md:col-span-4 space-y-3">
            <h4 className="text-xs font-black uppercase text-white tracking-widest">Legal Agreement</h4>
            <div className="flex flex-col gap-2 text-xs">
              <button onClick={() => setLegalModal('privacy')} className="text-left hover:text-white transition-colors cursor-pointer">Privacy Policy</button>
              <button onClick={() => setLegalModal('terms')} className="text-left hover:text-white transition-colors cursor-pointer">Terms of Service</button>
              <div className="pt-2 text-[10px] text-slate-500">
                &copy; {new Date().getFullYear()} MySellFlow. All rights reserved. Developed to ensure business professionalism.
              </div>
            </div>
          </div>

        </div>
      </footer>

      {/* LEGAL POLICY MODAL */}
      <AnimatePresence>
        {legalModal && (
          <motion.div 
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 bg-slate-950/80 backdrop-blur-sm z-50 flex items-center justify-center p-4"
            onClick={() => setLegalModal(null)}
          >
            <motion.div 
              initial={{ scale: 0.95, y: 20 }}
              animate={{ scale: 1, y: 0 }}
              exit={{ scale: 0.95, y: 20 }}
              transition={{ type: "spring", duration: 0.5 }}
              className="bg-white rounded-3xl w-full max-w-2xl text-slate-800 shadow-2xl overflow-hidden border border-slate-100 flex flex-col max-h-[85vh]"
              onClick={(e) => e.stopPropagation()}
            >
              {/* Header */}
              <div className="p-6 border-b border-slate-100 flex items-center justify-between bg-slate-50/50">
                <div className="flex items-center gap-2">
                  <div className="w-8 h-8 rounded-lg bg-[#5B2FD4] flex items-center justify-center text-white">
                    <TrendingUp size={16} className="text-[#EDE8FB]" />
                  </div>
                  <span className="font-extrabold text-sm uppercase tracking-wide">
                    {legalModal === 'privacy' ? 'Privacy Policy' : 'Terms of Service'}
                  </span>
                </div>
                <button 
                  onClick={() => setLegalModal(null)}
                  className="p-1.5 rounded-lg text-slate-400 hover:text-slate-650 hover:bg-slate-100 transition-colors"
                >
                  <X size={18} />
                </button>
              </div>

              {/* Scrollable Content */}
              <div className="p-6 md:p-8 space-y-4 overflow-y-auto text-xs md:text-sm text-slate-600 leading-relaxed max-h-[60vh] scrollbar-thin">
                {legalModal === 'privacy' ? (
                  <>
                    <h3 className="text-sm font-black text-slate-900 tracking-tight">1. Data We Collect Securely</h3>
                    <p>We only collect the fundamental email, business name, and catalog images necessary to render your store. When your customers place order inflows, we save their phone, address, and name inside standard Firebase storage. This ensures absolute safety.</p>
                    
                    <h3 className="text-sm font-black text-slate-900 tracking-tight mt-4">2. Zero Selling of Personal Data</h3>
                    <p>We do not lease, rent, or trade your custom lead tracking sheets, customer rosters, or revenue tallies to outside marketing trackers. Your metrics are encrypted and are exclusively accessible inside your secured credentials workspace.</p>

                    <h3 className="text-sm font-black text-slate-905 tracking-tight mt-4">3. High Integrity Security Rules</h3>
                    <p>Your shop parameters are managed securely. Our server endpoints route sensitive transactions, including WhatsApp dispatch messages and system logs, to ensure they remain opaque to browser inspect consoles.</p>
                    
                    <h3 className="text-sm font-black text-slate-900 tracking-tight mt-4">4. Cookies & Persistent Sessions</h3>
                    <p>We use standard local storage configurations to keep your business workspace active so you don't have to face constant re-authentications during rapid phone checkouts.</p>

                    <p className="text-[11px] text-slate-400 font-medium mt-6 pt-4 border-t border-slate-100">Last updated: {new Date().toLocaleDateString()}</p>
                  </>
                ) : (
                  <>
                    <h3 className="text-sm font-black text-slate-900 tracking-tight">1. Service Definition</h3>
                    <p>MySellFlow provides an operating workspace that translates plain products listings into high-converting checkout forms. Transactions, cash settlement, and final buyer fulfillment are handled entirely directly between you and your customers.</p>
                    
                    <h3 className="text-sm font-black text-slate-900 tracking-tight mt-4">2. Direct Customer Settlements</h3>
                    <p>We do not hold vendor cash, execute escrow custody, or charge standard gateway margins. Shoppers supply payment proofs (receipt images or confirmations) which you manually verify and shift to dispatched statuses.</p>

                    <h3 className="text-sm font-black text-slate-900 tracking-tight mt-4">3. System Capacity Boundaries</h3>
                    <p>By creating a standard account, you accept our limits on catalog counts and system integrations. Abusive automation, scraping, or listings that violate local merchant policies will result in immediate storefront suspension.</p>
                    
                    <h3 className="text-sm font-black text-slate-900 tracking-tight mt-4">4. No Warranty Offer</h3>
                    <p>We supply our platform "as is" and do not warrant uninterrupted uptime. While we build robust auto-saving database queries, you should retain backup logs of critical client rosters.</p>

                    <p className="text-[11px] text-slate-400 font-medium mt-6 pt-4 border-t border-slate-100">Last updated: {new Date().toLocaleDateString()}</p>
                  </>
                )}
              </div>

              {/* Action footer */}
              <div className="p-4 border-t border-slate-100 bg-slate-50 flex justify-end">
                <button 
                  onClick={() => setLegalModal(null)}
                  className="bg-slate-950 hover:bg-slate-900 text-white font-extrabold text-xs px-5 py-2.5 rounded-xl transition-colors active:scale-95 shadow-sm"
                >
                  I Understand
                </button>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* CORNER FEEDBACK INVITATION POPUP (Nicest way possible) */}
      <AnimatePresence>
        {invitedToReview && !reviewPopupOpen && (
          <motion.div
            initial={{ opacity: 0, y: 50, x: 20, scale: 0.95 }}
            animate={{ opacity: 1, y: 0, x: 0, scale: 1 }}
            exit={{ opacity: 0, scale: 0.9, y: 30, transition: { duration: 0.2 } }}
            className="fixed bottom-6 right-6 z-40 max-w-sm w-[calc(100vw-32px)] bg-slate-900 border border-slate-800 text-white rounded-2xl shadow-2xl p-5 overflow-hidden flex flex-col gap-3"
          >
            {/* Corner floating heart warmth spot */}
            <div className="absolute top-0 right-0 w-20 h-20 bg-[#5B2FD4]/10 rounded-full blur-[20px] pointer-events-none" />

            <div className="flex justify-between items-start">
              <div className="flex gap-1 text-amber-400">
                {[...Array(5)].map((_, i) => (
                  <Star key={i} size={13} className="fill-amber-400 text-amber-400" />
                ))}
              </div>
              <button
                onClick={() => {
                  setInvitedToReview(false);
                  localStorage.setItem('mysellflow_platform_dismissed', 'true');
                }}
                className="text-slate-400 hover:text-white p-1 rounded-lg hover:bg-white/5 transition-colors cursor-pointer"
                id="review-dismiss-btn"
              >
                <X size={14} />
              </button>
            </div>

            <div className="space-y-1 text-left">
              <h4 className="text-sm font-black tracking-tight flex items-center gap-1.5 uppercase italic">
                <span>Love our platform? 👋</span>
              </h4>
              <p className="text-xs text-slate-300 leading-relaxed font-semibold">
                We build MySellFlow with intense passion. Would you mind sharing a quick review? It takes 15 seconds!
              </p>
            </div>

            <div className="flex items-center gap-3 pt-1">
              <button
                onClick={() => {
                  setReviewPopupOpen(true);
                  setInvitedToReview(false);
                }}
                className="bg-[#5B2FD4] hover:bg-[#4c24b8] text-white text-xs font-black px-4 py-2.5 rounded-xl shadow-lg shadow-[#5B2FD4]/10 transition-all active:scale-95 flex items-center gap-1.5 cursor-pointer"
                id="review-accept-btn"
              >
                <span>Write a Review</span>
                <ChevronRight size={13} className="stroke-[2.5]" />
              </button>
              <button
                onClick={() => {
                  setInvitedToReview(false);
                  localStorage.setItem('mysellflow_platform_dismissed', 'true');
                }}
                className="text-slate-400 hover:text-slate-200 text-xs font-bold transition-colors py-2 px-1 cursor-pointer"
                id="review-later-btn"
              >
                Maybe later
              </button>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* BEAUTIFUL GORGEOUS LEAVE A REVIEW FULL MODAL */}
      <AnimatePresence>
        {reviewPopupOpen && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 bg-slate-950/65 backdrop-blur-sm z-50 flex items-center justify-center p-4 overflow-y-auto"
            onClick={() => setReviewPopupOpen(false)}
          >
            <motion.div
              initial={{ scale: 0.95, y: 20 }}
              animate={{ scale: 1, y: 0 }}
              exit={{ scale: 0.95, y: 20 }}
              transition={{ type: "spring", duration: 0.4 }}
              className="bg-white rounded-3xl w-full max-w-md text-slate-900 shadow-2xl overflow-hidden border border-slate-100 flex flex-col relative"
              onClick={(e) => e.stopPropagation()}
            >
              {/* Top ambient color spot */}
              <div className="absolute top-0 left-0 right-0 h-1.5 bg-gradient-to-r from-purple-500 via-[#5B2FD4] to-pink-500" />
              
              {/* Close Button */}
              <button 
                onClick={() => setReviewPopupOpen(false)}
                className="absolute top-4 right-4 p-1.5 rounded-xl text-slate-400 hover:text-slate-700 hover:bg-slate-100 transition-colors z-10 cursor-pointer"
                id="review-modal-close"
              >
                <X size={18} />
              </button>

              <div className="p-6 md:p-8 text-center space-y-6">
                {!reviewSubmitted ? (
                  <form onSubmit={handleSubmitReview} className="space-y-4 text-left">
                    <div className="text-center space-y-2 mt-2">
                      <span className="text-[28px] inline-block animate-bounce">💖</span>
                      <h3 className="text-xl font-black text-slate-950 tracking-tight leading-none uppercase italic">Your review makes our day</h3>
                      <p className="text-xs text-slate-500 leading-relaxed max-w-xs mx-auto">
                        We are an independent team supporting local entrepreneurs. Your feedback inspires us deeply!
                      </p>
                    </div>

                    {/* Interactive 5 star selector */}
                    <div className="space-y-2 text-center py-2">
                      <span className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Select Rating</span>
                      <div className="flex justify-center gap-2">
                        {[1, 2, 3, 4, 5].map((star) => {
                          const isGold = hoverRating !== null ? star <= hoverRating : star <= rating;
                          return (
                            <button
                              type="button"
                              key={star}
                              onClick={() => setRating(star)}
                              onMouseEnter={() => setHoverRating(star)}
                              onMouseLeave={() => setHoverRating(null)}
                              className="text-2xl transition-all duration-150 transform hover:scale-125 focus:outline-none cursor-pointer"
                              id={`star-btn-${star}`}
                            >
                              <Star 
                                size={32} 
                                className={isGold 
                                  ? "text-amber-400 fill-amber-400 drop-shadow-[0_2px_8px_rgba(245,158,11,0.2)]" 
                                  : "text-slate-200 fill-none"
                                } 
                              />
                            </button>
                          );
                        })}
                      </div>
                      <span className="text-[10px] font-bold text-[#5B2FD4] uppercase tracking-wide inline-block bg-[#EDE8FB] px-2.5 py-0.5 rounded-full mt-1">
                        {rating === 5 && "Excellent! Love it 😍"}
                        {rating === 4 && "Great platform 👍"}
                        {rating === 3 && "Good / Meets expects 🙂"}
                        {rating === 2 && "Needs improvement 😕"}
                        {rating === 1 && "Extremely poor 😡"}
                      </span>
                    </div>

                    <div className="space-y-4">
                      {/* Name input */}
                      <div className="space-y-1.5">
                        <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest pl-1">Your Full Name</label>
                        <input 
                          type="text" 
                          required
                          value={reviewerName}
                          onChange={(e) => setReviewerName(e.target.value)}
                          placeholder="E.g. Jennifer Lawson"
                          className="w-full bg-slate-50 border border-slate-200 focus:border-[#5B2FD4] rounded-xl px-4 py-3 text-xs focus:ring-4 focus:ring-[#5B2FD4]/10 focus:outline-none transition-all font-bold"
                          id="review-name-input"
                        />
                      </div>

                      {/* Role input */}
                      <div className="space-y-1.5">
                        <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest pl-1">Role / Business (Optional)</label>
                        <input 
                          type="text" 
                          value={reviewerRole}
                          onChange={(e) => setReviewerRole(e.target.value)}
                          placeholder="E.g. Founder, Jen's Glow Studio"
                          className="w-full bg-slate-50 border border-slate-200 focus:border-[#5B2FD4] rounded-xl px-4 py-3 text-xs focus:ring-4 focus:ring-[#5B2FD4]/10 focus:outline-none transition-all font-semibold"
                          id="review-role-input"
                        />
                      </div>

                      {/* Comment input */}
                      <div className="space-y-1.5">
                        <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest pl-1">Your Honest Review</label>
                        <textarea 
                          rows={3}
                          required
                          value={comment}
                          onChange={(e) => setComment(e.target.value)}
                          placeholder="What do you think of MySellFlow? How does it help your day-to-day work tasks?"
                          className="w-full bg-slate-50 border border-slate-200 focus:border-[#5B2FD4] rounded-xl px-4 py-3 text-xs focus:ring-4 focus:ring-[#5B2FD4]/10 focus:outline-none transition-all resize-none font-medium text-slate-700 leading-relaxed"
                          id="review-text-input"
                        />
                      </div>
                    </div>

                    <button
                      type="submit"
                      disabled={isSubmittingReview || !comment || !reviewerName}
                      className="w-full bg-[#5B2FD4] hover:bg-[#4c24b8] disabled:bg-slate-300 disabled:cursor-not-allowed text-white font-black text-xs uppercase tracking-widest py-3.5 rounded-xl transition-all shadow-lg hover:shadow-[#5B2FD4]/15 flex items-center justify-center gap-2 mt-4 cursor-pointer"
                      id="review-submit-btn"
                    >
                      {isSubmittingReview ? (
                        <>
                          <svg className="animate-spin h-4 w-4 text-white" fill="none" viewBox="0 0 24 24">
                            <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                            <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" />
                          </svg>
                          <span>Sending Love...</span>
                        </>
                      ) : (
                        <>
                          <Send size={13} className="text-white fill-none stroke-[2.5]" />
                          <span>Submit My Review</span>
                        </>
                      )}
                    </button>
                  </form>
                ) : (
                  <motion.div 
                    initial={{ opacity: 0, scale: 0.95 }}
                    animate={{ opacity: 1, scale: 1 }}
                    className="py-12 space-y-4 text-center"
                  >
                    <div className="w-16 h-16 bg-emerald-50 text-emerald-500 rounded-full flex items-center justify-center mx-auto text-3xl shadow-inner animate-pulse">
                      🎉
                    </div>
                    <div className="space-y-2">
                      <h4 className="font-extrabold text-[#22C55E] text-lg uppercase tracking-tight italic">Review Posted Successfully!</h4>
                      <p className="text-xs text-slate-500 leading-relaxed max-w-sm mx-auto">
                        Your honest feedback was saved to our database with pure gratitude. It's now showing live in our success stories section too!
                      </p>
                    </div>
                    <p className="text-xs font-serif font-semibold text-[#5B2FD4] italic">
                      "Thank you for helping scale this platform!" ❤️
                    </p>
                  </motion.div>
                )}
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Floating Discover Button (Mobile Only) */}
      {currentPage === 'home' && (
        <div className="md:hidden fixed bottom-6 right-6 z-50">
          <button 
            type="button"
            onClick={() => navigateTo('/explore')}
            className="flex items-center gap-1.5 bg-[#5B2FD4] text-white font-black uppercase text-[9px] tracking-widest px-4 py-3 rounded-full shadow-[0_6px_16px_rgba(91,47,212,0.35)] active:scale-95 hover:bg-[#4a23b3] transition-all cursor-pointer border border-[#5B2FD4]"
            id="mobile-explore-btn"
          >
            <span>🔍 Explore Products</span>
          </button>
        </div>
      )}

    </div>
  );
}
