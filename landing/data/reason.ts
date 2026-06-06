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
        question: "What is Chillflix?",
        answer: "Chillflix is a streaming service that offers a wide variety of award-winning TV shows, movies, anime, documentaries, and more.",
    },
    {
        question: "How much does Chillflix cost?",
        answer: "Netflix offers several subscription plans ranging from basic to premium, ensuring something for everyone.",
    },
    {
        question: "Can I cancel my subscription?",
        answer: "Yes, you can cancel your subscription at any time without any cancellation fees.",
    },
    {
        question: "Can we pay in Cryptocurrancy?",
        answer: "Yes, you can pay your subscription bill via cryptocurrancy.",
    },
];
