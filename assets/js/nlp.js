/* Simple local NLP utilities: tokenize, fuzzy match, TF‑IDF search, date parsing */
(function(){
  function normalize(text){
    return (text || "")
      .toLowerCase()
      .normalize("NFKD").replace(/[^\w\s-]/g, " ")
      .replace(/\s+/g, " ")
      .trim();
  }
  // Title-case helper for room names and months
  function toTitleCase(s){
    return (s||"").split(/\s+/).filter(Boolean).map(w=> w[0]? w[0].toUpperCase()+w.slice(1).toLowerCase(): "").join(" ");
  }
  function tokenize(text){
    return normalize(text).split(" ").filter(Boolean);
  }
  // Jaro-Winkler similarity (lightweight, good for fuzzy intent matching)
  function jaroWinkler(s1, s2){
    if(!s1 || !s2) return 0;
    const m = Math.floor(Math.max(s1.length, s2.length)/2) - 1;
    const matches = [0,0];
    const hash1 = [], hash2 = [];
    let t = 0;
    for(let i=0;i<s1.length;i++){
      const start = Math.max(0, i-m); const end = Math.min(i+m+1, s2.length);
      for(let j=start;j<end;j++){
        if(hash2[j]) continue;
        if(s1[i] === s2[j]){ hash1[i]=1; hash2[j]=1; matches[0]++; break; }
      }
    }
    if(matches[0]===0) return 0;
    let k=0; for(let i=0;i<s1.length;i++) if(hash1[i]){ while(!hash2[k]) k++; if(s1[i]!==s2[k]) t++; k++; }
    t = t/2;
    const jaro = (matches[0]/s1.length + matches[0]/s2.length + (matches[0]-t)/matches[0]) / 3;
    // Winkler bonus for common prefix
    let l=0; while(l<4 && s1[l]===s2[l]) l++;
    return jaro + l * 0.1 * (1 - jaro);
  }

  // TF‑IDF index
  function buildTfidfIndex(docs){
    const docTokens = docs.map(d => tokenize(d.text));
    const df = new Map();
    docTokens.forEach(tokens => {
      const seen = new Set(tokens);
      seen.forEach(tok => df.set(tok, (df.get(tok)||0)+1));
    });
    const idf = new Map();
    const N = docs.length;
    df.forEach((dfi, tok)=> idf.set(tok, Math.log((N+1)/(dfi+1)) + 1));
    const vectors = docTokens.map(tokens => {
      const tf = new Map(); tokens.forEach(t=> tf.set(t, (tf.get(t)||0)+1));
      const vec = new Map();
      tf.forEach((count, tok)=> vec.set(tok, (count / tokens.length) * (idf.get(tok)||0)));
      return vec;
    });
    function vectorize(text){
      const tokens = tokenize(text); const tf = new Map(); tokens.forEach(t=> tf.set(t, (tf.get(t)||0)+1));
      const vec = new Map(); tf.forEach((count, tok)=> vec.set(tok, (count/tokens.length) * (idf.get(tok)||0)));
      return vec;
    }
    function cosine(a,b){
      let dot=0, na=0, nb=0; const keys = new Set([...a.keys(), ...b.keys()]);
      keys.forEach(k=>{const va=a.get(k)||0; const vb=b.get(k)||0; dot += va*vb; na += va*va; nb += vb*vb;});
      return dot===0?0: dot / (Math.sqrt(na) * Math.sqrt(nb));
    }
    return { docs, idf, vectors, vectorize, cosine };
  }
  function searchTfidf(query, index, topK=3){
    const qv = index.vectorize(query);
    const scores = index.vectors.map((vec,i)=> ({ i, score: index.cosine(qv, vec) }));
    scores.sort((a,b)=> b.score - a.score);
    return scores.slice(0, topK).filter(s=> s.score > 0.08).map(s=> index.docs[s.i]);
  }

  // Simple entity extraction
  const ROOM_TYPES = ["cosy queen","deluxe king","family suite","penthouse suite","queen","king","suite","penthouse","family"];
  function extractEntities(text){
    const t = normalize(text);
    const guestsMatch = t.match(/(\d+)\s*(guests|people|ppl|persons|adults)?/);
    const emailMatch = t.match(/[a-z0-9._%+-]+@[a-z0-9.-]+\.[a-z]{2,}/);
    const phoneMatch = t.match(/\+?\d[\d\s-]{7,}\d/);
    let room=null; let best=0;
    ROOM_TYPES.forEach(rt=>{ const s = jaroWinkler(t, rt); if(s>best && t.includes(rt)) { room = rt; best=s; }});
    const dates = parseDateRange(text);
    return {
      guests: guestsMatch ? parseInt(guestsMatch[1],10) : null,
      email: emailMatch ? emailMatch[0] : null,
      phone: phoneMatch ? phoneMatch[0] : null,
      room,
      ...dates,
    };
  }

  // Date helpers
  function toISODate(d){ const z = new Date(d.getTime()); z.setHours(0,0,0,0); return z.toISOString().slice(0,10); }
  function nextDow(d, dow){ // 0=Sun
    const nd = new Date(d.getTime());
    const delta = (dow + 7 - nd.getDay()) % 7 || 7;
    nd.setDate(nd.getDate() + delta);
    return nd;
  }
  function parseDateToken(tok, base){
    const t = tok.toLowerCase();
    const d = new Date(base.getTime()); d.setHours(0,0,0,0);
    if(/^\d{4}-\d{2}-\d{2}$/.test(t)) return new Date(t + "T00:00:00");
    if(t === "today") return d;
    if(t === "tomorrow") { d.setDate(d.getDate()+1); return d; }
    const days = {monday:1,tuesday:2,wednesday:3,thursday:4,friday:5,saturday:6,sunday:0};
    if(t in days) return nextDow(d, days[t]);
    return null;
  }
  function parseDateRange(text){
    const now = new Date();
    const raw = (text||"");
    const t = normalize(raw);
    let a=null, b=null;

    // Weekend shortcuts
    if(t.includes("next weekend") || t.includes("this weekend")){
      const base = t.includes("next weekend") ? new Date(now.getTime()+7*86400000) : now;
      const fri = nextDow(base, 5); const sun = nextDow(base, 0);
      a=fri; b=new Date(sun.getTime()); b.setDate(b.getDate()+1);
    }

    // Month name parsing: e.g., "Nov 5-8", "November 5 to November 7, 2025"
    const monthMap = {jan:0,feb:1,mar:2,apr:3,may:4,jun:5,jul:6,aug:7,sep:8,sept:8,oct:9,nov:10,dec:11};
    function parseMonthDay(str){
      if(!str) return null;
      const m = str.trim().replace(/\./g, "");
      const md = m.match(/(jan|feb|mar|apr|may|jun|jul|aug|sep|sept|oct|nov|dec)[a-z]*\s+(\d{1,2})(?:,?\s*(\d{4}))?/i);
      if(md){
        const mon = monthMap[md[1].toLowerCase()];
        const day = parseInt(md[2],10);
        const year = md[3]? parseInt(md[3],10) : now.getFullYear();
        const d = new Date(year, mon, day);
        d.setHours(0,0,0,0);
        return d;
      }
      return null;
    }
    // Range like "Nov 5-8"
    const rangeShort = raw.match(/\b([A-Za-z]{3,9}\.?)\s*(\d{1,2})\s*[-–]\s*(\d{1,2})(?:,?\s*(\d{4}))?/);
    if(!a && rangeShort){
      const mon = monthMap[rangeShort[1].replace(/\./g,'').toLowerCase()];
      const y = rangeShort[4]? parseInt(rangeShort[4],10): now.getFullYear();
      const d1 = new Date(y, mon, parseInt(rangeShort[2],10)); d1.setHours(0,0,0,0);
      const d2 = new Date(y, mon, parseInt(rangeShort[3],10)); d2.setHours(0,0,0,0);
      a = d1; b = new Date(d2.getTime()); b.setDate(b.getDate()+1);
    }
    // Range with two explicit dates: "Nov 5 to Nov 8"
    const rangeLong = raw.match(/([A-Za-z]{3,9}\.\s*\d{1,2}(?:,\s*\d{4})?)\s*(?:to|\-|–)\s*([A-Za-z]{3,9}\.\s*\d{1,2}(?:,\s*\d{4})?)/i);
    if(!a && rangeLong){
      const d1 = parseMonthDay(rangeLong[1]);
      const d2 = parseMonthDay(rangeLong[2]);
      if(d1 && d2){ a=d1; b=new Date(d2.getTime()); b.setDate(b.getDate()+1); }
    }

    // Numeric formats: mm/dd[/yyyy] - mm/dd[/yyyy]
    const numRange = raw.match(/\b(\d{1,2})[\/\-.](\d{1,2})(?:[\/\-.](\d{2,4}))?\s*(?:to|\-|–)\s*(\d{1,2})[\/\-.](\d{1,2})(?:[\/\-.](\d{2,4}))?/);
    if(!a && numRange){
      const m1=parseInt(numRange[1],10), d1=parseInt(numRange[2],10), y1=numRange[3]? parseInt(numRange[3],10): now.getFullYear();
      const m2=parseInt(numRange[4],10), d2=parseInt(numRange[5],10), y2=numRange[6]? parseInt(numRange[6],10): y1;
      const yy1 = y1<100 ? 2000+y1 : y1; const yy2 = y2<100 ? 2000+y2 : y2;
      a = new Date(yy1, m1-1, d1); a.setHours(0,0,0,0);
      const end = new Date(yy2, m2-1, d2); end.setHours(0,0,0,0);
      b = new Date(end.getTime()); b.setDate(b.getDate()+1);
    }

    // Single explicit date (yyyy-mm-dd | month name | mm/dd)
    if(!a){
      const tokens = t.split(/\s+/);
      for(const tok of tokens){
        const d = parseDateToken(tok, now);
        if(d){ a=d; break; }
      }
      if(!a){
        // month name single
        const mdSingle = raw.match(/(jan|feb|mar|apr|may|jun|jul|aug|sep|sept|oct|nov|dec)[a-z]*\s+(\d{1,2})(?:,?\s*(\d{4}))?/i);
        if(mdSingle){ a = parseMonthDay(mdSingle[0]); }
      }
      if(!a){
        const num = raw.match(/\b(\d{1,2})[\/\-.](\d{1,2})(?:[\/\-.](\d{2,4}))?/);
        if(num){
          const m = parseInt(num[1],10), d = parseInt(num[2],10), y = num[3]? parseInt(num[3],10) : now.getFullYear();
          a = new Date(y<100?2000+y:y, m-1, d); a.setHours(0,0,0,0);
        }
      }
    }

    if(a && !b){ const bb = new Date(a.getTime()); bb.setDate(bb.getDate()+2); b=bb; }
    if(a && b && a.getTime()>b.getTime()){ const tmp=a; a=b; b=tmp; }
    return { checkIn: a? toISODate(a): null, checkOut: b? toISODate(b): null };
  }

  // Intent detection (pattern + fuzzy)
  const INTENTS = [
    { name:"greet", keywords:["hello","hi","hey","good morning","good evening"] },
    { name:"goodbye", keywords:["bye","goodbye","see you","later"] },
    { name:"thanks", keywords:["thanks","thank you","appreciate"] },
    { name:"help", keywords:["help","what can you do","how does this work"] },
    { name:"availability", keywords:["availability","available","check availability","dates","book","reserve"] },
    { name:"hold", keywords:["hold","reserve","book","confirm"] },
    { name:"price", keywords:["price","rate","cost","how much"] },
    { name:"amenities", keywords:["amenities","spa","pool","gym","wifi","parking","bar","restaurant"] },
    { name:"policy", keywords:["policy","check in","check out","cancellation","pet","pets"] },
    { name:"location", keywords:["where","address","location","directions","airport"] },
  ];
  function detectIntent(text){
    const t = normalize(text);
    let best={name:"unknown", score:0};
    INTENTS.forEach(intent=>{
      intent.keywords.forEach(kw=>{
        const s = jaroWinkler(t, kw);
        if(s>best.score && (t.includes(kw) || s>0.9)) best={name:intent.name, score:s};
      });
    });
    return best.name;
  }

  // Lightweight name extraction from common phrases
  function extractName(text){
    const m = (text||"").match(/\b(?:i am|i'm|my name is|this is|name is)\s+([A-Za-z]+(?:\s+[A-Za-z\-']+){0,2})/i);
    if(m){
      const name = m[1].trim();
      if(name && name.length>=2) return toTitleCase(name);
    }
    return null;
  }

  window.AURORA_NLP = {
    normalize, tokenize, jaroWinkler,
    buildTfidfIndex, searchTfidf,
    extractEntities, parseDateRange,
    detectIntent, extractName,
    ROOM_TYPES,
  };
})();
