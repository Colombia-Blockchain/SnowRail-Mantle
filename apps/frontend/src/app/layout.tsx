import type { Metadata } from "next";
import { Providers } from "../components/providers";
import { Navbar } from "../components/navbar";
import "../styles/globals.css";

export const metadata: Metadata = {
  title: "SnowRail - AI Treasury on Mantle",
  description: "Autonomous AI-Powered Treasury on Mantle Network",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en">
      <body className="min-h-screen text-white font-sans bg-[#0a0a16] overflow-x-hidden">
        <Providers>
          <main className="w-full">
            {children}
          </main>
        </Providers>
      </body>
    </html>
  );
}
