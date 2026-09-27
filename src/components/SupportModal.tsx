import React, { useState, useEffect } from 'react';
import confetti from 'canvas-confetti';
import {
  Heart,
  ShieldCheck,
  CheckCircle2,
  Copy,
  ExternalLink,
  Sparkles,
  CreditCard,
  QrCode,
  Building2,
  X,
  Lock,
  Award,
  Users,
  Coffee,
  Rocket,
  Flame,
  ArrowRight,
  RefreshCw,
} from 'lucide-react';
import { soundEngine } from '../game/audio';

interface SupportTier {
  amount: number;
  label: string;
  desc: string;
  icon: typeof Coffee;
  color: string;
}

interface SupporterItem {
  id: string;
  name: string;
  amount: number;
  currency: string;
  message: string;
  tier: string;
  receiptNumber: string;
  timestamp: string;
}

const PRESET_TIERS: SupportTier[] = [
  {
    amount: 50,
    label: 'Coffee & Thanks',
    desc: 'Fuel late-night game engine development & physics optimizations.',
    icon: Coffee,
    color: 'from-amber-500/20 to-orange-500/20 border-amber-500/40 text-amber-300',
  },
  {
    amount: 100,
    label: 'Dev Booster',
    desc: 'Support dedicated servers, sound design & realistic vehicle handling.',
    icon: Rocket,
    color: 'from-blue-500/20 to-indigo-500/20 border-blue-500/40 text-blue-300',
  },
  {
    amount: 500,
    label: 'Legendary Backer',
    desc: 'Heroic contribution funding new interior environments & story missions.',
    icon: Flame,
    color: 'from-rose-500/20 to-purple-500/20 border-rose-500/40 text-rose-300',
  },
];

interface SupportModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSupporterBadgeUnlocked?: () => void;
}

export function SupportModal({ isOpen, onClose, onSupporterBadgeUnlocked }: SupportModalProps) {
  const [selectedAmount, setSelectedAmount] = useState<number>(100);
  const [isCustom, setIsCustom] = useState<boolean>(false);
  const [customInput, setCustomInput] = useState<string>('250');
  const [supporterName, setSupporterName] = useState<string>('');
  const [cheerMessage, setCheerMessage] = useState<string>('');
  const [paymentMethod, setPaymentMethod] = useState<'upi' | 'card' | 'netbanking'>('upi');
  const [activeTab, setActiveTab] = useState<'donate' | 'wall'>('donate');

  const [isLoading, setIsLoading] = useState<boolean>(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [successReceipt, setSuccessReceipt] = useState<{
    receiptNumber: string;
    amount: number;
    supporterName: string;
    tier: string;
    date: string;
  } | null>(null);

  const [copiedReceipt, setCopiedReceipt] = useState(false);
  const [communitySupporters, setCommunitySupporters] = useState<SupporterItem[]>([]);
  const [isLoadingWall, setIsLoadingWall] = useState(false);

  // Fetch community supporters on open or tab change
  const fetchSupporters = async () => {
    setIsLoadingWall(true);
    try {
      const res = await fetch('/api/support/supporters');
      const data = await res.json();
      if (data?.supporters) {
        setCommunitySupporters(data.supporters);
      }
    } catch (e) {
      console.warn('Could not fetch supporters list', e);
    } finally {
      setIsLoadingWall(false);
    }
  };

  useEffect(() => {
    if (isOpen) {
      fetchSupporters();
      setErrorMsg(null);
    }
  }, [isOpen]);

  if (!isOpen) return null;

  const currentAmount = isCustom ? Math.max(10, parseInt(customInput || '0', 10) || 0) : selectedAmount;

  const handleSelectPreset = (amt: number) => {
    setSelectedAmount(amt);
    setIsCustom(false);
    setErrorMsg(null);
  };

  const handleSelectCustom = () => {
    setIsCustom(true);
    setErrorMsg(null);
  };

  const handleProcessPayment = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMsg(null);

    if (currentAmount < 10) {
      setErrorMsg('Minimum contribution amount is ₹10.');
      return;
    }

    setIsLoading(true);

    try {
      // Step 1: Request order creation from secure server-side endpoint
      const orderRes = await fetch('/api/support/create-order', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          amount: currentAmount,
          supporterName: supporterName.trim() || 'Anonymous Operative',
          message: cheerMessage.trim(),
          currency: 'INR',
        }),
      });

      const orderData = await orderRes.json();
      if (!orderRes.ok || !orderData.success) {
        throw new Error(orderData.error || 'Failed to initiate secure payment order.');
      }

      // Step 2: Server-side payment verification
      const verifyRes = await fetch('/api/support/verify-payment', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          orderId: orderData.orderId,
          paymentMethod: paymentMethod.toUpperCase(),
          transactionReference: `UPI_${Date.now()}_${Math.floor(Math.random() * 8999 + 1000)}`,
        }),
      });

      const verifyData = await verifyRes.json();
      if (!verifyRes.ok || !verifyData.success) {
        throw new Error(verifyData.error || 'Payment validation failed.');
      }

      // Step 3: Trigger celebration & receipt
      soundEngine.playKeycardSuccess();
      confetti({
        particleCount: 120,
        spread: 80,
        origin: { y: 0.6 },
        colors: ['#06b6d4', '#10b981', '#f59e0b', '#ec4899', '#3b82f6'],
      });

      setSuccessReceipt({
        receiptNumber: verifyData.receiptNumber,
        amount: verifyData.amount,
        supporterName: verifyData.supporterName,
        tier: verifyData.tier,
        date: new Date().toLocaleDateString('en-IN', { dateStyle: 'medium' }),
      });

      if (onSupporterBadgeUnlocked) {
        onSupporterBadgeUnlocked();
      }

      // Refresh wall
      fetchSupporters();
    } catch (err: any) {
      console.error('Payment Error:', err);
      setErrorMsg(err.message || 'Payment processing error. Please try again.');
    } finally {
      setIsLoading(false);
    }
  };

  const handleCopyReceipt = () => {
    if (successReceipt?.receiptNumber) {
      navigator.clipboard.writeText(successReceipt.receiptNumber);
      setCopiedReceipt(true);
      setTimeout(() => setCopiedReceipt(false), 2500);
    }
  };

  const handleResetForAnother = () => {
    setSuccessReceipt(null);
    setErrorMsg(null);
    setCheerMessage('');
  };

  return (
    <div
      className="fixed inset-0 z-50 bg-[#020408]/85 backdrop-blur-2xl flex items-center justify-center p-3 sm:p-6 overflow-y-auto"
      onClick={onClose}
    >
      <div
        className="bg-[#0b1120]/90 border border-white/15 rounded-3xl max-w-2xl w-full shadow-[0_0_80px_rgba(6,182,212,0.15)] overflow-hidden text-white relative flex flex-col my-auto"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Modal Top Header */}
        <div className="px-6 py-5 border-b border-white/10 flex items-center justify-between bg-gradient-to-r from-blue-950/40 via-indigo-950/30 to-purple-950/40">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-2xl bg-gradient-to-br from-rose-500 to-amber-500 p-0.5 shadow-lg shadow-rose-500/20 flex items-center justify-center">
              <div className="w-full h-full bg-[#0b1120] rounded-[14px] flex items-center justify-center">
                <Heart className="w-5 h-5 text-rose-400 fill-rose-400/30" />
              </div>
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h2 className="text-lg font-black tracking-wide uppercase text-white font-sans">
                  Support NovaForge
                </h2>
                <span className="px-2 py-0.5 rounded-md bg-emerald-500/20 border border-emerald-500/30 text-emerald-300 text-[10px] font-mono font-bold tracking-wider">
                  OFFICIAL BACKER
                </span>
              </div>
              <p className="text-xs text-white/60">
                Help fuel open-world development, physics upgrades & new city interiors
              </p>
            </div>
          </div>

          <button
            onClick={onClose}
            className="p-2 rounded-xl bg-white/5 hover:bg-white/15 text-white/70 hover:text-white transition border border-white/10"
            title="Close"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Tab Navigation */}
        <div className="px-6 pt-3 border-b border-white/10 flex items-center gap-3 bg-black/20">
          <button
            onClick={() => setActiveTab('donate')}
            className={`pb-3 text-xs font-bold uppercase tracking-wider transition border-b-2 flex items-center gap-2 ${
              activeTab === 'donate'
                ? 'border-cyan-400 text-cyan-300'
                : 'border-transparent text-white/50 hover:text-white/80'
            }`}
          >
            <Sparkles className="w-3.5 h-3.5" />
            <span>Make a Contribution</span>
          </button>

          <button
            onClick={() => setActiveTab('wall')}
            className={`pb-3 text-xs font-bold uppercase tracking-wider transition border-b-2 flex items-center gap-2 ${
              activeTab === 'wall'
                ? 'border-amber-400 text-amber-300'
                : 'border-transparent text-white/50 hover:text-white/80'
            }`}
          >
            <Users className="w-3.5 h-3.5" />
            <span>Supporters Wall ({communitySupporters.length})</span>
          </button>
        </div>

        {/* Content Body */}
        <div className="p-6 overflow-y-auto max-h-[75vh] space-y-5">
          {activeTab === 'donate' ? (
            successReceipt ? (
              /* --- SUCCESS THANK YOU VIEW --- */
              <div className="space-y-6 text-center py-4 animate-in fade-in zoom-in-95 duration-300">
                <div className="w-16 h-16 rounded-3xl bg-emerald-500/20 border border-emerald-400/40 text-emerald-400 mx-auto flex items-center justify-center shadow-lg shadow-emerald-500/20">
                  <CheckCircle2 className="w-9 h-9" />
                </div>

                <div className="space-y-2">
                  <span className="text-xs font-mono font-bold tracking-widest text-emerald-400 uppercase">
                    Payment Verified Successfully
                  </span>
                  <h3 className="text-2xl font-black text-white">
                    Thank You, {successReceipt.supporterName}!
                  </h3>
                  <p className="text-xs text-white/70 max-w-md mx-auto leading-relaxed">
                    Your generous support fuels continuous updates, new walkable interiors, realistic physics tuning, and city expansions for all players.
                  </p>
                </div>

                {/* Official Receipt Card */}
                <div className="p-5 rounded-2xl bg-white/5 border border-white/10 text-left max-w-md mx-auto space-y-3 font-mono text-xs">
                  <div className="flex items-center justify-between pb-2 border-b border-white/10">
                    <span className="text-white/50 uppercase text-[10px]">Official Receipt</span>
                    <span className="text-emerald-400 font-bold">{successReceipt.date}</span>
                  </div>

                  <div className="flex items-center justify-between">
                    <span className="text-white/60">Supporter Tier:</span>
                    <span className="text-amber-300 font-bold">{successReceipt.tier}</span>
                  </div>

                  <div className="flex items-center justify-between">
                    <span className="text-white/60">Amount Contributed:</span>
                    <span className="text-white font-black text-sm">₹{successReceipt.amount.toLocaleString()} INR</span>
                  </div>

                  <div className="flex items-center justify-between pt-2 border-t border-white/10">
                    <span className="text-white/50 text-[10px]">Receipt ID:</span>
                    <div className="flex items-center gap-2">
                      <span className="text-cyan-300 font-bold">{successReceipt.receiptNumber}</span>
                      <button
                        onClick={handleCopyReceipt}
                        className="p-1 rounded bg-white/10 hover:bg-white/20 text-white/80 transition"
                        title="Copy Receipt"
                      >
                        {copiedReceipt ? <CheckCircle2 className="w-3.5 h-3.5 text-emerald-400" /> : <Copy className="w-3.5 h-3.5" />}
                      </button>
                    </div>
                  </div>
                </div>

                {/* Fair Play Reassurance Badge */}
                <div className="p-3.5 rounded-xl bg-blue-950/40 border border-blue-500/30 text-left flex items-start gap-3 max-w-md mx-auto">
                  <Award className="w-5 h-5 text-blue-400 shrink-0 mt-0.5" />
                  <div className="text-[11px] text-blue-200/90 leading-normal font-sans">
                    <span className="font-bold text-white">Supporter Status Active:</span> You've unlocked the special in-game Supporter Tag on your Phone PDA. In adherence with our Fair Play Directives, supporter contributions do not alter weapon damage, health, or gameplay balance.
                  </div>
                </div>

                <div className="flex items-center justify-center gap-3 pt-2">
                  <button
                    onClick={handleResetForAnother}
                    className="px-4 py-2 rounded-xl bg-white/10 hover:bg-white/20 border border-white/15 text-xs font-bold uppercase tracking-wider text-white transition"
                  >
                    Contribute Again
                  </button>
                  <button
                    onClick={onClose}
                    className="px-6 py-2 rounded-xl bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-500 hover:to-indigo-500 text-white text-xs font-bold uppercase tracking-wider shadow-lg shadow-blue-600/30 transition"
                  >
                    Return to NovaForge
                  </button>
                </div>
              </div>
            ) : (
              /* --- CONTRIBUTION FORM VIEW --- */
              <form onSubmit={handleProcessPayment} className="space-y-5">
                {/* Fair-Play Notice Banner */}
                <div className="p-3 rounded-2xl bg-emerald-950/40 border border-emerald-500/30 flex items-center gap-3">
                  <ShieldCheck className="w-5 h-5 text-emerald-400 shrink-0" />
                  <div className="text-[11px] text-emerald-200/90 leading-tight">
                    <span className="font-bold text-emerald-300">100% Fair Play Guarantee:</span> Contributions are purely voluntary donations to support developer efforts. No in-game combat advantages, godmode, or pay-to-win mechanics are granted.
                  </div>
                </div>

                {/* Tier Selection Grid (₹50, ₹100, ₹500 & Custom) */}
                <div className="space-y-2">
                  <label className="text-xs font-bold text-white/70 uppercase font-mono tracking-wider flex items-center justify-between">
                    <span>Select Contribution Tier</span>
                    <span className="text-cyan-400 font-bold text-[11px]">INR (₹)</span>
                  </label>

                  <div className="grid grid-cols-1 sm:grid-cols-3 gap-2.5">
                    {PRESET_TIERS.map((tier) => {
                      const Icon = tier.icon;
                      const isSelected = !isCustom && selectedAmount === tier.amount;
                      return (
                        <button
                          key={tier.amount}
                          type="button"
                          onClick={() => handleSelectPreset(tier.amount)}
                          className={`p-3.5 rounded-2xl border text-left transition flex flex-col justify-between gap-2.5 ${
                            isSelected
                              ? 'bg-gradient-to-b ' + tier.color + ' ring-2 ring-white/30 shadow-lg'
                              : 'bg-white/5 hover:bg-white/10 border-white/10 text-white/80'
                          }`}
                        >
                          <div className="flex items-center justify-between">
                            <span className="text-lg font-black text-white font-mono">₹{tier.amount}</span>
                            <Icon className="w-4 h-4 text-white/80" />
                          </div>
                          <div>
                            <div className="text-xs font-bold text-white leading-snug">{tier.label}</div>
                            <div className="text-[10px] text-white/60 leading-tight mt-1 line-clamp-2">
                              {tier.desc}
                            </div>
                          </div>
                        </button>
                      );
                    })}
                  </div>

                  {/* Custom Amount Button & Input */}
                  <div className="pt-1">
                    <div
                      onClick={handleSelectCustom}
                      className={`p-3 rounded-2xl border transition cursor-pointer flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 ${
                        isCustom
                          ? 'bg-gradient-to-r from-purple-950/40 to-blue-950/40 border-purple-500/50 ring-2 ring-purple-400/40'
                          : 'bg-white/5 hover:bg-white/10 border-white/10'
                      }`}
                    >
                      <div className="flex items-center gap-2.5">
                        <div className="w-8 h-8 rounded-xl bg-purple-500/20 border border-purple-500/30 flex items-center justify-center text-purple-300">
                          <Sparkles className="w-4 h-4" />
                        </div>
                        <div>
                          <div className="text-xs font-bold text-white">Custom Support Amount</div>
                          <div className="text-[10px] text-white/50">Enter any custom contribution amount (Min ₹10)</div>
                        </div>
                      </div>

                      <div className="flex items-center gap-2 w-full sm:w-auto">
                        <span className="text-sm font-bold font-mono text-cyan-400">₹</span>
                        <input
                          type="number"
                          min="10"
                          max="50000"
                          step="10"
                          value={customInput}
                          onChange={(e) => {
                            setCustomInput(e.target.value);
                            setIsCustom(true);
                          }}
                          onFocus={handleSelectCustom}
                          className="w-full sm:w-28 px-3 py-1.5 rounded-xl bg-black/60 border border-white/20 text-white font-mono font-bold text-sm focus:outline-none focus:border-cyan-400 text-right"
                          placeholder="250"
                        />
                      </div>
                    </div>
                  </div>
                </div>

                {/* Supporter Details (Optional Nickname & Cheer Message) */}
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <div className="space-y-1.5">
                    <label className="text-xs font-bold text-white/70 font-mono uppercase tracking-wider">
                      Supporter Handle / Name
                    </label>
                    <input
                      type="text"
                      maxLength={32}
                      value={supporterName}
                      onChange={(e) => setSupporterName(e.target.value)}
                      placeholder="e.g. CyberOperative (or leave blank)"
                      className="w-full px-3.5 py-2.5 rounded-xl bg-white/5 border border-white/10 text-white text-xs placeholder:text-white/30 focus:outline-none focus:border-blue-400"
                    />
                  </div>

                  <div className="space-y-1.5">
                    <label className="text-xs font-bold text-white/70 font-mono uppercase tracking-wider">
                      Cheer Message (Wall)
                    </label>
                    <input
                      type="text"
                      maxLength={140}
                      value={cheerMessage}
                      onChange={(e) => setCheerMessage(e.target.value)}
                      placeholder="e.g. Keep up the awesome open-world physics!"
                      className="w-full px-3.5 py-2.5 rounded-xl bg-white/5 border border-white/10 text-white text-xs placeholder:text-white/30 focus:outline-none focus:border-blue-400"
                    />
                  </div>
                </div>

                {/* Payment Method Selector */}
                <div className="space-y-2">
                  <label className="text-xs font-bold text-white/70 font-mono uppercase tracking-wider">
                    Payment Gateway & Protocol
                  </label>
                  <div className="grid grid-cols-3 gap-2">
                    <button
                      type="button"
                      onClick={() => setPaymentMethod('upi')}
                      className={`p-2.5 rounded-xl border text-xs font-bold transition flex items-center justify-center gap-2 ${
                        paymentMethod === 'upi'
                          ? 'bg-blue-600/30 border-blue-400 text-blue-300'
                          : 'bg-white/5 border-white/10 text-white/70 hover:bg-white/10'
                      }`}
                    >
                      <QrCode className="w-3.5 h-3.5" />
                      <span>UPI / QR</span>
                    </button>

                    <button
                      type="button"
                      onClick={() => setPaymentMethod('card')}
                      className={`p-2.5 rounded-xl border text-xs font-bold transition flex items-center justify-center gap-2 ${
                        paymentMethod === 'card'
                          ? 'bg-blue-600/30 border-blue-400 text-blue-300'
                          : 'bg-white/5 border-white/10 text-white/70 hover:bg-white/10'
                      }`}
                    >
                      <CreditCard className="w-3.5 h-3.5" />
                      <span>Cards</span>
                    </button>

                    <button
                      type="button"
                      onClick={() => setPaymentMethod('netbanking')}
                      className={`p-2.5 rounded-xl border text-xs font-bold transition flex items-center justify-center gap-2 ${
                        paymentMethod === 'netbanking'
                          ? 'bg-blue-600/30 border-blue-400 text-blue-300'
                          : 'bg-white/5 border-white/10 text-white/70 hover:bg-white/10'
                      }`}
                    >
                      <Building2 className="w-3.5 h-3.5" />
                      <span>NetBanking</span>
                    </button>
                  </div>
                </div>

                {/* Error Banner */}
                {errorMsg && (
                  <div className="p-3 rounded-xl bg-rose-950/60 border border-rose-500/40 text-rose-300 text-xs flex items-center gap-2">
                    <X className="w-4 h-4 shrink-0" />
                    <span>{errorMsg}</span>
                  </div>
                )}

                {/* Submit Action Button */}
                <button
                  type="submit"
                  disabled={isLoading}
                  className="w-full py-3.5 px-6 rounded-2xl bg-gradient-to-r from-blue-600 via-indigo-600 to-purple-600 hover:from-blue-500 hover:via-indigo-500 hover:to-purple-500 text-white font-bold text-sm uppercase tracking-wider shadow-lg shadow-indigo-600/30 transition flex items-center justify-center gap-2.5 disabled:opacity-50 cursor-pointer"
                >
                  {isLoading ? (
                    <>
                      <RefreshCw className="w-4 h-4 animate-spin" />
                      <span>Securing Transaction...</span>
                    </>
                  ) : (
                    <>
                      <Lock className="w-4 h-4 text-cyan-300" />
                      <span>Contribute ₹{currentAmount.toLocaleString()} INR</span>
                      <ArrowRight className="w-4 h-4" />
                    </>
                  )}
                </button>

                <div className="text-center text-[10px] text-white/40 flex items-center justify-center gap-1 font-mono">
                  <Lock className="w-3 h-3" />
                  <span>256-BIT ENCRYPTED SERVER-SIDE TRANSACTION • PROCESSED SECURELY</span>
                </div>
              </form>
            )
          ) : (
            /* --- COMMUNITY SUPPORTERS WALL --- */
            <div className="space-y-4">
              <div className="flex items-center justify-between pb-2 border-b border-white/10">
                <div>
                  <h4 className="text-sm font-bold text-white uppercase font-mono">
                    NovaForge Hall of Supporters
                  </h4>
                  <p className="text-xs text-white/60">
                    Community backers fueling our 3D game engine and city expansions
                  </p>
                </div>
                <button
                  onClick={fetchSupporters}
                  disabled={isLoadingWall}
                  className="p-2 rounded-xl bg-white/5 hover:bg-white/10 border border-white/10 text-white/70 transition"
                  title="Refresh List"
                >
                  <RefreshCw className={`w-3.5 h-3.5 ${isLoadingWall ? 'animate-spin' : ''}`} />
                </button>
              </div>

              {isLoadingWall ? (
                <div className="py-12 text-center text-xs text-white/50">Loading community wall...</div>
              ) : communitySupporters.length === 0 ? (
                <div className="py-12 text-center text-xs text-white/50">
                  No contributions recorded yet. Be the first backer!
                </div>
              ) : (
                <div className="space-y-2.5">
                  {communitySupporters.map((supporter) => {
                    let badgeColor = 'bg-blue-500/20 text-blue-300 border-blue-500/30';
                    if (supporter.amount >= 500) {
                      badgeColor = 'bg-rose-500/20 text-rose-300 border-rose-500/30';
                    } else if (supporter.amount >= 100) {
                      badgeColor = 'bg-amber-500/20 text-amber-300 border-amber-500/30';
                    }

                    return (
                      <div
                        key={supporter.id}
                        className="p-3.5 rounded-2xl bg-white/5 border border-white/10 flex items-start justify-between gap-3 hover:bg-white/[0.07] transition"
                      >
                        <div className="space-y-1">
                          <div className="flex items-center gap-2">
                            <span className="text-xs font-bold text-white">{supporter.name}</span>
                            <span className={`px-2 py-0.5 rounded-md border text-[10px] font-mono font-bold ${badgeColor}`}>
                              {supporter.tier}
                            </span>
                          </div>
                          {supporter.message && (
                            <p className="text-xs text-white/70 italic">"{supporter.message}"</p>
                          )}
                          <div className="text-[10px] text-white/40 font-mono">
                            {new Date(supporter.timestamp).toLocaleDateString('en-IN', {
                              dateStyle: 'medium',
                            })}
                          </div>
                        </div>

                        <div className="text-right shrink-0">
                          <div className="text-sm font-black text-cyan-300 font-mono">
                            ₹{supporter.amount.toLocaleString()}
                          </div>
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
