"use client";

import React from "react";
import { MentoradoAuthProvider } from '@/contexts/mentorado-auth';
import EnhancedAIChat from "../../components/ui/enhanced-ai-chat";

export default function AreaDoAlunoPage() {
  return (
    <MentoradoAuthProvider>
      <main className="min-h-screen w-full">
        <EnhancedAIChat />
      </main>
    </MentoradoAuthProvider>
  );
}