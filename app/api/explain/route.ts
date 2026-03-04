import { GoogleGenAI } from "@google/genai";
import { NextResponse } from "next/server";

export async function POST(req: Request) {
  try {
    const { question, lang } = await req.json();
    const apiKey = process.env.NEXT_PUBLIC_GEMINI_API_KEY || process.env.GEMINI_API_KEY;
    if (!apiKey) {
      return NextResponse.json({ error: "API key not configured" }, { status: 500 });
    }

    const ai = new GoogleGenAI({ apiKey });
    
    const langInstruction = lang === 'en' 
      ? "Please provide the explanation in English. Keep it simple, like explaining to a 6th grader." 
      : "请用不超过小学六年级的阅读理解难度进行解释，并提供生活化的场景类比。";

    const response = await ai.models.generateContent({
      model: "gemini-3-flash-preview",
      contents: `请解释以下题目 (Explain the following question):\n\n${question}`,
      config: {
        systemInstruction: `你现在是一位拥有20年临床经验的发育行为儿科主治医师，并且是一位极具同理心的沟通专家。你的核心任务是辅助患儿家属完成医学量表的填写。
1. 当家属对某道题目产生困惑时，${langInstruction}
2. 严禁使用任何专业医学词汇，严禁直接给出诊断结论。`,
      }
    });

    return NextResponse.json({ explanation: response.text });
  } catch (error) {
    console.error("Explain API error:", error);
    return NextResponse.json({ error: "Failed to generate explanation" }, { status: 500 });
  }
}
