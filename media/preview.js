(() => {
  function linkAt(event) {
    return event.target instanceof Element ? event.target.closest('a[data-obsidian-new-tab]') : null;
  }
  // Prevent middle-button autoscroll while keeping the normal left-click behavior.
  document.addEventListener('mousedown', (event) => {
    if (event.button === 1 && linkAt(event)) event.preventDefault();
  }, true);
  document.addEventListener('auxclick', (event) => {
    if (event.button !== 1) return;
    const link = linkAt(event);
    if (!link) return;
    event.preventDefault();
    event.stopPropagation();
    // Preferred: hand the link to the extension's URI bridge through a popup. VS Code
    // routes external-protocol popups without touching this document, so the preview
    // can never navigate away (and turn blank) the way a synthetic anchor click would.
    const bridge = link.getAttribute('data-obsidian-new-tab');
    if (bridge) {
      try {
        if (window.open(bridge, '_blank')) return;
      } catch { /* fall through to the native preview channel */ }
    }
    // Fallback: let the built-in Markdown Preview handle a normal left click on the
    // original link, which posts its own openLink message for relative hrefs.
    link.dispatchEvent(new MouseEvent('click', { bubbles: true, cancelable: true }));
  }, true);
})();
