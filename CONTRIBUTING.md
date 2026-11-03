## Contributing

1. Please create a new issue [here](https://github.com/forcedotcom/cli/issues) before starting any work so that we can also offer suggestions or let you know if there is already an effort in progress.
1. Fork this repository.
1. Sign the Salesforce [CLA](#cla).
1. The CLI team will review your pull request and provide feedback.
1. Once merged, a new release of `@salesforce/plugin-deploy-retrieve` will be published to [npm](https://www.npmjs.com/package/@salesforce/plugin-deploy-retrieve).

### CLA

External contributors are required to sign a Contributor License
Agreement. You can do so by going to https://cla.salesforce.com/sign-cla.

## Branches

- We work in branches off of `main`.
- Our release (aka. _production_) branch is `main`.
- Our work happens in _topic_ branches (feature and/or bug-fix).
  - Feature as well as bug-fix branches are based on `main`
  - Branches _should_ be kept up-to-date using `rebase`

## Pull Requests

- Develop features and bug fixes in _topic_ branches off main, or forks.
- _Topic_ branches can live in forks (external contributors) or within this repository (internal contributors).
  - When creating _topic_ branches in this repository please prefix with `<initials>/`. For example: `mb/refactor-tests`.
- Use [conventional commits](https://www.conventionalcommits.org/en/v1.0.0/#summary) to drive semver versioning. Examples:
  - `chore: my chore message` --> No release
  - `fix: my fix message` --> Patch release
  - `feat: my feat message` --> Minor release
- PRs will be reviewed and merged by the CLI team.

## Testing

All changes must have associated tests. This plugin uses a combination of unit testing and NUTs (non-unit tests).

- Run unit tests with `yarn test`. Tests use the mocha framework and are located in the `test` directory with the naming pattern `<test-file>.test.ts`.
- Run integration tests (NUTs) with `yarn test:nuts`. NUTs use the [cli-plugins-testkit](https://github.com/salesforcecli/cli-plugins-testkit) framework and run against the default devhub in your environment.

## Debugging

Refer to the [Salesforce CLI Plugin Developer Guide](https://developer.salesforce.com/docs/platform/salesforce-cli-plugin/guide/debug-plugin.html) for debugging tips.

## Local Development

To run modified plugin commands locally, use `./bin/run.js` or `./bin/run.cmd` (Windows). Changes must be compiled with `yarn build` before they take effect. Use `yarn build --watch` to automatically recompile when files are saved.

```bash
# Compile changes
yarn build

# Run a command locally
./bin/run.js <command> --help
```

To link the plugin to the Salesforce CLI for testing:

```bash
sf plugins link .
sf plugins  # verify
```

## Useful Yarn Commands

- `yarn build` — Compile the TypeScript source
- `yarn build --watch` — Recompile automatically on file changes
- `yarn test` — Run unit tests
- `yarn test:nuts` — Run integration tests (NUTs)
- `yarn lint` — Run the linter
