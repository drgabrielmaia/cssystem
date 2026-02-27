"use client";

import { useState, useRef, useEffect, useCallback } from "react";
import { Textarea } from "@/components/ui/textarea";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { cn } from "@/lib/utils";
import { PostPreview } from "../posts/PostPreview";
import { ExportButton } from "../posts/ExportButton";
import type { PostData } from "../../types";
import { useMentoradoAuth } from "@/contexts/mentorado-auth";
import {
  Send,
  Bot,
  User,
  Settings,
  Target,
  Heart,
  Instagram,
  Edit,
  Save,
  X,
  Plus,
  Image as ImageIcon,
  Download,
  Bookmark,
  Trash2,
  Copy,
  ExternalLink
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

      textarea.style.height = `${minHeight}px`;
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
  canSave?: boolean;
  postType?: 'motivacional' | 'educativo' | 'pessoal';
}

interface SavedPost {
  id: string;
  title: string;
  content: string;
  tipo_post: 'motivacional' | 'educativo' | 'pessoal';
  persona?: string;
  dores_desejos?: string[];
  image_url?: string;
  is_favorite: boolean;
  created_at: string;
}

interface UserProfile {
  name: string;
  email: string;
  doresDesejos: string[];
  persona: string;
}

export default function EnhancedAIChat() {
  const { mentorado } = useMentoradoAuth();

  // Verificação de acesso - APENAS para emersonbljr2802@gmail.com
  if (!mentorado || mentorado.email !== 'emersonbljr2802@gmail.com') {
    return (
      <div className="min-h-screen w-full flex items-center justify-center bg-gradient-to-br from-gray-900 via-red-900 to-red-800">
        <div className="max-w-md mx-auto text-center p-8">
          <div className="w-16 h-16 bg-red-500/20 rounded-full flex items-center justify-center mx-auto mb-4">
            <X className="w-8 h-8 text-red-400" />
          </div>
          <h1 className="text-2xl font-bold text-white mb-4">Acesso Restrito</h1>
          <p className="text-red-200 text-lg">
            Esta funcionalidade está disponível apenas para usuários autorizados.
          </p>
          <p className="text-red-300 text-sm mt-4">
            Entre em contato com o suporte se você acredita que deveria ter acesso.
          </p>
        </div>
      </div>
    );
  }

  const [message, setMessage] = useState("");
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [activeTab, setActiveTab] = useState<'chat' | 'profile' | 'posts'>('chat');
  const [savedPosts, setSavedPosts] = useState<SavedPost[]>([]);
  const [editingPost, setEditingPost] = useState<string | null>(null);
  const [editingPostContent, setEditingPostContent] = useState("");
  const [editingDores, setEditingDores] = useState(false);
  const [editingPersona, setEditingPersona] = useState(false);
  const [newDor, setNewDor] = useState("");
  
  // Estados para o gerador de imagens
  const [showImageGenerator, setShowImageGenerator] = useState(false);
  const [currentPostForImage, setCurrentPostForImage] = useState<SavedPost | null>(null);
  const [postData, setPostData] = useState<PostData>({
    template: 'dark',
    text: '',
    fontSize: 34,
    profileName: 'Gabriel Maia',
    profileHandle: '@drgabriel.maia'
  });
  const [canvasRef, setCanvasRef] = useState<HTMLDivElement | null>(null);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  
  const { textareaRef, adjustHeight } = useAutoResizeTextarea({
    minHeight: 48,
    maxHeight: 120,
  });

  // Estado do perfil do usuário (simular dados iniciais)
  const [userProfile, setUserProfile] = useState<UserProfile>({
    name: "Gabriel Maia",
    email: "emersonbljr2802@gmail.com",
    doresDesejos: [
      "Quero aumentar minha presença online",
      "Preciso de mais engajamento no Instagram",
      "Desejo criar conteúdo mais relevante"
    ],
    persona: "Sou médico especialista em performance e quero ajudar outros profissionais da saúde a crescerem digitalmente."
  });

  const [tempPersona, setTempPersona] = useState(userProfile.persona);

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
    adjustHeight(true);

    try {
      const response = await fetch('/api/chat-gemini', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ 
          message: userMessage.text,
          userEmail: userProfile.email,
          context: {
            persona: userProfile.persona,
            doresDesejos: userProfile.doresDesejos
          }
        }),
      });

      if (!response.ok) throw new Error('Erro na API');

      const data = await response.json();
      
      const aiMessage: ChatMessage = {
        id: (Date.now() + 1).toString(),
        text: data.message,
        isUser: false,
        timestamp: new Date(),
      };

      setMessages(prev => [...prev, aiMessage]);
    } catch (error) {
      console.error('Erro:', error);
      const errorMessage: ChatMessage = {
        id: (Date.now() + 1).toString(),
        text: "Desculpe, ocorreu um erro. Tente novamente.",
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

  const addDor = () => {
    if (newDor.trim() && userProfile.doresDesejos.length < 20) {
      setUserProfile(prev => ({
        ...prev,
        doresDesejos: [...prev.doresDesejos, newDor.trim()]
      }));
      setNewDor("");
    }
  };

  const removeDor = (index: number) => {
    setUserProfile(prev => ({
      ...prev,
      doresDesejos: prev.doresDesejos.filter((_, i) => i !== index)
    }));
  };

  const savePersona = () => {
    setUserProfile(prev => ({ ...prev, persona: tempPersona }));
    setEditingPersona(false);
  };

  const generatePost = async (tipo: 'motivacional' | 'educativo' | 'pessoal') => {
    setIsLoading(true);
    try {
      const response = await fetch('/api/chat-gemini', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          message: `Gere um post para Instagram do tipo ${tipo}`,
          userEmail: userProfile.email,
          context: {
            persona: userProfile.persona,
            doresDesejos: userProfile.doresDesejos,
            tipoPost: tipo
          }
        }),
      });

      const data = await response.json();
      
      // Adicionar resultado como mensagem no chat
      const postMessage: ChatMessage = {
        id: Date.now().toString(),
        text: `📱 **Post ${tipo} gerado:**\n\n${data.message}`,
        isUser: false,
        timestamp: new Date(),
        canSave: true,
        postType: tipo
      };

      setMessages(prev => [...prev, postMessage]);
      setActiveTab('chat'); // Voltar para o chat para ver o resultado
    } catch (error) {
      console.error('Erro ao gerar post:', error);
    } finally {
      setIsLoading(false);
    }
  };

  // Funções para gerenciar posts salvos
  const loadSavedPosts = async () => {
    try {
      const response = await fetch(`/api/saved-posts?userEmail=${userProfile.email}`);
      const data = await response.json();
      if (data.posts) {
        setSavedPosts(data.posts);
      }
    } catch (error) {
      console.error('Erro ao carregar posts salvos:', error);
    }
  };

  const savePost = async (message: ChatMessage) => {
    if (!message.canSave || !message.postType) return;

    try {
      const title = `Post ${message.postType} - ${new Date().toLocaleDateString()}`;
      const content = message.text.replace(/^📱 \*\*Post .+ gerado:\*\*\n\n/, '');

      const response = await fetch('/api/saved-posts', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          userEmail: userProfile.email,
          title,
          content,
          tipo: message.postType,
          persona: userProfile.persona,
          doresDesejos: userProfile.doresDesejos
        })
      });

      if (response.ok) {
        loadSavedPosts(); // Recarregar lista
        alert('Post salvo com sucesso!');
      }
    } catch (error) {
      console.error('Erro ao salvar post:', error);
      alert('Erro ao salvar post');
    }
  };

  const deletePost = async (postId: string) => {
    try {
      const response = await fetch(`/api/saved-posts?id=${postId}&userEmail=${userProfile.email}`, {
        method: 'DELETE'
      });

      if (response.ok) {
        setSavedPosts(prev => prev.filter(p => p.id !== postId));
      }
    } catch (error) {
      console.error('Erro ao excluir post:', error);
    }
  };

  const updatePost = async (postId: string, newContent: string) => {
    try {
      // Por enquanto, apenas atualizar localmente
      setSavedPosts(prev => prev.map(p => 
        p.id === postId ? { ...p, content: newContent } : p
      ));
      setEditingPost(null);
      setEditingPostContent("");
    } catch (error) {
      console.error('Erro ao atualizar post:', error);
    }
  };

  const copyToClipboard = (content: string) => {
    navigator.clipboard.writeText(content.replace(/\*\*(.*?)\*\*/g, '$1'));
    alert('Texto copiado!');
  };

  const openImageGenerator = (post: SavedPost) => {
    setCurrentPostForImage(post);
    setPostData({
      template: 'dark',
      text: post.content,
      fontSize: 34,
      profileName: userProfile.name,
      profileHandle: `@${userProfile.email.split('@')[0]}`
    });
    setShowImageGenerator(true);
  };

  const closeImageGenerator = () => {
    setShowImageGenerator(false);
    setCurrentPostForImage(null);
  };

  // Carregar posts salvos quando a aba for ativada
  useEffect(() => {
    if (activeTab === 'posts') {
      loadSavedPosts();
    }
  }, [activeTab]);

  return (
    <div className="flex h-screen bg-gray-900 text-white">
      {/* Sidebar - Perfil */}
      <div className="w-80 bg-gray-800 border-r border-gray-700 flex flex-col">
        {/* User Profile Header */}
        <div className="p-6 border-b border-gray-700">
          <div className="flex items-center space-x-3">
            <div className="w-12 h-12 bg-blue-600 rounded-full flex items-center justify-center">
              <User className="w-6 h-6" />
            </div>
            <div>
              <h3 className="font-semibold">{userProfile.name}</h3>
              <p className="text-sm text-gray-400">{userProfile.email}</p>
            </div>
          </div>
        </div>

        {/* Navigation Tabs */}
        <div className="flex border-b border-gray-700">
          <button
            onClick={() => setActiveTab('chat')}
            className={cn(
              "flex-1 py-3 px-4 text-sm font-medium border-b-2 transition-colors",
              activeTab === 'chat' 
                ? "border-blue-500 text-blue-400" 
                : "border-transparent text-gray-400 hover:text-gray-300"
            )}
          >
            Chat
          </button>
          <button
            onClick={() => setActiveTab('profile')}
            className={cn(
              "flex-1 py-3 px-4 text-sm font-medium border-b-2 transition-colors",
              activeTab === 'profile' 
                ? "border-blue-500 text-blue-400" 
                : "border-transparent text-gray-400 hover:text-gray-300"
            )}
          >
            Perfil
          </button>
          <button
            onClick={() => setActiveTab('posts')}
            className={cn(
              "flex-1 py-3 px-4 text-sm font-medium border-b-2 transition-colors",
              activeTab === 'posts' 
                ? "border-blue-500 text-blue-400" 
                : "border-transparent text-gray-400 hover:text-gray-300"
            )}
          >
            Posts
          </button>
        </div>

        {/* Tab Content */}
        <div className="flex-1 overflow-y-auto p-4 space-y-4">
          {activeTab === 'profile' && (
            <>
              {/* Persona Section */}
              <Card className="bg-gray-700 border-gray-600">
                <CardHeader className="pb-3">
                  <CardTitle className="text-lg flex items-center">
                    <Settings className="w-5 h-5 mr-2" />
                    Persona
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  {editingPersona ? (
                    <div className="space-y-3">
                      <Textarea
                        value={tempPersona}
                        onChange={(e) => setTempPersona(e.target.value)}
                        placeholder="Descreva quem você é e seus objetivos..."
                        className="bg-gray-800 border-gray-600 text-white resize-none"
                        rows={4}
                      />
                      <div className="flex space-x-2">
                        <Button 
                          onClick={savePersona} 
                          size="sm" 
                          className="bg-green-600 hover:bg-green-700"
                        >
                          <Save className="w-4 h-4 mr-1" />
                          Salvar
                        </Button>
                        <Button 
                          onClick={() => setEditingPersona(false)} 
                          variant="outline" 
                          size="sm"
                          className="border-gray-600"
                        >
                          <X className="w-4 h-4 mr-1" />
                          Cancelar
                        </Button>
                      </div>
                    </div>
                  ) : (
                    <div>
                      <p className="text-gray-300 text-sm mb-3">{userProfile.persona}</p>
                      <Button 
                        onClick={() => setEditingPersona(true)} 
                        variant="outline" 
                        size="sm"
                        className="border-gray-600"
                      >
                        <Edit className="w-4 h-4 mr-1" />
                        Editar
                      </Button>
                    </div>
                  )}
                </CardContent>
              </Card>

              {/* Dores e Desejos Section */}
              <Card className="bg-gray-700 border-gray-600">
                <CardHeader className="pb-3">
                  <CardTitle className="text-lg flex items-center justify-between">
                    <div className="flex items-center">
                      <Target className="w-5 h-5 mr-2" />
                      Dores & Desejos
                    </div>
                    <span className="text-xs text-gray-400">
                      {userProfile.doresDesejos.length}/20
                    </span>
                  </CardTitle>
                </CardHeader>
                <CardContent className="space-y-3">
                  <div className="space-y-2 max-h-40 overflow-y-auto">
                    {userProfile.doresDesejos.map((item, index) => (
                      <div 
                        key={index} 
                        className="flex items-center justify-between p-2 bg-gray-800 rounded text-sm"
                      >
                        <span className="flex-1 pr-2">{item}</span>
                        <Button
                          onClick={() => removeDor(index)}
                          variant="ghost"
                          size="sm"
                          className="h-6 w-6 p-0 text-red-400 hover:text-red-300"
                        >
                          <X className="w-3 h-3" />
                        </Button>
                      </div>
                    ))}
                  </div>
                  
                  {userProfile.doresDesejos.length < 20 && (
                    <div className="flex space-x-2">
                      <Textarea
                        value={newDor}
                        onChange={(e) => setNewDor(e.target.value)}
                        placeholder="Nova dor ou desejo..."
                        className="bg-gray-800 border-gray-600 text-white text-sm resize-none"
                        rows={2}
                      />
                      <Button
                        onClick={addDor}
                        size="sm"
                        disabled={!newDor.trim()}
                        className="bg-blue-600 hover:bg-blue-700"
                      >
                        <Plus className="w-4 h-4" />
                      </Button>
                    </div>
                  )}
                </CardContent>
              </Card>
            </>
          )}

          {activeTab === 'posts' && (
            <div className="space-y-4">
              <Card className="bg-gray-700 border-gray-600">
                <CardHeader>
                  <CardTitle className="text-lg flex items-center">
                    <Instagram className="w-5 h-5 mr-2" />
                    Gerador de Posts
                  </CardTitle>
                </CardHeader>
                <CardContent className="space-y-3">
                  <Button
                    onClick={() => generatePost('motivacional')}
                    disabled={isLoading}
                    className="w-full bg-gradient-to-r from-purple-600 to-pink-600 hover:from-purple-700 hover:to-pink-700"
                  >
                    <Heart className="w-4 h-4 mr-2" />
                    Post Motivacional
                  </Button>
                  <Button
                    onClick={() => generatePost('educativo')}
                    disabled={isLoading}
                    className="w-full bg-gradient-to-r from-blue-600 to-teal-600 hover:from-blue-700 hover:to-teal-700"
                  >
                    <Target className="w-4 h-4 mr-2" />
                    Post Educativo
                  </Button>
                  <Button
                    onClick={() => generatePost('pessoal')}
                    disabled={isLoading}
                    className="w-full bg-gradient-to-r from-green-600 to-blue-600 hover:from-green-700 hover:to-blue-700"
                  >
                    <User className="w-4 h-4 mr-2" />
                    Post Pessoal
                  </Button>
                </CardContent>
              </Card>

              {/* Posts Salvos */}
              <Card className="bg-gray-700 border-gray-600">
                <CardHeader>
                  <CardTitle className="text-lg flex items-center">
                    <Bookmark className="w-5 h-5 mr-2" />
                    Posts Salvos ({savedPosts.length})
                  </CardTitle>
                </CardHeader>
                <CardContent className="space-y-3">
                  {savedPosts.length === 0 ? (
                    <p className="text-gray-400 text-sm text-center py-4">
                      Nenhum post salvo ainda. Gere um post e clique em "Salvar" para salvá-lo aqui.
                    </p>
                  ) : (
                    savedPosts.map((post) => (
                      <Card key={post.id} className="bg-gray-600 border-gray-500">
                        <CardContent className="p-3">
                          <div className="flex items-start justify-between mb-2">
                            <div className="flex-1">
                              <h4 className="text-sm font-medium text-white">{post.title}</h4>
                              <p className="text-xs text-gray-400">
                                {new Date(post.created_at).toLocaleDateString('pt-BR')}
                              </p>
                            </div>
                            <div className="flex gap-1">
                              <Button
                                size="sm"
                                variant="ghost"
                                onClick={() => {
                                  setEditingPost(post.id);
                                  setEditingPostContent(post.content);
                                }}
                                className="h-6 w-6 p-0 text-gray-400 hover:text-white"
                              >
                                <Edit className="w-3 h-3" />
                              </Button>
                              <Button
                                size="sm"
                                variant="ghost"
                                onClick={() => copyToClipboard(post.content)}
                                className="h-6 w-6 p-0 text-gray-400 hover:text-white"
                              >
                                <Copy className="w-3 h-3" />
                              </Button>
                              <Button
                                size="sm"
                                variant="ghost"
                                onClick={() => openImageGenerator(post)}
                                className="h-6 w-6 p-0 text-gray-400 hover:text-blue-400"
                                title="Gerar imagem"
                              >
                                <Download className="w-3 h-3" />
                              </Button>
                              <Button
                                size="sm"
                                variant="ghost"
                                onClick={() => deletePost(post.id)}
                                className="h-6 w-6 p-0 text-gray-400 hover:text-red-400"
                              >
                                <Trash2 className="w-3 h-3" />
                              </Button>
                            </div>
                          </div>
                          
                          {editingPost === post.id ? (
                            <div className="space-y-2">
                              <Textarea
                                value={editingPostContent}
                                onChange={(e) => setEditingPostContent(e.target.value)}
                                className="bg-gray-700 border-gray-500 text-white min-h-[80px]"
                              />
                              <div className="flex gap-2">
                                <Button
                                  size="sm"
                                  onClick={() => updatePost(post.id, editingPostContent)}
                                  className="bg-blue-600 hover:bg-blue-700"
                                >
                                  <Save className="w-3 h-3 mr-1" />
                                  Salvar
                                </Button>
                                <Button
                                  size="sm"
                                  variant="outline"
                                  onClick={() => {
                                    setEditingPost(null);
                                    setEditingPostContent("");
                                  }}
                                  className="bg-transparent border-gray-500 text-gray-300"
                                >
                                  <X className="w-3 h-3 mr-1" />
                                  Cancelar
                                </Button>
                              </div>
                            </div>
                          ) : (
                            <div className="text-xs text-gray-300 line-clamp-3">
                              {post.content.length > 100 
                                ? post.content.substring(0, 100) + '...' 
                                : post.content
                              }
                            </div>
                          )}
                          
                          <div className="flex items-center justify-between mt-2">
                            <span className={cn(
                              "px-2 py-1 rounded text-xs font-medium",
                              post.tipo_post === 'motivacional' 
                                ? "bg-purple-900/50 text-purple-300"
                                : post.tipo_post === 'educativo'
                                ? "bg-blue-900/50 text-blue-300"
                                : "bg-green-900/50 text-green-300"
                            )}>
                              {post.tipo_post}
                            </span>
                            {post.image_url && (
                              <Button
                                size="sm"
                                variant="ghost"
                                onClick={() => window.open(post.image_url, '_blank')}
                                className="h-6 text-gray-400 hover:text-white"
                              >
                                <ExternalLink className="w-3 h-3" />
                              </Button>
                            )}
                          </div>
                        </CardContent>
                      </Card>
                    ))
                  )}
                </CardContent>
              </Card>
            </div>
          )}
        </div>
      </div>

      {/* Main Chat Area */}
      <div className="flex-1 flex flex-col">
        {activeTab === 'chat' && (
          <>
            {/* Messages Area */}
            <div className="flex-1 overflow-y-auto p-6 space-y-4">
              {messages.length === 0 && (
                <div className="text-center text-gray-400 mt-20">
                  <Bot className="w-16 h-16 mx-auto mb-4 opacity-50" />
                  <h3 className="text-xl mb-2">Como posso ajudar hoje?</h3>
                  <p className="text-sm">
                    Faça uma pergunta ou peça para eu gerar conteúdo baseado no seu perfil.
                  </p>
                </div>
              )}
              
              {messages.map((msg) => (
                <div key={msg.id} className={cn(
                  "flex", 
                  msg.isUser ? "justify-end" : "justify-start"
                )}>
                  <div className={cn(
                    "flex max-w-[80%] space-x-3",
                    msg.isUser && "flex-row-reverse space-x-reverse"
                  )}>
                    <div className={cn(
                      "w-8 h-8 rounded-full flex items-center justify-center flex-shrink-0",
                      msg.isUser ? "bg-blue-600" : "bg-gray-700"
                    )}>
                      {msg.isUser ? 
                        <User className="w-4 h-4" /> : 
                        <Bot className="w-4 h-4" />
                      }
                    </div>
                    <div className={cn(
                      "rounded-lg p-4 max-w-full",
                      msg.isUser 
                        ? "bg-blue-600 text-white" 
                        : "bg-gray-700 text-gray-100"
                    )}>
                      <p className="text-sm whitespace-pre-wrap">{msg.text}</p>
                      
                      {/* Botões de ação para posts gerados */}
                      {msg.canSave && !msg.isUser && (
                        <div className="flex gap-2 mt-3 pt-2 border-t border-gray-600">
                          <Button
                            size="sm"
                            variant="outline"
                            onClick={() => savePost(msg)}
                            className="bg-transparent border-gray-500 text-gray-300 hover:bg-gray-600 hover:text-white"
                          >
                            <Bookmark className="w-3 h-3 mr-1" />
                            Salvar
                          </Button>
                          <Button
                            size="sm"
                            variant="outline"
                            onClick={() => copyToClipboard(msg.text)}
                            className="bg-transparent border-gray-500 text-gray-300 hover:bg-gray-600 hover:text-white"
                          >
                            <Copy className="w-3 h-3 mr-1" />
                            Copiar
                          </Button>
                        </div>
                      )}
                      
                      <p className="text-xs opacity-70 mt-2">
                        {msg.timestamp.toLocaleTimeString('pt-BR', { 
                          hour: '2-digit', 
                          minute: '2-digit' 
                        })}
                      </p>
                    </div>
                  </div>
                </div>
              ))}
              
              {isLoading && (
                <div className="flex justify-start">
                  <div className="flex space-x-3">
                    <div className="w-8 h-8 rounded-full bg-gray-700 flex items-center justify-center">
                      <Bot className="w-4 h-4" />
                    </div>
                    <div className="bg-gray-700 rounded-lg p-4">
                      <div className="flex space-x-1">
                        <div className="w-2 h-2 bg-gray-400 rounded-full animate-bounce"></div>
                        <div className="w-2 h-2 bg-gray-400 rounded-full animate-bounce" style={{ animationDelay: '0.1s' }}></div>
                        <div className="w-2 h-2 bg-gray-400 rounded-full animate-bounce" style={{ animationDelay: '0.2s' }}></div>
                      </div>
                    </div>
                  </div>
                </div>
              )}
              
              <div ref={messagesEndRef} />
            </div>

            {/* Input Area */}
            <div className="border-t border-gray-700 p-6">
              <div className="flex items-end space-x-3">
                <div className="flex-1 relative">
                  <Textarea
                    ref={textareaRef}
                    value={message}
                    onChange={(e) => {
                      setMessage(e.target.value);
                      adjustHeight();
                    }}
                    onKeyDown={handleKeyPress}
                    placeholder="Digite sua mensagem..."
                    className="bg-gray-800 border-gray-600 text-white resize-none pr-12"
                    disabled={isLoading}
                  />
                </div>
                <Button
                  onClick={sendMessage}
                  disabled={!message.trim() || isLoading}
                  className="bg-blue-600 hover:bg-blue-700 px-4 py-2"
                >
                  <Send className="w-4 h-4" />
                </Button>
              </div>
            </div>
          </>
        )}

        {activeTab !== 'chat' && (
          <div className="flex-1 flex items-center justify-center text-gray-400">
            <div className="text-center">
              <Settings className="w-16 h-16 mx-auto mb-4 opacity-50" />
              <p>Use a barra lateral para configurar seu perfil ou gerar posts.</p>
            </div>
          </div>
        )}
      </div>

      {/* Modal do Gerador de Imagens */}
      {showImageGenerator && currentPostForImage && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-gray-800 rounded-lg shadow-xl max-w-6xl w-full mx-4 max-h-[90vh] overflow-hidden">
            <div className="flex flex-col h-full">
              {/* Header do Modal */}
              <div className="flex items-center justify-between p-6 border-b border-gray-700">
                <div>
                  <h2 className="text-xl font-semibold text-white">Gerar Imagem do Post</h2>
                  <p className="text-gray-400 text-sm">{currentPostForImage.title}</p>
                </div>
                <Button
                  onClick={closeImageGenerator}
                  variant="ghost"
                  className="text-gray-400 hover:text-white"
                >
                  <X className="w-5 h-5" />
                </Button>
              </div>

              <div className="flex flex-1 overflow-hidden">
                {/* Painel de Controles */}
                <div className="w-80 p-6 bg-gray-900 border-r border-gray-700 overflow-y-auto">
                  <div className="space-y-6">
                    {/* Template */}
                    <div>
                      <label className="block text-sm font-medium text-white mb-3">Template</label>
                      <div className="flex gap-2">
                        <Button
                          onClick={() => setPostData(prev => ({ ...prev, template: 'dark' }))}
                          variant={postData.template === 'dark' ? 'default' : 'outline'}
                          size="sm"
                          className="flex-1"
                        >
                          Dark
                        </Button>
                        <Button
                          onClick={() => setPostData(prev => ({ ...prev, template: 'light' }))}
                          variant={postData.template === 'light' ? 'default' : 'outline'}
                          size="sm"
                          className="flex-1"
                        >
                          Light
                        </Button>
                      </div>
                    </div>

                    {/* Tamanho da Fonte */}
                    <div>
                      <label className="block text-sm font-medium text-white mb-3">
                        Tamanho da Fonte: {postData.fontSize}px
                      </label>
                      <input
                        type="range"
                        min="20"
                        max="60"
                        value={postData.fontSize || 34}
                        onChange={(e) => setPostData(prev => ({ ...prev, fontSize: parseInt(e.target.value) }))}
                        className="w-full"
                      />
                    </div>

                    {/* Texto */}
                    <div>
                      <label className="block text-sm font-medium text-white mb-3">Texto do Post</label>
                      <Textarea
                        value={postData.text}
                        onChange={(e) => setPostData(prev => ({ ...prev, text: e.target.value }))}
                        className="bg-gray-800 border-gray-600 text-white min-h-[120px]"
                        placeholder="Digite o texto do post..."
                      />
                    </div>

                    {/* Campos do Template Light */}
                    {postData.template === 'light' && (
                      <>
                        <div>
                          <label className="block text-sm font-medium text-white mb-3">Palavra Destacada</label>
                          <input
                            type="text"
                            value={postData.highlightWord || ''}
                            onChange={(e) => setPostData(prev => ({ ...prev, highlightWord: e.target.value }))}
                            className="w-full px-3 py-2 bg-gray-800 border border-gray-600 rounded text-white"
                            placeholder="Palavra para destacar em verde"
                          />
                        </div>
                        <div>
                          <label className="block text-sm font-medium text-white mb-3">Autor</label>
                          <input
                            type="text"
                            value={postData.author || ''}
                            onChange={(e) => setPostData(prev => ({ ...prev, author: e.target.value }))}
                            className="w-full px-3 py-2 bg-gray-800 border border-gray-600 rounded text-white"
                            placeholder="Nome do autor da citação"
                          />
                        </div>
                      </>
                    )}

                    {/* Perfil */}
                    <div>
                      <label className="block text-sm font-medium text-white mb-3">Nome do Perfil</label>
                      <input
                        type="text"
                        value={postData.profileName || ''}
                        onChange={(e) => setPostData(prev => ({ ...prev, profileName: e.target.value }))}
                        className="w-full px-3 py-2 bg-gray-800 border border-gray-600 rounded text-white"
                        placeholder="Gabriel Maia"
                      />
                    </div>

                    <div>
                      <label className="block text-sm font-medium text-white mb-3">Handle</label>
                      <input
                        type="text"
                        value={postData.profileHandle || ''}
                        onChange={(e) => setPostData(prev => ({ ...prev, profileHandle: e.target.value }))}
                        className="w-full px-3 py-2 bg-gray-800 border border-gray-600 rounded text-white"
                        placeholder="@drgabriel.maia"
                      />
                    </div>
                  </div>
                </div>

                {/* Preview e Export */}
                <div className="flex-1 flex flex-col">
                  {/* Preview */}
                  <div className="flex-1 p-6">
                    <PostPreview data={postData} onCanvasRef={setCanvasRef} />
                  </div>

                  {/* Botão de Export */}
                  <div className="p-6 border-t border-gray-700">
                    <ExportButton canvasRef={canvasRef} template={postData.template} />
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}