// E-216 slice 2: the Board server's start-up self-check. Printed as a short list above the banner:
//   ✔ fine   ✖ will stop devices connecting   · worth knowing (or could not be checked)
//
// Two halves. The PARSERS and the FORMATTER are pure and tested with captured command output. The
// RUNNERS (`runSelfCheck`, `readWifi`, `portOwner`, `offerFixes`) call the operating system's own tools
// with a 3 s limit each; any failure becomes "unknown" and never stops the Board starting.
//
// Nothing here changes the computer except `offerFixes`, which does so only after the person types y,
// and then only through Windows' own permission prompt.
const { execFile } = require('node:child_process');
const readline = require('node:readline');
const { boardCause } = require('./causes');

const COMMAND_TIMEOUT_MS = 3000;
const OFFER_TIMEOUT_MS = 20000;
const RULE_NAME = 'RangerTrak Board';

// ---- running commands ----
// Resolves { ok, out }; never rejects. `ok` is false on a missing program, a non-zero exit or the timeout.
function runCommand(cmd, args, timeoutMs = COMMAND_TIMEOUT_MS) {
  return new Promise((resolve) => {
    try {
      execFile(cmd, args, { timeout: timeoutMs, windowsHide: true, maxBuffer: 1024 * 1024 }, (err, stdout) => {
        resolve({ ok: !err, out: String(stdout || '') });
      });
    } catch {
      resolve({ ok: false, out: '' });
    }
  });
}
const powershell = (run, script) => run('powershell', ['-NoProfile', '-Command', script]);

// ---- parsers (pure) ----

// `netsh wlan show interfaces`: the "SSID" line, never "BSSID". Empty when not connected or unreadable.
function parseWifiWindows(out) {
  const m = /^\s*SSID\s*:\s*(.+?)\s*$/m.exec(String(out || ''));
  return m ? m[1] : '';
}

// `ipconfig getsummary en0`: "SSID : name". Newer macOS hides it as <redacted>, which counts as unknown.
function parseWifiMac(out) {
  const m = /^\s*SSID\s*:\s*(.+?)\s*$/m.exec(String(out || ''));
  if (!m || /redacted/i.test(m[1])) return '';
  return m[1];
}

// `iwgetid -r`: the name on its own line.
function parseWifiLinux(out) {
  return String(out || '').split(/\r?\n/)[0].trim();
}

const CATEGORY = { 0: 'Public', 1: 'Private', 2: 'Domain', Public: 'Public', Private: 'Private', DomainAuthenticated: 'Domain' };

// `Get-NetConnectionProfile | Select-Object InterfaceAlias,NetworkCategory | ConvertTo-Json`: one object or an array.
// Returns [{ alias, category }] with category 'Public' | 'Private' | 'Domain'; null when the text is not that.
function parseNetProfiles(out) {
  let data;
  try { data = JSON.parse(String(out || '').trim()); } catch { return null; }
  const list = Array.isArray(data) ? data : data && typeof data === 'object' ? [data] : null;
  if (!list) return null;
  return list
    .filter((p) => p && typeof p.InterfaceAlias === 'string')
    .map((p) => ({ alias: p.InterfaceAlias, category: CATEGORY[p.NetworkCategory] || 'Unknown' }));
}

// The Public profiles that matter: on an adapter this Board is reachable through (all of them when that is not known).
function publicProfilesInUse(profiles, inUse = []) {
  const names = inUse.map((n) => n.toLowerCase());
  return (profiles || []).filter((p) => p.category === 'Public' && (names.length === 0 || names.includes(p.alias.toLowerCase())));
}

// A bare number printed by a one-line PowerShell count; null when it is not one.
function parseCount(out) {
  const t = String(out || '').trim();
  return /^\d+$/.test(t) ? Number(t) : null;
}

// `netstat -ano -p TCP`: the PID listening on this port, or null.
function parseNetstatPid(out, port) {
  for (const line of String(out || '').split(/\r?\n/)) {
    const m = /^\s*TCP\s+\S+:(\d+)\s+\S+\s+LISTENING\s+(\d+)\s*$/i.exec(line);
    if (m && Number(m[1]) === Number(port)) return Number(m[2]);
  }
  return null;
}

// `tasklist /FI "PID eq n" /FO CSV /NH`: the image name, or ''.
function parseTasklistName(out) {
  const m = /^"([^"]+)"/m.exec(String(out || ''));
  return m ? m[1] : '';
}

// `lsof -nP -iTCP:443 -sTCP:LISTEN`: { pid, name } of the first listener, or null.
function parseLsof(out) {
  const lines = String(out || '').split(/\r?\n/).filter((l) => l.trim());
  for (const line of lines.slice(1)) {
    const cols = line.trim().split(/\s+/);
    if (cols.length >= 2 && /^\d+$/.test(cols[1])) return { pid: Number(cols[1]), name: cols[0] };
  }
  return null;
}

// Who holds a port, in words. Windows keeps PID 4 (System) for its own web service (HTTP.sys).
function describeOwner(pid, name) {
  if (pid === 4) return "Windows' own web service (HTTP.sys)";
  if (name) return name;
  return pid ? `another program (process ${pid})` : '';
}

// Windows `(Get-CimInstance Win32_Battery).BatteryStatus`: 1 = on battery, nothing = no battery (a desktop).
function parseBatteryWindows(out) {
  const t = String(out || '').trim();
  if (t === '') return 'desktop';
  const first = Number(t.split(/\s+/)[0]);
  if (!Number.isFinite(first)) return 'unknown';
  return first === 1 ? 'battery' : 'ac';
}

// macOS `pmset -g batt`.
function parsePmset(out) {
  const t = String(out || '');
  if (/Battery Power/i.test(t)) return 'battery';
  if (/AC Power/i.test(t)) return 'ac';
  return 'unknown';
}

// PowerShell string literal: single quotes doubled, so an adapter name can never break out of it.
const psQuote = (s) => `'${String(s).replace(/'/g, "''")}'`;

// ---- the fixes (Windows) ----
// The exact commands, as text for the screen and as one script for the elevated run.
function fixCommands({ publicAliases = [], addRule = false, port }) {
  const cmds = [];
  for (const alias of publicAliases) cmds.push(`Set-NetConnectionProfile -InterfaceAlias ${psQuote(alias)} -NetworkCategory Private`);
  if (addRule) cmds.push(`New-NetFirewallRule -DisplayName ${psQuote(RULE_NAME)} -Direction Inbound -Protocol TCP -LocalPort ${Number(port)} -Action Allow -Profile Private`);
  return cmds;
}

// One elevated PowerShell for all of them. -EncodedCommand (UTF-16LE base64) means no quoting can go wrong.
function elevatedInvocation(commands) {
  const encoded = Buffer.from(commands.join('; '), 'utf16le').toString('base64');
  return `Start-Process powershell -Verb RunAs -Wait -ArgumentList '-NoProfile','-EncodedCommand','${encoded}'`;
}

// ---- gathering ----

// The Wi-Fi network's name, or '' when it cannot be read.
async function readWifi({ platform = process.platform, run = runCommand } = {}) {
  try {
    if (platform === 'win32') return parseWifiWindows((await run('netsh', ['wlan', 'show', 'interfaces'])).out);
    if (platform === 'darwin') return parseWifiMac((await run('ipconfig', ['getsummary', 'en0'])).out);
    return parseWifiLinux((await run('iwgetid', ['-r'])).out);
  } catch { return ''; }
}

// The Windows-only checks that a fix can change: network type and the firewall rule. 'unknown' when a command failed.
async function checkWindowsNetwork({ inUse = [], run = runCommand } = {}) {
  const [prof, rule] = await Promise.all([
    powershell(run, 'Get-NetConnectionProfile | Select-Object InterfaceAlias,NetworkCategory | ConvertTo-Json'),
    powershell(run, `@(Get-NetFirewallRule -DisplayName ${psQuote(RULE_NAME)} -ErrorAction SilentlyContinue).Count`),
  ]);
  const profiles = prof.ok ? parseNetProfiles(prof.out) : null;
  const count = rule.ok ? parseCount(rule.out) : null;
  return {
    profiles,
    publicAliases: profiles ? publicProfilesInUse(profiles, inUse).map((p) => p.alias) : [],
    rule: count === null ? 'unknown' : count > 0 ? 'present' : 'missing',
  };
}

async function checkPower({ platform, run }) {
  if (platform === 'win32') {
    const r = await powershell(run, '(Get-CimInstance Win32_Battery).BatteryStatus');
    return r.ok ? parseBatteryWindows(r.out) : 'unknown';
  }
  if (platform === 'darwin') {
    const r = await run('pmset', ['-g', 'batt']);
    return r.ok ? parsePmset(r.out) : 'unknown';
  }
  return 'unknown';
}

/**
 * Runs every check at once. `inUse` are the names of the adapters the Board is reachable through.
 * Resolves { platform, port, network: {profiles, publicAliases, rule} | null, power }.
 */
async function runSelfCheck({ port, platform = process.platform, inUse = [], run = runCommand } = {}) {
  const [network, power] = await Promise.all([
    platform === 'win32' ? checkWindowsNetwork({ inUse, run }) : Promise.resolve(null),
    checkPower({ platform, run }),
  ]);
  return { platform, port, network, power };
}

// Who holds `port` (the one the Board wanted and could not have), in words; '' when it could not be found.
async function portOwner({ port, platform = process.platform, run = runCommand }) {
  try {
    if (platform === 'win32') {
      const pid = parseNetstatPid((await run('netstat', ['-ano', '-p', 'TCP'])).out, port);
      if (pid === null) return '';
      if (pid === 4) return describeOwner(4, '');
      const name = parseTasklistName((await run('tasklist', ['/FI', `PID eq ${pid}`, '/FO', 'CSV', '/NH'])).out);
      return describeOwner(pid, name);
    }
    const found = parseLsof((await run('lsof', ['-nP', `-iTCP:${port}`, '-sTCP:LISTEN'])).out);
    return found ? describeOwner(found.pid, found.name) : '';
  } catch { return ''; }
}

// ---- the list ----

/**
 * The self-check as lines of text. `wifi` and `virtual` come from the start-up (net.js), the rest from runSelfCheck.
 * Every sentence a person reads is here or in board-causes.json.
 */
function formatSelfCheck({ check, wifi = '', virtual = [], portLine = '' }) {
  const lines = [];
  lines.push(wifi
    ? `✔ Wi-Fi: ${wifi}`
    : "· Wi-Fi name: couldn't read it. Other devices must join the same Wi-Fi as this computer.");
  for (const v of virtual) lines.push(`· Left out: ${v.name} ${v.address} (a virtual adapter)`);
  if (portLine) lines.push(portLine);

  const net = check.network;
  if (check.platform === 'win32') {
    if (!net || !net.profiles) {
      lines.push("· Windows network type: couldn't check it.");
    } else if (net.publicAliases.length) {
      lines.push(`✖ ${boardCause('firewall-public').message}`);
      lines.push('    What the fix does: it changes this Wi-Fi from Public to Private, so Windows lets devices on it reach the Board. It needs administrator permission.');
      for (const c of fixCommands({ publicAliases: net.publicAliases })) lines.push(`    ${c}`);
    } else {
      lines.push('✔ Windows network type: Private, so other devices can reach the Board.');
    }
    if (net && net.rule === 'present') {
      lines.push(`· Firewall: a rule named ${RULE_NAME} exists. If devices still cannot connect, check it covers ${check.port}.`);
    } else if (net && net.rule === 'missing') {
      lines.push(`· Firewall: no rule named ${RULE_NAME} yet. If other devices cannot connect, allow the Board through the Windows firewall (needs administrator permission):`);
      for (const c of fixCommands({ addRule: true, port: check.port })) lines.push(`    ${c}`);
    } else {
      lines.push("· Firewall: couldn't check for a rule.");
    }
  }

  if (check.power === 'battery') lines.push(`✖ This computer is running on battery. ${boardCause('laptop-asleep').message}`);
  else lines.push(`· ${boardCause('laptop-asleep').message}`);
  return lines;
}

// What a fix would change, from a check result (empty when there is nothing to offer).
function offerableFixes(check) {
  if (!check || check.platform !== 'win32' || !check.network) return { publicAliases: [], addRule: false };
  return { publicAliases: check.network.publicAliases, addRule: check.network.rule === 'missing' };
}

/**
 * The address line, boxed and padded with blank lines so a fall-back port cannot be missed.
 * `url` is the one to give out.
 */
function boxedAddress(url) {
  const text = `Give out this address:  ${url}`;
  const bar = '='.repeat(text.length + 4);
  return ['', bar, `  ${text}`, bar, ''];
}

// y/yes within the time limit; anything else, an empty line, or silence is no.
function askYesNo(question, timeoutMs = OFFER_TIMEOUT_MS, { input = process.stdin, output = process.stdout } = {}) {
  return new Promise((resolve) => {
    const rl = readline.createInterface({ input, output });
    let done = false;
    const finish = (yes) => { if (done) return; done = true; clearTimeout(timer); rl.close(); resolve(yes); };
    const timer = setTimeout(() => { output.write('\n'); finish(false); }, timeoutMs);
    rl.question(question, (answer) => finish(/^\s*y(es)?\s*$/i.test(answer)));
    rl.on('close', () => finish(false));
  });
}

/**
 * John 10-21: offer, never do silently. Only on Windows, only when someone is at the keyboard, asked once.
 * `ask` and `run` are injectable. Resolves 'none' (nothing to fix or not offered), 'declined' or 'ran'.
 */
async function offerFixes({ check, isTTY = !!process.stdin.isTTY, ask = askYesNo, run = runCommand, log = console.log }) {
  const fixes = offerableFixes(check);
  const commands = fixCommands({ ...fixes, port: check && check.port });
  if (!commands.length || !isTTY) return 'none';
  log('');
  const yes = await ask('Fix these now? Windows will ask for permission. (y/N, 20 s) ');
  if (!yes) { log('Not changed. The commands above do the same by hand.'); return 'declined'; }
  await powershell(run, elevatedInvocation(commands));
  return 'ran';
}

module.exports = {
  runCommand, readWifi, runSelfCheck, portOwner, formatSelfCheck, offerFixes, offerableFixes, boxedAddress, askYesNo,
  fixCommands, elevatedInvocation, psQuote, publicProfilesInUse, describeOwner,
  parseWifiWindows, parseWifiMac, parseWifiLinux, parseNetProfiles, parseCount, parseNetstatPid,
  parseTasklistName, parseLsof, parseBatteryWindows, parsePmset,
};
