import { useEffect, useRef, useState } from 'react';
import { Sparkles } from 'lucide-react';
import EmptyState from '../components/EmptyState.js';
import { api } from '../api.js';
import { useLearner } from '../context/LearnerContext.js';
import { useEnsureRoadmap } from '../hooks/useEnsureData.js';
import type { CoachMessage } from '../types.js';

const SUGGESTED_QUESTIONS = [
  'What should I learn today?',
  'Why do I need statistics?',
  'I only have one hour today. What should I do?',
  'Am I ready for deep learning?',
  'What project should I build next?',
];

export default function AICoach() {
  const { profile, sessionId } = useLearner();
  const { roadmap, needsAnalysis } = useEnsureRoadmap();
  const [messages, setMessages] = useState<CoachMessage[]>([]);
  const [input, setInput] = useState('');
  const [sending, setSending] = useState(false);
  const [notice, setNotice] = useState<string | null>(null);
  const scrollRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    scrollRef.current?.scrollTo({ top: scrollRef.current.scrollHeight, behavior: 'smooth' });
  }, [messages, sending]);

  async function handleSend(text?: string) {
    const message = (text ?? input).trim();
    if (!message || !profile || (!sessionId && !profile.roleId) || sending) return;

    const nextMessages: CoachMessage[] = [...messages, { role: 'user', content: message }];
    setMessages(nextMessages);
    setInput('');
    setSending(true);
    setNotice(null);

    try {
      const result = await api.askCoach(profile, messages, message, { sessionId: sessionId ?? undefined, roleId: profile.roleId ?? undefined });
      setMessages([...nextMessages, { role: 'assistant', content: result.data }]);
      if (result.source === 'fallback') {
        setNotice(result.notice ?? 'AI service temporarily unavailable. Showing a personalized recommendation based on your learning profile.');
      }
    } catch {
      setMessages([
        ...nextMessages,
        { role: 'assistant', content: "I couldn't process that right now. Please try again in a moment." },
      ]);
    } finally {
      setSending(false);
    }
  }

  if (needsAnalysis || !profile || !roadmap) {
    return (
      <EmptyState
        icon={Sparkles}
        title="No learner data yet"
        body="Complete the initial diagnostic assessment so PathPilot can answer questions grounded in your actual skill levels and roadmap."
        ctaLabel="Take the Assessment"
        ctaTo="/assessment"
      />
    );
  }

  return (
    <div className="flex flex-col h-[calc(100vh-160px)] min-h-[500px]">
        <div className="mb-4">
          <h1 className="text-2xl font-bold text-ink mb-1 flex items-center gap-2">
            <span className="inline-flex items-center justify-center w-8 h-8 rounded-lg bg-brand-50 text-brand-500">
              <Sparkles size={18} strokeWidth={1.75} aria-hidden="true" />
            </span>
            PathPilot AI Coach
          </h1>
          <p className="text-ink-secondary text-sm">
            Your goal: <span className="text-ink">{roadmap.roleTitle}</span>
          </p>
        </div>

        <div ref={scrollRef} className="flex-1 overflow-y-auto rounded-xl bg-white border border-line shadow-sm p-4 mb-4 flex flex-col gap-3">
          {messages.length === 0 && (
            <div className="flex-1 flex flex-col items-center justify-center text-center px-6">
              <p className="text-ink-muted text-sm mb-4">Ask anything about your learning path.</p>
              <div className="flex flex-wrap gap-2 justify-center">
                {SUGGESTED_QUESTIONS.map((q) => (
                  <button
                    key={q}
                    onClick={() => handleSend(q)}
                    className="px-3 py-1.5 rounded-full text-xs bg-surface-secondary hover:bg-brand-50 border border-line text-ink-secondary transition-colors"
                  >
                    {q}
                  </button>
                ))}
              </div>
            </div>
          )}

          {messages.map((m, i) => (
            <ChatBubble key={i} message={m} />
          ))}

          {sending && (
            <div className="self-start max-w-[80%]">
              <p className="text-ink-muted text-xs mb-1 px-1">PathPilot AI</p>
              <div className="px-4 py-3 rounded-2xl bg-brand-50 border border-brand-100 text-ink-secondary text-sm italic">
                Thinking about your current roadmap...
              </div>
            </div>
          )}
        </div>

        {notice && <p className="text-ink-muted text-xs mb-2 italic">{notice}</p>}

        <div className="flex gap-3">
          <input
            value={input}
            onChange={(e) => setInput(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === 'Enter' && !e.shiftKey) {
                e.preventDefault();
                handleSend();
              }
            }}
            placeholder="Ask anything about your learning path..."
            disabled={sending}
            className="flex-1 rounded-lg bg-white border border-line focus:border-brand-500 outline-none px-4 py-3 text-ink placeholder-ink-muted text-sm disabled:opacity-50"
          />
          <button
            onClick={() => handleSend()}
            disabled={sending || !input.trim()}
            className="px-6 py-3 rounded-lg bg-brand-500 hover:bg-brand-600 disabled:opacity-40 text-white font-semibold text-sm transition-colors"
          >
            Send
          </button>
        </div>
    </div>
  );
}

function ChatBubble({ message }: { message: CoachMessage }) {
  const isUser = message.role === 'user';
  return (
    <div className={`max-w-[80%] ${isUser ? 'self-end' : 'self-start'}`}>
      <p className={`text-ink-muted text-xs mb-1 px-1 ${isUser ? 'text-right' : ''}`}>{isUser ? 'You' : 'PathPilot AI'}</p>
      <div
        className={`px-4 py-3 rounded-2xl text-sm leading-relaxed whitespace-pre-wrap ${
          isUser ? 'bg-brand-500 text-white' : 'bg-brand-50 border border-brand-100 text-ink'
        }`}
      >
        {message.content}
      </div>
    </div>
  );
}
