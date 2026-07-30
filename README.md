# CoordyNavi Promotion License Issuer

A static site for sales use that issues Keygen licenses under the
`CoordyNavi_Promotion_1Year` policy in sequence, given a company name, country,
quantity, and start index.

- Naming: `PPL_<3-letter country code>_<company>_<3-digit index>` (e.g. `PPL_JPN_AcmeCorp_001`)
- No backend. The browser calls the Keygen API directly.
- Each user enters their own token; it is kept only in the browser session (cleared when the tab is closed).

## Usage

1. Open the site.
2. Paste a **Product token** (see below for how to obtain one).
3. Enter the company name, country, quantity, and start index.
4. Check the preview of the names to be issued, then click **Issue licenses**.
5. The results table shows the license name and license key for each.

## Obtaining a Product token

Use a token starting with `prod-`, either from the Keygen dashboard
(Settings → Tokens) or one distributed by an administrator. An admin token also
works, but it is too privileged — a **Product token is recommended** (a leaked
Product token cannot destroy the whole account).

## Development / running locally

Because the app uses ES modules, it does not run from `file://`. Serve it locally:

```bash
python -m http.server 8080
# → http://localhost:8080/
```

Tests (pure logic, no network required):

```bash
node --test
```

## Deploy (GitHub Pages)

1. Push this folder to a GitHub repository.
2. In the repository, set Settings → Pages → Source to the `main` branch / `/ (root)`.
3. Share the published URL with the sales team.

No secrets are included in the repository (the token is entered by the user in the browser).

## Configuration

`config.js` defines the account ID, policy name, naming rules, and quantity cap.
Edit it there when changes are needed.
