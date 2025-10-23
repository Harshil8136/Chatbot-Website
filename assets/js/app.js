/* App bootstrap: nav, theme, booking form, chatbot launch */
(function(){
  const $ = (sel, ctx=document)=> ctx.querySelector(sel);
  const $$ = (sel, ctx=document)=> Array.from(ctx.querySelectorAll(sel));

  // Year
  $('#year').textContent = new Date().getFullYear();

  // Nav toggle
  const navToggle = $('.nav-toggle');
  const navLinks = $('#nav-links');
  navToggle?.addEventListener('click', ()=>{
    const open = navLinks.getAttribute('data-open') === 'true';
    navLinks.setAttribute('data-open', String(!open));
    navToggle.setAttribute('aria-expanded', String(!open));
  });

  // Smooth anchor
  $$('#nav-links a').forEach(a=>{
    a.addEventListener('click', ()=>{
      navLinks.setAttribute('data-open','false');
    });
  });

  // Theme
  const themeKey = 'aurora-theme-dark';
  const themeBtn = $('#theme-toggle');
  function applyTheme(){ document.documentElement.dataset.theme = localStorage.getItem(themeKey)==='1' ? 'dark' : 'light'; }
  applyTheme();
  themeBtn?.addEventListener('click', ()=>{
    const now = localStorage.getItem(themeKey)==='1' ? '0':'1';
    localStorage.setItem(themeKey, now); applyTheme();
  });

  // Booking form
  const bookingForm = $('#booking-form');
  const resultsEl = $('#booking-results');
  bookingForm?.addEventListener('submit', (e)=>{
    e.preventDefault();
    const fd = new FormData(bookingForm);
    const checkIn = fd.get('checkin');
    const checkOut = fd.get('checkout');
    const guests = parseInt(fd.get('guests'),10) || 2;
    const room = String(fd.get('room')||'any');
    const res = window.AURORA_AVAIL.checkAvailability({ checkIn, checkOut, guests, roomPreference: room });
    if(!res.ok){ resultsEl.innerHTML = `<div class="msg-error">${res.error}</div>`; return; }
    const cards = res.offers.map(o=> `
      <div class="card">
        <div class="card-body">
          <h3>${o.room}</h3>
          <p>${res.nights} nights • up to ${o.capacity} guests</p>
          <div class="meta"><span>Average $${Math.round(o.total/res.nights)}/night</span><strong>Total $${o.total}</strong></div>
        </div>
      </div>`).join('');
    resultsEl.innerHTML = `<div class="card-grid">${cards}</div>`;
  });

  // Chatbot
  const chatFab = $('#chat-fab');
  const chatRoot = $('#chatbot');
  const chatClose = chatRoot?.querySelector('.chat-close');
  function openChat(){ chatRoot.hidden=false; chatFab.setAttribute('aria-expanded','true'); if(!window.__chatMounted){ window.__chatMounted = new window.AURORA_CHAT.ChatUI(chatRoot); } }
  function closeChat(){ chatRoot.hidden=true; chatFab.setAttribute('aria-expanded','false'); }
  chatFab?.addEventListener('click', ()=>{ const open = chatFab.getAttribute('aria-expanded')==='true'; open ? closeChat() : openChat(); });
  chatClose?.addEventListener('click', closeChat);
  $$('[data-open-chat]').forEach(btn=> btn.addEventListener('click', openChat));

  // Service worker (optional offline cache)
  if('serviceWorker' in navigator){
    // fail-safe registration, no external network
    navigator.serviceWorker.register('service-worker.js').catch(()=>{});
  }

  // Reveal animations
  const revealItems = $$('[data-reveal]');
  if(revealItems.length){
    const io = new IntersectionObserver((entries)=>{
      entries.forEach(e=>{
        if(e.isIntersecting){ e.target.classList.add('visible'); io.unobserve(e.target); }
      });
    }, { threshold: 0.12 });
    revealItems.forEach(el=> io.observe(el));
  }
})();
