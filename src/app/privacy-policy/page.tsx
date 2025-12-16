'use client'

import { PageLayout } from '@/components/ui/page-layout'

export default function PrivacyPolicyPage() {
  return (
    <PageLayout title="Política de Privacidade">
      <div className="max-w-4xl mx-auto bg-gray-800/50 backdrop-blur-sm rounded-xl p-8 border border-gray-700/30">
        <div className="prose prose-invert max-w-none">
          <h2 className="text-2xl font-bold text-[#D4AF37] mb-6">Política de Privacidade</h2>

          <div className="space-y-6 text-gray-300">
            <section>
              <h3 className="text-lg font-semibold text-white mb-3">1. Coleta de Informações</h3>
              <p>
                Coletamos informações que você nos fornece diretamente, como quando você cria uma conta,
                usa nossos serviços de automação de Instagram ou entra em contato conosco.
              </p>
            </section>

            <section>
              <h3 className="text-lg font-semibold text-white mb-3">2. Uso de Informações</h3>
              <p>
                Usamos as informações coletadas para fornecer, manter e melhorar nossos serviços de
                automação de marketing para Instagram e WhatsApp.
              </p>
            </section>

            <section>
              <h3 className="text-lg font-semibold text-white mb-3">3. Compartilhamento de Informações</h3>
              <p>
                Não vendemos, alugamos ou compartilhamos suas informações pessoais com terceiros,
                exceto conforme descrito nesta política de privacidade.
              </p>
            </section>

            <section>
              <h3 className="text-lg font-semibold text-white mb-3">4. Integração com Instagram</h3>
              <p>
                Nossa plataforma se integra com a API do Instagram para fornecer recursos de automação.
                Respeitamos todos os termos de uso do Instagram e suas diretrizes de privacidade.
              </p>
            </section>

            <section>
              <h3 className="text-lg font-semibold text-white mb-3">5. Segurança</h3>
              <p>
                Implementamos medidas de segurança técnicas e organizacionais para proteger suas
                informações contra acesso não autorizado, alteração, divulgação ou destruição.
              </p>
            </section>

            <section>
              <h3 className="text-lg font-semibold text-white mb-3">6. Cookies</h3>
              <p>
                Usamos cookies e tecnologias similares para melhorar sua experiência em nosso site
                e fornecer funcionalidades personalizadas.
              </p>
            </section>

            <section>
              <h3 className="text-lg font-semibold text-white mb-3">7. Seus Direitos</h3>
              <p>
                Você tem o direito de acessar, corrigir ou excluir suas informações pessoais.
                Para exercer esses direitos, entre em contato conosco.
              </p>
            </section>

            <section>
              <h3 className="text-lg font-semibold text-white mb-3">8. Alterações na Política</h3>
              <p>
                Podemos atualizar esta política de privacidade periodicamente. Notificaremos você
                sobre mudanças significativas através de nosso site ou por email.
              </p>
            </section>

            <section>
              <h3 className="text-lg font-semibold text-white mb-3">9. Contato</h3>
              <p>
                Se você tiver dúvidas sobre esta política de privacidade, entre em contato conosco
                através do email: contato@customersuccessdashboard.com
              </p>
            </section>

            <div className="mt-8 p-4 bg-gray-700/30 rounded-lg">
              <p className="text-sm text-gray-400">
                Última atualização: {new Date().toLocaleDateString('pt-BR')}
              </p>
            </div>
          </div>
        </div>
      </div>
    </PageLayout>
  )
}