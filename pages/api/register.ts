import { NextApiRequest, NextApiResponse } from "next";
import prismadb from "@/lib/prismadb"; // Ensure your database connection is set up correctly
import bcrypt from 'bcrypt'; // For password hashing

// Define an interface for the request body
interface RegisterRequestBody {
    email: string;
    name: string;
    password: string;
    walletAddress: string; // Include walletAddress here
}

export default async function registerHandler(req: NextApiRequest, res: NextApiResponse) {
    if (req.method !== 'POST') {
        return res.status(405).json({ message: 'Method not allowed' });
    }

    try {
        const { email, name, password, walletAddress }: RegisterRequestBody = req.body;

        // Check if the email already exists
        const existingUser = await prismadb.user.findUnique({
            where: { email },
        });

        if (existingUser) {
            return res.status(422).json({ error: 'Email already taken' });
        }

        // Check if the wallet address is already associated with another email
        const existingWalletUser = await prismadb.user.findUnique({
            where: { walletAddress },
        });

        if (existingWalletUser) {
            return res.status(422).json({ error: 'Wallet address already registered' });
        }

        // Hash the password securely
        const hashedPassword = await bcrypt.hash(password, 12);

        // Create a new user in the database
        const user = await prismadb.user.create({
            data: {
                email,
                name,
                hashedPassword,
                image: '', // Handle user images accordingly
                emailVerified: new Date(), // Adjust this according to your email verification flow
                walletAddress, // Save the wallet address
            },
        });

        // Return the created user as a response, excluding sensitive information
        const { hashedPassword: _, ...userWithoutPassword } = user;

        return res.status(201).json(userWithoutPassword); // Return created user

    } catch (error) {
        console.error("Registration error:", error); // Log the error for debugging
        return res.status(500).json({ error: 'Registration failed' }); // Return a generic error response
    }
}
