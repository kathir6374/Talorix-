"use client";

import { motion } from "framer-motion";

export type EmployerSidebarNavItem = "overview" | "talent" | "applicants" | "settings" | "post";

interface EmployerSidebarNavProps {
    activeItem: Exclude<EmployerSidebarNavItem, "post">;
    onSelect: (item: EmployerSidebarNavItem) => void;
}

const NAV_ITEMS: {
    id: Exclude<EmployerSidebarNavItem, "post">;
    label: string;
    iconPath: string;
}[] = [
    {
        id: "overview",
        label: "Home",
        iconPath: "M3 12l2-2m0 0l7-7 7 7M5 10v10a1 1 0 001 1h3m10-11l2 2m-2-2v10a1 1 0 01-1 1h-3m-6 0a1 1 0 001-1v-4a1 1 0 011-1h2a1 1 0 011 1v4a1 1 0 001 1m-6 0h6",
    },
    {
        id: "talent",
        label: "Find Talent",
        iconPath: "M13 10V3L4 14h7v7l9-11h-7z",
    },
    {
        id: "applicants",
        label: "Applicants",
        iconPath: "M12 4.354a4 4 0 110 5.292M15 21H3v-1a6 6 0 0112 0v1zm0 0h6v-1a6 6 0 00-9-5.197M13 7a4 4 0 11-8 0 4 4 0 018 0z",
    },
];

export function EmployerSidebarNav({ activeItem, onSelect }: EmployerSidebarNavProps) {
    return (
        <nav className="mobile-tab-bar">
            {NAV_ITEMS.map((item) => {
                const isActive = activeItem === item.id;

                return (
                    <motion.button
                        key={item.id}
                        type="button"
                        whileHover={{ y: -1 }}
                        whileTap={{ scale: 0.96 }}
                        onClick={() => onSelect(item.id)}
                        className={`relative flex-1 flex flex-col items-center justify-center py-2 h-14 gap-0.5 transition-[color,opacity] duration-200 ease-out ${isActive ? "text-primary" : "text-muted-foreground"}`}
                    >
                        {isActive && (
                            <motion.span
                                layoutId="employer-nav-active-pill"
                                className="absolute inset-x-1.5 inset-y-1 rounded-2xl bg-primary/10 border border-primary/15 shadow-[0_0_20px_rgba(255,122,0,0.14)]"
                                transition={{ type: "spring", stiffness: 340, damping: 30, mass: 0.45 }}
                            />
                        )}
                        <motion.svg
                            animate={{ y: isActive ? -1 : 0, scale: isActive ? 1.03 : 1 }}
                            transition={{ duration: 0.2, ease: [0.22, 1, 0.36, 1] }}
                            className="relative z-10 w-5 h-5"
                            fill="none"
                            viewBox="0 0 24 24"
                            stroke="currentColor"
                        >
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d={item.iconPath} />
                        </motion.svg>
                        <span className="relative z-10 block max-w-[56px] px-1 text-center text-[11px] font-semibold leading-tight whitespace-normal">
                            {item.label}
                        </span>
                    </motion.button>
                );
            })}
            <button
                type="button"
                onClick={() => onSelect("post")}
                className="flex-1 flex flex-col items-center justify-center py-2 h-14 gap-0.5 text-muted-foreground hover:text-primary transition-colors font-bold group"
            >
                <svg className="w-5 h-5 group-hover:scale-110 transition-transform" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
                </svg>
                <span className="block max-w-[56px] px-1 text-center text-[11px] font-semibold leading-tight whitespace-normal">
                    Post
                </span>
            </button>
            <motion.button
                type="button"
                whileHover={{ y: -1 }}
                whileTap={{ scale: 0.96 }}
                onClick={() => onSelect("settings")}
                className={`relative flex-1 flex flex-col items-center justify-center py-2 h-14 gap-0.5 transition-[color,opacity] duration-200 ease-out ${activeItem === "settings" ? "text-primary" : "text-muted-foreground"}`}
            >
                {activeItem === "settings" && (
                    <motion.span
                        layoutId="employer-nav-active-pill"
                        className="absolute inset-x-1.5 inset-y-1 rounded-2xl bg-primary/10 border border-primary/15 shadow-[0_0_20px_rgba(255,122,0,0.14)]"
                        transition={{ type: "spring", stiffness: 340, damping: 30, mass: 0.45 }}
                    />
                )}
                <motion.svg
                    animate={{ y: activeItem === "settings" ? -1 : 0, scale: activeItem === "settings" ? 1.03 : 1 }}
                    transition={{ duration: 0.2, ease: [0.22, 1, 0.36, 1] }}
                    className="relative z-10 w-5 h-5"
                    fill="none"
                    viewBox="0 0 24 24"
                    stroke="currentColor"
                >
                    <path
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        strokeWidth={2}
                        d="M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.065 2.572c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.572 1.065c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.065-2.572c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z M15 12a3 3 0 11-6 0 3 3 0 016 0z"
                    />
                </motion.svg>
                <span className="relative z-10 block max-w-[56px] px-1 text-center text-[11px] font-semibold leading-tight whitespace-normal">
                    Settings
                </span>
            </motion.button>
        </nav>
    );
}
