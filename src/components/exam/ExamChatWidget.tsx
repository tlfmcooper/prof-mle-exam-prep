import { useState, useEffect, useRef } from 'react';
import { X, Send, MessageCircle, Settings, ExternalLink, Loader2, Maximize2, Minimize2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { useApiKey } from '@/hooks/useApiKey';
import { generateGeminiResponse } from '@/services/gemini';
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
  const [showKeyInput, setShowKeyInput] = useState(false);
  const [tempKey, setTempKey] = useState('');
  const [isExpanded, setIsExpanded] = useState(false);
  const messagesEndRef = useRef<HTMLDivElement>(null);

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

    try {
      // Construct history for API
      // Filter out the initial greeting ('init') as Gemini expects history to start with 'user'
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

      const responseText = await generateGeminiResponse({
        apiKey,
        history,
        message: userMsg.text,
        systemInstruction,
      });

      const modelMsg: Message = {
        id: (Date.now() + 1).toString(),
        role: 'model',
        text: responseText,
        timestamp: new Date(),
      };

      setMessages((prev) => [...prev, modelMsg]);
    } catch (error) {
      console.error('Gemini API Error:', error);
      const errorMsg: Message = {
        id: (Date.now() + 1).toString(),
        role: 'model',
        text: 'Sorry, I encountered an error connecting to the AI Tutor. Please check your API key or try again later.',
        timestamp: new Date(),
      };
      setMessages((prev) => [...prev, errorMsg]);
    } finally {
      setIsLoading(false);
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
        : 'bottom-0 right-0 w-full h-[80vh] rounded-t-xl sm:bottom-4 sm:right-4 sm:w-[400px] sm:h-[600px] sm:max-h-[80vh] sm:rounded-xl'
      }`}
    >
      {/* Header */}
      <div className="flex items-center justify-between p-4 border-b bg-primary/5">
        <div className="flex items-center gap-2">
          <div className="p-2 bg-primary/10 rounded-full">
            <MessageCircle className="w-5 h-5 text-primary" />
          </div>
          <div>
            <h3 className="font-semibold">Smart Tutor</h3>
            <p className="text-xs text-muted-foreground">Powered by Gemini</p>
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
        <div className="p-4 bg-muted/50 border-b">
          <p className="text-sm text-muted-foreground mb-2">
            {isEnvKey ? 'Override default API Key:' : 'Enter your Gemini API Key:'}
            <a href="https://aistudio.google.com/app/apikey" target="_blank" rel="noreferrer" className="ml-1 text-primary hover:underline flex-inline items-center gap-1">
              Get one here <ExternalLink className="w-3 h-3 inline" />
            </a>
          </p>
          <div className="flex gap-2">
            <Input
              type="password"
              placeholder={isEnvKey ? "Enter new key to override" : "Paste API Key"}
              value={tempKey}
              onChange={(e) => setTempKey(e.target.value)}
              className="flex-1"
            />
            <Button onClick={handleSaveKey}>Save</Button>
            {isEnvKey && (
               <Button variant="ghost" onClick={() => {
                 removeApiKey(); // Clear override
                 setShowKeyInput(false);
                 setTempKey('');
               }}>Reset</Button>
            )}
          </div>
        </div>
      )}

      {/* Chat Area */}
      <div className="flex-1 overflow-y-auto p-4 space-y-4">
        {messages.map((msg) => (
          <div
            key={msg.id}
            className={`flex ${msg.role === 'user' ? 'justify-end' : 'justify-start'}`}
          >
            <div
              className={`max-w-[85%] rounded-lg p-3 text-sm ${
                msg.role === 'user'
                  ? 'bg-primary text-primary-foreground'
                  : 'bg-muted text-foreground'
              }`}
            >
              <div className="markdown-body" dangerouslySetInnerHTML={{ __html: msg.text.replace(/\n/g, '<br/>').replace(/\*\*(.*?)\*\*/g, '<b>$1</b>') }} />
            </div>
          </div>
        ))}
        {isLoading && (
          <div className="flex justify-start">
            <div className="bg-muted rounded-lg p-3">
              <Loader2 className="w-4 h-4 animate-spin text-muted-foreground" />
            </div>
          </div>
        )}
        <div ref={messagesEndRef} />
      </div>

      {/* Input Area */}
      <div className="p-4 border-t bg-background">
        <form
          onSubmit={(e) => {
            e.preventDefault();
            handleSend();
          }}
          className="flex gap-2"
        >
          <Input
            value={input}
            onChange={(e) => setInput(e.target.value)}
            placeholder={hasKey ? "Ask a question..." : "Please set API key first"}
            disabled={!hasKey || isLoading}
            className="flex-1"
          />
          <Button type="submit" disabled={!hasKey || isLoading || !input.trim()}>
            <Send className="w-4 h-4" />
          </Button>
        </form>
      </div>
    </div>
  );
}
