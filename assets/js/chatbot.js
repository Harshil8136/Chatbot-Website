/* Aurora Concierge — smart local chatbot (no APIs, no LLMs) */
(function(){
  const { normalize, detectIntent, extractEntities, extractName, buildTfidfIndex, searchTfidf } = window.AURORA_NLP;
  const { faqs, docs } = window.AURORA_KB;
  const { checkAvailability } = window.AURORA_AVAIL;

  class ChatbotEngine{
    constructor(){
      this.state = {
        name: null,
        lastIntent: null,
        booking: { checkIn:null, checkOut:null, guests:null, room:"any", contact:{} },
        fallbackCount: 0,
        pendingHold: false,
        lastOffers: [],
      };
      this.index = buildTfidfIndex([
        ...faqs.map((f,i)=> ({ id:"faq-"+i, text:f.q+" "+f.a, kind:"faq", a: f.a, tags:f.tags })),
        ...docs
      ]);
      this.quick = ["Check availability","Pool hours","Parking","Breakfast","Wi‑Fi","Pet policy","Contact","Location"];
    }

    greet(){
      return {
        text: "Hi! I’m Aurora’s smart concierge. I can check availability, quote prices, explain amenities and policies, and help plan your stay. What can I do for you?",
        suggestions: this.quick
      };
    }

    handle(text){
      const raw = text.trim();
      if(!raw) return { text: "", suggestions: [] };
      const intent = detectIntent(raw);
      const entities = extractEntities(raw);
      this.state.lastIntent = intent;

      // Update booking state from entities
      const b = this.state.booking;
      if(entities.checkIn) b.checkIn = entities.checkIn;
      if(entities.checkOut) b.checkOut = entities.checkOut;
      if(entities.guests) b.guests = entities.guests;
      if(entities.room) b.room = entities.room;
      if(entities.email) b.contact.email = entities.email;
      if(entities.phone) b.contact.phone = entities.phone;
      const maybeName = extractName(raw);
      if(maybeName) this.state.name = maybeName;

      if(intent === "greet") return this.greet();
      if(intent === "goodbye") return { text: "Safe travels! If you need anything else, I’m just a click away.", suggestions:["Contact","Policies","Book"] };
      if(intent === "thanks") return { text: "You’re very welcome!", suggestions:["Check availability","Amenities"] };
      if(intent === "help") return this.greet();

      // If user drops an email any time during a pending hold
      if(this.state.pendingHold && b.contact.email){
        this.state.pendingHold = false;
        return { text: `Thanks${this.state.name?`, ${this.state.name}`:""}! I’ve saved ${b.contact.email}. You’ll receive a confirmation link for the ${b.room} from ${b.checkIn} to ${b.checkOut}. This is a demo — no emails are actually sent.`, suggestions:["Change dates","Change room","Policies"] };
      }

      // Quick hold/booking intent: "hold Deluxe King for John", "book Nov 5-8 2 guests"
      if(intent === "hold"){
        const missing = [];
        const b = this.state.booking;
        if(!b.checkIn) missing.push("check‑in");
        if(!b.checkOut) missing.push("check‑out");
        if(!b.guests) missing.push("guest count");
        if(!b.room || b.room==="any") missing.push("room type");
        if(!b.contact.email && !this.state.name) missing.push("name or email");
        if(missing.length){
          return { text: `I can place a 24‑hour hold, but I’m missing: ${missing.join(", ")}. You can say “Hold Deluxe King Nov 5‑8 for 2 guests. I’m Alex.”`, suggestions:["Hold Deluxe King","Hold Family Suite","Next weekend","2 guests"] };
        }
        this.state.pendingHold = true;
        return { text: `Done! I’ve placed a 24‑hour courtesy hold on a ${b.room} from ${b.checkIn} to ${b.checkOut} for ${b.guests} guest${b.guests>1?"s":""}${this.state.name?` under ${this.state.name}`:""}. Reply with your email to receive a confirmation link.`, suggestions:["Send my email","Change dates","Change room"] };
      }

      if(intent === "availability" || intent === "price"){
        const missing = [];
        if(!b.checkIn) missing.push("check‑in date");
        if(!b.checkOut) missing.push("check‑out date");
        if(!b.guests) missing.push("guest count");
        if(missing.length){
          return { text: `I can check that. I’m missing your ${missing.join(", ")}. You can type dates like 2025-11-05 to 2025-11-08 or “next weekend”.`, suggestions:["2 guests","3 guests","Deluxe King","Family Suite","Next weekend"] };
        }
        const result = checkAvailability({ checkIn:b.checkIn, checkOut:b.checkOut, guests:b.guests, roomPreference: b.room||"any" });
        if(!result.ok){
          return { text: result.error, suggestions:["Try different dates","Reduce guests","Any room"] };
        }
        this.state.lastOffers = result.offers.slice(0,3);
        const lines = this.state.lastOffers.map(o=>`• ${o.room} for ${o.capacity} — $${o.total} total (${result.nights} nights)`);
        const holdSugs = this.state.lastOffers.slice(0,2).map(o=>`Hold ${o.room}`);
        return { text: `Here’s what I can offer from ${b.checkIn} to ${b.checkOut} for ${b.guests} guest${b.guests>1?"s":""}:
${lines.join("\n")}
Would you like me to hold one of these? I can take your name and email.`, suggestions:[...holdSugs, "Change dates","Change guests"] };
      }

      if(intent === "amenities" || intent === "policy" || intent === "location"){
        const top = searchTfidf(raw, this.index, 2);
        if(top.length){
          const ans = top[0].a || top[0].text;
          return { text: ans, suggestions: this.quick };
        }
      }

      // General retrieval as fallback
      const results = searchTfidf(raw, this.index, 3);
      if(results.length){
        const a = results[0].a || results[0].text;
        return { text: a, suggestions: this.quick };
      }

      this.state.fallbackCount++;
      if(this.state.fallbackCount < 2){
        return { text: "I didn’t catch that. I can help with availability, amenities, policies, and location.", suggestions: this.quick };
      }
      return { text: "Let’s try this: ask me to ‘check availability’, ‘pool hours’, ‘parking’, or ‘pet policy’.", suggestions: this.quick };
    }
  }

  // Basic chat UI controller
  class ChatUI{
    constructor(root){
      this.root = root;
      this.body = root.querySelector('#chat-body');
      this.inputForm = root.querySelector('#chat-input');
      this.sug = root.querySelector('#chat-suggestions');
      this.engine = new ChatbotEngine();
      this.bind();
      this.showBot(this.engine.greet().text);
      this.setSuggestions(this.engine.quick);
    }
    bind(){
      this.inputForm.addEventListener('submit', (e)=>{
        e.preventDefault();
        const input = this.inputForm.message;
        const text = (input.value||"").trim();
        if(!text) return;
        this.showUser(text);
        input.value = "";
        setTimeout(()=>{
          const { text:reply, suggestions } = this.engine.handle(text);
          this.showBot(reply);
          this.setSuggestions(suggestions||[]);
        }, 200);
      });
      this.sug.addEventListener('click', (e)=>{
        const btn = e.target.closest('button[data-suggestion]');
        if(!btn) return;
        const t = btn.getAttribute('data-suggestion');
        this.showUser(t);
        setTimeout(()=>{
          const { text:reply, suggestions } = this.engine.handle(t);
          this.showBot(reply);
          this.setSuggestions(suggestions||[]);
        }, 160);
      });
    }
    showUser(text){ this.addMsg('user', text); }
    showBot(text){ this.addMsg('bot', text); }
    addMsg(who, text){
      const msg = document.createElement('div');
      msg.className = `msg ${who}`;
      const bubble = document.createElement('div');
      bubble.className = 'bubble';
      bubble.textContent = text;
      msg.appendChild(bubble);
      this.body.appendChild(msg);
      this.body.scrollTop = this.body.scrollHeight;
    }
    setSuggestions(items){
      this.sug.innerHTML = '';
      items.slice(0,6).forEach(t=>{
        const b = document.createElement('button');
        b.className='suggestion';
        b.type='button';
        b.textContent=t; b.setAttribute('data-suggestion', t);
        this.sug.appendChild(b);
      });
    }
  }

  window.AURORA_CHAT = { ChatUI };
})();
