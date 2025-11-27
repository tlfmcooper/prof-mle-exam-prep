import { useState, useEffect, useRef } from 'react';
import { X, Send, MessageCircle, Settings, ExternalLink, Loader2, Maximize2, Minimize2, Mic, Square, Volume2, VolumeX } from 'lucide-react';
import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { useApiKey } from '@/hooks/useApiKey';
import { generateGeminiResponseStream } from '@/services/gemini';
import { Question } from '@/lib/types';

interface Message {
  id: string;
  role: 'user' | 'model';
  text: string;
  timestamp: Date;
}

interface ExamChatWidgetProps {
  isOpen: boolean;
  onClose: () => void;
  activeQuestion?: Question | null;
  userAnswer?: string[];
  correctAnswer?: string[];
  context?: any[]; // Full session results
}

export function ExamChatWidget({
  isOpen,
  onClose,
  activeQuestion,
  userAnswer,
  correctAnswer,
}: ExamChatWidgetProps) {
  const { apiKey, saveApiKey, removeApiKey, hasKey, isEnvKey } = useApiKey();
  const [messages, setMessages] = useState<Message[]>([]);
  const [input, setInput] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [isStreaming, setIsStreaming] = useState(false);
  const [showKeyInput, setShowKeyInput] = useState(false);
  const [tempKey, setTempKey] = useState('');
  const [isExpanded, setIsExpanded] = useState(false);
  const [isListening, setIsListening] = useState(false);
  const [speakingId, setSpeakingId] = useState<string | null>(null);
  
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const abortControllerRef = useRef<AbortController | null>(null);
  const recognitionRef = useRef<any>(null);

  // Scroll to bottom on new message
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages, isOpen]);

  // Initial greeting when opening for a specific question
  useEffect(() => {
    if (isOpen && activeQuestion && messages.length === 0) {
      const initialMessage: Message = {
        id: 'init',
        role: 'model',
        text: `Hi! I can help you understand this question about **${activeQuestion.topics?.[0]?.name || 'Machine Learning'}**. What would you like to know?`,
        timestamp: new Date(),
      };
      setMessages([initialMessage]);
    }
  }, [isOpen, activeQuestion]);

  // Cleanup speech synthesis on unmount
  useEffect(() => {
    return () => {
      window.speechSynthesis.cancel();
      if (recognitionRef.current) {
        recognitionRef.current.stop();
      }
    };
  }, []);

  const handleStop = () => {
    if (abortControllerRef.current) {
      abortControllerRef.current.abort();
      abortControllerRef.current = null;
    }
    setIsLoading(false);
    setIsStreaming(false);
  };

  const handleVoiceInput = () => {
    if (isListening) {
      recognitionRef.current?.stop();
      setIsListening(false);
      return;
    }

    if (!('webkitSpeechRecognition' in window)) {
      alert('Voice input is not supported in this browser.');
      return;
    }

    // @ts-ignore
    const recognition = new window.webkitSpeechRecognition();
    recognition.continuous = false;
    recognition.interimResults = false;
    recognition.lang = 'en-US';

    recognition.onstart = () => {
      setIsListening(true);
    };

    recognition.onresult = (event: any) => {
      const transcript = event.results[0][0].transcript;
      setInput((prev) => prev + (prev ? ' ' : '') + transcript);
    };

    recognition.onerror = (event: any) => {
      console.error('Speech recognition error', event.error);
      setIsListening(false);
    };

    recognition.onend = () => {
      setIsListening(false);
    };

    recognitionRef.current = recognition;
    recognition.start();
  };

  const stripMarkdown = (markdown: string): string => {
    return markdown
      // Remove headers
      .replace(/#{1,6}\s*/g, '')
      // Remove bold/italic
      .replace(/(\*\*|__)(.*?)\1/g, '$2')
      .replace(/(\*|_)(.*?)\1/g, '$2')
      // Remove links but keep text
      .replace(/\[([^\]]+)\]\([^\)]+\)/g, '$1')
      // Remove inline code
      .replace(/`([^`]+)`/g, '$1')
      // Remove code blocks
      .replace(/```[\s\S]*?```/g, '')
      // Remove lists
      .replace(/^\s*[-*+]\s+/gm, '')
      .replace(/^\s*\d+\.\s+/gm, '')
      // Remove blockquotes
      .replace(/^\s*>\s+/gm, '')
      // Clean up extra whitespace
      .replace(/\n{3,}/g, '\n\n')
      .trim();
  };

  const handleSpeak = (text: string, id: string) => {
    if (speakingId === id) {
      window.speechSynthesis.cancel();
      setSpeakingId(null);
      return;
    }

    window.speechSynthesis.cancel();
    const plainText = stripMarkdown(text);
    const utterance = new SpeechSynthesisUtterance(plainText);
    utterance.onend = () => setSpeakingId(null);
    setSpeakingId(id);
    window.speechSynthesis.speak(utterance);
  };

  const handleSend = async () => {
    if (!input.trim() || !apiKey) return;

    const userMsg: Message = {
      id: Date.now().toString(),
      role: 'user',
      text: input,
      timestamp: new Date(),
    };

    setMessages((prev) => [...prev, userMsg]);
    setInput('');
    setIsLoading(true);
    setIsStreaming(true);
    
    // Create placeholder for model message
    const modelMsgId = (Date.now() + 1).toString();
    const modelMsg: Message = {
      id: modelMsgId,
      role: 'model',
      text: '',
      timestamp: new Date(),
    };
    setMessages((prev) => [...prev, modelMsg]);

    abortControllerRef.current = new AbortController();

    try {
      // Construct history for API
      const history = messages
        .filter(m => m.id !== 'init')
        .map((m) => ({
          role: m.role,
          parts: [{ text: m.text }],
        }));

      // System instruction with context
      let systemInstruction = `You are an expert Google Cloud Machine Learning Engineer Tutor. 
      Your goal is to help the user understand exam questions.
      ALWAYS use the Google Search tool to find relevant official Google Cloud documentation or popular educational YouTube videos to support your explanation.
      Cite your sources with links.`;

      if (activeQuestion) {
        systemInstruction += `\n\nCurrent Question Context:
        Question: ${activeQuestion.question_text}
        Options: ${activeQuestion.options.map((o) => `- ${o.text} ${o.is_correct ? '(Correct)' : ''}`).join('\n')}
        Explanation: ${activeQuestion.explanation}
        User Answered: ${userAnswer?.join(', ') || 'No answer'}
        Correct Answer: ${correctAnswer?.join(', ') || 'Unknown'}
        `;
      }

      const stream = generateGeminiResponseStream({
        apiKey,
        history,
        message: userMsg.text,
        systemInstruction,
      });

      let fullText = '';
      for await (const chunk of stream) {
        if (abortControllerRef.current?.signal.aborted) {
          break;
        }
        fullText += chunk;
        setMessages((prev) => 
          prev.map((m) => 
            m.id === modelMsgId ? { ...m, text: fullText } : m
          )
        );
      }
    } catch (error) {
      console.error('Gemini API Error:', error);
      if (!abortControllerRef.current?.signal.aborted) {
        const errorMsg: Message = {
          id: (Date.now() + 2).toString(),
          role: 'model',
          text: 'Sorry, I encountered an error connecting to the AI Tutor. Please check your API key or try again later.',
          timestamp: new Date(),
        };
        setMessages((prev) => [...prev, errorMsg]);
      }
    } finally {
      setIsLoading(false);
      setIsStreaming(false);
      abortControllerRef.current = null;
    }
  };

  const handleSaveKey = () => {
    if (tempKey.trim()) {
      saveApiKey(tempKey.trim());
      setShowKeyInput(false);
      setTempKey('');
    }
  };

  if (!isOpen) return null;

  return (
    <div className={`fixed z-[100] transition-all duration-300 shadow-2xl flex flex-col border bg-card
      ${isExpanded 
        ? 'inset-0 w-full h-full rounded-none' 
        : 'bottom-4 left-0 right-0 mx-auto h-[80vh] max-h-[600px] rounded-xl w-[calc(100vw-2rem)] sm:w-[calc(100vw-3rem)] lg:w-[calc(100vw-4rem)] max-w-[52rem]'
      }`}
    >
      {/* Header */}
      <div className="flex items-center justify-between p-4 border-b bg-gradient-to-r from-primary/10 via-primary/5 to-transparent backdrop-blur-sm">
        <div className="flex items-center gap-3">
          <div className="p-2.5 bg-primary/20 rounded-full ring-2 ring-primary/30 shadow-lg">
            <MessageCircle className="w-5 h-5 text-primary" />
          </div>
          <div>
            <h3 className="font-semibold text-base">Smart Tutor</h3>
            <p className="text-xs text-muted-foreground flex items-center gap-1">
              <span className="inline-block w-1.5 h-1.5 rounded-full bg-green-500 animate-pulse"></span>
              Powered by Gemini
            </p>
          </div>
        </div>
        <div className="flex items-center gap-1">
          <Button variant="ghost" size="icon" onClick={() => setShowKeyInput(!showKeyInput)} title="API Key Settings">
            <Settings className="w-4 h-4" />
          </Button>
          <Button variant="ghost" size="icon" onClick={() => setIsExpanded(!isExpanded)} className="hidden sm:flex">
            {isExpanded ? <Minimize2 className="w-4 h-4" /> : <Maximize2 className="w-4 h-4" />}
          </Button>
          <Button variant="ghost" size="icon" onClick={onClose}>
            <X className="w-4 h-4" />
          </Button>
        </div>
      </div>

      {/* API Key Setup */}
      {(showKeyInput || (!hasKey && !isEnvKey)) && (
        <div className="p-4 bg-gradient-to-r from-amber-50/50 via-orange-50/50 to-amber-50/50 dark:from-amber-950/20 dark:via-orange-950/20 dark:to-amber-950/20 border-b border-amber-200/50 dark:border-amber-800/50">
          <p className="text-sm text-muted-foreground mb-3 flex items-center gap-2">
            <Settings className="w-4 h-4 text-amber-600 dark:text-amber-400" />
            <span>
              {isEnvKey ? 'Override default API Key:' : 'Enter your Gemini API Key:'}
              <a href="https://aistudio.google.com/app/apikey" target="_blank" rel="noreferrer" className="ml-1 text-primary hover:underline inline-flex items-center gap-1 font-medium">
                Get one here <ExternalLink className="w-3 h-3" />
              </a>
            </span>
          </p>
          <div className="flex gap-2">
            <Input
              type="password"
              placeholder={isEnvKey ? "Enter new key to override" : "Paste API Key"}
              value={tempKey}
              onChange={(e) => setTempKey(e.target.value)}
              className="flex-1 bg-background"
            />
            <Button onClick={handleSaveKey} className="min-w-[70px]">Save</Button>
            {isEnvKey && (
               <Button variant="ghost" onClick={() => {
                 removeApiKey();
                 setShowKeyInput(false);
                 setTempKey('');
               }}>Reset</Button>
            )}
          </div>
        </div>
      )}

      {/* Chat Area */}
      <div className="flex-1 overflow-y-auto p-4 space-y-4 scroll-smooth">
        {messages.length === 0 && (
          <div className="h-full flex flex-col items-center justify-center text-center p-8 animate-in fade-in duration-500">
            <div className="p-4 bg-primary/10 rounded-full mb-4">
              <MessageCircle className="w-12 h-12 text-primary" />
            </div>
            <h3 className="text-lg font-semibold mb-2">Welcome to Smart Tutor!</h3>
            <p className="text-sm text-muted-foreground max-w-md">
              {activeQuestion
                ? "I'm here to help you understand this question. Ask me anything!"
                : "I'm your AI tutor powered by Gemini. Ask me any questions about Machine Learning Engineering!"}
            </p>
          </div>
        )}
        {messages.map((msg, index) => (
          <div
            key={msg.id}
            className={`flex animate-in fade-in slide-in-from-bottom-2 duration-300 ${msg.role === 'user' ? 'justify-end' : 'justify-start'}`}
            style={{ animationDelay: `${index * 50}ms` }}
          >
            <div
              className={`max-w-[85%] rounded-lg p-3.5 text-sm relative group break-words shadow-sm ${
                msg.role === 'user'
                  ? 'bg-primary text-primary-foreground rounded-br-sm'
                  : 'bg-muted text-foreground rounded-bl-sm'
              }`}
            >
              <div className="markdown-body text-sm break-words overflow-auto">
                <ReactMarkdown
                  remarkPlugins={[remarkGfm]}
                  components={{
                    a: ({node, ...props}) => <a {...props} target="_blank" rel="noopener noreferrer" className="text-blue-500 underline" />,
                    p: ({node, ...props}) => <p {...props} className="mb-2 last:mb-0" />,
                    ul: ({node, ...props}) => <ul {...props} className="list-disc pl-4 mb-2" />,
                    ol: ({node, ...props}) => <ol {...props} className="list-decimal pl-4 mb-2" />,
                    li: ({node, ...props}) => <li {...props} className="mb-1" />,
                    code: ({node, ...props}) => <code {...props} className="bg-black/10 rounded px-1 py-0.5" />,
                  }}
                >
                  {msg.text}
                </ReactMarkdown>
                {isStreaming && index === messages.length - 1 && msg.role === 'model' && (
                  <span className="inline-block w-2 h-4 bg-primary ml-1 animate-pulse"></span>
                )}
              </div>
              {msg.role === 'model' && msg.text && (
                <Button
                  variant="ghost"
                  size="icon"
                  className="absolute top-1 right-1 opacity-0 group-hover:opacity-100 transition-opacity h-7 w-7 bg-background/80 backdrop-blur-sm hover:bg-background/95"
                  onClick={() => handleSpeak(msg.text, msg.id)}
                  title={speakingId === msg.id ? "Stop reading" : "Read aloud"}
                >
                  {speakingId === msg.id ? (
                    <VolumeX className="w-3.5 h-3.5" />
                  ) : (
                    <Volume2 className="w-3.5 h-3.5" />
                  )}
                </Button>
              )}
            </div>
          </div>
        ))}
        {isLoading && messages.length > 0 && !messages[messages.length - 1]?.text && (
          <div className="flex justify-start animate-in fade-in slide-in-from-left-2 duration-300">
            <div className="bg-muted rounded-lg p-3 flex items-center gap-2">
              <Loader2 className="w-4 h-4 animate-spin text-primary" />
              <span className="text-xs text-muted-foreground">Thinking...</span>
            </div>
          </div>
        )}
        <div ref={messagesEndRef} />
      </div>

      {/* Input Area */}
      <div className="p-4 border-t bg-gradient-to-t from-background/95 to-background backdrop-blur-sm">
        <form
          onSubmit={(e) => {
            e.preventDefault();
            handleSend();
          }}
          className="flex gap-2 items-end"
        >
          <Button
            type="button"
            variant="ghost"
            size="icon"
            onClick={handleVoiceInput}
            className={`transition-all ${isListening ? "text-red-500 animate-pulse ring-2 ring-red-500/50" : "hover:text-primary"}`}
            title="Voice Input"
            disabled={!hasKey || isLoading}
          >
            <Mic className="w-4 h-4" />
          </Button>
          <div className="flex-1 relative">
            <Input
              value={input}
              onChange={(e) => setInput(e.target.value)}
              placeholder={isListening ? "Listening..." : (hasKey ? "Ask a question..." : "Please set API key first")}
              disabled={!hasKey || (isLoading && !isStreaming)}
              className="pr-3 py-2.5 rounded-lg transition-all focus:ring-2 focus:ring-primary/50"
            />
            {isListening && (
              <div className="absolute right-3 top-1/2 -translate-y-1/2 flex gap-1">
                <span className="w-1 h-3 bg-red-500 rounded-full animate-pulse"></span>
                <span className="w-1 h-4 bg-red-500 rounded-full animate-pulse" style={{animationDelay: '0.1s'}}></span>
                <span className="w-1 h-3 bg-red-500 rounded-full animate-pulse" style={{animationDelay: '0.2s'}}></span>
              </div>
            )}
          </div>
          {isStreaming ? (
            <Button
              type="button"
              variant="destructive"
              size="icon"
              onClick={handleStop}
              title="Stop Generation"
              className="transition-all hover:scale-105 active:scale-95"
            >
              <Square className="w-4 h-4 fill-current" />
            </Button>
          ) : (
            <Button
              type="submit"
              disabled={!hasKey || isLoading || !input.trim()}
              className="transition-all hover:scale-105 active:scale-95 disabled:scale-100"
            >
              <Send className="w-4 h-4" />
            </Button>
          )}
        </form>
      </div>
    </div>
  );
}
