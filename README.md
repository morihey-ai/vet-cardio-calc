# Vet Cardio Calc

Local-first calculator prototype for canine and feline cardiology practice.

## What This App Does

- Patient common data entry
- Drug dose calculation and actual dose back-calculation
- Nutrition calculation
- Echocardiographic calculations
- MINE score 1, MINE score 2, and PH score helper display
- CSV export and short clinical text generation

## Privacy

This app is designed as a calculation helper. It does not provide diagnosis, treatment decisions, or automatic drug recommendations.

Patient data is stored in the browser's local IndexedDB. When hosted on GitHub Pages, the application code is loaded from GitHub Pages, but entered patient data remains in the browser storage of each device.

Avoid entering personally identifiable information unless your operating environment and data handling rules allow it.

## Local Use

Open:

```text
dist/index.html
```

or run a local preview:

```powershell
pnpm install
pnpm build
pnpm preview
```

## Development

```powershell
pnpm install
pnpm test
pnpm build
```

## GitHub Pages

This repository includes a GitHub Actions workflow that builds the app and deploys `dist/` to GitHub Pages.

After pushing to GitHub:

1. Open repository settings.
2. Go to `Pages`.
3. Set source to `GitHub Actions`.
4. Push to `main` or run the workflow manually.

The public URL will usually be:

```text
https://<your-github-user-name>.github.io/vet-cardio-calc/
```

## Mobile Use

Open the GitHub Pages URL on iPhone or Android.

- iPhone: Safari > Share > Add to Home Screen
- Android: Chrome > menu > Add to Home screen or Install app

The app code is downloaded from GitHub Pages. Patient and exam data entered in the app is saved only in that device's browser storage unless export or sharing is performed manually.

## Publication Notes

For public use, keep the app positioned as a calculation helper:

- Not a diagnostic tool
- Not a treatment recommendation tool
- No automatic medication recommendation
- Check formula versions, score cutoffs, and source papers before clinical use
