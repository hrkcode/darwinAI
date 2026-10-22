// Proxy entre o navegador e a OpenAI: a API key fica só aqui no servidor.

const SYSTEM_PROMPT = "Você é Darwin, um professor de história didático e paciente. Responda apenas perguntas relacionadas à história. Se a pergunta fugir do tema, explique educadamente que só pode responder assuntos históricos. Use linguagem clara para estudantes.";

const MAX_MESSAGES = 20;
const MAX_CHARS_PER_MESSAGE = 2000;

export default async (req) => {
    if(req.method !== 'POST'){
        return jsonError('Método não permitido.', 405);
    }

    const apiKey = process.env.OPENAI_API_KEY;

    if(!apiKey){
        return jsonError('API key não configurada no servidor.', 500);
    }

    let body;

    try {
        body = await req.json();
    } catch {
        return jsonError('Requisição inválida.', 400);
    }

    // Só aceita mensagens de usuário/assistente; o prompt do sistema é sempre o do servidor.
    const history = (Array.isArray(body?.messages) ? body.messages : [])
        .filter(m => (m?.role === 'user' || m?.role === 'assistant') && typeof m.content === 'string')
        .slice(-MAX_MESSAGES)
        .map(m => ({ role: m.role, content: m.content.slice(0, MAX_CHARS_PER_MESSAGE) }));

    if(history.at(-1)?.role !== 'user'){
        return jsonError('Nenhuma pergunta enviada.', 400);
    }

    const upstream = await fetch('https://api.openai.com/v1/chat/completions', {
        method: 'POST',
        headers: {
            'content-type': 'application/json',
            Authorization: `Bearer ${apiKey}`
        },
        body: JSON.stringify({
            model: process.env.OPENAI_MODEL || 'gpt-4o-mini',
            stream: true,
            max_completion_tokens: 1000,
            messages: [{ role: 'system', content: SYSTEM_PROMPT }, ...history]
        })
    });

    if(!upstream.ok){
        const data = await upstream.json().catch(() => ({}));
        console.error('Erro da OpenAI:', upstream.status, data.error?.message);
        return jsonError('Erro ao obter resposta da IA. Tente novamente.', 502);
    }

    const textStream = upstream.body
        .pipeThrough(new TextDecoderStream())
        .pipeThrough(sseToText())
        .pipeThrough(new TextEncoderStream());

    return new Response(textStream, {
        headers: {
            'content-type': 'text/plain; charset=utf-8',
            'cache-control': 'no-cache'
        }
    });
};

export const config = {
    path: '/api/chat',
    // Limita cada IP a 20 perguntas por minuto para evitar abuso da sua conta.
    rateLimit: {
        windowLimit: 20,
        windowSize: 60,
        aggregateBy: ['ip', 'domain']
    }
};

// Converte o stream SSE da OpenAI em texto puro, só com o conteúdo da resposta.
function sseToText(){
    let buffer = '';

    return new TransformStream({
        transform(chunk, controller){
            buffer += chunk;
            const lines = buffer.split('\n');
            buffer = lines.pop();

            for(const line of lines){
                if(!line.startsWith('data: ')) continue;

                const payload = line.slice(6).trim();
                if(payload === '[DONE]') continue;

                try {
                    const text = JSON.parse(payload).choices?.[0]?.delta?.content;
                    if(text) controller.enqueue(text);
                } catch {
                    // Linha incompleta ou malformada: ignora.
                }
            }
        }
    });
}

function jsonError(message, status){
    return Response.json({ error: message }, { status });
}
