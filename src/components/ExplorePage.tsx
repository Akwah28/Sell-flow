import React, { useState, useEffect } from 'react';
import { 
  Search, 
  ShoppingBag, 
  Star, 
  Heart, 
  Plus, 
  ArrowLeft, 
  Store, 
  MessageSquare, 
  ExternalLink,
  ChevronRight,
  ShieldCheck,
  AlertCircle,
  Loader2,
  CheckCircle,
  TrendingUp,
  Package,
  ArrowRight,
  ThumbsUp
} from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import { collection, doc, getDoc, getDocs, query, where, orderBy, updateDoc, increment, addDoc } from 'firebase/firestore';
import { db } from '../firebase';
import { Product, BusinessProfile, Review } from '../types';
import { cn } from '../lib/utils';

// Helper to format currency
const formatCurrency = (amount: number, currencyCode: string = 'NGN') => {
  const code = (currencyCode || 'NGN').toUpperCase();
  const symbolMap: { [key: string]: string } = {
    'NGN': '₦',
    'USD': '$',
    'GHS': '₵',
    'KES': 'KSh',
    'ZAR': 'R',
    'GBP': '£',
    'EUR': '€'
  };
  const symbol = symbolMap[code] || code + ' ';
  return `${symbol}${amount.toLocaleString()}`;
};

interface ExplorePageProps {
  onNavigateToStore: (storeSlug: string) => void;
  onAddToCartForStore: (product: Product, storeSlug: string) => void;
  showToast?: (m: string, t?: 'success' | 'error' | 'info') => void;
  currentProductId?: string;
  onSelectProduct?: (productId: string | null) => void;
}

export default function ExplorePage({ 
  onNavigateToStore, 
  onAddToCartForStore, 
  showToast,
  currentProductId,
  onSelectProduct
}: ExplorePageProps) {
  // Database States
  const [globalProducts, setGlobalProducts] = useState<Product[]>([]);
  const [businesses, setBusinesses] = useState<{ [ownerId: string]: BusinessProfile }>({});
  const [globalReviews, setGlobalReviews] = useState<Review[]>([]);
  
  // Loading & Error States
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Filter States
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedCategory, setSelectedCategory] = useState('All');
  
  // Active product details view
  const [activeProduct, setActiveProduct] = useState<Product | null>(null);
  const [activeStore, setActiveStore] = useState<BusinessProfile | null>(null);
  const [activeStoreReviews, setActiveStoreReviews] = useState<Review[]>([]);
  const [moreFromStore, setMoreFromStore] = useState<Product[]>([]);
  const [loadingDetails, setLoadingDetails] = useState(false);

  // Favorites/Wishlist state from localStorage
  const [favorites, setFavorites] = useState<string[]>(() => {
    try {
      const saved = localStorage.getItem('explore_favorites');
      return saved ? JSON.parse(saved) : [];
    } catch {
      return [];
    }
  });

  // Checkout States matching Storefront Checkout modal
  const [checkoutProduct, setCheckoutProduct] = useState<Product | null>(null);
  const [checkoutStore, setCheckoutStore] = useState<BusinessProfile | null>(null);
  const [checkoutActiveImgIdx, setCheckoutActiveImgIdx] = useState<number>(0);
  const [buyerName, setBuyerName] = useState('');
  const [buyerPhone, setBuyerPhone] = useState('');
  const [isCheckingOut, setIsCheckingOut] = useState(false);

  // Review states for checkout product
  const [checkoutReviewName, setCheckoutReviewName] = useState('');
  const [checkoutReviewComment, setCheckoutReviewComment] = useState('');
  const [checkoutReviewRating, setCheckoutReviewRating] = useState(5);
  const [showCheckoutReviewForm, setShowCheckoutReviewForm] = useState(false);

  // Handle product select
  const handleSelectProduct = (productId: string | null) => {
    if (onSelectProduct) {
      onSelectProduct(productId);
    }
  };

  // Toggle favorite helper (Side effect free)
  const toggleFavorite = (productId: string, e: React.MouseEvent) => {
    e.stopPropagation();
    const isFav = favorites.includes(productId);
    const updated = isFav 
      ? favorites.filter(id => id !== productId) 
      : [...favorites, productId];
    
    setFavorites(updated);
    try {
      localStorage.setItem('explore_favorites', JSON.stringify(updated));
    } catch (err) {
      console.error("Local storage error:", err);
    }
    
    if (showToast) {
      showToast(isFav ? "Removed from wishlist." : "Heart added to wishlist!", "success");
    }
  };

  // Submit checkout order lead and open WhatsApp
  const handleCheckoutSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!checkoutProduct || !checkoutStore) return;
    if (!buyerName.trim() || !buyerPhone.trim()) {
      if (showToast) showToast("Please fill in both name and mobile number fields.", "error");
      return;
    }
    
    setIsCheckingOut(true);
    try {
      const bizOwnerId = checkoutStore.ownerId || checkoutProduct.ownerId;
      
      // Step 1: Create lead record in the Firestore database
      const newLead = {
        name: buyerName.trim(),
        phone: buyerPhone.trim(),
        status: 'new',
        ownerId: bizOwnerId,
        createdAt: new Date().toISOString(),
        source: 'Explore Page Detail',
        interest: checkoutProduct.name,
        notes: `Direct purchase order from MySellFlow Explore for: ${checkoutProduct.name}`
      };
      
      await addDoc(collection(db, 'leads'), newLead);
      
      // Step 2: Increment click metric for the business
      try {
        if (bizOwnerId) {
          const bizRef = doc(db, 'businesses', bizOwnerId);
          await updateDoc(bizRef, {
            clicksMessageMerchant: increment(1)
          });
        }
      } catch (metricErr) {
        console.warn("Could not record clicksMessageMerchant metric:", metricErr);
      }
      
      // Step 3: Redirect to WhatsApp with a beautifully drafted message
      const cleanNum = checkoutStore.whatsappNumber ? checkoutStore.whatsappNumber.replace(/[^0-9]/g, '') : '';
      const priceText = checkoutProduct.price > 0 ? ` for ${formatCurrency(checkoutProduct.price, checkoutStore.currency)}` : '';
      const itemUrl = `${window.location.protocol}//${window.location.host}/explore/product/${checkoutProduct.id}`;
      const messageText = `Hello ${checkoutStore.name || 'Merchant'}! I want to buy this product from the Explore Page: *${checkoutProduct.name}*${priceText}.\nMy Name: ${buyerName.trim()}\nProduct Link: ${itemUrl}\n\nPlease let me know how to make payments.`;
      
      const finalUrl = `https://wa.me/${cleanNum}?text=${encodeURIComponent(messageText)}`;
      window.open(finalUrl, '_blank');
      
      if (showToast) {
        showToast(`Order submitted! Opening WhatsApp to finalize...`, "success");
      }
      
      // Step 4: Clear states
      setCheckoutProduct(null);
      setCheckoutStore(null);
      setBuyerName('');
      setBuyerPhone('');
    } catch (err) {
      console.error("Error writing explore purchase lead:", err);
      if (showToast) showToast("Could not submit order checkout. Please try again.", "error");
    } finally {
      setIsCheckingOut(false);
    }
  };

  // Submit product review feedback
  const handleCheckoutReviewSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!checkoutProduct || !checkoutStore) return;
    if (!checkoutReviewName.trim() || !checkoutReviewComment.trim()) {
      if (showToast) showToast("Please fill in your name and comment.", "error");
      return;
    }
    
    try {
      const newReview = {
        productId: checkoutProduct.id,
        customerName: checkoutReviewName.trim(),
        rating: checkoutReviewRating,
        comment: checkoutReviewComment.trim(),
        createdAt: new Date().toISOString(),
        ownerId: checkoutStore.ownerId || checkoutProduct.ownerId,
        isRead: false
      };
      
      const docRef = await addDoc(collection(db, 'reviews'), newReview);
      const savedReview = { id: docRef.id, ...newReview } as Review;
      
      setGlobalReviews(prev => [savedReview, ...prev]);
      
      if (showToast) {
        showToast("Thank you! Your product review has been submitted.", "success");
      }
      
      setCheckoutReviewName('');
      setCheckoutReviewComment('');
      setShowCheckoutReviewForm(false);
    } catch (err) {
      console.error("Error writing review from explore checkout modal:", err);
      if (showToast) {
        showToast("Could not submit review feedback. Please try again.", "error");
      }
    }
  };

  // 1. Initial Load of Global Datasets
  useEffect(() => {
    const fetchGlobalData = async () => {
      setLoading(true);
      setError(null);
      try {
        // Fetch all active products
        const prodQuery = query(collection(db, 'products'), where('isActive', '==', true));
        const prodSnap = await getDocs(prodQuery);
        const productsList: Product[] = [];
        prodSnap.forEach(doc => {
          productsList.push({ id: doc.id, ...doc.data() } as Product);
        });

        // Fetch all business profiles to match
        const bizSnap = await getDocs(collection(db, 'businesses'));
        const bizMap: { [ownerId: string]: BusinessProfile } = {};
        bizSnap.forEach(doc => {
          const biz = doc.data() as BusinessProfile;
          if (biz.ownerId) {
            bizMap[biz.ownerId] = biz;
          } else {
            bizMap[doc.id] = { ...biz, ownerId: doc.id };
          }
        });

        // Fetch all reviews for ratings calculation
        const revSnap = await getDocs(collection(db, 'reviews'));
        const reviewsList: Review[] = [];
        revSnap.forEach(doc => {
          reviewsList.push({ id: doc.id, ...doc.data() } as Review);
        });

        // Sort products by custom created_at/order or fallback
        productsList.sort((a, b) => {
          const dateA = a.id; 
          const dateB = b.id;
          return dateB.localeCompare(dateA); // Newest ID first as robust standard fallback
        });

        setGlobalProducts(productsList);
        setBusinesses(bizMap);
        setGlobalReviews(reviewsList);
      } catch (err: any) {
        console.error("Failed to fetch discovery content:", err);
        setError("Unable to connect to the server. Please verify your connection.");
      } finally {
        setLoading(false);
      }
    };

    fetchGlobalData();
  }, []);

  // 2. Fetch specific product details when currentProductId changes
  useEffect(() => {
    if (!currentProductId) {
      setActiveProduct(null);
      setActiveStore(null);
      setMoreFromStore([]);
      return;
    }

    const loadProductDetails = async () => {
      setLoadingDetails(true);
      try {
        const prodDoc = await getDoc(doc(db, 'products', currentProductId));
        if (prodDoc.exists()) {
          const prodData = { id: prodDoc.id, ...prodDoc.data() } as Product;
          setActiveProduct(prodData);

          // Resolve store using product's ownerId
          if (prodData.ownerId) {
            // Check cache first, otherwise load
            let storeData = businesses[prodData.ownerId];
            if (!storeData) {
              const bizDoc = await getDoc(doc(db, 'businesses', prodData.ownerId));
              if (bizDoc.exists()) {
                storeData = bizDoc.data() as BusinessProfile;
              }
            }
            setActiveStore(storeData || null);

            if (storeData) {
              // Load seller storefront reviews
              const revQuery = query(collection(db, 'reviews'), where('ownerId', '==', prodData.ownerId));
              const revSnap = await getDocs(revQuery);
              const storeReviews: Review[] = [];
              revSnap.forEach(d => {
                storeReviews.push({ id: d.id, ...d.data() } as Review);
              });
              setActiveStoreReviews(storeReviews);

              // Extract more products from this store (limit 4 to 8)
              const otherProds = globalProducts.filter(p => p.ownerId === prodData.ownerId && p.id !== prodData.id);
              setMoreFromStore(otherProds.slice(0, 6));
            }
          }
        } else {
          showToast?.("Product not found.", "error");
          handleSelectProduct(null);
        }
      } catch (err) {
        console.error("Error loading product detail info:", err);
      } finally {
        setLoadingDetails(false);
      }
    };

    loadProductDetails();
  }, [currentProductId, globalProducts, businesses]);

  // Sort and Filter computations
  const filteredProducts = globalProducts.filter(product => {
    // Search keyword query filter
    const titleMatch = product.name?.toLowerCase().includes(searchQuery.toLowerCase());
    const descMatch = product.description?.toLowerCase().includes(searchQuery.toLowerCase());
    
    // Quick Category match computation
    let categoryMatch = true;
    if (selectedCategory !== 'All') {
      const lowerCat = selectedCategory.toLowerCase();
      if (lowerCat === 'wishlist' || lowerCat === 'favorites' || lowerCat === 'my wishlist') {
        categoryMatch = favorites.includes(product.id);
      } else if (lowerCat === 'best sellers') {
        categoryMatch = !!product.isBestSeller;
      } else if (lowerCat === 'new arrivals') {
        categoryMatch = !!product.isNewArrival;
      } else if (lowerCat === 'promotions') {
        categoryMatch = !!product.isPromotion;
      } else if (lowerCat === 'physical') {
        categoryMatch = product.type === 'physical';
      } else if (lowerCat === 'digital') {
        categoryMatch = product.type === 'digital';
      } else if (lowerCat === 'services') {
        categoryMatch = product.type === 'service';
      } else {
        categoryMatch = product.category?.toLowerCase() === lowerCat;
      }
    }

    return (titleMatch || descMatch) && categoryMatch;
  });

  const handleWhatsappContact = (product: Product, store: BusinessProfile) => {
    try {
      if (!store.whatsappNumber) {
        showToast?.("This business has no contact WhatsApp number listed.", "error");
        return;
      }
      
      const cleanNum = store.whatsappNumber.replace(/[^0-9]/g, '');
      const itemUrl = `${window.location.protocol}//${window.location.host}/explore/product/${product.id}`;
      const text = `Hello ${store.name || 'Store'}! I found your product "${product.name}" on MySellFlow Explore and wanted to request more information: ${itemUrl}`;
      const finalUrl = `https://wa.me/${cleanNum}?text=${encodeURIComponent(text)}`;
      
      // Attempt tracking increment
      updateDoc(doc(db, 'businesses', store.ownerId || product.ownerId), {
        clicksMessageMerchant: increment(1)
      }).catch(e => console.warn(e));
      
      window.open(finalUrl, '_blank');
    } catch (e) {
      console.error(e);
    }
  };

  const handleBuyNow = (product: Product, store: BusinessProfile) => {
    if (!store.whatsappNumber) {
      showToast?.("This business has no contact WhatsApp number listed.", "error");
      return;
    }
    setCheckoutProduct(product);
    setCheckoutStore(store);
    setCheckoutActiveImgIdx(0);
  };

  const handleAddToCart = (product: Product, store: BusinessProfile) => {
    onAddToCartForStore(product, store.storeSlug);
    if (showToast) {
      showToast(`Added "${product.name}" to cart relative to "${store.name || 'Vendor'}" successfully!`, "success");
    }
  };

  // Rendering skeletons
  const SkeletonGrid = () => (
    <div className="grid grid-cols-2 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-3 sm:gap-6 md:gap-8 max-w-7xl mx-auto px-4 py-6">
      {[1,2,3,4,5,6,7,8].map(i => (
        <div key={i} className="bg-white rounded-2xl border border-slate-100 shadow-sm p-3 space-y-3 animate-pulse">
          <div className="aspect-square bg-slate-200/80 rounded-xl" />
          <div className="h-3 bg-slate-200 rounded-sm w-3/4" />
          <div className="h-2.5 bg-slate-200 rounded-sm w-1/2" />
          <div className="h-4 bg-slate-200 rounded-sm w-1/3" />
        </div>
      ))}
    </div>
  );

  return (
    <div className="min-h-screen pb-16 font-sans">
      <AnimatePresence mode="wait">
        {!currentProductId ? (
          // ==================== 1. FEED CATALOG VIEW ====================
          <motion.div 
            initial={{ opacity: 0, y: 15 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -15 }}
            className="w-full max-w-7xl mx-auto px-4 md:px-8 py-8"
          >
            {/* Header section with brand feel */}
            <div className="text-center max-w-2xl mx-auto mb-10 space-y-2">
              <span className="text-[10px] font-black uppercase text-[#5B2FD4] tracking-[0.25em] bg-[#EDE8FB] px-3 py-1.5 rounded-full">
                Global Discovery Feed
              </span>
              <h1 className="text-3xl md:text-5xl font-black text-slate-950 tracking-tight leading-none pt-2">
                Explore Products
              </h1>
              <p className="text-sm text-slate-500 font-medium">
                Discover products from businesses using MySellFlow. One-stop marketplace gateway.
              </p>
            </div>

            {/* Sticky Search bar section */}
            <div className="max-w-xl mx-auto mb-8 relative">
              <div className="relative">
                <input 
                  type="text"
                  placeholder="Search products..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="w-full pl-11 pr-4 py-3.5 bg-white border border-slate-200/80 rounded-2xl text-xs outline-none focus:ring-2 focus:ring-[#5B2FD4]/10 focus:border-[#5B2FD4] transition-all shadow-sm"
                />
                <Search size={14} className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400" />
              </div>
            </div>

            {/* Horizontal Category Slides list */}
            <div className="mb-8 overflow-x-auto no-scrollbar flex items-center gap-2 justify-start sm:justify-center py-2 px-1">
              {[
                'All', 
                'Wishlist',
                'Best Sellers', 
                'New Arrivals', 
                'Promotions', 
                'Physical', 
                'Digital', 
                'Services'
              ].map((category) => (
                <button
                  key={category}
                  onClick={() => setSelectedCategory(category)}
                  className={cn(
                    "px-4 py-2 rounded-full text-xs font-extrabold tracking-tight whitespace-nowrap transition-all border outline-none cursor-pointer",
                    selectedCategory === category
                      ? "bg-slate-950 text-white border-slate-950 shadow-md scale-102"
                      : "bg-white text-slate-600 border-slate-250 hover:bg-slate-50"
                  )}
                >
                  {category}
                </button>
              ))}
            </div>

            {/* Error handling */}
            {error && (
              <div className="text-center py-16 bg-red-50/50 rounded-2xl border border-red-100 max-w-md mx-auto p-6 space-y-4">
                <div className="w-12 h-12 bg-red-100 text-red-600 rounded-full flex items-center justify-center mx-auto">
                  <AlertCircle size={22} />
                </div>
                <p className="text-slate-700 text-xs font-bold font-sans">{error}</p>
                <button 
                  onClick={() => window.location.reload()}
                  className="bg-slate-900 text-white text-[10px] font-bold uppercase tracking-widest px-6 py-2 rounded-xl"
                >
                  Retry Loading
                </button>
              </div>
            )}

            {/* Loading Grid */}
            {loading && <SkeletonGrid />}

            {/* Empty feed state */}
            {!loading && !error && filteredProducts.length === 0 && (
              <div className="text-center py-20 bg-white border border-dashed border-slate-200 rounded-3xl p-8 max-w-sm mx-auto">
                <div className="w-16 h-16 bg-slate-50 border border-slate-100 rounded-full flex items-center justify-center mx-auto text-slate-400 mb-4">
                  <ShoppingBag size={24} strokeWidth={1.5} />
                </div>
                <h3 className="text-sm font-bold text-slate-800 uppercase tracking-widest">
                  {searchQuery ? 'No results found' : 'No products available yet'}
                </h3>
                <p className="text-slate-400 text-xs mt-1 leading-relaxed">
                  {searchQuery 
                    ? `We couldn't find any products in "${selectedCategory}" matching your search.`
                    : 'Check back later as our merchants add products to their catalogs!'}
                </p>
                {searchQuery && (
                  <button 
                    onClick={() => { setSearchQuery(''); setSelectedCategory('All'); }}
                    className="mt-4 bg-slate-900 text-white text-[9px] font-black uppercase tracking-wider px-4 py-2 rounded-lg cursor-pointer"
                  >
                    Clear Filter
                  </button>
                )}
              </div>
            )}

            {/* Feed items grid */}
            {!loading && !error && filteredProducts.length > 0 && (
              <div className="grid grid-cols-2 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-3 sm:gap-6 md:gap-8">
                {filteredProducts.map((product) => {
                  const seller = businesses[product.ownerId];
                  const reviewsList = globalReviews.filter(r => r.productId === product.id);
                  const averageRating = reviewsList.length > 0 
                    ? (reviewsList.reduce((sum, r) => sum + r.rating, 0) / reviewsList.length).toFixed(1)
                    : null;
                  
                  const discount = product.originalPrice && product.originalPrice > product.price 
                    ? Math.round(((product.originalPrice - product.price) / product.originalPrice) * 100) 
                    : null;

                  return (
                    <div 
                      key={product.id} 
                      onClick={() => handleSelectProduct(product.id)}
                      className="bg-white rounded-2xl border border-slate-150 shadow-sm hover:shadow-xl hover:-translate-y-1.5 transition-all duration-300 flex flex-col group cursor-pointer overflow-hidden relative"
                    >
                      {/* Image Frame */}
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

                        {/* Top-right labels */}
                        {discount && (
                          <div className="absolute top-2.5 right-2.5 bg-red-500 text-white px-1.5 py-0.5 rounded-md text-[8px] sm:text-[9px] font-black uppercase tracking-wider shadow-sm z-10">
                            {discount}% OFF
                          </div>
                        )}

                        {/* Type badge overlay */}
                        <div className="absolute top-2.5 left-2.5 bg-white/90 backdrop-blur-md px-1.5 py-0.5 rounded-md border border-slate-100 text-[7px] sm:text-[8px] font-black uppercase tracking-widest text-slate-500">
                          {product.type}
                        </div>

                        {/* Stacking status labels */}
                        <div className="absolute top-9 left-2.5 flex flex-col gap-1 z-10 items-start pointer-events-none">
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
                            <span className="bg-rose-600 text-[6px] sm:text-[8px] font-black uppercase text-white px-1.5 py-0.5 rounded shadow-sm tracking-wider">
                              Sold Out
                            </span>
                          )}
                        </div>

                        {/* Favorite button toggler */}
                        <button 
                          onClick={(e) => toggleFavorite(product.id, e)}
                          className="absolute bottom-2.5 right-2.5 z-10 w-8.5 h-8.5 rounded-full bg-white text-slate-400 hover:text-red-500 hover:scale-110 flex items-center justify-center shadow-md hover:shadow-lg transition-all border border-slate-150 cursor-pointer"
                        >
                          <Heart 
                            size={14} 
                            className={cn(
                              "transition-all duration-200", 
                              favorites.includes(product.id) ? "fill-red-500 text-red-500 scale-110" : "text-slate-500 hover:text-red-500"
                            )} 
                            strokeWidth={favorites.includes(product.id) ? 0 : 2}
                          />
                        </button>
                      </div>

                      {/* Info Frame */}
                      <div className="p-4 flex-1 flex flex-col justify-between">
                        <div>
                          {/* Store title check */}
                          {seller && (
                            <div className="flex items-center gap-1.5 mb-1.5 text-slate-400">
                              <span className="text-[7.5px] font-black tracking-widest uppercase truncate max-w-[120px] bg-slate-100 text-slate-500 px-1.5 py-0.5 rounded-md">
                                {seller.name}
                              </span>
                              <CheckCircle size={8} className="text-[#5B2FD4] fill-[#5B2FD4]/10" />
                            </div>
                          )}

                          <h3 className="text-xs sm:text-xs md:text-sm font-bold text-slate-800 line-clamp-2 leading-snug mb-1.5 group-hover:text-[#5B2FD4] transition-colors min-h-[32px] sm:min-h-[38px]">
                            {product.name}
                          </h3>

                          {/* Star computation overlay */}
                          <div className="flex items-center gap-1 mb-2">
                            <div className="flex">
                              {[1,2,3,4,5].map(star => (
                                <Star 
                                  key={star} 
                                  size={8} 
                                  className={star <= (averageRating ? Number(averageRating) : 5) ? "text-amber-400 fill-amber-400" : "text-slate-200 fill-slate-200"} 
                                />
                              ))}
                            </div>
                            <span className="text-[8px] sm:text-[9px] font-black text-slate-400">({reviewsList.length})</span>
                          </div>
                        </div>

                        <div>
                          <div className="flex items-baseline gap-1.5 sm:gap-2 mb-2">
                            <span className="text-xs sm:text-sm md:text-base font-black text-slate-900">
                              {formatCurrency(product.price, seller?.currency)}
                            </span>
                            {product.originalPrice && product.originalPrice > product.price && (
                              <span className="text-[8px] sm:text-[10px] md:text-xs text-slate-400 font-bold line-through">
                                {formatCurrency(product.originalPrice, seller?.currency)}
                              </span>
                            )}
                          </div>

                          {/* Sold by label accent */}
                          <p className="text-[8px] font-extrabold uppercase tracking-wide text-[#5B2FD4] mb-3 flex items-center gap-1 bg-sky-50 p-1.5 rounded-md border border-sky-100">
                            Sold by <span className="underline font-black">{seller?.name || "Merchant"}</span> ✓
                          </p>

                          {/* Trigger card interactive tools */}
                          <div className="flex gap-1.5">
                            <button 
                              onClick={(e) => {
                                e.stopPropagation();
                                handleSelectProduct(product.id);
                              }}
                              className="flex-1 bg-slate-50 hover:bg-slate-100 border border-slate-200 text-slate-700 py-1.5 rounded-lg text-[9px] font-black uppercase tracking-wider transition-colors outline-none text-center cursor-pointer"
                            >
                              Specs
                            </button>
                            <button 
                              disabled={product.inventoryStatus === 'out_of_stock'}
                              onClick={(e) => {
                                e.stopPropagation();
                                if (seller) handleBuyNow(product, seller);
                              }}
                              className={cn(
                                "flex-[1.8] py-1.5 rounded-lg text-[9px] font-black uppercase tracking-widest transition-all shadow-sm flex items-center justify-center gap-0.5 outline-none cursor-pointer",
                                product.inventoryStatus === 'out_of_stock'
                                  ? "bg-slate-100 text-slate-400 cursor-not-allowed"
                                  : "bg-[#5B2FD4] hover:bg-[#4a23b3] text-white"
                              )}
                            >
                              Buy Now
                            </button>
                          </div>
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </motion.div>
        ) : (
          // ==================== 2. DETAILED ITEM EXPLORER VIEW ====================
          <motion.div 
            initial={{ opacity: 0, y: 15 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -15 }}
            className="w-full max-w-5xl mx-auto px-4 md:px-8 py-8"
          >
            {/* Action header bar */}
            <div className="flex items-center justify-between gap-4 mb-6">
              <button 
                onClick={() => handleSelectProduct(null)}
                className="flex items-center gap-2 text-[10px] font-black uppercase text-slate-600 tracking-widest hover:text-[#5B2FD4] transition-colors border border-slate-200/80 bg-white/90 px-4 py-2 rounded-xl shadow-sm cursor-pointer"
              >
                <ArrowLeft size={12} className="stroke-[2.5]" />
                Explore Grid
              </button>

              {activeStore && (
                <button 
                  onClick={() => onNavigateToStore(activeStore.storeSlug)}
                  className="flex items-center gap-1.5 text-[10px] font-black uppercase text-white tracking-widest bg-[#5B2FD4] hover:bg-[#4a23b3] transition-all px-4 py-2 rounded-xl shadow-md cursor-pointer"
                >
                  <Store size={11} />
                  Visit {activeStore.name} ↗
                </button>
              )}
            </div>

            {loadingDetails && (
              <div className="flex flex-col items-center justify-center py-20 space-y-4 bg-white/50 backdrop-blur-md rounded-3xl border border-slate-100">
                <Loader2 size={36} className="text-[#5B2FD4] animate-spin" />
                <p className="text-[10px] font-black uppercase tracking-widest text-slate-500 animate-pulse">Syncing catalog details...</p>
              </div>
            )}

            {!loadingDetails && activeProduct && (
              <div className="space-y-8 animate-fade-in">
                {/* 1. Primary bento card wrapper */}
                <div className="bg-white rounded-3xl border border-slate-150 shadow-xl overflow-hidden grid grid-cols-1 md:grid-cols-2">
                  {/* Image Presentation Box */}
                  <div className="p-4 sm:p-8 bg-slate-50/50 flex flex-col justify-between border-r border-slate-100">
                    <div className="aspect-square w-full rounded-2xl bg-white border border-slate-150 flex items-center justify-center overflow-hidden p-4 relative group">
                      {activeProduct.images?.[0] ? (
                        <img 
                          src={activeProduct.images[0]} 
                          className="w-full h-full object-contain max-h-[350px] group-hover:scale-103 transition-transform duration-300"
                          alt={activeProduct.name}
                          referrerPolicy="no-referrer"
                        />
                      ) : (
                        <ShoppingBag size={64} className="text-slate-300" />
                      )}

                      {/* Floating dynamic status tags */}
                      <div className="absolute top-4 left-4 flex flex-col gap-1 items-start pointer-events-none">
                        <span className="bg-slate-900 text-[8px] font-black text-white px-2.5 py-1 tracking-widest uppercase rounded">
                          {activeProduct.type}
                        </span>
                        {activeProduct.isBestSeller && (
                          <span className="bg-amber-500 text-[6.5px] font-black text-white px-2 py-0.5 tracking-wider uppercase rounded shadow-sm">
                            ★ Best Seller
                          </span>
                        )}
                        {activeProduct.isNewArrival && (
                          <span className="bg-sky-500 text-[6.5px] font-black text-white px-2 py-0.5 tracking-wider uppercase rounded shadow-sm">
                            ✦ New Arrival
                          </span>
                        )}
                      </div>
                    </div>

                    {/* Simple indicator bullets for gallery layout */}
                    {activeProduct.images && activeProduct.images.length > 1 && (
                      <div className="flex gap-2 justify-center mt-4">
                        {activeProduct.images.map((img, i) => (
                          <div 
                            key={i} 
                            className={cn(
                              "w-12 h-12 bg-white border rounded-lg overflow-hidden p-1 cursor-pointer transition-all",
                              i === 0 ? "border-[#5B2FD4] shadow-sm ring-1 ring-[#5B2FD4]/20" : "border-slate-200"
                            )}
                          >
                            <img src={img} className="w-full h-full object-cover rounded-sm" alt="" referrerPolicy="no-referrer" />
                          </div>
                        ))}
                      </div>
                    )}
                  </div>

                  {/* Informational specs frame */}
                  <div className="p-6 sm:p-8 flex flex-col justify-between space-y-6">
                    <div>
                      {/* Store reference tag with verify badge */}
                      {activeStore && (
                        <div className="flex items-center gap-1.5 text-slate-400 mb-2">
                          <CheckCircle size={12} className="text-[#5B2FD4] fill-[#5B2FD4]/10" />
                          <span className="text-[9px] font-black tracking-widest text-[#5B2FD4] uppercase bg-purple-50 px-2 py-1 rounded-md">
                            Verified MySellFlow Seller
                          </span>
                        </div>
                      )}

                      <div className="flex justify-between items-start gap-4 mb-2">
                        <h1 className="text-xl sm:text-2xl font-black text-slate-900 leading-tight tracking-tight">
                          {activeProduct.name}
                        </h1>
                        <button 
                          onClick={(e) => toggleFavorite(activeProduct.id, e)}
                          className="w-10 h-10 rounded-full bg-white text-slate-400 hover:text-red-500 hover:scale-110 flex items-center justify-center shadow-md transition-all border border-slate-150 shrink-0 cursor-pointer"
                          title={favorites.includes(activeProduct.id) ? "Remove from wishlist" : "Add to wishlist"}
                        >
                          <Heart 
                            size={16} 
                            className={cn(
                              "transition-all duration-200", 
                              favorites.includes(activeProduct.id) ? "fill-red-500 text-red-500" : "text-slate-500 hover:text-red-500"
                            )} 
                            strokeWidth={favorites.includes(activeProduct.id) ? 0 : 2}
                          />
                        </button>
                      </div>

                      {/* Rating segment */}
                      <div className="flex items-center gap-1.5 mb-4">
                        <div className="flex">
                          {[1,2,3,4,5].map(star => (
                            <Star 
                              key={star} 
                              size={12} 
                              className={star <= (activeStoreReviews.filter(r => r.productId === activeProduct.id).length > 0 ? Number((activeStoreReviews.filter(r => r.productId === activeProduct.id).reduce((sum, r) => sum + r.rating, 0) / activeStoreReviews.filter(r => r.productId === activeProduct.id).length).toFixed(1)) : 5) ? "text-amber-400 fill-amber-400" : "text-slate-200 fill-slate-200"} 
                            />
                          ))}
                        </div>
                        <span className="text-[10px] font-extrabold text-slate-400 font-mono">
                          ({activeStoreReviews.filter(r => r.productId === activeProduct.id).length} platform customer reviews)
                        </span>
                      </div>

                      {/* Display price */}
                      <div className="flex items-baseline gap-2.5 mb-6 p-4 bg-slate-50 border border-slate-100 rounded-2xl w-fit">
                        <span className="text-xl sm:text-2xl font-black text-slate-950">
                          {formatCurrency(activeProduct.price, activeStore?.currency)}
                        </span>
                        {activeProduct.originalPrice && activeProduct.originalPrice > activeProduct.price && (
                          <div className="flex items-center gap-1.5">
                            <span className="text-xs text-slate-400 font-bold line-through">
                              {formatCurrency(activeProduct.originalPrice, activeStore?.currency)}
                            </span>
                            <span className="text-[8.5px] font-black text-rose-500 tracking-wider bg-rose-50 px-1.5 py-0.5 rounded uppercase">
                              -{Math.round(((activeProduct.originalPrice - activeProduct.price) / activeProduct.originalPrice) * 100)}%
                            </span>
                          </div>
                        )}
                      </div>

                      {/* Description Area */}
                      <div className="space-y-2 border-t border-slate-100 pt-5">
                        <h4 className="text-[10px] font-black uppercase text-slate-400 tracking-wider">Product Catalog Description</h4>
                        <div className="text-slate-600 text-xs sm:text-sm leading-relaxed whitespace-pre-line font-medium pr-2">
                          {activeProduct.description || "The merchant has not provided a specific specifications description. Please contact them for details."}
                        </div>
                      </div>
                    </div>

                    {/* Execution CTA action buttons */}
                    <div className="space-y-3.5 pt-4 border-t border-slate-100">
                      {activeProduct.inventoryStatus === 'out_of_stock' ? (
                        <div className="w-full bg-slate-100 text-slate-400 text-center py-3.5 rounded-xl font-black text-[10px] uppercase tracking-widest">
                          🚫 Product Temporarily Sold Out
                        </div>
                      ) : (
                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                          <button 
                            onClick={() => activeStore && handleAddToCart(activeProduct, activeStore)}
                            className="w-full bg-white hover:bg-slate-50 border border-slate-250 text-slate-800 text-center py-3 rounded-xl font-black text-[10px] uppercase tracking-widest transition-all active:scale-97 shadow-sm cursor-pointer flex items-center justify-center gap-2"
                          >
                            <ShoppingBag size={12} />
                            Add To Cart
                          </button>
                          <button 
                            onClick={() => activeStore && handleBuyNow(activeProduct, activeStore)}
                            className="w-full bg-[#5B2FD4] hover:bg-[#4a23b3] text-white text-center py-3 rounded-xl font-black text-[10px] uppercase tracking-widest transition-all active:scale-97 shadow-md hover:shadow-lg cursor-pointer flex items-center justify-center gap-2"
                          >
                            Buy Now
                          </button>
                        </div>
                      )}

                      {activeStore && (
                        <button 
                          onClick={() => handleWhatsappContact(activeProduct, activeStore)}
                          className="w-full bg-emerald-500 hover:bg-emerald-600 text-white text-center py-3 rounded-xl font-black text-[10px] uppercase tracking-widest transition-all active:scale-97 shadow-sm cursor-pointer flex items-center justify-center gap-2"
                        >
                          <MessageSquare size={13} />
                          Contact Seller on WhatsApp
                        </button>
                      )}
                    </div>
                  </div>
                </div>

                {/* 2. Store profile card section */}
                {activeStore && (
                  <div className="bg-slate-50 rounded-3xl border border-slate-200/80 p-6 sm:p-8 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-6">
                    <div className="flex items-center gap-4">
                      {activeStore.logo ? (
                        <div className="w-16 h-16 rounded-2xl bg-white border border-slate-200 shadow-sm overflow-hidden p-1 flex items-center justify-center">
                          <img src={activeStore.logo} className="w-full h-full object-contain" alt={activeStore.name} referrerPolicy="no-referrer" />
                        </div>
                      ) : (
                        <div className="w-16 h-16 rounded-2xl bg-[#EDE8FB] text-[#5B2FD4] border border-fuchsia-100 flex items-center justify-center text-2xl font-black uppercase">
                          {activeStore.name?.charAt(0) || 'S'}
                        </div>
                      )}
                      
                      <div className="space-y-1">
                        <div className="flex items-center gap-2">
                          <h3 className="font-black text-slate-900 text-base">{activeStore.name}</h3>
                          <CheckCircle size={14} className="text-sky-500 fill-sky-500/10" />
                        </div>
                        <p className="text-slate-500 text-xs font-medium max-w-md line-clamp-2 leading-relaxed">
                          {activeStore.description || "Welcome to our platform-enabled retail shop. Contact us for direct shipping rates."}
                        </p>
                        
                        <div className="flex items-center gap-2 pt-1">
                          <div className="flex text-amber-400">
                            {[1,2,3,4,5].map(s => <Star key={s} size={10} className="fill-amber-400 text-amber-400" />)}
                          </div>
                          <span className="text-[9px] font-black text-slate-400 uppercase tracking-widest">Top Rated Seller</span>
                        </div>
                      </div>
                    </div>

                    <div className="flex gap-2 w-full sm:w-auto">
                      <button 
                        onClick={() => onNavigateToStore(activeStore.storeSlug)}
                        className="flex-1 sm:flex-initial bg-white hover:bg-slate-50 border border-slate-250 text-slate-800 text-[9px] font-black uppercase tracking-widest py-3 px-6 rounded-xl transition-all shadow-sm cursor-pointer text-center"
                      >
                        Visit Store Catalog
                      </button>
                    </div>
                  </div>
                )}

                {/* 3. More from this Store grid */}
                {activeStore && moreFromStore.length > 0 && (
                  <div className="space-y-4 pt-4">
                    <div className="flex items-center justify-between">
                      <h3 className="text-xs uppercase font-black text-slate-400 tracking-wider">More From {activeStore.name}</h3>
                      <button 
                        onClick={() => onNavigateToStore(activeStore.storeSlug)}
                        className="text-[10px] font-black uppercase text-[#5B2FD4] tracking-widest hover:underline flex items-center gap-1 cursor-pointer"
                      >
                        View Full Storefront
                        <ChevronRight size={10} strokeWidth={3} />
                      </button>
                    </div>

                    <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                      {moreFromStore.map(prod => {
                        const recReviews = activeStoreReviews.filter(r => r.productId === prod.id);
                        const recRating = recReviews.length > 0 
                          ? (recReviews.reduce((sum, r) => sum + r.rating, 0) / recReviews.length).toFixed(1)
                          : null;

                        return (
                          <div 
                            key={prod.id} 
                            onClick={() => handleSelectProduct(prod.id)}
                            className="bg-white rounded-2xl border border-slate-150 p-3 hover:shadow-lg transition-all duration-200 flex flex-col justify-between cursor-pointer group"
                          >
                            <div className="aspect-square bg-slate-50 rounded-xl flex items-center justify-center p-2 mb-3 relative overflow-hidden">
                              {prod.images?.[0] ? (
                                <img src={prod.images[0]} className="w-full h-full object-contain group-hover:scale-104 transition-all" alt="" referrerPolicy="no-referrer" />
                              ) : (
                                <ShoppingBag size={20} className="text-slate-300" />
                              )}
                            </div>
                            
                            <div>
                              <h4 className="text-[11px] font-bold text-slate-800 line-clamp-2 leading-snug mb-1">
                                {prod.name}
                              </h4>
                              <p className="text-slate-900 text-xs font-black">
                                {formatCurrency(prod.price, activeStore.currency)}
                              </p>
                              {prod.originalPrice && prod.originalPrice > prod.price && (
                                <p className="text-[9px] text-slate-400 font-bold line-through">
                                  {formatCurrency(prod.originalPrice, activeStore.currency)}
                                </p>
                              )}
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  </div>
                )}
              </div>
            )}
          </motion.div>
        )}
      </AnimatePresence>

      {/* Checkout Modal Overlay - Same procedure as the User's storefront */}
      <AnimatePresence>
        {checkoutProduct && checkoutStore && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
            {/* Backdrop */}
            <motion.div 
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="absolute inset-0 bg-slate-950/60 backdrop-blur-sm" 
              onClick={() => { setCheckoutProduct(null); setCheckoutStore(null); setShowCheckoutReviewForm(false); }} 
            />

            {/* Modal Box */}
            <motion.div 
              initial={{ scale: 0.95, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.95, opacity: 0 }}
              className="bg-white rounded-3xl w-full max-w-4xl shadow-[0_25px_50px_-12px_rgba(0,0,0,0.25)] relative z-10 grid grid-cols-1 md:grid-cols-2 max-h-[92vh] md:max-h-[85vh] overflow-y-auto md:overflow-hidden divide-y md:divide-y-0 md:divide-x divide-slate-150/70 overscroll-contain transition-all duration-300"
            >
              {/* Left Side Product Details Cover Summary */}
              <div className="p-5 sm:p-8 bg-slate-50/50 flex flex-col justify-between shrink-0 md:overflow-y-auto no-scrollbar max-h-none md:max-h-[85vh] scroll-smooth overscroll-contain">
                <div className="space-y-6">
                  <div>
                    <span className="text-[9px] font-black uppercase tracking-widest text-[#5B2FD4] bg-violet-100 px-2.5 py-1 rounded-md">
                      {checkoutProduct.type || 'Product'} Checkout Summary
                    </span>
                    <h3 className="text-lg md:text-xl font-black uppercase text-slate-900 mt-3 leading-snug tracking-tight">
                      {checkoutProduct.name}
                    </h3>
                    <div className="mt-2.5 flex items-center gap-2">
                      <span className="text-base font-black text-slate-900">
                        {formatCurrency(checkoutProduct.price, checkoutStore.currency)}
                      </span>
                      {checkoutProduct.originalPrice && checkoutProduct.originalPrice > checkoutProduct.price && (
                        <span className="text-xs text-slate-400 font-bold line-through">
                          {formatCurrency(checkoutProduct.originalPrice, checkoutStore.currency)}
                        </span>
                      )}
                    </div>
                  </div>

                  {/* Dynamic Visual Cover Gallery */}
                  <div className="space-y-3">
                    <div className="aspect-square bg-white rounded-2xl overflow-hidden flex items-center justify-center p-4 relative border border-slate-200/50 shadow-sm transition-all duration-300">
                      {checkoutProduct.images?.[checkoutActiveImgIdx] ? (
                        <motion.img 
                          key={checkoutActiveImgIdx}
                          initial={{ opacity: 0.85, scale: 0.98 }}
                          animate={{ opacity: 1, scale: 1 }}
                          transition={{ duration: 0.2 }}
                          src={checkoutProduct.images[checkoutActiveImgIdx]} 
                          className="max-h-full max-w-full object-contain rounded-xl" 
                          alt={checkoutProduct.name} 
                          referrerPolicy="no-referrer" 
                        />
                      ) : (
                        <ShoppingBag size={48} className="text-slate-300" />
                      )}
                    </div>
                    
                    {checkoutProduct.images && checkoutProduct.images.length > 1 && (
                      <div className="flex gap-2 overflow-x-auto pb-1.5 no-scrollbar scroll-smooth overscroll-x-contain">
                        {checkoutProduct.images.map((img, idx) => (
                          <button 
                            key={idx} 
                            type="button"
                            onClick={() => setCheckoutActiveImgIdx(idx)}
                            className={cn(
                              "w-12 h-12 rounded-xl overflow-hidden border p-0.5 shrink-0 bg-white shadow-sm transition-all duration-200 cursor-pointer hover:border-[#5B2FD4]",
                              checkoutActiveImgIdx === idx ? "border-[#5B2FD4] ring-2 ring-[#5B2FD4]/15 scale-95" : "border-slate-200/60"
                            )}
                          >
                            <img src={img} className="w-full h-full object-cover rounded-lg" alt="" referrerPolicy="no-referrer" />
                          </button>
                        ))}
                      </div>
                    )}
                  </div>

                  <div className="space-y-1.5">
                    <h4 className="text-[10px] font-black uppercase text-slate-400 tracking-wider">Product Description</h4>
                    <p className="text-xs text-slate-500 leading-relaxed font-semibold whitespace-pre-line">
                      {checkoutProduct.description || "The merchant has not provided a specific specifications description. Please contact them for details."}
                    </p>
                  </div>

                  {/* Interactive Reviews Panel inside Checkout Modal */}
                  <div className="pt-4 border-t border-slate-200/60 space-y-4">
                    <div className="flex justify-between items-center border-b border-slate-100 pb-2">
                      <h4 className="text-[10px] font-black uppercase tracking-wider text-slate-400">
                        Customer Feedbacks ({globalReviews.filter(r => r.productId === checkoutProduct.id).length})
                      </h4>
                      {globalReviews.filter(r => r.productId === checkoutProduct.id).length > 0 && (
                        <span className="flex items-center gap-1 bg-amber-50 text-amber-600 px-2 py-0.5 rounded-md text-[9px] font-black">
                          ★ {(globalReviews.filter(r => r.productId === checkoutProduct.id).reduce((sum, r) => sum + r.rating, 0) / globalReviews.filter(r => r.productId === checkoutProduct.id).length).toFixed(1)}
                        </span>
                      )}
                    </div>

                    <div className="space-y-3 max-h-48 overflow-y-auto no-scrollbar overscroll-y-contain">
                      {globalReviews.filter(r => r.productId === checkoutProduct.id).map((rev) => (
                        <div key={rev.id} className="bg-white p-3 rounded-xl border border-slate-150 shadow-sm">
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
                      {globalReviews.filter(r => r.productId === checkoutProduct.id).length === 0 && (
                        <p className="text-[11px] text-slate-400 italic text-center py-2">No reviews for this product yet.</p>
                      )}
                    </div>

                    {!showCheckoutReviewForm ? (
                      <button 
                        type="button"
                        onClick={() => setShowCheckoutReviewForm(true)}
                        className="w-full text-center py-2.5 rounded-xl border border-dashed border-[#5B2FD4]/25 hover:border-[#5B2FD4] text-[#5B2FD4] bg-violet-50/20 hover:bg-violet-50/40 text-[10px] font-black uppercase tracking-widest transition-all duration-200 cursor-pointer"
                      >
                        + Leave Product Feedback Review
                      </button>
                    ) : (
                      <form onSubmit={handleCheckoutReviewSubmit} className="bg-white p-4 rounded-xl border border-slate-150 space-y-3 shadow-md">
                        <div className="flex gap-1.5 items-center">
                          <span className="text-[9px] font-black text-slate-400 uppercase tracking-wider font-sans">Rating:</span>
                          <div className="flex gap-1">
                            {[1,2,3,4,5].map(st => (
                              <button key={st} type="button" onClick={() => setCheckoutReviewRating(st)} className="text-xs p-1 transition-transform hover:scale-110 active:scale-95 cursor-pointer">
                                <Star size={13} className={st <= checkoutReviewRating ? "text-amber-400 fill-amber-400" : "text-slate-350"} />
                              </button>
                            ))}
                          </div>
                        </div>
                        <input 
                          type="text" 
                          placeholder="Your Name" 
                          value={checkoutReviewName} 
                          onChange={e => setCheckoutReviewName(e.target.value)} 
                          className="w-full bg-slate-50 border border-slate-200 p-2.5 text-xs rounded-xl outline-none font-bold text-slate-800 focus:ring-2 focus:ring-[#5B2FD4]/10 focus:border-[#5B2FD4]"
                          required
                        />
                        <textarea 
                          placeholder="What did you think of this product?" 
                          value={checkoutReviewComment} 
                          onChange={e => setCheckoutReviewComment(e.target.value)} 
                          className="w-full bg-slate-50 border border-slate-200 p-2.5 text-xs rounded-xl outline-none resize-none font-medium text-slate-600 focus:ring-2 focus:ring-[#5B2FD4]/10 focus:border-[#5B2FD4]"
                          rows={2}
                          required
                        />
                        <div className="flex gap-2">
                          <button type="submit" className="flex-1 bg-slate-900 text-white text-[9px] font-black uppercase tracking-wider py-2.5 rounded-lg active:scale-98 transition-all cursor-pointer">Submit Review</button>
                          <button type="button" onClick={() => setShowCheckoutReviewForm(false)} className="bg-slate-100 hover:bg-slate-200 text-slate-600 text-[9px] font-black uppercase tracking-wider px-3 py-2.5 rounded-lg active:scale-98 transition-all cursor-pointer">Cancel</button>
                        </div>
                      </form>
                    )}
                  </div>
                </div>

                <div className="pt-5 border-t border-slate-200 mt-6 shrink-0">
                  <p className="text-[10px] font-extrabold uppercase text-[#5B2FD4] tracking-wider flex items-center gap-1">
                    <Store size={10} /> Sold by <span className="underline font-black">{checkoutStore.name || 'Merchant Store'}</span> ✓
                  </p>
                  <p className="text-[9px] text-slate-400 font-bold mt-0.5">
                    Your checkout order inquiry is sent directly to this vendor via WhatsApp!
                  </p>
                </div>
              </div>

              {/* Right Side Checkout Form */}
              <div className="p-5 sm:p-8 flex flex-col justify-between relative shrink-0 md:overflow-y-auto no-scrollbar max-h-none md:max-h-[85vh] scroll-smooth overscroll-contain">
                <button 
                  onClick={() => { setCheckoutProduct(null); setCheckoutStore(null); setShowCheckoutReviewForm(false); }}
                  className="absolute top-4 right-4 w-10 h-10 rounded-full bg-white hover:bg-slate-50 active:scale-95 flex items-center justify-center text-slate-400 hover:text-slate-800 hover:rotate-90 transition-all border border-slate-150 shadow-md cursor-pointer z-30"
                  aria-label="Close checkout modal"
                >
                  <Plus size={18} className="rotate-45" />
                </button>

                <div className="space-y-6 pt-6 md:pt-4">
                  <div>
                    <h3 className="text-md sm:text-lg font-black uppercase text-slate-900 tracking-tight">Checkout Form</h3>
                    <p className="text-[9px] text-slate-400 font-bold uppercase tracking-widest mt-0.5">Please provide your buyer coordinates</p>
                  </div>

                  <form onSubmit={handleCheckoutSubmit} className="space-y-5">
                    <div className="space-y-1.5">
                      <label className="text-[9px] font-black text-slate-450 uppercase tracking-widest block font-sans">Your Full Name</label>
                      <input 
                        type="text" 
                        placeholder="e.g. Ebuka Okafor" 
                        value={buyerName} 
                        onChange={e => setBuyerName(e.target.value)} 
                        className="w-full bg-slate-50 border border-slate-200 p-3 rounded-xl text-xs font-bold text-slate-800 outline-none focus:ring-2 focus:ring-[#5B2FD4]/10 focus:border-[#5B2FD4] transition-all"
                        required
                      />
                    </div>

                    <div className="space-y-1.5">
                      <label className="text-[9px] font-black text-slate-450 uppercase tracking-widest block font-sans">WhatsApp Mobile Number</label>
                      <input 
                        type="tel" 
                        placeholder="e.g. 08123456789" 
                        value={buyerPhone} 
                        onChange={e => setBuyerPhone(e.target.value)} 
                        className="w-full bg-slate-50 border border-slate-200 p-3 rounded-xl text-xs font-mono text-slate-800 outline-none focus:ring-2 focus:ring-[#5B2FD4]/10 focus:border-[#5B2FD4] transition-all"
                        required
                      />
                    </div>

                    <div className="bg-emerald-50/60 rounded-2xl p-4.5 border border-emerald-110 flex items-start gap-3">
                      <CheckCircle size={15} className="text-emerald-600 fill-emerald-100 shrink-0 mt-0.5" />
                      <p className="text-[10.5px] text-emerald-800 leading-relaxed font-semibold">
                        A direct order lead is created instantly in the systems log. You will proceed to WhatsApp to finalize direct payment and shipping coordinates with the owner.
                      </p>
                    </div>

                    <button 
                      type="submit" 
                      disabled={isCheckingOut}
                      className="w-full bg-emerald-500 hover:bg-emerald-600 active:scale-[0.985] disabled:bg-slate-100 disabled:text-slate-450 text-white font-black uppercase tracking-widest text-[10px] sm:text-xs py-4.5 rounded-xl transition-all shadow-md flex items-center justify-center gap-2 cursor-pointer"
                    >
                      {isCheckingOut ? (
                        <>
                          <Loader2 className="animate-spin animate-infinite" size={14} /> Submitting Order...
                        </>
                      ) : (
                        <>
                          <MessageSquare size={14} /> Send WhatsApp Order
                        </>
                      )}
                    </button>
                  </form>
                </div>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </div>
  );
}
