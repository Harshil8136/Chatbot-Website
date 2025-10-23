// Rule-based dialog engine for the concierge chatbot
// No external APIs/LLMs. Everything runs client-side.

import { classify } from './nlu.js';
import { knowledge } from './knowledge.js';
import { formatCurrency } from '../utils/dom.js';
import { parseISODate, nightsBetween, addDays, formatDate } from '../utils/dates.js';

const ROOM_INVENTORY = {
  'deluxe king': { base: 220, capacity: 2 },
  'lakeside suite': { base: 360, capacity: 3 },
  'sky loft': { base: 480, capacity: 2 },
};

function seasonalMultiplier(date) {
  const m = date.getMonth(); // 0-11
  if ([5,6,7].includes(m)) return 1.3; // summer
  if ([11,0].includes(m)) return 1.2; // holidays
  if ([3,4,9].includes(m)) return 1.1; // shoulder
  return 0.95; // low
}

function weekendMultiplier(date) {
  const d = date.getDay();
  return (d===5 || d===6) ? 1.15 : 1.0; // Fri/Sat
}

function computeNightlyRate(roomType, date) {
  const info = ROOM_INVENTORY[roomType];
  if (!info) return null;
  const base = info.base;
  const rate = base * seasonalMultiplier(date) * weekendMultiplier(date);
  return Math.round(rate);
}

function estimatePrice(roomType, checkin, checkout, guests) {
  const nights = nightsBetween(checkin, checkout);
  let total = 0;
  for (let i = 0; i < nights; i++) {
    const day = addDays(checkin, i);
    total += computeNightlyRate(roomType, day);
  }
  // occupancy fee after 2 guests
  if (guests && guests > 2) total += (guests - 2) * 30 * nights;
  return { nights, total };
}

function mockAvailability(roomType, checkin, checkout, guests) {
  // Simple deterministic pseudo-random availability based on date
  const nights = nightsBetween(checkin, checkout);
  if (nights <= 0) return { ok: false, reason: 'invalid_range' };
  const seed = parseInt(formatDate(checkin).replace(/-/g,''), 10) + (roomType?roomType.length:1) + (guests||2);
  const r = (seed % 10);
  if (r < 2) return { ok: false, reason: 'sold_out' };
  return { ok: true, rooms: Math.max(1, (r % 3)) };
}

function randomItem(arr){ return arr[Math.floor(Math.random()*arr.length)]; }

export class ChatbotEngine {
  constructor(storageKey = 'aurora_booking') {
    this.state = {
      context: {},
      history: [],
      booking: JSON.parse(localStorage.getItem(storageKey) || 'null') || {
        roomType: null,
        guests: 2,
        checkin: null,
        checkout: null,
        name: null,
        email: null,
        phone: null,
        confirmed: false,
      },
      storageKey
    };
  }

  save(){ localStorage.setItem(this.state.storageKey, JSON.stringify(this.state.booking)); }

  reset(){
    this.state.booking = { roomType:null, guests:2, checkin:null, checkout:null, name:null, email:null, phone:null, confirmed:false };
    this.save();
  }

  reply(text) {
    const nlu = classify(text);
    this.state.history.push({ role: 'user', text, nlu });

    switch (nlu.intent) {
      case 'greeting':
        return this._greet();
      case 'help':
        return [knowledge.help];
      case 'amenities':
        return [knowledge.amenities.spa, knowledge.amenities.wifi];
      case 'dining':
        return [knowledge.dining.hours, knowledge.dining.chef];
      case 'policy':
        return [knowledge.policies.checkin, knowledge.policies.cancellation];
      case 'location':
        return [knowledge.location];
      case 'smalltalk_weather':
        return [knowledge.smalltalk.weather];
      case 'smalltalk_joke':
        return [knowledge.smalltalk.joke];
      case 'thanks':
        return ["Happy to help!"];
      case 'goodbye':
        return ["Safe travels—see you soon by the lake."];
      case 'price':
        return this._handlePrice(nlu);
      case 'book':
        return this._handleBooking(nlu);
      case 'cancel':
        return this._handleCancel(nlu);
      case 'confirm':
        return this._handleConfirm();
      case 'provide_contact':
        return this._handleProvideContact(nlu);
      default:
        return ["I can help with booking, prices, spa, dining, and policies. Try asking about 'availability next weekend' or 'Lakeside Suite price'."];
    }
  }

  _greet(){
    const greet = randomItem(knowledge.greetings);
    const tip = "Try 'Check availability for next weekend' or 'Show spa hours'.";
    return [greet, tip];
  }

  _handlePrice(nlu) {
    const { roomType = this.state.booking.roomType || 'deluxe king' } = nlu;
    // default to 2 nights this weekend
    let checkin = nlu.dates.checkin ? parseISODate(nlu.dates.checkin) : addDays(new Date(), 5);
    let checkout = nlu.dates.checkout ? parseISODate(nlu.dates.checkout) : addDays(checkin, 2);
    const guests = nlu.guests || this.state.booking.guests || 2;

    const { nights, total } = estimatePrice(roomType, checkin, checkout, guests);
    const avg = total / Math.max(1, nights);

    return [
      `${capitalize(roomType)} for ${guests} guest${guests>1?'s':''}: ~${formatCurrency(avg)} avg/night (${nights} nights).`,
      `Sample stay ${formatDate(checkin)}–${formatDate(checkout)}. Ask 'book it' to proceed or change dates.`
    ];
  }

  _handleBooking(nlu) {
    if (nlu.roomType) this.state.booking.roomType = nlu.roomType;
    if (nlu.guests) this.state.booking.guests = nlu.guests;
    if (nlu.dates.checkin) this.state.booking.checkin = nlu.dates.checkin;
    if (nlu.dates.checkout) this.state.booking.checkout = nlu.dates.checkout;

    // Slot filling
    const missing = [];
    if (!this.state.booking.roomType) missing.push('room type');
    if (!this.state.booking.checkin) missing.push('check-in date');
    if (!this.state.booking.checkout) missing.push('check-out date');

    if (missing.length) {
      return [`Great—let's get your stay set. I still need your ${missing.join(', ')}.`];
    }

    const checkin = parseISODate(this.state.booking.checkin);
    const checkout = parseISODate(this.state.booking.checkout);
    const avail = mockAvailability(this.state.booking.roomType, checkin, checkout, this.state.booking.guests);
    if (!avail.ok) {
      const msg = avail.reason === 'sold_out' ? 'Those dates are sold out.' : 'Please check your dates.';
      return [msg, 'Try different dates or another room type.'];
    }

    const { nights, total } = estimatePrice(this.state.booking.roomType, checkin, checkout, this.state.booking.guests);
    const summary = `${capitalize(this.state.booking.roomType)} | ${formatDate(checkin)}–${formatDate(checkout)} | ${this.state.booking.guests} guest${this.state.booking.guests>1?'s':''}`;
    this.save();
    return [
      `Available! ${summary}. ${formatCurrency(total)} total (taxes included).`,
      'Would you like to confirm? I can take a name and email.'
    ];
  }

  _handleCancel() {
    if (!this.state.booking.checkin) return ['No active reservation on file.'];
    this.reset();
    return ['Your tentative booking has been cleared.'];
  }

  provideContact(name, email) {
    this.state.booking.name = name;
    this.state.booking.email = email;
    this.state.booking.confirmed = true;
    this.save();
    return [`Booked! A confirmation email will be sent to ${email}. Anything else I can help with?`];
  }

  _handleConfirm(){
    const b = this.state.booking;
    if (!b.checkin || !b.checkout || !b.roomType) {
      return ['Let’s pick a room and dates first. Try: “Book Lakeside Suite 2025-11-10 to 2025-11-12.”'];
    }
    if (!b.name || !b.email) {
      return ['Great! Please share your name and email to confirm.'];
    }
    b.confirmed = true; this.save();
    return [`All set, ${b.name}! Your reservation is confirmed. A confirmation will be sent to ${b.email}.`];
  }

  _handleProvideContact(nlu){
    const { name, email } = nlu.contact || {};
    if (!name && !email) return ['Please provide a name and email (e.g., "I am Alex, email is alex@example.com").'];
    if (name) this.state.booking.name = name;
    if (email) this.state.booking.email = email;
    this.save();
    if (this.state.booking.name && this.state.booking.email) {
      return this._handleConfirm();
    }
    return ['Thanks! I still need your ' + (!this.state.booking.name ? 'name' : 'email') + ' to confirm.'];
  }
}

function capitalize(s){ return s ? s.charAt(0).toUpperCase()+s.slice(1) : s; }
