# Delay Repay Ledger

A personal notebook for UK train delays. Log a late journey, get an estimate of the Delay Repay you're owed, see where to claim, and track each claim until it's paid.

It is a note-taking tool: it **does not submit claims**. Operators make the final decision.

## Features

- **Journey log:** origin and destination (with station-code autocomplete), route shown on the ticket, where the train went, booked train, and where you bought the ticket.
- **Ticket details:** Standard or First Class, ticket type (single, return, Advance, weekly/monthly/quarterly/annual season, Flexi Season, contactless), price, and which leg of a return was late.
- **Seatfrog upgrades:** add the upgrade price and it's compensated at the same rate. The £3 platform fee is never included.
- **Estimate:** uses each operator's rules: Delay Repay 15, Delay Repay 30, Grand Central (from 60 min), and the Merseyrail/TfL 30-minute rules.
- **Where to claim:** a link to the operator's Delay Repay page, the 28-day deadline and tips for your situation.
- **Claim tracking:** to claim, submitted, paid or rejected, plus reference numbers, amount paid and notes.
- **Operator stats:** estimated vs paid by operator, delays by band, success rate and average delay.
- **Backup:** download a JSON backup, restore it on another device, or export a CSV for spreadsheets.
- **Works on any device:** phone layout with bottom navigation, tablet and desktop layouts, light/dark/auto theme.
- **Installable and offline:** add it to your home screen and it opens without a connection.

## Privacy

Everything you log is stored **in your browser only** (`localStorage`). There's no server, account or tracking. Clearing site data removes your journeys, so download a backup from **Backup → Download backup** now and then.

## Project structure

```
index.html              App page
css/styles.css          Styles and responsive layouts
js/data.js              Operators, bands, ticket types, stations  ← update when rules change
js/calc.js              Compensation estimate (no DOM, unit tested)
js/app.js               UI, storage, backup, routing
sw.js                   Service worker (offline)
manifest.webmanifest    Install metadata
icons/                  Favicon and app icons
scripts/                Icon sources and the icon renderer
tests/calc.test.js      Unit tests for the estimate
vercel.json             Vercel headers
```

There's no build step. It's plain HTML, CSS and JavaScript.

## Run it locally

```bash
npm start          # serves on http://localhost:3000
# or
python3 -m http.server 3000
```

Opening `index.html` directly also works, but offline mode and installing need `http://` or `https://`.

Run the tests (Node 18+):

```bash
npm test
```

## Deploy to Vercel

1. Push this folder to a GitHub repository (see below).
2. In Vercel choose **Add New → Project** and import the repository.
3. Framework preset: **Other**. Leave the build command and output directory empty.
4. Click **Deploy**.

Or from the command line: `npx vercel` (then `npx vercel --prod`).

## Deploy to GitHub Pages

```bash
git init
git add .
git commit -m "Delay Repay Ledger"
git branch -M main
git remote add origin https://github.com/<you>/delay-repay-ledger.git
git push -u origin main
```

Then in the repository go to **Settings → Pages**, set **Source** to *Deploy from a branch*, and pick `main` and `/ (root)`. The site appears at `https://<you>.github.io/delay-repay-ledger/`. All paths are relative, so it works in a sub-folder. The `.nojekyll` file stops GitHub processing the files.

## Updating operator rules

Thresholds and bands live in `js/data.js`:

- `SCHEMES` holds the bands: `[minutes from, share of fare]`.
- `OPS` holds each operator's scheme, Delay Repay page and notes.

After changing app files, bump `CACHE` in `sw.js` (for example `drl-v1.0.1`) so installed copies update.

## Calculation rules used

| Delay | Single | Return (one leg late) |
|---|---|---|
| 15–29 min | 25% | 12.5% |
| 30–59 min | 50% | 25% |
| 60–119 min | 100% | 50% |
| 120+ min | 100% | 100% |

Delay Repay 30 operators (LNER, CrossCountry, Hull Trains, Lumo, ScotRail, Caledonian Sleeper) start at 30 minutes. Season tickets are split into single journeys (weekly ÷10, monthly ÷40, quarterly ÷120, annual ÷464, Flexi ÷16) and doubled at 120+ minutes. Amounts are rounded to the nearest penny.

Split tickets, rovers, carnets, pay as you go and missed connections can be worked out differently by operators. Always check the operator's page before claiming.

## Sources

- National Rail: [Compensation and refunds](https://www.nationalrail.co.uk/help-and-assistance/compensation-and-refunds/)
- Each operator's Delay Repay page (linked in the app)
- Seatfrog Help Centre: [Delay Repay on upgrades](https://help.seatfrog.com/hc/en-gb/articles/360001122176-Delay-Repay-my-train-was-delayed-can-I-get-a-refund-on-my-upgrade)

The logo is an original design and is not affiliated with National Rail, the Rail Delivery Group, Seatfrog or any train company.
