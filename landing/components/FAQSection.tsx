// src/components/FAQSection.tsx
import React, { useState } from 'react';
import { faqs } from '../data/reason';

const FAQSection: React.FC = () => {
    const [openIndex, setOpenIndex] = useState<number | null>(null); // Track the currently open question

    const handleToggle = (index: number) => {
        // Toggle the question
        setOpenIndex(openIndex === index ? null : index);
    };

    return (
        <section className="my-8 px-4">
            <h2 className="text-2xl font-bold mb-4 text-white">Frequently Asked Questions</h2>
            <div className="flex flex-col space-y-4">
                {faqs.map((faq, index) => (
                    <FAQCard 
                        key={index} 
                        question={faq.question} 
                        answer={faq.answer} 
                        isOpen={openIndex === index} 
                        onToggle={() => handleToggle(index)} 
                    />
                ))}
            </div>
        </section>
    );
};

interface FAQCardProps {
    question: string;
    answer: string;
    isOpen: boolean; // Indicate if the card is open
    onToggle: () => void; // Function to handle toggle
}

const FAQCard: React.FC<FAQCardProps> = ({ question, answer, isOpen, onToggle }) => {
    return (
        <div className="bg-customGray rounded-lg shadow-md w-full">
            <div
                className="flex justify-between items-center p-4 cursor-pointer"
                onClick={onToggle} // Use the toggle function passed from FAQSection
            >
                <h4 className="text-lg font-semibold text-white">{question}</h4>
                <button className="text-white">
                    {isOpen ? '-' : '+'}
                </button>
            </div>
            {isOpen && (
                <div className="p-4 bg-customGray">
                    <p className="text-gray-300">{answer}</p>
                </div>
            )}
        </div>
    );
};

export default FAQSection;
