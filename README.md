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

- [`sf deploy`](#sf-deploy)
- [`sf deploy metadata`](#sf-deploy-metadata)
- [`sf deploy metadata cancel`](#sf-deploy-metadata-cancel)
- [`sf deploy metadata quick`](#sf-deploy-metadata-quick)
- [`sf deploy metadata report`](#sf-deploy-metadata-report)
- [`sf deploy metadata resume`](#sf-deploy-metadata-resume)
- [`sf deploy metadata validate`](#sf-deploy-metadata-validate)
- [`sf retrieve metadata`](#sf-retrieve-metadata)

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

_See code: [src/commands/deploy.ts](https://github.com/salesforcecli/plugin-deploy-retrieve/blob/v1.4.1/src/commands/deploy.ts)_

## `sf deploy metadata`

Deploy metadata in source format to an org from your local project.

```
USAGE
  $ sf deploy metadata [--json] [-a <value>] [--async | -w <value>] [--concise | --verbose] [--dry-run] [-r] [-g] [-x
    <value>] [-m <value>] [-d <value>] [-o <value>] [-t <value>] [-l
    NoTestRun|RunSpecifiedTests|RunLocalTests|RunAllTestsInOrg]

FLAGS
  -a, --api-version=<value>    Target API version for the deploy.
  -d, --source-dir=<value>...  Path to the local source files to deploy.
  -g, --ignore-warnings        Ignore warnings and allow a deployment to complete successfully.
  -l, --test-level=<option>    [default: NoTestRun] Deployment Apex testing level.
                               <options: NoTestRun|RunSpecifiedTests|RunLocalTests|RunAllTestsInOrg>
  -m, --metadata=<value>...    Metadata component names to deploy.
  -o, --target-org=<value>     Login username or alias for the target org.
  -r, --ignore-errors          Ignore any errors and don’t roll back deployment.
  -t, --tests=<value>...       Apex tests to run when --test-level is RunSpecifiedTests.
  -w, --wait=<minutes>         [default: 33 minutes] Number of minutes to wait for command to complete and display
                               results.
  -x, --manifest=<value>       Full file path for manifest (package.xml) of components to deploy.
  --async                      Run the command asynchronously.
  --concise                    Show concise output of the deploy result.
  --dry-run                    Validate deploy and run Apex tests but don’t save to the org.
  --verbose                    Show verbose output of the deploy result.

GLOBAL FLAGS
  --json  Format output as json.

DESCRIPTION
  Deploy metadata in source format to an org from your local project.

  You must run this command from within a project.

  This command doesn't support source-tracking. The source you deploy overwrites the corresponding metadata in your org.
  This command doesn’t attempt to merge your source with the versions in your org.

  To deploy multiple metadata components, either set multiple --metadata <name> flags or a single --metadata flag with
  multiple names separated by spaces. Enclose names that contain spaces in one set of double quotes. The same syntax
  applies to --manifest and --source-dir.

EXAMPLES
  Deploy the source files in a directory:

    $ sf deploy metadata  --source-dir path/to/source

  Deploy a specific Apex class and the objects whose source is in a directory (both examples are equivalent):

    $ sf deploy metadata --source-dir path/to/apex/classes/MyClass.cls path/to/source/objects
    $ sf deploy metadata --source-dir path/to/apex/classes/MyClass.cls --source-dir path/to/source/objects

  Deploy all Apex classes:

    $ sf deploy metadata --metadata ApexClass

  Deploy a specific Apex class:

    $ sf deploy metadata --metadata ApexClass:MyApexClass

  Deploy all custom objects and Apex classes (both examples are equivalent):

    $ sf deploy metadata --metadata CustomObject ApexClass
    $ sf deploy metadata --metadata CustomObject --metadata ApexClass

  Deploy all Apex classes and a profile that has a space in its name:

    $ sf deploy metadata --metadata ApexClass --metadata "Profile:My Profile"

  Deploy all components listed in a manifest:

    $ sf deploy metadata --manifest path/to/package.xml

  Run the tests that aren’t in any managed packages as part of a deployment:

    $ sf deploy metadata --metadata ApexClass --test-level RunLocalTests

FLAG DESCRIPTIONS
  -a, --api-version=<value>  Target API version for the deploy.

    Use this flag to override the default API version, which is the latest version supported the CLI, with the API
    version of your package.xml file.

  -d, --source-dir=<value>...  Path to the local source files to deploy.

    The supplied path can be to a single file (in which case the operation is applied to only one file) or to a folder
    (in which case the operation is applied to all metadata types in the directory and its subdirectories).

    If you specify this flag, don’t specify --metadata or --manifest.

  -g, --ignore-warnings  Ignore warnings and allow a deployment to complete successfully.

    If a warning occurs and this flag is set to true, the success status of the deployment is set to true. When this
    flag is set to false, success is set to false, and the warning is treated like an error.

  -l, --test-level=NoTestRun|RunSpecifiedTests|RunLocalTests|RunAllTestsInOrg  Deployment Apex testing level.

    Valid values are:

    - NoTestRun — No tests are run. This test level applies only to deployments to development environments, such as
    sandbox, Developer Edition, or trial orgs. This test level is the default for development environments.

    - RunSpecifiedTests — Runs only the tests that you specify with the --run-tests flag. Code coverage requirements
    differ from the default coverage requirements when using this test level. Executed tests must comprise a minimum of
    75% code coverage for each class and trigger in the deployment package. This coverage is computed for each class and
    trigger individually and is different than the overall coverage percentage.

    - RunLocalTests — All tests in your org are run, except the ones that originate from installed managed and unlocked
    packages. This test level is the default for production deployments that include Apex classes or triggers.

    - RunAllTestsInOrg — All tests in your org are run, including tests of managed packages.

    If you don’t specify a test level, the default behavior depends on the contents of your deployment package. For more
    information, see [Running Tests in a
    Deployment](https://developer.salesforce.com/docs/atlas.en-us.api_meta.meta/api_meta/meta_deploy_running_tests.htm)
    in the "Metadata API Developer Guide".

  -o, --target-org=<value>  Login username or alias for the target org.

    Overrides your default org.

  -r, --ignore-errors  Ignore any errors and don’t roll back deployment.

    When deploying to a production org, keep this flag set to false (default value). When set to true, components
    without errors are deployed and components with errors are skipped, and could result in an inconsistent production
    org.

  -t, --tests=<value>...  Apex tests to run when --test-level is RunSpecifiedTests.

    Separate multiple test names with commas, and enclose the entire flag value in double quotes if a test contains a
    space.

  -w, --wait=<minutes>  Number of minutes to wait for command to complete and display results.

    If the command continues to run after the wait period, the CLI returns control of the terminal window to you and
    returns the job ID. To resume the deployment, run "sf deploy metadata resume". To check the status of the
    deployment, run "sf deploy metadata report".

  -x, --manifest=<value>  Full file path for manifest (package.xml) of components to deploy.

    All child components are included. If you specify this flag, don’t specify --metadata or --source-dir.

  --async  Run the command asynchronously.

    The command immediately returns the job ID and control of the terminal to you. This way, you can continue to use the
    CLI. To resume the deployment, run "sf deploy metadata resume". To check the status of the deployment, run "sf
    deploy metadata report".
```

## `sf deploy metadata cancel`

Cancel a deploy operation.

```
USAGE
  $ sf deploy metadata cancel [--json] [--async | -w <value>] [-i <value>] [-r]

FLAGS
  -i, --job-id=<value>   Job ID of the deploy operation you want to cancel.
  -r, --use-most-recent  Use the job ID of the most recent deploy operation.
  -w, --wait=<minutes>   Number of minutes to wait for the command to complete and display results.
  --async                Run the command asynchronously.

GLOBAL FLAGS
  --json  Format output as json.

DESCRIPTION
  Cancel a deploy operation.

  Use this command to cancel a deploy operation that hasn't yet completed in the org. Deploy operations include standard
  deploys, quick deploys, deploy validations, and deploy cancellations.

  Run this command by either passing it a job ID or specifying the --use-most-recent flag to use the job ID of the most
  recent deploy operation.

EXAMPLES
  Cancel a deploy operation using a job ID:

    $ sf deploy metadata cancel --job-id 0Af0x000017yLUFCA2

  Cancel the most recent deploy operation:

    $ sf deploy metadata cancel --use-most-recent

FLAG DESCRIPTIONS
  -i, --job-id=<value>  Job ID of the deploy operation you want to cancel.

    These commands return a job ID if they time out or you specified the --async flag:

    - sf deploy metadata
    - sf deploy metadata validate
    - sf deploy metadata quick
    - sf deploy metadata cancel

    The job ID is valid for 10 days from when you started the deploy operation.

  -r, --use-most-recent  Use the job ID of the most recent deploy operation.

    For performance reasons, this flag uses job IDs for deploy operations that started only in the past 3 days or less.
    If your most recent deploy operations was more than 3 days ago, this flag won't find a job ID.

  -w, --wait=<minutes>  Number of minutes to wait for the command to complete and display results.

    If the command continues to run after the wait period, the CLI returns control of the terminal window to you. To
    resume watching the cancellation, run "sf deploy metadata resume". To check the status of the cancellation, run "sf
    deploy metadata report".

  --async  Run the command asynchronously.

    The command immediately returns the control of the terminal to you. This way, you can continue to use the CLI. To
    resume watching the cancellation, run "sf deploy metadata resume". To check the status of the cancellation, run "sf
    deploy metadata report".
```

## `sf deploy metadata quick`

Quickly deploy a validated deployment to an org.

```
USAGE
  $ sf deploy metadata quick [--json] [--async | -w <value>] [--concise | --verbose] [-i <value>] [-o <value>] [-r]

FLAGS
  -i, --job-id=<value>      Job ID of the deployment you want to quick deploy.
  -o, --target-org=<value>  Login username or alias for the target org.
  -r, --use-most-recent     Use the job ID of the most recently validated deployment.
  -w, --wait=<minutes>      [default: 33 minutes] Number of minutes to wait for the command to complete and display
                            results.
  --async                   Run the command asynchronously.
  --concise                 Show concise output of the deploy result.
  --verbose                 Show verbose output of the deploy result.

GLOBAL FLAGS
  --json  Format output as json.

DESCRIPTION
  Quickly deploy a validated deployment to an org.

  Before you run this command, first create a validated deployment with the "sf deploy metadata validate" command, which
  returns a job ID. Validated deployments haven't been deployed to the org yet; you deploy them with this command.
  Either pass the job ID to this command or use the --use-most-recent flag to use the job ID of the most recently
  validated deployment. For the quick deploy to succeed, the associated validated deployment must also have succeeded.

  Executing this quick deploy command takes less time than a standard deploy because it skips running Apex tests. These
  tests were previously run as part of the validation. Validating first and then running a quick deploy is useful if the
  deployment to your production org take several hours and you don’t want to risk a failed deploy.

  This command doesn't support source-tracking. The source you deploy overwrites the corresponding metadata in your org.
  This command doesn’t attempt to merge your source with the versions in your org.

EXAMPLES
  Run a quick deploy to your default org using a job ID:

    $ sf deploy metadata quick --job-id 0Af0x000017yLUFCA2

  Asynchronously run a quick deploy of the most recently validated deployment to an org with alias "my-prod-org":

    $ sf deploy metadata quick --async --use-most-recent --target-org my-prod-org

FLAG DESCRIPTIONS
  -i, --job-id=<value>  Job ID of the deployment you want to quick deploy.

    The job ID is valid for 10 days from when you started the validation.

  -o, --target-org=<value>  Login username or alias for the target org.

    Overrides your default org.

  -r, --use-most-recent  Use the job ID of the most recently validated deployment.

    For performance reasons, this flag uses only job IDs that were validated in the past 3 days or less. If your most
    recent deployment validation was more than 3 days ago, this flag won't find a job ID.

  -w, --wait=<minutes>  Number of minutes to wait for the command to complete and display results.

    If the command continues to run after the wait period, the CLI returns control of the terminal window to you. To
    resume watching the deploy, run "sf deploy metadata resume". To check the status of the deploy, run "sf deploy
    metadata report".

  --async  Run the command asynchronously.

    The command immediately returns the control of the terminal to you. This way, you can continue to use the CLI. To
    resume watching the deploy, run "sf deploy metadata resume". To check the status of the deploy, run "sf deploy
    metadata report".
```

## `sf deploy metadata report`

Check the status of a deploy operation.

```
USAGE
  $ sf deploy metadata report [--json] [-i <value>] [-r]

FLAGS
  -i, --job-id=<value>   Job ID of the deploy operation you want to check the status of.
  -r, --use-most-recent  Use the job ID of the most recent deploy operation.

GLOBAL FLAGS
  --json  Format output as json.

DESCRIPTION
  Check the status of a deploy operation.

  Deploy operations include standard deploys, quick deploys, deploy validations, and deploy cancellations.

  Run this command by either passing it a job ID or specifying the --use-most-recent flag to use the job ID of the most
  recent deploy operation.

EXAMPLES
  Check the status using a job ID:

    $ sf deploy metadata report --job-id 0Af0x000017yLUFCA2

  Check the status of the most recent deploy operation:

    $ sf deploy metadata report --use-most-recent

FLAG DESCRIPTIONS
  -i, --job-id=<value>  Job ID of the deploy operation you want to check the status of.

    These commands return a job ID if they time out or you specified the --async flag:

    - sf deploy metadata
    - sf deploy metadata validate
    - sf deploy metadata quick
    - sf deploy metadata cancel

    The job ID is valid for 10 days from when you started the deploy operation.

  -r, --use-most-recent  Use the job ID of the most recent deploy operation.

    For performance reasons, this flag uses job IDs for deploy operations that started only in the past 3 days or less.
    If your most recent operation was more than 3 days ago, this flag won't find a job ID.
```

## `sf deploy metadata resume`

Resume watching a deploy operation.

```
USAGE
  $ sf deploy metadata resume [--json] [--concise | --verbose] [-i <value>] [-r] [-w <value>]

FLAGS
  -i, --job-id=<value>   Job ID of the deploy operation you want to resume.
  -r, --use-most-recent  Use the job ID of the most recent deploy operation.
  -w, --wait=<minutes>   Number of minutes to wait for the command to complete and display results.
  --concise              Show concise output of the deploy operation result.
  --verbose              Show verbose output of the deploy operation result.

GLOBAL FLAGS
  --json  Format output as json.

DESCRIPTION
  Resume watching a deploy operation.

  Use this command to resume watching a deploy operation if the original command times out or you specified the --async
  flag. Deploy operations include standard deploys, quick deploys, deploy validations, and deploy cancellations. This
  command doesn't resume the original operation itself, because the operation always continues after you've started it,
  regardless of whether you're watching it or not.

  Run this command by either passing it a job ID or specifying the --use-most-recent flag to use the job ID of the most
  recent deploy operation.

EXAMPLES
  Resume watching a deploy operation using a job ID:

    $ sf deploy metadata resume --job-id 0Af0x000017yLUFCA2

  Resume watching the most recent deploy operation:

    $ sf deploy metadata resume --use-most-recent

FLAG DESCRIPTIONS
  -i, --job-id=<value>  Job ID of the deploy operation you want to resume.

    These commands return a job ID if they time out or you specified the --async flag:

    - sf deploy metadata
    - sf deploy metadata validate
    - sf deploy metadata quick
    - sf deploy metadata cancel

    The job ID is valid for 10 days from when you started the deploy operation.

  -r, --use-most-recent  Use the job ID of the most recent deploy operation.

    For performance reasons, this flag uses job IDs for deploy operations that started only in the past 3 days or less.
    If your most recent operation was more than 3 days ago, this flag won't find a job ID.

  -w, --wait=<minutes>  Number of minutes to wait for the command to complete and display results.

    If the command continues to run after the wait period, the CLI returns control of the terminal window to you. To
    resume watching the deploy operation, run this command again. To check the status of the deploy operation, run "sf
    deploy metadata report".
```

## `sf deploy metadata validate`

Validate a metadata deployment without actually executing it.

```
USAGE
  $ sf deploy metadata validate [--json] [-a <value>] [--async] [--concise | --verbose] [-x <value> | -m <value> | -d <value>]
    [-o <value>] [-t <value>] [-l RunAllTestsInOrg|RunLocalTests|RunSpecifiedTests] [-w <value>]

FLAGS
  -a, --api-version=<value>    Target API version for the validation.
  -d, --source-dir=<value>...  Path to the local source files to validate for deployment.
  -l, --test-level=<option>    [default: RunLocalTests] Deployment Apex testing level.
                               <options: RunAllTestsInOrg|RunLocalTests|RunSpecifiedTests>
  -m, --metadata=<value>...    Metadata component names to validate for deployment.
  -o, --target-org=<value>     Login username or alias for the target org.
  -t, --tests=<value>...       Apex tests to run when --test-level is RunSpecifiedTests.
  -w, --wait=<minutes>         [default: 33 minutes] Number of minutes to wait for the command to complete and display
                               results.
  -x, --manifest=<value>       Full file path for manifest (package.xml) of components to validate for deployment.
  --async                      Run the command asynchronously.
  --concise                    Show concise output of the validation result.
  --verbose                    Show verbose output of the validation result.

GLOBAL FLAGS
  --json  Format output as json.

DESCRIPTION
  Validate a metadata deployment without actually executing it.

  Use this command to verify whether a deployment will succeed without actually deploying the metadata to your org. This
  command is similar to "sf deploy metadata", except you're required to run Apex tests, and the command returns a job ID
  rather than executing the deployment. If the validation succeeds, then you pass this job ID to the "sf deploy metadata
  quick" command to actually deploy the metadata. This quick deploy takes less time because it skips running Apex tests.
  The job ID is valid for 10 days from when you started the validation. Validating first is useful if the deployment to
  your production org take several hours and you don’t want to risk a failed deploy.

  You must run this command from within a project.

  This command doesn't support source-tracking. When you quick deploy with the resulting job ID, the source you deploy
  overwrites the corresponding metadata in your org.

  To validate the deployment of multiple metadata components, either set multiple --metadata <name> flags or a single
  --metadata flag with multiple names separated by spaces. Enclose names that contain spaces in one set of double
  quotes. The same syntax applies to --manifest and --source-dir.

EXAMPLES
  NOTE: These examples focus on validating large deployments.  See the help for "sf deploy metadata" for examples of deploying smaller sets of metadata which you can also use to validate.

  Validate the deployment of all source files in a directory to the default org:

    $ sf deploy metadata validate --source-dir path/to/source

  Asynchronously validate the deployment and run all tests in the org with alias "my-prod-org"; command immediately
  returns the job ID:

    $ sf deploy metadata validate --source-dir path/to/source --async --test-level RunAllTestsInOrg --target-org \
      my-prod-org

  Validate the deployment of all components listed in a manifest:

    $ sf deploy metadata validate --manifest path/to/package.xml

FLAG DESCRIPTIONS
  -a, --api-version=<value>  Target API version for the validation.

    Use this flag to override the default API version, which is the latest version supported the CLI, with the API
    version in your package.xml file.

  -d, --source-dir=<value>...  Path to the local source files to validate for deployment.

    The supplied path can be to a single file (in which case the operation is applied to only one file) or to a folder
    (in which case the operation is applied to all metadata types in the directory and its subdirectories).

    If you specify this flag, don’t specify --metadata or --manifest.

  -l, --test-level=RunAllTestsInOrg|RunLocalTests|RunSpecifiedTests  Deployment Apex testing level.

    Valid values are:

    - RunSpecifiedTests — Runs only the tests that you specify with the --run-tests flag. Code coverage requirements
    differ from the default coverage requirements when using this test level. Executed tests must comprise a minimum of
    75% code coverage for each class and trigger in the deployment package. This coverage is computed for each class and
    trigger individually and is different than the overall coverage percentage.

    - RunLocalTests — All tests in your org are run, except the ones that originate from installed managed and unlocked
    packages. This test level is the default for production deployments that include Apex classes or triggers.

    - RunAllTestsInOrg — All tests in your org are run, including tests of managed packages.

    If you don’t specify a test level, the default behavior depends on the contents of your deployment package. For more
    information, see [Running Tests in a
    Deployment](https://developer.salesforce.com/docs/atlas.en-us.api_meta.meta/api_meta/meta_deploy_running_tests.htm)
    in the "Metadata API Developer Guide".

  -o, --target-org=<value>  Login username or alias for the target org.

    Overrides your default org.

  -w, --wait=<minutes>  Number of minutes to wait for the command to complete and display results.

    If the command continues to run after the wait period, the CLI returns control of the terminal window to you and
    returns the job ID. To resume watching the validation, run "sf deploy metadata resume". To check the status of the
    validation, run "sf deploy metadata report".

  -x, --manifest=<value>  Full file path for manifest (package.xml) of components to validate for deployment.

    All child components are included. If you specify this flag, don’t specify --metadata or --source-dir.

  --async  Run the command asynchronously.

    The command immediately returns the job ID and control of the terminal to you. This way, you can continue to use the
    CLI. To resume watching the validation, run "sf deploy metadata resume". To check the status of the validation, run
    "sf deploy metadata report".
```

## `sf retrieve metadata`

Retrieve metadata in source format from an org to your local project.

```
USAGE
  $ sf retrieve metadata [--json] [-a <value>] [-x <value> | -m <value> | -d <value>] [-n <value>] [-o <value>] [-w
    <value>]

FLAGS
  -a, --api-version=<value>      Target API version for the retrieve.
  -d, --source-dir=<value>...    File paths for source to retrieve from the org.
  -m, --metadata=<value>...      Metadata component names to retrieve.
  -n, --package-name=<value>...  Package names to retrieve.
  -o, --target-org=<value>       Login username or alias for the target org.
  -w, --wait=<value>             [default: 33 minutes] Number of minutes to wait for the command to complete and display
                                 results to the terminal window.
  -x, --manifest=<value>         File path for the manifest (package.xml) that specifies the components to retrieve.

GLOBAL FLAGS
  --json  Format output as json.

DESCRIPTION
  Retrieve metadata in source format from an org to your local project.

  You must run this command from within a project.

  This command doesn't support source-tracking. The source you retrieve overwrites the corresponding source files in
  your local project. This command doesn’t attempt to merge the source from your org with your local source files.

  To retrieve multiple metadata components, either use multiple --metadata <name> flags or use a single --metadata flag
  with multiple names separated by spaces. Enclose names that contain spaces in one set of double quotes. The same
  syntax applies to --manifest and --source-dir.

EXAMPLES
  Retrieve the source files in a directory:

    $ sf retrieve metadata --source-dir path/to/source

  Retrieve a specific Apex class and the objects whose source is in a directory (both examples are equivalent):

    $ sf retrieve metadata --source-dir path/to/apex/classes/MyClass.cls path/to/source/objects
    $ sf retrieve metadata --source-dir path/to/apex/classes/MyClass.cls --source-dir path/to/source/objects

  Retrieve all Apex classes:

    $ sf retrieve metadata --metadata ApexClass

  Retrieve a specific Apex class:

    $ sf retrieve metadata --metadata ApexClass:MyApexClass

  Retrieve all custom objects and Apex classes (both examples are equivalent):

    $ sf retrieve metadata --metadata CustomObject ApexClass
    $ sf retrieve metadata --metadata CustomObject --metadata ApexClass

  Retrieve all metadata components listed in a manifest:

    $ sf retrieve metadata --manifest path/to/package.xml

  Retrieve metadata from a package:

    $ sf retrieve metadata --package-name MyPackageName

  Retrieve metadata from multiple packages, one of which has a space in its name (both examples are equivalent):

    $ sf retrieve metadata --package-name Package1 "PackageName With Spaces" Package3
    $ sf retrieve metadata --package-name Package1 --package-name "PackageName With Spaces" --package-name Package3

FLAG DESCRIPTIONS
  -a, --api-version=<value>  Target API version for the retrieve.

    Use this flag to override the default API version, which is the latest version supported the CLI, with the API
    version in your package.xml file.

  -d, --source-dir=<value>...  File paths for source to retrieve from the org.

    The supplied paths can be to a single file (in which case the operation is applied to only one file) or to a folder
    (in which case the operation is applied to all source files in the directory and its subdirectories).

  -o, --target-org=<value>  Login username or alias for the target org.

    Overrides your default org.

  -w, --wait=<value>  Number of minutes to wait for the command to complete and display results to the terminal window.

    If the command continues to run after the wait period, the CLI returns control of the terminal window to you.

  -x, --manifest=<value>  File path for the manifest (package.xml) that specifies the components to retrieve.

    If you specify this parameter, don’t specify --metadata or --source-dir.
```

<!-- commandsstop -->
