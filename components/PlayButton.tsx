import { BsFillPlayFill } from "react-icons/bs";
import React, { useEffect, useState } from "react";
import { useRouter } from "next/router";
import Web3 from "web3";
import NetflixMembershipABI from "../NetflixMembershipABI.json"; // Import the ABI

interface PlayButtonProps {
    movieId: string;
}

const PlayButton: React.FC<PlayButtonProps> = ({ movieId }) => {
    const [isMember, setIsMember] = useState<boolean | null>(null);
    const [account, setAccount] = useState<string | null>(null);
    const [loading, setLoading] = useState<boolean>(false);
    const router = useRouter();
    
    const contractAddress = "0x55f3EE1B6BfD2D623587B775B15b8F79Dc284be1"; // Replace with your contract address

    useEffect(() => {
        const checkMembership = async () => {
            if (window.ethereum) {
                const web3 = new Web3(window.ethereum);
                try {
                    setLoading(true); // Set loading to true when starting the check
                    await window.ethereum.request({ method: 'eth_requestAccounts' });
                    const accounts = await web3.eth.getAccounts();
                    setAccount(accounts[0]);
        
                    const contract = new web3.eth.Contract(NetflixMembershipABI, contractAddress);
                    
                    // Check if the connected account has an active membership
                    const isActive = await contract.methods.isMembershipActive(accounts[0]).call();
                    setIsMember(Boolean(isActive));
                } catch (error) {
                    console.error("Error checking membership status:", error);
                    setIsMember(false); // Default to false if there's an error
                } finally {
                    setLoading(false); // Set loading to false once the check is complete
                }
            } else {
                alert("Please install MetaMask to interact with this DApp!");
            }
        };

        checkMembership();
    }, []);

    const handlePlay = () => {
        if (isMember) {
            // If the user has an active membership, allow them to watch the video
            router.push(`/watch/${movieId}`);
        } else {
            // If the user is not a member, redirect them to the membership page
            router.push("/membership");
        }
    };

    return (
        <button
            onClick={handlePlay}
            className={`bg-white rounded-md py-1 md:py-2 px-2 md:px-4 w-auto text-xs lg:text-lg font-semibold flex flex-row items-center hover:bg-neutral-300 transition ${loading ? 'cursor-not-allowed opacity-50' : ''}`}
            disabled={loading} // Disable button while checking membership status
        >
            <BsFillPlayFill className="mr-1" size={25} />
            {loading ? 'Checking...' : (isMember ? 'Play' : 'Join Now')}
        </button>
    );
};

export default PlayButton;
