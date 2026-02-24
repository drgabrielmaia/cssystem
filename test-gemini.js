const { GoogleGenerativeAI } = require('@google/generative-ai');

require('dotenv').config();
const GEMINI_API_KEY = process.env.GEMINI_API_KEY;

async function testGemini() {
  try {
    console.log('🧪 Testando Gemini API...');
    
    const genAI = new GoogleGenerativeAI(GEMINI_API_KEY);
    
    const model = genAI.getGenerativeModel({ 
      model: "gemma-3-27b-it", // Modelo Gemma 3 27B
      generationConfig: {
        temperature: 0.7,
        topK: 40,
        topP: 0.95,
        maxOutputTokens: 2048,
      },
    });

    const prompt = 'Olá, este é um teste simples. Responda apenas "Funcionando!"';
    
    console.log('🚀 Enviando prompt para Gemma 3 27B...');
    
    const result = await model.generateContent(prompt);
    const response = await result.response;
    const text = response.text();
    
    console.log('✅ Sucesso:', text);
    
  } catch (error) {
    console.error('❌ Erro:', error.message);
    console.error('Detalhes:', error);
  }
}

testGemini();