import { useEffect, useRef, useState } from 'react';
import { AnimatePresence, motion } from 'framer-motion';
import { Bot, Loader2, MessageCircle, Send, X } from 'lucide-react';
import { api } from '@/api/apiClient';

const GREETING =
  "Hi! I'm the Go-Get assistant. Ask me about our bookkeeping, tax, or payroll services, pricing, or how to book a consultation.";

const HISTORY_TURNS = 12;

export default function ChatWidget() {
  const [open, setOpen] = useState(false);
  const [messages, setMessages] = useState([{ role: 'assistant', content: GREETING }]);
  const [input, setInput] = useState('');
  const [sending, setSending] = useState(false);
  const [error, setError] = useState('');
  const scrollRef = useRef(null);

  useEffect(() => {
    if (scrollRef.current) scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
  }, [messages, sending, open]);

  const handleSend = async () => {
    const text = input.trim();
    if (!text || sending) return;

    const nextMessages = [...messages, { role: 'user', content: text }];
    setMessages(nextMessages);
    setInput('');
    setError('');
    setSending(true);

    try {
      const history = nextMessages.slice(-(HISTORY_TURNS + 1), -1).map((m) => ({ role: m.role, content: m.content }));
      const { reply } = await api.public.chatbot(text, history);
      setMessages((prev) => [...prev, { role: 'assistant', content: reply }]);
    } catch {
      setError("Sorry, that didn't go through. Please try again or contact us directly.");
    } finally {
      setSending(false);
    }
  };

  const handleKeyDown = (e) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSend();
    }
  };

  return (
    <div className="fixed bottom-5 right-5 z-[60] flex flex-col items-end">
      <AnimatePresence>
        {open && (
          <motion.div
            initial={{ opacity: 0, y: 20, scale: 0.95 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: 20, scale: 0.95 }}
            transition={{ duration: 0.2, ease: [0.22, 1, 0.36, 1] }}
            className="mb-3 w-[min(92vw,360px)] h-[min(70vh,480px)] bg-white rounded-2xl shadow-2xl border border-slate-200 flex flex-col overflow-hidden"
          >
            <div className="bg-gradient-to-r from-navy to-purple-600 text-white px-4 py-3 flex items-center gap-2 flex-shrink-0">
              <Bot className="w-5 h-5" />
              <div className="flex-1 min-w-0">
                <p className="font-bold text-sm leading-tight">Go-Get Assistant</p>
                <p className="text-[11px] text-white/70 leading-tight">Usually replies in seconds</p>
              </div>
              <button
                onClick={() => setOpen(false)}
                className="p-1 rounded-lg hover:bg-white/10 transition-colors flex-shrink-0"
                aria-label="Close chat"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <div ref={scrollRef} className="flex-1 overflow-y-auto px-4 py-3 space-y-3 bg-slate-50">
              {messages.map((m, i) => (
                <div key={i} className={`flex ${m.role === 'user' ? 'justify-end' : 'justify-start'}`}>
                  <div
                    className={`max-w-[85%] rounded-2xl px-3 py-2 text-sm whitespace-pre-wrap leading-relaxed ${
                      m.role === 'user'
                        ? 'bg-gradient-to-r from-navy to-purple-600 text-white rounded-br-sm'
                        : 'bg-white text-slate-700 border border-slate-100 rounded-bl-sm shadow-sm'
                    }`}
                  >
                    {m.content}
                  </div>
                </div>
              ))}
              {sending && (
                <div className="flex justify-start">
                  <div className="bg-white border border-slate-100 rounded-2xl rounded-bl-sm px-3 py-2 shadow-sm">
                    <Loader2 className="w-4 h-4 animate-spin text-slate-400" />
                  </div>
                </div>
              )}
              {error && <p className="text-xs text-red-500 text-center">{error}</p>}
            </div>

            <div className="border-t border-slate-100 p-3 flex items-end gap-2 bg-white flex-shrink-0">
              <textarea
                value={input}
                onChange={(e) => setInput(e.target.value)}
                onKeyDown={handleKeyDown}
                placeholder="Ask about services, pricing…"
                rows={1}
                className="flex-1 resize-none rounded-xl border border-slate-200 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-navy max-h-24"
              />
              <button
                onClick={handleSend}
                disabled={sending || !input.trim()}
                className="bg-gradient-to-r from-navy to-purple-600 text-white p-2.5 rounded-xl disabled:opacity-40 transition-opacity flex-shrink-0"
                aria-label="Send message"
              >
                <Send className="w-4 h-4" />
              </button>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      <motion.button
        onClick={() => setOpen((o) => !o)}
        whileHover={{ scale: 1.08 }}
        whileTap={{ scale: 0.94 }}
        className="w-14 h-14 rounded-full bg-gradient-to-r from-navy to-purple-600 text-white shadow-2xl flex items-center justify-center"
        aria-label={open ? 'Close chat' : 'Open chat'}
      >
        <AnimatePresence mode="wait" initial={false}>
          <motion.span
            key={open ? 'close' : 'open'}
            initial={{ opacity: 0, rotate: -45 }}
            animate={{ opacity: 1, rotate: 0 }}
            exit={{ opacity: 0, rotate: 45 }}
            transition={{ duration: 0.15 }}
            className="flex"
          >
            {open ? <X className="w-6 h-6" /> : <MessageCircle className="w-6 h-6" />}
          </motion.span>
        </AnimatePresence>
      </motion.button>
    </div>
  );
}
