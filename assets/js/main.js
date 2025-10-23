import { on } from './utils/dom.js';
import { ensureValidRange } from './utils/dates.js';
import { ChatbotEngine } from './chatbot/engine.js';

(function initSite(){
  const year = document.getElementById('year');
  if (year) year.textContent = String(new Date().getFullYear());

  const form = document.getElementById('booking-form');
  const result = document.getElementById('booking-result');
  on(form, 'submit', (e) => {
    e.preventDefault();
    const checkin = document.getElementById('checkin').value;
    const checkout = document.getElementById('checkout').value;
    const guests = parseInt(document.getElementById('guests').value, 10) || 2;
    const roomType = document.getElementById('room-type').value;
    const ok = ensureValidRange(checkin, checkout);
    if (!ok.ok) { result.textContent = ok.error; return; }
    const nights = Math.max(1, Math.round((ok.checkout-ok.checkin)/(1000*60*60*24)));
    const avg = roomType === 'Deluxe King' ? 240 : roomType === 'Lakeside Suite' ? 380 : 500;
    result.textContent = `${roomType} for ${guests} guest${guests>1?'s':''}: approx $${avg}/night, ${nights} nights.`;
  });

  // Chatbot UI
  const chatToggle = document.getElementById('chat-toggle');
  const chatPanel = document.getElementById('chat-panel');
  const engine = new ChatbotEngine();

  function ensureChatDOM(){
    if (chatPanel.dataset.ready) return;
    chatPanel.dataset.ready = '1';
    chatPanel.innerHTML = `
      <div class="chat-header">
        <div>
          <div class="chat-title">Aurora Concierge</div>
          <small>no internet required • private</small>
        </div>
        <button id="chat-close" class="quick">Close</button>
      </div>
      <div id="chat-body" class="chat-body"></div>
      <div class="chat-quick">
        <button class="quick" data-q="Check availability for next weekend">Next weekend</button>
        <button class="quick" data-q="What is the price of Lakeside Suite?">Suite price</button>
        <button class="quick" data-q="Tell me about the spa">Spa</button>
        <button class="quick" data-q="Book Deluxe King for two">Book</button>
      </div>
      <div class="chat-input">
        <input id="chat-input" placeholder="Ask anything… (e.g., 'book 11/20-11/22 for 2')" />
        <button id="chat-send">Send</button>
      </div>
    `;
    wireChatEvents();
  }

  function addMessage(role, text){
    const body = document.getElementById('chat-body');
    const bubble = document.createElement('div');
    bubble.className = `msg ${role}`;
    bubble.textContent = text;
    body.appendChild(bubble);
    body.scrollTop = body.scrollHeight;
  }

  function send(text){
    if (!text.trim()) return;
    addMessage('user', text);
    const replies = engine.reply(text);
    replies.forEach(r => addMessage('bot', r));
  }

  function wireChatEvents(){
    const closeBtn = document.getElementById('chat-close');
    on(closeBtn, 'click', () => toggleChat(false));

    document.querySelectorAll('.chat-quick .quick').forEach(btn => {
      on(btn, 'click', () => send(btn.dataset.q));
    });

    const input = document.getElementById('chat-input');
    const sendBtn = document.getElementById('chat-send');
    on(sendBtn, 'click', () => { send(input.value); input.value=''; input.focus(); });
    on(input, 'keydown', (e) => { if (e.key==='Enter') { send(input.value); input.value=''; } });

    // welcome
    addMessage('bot', "Hello! I'm Aurora's concierge. How can I make your day easier?");
  }

  function toggleChat(open){
    ensureChatDOM();
    chatPanel.classList.toggle('open', open ?? !chatPanel.classList.contains('open'));
    chatPanel.setAttribute('aria-expanded', chatPanel.classList.contains('open') ? 'true' : 'false');
  }

  on(chatToggle, 'click', () => toggleChat());
  // keyboard shortcut
  on(document, 'keydown', (e) => { if (e.key === '/' && !e.metaKey && !e.ctrlKey) { e.preventDefault(); toggleChat(true); document.getElementById('chat-input')?.focus(); }});
})();
