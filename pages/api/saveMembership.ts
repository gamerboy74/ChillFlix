import { NextApiRequest, NextApiResponse } from 'next';
import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== 'POST') {
    return res.status(405).json({ message: 'Method Not Allowed' });
  }

  try {
    const { walletAddress, plan, date } = req.body;

    await prisma.membership.create({
      data: {
        walletAddress,
        plan,
        date: new Date(date),
      },
    });

    res.status(200).json({ message: 'Membership saved successfully' });
  } catch (error) {
    console.error('Error saving membership:', error);
    res.status(500).json({ error: 'Failed to save membership data' });
  }
}
