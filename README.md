# plugin-project

[![NPM](https://img.shields.io/npm/v/@salesforce/plugin-project.svg?label=@salesforce/plugin-project)](https://www.npmjs.com/package/@salesforce/plugin-project) [![CircleCI](https://circleci.com/gh/salesforcecli/plugin-project/tree/main.svg?style=shield)](https://circleci.com/gh/salesforcecli/plugin-project/tree/main) [![Downloads/week](https://img.shields.io/npm/dw/@salesforce/plugin-project.svg)](https://npmjs.org/package/@salesforce/plugin-project) [![License](https://img.shields.io/badge/License-BSD%203--Clause-brightgreen.svg)](https://raw.githubusercontent.com/salesforcecli/plugin-project/main/LICENSE.txt)

## Install

```bash
sf plugins:install plugin-project@x.y.z
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

### CLA

External contributors will be required to sign a Contributor's License
Agreement. You can do so by going to https://cla.salesforce.com/sign-cla.

### Build

To build the plugin locally, make sure to have yarn installed and run the following commands:

```bash
# Clone the repository
git clone git@github.com:salesforcecli/plugin-project

# Install the dependencies and compile
yarn install
yarn build
```

To use your plugin, run using the local `./bin/run` or `./bin/run.cmd` file.

```bash
# Run using local run file.
./bin/run project
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
* [`sf project:deploy`](#sf-projectdeploy)

## `sf project:deploy`

deploy a Salesforce project

```
USAGE
  $ sf project:deploy

OPTIONS
  --directory=directory    directory to deploy
  --interactive            TBD
  --target-env=target-env  TBD

DESCRIPTION
  Deploy a project, including org metadata and functions. Be default, the deploy analyze your project and assume 
  sensible defaults when possible, otherwise it will prompt. To always prompt and not assume defaults, use 
  "--interctive".
  To run specialized deploys, especially when interactivity isn't an option like continuous deployment, used the scoped 
  deploy commands like "sf project deploy org" or "sf project deploy functions"

EXAMPLES
  sf project:deploy
  sf project:deploy --remote
```

_See code: [src/commands/project/deploy.ts](https://github.com/salesforcecli/plugin-project/blob/v0.0.2/src/commands/project/deploy.ts)_
<!-- commandsstop -->
