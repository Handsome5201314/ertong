'use client';

import React, { useState, useEffect, useRef } from 'react';
import { Send, Mic, Loader2, HelpCircle, Settings, Download } from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import { GoogleGenAI } from '@google/genai';
import scaleData from '@/data/scale.json';

type Option = { label: string; score: number };

type Message = {
  id: string;
  role: 'assistant' | 'user';
  content: string;
  isQuestion?: boolean;
  questionId?: string;
  options?: Option[];
  isLoading?: boolean;
  isExport?: boolean;
};

export default function ChatUI() {
  const [messages, setMessages] = useState<Message[]>([]);
  const [currentQIndex, setCurrentQIndex] = useState(0);
  const [inputValue, setInputValue] = useState('');
  const [isRecording, setIsRecording] = useState(false);
  const [answers, setAnswers] = useState<{question: string, answer: string, score: number}[]>([]);

  // API Key state
  const [apiKey, setApiKey] = useState('');
  const [showSettings, setShowSettings] = useState(false);
  const [tempKey, setTempKey] = useState('');

  const messagesEndRef = useRef<HTMLDivElement>(null);
  const recognitionRef = useRef<any>(null);
  const chatRef = useRef<any>(null);

  const initChat = (key: string) => {
    try {
      const ai = new GoogleGenAI({ apiKey: key });
      chatRef.current = ai.chats.create({
        model: "gemini-3-flash-preview",
        config: {
          systemInstruction: "你现在是一位拥有20年临床经验的发育行为儿科主治医师，并且是一位极具同理心的沟通专家。你的核心任务是辅助患儿家属完成医学量表的填写。当家属对某道题目产生困惑时，请用不超过小学六年级的阅读理解难度进行解释，并提供生活化的场景类比。严禁使用任何专业医学词汇，严禁直接给出任何医疗诊断结论。"
        }
      });
    } catch (err) {
      console.error("Failed to initialize Gemini:", err);
    }
  };

  useEffect(() => {
    const storedKey = localStorage.getItem('gemini_api_key');
    const envKey = process.env.NEXT_PUBLIC_GEMINI_API_KEY;
    const activeKey = storedKey || envKey || '';
    setApiKey(activeKey);
    if (activeKey) {
      initChat(activeKey);
    }

    if (messages.length === 0) {
      const firstQuestion = scaleData.questions[0];
      setMessages([
        {
          id: 'greeting',
          role: 'assistant',
          content: `您好！我是您的发育行为儿科助手。今天我们将完成《${scaleData.metadata.title}》。我会逐一向您提问，请根据孩子的真实情况作答。`
        },
        {
          id: `q-${firstQuestion.id}`,
          role: 'assistant',
          content: firstQuestion.text,
          isQuestion: true,
          questionId: firstQuestion.id,
          options: firstQuestion.options
        }
      ]);
    }

    if (typeof window !== 'undefined') {
      const SpeechRecognition = (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition;
      if (SpeechRecognition) {
        recognitionRef.current = new SpeechRecognition();
        recognitionRef.current.continuous = true;
        recognitionRef.current.interimResults = true;
        recognitionRef.current.lang = 'zh-CN';

        recognitionRef.current.onresult = (event: any) => {
          let finalTranscript = '';
          for (let i = event.resultIndex; i < event.results.length; ++i) {
            if (event.results[i].isFinal) {
              finalTranscript += event.results[i][0].transcript;
            }
          }
          if (finalTranscript) {
            setInputValue(prev => prev + finalTranscript);
          }
        };

        recognitionRef.current.onerror = () => setIsRecording(false);
        recognitionRef.current.onend = () => setIsRecording(false);
      }
    }
  }, []);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  const saveApiKey = () => {
    localStorage.setItem('gemini_api_key', tempKey);
    setApiKey(tempKey);
    initChat(tempKey);
    setShowSettings(false);
  };

  const startRecording = (e: React.MouseEvent | React.TouchEvent) => {
    e.preventDefault();
    if (recognitionRef.current) {
      try {
        recognitionRef.current.start();
        setIsRecording(true);
      } catch(err) {}
    } else {
      alert('您的浏览器不支持语音识别功能，请使用文本输入。');
    }
  };

  const stopRecording = (e: React.MouseEvent | React.TouchEvent) => {
    e.preventDefault();
    if (recognitionRef.current && isRecording) {
      recognitionRef.current.stop();
      setIsRecording(false);
    }
  };

  const handleOptionClick = (opt: Option, qId: string) => {
    if (currentQIndex >= scaleData.metadata.total || qId !== scaleData.questions[currentQIndex]?.id) return;

    const userMsg: Message = {
      id: Date.now().toString(),
      role: 'user',
      content: opt.label
    };
    setMessages(prev => [...prev, userMsg]);

    const currentQ = scaleData.questions[currentQIndex];
    const newAnswers = [...answers, { question: currentQ.text, answer: opt.label, score: opt.score }];
    setAnswers(newAnswers);

    advanceToNextQuestion();
  };

  const handleSend = () => {
    const text = inputValue.trim();
    if (!text) return;

    setInputValue('');

    if (currentQIndex < scaleData.metadata.total) {
      const currentQ = scaleData.questions[currentQIndex];
      const matchedOpt = currentQ.options.find(o => o.label === text || text.includes(o.label));

      if (matchedOpt) {
        handleOptionClick(matchedOpt, currentQ.id);
      } else {
        const userMsg: Message = {
          id: Date.now().toString(),
          role: 'user',
          content: text
        };
        setMessages(prev => [...prev, userMsg]);
        const newAnswers = [...answers, { question: currentQ.text, answer: text, score: -1 }];
        setAnswers(newAnswers);
        advanceToNextQuestion();
      }
    } else {
      setMessages(prev => [...prev, {
        id: Date.now().toString(),
        role: 'user',
        content: text
      }]);
      setTimeout(() => {
        setMessages(prev => [...prev, {
          id: Date.now().toString() + '-reply',
          role: 'assistant',
          content: '量表已完成，感谢您的反馈！'
        }]);
      }, 500);
    }
  };

  const advanceToNextQuestion = () => {
    const nextIndex = currentQIndex + 1;
    setCurrentQIndex(nextIndex);

    if (nextIndex < scaleData.metadata.total) {
      const nextQ = scaleData.questions[nextIndex];
      setTimeout(() => {
        setMessages(prev => [...prev, {
          id: `q-${nextQ.id}`,
          role: 'assistant',
          content: nextQ.text,
          isQuestion: true,
          questionId: nextQ.id,
          options: nextQ.options
        }]);
      }, 600);
    } else {
      setTimeout(() => {
        setMessages(prev => [...prev, {
          id: 'finish',
          role: 'assistant',
          content: '感谢您的配合！所有题目已回答完毕。您可以点击下方按钮导出评估结果。',
          isExport: true
        }]);
      }, 600);
    }
  };

  const requestExplanation = async (questionText: string, msgId: string) => {
    if (!chatRef.current) {
      alert("请先在右上角配置 API Key");
      setTempKey(apiKey);
      setShowSettings(true);
      return;
    }

    const explainMsgId = `explain-${msgId}-${Date.now()}`;
    setMessages(prev => {
      const newMsgs = [...prev];
      const qIndex = newMsgs.findIndex(m => m.id === msgId);
      if (qIndex !== -1) {
        newMsgs.splice(qIndex + 1, 0, {
          id: explainMsgId,
          role: 'assistant',
          content: '正在为您解释...',
          isLoading: true
        });
      }
      return newMsgs;
    });

    try {
      const response = await chatRef.current.sendMessage({
        message: `请解释这道题目：“${questionText}”`
      });

      setMessages(prev => prev.map(m =>
        m.id === explainMsgId
          ? { ...m, content: response.text || '抱歉，暂时无法提供解释。', isLoading: false }
          : m
      ));
    } catch (e) {
      console.error(e);
      setMessages(prev => prev.map(m =>
        m.id === explainMsgId
          ? { ...m, content: '网络错误或 API Key 无效，请检查设置。', isLoading: false }
          : m
      ));
    }
  };

  const handleExport = () => {
    const headers = ['题号', '题目', '您的回答', '得分'];
    const rows = answers.map((a, i) => [
      i + 1,
      `"${a.question.replace(/"/g, '""')}"`,
      `"${a.answer.replace(/"/g, '""')}"`,
      a.score === -1 ? 'N/A' : a.score
    ]);
    const csvContent = [headers, ...rows].map(e => e.join(",")).join("\\n");
    const blob = new Blob(["\\uFEFF" + csvContent], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.setAttribute("href", url);
    link.setAttribute("download", `${scaleData.metadata.title}_评估结果.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  return (
    <div className="flex flex-col h-full bg-[#f4f5f7] relative w-full">
      {/* Header */}
      <div className="bg-white/80 backdrop-blur-md border-b border-slate-200 px-4 py-3 flex items-center justify-between sticky top-0 z-20">
        <div className="flex items-center">
          <div className="w-10 h-10 rounded-full bg-emerald-100 flex items-center justify-center mr-3 shadow-sm">
            <span className="text-xl">👨‍⚕️</span>
          </div>
          <div>
            <h1 className="font-medium text-slate-800 text-base">{scaleData.metadata.title}</h1>
            <p className="text-slate-500 text-xs">主治医师在线辅助</p>
          </div>
        </div>
        <button
          onClick={() => {
            setTempKey(apiKey);
            setShowSettings(true);
          }}
          className="p-2 text-slate-500 hover:bg-slate-100 rounded-full transition-colors"
          title="设置 API Key"
        >
          <Settings className="w-5 h-5" />
        </button>
      </div>

      {/* Progress Indicator */}
      <div className="bg-white px-4 py-2 border-b border-slate-100 shadow-sm z-10 relative">
        <div className="flex justify-between items-center mb-1.5">
          <span className="text-xs font-medium text-slate-500">填写进度</span>
          <span className="text-xs font-bold text-emerald-600">
            题目 {Math.min(currentQIndex + 1, scaleData.metadata.total)} / {scaleData.metadata.total}
          </span>
        </div>
        <div className="w-full bg-slate-100 rounded-full h-1.5 overflow-hidden">
          <motion.div
            className="bg-emerald-500 h-1.5 rounded-full"
            initial={{ width: 0 }}
            animate={{ width: `${(Math.min(currentQIndex + 1, scaleData.metadata.total) / scaleData.metadata.total) * 100}%` }}
            transition={{ duration: 0.5, ease: "easeInOut" }}
          />
        </div>
      </div>

      {/* Chat Area */}
      <div className="flex-1 overflow-y-auto p-4 space-y-6">
        <AnimatePresence initial={false}>
          {messages.map((msg) => (
            <motion.div
              key={msg.id}
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              className={`flex ${msg.role === 'user' ? 'justify-end' : 'justify-start'}`}
            >
              {msg.role === 'assistant' && (
                <div className="w-8 h-8 rounded-full bg-emerald-100 flex items-center justify-center mr-2 flex-shrink-0 mt-1 shadow-sm">
                  <span className="text-sm">👨‍⚕️</span>
                </div>
              )}

              <div className={`max-w-[85%] flex flex-col ${msg.role === 'user' ? 'items-end' : 'items-start'}`}>
                <div
                  className={`px-4 py-3 rounded-2xl shadow-sm ${
                    msg.role === 'user'
                      ? 'bg-emerald-500 text-white rounded-tr-sm'
                      : 'bg-white text-slate-800 rounded-tl-sm border border-slate-100'
                  }`}
                >
                  {msg.isLoading ? (
                    <div className="flex items-center space-x-2 text-slate-500">
                      <Loader2 className="w-4 h-4 animate-spin" />
                      <span className="text-sm">{msg.content}</span>
                    </div>
                  ) : (
                    <p className="text-[15px] leading-relaxed whitespace-pre-wrap">{msg.content}</p>
                  )}
                </div>

                {msg.isQuestion && msg.options && (
                  <div className="mt-2 flex flex-col gap-2 w-full">
                    {msg.options.map((opt, idx) => (
                      <button
                        key={idx}
                        onClick={() => handleOptionClick(opt, msg.questionId!)}
                        disabled={currentQIndex >= scaleData.metadata.total || msg.questionId !== scaleData.questions[currentQIndex]?.id}
                        className="text-sm bg-emerald-50 text-emerald-700 border border-emerald-200 rounded-xl px-4 py-2.5 hover:bg-emerald-100 transition-colors text-left disabled:opacity-50 disabled:cursor-not-allowed"
                      >
                        {opt.label}
                      </button>
                    ))}
                  </div>
                )}

                {msg.isQuestion && (
                  <button
                    onClick={() => requestExplanation(msg.content, msg.id)}
                    className="mt-2 text-xs flex items-center text-emerald-600 hover:text-emerald-700 bg-emerald-50 hover:bg-emerald-100 px-3 py-1.5 rounded-full transition-colors shadow-sm self-start"
                  >
                    <HelpCircle className="w-3.5 h-3.5 mr-1" />
                    请求 AI 解释
                  </button>
                )}

                {msg.isExport && (
                  <button
                    onClick={handleExport}
                    className="mt-3 text-sm flex items-center text-white bg-emerald-600 hover:bg-emerald-700 px-5 py-2.5 rounded-xl transition-colors shadow-md"
                  >
                    <Download className="w-4 h-4 mr-2" />
                    导出评估结果 (CSV)
                  </button>
                )}
              </div>
            </motion.div>
          ))}
        </AnimatePresence>
        <div ref={messagesEndRef} className="h-2" />
      </div>

      {/* Input Area */}
      <div className="bg-white p-3 border-t border-slate-200 pb-safe">
        <div className="flex items-end space-x-2 bg-slate-100 rounded-3xl p-1.5 shadow-inner">
          <button
            onMouseDown={startRecording}
            onMouseUp={stopRecording}
            onMouseLeave={stopRecording}
            onTouchStart={startRecording}
            onTouchEnd={stopRecording}
            className={`p-2.5 rounded-full transition-all flex-shrink-0 select-none ${
              isRecording
                ? 'bg-emerald-500 text-white scale-110 shadow-md'
                : 'text-slate-500 hover:bg-slate-200'
            }`}
            title="按住说话"
          >
            <Mic className={`w-5 h-5 ${isRecording ? 'animate-pulse' : ''}`} />
          </button>

          <textarea
            value={inputValue}
            onChange={(e) => setInputValue(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === 'Enter' && !e.shiftKey) {
                e.preventDefault();
                handleSend();
              }
            }}
            placeholder={isRecording ? "正在聆听..." : "输入您的回答..."}
            className="flex-1 bg-transparent border-none focus:ring-0 resize-none py-2.5 px-2 max-h-32 min-h-[44px] text-[15px] text-slate-800 outline-none"
            rows={1}
          />

          <button
            onClick={handleSend}
            disabled={!inputValue.trim()}
            className="p-2.5 rounded-full bg-emerald-500 text-white disabled:opacity-50 disabled:bg-slate-300 transition-colors flex-shrink-0"
          >
            <Send className="w-5 h-5 ml-0.5" />
          </button>
        </div>
      </div>

      {/* Settings Modal */}
      <AnimatePresence>
        {showSettings && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="absolute inset-0 bg-slate-900/40 backdrop-blur-sm z-50 flex items-center justify-center p-4"
          >
            <motion.div
              initial={{ scale: 0.95, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.95, opacity: 0 }}
              className="bg-white rounded-2xl p-6 w-full max-w-sm shadow-2xl"
            >
              <h2 className="text-lg font-semibold mb-2 text-slate-800">配置 API Key</h2>
              <p className="text-xs text-slate-500 mb-4">
                请输入您的 Google Gemini API Key 以启用 AI 解释功能。该 Key 仅保存在您的浏览器本地。
              </p>
              <input
                type="password"
                value={tempKey}
                onChange={e => setTempKey(e.target.value)}
                placeholder="AIzaSy..."
                className="w-full border border-slate-300 rounded-xl px-4 py-2.5 mb-5 focus:outline-none focus:ring-2 focus:ring-emerald-500 text-sm"
              />
              <div className="flex justify-end gap-3">
                <button
                  onClick={() => setShowSettings(false)}
                  className="px-4 py-2 text-sm font-medium text-slate-600 hover:bg-slate-100 rounded-xl transition-colors"
                >
                  取消
                </button>
                <button
                  onClick={saveApiKey}
                  className="px-4 py-2 text-sm font-medium bg-emerald-500 text-white rounded-xl hover:bg-emerald-600 transition-colors shadow-sm"
                >
                  保存配置
                </button>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
