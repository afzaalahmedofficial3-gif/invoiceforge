# Changelog

All notable changes to InvoiceForge will be documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.1.0/),
and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

## [1.0.0] - 2026-10-30

### Added

- Initial public release of InvoiceForge.
- Invoice editor with persistent business profile (name, email, phone, address, logo initial).
- Client details (name, company, email, address).
- Auto-incrementing invoice numbers with issue and due dates.
- Unlimited line items with live per-line and grand-total calculation.
- Percentage discount and Tax/VAT support.
- Multi-currency support: PKR, USD, EUR, GBP, AED and INR with `Intl.NumberFormat` formatting.
- Live A4-style invoice preview that updates as you type.
- Invoice status workflow (Draft / Sent / Paid) with a colour-coded badge on the preview.
- Notes / payment terms field printed on the invoice.
- Print / Save as PDF using a dedicated print stylesheet that prints only the invoice document, on A4.
- Saved Invoices panel: save, load, duplicate and delete invoices, all stored in `localStorage`.
- Dark / light mode toggle, persisted between visits.
- Clearly-labelled sample data on first run so the preview looks complete immediately.
- Input validation: required fields highlighted, negative quantities/rates rejected, totals never render as `NaN`.
- Accessible, semantic HTML5 layout with labelled inputs, focus states and a skip link.
- SEO meta tags, Open Graph cards and an SVG favicon.
- MIT License, contributing guide and this changelog.
