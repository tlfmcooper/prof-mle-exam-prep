import { GoogleGenerativeAI } from '@google/generative-ai';

interface ChatMessage {
  role: 'user' | 'model';
  parts: { text: string }[];
}

interface GenerateResponseParams {
  apiKey: string;
  history: ChatMessage[];
  message: string;
  systemInstruction?: string;
}

export async function generateGeminiResponse({
  apiKey,
  history,
  message,
  systemInstruction,
}: GenerateResponseParams) {
  const genAI = new GoogleGenerativeAI(apiKey);
  const model = genAI.getGenerativeModel({
    model: 'gemini-1.5-flash', // Or gemini-1.5-pro
    systemInstruction: systemInstruction,
    tools: [
      {
        // @ts-ignore - The SDK types might be slightly behind the feature
        googleSearch: {},
      },
    ],
  });

  const chat = model.startChat({
    history: history,
  });

  const result = await chat.sendMessage(message);
  const response = await result.response;
  return response.text();
}
