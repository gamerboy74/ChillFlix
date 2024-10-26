import React, { createContext, useContext, useState, useEffect } from "react";
import Web3 from "web3";

interface WalletContextType {
    walletAddress: string | null;
    connectWallet: () => Promise<void>;
    logout: () => void;
}

const WalletContext = createContext<WalletContextType | undefined>(undefined);

export const WalletProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
    const [walletAddress, setWalletAddress] = useState<string | null>(null);

    useEffect(() => {
        // Check local storage for a wallet address
        const storedAddress = localStorage.getItem("walletAddress");
        if (storedAddress) {
            setWalletAddress(storedAddress);
        } else {
            const checkWalletConnection = async () => {
                if (typeof window.ethereum !== "undefined") {
                    const web3 = new Web3(window.ethereum);
                    const accounts = await web3.eth.getAccounts();
                    if (accounts.length > 0) {
                        setWalletAddress(accounts[0]);
                        localStorage.setItem("walletAddress", accounts[0]); // Store in local storage
                    }
                }
            };
            checkWalletConnection();
        }
    }, []);

    const connectWallet = async () => {
        if (typeof window.ethereum !== "undefined") {
            try {
                const web3 = new Web3(window.ethereum);
                await window.ethereum.request({ method: "eth_requestAccounts" });
                const accounts = await web3.eth.getAccounts();
                if (accounts.length > 0) {
                    setWalletAddress(accounts[0]);
                    localStorage.setItem("walletAddress", accounts[0]); // Store in local storage
                }
            } catch (error: any) {
                console.error("Error connecting to wallet:", error);
            }
        } else {
            alert("MetaMask is not installed. Please install it to use this feature.");
        }
    };

    const logout = () => {
        setWalletAddress(null); // Clear the wallet address state
        localStorage.removeItem("walletAddress"); // Remove from local storage
    };

    return (
        <WalletContext.Provider value={{ walletAddress, connectWallet, logout }}>
            {children}
        </WalletContext.Provider>
    );
};

export const useWallet = () => {
    const context = useContext(WalletContext);
    if (!context) {
        throw new Error("useWallet must be used within a WalletProvider");
    }
    return context;
};
