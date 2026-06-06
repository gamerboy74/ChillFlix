import "@/styles/globals.css";
import type { AppProps } from "next/app";
import { SessionProvider } from "next-auth/react";
import { Toaster } from "react-hot-toast";

export default function App({
  Component,
  pageProps: { session, ...pageProps },
}: AppProps) {
  return (
    <SessionProvider session={session}>
        <Toaster
          position="top-center"
          toastOptions={{
            duration: 4000,
            style: {
              background: "#1a1a1a",
              color: "#fff",
              borderRadius: "8px",
            },
            success: {
              iconTheme: {
                primary: "#e50914",
                secondary: "#fff",
              },
            },
          }}
        />
        <Component {...pageProps} />
    </SessionProvider>
  );
}
