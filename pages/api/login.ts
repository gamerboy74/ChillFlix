import { NextApiRequest, NextApiResponse } from "next";
import prismadb from "@/lib/prismadb";
import bcrypt from 'bcrypt';

// Define an interface for the login request body
interface LoginRequestBody {
    email: string;
    password: string;
    walletAddress: string; // Include walletAddress here
}

export default async function loginHandler(req: NextApiRequest, res: NextApiResponse) {
    if (req.method !== 'POST') {
        return res.status(405).json({ message: 'Method not allowed' });
    }

    try {
        const { email, password, walletAddress }: LoginRequestBody = req.body;

        // Find the user by email
        const user = await prismadb.user.findUnique({
            where: { email },
        });

        if (!user) {
            return res.status(401).json({ error: 'Invalid email or password' });
        }

        // Check if the wallet address matches
        if (user.walletAddress !== walletAddress) {
            return res.status(401).json({ error: 'Wallet address does not match' });
        }

        // Verify the password
        const isValidPassword = await bcrypt.compare(password, user.hashedPassword);
        if (!isValidPassword) {
            return res.status(401).json({ error: 'Invalid email or password' });
        }

        // Optionally return a sanitized user object
        const { hashedPassword, ...userWithoutPassword } = user;

        return res.status(200).json(userWithoutPassword); // Successfully logged in

    } catch (error) {
        console.error("Login error:", error); // Log the error for debugging
        return res.status(500).json({ error: 'An unexpected error occurred' });
    }
}
