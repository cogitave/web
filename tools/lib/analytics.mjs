/**
 * Analytics client generator.
 *
 * Emits the smallest snippet that honours analytics/consent.config.json. The
 * config is the contract; this file only implements it, so a policy change is a
 * config edit, not a code edit.
 *
 * What it enforces, in the browser:
 *   - the per-app event ALLOWLIST from app.manifest.json `analytics.events` is
 *     compiled in. An event name not on it is dropped, so a stray `data-event`
 *     cannot start collecting something nobody declared.
 *   - Global Privacy Control and Do Not Track are respected as an opt-out
 *     (`model.respectGlobalPrivacyControl` / `respectDoNotTrack`): if either is
 *     set, nothing is sent at all.
 *   - categories whose `consentRequired` is true stay off until an explicit
 *     opt-in is recorded. The `analytics` category is cookieless and aggregate,
 *     which is why it needs no banner - that is the config's judgement, and it
 *     is why there is no cookie, no identifier and no fingerprint here.
 *   - no endpoint configured (ANALYTICS_INGEST_URL unset at build) means the
 *     client is a no-op rather than a queue of unsent data.
 *
 * `sendBeacon` is used so a click that navigates away still reports, without
 * delaying the navigation.
 */

export function analyticsClient({ events = [], consent, endpoint }) {
  const gated = consent.categories.filter((c) => c.consentRequired).map((c) => c.id);

  if (!endpoint) {
    return `// Analytics: no ingest endpoint configured at build time (ANALYTICS_INGEST_URL
// is unset), so no client is emitted. Declared events: ${events.length}.
`;
  }

  return `
// Generated from analytics/consent.config.json - do not hand-edit.
(() => {
  const ALLOWED = new Set(${JSON.stringify(events)});
  const GATED = ${JSON.stringify(gated)};
  const ENDPOINT = ${JSON.stringify(endpoint)};

  // Opt-out signals win over everything else, including a stored opt-in.
  const optedOut = ${consent.model.respectGlobalPrivacyControl ? 'navigator.globalPrivacyControl === true' : 'false'}
    || ${consent.model.respectDoNotTrack ? "navigator.doNotTrack === '1'" : 'false'};
  if (optedOut) return;

  // Gated categories require a recorded opt-in. Absent storage access (private
  // mode, blocked storage), the answer is "no" - default-deny, per the config.
  const granted = (category) => {
    try { return localStorage.getItem('cogitave.consent.' + category) === 'granted'; }
    catch { return false; }
  };

  const send = (name, detail) => {
    if (!ALLOWED.has(name)) return;
    if (GATED.some((category) => name.startsWith(category + '_') && !granted(category))) return;
    // Aggregate only: the page, the event, the locale. No identifier, no cookie,
    // no referrer chain, nothing joinable back to a person.
    const body = JSON.stringify({
      event: name,
      path: location.pathname,
      locale: document.documentElement.lang,
      ...detail,
    });
    try { navigator.sendBeacon(ENDPOINT, new Blob([body], { type: 'application/json' })); } catch {}
  };

  addEventListener('click', (e) => {
    const target = e.target.closest('[data-event]');
    if (target) send(target.dataset.event);
  }, { passive: true });

  for (const details of document.querySelectorAll('.catalog-category')) {
    details.addEventListener('toggle', () => {
      if (details.open) send('service_category_open');
    });
  }
})();
`;
}
