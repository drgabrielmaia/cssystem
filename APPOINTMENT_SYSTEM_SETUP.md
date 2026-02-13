# Sistema de Agendamentos - Guia de Implementação

## Status da Implementação

### ✅ Arquivos Criados

1. **create_appointment_system.sql** - Script SQL completo com:
   - 4 tabelas principais (closer_availability, appointments, calendar_blocks, appointment_logs)
   - 5 funções PostgreSQL para gerenciamento
   - 2 views para relatórios
   - Triggers automáticos
   - Configuração inicial dos closers

2. **deploy-appointment-direct.js** - Script de teste e validação

## 📋 Instruções de Deploy

### Passo 1: Executar SQL no Supabase

1. Acesse o Supabase Dashboard: https://udzmlnnztzzwrphhizol.supabase.co
2. Vá para **SQL Editor** (menu lateral esquerdo)
3. Clique em **New Query**
4. Cole todo o conteúdo do arquivo `create_appointment_system.sql`
5. Clique em **Run** (ou pressione Ctrl+Enter)

### Passo 2: Verificar a Criação

Execute estas queries no SQL Editor para verificar:

```sql
-- Verificar tabelas criadas
SELECT table_name 
FROM information_schema.tables 
WHERE table_schema = 'public' 
AND table_name IN ('closer_availability', 'appointments', 'calendar_blocks', 'appointment_logs');

-- Verificar disponibilidade dos closers
SELECT * FROM closer_availability LIMIT 10;

-- Verificar funções criadas
SELECT routine_name 
FROM information_schema.routines 
WHERE routine_schema = 'public' 
AND routine_name IN ('get_closer_availability', 'schedule_appointment', 'cancel_appointment');
```

## 🔧 APIs Disponíveis

### 1. Buscar Disponibilidade de um Closer

```javascript
// Frontend - Buscar slots disponíveis
const { data, error } = await supabase
  .rpc('get_closer_availability', {
    p_closer_id: 'CLOSER_ID',
    p_date: '2024-02-15'
  });

// Retorna:
// [
//   { slot_start: "09:00", slot_end: "09:30", is_available: true },
//   { slot_start: "09:30", slot_end: "10:00", is_available: false },
//   ...
// ]
```

### 2. Agendar um Appointment

```javascript
// Frontend - Criar agendamento
const { data, error } = await supabase
  .from('appointments')
  .insert({
    lead_id: 'LEAD_ID',
    closer_id: 'CLOSER_ID',
    organization_id: 'ORG_ID',
    appointment_date: '2024-02-15',
    start_time: '14:00:00',
    end_time: '14:30:00',
    status: 'scheduled',
    appointment_type: 'call',
    title: 'Call com Lead',
    description: 'Discussão sobre proposta'
  })
  .select();
```

### 3. Buscar Agenda do Closer

```javascript
// Frontend - Ver agenda
const { data, error } = await supabase
  .rpc('get_closer_schedule', {
    p_closer_id: 'CLOSER_ID',
    p_start_date: '2024-02-01',
    p_end_date: '2024-02-29'
  });
```

### 4. Cancelar Agendamento

```javascript
// Frontend - Cancelar
const { data, error } = await supabase
  .rpc('cancel_appointment', {
    p_appointment_id: 'APPOINTMENT_ID',
    p_cancelled_by: 'USER_ID',
    p_cancellation_reason: 'Lead solicitou reagendamento'
  });
```

## 📊 Estrutura das Tabelas

### closer_availability
- Controla disponibilidade recorrente (dias da semana)
- Permite disponibilidades específicas (datas únicas)
- Configuração de duração de slots e buffers

### appointments
- Agendamentos de calls/reuniões
- Status: scheduled, confirmed, completed, cancelled, etc.
- Tipos: call, video_call, meeting, follow_up
- Rastreamento de resultados (outcome)

### calendar_blocks
- Bloqueios de agenda (almoço, férias, reuniões internas)
- Pode ser recorrente ou específico
- Tipos: lunch, break, meeting, training, vacation, etc.

### appointment_logs
- Histórico completo de todas as mudanças
- Rastreabilidade de ações (quem fez o que e quando)

## 🎯 Configuração Atual

### Closers Configurados
1. **Paulo Guimarães** (ID: 23d77835-951e-46a1-bb07-f66a96a4d8ad)
   - Segunda a Sexta: 9h às 18h
   - Slots de 30 minutos

2. **Kelly** (ID: 66dfd430-e2b3-4a54-8e42-421d214083ed)
   - Segunda a Sexta: 9h às 18h
   - Slots de 30 minutos

### Parâmetros Padrão
- Duração do slot: 30 minutos
- Buffer entre reuniões: 5 minutos
- Máximo de agendamentos por dia: 20
- Horário de almoço: 12h às 13h (bloqueado)

## 🚀 Integração com Frontend

### Componente de Calendário Sugerido

```jsx
// components/CloserCalendar.jsx
import { useState, useEffect } from 'react';
import { supabase } from '@/lib/supabase';

export function CloserCalendar({ closerId, onSlotSelect }) {
  const [availability, setAvailability] = useState([]);
  const [selectedDate, setSelectedDate] = useState(new Date());
  
  useEffect(() => {
    fetchAvailability();
  }, [selectedDate, closerId]);
  
  const fetchAvailability = async () => {
    const { data, error } = await supabase
      .rpc('get_closer_availability', {
        p_closer_id: closerId,
        p_date: selectedDate.toISOString().split('T')[0]
      });
    
    if (data) setAvailability(data);
  };
  
  const handleSlotClick = (slot) => {
    if (slot.is_available) {
      onSlotSelect({
        date: selectedDate,
        start_time: slot.slot_start,
        end_time: slot.slot_end
      });
    }
  };
  
  return (
    <div className="calendar-container">
      {/* Renderizar calendário aqui */}
      {availability.map(slot => (
        <button
          key={slot.slot_start}
          onClick={() => handleSlotClick(slot)}
          disabled={!slot.is_available}
          className={slot.is_available ? 'available' : 'unavailable'}
        >
          {slot.slot_start} - {slot.slot_end}
        </button>
      ))}
    </div>
  );
}
```

## 📝 Próximos Passos

1. **Frontend**
   - [ ] Criar componente de calendário
   - [ ] Implementar modal de agendamento
   - [ ] Adicionar visualização de agenda do closer
   - [ ] Dashboard de métricas

2. **Notificações**
   - [ ] Email de confirmação
   - [ ] SMS de lembrete
   - [ ] Notificação push

3. **Integrações**
   - [ ] Google Calendar
   - [ ] Zoom/Google Meet para videochamadas
   - [ ] WhatsApp para lembretes

4. **Relatórios**
   - [ ] Taxa de comparecimento
   - [ ] Taxa de conversão por closer
   - [ ] Horários mais produtivos
   - [ ] Análise de cancelamentos

## 🔍 Troubleshooting

### Erro: "table does not exist"
- Execute o SQL completo no Supabase Dashboard
- Aguarde alguns segundos para o cache atualizar
- Recarregue a página do Dashboard

### Erro: "schema cache"
- Vá em Settings > API no Supabase Dashboard
- Clique em "Reload Schema Cache"
- Aguarde 30 segundos

### Erro: "permission denied"
- Verifique se as políticas RLS estão configuradas
- Use a service_role_key para operações administrativas

## 📞 Suporte

Para dúvidas ou problemas:
1. Verifique os logs no Supabase Dashboard > Logs
2. Teste as funções diretamente no SQL Editor
3. Verifique as permissões e políticas RLS