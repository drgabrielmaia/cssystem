'use client';

import { useState } from 'react';
import { WhatsAppOrgManager } from '@/components/whatsapp-org-manager';

export default function WhatsAppMultiOrgPage() {
  const [organizationId, setOrganizationId] = useState('');
  const [organizations, setOrganizations] = useState<string[]>([
    '9c8c0033-15ea-4e33-a55f-28d81a19693b', // Organização exemplo
  ]);

  const addOrganization = () => {
    if (organizationId && !organizations.includes(organizationId)) {
      setOrganizations([...organizations, organizationId]);
      setOrganizationId('');
    }
  };

  const removeOrganization = (orgId: string) => {
    setOrganizations(organizations.filter(id => id !== orgId));
  };

  return (
    <div className="container mx-auto px-4 py-8">
      <div className="mb-8">
        <h1 className="text-3xl font-bold mb-4">
          WhatsApp Multi-Organização
        </h1>
        <p className="text-gray-600">
          Gerencie conexões WhatsApp Web para diferentes organizações.
          Cada organização tem sua própria instância independente.
        </p>
      </div>

      {/* Adicionar Nova Organização */}
      <div className="bg-white rounded-lg shadow p-6 mb-6">
        <h2 className="text-xl font-semibold mb-4">
          Adicionar Nova Organização
        </h2>

        <div className="flex space-x-2">
          <input
            type="text"
            placeholder="ID da Organização"
            value={organizationId}
            onChange={(e) => setOrganizationId(e.target.value)}
            className="flex-1 border border-gray-300 rounded px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500"
          />
          <button
            onClick={addOrganization}
            disabled={!organizationId}
            className="px-4 py-2 bg-blue-600 text-white rounded hover:bg-blue-700 disabled:opacity-50"
          >
            Adicionar
          </button>
        </div>

        <p className="text-sm text-gray-500 mt-2">
          Digite o UUID da organização para criar uma nova conexão WhatsApp.
        </p>
      </div>

      {/* Lista de Organizações */}
      <div className="space-y-4">
        <h2 className="text-xl font-semibold">
          Conexões Ativas ({organizations.length})
        </h2>

        {organizations.length === 0 ? (
          <div className="text-center py-12 text-gray-500">
            <div className="text-4xl mb-4">📱</div>
            <p>Nenhuma organização configurada.</p>
            <p className="text-sm">Adicione uma organização acima para começar.</p>
          </div>
        ) : (
          organizations.map((orgId) => (
            <div key={orgId} className="relative">
              <WhatsAppOrgManager
                organizationId={orgId}
                organizationName={`Organização ${orgId.slice(0, 8)}...`}
              />

              <button
                onClick={() => removeOrganization(orgId)}
                className="absolute top-2 right-2 text-gray-400 hover:text-red-600"
                title="Remover organização"
              >
                <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 20 20">
                  <path fillRule="evenodd" d="M4.293 4.293a1 1 0 011.414 0L10 8.586l4.293-4.293a1 1 0 111.414 1.414L11.414 10l4.293 4.293a1 1 0 01-1.414 1.414L10 11.414l-4.293 4.293a1 1 0 01-1.414-1.414L8.586 10 4.293 5.707a1 1 0 010-1.414z" clipRule="evenodd" />
                </svg>
              </button>
            </div>
          ))
        )}
      </div>

      {/* Informações de Uso */}
      <div className="mt-8 bg-blue-50 border border-blue-200 rounded-lg p-4">
        <h3 className="font-semibold text-blue-900 mb-2">
          Como usar:
        </h3>
        <ul className="text-sm text-blue-800 space-y-1">
          <li>• Cada organização tem sua própria instância WhatsApp independente</li>
          <li>• O QR code expira em 10 segundos - se não conectar, será gerado um novo</li>
          <li>• As conexões são mantidas até serem explicitamente desconectadas</li>
          <li>• Se a conexão falhar, use o botão "Reconectar" para tentar novamente</li>
          <li>• Os dados de autenticação ficam salvos localmente para cada organização</li>
        </ul>
      </div>

      {/* Status Geral */}
      <div className="mt-4">
        <details className="bg-gray-50 rounded-lg p-4">
          <summary className="cursor-pointer font-semibold">
            Status do Sistema
          </summary>
          <div className="mt-2 text-sm text-gray-600">
            <p>Organizações configuradas: {organizations.length}</p>
            <p>Timeout de conexão: 10 segundos</p>
            <p>Verificação de status: A cada 5 segundos</p>
          </div>
        </details>
      </div>
    </div>
  );
}