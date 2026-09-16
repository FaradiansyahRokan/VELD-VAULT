import type { Metadata } from "next";
import { JetBrains_Mono } from "next/font/google";
import "./globals.css";
import { Toaster } from 'sonner';
import { ThemeProvider } from "@/components/theme-provider";
import Navbar from "@/components/Navbar";
import PageAnimate from "@/components/PageAnimate";

const mono = JetBrains_Mono({ subsets: ["latin"], variable: '--font-mono' });

export const metadata: Metadata = {
  title: "CipherVault — Decentralized Encrypted Vault & Marketplace",
  description: "Secure Web3 data marketplace with client-side encryption and IPFS storage on BridgeStone L1",
  icons: {
    icon: "/icon.png",
    apple: "/apple-icon.png",
  }
};

export default function RootLayout({ children }: Readonly<{ children: React.ReactNode; }>) {
  return (
    <html lang="en" suppressHydrationWarning>
      <body className={`${mono.variable} font-sans antialiased bg-background text-foreground`}>
        <ThemeProvider attribute="class" defaultTheme="dark" enableSystem disableTransitionOnChange>
          {/* Floating iOS Navbar Header */}
          <div className="fixed top-0 left-0 right-0 z-50 pointer-events-none">
            <div className="pointer-events-auto">
              <Navbar />
            </div>
          </div>

          {/* Main Viewport */}
          <main className="fixed inset-0 w-full h-[100dvh] overflow-hidden bg-background">
            <PageAnimate>
              {children}
            </PageAnimate>
          </main>

          <Toaster 
            position="bottom-center"
            toastOptions={{
              className: "ios-glass-pill !rounded-2xl !text-sm !font-medium !shadow-xl !border !border-black/5 dark:!border-white/10",
            }}
          />
        </ThemeProvider>
      </body>
    </html>
  );
}