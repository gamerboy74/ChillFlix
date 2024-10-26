import React, { useRef, useEffect, useState } from "react";
import { BsFillPlayFill, BsTextIndentLeft } from "react-icons/bs";
import { BiChevronDown } from "react-icons/bi";
import FavouriteButton from "@/components/FavouriteButton";
import { useRouter } from "next/router";
import useInfoModal from "@/hooks/useInfoModal";
import useMuteBillboard from "@/hooks/useMuteBillboard";
import Web3 from "web3";
import NetflixMembershipABI from "../NetflixMembershipABI.json"; // Import the ABI
import { title } from "process";
import Image from "next/image";

interface MovieCardProps {
  data: Record<string, any>;
}

const MovieCard: React.FC<MovieCardProps> = ({ data }) => {
  const router = useRouter();
  const { openModal } = useInfoModal();
  const { muteBillboard } = useMuteBillboard();
  const videoRef = useRef<HTMLVideoElement>(null);

  const [isMember, setIsMember] = useState<boolean | null>(null);
  const [account, setAccount] = useState<string | null>(null);
  const contractAddress = "0x55f3EE1B6BfD2D623587B775B15b8F79Dc284be1"; // Replace with your contract address

  const currentYear = React.useMemo(() => new Date().getFullYear(), []);

  useEffect(() => {
    const checkMembership = async () => {
      if (window.ethereum) {
        const web3 = new Web3(window.ethereum);
        try {
          // Request account access
          await window.ethereum.request({ method: "eth_requestAccounts" });
          const accounts = await web3.eth.getAccounts();
          setAccount(accounts[0]);

          const contract = new web3.eth.Contract(
            NetflixMembershipABI,
            contractAddress
          );

          // Check if the connected account has an active membership
          const isActive = await contract.methods
            .isMembershipActive(accounts[0])
            .call();
          setIsMember(Boolean(isActive));
        } catch (error) {
          console.error("Error checking membership status:", error);
          alert(
            "Failed to check membership status. Please ensure you are connected to the right network and that the contract is deployed."
          );
          setIsMember(false); // Default to false if there's an error
        }
      } else {
        alert("Please install MetaMask to interact with this DApp!");
      }
    };

    checkMembership();
  }, []);

  const handleMouseEnter = () => {
    if (videoRef.current) {
      muteBillboard();
      videoRef.current.play();
    }
  };

  const handleMouseLeave = () => {
    if (videoRef.current) {
      videoRef.current.pause();
    }
  };

  const handlePlay = () => {
    if (isMember) {
      // If the user has an active membership, allow them to watch the video
      router.push(`/watch/${data?.id}`);
    } else {
      // If the user is not a member, redirect them to the membership page
      router.push("/membership");
    }
  };

  return (
    <div className="group bg-zinc-900 col-span relative h-[12vw]">
      <Image
        className="cursor-pointer object-cover transition duration shadow-xl rounded-md group-hover:opacity-90 delay-50 sm:group-hover:opacity-0 w-full h-[12vw]"
        src={data.thumbnailUrl}
        alt="thumbnail"
      />
      <div
        className="opacity-0 absolute top-0 transition duration-200 z-10 invisible sm:visible w-full scale-0 delay-50 group-hover:scale-110 group-hover:-translate-y-[6vw] group-hover:translate-x-[2vw] group-hover:opacity-100"
        onMouseEnter={handleMouseEnter}
        onMouseLeave={handleMouseLeave}
      >
        <video
          ref={videoRef}
          className="cursor-pointer object-cover transition duration shadow-xl rounded-t-md w-full h-[12vw]"
          src={data.videoUrl}
          loop
          muted={false}
          poster={data.thumbnailUrl}
        />
        <div className="z-10 bg-zinc-800 p-2 lg:p-4 absolute w-full transition shadow-md rounded-b-md">
          <div className="flex flex-row items-center gap-3">
            <div
              onClick={handlePlay} // Use the handlePlay function
              className="cursor-pointer w-6 h-6 lg:w-10 lg:h-10 bg-white rounded-full flex justify-center items-center transition hover:bg-neutral-300"
            >
              <BsFillPlayFill size={30} />
            </div>
            <FavouriteButton movieId={data?.id} />
            <div
              onClick={() => openModal(data?.id)}
              className="cursor-pointer ml-auto group/item w-6 h-6 lg:w-10 lg:h-10 border-white border-2 rounded-full flex justify-center items-center transition hover:border-neutral-300"
            >
              <BiChevronDown
                className="text-white group-hover/item:text-neutral-300"
                size={30}
              />
            </div>
          </div>

          <p className="text-green-400 font-semibold mt-4">{data?.title}</p>

          <div className="flex flex-row mt-4 gap-2 items-center">
            <p className="text-white text-[10px] lg:text-sm">
              {data?.duration}
            </p>
          </div>

          <div className="flex flex-row mt-4 gap-2 items-center">
            <p className="text-white text-[10px] lg:text-sm">{data?.genre}</p>
          </div>
        </div>
      </div>
    </div>
  );
};

export default MovieCard;
