// Loaded on every page (a few hundred bytes, no framework): `/` or Ctrl/⌘+K focuses search.
// On /search/ that's the island's box; everywhere else it's the header form, which submits to
// /search/?q=… and works without this script.

const typing = (target: EventTarget | null): boolean =>
  target instanceof HTMLElement &&
  (target.isContentEditable || ['INPUT', 'TEXTAREA', 'SELECT'].includes(target.tagName));

const searchBox = (): HTMLInputElement | null =>
  document.querySelector('gd-site-search')?.shadowRoot?.querySelector<HTMLInputElement>('#q') ??
  document.querySelector<HTMLInputElement>('#site-search-q');

document.addEventListener('keydown', (event) => {
  const slash = event.key === '/' && !typing(event.target);
  const k = event.key.toLowerCase() === 'k' && (event.ctrlKey || event.metaKey);
  if ((!slash && !k) || event.altKey || event.defaultPrevented) return;
  const box = searchBox();
  if (box === null) return;
  event.preventDefault();
  // Narrow layouts hide the header box (it becomes a link): go to the search page instead.
  if (box.getClientRects().length === 0) {
    window.location.assign('/search/');
    return;
  }
  box.focus();
  box.select();
});
