// Highlight the module section currently being read.
const sectionLinks = [...document.querySelectorAll('.module-sidebar nav a')];
if (sectionLinks.length && 'IntersectionObserver' in window) {
  const observer = new IntersectionObserver(entries => {
    for (const entry of entries) {
      if (!entry.isIntersecting) continue;
      sectionLinks.forEach(link => {
        const active = link.hash === '#' + entry.target.id;
        link.classList.toggle('active', active);
        if (active) link.setAttribute('aria-current', 'location');
        else link.removeAttribute('aria-current');
      });
    }
  }, { rootMargin: '-5% 0px -65% 0px', threshold: 0 });
  document.querySelectorAll('.module-section').forEach(section => observer.observe(section));
}
