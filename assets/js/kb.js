/* Knowledge Base: Aurora Hotel — local, no network calls */
(function(){
  const faqs = [
    { q: "what time is check in", a: "Check‑in starts at 3:00 PM. Early check‑in from 1:00 PM is subject to availability.", tags:["policy","checkin"] },
    { q: "what time is check out", a: "Check‑out is 11:00 AM. Late check‑out until 1:00 PM may be available for a small fee.", tags:["policy","checkout"] },
    { q: "do you have parking", a: "Yes. Valet parking is available for $25/night. EV charging included.", tags:["parking"] },
    { q: "wifi speed", a: "Secure fiber Wi‑Fi up to 500 Mbps in all areas.", tags:["wifi"] },
    { q: "is breakfast included", a: "Breakfast is available at Café Aurora from 7–11 AM. Packages with breakfast can be selected during booking.", tags:["dining","breakfast"] },
    { q: "pool hours", a: "The heated infinity pool is open daily 7 AM – 9 PM.", tags:["pool","amenities"] },
    { q: "gym hours", a: "Our 24/7 fitness studio is always open.", tags:["gym","amenities"] },
    { q: "spa hours", a: "Rooftop spa is open 10 AM – 8 PM. Appointments recommended.", tags:["spa"] },
    { q: "pet policy", a: "We welcome well‑behaved dogs up to 30 lb on designated floors. A $40/night cleaning fee applies.", tags:["pets","policy"] },
    { q: "cancellation policy", a: "Free cancellation up to 48 hours before check‑in. Within 48 hours, one night charged.", tags:["policy","cancellation"] },
    { q: "address", a: "100 Harbor Walk, Old Town District. Waterfront promenade meets arts quarter.", tags:["location","address"] },
    { q: "airport distance", a: "Aurora Hotel is ~25 minutes by car from the airport, traffic permitting.", tags:["transport","airport"] },
    { q: "do you have restaurant", a: "Yes. Café Aurora (all‑day) and a rooftop bar with small plates from 5 PM.", tags:["dining"] },
    { q: "room service", a: "Room service is available 7 AM – 10 PM.", tags:["dining","room-service"] },
    { q: "housekeeping", a: "Daily housekeeping included. Eco refresh on request.", tags:["housekeeping"] },
  ];

  const docs = [
    { id:"about", title:"About Aurora Hotel", text:"Aurora Hotel is a boutique property on the waterfront at the edge of Old Town. Interiors feature natural woods, stone, and soft textiles. Amenities include a rooftop spa and sauna, a heated infinity pool, a 24/7 fitness studio, fast fiber Wi‑Fi, valet parking with EV charging, complimentary bicycles, and pet‑friendly floors.", tags:["about","amenities"] },
    { id:"dining", title:"Dining", text:"Café Aurora serves an all‑day menu focused on seasonal local produce, excellent coffee, and bakery goods. The rooftop bar offers cocktails and small plates from late afternoon through evening.", tags:["dining"] },
    { id:"location", title:"Location", text:"We're located at 100 Harbor Walk in the Old Town District, where the waterfront promenade meets the arts quarter. The neighborhood includes galleries, independent shops, and weekend markets.", tags:["location"] },
    { id:"policies", title:"Policies", text:"Check‑in from 3 PM, check‑out by 11 AM. Free cancellation up to 48 hours before check‑in. Pets up to 30 lb on designated floors with a nightly cleaning fee. Valet parking available with EV charging.", tags:["policy"] },
    { id:"wellness", title:"Wellness", text:"Our rooftop spa (10 AM – 8 PM) offers massages and facials by appointment. The heated infinity pool is open 7 AM – 9 PM daily. The fitness studio is open 24/7.", tags:["amenities","spa","pool","gym"] },
  ];

  window.AURORA_KB = { faqs, docs };
})();
