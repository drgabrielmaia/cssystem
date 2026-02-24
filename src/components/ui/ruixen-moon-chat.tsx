"use client";

import { useState, useRef, useEffect, useCallback } from "react";
import { Textarea } from "@/components/ui/textarea";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import {
  ImageIcon,
  FileUp,
  MonitorIcon,
  CircleUserRound,
  ArrowUpIcon,
  Paperclip,
  PlusIcon,
  Code2,
  Palette,
  Layers,
  Rocket,
  Send,
  Bot,
  User,
} from "lucide-react";

interface AutoResizeProps {
  minHeight: number;
  maxHeight?: number;
}

function useAutoResizeTextarea({ minHeight, maxHeight }: AutoResizeProps) {
  const textareaRef = useRef<HTMLTextAreaElement>(null);

  const adjustHeight = useCallback(
    (reset?: boolean) => {
      const textarea = textareaRef.current;
      if (!textarea) return;

      if (reset) {
        textarea.style.height = `${minHeight}px`;
        return;
      }

      textarea.style.height = `${minHeight}px`; // reset first
      const newHeight = Math.max(
        minHeight,
        Math.min(textarea.scrollHeight, maxHeight ?? Infinity)
      );
      textarea.style.height = `${newHeight}px`;
    },
    [minHeight, maxHeight]
  );

  useEffect(() => {
    if (textareaRef.current) textareaRef.current.style.height = `${minHeight}px`;
  }, [minHeight]);

  return { textareaRef, adjustHeight };
}

interface ChatMessage {
  id: string;
  text: string;
  isUser: boolean;
  timestamp: Date;
}

export default function RuixenMoonChat() {
  const [message, setMessage] = useState("");
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [showChat, setShowChat] = useState(false);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  
  const { textareaRef, adjustHeight } = useAutoResizeTextarea({
    minHeight: 48,
    maxHeight: 150,
  });

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  };

  useEffect(() => {
    scrollToBottom();
  }, [messages]);

  const sendMessage = async () => {
    if (!message.trim() || isLoading) return;

    const userMessage: ChatMessage = {
      id: Date.now().toString(),
      text: message,
      isUser: true,
      timestamp: new Date(),
    };

    setMessages(prev => [...prev, userMessage]);
    setMessage("");
    setIsLoading(true);
    setShowChat(true);
    adjustHeight(true);

    try {
      const response = await fetch('/api/chat-gemini', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          message: userMessage.text,
          userEmail: 'emersonbljr2802@gmail.com' // Usuário autorizado
        }),
      });

      const data = await response.json();

      if (data.success) {
        const aiMessage: ChatMessage = {
          id: (Date.now() + 1).toString(),
          text: data.message,
          isUser: false,
          timestamp: new Date(),
        };
        setMessages(prev => [...prev, aiMessage]);
      } else {
        throw new Error(data.error || 'Erro na resposta da IA');
      }
    } catch (error) {
      console.error('Erro ao enviar mensagem:', error);
      const errorMessage: ChatMessage = {
        id: (Date.now() + 1).toString(),
        text: 'Desculpe, ocorreu um erro ao processar sua mensagem. Tente novamente.',
        isUser: false,
        timestamp: new Date(),
      };
      setMessages(prev => [...prev, errorMessage]);
    } finally {
      setIsLoading(false);
    }
  };

  const handleKeyPress = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      sendMessage();
    }
  };

  return (
    <div
      className="relative w-full h-screen bg-cover bg-center flex flex-col items-center"
      style={{
        backgroundImage:
          "url('https://pub-940ccf6255b54fa799a9b01050e6c227.r2.dev/ruixen_moon_2.png')",
        backgroundAttachment: "fixed",
        filter: "hue-rotate(120deg) saturate(1.2)",
      }}
    >
      {/* Chat Messages Area */}
      {showChat && messages.length > 0 && (
        <div className="flex-1 w-full max-w-4xl px-4 py-8 overflow-y-auto">
          <div className="space-y-6">
            {messages.map((msg) => (
              <div
                key={msg.id}
                className={`flex ${msg.isUser ? 'justify-end' : 'justify-start'}`}
              >
                <div className={`flex items-start space-x-3 max-w-[80%] ${msg.isUser ? 'flex-row-reverse space-x-reverse' : ''}`}>
                  <div className={`w-8 h-8 rounded-full flex items-center justify-center ${
                    msg.isUser ? 'bg-blue-500' : 'bg-green-500'
                  }`}>
                    {msg.isUser ? <User className="w-5 h-5 text-white" /> : <Bot className="w-5 h-5 text-white" />}
                  </div>
                  <div className={`rounded-2xl px-4 py-3 ${
                    msg.isUser 
                      ? 'bg-green-600 text-white' 
                      : 'bg-white/10 backdrop-blur-md text-white border border-white/20'
                  }`}>
                    <div 
                      className="text-sm leading-relaxed whitespace-pre-wrap"
                      dangerouslySetInnerHTML={{ 
                        __html: msg.text
                          .replace(/\*\*([^*]+)\*\*/g, '<h2 class="text-lg font-bold mt-4 mb-2">$1</h2>')
                          .replace(/\*([^*]+)\*/g, '<strong>$1</strong>') 
                      }}
                    />
                    <p className="text-xs opacity-70 mt-1">
                      {msg.timestamp.toLocaleTimeString()}
                    </p>
                  </div>
                </div>
              </div>
            ))}
            {isLoading && (
              <div className="flex justify-start">
                <div className="flex items-start space-x-3 max-w-[80%]">
                  <div className="w-8 h-8 bg-green-500 rounded-full flex items-center justify-center">
                    <Bot className="w-5 h-5 text-white" />
                  </div>
                  <div className="bg-white/10 backdrop-blur-md border border-white/20 rounded-2xl px-4 py-3">
                    <div className="flex space-x-1">
                      <div className="w-2 h-2 bg-white rounded-full animate-bounce"></div>
                      <div className="w-2 h-2 bg-white rounded-full animate-bounce" style={{ animationDelay: '0.1s' }}></div>
                      <div className="w-2 h-2 bg-white rounded-full animate-bounce" style={{ animationDelay: '0.2s' }}></div>
                    </div>
                  </div>
                </div>
              </div>
            )}
            <div ref={messagesEndRef} />
          </div>
        </div>
      )}

      {/* Centered AI Title */}
      {!showChat && (
        <div className="flex-1 w-full flex flex-col items-center justify-center">
          <div className="text-center">
            <h1 className="text-4xl font-semibold text-white drop-shadow-sm">
              MDR AI
            </h1>
            <p className="mt-1 text-lg text-green-300 font-medium">
              Powered by Médicos de Resultado
            </p>
          </div>
        </div>
      )}

      {/* Input Box Section */}
      <div className="w-full max-w-3xl mb-[20vh]">
        <div className="relative bg-black/60 backdrop-blur-md rounded-xl border border-neutral-700">
          <Textarea
            ref={textareaRef}
            value={message}
            onChange={(e) => {
              setMessage(e.target.value);
              adjustHeight();
            }}
            onKeyPress={handleKeyPress}
            placeholder="Digite sua pergunta para a IA..."
            className={cn(
              "w-full px-4 py-3 resize-none border-none",
              "bg-transparent text-white text-sm",
              "focus-visible:ring-0 focus-visible:ring-offset-0",
              "placeholder:text-neutral-400 min-h-[48px]"
            )}
            style={{ overflow: "hidden" }}
            disabled={isLoading}
          />

          {/* Footer Buttons */}
          <div className="flex items-center justify-between p-3">
            <div className="text-xs text-neutral-400">
              {isLoading ? 'Pensando...' : 'Powered by Gemini Pro'}
            </div>

            <div className="flex items-center gap-2">
              <Button
                onClick={sendMessage}
                disabled={!message.trim() || isLoading}
                className={cn(
                  "flex items-center gap-1 px-3 py-2 rounded-lg transition-colors",
                  message.trim() && !isLoading 
                    ? "bg-green-600 hover:bg-green-700 text-white" 
                    : "bg-neutral-700 text-neutral-400 cursor-not-allowed"
                )}
              >
                {isLoading ? (
                  <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white"></div>
                ) : (
                  <Send className="w-4 h-4" />
                )}
                <span className="sr-only">Send</span>
              </Button>
            </div>
          </div>
        </div>

        {/* Quick Actions */}
        {!showChat && (
          <div className="flex items-center justify-center flex-wrap gap-3 mt-6">
            <QuickAction 
              icon={<CircleUserRound className="w-4 h-4" />} 
              label="Estratégias de Negócio"
              onClick={() => setMessage("Me ajude a criar uma estratégia de crescimento para meu consultório médico")}
            />
            <QuickAction 
              icon={<Rocket className="w-4 h-4" />} 
              label="Marketing Médico"
              onClick={() => setMessage("Quais são as melhores práticas de marketing para médicos?")}
            />
            <QuickAction 
              icon={<MonitorIcon className="w-4 h-4" />} 
              label="Gestão de Pacientes"
              onClick={() => setMessage("Como posso melhorar o atendimento e relacionamento com meus pacientes?")}
            />
            <QuickAction 
              icon={<FileUp className="w-4 h-4" />} 
              label="Telemedicina"
              onClick={() => setMessage("Como implementar e otimizar consultas de telemedicina?")}
            />
          </div>
        )}
      </div>
    </div>
  );
}

interface QuickActionProps {
  icon: React.ReactNode;
  label: string;
  onClick?: () => void;
}

function QuickAction({ icon, label, onClick }: QuickActionProps) {
  return (
    <Button
      variant="outline"
      onClick={onClick}
      className="flex items-center gap-2 rounded-full border-neutral-700 bg-black/50 text-neutral-300 hover:text-white hover:bg-neutral-700"
    >
      {icon}
      <span className="text-xs">{label}</span>
    </Button>
  );
}