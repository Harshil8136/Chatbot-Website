// Lightweight NLU: intents and entities via rules
// No external APIs/LLMs used.

const INTENTS = [
  { name: 'greeting', patterns: [/^(hi|hello|hey|good\s*(morning|afternoon|evening))\b/i] },
  { name: 'goodbye', patterns: [/(bye|goodbye|see ya|see you)/i] },
  { name: 'thanks', patterns: [/(thanks|thank you|appreciate it)/i] },
  { name: 'help', patterns: [/(help|assist|support|what can you do)/i] },
  { name: 'book', patterns: [/(book|reserve|availability|check\s*availability)/i] },
  { name: 'amenities', patterns: [/(spa|pool|gym|amenities|parking|wifi)/i] },
  { name: 'dining', patterns: [/(dining|restaurant|breakfast|dinner|menu|vegan)/i] },
  { name: 'price', patterns: [/(price|rate|cost|how much)/i] },
  { name: 'cancel', patterns: [/(cancel|change|modify)\s*(booking|reservation)?/i] },
  { name: 'policy', patterns: [/(policy|policies|check-in|check out|pet|smoking)/i] },
  { name: 'location', patterns: [/(where|located|address|directions|how to get)/i] },
  { name: 'smalltalk_weather', patterns: [/(weather|rain|sunny|snow)/i] },
  { name: 'smalltalk_joke', patterns: [/(joke|funny)/i] },
  { name: 'confirm', patterns: [/^(yes|yep|yeah|confirm|book it|go ahead)/i] },
  { name: 'provide_contact', patterns: [/my name is|i am [a-z]+|email is|@/i] },
];

const ROOM_TYPES = ['deluxe king', 'lakeside suite', 'sky loft'];

function extractRoomType(text) {
  const t = text.toLowerCase();
  for (const room of ROOM_TYPES) {
    if (t.includes(room)) return room;
  }
  if (/king/i.test(t)) return 'deluxe king';
  if (/suite/i.test(t)) return 'lakeside suite';
  if (/loft/i.test(t)) return 'sky loft';
  return null;
}

function extractGuests(text) {
  const m = text.match(/(\b\d{1,2})\s*(guests|people|adults|pax)?/i);
  if (m) {
    const n = parseInt(m[1], 10);
    if (n >= 1 && n <= 8) return n;
  }
  if (/couple|two of us|two/i.test(text)) return 2;
  if (/solo|just me|one/i.test(text)) return 1;
  if (/family|kids|children/i.test(text)) return 3;
  return null;
}

function extractDates(text) {
  // Accept YYYY-MM-DD or MM/DD or "today/tomorrow/next weekend"
  const out = {};
  const iso = text.match(/(20\d{2}-\d{2}-\d{2})/g);
  if (iso && iso.length >= 1) {
    out.checkin = iso[0];
    if (iso.length >= 2) out.checkout = iso[1];
  }
  const md = text.match(/(\b\d{1,2})\/(\d{1,2})(?:\/(\d{2,4}))?/);
  if (!out.checkin && md) {
    const year = md[3] ? (md[3].length===2?('20'+md[3]):md[3]) : new Date().getFullYear();
    out.checkin = `${year}-${String(md[1]).padStart(2,'0')}-${String(md[2]).padStart(2,'0')}`;
  }
  if (/today/i.test(text)) {
    const d = new Date(); out.checkin = d.toISOString().slice(0,10);
  }
  if (/tomorrow/i.test(text)) {
    const d = new Date(); d.setDate(d.getDate()+1); out.checkout = d.toISOString().slice(0,10);
  }
  if (/next weekend/i.test(text)) {
    const d = new Date();
    const day = d.getDay();
    const daysUntilFriday = (5 - day + 7) % 7 + 5; // Friday next week
    const fri = new Date(); fri.setDate(d.getDate() + daysUntilFriday);
    const sun = new Date(fri); sun.setDate(fri.getDate() + 2);
    out.checkin = fri.toISOString().slice(0,10);
    out.checkout = sun.toISOString().slice(0,10);
  }
  return out;
}

export function classify(text) {
  let intent = 'unknown';
  for (const item of INTENTS) {
    if (item.patterns.some(re => re.test(text))) { intent = item.name; break; }
  }
  const contact = extractContact(text);
  return {
    intent,
    roomType: extractRoomType(text),
    guests: extractGuests(text),
    dates: extractDates(text),
    contact,
    raw: text
  };
}

function extractContact(text){
  const nameMatch = text.match(/(?:i am|i'm|my name is)\s+([a-zA-Z]+(?:\s+[a-zA-Z]+)?)/i);
  const emailMatch = text.match(/[\w.+-]+@[\w-]+\.[\w.-]+/i);
  return {
    name: nameMatch ? nameMatch[1] : null,
    email: emailMatch ? emailMatch[0] : null,
  };
}
