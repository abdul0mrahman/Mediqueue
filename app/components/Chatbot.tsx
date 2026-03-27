"use client";
import { useState, useRef, useEffect } from "react";

type Message = { role: "user" | "assistant"; text: string; timestamp: number };

interface ChatbotProps {
  patientName?: string;
  initialMessage?: string;
}

export default function Chatbot({ patientName, initialMessage }: ChatbotProps) {
  const [messages, setMessages] = useState<Message[]>([]);
  const [input, setInput] = useState("");
  const [loading, setLoading] = useState(false);
  const [isStreaming, setIsStreaming] = useState(false);
  const [streamingText, setStreamingText] = useState("");
  const bottomRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);
  const initialSentRef = useRef(false);

  // Load chat history or show greeting
  useEffect(() => {
    try {
      const saved = localStorage.getItem("mq-chat-history");
      if (saved) {
        const parsed = JSON.parse(saved);
        if (parsed.messages && parsed.messages.length > 0) {
          setMessages(parsed.messages);
          return;
        }
      }
    } catch {}

    const name = patientName || "Guest";
    const greeting = `Hello ${name}. I am MediQueue Assistant. I can help you understand your priority level, estimated wait times, and answer questions about the queue system. How may I assist you today?`;
    setMessages([{ role: "assistant", text: greeting, timestamp: Date.now() }]);
  }, [patientName]);

  // Send initialMessage once after mount
  useEffect(() => {
    if (initialMessage && !initialSentRef.current && messages.length > 0) {
      initialSentRef.current = true;
      setInput(initialMessage);
    }
  }, [initialMessage, messages]);

  // Save chat history
  useEffect(() => {
    if (messages.length > 0) {
      try {
        localStorage.setItem("mq-chat-history", JSON.stringify({ messages }));
      } catch {}
    }
  }, [messages]);

  // Auto scroll
  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages, streamingText]);

  async function send(overrideInput?: string) {
    const userMsg = (overrideInput ?? input).trim();
    if (!userMsg || loading) return;

    const userMessage: Message = { role: "user", text: userMsg, timestamp: Date.now() };
    setInput("");
    setMessages(prev => [...prev, userMessage]);
    setLoading(true);
    setIsStreaming(true);
    setStreamingText("");

    try {
      const res = await fetch("/api/chat", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ message: userMsg, history: messages }),
      });

      if (!res.ok || !res.body) throw new Error("Stream failed");

      const reader = res.body.getReader();
      const decoder = new TextDecoder();
      let fullText = "";

      while (true) {
        const { done, value } = await reader.read();
        if (done) break;

        const chunk = decoder.decode(value, { stream: true });
        const lines = chunk.split("\n").filter(line => line.startsWith("data: "));

        for (const line of lines) {
          const data = line.replace("data: ", "").trim();
          if (data === "[DONE]") break;
          try {
            const parsed = JSON.parse(data);
            if (parsed.content) {
              fullText += parsed.content;
              setStreamingText(fullText);
            }
          } catch {}
        }
      }

      setMessages(prev => [...prev, { role: "assistant", text: fullText, timestamp: Date.now() }]);
    } catch (err: any) {
      console.error("Chatbot fetch error:", err?.message ?? err);
      setMessages(prev => [...prev, {
        role: "assistant",
        text: "Unable to connect. Please check your connection and try again.",
        timestamp: Date.now(),
      }]);
    } finally {
      setIsStreaming(false);
      setStreamingText("");
      setLoading(false);
    }
  }

  function clearChat() {
    const name = patientName || "Guest";
    const greeting = `Hello ${name}. I am MediQueue Assistant. I can help you understand your priority level, estimated wait times, and answer questions about the queue system. How may I assist you today?`;
    setMessages([{ role: "assistant", text: greeting, timestamp: Date.now() }]);
    setIsStreaming(false);
    setStreamingText("");
    setLoading(false);
    try {
      localStorage.removeItem("mq-chat-history");
    } catch {}
  }

  function formatTime(timestamp: number) {
    return new Date(timestamp).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" });
  }

  const suggestions = [
    "What does Priority 5 mean?",
    "How long will I wait?",
    "How does the queue work?",
    "What should I do while waiting?",
  ];

  return (
    <>
      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=Space+Grotesk:wght@300;400;500;600;700&family=Inter:wght@300;400;500;600;700&display=swap');

        .cb-container {
          display: flex;
          flex-direction: column;
          height: 100%;
          min-height: 0;
          background: var(--card-bg);
          backdrop-filter: blur(10px);
        }

        .cb-header {
          display: flex;
          align-items: center;
          justify-content: space-between;
          padding: 16px 20px;
          background: rgba(212, 175, 55, 0.05);
          border-bottom: 1px solid var(--border-color);
          flex-shrink: 0;
        }
        .cb-header-info {
          display: flex;
          align-items: center;
          gap: 12px;
        }
        .cb-avatar {
          width: 36px;
          height: 36px;
          border-radius: 50%;
          background: linear-gradient(135deg, var(--gold-primary), var(--gold-dark));
          display: flex;
          align-items: center;
          justify-content: center;
          font-size: 16px;
          font-weight: 600;
          color: #000;
          font-family: 'Space Grotesk', sans-serif;
        }
        .cb-title {
          font-family: 'Space Grotesk', sans-serif;
          font-weight: 600;
          font-size: 14px;
          color: var(--text-primary);
        }
        .cb-subtitle {
          font-family: 'Space Grotesk', sans-serif;
          font-size: 11px;
          color: var(--gray-mid);
          margin-top: 2px;
        }
        .cb-reset {
          padding: 6px 14px;
          border-radius: 8px;
          font-family: 'Space Grotesk', sans-serif;
          font-size: 11px;
          font-weight: 500;
          color: var(--text-secondary);
          background: transparent;
          border: 1px solid var(--border-color);
          cursor: pointer;
          transition: all 0.2s;
        }
        .cb-reset:hover {
          border-color: var(--gold-primary);
          color: var(--gold-primary);
        }

        .cb-messages {
          flex: 1;
          overflow-y: auto;
          padding: 20px;
          display: flex;
          flex-direction: column;
          gap: 16px;
          min-height: 0;
        }
        .cb-messages::-webkit-scrollbar { width: 4px; }
        .cb-messages::-webkit-scrollbar-track {
          background: var(--border-color);
          border-radius: 4px;
        }
        .cb-messages::-webkit-scrollbar-thumb {
          background: var(--gold-primary);
          border-radius: 4px;
        }

        .message-wrapper {
          display: flex;
          flex-direction: column;
          max-width: 85%;
        }
        .message-wrapper.user { align-self: flex-end; }
        .message-wrapper.assistant { align-self: flex-start; }

        .message-bubble {
          padding: 12px 16px;
          border-radius: 16px;
          font-family: 'Inter', sans-serif;
          font-size: 13px;
          line-height: 1.55;
          white-space: pre-wrap;
          word-break: break-word;
          animation: fadeInUp 0.3s ease;
        }
        @keyframes fadeInUp {
          from { opacity: 0; transform: translateY(8px); }
          to   { opacity: 1; transform: translateY(0); }
        }
        .message-wrapper.user .message-bubble {
          background: linear-gradient(135deg, var(--gold-primary), var(--gold-dark));
          color: #000;
          border-bottom-right-radius: 4px;
        }
        .message-wrapper.assistant .message-bubble {
          background: var(--surface2);
          border: 1px solid var(--border-color);
          color: var(--text-primary);
          border-bottom-left-radius: 4px;
        }
        .message-time {
          font-family: 'Space Grotesk', monospace;
          font-size: 9px;
          color: var(--gray-mid);
          margin-top: 6px;
          padding: 0 4px;
        }
        .message-wrapper.user .message-time { text-align: right; }

        /* Streaming bubble with blinking cursor */
        .streaming-bubble {
          padding: 12px 16px;
          border-radius: 16px;
          font-family: 'Inter', sans-serif;
          font-size: 13px;
          line-height: 1.55;
          white-space: pre-wrap;
          word-break: break-word;
          background: var(--surface2);
          border: 1px solid var(--border-color);
          color: var(--text-primary);
          border-bottom-left-radius: 4px;
        }
        .streaming-cursor {
          display: inline-block;
          width: 2px;
          height: 14px;
          background: var(--gold-primary);
          margin-left: 2px;
          vertical-align: middle;
          animation: blink 0.8s infinite;
        }
        @keyframes blink {
          0%, 50% { opacity: 1; }
          51%, 100% { opacity: 0; }
        }

        /* Typing indicator (waiting for first chunk) */
        .typing-indicator {
          display: flex;
          align-items: center;
          gap: 4px;
          padding: 12px 16px;
          background: var(--surface2);
          border: 1px solid var(--border-color);
          border-radius: 16px;
          border-bottom-left-radius: 4px;
          width: fit-content;
        }
        .typing-dot {
          width: 6px;
          height: 6px;
          border-radius: 50%;
          background: var(--gold-primary);
          animation: typingBounce 1.4s infinite ease-in-out;
        }
        .typing-dot:nth-child(1) { animation-delay: 0s; }
        .typing-dot:nth-child(2) { animation-delay: 0.2s; }
        .typing-dot:nth-child(3) { animation-delay: 0.4s; }
        @keyframes typingBounce {
          0%, 60%, 100% { transform: translateY(0); opacity: 0.4; }
          30%            { transform: translateY(-6px); opacity: 1; }
        }

        .cb-suggestions {
          padding: 12px 20px;
          display: flex;
          gap: 8px;
          flex-wrap: wrap;
          border-top: 1px solid var(--border-color);
          flex-shrink: 0;
        }
        .suggestion-btn {
          padding: 8px 14px;
          border-radius: 20px;
          font-family: 'Space Grotesk', sans-serif;
          font-size: 11px;
          font-weight: 500;
          color: var(--text-secondary);
          background: var(--surface2);
          border: 1px solid var(--border-color);
          cursor: pointer;
          transition: all 0.2s;
        }
        .suggestion-btn:hover {
          border-color: var(--gold-primary);
          color: var(--gold-primary);
          transform: translateY(-1px);
        }

        .cb-input-area {
          padding: 16px 20px;
          border-top: 1px solid var(--border-color);
          display: flex;
          gap: 12px;
          background: rgba(212, 175, 55, 0.02);
          flex-shrink: 0;
        }
        .cb-input {
          flex: 1;
          padding: 12px 16px;
          background: var(--input-bg);
          border: 1px solid var(--border-color);
          border-radius: 12px;
          font-family: 'Inter', sans-serif;
          font-size: 13px;
          color: var(--text-primary);
          outline: none;
          transition: all 0.2s;
        }
        .cb-input:focus {
          border-color: var(--gold-primary);
          box-shadow: 0 0 0 3px rgba(212, 175, 55, 0.1);
        }
        .cb-input::placeholder { color: var(--gray-mid); }
        .cb-send {
          width: 44px;
          height: 44px;
          border-radius: 12px;
          background: linear-gradient(135deg, var(--gold-primary), var(--gold-dark));
          border: none;
          color: #000;
          font-size: 18px;
          font-weight: 600;
          cursor: pointer;
          transition: all 0.2s;
          display: flex;
          align-items: center;
          justify-content: center;
        }
        .cb-send:hover:not(:disabled) {
          transform: translateY(-2px);
          box-shadow: 0 4px 12px var(--gold-glow);
        }
        .cb-send:disabled { opacity: 0.5; cursor: not-allowed; }
      `}</style>

      <div className="cb-container">
        {/* Header */}
        <div className="cb-header">
          <div className="cb-header-info">
            <div className="cb-avatar">MQ</div>
            <div>
              <div className="cb-title">MediQueue Assistant</div>
              <div className="cb-subtitle">
                {patientName ? `Serving: ${patientName}` : "AI Healthcare Assistant"}
              </div>
            </div>
          </div>
          <button className="cb-reset" onClick={clearChat}>Clear History</button>
        </div>

        {/* Messages */}
        <div className="cb-messages">
          {messages.map((msg, idx) => (
            <div key={idx} className={`message-wrapper ${msg.role}`}>
              <div className="message-bubble">{msg.text}</div>
              <div className="message-time">{formatTime(msg.timestamp)}</div>
            </div>
          ))}

          {/* Waiting for first chunk */}
          {loading && !streamingText && (
            <div className="message-wrapper assistant">
              <div className="typing-indicator">
                <div className="typing-dot" />
                <div className="typing-dot" />
                <div className="typing-dot" />
              </div>
            </div>
          )}

          {/* Live streaming text */}
          {isStreaming && streamingText && (
            <div className="message-wrapper assistant">
              <div className="streaming-bubble">
                {streamingText}
                <span className="streaming-cursor" />
              </div>
            </div>
          )}

          <div ref={bottomRef} />
        </div>

        {/* Suggestions (only on fresh chat) */}
        {messages.length <= 2 && (
          <div className="cb-suggestions">
            {suggestions.map((s, i) => (
              <button
                key={i}
                className="suggestion-btn"
                onClick={() => send(s)}
              >
                {s}
              </button>
            ))}
          </div>
        )}

        {/* Input */}
        <div className="cb-input-area">
          <input
            ref={inputRef}
            className="cb-input"
            placeholder="Type your question..."
            value={input}
            onChange={e => setInput(e.target.value)}
            onKeyDown={e => e.key === "Enter" && send()}
          />
          <button className="cb-send" onClick={() => send()} disabled={loading || !input.trim()}>
            ↑
          </button>
        </div>
      </div>
    </>
  );
}