import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { 
  X, 
  UserPlus, 
  Store, 
  Mail, 
  Lock, 
  Phone, 
  Globe, 
  Copy, 
  Check, 
  Eye, 
  EyeOff, 
  Sparkles, 
  Loader2, 
  ArrowRight,
  ExternalLink
} from 'lucide-react';
import { createMerchantAccountForOther, CreatedMerchantResult } from '../utils/accountCreator';

interface CreateAccountModalProps {
  isOpen: boolean;
  onClose: () => void;
  showToast?: (m: string, t?: 'success' | 'error' | 'info') => void;
  onAccountCreated?: (result: CreatedMerchantResult) => void;
}

export const CreateAccountModal: React.FC<CreateAccountModalProps> = ({
  isOpen,
  onClose,
  showToast,
  onAccountCreated
}) => {
  const [merchantName, setMerchantName] = useState('');
  const [storeSlug, setStoreSlug] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [whatsappNumber, setWhatsappNumber] = useState('');
  const [currency, setCurrency] = useState('USD');
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [createdResult, setCreatedResult] = useState<CreatedMerchantResult | null>(null);
  const [copiedField, setCopiedField] = useState<'full' | 'email' | 'password' | null>(null);
  const [showCreatedPassword, setShowCreatedPassword] = useState(true);

  // Auto-sync slug from merchant name if slug wasn't manually edited
  const [isSlugManual, setIsSlugManual] = useState(false);

  useEffect(() => {
    if (!isSlugManual && merchantName) {
      const slugified = merchantName
        .toLowerCase()
        .replace(/[^a-z0-9]/g, '')
        .slice(0, 20);
      setStoreSlug(slugified);
    }
  }, [merchantName, isSlugManual]);

  // Clean, high-entropy password generator without ambiguous characters (no 0/O, 1/I/l) or breaking symbols
  const generatePassword = () => {
    const charset = '23456789ABCDEFGHJKLMNPQRSTUVWXYZabcdefghijkmnpqrstuvwxyz';
    let res = 'Flow';
    for (let i = 0; i < 6; i++) {
      res += charset.charAt(Math.floor(Math.random() * charset.length));
    }
    setPassword(res);
    setShowPassword(true);
  };

  const handleReset = () => {
    setMerchantName('');
    setStoreSlug('');
    setEmail('');
    setPassword('');
    setWhatsappNumber('');
    setCurrency('USD');
    setIsSlugManual(false);
    setCreatedResult(null);
    setCopiedField(null);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    const cleanName = merchantName.trim();
    const cleanEmail = email.trim();
    const cleanPassword = password.trim();

    if (!cleanName || !cleanEmail || !cleanPassword) {
      showToast?.('Please fill out Store Name, Email, and Password.', 'error');
      return;
    }

    if (cleanPassword.length < 6) {
      showToast?.('Password must be at least 6 characters.', 'error');
      return;
    }

    setLoading(true);
    try {
      const result = await createMerchantAccountForOther({
        email: cleanEmail,
        password: cleanPassword,
        merchantName: cleanName,
        storeSlug: storeSlug.trim() || undefined,
        currency,
        whatsappNumber: whatsappNumber.trim()
      });

      setCreatedResult(result);
      setShowCreatedPassword(true);
      showToast?.(`Account setup verified for ${result.merchantName}!`, 'success');
      onAccountCreated?.(result);
    } catch (err: any) {
      console.error('Account creation error:', err);
      let msg = err.message || 'Failed to create merchant account.';
      if (err?.code === 'auth/email-already-in-use') {
        msg = 'An account with this email address already exists.';
      } else if (err?.code === 'auth/invalid-email') {
        msg = 'The email address is invalid.';
      } else if (err?.code === 'auth/weak-password') {
        msg = 'Password is too weak. Please use at least 6 characters.';
      }
      showToast?.(msg, 'error');
    } finally {
      setLoading(false);
    }
  };

  const copyField = (field: 'email' | 'password') => {
    if (!createdResult) return;
    const val = field === 'email' ? createdResult.email : (createdResult.password || '');
    navigator.clipboard.writeText(val);
    setCopiedField(field);
    showToast?.(`${field === 'email' ? 'Email' : 'Password'} copied!`, 'success');
    setTimeout(() => setCopiedField(null), 2500);
  };

  const copyCredentials = () => {
    if (!createdResult) return;
    const text = `🎉 SellFlow Merchant Account Credentials\n\n` +
      `🏪 Store: ${createdResult.merchantName}\n` +
      `🔗 Storefront: ${createdResult.storefrontUrl}\n` +
      `🔑 Login Email: ${createdResult.email}\n` +
      `🔒 Password: ${createdResult.password || '******'}\n` +
      `📲 Login URL: ${createdResult.loginUrl}\n\n` +
      `Sign in to manage inventory, view orders, and customize your storefront.`;

    navigator.clipboard.writeText(text);
    setCopiedField('full');
    showToast?.('Full merchant credentials copied to clipboard!', 'success');
    setTimeout(() => setCopiedField(null), 3000);
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 sm:p-6 bg-black/80 backdrop-blur-sm overflow-y-auto">
      <motion.div
        initial={{ opacity: 0, scale: 0.95, y: 15 }}
        animate={{ opacity: 1, scale: 1, y: 0 }}
        exit={{ opacity: 0, scale: 0.95, y: 15 }}
        className="bg-slate-900 border border-slate-800 rounded-3xl w-full max-w-xl p-6 sm:p-8 shadow-2xl text-slate-100 my-8 relative overflow-hidden"
      >
        {/* Subtle background glow */}
        <div className="absolute -top-24 -right-24 w-48 h-48 bg-purple-500/20 rounded-full blur-3xl pointer-events-none" />
        <div className="absolute -bottom-24 -left-24 w-48 h-48 bg-sky-500/20 rounded-full blur-3xl pointer-events-none" />

        {/* Modal Header */}
        <div className="flex items-center justify-between pb-5 border-b border-slate-800 relative z-10">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-purple-500/20 border border-purple-500/30 flex items-center justify-center text-purple-400">
              <UserPlus size={20} />
            </div>
            <div>
              <h3 className="text-lg font-black tracking-tight text-white flex items-center gap-2">
                Create Merchant Account
                <span className="bg-emerald-500/10 text-emerald-400 border border-emerald-500/20 text-[10px] font-bold px-2 py-0.5 rounded-full uppercase tracking-wider">
                  Instant Setup
                </span>
              </h3>
              <p className="text-xs text-slate-400">
                Setup an account directly for a client, partner, or team member without logging out.
              </p>
            </div>
          </div>
          <button
            onClick={() => {
              handleReset();
              onClose();
            }}
            className="p-2 rounded-xl text-slate-400 hover:text-white hover:bg-slate-800 transition-colors"
          >
            <X size={18} />
          </button>
        </div>

        {/* Success View */}
        {createdResult ? (
          <div className="py-6 space-y-6 relative z-10">
            <div className="text-center space-y-2">
              <div className="w-14 h-14 rounded-2xl bg-emerald-500/20 border border-emerald-500/30 flex items-center justify-center text-emerald-400 mx-auto">
                <Check size={28} className="stroke-[3]" />
              </div>
              <h4 className="text-xl font-black text-white">Account Created Successfully!</h4>
              <p className="text-xs text-slate-400 max-w-sm mx-auto">
                The account is active and can be accessed immediately without requiring email verification.
              </p>
            </div>

            {/* Credentials Card */}
            <div className="bg-slate-950/80 border border-slate-800 rounded-2xl p-5 space-y-3.5">
              <div className="flex items-center justify-between pb-2 border-b border-slate-800/80">
                <span className="text-[10px] font-bold uppercase tracking-widest text-slate-500">Merchant Credentials</span>
                <button
                  type="button"
                  onClick={copyCredentials}
                  className="text-xs font-bold text-purple-400 hover:text-purple-300 flex items-center gap-1.5 transition-colors"
                >
                  {copiedField === 'full' ? <Check size={13} className="text-emerald-400" /> : <Copy size={13} />}
                  <span>{copiedField === 'full' ? 'All Copied!' : 'Copy All'}</span>
                </button>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-xs">
                <div>
                  <span className="text-slate-500 block text-[10px] uppercase font-semibold">Store Name</span>
                  <span className="font-bold text-white">{createdResult.merchantName}</span>
                </div>
                <div>
                  <span className="text-slate-500 block text-[10px] uppercase font-semibold">Store URL</span>
                  <a 
                    href={createdResult.storefrontUrl} 
                    target="_blank" 
                    rel="noopener noreferrer"
                    className="font-bold text-sky-400 hover:underline flex items-center gap-1 truncate"
                  >
                    <span>{createdResult.storeSlug}.mysellflow.store</span>
                    <ExternalLink size={10} />
                  </a>
                </div>
                
                {/* Email with 1-click copy */}
                <div className="bg-slate-900/60 p-2.5 rounded-xl border border-slate-800/80 flex items-center justify-between">
                  <div className="min-w-0 pr-2">
                    <span className="text-slate-500 block text-[9px] uppercase font-bold tracking-wider">Login Email</span>
                    <span className="font-mono text-slate-200 text-xs font-semibold truncate block">{createdResult.email}</span>
                  </div>
                  <button
                    type="button"
                    onClick={() => copyField('email')}
                    title="Copy Email"
                    className="p-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-300 hover:text-white transition-colors cursor-pointer shrink-0"
                  >
                    {copiedField === 'email' ? <Check size={13} className="text-emerald-400" /> : <Copy size={13} />}
                  </button>
                </div>

                {/* Password with eye toggle & 1-click copy */}
                <div className="bg-slate-900/60 p-2.5 rounded-xl border border-slate-800/80 flex items-center justify-between">
                  <div className="min-w-0 pr-2">
                    <div className="flex items-center gap-2">
                      <span className="text-slate-500 text-[9px] uppercase font-bold tracking-wider">Password</span>
                      <button
                        type="button"
                        onClick={() => setShowCreatedPassword(!showCreatedPassword)}
                        className="text-slate-500 hover:text-slate-300 text-[9px]"
                      >
                        {showCreatedPassword ? 'Hide' : 'Show'}
                      </button>
                    </div>
                    <span className="font-mono font-bold text-purple-300 text-xs truncate block">
                      {showCreatedPassword ? createdResult.password : '••••••••••'}
                    </span>
                  </div>
                  <button
                    type="button"
                    onClick={() => copyField('password')}
                    title="Copy exact password"
                    className="p-1.5 rounded-lg bg-purple-600/30 hover:bg-purple-600/50 text-purple-300 hover:text-white transition-colors cursor-pointer shrink-0"
                  >
                    {copiedField === 'password' ? <Check size={13} className="text-emerald-400" /> : <Copy size={13} />}
                  </button>
                </div>
              </div>

              <div className="pt-2 text-[10px] text-emerald-400/90 flex items-center gap-1.5 font-medium">
                <Check size={12} className="shrink-0 text-emerald-400" />
                <span>Verified with Firebase. Credentials work immediately without verification links.</span>
              </div>
            </div>

            <div className="flex flex-col sm:flex-row gap-3 pt-2">
              <button
                type="button"
                onClick={copyCredentials}
                className="flex-1 bg-purple-600 hover:bg-purple-500 text-white py-3 px-4 rounded-xl text-xs font-bold flex items-center justify-center gap-2 shadow-lg transition-all cursor-pointer"
              >
                {copiedField === 'full' ? <Check size={16} /> : <Copy size={16} />}
                {copiedField === 'full' ? 'Credentials Copied!' : 'Copy Credentials to Share'}
              </button>
              <button
                type="button"
                onClick={handleReset}
                className="bg-slate-800 hover:bg-slate-700 text-slate-200 py-3 px-5 rounded-xl text-xs font-bold transition-colors cursor-pointer"
              >
                Create Another Account
              </button>
            </div>
          </div>
        ) : (
          /* Form View */
          <form onSubmit={handleSubmit} className="pt-5 space-y-4 relative z-10">
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              {/* Store / Merchant Name */}
              <div className="space-y-1.5">
                <label className="text-[11px] font-bold text-slate-300 uppercase tracking-wider flex items-center gap-1.5">
                  <Store size={13} className="text-purple-400" />
                  Store / Business Name *
                </label>
                <input
                  type="text"
                  required
                  placeholder="e.g. Bella Boutique"
                  value={merchantName}
                  onChange={(e) => setMerchantName(e.target.value)}
                  className="w-full bg-slate-950/80 border border-slate-800 rounded-xl px-3.5 py-2.5 text-xs text-white placeholder-slate-600 focus:outline-none focus:border-purple-500 transition-colors"
                />
              </div>

              {/* Store Slug / Subdomain */}
              <div className="space-y-1.5">
                <label className="text-[11px] font-bold text-slate-300 uppercase tracking-wider flex items-center gap-1.5">
                  <Globe size={13} className="text-sky-400" />
                  Store Slug (Subdomain) *
                </label>
                <div className="flex items-center">
                  <input
                    type="text"
                    required
                    placeholder="bellaboutique"
                    value={storeSlug}
                    onChange={(e) => {
                      setIsSlugManual(true);
                      setStoreSlug(e.target.value.toLowerCase().replace(/[^a-z0-9_\-]/g, ''));
                    }}
                    autoCapitalize="none"
                    autoCorrect="off"
                    spellCheck="false"
                    className="w-full bg-slate-950/80 border border-slate-800 rounded-l-xl px-3.5 py-2.5 text-xs font-mono text-purple-300 placeholder-slate-600 focus:outline-none focus:border-purple-500 transition-colors"
                  />
                  <span className="bg-slate-800/80 border border-l-0 border-slate-800 text-slate-400 px-2.5 py-2.5 rounded-r-xl text-[10px] font-mono whitespace-nowrap">
                    .mysellflow.store
                  </span>
                </div>
              </div>
            </div>

            {/* Email Address */}
            <div className="space-y-1.5">
              <label className="text-[11px] font-bold text-slate-300 uppercase tracking-wider flex items-center gap-1.5">
                <Mail size={13} className="text-amber-400" />
                Merchant Login Email *
              </label>
              <input
                type="email"
                required
                placeholder="merchant@example.com"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                autoCapitalize="none"
                autoCorrect="off"
                spellCheck="false"
                className="w-full bg-slate-950/80 border border-slate-800 rounded-xl px-3.5 py-2.5 text-xs text-white placeholder-slate-600 focus:outline-none focus:border-purple-500 transition-colors"
              />
            </div>

            {/* Password Field with Generator */}
            <div className="space-y-1.5">
              <div className="flex items-center justify-between">
                <label className="text-[11px] font-bold text-slate-300 uppercase tracking-wider flex items-center gap-1.5">
                  <Lock size={13} className="text-emerald-400" />
                  Account Password *
                </label>
                <button
                  type="button"
                  onClick={generatePassword}
                  className="text-[10px] font-bold text-purple-400 hover:text-purple-300 flex items-center gap-1 transition-colors cursor-pointer"
                >
                  <Sparkles size={11} />
                  Generate Strong Password
                </button>
              </div>
              <div className="relative">
                <input
                  type={showPassword ? 'text' : 'password'}
                  required
                  placeholder="Min. 6 characters"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  autoCapitalize="none"
                  autoCorrect="off"
                  spellCheck="false"
                  className="w-full bg-slate-950/80 border border-slate-800 rounded-xl px-3.5 py-2.5 pr-10 text-xs font-mono text-white placeholder-slate-600 focus:outline-none focus:border-purple-500 transition-colors"
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="absolute right-3 top-2.5 text-slate-500 hover:text-slate-300 cursor-pointer"
                >
                  {showPassword ? <EyeOff size={14} /> : <Eye size={14} />}
                </button>
              </div>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 pt-1">
              {/* WhatsApp Contact */}
              <div className="space-y-1.5">
                <label className="text-[11px] font-bold text-slate-300 uppercase tracking-wider flex items-center gap-1.5">
                  <Phone size={13} className="text-emerald-400" />
                  WhatsApp Number (Optional)
                </label>
                <input
                  type="tel"
                  placeholder="+233... or +234..."
                  value={whatsappNumber}
                  onChange={(e) => setWhatsappNumber(e.target.value)}
                  className="w-full bg-slate-950/80 border border-slate-800 rounded-xl px-3.5 py-2.5 text-xs text-white placeholder-slate-600 focus:outline-none focus:border-purple-500 transition-colors"
                />
              </div>

              {/* Currency */}
              <div className="space-y-1.5">
                <label className="text-[11px] font-bold text-slate-300 uppercase tracking-wider">
                  Store Currency
                </label>
                <select
                  value={currency}
                  onChange={(e) => setCurrency(e.target.value)}
                  className="w-full bg-slate-950/80 border border-slate-800 rounded-xl px-3.5 py-2.5 text-xs text-white focus:outline-none focus:border-purple-500 transition-colors"
                >
                  <option value="USD">USD ($ - US Dollar)</option>
                  <option value="NGN">NGN (₦ - Nigerian Naira)</option>
                  <option value="GHS">GHS (GH₵ - Ghana Cedi)</option>
                  <option value="KES">KES (KSh - Kenyan Shilling)</option>
                  <option value="ZAR">ZAR (R - South African Rand)</option>
                  <option value="GBP">GBP (£ - British Pound)</option>
                  <option value="EUR">EUR (€ - Euro)</option>
                  <option value="CAD">CAD ($ - Canadian Dollar)</option>
                </select>
              </div>
            </div>

            {/* Note on Verification */}
            <div className="p-3 bg-purple-950/30 border border-purple-900/40 rounded-xl text-[11px] text-purple-300 flex items-start gap-2">
              <Sparkles size={14} className="shrink-0 mt-0.5 text-purple-400" />
              <span>
                <strong>No email verification required:</strong> The new account is activated immediately and the merchant can log in with these credentials right away.
              </span>
            </div>

            {/* Actions */}
            <div className="flex items-center justify-end gap-3 pt-3 border-t border-slate-800">
              <button
                type="button"
                onClick={() => {
                  handleReset();
                  onClose();
                }}
                className="px-4 py-2.5 rounded-xl text-xs font-bold text-slate-400 hover:text-white hover:bg-slate-800 transition-colors"
              >
                Cancel
              </button>
              <button
                type="submit"
                disabled={loading}
                className="bg-gradient-to-r from-purple-600 to-indigo-600 hover:from-purple-500 hover:to-indigo-500 disabled:opacity-60 text-white font-bold text-xs px-6 py-2.5 rounded-xl flex items-center gap-2 shadow-lg transition-all"
              >
                {loading ? (
                  <>
                    <Loader2 size={14} className="animate-spin" />
                    <span>Creating Account...</span>
                  </>
                ) : (
                  <>
                    <UserPlus size={14} />
                    <span>Create Merchant Account</span>
                  </>
                )}
              </button>
            </div>
          </form>
        )}
      </motion.div>
    </div>
  );
};

export default CreateAccountModal;
