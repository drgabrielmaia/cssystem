'use client';

import { useState, useEffect, useCallback } from 'react';
import { PageLayout } from '@/components/ui/page-layout';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { AlertCircle, CheckCircle, QrCode, Smartphone, Wifi, WifiOff, RefreshCw, ArrowLeft, Loader2 } from 'lucide-react';
import { whatsappMultiService, type WhatsAppStatus, type QRCodeData } from '@/lib/whatsapp-multi-service';
import { useAuth } from '@/contexts/auth';
import Link from 'next/link';
import { useRouter } from 'next/navigation';

export default function WhatsAppConnectPage() {
  const { user } = useAuth();
  const router = useRouter();

  // Estados
  const [status, setStatus] = useState<WhatsAppStatus | null>(null);
  const [qrData, setQrData] = useState<QRCodeData | null>(null);
  const [loading, setLoading] = useState(true);
  const [registering, setRegistering] = useState(false);
  const [error, setError] = useState<string | null>(null);

  /**
   * Verificar status atual da conexão
   */
  const checkStatus = useCallback(async () => {
    try {
      setError(null);
      console.log('🔍 Verificando status da conexão...');

      const response = await whatsappMultiService.getStatus();
      
      if (response.success && response.data) {
        setStatus(response.data);
        console.log('✅ Status obtido:', response.data);

        // Se conectado, redirecionar para página principal
        if (response.data.isReady) {
          console.log('🎉 WhatsApp já conectado, redirecionando...');
          setTimeout(() => {
            router.push('/whatsapp');
          }, 2000);
        }
      } else {
        console.log('⚠️ Erro ao obter status:', response.error);
        setError(response.error || 'Erro ao verificar status');
      }
    } catch (err) {
      console.error('❌ Erro na verificação de status:', err);
      setError('Erro de conectividade com a API');
    } finally {
      setLoading(false);
    }
  }, [router]);

  /**
   * Obter QR Code para conexão
   */
  const fetchQRCode = useCallback(async () => {
    try {
      console.log('📱 Obtendo QR Code...');

      const response = await whatsappMultiService.getQRCode();
      
      if (response.success && response.data) {
        setQrData(response.data);
        setError(null);
        console.log('✅ QR Code obtido com sucesso');
      } else {
        console.log('❌ Erro ao obter QR Code:', response.error);
        setError(response.error || 'QR Code não disponível');
      }
    } catch (err) {
      console.error('❌ Erro ao buscar QR Code:', err);
      setError('Erro ao carregar QR Code');
    }
  }, []);

  /**
   * Registrar usuário no sistema WhatsApp
   */
  const registerUser = useCallback(async () => {
    try {
      setRegistering(true);
      setError(null);
      console.log('📝 Registrando usuário no sistema...');

      const response = await whatsappMultiService.registerUser();
      
      if (response.success) {
        console.log('✅ Usuário registrado:', response.data);
        
        // Aguardar um pouco e verificar status novamente
        setTimeout(() => {
          checkStatus();
          fetchQRCode();
        }, 1000);
      } else {
        console.log('❌ Erro no registro:', response.error);
        setError(response.error || 'Erro ao registrar usuário');
      }
    } catch (err) {
      console.error('❌ Erro no registro:', err);
      setError('Erro ao registrar no sistema');
    } finally {
      setRegistering(false);
    }
  }, [checkStatus, fetchQRCode]);

  /**
   * Atualizar status e QR Code
   */
  const refreshConnection = useCallback(async () => {
    setLoading(true);
    await Promise.all([
      checkStatus(),
      fetchQRCode()
    ]);
  }, [checkStatus, fetchQRCode]);

  // Verificar status inicial
  useEffect(() => {
    if (user) {
      checkStatus();
    }
  }, [user, checkStatus]);

  // Auto-refresh a cada 5 segundos se estiver esperando conexão
  useEffect(() => {
    if (status && !status.isReady && !status.isConnecting) {
      const interval = setInterval(checkStatus, 5000);
      return () => clearInterval(interval);
    }
  }, [status, checkStatus]);

  // Se carregando
  if (loading) {
    return (
      <PageLayout
        title="Conectando WhatsApp"
        subtitle="Configurando conexão com WhatsApp Business"
      >
        <div className="flex flex-col items-center justify-center py-16">
          <div className="flex items-center gap-3 mb-4">
            <Loader2 className="w-8 h-8 animate-spin text-green-500" />
            <span className="text-lg">Verificando conexão...</span>
          </div>
          <p className="text-gray-600">Aguarde enquanto verificamos o status da sua organização</p>
        </div>
      </PageLayout>
    );
  }

  return (
    <PageLayout
      title="WhatsApp Business"
      subtitle="Conecte sua organização ao WhatsApp"
    >
      {/* Botão Voltar */}
      <div className="mb-6">
        <Link href="/whatsapp">
          <Button variant="ghost" className="flex items-center gap-2">
            <ArrowLeft className="w-4 h-4" />
            Voltar para WhatsApp
          </Button>
        </Link>
      </div>

      <div className="max-w-4xl mx-auto space-y-6">
        {/* Status da Conexão */}
        <Card className="border-2">
          <CardHeader>
            <CardTitle className="flex items-center gap-3">
              {status?.isReady ? (
                <CheckCircle className="w-6 h-6 text-green-500" />
              ) : status?.isConnecting ? (
                <Loader2 className="w-6 h-6 animate-spin text-yellow-500" />
              ) : (
                <WifiOff className="w-6 h-6 text-red-500" />
              )}
              Status da Conexão
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div className="flex items-center gap-3">
                <div className="w-3 h-3 rounded-full bg-gray-300"></div>
                <div>
                  <p className="font-medium">Registro</p>
                  <p className="text-sm text-gray-600">
                    {status?.registered ? 'Registrado' : 'Pendente'}
                  </p>
                </div>
              </div>
              
              <div className="flex items-center gap-3">
                <div className={`w-3 h-3 rounded-full ${
                  status?.isConnecting ? 'bg-yellow-400 animate-pulse' : 
                  status?.isReady ? 'bg-green-400' : 'bg-red-400'
                }`}></div>
                <div>
                  <p className="font-medium">Conexão</p>
                  <p className="text-sm text-gray-600">
                    {status?.isReady ? 'Conectado' : 
                     status?.isConnecting ? 'Conectando...' : 'Desconectado'}
                  </p>
                </div>
              </div>
              
              <div className="flex items-center gap-3">
                <div className={`w-3 h-3 rounded-full ${
                  status?.hasQR ? 'bg-blue-400' : 'bg-gray-300'
                }`}></div>
                <div>
                  <p className="font-medium">QR Code</p>
                  <p className="text-sm text-gray-600">
                    {status?.hasQR ? 'Disponível' : 'Indisponível'}
                  </p>
                </div>
              </div>
            </div>

            {status?.userInfo && (
              <div className="mt-4 p-4 bg-green-50 border border-green-200 rounded-lg">
                <h4 className="font-medium text-green-800 mb-2">Conta Conectada</h4>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-2 text-sm">
                  <p><span className="font-medium">Nome:</span> {status.userInfo.name}</p>
                  <p><span className="font-medium">Telefone:</span> {status.userInfo.phone}</p>
                  <p><span className="font-medium">ID:</span> {status.userInfo.id}</p>
                  <p><span className="font-medium">Status:</span> 
                    <Badge variant={status.userInfo.isConnected ? "default" : "secondary"} className="ml-2">
                      {status.userInfo.isConnected ? "Online" : "Offline"}
                    </Badge>
                  </p>
                </div>
              </div>
            )}
          </CardContent>
        </Card>

        {/* Erro */}
        {error && (
          <Card className="border-red-200 bg-red-50">
            <CardContent className="pt-6">
              <div className="flex items-start gap-3">
                <AlertCircle className="w-6 h-6 text-red-500 flex-shrink-0 mt-0.5" />
                <div>
                  <h4 className="font-medium text-red-800 mb-1">Erro de Conexão</h4>
                  <p className="text-sm text-red-700">{error}</p>
                </div>
              </div>
            </CardContent>
          </Card>
        )}

        {/* Ações baseadas no status */}
        {!status?.registered && (
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-3">
                <Smartphone className="w-6 h-6 text-blue-500" />
                Registrar Organização
              </CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-gray-600 mb-4">
                Primeiro, você precisa registrar sua organização no sistema WhatsApp.
              </p>
              <Button 
                onClick={registerUser} 
                disabled={registering}
                className="bg-blue-600 hover:bg-blue-700"
              >
                {registering ? (
                  <>
                    <Loader2 className="w-4 h-4 animate-spin mr-2" />
                    Registrando...
                  </>
                ) : (
                  'Registrar Organização'
                )}
              </Button>
            </CardContent>
          </Card>
        )}

        {status?.registered && !status.isReady && (
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            {/* QR Code */}
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-3">
                  <QrCode className="w-6 h-6 text-green-500" />
                  Conectar WhatsApp
                </CardTitle>
              </CardHeader>
              <CardContent className="text-center">
                {qrData ? (
                  <div>
                    <div className="bg-white p-4 rounded-lg border-2 border-dashed border-gray-300 mb-4 inline-block">
                      <img 
                        src={qrData.qrImage} 
                        alt="QR Code WhatsApp" 
                        className="max-w-full h-auto"
                        style={{ maxWidth: '250px' }}
                      />
                    </div>
                    <p className="text-sm text-gray-600 mb-4">
                      Escaneie este QR Code com seu WhatsApp
                    </p>
                    <Button 
                      variant="outline" 
                      onClick={fetchQRCode}
                      className="flex items-center gap-2 mx-auto"
                    >
                      <RefreshCw className="w-4 h-4" />
                      Atualizar QR Code
                    </Button>
                  </div>
                ) : (
                  <div>
                    <div className="bg-gray-100 p-8 rounded-lg border-2 border-dashed border-gray-300 mb-4">
                      <QrCode className="w-16 h-16 text-gray-400 mx-auto mb-2" />
                      <p className="text-gray-500">QR Code não disponível</p>
                    </div>
                    <Button 
                      onClick={fetchQRCode}
                      className="bg-green-600 hover:bg-green-700"
                    >
                      Gerar QR Code
                    </Button>
                  </div>
                )}
              </CardContent>
            </Card>

            {/* Instruções */}
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-3">
                  <Smartphone className="w-6 h-6 text-blue-500" />
                  Como Conectar
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  <div className="flex items-start gap-3">
                    <div className="bg-blue-100 text-blue-600 w-6 h-6 rounded-full flex items-center justify-center text-sm font-medium flex-shrink-0">
                      1
                    </div>
                    <div>
                      <p className="font-medium">Abra o WhatsApp</p>
                      <p className="text-sm text-gray-600">No seu smartphone</p>
                    </div>
                  </div>
                  
                  <div className="flex items-start gap-3">
                    <div className="bg-blue-100 text-blue-600 w-6 h-6 rounded-full flex items-center justify-center text-sm font-medium flex-shrink-0">
                      2
                    </div>
                    <div>
                      <p className="font-medium">Acesse as Configurações</p>
                      <p className="text-sm text-gray-600">Toque nos três pontos → Dispositivos conectados</p>
                    </div>
                  </div>
                  
                  <div className="flex items-start gap-3">
                    <div className="bg-blue-100 text-blue-600 w-6 h-6 rounded-full flex items-center justify-center text-sm font-medium flex-shrink-0">
                      3
                    </div>
                    <div>
                      <p className="font-medium">Conectar dispositivo</p>
                      <p className="text-sm text-gray-600">Toque em "Conectar dispositivo"</p>
                    </div>
                  </div>
                  
                  <div className="flex items-start gap-3">
                    <div className="bg-blue-100 text-blue-600 w-6 h-6 rounded-full flex items-center justify-center text-sm font-medium flex-shrink-0">
                      4
                    </div>
                    <div>
                      <p className="font-medium">Escaneie o QR Code</p>
                      <p className="text-sm text-gray-600">Aponte a câmera para o QR Code ao lado</p>
                    </div>
                  </div>
                </div>

                <div className="mt-6 p-3 bg-yellow-50 border border-yellow-200 rounded-lg">
                  <p className="text-sm text-yellow-800">
                    <strong>Importante:</strong> Mantenha seu telefone conectado à internet durante o processo.
                  </p>
                </div>
              </CardContent>
            </Card>
          </div>
        )}

        {status?.isReady && (
          <Card className="border-green-200 bg-green-50">
            <CardContent className="pt-6">
              <div className="text-center">
                <CheckCircle className="w-16 h-16 text-green-500 mx-auto mb-4" />
                <h3 className="text-2xl font-semibold text-green-800 mb-2">
                  WhatsApp Conectado!
                </h3>
                <p className="text-green-700 mb-6">
                  Sua organização está conectada e pronta para enviar mensagens.
                </p>
                <Link href="/whatsapp">
                  <Button className="bg-green-600 hover:bg-green-700 text-white px-8 py-2">
                    Ir para Dashboard
                  </Button>
                </Link>
              </div>
            </CardContent>
          </Card>
        )}

        {/* Ações de Debug */}
        <Card className="border-gray-200">
          <CardHeader>
            <CardTitle className="text-sm font-medium text-gray-600">Ações de Debug</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="flex flex-wrap gap-2">
              <Button 
                variant="outline" 
                size="sm" 
                onClick={refreshConnection}
                disabled={loading}
              >
                <RefreshCw className="w-4 h-4 mr-2" />
                Atualizar Status
              </Button>
              
              <Button 
                variant="outline" 
                size="sm" 
                onClick={fetchQRCode}
              >
                <QrCode className="w-4 h-4 mr-2" />
                Recarregar QR
              </Button>
              
              <Button 
                variant="outline" 
                size="sm" 
                onClick={registerUser}
                disabled={registering}
              >
                <Smartphone className="w-4 h-4 mr-2" />
                Re-registrar
              </Button>
            </div>
          </CardContent>
        </Card>
      </div>
    </PageLayout>
  );
}