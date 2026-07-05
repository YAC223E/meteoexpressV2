// Quick-nav: smooth scroll, reveal pulse, respects prefers-reduced-motion
(function() {
  const prefersReduced = window.matchMedia('(prefers-reduced-motion: reduce)').matches;

  document.addEventListener('click', function(e) {
    const pill = e.target.closest('.quick-nav-pill');
    if (!pill) return;

    const targetId = pill.getAttribute('data-target');
    if (!targetId) return;

    const target = document.getElementById(targetId);
    if (!target) return;

    e.preventDefault();

    target.scrollIntoView({ behavior: prefersReduced ? 'auto' : 'smooth', block: 'center' });

    target.classList.add('just-revealed');
    setTimeout(function() {
      target.classList.remove('just-revealed');
    }, 700);
  });
})();

// Watch for AI content being populated, then mark as data-loaded and auto-expand
(function() {
  var aiContent = document.getElementById('landingAiContent');
  var wrapper = document.getElementById('aiCollapseWrapper');
  if (aiContent && wrapper) {
    var obs = new MutationObserver(function() {
      // Has real content (not the loading placeholder)
      if (aiContent.children.length > 1 || (aiContent.children.length === 1 && !aiContent.querySelector('p[data-i18n="ai_analyzing"]'))) {
        wrapper.classList.add('data-loaded');
        wrapper.classList.add('expanded');
        var btn = document.getElementById('aiExpandBtn');
        var label = document.getElementById('aiExpandLabel');
        if (btn) btn.classList.add('expanded');
        if (label) label.textContent = 'Voir moins';
        obs.disconnect();
      }
    });
    obs.observe(aiContent, { childList: true, subtree: true });
  }
})();

// AI card collapse toggle
window.toggleAiFull = function() {
  var wrapper = document.getElementById('aiCollapseWrapper');
  var btn = document.getElementById('aiExpandBtn');
  var icon = document.getElementById('aiExpandIcon');
  var label = document.getElementById('aiExpandLabel');
  if (!wrapper) return;
  wrapper.classList.toggle('expanded');
  btn.classList.toggle('expanded');
  if (wrapper.classList.contains('expanded')) {
    label.textContent = 'Voir moins';
  } else {
    label.textContent = 'Voir plus';
  }
};
