import { useState, useRef, useEffect, useCallback } from 'react';
import { Send, Loader2, MessageSquare, AlertCircle } from 'lucide-react';
import { chatbotsApi } from '../api';

const genId = () => crypto.randomUUID();

interface Message {
    id: string;
    role: 'user' | 'bot';
    content: string;
    timestamp: Date;
    quickReplies?: string[];
    error?: boolean;
}

interface TestChatProps {
    chatbotId: string;
    chatbotName: string;
}

export default function TestChat({ chatbotId, chatbotName }: TestChatProps) {
    const [messages, setMessages] = useState<Message[]>([]);
    const [input, setInput] = useState('');
    const [isLoading, setIsLoading] = useState(false);
    const [sessionId] = useState(() => `test-${genId()}`);
    const messagesEndRef = useRef<HTMLDivElement>(null);
    const inputRef = useRef<HTMLInputElement>(null);

    const scrollToBottom = useCallback(() => {
        messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
    }, []);

    useEffect(() => {
        scrollToBottom();
    }, [messages, scrollToBottom]);

    const sendMessage = async (text: string) => {
        if (!text.trim() || isLoading) return;

        const userMessage: Message = {
            id: genId(),
            role: 'user',
            content: text.trim(),
            timestamp: new Date(),
        };

        setMessages(prev => [...prev, userMessage]);
        setInput('');
        setIsLoading(true);

        try {
            const result = await chatbotsApi.testMessage(chatbotId, sessionId, text.trim());

            const botMessage: Message = {
                id: genId(),
                role: 'bot',
                content: result.response?.message || '(Empty response)',
                timestamp: new Date(),
                quickReplies: result.response?.quickReplies,
            };

            setMessages(prev => [...prev, botMessage]);
        } catch (error) {
            const errorMessage: Message = {
                id: genId(),
                role: 'bot',
                content: error instanceof Error ? error.message : 'Failed to get response',
                timestamp: new Date(),
                error: true,
            };

            setMessages(prev => [...prev, errorMessage]);
        } finally {
            setIsLoading(false);
            inputRef.current?.focus();
        }
    };

    const handleKeyDown = (e: React.KeyboardEvent) => {
        if (e.key === 'Enter' && !e.shiftKey) {
            e.preventDefault();
            e.stopPropagation();
            sendMessage(input);
        }
    };

    const handleSendClick = (e: React.MouseEvent) => {
        e.preventDefault();
        e.stopPropagation();
        sendMessage(input);
    };

    const handleQuickReply = (reply: string) => {
        sendMessage(reply);
    };

    return (
        <div className="test-chat">
            <div className="test-chat-header">
                <div className="test-chat-header-info">
                    <MessageSquare size={18} />
                    <span>Test Chat — {chatbotName}</span>
                </div>
            </div>

            <div className="test-chat-messages">
                {messages.length === 0 && (
                    <div className="test-chat-empty">
                        <MessageSquare size={32} />
                        <p>Send a message to test your chatbot.</p>
                        <p className="test-chat-hint">Messages are processed the same way as in the live widget.</p>
                    </div>
                )}

                {messages.map(msg => (
                    <div
                        key={msg.id}
                        className={`test-chat-message ${msg.role} ${msg.error ? 'error' : ''}`}
                    >
                        {msg.error && <AlertCircle size={14} className="test-chat-error-icon" />}
                        <div className="test-chat-message-content">
                            {msg.content}
                        </div>
                        <div className="test-chat-message-time">
                            {msg.timestamp.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                        </div>
                        {msg.quickReplies && msg.quickReplies.length > 0 && (
                            <div className="test-chat-quick-replies">
                                {msg.quickReplies.map((reply, i) => (
                                    <button
                                        key={i}
                                        type="button"
                                        onClick={() => handleQuickReply(reply)}
                                        className="test-chat-quick-reply"
                                        disabled={isLoading}
                                    >
                                        {reply}
                                    </button>
                                ))}
                            </div>
                        )}
                    </div>
                ))}

                {isLoading && (
                    <div className="test-chat-message bot loading">
                        <div className="test-chat-typing">
                            <span></span><span></span><span></span>
                        </div>
                    </div>
                )}

                <div ref={messagesEndRef} />
            </div>

            <div className="test-chat-input-area">
                <input
                    ref={inputRef}
                    type="text"
                    value={input}
                    onChange={e => setInput(e.target.value)}
                    onKeyDown={handleKeyDown}
                    placeholder="Type a message..."
                    disabled={isLoading}
                    className="test-chat-input"
                    autoFocus
                />
                <button
                    type="button"
                    onClick={handleSendClick}
                    disabled={!input.trim() || isLoading}
                    className="test-chat-send-btn"
                >
                    {isLoading ? <Loader2 size={18} className="spin" /> : <Send size={18} />}
                </button>
            </div>

            <style>{`
                .test-chat {
                    display: flex;
                    flex-direction: column;
                    height: 500px;
                    border: 1px solid var(--border-color, #e2e8f0);
                    border-radius: 12px;
                    overflow: hidden;
                    background: var(--bg-primary, #ffffff);
                }

                .test-chat-header {
                    display: flex;
                    align-items: center;
                    justify-content: space-between;
                    padding: 12px 16px;
                    background: linear-gradient(135deg, #6366f1, #8b5cf6);
                    color: white;
                    font-weight: 600;
                    font-size: 14px;
                }

                .test-chat-header-info {
                    display: flex;
                    align-items: center;
                    gap: 8px;
                }

                .test-chat-clear-btn {
                    background: rgba(255,255,255,0.2);
                    border: none;
                    color: white;
                    padding: 6px;
                    border-radius: 6px;
                    cursor: pointer;
                    display: flex;
                    align-items: center;
                    transition: background 0.2s;
                }

                .test-chat-clear-btn:hover {
                    background: rgba(255,255,255,0.3);
                }

                .test-chat-messages {
                    flex: 1;
                    overflow-y: auto;
                    padding: 16px;
                    display: flex;
                    flex-direction: column;
                    gap: 12px;
                    background: var(--bg-secondary, #f8fafc);
                }

                .test-chat-empty {
                    display: flex;
                    flex-direction: column;
                    align-items: center;
                    justify-content: center;
                    height: 100%;
                    color: var(--text-secondary, #94a3b8);
                    text-align: center;
                    gap: 8px;
                }

                .test-chat-empty p {
                    margin: 0;
                    font-size: 14px;
                    max-width: 260px;
                }

                .test-chat-hint {
                    font-size: 12px !important;
                    opacity: 0.7;
                }

                .test-chat-message {
                    max-width: 80%;
                    padding: 10px 14px;
                    border-radius: 12px;
                    font-size: 14px;
                    line-height: 1.5;
                    position: relative;
                }

                .test-chat-message.user {
                    align-self: flex-end;
                    background: #6366f1;
                    color: white;
                    border-bottom-right-radius: 4px;
                }

                .test-chat-message.bot {
                    align-self: flex-start;
                    background: var(--bg-primary, #ffffff);
                    color: var(--text-primary, #1e293b);
                    border: 1px solid var(--border-color, #e2e8f0);
                    border-bottom-left-radius: 4px;
                }

                .test-chat-message.bot.error {
                    border-color: #ef4444;
                    background: #fef2f2;
                    color: #dc2626;
                }

                .test-chat-error-icon {
                    margin-bottom: 4px;
                }

                .test-chat-message-content {
                    white-space: pre-wrap;
                    word-break: break-word;
                }

                .test-chat-message-time {
                    font-size: 11px;
                    opacity: 0.6;
                    margin-top: 4px;
                }

                .test-chat-quick-replies {
                    display: flex;
                    flex-wrap: wrap;
                    gap: 6px;
                    margin-top: 8px;
                }

                .test-chat-quick-reply {
                    background: transparent;
                    border: 1px solid #6366f1;
                    color: #6366f1;
                    padding: 4px 12px;
                    border-radius: 16px;
                    font-size: 12px;
                    cursor: pointer;
                    transition: all 0.2s;
                }

                .test-chat-quick-reply:hover:not(:disabled) {
                    background: #6366f1;
                    color: white;
                }

                .test-chat-quick-reply:disabled {
                    opacity: 0.5;
                    cursor: not-allowed;
                }

                .test-chat-typing {
                    display: flex;
                    gap: 4px;
                    padding: 4px 0;
                }

                .test-chat-typing span {
                    width: 8px;
                    height: 8px;
                    border-radius: 50%;
                    background: #94a3b8;
                    animation: test-chat-bounce 1.4s infinite;
                }

                .test-chat-typing span:nth-child(2) {
                    animation-delay: 0.2s;
                }

                .test-chat-typing span:nth-child(3) {
                    animation-delay: 0.4s;
                }

                @keyframes test-chat-bounce {
                    0%, 60%, 100% { transform: translateY(0); }
                    30% { transform: translateY(-6px); }
                }

                .test-chat-input-area {
                    display: flex;
                    padding: 12px;
                    gap: 8px;
                    border-top: 1px solid var(--border-color, #e2e8f0);
                    background: var(--bg-primary, #ffffff);
                }

                .test-chat-input {
                    flex: 1;
                    padding: 10px 14px;
                    border: 1px solid var(--border-color, #e2e8f0);
                    border-radius: 8px;
                    font-size: 14px;
                    outline: none;
                    background: var(--bg-secondary, #f8fafc);
                    color: var(--text-primary, #1e293b);
                    transition: border-color 0.2s;
                }

                .test-chat-input:focus {
                    border-color: #6366f1;
                }

                .test-chat-send-btn {
                    display: flex;
                    align-items: center;
                    justify-content: center;
                    width: 40px;
                    height: 40px;
                    border-radius: 8px;
                    border: none;
                    background: #6366f1;
                    color: white;
                    cursor: pointer;
                    transition: background 0.2s;
                }

                .test-chat-send-btn:hover:not(:disabled) {
                    background: #4f46e5;
                }

                .test-chat-send-btn:disabled {
                    opacity: 0.5;
                    cursor: not-allowed;
                }

                .spin {
                    animation: spin 1s linear infinite;
                }

                @keyframes spin {
                    from { transform: rotate(0deg); }
                    to { transform: rotate(360deg); }
                }
            `}</style>
        </div>
    );
}
