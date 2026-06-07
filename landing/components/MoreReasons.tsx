import React from 'react';
import { reasons } from '../data/reason';
import { Monitor, Sparkles, XCircle } from 'lucide-react';

const MoreReasons: React.FC = () => {
    const getIcon = (id: number) => {
        switch (id) {
            case 1:
                return <Monitor className="text-red-500 w-8 h-8 mb-4 stroke-[1.5] drop-shadow-[0_0_8px_rgba(220,38,38,0.4)]" />;
            case 2:
                return <Sparkles className="text-red-500 w-8 h-8 mb-4 stroke-[1.5] drop-shadow-[0_0_8px_rgba(220,38,38,0.4)]" />;
            case 3:
                return <XCircle className="text-red-500 w-8 h-8 mb-4 stroke-[1.5] drop-shadow-[0_0_8px_rgba(220,38,38,0.4)]" />;
            default:
                return <Sparkles className="text-red-500 w-8 h-8 mb-4 stroke-[1.5]" />;
        }
    };

    return (
        <section className="my-16 px-6 md:px-12 flex flex-col items-center" style={{ fontFamily: "'Outfit', sans-serif" }}>
            <div className="w-full max-w-6xl">
                <h2 className="text-xl md:text-2xl font-extrabold mb-6 text-white tracking-tight">More Reasons to Join</h2>
                <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                    {reasons.map((reason) => (
                        <div 
                            key={reason.id} 
                            className="bg-zinc-900/80 border border-white/[0.06] p-6 rounded-2xl text-white transition-all duration-300 hover:scale-[1.02] hover:bg-zinc-900 hover:border-red-650/30 hover:shadow-[0_15px_30px_rgba(0,0,0,0.5)] flex flex-col items-start backdrop-blur-sm"
                        >
                            {getIcon(reason.id)}
                            <h3 className="text-lg font-bold mb-2 tracking-tight">{reason.title}</h3>
                            <p className="text-zinc-300 text-sm leading-relaxed">{reason.description}</p>
                        </div>
                    ))}
                </div>
            </div>
        </section>
    );
};

export default MoreReasons;
