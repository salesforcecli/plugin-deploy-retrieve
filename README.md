# plugin-deploy-retrieve

[![NPM](https://img.shields.io/npm/v/@salesforce/plugin-deploy-retrieve.svg?label=@salesforce/plugin-deploy-retrieve)](https://www.npmjs.com/package/@salesforce/plugin-deploy-retrieve) [![CircleCI](https://circleci.com/gh/salesforcecli/plugin-deploy-retrieve/tree/main.svg?style=shield)](https://circleci.com/gh/salesforcecli/plugin-deploy-retrieve/tree/main) [![Downloads/week](https://img.shields.io/npm/dw/@salesforce/plugin-deploy-retrieve.svg)](https://npmjs.org/package/@salesforce/plugin-deploy-retrieve) [![License](https://img.shields.io/badge/License-BSD%203--Clause-brightgreen.svg)](https://raw.githubusercontent.com/salesforcecli/plugin-deploy-retrieve/main/LICENSE.txt)

## Install

```bash
sf plugins:install plugin-deploy-retrieve@x.y.z
```

## Contributing

1. Please read our [Code of Conduct](CODE_OF_CONDUCT.md)
2. Create a new issue before starting your project so that we can keep track of
   what you are trying to add/fix. That way, we can also offer suggestions or
   let you know if there is already an effort in progress.
3. Fork this repository.
4. [Build the plugin locally](#build)
5. Create a _topic_ branch in your fork. Note, this step is recommended but technically not required if contributing using a fork.
6. Edit the code in your fork.
7. Write appropriate tests for your changes. Try to achieve at least 95% code coverage on any new code. No pull request will be accepted without unit tests.
8. Sign CLA (see [CLA](#cla) below).
9. Send us a pull request when you are done. We'll review your code, suggest any needed changes, and merge it in.

To add a new project command see the [contributing guide](CONTRIBUTING.md)

### CLA

External contributors will be required to sign a Contributor's License
Agreement. You can do so by going to https://cla.salesforce.com/sign-cla.

### Build

To build the plugin locally, make sure to have yarn installed and run the following commands:

```bash
# Clone the repository
git clone git@github.com:salesforcecli/plugin-deploy-retrieve

# Install the dependencies and compile
yarn install
yarn build
```

To use your plugin, run using the local `./bin/dev` or `./bin/dev.cmd` file.

```bash
# Run using local run file.
./bin/run deploy
```

There should be no differences when running via the Salesforce CLI or using the local run file. However, it can be useful to link the plugin to do some additional testing or run your commands from anywhere on your machine.

```bash
# Link your plugin to the sf cli
sf plugins:link .
# To verify
sf plugins
```

## Commands

<!-- commands -->
* [`sf deploy`](#sf-deploy)

## `sf deploy`

Deploy a project interactively to any Salesforce environment.

```
USAGE
  $ sf deploy [--interactive]

FLAGS
  --interactive  Force the CLI to prompt for all deployment inputs.

DESCRIPTION
  Deploy a project interactively to any Salesforce environment.

  This command must be run from within a project.

  The command first analyzes your project, your active or logged-into environments, and local defaults to determine what
  to deploy and where to deploy it. The command then prompts you for information about this particular deployment and
  provides intelligent choices based on its analysis.

  For example, if your local project contains a source directory with metadata files in source format, the command asks
  if you want to deploy that Salesforce app to an org. The command lists your connected orgs and asks which one you want
  to deploy to. The list of orgs starts with scratch orgs, ordered by expiration date with the most recently created one
  first, and then Dev Hub and production orgs ordered by name. If the command finds Apex tests, it asks if you want to
  run them and at which level.

  The command stores your responses in the "deploy-options.json" file in your local project directory and uses them as
  defaults when you rerun the command. Specify --interactive to force the command to reprompt.

  Use this command for quick and simple deploys. For more complicated deployments, use the environment-specific
  commands, such as "sf deploy metadata", that provide additional flags.

EXAMPLES
  Deploy a project and use stored values from a previous command run:

    $ sf deploy

  Reprompt for all deployment inputs:

    $ sf deploy --interactive
```

_See code: [src/commands/deploy.ts](https://github.com/salesforcecli/plugin-deploy-retrieve/blob/v1.0.0/src/commands/deploy.ts)_
<!-- commandsstop -->
