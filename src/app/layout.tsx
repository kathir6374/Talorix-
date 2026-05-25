import type { Metadata } from "next";
import { Inter } from "next/font/google";
import "./globals.css";
import { ThemeProvider } from "@/components/ThemeProvider";
import ClientLayout from "@/components/ClientLayout";
import { ToastProvider } from "@/components/ToastProvider";

const inter = Inter({ subsets: ["latin"], variable: '--font-inter' });

export const metadata: Metadata = {
  metadataBase: new URL("https://talorix.com"),
  title: {
    default: "Talorix | AI-Powered Hiring & Interview Platform",
    template: "%s | Talorix"
  },
  description: "Talorix is the premier AI hiring platform connecting ambitious candidates with forward-thinking companies. Experience fair, fast, and unbiased AI interview scoring.",
  keywords: [
    "AI hiring platform",
    "AI job search",
    "automated interview scoring",
    "AI recruiter",
    "unbiased hiring",
    "job board with AI",
    "skill-based hiring",
    "candidate screening software",
    "remote tech jobs",
    "startup hiring",
    "AI mock interviews",
    "Talorix"
  ],
  authors: [{ name: "Talorix Team" }],
  creator: "Talorix",
  publisher: "Talorix",
  openGraph: {
    type: "website",
    locale: "en_US",
    url: "https://talorix.com",
    title: "Talorix | AI-Powered Hiring & Interview Platform",
    description: "Find your dream job or the perfect candidate with our unbiased AI-powered screening. Fair, fast, and transparent.",
    siteName: "Talorix",
    images: [
      {
        url: "/brand/talorix-og.jpg", // This will fallback gracefully if not present
        width: 1200,
        height: 630,
        alt: "Talorix - AI-Powered Hiring Platform",
      },
    ],
  },
  twitter: {
    card: "summary_large_image",
    title: "Talorix | AI-Powered Hiring Platform",
    description: "Hire AI-screened talent faster or land your next job purely based on skills. Say goodbye to bias.",
    images: ["/brand/talorix-og.jpg"],
  },
  robots: {
    index: true,
    follow: true,
    googleBot: {
      index: true,
      follow: true,
      'max-video-preview': -1,
      'max-image-preview': 'large',
      'max-snippet': -1,
    },
  },
};

export const dynamic = "force-dynamic";

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" suppressHydrationWarning>
      <body suppressHydrationWarning className={`${inter.variable} font-sans bg-background text-foreground transition-colors duration-300`}>
        <ThemeProvider
          attribute="class"
          defaultTheme="system"
          enableSystem
          disableTransitionOnChange
        >
          <ToastProvider>
            <div className="antialiased min-h-screen flex flex-col">
              <ClientLayout>{children}</ClientLayout>
            </div>
          </ToastProvider>
        </ThemeProvider>
      </body>
    </html>
  );
}
