import React, { useState } from 'react';
import { faqs } from '../data/reason';
import { ChevronDown } from 'lucide-react';

const FAQSection: React.FC = () => {
    const [openIndex, setOpenIndex] = useState<number | null>(null);

    const handleToggle = (index: number) => {
        setOpenIndex(openIndex === index ? null : index);
    };

    return (
        <section className="my-16 px-6 md:px-12 flex flex-col items-center" style={{ fontFamily: "'Outfit', sans-serif" }}>
            <div className="w-full max-w-6xl">
                <h2 className="text-xl md:text-2xl font-extrabold mb-6 text-white tracking-tight">Frequently Asked Questions</h2>
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
            </div>
        </section>
    );
};

interface FAQCardProps {
    question: string;
    answer: string;
    isOpen: boolean;
    onToggle: () => void;
}

const FAQCard: React.FC<FAQCardProps> = ({ question, answer, isOpen, onToggle }) => {
    return (
        <div className="bg-zinc-900/80 border border-white/[0.06] rounded-2xl overflow-hidden shadow-lg w-full transition-all duration-300 hover:bg-zinc-900 hover:border-white/[0.1] backdrop-blur-sm">
            <div
                className="flex justify-between items-center p-5 cursor-pointer select-none"
                onClick={onToggle}
            >
                <h4 className="text-base sm:text-lg font-bold text-white tracking-tight">{question}</h4>
                <div className={`text-zinc-300 p-1.5 rounded-full bg-white/5 transition-all duration-300 ${
                    isOpen ? 'rotate-180 text-red-500 bg-red-500/10' : 'rotate-0'
                }`}>
                    <ChevronDown size={18} />
                </div>
            </div>
            
            {/* Smooth sliding height transition wrapper */}
            <div 
                className={`overflow-hidden transition-all duration-300 ease-in-out ${
                    isOpen ? 'max-h-96 opacity-100' : 'max-h-0 opacity-0'
                }`}
            >
                <div className="p-5 pt-0 text-zinc-300 text-sm sm:text-base leading-relaxed border-t border-white/[0.04] bg-black/10">
                    {answer}
                </div>
            </div>
        </div>
    );
};

export default FAQSection;
