import React from "react";
import Navbar from "./Navbar";

interface LayoutProps {
  children: React.ReactNode;
}

export default function Layout({ children }: LayoutProps) {
  return (
    <div className="min-h-screen bg-[#0A0E1A] text-white">
      <Navbar />
      <main className="max-w-6xl mx-auto w-full px-6 sm:px-8 lg:px-12 py-8">
        {children}
      </main>
    </div>
  );
}
