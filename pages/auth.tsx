import Input from "@/components/Input";
import { useCallback, useState, useEffect } from "react";
import axios from "axios";
import { signIn, useSession } from 'next-auth/react';
import { FcGoogle } from 'react-icons/fc';
import { FaGithub } from 'react-icons/fa';
import Web3 from "web3";
import { useRouter } from 'next/router';
import Image from "next/image";

const Auth = () => {
    const router = useRouter();
    const { data: session, status } = useSession();
    const [email, setEmail] = useState('');
    const [name, setName] = useState('');
    const [password, setPassword] = useState('');
    const [walletAddress, setWalletAddress] = useState<string | null>(null);
    const [variant, setVariant] = useState<'login' | 'register'>('login');
    const [error, setError] = useState<string | null>(null);
    const [isLoading, setIsLoading] = useState(false);

    useEffect(() => {
        if (status === "authenticated") {
            router.push('/main');
        }
    }, [status, router]);

    const toggleVariant = useCallback(() => {
        setVariant(currVariant => currVariant === 'login' ? 'register' : 'login');
        setError(null);
    }, []);

    const login = useCallback(async () => {
        setIsLoading(true);
        try {
            const result = await signIn('credentials', {
                email,
                password,
                redirect: false,
            });
    
            if (result?.error) {
                console.error("Login error:", result.error); // Log login error
                setError(result.error); // Show user-friendly error message
            } else {
                router.push('/main');
            }
        } catch (error) {
            console.error("Login failed:", error);
            setError("An unexpected error occurred during login.");
        } finally {
            setIsLoading(false);
        }
    }, [email, password, router]);
    

    const register = useCallback(async () => {
        if (!walletAddress) {
            alert("Please connect your wallet before signing up.");
            return;
        }

        setIsLoading(true);
        try {
            const response = await axios.post('/api/register', {
                email,
                name,
                password,
                walletAddress
            });
            if (response.status === 200) {
                await login();
            }
        } catch (error: any) {
            console.error("Registration Error:", error.response?.data?.error || error.message); // Log registration error
            setError(error.response?.data?.error || "An error occurred during registration.");
        } finally {
            setIsLoading(false);
        }
    }, [email, name, password, login, walletAddress]);

    const connectWallet = async () => {
        if (typeof window.ethereum !== "undefined") {
            try {
                const web3 = new Web3(window.ethereum);
                await window.ethereum.request({ method: "eth_requestAccounts" });
                const accounts = await web3.eth.getAccounts();
                setWalletAddress(accounts[0]);
            } catch (error: any) {
                console.error("Error connecting to wallet:", error);
                alert("Failed to connect wallet. Please check console for details."); // User feedback
            }
        } else {
            alert("MetaMask is not installed. Please install it to use this feature.");
        }
    };

    return (
        <div className="relative h-full w-full bg-[url('/images/hero.jpg')] bg-no-repeat bg-center bg-fixed bg-cover">
            <div className="bg-black h-full w-full lg:bg-opacity-50">
                <nav className="px-12 py-5">
                    <Image src="/images/logo2.png" alt="Netflix Logo" className="object-cover h-25" height={10} width={300}/>
                </nav>
                <div className="flex justify-center">
                    <div className="bg-black bg-opacity-70 px-16 py-16 self-center mt-2 lg:w-2/5 lg:max-w-md rounded-md w-full">
                        <h2 className="text-white text-4xl mb-8 font-semibold">
                            {variant === 'login' ? 'Sign in' : 'Register'}
                        </h2>
                        {error && <p className="text-red-500">{error}</p>}
                        <div className="flex flex-col gap-4">
                            {variant === 'register' && (
                                <Input
                                    label='Username'
                                    onChange={(evt: any) => setName(evt.target.value)}
                                    id='name'
                                    value={name}
                                />
                            )}
                            <Input
                                label='Email'
                                onChange={(evt: any) => setEmail(evt.target.value)}
                                id='email'
                                type='email'
                                value={email}
                            />
                            <Input
                                label='Password'
                                onChange={(evt: any) => setPassword(evt.target.value)}
                                id='password'
                                type='password'
                                value={password}
                            />
                        </div>
                        <button
                            onClick={isLoading ? undefined : (variant === 'login' ? login : register)}
                            className={`bg-red-600 py-3 text-white rounded-md w-full mt-10 hover:bg-red-700 transition ${isLoading ? 'opacity-50 cursor-not-allowed' : ''}`}>
                            {isLoading ? 'Loading...' : (variant === 'login' ? 'Login' : 'Sign up')}
                        </button>
                        <div className="flex flex-row items-center gap-4 mt-8 justify-center">
                            <div
                                onClick={() => signIn('google', { callbackUrl: '/main' })}
                                className="w-10 h-10 bg-white rounded-full flex items-center justify-center cursor-pointer hover:opacity-80 transition"
                            >
                                <FcGoogle size={30} />
                            </div>
                            <div
                                onClick={() => signIn('github', { callbackUrl: '/main' })}
                                className="w-10 h-10 bg-white rounded-full flex items-center justify-center cursor-pointer hover:opacity-80 transition"
                            >
                                <FaGithub size={30} />
                            </div>
                        </div>
                        <div className="mt-4">
                            <button
                                onClick={connectWallet}
                                className="bg-blue-500 py-3 text-white rounded-md w-full mt-4 hover:bg-blue-600 transition"
                            >
                                {walletAddress ? `Connected: ${walletAddress.slice(0, 6)}...${walletAddress.slice(-4)}` : 'Connect Wallet'}
                            </button>
                        </div>
                        <p className="text-neutral-500 mt-12">
                            {variant === 'login' ? "First time on Netflix?" : "Already have an account?"}
                            <span onClick={toggleVariant} className="text-white ml-1 hover:underline cursor-pointer">
                                {variant === 'login' ? "Create an account" : "Login"}
                            </span>
                        </p>
                    </div>
                </div>
            </div>
        </div>
    );
};

export default Auth;
