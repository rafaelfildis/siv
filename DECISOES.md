# Decisões técnicas

Registro do que foi escolhido e por quê. Cada entrada existe porque a decisão
não era óbvia ou porque reverter depois sairia caro.

---

## 1. Sem banco de dados nesta fase

**Decisão:** o dataset agregado é um JSON versionado no repositório, carregado
no build. Não há Postgres, PostGIS, Supabase nem ORM.

**Por quê:** a fonte tem 262 registros e 13 municípios. Subir Postgres com
PostGIS para isso adicionaria credenciais, migrations, latência de rede e um
serviço para manter, sem entregar nada que o JSON não entregue. A página sai
estática, carrega em 124 kB e não tem runtime para falhar.

**Quando reverter:** no dia em que os resultados oficiais do TSE entrarem. A
votação por seção da Bahia é da ordem de milhões de linhas e exige tabela fato
particionada, índices GIST e agregação materializada. A fronteira já está
preparada: `src/lib/tipos.ts` define o contrato dos dados e
`src/lib/consultas.ts` isola o acesso — trocar a origem do JSON por consultas
não toca nos componentes.

## 2. Malha municipal via geodata-br, não pela API do IBGE

**Decisão:** a malha vem de `tbrugz/geodata-br` (derivada da malha oficial do
IBGE), cacheada em `data/` e simplificada para `src/dados/malha-ba.json`.

**Por quê:** o ambiente de desenvolvimento tem `servicodados.ibge.gov.br`
bloqueado pela política de egresso. A malha do geodata-br traz os 417 municípios
com código IBGE de 7 dígitos, que é a chave canônica de que o sistema precisa.

**Quando reverter:** com o egresso liberado, basta trocar a URL em
`scripts/preparar-malha.ts` pela API oficial de malhas. O resto do pipeline não
muda, porque a chave já é o código IBGE.

## 3. Anonimato por construção, não por configuração

**Decisão:** o nome do profissional é lido pela ingestão e descartado antes de
qualquer escrita. Não existe coluna de nome em nenhum artefato persistido. Além
disso, municípios com menos de 3 respostas têm a distribuição por candidato
omitida.

**Por quê:** um filtro de aplicação pode ser contornado, esquecido num endpoint
novo ou desligado por engano. Uma coluna que não existe não vaza. O teste
`nunca deixa vazar nome de pessoa para o dataset` serializa a saída inteira e
falha se qualquer nome aparecer — o anonimato passa a ser uma propriedade
verificada a cada `npm test`, não uma promessa no README.

**Sobre o limiar de 3:** com 24 respostas estaduais concentradas em Salvador
(19) e Vitória da Conquista (4), um limiar de 5 apagaria Vitória da Conquista e
deixaria o painel com um município só. O 3 esconde os casos de 1 e 2 respostas,
que são os que identificam alguém de fato, e preserva a leitura. É configurável
por `--limiar` e o valor usado fica gravado no dataset e visível no rodapé do
painel.

## 4. Município como menor unidade, sem zona eleitoral

**Decisão:** a análise para no município.

**Por quê:** determinação da coordenação para esta fase, e coerente com a base —
a planilha só tem município. Vale registrar, para quando a zona voltar à pauta:
**o TSE não publica polígono de zona eleitoral e o IBGE não tem essa malha.**
A geometria da zona precisa ser derivada — dissolve dos municípios onde a zona
cobre municípios inteiros, e Voronoi dos locais de votação georreferenciados
recortado pelo limite municipal onde há várias zonas num mesmo município
(Salvador, Feira de Santana, Camaçari). Não é um `import` — é trabalho de
geoprocessamento a ser orçado.

## 5. Mapa sem basemap externo

**Decisão:** MapLibre com `style: { version: 8, sources: {}, layers: [] }` e
apenas a camada de municípios. Nenhum tile raster de fundo.

**Por quê:** sem chave de API, sem custo por carregamento, sem dependência de
terceiro no caminho crítico e sem requisição externa saindo de um painel que
trata dado sensível. Para um mapa temático estadual, o contorno municipal já dá
toda a referência geográfica necessária — o basemap só competiria com o dado.

**Detalhe de implementação:** a fonte GeoJSON usa `promoteId: "cod_ibge"`. Sem
isso `setFeatureState` não encontra a feição e o mapa nunca pinta — falha
silenciosa, sem erro no console.

## 6. Paleta validada, não escolhida a olho

**Decisão:** Fabíola Mansur em `#1baf7a`, Jorge Solla em `#2a78d6`, Lucas Reis
em `#eda100`, "Não sei" em cinza neutro.

**Por quê:** as matizes reproduzem as cores que a equipe já usa na planilha
(verde, azul, amarelo) — trocar o código de cor confundiria quem lê a base há
semanas. Mas os passos foram ajustados e validados: a tripla passa na banda de
luminosidade, no piso de croma, na separação para daltonismo (ΔE 9,1 no pior par
sob protanopia) e no piso de visão normal (ΔE 22,9), com todos os pares em jogo.

O contraste contra o fundo branco fica abaixo de 3:1, o que obriga reforço: toda
barra tem rótulo e número diretos, e a tabela de municípios no rodapé traz em
número tudo o que o mapa diz em cor. Identidade nunca depende só da cor.

**Rampa do mapa:** matiz única, clara para escura, cinco passos. Quando um
candidato é filtrado, a rampa assume a cor dele; sem filtro, usa o azul-marinho
institucional. Nunca arco-íris.

## 7. Zod com objeto explícito em vez de `z.record`

**Decisão:** os campos por cargo são `z.object({ estadual, federal })`, não
`z.record(z.enum(CARGOS), …)`.

**Por quê:** o `record` do Zod 3 infere `Partial<Record<Cargo, T>>`. Um total de
votos com tipo "possivelmente indefinido" espalha `?? 0` por todo o painel — e
`?? 0` num número eleitoral é exatamente como um erro silencioso entra.

## 8. Identidade visual herdada do portal SISD

**Decisão:** azul-marinho `#0a1b33` no cabeçalho, teal `#0e9c95` de destaque,
superfície clara nos cartões.

**Por quê:** o SIV é lido pelas mesmas pessoas que usam o portal de gestão do
SISD. Reaproveitar a paleta faz o painel ser reconhecido como parte da família
em vez de ferramenta avulsa. Superfície clara, e não escura, porque o uso
previsto inclui campo, sob luz do dia.

## 9. Sem autenticação, com mitigação e ressalva

**Decisão:** o painel roda aberto, por determinação da coordenação. Foram
adicionados `X-Robots-Tag: noindex, nofollow, noarchive`, `Referrer-Policy:
no-referrer` e `X-Content-Type-Options: nosniff`.

**Por quê da ressalva:** `noindex` mantém o painel fora dos buscadores, mas não
o protege — quem tiver o link vê tudo. Como o TSE está fora de escopo nesta
fase, **todo o conteúdo do painel é dado interno da campanha**. O risco é da
coordenação e está documentado; a mitigação de menor custo, se e quando quiserem,
é uma senha única no middleware, sem cadastro de usuários.
