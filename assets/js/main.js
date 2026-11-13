/**
 * Velisse Medical — Main JavaScript Application
 * Handles hero video autoplay resilience, navigation, smooth scrolling, active states, mobile menu, and interactions.
 */

// 1. Hero Background Video Autoplay Resilience & State Management
function setupHeroVideo() {
  const heroVideo = document.querySelector('.hero-bg-video');
  if (!heroVideo) return;

  // Enforce autoplay eligibility requirements across all modern browsers
  heroVideo.muted = true;
  heroVideo.defaultMuted = true;
  heroVideo.playsInline = true;
  heroVideo.setAttribute('muted', '');
  heroVideo.setAttribute('playsinline', '');

  let isPlaying = false;
  let playAttempts = 0;
  const maxAttempts = 6;

  // Called once playback is confirmed
  function onPlaybackStarted() {
    if (isPlaying) return;
    isPlaying = true;
    heroVideo.classList.add('is-playing');
    // Remove poster attribute so it never permanently covers or overlays the video
    heroVideo.removeAttribute('poster');
  }

  // Fallback if playback fails
  function onPlaybackFailed(err) {
    if (!isPlaying) {
      console.warn('Hero video autoplay deferred or blocked:', err);
      heroVideo.classList.remove('is-playing');
    }
  }

  // Core play invoker
  function executePlay() {
    if (isPlaying) return;

    // Explicitly re-affirm muted state prior to play
    heroVideo.muted = true;
    heroVideo.defaultMuted = true;

    const playPromise = heroVideo.play();
    if (playPromise !== undefined) {
      playPromise
        .then(() => {
          onPlaybackStarted();
        })
        .catch((error) => {
          onPlaybackFailed(error);

          // Retry with exponential backoff if not yet playing
          if (!isPlaying && playAttempts < maxAttempts) {
            playAttempts++;
            setTimeout(executePlay, 250 * playAttempts);
          }
        });
    }
  }

  // Listen to video state events
  heroVideo.addEventListener('playing', onPlaybackStarted);
  heroVideo.addEventListener('play', onPlaybackStarted);
  heroVideo.addEventListener('timeupdate', () => {
    if (heroVideo.currentTime > 0.05 && !isPlaying) {
      onPlaybackStarted();
    }
  });

  // Play as soon as video is ready
  if (heroVideo.readyState >= 2) {
    // Video has enough data (HAVE_CURRENT_DATA or higher)
    executePlay();
  } else {
    // Wait for data readiness
    heroVideo.addEventListener('loadeddata', executePlay, { once: true });
    heroVideo.addEventListener('canplay', executePlay, { once: true });
    heroVideo.addEventListener('canplaythrough', executePlay, { once: true });
  }

  // Re-verify on window full load (covers hard refresh / reload caching)
  window.addEventListener('load', () => {
    if (!isPlaying || heroVideo.paused) {
      executePlay();
    }
  });

  // User gesture fallback for ultra-strict browser policies (e.g. Incognito first visit)
  const userInteractionTriggers = ['click', 'touchstart', 'scroll', 'keydown'];
  function onUserGesture() {
    if (!isPlaying || heroVideo.paused) {
      executePlay();
    }
    userInteractionTriggers.forEach((evt) => {
      window.removeEventListener(evt, onUserGesture, { passive: true });
    });
  }
  userInteractionTriggers.forEach((evt) => {
    window.addEventListener(evt, onUserGesture, { passive: true, once: true });
  });

  // Visibility change: resume playback if tab becomes active again
  document.addEventListener('visibilitychange', () => {
    if (document.visibilityState === 'visible' && (heroVideo.paused || !isPlaying)) {
      executePlay();
    }
  });

  // Initial immediate trigger attempt
  executePlay();
}

// Execute setup immediately
setupHeroVideo();

function initApp() {
  setupHeroVideo();

  // 2. Sticky Navigation on Scroll
  const header = document.querySelector('.site-header');
  const handleScroll = () => {
    if (window.scrollY > 20) {
      header.classList.add('scrolled');
    } else {
      header.classList.remove('scrolled');
    }
  };
  window.addEventListener('scroll', handleScroll, { passive: true });
  handleScroll();

  // 2. Mobile Menu Toggle
  const mobileToggle = document.querySelector('.mobile-toggle');
  const navMenu = document.querySelector('.nav-menu');
  const navLinks = document.querySelectorAll('.nav-link');

  if (mobileToggle && navMenu) {
    mobileToggle.addEventListener('click', () => {
      const isOpen = navMenu.classList.toggle('active');
      mobileToggle.setAttribute('aria-expanded', isOpen);
      
      // Update hamburger SVG icon
      if (isOpen) {
        mobileToggle.innerHTML = `
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
            <line x1="18" y1="6" x2="6" y2="18"></line>
            <line x1="6" y1="6" x2="18" y2="18"></line>
          </svg>
        `;
      } else {
        mobileToggle.innerHTML = `
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
            <line x1="3" y1="12" x2="21" y2="12"></line>
            <line x1="3" y1="6" x2="21" y2="6"></line>
            <line x1="3" y1="18" x2="21" y2="18"></line>
          </svg>
        `;
      }
    });

    // Close menu when clicking any nav link
    navLinks.forEach(link => {
      link.addEventListener('click', () => {
        if (navMenu.classList.contains('active')) {
          navMenu.classList.remove('active');
          mobileToggle.setAttribute('aria-expanded', 'false');
          mobileToggle.innerHTML = `
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
              <line x1="3" y1="12" x2="21" y2="12"></line>
              <line x1="3" y1="6" x2="21" y2="6"></line>
              <line x1="3" y1="18" x2="21" y2="18"></line>
            </svg>
          `;
        }
      });
    });
  }

  // 3. Active Nav Link on Scroll (Intersection Observer)
  const sections = document.querySelectorAll('section[id]');
  const observerOptions = {
    root: null,
    rootMargin: '-20% 0px -70% 0px',
    threshold: 0
  };

  const observer = new IntersectionObserver((entries) => {
    entries.forEach(entry => {
      if (entry.isIntersecting) {
        const id = entry.target.getAttribute('id');
        navLinks.forEach(link => {
          if (link.getAttribute('href') === `#${id}`) {
            link.classList.add('active');
          } else {
            link.classList.remove('active');
          }
        });
      }
    });
  }, observerOptions);

  sections.forEach(section => observer.observe(section));

  // 4. Floating Quick Action Button
  const floatBtn = document.querySelector('.floating-contact-btn');
  if (floatBtn) {
    floatBtn.addEventListener('click', () => {
      const contactSection = document.getElementById('contact');
      if (contactSection) {
        contactSection.scrollIntoView({ behavior: 'smooth' });
      }
    });
  }
}

if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', initApp);
} else {
  initApp();
}

