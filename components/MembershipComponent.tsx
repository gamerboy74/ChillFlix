"use client";

import React, { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { useWallet } from "@/context/WalletContext";
import Web3 from "web3";
import contractAbi from "../NetflixMembershipABI.json";
import Footer from "./Footer";

interface Plan {
  name: string;
  price: string;
  etherCost: string;
  duration: string;
  devices: string;
  down : string;
}

const CONTRACT_ADDRESS = "0x55f3EE1B6BfD2D623587B775B15b8F79Dc284be1";

const plans: Plan[] = [
  { name: "Basic", price: "₹149", etherCost: "0.01", duration: "30 days" , devices: "1", down :"1" },
  { name: "Standard", price: "₹299", etherCost: "0.03", duration: "60 days", devices: "2",down :"1"  },
  { name: "Premium", price: "₹499", etherCost: "0.05", duration: "180 days",  devices: "3",down :"2"  },
];

const PlanSelection: React.FC = () => {
  const [selectedPlan, setSelectedPlan] = useState<Plan>(plans[0]);
  const { walletAddress, connectWallet, logout } = useWallet();
  const [web3, setWeb3] = useState<Web3 | null>(null);
  const [loading, setLoading] = useState(false);
  const [membershipDetails, setMembershipDetails] = useState<{
    active: boolean;
    plan: string | null;
  } | null>(null);
  const router = useRouter();

  useEffect(() => {
    if (window.ethereum) {
      const web3Instance = new Web3((window as any).ethereum);
      setWeb3(web3Instance);
    }
  }, []);

  useEffect(() => {
    const checkMembershipStatus = async () => {
      if (walletAddress && web3) {
        const contract = new web3.eth.Contract(contractAbi, CONTRACT_ADDRESS);
        try {
          const membershipData: [string, string, string] =
            await contract.methods.getMembershipDetails(walletAddress).call();
          const currentTime = Math.floor(Date.now() / 1000);
          const isActive =
            currentTime >= parseInt(membershipData[0]) &&
            currentTime <= parseInt(membershipData[1]);
          const currentPlan = membershipData[2];

          setMembershipDetails({
            active: isActive,
            plan: currentPlan,
          });
        } catch (error) {
          console.error("Error fetching membership details:", error);
          alert("Failed to check membership status. Please try again later.");
        }
      }
    };

    checkMembershipStatus();
  }, [walletAddress, web3]);

  const handlePurchase = async () => {
    if (!walletAddress) {
      await connectWallet();
      return;
    }

    if (web3) {
      const contract = new web3.eth.Contract(contractAbi, CONTRACT_ADDRESS);
      const etherCost = Web3.utils.toWei(selectedPlan.etherCost, "ether");
      const planEnum = plans.findIndex(
        (plan) => plan.name === selectedPlan.name
      );

      setLoading(true);

      if (membershipDetails?.active) {
        if (membershipDetails.plan === selectedPlan.name) {
          alert(
            `You already have an active ${selectedPlan.name} plan. You cannot purchase the same plan again.`
          );
          setLoading(false);
          return;
        } else {
          const userConfirmed = confirm(
            `You have an active ${membershipDetails.plan} plan. Would you like to upgrade to ${selectedPlan.name}?`
          );
          if (!userConfirmed) {
            setLoading(false);
            return;
          }
        }
      }

      try {
        await contract.methods.purchaseMembership(planEnum).send({
          from: walletAddress,
          value: etherCost,
        });

        await fetch("/api/saveMembership", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            walletAddress,
            plan: selectedPlan.name,
            date: new Date(),
          }),
        });

        alert(`Successfully purchased the ${selectedPlan.name} plan!`);
        router.push("/");
      } catch (error: any) {
        console.error("Transaction failed:", error);
        const errorMessage = error.message.includes("User denied transaction")
          ? "Transaction was denied. Please try again."
          : "An error occurred during the purchase. Please check the console for details.";
        alert(errorMessage);
      } finally {
        setLoading(false);
      }
    } else {
      alert("Web3 not found! Please install MetaMask.");
    }
  };

  return (
    <div className="relative h-full w-full bg-[url('/images/.jpg')] bg-no-repeat bg-center bg-fixed bg-cover bg-white">
      <div className=" h-full w-full lg:bg-opacity-20  ">
        
        <nav className="px-12 py-6">
          <div className="flex justify-between items-center mt-0">
          <img src="/images/logo2.png" alt="Netflix Logo" className="h-20" />
            {walletAddress ? (
              <div className="flex items-center gap-4">
                <p className="text-black">{`Wallet: ${walletAddress.slice(
                  0,
                  6
                )}...${walletAddress.slice(-4)}`}</p>
                <button
                  onClick={logout}
                  className="bg-red-500 text-white px-4 py-2 rounded-md"
                >
                  Logout
                </button>
              </div>
              
            ) : (
              <button
                onClick={connectWallet}
                className="bg-blue-500 text-white px-4 py-2 rounded-md"
              >
                Connect Wallet
              </button>
            )}
          </div>
        </nav>
        <div className="w-full h-0.5 bg-black"></div>
      </div>
      <div className="p-8 min-h-screen">
        <h1 className="text-3xl font-bold text-center text-black mb-6 ">
          Choose the plan that's right for you
        </h1>
        <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-6 mx-40">
          {plans.map((plan) => (
            <div
              key={plan.name}
              onClick={() => setSelectedPlan(plan)}
              className={`border rounded-lg p-6 text-center h-40vh cursor-pointer ${
                selectedPlan.name === plan.name
                  ? "bg-mint text-white shadow-lg"
                  : "bg-white text-black border-red-300"
              }`}
            >
              <div className="flex justify-center mt-6">
             <div className="flex justify-center items-center custom-gradient rounded-lg h-20 w-60 "> 
              <h2 className="text-lg text-center font-bold">{plan.name}</h2></div></div>
              <p className="mt-2">Monthly price</p>
              <p className="text-2xl font-bold">{plan.price}</p>
              <p className="mt-4">Duration</p>
              <p className="text-2xl font-bold">{plan.duration}</p>
              <p className="mt-4">Download devices</p>
              <p className="text-2xl font-bold">{plan.down}</p>
              <p className="mt-4">Devices your household can watch at the same time</p>
              <p className="text-2xl font-bold">{plan.devices}</p>
              <p>{plan.duration}</p>
            </div>
          ))}
        </div>
        <div className="mt-6 "><p className="text-gray-400 px-5 mx-20">HD (720p), Full HD (1080p), Ultra HD (4K) and HDR availability subject to your internet service and device capabilities. Not all content is available in all resolutions. See our Terms of Use for more details.
        Only people who live with you may use your account. Watch on 4 different devices at the same time with Premium, 2 with Standard, and 1 with Basic and Mobile.</p></div>

        <div className="flex mt-20 h-full justify-center items-center">
          <div className="relative inline-flex group">
            <div className="absolute transition-all duration-1000 opacity-30 -inset-px bg-gradient-to-r from-purple-500 group-hover:-inset-1 group-hover:duration-200"></div>
            <button
              onClick={handlePurchase}
              className={`relative inline-flex items-center justify-center px-8 py-4 text-lg text-white transition-all duration-200 custom-gradient ${
                loading ? " cursor-not-allowed" : "bg-white"
              }`}
              disabled={loading}
            >
              {loading ? "Processing..." : `Purchase ${selectedPlan.name} Plan`}
            </button>
          </div>
        </div>
      </div>    <Footer/>
    </div>

  );
};

export default PlanSelection;
