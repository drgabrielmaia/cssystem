'use client'

import { useState } from 'react'
import { createClient } from '@/lib/supabase'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'

const completeDataUpdates = [
  { email: 'anapaula-albino@hotmail.com', nome_completo: 'Ana paula albino guedes', telefone: '(73) 99950-5926', cpf: '099.309.956-41', endereco: 'Rua dos Oitis, 14, Residencial Terras da Bahia, Teixeira de Freitas, BA, 45995-352' },
  { email: 'guilhermecezarsoares@gmail.com', nome_completo: 'Guilherme cezar soares', telefone: '(83) 99874-1008', cpf: '039.007.374-10', endereco: 'Rua Martins Júnior, 387, Liberdade, Campina Grande, PB, 58414-055' },
  { email: 'lti_9@hotmail.com', nome_completo: 'Lorena torrico iriarte', telefone: '(11) 99441-0048', cpf: '554.813.022-68', endereco: 'Rua Priscila Ferreira de Sousa Biondo, 149, Parque dos Príncipes, São Paulo, SP, 05396-080' },
  { email: 'sandrapossmoser30@hotmail.com', nome_completo: 'Sandra de Souza Anadao Possmoser', telefone: '(69) 99315-0528', cpf: '007.151.602-65', endereco: 'Avenida capitao Silvio Gonçalves de Farias, 966, Bela floresta, Ouro Preto do Oeste, RO, 76920-000' },
  { email: 'darlancorreia@gmail.com', nome_completo: 'Darlan Correia do Carmo', telefone: '(82) 99976-1294', cpf: '064.370.204-07', endereco: 'Rua Francisco Alexandre, 200, Baixa Grande, Arapiraca, AL, 57307-220' },
  { email: 'guimiranzi@hotmail.com', nome_completo: 'Guilherme Miranzi de Almeida Martins da Costa', telefone: '(88) 99961-4918', cpf: '071.014.056-81', endereco: 'Rua Metilde Ferreira, 800, Planalto, Juazeiro do Norte, CE, 63047-120' },
  { email: 'deboranardy@yahoo.com.br', nome_completo: 'Debora camargo nardy de freitas salgado', telefone: '(14) 99656-2889', cpf: '289.528.178-50', endereco: 'Rua Goiás, 344, Pinheiro Machado, Avaré, SP, 18705-400' },
  { email: 'thaiscsmadeira@gmail.com', nome_completo: 'THAIS CHRISTINA SOUSA MADEIRA', telefone: '(41) 99274-1585', cpf: '026.303.743-60', endereco: 'Rua Coronel Joaquim Ignácio Taborda Ribas, 727, Bigorrilho, Curitiba, PR, 80730-330' },
  { email: 'marcelafilgueiras@gmail.com', nome_completo: 'Marcela Filgueiras Mendes Vilhena', telefone: '(12) 98131-7348', cpf: '052.385.096-42', endereco: 'Avenida Renno junior, 338, Medicina, Itajubá, Mg, 27502-128' },
  { email: 'larissa.luana.matias@hotmail.com', nome_completo: 'Larissa Luana Castro Matias', telefone: '(69) 99371-1649', cpf: '022.341.922-26', endereco: 'Theodoro Bischoff, 333333333The333, Bom pastor, Igrejinha, RsRS, 95650-000' },
  { email: 'mapineze@hotmail.com', nome_completo: 'Mariana Alves Pineze', telefone: '(18) 98166-5824', cpf: '369.034.668-19', endereco: 'Rua Amparo, 214 ap 64, Baeta Neves, São Bernardo do Campo, SP, 09751-350' },
  { email: 'jsztajn@gmail.com', nome_completo: 'Jessica Sztajn Bittencourt', telefone: '(21) 98014-7679', cpf: '118.311.437-04', endereco: 'Rua do Guriri, 2090, Peró, Cabo Frio, RJ, 28922-370' },
  { email: 'mrodriguesfurtado@icloud.com', nome_completo: 'Michel Rodrigues Furtado', telefone: '(34) 99111-5064', cpf: '100.300.636-12', endereco: 'Rua Vereador Clêinio Carvalho, 142, Alto dos Caiçaras, Patos de Minas, MG, 38702-209' },
  { email: '123.lc96@gmail.com', nome_completo: 'LIDIANE CRISTINA DOS SANTOS', telefone: '(81) 97904-3363', cpf: '724.384.522-34', endereco: 'José Leitão de Melo, 304, Rodoviária, Macaparana, PE, 55865-000' },
  { email: 'caroline.dutrac@hotmail.com', nome_completo: 'Caroline dutra da costa', telefone: '(21) 97956-3715', cpf: '155.111.267-13', endereco: 'Rua Jorge de Oliveira, 111 apt 201, Jardim Guanabara, Rio de Janeiro, RJ, 21941-030' },
  { email: 'carine-marinho@hotmail.com', nome_completo: 'Carine Marinho Dutra Vilarindo', telefone: '(98) 99175-2136', cpf: '017.024.493-86', endereco: 'Rua Parnarama, 13, Parque Pindorama, São Luís, MA, 65041-174' },
  { email: 'rogeriod.l.r1989@gmail.com', nome_completo: 'Rogério de lima Rogério', telefone: '(55) 99710-7867', cpf: '958.721.322-04', endereco: 'Goiás, 830, Centro, Irineópolis, SC, 89440-000' },
  { email: 'dra.andrea_santos@hotmail.com', nome_completo: 'Andréa Silva dos Santos', telefone: '(11) 98156-0597', cpf: '300.473.478-80', endereco: 'Avenida Bartholomeu de Carlos, 901, Jardim Flor da Montanha, Guarulhos, SPSP, 07097-420' },
  { email: 'andressa.fbaf@hotmail.com', nome_completo: 'Andressa Fernanda Biscaino de Alcântara Ferreira', telefone: '(18) 98163-6695', cpf: '404.701.408-79', endereco: 'Rua Paulo Valdivino Pereira, 74, Rotta do Sol, Presidente Prudente, SP, 19072-044' },
  { email: 'amandapinheiro3112@gmail.com', nome_completo: 'Amanda Pinheiro Santos', telefone: '(21) 99923-5880', cpf: '042.450.527-40', endereco: 'Rua Silvia Pozzano, 2820, bl 1/802, Recreio dos Bandeirantes, Rio de Janeiro, RJ, 22790-671' },
  { email: 'nathaliaprezoutto@hotmail.com', nome_completo: 'Nathalia Prezoutto Venancio Rodrigues', telefone: '(15) 99661-7028', cpf: '400.842.188-27', endereco: 'Rua Antônio Roberto Munhoz Soares, 190, Jardim Fogaça, Itapetininga, SP, 18202-270' },
  { email: 'dr.felipecarega@gmail.com', nome_completo: 'Felipe Ferreira Carega', telefone: '(21) 98344-2827', cpf: '057.989.795-80', endereco: 'Rua Aroazes, 200 - APT 302, Barra Olímpica, Rio de Janeiro, RJ, 22775-060' },
  { email: 'alyssonkeys91@gmail.com', nome_completo: 'Aluno teste', telefone: '(88) 88888-8888', cpf: '999.999.999-99', endereco: 'Rua jose, 145, asas, Sapé, PB, 58340-000' },
  { email: 'deborarxt@gmail.com', nome_completo: 'Débora de Souza Ferreira', telefone: '(73) 98162-2640', cpf: '052.110.151-42', endereco: 'Rua Wilton Pimenta, 45, Caixa D\'Água, Jequié, BA, 45203-424' },
  { email: 'fernandasspinto96@gmail.com', nome_completo: 'Fernanda Silva da Silveira Pinto', telefone: '(71) 99117-9334', cpf: '859.902.095-17', endereco: 'Alameda Marine, 70, Costa Azul, Salvador, BA, 41760-037' },
  { email: 'kristiansolartdefreitas@gmail.com', nome_completo: 'KRISTIAN SOLART DE FREITAS', telefone: '(92) 99999-0837', cpf: '968.225.032-34', endereco: 'Rua Joviânia, 442, Novo Aleixo, Manaus, AM, 69098-154' },
  { email: 'drvieiramarcelo10@gmail.com', nome_completo: 'Marcelo Vieira de Sousa', telefone: '(83) 99887-3565', cpf: '087.454.434-32', endereco: 'Avenida Maria Rosa, 379, Manaíra, João Pessoa, PB, 58038-461' },
  { email: 'eduardo_brusiquese@hotmail.com', nome_completo: 'Eduardo Brusiquesi Martins', telefone: '(35) 99114-1615', cpf: '122.536.876-69', endereco: 'Monsenhor Silvio Puntel, 230, Morada do sol, Cássia, MG, 37980-000' },
  { email: 'brunoangelo06@hotmail.com', nome_completo: 'Bruno Angelo Silva', telefone: '(77) 99818-3228', cpf: '072.739.905-58', endereco: 'Rua Jose Alencar Gomes da Silva, apto 403 C, 308, Jardim Paraíso, Luís Eduardo Magalhães, BA, 47855-782' },
  { email: 'testenovoaluno@gmail.com', nome_completo: 'Alyson Paiva de Souza', telefone: '(88) 88888-8888', cpf: '099.999.999-99', endereco: 'Rua Iolanda Eloy de Medeiros, 564654, cccc, Sapé, PB, 58340-000' },
  { email: 'segundogutemberg@gmail.com', nome_completo: 'Gutemberg de Sousa Dantas Segundo', telefone: '(83) 99655-3588', cpf: '085.895.704-36', endereco: 'Avenida Cabo Branco, 3182, Cabo Branco, João Pessoa, PB, 58045-010' },
  { email: 'brunaevellyn@icloud.com', nome_completo: 'Bruna Evellyn Freitas de Oliveira', telefone: '(31) 99727-7543', cpf: '150.598.857-80', endereco: 'Rua Hilton Rodrigues, 122, Pituba, Salvador, BA, 41830-630' },
  { email: 'tonjeferson@gmail.com', nome_completo: 'Ton Jeferson da cunha Carvalho', telefone: '(71) 99185-4185', cpf: '016.526.225-78', endereco: 'Rua Júlio Rodrigues, 224, Pituaçu, Salvador, BA, 41741-439' },
  { email: 'ivonildesmelo@hotmail.com', nome_completo: 'Ivonildes Fernandes de Melo Neta', telefone: '(75) 99985-7290', cpf: '046.142.191-79', endereco: 'Avenida Cardeal da Silva, 1825, Rio Vermelho, Salvador, BA, 41950-495' },
  { email: 'bawec@hotmail.com', nome_completo: 'Bernardo Alencar Wanderley Estanislau da Costa', telefone: '(22) 98857-6934', cpf: '140.762.117-31', endereco: 'Rua Tupi, 201, Bananeiras (Iguabinha), Araruama, RJ, 28971-796' },
  { email: 'thiagopgrio@gmail.com', nome_completo: 'Thiago Pereira Guimarães', telefone: '(21) 97587-8735', cpf: '057.605.657-02', endereco: 'Avenida Hildebrando de Araújo Góes, 55, Barra da Tijuca, Rio de Janeiro, RJ, 22793-250' },
  { email: 'diogotelex1@gmail.com', nome_completo: 'Diogo machado amaral', telefone: '(11) 93077-9986', cpf: '359.724.718-09', endereco: 'Rua Manoel de Abreu, 620, Vila Santa Margarida, Ferraz de Vasconcelos, SP, 08543-350' },
  { email: 'aninhallacerda@hotmail.com', nome_completo: 'Ana Luiza Lacerda Mari', telefone: '(31) 99195-9788', cpf: '129.047.666-77', endereco: 'Praca dona carmem, 70, Jardim Maily, Piúma, ES, 29285-000' },
  { email: 'xaviermwind@gmail.com', nome_completo: 'Gustavo Henrique Xavier Denuncio', telefone: '(11) 97585-8764', cpf: '397.744.888-90', endereco: 'Rua Antonieta Leitão, 293, Nossa Senhora do Ó, São Paulo, SP, 02925-160' },
  { email: 'drleonardomoraescir@gmail.com', nome_completo: 'Leonardo Moraes', telefone: '(83) 98741-3988', cpf: '700.826.554-99', endereco: 'Avenida General Edson Ramalho, 1777, Manaíra, João Pessoa, PB, 58038-102' },
  { email: 'rebecamendes12@gmail.com', nome_completo: 'Rebeca Mendes Preres', telefone: '(61) 98515-0019', cpf: '117.927.496-27', endereco: 'Quadra 1 Conjunto 14, 330, Setor Habitacional Vicente Pires - Trecho 1, Brasília, DF, 72005-131' },
  { email: 'rubens.ws@gmail.com', nome_completo: 'Rubens cleyton da silva mendes', telefone: '(31) 99363-3295', cpf: '013.315.636-23', endereco: 'Rua Cristal, 135, São Joaquim, Contagem, MG, 32113-080' },
  { email: 'marcelomaricastro@gmail.com', nome_completo: 'MARCELO MARI DE CASTRO', telefone: '(31) 99624-7674', cpf: '857.982.156-87', endereco: 'Praça Dona Carmem, 70, Jardim Maily, Piúma, ES, 29285-000' },
  { email: 'jpgpena2014@gmail.com', nome_completo: 'João Paulo Guimarães Pena', telefone: '(83) 98198-4142', cpf: '689.781.112-20', endereco: 'Avenida Ingá, 613, Manaíra, João Pessoa, PB, 58038-251' },
  { email: 'ali.roman.kerdy@gmail.com', nome_completo: 'Ali Rena Roman KERDY', telefone: '(81) 99143-7563', cpf: '700.148.802-02', endereco: 'Major Tomás, 340, Centro, Cachoeirinha, PE, 55380-000' },
  { email: 'kari.ferreira@yahoo.com.br', nome_completo: 'Karina dos Santos Rocha Ferreira', telefone: '(11) 98357-4130', cpf: '302.013.078-63', endereco: 'Rua Vergueiro, 2986 ap.112, Vila Mariana, São Paulo, SP, 04102-001' },
  { email: 'jhordan.gv@hotmail.com', nome_completo: 'Jhordan Soares de Moura', telefone: '(33) 99196-4631', cpf: '121.284.756-35', endereco: 'Theodoro bischoff, 333333The, Bom pastor, Igrejinha, RsRS, 95650-000' },
  { email: 'rafaelfariagil@gmail.com', nome_completo: 'Rafael Faria Gil', telefone: '(11) 94710-0600', cpf: '220.482.618-92', endereco: 'Rua Rosa Barbieri Paiotti, 604, Urbanova, São José dos Campos, SP, 12244-050' },
  { email: 'taillanalmeida06@gmail.com', nome_completo: 'Taillan fernandes de almeida', telefone: '(83) 98783-0195', cpf: '083.271.844-07', endereco: 'Rua getulio vargas, 108, Centro, Coremas, PB, 58770-000' },
  { email: 'remedgarcia@outlook.com', nome_completo: 'Renan Alves Garcia', telefone: '(21) 97592-8919', cpf: '129.115.836-71', endereco: 'Rua Zulmira Mendes, 901, Braga, Cabo Frio, RJ, 28908-105' },
  { email: 'thiago.codarin@hotmail.com', nome_completo: 'thiago medina', telefone: '(11) 98286-2830', cpf: '350.247.278-51', endereco: 'Rua Iamí, 171, Residencial Ibi-Aram II, Itupeva, SP, 13299-404' },
  { email: 'camilateixeiraav@hotmail.com', nome_completo: 'Camila Teixeira Amaro Vieira', telefone: '(83) 98110-0074', cpf: '049.349.503-70', endereco: 'Rua antonio Mano de Carvalho, 578, Brasilia, Senador Pompeu, CE, 63600-000' },
  { email: 'thatasc@hotmail.com', nome_completo: 'Thaisa Suckow Custodio', telefone: '(24) 99924-6066', cpf: '149.869.827-10', endereco: 'Rua Doutor Ricardo Bartelega, 247, Atlântica, Rio das Ostras, RjRJ, 28895-679' },
  { email: 'natyfernds@gmail.com', nome_completo: 'Natália Fernandes Ribeiro', telefone: '(83) 98186-1555', cpf: '705.191.234-84', endereco: 'Rua Geraldo Costa, 420, Manaíra, João Pessoa, PB, 58038-130' },
  { email: 'rasorafa@gmail.com', nome_completo: 'Rafael Franco Raso', telefone: '(31) 99284-0465', cpf: '014.308.596-44', endereco: 'Rua Sabino Barroso, 95, Cruzeiro, Belo Horizonte, MG, 30310-200' },
  { email: 'thais_zavan@yahoo.com.br', nome_completo: 'Thais Favaro Zavan', telefone: '(41) 98408-4572', cpf: '066.242.089-61', endereco: 'Rua Vicente Ciccarino, 307, Boa Vista, Curitiba, PR, 82540-120' },
  { email: 'j-cury0806@hotmail.com', nome_completo: 'Jeany Das Graças Cury Santos', telefone: '(37) 99838-8360', cpf: '081.850.666-04', endereco: 'Rui Barbosa Apto 501, 25, Centro, Carmo do Cajuru, MG, 35557-000' },
  { email: 'marcussardinha67@gmail.com', nome_completo: 'Marcus Da Silva Sardinha', telefone: '(11) 96645-4306', cpf: '060.892.121-13', endereco: 'Rua Maratona, 199, Vila Alexandria, São Paulo, SP, 04635-041' },
  { email: 'lilian.cirurgia@hotmail.com', nome_completo: 'Lilian Martins Lacerda', telefone: '(64) 98406-8101', cpf: '664.470.621-53', endereco: 'Rua C, 626, Parque Solar do Agreste B, Rio Verde, GO, 75907-160' },
  { email: 'raissacampelo@msn.com', nome_completo: 'Raissa Campelo Esteves Maranha', telefone: '(48) 99991-4074', cpf: '953.633.512-34', endereco: 'Rua Miguel Inácio Faraco, 665, Vila Moema, Tubarão, SC, 88705-050' },
  { email: 'rafaelmitzcun@gmail.com', nome_completo: 'Rafael Brito Mitzcu', telefone: '(83) 98763-9511', cpf: '005.900.319-45', endereco: 'Rua Cassimiro de Abreu, 300, Brisamar, João Pessoa, PB, 58033-330' },
  { email: 'dionlineborges19@gmail.com', nome_completo: 'Dionline Borges Paulo', telefone: '(86) 98123-9676', cpf: '001.991.716-370', endereco: 'Rua Anselmo Peretti, 2283, Parque Ideal, Teresina, PI, 64078-680' },
  { email: 'fernandamcpossani@hotmail.com', nome_completo: 'Fernanda Maria Carvalho Possani', telefone: '(35) 98876-5577', cpf: '786.293.226-91', endereco: 'Capitao cirilo, 475, Alto Alegre, Andradas, Mg, 37839-434' },
  { email: 'eduardo.martins@firmadeadvogados.com.br', nome_completo: 'Carlos Eduardo de Sousa Martins', telefone: '(61) 33577-971', cpf: '039.711.611-03', endereco: 'Quadra QR 408 Conjunto 11, 04, Samambaia Norte (Samambaia), Brasília, DF, 72318-312' },
  { email: 'draisabellagandrade@gmail.com', nome_completo: 'Isabella Gonçalves Andrade', telefone: '(62) 99641-1500', cpf: '042.431.461-44', endereco: 'Rua X 7 quadra x 12 lote 19, 19, Jardim Brasil, Goiânia, GO, 74730-390' },
  { email: 'jonas.netto@hotmail.com', nome_completo: 'Jonas Ferro da Silva Neto', telefone: '(62) 99609-5683', cpf: '701.691.841-61', endereco: 'Rua 239, 239, Setor Leste Universitário, Goiânia, GO, 74605-070' },
  { email: 'ma_mascaro@hotmail.com', nome_completo: 'Marcela Mascaro Fachini', telefone: '(17) 99609-8281', cpf: '221.912.368-55', endereco: 'Rua José da Silveira Baldy, 753, Jardim São Marco, São José do Rio Preto, SP, 15081-440' },
  { email: 'carolineberardi@hotmail.com', nome_completo: 'CAROLINE BERARDI CHAIBUB', telefone: '(11) 95310-1100', cpf: '409.312.638-08', endereco: 'Avenida Jamaris, 543, Planalto Paulista, São Paulo, SP, 04078-001' },
  { email: 'fioresenubia@gmail.com', nome_completo: 'Núbia Mesquita Fiorese', telefone: '(27) 99832-5503', cpf: '135.190.907-08', endereco: 'Avenida Santos Evangelista, 26, Jardim Camburi, Vitória, ES, 29092-090' },
  { email: 'kaueqs@hotmail.com', nome_completo: 'Kauê Queiroz de Seabra', telefone: '(83) 98888-0069', cpf: '102.588.154-00', endereco: 'Rua Vereador Gumercindo Barbosa Dunda, 308, Aeroclube, João Pessoa, PB, 58036-850' },
  { email: 'hayssa84@gmail.com', nome_completo: 'Hayssa Duarte dos Santos Oliveira', telefone: '(86) 98885-0866', cpf: '072.330.813-60', endereco: 'Rua Anfrísio Lobão, 2481, São Cristóvão, Teresina, PI, 64051-152' },
  { email: 'julia_rios22@hotmail.com', nome_completo: 'Julia Ranielly de Oliveira Rios', telefone: '(71) 99647-2203', cpf: '066.638.095-39', endereco: 'Dom Pedro ll, 571, Marista, Senhor do Bonfim, BA, 48970-000' },
  { email: 'pedroassuncaopaulo@gmail.com', nome_completo: 'PEDRO PAULO ASSUNÇÃO DA SILVA', telefone: '(99) 99149-8206', cpf: '062.552.873-51', endereco: 'Rua Josita Almeida, 240, Altiplano Cabo Branco, João Pessoa, PB, 58046-490' },
  { email: 'ewertonvignolli@gmail.com', nome_completo: 'Ewerton Vignolli Correa', telefone: '(28) 99904-1883', cpf: '111.673.877-59', endereco: 'Rua Raul Pompéia, 205, Copacabana, Rio de Janeiro, RJ, 22080-001' },
  { email: 'maricf1993@gmail.com', nome_completo: 'Mariana cardoso fernandes', telefone: '(38) 99812-5697', cpf: '060.405.265-05', endereco: 'Guilherme de castro, 179, Centro, Riacho de Santana, BA, 46470-000' },
  { email: 'rodrigozaqueo19@gmail.com', nome_completo: 'Rodrigo mendes zaqueo', telefone: '(83) 99908-1276', cpf: '035.042.521-38', endereco: 'Avenida Celso Garcia, 3335, Tatuapé, São Paulo, SP, 03064-000' },
  { email: 'nathmed@icloud.com', nome_completo: 'Nathalia Cavalcante Sales', telefone: '(83) 99820-8828', cpf: '075.830.864-77', endereco: 'Avenida Severino Massa Spinelli, 340, Tambaú, João Pessoa, PB, 58039-210' },
  { email: 'drglaycon@hotmail.com', nome_completo: 'Glaycon michels', telefone: '(48) 99141-0563', cpf: '715.648.379-04', endereco: 'Rua Deputado Walter Gomes, 580, Santo Antônio de Lisboa, Florianópolis, SC, 88050-500' },
  { email: 'drarenatateixeira@gmail.com', nome_completo: 'Renata Santos Teixeira', telefone: '(71) 98350-2688', cpf: '054.592.725-05', endereco: 'Rua Américo de Souza Gomes, 10, Saúde, Salvador, BA, 40045-030' },
  { email: 'emersonbljr2802@gmail.com', nome_completo: 'Emerson Barbosa de Lira Junior', telefone: '(11) 98678-4297', cpf: '148.532.734-25', endereco: 'Rua Praia de Itapoã, 64, Cuiá, João Pessoa, PB, 58077-008' },
  { email: 'lucfvil@gmail.com', nome_completo: 'LUCAS FERREIRA VILARINHO', telefone: '(62) 99938-2842', cpf: '010.060.591-56', endereco: 'Alameda das Rosas, 647, Setor Oeste, Goiânia, GO, 74110-060' },
  { email: 'beatrizvieiragurgel@gmail.com', nome_completo: 'Beatriz vieira Gurgel', telefone: '(67) 99244-3906', cpf: '047.080.441-60', endereco: 'Rua Ildefonso Stockler de França, 260, Novo Mundo, Curitiba, PR, 81020-040' },
  { email: 'aguinaldojsfilho@gmail.com', nome_completo: 'Aguinaldo José Soares Filho', telefone: '(63) 99920-6006', cpf: '030.710.931-36', endereco: 'Quadra ARSE 21 Alameda 3, 1, Plano Diretor Sul, Palmas, TO, 77020-502' }
]

export default function UpdateCompleteDataPage() {
  const [processing, setProcessing] = useState(false)
  const [results, setResults] = useState<{ email: string; status: 'success' | 'error' | 'not_found'; message?: string }[]>([])
  const [stats, setStats] = useState({ atualizados: 0, erros: 0, naoEncontrados: 0 })

  const atualizarDadosCompletos = async () => {
    setProcessing(true)
    setResults([])
    setStats({ atualizados: 0, erros: 0, naoEncontrados: 0 })

    const supabase = createClient()
    const newResults: typeof results = []
    let atualizados = 0, erros = 0, naoEncontrados = 0

    for (const { email, nome_completo, telefone, cpf, endereco } of completeDataUpdates) {
      try {
        const { data, error } = await supabase
          .from('mentorados')
          .update({
            nome_completo,
            telefone,
            cpf,
            endereco
          })
          .eq('email', email)
          .select()

        if (error) {
          newResults.push({ email, status: 'error', message: error.message })
          erros++
        } else if (data && data.length > 0) {
          newResults.push({ email, status: 'success' })
          atualizados++
        } else {
          newResults.push({ email, status: 'not_found' })
          naoEncontrados++
        }
      } catch (error) {
        newResults.push({ email, status: 'error', message: error instanceof Error ? error.message : 'Erro desconhecido' })
        erros++
      }

      setResults([...newResults])
      setStats({ atualizados, erros, naoEncontrados })
    }

    setProcessing(false)
  }

  return (
    <div className="p-6 max-w-6xl mx-auto">
      <Card className="mb-6">
        <CardHeader>
          <CardTitle>🔄 Atualização Completa dos Dados dos Mentorados</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex justify-between items-center">
            <div>
              <p className="text-gray-600 mb-4">
                Esta ferramenta irá atualizar informações completas (nome, telefone, CPF, endereço) de {completeDataUpdates.length} mentorados usando o email como chave.
              </p>

              {results.length > 0 && (
                <div className="flex gap-4 text-sm">
                  <span className="text-green-600">✅ Atualizados: {stats.atualizados}</span>
                  <span className="text-red-600">❌ Erros: {stats.erros}</span>
                  <span className="text-yellow-600">⚠️ Não encontrados: {stats.naoEncontrados}</span>
                </div>
              )}
            </div>

            <Button
              onClick={atualizarDadosCompletos}
              disabled={processing}
              className="min-w-[200px]"
            >
              {processing ? 'Processando...' : 'Iniciar Atualização'}
            </Button>
          </div>
        </CardContent>
      </Card>

      {results.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle>📊 Resultados da Atualização</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="max-h-96 overflow-y-auto">
              {results.map((result, index) => {
                const updateData = completeDataUpdates.find(u => u.email === result.email)
                return (
                  <div
                    key={index}
                    className={`p-3 border-l-4 mb-2 ${
                      result.status === 'success'
                        ? 'border-green-500 bg-green-50'
                        : result.status === 'error'
                        ? 'border-red-500 bg-red-50'
                        : 'border-yellow-500 bg-yellow-50'
                    }`}
                  >
                    <div className="flex justify-between items-start">
                      <div className="flex-1">
                        <p className="font-medium">{updateData?.nome_completo}</p>
                        <p className="text-sm text-gray-600">{result.email}</p>
                        {updateData && (
                          <div className="text-xs text-gray-500 mt-1">
                            <p>📞 {updateData.telefone}</p>
                            <p>🆔 {updateData.cpf}</p>
                            <p className="truncate">📍 {updateData.endereco}</p>
                          </div>
                        )}
                        {result.message && (
                          <p className="text-xs text-red-600 mt-1">{result.message}</p>
                        )}
                      </div>
                      <span className="text-sm ml-2">
                        {result.status === 'success' && '✅'}
                        {result.status === 'error' && '❌'}
                        {result.status === 'not_found' && '⚠️'}
                      </span>
                    </div>
                  </div>
                )
              })}
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  )
}