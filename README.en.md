# François de Gennaro — networks and infrastructure

Bilingual portfolio of a computer science student in Mons, Belgium, certified in **Cisco CCST Networking**. Java, SQL and infrastructure projects, plus an interactive IPv4 lab.

[Live website](https://portfolio.jobandjudith.com/en/) · [Français](README.md) · [English CV](https://portfolio.jobandjudith.com/assets/cv/CV_Francois_de_Gennaro_EN.pdf)

## Explore

- Profile, skills and project notes with an explicit current scope.
- Separate French and English pages, downloadable CVs and a verifiable Credly credential.
- IPv4/CIDR calculator from `/0` to `/32`, binary representation and subnet challenges.
- Public source links for the [Java application](https://github.com/erebethos/le-dernier-des-palimpsestes) and [MariaDB project](https://github.com/erebethos/palimpseste-bdd).

## Run locally

Requires **Node.js 20+** for generation and checks, and **Python 3** for this local server example. There are no npm dependencies to install.

```sh
git clone https://github.com/erebethos/vitrine-pro.git
cd vitrine-pro
git switch refonte-pro-2026
npm run build
npm test
npm run check
python3 -m http.server 8000 --directory dist
```

Open <http://localhost:8000/> or <http://localhost:8000/en/>. Serve `dist/` over HTTP rather than opening files directly: JavaScript modules require a web server.

## Structure and decisions

Static semantic HTML, CSS and native JavaScript, without a frontend framework or production database. Node.js is used for generation, checks and deployment, not as a production application server.

| Path | Role |
|---|---|
| `dist/index.html` | French source document, readable without JavaScript |
| `dist/en/index.html` | Generated English page |
| `dist/assets/content.mjs` | Translations, project notes and public source URLs |
| `dist/assets/network.mjs` | DOM-independent IPv4 calculation |
| `dist/assets/app.mjs` | Lab interactions and project dialogs |
| `dist/assets/cv/` | French and English PDFs |
| `scripts/` | Generation, checks and deployment |
| `tests/` | IPv4 tests and deployment boundaries |

Edit the French source and translation data, then regenerate. Direct edits to the English HTML alone are overwritten on the next build.

Calculations use unsigned arithmetic and handle `/31` point-to-point links and `/32` host addresses explicitly. Input addresses stay in the browser. Language links work without local storage; the main content remains available without JavaScript. The Cisco badge links to [the individual Credly credential](https://www.credly.com/badges/8d5ce9d3-778d-4cd7-ad94-d92cddac642f/public_url).

## Checks and deployment

**12 tests** cover invalid inputs, numeric boundaries, all prefixes through 2,145 deterministic samples, challenge answers and deployment path restrictions. Static checks validate local assets, translations, HTML IDs, metadata, CV downloads and public source links.

Pushes to `refonte-pro-2026` trigger GitHub Actions: generate FR/EN pages, test, authorise temporary SSH access via the cPanel API, transfer through rsync over SSH, verify the deployed revision over HTTPS and remove newly added firewall exceptions.

The live site is hosted on **o2switch** at <https://portfolio.jobandjudith.com/>. SSH host keys are checked and credentials are stored in Actions secrets. Replaced files have off-webroot backups; these are differential backups, not complete snapshots.

The local build uses the preview origin from `site.config.mjs`. Use `SITE_ORIGIN=https://portfolio.jobandjudith.com npm run build` and the same environment variable for `npm run check` to generate public canonical/hreflang URLs. [Deployment setup](docs/deploy-o2switch.md) is documented in French.

The default branch, `refonte-pro-2026`, contains this portfolio. `main` preserves the earlier academic site. `.openai/hosting.json` retains the Sites preview identity.

## Scope

Track, Flag & Execute is **in design**, not a delivered simulation engine. The landing-page topology is illustrative. Java and SQL are separate projects; Azure coursework resources are not permanent public services. A future Python/SQL lab application remains a possible direction.

Author: **François de Gennaro**, Mons, Belgium. [LinkedIn](https://www.linkedin.com/in/françois-de-gennaro-it/) · [GitHub](https://github.com/erebethos).
