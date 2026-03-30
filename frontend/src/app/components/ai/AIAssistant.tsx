import { useState } from 'react';
import { Send, Bot, User, Upload, Sparkles } from 'lucide-react';
import { Button } from '@/app/components/ui/button';
import { Input } from '@/app/components/ui/input';
import { Card, CardContent, CardHeader, CardTitle } from '@/app/components/ui/card';
import { ScrollArea } from '@/app/components/ui/scroll-area';
import { Avatar, AvatarFallback } from '@/app/components/ui/avatar';
import { Badge } from '@/app/components/ui/badge';
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
      content: 'Halo! Saya adalah AI Assistant untuk membantu Anda mengelola bisnis. Anda dapat bertanya tentang analisis penjualan, rekomendasi produk, atau insight bisnis lainnya.',
      timestamp: new Date(),
    },
  ]);
  const [inputMessage, setInputMessage] = useState('');
  const [isLoading, setIsLoading] = useState(false);

  const handleSendMessage = async () => {
    if (!inputMessage.trim()) return;

    const userMessage: Message = {
      id: Date.now().toString(),
      role: 'user',
      content: inputMessage,
      timestamp: new Date(),
    };

    setMessages([...messages, userMessage]);
    setInputMessage('');
    setIsLoading(true);

    try {
      const response = await aiAPI.chat(inputMessage, messages);
      const aiMessage: Message = {
        id: (Date.now() + 1).toString(),
        role: 'assistant',
        content: response,
        timestamp: new Date(),
      };
      setMessages(prev => [...prev, aiMessage]);
    } catch (error) {
      toast.error('Gagal menghubungi AI. Pastikan API key sudah dikonfigurasi.');
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
        try {
          const result = await aiAPI.processReceipt(file);
          toast.success('Nota berhasil diproses!');
          console.log('Receipt data:', result);
        } catch (error) {
          toast.error('Gagal memproses nota');
        } finally {
          setIsLoading(false);
        }
      }
    };
    input.click();
  };

  const quickQuestions = [
    'Berapa total penjualan hari ini?',
    'Produk apa yang paling laris?',
    'Kapan jam ramai transaksi?',
    'Berikan tips meningkatkan penjualan',
  ];

  return (
    <div className="p-6">
      <Tabs defaultValue="chat" className="space-y-6">
        <div className="flex items-center justify-between">
          <div>
            <h2 className="font-bold text-2xl">AI Assistant</h2>
            <p className="text-gray-500 text-sm">Asisten pintar berbasis AI untuk bisnis Anda</p>
          </div>
          <TabsList>
            <TabsTrigger value="chat">Chat Assistant</TabsTrigger>
            <TabsTrigger value="receipt">Proses Nota</TabsTrigger>
          </TabsList>
        </div>

        <TabsContent value="chat" className="space-y-4">
          <Card className="h-[calc(100vh-16rem)]">
            <CardContent className="flex h-full flex-col p-6">
              {/* Messages */}
              <ScrollArea className="mb-4 flex-1 pr-4">
                <div className="space-y-4">
                  {messages.map(message => (
                    <div
                      key={message.id}
                      className={`flex gap-3 ${message.role === 'user' ? 'justify-end' : ''}`}
                    >
                      {message.role === 'assistant' && (
                        <Avatar className="bg-blue-600">
                          <AvatarFallback>
                            <Bot className="size-5 text-white" />
                          </AvatarFallback>
                        </Avatar>
                      )}
                      <div
                        className={`max-w-[80%] rounded-lg p-4 ${
                          message.role === 'user'
                            ? 'bg-blue-600 text-white'
                            : 'bg-gray-100 text-gray-900'
                        }`}
                      >
                        <p className="whitespace-pre-wrap text-sm">{message.content}</p>
                        <p
                          className={`mt-2 text-xs ${
                            message.role === 'user' ? 'text-blue-100' : 'text-gray-500'
                          }`}
                        >
                          {message.timestamp.toLocaleTimeString('id-ID', {
                            hour: '2-digit',
                            minute: '2-digit',
                          })}
                        </p>
                      </div>
                      {message.role === 'user' && (
                        <Avatar className="bg-gray-700">
                          <AvatarFallback>
                            <User className="size-5 text-white" />
                          </AvatarFallback>
                        </Avatar>
                      )}
                    </div>
                  ))}
                  {isLoading && (
                    <div className="flex gap-3">
                      <Avatar className="bg-blue-600">
                        <AvatarFallback>
                          <Bot className="size-5 text-white" />
                        </AvatarFallback>
                      </Avatar>
                      <div className="max-w-[80%] rounded-lg bg-gray-100 p-4">
                        <div className="flex gap-1">
                          <div className="size-2 animate-bounce rounded-full bg-gray-400"></div>
                          <div className="size-2 animate-bounce rounded-full bg-gray-400" style={{ animationDelay: '0.2s' }}></div>
                          <div className="size-2 animate-bounce rounded-full bg-gray-400" style={{ animationDelay: '0.4s' }}></div>
                        </div>
                      </div>
                    </div>
                  )}
                </div>
              </ScrollArea>

              {/* Quick Questions */}
              <div className="mb-4 flex flex-wrap gap-2">
                {quickQuestions.map((q, i) => (
                  <Button
                    key={i}
                    variant="outline"
                    size="sm"
                    onClick={() => setInputMessage(q)}
                    disabled={isLoading}
                  >
                    {q}
                  </Button>
                ))}
              </div>

              {/* Input */}
              <div className="flex gap-2">
                <Input
                  placeholder="Ketik pertanyaan Anda..."
                  value={inputMessage}
                  onChange={(e) => setInputMessage(e.target.value)}
                  onKeyPress={(e) => e.key === 'Enter' && handleSendMessage()}
                  disabled={isLoading}
                />
                <Button onClick={handleSendMessage} disabled={isLoading}>
                  <Send className="size-4" />
                </Button>
              </div>

              <p className="mt-2 text-center text-xs text-gray-500">
                Powered by Gemini AI / OpenAI • Konfigurasi API key di backend
              </p>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="receipt" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Sparkles className="size-5 text-yellow-500" />
                Auto Input Pembelian & Pengeluaran
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <p className="text-gray-600 text-sm">
                Upload foto nota pembelian atau pengeluaran, AI akan otomatis membaca dan menginput data ke sistem.
              </p>

              <div className="flex flex-col items-center justify-center rounded-lg border-2 border-dashed border-gray-300 p-12 text-center">
                <Upload className="mb-4 size-16 text-gray-400" />
                <h3 className="mb-2 font-semibold">Upload Foto Nota</h3>
                <p className="mb-4 text-gray-500 text-sm">
                  Format: JPG, PNG (max 5MB)
                </p>
                <Button onClick={handleReceiptUpload} disabled={isLoading}>
                  <Upload className="mr-2 size-4" />
                  Pilih File
                </Button>
              </div>

              <div className="rounded-lg bg-blue-50 p-4">
                <h4 className="mb-2 font-semibold text-sm">Fitur Auto Input:</h4>
                <ul className="space-y-1 text-sm text-gray-700">
                  <li>✓ Deteksi nama barang & jumlah</li>
                  <li>✓ Ekstrak harga & total</li>
                  <li>✓ Identifikasi supplier/toko</li>
                  <li>✓ Otomatis input ke database</li>
                </ul>
              </div>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}
