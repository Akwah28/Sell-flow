import { BusinessProfile, Product, Review } from '../types';

export const DISCOVERY_FALLBACK_BUSINESSES: { [ownerId: string]: BusinessProfile } = {
  "biz_lagos_glam": {
    name: "Lagos Glam & Apparel",
    storeSlug: "lagos-glam",
    description: "Trend-setting Nigerian fashion, bespoke native wears, ready-to-wear dresses, and premium accessories.",
    currency: "NGN",
    whatsappNumber: "2348012345678",
    isVerified: true,
    ownerId: "biz_lagos_glam",
    views: 3420,
    clicksMessageMerchant: 412,
    clicksWhatsAppOrder: 580,
    logo: "https://images.unsplash.com/photo-1515886657613-9f3515b0c78f?auto=format&fit=crop&w=150&h=150&q=80"
  },
  "biz_abuja_tech": {
    name: "Abuja Tech Plug",
    storeSlug: "abuja-tech",
    description: "Original smartphones, audio gear, fast chargers, and smart electronics with official warranty.",
    currency: "NGN",
    whatsappNumber: "2348098765432",
    isVerified: true,
    ownerId: "biz_abuja_tech",
    views: 4890,
    clicksMessageMerchant: 630,
    clicksWhatsAppOrder: 890,
    logo: "https://images.unsplash.com/photo-1511707171634-5f897ff02aa9?auto=format&fit=crop&w=150&h=150&q=80"
  },
  "biz_glow_naturals": {
    name: "Glow & Pure Naturals",
    storeSlug: "glow-pure",
    description: "Organic whipped shea butter, black soap formulations, herbal skincare, and botanical facial oils.",
    currency: "NGN",
    whatsappNumber: "2348123456789",
    isVerified: true,
    ownerId: "biz_glow_naturals",
    views: 2950,
    clicksMessageMerchant: 320,
    clicksWhatsAppOrder: 440,
    logo: "https://images.unsplash.com/photo-1556228720-195a672e8a03?auto=format&fit=crop&w=150&h=150&q=80"
  },
  "biz_sweet_cravings": {
    name: "Sweet Bites Bakery NG",
    storeSlug: "sweet-bites",
    description: "Freshly baked artisan cakes, chin-chin jars, meat pies, and gourmet desserts for all events.",
    currency: "NGN",
    whatsappNumber: "2348145678901",
    isVerified: true,
    ownerId: "biz_sweet_cravings",
    views: 2100,
    clicksMessageMerchant: 290,
    clicksWhatsAppOrder: 380,
    logo: "https://images.unsplash.com/photo-1578985545062-69928b1d9587?auto=format&fit=crop&w=150&h=150&q=80"
  }
};

export const DISCOVERY_FALLBACK_PRODUCTS: Product[] = [
  {
    id: "prod_glam_1",
    name: "Luxe Adire Silk Kaftan Dress",
    price: 28500,
    originalPrice: 35000,
    description: "Hand-dyed authentic Abeokuta silk adire kaftan. Breathable, fluid silhouette suitable for events and high casuals.",
    images: [
      "https://images.unsplash.com/photo-1572804013309-59a88b7e92f1?auto=format&fit=crop&w=600&q=80",
      "https://images.unsplash.com/photo-1515886657613-9f3515b0c78f?auto=format&fit=crop&w=600&q=80"
    ],
    type: "physical",
    isActive: true,
    ownerId: "biz_lagos_glam",
    isBestSeller: true,
    isNewArrival: false,
    inventoryStatus: "in_stock"
  },
  {
    id: "prod_tech_1",
    name: "Pro ANC Wireless Earbuds (65hr Battery)",
    price: 24000,
    originalPrice: 32000,
    description: "Ultra-low latency Bluetooth 5.3 earbuds with active noise cancellation, deep bass, and IPX5 water resistance.",
    images: [
      "https://images.unsplash.com/photo-1590658268037-6bf12165a8df?auto=format&fit=crop&w=600&q=80"
    ],
    type: "physical",
    isActive: true,
    ownerId: "biz_abuja_tech",
    isBestSeller: true,
    isNewArrival: true,
    inventoryStatus: "in_stock"
  },
  {
    id: "prod_glow_1",
    name: "Golden Whipped Shea & Turmeric Body Butter (250g)",
    price: 8500,
    originalPrice: 10500,
    description: "Deeply moisturizing unrefined raw shea whipped with sweet almond oil, vitamin E, and natural brightening turmeric extract.",
    images: [
      "https://images.unsplash.com/photo-1608248597359-2ff9e6cf730a?auto=format&fit=crop&w=600&q=80"
    ],
    type: "physical",
    isActive: true,
    ownerId: "biz_glow_naturals",
    isBestSeller: false,
    isNewArrival: true,
    isPromotion: true,
    inventoryStatus: "in_stock"
  },
  {
    id: "prod_glam_2",
    name: "Handcrafted Crocodile-Embossed Leather Tote",
    price: 36000,
    originalPrice: 42000,
    description: "Premium structured genuine leather tote bag crafted with reinforced brass hardware. Includes detachable shoulder strap.",
    images: [
      "https://images.unsplash.com/photo-1584917865442-de89df76afd3?auto=format&fit=crop&w=600&q=80"
    ],
    type: "physical",
    isActive: true,
    ownerId: "biz_lagos_glam",
    isBestSeller: true,
    inventoryStatus: "in_stock"
  },
  {
    id: "prod_tech_2",
    name: "Ultra-Fast 65W GaN Multi-Port Charger",
    price: 16500,
    originalPrice: 20000,
    description: "Next-gen GaN fast wall charger with dual USB-C PD and USB-A quick charge ports. Charges laptops, tablets, and phones simultaneously.",
    images: [
      "https://images.unsplash.com/photo-1583863788434-e58a36330cf0?auto=format&fit=crop&w=600&q=80"
    ],
    type: "physical",
    isActive: true,
    ownerId: "biz_abuja_tech",
    inventoryStatus: "in_stock"
  },
  {
    id: "prod_bites_1",
    name: "Gourmet Crunchy Chin-Chin Megajar (1.5kg)",
    price: 6500,
    originalPrice: 8000,
    description: "Authentic Lagos recipe chin-chin infused with fresh nutmeg and condensed milk. Sealed airtight for lasting crunchiness.",
    images: [
      "https://images.unsplash.com/photo-1509440159596-0249088772ff?auto=format&fit=crop&w=600&q=80"
    ],
    type: "physical",
    isActive: true,
    ownerId: "biz_sweet_cravings",
    isBestSeller: true,
    inventoryStatus: "in_stock"
  }
];

export const DISCOVERY_FALLBACK_REVIEWS: Review[] = [
  {
    id: "rev_fallback_1",
    productId: "prod_glam_1",
    customerName: "Blessing Adebayo",
    rating: 5,
    comment: "The adire silk is top quality! Received compliments all day at the Sunday reception.",
    createdAt: new Date(Date.now() - 86400000 * 2).toISOString(),
    ownerId: "biz_lagos_glam"
  },
  {
    id: "rev_fallback_2",
    productId: "prod_tech_1",
    customerName: "Chidi Okonkwo",
    rating: 5,
    comment: "Battery lasts for days and the active noise cancellation works very well on commercial buses.",
    createdAt: new Date(Date.now() - 86400000 * 3).toISOString(),
    ownerId: "biz_abuja_tech"
  },
  {
    id: "rev_fallback_3",
    productId: "prod_glow_1",
    customerName: "Fatima Danjuma",
    rating: 5,
    comment: "Very soft on dry skin and smells incredible without synthetic perfumes.",
    createdAt: new Date(Date.now() - 86400000 * 4).toISOString(),
    ownerId: "biz_glow_naturals"
  }
];
