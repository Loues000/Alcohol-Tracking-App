# SipTrack Marketing Website

A beautiful, interactive landing page for the SipTrack alcohol tracking app.

## Features

- **Modern Design**: Dark theme with amber accent colors matching the app
- **Fully Responsive**: Works perfectly on desktop, tablet, and mobile
- **Interactive Elements**:
  - Animated hero section with floating cards
  - Count-up statistics
  - Screenshot carousel with touch/swipe support
  - Scroll-triggered animations
  - Smooth scrolling navigation
  - Particle background effect
- **Performance**: 
  - No external JS libraries required
  - Respects `prefers-reduced-motion` for accessibility
  - Optimized animations using CSS transforms

## Structure

```
website/
├── index.html    # Main HTML file
├── style.css     # All styles (no preprocessor needed)
├── script.js     # Vanilla JavaScript for interactivity
└── README.md     # This file
```

## Running Locally

Simply open `index.html` in your browser, or use a local server:

```bash
# Using Python
python -m http.server 3137

# Using Node.js (npx)
npx serve . -l 3137

# Using PHP
php -S localhost:3137
```

Then visit `http://localhost:3137`

## Customization

### Colors
Edit the CSS variables in `style.css`:

```css
:root {
  --color-accent: #e59d2c;        /* Main accent (amber/gold) */
  --color-wine: #93032e;          /* Wine red */
  --color-beer: #c59b49;          /* Beer gold */
  --color-cocktail: #4f8ea8;      /* Cocktail blue */
}
```

### Content
All content is in `index.html`. Key sections:
- **Hero**: Main headline and stats
- **Features**: 6 feature cards
- **How It Works**: 3-step process
- **Screenshots**: App preview carousel
- **Testimonials**: User reviews
- **Download**: CTA with app store buttons
- **Footer**: Links and social

## Browser Support

- Chrome, Firefox, Safari, Edge (latest 2 versions)
- Graceful degradation for older browsers
