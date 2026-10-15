# JobPulse — Radar de oportunidades profissionais

O JobPulse reúne oportunidades de trabalho publicadas em fontes públicas, organiza os anúncios em um formato único e mantém o painel concentrado nas vagas das últimas 24 horas. A aplicação permite pesquisar por palavras-chave, área profissional, modalidade de trabalho e localização, além de destacar oportunidades identificadas recentemente.

As atualizações são feitas por consultas periódicas às fontes disponíveis. Quando novas vagas são encontradas, o servidor envia os dados aos navegadores conectados por meio de **Server-Sent Events (SSE)**, sem exigir que a página seja recarregada. A velocidade de atualização depende da frequência de publicação e dos limites de cada fonte.

## Funcionalidades

- Consulta de vagas em fontes públicas Arbeitnow e Remotive.
- Atualização periódica com tratamento independente de falhas por fonte.
- Atualização do painel por SSE.
- Padronização dos dados e prevenção de anúncios duplicados.
- Retenção de vagas por até 24 horas e limpeza de registros vencidos.
- Cópia local no navegador para preservar os resultados entre visitas.
- Filtros por área, modalidade, localização e palavras-chave.
- Destaque visual para vagas encontradas durante a sessão.
- Análise opcional de compatibilidade entre uma descrição profissional e os requisitos da vaga.
- Documentação interativa da API, verificação de saúde do serviço e testes automatizados.

A análise de compatibilidade funciona por correspondência de palavras-chave quando nenhuma chave de provedor de IA é configurada. Nesse caso, o sistema não apresenta o resultado como se tivesse sido produzido por inteligência artificial.

## Tecnologias

- **Interface:** React, TypeScript, Vite e Lucide.
- **API:** Python, FastAPI, Pydantic, HTTPX e asyncio.
- **Atualizações:** Server-Sent Events (SSE).
- **Testes e qualidade:** pytest, Ruff e GitHub Actions.
- **Hospedagem:** configuração inicial para Render.

## Organização do projeto

```text
jobpulse/
├── client/
│   ├── src/
│   │   ├── components/       # Componentes reutilizáveis da interface
│   │   ├── hooks/             # Estado, consulta e ciclo de atualização
│   │   ├── lib/               # Comunicação com a API e armazenamento local
│   │   ├── types/             # Tipos compartilhados da interface
│   │   ├── App.tsx
│   │   └── styles.css
│   ├── package.json
│   └── vite.config.ts
├── server/
│   ├── app/
│   │   ├── api/               # Rotas HTTP e fluxo de eventos
│   │   ├── core/              # Configurações da aplicação
│   │   ├── models/            # Modelos e validação dos dados
│   │   ├── services/          # Fontes, classificação, retenção e análise
│   │   └── main.py
│   ├── tests/                 # Testes automatizados
│   └── requirements.txt
├── .env.example
├── render.yaml
└── README.md
```

## Requisitos

- Python 3.12 ou superior.
- Node.js 22 (versão indicada em `.nvmrc`).
- npm.

## Executar localmente

### 1. Iniciar a API

Em um terminal:

```bash
cd server
python -m venv .venv
source .venv/bin/activate
pip install -r requirements.txt
uvicorn app.main:app --reload --port 8000
```

A API ficará disponível em `http://localhost:8000`. A documentação interativa estará em `http://localhost:8000/docs`.

### 2. Iniciar a interface

Em outro terminal:

```bash
cd client
npm install
npm run dev
```

Abra `http://localhost:5173` no navegador.

Para apontar a interface para outra URL de API, crie o arquivo `client/.env.local`:

```dotenv
VITE_API_URL=http://localhost:8000
```

## Rotas da API

| Método | Rota | Finalidade |
|---|---|---|
| `GET` | `/` | Informações básicas do serviço |
| `GET` | `/api/health` | Estado das fontes e horário da última sincronização |
| `GET` | `/api/jobs` | Lista de vagas em cache; aceita `q`, `category`, `workplace` e `location` |
| `POST` | `/api/refresh` | Solicita uma nova consulta às fontes |
| `GET` | `/api/events` | Envia atualizações por SSE aos navegadores conectados |
| `POST` | `/api/match` | Compara uma vaga com um resumo profissional informado pelo usuário |

Os valores usados internamente para as áreas são `technology`, `administrative`, `support`, `design`, `sales`, `marketing` e `other`. Para a modalidade, são usados `remote`, `hybrid`, `onsite` e `unknown`. A interface apresenta esses valores em português.

## Configuração

As variáveis da API estão documentadas em [`.env.example`](.env.example).

| Variável | Valor padrão | Descrição |
|---|---|---|
| `PORT` | `8000` | Porta definida pela plataforma de hospedagem |
| `CORS_ORIGINS` | `http://localhost:5173` | Endereços permitidos para acessar a API, separados por vírgula |
| `POLL_INTERVAL_SECONDS` | `180` | Intervalo entre consultas às fontes; o mínimo aplicado é 60 segundos |
| `CACHE_TTL_SECONDS` | `300` | Reservado para futuras extensões da política de cache |
| `JOB_RETENTION_HOURS` | `24` | Tempo máximo de retenção das vagas |
| `OPENAI_API_KEY` | Não definido | Habilita resumos opcionais com um modelo de linguagem compatível |
| `OPENAI_MODEL` | `gpt-4o-mini` | Nome do modelo usado quando a integração opcional está habilitada |
| `VITE_API_URL` | `http://localhost:8000` | Endereço da API incorporado durante a compilação da interface |

Para habilitar a análise com a API da OpenAI, configure `OPENAI_API_KEY` no ambiente do servidor. Nunca coloque credenciais em variáveis `VITE_*`, pois elas são expostas no pacote enviado ao navegador. Sem a chave, a aplicação utiliza correspondência de palavras-chave e informa essa limitação.

## Testes e verificações

### Backend

```bash
cd server
pip install -r requirements.txt
pytest -q
ruff check app tests
```

### Interface

```bash
cd client
npm install
npm run typecheck
npm run build
```

Os testes automatizados não dependem de acesso às fontes externas. Antes de publicar, também é importante verificar a integração com as APIs públicas no ambiente de hospedagem, pois serviços de terceiros podem alterar seus formatos, limites ou disponibilidade.

## Publicação gratuita com integração ao GitHub

A configuração inicial considera dois serviços no Render: um serviço web para a API e um site estático para a interface. Consulte as condições atuais do plano gratuito antes de publicar, pois limites, suspensão por inatividade e regras de uso podem mudar.

### API

- **Diretório raiz:** `server`
- **Ambiente:** Python
- **Comando de compilação:** `pip install -r requirements.txt`
- **Comando de inicialização:** `uvicorn app.main:app --host 0.0.0.0 --port $PORT`
- **Variáveis sugeridas:** `CORS_ORIGINS=https://SEU-FRONTEND.onrender.com`, `JOB_RETENTION_HOURS=24` e `POLL_INTERVAL_SECONDS=180`

### Interface estática

- **Diretório raiz:** `client`
- **Comando de compilação:** `npm install && npm run build`
- **Diretório publicado:** `dist`
- **Variável:** `VITE_API_URL=https://SUA-API.onrender.com`

Substitua os endereços de exemplo pelos endereços reais dos serviços. Configure `CORS_ORIGINS` com a origem exata da interface e publique novamente a API. Como `VITE_API_URL` é incorporada durante a compilação, alterações nessa variável exigem uma nova compilação da interface. Conecte os dois serviços ao repositório do GitHub e habilite a publicação automática a partir da branch principal.

## Decisões técnicas e limitações conhecidas

- **Cache em memória:** reiniciar a API limpa o cache. Instâncias diferentes não compartilham os dados. Para escalar, recomenda-se adicionar PostgreSQL para persistência e Redis para cache compartilhado, caso necessário.
- **Armazenamento no navegador:** o navegador mantém uma cópia local por até 24 horas, mas a API é a referência para os resultados atuais.
- **Data de publicação:** o horário depende dos dados fornecidos pela fonte. Se estiver ausente, a integração pode usar o horário da coleta, que não representa necessariamente a publicação original.
- **Classificação aproximada:** área profissional e modalidade são inferidas a partir dos metadados, título, etiquetas e descrição. Devem ser tratadas como filtros auxiliares, não como informações confirmadas.
- **Fontes externas:** Arbeitnow e Remotive são serviços de terceiros. O projeto não faz coleta automatizada do LinkedIn e não representa uma integração oficial com essa plataforma. Respeite os termos de uso de cada fonte.
- **Análise de compatibilidade:** o resultado é apenas um apoio à avaliação pessoal, não uma decisão de contratação nem uma garantia de adequação à vaga.
- **Cobertura e velocidade:** nenhuma fonte agregadora garante listar todas as oportunidades disponíveis ou detectar uma publicação no mesmo instante em que ela aparece no site de origem.

## Licença

Distribuído sob a licença MIT. Consulte o arquivo [`LICENSE`](LICENSE).
