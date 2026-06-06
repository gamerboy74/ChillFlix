"use client";

import React, { useState, useEffect } from "react";
import { useRouter } from "next/router";
import useCurrentUser from "@/hooks/useCurrentUser";
import Footer from "./Footer";
import Image from "next/image";
import toast, { Toaster } from "react-hot-toast";
import { 
  Check, 
  Sparkles, 
  ShieldCheck, 
  Tv, 
  Smartphone, 
  Laptop, 
  CreditCard, 
  Lock, 
  ChevronRight, 
  RefreshCw,
  HelpCircle
} from "lucide-react";

interface Plan {
  name: string;
  price: string;
  etherCost: string;
  duration: string;
  devices: string;
  quality: string;
  resolution: string;
}

const plans: Plan[] = [
  {
    name: "Basic",
    price: "₹149",
    etherCost: "0.01",
    duration: "30 Days",
    devices: "1 Screen",
    quality: "Good Quality",
    resolution: "720p (HD)"
  },
  {
    name: "Standard",
    price: "₹299",
    etherCost: "0.03",
    duration: "60 Days",
    devices: "2 Screens",
    quality: "Great Quality",
    resolution: "1080p (Full HD)"
  },
  {
    name: "Premium",
    price: "₹499",
    etherCost: "0.05",
    duration: "180 Days",
    devices: "4 Screens",
    quality: "Exceptional Quality",
    resolution: "4K (Ultra HD) + HDR"
  },
];

const PlanSelection: React.FC = () => {
  const router = useRouter();
  const { data: user } = useCurrentUser();
  const [selectedPlan, setSelectedPlan] = useState<Plan>(plans[2]); // Default to Premium
  const [loading, setLoading] = useState(false);
  const [checkingStatus, setCheckingStatus] = useState(true);
  const [showCheckout, setShowCheckout] = useState(false);
  
  // Card checkout simulated form states
  const [cardNumber, setCardNumber] = useState("");
  const [cardExpiry, setCardExpiry] = useState("");
  const [cardCvv, setCardCvv] = useState("");
  const [cardName, setCardName] = useState("");

  const [membershipDetails, setMembershipDetails] = useState<{
    active: boolean;
    plan: string | null;
    date: string | null;
    expiresAt: string | null;
  } | null>(null);

  useEffect(() => {
    const checkMembershipStatus = async () => {
      
      try {
        setCheckingStatus(true);
        const res = await fetch("/api/admin/subscriptions");
        if (res.ok) {
          const data = await res.json();
          // Find subscription details by matching user's unique deterministic address
          const userSub = data.find(
            (sub: any) => sub.userId === user.id
          );

          if (userSub) {
            const subDate = new Date(userSub.date);
            const now = new Date();
            const diffTime = Math.abs(now.getTime() - subDate.getTime());
            const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
            
            let durationDays = 30;
            if (userSub.plan === "Standard") durationDays = 60;
            if (userSub.plan === "Premium") durationDays = 180;

            const active = diffDays <= durationDays;
            const expiryDate = new Date(subDate.getTime() + durationDays * 24 * 60 * 60 * 1000);

            setMembershipDetails({
              active,
              plan: userSub.plan,
              date: subDate.toLocaleDateString(),
              expiresAt: expiryDate.toLocaleDateString(),
            });
          }
        }
      } catch (error) {
        console.error("Error checking membership status:", error);
      } finally {
        setCheckingStatus(false);
      }
    };

    checkMembershipStatus();
  }, [user]);

  const handlePurchase = async (e?: React.FormEvent) => {
    if (e) e.preventDefault();

    
    if (showCheckout) {
      if (!cardNumber || !cardExpiry || !cardCvv || !cardName) {
        toast.error("Please fill in all credit card details.");
        return;
      }
    }

    setLoading(true);
    const purchaseToast = toast.loading(`Initiating ${selectedPlan.name} plan billing...`);

    try {
      // Step 1: Simulate payment processor gateway verification
      await new Promise((resolve) => setTimeout(resolve, 1000));
      toast.loading("Securing sandbox transaction channel...", { id: purchaseToast });
      
      // Step 2: Post resolved status to our subscription database
      await new Promise((resolve) => setTimeout(resolve, 800));
      const response = await fetch("/api/saveMembership", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          userId: user.id,
          plan: selectedPlan.name,
          date: new Date().toISOString(),
        }),
      });

      if (response.ok) {
        toast.success(`🎉 Welcome to ChillFlix Premium! Subscription active.`, { id: purchaseToast });
        setShowCheckout(false);
        // Refresh details after a short timeout
        setTimeout(() => {
          window.location.href = "/main";
        }, 1500);
      } else {
        const err = await response.json();
        throw new Error(err.error || "Ledger record creation failed");
      }
    } catch (error: any) {
      toast.error(error.message || "Bypass gateway failed. Please try again.", { id: purchaseToast });
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="relative min-h-screen bg-zinc-950 text-zinc-100 flex flex-col justify-between selection:bg-red-600 selection:text-white">
      
      {/* Top Navigation */}
      <nav className="px-6 md:px-16 py-4 flex justify-between items-center bg-zinc-950 border-b border-zinc-900 sticky top-0 z-30">
        <Image
          src="/images/logo2.png"
          alt="ChillFlix Logo"
          className="h-10 w-auto cursor-pointer"
          height={40}
          width={130}
          onClick={() => router.push("/main")}
        />
        <div className="flex items-center gap-4">
          <span className="text-zinc-500 text-xs hidden sm:inline-block font-mono bg-zinc-900 px-3 py-1.5 rounded-lg border border-zinc-850">
            Secure Endpoint: Connected
          </span>
          <button
            onClick={() => router.push("/main")}
            className="text-zinc-400 hover:text-white text-sm font-semibold transition duration-200"
          >
            Cancel
          </button>
        </div>
      </nav>

      {/* Main Content Area */}
      <div className="flex-grow max-w-6xl w-full mx-auto px-4 py-12 md:py-20 flex flex-col justify-center">
        {checkingStatus ? (
          <div className="flex flex-col items-center justify-center py-20 gap-4">
            <RefreshCw className="animate-spin text-red-600" size={40} />
            <p className="text-zinc-400 text-sm font-semibold tracking-wider uppercase">Loading account subscription status...</p>
          </div>
        ) : membershipDetails?.active ? (
          /* ACTIVE SUBSCRIPTION SCREEN */
          <div className="max-w-xl mx-auto w-full bg-zinc-900/40 border border-zinc-850 rounded-2xl p-8 backdrop-blur-md shadow-2xl relative overflow-hidden">
            <div className="absolute top-0 right-0 bg-red-600 text-[10px] uppercase font-bold tracking-widest px-4 py-1 rounded-bl-xl shadow-lg flex items-center gap-1">
              <Sparkles size={10} /> Active
            </div>
            
            <div className="flex items-center gap-4 mb-6">
              <div className="p-3 bg-red-950/40 text-red-500 rounded-xl border border-red-900/30">
                <ShieldCheck size={28} />
              </div>
              <div>
                <h1 className="text-2xl font-extrabold text-white">ChillFlix Subscription</h1>
                <p className="text-zinc-400 text-sm">Account Plan: <strong className="text-white font-semibold">{membershipDetails.plan}</strong></p>
              </div>
            </div>

            <div className="space-y-4 border-t border-b border-zinc-850 py-5 my-6">
              <div className="flex justify-between items-center text-sm">
                <span className="text-zinc-400">Status</span>
                <span className="text-green-500 font-semibold flex items-center gap-1.5">
                  <span className="h-2 w-2 rounded-full bg-green-500 animate-ping"></span>
                  Premium Active
                </span>
              </div>
              <div className="flex justify-between items-center text-sm">
                <span className="text-zinc-400">Purchase Date</span>
                <span className="text-white font-semibold font-mono">{membershipDetails.date}</span>
              </div>
              <div className="flex justify-between items-center text-sm">
                <span className="text-zinc-400">Next Renewal</span>
                <span className="text-white font-semibold font-mono">{membershipDetails.expiresAt}</span>
              </div>
            </div>

            <div className="flex flex-col gap-3">
              <button
                onClick={() => router.push("/main")}
                className="w-full bg-red-600 hover:bg-red-700 text-white py-3.5 rounded-xl font-bold transition-all duration-300 transform hover:scale-[1.01] hover:shadow-lg shadow-red-900/20 text-sm"
              >
                Back to Streaming
              </button>
              <button
                onClick={() => {
                  setMembershipDetails(null);
                  toast.success("Ready to update subscription details.");
                }}
                className="w-full bg-zinc-950/60 hover:bg-zinc-900 border border-zinc-800 text-zinc-400 hover:text-white py-3.5 rounded-xl font-semibold transition-all duration-300 text-sm"
              >
                Change or Upgrade Plan
              </button>
            </div>
          </div>
        ) : (
          /* BILLING PLAN COMPARISON SCREEN */
          <div className="flex flex-col">
            <div className="text-center max-w-xl mx-auto mb-12">
              <span className="text-red-500 font-extrabold text-xs uppercase tracking-widest bg-red-500/10 px-3.5 py-1.5 rounded-full border border-red-500/20">
                Premium Streaming
              </span>
              <h1 className="text-3xl md:text-5xl font-extrabold text-white mt-4 tracking-tight leading-tight">
                Choose the plan that is right for you.
              </h1>
              <p className="text-zinc-400 text-base mt-4">
                Watch everything you want, ad-free. Change or cancel your plan at any time.
              </p>
            </div>

            {/* Plan Cards Grid */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6 lg:gap-8 max-w-5xl mx-auto w-full mb-12">
              {plans.map((plan) => {
                const isSelected = selectedPlan.name === plan.name;
                return (
                  <div
                    key={plan.name}
                    onClick={() => setSelectedPlan(plan)}
                    className={`bg-zinc-900/30 border rounded-2xl p-6 cursor-pointer flex flex-col justify-between transition-all duration-300 select-none relative group ${
                      isSelected
                        ? "border-red-600 ring-2 ring-red-600/30 bg-zinc-900/80 shadow-2xl scale-[1.03]"
                        : "border-zinc-850 hover:border-zinc-700 hover:bg-zinc-900/50 hover:scale-[1.01]"
                    }`}
                  >
                    {isSelected && (
                      <span className="absolute -top-3 left-1/2 -translate-x-1/2 bg-red-600 text-white font-bold text-[9px] uppercase tracking-widest px-3.5 py-1 rounded-full shadow-lg flex items-center gap-1">
                        <Sparkles size={8} /> Popular
                      </span>
                    )}

                    <div>
                      {/* Plan Name */}
                      <div className="flex justify-between items-center mb-4">
                        <h3 className="text-lg font-bold text-white uppercase tracking-wider">{plan.name}</h3>
                        {isSelected ? (
                          <div className="h-5 w-5 rounded-full bg-red-600 flex items-center justify-center text-white">
                            <Check size={12} strokeWidth={3} />
                          </div>
                        ) : (
                          <div className="h-5 w-5 rounded-full border border-zinc-700 flex items-center justify-center"></div>
                        )}
                      </div>

                      {/* Price Section */}
                      <div className="mb-6">
                        <span className="text-3xl font-extrabold text-white tracking-tight">{plan.price}</span>
                        <span className="text-zinc-500 text-sm ml-1">/{plan.duration.toLowerCase()}</span>
                      </div>

                      {/* Features List */}
                      <div className="space-y-4 text-sm border-t border-zinc-850 pt-5">
                        <div className="flex items-center gap-3">
                          <Tv size={16} className={isSelected ? "text-red-500" : "text-zinc-500"} />
                          <div>
                            <p className="text-zinc-400 text-[11px] uppercase tracking-wider leading-none">Resolution</p>
                            <span className="text-white font-medium">{plan.resolution}</span>
                          </div>
                        </div>

                        <div className="flex items-center gap-3">
                          <Laptop size={16} className={isSelected ? "text-red-500" : "text-zinc-500"} />
                          <div>
                            <p className="text-zinc-400 text-[11px] uppercase tracking-wider leading-none">Simultaneous Viewing</p>
                            <span className="text-white font-medium">{plan.devices}</span>
                          </div>
                        </div>

                        <div className="flex items-center gap-3">
                          <Smartphone size={16} className={isSelected ? "text-red-500" : "text-zinc-500"} />
                          <div>
                            <p className="text-zinc-400 text-[11px] uppercase tracking-wider leading-none">Video Quality</p>
                            <span className="text-white font-medium">{plan.quality}</span>
                          </div>
                        </div>
                      </div>
                    </div>

                    <div className="mt-8 border-t border-zinc-850/60 pt-4 flex justify-between items-center text-xs text-zinc-500">
                      <span>Bypass Token Cost:</span>
                      <span className="font-mono font-semibold text-zinc-300">{plan.etherCost} ETH</span>
                    </div>
                  </div>
                );
              })}
            </div>

            {/* Subscribe Actions */}
            <div className="flex flex-col items-center justify-center max-w-md mx-auto w-full gap-4">
              <button
                onClick={() => setShowCheckout(true)}
                className="w-full bg-red-600 hover:bg-red-700 text-white font-bold py-4 rounded-xl flex items-center justify-center gap-2 group transition-all duration-300 transform hover:scale-[1.01] hover:shadow-lg shadow-red-900/10"
              >
                Proceed to Secure Checkout
                <ChevronRight size={18} className="group-hover:translate-x-1 transition" />
              </button>

              <button
                onClick={() => handlePurchase()}
                className="text-zinc-500 hover:text-zinc-300 text-xs font-semibold underline transition duration-200 mt-2"
                disabled={loading}
              >
                ⚡ Instant Play Bypass (Activate Immediately)
              </button>
            </div>

            <p className="text-zinc-500 text-xs text-center max-w-lg mx-auto mt-10 leading-relaxed">
              HD (720p), Full HD (1080p), Ultra HD (4K) and HDR availability subject to your internet service and device capabilities. Not all content is available in all resolutions. See our Terms of Use for more details. Only people who live with you may use your account.
            </p>
          </div>
        )}
      </div>

      {/* CHECKOUT SIMULATION MODAL */}
      {showCheckout && (
        <div className="fixed inset-0 z-50 bg-black/85 backdrop-blur-md flex items-center justify-center p-4">
          <div className="bg-zinc-900 border border-zinc-800 max-w-md w-full rounded-2xl p-6 shadow-2xl relative overflow-hidden">
            <h2 className="text-xl font-extrabold text-white mb-2 flex items-center gap-2">
              <CreditCard className="text-red-500" size={20} /> Secure Checkout
            </h2>
            <p className="text-zinc-400 text-xs mb-6">
              You are subscribing to the <strong className="text-white font-semibold">{selectedPlan.name} Plan</strong> ({selectedPlan.price}).
            </p>

            <form onSubmit={handlePurchase} className="space-y-4">
              <div>
                <label className="block text-[10px] uppercase font-bold tracking-widest text-zinc-400 mb-1.5">Cardholder Name</label>
                <input
                  type="text"
                  required
                  placeholder="John Doe"
                  value={cardName}
                  onChange={(e) => setCardName(e.target.value)}
                  className="w-full bg-zinc-950 border border-zinc-850 focus:border-red-600 focus:outline-none rounded-xl px-3.5 py-2.5 text-sm font-semibold transition"
                />
              </div>

              <div>
                <label className="block text-[10px] uppercase font-bold tracking-widest text-zinc-400 mb-1.5">Card Number</label>
                <div className="relative flex items-center">
                  <input
                    type="text"
                    required
                    maxLength={19}
                    placeholder="4111 2222 3333 4444"
                    value={cardNumber}
                    onChange={(e) => {
                      // Formatting CC number spaces
                      const val = e.target.value.replace(/\D/g, "");
                      const matches = val.match(/\d{4,16}/g);
                      const match = (matches && matches[0]) || "";
                      const parts = [];
                      for (let i = 0, len = match.length; i < len; i += 4) {
                        parts.push(match.substring(i, i + 4));
                      }
                      if (parts.length > 0) {
                        setCardNumber(parts.join(" "));
                      } else {
                        setCardNumber(val);
                      }
                    }}
                    className="w-full bg-zinc-950 border border-zinc-850 focus:border-red-600 focus:outline-none rounded-xl pl-3.5 pr-10 py-2.5 text-sm font-semibold transition font-mono"
                  />
                  <Lock size={14} className="absolute right-3.5 text-zinc-500" />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-[10px] uppercase font-bold tracking-widest text-zinc-400 mb-1.5">Expiration</label>
                  <input
                    type="text"
                    required
                    maxLength={5}
                    placeholder="MM/YY"
                    value={cardExpiry}
                    onChange={(e) => {
                      const val = e.target.value.replace(/\D/g, "");
                      if (val.length >= 3) {
                        setCardExpiry(`${val.slice(0, 2)}/${val.slice(2, 4)}`);
                      } else {
                        setCardExpiry(val);
                      }
                    }}
                    className="w-full bg-zinc-950 border border-zinc-850 focus:border-red-600 focus:outline-none rounded-xl px-3.5 py-2.5 text-sm font-semibold transition font-mono"
                  />
                </div>
                <div>
                  <label className="block text-[10px] uppercase font-bold tracking-widest text-zinc-400 mb-1.5">CVV</label>
                  <input
                    type="password"
                    required
                    maxLength={3}
                    placeholder="***"
                    value={cardCvv}
                    onChange={(e) => setCardCvv(e.target.value.replace(/\D/g, ""))}
                    className="w-full bg-zinc-950 border border-zinc-850 focus:border-red-600 focus:outline-none rounded-xl px-3.5 py-2.5 text-sm font-semibold transition font-mono"
                  />
                </div>
              </div>

              <div className="flex gap-3 pt-6 border-t border-zinc-850/60 mt-6">
                <button
                  type="button"
                  onClick={() => setShowCheckout(false)}
                  className="flex-1 bg-zinc-950 border border-zinc-850 text-zinc-400 hover:text-white py-3 rounded-xl font-semibold transition text-sm"
                  disabled={loading}
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="flex-1 bg-red-600 hover:bg-red-700 text-white py-3 rounded-xl font-bold transition flex items-center justify-center gap-1.5 text-sm"
                  disabled={loading}
                >
                  {loading ? (
                    <RefreshCw className="animate-spin text-white" size={14} />
                  ) : (
                    "Pay & Activate"
                  )}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      <Footer />
    </div>
  );
};

export default PlanSelection;
