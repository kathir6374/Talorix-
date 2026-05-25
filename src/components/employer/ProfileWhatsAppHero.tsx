"use client";

import React from 'react';
import { WhatsAppButton } from '../common/WhatsAppButton';

export function ProfileWhatsAppHero({
    candidate
}: {
    candidate: any;
}) {
    const score = candidate.interviewAttempts?.[0]?.score || candidate.score || 80;

    let topSkill = "Skills";
    let skillsList: string[] = [];
    if (Array.isArray(candidate.skills)) {
        skillsList = candidate.skills;
    } else if (typeof candidate.skills === 'string') {
        try { skillsList = JSON.parse(candidate.skills); } catch (e) { }
    }
    if (skillsList.length > 0) topSkill = skillsList[0];

    const name = candidate.name || "Candidate";

    return (
        <div className="w-full sm:w-auto flex justify-center sm:justify-start -mt-2 sm:mt-0 sm:absolute sm:top-8 sm:right-8 z-10 font-inter" style={{ fontFamily: 'Inter, sans-serif' }}>
            {candidate.phone && (
                <WhatsAppButton
                    phone={candidate.phone}
                    name={name}
                    score={score}
                    skill={topSkill}
                    large={true}
                    mobileFullWidth={true}
                />
            )}
        </div>
    );
}
