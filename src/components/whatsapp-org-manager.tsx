'use client';

import { useState, useEffect } from 'react';
import { QRCodeSVG } from 'qrcode.react';

interface WhatsAppOrgConnection {
  organizationId: string;
  isReady: boolean;
  isConnecting: boolean;
  qrCode?: string | null;
}

interface WhatsAppOrgManagerProps {
  organizationId: string;
  organizationName?: string;
}

export function WhatsAppOrgManager({ organizationId, organizationName }: WhatsAppOrgManagerProps) {
  const [connection, setConnection] = useState<WhatsAppOrgConnection>({
    organizationId,
    isReady: false,
    isConnecting: false,
    qrCode: null
  });
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    checkConnectionStatus();

    // Verificar status a cada 5 segundos
    const interval = setInterval(checkConnectionStatus, 5000);

    return () => clearInterval(interval);
  }, [organizationId]);

  const checkConnectionStatus = async () => {
    try {
      console.log(`🔍 [DEBUG-REACT] checkConnectionStatus para org: ${organizationId}`);
      const response = await fetch(`/api/whatsapp/connect?organizationId=${organizationId}`);
      const data = await response.json();
      console.log(`📊 [DEBUG-REACT] Response status: ${response.status}, data:`, data);

      if (response.ok) {
        console.log(`✅ [DEBUG-REACT] Status OK, atualizando state:`, {
          isReady: data.isReady,
          isConnecting: data.isConnecting,
          hasQrCode: !!data.qrCode
        });
        setConnection({
          organizationId,
          isReady: data.isReady,
          isConnecting: data.isConnecting,
          qrCode: data.qrCode
        });
        setError(null);
      }
    } catch (error) {
      console.error('Erro ao verificar status:', error);
    }
  };

  const connect = async () => {
    console.log(`🚀 [DEBUG-REACT] connect() iniciado para org: ${organizationId}`);
    setLoading(true);
    setError(null);

    try {
      console.log(`📡 [DEBUG-REACT] Enviando POST para /api/whatsapp/connect`);
      const response = await fetch('/api/whatsapp/connect', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({ organizationId })
      });

      const data = await response.json();
      console.log(`📊 [DEBUG-REACT] POST Response status: ${response.status}, data:`, data);

      if (response.ok) {
        console.log(`✅ [DEBUG-REACT] Conexão iniciada, atualizando state para isConnecting: true`);
        setConnection(prev => ({ ...prev, isConnecting: true }));

        // Aguardar um pouco e verificar o QR code
        console.log(`⏰ [DEBUG-REACT] Agendando checkConnectionStatus em 2s`);
        setTimeout(checkConnectionStatus, 2000);
      } else {
        console.error(`❌ [DEBUG-REACT] Erro na resposta:`, data);
        setError(data.message || 'Erro ao conectar');
      }
    } catch (error) {
      console.error(`❌ [DEBUG-REACT] Erro no fetch:`, error);
      setError('Erro ao conectar WhatsApp');
      console.error('Erro:', error);
    } finally {
      setLoading(false);
    }
  };

  const disconnect = async () => {
    setLoading(true);
    setError(null);

    try {
      const response = await fetch('/api/whatsapp/disconnect', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({ organizationId })
      });

      const data = await response.json();

      if (response.ok) {
        setConnection(prev => ({
          ...prev,
          isReady: false,
          isConnecting: false,
          qrCode: null
        }));
      } else {
        setError(data.message || 'Erro ao desconectar');
      }
    } catch (error) {
      setError('Erro ao desconectar WhatsApp');
      console.error('Erro:', error);
    } finally {
      setLoading(false);
    }
  };

  const reconnect = async () => {
    await disconnect();
    setTimeout(connect, 1000);
  };

  const getStatusColor = () => {
    if (connection.isReady) return 'text-green-600';
    if (connection.isConnecting) return 'text-yellow-600';
    return 'text-red-600';
  };

  const getStatusText = () => {
    if (connection.isReady) return 'Conectado';
    if (connection.isConnecting) return 'Conectando...';
    return 'Desconectado';
  };

  const getStatusBadgeColor = () => {
    if (connection.isReady) return 'bg-green-100 text-green-800';
    if (connection.isConnecting) return 'bg-yellow-100 text-yellow-800';
    return 'bg-red-100 text-red-800';
  };

  return (
    <div className="border rounded-lg p-4 space-y-4">
      <div className="flex items-center justify-between">
        <div>
          <h3 className="font-semibold">
            WhatsApp - {organizationName || organizationId}
          </h3>
          <div className="flex items-center space-x-2 mt-1">
            <span className={`inline-flex px-2 py-1 text-xs font-medium rounded-full ${getStatusBadgeColor()}`}>
              {getStatusText()}
            </span>
            <span className="text-sm text-gray-500">
              ID: {organizationId}
            </span>
          </div>
        </div>

        <div className="flex space-x-2">
          {!connection.isReady && !connection.isConnecting && (
            <button
              onClick={connect}
              disabled={loading}
              className="px-4 py-2 bg-blue-600 text-white rounded hover:bg-blue-700 disabled:opacity-50"
            >
              {loading ? 'Conectando...' : 'Conectar'}
            </button>
          )}

          {connection.isConnecting && (
            <button
              onClick={reconnect}
              disabled={loading}
              className="px-4 py-2 bg-yellow-600 text-white rounded hover:bg-yellow-700 disabled:opacity-50"
            >
              Reconectar
            </button>
          )}

          {connection.isReady && (
            <button
              onClick={disconnect}
              disabled={loading}
              className="px-4 py-2 bg-red-600 text-white rounded hover:bg-red-700 disabled:opacity-50"
            >
              {loading ? 'Desconectando...' : 'Desconectar'}
            </button>
          )}
        </div>
      </div>

      {error && (
        <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded">
          {error}
        </div>
      )}

      {connection.isConnecting && connection.qrCode && (
        <div className="border-t pt-4">
          <h4 className="font-medium mb-2">Escaneie o QR Code com seu WhatsApp:</h4>
          <div className="flex justify-center bg-white p-4 rounded">
            <QRCodeSVG value={connection.qrCode} size={200} />
          </div>
          <p className="text-sm text-gray-600 mt-2 text-center">
            O QR Code expira em 10 segundos. Se não conectar, será gerado um novo automaticamente.
          </p>
        </div>
      )}

      {connection.isConnecting && !connection.qrCode && (
        <div className="border-t pt-4">
          <div className="flex justify-center">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
          </div>
          <p className="text-center text-gray-600 mt-2">
            Preparando conexão...
          </p>
        </div>
      )}

      {connection.isReady && (
        <div className="border-t pt-4">
          <div className="flex items-center justify-center text-green-600">
            <svg className="w-5 h-5 mr-2" fill="currentColor" viewBox="0 0 20 20">
              <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" />
            </svg>
            WhatsApp conectado e pronto para uso!
          </div>
        </div>
      )}
    </div>
  );
}