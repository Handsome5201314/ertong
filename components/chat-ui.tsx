'use client';

import React, { useState, useEffect, useRef } from 'react';
import { Send, Mic, Loader2, HelpCircle, Globe } from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import { useSearchParams, useRouter, usePathname } from 'next/navigation';
import scaleData from '@/data/scale.json';

type Language = 'zh' | 'en';

type Message = {
  id: string;
  role: 'assistant' | 'user';
  content?: string;
  msgKey?: 'greeting' | 'checking' | 'check-error' | 'finish';
  isQuestion?: boolean;
  questionId?: string;
  isLoading?: boolean;
};

const GREETINGS = {
  zh: '您好！我是您的发育行为儿科助手。今天我会问您几个关于孩子日常表现的小问题，帮助我们更好地了解他/她。请您根据孩子平时的真实情况回答。我们现在开始吧！',
  en: 'Hello! I am your developmental-behavioral pediatric assistant. Today I will ask you a few questions about your child\'s daily behavior to help us understand them better. Please answer based on your child\'s actual situation. Let\'s get started!'
};

const CHECKING_MSG = {
  zh: '正在为您整理和校验回答，请稍候...',
  en: 'Organizing and verifying your answers, please wait...'
};

const CHECK_ERROR_MSG = {
  zh: '抱歉，校验过程中出现了一些网络问题，但您的回答已记录。感谢您的配合！',
  en: 'Sorry, there was a network issue during verification, but your answers have been recorded. Thank you for your cooperation!'
};

const FINISH_MSG = {
  zh: '感谢您的补充！如果有其他问题，您可以随时告诉我。',
  en: 'Thank you for the additional information! If you have any other questions, feel free to let me know.'
};

export default function ChatUI() {
  const searchParams = useSearchParams();
  const router = useRouter();
  const pathname = usePathname();

  const urlLang = searchParams.get('lang') as Language;
  const initialLang = urlLang === 'en' ? 'en' : 'zh';

  const [lang, setLang] = useState<Language>(initialLang);
  const [messages, setMessages] = useState<Message[]>([]);
  const [currentQIndex, setCurrentQIndex] = useState(0);
  const [inputValue, setInputValue] = useState('');
  const [isRecording, setIsRecording] = useState(false);
  const [isChecking, setIsChecking] = useState(false);
  const [answers, setAnswers] = useState<{question: string, answer: string}[]>([]);

  const messagesEndRef = useRef<HTMLDivElement>(null);
  const recognitionRef = useRef<any>(null);

  const handleLangChange = () => {
    const newLang = lang === 'zh' ? 'en' : 'zh';
    setLang(newLang);
    const params = new URLSearchParams(searchParams.toString());
    params.set('lang', newLang);
    router.replace(`${pathname}?${params.toString()}`);
  };

  const getMessageContent = (msg: Message, currentLang: Language) => {
    if (msg.content) return msg.content;
    if (msg.msgKey) {
      const dict = {
        'greeting': GREETINGS,
        'checking': CHECKING_MSG,
        'check-error': CHECK_ERROR_MSG,
        'finish': FINISH_MSG
      };
      return dict[msg.msgKey][currentLang];
    }
    if (msg.isQuestion && msg.questionId) {
      const q = scaleData.questions.find(q => q.id === msg.questionId);
      return q ? q.text[currentLang] : '';
    }
    return '';
  };

  useEffect(() => {
    // Initial greeting and first question
    if (messages.length === 0) {
      const firstQuestion = scaleData.questions[0];
      setMessages([
        {
          id: 'greeting',
          role: 'assistant',
          msgKey: 'greeting'
        },
        {
          id: `q-${firstQuestion.id}`,
          role: 'assistant',
          isQuestion: true,
          questionId: firstQuestion.id
        }
      ]);
    }

    // Setup Speech Recognition
    if (typeof window !== 'undefined') {
      const SpeechRecognition = (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition;
      if (SpeechRecognition) {
        recognitionRef.current = new SpeechRecognition();
        recognitionRef.current.continuous = true;
        recognitionRef.current.interimResults = true;
        recognitionRef.current.lang = lang === 'zh' ? 'zh-CN' : 'en-US';

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

        recognitionRef.current.onerror = (event: any) => {
          console.error("Speech recognition error", event.error);
          setIsRecording(false);
        };

        recognitionRef.current.onend = () => {
          setIsRecording(false);
        };
      }
    }
  }, [lang, messages.length]);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  const startRecording = (e: React.MouseEvent | React.TouchEvent) => {
    e.preventDefault();
    if (recognitionRef.current) {
      try {
        recognitionRef.current.start();
        setIsRecording(true);
      } catch(err) {
        console.error(err);
      }
    } else {
      alert(lang === 'zh' ? '您的浏览器不支持语音识别功能，请使用文本输入。' : 'Your browser does not support speech recognition. Please type.');
    }
  };

  const stopRecording = (e: React.MouseEvent | React.TouchEvent) => {
    e.preventDefault();
    if (recognitionRef.current && isRecording) {
      recognitionRef.current.stop();
      setIsRecording(false);
    }
  };

  const handleSend = async () => {
    if (!inputValue.trim()) return;

    const userMsg: Message = {
      id: Date.now().toString(),
      role: 'user',
      content: inputValue.trim()
    };

    setMessages(prev => [...prev, userMsg]);
    setInputValue('');

    if (currentQIndex < scaleData.questions.length) {
      const currentQ = scaleData.questions[currentQIndex];
      const newAnswers = [...answers, { question: currentQ.text[lang], answer: userMsg.content || '' }];
      setAnswers(newAnswers);

      const nextIndex = currentQIndex + 1;
      setCurrentQIndex(nextIndex);

      if (nextIndex < scaleData.questions.length) {
        const nextQ = scaleData.questions[nextIndex];
        setTimeout(() => {
          setMessages(prev => [...prev, {
            id: `q-${nextQ.id}`,
            role: 'assistant',
            isQuestion: true,
            questionId: nextQ.id
          }]);
        }, 600);
      } else {
        // Finished all questions, do consistency check
        setIsChecking(true);
        setMessages(prev => [...prev, {
          id: 'checking',
          role: 'assistant',
          msgKey: 'checking',
          isLoading: true
        }]);

        try {
          const res = await fetch('/api/check', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ records: newAnswers, lang })
          });
          const data = await res.json();

          setMessages(prev => prev.filter(m => m.id !== 'checking').concat({
            id: 'check-result',
            role: 'assistant',
            content: data.result || (lang === 'zh' ? '校验完成，感谢您的配合！' : 'Verification complete, thank you!')
          }));
        } catch (e) {
          setMessages(prev => prev.filter(m => m.id !== 'checking').concat({
            id: 'check-error',
            role: 'assistant',
            msgKey: 'check-error'
          }));
        } finally {
          setIsChecking(false);
        }
      }
    } else {
      // Chat after finishing
      setTimeout(() => {
        setMessages(prev => [...prev, {
          id: Date.now().toString(),
          role: 'assistant',
          msgKey: 'finish'
        }]);
      }, 500);
    }
  };

  const requestExplanation = async (msgId: string, questionId?: string) => {
    if (!questionId) return;
    const q = scaleData.questions.find(q => q.id === questionId);
    if (!q) return;

    const questionText = q.text[lang];
    const explainMsgId = `explain-${msgId}`;

    setMessages(prev => {
      const newMsgs = [...prev];
      const qIndex = newMsgs.findIndex(m => m.id === msgId);
      if (qIndex !== -1) {
        newMsgs.splice(qIndex + 1, 0, {
          id: explainMsgId,
          role: 'assistant',
          content: lang === 'zh' ? '正在为您解释...' : 'Explaining...',
          isLoading: true
        });
      }
      return newMsgs;
    });

    try {
      const res = await fetch('/api/explain', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ question: questionText, lang })
      });
      const data = await res.json();

      setMessages(prev => prev.map(m =>
        m.id === explainMsgId
          ? { ...m, content: data.explanation || (lang === 'zh' ? '抱歉，暂时无法提供解释。' : 'Sorry, explanation unavailable.'), isLoading: false }
          : m
      ));
    } catch (e) {
      setMessages(prev => prev.map(m =>
        m.id === explainMsgId
          ? { ...m, content: lang === 'zh' ? '网络错误。' : 'Network error.', isLoading: false }
          : m
      ));
    }
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
            <h1 className="font-medium text-slate-800 text-base">
              {lang === 'zh' ? '儿童发育行为助手' : 'Developmental Assistant'}
            </h1>
            <p className="text-slate-500 text-xs">
              {lang === 'zh' ? '主治医师在线辅助' : 'Attending Physician Online'}
            </p>
          </div>
        </div>
        <button
          onClick={handleLangChange}
          className="flex items-center text-xs font-medium text-slate-600 bg-slate-100 hover:bg-slate-200 px-2.5 py-1.5 rounded-full transition-colors"
        >
          <Globe className="w-3.5 h-3.5 mr-1" />
          {lang === 'zh' ? 'EN' : '中'}
        </button>
      </div>

      {/* Progress Indicator */}
      <div className="bg-white px-4 py-2 border-b border-slate-100 shadow-sm z-10 relative">
        <div className="flex justify-between items-center mb-1.5">
          <span className="text-xs font-medium text-slate-500">
            {lang === 'zh' ? '填写进度' : 'Progress'}
          </span>
          <span className="text-xs font-bold text-emerald-600">
            {lang === 'zh' ? '题目' : 'Question'} {Math.min(currentQIndex + 1, scaleData.questions.length)} / {scaleData.questions.length}
          </span>
        </div>
        <div className="w-full bg-slate-100 rounded-full h-1.5 overflow-hidden">
          <motion.div
            className="bg-emerald-500 h-1.5 rounded-full"
            initial={{ width: 0 }}
            animate={{ width: `${(Math.min(currentQIndex + 1, scaleData.questions.length) / scaleData.questions.length) * 100}%` }}
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
                      <span className="text-sm">{getMessageContent(msg, lang)}</span>
                    </div>
                  ) : (
                    <p className="text-[15px] leading-relaxed whitespace-pre-wrap">{getMessageContent(msg, lang)}</p>
                  )}
                </div>

                {msg.isQuestion && (
                  <button
                    onClick={() => requestExplanation(msg.id, msg.questionId)}
                    className="mt-2 text-xs flex items-center text-emerald-600 hover:text-emerald-700 bg-emerald-50 hover:bg-emerald-100 px-3 py-1.5 rounded-full transition-colors shadow-sm"
                  >
                    <HelpCircle className="w-3.5 h-3.5 mr-1" />
                    {lang === 'zh' ? '请求 AI 解释' : 'Ask AI to explain'}
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
            title={lang === 'zh' ? '按住说话' : 'Hold to speak'}
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
            placeholder={isRecording ? (lang === 'zh' ? "正在聆听..." : "Listening...") : (lang === 'zh' ? "输入您的回答..." : "Type your answer...")}
            className="flex-1 bg-transparent border-none focus:ring-0 resize-none py-2.5 px-2 max-h-32 min-h-[44px] text-[15px] text-slate-800 outline-none"
            rows={1}
          />

          <button
            onClick={handleSend}
            disabled={!inputValue.trim() || isChecking}
            className="p-2.5 rounded-full bg-emerald-500 text-white disabled:opacity-50 disabled:bg-slate-300 transition-colors flex-shrink-0"
          >
            <Send className="w-5 h-5 ml-0.5" />
          </button>
        </div>
        <div className="text-center mt-2">
          <span className="text-[10px] text-slate-400">
            {lang === 'zh' ? '按住麦克风说话，松开结束' : 'Hold mic to speak, release to send'}
          </span>
        </div>
      </div>
    </div>
  );
}
