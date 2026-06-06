// src/data/data.ts
export interface Reason {
    id: number;
    title: string;
    description: string;
}

export interface FAQ {
    question: string;
    answer: string;
}

export const reasons: Reason[] = [
    {
        id: 1,
        title: "Watch Anytime, Anywhere",
        description: "Stream from any device, whether it’s your laptop, tablet, or mobile phone.",
    },
    {
        id: 2,
        title: "Exclusive Content",
        description: "Access to a vast library of movies, shows, and exclusive content.",
    },
    {
        id: 3,
        title: "Cancel Anytime",
        description: "You can cancel your subscription at any time without penalties.",
    },
];

export const faqs: FAQ[] = [
    {
        question: "What is ChillFlix?",
        answer: "ChillFlix is a streaming service that offers a wide variety of award-winning TV shows, movies, anime, documentaries, and more.",
    },
    {
        question: "How much does ChillFlix cost?",
        answer: "ChillFlix is completely free! We don't have any subscription plans right now, just sign up and start watching your favorite movies and series.",
    },
    {
        question: "Do I need a credit card to sign up?",
        answer: "No, you only need an email address to create an account and enjoy our content.",
    },
    {
        question: "Where can I watch?",
        answer: "Watch anywhere, anytime. Sign in with your ChillFlix account to watch instantly on the web at chillflix.com from your personal computer or on any internet-connected device.",
    },
];
