// Loads the shared ultra 3D button styling on every public-page control.
if (!document.querySelector('link[data-ultra-buttons]')) {
  const link = document.createElement('link');
  link.rel = 'stylesheet';
  link.href = './ultra-buttons.css?v=20260914';
  link.dataset.ultraButtons = 'true';
  document.head.appendChild(link);
}
