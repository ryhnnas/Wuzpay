import { useState, useRef, useEffect } from 'react';
import { Send, Bot, User, Upload, Sparkles, Loader2, Zap } from 'lucide-react';
import { Button } from '@/app/components/ui/button';
import { Input } from '@/app/components/ui/input';
import { Card, CardContent, CardHeader, CardTitle } from '@/app/components/ui/card';
import { ScrollArea } from '@/app/components/ui/scroll-area';
import { Avatar, AvatarFallback } from '@/app/components/ui/avatar';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/app/components/ui/tabs';
import { aiAPI } from '@/services/api';
import { toast } from 'sonner';

interface Message {
  id: string;
  role: 'user' | 'assistant';
  content: string;
  timestamp: Date;
}

export function AIAssistant() {
  const [messages, setMessages] = useState<Message[]>([
    {
      id: '1',
      role: 'assistant',
      content: 'Halo! Saya adalah WuzPay AI. Saya memiliki akses ke data penjualan, stok, dan performa tokomu. Apa yang ingin kamu analisis hari ini?',
      timestamp: new Date(),
    },
  ]);
  const [inputMessage, setInputMessage] = useState('');
  const [activeTab, setActiveTab] = useState('chat');
  const [isLoading, setIsLoading] = useState(false);
  const scrollRef = useRef<HTMLDivElement>(null);

  // Auto scroll ke pesan terbaru
  useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollIntoView({ behavior: 'smooth' });
    }
  }, [messages, isLoading]);

  const handleSendMessage = async () => {
    if (!inputMessage.trim() || isLoading) return;

    const userMessage: Message = {
      id: Date.now().toString(),
      role: 'user',
      content: inputMessage,
      timestamp: new Date(),
    };

    setMessages(prev => [...prev, userMessage]);
    const currentInput = inputMessage;
    setInputMessage('');
    setIsLoading(true);

    try {
      // Menghubungi backend Hono yang sudah terintegrasi dengan Gemini
      const response = await aiAPI.chat(currentInput, messages);
      
      const aiMessage: Message = {
        id: (Date.now() + 1).toString(),
        role: 'assistant',
        content: response,
        timestamp: new Date(),
      };
      setMessages(prev => [...prev, aiMessage]);
    } catch (error: any) {
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
          const result = await aiAPI.processReceipt(file);
          toast.success('Nota berhasil diproses!', { id: toastId });
          
          let aiResponseText = `Berhasil membaca nota!\n\n`;
          if (result.data) {
             aiResponseText += `🛒 Toko: ${result.data.store_name}\n`;
             aiResponseText += `📅 Tanggal: ${new Date(result.data.date).toLocaleString('id-ID')}\n`;
             aiResponseText += `💰 Total: Rp ${result.data.total_amount.toLocaleString('id-ID')}\n\n`;
             if (result.data.items && result.data.items.length > 0) {
               aiResponseText += `Rincian Item:\n`;
               result.data.items.forEach((item: any) => {
                 aiResponseText += `- ${item.name} (${item.qty}x) = Rp ${item.price.toLocaleString('id-ID')}\n`;
               });
             }
          }
          if (result.message) {
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
          
          setMessages(prev => [...prev, fileMessage, aiMessage]);
          setActiveTab('chat'); // pindahkan user kembali ke tab chat
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
    'Berikan saran strategi promo seblak',
  ];

  return (
    <div className="p-6 space-y-6 animate-in fade-in duration-500">
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h2 className="font-black text-3xl uppercase tracking-tighter text-orange-600 italic">
            WuzPay AI <span className="text-orange-600">Assistant</span>
          </h2>
          <p className="text-gray-400 text-[10px] font-black uppercase tracking-[0.2em]">Analisis Bisnis Real-Time via Gemini</p>
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
          <Card className="h-[calc(100vh-18rem)] rounded-[32px] border-none shadow-[0_20px_50px_rgba(0,0,0,0.05)] overflow-hidden flex flex-col">
            <CardContent className="flex-1 flex flex-col p-6 overflow-hidden">
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
                        className={`max-w-[85%] md:max-w-[70%] rounded-[24px] p-4 shadow-sm ${
                          message.role === 'user'
                            ? 'bg-orange-600 text-white rounded-tr-none'
                            : 'bg-orange-50/50 text-gray-800 rounded-tl-none border border-orange-100/50'
                        }`}
                      >
                        <p className="whitespace-pre-wrap text-sm leading-relaxed font-medium">{message.content}</p>
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
                        <span className="text-xs font-black uppercase tracking-widest text-gray-400">WuzPay sedang berpikir...</span>
                      </div>
                    </div>
                  )}
                  <div ref={scrollRef} className="h-1" />
                </div>
              </div>

              <div className="mt-4 pt-4 border-t border-gray-50">
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
                    className="bg-orange-600 hover:bg-orange-700 text-white rounded-full size-11 p-0 shadow-lg shadow-orange-100"
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