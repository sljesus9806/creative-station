// Íconos y adornos SVG en línea.
const { raw } = require('../util');

const i = (path, extra = '') => raw(`<svg viewBox="0 0 24 24" width="20" height="20" fill="none" stroke="currentColor" stroke-width="1.9" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true" ${extra}>${path}</svg>`);

const icons = {
  bag: i('<path d="M5 8h14l-1.2 11.2a2 2 0 0 1-2 1.8H8.2a2 2 0 0 1-2-1.8L5 8Z"/><path d="M9 8V6.5a3 3 0 0 1 6 0V8"/>'),
  menu: i('<path d="M4 7h16M4 12h16M4 17h16"/>'),
  close: i('<path d="M6 6l12 12M18 6 6 18"/>'),
  arrow: i('<path d="M5 12h14M13 6l6 6-6 6"/>'),
  search: i('<circle cx="11" cy="11" r="6.5"/><path d="m16 16 4 4"/>'),
  sparkle: i('<path d="M12 3v4M12 17v4M3 12h4M17 12h4M6 6l2.5 2.5M15.5 15.5 18 18M6 18l2.5-2.5M15.5 8.5 18 6"/>'),
  truck: i('<path d="M3 7h11v9H3zM14 10h4l3 3v3h-7z"/><circle cx="7" cy="18" r="1.6"/><circle cx="17" cy="18" r="1.6"/>'),
  heart: i('<path d="M12 20s-7-4.4-7-10a4 4 0 0 1 7-2.6A4 4 0 0 1 19 10c0 5.6-7 10-7 10Z"/>'),
  pencil: i('<path d="M4 20h4L19 9l-4-4L4 16v4Z"/><path d="m13.5 6.5 4 4"/>'),
  chat: i('<path d="M4 18.5V6a2 2 0 0 1 2-2h12a2 2 0 0 1 2 2v9a2 2 0 0 1-2 2H8l-4 3.5Z"/>'),
  trash: i('<path d="M4 7h16M9 7V4h6v3M6 7l1 13h10l1-13"/>'),
  plus: i('<path d="M12 5v14M5 12h14"/>'),
  minus: i('<path d="M5 12h14"/>'),
  check: i('<path d="m5 12.5 4.5 4.5L19 7.5"/>'),
  instagram: i('<rect x="3.5" y="3.5" width="17" height="17" rx="5"/><circle cx="12" cy="12" r="4"/><circle cx="17.2" cy="6.8" r=".8" fill="currentColor"/>'),
  pin: i('<path d="M12 21s-6.5-5.8-6.5-11a6.5 6.5 0 0 1 13 0c0 5.2-6.5 11-6.5 11Z"/><circle cx="12" cy="10" r="2.3"/>'),
  calendar: i('<rect x="4" y="5" width="16" height="15" rx="2.5"/><path d="M4 10h16M9 3v4M15 3v4"/>'),
  scissors: i('<circle cx="6.5" cy="17.5" r="2.5"/><circle cx="6.5" cy="6.5" r="2.5"/><path d="M8.6 8 20 18M8.6 16 20 6"/>'),
  image: i('<rect x="3.5" y="4.5" width="17" height="15" rx="2.5"/><circle cx="9" cy="10" r="1.8"/><path d="m20 16-4.5-4.5L6 19.5"/>'),
  whatsapp: raw('<svg viewBox="0 0 32 32" width="22" height="22" aria-hidden="true"><path fill="currentColor" d="M16 3.2A12.7 12.7 0 0 0 5.1 22.4L3.3 28.8l6.6-1.7A12.7 12.7 0 1 0 16 3.2Zm0 23.2a10.5 10.5 0 0 1-5.4-1.5l-.4-.2-3.9 1 1-3.8-.2-.4A10.5 10.5 0 1 1 16 26.4Zm5.8-7.9c-.3-.2-1.9-.9-2.2-1s-.5-.2-.7.2-.8 1-1 1.2-.4.2-.7.1a8.6 8.6 0 0 1-4.3-3.7c-.3-.6.3-.5.9-1.7a.6.6 0 0 0 0-.5l-1-2.4c-.3-.6-.5-.5-.7-.5h-.6a1.2 1.2 0 0 0-.9.4 3.7 3.7 0 0 0-1.1 2.7 6.5 6.5 0 0 0 1.4 3.4 14.6 14.6 0 0 0 5.6 5c2.1.9 2.9 1 4 .8a3.4 3.4 0 0 0 2.2-1.6 2.8 2.8 0 0 0 .2-1.6c-.1-.1-.3-.2-.6-.3Z"/></svg>'),
};

/** Moño coquette (adorno). */
function bow(color = 'var(--blush-400)', cls = '') {
  return raw(`<svg class="bow ${cls}" viewBox="0 0 120 84" aria-hidden="true" focusable="false">
  <g fill="${color}" stroke="var(--ink)" stroke-opacity=".18" stroke-width="1.5" stroke-linejoin="round">
    <path d="M57 44 47 79l8-4 4 7 5-36Z"/>
    <path d="M63 44l10 35-8-4-4 7-5-36Z"/>
    <path d="M60 38C46 12 14 6 10 24c-4 18 22 26 50 14Z"/>
    <path d="M60 38c14-26 46-32 50-14 4 18-22 26-50 14Z"/>
  </g>
  <g fill="none" stroke="#fff" stroke-opacity=".7" stroke-width="2.4" stroke-linecap="round">
    <path d="M52 34C40 20 24 16 20 24"/><path d="M68 34c12-14 28-18 32-10"/>
  </g>
  <ellipse cx="60" cy="39" rx="9" ry="10" fill="${color}" stroke="var(--ink)" stroke-opacity=".22" stroke-width="1.5"/>
  <ellipse cx="57.5" cy="36" rx="3" ry="2.4" fill="#fff" opacity=".6"/>
</svg>`);
}

/** Destello de 4 puntas. */
function twinkle(cls = '', color = 'currentColor') {
  return raw(`<svg class="twinkle ${cls}" viewBox="0 0 24 24" aria-hidden="true"><path fill="${color}" d="M12 0c.7 6.4 2.6 9.9 12 12-9.4 2.1-11.3 5.6-12 12-.7-6.4-2.6-9.9-12-12 9.4-2.1 11.3-5.6 12-12Z"/></svg>`);
}

module.exports = { icons, bow, twinkle };
