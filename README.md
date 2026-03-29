# mypace.run

Fast, simple running pace conversion with minimal clicks. 🏃

Live site: [http://mypace.run](http://mypace.run) ✨

<p align="center">
  <img src="https://i.imgur.com/eXSG7lU.png" alt="mypace.run screenshot" width="1200" />
</p>

`mypace.run` is a sleek, mobile-first pace tool built for runners who want answers instantly.
Type one pace or speed once and the site immediately converts across `min/km`, `min/mi`, `km/h`, and `mph` without dropdowns, extra forms, or unnecessary friction.

It also goes much deeper when you want it to.

## Why It Exists

Most pace calculators make a simple task feel slower than it should be.
`mypace.run` is built around a different idea:

- one input
- minimal clicks
- instant parsing
- copy-friendly outputs
- clean mobile and desktop UX
- advanced tools available when needed, hidden when not

The result is a running utility that feels fast enough to use mid-workout, on the treadmill, or while planning a race.

## Features

### Core Pace Conversion ⚡

- Instant conversion across `min/km`, `min/mi`, `km/h`, and `mph`
- Smart parsing for common inputs like `5:30/km`, `7:15/mi`, `13.3 km/h`, and `8.2 mph`
- Quick unit toggles to swap units with almost no typing
- Desktop keyboard flow with `Tab` cycling through units
- Copyable result cards with smooth visual feedback

### Race Tools 📈

- Race projections for `5K`, `10K`, `Half Marathon`, and `Marathon`
- World-record warning state if a projection is faster than the current record threshold
- VDOT equivalents with selectable race basis
- Grade Adjusted Pace table across multiple units
- Visual split tables with positive and negative split weighting

### UX Details 🎯

- Mobile-first layout
- PWA support for installability and offline-friendly repeat use
- Desktop-only advanced section “unzip” interaction to reduce information overload
- Copy affordances across cards and tables
- Query-string hydration for prefilled pace input
- Dedicated About page for discoverability and SEO
- Small hidden divider mini-game as an easter egg

## Built As A Static Site 🧩

Everything runs inline in the HTML with JavaScript so the site stays lightweight and easy to deploy.
There is no backend required.
The site also includes a lightweight PWA setup with a web app manifest, app icons, and a service worker for core static asset caching.

## Project Structure

- `index.html`: main app, styles, interactions, and calculator logic
- `about.html`: SEO-friendly About page
- `manifest.webmanifest`: installable PWA metadata
- `sw.js`: lightweight service worker for static asset caching
- `icon-192.png` / `icon-512.png`: PWA app icons
- `README.md`: project overview

## Local Development 💻

Because the project is static, you can run it with any simple local server.

### Option 1

Open `index.html` directly in a browser.

### Option 2

Serve the folder locally.

```bash
python3 -m http.server 8000
```

Then open `http://localhost:8000`.

## Feedback

Feedback, bugs, and feature ideas are welcome here:

- Repo: [MathBunny/mypace-run](https://github.com/MathBunny/mypace-run) 💡

## Philosophy

`mypace.run` is designed to feel like a tool, not a workflow.
Fast in, fast out, and deeper only when you want it.
