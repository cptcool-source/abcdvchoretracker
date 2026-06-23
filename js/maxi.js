// ==========================================================================
// maxi.js — mAxI golden doodle AI tutor
// Firebase Auth gate (same pattern as other pages) + Gemini 1.5 Flash chat.
// History is session-only: cleared when the page closes.
// ==========================================================================

import { firebaseConfig, FAMILY_EMAIL, PASSWORD_PREFIX }
  from './firebase-config.js';
import { GEMINI_API_KEY } from './secrets.js';
import { initializeApp }
  from 'https://www.gstatic.com/firebasejs/12.15.0/firebase-app.js';
import { getAuth, signInWithEmailAndPassword, onAuthStateChanged, signOut }
  from 'https://www.gstatic.com/firebasejs/12.15.0/firebase-auth.js';

// ── Gemini config ────────────────────────────────────────────────────────────
const GEMINI_URL = `https://generativelanguage.googleapis.com/v1beta/models/gemini-1.5-flash:generateContent?key=${GEMINI_API_KEY}`;

const SYSTEM_PROMPT = `You are mAxI, a cheerful and patient golden doodle who helps middle schoolers (grades 6-8) with math. You are talking directly with a student.

Core tutoring rules:
- NEVER give just the final answer. Always break solutions into numbered steps.
- After explaining, ask "Want to try a similar problem?"
- When a student shares their work, give specific feedback — praise what's right, gently correct what isn't.
- Use clear, simple language for a 12-14 year old. No jargon.
- Keep responses focused. Prefer numbered steps over long paragraphs.
- Format: use × for multiplication, ÷ for division, ^ for exponents, √ for square roots.

Topics: fractions, decimals, percentages, ratios, proportions, pre-algebra, algebra 1, equations, inequalities, PEMDAS, geometry (area, perimeter, angles, Pythagorean theorem), coordinate plane, basic statistics, word problems.

Personality:
- Warm and encouraging. Celebrate effort, not just correct answers.
- Rarely, use a light dog pun (like "paw-some work!") — only when it fits naturally.
- If asked anything not math-related: "Woof, that's outside my expertise! I'm best at math — what problem are you working on?" then redirect.
- Never help with non-math subjects, write essays, or do anything other than math tutoring.`;

// ── DOM refs ─────────────────────────────────────────────────────────────────
const authLoading = document.getElementById('auth-loading');
const gate        = document.getElementById('passcode-gate');
const maxiRoot    = document.getElementById('maxi-root');
const siteFooter  = document.getElementById('site-footer');
const gateError   = document.getElementById('gate-error');
const gateInputs  = document.getElementById('gate-inputs');
const digits      = Array.from(document.querySelectorAll('.gate-digit'));
const chatArea    = document.getElementById('chat-area');
const chatInput   = document.getElementById('chat-input');
const sendBtn     = document.getElementById('send-btn');
const welcomeEl   = document.getElementById('maxi-welcome');
const maxiBar     = document.getElementById('maxi-bar');
const maxiStatus  = document.getElementById('maxi-status');

// ── Firebase auth ─────────────────────────────────────────────────────────────
const fbApp = initializeApp(firebaseConfig);
const auth  = getAuth(fbApp);

onAuthStateChanged(auth, user => {
  authLoading.hidden = true;
  if (user) showApp();
  else      gate.hidden = false;
});

// Gate — digit input
digits.forEach((d, i) => {
  d.addEventListener('input', () => {
    d.value = d.value.replace(/\D/g, '').slice(-1);
    if (d.value && i < 3) digits[i + 1].focus();
    if (digits.every(d => d.value)) tryUnlock();
  });
  d.addEventListener('keydown', e => {
    if (e.key === 'Backspace' && !d.value && i > 0) digits[i - 1].focus();
  });
});
document.getElementById('gate-submit').addEventListener('click', tryUnlock);

async function tryUnlock() {
  const code = digits.map(d => d.value).join('');
  if (code.length !== 4) return;
  try {
    await signInWithEmailAndPassword(auth, FAMILY_EMAIL, PASSWORD_PREFIX + code);
  } catch {
    gateError.hidden = false;
    gateInputs.classList.add('shake');
    digits.forEach(d => { d.value = ''; });
    setTimeout(() => gateInputs.classList.remove('shake'), 500);
    digits[0].focus();
  }
}

function showApp() {
  gate.hidden        = false; // handled by auth state
  gate.hidden        = true;
  maxiRoot.hidden    = false;
  siteFooter.hidden  = false;
  chatInput.focus();

  // Warn if the Gemini key hasn't been set up yet
  if (!GEMINI_API_KEY || GEMINI_API_KEY === 'YOUR_GEMINI_API_KEY_HERE') {
    appendBubble('maxi',
      'Woof! I need a Gemini API key to work. ' +
      'Head to **aistudio.google.com**, grab a free key, ' +
      'and paste it into **js/firebase-config.js** where it says `GEMINI_API_KEY`.'
    );
    chatInput.disabled = true;
    sendBtn.disabled   = true;
    activateChatMode();
  }
}

// Lock
document.getElementById('lock-btn').addEventListener('click', async () => {
  await signOut(auth);
  location.reload();
});

// ── Chat state ─────────────────────────────────────────────────────────────────
const history = []; // { role: 'user'|'model', parts: [{ text }] }
let isThinking = false;

// Suggestion chips
document.querySelectorAll('.suggestion-chip').forEach(chip => {
  chip.addEventListener('click', () => {
    chatInput.value = chip.dataset.msg;
    resizeInput();
    handleSend();
  });
});

// Clear chat
document.getElementById('clear-chat-btn').addEventListener('click', () => {
  history.length = 0;
  chatArea.innerHTML = '';
  welcomeEl.hidden = false;
  maxiBar.hidden   = true;
  maxiRoot.classList.remove('chat-mode');
  setSprite('idle');
  chatInput.value = '';
  chatInput.style.height = 'auto';
  sendBtn.disabled = true;
});

// Enter to send (Shift+Enter for newline)
chatInput.addEventListener('keydown', e => {
  if (e.key === 'Enter' && !e.shiftKey) {
    e.preventDefault();
    handleSend();
  }
});

// Auto-grow textarea + toggle send button
chatInput.addEventListener('input', () => {
  resizeInput();
  if (!isThinking) sendBtn.disabled = !chatInput.value.trim();
});

function resizeInput() {
  chatInput.style.height = 'auto';
  chatInput.style.height = Math.min(chatInput.scrollHeight, 120) + 'px';
}

sendBtn.addEventListener('click', handleSend);

// ── Main send handler ─────────────────────────────────────────────────────────
async function handleSend() {
  const text = chatInput.value.trim();
  if (!text || isThinking) return;

  if (!maxiRoot.classList.contains('chat-mode')) activateChatMode();

  appendBubble('user', text);
  chatInput.value = '';
  chatInput.style.height = 'auto';
  sendBtn.disabled = true;

  isThinking = true;
  setSprite('thinking');
  maxiStatus.textContent = 'Thinking…';

  const typing = appendTyping();

  try {
    const reply = await fetchGemini(text);
    typing.remove();
    appendBubble('maxi', reply);
    setSprite('happy');
    maxiStatus.textContent = 'Ready to help';
    setTimeout(() => setSprite('idle'), 1800);
  } catch (err) {
    typing.remove();
    appendBubble('maxi', 'Woof! Something went wrong — try asking again?');
    setSprite('idle');
    maxiStatus.textContent = 'Ready to help';
  }

  isThinking = false;
  sendBtn.disabled = !chatInput.value.trim();
}

// ── Gemini API call ───────────────────────────────────────────────────────────
async function fetchGemini(userText) {
  history.push({ role: 'user', parts: [{ text: userText }] });

  const res = await fetch(GEMINI_URL, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      systemInstruction: { parts: [{ text: SYSTEM_PROMPT }] },
      contents: history,
      generationConfig: { maxOutputTokens: 800, temperature: 0.7 }
    })
  });

  if (!res.ok) throw new Error(`Gemini ${res.status}`);
  const data = await res.json();
  const reply = data.candidates?.[0]?.content?.parts?.[0]?.text;
  if (!reply) throw new Error('empty');

  history.push({ role: 'model', parts: [{ text: reply }] });
  return reply;
}

// ── UI helpers ────────────────────────────────────────────────────────────────
function activateChatMode() {
  welcomeEl.hidden = true;
  maxiBar.hidden   = false;
  maxiRoot.classList.add('chat-mode');
}

function appendBubble(role, text) {
  const wrap = document.createElement('div');
  wrap.className = `chat-wrap chat-${role}`;

  const bubble = document.createElement('div');
  bubble.className = 'chat-bubble';
  bubble.innerHTML = renderText(text);
  wrap.appendChild(bubble);

  if (role === 'maxi') {
    const btn = document.createElement('button');
    btn.className = 'copy-btn';
    btn.title = 'Copy';
    btn.innerHTML = '<i class="ph-duotone ph-duotone-copy" aria-hidden="true"></i>';
    btn.addEventListener('click', () => {
      navigator.clipboard.writeText(text).catch(() => {});
      btn.innerHTML = '<i class="ph-duotone ph-duotone-check" aria-hidden="true"></i>';
      setTimeout(() => {
        btn.innerHTML = '<i class="ph-duotone ph-duotone-copy" aria-hidden="true"></i>';
      }, 1600);
    });
    wrap.appendChild(btn);
  }

  chatArea.appendChild(wrap);
  chatArea.scrollTop = chatArea.scrollHeight;
}

function appendTyping() {
  const wrap = document.createElement('div');
  wrap.className = 'chat-wrap chat-maxi';
  wrap.innerHTML = '<div class="chat-bubble typing-bubble"><span></span><span></span><span></span></div>';
  chatArea.appendChild(wrap);
  chatArea.scrollTop = chatArea.scrollHeight;
  return wrap;
}

// Simple line-by-line markdown renderer (no external deps)
function renderText(raw) {
  // Escape HTML first
  const safe = raw
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    // Inline formatting (applied after escaping so we don't double-escape)
    .replace(/\*\*(.+?)\*\*/g, '<strong>$1</strong>')
    .replace(/\*(.+?)\*/g,     '<em>$1</em>')
    .replace(/`([^`\n]+)`/g,   '<code>$1</code>');

  const lines = safe.split('\n');
  let html = '';
  let listType = '';  // 'ol' | 'ul' | ''

  function closeList() {
    if (listType) { html += `</${listType}>`; listType = ''; }
  }

  for (const line of lines) {
    const olMatch = line.match(/^(\d+)\.\s+(.+)/);
    const ulMatch = line.match(/^[•\-\*]\s+(.+)/);

    if (olMatch) {
      if (listType !== 'ol') { closeList(); html += '<ol>'; listType = 'ol'; }
      html += `<li>${olMatch[2]}</li>`;
    } else if (ulMatch) {
      if (listType !== 'ul') { closeList(); html += '<ul>'; listType = 'ul'; }
      html += `<li>${ulMatch[1]}</li>`;
    } else {
      closeList();
      html += line.trim() === '' ? '<br>' : line + '<br>';
    }
  }
  closeList();

  // Trim trailing <br>
  return html.replace(/(<br>\s*)+$/, '');
}

// Swap data-state on both sprite elements
function setSprite(state) {
  ['maxi-sprite-welcome', 'maxi-sprite-bar'].forEach(id => {
    const el = document.getElementById(id);
    if (el) el.dataset.state = state;
  });
}
