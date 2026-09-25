const conversation = document.querySelector('#conversation');
const input = document.querySelector('#messageInput');
const sendButton = document.querySelector('#sendButton');
const newChatButton = document.querySelector('#newChatButton');
const sidebar = document.querySelector('.sidebar');
const menuButton = document.querySelector('.menu-button');
const closeButton = document.querySelector('.sidebar-close');

const messageHistory = [{
  role: 'assistant',
  content: 'Absolutely. Let’s make space for the things that matter without packing every minute. What are the three things you’d most like to feel by the end of this week?'
}];

function addMessage(text, type) {
  const row = document.createElement('div');
  row.className = `message-row ${type === 'user' ? 'user-row' : 'assistant-row'}`;
  row.innerHTML = type === 'user'
    ? `<div class="message user-message"></div><div class="avatar">JD</div>`
    : `<div class="assistant-avatar">O</div><div class="message assistant-message"><p></p><span class="message-time">now</span></div>`;
  row.querySelector(type === 'user' ? '.message' : 'p').textContent = text;
  conversation.appendChild(row);
  conversation.scrollTop = conversation.scrollHeight;
}

function sendMessage() {
  const text = input.value.trim();
  if (!text) return;
  addMessage(text, 'user');
  messageHistory.push({ role: 'user', content: text });
  input.value = '';
  input.style.height = 'auto';
  sendButton.disabled = true;
  fetch('/api/chat', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ messages: messageHistory })
  })
    .then(async (response) => {
      const result = await response.json();
      if (!response.ok) throw new Error(result.error || 'The assistant could not respond.');
      return result.content;
    })
    .then((reply) => {
      messageHistory.push({ role: 'assistant', content: reply });
      addMessage(reply, 'assistant');
    })
    .catch((error) => addMessage(`I couldn’t reach Groq right now. ${error.message}`, 'assistant'))
    .finally(() => { sendButton.disabled = false; });
}

sendButton.addEventListener('click', sendMessage);
input.addEventListener('input', () => { input.style.height = 'auto'; input.style.height = `${Math.min(input.scrollHeight, 100)}px`; });
input.addEventListener('keydown', (event) => { if (event.key === 'Enter' && !event.shiftKey) { event.preventDefault(); sendMessage(); } });
document.querySelectorAll('.prompt').forEach((prompt) => prompt.addEventListener('click', () => { input.value = prompt.textContent; input.focus(); }));
newChatButton.addEventListener('click', () => { messageHistory.splice(0, messageHistory.length, { role: 'assistant', content: 'What would you like to think through today?' }); conversation.innerHTML = '<div class="date-stamp">NEW CONVERSATION</div><div class="message-row assistant-row"><div class="assistant-avatar">O</div><div class="message assistant-message"><p>What would you like to think through today?</p></div></div>'; input.focus(); });
menuButton.addEventListener('click', () => sidebar.classList.add('open'));
closeButton.addEventListener('click', () => sidebar.classList.remove('open'));