# Contributing to InvoiceForge

Thanks for your interest in improving InvoiceForge! Contributions of all sizes are welcome — bug fixes, new currencies, accessibility improvements, translations, documentation and feature ideas.

## Ground rules

- **No build step, no dependencies.** InvoiceForge is deliberately plain HTML, CSS and vanilla JavaScript. Please don't add frameworks, bundlers or CDN libraries — that constraint is the project's identity.
- **Keep it dependency-free and offline-friendly.** The app must keep working when `index.html` is opened directly from disk (`file://`).
- **Privacy first.** User data lives in the browser's `localStorage` only. Never add analytics, tracking or network calls that send invoice data anywhere.

## Getting started

1. Fork the repository on GitHub.
2. Clone your fork:
   ```bash
   git clone https://github.com/your-username/invoiceforge.git
   cd invoiceforge
   ```
3. Open `index.html` in a browser — that's it, there is nothing to install.

## Making changes

1. Create a branch for your change:
   ```bash
   git checkout -b feature/short-description
   ```
   Use `fix/` for bug fixes and `docs/` for documentation.
2. Make your change, keeping the existing code style:
   - CSS variables for all colors, spacing and typography (see the `:root` block in `assets/css/style.css`).
   - Semantic HTML5 elements and a `label` for every form input.
   - Comments where the intent of the code isn't obvious.
3. Test manually before submitting:
   - Create, save, reload, load, duplicate and delete an invoice.
   - Check the print preview (Print / Save as PDF) — only the invoice document should print.
   - Toggle dark mode and confirm it persists after a refresh.
   - Resize to a phone-width viewport and check the editor and preview.
   - Open the browser console and confirm there are no errors.

## Reporting bugs

Open a GitHub issue and include:

- What you expected to happen and what actually happened.
- Steps to reproduce the problem.
- Your browser and operating system.
- A screenshot or screen recording if the problem is visual.
- Any browser console errors.

## Submitting a pull request

1. Push your branch to your fork.
2. Open a pull request against the `main` branch of this repository.
3. In the PR description, explain **what** changed and **why**, and include screenshots for UI changes.
4. Keep pull requests focused — one feature or fix per PR makes review faster.
5. Add an entry to `CHANGELOG.md` under an "Unreleased" heading for user-facing changes.

## Ideas for contributions

- New currencies and locale formats.
- Invoice templates / accent colour themes.
- Import/export of invoices as JSON.
- Accessibility audits and keyboard-navigation improvements.
- Translations of the UI.

## Code of conduct

Be kind, be constructive, and assume good faith. Harassment or disrespectful behaviour will not be tolerated.

By contributing, you agree that your contributions will be licensed under the project's [MIT License](LICENSE).
