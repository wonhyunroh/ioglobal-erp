// ──────────────────────────────────────────────
// 📁 파일명: Chatbot.tsx
// 📌 위치: src/components/Chatbot.tsx
//
// 🎯 이 파일의 역할:
//   - 화면 우측 하단에 떠있는 챗봇 버튼이에요
//   - 클릭하면 채팅창이 열려요
//   - ERP 사용법을 모를 때 물어볼 수 있어요
// ──────────────────────────────────────────────

import React, { useState, useRef, useEffect } from 'react';
import { sendChatMessage, ChatMessage } from '../db';

export default function Chatbot() {
  const [isOpen, setIsOpen]       = useState(false);
  const [messages, setMessages]   = useState<ChatMessage[]>([
    { role: 'assistant', content: '안녕하세요! 👋 IO Global ERP 도우미예요.\nERP 사용 중 모르는 것이 있으면 편하게 물어보세요!' }
  ]);
  const [input, setInput]         = useState('');
  const [loading, setLoading]     = useState(false);
  const bottomRef                 = useRef<HTMLDivElement>(null);
  const inputRef                  = useRef<HTMLInputElement>(null);

  // 메시지 추가될 때마다 스크롤 아래로
  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  // 채팅창 열릴 때 입력창에 포커스
  useEffect(() => {
    if (isOpen) {
      setTimeout(() => inputRef.current?.focus(), 100);
    }
  }, [isOpen]);

  const handleSend = async () => {
    const text = input.trim();
    if (!text || loading) return;

    // 사용자 메시지 추가
    const newMessages: ChatMessage[] = [
      ...messages.filter(m => m.role !== 'assistant' || messages.indexOf(m) > 0), // 첫 인사말 제외
      { role: 'user', content: text },
    ];

    // UI에는 전체 메시지 표시
    setMessages(prev => [...prev, { role: 'user', content: text }]);
    setInput('');
    setLoading(true);

    try {
      // API에는 첫 인사말 제외하고 보내기
      const apiMessages = newMessages.filter(
        (m, i) => !(i === 0 && m.role === 'assistant')
      );
      const reply = await sendChatMessage(apiMessages);
      setMessages(prev => [...prev, { role: 'assistant', content: reply }]);
    } catch (e: any) {
      setMessages(prev => [...prev, {
        role: 'assistant',
        content: '죄송해요, 오류가 발생했어요. 잠시 후 다시 시도해 주세요. 😥'
      }]);
    } finally {
      setLoading(false);
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSend();
    }
  };

  return (
    <>
      {/* ── 채팅창 ── */}
      {isOpen && (
        <div className="fixed bottom-20 right-6 w-80 h-[480px] bg-white rounded-2xl shadow-2xl
                        border border-gray-200 flex flex-col z-50 overflow-hidden">

          {/* 헤더 */}
          <div className="bg-blue-600 px-4 py-3 flex items-center justify-between">
            <div className="flex items-center gap-2">
              <span className="text-lg">🌾</span>
              <div>
                <p className="text-white text-sm font-semibold">ERP 도우미</p>
                <p className="text-blue-200 text-xs">무엇이든 물어보세요!</p>
              </div>
            </div>
            <button
              onClick={() => setIsOpen(false)}
              className="text-white/70 hover:text-white text-lg leading-none"
            >
              ✕
            </button>
          </div>

          {/* 메시지 목록 */}
          <div className="flex-1 overflow-y-auto px-4 py-3 space-y-3 bg-gray-50">
            {messages.map((msg, i) => (
              <div
                key={i}
                className={`flex ${msg.role === 'user' ? 'justify-end' : 'justify-start'}`}
              >
                {msg.role === 'assistant' && (
                  <div className="w-7 h-7 rounded-full bg-blue-100 flex items-center
                                  justify-center text-sm mr-2 flex-shrink-0 mt-0.5">
                    🌾
                  </div>
                )}
                <div
                  className={`max-w-[80%] px-3 py-2 rounded-2xl text-sm whitespace-pre-wrap
                    ${msg.role === 'user'
                      ? 'bg-blue-600 text-white rounded-br-sm'
                      : 'bg-white text-gray-800 rounded-bl-sm shadow-sm border border-gray-100'
                    }`}
                >
                  {msg.content}
                </div>
              </div>
            ))}

            {/* 로딩 표시 */}
            {loading && (
              <div className="flex justify-start">
                <div className="w-7 h-7 rounded-full bg-blue-100 flex items-center
                                justify-center text-sm mr-2 flex-shrink-0">
                  🌾
                </div>
                <div className="bg-white px-4 py-3 rounded-2xl rounded-bl-sm shadow-sm
                                border border-gray-100">
                  <div className="flex gap-1">
                    <span className="w-2 h-2 bg-gray-400 rounded-full animate-bounce"
                          style={{ animationDelay: '0ms' }} />
                    <span className="w-2 h-2 bg-gray-400 rounded-full animate-bounce"
                          style={{ animationDelay: '150ms' }} />
                    <span className="w-2 h-2 bg-gray-400 rounded-full animate-bounce"
                          style={{ animationDelay: '300ms' }} />
                  </div>
                </div>
              </div>
            )}
            <div ref={bottomRef} />
          </div>

          {/* 입력창 */}
          <div className="px-3 py-3 border-t border-gray-100 bg-white">
            <div className="flex gap-2">
              <input
                ref={inputRef}
                type="text"
                value={input}
                onChange={e => setInput(e.target.value)}
                onKeyDown={handleKeyDown}
                placeholder="궁금한 것을 입력하세요..."
                disabled={loading}
                className="flex-1 text-sm px-3 py-2 border border-gray-200 rounded-xl
                           focus:outline-none focus:border-blue-400 disabled:bg-gray-50"
              />
              <button
                onClick={handleSend}
                disabled={!input.trim() || loading}
                className="w-9 h-9 bg-blue-600 hover:bg-blue-700 disabled:bg-gray-300
                           rounded-xl flex items-center justify-center transition-colors
                           flex-shrink-0"
              >
                <svg className="w-4 h-4 text-white" fill="none" stroke="currentColor"
                     viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2}
                        d="M12 19l9 2-9-18-9 18 9-2zm0 0v-8" />
                </svg>
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ── 플로팅 버튼 ── */}
      <button
        onClick={() => setIsOpen(prev => !prev)}
        className={`fixed bottom-6 right-6 w-14 h-14 rounded-full shadow-lg
                    flex items-center justify-center text-2xl z-50 transition-all
                    ${isOpen
                      ? 'bg-gray-500 hover:bg-gray-600'
                      : 'bg-blue-600 hover:bg-blue-700 hover:scale-110'
                    }`}
      >
        {isOpen ? '✕' : '💬'}
      </button>
    </>
  );
}
