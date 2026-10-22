# Darwin.AI

Chat com o Darwin, um professor de história virtual que responde perguntas sobre história usando a API da OpenAI.

## Como funciona

```
navegador (public/)  →  /api/chat (função Netlify)  →  OpenAI
```

A API key fica **só no servidor**, como variável de ambiente do Netlify. O navegador nunca vê a chave.
A função também fixa o prompt do Darwin, limita o histórico e o tamanho das mensagens e tem limite de requisições por IP.

## Estrutura

- `public/`: site estático (HTML, CSS, JS)
- `netlify/functions/chat.mjs`: proxy que chama a OpenAI com streaming
- `netlify.toml`: configuração do deploy

## Rodar localmente

1. Instale a [Netlify CLI](https://docs.netlify.com/cli/get-started/): `npm install -g netlify-cli`
2. Copie `.env.example` para `.env` e coloque sua chave em `OPENAI_API_KEY`.
3. Rode `netlify dev` e abra o endereço que aparecer (geralmente http://localhost:8888).

## Deploy no Netlify

1. No Netlify, **Add new site → Import an existing project** e escolha este repositório.
2. As configurações de build são lidas do `netlify.toml`, então não precisa preencher nada.
3. Em **Site configuration → Environment variables**, crie `OPENAI_API_KEY` com a sua chave.
   Opcional: `OPENAI_MODEL` para trocar o modelo (padrão: `gpt-4o-mini`).
4. Faça um novo deploy.

## Tecnologias

HTML, CSS e JavaScript puro, Netlify Functions, [marked](https://marked.js.org/) e [DOMPurify](https://github.com/cure53/DOMPurify).
