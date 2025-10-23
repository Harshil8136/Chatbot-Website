/* Local availability + pricing simulation (deterministic, no network) */
(function(){
  const MS_DAY = 86400000;
  const RoomCatalog = [
    { id:"cosy-queen", name:"Cosy Queen", capacity:2, base:140 },
    { id:"deluxe-king", name:"Deluxe King", capacity:3, base:190 },
    { id:"family-suite", name:"Family Suite", capacity:4, base:260 },
    { id:"penthouse-suite", name:"Penthouse Suite", capacity:5, base:420 },
  ];

  function hashString(s){ let h=2166136261>>>0; for(let i=0;i<s.length;i++){ h ^= s.charCodeAt(i); h = Math.imul(h, 16777619); } return h>>>0; }
  function seededRandom(seed){ let h = hashString(seed)||1; return function(){ h ^= h<<13; h ^= h>>>17; h ^= h<<5; return (h>>>0)/4294967295; }; }

  function seasonMultiplier(date){ const m = (new Date(date)).getMonth()+1; if(m>=6 && m<=9) return 1.15; if(m===12) return 1.20; return 1.0; }
  function weekendMultiplier(date){ const d = (new Date(date)).getDay(); return (d===5||d===6)? 1.20 : 1.0; }

  function occupancyForDate(dateISO){
    const rnd = seededRandom("occ:"+dateISO);
    const occ = {};
    RoomCatalog.forEach(r=>{ occ[r.id] = Math.floor(50 + rnd()*50); }); // 50%..100%
    return occ; // percentage
  }

  function priceForRoomOnDate(room, dateISO){
    const base = room.base;
    const occ = occupancyForDate(dateISO)[room.id];
    const occMult = occ>80? 1.12 : occ>65? 1.06 : 1.0;
    const p = base * seasonMultiplier(dateISO) * weekendMultiplier(dateISO) * occMult;
    return Math.round(p);
  }

  function nightsBetween(aISO, bISO){ const a = new Date(aISO), b = new Date(bISO); return Math.max(1, Math.round((b-a)/MS_DAY)); }

  function checkAvailability({ checkIn, checkOut, guests=2, roomPreference="any" }){
    if(!checkIn || !checkOut) return { ok:false, error:"Please provide both check‑in and check‑out dates." };
    const nights = nightsBetween(checkIn, checkOut);
    const days = Array.from({length:nights}, (_,i)=> new Date((new Date(checkIn)).getTime()+i*MS_DAY).toISOString().slice(0,10));
    const rooms = RoomCatalog.filter(r=> guests <= r.capacity && (roomPreference==="any" || r.name.toLowerCase()===roomPreference));
    const quotes = rooms.map(room=>{
      const nightly = days.map(d=> priceForRoomOnDate(room,d));
      const total = nightly.reduce((a,b)=>a+b,0);
      const longStay = nights>=5 ? 0.95 : 1.0;
      const finalTotal = Math.round(total * longStay);
      return { room: room.name, capacity: room.capacity, nightly, total: finalTotal };
    });
    if(quotes.length===0) return { ok:false, error:"No rooms fit your party size. Try reducing guests or a different room." };
    // Simulate limited availability: if occupancy high, some rooms may be sold out
    const available = quotes.filter(q=>{
      const avgNight = Math.round(q.nightly.reduce((a,b)=>a+b,0)/q.nightly.length);
      const seed = seededRandom("soldout:"+q.room+checkIn+checkOut)();
      const soldOut = seed < 0.12 && avgNight> q.total/q.nightly.length; // occasionally
      return !soldOut;
    });
    if(available.length===0) return { ok:false, error:"These dates are very popular. Different dates or fewer nights may help." };
    return { ok:true, nights, offers: available };
  }

  window.AURORA_AVAIL = { RoomCatalog, checkAvailability };
})();
