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
