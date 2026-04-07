export function setOverlayVisible(el, isVisible, displayStyle = 'flex') {
  if (!el) return;
  el.style.display = isVisible ? displayStyle : 'none';
  el.setAttribute('aria-hidden', String(!isVisible));
}
