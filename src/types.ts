/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

export type ProductType = 'physical' | 'digital' | 'service';

export interface Product {
  id: string;
  name: string;
  price: number;
  originalPrice?: number;
  description: string;
  images: string[];
  type: ProductType;
  isActive: boolean;
  stock?: number;
  ownerId: string;
}

export type LeadStatus = 'new' | 'contacted' | 'interested' | 'paid' | 'lost';

export interface Lead {
  id: string;
  name: string;
  phone: string;
  source: string;
  interest: string; // Product name or category
  status: LeadStatus;
  notes: string;
  createdAt: string;
  ownerId: string;
}

export interface FollowUp {
  id: string;
  leadId: string;
  reminderTime: string;
  note: string;
  completed: boolean;
}

export type OrderStatus = 'pending' | 'paid' | 'processing' | 'delivered' | 'completed';

export interface Order {
  id: string;
  leadId: string;
  productId: string;
  amount: number;
  paymentStatus: 'pending' | 'paid';
  fulfillmentStatus: OrderStatus;
  notes: string;
  createdAt: string;
}

export interface BusinessProfile {
  name: string;
  logo?: string;
  description: string;
  currency: string;
  whatsappNumber: string;
  whatsappToken?: string;
  whatsappPhoneId?: string;
  whatsappBusinessAccountId?: string;
  storeSlug: string;
  isVerified: boolean;
  ownerId: string;
  metaTitle?: string;
  metaDescription?: string;
  storefrontUrl?: string;
  subdomain?: string;
}

export interface Review {
  id: string;
  productId: string;
  customerName: string;
  rating: number; // 1-5
  comment: string;
  createdAt: string;
  ownerId: string; // Business owner
}
