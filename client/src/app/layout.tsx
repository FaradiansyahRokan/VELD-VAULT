import type { Metadata } from "next";
import { Inter, JetBrains_Mono } from "next/font/google";
import "./globals.css";
import { Toaster } from 'sonner';
import { ThemeProvider } from "@/components/theme-provider";
import Navbar from "@/components/Navbar";
import PageAnimate from "@/components/PageAnimate";

const inter = Inter({ subsets: ["latin"], variable: '--font-inter' });
const mono = JetBrains_Mono({ subsets: ["latin"], variable: '--font-mono' });

export const metadata: Metadata = {
  title: "CipherVault",
  description: "Secure Decentralized Storage",
};

export default function RootLayout({ children }: Readonly<{ children: React.ReactNode; }>) {
  return (
    <html lang="en" suppressHydrationWarning>
      <body className={`${inter.variable} ${mono.variable} font-sans antialiased bg-background text-foreground overflow-x-hidden`}>
        <ThemeProvider attribute="class" defaultTheme="dark" enableSystem disableTransitionOnChange>
            
            {/* 1. NAVBAR FIXED (LAYER PALING ATAS, DIAM DI TEMPAT) */}
            {/* z-index 50 biar selalu di atas konten yg bergerak */}
            <div className="fixed top-0 left-0 right-0 z-50">
               <Navbar />
            </div>

            {/* 2. AREA KONTEN (LAYER BAWAH, BERGERAK) */}
            {/* overflow-hidden biar gak ada scrollbar horizontal pas animasi */}
            <main className="relative w-full min-h-screen overflow-x-hidden">
                <PageAnimate>
                    {children}
                </PageAnimate>
            </main>

            <Toaster position="bottom-center" />
        </ThemeProvider>
      </body>
    </html>
  );
}