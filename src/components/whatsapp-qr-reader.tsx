'use client';

import { useState, useEffect } from 'react';
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { whatsappCoreAPI, type WhatsAppStatus, type QRCodeData } from '@/lib/whatsapp-core-api';
import { Loader2, Smartphone, CheckCircle, AlertCircle, RefreshCw } from 'lucide-react';

export function WhatsAppQRReader() {
  const [status, setStatus] = useState<WhatsAppStatus | null>(null);
  const [qrData, setQRData] = useState<QRCodeData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchStatus = async () => {
    try {
      const response = await whatsappCoreAPI.getStatus();
      if (response.success && response.data) {
        setStatus(response.data);
        setError(null);
      } else {
        setError(response.error || 'Erro ao buscar status');
      }
    } catch (err) {
      setError('Erro de conexão com a API');
    }
  };

  const fetchQRCode = async () => {
    try {
      const response = await whatsappCoreAPI.getQRCode();
      if (response.success && response.data) {
        setQRData(response.data);
        setError(null);
      } else {
        setQRData(null);
        // Não definir como erro se não há QR disponível
        if (response.error !== 'QR Code não disponível') {
          setError(response.error || 'Erro ao buscar QR Code');
        }
      }
    } catch (err) {
      setError('Erro de conexão com a API');
    }
  };

  const refreshData = async () => {
    setLoading(true);
    await Promise.all([fetchStatus(), fetchQRCode()]);
    setLoading(false);
  };

  useEffect(() => {
    refreshData();

    // Atualizar a cada 3 segundos
    const interval = setInterval(() => {
      fetchStatus();
      if (!status?.isReady) {
        fetchQRCode();
      }
    }, 3000);

    return () => clearInterval(interval);
  }, [status?.isReady]);

  const getStatusIcon = () => {
    if (loading) return <Loader2 className="h-5 w-5 animate-spin" />;
    if (status?.isReady) return <CheckCircle className="h-5 w-5 text-green-500" />;
    if (status?.isConnecting) return <Loader2 className="h-5 w-5 animate-spin text-blue-500" />;
    if (error) return <AlertCircle className="h-5 w-5 text-red-500" />;
    return <Smartphone className="h-5 w-5 text-gray-500" />;
  };

  const getStatusText = () => {
    if (loading) return 'Carregando...';
    if (status?.isReady) return 'WhatsApp Conectado ✅';
    if (status?.isConnecting) return 'Conectando... Escaneie o QR Code';
    if (status?.hasQR) return 'QR Code disponível - Escaneie com WhatsApp';
    if (error) return `Erro: ${error}`;
    return 'Aguardando conexão...';
  };

  const getStatusColor = () => {
    if (status?.isReady) return 'text-green-600';
    if (status?.isConnecting) return 'text-blue-600';
    if (error) return 'text-red-600';
    return 'text-gray-600';
  };

  return (
    <div className="max-w-md mx-auto space-y-4">
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            {getStatusIcon()}
            WhatsApp Web Connection
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          {/* Status */}
          <div className="text-center">
            <p className={`font-medium ${getStatusColor()}`}>
              {getStatusText()}
            </p>
            {status && (
              <div className="text-sm text-gray-500 mt-2">
                <p>Contatos: {status.contactsCount}</p>
                <p>Mensagens: {status.messagesCount}</p>
              </div>
            )}
          </div>

          {/* QR Code */}
          {qrData?.qrImage && !status?.isReady && (
            <div className="text-center">
              <div className="bg-white p-4 rounded-lg inline-block shadow-sm border">
                <img
                  src={qrData.qrImage}
                  alt="WhatsApp QR Code"
                  className="w-48 h-48 mx-auto"
                />
              </div>
              <p className="text-sm text-gray-600 mt-2">
                Abra o WhatsApp no seu celular e escaneie este código
              </p>
              <p className="text-xs text-gray-500 mt-1">
                WhatsApp {'>'} Dispositivos vinculados {'>'} Vincular um dispositivo
              </p>
            </div>
          )}

          {/* Connected State */}
          {status?.isReady && (
            <div className="text-center py-8">
              <CheckCircle className="h-16 w-16 text-green-500 mx-auto mb-4" />
              <h3 className="text-lg font-medium text-green-600 mb-2">
                WhatsApp Conectado!
              </h3>
              <p className="text-gray-600">
                Você pode agora enviar e receber mensagens
              </p>
            </div>
          )}

          {/* Error State */}
          {error && !status?.isReady && (
            <div className="text-center py-4">
              <AlertCircle className="h-12 w-12 text-red-500 mx-auto mb-2" />
              <p className="text-red-600 text-sm">{error}</p>
            </div>
          )}

          {/* Refresh Button */}
          <div className="text-center">
            <Button
              onClick={refreshData}
              variant="outline"
              size="sm"
              disabled={loading}
              className="gap-2"
            >
              <RefreshCw className={`h-4 w-4 ${loading ? 'animate-spin' : ''}`} />
              Atualizar
            </Button>
          </div>
        </CardContent>
      </Card>

      {/* Instructions */}
      {!status?.isReady && (
        <Card>
          <CardContent className="pt-6">
            <h4 className="font-medium mb-2">Como conectar:</h4>
            <ol className="text-sm text-gray-600 space-y-1">
              <li>1. Abra o WhatsApp no seu celular</li>
              <li>2. Toque em ⋮ (menu) {'>'} Dispositivos vinculados</li>
              <li>3. Toque em "Vincular um dispositivo"</li>
              <li>4. Escaneie o QR Code acima</li>
              <li>5. Aguarde a conexão ser estabelecida</li>
            </ol>
          </CardContent>
        </Card>
      )}
    </div>
  );
}