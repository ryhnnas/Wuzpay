import React, { useState, useRef, useEffect } from 'react';
import { Send, Bot, User, Upload, Sparkles, Loader2, Zap, MessageSquare, Plus, Trash2 } from 'lucide-react';
import { Button } from '@/app/components/ui/button';
import { Input } from '@/app/components/ui/input';
import { Card, CardContent, CardHeader, CardTitle } from '@/app/components/ui/card';
import { Avatar, AvatarFallback } from '@/app/components/ui/avatar';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/app/components/ui/tabs';
import { aiAPI } from '@/services/api';
import { toast } from 'sonner';
import { cn } from '@/app/components/ui/utils';
import { AIChart, ChartConfig } from './AIChart';

interface Message {
  id: string;
  role: 'user' | 'assistant';
  content: string;
  timestamp: Date;
  charts?: ChartConfig[];
}

interface ChatSession {
  id: string;
  title: string;
  messages: Message[];
  updatedAt: Date;
}

const DEFAULT_GREETING: Message = {
  id: '1',
  role: 'assistant',
  content: 'Halo! Saya adalah WuzPay AI. Saya memiliki akses ke data penjualan, stok, dan performa tokomu. Apa yang ingin kamu analisis hari ini?',
  timestamp: new Date(),
};

const STAGE_LABELS: Record<string, string> = {
  analyzing: 'Menganalisis pertanyaan...',
  fetching_data: 'Mengambil data bisnis...',
  composing_answer: 'Menyusun jawaban...',
};

function renderInlineMarkdown(text: string) {
  const pieces = text.split(/(\*\*.*?\*\*)/g);
  return pieces.map((piece, idx) => {
    if (piece.startsWith('**') && piece.endsWith('**') && piece.length >= 4) {
      return <strong key={idx} className="font-bold text-gray-900">{piece.slice(2, -2)}</strong>;
    }
    return <React.Fragment key={idx}>{piece}</React.Fragment>;
  });
}

function renderAssistantContent(content: string) {
  const lines = content.split('\n').filter((line, idx, arr) => !(line.trim() === '' && arr[idx - 1]?.trim() === ''));
  const nodes: React.ReactNode[] = [];
  let listItems: string[] = [];

  const flushList = () => {
    if (listItems.length === 0) return;
    nodes.push(
      <ul key={`list-${nodes.length}`} className="list-disc pl-5 my-1 space-y-1">
        {listItems.map((item, idx) => <li key={idx}>{renderInlineMarkdown(item)}</li>)}
      </ul>
    );
    listItems = [];
  };

  lines.forEach((line, idx) => {
    const trimmed = line.trim();
    if (trimmed.startsWith('- ') || trimmed.startsWith('* ') || /^\d+\.\s/.test(trimmed)) {
      listItems.push(trimmed.replace(/^(-|\*|\d+\.)\s/, ''));
      return;
    }

    flushList();
    if (trimmed.includes('|') && trimmed.split('|').length > 2) {
      nodes.push(
        <pre key={`table-${idx}`} className="text-xs bg-white/70 rounded-xl p-2 overflow-x-auto">{trimmed}</pre>
      );
      return;
    }

    nodes.push(
      <p key={`p-${idx}`} className="my-1">
        {renderInlineMarkdown(line)}
      </p>
    );
  });

  flushList();
  return nodes;
}

export function AIAssistant() {
  const [sessions, setSessions] = useState<ChatSession[]>(() => {
    try {
      const raw = localStorage.getItem('wuzpay_ai_chat_sessions_v1');
      if (!raw) return [{
        id: 'session-default',
        title: 'Obrolan Utama',
        messages: [DEFAULT_GREETING],
        updatedAt: new Date(),
      }];
      const parsed = JSON.parse(raw);
      if (!Array.isArray(parsed) || parsed.length === 0) return [{
        id: 'session-default',
        title: 'Obrolan Utama',
        messages: [DEFAULT_GREETING],
        updatedAt: new Date(),
      }];
      return parsed.map((s: any) => ({
        ...s,
        updatedAt: s.updatedAt ? new Date(s.updatedAt) : new Date(),
        messages: s.messages.map((m: any) => ({
          ...m,
          timestamp: m.timestamp ? new Date(m.timestamp) : new Date(),
        }))
      }));
    } catch {
      return [{
        id: 'session-default',
        title: 'Obrolan Utama',
        messages: [DEFAULT_GREETING],
        updatedAt: new Date(),
      }];
    }
  });

  const [activeSessionId, setActiveSessionId] = useState<string>(() => {
    return localStorage.getItem('wuzpay_ai_active_session_id_v1') || 'session-default';
  });

  const [inputMessage, setInputMessage] = useState('');
  const [activeTab, setActiveTab] = useState('chat');
  const [isLoading, setIsLoading] = useState(false);
  const [loadingStage, setLoadingStage] = useState('analyzing');
  const [suggestedQuestions, setSuggestedQuestions] = useState<string[]>([]);
  const scrollRef = useRef<HTMLDivElement>(null);

  const activeSession = sessions.find(s => s.id === activeSessionId) || sessions[0];
  const messages = activeSession?.messages || [DEFAULT_GREETING];

  // Auto scroll ke pesan terbaru
  useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollIntoView({ behavior: 'smooth' });
    }
  }, [messages, isLoading]);

  useEffect(() => {
    localStorage.setItem('wuzpay_ai_chat_sessions_v1', JSON.stringify(sessions));
  }, [sessions]);

  useEffect(() => {
    localStorage.setItem('wuzpay_ai_active_session_id_v1', activeSessionId);
  }, [activeSessionId]);

  const handleCreateNewSession = () => {
    const newSessionId = `session-${Date.now()}`;
    const newSession: ChatSession = {
      id: newSessionId,
      title: 'Obrolan Baru',
      messages: [DEFAULT_GREETING],
      updatedAt: new Date(),
    };
    setSessions(prev => [newSession, ...prev]);
    setActiveSessionId(newSessionId);
    toast.success('Sesi chat baru dibuat');
  };

  const handleDeleteSession = (sessionId: string, e: React.MouseEvent) => {
    e.stopPropagation();
    if (sessions.length <= 1) {
      toast.error('Wajib menyisakan minimal satu sesi chat.');
      return;
    }
    const updatedSessions = sessions.filter(s => s.id !== sessionId);
    setSessions(updatedSessions);
    if (activeSessionId === sessionId) {
      setActiveSessionId(updatedSessions[0].id);
    }
    toast.info('Sesi chat dihapus');
  };

  const handleSendMessage = async () => {
    if (!inputMessage.trim() || isLoading) return;

    const now = Date.now();
    const userMessage: Message = {
      id: now.toString(),
      role: 'user',
      content: inputMessage,
      timestamp: new Date(),
    };
    const assistantMessageId = (now + 1).toString();
    const placeholderAssistant: Message = {
      id: assistantMessageId,
      role: 'assistant',
      content: '',
      timestamp: new Date(),
    };

    const historySnapshot = [...messages];
    
    // Simpan pesan di state sessions
    setSessions(prev => prev.map(s => {
      if (s.id === activeSessionId) {
        const nextMessages = [...s.messages, userMessage, placeholderAssistant];
        let nextTitle = s.title;
        if (s.title === 'Obrolan Utama' || s.title === 'Obrolan Baru') {
          nextTitle = inputMessage.substring(0, 20) + (inputMessage.length > 20 ? '...' : '');
        }
        return {
          ...s,
          title: nextTitle,
          messages: nextMessages,
          updatedAt: new Date(),
        };
      }
      return s;
    }));

    const currentInput = inputMessage;
    setInputMessage('');
    setIsLoading(true);
    setLoadingStage('analyzing');
    setSuggestedQuestions([]);

    try {
      await aiAPI.streamChat(currentInput, historySnapshot, {
        onStage: (stage) => setLoadingStage(stage || 'analyzing'),
        onChunk: (chunk) => {
          if (!chunk) return;
          setSessions(prev => prev.map(s => {
            if (s.id === activeSessionId) {
              return {
                ...s,
                messages: s.messages.map(msg => (
                  msg.id === assistantMessageId
                    ? { ...msg, content: `${msg.content}${chunk}` }
                    : msg
                ))
              };
            }
            return s;
          }));
        },
        onDone: ({ response, suggested_questions, charts }) => {
          if (response) {
            setSessions(prev => prev.map(s => {
              if (s.id === activeSessionId) {
                return {
                  ...s,
                  messages: s.messages.map(msg => (
                    msg.id === assistantMessageId
                      ? { ...msg, content: response, charts }
                      : msg
                  ))
                };
              }
              return s;
            }));
          }
          setSuggestedQuestions(Array.isArray(suggested_questions) ? suggested_questions.slice(0, 3) : []);
        },
        onError: (message) => {
          throw new Error(message);
        }
      });
    } catch (error: any) {
      try {
        const fallback = await aiAPI.chat(currentInput, historySnapshot);
        setSessions(prev => prev.map(s => {
          if (s.id === activeSessionId) {
            return {
              ...s,
              messages: s.messages.map(msg => (
                msg.id === assistantMessageId
                  ? { ...msg, content: fallback || 'WuzPay AI sedang sibuk. Coba lagi nanti.' }
                  : msg
              ))
            };
          }
          return s;
        }));
      } catch {
        setSessions(prev => prev.map(s => {
          if (s.id === activeSessionId) {
            return {
              ...s,
              messages: s.messages.map(msg => (
                msg.id === assistantMessageId
                  ? { ...msg, content: 'WuzPay AI sedang sibuk. Coba lagi nanti.' }
                  : msg
              ))
            };
          }
          return s;
        }));
      }
      toast.error(error.message || 'WuzPay AI sedang sibuk. Coba lagi nanti.');
    } finally {
      setIsLoading(false);
    }
  };

  const handleReceiptUpload = () => {
    const input = document.createElement('input');
    input.type = 'file';
    input.accept = 'image/*';
    input.onchange = async (e: any) => {
      const file = e.target.files[0];
      if (file) {
        setIsLoading(true);
        const toastId = toast.loading('WuzPay AI sedang membaca nota...');
        try {
          let result = await aiAPI.scanReceiptOCR(file);
          
          if (result?.task_id) {
            // Polling untuk OCR Worker
            let status = 'pending';
            while (status === 'pending' || status === 'processing') {
              await new Promise(resolve => setTimeout(resolve, 2000));
              const statusRes = await aiAPI.getOcrStatus(result.task_id);
              status = statusRes.status;
              if (status === 'completed') {
                result = statusRes.result;
              } else if (status === 'failed') {
                throw new Error(statusRes.error_message || 'Gagal memproses OCR di worker');
              }
            }
          }

          toast.success('Nota berhasil diproses!', { id: toastId });
          
          let aiResponseText = `Berhasil membaca nota!\n\n`;
          const data = result?.data || result;
          if (data) {
             aiResponseText += `📅 Tanggal: ${data.tanggal || '-'}\n`;
             aiResponseText += `💰 Total: Rp ${(Number(data.total_belanja || 0)).toLocaleString('id-ID')}\n\n`;
             if (Array.isArray(data.items) && data.items.length > 0) {
               aiResponseText += `Rincian Item:\n`;
               data.items.forEach((item: any) => {
                 const qty = Number(item.kuantitas || 0);
                 const price = Number(item.harga_per_barang || 0);
                 aiResponseText += `- ${item.nama_barang || 'Tanpa Nama'} (${qty}x) = Rp ${price.toLocaleString('id-ID')}\n`;
               });
             } else {
               aiResponseText += `Belum ada item yang terbaca dari nota.`;
             }
          }
          if (result?.message) {
            aiResponseText += `\n*${result.message}*`;
          }

          const fileMessage: Message = {
            id: Date.now().toString(),
            role: 'user',
            content: `[Mengunggah & scan gambar nota: ${file.name}]`,
            timestamp: new Date(),
          };
          const aiMessage: Message = {
            id: (Date.now() + 1).toString(),
            role: 'assistant',
            content: aiResponseText,
            timestamp: new Date(),
          };
          
          setSessions(prev => prev.map(s => {
            if (s.id === activeSessionId) {
              return {
                ...s,
                messages: [...s.messages, fileMessage, aiMessage],
                updatedAt: new Date(),
              };
            }
            return s;
          }));
          setActiveTab('chat');
        } catch (error) {
          toast.error('Gagal memproses nota', { id: toastId });
        } finally {
          setIsLoading(false);
        }
      }
    };
    input.click();
  };

  const quickQuestions = [
    'Bagaimana performa penjualan hari ini?',
    'Sebutkan produk paling laris bulan ini',
    'Produk apa yang stoknya hampir habis?',
    'Berikan saran strategi promo menu baru',
  ];

  return (
    <div className="p-6 space-y-6 animate-in fade-in duration-500">
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h2 className="font-black text-3xl uppercase tracking-tighter text-orange-600 italic">
            WuzPay AI <span className="text-orange-600">Assistant</span>
          </h2>
          <p className="text-gray-400 text-[10px] font-black uppercase tracking-[0.2em]">Analisis Bisnis Real-Time by WuzPay AI</p>
        </div>
        
        <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
          <TabsList className="bg-gray-100 p-1 rounded-2xl w-full md:w-auto ml-auto">
            <TabsTrigger value="chat" className="flex-1 md:flex-none text-[10px] font-black uppercase tracking-widest px-6 h-10 data-[state=active]:bg-orange-600 data-[state=active]:text-white rounded-xl transition-all">
              Diskusi Data
            </TabsTrigger>
            <TabsTrigger value="receipt" className="flex-1 md:flex-none text-[10px] font-black uppercase tracking-widest px-6 h-10 data-[state=active]:bg-orange-600 data-[state=active]:text-white rounded-xl transition-all">
              Scan Nota
            </TabsTrigger>
          </TabsList>
        </Tabs>
      </div>

      <Tabs value={activeTab} onValueChange={setActiveTab}>
        <TabsContent value="chat" className="mt-0 space-y-4">
          <Card className="h-[calc(100vh-18rem)] rounded-[32px] border-none shadow-[0_20px_50px_rgba(0,0,0,0.05)] overflow-hidden flex flex-row">
            
            {/* SISI KIRI: SIDEBAR CHAT SESSIONS */}
            <div className="w-64 bg-gray-50/50 border-r border-gray-100 p-4 flex flex-col justify-between hidden md:flex shrink-0">
              <div className="space-y-4 flex-1 flex flex-col overflow-hidden">
                <Button 
                  onClick={handleCreateNewSession}
                  className="w-full bg-orange-50 border border-orange-200 text-orange-600 hover:bg-orange-100 rounded-xl font-black text-xs uppercase py-3 flex items-center justify-center gap-2"
                >
                  <Plus className="size-4" /> Obrolan Baru
                </Button>
                
                <div className="flex-1 overflow-y-auto space-y-2 pr-1 custom-scrollbar">
                  <p className="text-[9px] font-black text-gray-400 uppercase tracking-widest px-2 mb-2">Riwayat Percakapan</p>
                  {sessions.map(s => (
                    <div
                      key={s.id}
                      onClick={() => setActiveSessionId(s.id)}
                      className={cn(
                        "group w-full p-3 rounded-xl text-left transition-all flex items-center justify-between cursor-pointer border border-transparent",
                        s.id === activeSessionId
                          ? "bg-orange-50/80 border-orange-100 text-orange-600 font-bold"
                          : "hover:bg-gray-100/50 text-gray-600"
                      )}
                    >
                      <div className="flex items-center gap-2 min-w-0">
                        <MessageSquare className={cn("size-4 shrink-0", s.id === activeSessionId ? "text-orange-600" : "text-gray-400")} />
                        <span className="text-xs truncate pr-2">{s.title}</span>
                      </div>
                      <button
                        onClick={(e) => handleDeleteSession(s.id, e)}
                        className="opacity-0 group-hover:opacity-100 hover:text-red-600 p-0.5 rounded transition-all shrink-0"
                      >
                        <Trash2 className="size-3.5" />
                      </button>
                    </div>
                  ))}
                </div>
              </div>
            </div>

            {/* SISI KANAN: CHAT CONTENT */}
            <CardContent className="flex-1 flex flex-col p-6 overflow-hidden bg-white">
              <div className="flex-1 overflow-y-auto pr-2" style={{ scrollBehavior: 'smooth' }}>
                <div className="space-y-6 pb-2">
                  {messages.map(message => (
                    <div
                      key={message.id}
                      className={`flex gap-3 ${message.role === 'user' ? 'justify-end' : ''}`}
                    >
                      {message.role === 'assistant' && (
                        <Avatar className="bg-orange-600 size-10 shadow-lg shadow-orange-100 shrink-0">
                          <AvatarFallback><Bot className="size-5 text-white" /></AvatarFallback>
                        </Avatar>
                      )}
                      <div
                        className={`max-w-[85%] md:max-w-[70%] ${message.charts && message.charts.length > 0 ? 'w-full' : ''} rounded-[24px] p-4 shadow-sm ${
                          message.role === 'user'
                            ? 'bg-orange-600 text-white rounded-tr-none'
                            : 'bg-orange-50/50 text-gray-800 rounded-tl-none border border-orange-100/50'
                        }`}
                      >
                        {message.role === 'assistant' ? (
                          <div>
                            <div className="whitespace-pre-wrap text-sm leading-relaxed font-medium">
                              {renderAssistantContent(message.content)}
                            </div>
                            {message.charts && message.charts.map(chart => (
                              <AIChart key={chart.id} config={chart} />
                            ))}
                          </div>
                        ) : (
                          <p className="whitespace-pre-wrap text-sm leading-relaxed font-medium">{message.content}</p>
                        )}
                        <p className={`mt-2 text-[9px] font-black uppercase tracking-widest opacity-50`}>
                          {message.timestamp.toLocaleTimeString('id-ID', { hour: '2-digit', minute: '2-digit' })}
                        </p>
                      </div>
                      {message.role === 'user' && (
                        <Avatar className="bg-orange-100 size-10 shrink-0">
                          <AvatarFallback><User className="size-5 text-orange-600" /></AvatarFallback>
                        </Avatar>
                      )}
                    </div>
                  ))}
                  {isLoading && (
                    <div className="flex gap-3">
                      <Avatar className="bg-orange-600 size-10 animate-bounce shrink-0">
                        <AvatarFallback><Zap className="size-5 text-white" /></AvatarFallback>
                      </Avatar>
                      <div className="rounded-[24px] bg-gray-50 p-4 flex items-center gap-2">
                        <Loader2 className="size-4 animate-spin text-orange-600" />
                        <span className="text-xs font-black uppercase tracking-widest text-gray-400">
                          {STAGE_LABELS[loadingStage] || 'WuzPay AI sedang berpikir...'}
                        </span>
                      </div>
                    </div>
                  )}
                  <div ref={scrollRef} className="h-1" />
                </div>
              </div>

              <div className="mt-4 pt-4 border-t border-gray-50 bg-white">
                {/* Quick Questions */}
                <div className="mb-4 flex flex-wrap gap-2">
                  {quickQuestions.map((q, i) => (
                    <Button
                      key={i}
                      variant="outline"
                      className="rounded-xl border-gray-100 text-[10px] font-black uppercase tracking-widest hover:bg-orange-50 hover:text-orange-600 hover:border-orange-200 transition-all py-1 h-8"
                      onClick={() => setInputMessage(q)}
                      disabled={isLoading}
                    >
                      {q}
                    </Button>
                  ))}
                </div>

                {suggestedQuestions.length > 0 && (
                  <div className="mb-4 flex flex-wrap gap-2">
                    {suggestedQuestions.map((q, i) => (
                      <Button
                        key={`${q}-${i}`}
                        variant="outline"
                        className="rounded-xl border-orange-100 text-[10px] font-black uppercase tracking-widest hover:bg-orange-50 hover:text-orange-600 hover:border-orange-200 transition-all py-1 h-8"
                        onClick={() => setInputMessage(q)}
                        disabled={isLoading}
                      >
                        {q}
                      </Button>
                    ))}
                  </div>
                )}

                {/* Input Area */}
                <div className="flex gap-2 bg-gray-50 p-2 rounded-[24px] border border-gray-100 focus-within:ring-2 focus-within:ring-orange-500 transition-all">
                  <Input
                    placeholder="Tanya analisis tokomu..."
                    className="bg-transparent border-none shadow-none focus-visible:ring-0 font-bold text-gray-700"
                    value={inputMessage}
                    onChange={(e) => setInputMessage(e.target.value)}
                    onKeyPress={(e) => e.key === 'Enter' && handleSendMessage()}
                    disabled={isLoading}
                  />
                  <Button 
                    onClick={handleSendMessage} 
                    disabled={isLoading}
                    className="bg-orange-600 hover:bg-orange-700 text-white rounded-full size-11 p-0 shadow-lg shadow-orange-100 shrink-0"
                  >
                    <Send className="size-4" />
                  </Button>
                </div>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="receipt" className="space-y-4">
          <Card className="rounded-[40px] border-none shadow-xl overflow-hidden">
            <CardHeader className="bg-orange-600 p-8">
              <CardTitle className="flex items-center gap-3 text-white uppercase font-black tracking-tighter text-2xl">
                <Sparkles className="size-6 text-yellow-300 animate-pulse" />
                Auto-Scan Nota Pengeluaran
              </CardTitle>
            </CardHeader>
            <CardContent className="p-12 space-y-8">
              <div className="flex flex-col items-center justify-center rounded-[32px] border-4 border-dashed border-gray-100 p-16 text-center hover:bg-gray-50/50 transition-all cursor-pointer group" onClick={handleReceiptUpload}>
                <div className="bg-orange-50 p-8 rounded-full mb-6 group-hover:scale-110 transition-all duration-500">
                   <Upload className="size-16 text-orange-600" />
                </div>
                <h3 className="mb-2 font-black text-xl uppercase tracking-tighter">Upload Bukti Nota</h3>
                <p className="mb-8 text-gray-400 font-bold text-[10px] uppercase tracking-[0.2em]">Format: JPG, PNG • Max 5MB</p>
                <Button className="bg-orange-600 text-white rounded-2xl font-black px-12 h-14 hover:bg-orange-600 transition-all shadow-xl shadow-gray-200">
                  PILIH FILE NOTA
                </Button>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                 <div className="p-6 rounded-[24px] bg-orange-50/50 border border-orange-100">
                    <h4 className="font-black text-[10px] uppercase tracking-widest text-orange-600 mb-2">Kenapa Scan Nota?</h4>
                    <p className="text-sm text-gray-600 leading-relaxed font-medium">AI WuzPay akan otomatis membaca nama barang, harga, dan total belanja untuk dicatat sebagai pengeluaran toko tanpa perlu ketik manual.</p>
                 </div>
                 <div className="p-6 rounded-[24px] bg-gray-50 border border-gray-100">
                    <h4 className="font-black text-[10px] uppercase tracking-widest text-gray-400 mb-2">Tips</h4>
                    <p className="text-sm text-gray-600 leading-relaxed font-medium">Pastikan foto nota tegak lurus, tidak blur, dan pencahayaan cukup agar pembacaan AI akurat 100%.</p>
                 </div>
              </div>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}