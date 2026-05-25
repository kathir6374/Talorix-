import Link from 'next/link';
import React from 'react';
import { WhatsAppButton } from '../common/WhatsAppButton';

export function CandidateCardCompact({
    candidate,
    jobTitle,
    jobId
}: {
    candidate: any;
    jobTitle?: string;
    jobId?: string;
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
    const location = [candidate.city, candidate.state].filter(Boolean).join(", ") || "Remote";
    const salary = candidate.expected_salary || "";
    const locationAndSalary = [location, salary].filter(Boolean).join(" – ");

    return (
        <div
            className="w-full min-w-0 bg-[#FFFFFF] border border-[#E5E7EB] rounded-md p-3 flex flex-col md:flex-row justify-between items-start md:items-center box-border gap-2 md:gap-0 overflow-hidden md:h-[72px] hover:border-[#FF7A00]/30 transition-all shadow-sm"
            style={{ fontFamily: 'Inter, sans-serif' }}
        >
            <div className="flex flex-col justify-center truncate w-full pr-0 md:pr-2">
                <div className="flex justify-between items-start w-full">
                    <Link href={`/candidate/${candidate.id}`} className="truncate flex-1 pr-2 group">
                        <h4 className="text-[#111827] text-[16px] font-medium leading-none truncate group-hover:text-[#FF7A00] transition-colors">{name}</h4>
                        <p className="text-[#6B7280] text-[14px] leading-snug truncate mt-1">{score} {topSkill}</p>
                        <p className="text-[#9CA3AF] text-[12px] leading-none truncate mt-1">{locationAndSalary}</p>
                    </Link>
                    {/* Desktop Button */}
                    {candidate.phone && (
                        <div className="hidden md:block shrink-0">
                            <WhatsAppButton
                                phone={candidate.phone}
                                name={name}
                                score={score}
                                skill={topSkill}
                                jobTitle={jobTitle}
                                jobId={jobId}
                            />
                        </div>
                    )}
                </div>
            </div>
            {/* Mobile Button */}
            {candidate.phone && (
                <div className="block md:hidden w-full shrink-0">
                    <WhatsAppButton
                        phone={candidate.phone}
                        name={name}
                        score={score}
                        skill={topSkill}
                        jobTitle={jobTitle}
                        jobId={jobId}
                        mobileFullWidth={true}
                    />
                </div>
            )}
        </div>
    );
}
