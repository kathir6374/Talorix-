"use client";

import { Suspense } from "react";
import { usePathname } from "next/navigation";
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
            {!isAdminPage && (
                <Suspense fallback={null}>
                    <DynamicNavbar />
                </Suspense>
            )}
            <main className="flex-1 flex flex-col relative">
                <div key={pathname} className="flex-1 flex flex-col">
                    {children}
                </div>
            </main>
            {showNavFooter && <Footer />}
        </div>
    );
}
