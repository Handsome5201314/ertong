import { GoogleGenAI } from "@google/genai";
import { NextResponse } from "next/server";

export async function POST(req: Request) {
  try {
    const { records, lang } = await req.json();
    const apiKey = process.env.NEXT_PUBLIC_GEMINI_API_KEY || process.env.GEMINI_API_KEY;
    if (!apiKey) {
      return NextResponse.json({ error: "API key not configured" }, { status: 500 });
    }

    const ai = new GoogleGenAI({ apiKey });
    
    const recordsText = records.map((r: any, i: number) => `Q${i+1}: ${r.question}\nA${i+1}: ${r.answer}`).join('\n\n');

    const langInstruction = lang === 'en'
      ? "Please provide your response in English. If there are contradictions, ask gently. If not, say 'Verification complete, thank you for your cooperation.'"
      : "如果识别到家属的回答存在前后逻辑矛盾，请以温和、不带指责的语气进行追问和澄清。如果不存在，请回复'校验通过，感谢您的配合。'";

    const response = await ai.models.generateContent({
      model: "gemini-3-flash-preview",
      contents: `请检查以下问答记录是否存在逻辑矛盾 (Check the following Q&A for logical contradictions):\n\n${recordsText}`,
      config: {
        systemInstruction: `你现在是一位拥有20年临床经验的发育行为儿科主治医师，并且是一位极具同理心的沟通专家。你的核心任务是辅助患儿家属完成医学量表的填写。
${langInstruction}
严禁使用任何专业医学词汇，严禁直接给出诊断结论。`,
      }
    });

    return NextResponse.json({ result: response.text });
  } catch (error) {
    console.error("Check API error:", error);
    return NextResponse.json({ error: "Failed to check consistency" }, { status: 500 });
  }
}
