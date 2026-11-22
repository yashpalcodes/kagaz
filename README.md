# Kagaz

[![CI](https://github.com/yashpalcodes/kagaz/actions/workflows/ci.yml/badge.svg)](https://github.com/yashpalcodes/kagaz/actions/workflows/ci.yml)
[![License: MIT](https://img.shields.io/badge/License-MIT-blue.svg)](LICENSE)

**Kagaz** helps families find which central and state government schemes they qualify for,
tells them which documents to obtain first (and in what order), and guides them through
filling the forms by voice in their own language.

> Status: under active development. Live demo and demo video will be added at v1.0.0.

## The problem

Portals check eligibility but do not model **document dependency chains**. A certificate often
needs another certificate first, so first-time applicants make repeated trips to offices.

## What Kagaz does

- Rule-based eligibility engine for central and state schemes
- AND/OR document dependency graph with a personalised "do this first" action plan
- Document checklist and expiry reminders
- Kannada, Hindi and English interface
- Voice-guided form filling with printable PDF output
- State-pluggable data packs (adding a state means adding data, not code)

## Repository layout

apps/web React PWA
apps/api Node/TypeScript API
services/speech Python speech service (ASR/TTS)
packages/rules Eligibility rule engine and planner
data/ Central and per-state scheme data packs
docs/ Design docs and specs

## Getting started

```bash
git clone https://github.com/yashpalcodes/kagaz.git
cd kagaz
npm install
npm test
```

## Roadmap

| Version | Focus                                 |
| ------- | ------------------------------------- |
| v0.1.0  | Rule engine, document planner, API    |
| v0.2.0  | React PWA with multilingual UI        |
| v0.3.0  | Voice-guided intake                   |
| v0.4.0  | Template-based form filling, PDF      |
| v1.0.0  | Polish, accessibility, Rajasthan pack |

## Disclaimer

Scheme rules change. Kagaz shows the source and last-verified date for every rule, but always
verify with the issuing office before applying.

## Author

Yashpal Singh ([@yashpalcodes](https://github.com/yashpalcodes))

## License

MIT
