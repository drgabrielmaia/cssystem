const { createClient } = require('@supabase/supabase-js');

// Configuração do Supabase usando as credenciais corretas do .env.local
const supabaseUrl = 'https://udzmlnnztzzwrphhizol.supabase.co';
const supabaseAnonKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InVkem1sbm56dHp6d3JwaGhpem9sIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTc0MjkwNzYsImV4cCI6MjA3MzAwNTA3Nn0.KjihWHrNYxDO5ZZKpa8UYPAhw9HIU11yvAvvsNaiPZU';
const supabase = createClient(supabaseUrl, supabaseAnonKey);

// Configuração do Z-API WhatsApp (do .env.local) com client-token
const ZAPI_CONFIG = {
    instanceId: '3E779AD995C200100B18EE5C772D9ACD',
    token: 'ABA9D01B9D28640CAF91D1F5',
    clientToken: 'F1418476a6af44318b8820e224db69a54S',
    baseUrl: 'https://api.z-api.io'
};

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

// Função para enviar mensagem via Z-API
async function sendWhatsAppMessage(phoneNumber, message) {
    try {
        // Garantir que o número está no formato correto para Z-API
        let formattedPhone = phoneNumber.replace(/\D/g, '');

        // Remover +55 se existir e adicionar depois
        if (formattedPhone.startsWith('55')) {
            formattedPhone = formattedPhone.substring(2);
        }

        // Formato final: 5583996910414 (sem + e sem caracteres especiais)
        formattedPhone = '55' + formattedPhone;

        console.log(`📱 Enviando para: ${formattedPhone} via Z-API`);

        const url = `${ZAPI_CONFIG.baseUrl}/instances/${ZAPI_CONFIG.instanceId}/token/${ZAPI_CONFIG.token}/send-text`;

        const response = await fetch(url, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'Client-Token': ZAPI_CONFIG.clientToken
            },
            body: JSON.stringify({
                phone: formattedPhone,
                message: message
            })
        });

        const result = await response.json();

        if (response.ok && (result.success || result.status === 'success')) {
            console.log(`✅ Mensagem enviada com sucesso para ${formattedPhone}`);
            return { success: true, phone: formattedPhone };
        } else {
            console.log(`❌ Falha ao enviar para ${formattedPhone}: ${result.error || result.message || 'Erro desconhecido'}`);
            return { success: false, phone: formattedPhone, error: result.error || result.message };
        }

    } catch (error) {
        console.error(`❌ Erro ao enviar mensagem para ${phoneNumber}:`, error);
        return { success: false, phone: phoneNumber, error: error.message };
    }
}

// Função para verificar status da instância Z-API
async function checkZAPIStatus() {
    try {
        console.log('📡 Verificando status da instância Z-API...');

        const url = `${ZAPI_CONFIG.baseUrl}/instances/${ZAPI_CONFIG.instanceId}/token/${ZAPI_CONFIG.token}/status`;

        const response = await fetch(url, {
            headers: {
                'Client-Token': ZAPI_CONFIG.clientToken
            }
        });
        const result = await response.json();

        if (response.ok) {
            console.log(`✅ Status Z-API: ${result.connected ? 'CONECTADO' : 'DESCONECTADO'}`);
            if (result.phone) {
                console.log(`📱 Número conectado: ${result.phone}`);
            }
            return result.connected;
        } else {
            console.log(`❌ Erro ao verificar status Z-API: ${result.error || 'Erro desconhecido'}`);
            return false;
        }
    } catch (error) {
        console.error('❌ Erro ao verificar status Z-API:', error);
        return false;
    }
}

// Função para criar uma mensagem personalizada do dia
function createPersonalizedDailyMessage() {
    const today = new Date();
    const dayOfWeek = today.toLocaleDateString('pt-BR', { weekday: 'long' });
    const dateStr = today.toLocaleDateString('pt-BR', {
        day: '2-digit',
        month: '2-digit',
        year: 'numeric'
    });
    const timeStr = today.toLocaleTimeString('pt-BR', {
        hour: '2-digit',
        minute: '2-digit'
    });

    return `🌟 *Mensagem do Dia* - ${dateStr}

Bom dia!

Hoje é ${dayOfWeek} e mais um dia para alcançarmos nossos objetivos!

💪 *Lembre-se:*
• Foque nas suas metas
• Mantenha a disciplina
• Celebre cada conquista

📈 *Dica do dia:*
O sucesso é construído dia após dia, com consistência e determinação.

🚀 Tenha um excelente dia de trabalho!

_Enviado automaticamente às ${timeStr}_`;
}

// Função principal
async function sendDailyMessageToAdmins() {
    console.log('🚀 Iniciando envio da mensagem do dia para admins das organizações via Z-API...\n');

    const startTime = new Date();

    try {
        // 0. Verificar status da Z-API
        const isConnected = await checkZAPIStatus();
        if (!isConnected) {
            console.log('⚠️ WhatsApp não está conectado via Z-API. Tentaremos enviar mesmo assim...\n');
        }

        // 1. Obter mensagem do dia
        let dailyMessage = await getDailyMessage();

        // Se a mensagem do BD for muito simples ou vazia, usar mensagem personalizada
        if (dailyMessage === 'teste' || dailyMessage.length < 10) {
            dailyMessage = createPersonalizedDailyMessage();
            console.log('ℹ️ Usando mensagem personalizada do dia');
        }

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

        // 3. Confirmar envio
        console.log('🤔 Deseja realmente enviar a mensagem para todos os admins? [MODO TESTE - enviando para o primeiro apenas]\n');

        // 4. Enviar mensagens (MODO TESTE - apenas primeiro)
        console.log('📤 Iniciando envio das mensagens...\n');
        const results = [];

        // Em modo teste, enviar apenas para o primeiro admin
        const testOrg = organizations[0];
        console.log(`📱 [TESTE] Enviando apenas para: ${testOrg.name} (${testOrg.admin_phone})`);
        const result = await sendWhatsAppMessage(testOrg.admin_phone, dailyMessage);
        results.push({
            ...result,
            organization: testOrg.name,
            originalPhone: testOrg.admin_phone,
            email: testOrg.owner_email
        });

        // 5. Relatório final
        console.log('\n📊 RELATÓRIO FINAL (MODO TESTE)');
        console.log('================================');

        const successful = results.filter(r => r.success);
        const failed = results.filter(r => !r.success);

        console.log(`✅ Mensagens enviadas com sucesso: ${successful.length}`);
        console.log(`❌ Falhas no envio: ${failed.length}`);
        console.log(`📊 Total testado: ${results.length} de ${organizations.length} organizações`);

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

        // Instrução para execução completa
        if (successful.length > 0) {
            console.log('\n🎯 PARA ENVIAR PARA TODOS:');
            console.log('Descomente a seção "Para produção" no código e comente a seção de teste.');
        }

        return {
            totalOrganizations: organizations.length,
            tested: results.length,
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
            console.log('\n🎉 Processo de teste concluído!');
            if (summary) {
                if (summary.successful > 0) {
                    console.log(`📈 Teste bem-sucedido! ${summary.successful}/${summary.tested} mensagens enviadas.`);
                    console.log(`📊 ${summary.totalOrganizations - summary.tested} organizações restantes para envio completo.`);
                } else {
                    console.log(`❌ Teste falhou. Verifique a configuração do WhatsApp.`);
                }
            }
            process.exit(0);
        })
        .catch((error) => {
            console.error('\n💥 Processo falhou:', error);
            process.exit(1);
        });
}

module.exports = { sendDailyMessageToAdmins, getDailyMessage, getActiveOrganizations, checkZAPIStatus };