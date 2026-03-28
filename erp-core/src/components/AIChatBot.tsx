'use client';

import React, { useState, useRef, useEffect } from 'react';
import { Bot, Send, X, MessageSquare, Loader2 } from 'lucide-react';
import axios from 'axios';

interface Message {
    role: 'user' | 'model';
    text: string;
}

export default function AIChatBot() {
    const [isOpen, setIsOpen] = useState(false);
    const [messages, setMessages] = useState<Message[]>([
        { role: 'model', text: 'Hello! I am your updated ERP Assistant. How can I help you today?' }
    ]);
    const [input, setInput] = useState('');
    const [loading, setLoading] = useState(false);
    const messagesEndRef = useRef<HTMLDivElement>(null);

    const scrollToBottom = () => {
        messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
    };

    useEffect(() => {
        scrollToBottom();
    }, [messages, isOpen]);

    const handleSend = async () => {
        if (!input.trim()) return;

        const userMessage = input;
        setInput('');
        setMessages(prev => [...prev, { role: 'user', text: userMessage }]);
        setLoading(true);

        try {
            // Convert history to Gemini format
            const history = messages.map(m => ({
                role: m.role,
                parts: [{ text: m.text }]
            }));

            const response = await axios.post(`${process.env.NEXT_PUBLIC_API_URL || 'http://localhost:5000/api'}/ai/chat`, {
                message: userMessage,
                history: history
            }, { withCredentials: true });

            setMessages(prev => [...prev, { role: 'model', text: response.data.response }]);
        } catch (error) {
            console.error('AI Error:', error);
            setMessages(prev => [...prev, { role: 'model', text: 'Sorry, I am having trouble connecting to the brain. Please check if the API Key is configured.' }]);
        } finally {
            setLoading(false);
        }
    };

    return (
        <div style={{ position: 'fixed', bottom: '2rem', right: '2rem', zIndex: 1000, fontFamily: 'Inter, sans-serif' }}>
            {/* Chat Window */}
            {isOpen && (
                <div className="glass-card chat-window">
                    {/* Header */}
                    <div style={{
                        padding: '1rem',
                        background: 'linear-gradient(135deg, var(--primary), var(--primary-dark))',
                        color: 'white',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'space-between'
                    }}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
                            <div style={{ padding: '0.5rem', background: 'rgba(255,255,255,0.2)', borderRadius: '50%' }}>
                                <Bot size={20} color="white" />
                            </div>
                            <div>
                                <h3 style={{ fontSize: '1rem', fontWeight: 600, margin: 0, color: 'white' }}>Nexus AI</h3>
                                <div style={{ fontSize: '0.75rem', opacity: 0.9, display: 'flex', alignItems: 'center', gap: '0.25rem' }}>
                                    <span style={{ width: '6px', height: '6px', backgroundColor: '#4ade80', borderRadius: '50%' }}></span>
                                    Online
                                </div>
                            </div>
                        </div>
                        <button onClick={() => setIsOpen(false)} style={{ background: 'none', border: 'none', color: 'white', cursor: 'pointer', opacity: 0.8 }}>
                            <X size={20} />
                        </button>
                    </div>

                    {/* Messages Area */}
                    <div style={{
                        flex: 1,
                        padding: '1rem',
                        overflowY: 'auto',
                        display: 'flex',
                        flexDirection: 'column',
                        gap: '1rem',
                        background: 'rgba(255, 255, 255, 0.95)'
                    }}>
                        {messages.map((msg, idx) => (
                            <div key={idx} style={{
                                display: 'flex',
                                justifyContent: msg.role === 'user' ? 'flex-end' : 'flex-start'
                            }}>
                                <div style={{
                                    maxWidth: '85%',
                                    padding: '0.75rem 1rem',
                                    borderRadius: '1rem',
                                    borderBottomRightRadius: msg.role === 'user' ? '0' : '1rem',
                                    borderBottomLeftRadius: msg.role === 'model' ? '0' : '1rem',
                                    backgroundColor: msg.role === 'user' ? 'var(--primary)' : '#F3F4F6',
                                    color: msg.role === 'user' ? 'white' : 'var(--text-main)',
                                    fontSize: '0.9rem',
                                    lineHeight: '1.5',
                                    boxShadow: '0 1px 2px rgba(0,0,0,0.05)'
                                }}>
                                    {msg.text}
                                </div>
                            </div>
                        ))}
                        {loading && (
                            <div style={{ display: 'flex', justifyContent: 'flex-start' }}>
                                <div style={{
                                    padding: '0.75rem 1rem',
                                    borderRadius: '1rem',
                                    borderBottomLeftRadius: '0',
                                    backgroundColor: '#F3F4F6',
                                    display: 'flex', alignItems: 'center', gap: '0.5rem'
                                }}>
                                    <Loader2 size={16} className="animate-spin" color="var(--primary)" />
                                    <span style={{ fontSize: '0.85rem', color: 'var(--text-muted)' }}>Thinking...</span>
                                </div>
                            </div>
                        )}
                        <div ref={messagesEndRef} />
                    </div>

                    {/* Input Area */}
                    <div style={{
                        padding: '1rem',
                        background: 'white',
                        borderTop: '1px solid var(--border)',
                        display: 'flex',
                        gap: '0.5rem'
                    }}>
                        <input
                            type="text"
                            value={input}
                            onChange={e => setInput(e.target.value)}
                            onKeyDown={e => e.key === 'Enter' && handleSend()}
                            placeholder="Ask anything..."
                            className="input-field"
                            style={{ flex: 1, padding: '0.75rem' }}
                            disabled={loading}
                        />
                        <button
                            onClick={handleSend}
                            disabled={loading || !input.trim()}
                            className="btn-primary"
                            style={{
                                padding: '0.75rem',
                                borderRadius: '0.5rem',
                                opacity: loading || !input.trim() ? 0.5 : 1
                            }}
                        >
                            <Send size={20} />
                        </button>
                    </div>
                </div>
            )}

            {/* Toggle Button */}
            {!isOpen && (
                <button
                    onClick={() => setIsOpen(true)}
                    className="btn-primary"
                    style={{
                        width: '60px',
                        height: '60px',
                        borderRadius: '50%',
                        padding: 0,
                        boxShadow: '0 10px 25px -5px rgba(99, 102, 241, 0.5)',
                        animation: 'bounceIn 0.5s cubic-bezier(0.175, 0.885, 0.32, 1.275)'
                    }}
                >
                    <MessageSquare size={28} />
                </button>
            )}

            <style jsx global>{`
                .chat-window {
                    width: 380px;
                    height: 600px;
                    margin-bottom: 1rem;
                    display: flex;
                    flex-direction: column;
                    overflow: hidden;
                    box-shadow: 0 20px 25px -5px rgba(0, 0, 0, 0.1), 0 10px 10px -5px rgba(0, 0, 0, 0.04);
                    border: 1px solid rgba(255, 255, 255, 0.5);
                    animation: slideUp 0.3s ease-out;
                }
                
                @media (max-width: 640px) {
                    .chat-window {
                        width: calc(100vw - 2rem) !important;
                        height: calc(100vh - 120px) !important;
                        position: fixed;
                        bottom: 5rem;
                        right: 1rem;
                        left: 1rem;
                    }
                }

                @keyframes slideUp {
                    from { opacity: 0; transform: translateY(20px); }
                    to { opacity: 1; transform: translateY(0); }
                }
                @keyframes bounceIn {
                    from { opacity: 0; transform: scale(0.5); }
                    to { opacity: 1; transform: scale(1); }
                }
                .animate-spin {
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
