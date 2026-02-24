"use client";

import React from "react";
import RuixenMoonChat from "@/components/ui/ruixen-moon-chat";

export default function ChatIAPersonaPage() {
  return (
    <main className="min-h-screen w-full bg-black text-white">
      {/* Chat Component */}
      <section className="flex justify-center items-start w-full">
        <RuixenMoonChat />
      </section>

      {/* Footer */}
      <footer className="absolute bottom-0 left-0 right-0 text-center text-neutral-500 py-2 border-t border-neutral-800 text-sm">
        © {new Date().getFullYear()} Chat IA Persona - Exclusivo para emersonbljr2802@gmail.com
      </footer>
    </main>
  );
}