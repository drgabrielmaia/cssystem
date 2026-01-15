const { createClient } = require('@supabase/supabase-js');

// Configuração do Supabase usando as credenciais corretas do .env.local
const supabaseUrl = 'https://udzmlnnztzzwrphhizol.supabase.co';
const supabaseAnonKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InVkem1sbm56dHp6d3JwaGhpem9sIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTc0MjkwNzYsImV4cCI6MjA3MzAwNTA3Nn0.KjihWHrNYxDO5ZZKpa8UYPAhw9HIU11yvAvvsNaiPZU';
const supabase = createClient(supabaseUrl, supabaseAnonKey);

// Configuração do WhatsApp API
const WHATSAPP_API_URL = 'https://api.medicosderesultado.com.br';

// Função para obter a mensagem do dia
async function getDailyMessage() {
    try {
        console.log('📝 1. Buscando mensagem do dia...');

        // Primeiro, verificar se existe uma tabela de mensagens diárias
        const { data: autoMessages, error: autoError } = await supabase
            .from('auto_messages')
            .select('*')
            .eq('is_active', true)
            .limit(1);

        if (!autoError && autoMessages && autoMessages.length > 0) {
            console.log('✅ Mensagem do dia encontrada na base de dados');
            return autoMessages[0].message;
        }

        // Se não encontrou, usar mensagem padrão baseada na data
        const today = new Date();
        const dayOfWeek = today.toLocaleDateString('pt-BR', { weekday: 'long' });
        const dateStr = today.toLocaleDateString('pt-BR');

        const defaultMessage = `🌟 Bom dia! Hoje é ${dayOfWeek}, ${dateStr}

💪 Que este seja um dia produtivo e cheio de conquistas!

📈 Lembre-se dos seus objetivos e continue evoluindo.

🚀 Tenha um excelente dia de trabalho!`;

        console.log('ℹ️ Usando mensagem padrão (não encontrada na base de dados)');
        return defaultMessage;

    } catch (error) {
        console.error('❌ Erro ao buscar mensagem do dia:', error);

        // Mensagem de fallback
        return `🌟 Bom dia!

💪 Que hoje seja um dia produtivo e cheio de realizações!

🚀 Continue focado nos seus objetivos!`;
    }
}

// Função para obter todas as organizações ativas
async function getActiveOrganizations() {
    try {
        console.log('🏢 2. Buscando organizações ativas...');

        const { data: organizations, error } = await supabase
            .from('organizations')
            .select('id, name, admin_phone, owner_email')
            .not('admin_phone', 'is', null)
            .neq('admin_phone', '');

        if (error) {
            console.error('❌ Erro ao buscar organizações:', error);
            return [];
        }

        console.log(`✅ ${organizations.length} organizações encontradas com telefone configurado`);
        return organizations;

    } catch (error) {
        console.error('❌ Erro ao acessar organizações:', error);
        return [];
    }
}

// Função para enviar mensagem via WhatsApp
async function sendWhatsAppMessage(phoneNumber, message) {
    try {
        // Garantir que o número está no formato correto
        let formattedPhone = phoneNumber.replace(/\D/g, '');
        if (!formattedPhone.startsWith('55')) {
            formattedPhone = '55' + formattedPhone;
        }

        console.log(`📱 Enviando para: ${formattedPhone}`);

        const response = await fetch(`${WHATSAPP_API_URL}/send-message`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
            },
            body: JSON.stringify({
                to: formattedPhone + '@c.us',
                message: message
            })
        });

        const result = await response.json();

        if (response.ok && result.success) {
            console.log(`✅ Mensagem enviada com sucesso para ${formattedPhone}`);
            return { success: true, phone: formattedPhone };
        } else {
            console.log(`❌ Falha ao enviar para ${formattedPhone}: ${result.error || 'Erro desconhecido'}`);
            return { success: false, phone: formattedPhone, error: result.error };
        }

    } catch (error) {
        console.error(`❌ Erro ao enviar mensagem para ${phoneNumber}:`, error);
        return { success: false, phone: phoneNumber, error: error.message };
    }
}

// Função principal
async function sendDailyMessageToAdmins() {
    console.log('🚀 Iniciando envio da mensagem do dia para admins das organizações...\n');

    const startTime = new Date();

    try {
        // 1. Obter mensagem do dia
        const dailyMessage = await getDailyMessage();
        console.log('📝 Mensagem do dia:');
        console.log(dailyMessage);
        console.log('\n');

        // 2. Obter organizações ativas
        const organizations = await getActiveOrganizations();

        if (organizations.length === 0) {
            console.log('⚠️ Nenhuma organização com telefone configurado encontrada.');
            return;
        }

        console.log('\n🏢 Organizações que receberão a mensagem:');
        organizations.forEach((org, index) => {
            console.log(`${index + 1}. ${org.name} - ${org.admin_phone} (${org.owner_email})`);
        });
        console.log('\n');

        // 3. Enviar mensagens
        console.log('📤 Iniciando envio das mensagens...\n');
        const results = [];

        for (const org of organizations) {
            console.log(`📱 Enviando para: ${org.name} (${org.admin_phone})`);
            const result = await sendWhatsAppMessage(org.admin_phone, dailyMessage);
            results.push({
                ...result,
                organization: org.name,
                originalPhone: org.admin_phone,
                email: org.owner_email
            });

            // Aguardar 2 segundos entre envios para evitar rate limiting
            await new Promise(resolve => setTimeout(resolve, 2000));
        }

        // 4. Relatório final
        console.log('\n📊 RELATÓRIO FINAL');
        console.log('==================');

        const successful = results.filter(r => r.success);
        const failed = results.filter(r => !r.success);

        console.log(`✅ Mensagens enviadas com sucesso: ${successful.length}`);
        console.log(`❌ Falhas no envio: ${failed.length}`);
        console.log(`📊 Total de organizações: ${organizations.length}`);

        if (successful.length > 0) {
            console.log('\n✅ SUCESSOS:');
            successful.forEach((result, index) => {
                console.log(`${index + 1}. ${result.organization} - ${result.phone}`);
            });
        }

        if (failed.length > 0) {
            console.log('\n❌ FALHAS:');
            failed.forEach((result, index) => {
                console.log(`${index + 1}. ${result.organization} - ${result.originalPhone} - ${result.error}`);
            });
        }

        const endTime = new Date();
        const duration = (endTime - startTime) / 1000;
        console.log(`\n⏱️ Tempo total de execução: ${duration}s`);

        return {
            totalOrganizations: organizations.length,
            successful: successful.length,
            failed: failed.length,
            results: results
        };

    } catch (error) {
        console.error('❌ Erro geral na execução:', error);
        throw error;
    }
}

// Executar se chamado diretamente
if (require.main === module) {
    sendDailyMessageToAdmins()
        .then((summary) => {
            console.log('\n🎉 Processo concluído com sucesso!');
            if (summary) {
                console.log(`📈 Taxa de sucesso: ${(summary.successful / summary.totalOrganizations * 100).toFixed(1)}%`);
            }
            process.exit(0);
        })
        .catch((error) => {
            console.error('\n💥 Processo falhou:', error);
            process.exit(1);
        });
}

module.exports = { sendDailyMessageToAdmins, getDailyMessage, getActiveOrganizations };