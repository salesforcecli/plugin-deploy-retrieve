# WebApp DigitalExperienceBundle NUT Tests

This directory contains NUT (Non-Unit Tests) for testing web_app DigitalExperienceBundle deployments with path-based fullNames.

## Test Files

### 1. `webapp.nut.ts`

Basic deployment and retrieval tests for webapp bundles.

**What it tests**:

- Deploy webapp bundle without "not found in local project" warnings
- Path-based fullNames for web_app files (e.g., `web_app/WebApp/src/App.js`)
- Retrieve webapp bundle with path-based fullNames
- .forceignore pattern matching for webapp files

## Test Project Structure

The test project includes:

```
force-app/main/default/digitalExperiences/web_app/WebApp/
├── webapp.json
├── public/
│   ├── index.html
│   └── images/
│       ├── icon.png
│       ├── photo.jpg
│       └── logo.svg
└── src/
    ├── App.css
    ├── App.js
    ├── index.css
    └── index.js
```

## Running Tests

Run all webapp NUT tests:

```bash
yarn test:nuts:deb-webapp
```

Run individual tests:

```bash
yarn mocha test/nuts/digitalExperienceBundleWithWebapps/webapp.nut.ts
```

## Technical Details

### FullName Format

Web_app files use path-based fullNames:

```
web_app/WebApp/src/App.js
└──────┘└─────┘└────────┘
baseType bundle  relative path
```

## Related Files

- **Implementation**: `/src/resolve/adapters/digitalExperienceSourceAdapter.ts`
- **Deploy Logic**: `/src/client/deployMessages.ts`
- **Path Name Util**: `/src/client/utils.ts` (`computeWebAppPathName`)
