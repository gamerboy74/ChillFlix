import Input from "@/components/Input";
import { useCallback, useState, useEffect } from "react";
import axios from "axios";
import { signIn, useSession } from "next-auth/react";
import { FcGoogle } from "react-icons/fc";
import { FaGithub } from "react-icons/fa";
import { useRouter } from "next/router";
import Image from "next/image";
import toast, { Toaster } from "react-hot-toast";
import { Loader2 } from "lucide-react";

const Auth = () => {
  const router = useRouter();
  const { data: session, status } = useSession();
  const [email, setEmail] = useState("");
  const [name, setName] = useState("");
  const [password, setPassword] = useState("");
  const [variant, setVariant] = useState<"login" | "register">("login");
  const [isLoading, setIsLoading] = useState(false);

  useEffect(() => {
    if (status === "authenticated") {
      router.push("/main");
    }
  }, [status, router]);

  const toggleVariant = useCallback(() => {
    setVariant((curr) => (curr === "login" ? "register" : "login"));
  }, []);

  const login = useCallback(async () => {
    setIsLoading(true);
    try {
      const result = await signIn("credentials", { email, password, redirect: false });
      if (result?.error) {
        if (result.error === "OAUTH_ACCOUNT_NO_PASSWORD") {
          toast.error("You originally signed up with a social account (Google/GitHub). Please use that button to sign in.", { duration: 5000 });
        } else {
          toast.error(result.error);
        }
      } else {
        toast.success("Welcome back to ChillFlix!");
        router.push("/main");
      }
    } catch (error) {
      toast.error("An unexpected error occurred during login.");
    } finally {
      setIsLoading(false);
    }
  }, [email, password, router]);

  const register = useCallback(async () => {
    setIsLoading(true);
    try {
      const response = await axios.post("/api/register", { email, name, password });
      if (response.status === 201) {
        toast.success("Account created! Signing you in…");
        await login();
      }
    } catch (error: any) {
      toast.error(error.response?.data?.error ?? "Registration failed.");
    } finally {
      setIsLoading(false);
    }
  }, [email, name, password, login]);

  return (
    <div className="relative min-h-screen w-full overflow-hidden bg-[#0a0a0a]">

      {/* Background image */}
      <div className="absolute inset-0">
        <Image
          src="/images/hero.jpg"
          alt="background"
          fill
          className="object-cover opacity-30"
          priority
          sizes="100vw"
        />
        {/* Gradient overlays */}
        <div className="absolute inset-0 bg-gradient-to-t from-[#0a0a0a] via-[#0a0a0a]/60 to-[#0a0a0a]/30" />
        <div className="absolute inset-0 bg-gradient-to-r from-[#0a0a0a]/80 via-transparent to-[#0a0a0a]/80" />
      </div>

      {/* Nav logo */}
      <nav className="relative z-10 px-8 sm:px-16 pt-8">
        <Image
          src="/images/logo2.png"
          alt="ChillFlix"
          width={160}
          height={45}
          className="h-9 sm:h-11 w-auto object-contain cursor-pointer"
          onClick={() => router.push("/")}
        />
      </nav>

      {/* Auth card */}
      <div className="relative z-10 flex items-center justify-center min-h-[calc(100vh-80px)] px-4">
        <div className="w-full max-w-md animate-fade-in-scale">
          <div className="glass-card rounded-2xl px-8 sm:px-10 py-10 shadow-[0_32px_80px_rgba(0,0,0,0.8)]">
            {/* Header */}
            <div className="mb-8">
              <h1 className="text-white text-3xl font-extrabold tracking-tight mb-1">
                {variant === "login" ? "Sign in" : "Create account"}
              </h1>
              <p className="text-zinc-500 text-sm">
                {variant === "login"
                  ? "Welcome back to ChillFlix"
                  : "Join ChillFlix today — it's free"}
              </p>
            </div>

            {/* Fields */}
            <div className="flex flex-col gap-4">
              {variant === "register" && (
                <Input
                  label="Full Name"
                  onChange={(evt: any) => setName(evt.target.value)}
                  id="name"
                  value={name}
                />
              )}
              <Input
                label="Email address"
                onChange={(evt: any) => setEmail(evt.target.value)}
                id="email"
                type="email"
                value={email}
              />
              <Input
                label="Password"
                onChange={(evt: any) => setPassword(evt.target.value)}
                id="password"
                type="password"
                value={password}
              />
            </div>

            {/* Submit button */}
            <button
              id="auth-submit-btn"
              onClick={isLoading ? undefined : variant === "login" ? login : register}
              disabled={isLoading}
              className={`w-full mt-7 py-3.5 rounded-xl font-bold text-white text-sm
                flex items-center justify-center gap-2
                transition-all duration-200
                ${isLoading
                  ? "bg-red-800/60 cursor-not-allowed opacity-70"
                  : "btn-red cursor-pointer"
                }`}
            >
              {isLoading ? (
                <>
                  <Loader2 size={16} className="animate-spin" />
                  {variant === "login" ? "Signing in…" : "Creating account…"}
                </>
              ) : (
                variant === "login" ? "Sign In" : "Create Account"
              )}
            </button>

            {/* Divider */}
            <div className="flex items-center gap-3 my-6">
              <div className="flex-1 h-px bg-zinc-800" />
              <span className="text-zinc-600 text-xs font-medium">or continue with</span>
              <div className="flex-1 h-px bg-zinc-800" />
            </div>

            {/* Social OAuth */}
            <div className="flex flex-row gap-3">
              <button
                id="google-signin-btn"
                onClick={() => signIn("google", { callbackUrl: "/main" })}
                className="flex-1 flex items-center justify-center gap-2.5 bg-zinc-900 hover:bg-zinc-800
                  border border-zinc-700/60 hover:border-zinc-600
                  rounded-xl py-3 text-sm font-semibold text-zinc-300 hover:text-white
                  transition-all duration-200"
              >
                <FcGoogle size={20} />
                <span className="hidden sm:inline">Google</span>
              </button>
              <button
                id="github-signin-btn"
                onClick={() => signIn("github", { callbackUrl: "/main" })}
                className="flex-1 flex items-center justify-center gap-2.5 bg-zinc-900 hover:bg-zinc-800
                  border border-zinc-700/60 hover:border-zinc-600
                  rounded-xl py-3 text-sm font-semibold text-zinc-300 hover:text-white
                  transition-all duration-200"
              >
                <FaGithub size={19} />
                <span className="hidden sm:inline">GitHub</span>
              </button>
            </div>

            {/* Toggle */}
            <p className="text-zinc-500 text-sm mt-8 text-center">
              {variant === "login" ? "New to ChillFlix?" : "Already have an account?"}
              {" "}
              <button
                id="toggle-auth-variant"
                onClick={toggleVariant}
                className="text-white font-semibold hover:underline underline-offset-2 cursor-pointer"
              >
                {variant === "login" ? "Create an account" : "Sign in"}
              </button>
            </p>
          </div>
        </div>
      </div>
    </div>
  );
};

export default Auth;
