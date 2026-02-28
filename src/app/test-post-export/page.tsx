"use client";

import { useState } from "react";
import { PostPreview } from "@/components/posts/PostPreview";
import { ExportButton } from "@/components/posts/ExportButton";
import type { PostData, FontStyle } from "@/types";

const POST_TEXT = `Pare um segundo. Respire fundo.

Sabemos que a rotina é intensa, os desafios são constantes. Mas você... você não é apenas um profissional da saúde.

Você é a esperança, o alívio, a transformação na vida de alguém.

Lembre-se daquele "muito obrigado" sincero, daquele sorriso de quem reencontrou a saúde.

O mundo precisa da sua dedicação. Continue brilhando!`;

const FONT_STYLES: { value: FontStyle; label: string }[] = [
  { value: "modern", label: "Montserrat" },
  { value: "elegant", label: "Playfair" },
  { value: "bold", label: "Oswald" },
  { value: "minimal", label: "Inter" },
];

export default function TestPostExport() {
  const [canvasRef, setCanvasRef] = useState<HTMLDivElement | null>(null);
  const [template, setTemplate] = useState<"dark" | "light">("dark");
  const [fontStyle, setFontStyle] = useState<FontStyle>("modern");

  const postData: PostData = {
    template,
    text: POST_TEXT,
    fontSize: 34,
    fontStyle,
    profileName: "Gabriel Maia",
    profileHandle: "@drgabriel.maia",
  };

  return (
    <div className="min-h-screen bg-gray-950 text-white p-8">
      <h1 className="text-2xl font-bold mb-2">Teste de Export - Post Templates</h1>
      <p className="text-gray-400 mb-6">Teste os estilos de fonte e templates</p>

      <div className="flex gap-3 mb-4">
        <button
          onClick={() => setTemplate("dark")}
          className={`px-4 py-2 rounded-lg text-sm font-medium transition ${
            template === "dark" ? "bg-white text-black" : "bg-gray-800 text-gray-300 hover:bg-gray-700"
          }`}
        >
          Dark
        </button>
        <button
          onClick={() => setTemplate("light")}
          className={`px-4 py-2 rounded-lg text-sm font-medium transition ${
            template === "light" ? "bg-white text-black" : "bg-gray-800 text-gray-300 hover:bg-gray-700"
          }`}
        >
          Light
        </button>
      </div>

      <div className="flex gap-3 mb-6">
        {FONT_STYLES.map((fs) => (
          <button
            key={fs.value}
            onClick={() => setFontStyle(fs.value)}
            className={`px-4 py-2 rounded-lg text-sm font-medium transition ${
              fontStyle === fs.value ? "bg-green-600 text-white" : "bg-gray-800 text-gray-300 hover:bg-gray-700"
            }`}
          >
            {fs.label}
          </button>
        ))}
      </div>

      <div className="max-w-[600px] mb-6" style={{ height: "600px" }}>
        <PostPreview data={postData} onCanvasRef={setCanvasRef} />
      </div>

      <div className="max-w-[300px]">
        <ExportButton canvasRef={canvasRef} template={template} />
      </div>
    </div>
  );
}
