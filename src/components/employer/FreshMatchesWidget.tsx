"use client";

import React, { useEffect, useState } from 'react';
import { CandidateCardCompact } from './CandidateCardCompact';

export function FreshMatchesWidget({
    employerJobId,
    employerJobTitle
}: {
    employerJobId?: string,
    employerJobTitle?: string
}) {
    const [matches, setMatches] = useState<any[]>([]);
    const [loading, setLoading] = useState(true);

    const fetchMatches = async () => {
        try {
            const res = await fetch("/api/employer/fresh-matches");
            if (res.ok) {
                const data = await res.json();
                setMatches(data.candidates || []);
            }
        } catch (e) {
            console.error(e);
        } finally {
            if (loading) setLoading(false);
        }
    };

    useEffect(() => {
        fetchMatches();
        // Simulate Supabase Realtime with rapid polling (10s)
        const interval = setInterval(() => {
            fetchMatches();
        }, 10000);
        return () => clearInterval(interval);
    }, []);

    if (loading && matches.length === 0) return null;
    if (matches.length === 0) return null;

    return (
        <div className="w-full h-full mb-0 font-inter" style={{ fontFamily: 'Inter, sans-serif' }}>
            <h3 className="text-[14px] font-medium text-[#111827] mb-3 leading-none uppercase tracking-wider">
                New Today for Your Jobs ({matches.length})
            </h3>
            <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-1 2xl:grid-cols-2 gap-2.5 w-full">
                {matches.map((candidate) => (
                    <CandidateCardCompact
                        key={candidate.id}
                        candidate={candidate}
                        jobTitle={employerJobTitle}
                        jobId={employerJobId}
                    />
                ))}
            </div>
        </div>
    );
}
