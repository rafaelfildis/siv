# SIV — Sistema de Intenção de Voto

Painel interno de inteligência eleitoral. Mostra, sobre o mapa da Bahia, onde a
campanha já tem intenção de voto declarada, onde tem equipe mas ainda não ouviu
ninguém, e o quanto do mapeamento ainda falta cobrir.

**Não é uma ferramenta pública.** É um painel de coordenação.

---

## Estado atual

Esta é a Fase 1, com uma restrição deliberada de escopo: **a única fonte de
dados é a planilha interna de mapeamento**. Nada é puxado do TSE, e a análise
para no nível de **município** — sem zona eleitoral, sem seção.

| Recurso | Situação |
|---|---|
| Ingestão da planilha, idempotente e validada | pronto |
| Agregação por município, anônima | pronto |
| Mapa coroplético dos 417 municípios, com 6 camadas | pronto |
| Diagnóstico territorial e atenção operacional | pronto |
| Ranking, tabela ordenável e drawer por município | pronto |
| Busca de município com zoom | pronto |
| Resultados oficiais do TSE | fora do escopo desta fase |
| Zona e seção eleitoral | fora do escopo desta fase |
| Autenticação e perfis de acesso | fora do escopo desta fase |

## Como rodar

```bash
npm install
npm run malha      # baixa e simplifica a malha municipal da Bahia
npm run ingerir    # lê data/MAPEAMENTO.xlsx e gera o agregado anônimo
npm run dev        # http://localhost:3000
```

A planilha precisa estar em `data/MAPEAMENTO.xlsx`. Alternativamente:

```bash
npm run ingerir -- --arquivo=/caminho/para/MAPEAMENTO.xlsx
npm run ingerir -- --url="https://docs.google.com/spreadsheets/d/<ID>/export?format=xlsx"
npm run ingerir -- --limiar=5     # aumenta o limiar de supressão
npm run ingerir -- --forcar       # reprocessa mesmo arquivo já importado
```

A ingestão é **idempetente**: a chave é o sha256 do arquivo. Rodar duas vezes
sobre a mesma planilha não altera nada e não duplica registro no log de
importação (`src/dados/importacoes.json`).

### Testes

```bash
npm test
```

Cobrem o parser da planilha e os cálculos de agregação. Erro silencioso em
número eleitoral é o tipo de defeito que só aparece quando já custou uma
decisão — por isso a suíte inclui um teste de regressão para o caso das
linhas-âncora (abaixo).

## Deploy na Vercel

O projeto é a raiz do repositório; não há configuração especial. O dataset
agregado é versionado em `src/dados/dataset.json` e entra no bundle estático,
então **o build da Vercel não precisa da planilha nem de banco de dados**.

Para atualizar os números: rode `npm run ingerir` localmente, faça commit do
`src/dados/dataset.json` alterado e dê push. A Vercel reconstrói sozinha.

---

## Duas armadilhas da base que o código trata

**1. Linhas-âncora de filtro.** A planilha termina com três linhas marcadas
"LINHA DE REFERÊNCIA DO FILTRO — não é profissional". Elas existem só para
manter todas as opções visíveis nos filtros das colunas E e F, e carregam votos
de exemplo. Ingeridas ingenuamente, inflariam a apuração em 3 votos. A ingestão
as reconhece pelo marcador e as descarta antes de contar. Há teste para isso.

**2. Municípios fora da Bahia.** A coluna de município é preenchida à mão e
contém valores que não são municípios baianos ("Asia", "Brasília"). Eles
**continuam contados nos totais** — são pessoas reais da equipe — mas ficam de
fora do mapa e aparecem marcados como `fora da BA`. Nada é descartado em
silêncio; tudo vai para o log de importação.

Como conferência independente, os números gerados batem exatamente com a aba
"Painel" da própria planilha: 262 profissionais, 23 Fabíola Mansur + 1 "Não
sei" no estadual, 11 Lucas Reis + 9 Jorge Solla + 1 "Não sei" no federal.

---

## Privacidade e conformidade

### O que o sistema deliberadamente não faz

A planilha de origem vincula **nome de profissional** a **intenção de voto**.
Convicção política é dado pessoal **sensível** (LGPD, art. 5º, II), e o
tratamento de dado sensível exige consentimento específico e destacado
(art. 11, I).

O SIV foi construído para não depender disso:

- **O nome nunca chega ao disco.** A ingestão lê o nome apenas para contar e o
  descarta. Não existe coluna de nome, CPF ou identificador individual em
  `dataset.json` — nem em qualquer outro artefato versionado. Há teste
  automatizado que falha se um nome vazar para a saída.
- **A planilha não é versionada.** `data/*.xlsx` está no `.gitignore`. O arquivo
  fica na máquina de quem roda a ingestão; o repositório guarda só o agregado.
- **Supressão por baixa contagem.** Municípios com menos de 3 respostas têm a
  distribuição por candidato omitida. Sem isso, um município com uma resposta só
  revelaria o voto de uma pessoa que a equipe identifica de cabeça, mesmo com o
  nome ausente do banco. O limiar é configurável (`--limiar`).
- **Nem a mensagem de erro vaza.** Avisos de linha rejeitada citam o número da
  linha, nunca o conteúdo.

### Restrições legais aplicáveis

**Voto secreto — art. 14 da Constituição Federal.** Não existe e não deve
existir no sistema qualquer funcionalidade de identificação individual de voto.
Quando dados oficiais do TSE forem incorporados, a menor unidade legítima de
análise é a **seção eleitoral agregada**.

**LGPD — Lei 13.709/2018.** Antes de ampliar a coleta, a campanha precisa ter
registrado: base legal para cada tratamento, política de retenção, rotina de
exclusão a pedido do titular e minimização da coleta. Dado sensível coletado sem
consentimento específico e destacado não tem base legal — e o consentimento
precisa ser livre, o que é difícil de sustentar numa relação de trabalho.

**Lei 9.504/1997 e resoluções do TSE.** O art. 73 veda o uso de bens, serviços e
servidores públicos em benefício de campanha. Uma base de intenção de voto
organizada por núcleo e time dentro de estrutura pública é o padrão que o
Ministério Público do Trabalho enquadra como **assédio eleitoral**, sobretudo
quando há acompanhamento de "cobertura" por equipe. A agregação e a supressão
implementadas aqui reduzem o risco no produto, mas **não substituem a decisão de
como a coleta é conduzida**, que é da coordenação.

### Acesso

Por decisão da coordenação, o painel roda **sem autenticação** nesta fase. Como
mitigação, ele envia `X-Robots-Tag: noindex, nofollow, noarchive` e não expõe
nenhum dado individual — apenas agregados. Ainda assim: **qualquer pessoa com o
link vê o conteúdo.** Se a URL circular, os agregados de intenção de voto da
equipe circulam junto. Uma senha única de acesso é o próximo incremento natural.

---

## Estrutura

```
scripts/preparar-malha.ts   malha municipal da Bahia, simplificada
scripts/ingerir.ts          planilha -> agregado anônimo (idempotente)
src/lib/tipos.ts            schemas Zod; o contrato dos dados
src/lib/normalizacao.ts     casamento de nomes de município
src/lib/agregacao.ts        agregação e supressão por baixa contagem
src/lib/faixas.ts           faixas de base e de cobertura (configuráveis)
src/lib/camadas.ts          as 6 camadas do mapa e suas legendas
src/lib/consultas.ts        modelo derivado que alimenta todos os blocos
src/components/             header, KPIs, mapa, diagnóstico, ranking, tabela, drawer
src/dados/                  dataset agregado + malha + log de importação
```

## Regras de leitura que o código garante

O painel segue o handoff "SIV — Painel de Inteligência Territorial". Quatro
regras estão implementadas com teste, porque errar nelas produz leitura errada
de número eleitoral:

1. **Ausência de informação nunca tem a mesma cor que ausência de resposta.**
   Município sem equipe é cinza; município com equipe e zero respostas é âmbar.
   Há um teste que percorre as 6 camadas e falha se alguma pintar os dois igual.
2. **Município com 1 a 4 respostas não recebe cor cheia** na camada de intenção:
   recebe hachura e o rótulo "amostra pequena".
3. **Todo percentual aparece com o tamanho da amostra** ("50% · 4 de 8 respostas").
4. **Vermelho só marca problema operacional ou de qualidade de dado**, nunca
   baixo apoio político.

Ver `DECISOES.md` para as escolhas técnicas e seus motivos.
