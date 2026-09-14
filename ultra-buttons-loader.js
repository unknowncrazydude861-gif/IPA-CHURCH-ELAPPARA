// Loads the shared deep 3D button styling on every public-page control.
if (!document.querySelector('link[data-ultra-buttons]')) {
  const link = document.createElement('link');
  link.rel = 'stylesheet';
  link.href = './ultra-buttons.css?v=20260914-deep';
  link.dataset.ultraButtons = 'true';
  document.head.appendChild(link);
}

// The navigation Visit CTA intentionally stays normal.
if (!document.querySelector('link[data-normal-visit]')) {
  const link = document.createElement('link');
  link.rel = 'stylesheet';
  link.href = './visit-normal.css?v=20260914';
  link.dataset.normalVisit = 'true';
  document.head.appendChild(link);
}
