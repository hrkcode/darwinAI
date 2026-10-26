const MAX_HISTORY = 20;

const conversationHistory = [];

const historic = document.getElementById("historic");
const messageForm = document.getElementById('message-form');
const messageInput = document.getElementById('message-input');
const btnSubmit = document.getElementById('btn-submit');
const btnClear = document.getElementById('btn-clear');

function scrollHistoricToBottom(){
    historic.scrollTop = historic.scrollHeight;
}

function addMessage(message, className){
    const bubble = document.createElement('div');

    bubble.className = `message ${className}`;
    bubble.textContent = message;
    historic.appendChild(bubble);
    scrollHistoricToBottom();

    return bubble;
}

function renderMarkdown(element, text){
    if(window.marked && window.DOMPurify){
        element.innerHTML = DOMPurify.sanitize(marked.parse(text));
    } else {
        element.textContent = text;
    }
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

    const answerMessage = addMessage('Darwin está pensando...', 'chat-message');
    let answer = '';

    try {
        btnSubmit.disabled = true;
        messageInput.disabled = true;
        historic.setAttribute('aria-busy', 'true');

        const response = await fetch('/api/chat', {
            method: 'POST',
            headers: { 'content-type': "application/json" },
            body: JSON.stringify({ messages: conversationHistory.slice(-MAX_HISTORY) })
        });

        if(!response.ok){
            const data = await response.json().catch(() => ({}));
            throw new Error(data.error || 'Erro ao obter resposta.');
        }

        const reader = response.body.pipeThrough(new TextDecoderStream()).getReader();

        while(true){
            const { value, done } = await reader.read();
            if(done) break;

            answer += value;
            renderMarkdown(answerMessage, answer);
            scrollHistoricToBottom();
        }

        if(!answer){
            throw new Error('A IA não retornou uma resposta válida.');
        }

        conversationHistory.push({ role: "assistant", content: answer });
        conversationHistory.splice(0, conversationHistory.length - MAX_HISTORY);
    } catch(e) {
        conversationHistory.pop();
        answerMessage.textContent = `Erro: ${e.message}`;
    } finally {
        historic.removeAttribute('aria-busy');
        btnSubmit.disabled = false;
        messageInput.disabled = false;
        messageInput.focus();
    }
}

function clearConversation(){
    historic.innerHTML = '';
    conversationHistory.length = 0;
    messageInput.value = '';
    messageInput.focus();
}

messageForm.addEventListener('submit', (event) => {
    event.preventDefault();
    sendMessage();
});

btnClear.addEventListener('click', clearConversation);
