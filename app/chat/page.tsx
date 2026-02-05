'use client';

import { useState, useRef, useEffect } from 'react';
import { Send, Upload, Plus, Sparkles } from 'lucide-react';

interface Message {
  id: string;
  role: 'user' | 'assistant';
  content: string;
}

export default function ChatPage() {
  const [messages, setMessages] = useState<Message[]>([]);
  const [input, setInput] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const messagesEndRef = useRef<HTMLDivElement>(null);

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  useEffect(() => {
    scrollToBottom();
  }, [messages]);

  const sendMessage = async () => {
    if (!input.trim() || isLoading) return;

    const userMessage: Message = {
      id: Date.now().toString(),
      role: 'user',
      content: input,
    };

    setMessages((prev) => [...prev, userMessage]);
    setInput('');
    setIsLoading(true);

    try {
      const response = await fetch('/api/ai/chat', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          messages: [...messages, userMessage].map((m) => ({
            role: m.role,
            content: m.content,
          })),
        }),
      });

      const reader = response.body?.getReader();
      const decoder = new TextDecoder();
      let assistantContent = '';
      const assistantId = (Date.now() + 1).toString();

      setMessages((prev) => [
        ...prev,
        { id: assistantId, role: 'assistant', content: '' },
      ]);

      while (reader) {
        const { done, value } = await reader.read();
        if (done) break;
        
        assistantContent += decoder.decode(value);
        setMessages((prev) =>
          prev.map((m) =>
            m.id === assistantId ? { ...m, content: assistantContent } : m
          )
        );
      }
    } catch (error) {
      console.error('Chat error:', error);
    } finally {
      setIsLoading(false);
    }
  };

  const suggestions = [
    'Create a campaign for fintech CTOs',
    'Research prospects from my CSV',
    'Help me write a cold email',
    'Show my active campaigns',
  ];

  return (
    <div className="flex flex-col h-screen bg-surface-1">
      {/* Header */}
      <header className="flex items-center justify-between px-6 py-4 border-b border-white/5">
        <div className="flex items-center gap-3">
          <div className="w-8 h-8 rounded-lg bg-primary/20 flex items-center justify-center">
            <Sparkles className="w-4 h-4 text-primary" />
          </div>
          <h1 className="text-lg font-semibold text-text-primary">QAi</h1>
        </div>
        <button className="flex items-center gap-2 px-3 py-1.5 rounded-lg bg-surface-2 hover:bg-surface-3 text-text-secondary text-sm transition-colors">
          <Plus className="w-4 h-4" />
          New Chat
        </button>
      </header>

      {/* Messages */}
      <div className="flex-1 overflow-y-auto px-6 py-4">
        {messages.length === 0 ? (
          <div className="flex flex-col items-center justify-center h-full text-center">
            <div className="w-16 h-16 rounded-2xl bg-primary/20 flex items-center justify-center mb-4">
              <Sparkles className="w-8 h-8 text-primary" />
            </div>
            <h2 className="text-xl font-semibold text-text-primary mb-2">
              Welcome to QAi
            </h2>
            <p className="text-text-secondary mb-6 max-w-md">
              Your AI assistant for GTM. Create campaigns, research prospects, and generate personalized outreach.
            </p>
            <div className="flex flex-wrap gap-2 justify-center max-w-lg">
              {suggestions.map((suggestion) => (
                <button
                  key={suggestion}
                  onClick={() => setInput(suggestion)}
                  className="px-4 py-2 rounded-lg bg-surface-2 hover:bg-surface-3 text-text-secondary text-sm transition-colors"
                >
                  {suggestion}
                </button>
              ))}
            </div>
          </div>
        ) : (
          <div className="max-w-3xl mx-auto space-y-4">
            {messages.map((message) => (
              <div
                key={message.id}
                className={`flex ${message.role === 'user' ? 'justify-end' : 'justify-start'}`}
              >
                <div
                  className={`max-w-[80%] px-4 py-3 rounded-2xl ${
                    message.role === 'user'
                      ? 'bg-primary text-surface-1'
                      : 'bg-surface-2 text-text-primary'
                  }`}
                >
                  <p className="whitespace-pre-wrap">{message.content}</p>
                </div>
              </div>
            ))}
            {isLoading && messages[messages.length - 1]?.role === 'user' && (
              <div className="flex justify-start">
                <div className="bg-surface-2 px-4 py-3 rounded-2xl">
                  <div className="flex gap-1">
                    <span className="w-2 h-2 bg-text-muted rounded-full animate-bounce" />
                    <span className="w-2 h-2 bg-text-muted rounded-full animate-bounce [animation-delay:0.1s]" />
                    <span className="w-2 h-2 bg-text-muted rounded-full animate-bounce [animation-delay:0.2s]" />
                  </div>
                </div>
              </div>
            )}
            <div ref={messagesEndRef} />
          </div>
        )}
      </div>

      {/* Input */}
      <div className="px-6 py-4 border-t border-white/5">
        <div className="max-w-3xl mx-auto flex gap-3">
          <button className="p-3 rounded-xl bg-surface-2 hover:bg-surface-3 text-text-secondary transition-colors">
            <Upload className="w-5 h-5" />
          </button>
          <div className="flex-1 relative">
            <textarea
              value={input}
              onChange={(e) => setInput(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === 'Enter' && !e.shiftKey) {
                  e.preventDefault();
                  sendMessage();
                }
              }}
              placeholder="Message QAi..."
              rows={1}
              className="w-full px-4 py-3 rounded-xl bg-surface-2 text-text-primary placeholder-text-muted resize-none focus:outline-none focus:ring-2 focus:ring-primary/50"
            />
          </div>
          <button
            onClick={sendMessage}
            disabled={!input.trim() || isLoading}
            className="p-3 rounded-xl bg-primary hover:bg-primary-hover disabled:opacity-50 disabled:cursor-not-allowed text-surface-1 transition-colors"
          >
            <Send className="w-5 h-5" />
          </button>
        </div>
      </div>
    </div>
  );
}
