// DOM helpers
export function el(tag, options = {}) {
  const node = document.createElement(tag);
  if (options.className) node.className = options.className;
  if (options.attrs) Object.entries(options.attrs).forEach(([k, v]) => node.setAttribute(k, v));
  if (options.text) node.textContent = options.text;
  if (options.html) node.innerHTML = options.html;
  return node;
}

export function on(target, event, handler, opts) {
  target.addEventListener(event, handler, opts);
  return () => target.removeEventListener(event, handler, opts);
}

export function scrollToBottom(node) {
  node.scrollTop = node.scrollHeight;
}

export function formatCurrency(amount) {
  return new Intl.NumberFormat(undefined, { style: 'currency', currency: 'USD' }).format(amount);
}

export function debounce(fn, wait = 250) {
  let t;
  return (...args) => {
    clearTimeout(t);
    t = setTimeout(() => fn(...args), wait);
  };
}
