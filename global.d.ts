import {PrismaClient} from "@prisma/client";

// global.d.ts
import { MetaMaskInpageProvider } from "@metamask/providers";

declare global {
    interface Window {
        ethereum?: MetaMaskInpageProvider;
    }
}



declare global {
    namespace globalThis {
        var prismadb: PrismaClient;
    }
}