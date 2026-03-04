import ChatUI from '@/components/chat-ui';
import { Suspense } from 'react';

export default function Home() {
  return (
    <main className="min-h-screen bg-slate-900 flex items-center justify-center sm:p-6">
      <div className="w-full h-[100dvh] sm:h-[85vh] sm:max-w-md sm:rounded-[2rem] overflow-hidden shadow-2xl border-4 border-slate-800 bg-white relative flex flex-col">
        {/* Mobile notch simulation for desktop view */}
        <div className="hidden sm:block absolute top-0 left-1/2 -translate-x-1/2 w-32 h-6 bg-slate-800 rounded-b-2xl z-20"></div>
        <Suspense fallback={<div className="flex-1 flex items-center justify-center">Loading...</div>}>
          <ChatUI />
        </Suspense>
      </div>
    </main>
  );
}
