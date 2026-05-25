"use client";

import { usePathname } from "next/navigation";
import { AnimatePresence, motion } from "framer-motion";
import DynamicNavbar from "@/components/DynamicNavbar";
import Footer from "@/components/Footer";

export default function ClientLayout({ children }: { children: React.ReactNode }) {
    const pathname = usePathname();
    const isAdminPage = pathname.startsWith("/admin");
    const isDashboard = pathname.includes("-dashboard");
    const isAuthPage = pathname === "/login" || pathname === "/signup" || pathname === "/forgot-password" || pathname === "/verify";
    const showNavFooter = !isAdminPage && !isDashboard && !isAuthPage;

    return (
        <div className="flex flex-col min-h-screen">
            {!isAdminPage && <DynamicNavbar />}
            <main className="flex-1 flex flex-col relative">
                <AnimatePresence mode="wait">
                    <motion.div
                        key={pathname}
                        initial={{ opacity: 0, y: 10 }}
                        animate={{ opacity: 1, y: 0 }}
                        exit={{ opacity: 0, y: -10 }}
                        transition={{ duration: 0.35, ease: [0.22, 1, 0.36, 1] }}
                        className="flex-1 flex flex-col"
                    >
                        {children}
                    </motion.div>
                </AnimatePresence>
            </main>
            {showNavFooter && <Footer />}
        </div>
    );
}
