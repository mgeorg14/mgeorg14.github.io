// Diamonds Cleaning Services — shared site behaviour
document.addEventListener('DOMContentLoaded', () => {

  // Mobile nav toggle
  const toggle = document.querySelector('.menu-toggle');
  const nav = document.querySelector('.nav');
  if (toggle && nav) {
    toggle.addEventListener('click', () => {
      const open = nav.classList.toggle('open');
      toggle.setAttribute('aria-expanded', open);
      toggle.textContent = open ? '✕' : '☰';
    });
    // On mobile, tapping a dropdown label expands its submenu instead of navigating away
    document.querySelectorAll('.nav .dropdown > a').forEach(link => {
      link.addEventListener('click', (e) => {
        if (window.innerWidth <= 860) {
          e.preventDefault();
          link.parentElement.classList.toggle('open');
        }
      });
    });
  }

  // Footer year
  document.querySelectorAll('.js-year').forEach(el => el.textContent = new Date().getFullYear());

  // Instagram embed placeholder grid — represents where a live Instagram Business
  // feed (before/after photos) would be pulled in via the Instagram Graph API.
  const insta = document.getElementById('insta-grid');
  if (insta) {
    const captions = [
      'Before & after: kitchen deep clean',
      'End of tenancy — spotless oven',
      'Regular clean, fortnightly visit',
      'Carpet cleaning — stain removal',
      'Bathroom deep clean result',
      'Move-out clean, full property'
    ];
    const tones = ['#123A2C', '#1F6B4C', '#B7935A', '#0C2A20', '#2E8560', '#8C6A3A'];
    insta.innerHTML = captions.map((c, i) => `
      <div class="insta-tile" style="background:${tones[i % tones.length]}">
        <span>${c}</span>
      </div>
    `).join('');
  }

  // Simple web-analytics style event logger — stands in for a Google Analytics /
  // privacy-focused analytics snippet, logging the conversion-relevant events
  // described in the design plan's Web Analytics section.
  window.trackEvent = function (name, detail) {
    const payload = { name, detail, at: new Date().toISOString() };
    const log = JSON.parse(localStorage.getItem('dcs_analytics') || '[]');
    log.push(payload);
    localStorage.setItem('dcs_analytics', JSON.stringify(log));
    console.info('[analytics]', payload);
  };

  // Track simple page-level engagement for blog pages (time-on-page proxy)
  if (document.body.dataset.blogPost) {
    const start = Date.now();
    window.addEventListener('beforeunload', () => {
      const seconds = Math.round((Date.now() - start) / 1000);
      window.trackEvent('blog_engagement', { post: document.body.dataset.blogPost, seconds });
    });
  }
});
