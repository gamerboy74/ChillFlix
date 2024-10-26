// src/components/MoreReasons.tsx
import React from 'react';
import { reasons } from '../data/reason';
const MoreReasons: React.FC = () => {
    return (
        <section className="my-8 px-4">
            <h2 className="text-2xl font-bold mb-4 text-white">More Reasons to Join</h2>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                {reasons.map((reason) => (
                    <div key={reason.id} className="bg-customGray p-4 rounded-lg text-white">
                        <h3 className="text-xl font-semibold">{reason.title}</h3>
                        <p>{reason.description}</p>
                    </div>
                ))}
            </div>
        </section>
    );
};

export default MoreReasons;
