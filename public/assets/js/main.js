/**
 * Main JavaScript - Navigation, FAQ, and Global Interactions
 * Lightweight, vanilla JS for static site
 */

(function() {
  'use strict';

  // Mobile Navigation Toggle
  function initMobileNav() {
    const toggle = document.querySelector('.nav-toggle');
    const navLinks = document.querySelector('.nav-links');

    if (!toggle || !navLinks) return;

    toggle.addEventListener('click', function() {
      const isActive = navLinks.classList.contains('active');

      toggle.classList.toggle('active');
      navLinks.classList.toggle('active');
      toggle.setAttribute('aria-expanded', !isActive);

      // Prevent body scroll when nav is open
      document.body.style.overflow = isActive ? '' : 'hidden';
    });

    // Close nav when clicking outside
    document.addEventListener('click', function(e) {
      if (!e.target.closest('.nav') && navLinks.classList.contains('active')) {
        toggle.classList.remove('active');
        navLinks.classList.remove('active');
        toggle.setAttribute('aria-expanded', 'false');
        document.body.style.overflow = '';
      }
    });

    // Close nav when pressing Escape
    document.addEventListener('keydown', function(e) {
      if (e.key === 'Escape' && navLinks.classList.contains('active')) {
        toggle.classList.remove('active');
        navLinks.classList.remove('active');
        toggle.setAttribute('aria-expanded', 'false');
        document.body.style.overflow = '';
      }
    });
  }

  // FAQ Accordion
  function initFAQ() {
    const faqItems = document.querySelectorAll('.faq-item');

    faqItems.forEach(function(item) {
      const question = item.querySelector('.faq-question');

      if (!question) return;

      question.addEventListener('click', function() {
        const isActive = item.classList.contains('active');

        // Close all other items
        faqItems.forEach(function(otherItem) {
          if (otherItem !== item) {
            otherItem.classList.remove('active');
            otherItem.querySelector('.faq-question').setAttribute('aria-expanded', 'false');
          }
        });

        // Toggle current item
        item.classList.toggle('active');
        question.setAttribute('aria-expanded', !isActive);
      });
    });
  }

  // Smooth Scroll for Anchor Links
  function initSmoothScroll() {
    document.querySelectorAll('a[href^="#"]').forEach(function(anchor) {
      anchor.addEventListener('click', function(e) {
        const targetId = this.getAttribute('href');

        if (targetId === '#') return;

        const target = document.querySelector(targetId);

        if (target) {
          e.preventDefault();

          const navHeight = document.querySelector('.nav').offsetHeight;
          const targetPosition = target.getBoundingClientRect().top + window.pageYOffset - navHeight - 20;

          window.scrollTo({
            top: targetPosition,
            behavior: 'smooth'
          });

          // Update URL without scrolling
          history.pushState(null, null, targetId);
        }
      });
    });
  }

  // Navigation Background on Scroll
  function initNavScroll() {
    const nav = document.querySelector('.nav');
    if (!nav) return;

    let lastScrollY = window.scrollY;

    function updateNav() {
      const scrollY = window.scrollY;

      if (scrollY > 50) {
        nav.style.boxShadow = 'var(--shadow-sm)';
      } else {
        nav.style.boxShadow = 'none';
      }

      lastScrollY = scrollY;
    }

    window.addEventListener('scroll', updateNav, { passive: true });
    updateNav();
  }

  // Animate Elements on Scroll
  function initScrollAnimations() {
    const animatedElements = document.querySelectorAll('.service-card, .case-card, .card, .process-step');

    if (!animatedElements.length) return;

    const observer = new IntersectionObserver(function(entries) {
      entries.forEach(function(entry) {
        if (entry.isIntersecting) {
          entry.target.style.opacity = '1';
          entry.target.style.transform = 'translateY(0)';
          observer.unobserve(entry.target);
        }
      });
    }, {
      threshold: 0.1,
      rootMargin: '0px 0px -50px 0px'
    });

    animatedElements.forEach(function(el, index) {
      el.style.opacity = '0';
      el.style.transform = 'translateY(20px)';
      el.style.transition = 'opacity 0.5s ease ' + (index % 4) * 0.1 + 's, transform 0.5s ease ' + (index % 4) * 0.1 + 's';
      observer.observe(el);
    });
  }

  // Copy Email Button
  function initCopyEmail() {
    const copyBtn = document.getElementById('copy-email');

    if (!copyBtn) return;

    copyBtn.addEventListener('click', function() {
      const email = this.getAttribute('data-email');

      if (navigator.clipboard) {
        navigator.clipboard.writeText(email).then(function() {
          copyBtn.innerHTML = '<svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><polyline points="20 6 9 17 4 12"></polyline></svg> Copied!';

          setTimeout(function() {
            copyBtn.innerHTML = '<svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><rect x="9" y="9" width="13" height="13" rx="2" ry="2"></rect><path d="M5 15H4a2 2 0 01-2-2V4a2 2 0 012-2h9a2 2 0 012 2v1"></path></svg> Copy';
          }, 2000);
        });
      } else {
        // Fallback for older browsers
        const textArea = document.createElement('textarea');
        textArea.value = email;
        document.body.appendChild(textArea);
        textArea.select();
        document.execCommand('copy');
        document.body.removeChild(textArea);

        copyBtn.textContent = 'Copied!';
        setTimeout(function() {
          copyBtn.textContent = 'Copy';
        }, 2000);
      }
    });
  }

  // Add loading state to buttons on click
  function initButtonStates() {
    document.querySelectorAll('form button[type="submit"]').forEach(function(btn) {
      btn.addEventListener('click', function() {
        if (this.form && this.form.checkValidity()) {
          this.classList.add('loading');
          this.disabled = true;
        }
      });
    });
  }

  // Initialize all functions on DOM ready
  function init() {
    initMobileNav();
    initFAQ();
    initSmoothScroll();
    initNavScroll();
    initScrollAnimations();
    initCopyEmail();
    initButtonStates();
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', init);
  } else {
    init();
  }

})();
