import { initializeApp, getApp, getApps } from 'https://www.gstatic.com/firebasejs/12.15.0/firebase-app.js';
import {
  getAuth,
  onAuthStateChanged,
  signInWithEmailAndPassword,
  signOut
} from 'https://www.gstatic.com/firebasejs/12.15.0/firebase-auth.js';
import { firebaseConfig, FAMILY_EMAIL, PASSWORD_PREFIX } from './firebase-config.js';

const app = getApps().length ? getApp() : initializeApp(firebaseConfig);
const auth = getAuth(app);

const loading = document.getElementById('auth-loading');
const gate = document.getElementById('passcode-gate');
const gateInputs = document.getElementById('gate-inputs');
const gateError = document.getElementById('gate-error');
const gateSubmit = document.getElementById('gate-submit');
const digits = Array.from(document.querySelectorAll('.gate-digit'));
const spaceRoot = document.getElementById('person-space-root');
const footer = document.getElementById('site-footer');
const lockButton = document.getElementById('lock-btn');

bindGateControls();

onAuthStateChanged(auth, user => {
  loading.hidden = true;
  if (user) {
    gate.hidden = true;
    spaceRoot.hidden = false;
    footer.hidden = false;
  } else {
    spaceRoot.hidden = true;
    footer.hidden = true;
    gate.hidden = false;
    window.setTimeout(() => digits[0]?.focus(), 0);
  }
});

gateSubmit.addEventListener('click', attemptLogin);
lockButton.addEventListener('click', async () => {
  await signOut(auth);
  digits.forEach(digit => { digit.value = ''; });
});

function bindGateControls() {
  digits.forEach((digit, index) => {
    digit.addEventListener('input', () => {
      digit.value = digit.value.replace(/\D/g, '').slice(-1);
      gateError.hidden = true;
      if (digit.value && index < digits.length - 1) digits[index + 1].focus();
      if (digits.every(input => input.value)) attemptLogin();
    });

    digit.addEventListener('keydown', event => {
      if (event.key === 'Backspace' && !digit.value && index > 0) digits[index - 1].focus();
      if (event.key === 'Enter') attemptLogin();
    });

    digit.addEventListener('paste', event => {
      const code = event.clipboardData.getData('text').replace(/\D/g, '').slice(0, 4);
      if (!code) return;
      event.preventDefault();
      code.split('').forEach((number, codeIndex) => {
        if (digits[codeIndex]) digits[codeIndex].value = number;
      });
      digits[Math.min(code.length, digits.length) - 1].focus();
      if (code.length === 4) attemptLogin();
    });
  });
}

async function attemptLogin() {
  if (gateSubmit.disabled) return;
  const code = digits.map(digit => digit.value).join('');
  if (code.length !== 4) {
    showError('Enter all 4 digits');
    return;
  }

  gateSubmit.disabled = true;
  gateSubmit.textContent = 'Checking…';
  try {
    await signInWithEmailAndPassword(auth, FAMILY_EMAIL, PASSWORD_PREFIX + code);
  } catch {
    showError('Wrong code — try again');
    digits.forEach(digit => { digit.value = ''; });
    digits[0].focus();
  } finally {
    gateSubmit.disabled = false;
    gateSubmit.textContent = 'Unlock';
  }
}

function showError(message) {
  gateError.textContent = message;
  gateError.hidden = false;
  gateInputs.classList.remove('shake');
  void gateInputs.offsetWidth;
  gateInputs.classList.add('shake');
}
