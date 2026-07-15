import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Shield, Cookie, X, ChevronRight, Check, Lock } from 'lucide-react';

export function CookieConsent() {
  const [isVisible, setIsVisible] = useState(false);
  const [showPreferences, setShowPreferences] = useState(false);
  const [preferences, setPreferences] = useState({
    essential: true,
    analytics: true,
    marketing: false,
  });

  useEffect(() => {
    // Check if user has already accepted/declined cookies
    const consent = localStorage.getItem('mysellflow_cookies_accepted');
    if (!consent) {
      // Show full-screen cookie gate to users who haven't made a choice yet
      setIsVisible(true);
    }
  }, []);

  const handleAcceptAll = () => {
    localStorage.setItem('mysellflow_cookies_accepted', 'all');
    localStorage.setItem('mysellflow_cookies_preferences', JSON.stringify({
      essential: true,
      analytics: true,
      marketing: true,
    }));
    setIsVisible(false);
  };

  const handleAcceptSelected = () => {
    localStorage.setItem('mysellflow_cookies_accepted', 'custom');
    localStorage.setItem('mysellflow_cookies_preferences', JSON.stringify(preferences));
    setIsVisible(false);
  };

  const handleRejectAll = () => {
    localStorage.setItem('mysellflow_cookies_accepted', 'essential_only');
    localStorage.setItem('mysellflow_cookies_preferences', JSON.stringify({
      essential: true,
      analytics: false,
      marketing: false,
    }));
    setIsVisible(false);
  };

  return (
    <AnimatePresence>
      {isVisible && (
        <div className="fixed inset-0 z-[99999] overflow-y-auto flex items-center justify-center">
          {/* Immersive high-end glass backdrop that prevents page interaction */}
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 bg-slate-950/80 backdrop-blur-xl"
          />

          {/* Centered Premium Content Guard Card */}
          <motion.div
            initial={{ opacity: 0, y: 40, scale: 0.95 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: 40, scale: 0.95 }}
            transition={{ type: 'spring', damping: 28, stiffness: 240 }}
            className="relative w-full max-w-xl mx-4 bg-white text-slate-850 rounded-[2.5rem] shadow-[0_30px_70px_-15px_rgba(0,0,0,0.5)] border border-slate-100 p-6 md:p-9 flex flex-col gap-6 overflow-hidden my-8"
          >
            {/* Elegant abstract background circles */}
            <div className="absolute -top-24 -left-24 w-48 h-48 bg-[#5B2FD4]/5 rounded-full blur-3xl pointer-events-none" />
            <div className="absolute -bottom-24 -right-24 w-48 h-48 bg-[#5B2FD4]/5 rounded-full blur-3xl pointer-events-none" />

            {/* Header: Visual Icon and Title */}
            <div className="flex flex-col items-center text-center gap-4">
              <div className="relative">
                <div className="w-16 h-16 rounded-3xl bg-[#EDE8FB] text-[#5B2FD4] flex items-center justify-center border border-[#5B2FD4]/10 shadow-md">
                  <Cookie size={32} className="animate-bounce" style={{ animationDuration: '3s' }} />
                </div>
                <div className="absolute -bottom-1 -right-1 w-6 h-6 rounded-full bg-emerald-500 text-white flex items-center justify-center border-2 border-white shadow-sm">
                  <Shield size={12} className="stroke-[3]" />
                </div>
              </div>

              <div className="space-y-1">
                <h3 className="text-xl md:text-2xl font-black text-slate-950 tracking-tight flex items-center justify-center gap-2 italic">
                  <span>Cookie Security Gate</span>
                </h3>
                <p className="text-xs font-black text-slate-400 uppercase tracking-widest">
                  Compliance Certification • NDPR & GDPR Standard
                </p>
              </div>
            </div>

            {/* Explanatory Context */}
            <div className="text-center space-y-3 px-1">
              <p className="text-sm text-slate-600 font-semibold leading-relaxed">
                Before you step into the MySellFlow ecosystem, we require your consent to use secure cookies. These store basic credentials, session shopping carts, custom vendor link settings, and performance indicators to provide a fast, seamless sales automation flow across Nigeria.
              </p>
              <div className="inline-flex items-center gap-1.5 px-3 py-1 bg-slate-100 rounded-full text-[10px] font-extrabold text-slate-600 border border-slate-200">
                <Lock size={10} className="text-[#5B2FD4]" />
                <span>We never sell your data or share phone contacts</span>
              </div>
            </div>

            {/* Custom Preference Toggles */}
            <AnimatePresence>
              {showPreferences && (
                <motion.div
                  initial={{ height: 0, opacity: 0 }}
                  animate={{ height: 'auto', opacity: 1 }}
                  exit={{ height: 0, opacity: 0 }}
                  className="border-t border-slate-100 pt-4 space-y-3 overflow-hidden"
                >
                  <span className="text-[10px] font-black uppercase tracking-wider text-[#5B2FD4] block text-left">
                    Custom Settings
                  </span>

                  {/* Toggle 1: Essential */}
                  <div className="flex items-center justify-between p-3 bg-slate-50 rounded-2xl border border-slate-150">
                    <div className="text-left max-w-[80%]">
                      <p className="text-xs font-black text-slate-900 flex items-center gap-1.5">
                        <span>Essential Cookies</span>
                        <span className="text-[8px] bg-emerald-100 text-emerald-700 rounded px-1 py-0.2 font-black uppercase">Required</span>
                      </p>
                      <p className="text-[10px] text-slate-500 font-medium mt-0.5">Saves active login sessions, security tokens, and customer shopping carts.</p>
                    </div>
                    <div className="h-6 w-6 rounded-lg bg-emerald-100 text-emerald-600 flex items-center justify-center border border-emerald-200 shrink-0">
                      <Check size={14} className="stroke-[3]" />
                    </div>
                  </div>

                  {/* Toggle 2: Analytics */}
                  <div
                    onClick={() => setPreferences(p => ({ ...p, analytics: !p.analytics }))}
                    className="flex items-center justify-between p-3 bg-slate-50 rounded-2xl border border-slate-150 cursor-pointer hover:bg-slate-100/60 transition-colors select-none"
                  >
                    <div className="text-left max-w-[80%]">
                      <p className="text-xs font-black text-slate-900 flex items-center gap-1.5">
                        <span>Analytics & Diagnostics</span>
                      </p>
                      <p className="text-[10px] text-slate-500 font-medium mt-0.5">Measures page load speeds, high-traffic sales funnels, and link click rates.</p>
                    </div>
                    <div
                      className={`h-6 w-11 rounded-full p-0.5 transition-colors duration-200 shrink-0 ${
                        preferences.analytics ? 'bg-[#5B2FD4]' : 'bg-slate-300'
                      }`}
                    >
                      <div
                        className={`h-5 w-5 bg-white rounded-full shadow-md transition-transform duration-200 ${
                          preferences.analytics ? 'translate-x-5' : 'translate-x-0'
                        }`}
                      />
                    </div>
                  </div>

                  {/* Toggle 3: Marketing */}
                  <div
                    onClick={() => setPreferences(p => ({ ...p, marketing: !p.marketing }))}
                    className="flex items-center justify-between p-3 bg-slate-50 rounded-2xl border border-slate-150 cursor-pointer hover:bg-slate-100/60 transition-colors select-none"
                  >
                    <div className="text-left max-w-[80%]">
                      <p className="text-xs font-black text-slate-900 flex items-center gap-1.5">
                        <span>Workspace Notifications</span>
                      </p>
                      <p className="text-[10px] text-slate-500 font-medium mt-0.5">Optimizes customized business tips and smart customer follow-up suggestions.</p>
                    </div>
                    <div
                      className={`h-6 w-11 rounded-full p-0.5 transition-colors duration-200 shrink-0 ${
                        preferences.marketing ? 'bg-[#5B2FD4]' : 'bg-slate-300'
                      }`}
                    >
                      <div
                        className={`h-5 w-5 bg-white rounded-full shadow-md transition-transform duration-200 ${
                          preferences.marketing ? 'translate-x-5' : 'translate-x-0'
                        }`}
                      />
                    </div>
                  </div>
                </motion.div>
              )}
            </AnimatePresence>

            {/* Lower Row: Action Control Panel */}
            <div className="flex flex-col gap-3 border-t border-slate-100 pt-5 mt-1">
              <div className="flex flex-col sm:flex-row gap-3 w-full">
                {showPreferences ? (
                  <>
                    <button
                      onClick={() => setShowPreferences(false)}
                      className="flex-1 bg-slate-100 hover:bg-slate-200 text-slate-700 text-xs font-bold py-3 px-4 rounded-2xl transition-all cursor-pointer active:scale-95"
                    >
                      Back
                    </button>
                    <button
                      onClick={handleAcceptSelected}
                      className="flex-1 bg-slate-900 hover:bg-slate-800 text-white text-xs font-black uppercase tracking-wider py-3 px-4 rounded-2xl transition-all cursor-pointer active:scale-95 shadow-md shadow-slate-900/10"
                    >
                      Save Selected
                    </button>
                  </>
                ) : (
                  <>
                    <button
                      onClick={handleRejectAll}
                      className="flex-1 bg-slate-100 hover:bg-slate-200 text-slate-650 text-xs font-bold py-3.5 px-4 rounded-2xl transition-all cursor-pointer active:scale-95"
                    >
                      Essential Only
                    </button>
                    <button
                      onClick={handleAcceptAll}
                      className="flex-[1.5] bg-[#5B2FD4] hover:bg-[#4c24b8] text-white text-xs font-black uppercase tracking-wider py-3.5 px-6 rounded-2xl transition-all cursor-pointer active:scale-95 flex items-center justify-center gap-2 shadow-lg shadow-[#5B2FD4]/20"
                    >
                      <span>Accept All Cookies</span>
                      <ChevronRight size={14} className="stroke-[3]" />
                    </button>
                  </>
                )}
              </div>

              {!showPreferences && (
                <button
                  onClick={() => setShowPreferences(true)}
                  className="text-[#5B2FD4] hover:text-[#4c24b8] text-[10px] font-black uppercase tracking-widest text-center cursor-pointer hover:underline py-1"
                >
                  Customize Granular Permissions
                </button>
              )}
            </div>

            {/* Footer Trust badging */}
            <div className="flex justify-center items-center gap-4 text-[9px] font-extrabold text-slate-400 uppercase tracking-widest mt-1">
              <span className="flex items-center gap-1"><Shield size={10} /> NDPR Nigeria Certified</span>
              <span className="w-1 h-1 bg-slate-300 rounded-full" />
              <span>GDPR Compliant Secure Link</span>
            </div>
          </motion.div>
        </div>
      )}
    </AnimatePresence>
  );
}
