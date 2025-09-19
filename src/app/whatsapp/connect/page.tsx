import { WhatsAppQRReader } from '@/components/whatsapp-qr-reader';

export default function WhatsAppConnectPage() {
  return (
    <div className="container mx-auto py-8">
      <div className="text-center mb-8">
        <h1 className="text-3xl font-bold mb-2">Conectar WhatsApp</h1>
        <p className="text-gray-600">
          Conecte seu WhatsApp para começar a enviar e receber mensagens
        </p>
      </div>

      <WhatsAppQRReader />
    </div>
  );
}