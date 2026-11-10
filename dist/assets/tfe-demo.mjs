const start = {
  layer: 4, node: 0, phase: 'outbound', path: [0, 0],
  fr: ['TCP · Tentative de connexion', 'Le client prépare un SYN vers 192.168.20.10 sur le port 80.'],
  en: ['TCP · Connection attempt', 'The client prepares a SYN for 192.168.20.10 on port 80.']
};

const resolveGateway = {
  layer: 2, node: 1, phase: 'roundTrip', path: [0, 2],
  fr: ['Ethernet / ARP · Passerelle résolue', 'S1 apprend la MAC source du client en relayant sa demande ARP. R1 répond avec sa MAC pour 192.168.10.1.'],
  en: ['Ethernet / ARP · Gateway resolved', 'S1 learns the client’s source MAC as it forwards the ARP request. R1 replies with its MAC for 192.168.10.1.']
};

const switchFrame = {
  layer: 2, node: 1, phase: 'outbound', path: [0, 2],
  fr: ['Ethernet · Trame commutée', 'Le client adresse la trame à la MAC de R1. S1 l’envoie sur le port associé à cette adresse.'],
  en: ['Ethernet · Frame switched', 'The client addresses the frame to R1’s MAC. S1 forwards it to the port associated with that address.']
};

const forward = {
  layer: 3, node: 2, phase: 'outbound', path: [2, 3],
  fr: ['IPv4 · Route sélectionnée', 'R1 utilise sa route statique vers 192.168.20.0/24 via 10.0.0.2.'],
  en: ['IPv4 · Route selected', 'R1 uses its static route to 192.168.20.0/24 via 10.0.0.2.']
};

const reachedServer = {
  layer: 4, node: 4, phase: 'outbound', path: [3, 4],
  fr: ['TCP · SYN reçu par le serveur', 'R2 transmet le paquet sur le réseau du serveur. Le port 80 écoute et le serveur émet un SYN-ACK.'],
  en: ['TCP · Server receives the SYN', 'R2 forwards the packet onto the server’s network. Port 80 is listening and the server sends a SYN-ACK.']
};

const connected = {
  layer: 4, node: 0, phase: 'roundTrip', path: [0, 4],
  fr: ['TCP · Connexion établie', 'Le client reçoit le SYN-ACK et renvoie un ACK. Le serveur reçoit cet ACK et la connexion est établie.'],
  en: ['TCP · Connection established', 'The client receives the SYN-ACK and sends an ACK. The server receives that ACK and the connection is established.']
};

function request(resource) {
  return {
    layer: 7, node: 4, phase: 'outbound', path: [0, 4],
    fr: ['HTTP · Requête reçue', `Le serveur reçoit GET ${resource}.`],
    en: ['HTTP · Request received', `The server receives GET ${resource}.`]
  };
}

const routed = [start, resolveGateway, switchFrame, forward];
const connectedTrace = [...routed, reachedServer, connected];
const scenarios = {
  ok: [...connectedTrace, request('/index.html'), {
    layer: 7, node: 0, phase: 'inbound', path: [4, 0],
    fr: ['HTTP 200 · Ressource reçue', 'Le client reçoit le contenu de /index.html.'],
    en: ['HTTP 200 · Resource received', 'The client receives the contents of /index.html.']
  }],
  link: [start, {
    layer: 1, node: 1, phase: 'outbound', path: [0, 1], failed: true,
    fr: ['Lien inactif · Blocage sur S1–R1', 'La demande ARP atteint S1. Le lien inactif empêche la trame d’atteindre la passerelle.'],
    en: ['Link down · Blocked between S1 and R1', 'The ARP request reaches S1. The down link prevents the frame from reaching the gateway.']
  }],
  route: [...routed, reachedServer, {
    layer: 3, node: 3, phase: 'inbound', path: [4, 3], failed: true,
    fr: ['IPv4 · Aucune route retour', 'Le SYN-ACK atteint R2, qui ne trouve aucune route vers 192.168.10.10. Le client reste en attente.'],
    en: ['IPv4 · No return route', 'The SYN-ACK reaches R2, which has no route to 192.168.10.10. The client is left waiting.']
  }],
  tcp: [...routed, {
    layer: 4, node: 4, phase: 'outbound', path: [3, 4],
    fr: ['TCP · Port 80 fermé', 'Le SYN atteint le serveur. Aucun service n’écoute sur ce port. Le serveur répond par un RST.'],
    en: ['TCP · Port 80 closed', 'The SYN reaches the server. No service is listening on that port. The server sends a RST.']
  }, {
    layer: 4, node: 4, phase: 'inbound', path: [4, 0], failed: true,
    fr: ['TCP · Connexion refusée', 'Le client reçoit le RST. L’aller-retour IPv4 fonctionne. Le refus vient du serveur.'],
    en: ['TCP · Connection refused', 'The client receives the RST. IPv4 works in both directions. The server refused the connection.']
  }],
  http: [...connectedTrace, request('/rapport.html'), {
    layer: 7, node: 4, phase: 'inbound', path: [4, 0], failed: true,
    fr: ['HTTP 404 · Ressource introuvable', 'La connexion TCP fonctionne. Le serveur répond que /rapport.html est introuvable.'],
    en: ['HTTP 404 · Resource not found', 'The TCP connection works. The server replies that /rapport.html could not be found.']
  }]
};

const labels = {
  fr: { outbound: 'Aller', inbound: 'Retour', roundTrip: 'Aller et retour', step: 'Étape' },
  en: { outbound: 'Outbound', inbound: 'Return', roundTrip: 'Both ways', step: 'Step' }
};

export function mountTfeDemo(root, lang) {
  const find = selector => root.querySelector(selector);
  const devices = [...root.querySelectorAll('[data-tfe-node]')];
  const deviceNames = devices.map(node => node.querySelector('[data-tfe-device]').textContent);
  const wires = root.querySelectorAll('[data-tfe-wire]');
  const layers = root.querySelectorAll('.tfe-layers li');
  const selector = find('[data-tfe-scenario]');
  const phase = find('[data-tfe-phase]');
  const diagnostic = find('[data-tfe-diagnostic]');
  const stepNumber = find('[data-tfe-step]');
  const title = find('[data-tfe-step-title]');
  const detail = find('[data-tfe-step-detail]');
  const replay = find('[data-tfe-replay]');
  const previous = find('[data-tfe-prev]');
  const next = find('[data-tfe-next]');
  const label = labels[lang];
  const currentTrace = () => scenarios[selector.value];
  let index = currentTrace().length - 1;

  function render() {
    const step = currentTrace()[index];
    const [from, to] = step.path;
    const first = Math.min(from, to);
    const last = Math.max(from, to);
    const route = deviceNames.slice(first, last + 1);
    if (from > to) route.reverse();
    phase.textContent = `${label[step.phase]} · ${route.join(step.phase === 'roundTrip' ? ' ↔ ' : ' → ')}`;
    devices.forEach((node, i) => {
      if (i === step.node) node.dataset.tfeFocus = step.failed ? 'stop' : 'active';
      else node.removeAttribute('data-tfe-focus');
    });
    wires.forEach((wire, i) => {
      if (i >= first && i < last) wire.dataset.tfeDirection = step.phase;
      else wire.removeAttribute('data-tfe-direction');
      wire.toggleAttribute('data-tfe-down', selector.value === 'link' && i === 1);
    });
    layers.forEach((layer, i) => {
      if (i + 1 === step.layer) layer.setAttribute('aria-current', 'step');
      else layer.removeAttribute('aria-current');
    });
    diagnostic.toggleAttribute('data-tfe-failed', Boolean(step.failed));
    stepNumber.textContent = `${label.step} ${index + 1} / ${currentTrace().length}`;
    [title.textContent, detail.textContent] = step[lang];
    replay.disabled = previous.disabled = index === 0;
    next.disabled = index === currentTrace().length - 1;
  }

  selector.addEventListener('change', () => { index = currentTrace().length - 1; render(); });
  replay.addEventListener('click', () => { index = 0; render(); });
  previous.addEventListener('click', () => { index--; render(); });
  next.addEventListener('click', () => { index++; render(); });
  render();
  find('[data-tfe-fallback]').hidden = true;
  find('[data-tfe-controls]').hidden = false;
  find('[data-tfe-trace]').hidden = false;
}
