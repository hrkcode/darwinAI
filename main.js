const apiKeyPromise = fetch('.env')
    .then(response => response.text())
    .then(data => {
        const apiKeyLine = data.split('\n').find(line => line.startsWith('API_KEY='));
        return apiKeyLine?.split('=')[1]?.trim();
    });

const conversationHistory = [
    { role: "system", content: "Você é Darwin, um professor de história didático e paciente. Responda apenas perguntas relacionadas à história. Se a pergunta fugir do tema, explique educadamente que só pode responder assuntos históricos. Use linguagem clara para estudantes." }
];

const historic = document.getElementById("historic");
const messageForm = document.getElementById('message-form');
const messageInput = document.getElementById('message-input');
const btnSubmit = document.getElementById('btn-submit');
const btnClear = document.getElementById('btn-clear');

function scrollHistoricToBottom(){
    historic.scrollTop = historic.scrollHeight;
}

function addMessage(message, className){
    const paragraph = document.createElement('p');

    paragraph.className = className;
    paragraph.textContent = message;
    historic.appendChild(paragraph);
    scrollHistoricToBottom();

    return paragraph;
}

async function sendMessage(){
    const userMessage = messageInput.value.trim();

    if(!userMessage){
        messageInput.focus();
        return;
    }

    addMessage(userMessage, 'my-message');
    messageInput.value = '';

    conversationHistory.push({ role: "user", content: userMessage });

    let loadingMessage = null;

    try {
        btnSubmit.disabled = true;
        messageInput.disabled = true;
        loadingMessage = addMessage('Darwin está pensando...', 'chat-message');

        const apiKey = await apiKeyPromise;

        if(!apiKey){
            throw new Error('API key não encontrada.');
        }

        const response = await fetch('https://api.openai.com/v1/chat/completions', {
            method: 'POST',
            headers: {
                accept: "application/json",
                'content-type': "application/json",
                Authorization: `Bearer ${apiKey}`
            },
            body: JSON.stringify({
                model: 'gpt-3.5-turbo',
                messages: conversationHistory
            })
        });

        const data = await response.json();

        if(!response.ok){
            throw new Error(data.error?.message || 'Erro ao obter resposta da API.');
        }

        const getAnswer = data.choices?.[0]?.message?.content;

        if(!getAnswer){
            throw new Error('A API não retornou uma resposta válida.');
        }

        conversationHistory.push({ role: "assistant", content: getAnswer });

        loadingMessage.remove();
        addMessage(getAnswer, 'chat-message');
    } catch(e) {
        if(loadingMessage){
            loadingMessage.remove();
        }

        addMessage(`Erro: ${e.message}`, 'chat-message');
    } finally {
        btnSubmit.disabled = false
        messageInput.disabled = false
        messageInput.focus();
    }
}

function clearConversation(){
    historic.innerHTML = '';
    conversationHistory.splice(1);
    messageInput.value = '';
    messageInput.focus();
}

messageForm.addEventListener('submit', (event) => {
    event.preventDefault();
    sendMessage();
});

btnClear.addEventListener('click', clearConversation);
