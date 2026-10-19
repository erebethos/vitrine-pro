/** Pure IPv4 arithmetic: no signed 32-bit bitwise operators, no network requests. */
export class IPv4Error extends Error {
  constructor(code) { super(code); this.name = 'IPv4Error'; this.code = code; }
}

export function parseIPv4(value) {
  if (typeof value !== 'string') throw new IPv4Error('invalidIp');
  const parts = value.trim().split('.');
  if (parts.length !== 4 || parts.some(p => !/^(0|[1-9]\d{0,2})$/.test(p) || Number(p) > 255)) {
    throw new IPv4Error('invalidIp');
  }
  return parts.reduce((total, p) => total * 256 + Number(p), 0);
}

export function formatIPv4(value) {
  if (!Number.isInteger(value) || value < 0 || value > 2 ** 32 - 1) throw new IPv4Error('invalidIp');
  return [24, 16, 8, 0].map(shift => Math.floor(value / 2 ** shift) % 256).join('.');
}

export function parsePrefix(value) {
  const text = String(value).trim().replace(/^\//, '');
  if (!/^(0|[1-9]\d?)$/.test(text) || Number(text) > 32) throw new IPv4Error('invalidPrefix');
  return Number(text);
}

export function calculateSubnet(address, prefixValue) {
  const ipNumber = parseIPv4(address);
  const prefix = parsePrefix(prefixValue);
  const size = 2 ** (32 - prefix);
  const networkNumber = Math.floor(ipNumber / size) * size;
  const lastNumber = networkNumber + size - 1;
  const special = prefix >= 31;
  return {
    address: formatIPv4(ipNumber), prefix, ipNumber,
    networkNumber, lastNumber, size,
    network: formatIPv4(networkNumber),
    mask: formatIPv4(2 ** 32 - size),
    wildcard: formatIPv4(size - 1),
    broadcast: special ? null : formatIPv4(lastNumber),
    firstHost: formatIPv4(networkNumber + (special ? 0 : 1)),
    lastHost: formatIPv4(lastNumber - (special ? 0 : 1)),
    hostCount: special ? size : size - 2,
    cidr: `${formatIPv4(networkNumber)}/${prefix}`,
    binary: ipNumber.toString(2).padStart(32, '0'),
    kind: prefix === 32 ? 'singleHost' : prefix === 31 ? 'pointToPoint' : 'subnet'
  };
}

/** Deliberately limited to private lab addresses and conventional /16–/30 subnets. */
export function createChallenge(rng = Math.random) {
  const prefixes = [16, 20, 22, 24, 25, 26, 27, 28, 29, 30];
  const pick = limit => Math.min(limit - 1, Math.max(0, Math.floor(rng() * limit)));
  const address = `10.${pick(256)}.${pick(256)}.${pick(254) + 1}`;
  const subnet = calculateSubnet(address, prefixes[pick(prefixes.length)]);
  const field = ['network', 'broadcast', 'hostCount'][pick(3)];
  return { address, prefix: subnet.prefix, field, answer: String(subnet[field]), subnet };
}

export function checkAnswer(challenge, input) {
  if (typeof input !== 'string') return false;
  const value = input.trim();
  if (challenge.field === 'hostCount') return /^\d+$/.test(value) && Number(value) === Number(challenge.answer);
  try { return formatIPv4(parseIPv4(value)) === challenge.answer; } catch { return false; }
}
