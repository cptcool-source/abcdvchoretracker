(() => {
  const loading = document.getElementById('auth-loading');
  window.setTimeout(() => {
    if (!loading || loading.hidden || window.__maxiKitchenReady) return;
    const directFile = window.location.protocol === 'file:';
    loading.classList.add('loading-failed');
    loading.innerHTML = directFile
      ? '<strong>mAxI cannot cook from a loose file.</strong><span>Open this page through the Family Hub preview or website.</span>'
      : '<strong>mAxI got tangled in his apron.</strong><span>Check the connection, then refresh.</span><button type="button" onclick="window.location.reload()">Try again</button>';
  }, 5000);
})();
