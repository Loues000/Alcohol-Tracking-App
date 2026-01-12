// ========================================
// SipTrack Landing Page JavaScript
// ========================================

document.addEventListener('DOMContentLoaded', () => {
  // Initialize all components
  initNavbar();
  initParticles();
  initCountUp();
  initScrollAnimations();
  initCarousel();
  initSmoothScroll();
});

// ========================================
// Navbar Scroll Effect
// ========================================
function initNavbar() {
  const navbar = document.getElementById('navbar');
  const navToggle = document.getElementById('nav-toggle');
  const navLinks = document.getElementById('nav-links');

  // Scroll effect
  let lastScroll = 0;
  window.addEventListener('scroll', () => {
    const currentScroll = window.pageYOffset;
    
    if (currentScroll > 50) {
      navbar.classList.add('scrolled');
    } else {
      navbar.classList.remove('scrolled');
    }
    
    lastScroll = currentScroll;
  });

  // Mobile menu toggle
  navToggle.addEventListener('click', () => {
    navToggle.classList.toggle('active');
    navLinks.classList.toggle('active');
  });

  // Close mobile menu on link click
  navLinks.querySelectorAll('a').forEach(link => {
    link.addEventListener('click', () => {
      navToggle.classList.remove('active');
      navLinks.classList.remove('active');
    });
  });
}

// ========================================
// Particle Background
// ========================================
function initParticles() {
  const container = document.getElementById('particles');
  if (!container) return;

  const particleCount = 30;
  
  for (let i = 0; i < particleCount; i++) {
    const particle = document.createElement('div');
    particle.className = 'particle';
    particle.style.left = `${Math.random() * 100}%`;
    particle.style.top = `${Math.random() * 100}%`;
    particle.style.animationDelay = `${Math.random() * 8}s`;
    particle.style.animationDuration = `${6 + Math.random() * 4}s`;
    particle.style.opacity = `${0.1 + Math.random() * 0.3}`;
    container.appendChild(particle);
  }
}

// ========================================
// Count Up Animation
// ========================================
function initCountUp() {
  const counters = document.querySelectorAll('.stat-number');
  
  const observerOptions = {
    threshold: 0.5,
    rootMargin: '0px'
  };

  const observer = new IntersectionObserver((entries) => {
    entries.forEach(entry => {
      if (entry.isIntersecting) {
        const counter = entry.target;
        const target = parseFloat(counter.dataset.count);
        const isDecimal = target % 1 !== 0;
        const duration = 2000;
        const startTime = performance.now();
        
        const updateCounter = (currentTime) => {
          const elapsed = currentTime - startTime;
          const progress = Math.min(elapsed / duration, 1);
          
          // Easing function for smooth animation
          const easeOutQuart = 1 - Math.pow(1 - progress, 4);
          const current = target * easeOutQuart;
          
          if (isDecimal) {
            counter.textContent = current.toFixed(1);
          } else {
            counter.textContent = Math.floor(current).toLocaleString();
          }
          
          if (progress < 1) {
            requestAnimationFrame(updateCounter);
          }
        };
        
        requestAnimationFrame(updateCounter);
        observer.unobserve(counter);
      }
    });
  }, observerOptions);

  counters.forEach(counter => observer.observe(counter));
}

// ========================================
// Scroll Animations
// ========================================
function initScrollAnimations() {
  const animatedElements = document.querySelectorAll(
    '.feature-card, .step, .testimonial-card'
  );

  const observerOptions = {
    threshold: 0.1,
    rootMargin: '0px 0px -50px 0px'
  };

  const observer = new IntersectionObserver((entries) => {
    entries.forEach((entry, index) => {
      if (entry.isIntersecting) {
        // Add delay based on data attribute or index
        const delay = entry.target.dataset.aosDelay || index * 100;
        setTimeout(() => {
          entry.target.classList.add('visible');
        }, Math.min(delay, 500));
        observer.unobserve(entry.target);
      }
    });
  }, observerOptions);

  animatedElements.forEach(el => observer.observe(el));
}

// ========================================
// Screenshots Carousel
// ========================================
function initCarousel() {
  const track = document.getElementById('screenshots-track');
  const dotsContainer = document.getElementById('carousel-dots');
  const prevBtn = document.getElementById('carousel-prev');
  const nextBtn = document.getElementById('carousel-next');
  
  if (!track || !dotsContainer) return;

  const slides = track.querySelectorAll('.screenshot-slide');
  const slideCount = slides.length;
  let currentIndex = 0;
  let slidesPerView = getSlidesPerView();
  let maxIndex = Math.max(0, slideCount - slidesPerView);

  // Create dots
  function createDots() {
    dotsContainer.innerHTML = '';
    const dotCount = maxIndex + 1;
    for (let i = 0; i < dotCount; i++) {
      const dot = document.createElement('div');
      dot.className = 'carousel-dot' + (i === 0 ? ' active' : '');
      dot.addEventListener('click', () => goToSlide(i));
      dotsContainer.appendChild(dot);
    }
  }

  // Get slides per view based on screen width
  function getSlidesPerView() {
    if (window.innerWidth < 768) return 1;
    if (window.innerWidth < 1024) return 2;
    return 3;
  }

  // Update carousel position
  function updateCarousel() {
    const slideWidth = slides[0].offsetWidth + 40; // 40px gap
    const offset = currentIndex * slideWidth;
    track.style.transform = `translateX(-${offset}px)`;
    
    // Update dots
    dotsContainer.querySelectorAll('.carousel-dot').forEach((dot, i) => {
      dot.classList.toggle('active', i === currentIndex);
    });
  }

  // Navigation functions
  function goToSlide(index) {
    currentIndex = Math.max(0, Math.min(index, maxIndex));
    updateCarousel();
  }

  function nextSlide() {
    goToSlide(currentIndex + 1);
  }

  function prevSlide() {
    goToSlide(currentIndex - 1);
  }

  // Event listeners
  prevBtn.addEventListener('click', prevSlide);
  nextBtn.addEventListener('click', nextSlide);

  // Touch/swipe support
  let touchStartX = 0;
  let touchEndX = 0;

  track.addEventListener('touchstart', (e) => {
    touchStartX = e.changedTouches[0].screenX;
  }, { passive: true });

  track.addEventListener('touchend', (e) => {
    touchEndX = e.changedTouches[0].screenX;
    handleSwipe();
  }, { passive: true });

  function handleSwipe() {
    const swipeThreshold = 50;
    const diff = touchStartX - touchEndX;
    
    if (Math.abs(diff) > swipeThreshold) {
      if (diff > 0) {
        nextSlide();
      } else {
        prevSlide();
      }
    }
  }

  // Handle resize
  let resizeTimeout;
  window.addEventListener('resize', () => {
    clearTimeout(resizeTimeout);
    resizeTimeout = setTimeout(() => {
      const newSlidesPerView = getSlidesPerView();
      if (newSlidesPerView !== slidesPerView) {
        slidesPerView = newSlidesPerView;
        maxIndex = Math.max(0, slideCount - slidesPerView);
        currentIndex = Math.min(currentIndex, maxIndex);
        createDots();
        updateCarousel();
      }
    }, 100);
  });

  // Auto-play (optional)
  let autoPlayInterval;
  
  function startAutoPlay() {
    autoPlayInterval = setInterval(() => {
      if (currentIndex >= maxIndex) {
        currentIndex = 0;
      } else {
        currentIndex++;
      }
      updateCarousel();
    }, 5000);
  }

  function stopAutoPlay() {
    clearInterval(autoPlayInterval);
  }

  // Pause on hover
  track.addEventListener('mouseenter', stopAutoPlay);
  track.addEventListener('mouseleave', startAutoPlay);

  // Initialize
  createDots();
  updateCarousel();
  startAutoPlay();
}

// ========================================
// Smooth Scroll
// ========================================
function initSmoothScroll() {
  document.querySelectorAll('a[href^="#"]').forEach(anchor => {
    anchor.addEventListener('click', function(e) {
      const href = this.getAttribute('href');
      if (href === '#') return;
      
      e.preventDefault();
      const target = document.querySelector(href);
      
      if (target) {
        const navHeight = document.getElementById('navbar').offsetHeight;
        const targetPosition = target.getBoundingClientRect().top + window.pageYOffset - navHeight;
        
        window.scrollTo({
          top: targetPosition,
          behavior: 'smooth'
        });
      }
    });
  });
}

// ========================================
// Chart Animation (Hero)
// ========================================
function initChartAnimation() {
  const bars = document.querySelectorAll('.chart-bar');
  
  bars.forEach((bar, index) => {
    bar.style.animationDelay = `${index * 0.1}s`;
  });
}

// ========================================
// Parallax Effect (Optional)
// ========================================
function initParallax() {
  const hero = document.querySelector('.hero');
  const heroVisual = document.querySelector('.hero-visual');
  
  if (!hero || !heroVisual) return;
  
  window.addEventListener('scroll', () => {
    const scrolled = window.pageYOffset;
    const rate = scrolled * 0.3;
    
    if (scrolled < window.innerHeight) {
      heroVisual.style.transform = `translateY(${rate}px)`;
    }
  }, { passive: true });
}

// ========================================
// Form Validation (for future use)
// ========================================
function validateEmail(email) {
  const re = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  return re.test(email);
}

// ========================================
// Analytics Event Tracking (placeholder)
// ========================================
function trackEvent(category, action, label) {
  // Placeholder for analytics
  console.log(`Event: ${category} - ${action} - ${label}`);
  
  // Example with Google Analytics
  // gtag('event', action, {
  //   'event_category': category,
  //   'event_label': label
  // });
}

// Track CTA clicks
document.querySelectorAll('.btn-primary, .store-btn, .nav-cta').forEach(btn => {
  btn.addEventListener('click', () => {
    trackEvent('CTA', 'click', btn.textContent.trim());
  });
});

// ========================================
// Theme Preference (for future dark/light toggle)
// ========================================
function getPreferredTheme() {
  const savedTheme = localStorage.getItem('theme');
  if (savedTheme) return savedTheme;
  
  return window.matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'light';
}

// ========================================
// Intersection Observer Polyfill Check
// ========================================
if (!('IntersectionObserver' in window)) {
  // Fallback for browsers without IntersectionObserver
  document.querySelectorAll('.feature-card, .step, .testimonial-card').forEach(el => {
    el.classList.add('visible');
  });
}

// ========================================
// Performance: Reduce animations for reduced motion preference
// ========================================
if (window.matchMedia('(prefers-reduced-motion: reduce)').matches) {
  document.documentElement.style.setProperty('--transition-fast', '0s');
  document.documentElement.style.setProperty('--transition-base', '0s');
  document.documentElement.style.setProperty('--transition-slow', '0s');
}
