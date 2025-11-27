'use client';

import { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { QrCode, Wifi, WifiOff, Users, RefreshCw, Eye, EyeOff } from 'lucide-react';
import { whatsappCoreAPI, type WhatsAppStatus } from '@/lib/whatsapp-core-api';
import Link from 'next/link';

interface UserConnection {
  userId: string;
  status: WhatsAppStatus | null;
  loading: boolean;
}

export default function WhatsAppAdminPage() {
  const [connections, setConnections] = useState<UserConnection[]>([]);
  const [newUserId, setNewUserId] = useState('');
  const [isRegistering, setIsRegistering] = useState(false);
  const [message, setMessage] = useState<{ type: 'success' | 'error'; text: string } | null>(null);
  const [showQR, setShowQR] = useState<{ [key: string]: boolean }>({});
  const [qrCodes, setQrCodes] = useState<{ [key: string]: string }>({});

  const predefinedUsers = [
    'default',
    'admin@admin.com',
    'kellybsantoss@icloud.com'
  ];

  const loadUserStatus = async (userId: string): Promise<WhatsAppStatus | null> => {
    try {
      const response = await whatsappCoreAPI.getStatus(userId);
      return response.success ? response.data || null : null;
    } catch (error) {
      console.error(`Erro ao carregar status do usuário ${userId}:`, error);
      return null;
    }
  };

  const loadAllConnections = async () => {
    const updatedConnections = await Promise.all(
      predefinedUsers.map(async (userId) => {
        const status = await loadUserStatus(userId);
        return { userId, status, loading: false };
      })
    );
    setConnections(updatedConnections);
  };

  const registerUser = async (userId: string) => {
    setIsRegistering(true);
    try {
      const response = await whatsappCoreAPI.registerUser(userId);
      if (response.success) {
        setMessage({ type: 'success', text: `Usuário ${userId} registrado com sucesso!` });
        await loadAllConnections();
      } else {
        setMessage({ type: 'error', text: response.error || 'Erro ao registrar usuário' });
      }
    } catch (error) {
      setMessage({ type: 'error', text: 'Erro de conexão' });
    } finally {
      setIsRegistering(false);
    }
  };

  const toggleQRCode = async (userId: string) => {
    const isVisible = showQR[userId];

    if (!isVisible) {
      // Mostrar QR - buscar da API
      try {
        const response = await whatsappCoreAPI.getQRCode(userId);
        if (response.success && response.data) {
          setQrCodes(prev => ({ ...prev, [userId]: response.data!.qrImage }));
        }
      } catch (error) {
        setMessage({ type: 'error', text: 'Erro ao carregar QR Code' });
        return;
      }
    }

    setShowQR(prev => ({ ...prev, [userId]: !isVisible }));
  };

  const addCustomUser = () => {
    if (!newUserId.trim()) return;

    const userExists = connections.find(conn => conn.userId === newUserId);
    if (userExists) {
      setMessage({ type: 'error', text: 'Usuário já está na lista' });
      return;
    }

    setConnections(prev => [...prev, { userId: newUserId, status: null, loading: true }]);
    loadUserStatus(newUserId).then(status => {
      setConnections(prev =>
        prev.map(conn =>
          conn.userId === newUserId ? { ...conn, status, loading: false } : conn
        )
      );
    });
    setNewUserId('');
  };

  const getStatusColor = (status: WhatsAppStatus | null) => {
    if (!status) return 'bg-gray-500';
    if (status.isReady) return 'bg-green-500';
    if (status.isConnecting) return 'bg-yellow-500';
    if (status.hasQR) return 'bg-blue-500';
    return 'bg-red-500';
  };

  const getStatusText = (status: WhatsAppStatus | null) => {
    if (!status) return 'Não registrado';
    if (status.isReady) return 'Conectado';
    if (status.isConnecting) return 'Conectando...';
    if (status.hasQR) return 'QR Disponível';
    return 'Desconectado';
  };

  useEffect(() => {
    loadAllConnections();

    // Auto-refresh a cada 10 segundos
    const interval = setInterval(loadAllConnections, 10000);
    return () => clearInterval(interval);
  }, []);

  // Limpar mensagem após 5 segundos
  useEffect(() => {
    if (message) {
      const timer = setTimeout(() => setMessage(null), 5000);
      return () => clearTimeout(timer);
    }
  }, [message]);

  return (
    <div className="container mx-auto py-8 space-y-6">
      <div className="text-center mb-8">
        <h1 className="text-3xl font-bold mb-2">Gerenciador WhatsApp</h1>
        <p className="text-gray-600">
          Gerencie conexões WhatsApp de todos os usuários
        </p>
      </div>

      {message && (
        <div className={`p-4 rounded-lg border ${message.type === 'success' ? 'bg-green-50 border-green-500 text-green-700' : 'bg-red-50 border-red-500 text-red-700'}`}>
          {message.text}
        </div>
      )}

      {/* Adicionar usuário customizado */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Users className="h-5 w-5" />
            Adicionar Usuário
          </CardTitle>
        </CardHeader>
        <CardContent className="flex gap-2">
          <div className="flex-1">
            <Label htmlFor="userId">Email do usuário</Label>
            <Input
              id="userId"
              placeholder="usuario@exemplo.com"
              value={newUserId}
              onChange={(e) => setNewUserId(e.target.value)}
              onKeyDown={(e) => e.key === 'Enter' && addCustomUser()}
            />
          </div>
          <Button onClick={addCustomUser} className="mt-6">
            Adicionar
          </Button>
        </CardContent>
      </Card>

      {/* Lista de conexões */}
      <div className="grid gap-4">
        <div className="flex items-center justify-between">
          <h2 className="text-xl font-semibold">Conexões Ativas</h2>
          <Button onClick={loadAllConnections} size="sm" variant="outline">
            <RefreshCw className="h-4 w-4 mr-2" />
            Atualizar
          </Button>
        </div>

        {connections.map((connection) => (
          <Card key={connection.userId} className="relative">
            <CardHeader>
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <div className={`w-3 h-3 rounded-full ${getStatusColor(connection.status)}`} />
                  <div>
                    <CardTitle className="text-lg">{connection.userId}</CardTitle>
                    <p className="text-sm text-gray-600">
                      {getStatusText(connection.status)}
                    </p>
                  </div>
                </div>

                <div className="flex items-center gap-2">
                  {connection.status && (
                    <div className="flex gap-4 text-sm text-gray-600">
                      <span>{connection.status.contactsCount} contatos</span>
                      <span>{connection.status.messagesCount} mensagens</span>
                    </div>
                  )}

                  <Badge variant={connection.status?.isReady ? 'default' : 'secondary'}>
                    {connection.status?.isReady ? 'Online' : 'Offline'}
                  </Badge>
                </div>
              </div>
            </CardHeader>

            <CardContent className="space-y-3">
              <div className="flex gap-2">
                {!connection.status && (
                  <Button
                    onClick={() => registerUser(connection.userId)}
                    disabled={isRegistering}
                    size="sm"
                  >
                    {isRegistering ? 'Registrando...' : 'Registrar'}
                  </Button>
                )}

                {connection.status && !connection.status.isReady && (
                  <>
                    <Link href={`/whatsapp/connect?userId=${connection.userId}`}>
                      <Button size="sm" variant="outline">
                        <QrCode className="h-4 w-4 mr-2" />
                        Conectar
                      </Button>
                    </Link>

                    {connection.status.hasQR && (
                      <Button
                        onClick={() => toggleQRCode(connection.userId)}
                        size="sm"
                        variant="outline"
                      >
                        {showQR[connection.userId] ? (
                          <><EyeOff className="h-4 w-4 mr-2" />Ocultar QR</>
                        ) : (
                          <><Eye className="h-4 w-4 mr-2" />Ver QR</>
                        )}
                      </Button>
                    )}
                  </>
                )}

                {connection.status?.isReady && (
                  <Link href="/whatsapp">
                    <Button size="sm">
                      <Wifi className="h-4 w-4 mr-2" />
                      Abrir Chat
                    </Button>
                  </Link>
                )}
              </div>

              {/* QR Code */}
              {showQR[connection.userId] && qrCodes[connection.userId] && (
                <div className="flex justify-center">
                  <div className="bg-white p-4 rounded-lg shadow-md border">
                    <img
                      src={qrCodes[connection.userId]}
                      alt="QR Code"
                      className="w-48 h-48"
                    />
                    <p className="text-xs text-gray-600 mt-2 text-center">
                      QR Code para {connection.userId}
                    </p>
                  </div>
                </div>
              )}
            </CardContent>
          </Card>
        ))}
      </div>
    </div>
  );
}