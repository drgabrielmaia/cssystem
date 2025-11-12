'use client'

import { useState } from 'react'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { supabase } from '@/lib/supabase'
import { CheckCircle, AlertCircle, Loader2 } from 'lucide-react'

export default function SetupFormSystem() {
  const [status, setStatus] = useState('')
  const [loading, setLoading] = useState(false)
  const [completed, setCompleted] = useState(false)

  const executeSQL = async () => {
    setLoading(true)
    setStatus('Iniciando criação do sistema...')

    try {
      // 1. Criar tabela form_templates
      setStatus('Criando tabela form_templates...')
      const { error: error1 } = await supabase.rpc('execute_sql', {
        sql_query: `
          CREATE TABLE IF NOT EXISTS form_templates (
            id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
            name VARCHAR(255) NOT NULL,
            description TEXT,
            slug VARCHAR(100) UNIQUE NOT NULL,
            fields JSONB NOT NULL DEFAULT '[]',
            created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
            updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
          );
        `
      })

      if (error1) throw error1

      // 2. Criar índices para form_templates
      setStatus('Criando índices para form_templates...')
      await supabase.rpc('execute_sql', {
        sql_query: `
          CREATE INDEX IF NOT EXISTS idx_form_templates_slug ON form_templates(slug);
          CREATE INDEX IF NOT EXISTS idx_form_templates_created_at ON form_templates(created_at);
        `
      })

      // 3. Criar tabela form_submissions
      setStatus('Criando tabela form_submissions...')
      await supabase.rpc('execute_sql', {
        sql_query: `
          CREATE TABLE IF NOT EXISTS form_submissions (
            id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
            template_id UUID REFERENCES form_templates(id) ON DELETE CASCADE,
            template_slug VARCHAR(100) NOT NULL,
            lead_id UUID REFERENCES leads(id) ON DELETE SET NULL,
            source_url VARCHAR(500),
            submission_data JSONB NOT NULL DEFAULT '{}',
            ip_address INET,
            user_agent TEXT,
            created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
          );
        `
      })

      // 4. Criar índices para form_submissions
      setStatus('Criando índices para form_submissions...')
      await supabase.rpc('execute_sql', {
        sql_query: `
          CREATE INDEX IF NOT EXISTS idx_form_submissions_template_id ON form_submissions(template_id);
          CREATE INDEX IF NOT EXISTS idx_form_submissions_template_slug ON form_submissions(template_slug);
          CREATE INDEX IF NOT EXISTS idx_form_submissions_lead_id ON form_submissions(lead_id);
          CREATE INDEX IF NOT EXISTS idx_form_submissions_source_url ON form_submissions(source_url);
          CREATE INDEX IF NOT EXISTS idx_form_submissions_created_at ON form_submissions(created_at);
        `
      })

      // 5. Desabilitar RLS
      setStatus('Configurando permissões...')
      await supabase.rpc('execute_sql', {
        sql_query: `
          ALTER TABLE form_templates DISABLE ROW LEVEL SECURITY;
          ALTER TABLE form_submissions DISABLE ROW LEVEL SECURITY;
        `
      })

      // 6. Inserir template de exemplo
      setStatus('Inserindo template de exemplo (Mentoria)...')
      await supabase.rpc('execute_sql', {
        sql_query: `
          INSERT INTO form_templates (name, description, slug, fields) VALUES
          (
            'Formulário de Mentoria Médica',
            'Formulário para captura de leads interessados em mentoria para médicos',
            'mentoria',
            '[
              {
                "id": "field_1",
                "type": "text",
                "label": "Nome Completo",
                "name": "nome_completo",
                "required": true,
                "placeholder": "Digite seu nome completo",
                "mapToLead": "nome_completo"
              },
              {
                "id": "field_2",
                "type": "email",
                "label": "Email",
                "name": "email",
                "required": true,
                "placeholder": "seu@email.com",
                "mapToLead": "email"
              },
              {
                "id": "field_3",
                "type": "phone",
                "label": "Telefone/WhatsApp",
                "name": "telefone",
                "required": true,
                "placeholder": "(11) 99999-9999",
                "mapToLead": "telefone"
              },
              {
                "id": "field_4",
                "type": "text",
                "label": "CRM",
                "name": "crm",
                "required": false,
                "placeholder": "Ex: CRM/SP 123456"
              },
              {
                "id": "field_5",
                "type": "select",
                "label": "Especialidade",
                "name": "especialidade",
                "required": true,
                "options": ["Clínico Geral", "Cardiologia", "Dermatologia", "Ginecologia", "Pediatria", "Ortopedia", "Psiquiatria", "Outra"]
              },
              {
                "id": "field_6",
                "type": "radio",
                "label": "Tempo de formado",
                "name": "tempo_formado",
                "required": true,
                "options": ["Menos de 2 anos", "2-5 anos", "5-10 anos", "Mais de 10 anos"]
              },
              {
                "id": "field_7",
                "type": "textarea",
                "label": "Qual sua maior dificuldade no consultório?",
                "name": "maior_dificuldade",
                "required": false,
                "placeholder": "Ex: captação de pacientes, organização financeira, vendas..."
              },
              {
                "id": "field_8",
                "type": "radio",
                "label": "Principal interesse na mentoria",
                "name": "principal_interesse",
                "required": true,
                "options": ["Aumentar faturamento", "Organizar processos", "Marketing digital", "Gestão financeira", "Desenvolvimento pessoal"]
              }
            ]'::jsonb
          )
          ON CONFLICT (slug) DO NOTHING;
        `
      })

      setStatus('Sistema de formulários criado com sucesso! ✅')
      setCompleted(true)

    } catch (error: any) {
      console.error('Erro ao executar SQL:', error)
      setStatus(`Erro: ${error.message || 'Erro desconhecido'}`)
    } finally {
      setLoading(false)
    }
  }

  const executeAlternative = async () => {
    setLoading(true)
    setStatus('Executando método alternativo...')

    try {
      // Método alternativo: usar insert direto
      setStatus('Criando template de exemplo diretamente...')

      const { data, error } = await supabase
        .from('form_templates')
        .insert([{
          name: 'Formulário de Mentoria Médica',
          description: 'Formulário para captura de leads interessados em mentoria para médicos',
          slug: 'mentoria',
          fields: [
            {
              id: "field_1",
              type: "text",
              label: "Nome Completo",
              name: "nome_completo",
              required: true,
              placeholder: "Digite seu nome completo",
              mapToLead: "nome_completo"
            },
            {
              id: "field_2",
              type: "email",
              label: "Email",
              name: "email",
              required: true,
              placeholder: "seu@email.com",
              mapToLead: "email"
            },
            {
              id: "field_3",
              type: "phone",
              label: "Telefone/WhatsApp",
              name: "telefone",
              required: true,
              placeholder: "(11) 99999-9999",
              mapToLead: "telefone"
            },
            {
              id: "field_4",
              type: "text",
              label: "CRM",
              name: "crm",
              required: false,
              placeholder: "Ex: CRM/SP 123456"
            },
            {
              id: "field_5",
              type: "select",
              label: "Especialidade",
              name: "especialidade",
              required: true,
              options: ["Clínico Geral", "Cardiologia", "Dermatologia", "Ginecologia", "Pediatria", "Ortopedia", "Psiquiatria", "Outra"]
            },
            {
              id: "field_6",
              type: "radio",
              label: "Tempo de formado",
              name: "tempo_formado",
              required: true,
              options: ["Menos de 2 anos", "2-5 anos", "5-10 anos", "Mais de 10 anos"]
            },
            {
              id: "field_7",
              type: "textarea",
              label: "Qual sua maior dificuldade no consultório?",
              name: "maior_dificuldade",
              required: false,
              placeholder: "Ex: captação de pacientes, organização financeira, vendas..."
            },
            {
              id: "field_8",
              type: "radio",
              label: "Principal interesse na mentoria",
              name: "principal_interesse",
              required: true,
              options: ["Aumentar faturamento", "Organizar processos", "Marketing digital", "Gestão financeira", "Desenvolvimento pessoal"]
            }
          ]
        }])
        .select()

      if (error) {
        console.error('Erro ao inserir:', error)
        setStatus(`Erro: ${error.message}`)
      } else {
        setStatus('Template de mentoria criado com sucesso! ✅')
        setCompleted(true)
      }

    } catch (error: any) {
      console.error('Erro:', error)
      setStatus(`Erro: ${error.message || 'Erro desconhecido'}`)
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="container mx-auto p-6">
      <Card className="max-w-2xl mx-auto">
        <CardHeader>
          <CardTitle className="flex items-center space-x-2">
            <span>🛠️ Configuração do Sistema de Formulários</span>
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <p className="text-gray-600">
            Esta página executa o SQL necessário para criar o sistema de formulários personalizados.
          </p>

          <div className="space-y-3">
            <h3 className="font-semibold">O que será criado:</h3>
            <ul className="list-disc list-inside space-y-1 text-sm text-gray-600">
              <li>Tabela <code>form_templates</code> para armazenar templates</li>
              <li>Tabela <code>form_submissions</code> para respostas</li>
              <li>Índices para performance</li>
              <li>Template de exemplo "Mentoria Médica"</li>
            </ul>
          </div>

          <div className="flex space-x-4">
            <Button
              onClick={executeSQL}
              disabled={loading || completed}
              className="flex items-center space-x-2"
            >
              {loading ? (
                <Loader2 className="h-4 w-4 animate-spin" />
              ) : completed ? (
                <CheckCircle className="h-4 w-4" />
              ) : (
                <span>▶️</span>
              )}
              <span>Executar SQL Completo</span>
            </Button>

            <Button
              onClick={executeAlternative}
              disabled={loading}
              variant="outline"
              className="flex items-center space-x-2"
            >
              {loading ? (
                <Loader2 className="h-4 w-4 animate-spin" />
              ) : (
                <span>🔧</span>
              )}
              <span>Método Alternativo</span>
            </Button>
          </div>

          {status && (
            <Card className="mt-4">
              <CardContent className="p-4">
                <div className="flex items-center space-x-2">
                  {completed ? (
                    <CheckCircle className="h-5 w-5 text-green-500" />
                  ) : loading ? (
                    <Loader2 className="h-5 w-5 animate-spin text-blue-500" />
                  ) : (
                    <AlertCircle className="h-5 w-5 text-yellow-500" />
                  )}
                  <span className="font-mono text-sm">{status}</span>
                </div>
              </CardContent>
            </Card>
          )}

          {completed && (
            <div className="bg-green-50 border border-green-200 rounded-lg p-4">
              <h4 className="font-semibold text-green-800 mb-2">✅ Sistema configurado com sucesso!</h4>
              <p className="text-green-700 text-sm mb-3">
                Agora você pode:
              </p>
              <ul className="text-green-700 text-sm space-y-1">
                <li>• Acessar <strong>/form-builder</strong> para criar novos formulários</li>
                <li>• Visualizar o formulário de exemplo em <strong>/forms/mentoria</strong></li>
                <li>• URLs com parâmetros como <strong>?ref=instagram</strong> são rastreadas automaticamente</li>
                <li>• Dados são salvos automaticamente como leads</li>
              </ul>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  )
}