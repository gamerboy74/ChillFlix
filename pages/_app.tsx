import "@/styles/globals.css";
import type { AppProps } from "next/app";
import { WalletProvider } from "../context/WalletContext";
import { SessionProvider } from 'next-auth/react';

export default function App({ Component, pageProps: { session, ...pageProps } }: AppProps) {
  return (
    <SessionProvider session={session}>
    <WalletProvider>
      <Component {...pageProps} />
    </WalletProvider></SessionProvider>
  );
}
