import { calculateSubnet, createChallenge, checkAnswer } from './network.mjs';
import { messages, projectRepositories } from './content.mjs';

const lang = document.documentElement.lang === 'en' ? 'en' : 'fr';
const t = messages[lang];
const $ = selector => document.querySelector(selector);

// Language links remain ordinary navigable links; storage failure never blocks navigation.
document.querySelectorAll('[data-language]').forEach(link => {
  link.addEventListener('click', () => {
    try { localStorage.setItem('fdg-language', link.dataset.language); } catch { /* Private mode / blocked storage. */ }
    const target = new URL(link.href);
    target.hash = location.hash;
    link.href = target.href;
  });
});
try {
  const remembered = localStorage.getItem('fdg-language');
  const explicit = new URLSearchParams(location.search).get('lang');
  if (lang === 'fr' && remembered === 'en' && !explicit && !location.hash && !document.referrer) {
    location.replace(new URL('en/', location.href).href);
  }
} catch { /* The complete FR/EN documents still work without localStorage. */ }

const calcForm = $('#calculator-form');
const ipInput = $('#ip-address');
const prefixInput = $('#prefix');
const results = $('#calc-results');
const binary = $('#binary-result');
const binaryDetails = $('.binary-details');

function renderSubnet(subnet) {
  $('#result-cidr').textContent = subnet.cidr;
  for (const field of ['mask', 'wildcard', 'network', 'broadcast', 'firstHost', 'lastHost', 'hostCount']) {
    const value = subnet[field];
    $(`#result-${field}`).textContent = field === 'hostCount' ? value.toLocaleString(lang === 'fr' ? 'fr-BE' : 'en-GB') : value ?? t.unavailable;
  }
  $('#subnet-note').textContent = t[subnet.kind];
  binary.replaceChildren();
  for (let octet = 0; octet < 4; octet++) {
    const group = document.createElement('span');
    group.className = 'binary-octet';
    for (let bit = 0; bit < 8; bit++) {
      const index = octet * 8 + bit;
      const span = document.createElement('span');
      span.className = index < subnet.prefix ? 'bit-network' : 'bit-host';
      span.textContent = subnet.binary[index];
      group.append(span);
    }
    binary.append(group);
  }
}

function calculate() {
  $('#calc-error').textContent = '';
  ipInput.removeAttribute('aria-invalid');
  prefixInput.removeAttribute('aria-invalid');
  try {
    const subnet = calculateSubnet(ipInput.value, prefixInput.value);
    renderSubnet(subnet);
    results.hidden = false;
    binaryDetails.hidden = false;
    return true;
  } catch (error) {
    const field = error.code === 'invalidPrefix' ? prefixInput : ipInput;
    field.setAttribute('aria-invalid', 'true');
    $('#calc-error').textContent = `${t[error.code] ?? t.invalidIp} ${t.staleResults}`;
    results.hidden = true;
    binaryDetails.hidden = true;
    field.focus();
    return false;
  }
}
calcForm.addEventListener('submit', event => { event.preventDefault(); calculate(); });
document.querySelectorAll('[data-example]').forEach(button => {
  button.addEventListener('click', () => {
    const [address, prefix] = button.dataset.example.split('/');
    ipInput.value = address;
    prefixInput.value = prefix;
    calculate();
  });
});

// Accessible tabs: roving focus, arrow keys and Home/End.
const tabs = [...document.querySelectorAll('[role="tab"]')];
function activateTab(tab, moveFocus = false) {
  for (const item of tabs) {
    const selected = item === tab;
    item.setAttribute('aria-selected', String(selected));
    item.tabIndex = selected ? 0 : -1;
    document.getElementById(item.getAttribute('aria-controls')).hidden = !selected;
  }
  if (moveFocus) tab.focus();
}
tabs.forEach((tab, index) => {
  tab.addEventListener('click', () => activateTab(tab));
  tab.addEventListener('keydown', event => {
    let next;
    if (event.key === 'ArrowRight') next = (index + 1) % tabs.length;
    if (event.key === 'ArrowLeft') next = (index + tabs.length - 1) % tabs.length;
    if (event.key === 'Home') next = 0;
    if (event.key === 'End') next = tabs.length - 1;
    if (next !== undefined) { event.preventDefault(); activateTab(tabs[next], true); }
  });
});

let challenge;
let answered = false;
let correctAnswers = 0;
let attempts = 0;
const answerInput = $('#challenge-answer');
function nextChallenge(focus = false) {
  challenge = createChallenge();
  answered = false;
  $('#challenge-cidr').textContent = `${challenge.address}/${challenge.prefix}`;
  $('#challenge-question').textContent = t[`question${challenge.field[0].toUpperCase()}${challenge.field.slice(1)}`];
  answerInput.value = '';
  answerInput.disabled = false;
  answerInput.removeAttribute('aria-invalid');
  answerInput.inputMode = challenge.field === 'hostCount' ? 'numeric' : 'decimal';
  $('#challenge-feedback').textContent = '';
  $('#challenge-feedback').removeAttribute('data-correct');
  $('#challenge-check').disabled = false;
  if (focus) answerInput.focus();
}
$('#challenge-form').addEventListener('submit', event => {
  event.preventDefault();
  if (answered) return;
  if (!answerInput.value.trim()) {
    $('#challenge-feedback').textContent = t.answerRequired;
    answerInput.setAttribute('aria-invalid', 'true');
    answerInput.focus();
    return;
  }
  const correct = checkAnswer(challenge, answerInput.value);
  answered = true;
  attempts++;
  if (correct) correctAnswers++;
  answerInput.disabled = true;
  answerInput.removeAttribute('aria-invalid');
  $('#challenge-check').disabled = true;
  $('#challenge-score').textContent = `${correctAnswers} / ${attempts}`;
  const explanation = t.explanation.replace('{cidr}', challenge.subnet.cidr).replace('{mask}', challenge.subnet.mask).replace('{hosts}', String(challenge.subnet.hostCount));
  $('#challenge-feedback').textContent = `${correct ? t.correct : t.incorrect} ${t.solution} ${challenge.answer}\n${explanation}`;
  $('#challenge-feedback').dataset.correct = String(correct);
});
$('#challenge-next').addEventListener('click', () => nextChallenge(true));

// Project sheets use DOM nodes rather than HTML interpolation.
const dialog = $('#project-dialog');
function element(tag, text, className) {
  const node = document.createElement(tag);
  node.textContent = text;
  if (className) node.className = className;
  return node;
}
document.querySelectorAll('[data-project]').forEach(button => {
  button.addEventListener('click', () => {
    const project = t[button.dataset.project];
    if (!project) return;
    const content = $('#dialog-content');
    content.replaceChildren(element('span', project.status, 'project-status'));
    const title = element('h2', project.title);
    title.id = 'dialog-title';
    content.append(title, element('p', project.intro), element('h3', project.heading1), element('p', project.text1), element('h3', project.heading2));
    const list = document.createElement('ul');
    for (const item of project.items) list.append(element('li', item));
    content.append(list, element('h3', project.heading3));
    if (project.code) content.append(element('pre', project.code));
    if (project.text3) content.append(element('p', project.text3));
    content.append(element('p', project.conclusion, 'dialog-conclusion'));
    const sourceUrl = projectRepositories[button.dataset.project];
    if (sourceUrl) {
      const link = element('a', t.sourceLink, 'project-link');
      link.href = sourceUrl;
      link.target = '_blank';
      link.rel = 'noopener noreferrer';
      content.append(link);
    }
    dialog.showModal();
    dialog.scrollTop = 0;
  });
});
$('#dialog-close').addEventListener('click', () => dialog.close());
dialog.addEventListener('click', event => {
  const rect = dialog.getBoundingClientRect();
  if (event.target === dialog && (event.clientX < rect.left || event.clientX > rect.right || event.clientY < rect.top || event.clientY > rect.bottom)) dialog.close();
});

// Mark the current section without changing the page's focus or URL.
if ('IntersectionObserver' in window) {
  const observer = new IntersectionObserver(entries => {
    for (const entry of entries) if (entry.isIntersecting) {
      document.querySelectorAll('.main-nav a').forEach(link => {
        if (link.hash === `#${entry.target.id}`) link.setAttribute('aria-current', 'location');
        else link.removeAttribute('aria-current');
      });
    }
  }, { rootMargin: '-18% 0px -62% 0px', threshold: 0 });
  document.querySelectorAll('main section[id]').forEach(section => observer.observe(section));
}

calculate();
nextChallenge();
$('#lab-shell').hidden = false;
