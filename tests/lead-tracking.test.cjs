const { test } = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const vm = require('node:vm');

const source = fs.readFileSync(path.join(__dirname, '..', 'main.js'), 'utf8');
const delivered = { ok: true, found: true, duplicate: false, loggedSheet: 'Leads', loggedRowNumber: 42 };
const manual = { ok: true, found: false, status: 'NOT_FOUND_MANUAL_REVIEW', loggedSheet: 'NotFoundRequests', loggedRowNumber: 8 };

function harness() {
  const events = [];
  const button = { disabled: false, textContent: '' };
  const fields = {
    '#name': { value: 'Local Test' }, '#email': { value: 'local@example.invalid' },
    '#whatsapp': { value: '90000000' }, '#condo': { value: 'Test Condo' },
  };
  const timers = [];
  const document = { querySelector: selector => fields[selector] || { querySelector: () => button } };
  const context = vm.createContext({
    document, console: { warn() {} },
    window: {
      fbq: (...args) => events.push(['meta', ...args]),
      gtag: (...args) => events.push(['ga', ...args]),
      setTimeout: callback => { timers.push(callback); return timers.length; }, clearTimeout() {},
    },
  });
  // Initialise no network or real page. Exercise the production submit handler
  // with simulated backend replies, including delayed and failed submissions.
  vm.runInContext(source.replace(/\binit\(\);\s*$/, ''), context);
  vm.runInContext(`
    setStatus = () => {};
    renderResult = () => {};
    renderRequestReceivedPending = () => {};
    updateReportCountFromResult = () => {};
    notifyDuplicateAgentInBackground = () => {};
    notifyClientError = () => {};
    showGenericError = () => {};
    isMobileViewport = () => false;
    checkDuplicateBeforeSubmit = async () => ({ duplicate: false });
  `, context);
  return { context, events, timers, fields, button,
    submit: () => context.handleSubmit({ preventDefault() {} }),
    leads: () => events.filter(e => e[0] === 'meta' && e[2] === 'Lead'),
    gaLeads: () => events.filter(e => e[0] === 'ga' && e[2] === 'generate_lead'),
  };
}

for (const [name, result] of [['emailed report', delivered], ['saved manual-review request', manual]]) {
  test(`counts ${name} exactly once after confirmation`, async () => {
    const h = harness();
    let resolve;
    h.context.submitToAppsScript = () => new Promise(done => { resolve = done; });
    const pending = h.submit();
    await Promise.resolve();
    await Promise.resolve();
    assert.equal(h.leads().length, 0, 'valid form alone must not count');
    h.timers[0]();
    assert.equal(h.leads().length, 0, 'optimistic timeout must not count');
    resolve(result);
    await pending;
    assert.equal(h.leads().length, 1);
    assert.equal(h.gaLeads().length, 1);
    h.context.trackSuccessfulReportRequest(result);
    assert.equal(h.leads().length, 1, 'repeated callback must not count again');
  });
}

test('invalid form never reaches the backend or counts', async () => {
  const h = harness();
  h.fields['#email'].value = 'invalid';
  h.context.submitToAppsScript = () => { throw new Error('must not be called'); };
  await h.submit();
  assert.equal(h.leads().length, 0);
});

test('preflight duplicate never submits or counts', async () => {
  const h = harness();
  h.context.checkDuplicateBeforeSubmit = async () => ({ duplicate: true });
  h.context.submitToAppsScript = () => { throw new Error('must not be called'); };
  await h.submit();
  assert.equal(h.leads().length, 0);
});

for (const [name, result] of [
  ['server duplicate', { ...delivered, duplicate: true }],
  ['backend error', { ok: false, error: 'failed' }],
  ['malformed reply', null],
  ['missing persistence acknowledgement', { ok: true, found: true }],
  ['processing reservation', { ...delivered, status: 'PROCESSING' }],
  ['report delivery error', { ...delivered, status: 'FOUND_ERROR' }],
  ['duplicate status without flag', { ...delivered, status: 'DUPLICATE_BLOCKED' }],
]) {
  test(`${name} does not count`, async () => {
    const h = harness();
    h.context.submitToAppsScript = async () => result;
    await h.submit();
    assert.equal(h.leads().length, 0);
    assert.equal(h.gaLeads().length, 0);
  });
}

test('transport timeout does not count and a subsequent successful retry can count', async () => {
  const h = harness();
  h.context.submitToAppsScript = async () => { throw new Error('timed out'); };
  await h.submit();
  assert.equal(h.leads().length, 0);
  h.context.submitToAppsScript = async () => delivered;
  await h.submit();
  assert.equal(h.leads().length, 1);
});

test('blocked Meta tracking does not break success or GA tracking', async () => {
  const h = harness();
  h.context.window.fbq = () => { throw new Error('blocked'); };
  h.context.submitToAppsScript = async () => delivered;
  await h.submit();
  assert.equal(h.gaLeads().length, 1);
  assert.equal(h.button.textContent, 'Report emailed');
});

test('demo mode never counts production leads', async () => {
  const h = harness();
  vm.runInContext('CONFIG.appsScriptUrl = ""', h.context);
  h.context.demoLookup = () => delivered;
  await h.submit();
  assert.equal(h.leads().length, 0);
});
