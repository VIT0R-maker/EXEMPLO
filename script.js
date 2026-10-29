import { buildMailto } from './contact.js';

function initMenu() {
  const header = document.querySelector('.site-header');
  const toggle = document.querySelector('.menu-toggle');
  const nav = document.querySelector('#primary-nav');
  if (!header || !toggle || !nav) return;

  const setOpen = (open) => {
    header.classList.toggle('menu-open', open);
    toggle.setAttribute('aria-expanded', String(open));
    toggle.setAttribute('aria-label', open ? 'Fechar menu' : 'Abrir menu');
  };

  toggle.addEventListener('click', () => {
    setOpen(toggle.getAttribute('aria-expanded') !== 'true');
  });

  nav.addEventListener('click', (event) => {
    const link = event.target.closest('a[href^="#"]');
    if (!link || toggle.getAttribute('aria-expanded') !== 'true') return;
    setOpen(false);

    // Keep keyboard focus with the chosen content when the menu disappears.
    const section = document.getElementById(link.hash.slice(1));
    if (section) {
      const hadTabindex = section.hasAttribute('tabindex');
      if (!hadTabindex) section.setAttribute('tabindex', '-1');
      section.focus({ preventScroll: true });
      if (!hadTabindex) {
        section.addEventListener('blur', () => section.removeAttribute('tabindex'), { once: true });
      }
    }
  });

  document.addEventListener('keydown', (event) => {
    if (event.key === 'Escape' && toggle.getAttribute('aria-expanded') === 'true') {
      setOpen(false);
      toggle.focus();
    }
  });

  document.addEventListener('click', (event) => {
    if (!header.contains(event.target)) setOpen(false);
  });

  window.addEventListener('resize', () => {
    if (getComputedStyle(toggle).display === 'none') setOpen(false);
  });

  document.body.classList.add('js-ready');
}

function initSectionNavigation() {
  const links = [...document.querySelectorAll('.nav-link[href^="#"]')];
  const sections = links.map((link) => document.getElementById(link.hash.slice(1))).filter(Boolean);
  if (!sections.length) return;
  let queued = false;

  const update = () => {
    queued = false;
    const readingLine = Math.min(window.innerHeight * 0.3, 240);
    let current = sections[0];
    for (const section of sections) {
      if (section.getBoundingClientRect().top <= readingLine) current = section;
    }
    if (window.scrollY + window.innerHeight >= document.documentElement.scrollHeight - 4) {
      current = sections.at(-1);
    }
    for (const link of links) {
      const active = link.hash === `#${current.id}`;
      link.classList.toggle('is-active', active);
      if (active) link.setAttribute('aria-current', 'page');
      else link.removeAttribute('aria-current');
    }
  };

  const scheduleUpdate = () => {
    if (!queued) {
      queued = true;
      requestAnimationFrame(update);
    }
  };

  if ('IntersectionObserver' in window) {
    const observer = new IntersectionObserver(scheduleUpdate, {
      rootMargin: '-15% 0px -55% 0px',
      threshold: 0,
    });
    sections.forEach((section) => observer.observe(section));
  }
  // Covers tall sections, the footer, anchor jumps and browsers without IO.
  window.addEventListener('scroll', scheduleUpdate, { passive: true });
  window.addEventListener('resize', scheduleUpdate);
  window.addEventListener('hashchange', scheduleUpdate);
  update();
}

function initContactForm() {
  const form = document.querySelector('#contact-form');
  const status = document.querySelector('#form-status');
  if (!form || !status) return;
  const requiredFields = ['name', 'email', 'message'];
  const emptyMessages = {
    name: 'Informe seu nome.',
    email: 'Informe seu e-mail.',
    message: 'Escreva sua mensagem.',
  };

  const validateField = (name) => {
    const field = form.elements.namedItem(name);
    const error = document.getElementById(`${name}-error`);
    if (!field || !error) return true;
    let message = '';
    if (!field.value.trim()) message = emptyMessages[name];
    else if (name === 'email' && field.validity.typeMismatch) {
      message = 'Informe um e-mail válido, como voce@exemplo.com.';
    }

    error.textContent = message;
    field.setAttribute('aria-invalid', String(Boolean(message)));
    const descriptions = new Set((field.getAttribute('aria-describedby') || '').split(/\s+/).filter(Boolean));
    descriptions.add(error.id);
    field.setAttribute('aria-describedby', [...descriptions].join(' '));
    return !message;
  };

  for (const name of requiredFields) {
    const field = form.elements.namedItem(name);
    if (!field) continue;
    field.addEventListener('blur', () => validateField(name));
    field.addEventListener('input', () => {
      if (field.getAttribute('aria-invalid') === 'true') validateField(name);
      status.textContent = '';
    });
  }

  form.addEventListener('submit', (event) => {
    event.preventDefault();
    const invalid = requiredFields.filter((name) => !validateField(name));
    if (invalid.length) {
      status.textContent = 'Revise os campos indicados antes de preparar o e-mail.';
      form.elements.namedItem(invalid[0]).focus();
      return;
    }

    const values = Object.fromEntries(new FormData(form));
    const draft = document.createElement('a');
    draft.href = buildMailto(values);
    draft.hidden = true;
    document.body.append(draft);
    try {
      draft.click();
      status.textContent = 'E-mail preparado. Conclua o envio no seu aplicativo de e-mail. Se ele não abrir, use o endereço de contato ao lado.';
    } catch {
      status.textContent = 'Não foi possível abrir o aplicativo de e-mail. Use o endereço de contato ao lado; sua mensagem continua preenchida.';
    } finally {
      draft.remove();
    }
  });

  // Native required/type validation remains available if JavaScript fails to load.
  form.noValidate = true;
}

function initAnimations() {
  const reducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)');
  if (reducedMotion.matches || !Element.prototype.animate) return;
  const running = new Set();

  const reveal = (element, delay = 0) => {
    if (reducedMotion.matches) return;
    const animation = element.animate(
      [
        { opacity: 0, transform: 'translateY(18px)' },
        { opacity: 1, transform: 'translateY(0)' },
      ],
      { duration: 550, delay, easing: 'cubic-bezier(.2,.7,.2,1)', fill: 'backwards' },
    );
    running.add(animation);
    animation.addEventListener('finish', () => running.delete(animation), { once: true });
  };

  document.querySelectorAll('[data-hero-reveal]').forEach((element, index) => {
    reveal(element, Math.min(index, 5) * 70);
  });

  if ('IntersectionObserver' in window) {
    const observer = new IntersectionObserver((entries) => {
      for (const entry of entries) {
        if (!entry.isIntersecting) continue;
        reveal(entry.target);
        observer.unobserve(entry.target);
      }
    }, { threshold: 0.08 });
    document.querySelectorAll('[data-reveal]').forEach((element) => observer.observe(element));
    reducedMotion.addEventListener('change', (event) => {
      if (event.matches) observer.disconnect();
    });
  }

  reducedMotion.addEventListener('change', (event) => {
    if (!event.matches) return;
    running.forEach((animation) => animation.cancel());
    running.clear();
  });
}

initMenu();
initSectionNavigation();
initContactForm();
initAnimations();
