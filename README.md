# plugin-deploy-retrieve

[![License](https://img.shields.io/badge/License-BSD%203--Clause-brightgreen.svg)](https://raw.githubusercontent.com/salesforcecli/plugin-project/main/LICENSE.txt)

[![NPM](https://img.shields.io/npm/v/@salesforce/plugin-deploy-retrieve.svg?label=@salesforce/plugin-deploy-retrieve)](https://www.npmjs.com/package/@salesforce/plugin-deploy-retrieve) [![Downloads/week](https://img.shields.io/npm/dw/@salesforce/plugin-deploy-retrieve.svg)](https://npmjs.org/package/@salesforce/plugin-deploy-retrieve) [![License](https://img.shields.io/badge/License-BSD%203--Clause-brightgreen.svg)](https://raw.githubusercontent.com/salesforcecli/plugin-deploy-retrieve/main/LICENSE.txt)

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

To use your plugin, run using the local `./bin/dev.js` or `./bin/dev.cmd` file.

```bash
# Run using local run file.
./bin/dev.js deploy
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

- [`sf project convert mdapi`](#sf-project-convert-mdapi)
- [`sf project convert source`](#sf-project-convert-source)
- [`sf project delete source`](#sf-project-delete-source)
- [`sf project delete tracking`](#sf-project-delete-tracking)
- [`sf project deploy cancel`](#sf-project-deploy-cancel)
- [`sf project deploy preview`](#sf-project-deploy-preview)
- [`sf project deploy quick`](#sf-project-deploy-quick)
- [`sf project deploy report`](#sf-project-deploy-report)
- [`sf project deploy resume`](#sf-project-deploy-resume)
- [`sf project deploy start`](#sf-project-deploy-start)
- [`sf project deploy validate`](#sf-project-deploy-validate)
- [`sf project generate manifest`](#sf-project-generate-manifest)
- [`sf project list ignored`](#sf-project-list-ignored)
- [`sf project reset tracking`](#sf-project-reset-tracking)
- [`sf project retrieve preview`](#sf-project-retrieve-preview)
- [`sf project retrieve start`](#sf-project-retrieve-start)

## `sf project convert mdapi`

Convert metadata retrieved via Metadata API into the source format used in Salesforce DX projects.

```
USAGE
  $ sf project convert mdapi -r <value> [--json] [--flags-dir <value>] [--api-version <value>] [-d <value>] [-p <value> |
    -x <value> | -m <value>]

FLAGS
  -d, --output-dir=<value>       Directory to store your files in after they’re converted to source format; can be an
                                 absolute or relative path.
  -m, --metadata=<value>...      Metadata component names to convert.
  -p, --metadata-dir=<value>...  Root of directory or zip file of metadata formatted files to convert.
  -r, --root-dir=<value>         (required) Root directory that contains the Metadata API–formatted metadata.
  -x, --manifest=<value>         File path to manifest (package.xml) of metadata types to convert.
      --api-version=<value>      Override the api version used for api requests made by this command

GLOBAL FLAGS
  --flags-dir=<value>  Import flag values from a directory.
  --json               Format output as json.

DESCRIPTION
  Convert metadata retrieved via Metadata API into the source format used in Salesforce DX projects.

  To use Salesforce CLI to work with components that you retrieved via Metadata API, first convert your files from the
  metadata format to the source format using this command.

  To convert files from the source format back to the metadata format, run "sf project convert source".

  To convert multiple metadata components, either set multiple --metadata <name> flags or a single --metadata flag with
  multiple names separated by spaces. Enclose names that contain spaces in one set of double quotes. The same syntax
  applies to --manifest and --source-dir.

ALIASES
  $ sf force mdapi convert

EXAMPLES
  Convert metadata formatted files in the specified directory into source formatted files; writes converted files to
  your default package directory:

    $ sf project convert mdapi --root-dir path/to/metadata

  Similar to previous example, but writes converted files to the specified output directory:

    $ sf project convert mdapi --root-dir path/to/metadata --output-dir path/to/outputdir

FLAG DESCRIPTIONS
  -p, --metadata-dir=<value>...  Root of directory or zip file of metadata formatted files to convert.

    The supplied paths can be to a single file (in which case the operation is applied to only one file) or to a folder
    (in which case the operation is applied to all metadata types in the directory and its sub-directories).

    If you specify this flag, don’t specify --manifest or --metadata. If the comma-separated list you’re supplying
    contains spaces, enclose the entire comma-separated list in one set of double quotes.

  -x, --manifest=<value>  File path to manifest (package.xml) of metadata types to convert.

    If you specify this parameter, don’t specify --metadata or --source-dir.
```

_See code: [src/commands/project/convert/mdapi.ts](https://github.com/salesforcecli/plugin-deploy-retrieve/blob/3.5.6/src/commands/project/convert/mdapi.ts)_

## `sf project convert source`

Convert source-formatted files into metadata that you can deploy using Metadata API.

```
USAGE
  $ sf project convert source [--json] [--flags-dir <value>] [--api-version <value>] [-r <value>] [-d <value>] [-n <value>]
    [-p <value> | -x <value> | -m <value>]

FLAGS
  -d, --output-dir=<value>     [default: metadataPackage_1712599301853] Output directory to store the Metadata
                               API–formatted files in.
  -m, --metadata=<value>...    Metadata component names to convert.
  -n, --package-name=<value>   Name of the package to associate with the metadata-formatted files.
  -p, --source-dir=<value>...  Paths to the local source files to convert.
  -r, --root-dir=<value>       Source directory other than the default package to convert.
  -x, --manifest=<value>       Path to the manifest (package.xml) file that specifies the metadata types to convert.
      --api-version=<value>    API Version to use in the generated project's manifest. By default, will use the version
                               from sfdx-project.json

GLOBAL FLAGS
  --flags-dir=<value>  Import flag values from a directory.
  --json               Format output as json.

DESCRIPTION
  Convert source-formatted files into metadata that you can deploy using Metadata API.

  To convert source-formatted files into the metadata format, so that you can deploy them using Metadata API, run this
  command. Then deploy the metadata using "sf project deploy".

  To convert Metadata API–formatted files into the source format, run "sf project convert mdapi".

  To specify a package name that includes spaces, enclose the name in single quotes.

  To convert multiple components, either set multiple --metadata <name> flags or a single --metadata flag with multiple
  names separated by spaces. Enclose names that contain spaces in one set of double quotes. The same syntax applies to
  --manifest and --source-dir.

ALIASES
  $ sf force source convert

EXAMPLES
  Convert source-formatted files in the specified directory into metadata-formatted files; writes converted files into
  a new directory:

    $ sf project convert source --root-dir path/to/source

  Similar to previous example, but writes converted files to the specified output directory and associates the files
  with the specified package:

    $ sf project convert source --root-dir path/to/source --output-dir path/to/outputdir --package-name 'My Package'

FLAG DESCRIPTIONS
  -p, --source-dir=<value>...  Paths to the local source files to convert.

    The supplied paths can be to a single file (in which case the operation is applied to only one file) or to a folder
    (in which case the operation is applied to all metadata types in the directory and its sub-directories).

    If you specify this parameter, don’t specify --manifest or --metadata.

  -x, --manifest=<value>  Path to the manifest (package.xml) file that specifies the metadata types to convert.

    If you specify this parameter, don’t specify --metadata or --source-dir.

  --api-version=<value>

    API Version to use in the generated project's manifest. By default, will use the version from sfdx-project.json

    Override the api version used for api requests made by this command
```

_See code: [src/commands/project/convert/source.ts](https://github.com/salesforcecli/plugin-deploy-retrieve/blob/3.5.6/src/commands/project/convert/source.ts)_

## `sf project delete source`

Delete source from your project and from a non-source-tracked org.

```
USAGE
  $ sf project delete source -o <value> [--json] [--flags-dir <value>] [--api-version <value>] [-w <value>] [--tests
    <value>] [-l NoTestRun|RunSpecifiedTests|RunLocalTests|RunAllTestsInOrg] [-r] [-m <value>] [-p <value>] [-f [-t |
    -c]] [--verbose]

FLAGS
  -c, --check-only             Validate delete command but don't delete anything from the org or the local project.
  -f, --force-overwrite        Ignore conflict warnings and overwrite changes to the org.
  -m, --metadata=<value>...    Metadata components to delete.
  -o, --target-org=<value>     (required) Username or alias of the target org. Not required if the `target-org`
                               configuration variable is already set.
  -p, --source-dir=<value>...  Source file paths to delete.
  -r, --no-prompt              Don't prompt for delete confirmation.
  -t, --track-source           If the delete succeeds, update the source tracking information.
  -w, --wait=<value>           Number of minutes to wait for the command to finish.
      --api-version=<value>    Override the api version used for api requests made by this command
      --verbose                Verbose output of the delete result.

TEST FLAGS
  -l, --test-level=<option>  Deployment Apex testing level.
                             <options: NoTestRun|RunSpecifiedTests|RunLocalTests|RunAllTestsInOrg>
      --tests=<value>...     Apex tests to run when --test-level is RunSpecifiedTests.

GLOBAL FLAGS
  --flags-dir=<value>  Import flag values from a directory.
  --json               Format output as json.

DESCRIPTION
  Delete source from your project and from a non-source-tracked org.

  Use this command to delete components from orgs that don’t have source tracking. To remove deleted items from orgs
  that have source tracking enabled, "sf project deploy start".

  When you run this command, both the local source file and the metadata component in the org are deleted.

  To delete multiple metadata components, either set multiple --metadata <name> flags or a single --metadata flag with
  multiple names separated by spaces. Enclose names that contain spaces in one set of double quotes. The same syntax
  applies to --manifest and --source-dir.

ALIASES
  $ sf force source delete

EXAMPLES
  Delete all local Apex source files and all Apex classes from the org with alias "my-scratch":

    $ sf project delete source --metadata ApexClass --target-org my-scratch

  Delete a specific Apex class and a Profile that has a space in it from your default org; don't prompt for
  confirmation:

    $ sf project delete source --metadata ApexClass:MyFabulousApexClass --metadata "Profile: My Profile" --no-prompt

  Run the tests that aren’t in any managed packages as part of the deletion; if the delete succeeds, and the org has
  source-tracking enabled, update the source tracking information:

    $ sf project delete source --metadata ApexClass --test-level RunLocalTests --track-source

  Delete the Apex source files in a directory and the corresponding components from your default org:

    $ sf project delete source --source-dir force-app/main/default/classes

FLAG DESCRIPTIONS
  -c, --check-only  Validate delete command but don't delete anything from the org or the local project.

    IMPORTANT: Where possible, we changed noninclusive terms to align with our company value of Equality. We maintained
    certain terms to avoid any effect on customer implementations.

    Validates the deleted metadata and runs all Apex tests, but prevents the deletion from being saved to the org.

    If you change a field type from Master-Detail to Lookup or vice versa, that change isn’t supported when using the
    --chec-konly parameter to test a deletion (validation). This kind of change isn’t supported for test deletions to
    avoid the risk of data loss or corruption. If a change that isn’t supported for test deletions is included in a
    deletion package, the test deletion fails and issues an error.

    If your deletion package changes a field type from Master-Detail to Lookup or vice versa, you can still validate the
    changes prior to deploying to Production by performing a full deletion to another test Sandbox. A full deletion
    includes a validation of the changes as part of the deletion process.

    Note: A Metadata API deletion that includes Master-Detail relationships deletes all detail records in the Recycle
    Bin in the following cases.

    1. For a deletion with a new Master-Detail field, soft delete (send to the Recycle Bin) all detail records before
    proceeding to delete the Master-Detail field, or the deletion fails. During the deletion, detail records are
    permanently deleted from the Recycle Bin and cannot be recovered.

    2. For a deletion that converts a Lookup field relationship to a Master-Detail relationship, detail records must
    reference a master record or be soft-deleted (sent to the Recycle Bin) for the deletion to succeed. However, a
    successful deletion permanently deletes any detail records in the Recycle Bin.

  -l, --test-level=NoTestRun|RunSpecifiedTests|RunLocalTests|RunAllTestsInOrg  Deployment Apex testing level.

    Valid values are:

    - NoTestRun — No tests are run. This test level applies only to deployments to development environments, such as
    sandbox, Developer Edition, or trial orgs. This test level is the default for development environments.

    - RunSpecifiedTests — Runs only the tests that you specify with the --tests flag. Code coverage requirements differ
    from the default coverage requirements when using this test level. Executed tests must comprise a minimum of 75%
    code coverage for each class and trigger in the deployment package. This coverage is computed for each class and
    trigger individually and is different than the overall coverage percentage.

    - RunLocalTests — All tests in your org are run, except the ones that originate from installed managed and unlocked
    packages. This test level is the default for production deployments that include Apex classes or triggers.

    - RunAllTestsInOrg — All tests in your org are run, including tests of managed packages.

    If you don’t specify a test level, the default behavior depends on the contents of your deployment package and
    target org. For more information, see “Running Tests in a Deployment” in the Metadata API Developer Guide.

  -m, --metadata=<value>...  Metadata components to delete.

    If you specify this parameter, don’t specify --source-dir.

  -p, --source-dir=<value>...  Source file paths to delete.

    The supplied paths can be a single file (in which case the operation is applied to only one file) or a folder (in
    which case the operation is applied to all metadata types in the directory and its sub-directories).

    If you specify this parameter, don’t specify --metadata.

  -w, --wait=<value>  Number of minutes to wait for the command to finish.

    If the command continues to run after the wait period, the CLI returns control of the terminal window to you.

  --tests=<value>...  Apex tests to run when --test-level is RunSpecifiedTests.

    If a test name contains a space, enclose it in double quotes.
    For multiple test names, use one of the following formats:

    - Repeat the flag for multiple test names: --tests Test1 --tests Test2 --tests "Test With Space"
    - Separate the test names with spaces: --tests Test1 Test2 "Test With Space"
```

_See code: [src/commands/project/delete/source.ts](https://github.com/salesforcecli/plugin-deploy-retrieve/blob/3.5.6/src/commands/project/delete/source.ts)_

## `sf project delete tracking`

Delete all local source tracking information.

```
USAGE
  $ sf project delete tracking -o <value> [--json] [--flags-dir <value>] [--api-version <value>] [-p]

FLAGS
  -o, --target-org=<value>   (required) Username or alias of the target org. Not required if the `target-org`
                             configuration variable is already set.
  -p, --no-prompt            Don't prompt for source tracking override confirmation.
      --api-version=<value>  Override the api version used for api requests made by this command

GLOBAL FLAGS
  --flags-dir=<value>  Import flag values from a directory.
  --json               Format output as json.

DESCRIPTION
  Delete all local source tracking information.

  WARNING: This command deletes or overwrites all existing source tracking files. Use with extreme caution.

  Deletes all local source tracking information. When you next run 'project deploy preview', Salesforce CLI displays all
  local and remote files as changed, and any files with the same name are listed as conflicts.

ALIASES
  $ sf force source tracking clear

EXAMPLES
  Delete local source tracking for the org with alias "my-scratch":

    $ sf project delete tracking --target-org my-scratch
```

_See code: [src/commands/project/delete/tracking.ts](https://github.com/salesforcecli/plugin-deploy-retrieve/blob/3.5.6/src/commands/project/delete/tracking.ts)_

## `sf project deploy cancel`

Cancel a deploy operation.

```
USAGE
  $ sf project deploy cancel [--json] [--flags-dir <value>] [-o <value>] [--async | -w <value>] [-i <value>] [-r]

FLAGS
  -i, --job-id=<value>      Job ID of the deploy operation you want to cancel.
  -o, --target-org=<value>  Login username or alias for the target org.
  -r, --use-most-recent     Use the job ID of the most recent deploy operation.
  -w, --wait=<minutes>      Number of minutes to wait for the command to complete and display results.
      --async               Run the command asynchronously.

GLOBAL FLAGS
  --flags-dir=<value>  Import flag values from a directory.
  --json               Format output as json.

DESCRIPTION
  Cancel a deploy operation.

  Use this command to cancel a deploy operation that hasn't yet completed in the org. Deploy operations include standard
  deploys, quick deploys, deploy validations, and deploy cancellations.

  Run this command by either passing it a job ID or specifying the --use-most-recent flag to use the job ID of the most
  recent deploy operation.

ALIASES
  $ sf deploy metadata cancel

EXAMPLES
  Cancel a deploy operation using a job ID:

    $ sf project deploy cancel --job-id 0Af0x000017yLUFCA2

  Cancel the most recent deploy operation:

    $ sf project deploy cancel --use-most-recent

FLAG DESCRIPTIONS
  -i, --job-id=<value>  Job ID of the deploy operation you want to cancel.

    These commands return a job ID if they time out or you specified the --async flag:

    - sf project deploy start
    - sf project deploy validate
    - sf project deploy quick
    - sf project deploy cancel

    The job ID is valid for 10 days from when you started the deploy operation.

  -o, --target-org=<value>  Login username or alias for the target org.

    Overrides your default org.

  -r, --use-most-recent  Use the job ID of the most recent deploy operation.

    For performance reasons, this flag uses job IDs for deploy operations that started only in the past 3 days or less.
    If your most recent deploy operations was more than 3 days ago, this flag won't find a job ID.

  -w, --wait=<minutes>  Number of minutes to wait for the command to complete and display results.

    If the command continues to run after the wait period, the CLI returns control of the terminal window to you. To
    resume watching the cancellation, run "sf project deploy resume". To check the status of the cancellation, run "sf
    project deploy report".

  --async  Run the command asynchronously.

    The command immediately returns the control of the terminal to you. This way, you can continue to use the CLI. To
    resume watching the cancellation, run "sf project deploy resume". To check the status of the cancellation, run "sf
    project deploy report".
```

_See code: [src/commands/project/deploy/cancel.ts](https://github.com/salesforcecli/plugin-deploy-retrieve/blob/3.5.6/src/commands/project/deploy/cancel.ts)_

## `sf project deploy preview`

Preview a deployment to see what will deploy to the org, the potential conflicts, and the ignored files.

```
USAGE
  $ sf project deploy preview -o <value> [--json] [--flags-dir <value>] [-c] [-x <value> | -d <value> | -m <value>]
    [--concise]

FLAGS
  -c, --ignore-conflicts       Don't display conflicts in preview of the deployment.
  -d, --source-dir=<value>...  Path to the local source files to preview.
  -m, --metadata=<value>...    Metadata component names to preview.
  -o, --target-org=<value>     (required) Login username or alias for the target org.
  -x, --manifest=<value>       Full file path for manifest (package.xml) of components to preview.
      --concise                Show only the changes that will be deployed; omits files that are forceignored.

GLOBAL FLAGS
  --flags-dir=<value>  Import flag values from a directory.
  --json               Format output as json.

DESCRIPTION
  Preview a deployment to see what will deploy to the org, the potential conflicts, and the ignored files.

  You must run this command from within a project.

  The command outputs a table that describes what will happen if you run the "sf project deploy start" command. The
  table lists the metadata components that will be deployed and deleted. The table also lists the current conflicts
  between files in your local project and components in the org. Finally, the table lists the files that won't be
  deployed because they're included in your .forceignore file.

  If your org allows source tracking, then this command displays potential conflicts between the org and your local
  project. Some orgs, such as production org, never allow source tracking. Source tracking is enabled by default on
  scratch and sandbox orgs; you can disable source tracking when you create the orgs by specifying the --no-track-source
  flag on the "sf org create scratch|sandbox" commands.

  To preview the deployment of multiple metadata components, either set multiple --metadata <name> flags or a single
  --metadata flag with multiple names separated by spaces. Enclose names that contain spaces in one set of double
  quotes. The same syntax applies to --manifest and --source-dir.

ALIASES
  $ sf deploy metadata preview

EXAMPLES
  NOTE: The commands to preview a deployment and actually deploy it use similar flags. We provide a few preview examples here, but see the help for "sf project deploy start" for more examples that you can adapt for previewing.

  Preview the deployment of source files in a directory, such as force-app, to your default org:

    $ sf project deploy preview  --source-dir force-app

  Preview the deployment of all Apex classes to an org with alias "my-scratch":

    $ sf project deploy preview --metadata ApexClass --target-org my-scratch

  Preview deployment of a specific Apex class:

    $ sf project deploy preview --metadata ApexClass:MyApexClass

  Preview deployment of all components listed in a manifest:

    $ sf project deploy preview --manifest path/to/package.xml

FLAG DESCRIPTIONS
  -c, --ignore-conflicts  Don't display conflicts in preview of the deployment.

    This flag applies only to orgs that allow source tracking. It has no effect on orgs that don't allow it, such as
    production orgs.

  -d, --source-dir=<value>...  Path to the local source files to preview.

    The supplied path can be to a single file (in which case the operation is applied to only one file) or to a folder
    (in which case the operation is applied to all metadata types in the directory and its subdirectories).

    If you specify this flag, don’t specify --metadata or --manifest.

  -o, --target-org=<value>  Login username or alias for the target org.

    Overrides your default org.

  -x, --manifest=<value>  Full file path for manifest (package.xml) of components to preview.

    All child components are included. If you specify this flag, don’t specify --metadata or --source-dir.
```

_See code: [src/commands/project/deploy/preview.ts](https://github.com/salesforcecli/plugin-deploy-retrieve/blob/3.5.6/src/commands/project/deploy/preview.ts)_

## `sf project deploy quick`

Quickly deploy a validated deployment to an org.

```
USAGE
  $ sf project deploy quick [--json] [--flags-dir <value>] [--async | -w <value>] [--concise | --verbose] [-i <value>] [-o
    <value>] [-r] [-a <value>]

FLAGS
  -a, --api-version=<value>  Target API version for the deploy.
  -i, --job-id=<value>       Job ID of the deployment you want to quick deploy.
  -o, --target-org=<value>   Login username or alias for the target org.
  -r, --use-most-recent      Use the job ID of the most recently validated deployment.
  -w, --wait=<minutes>       [default: 33 minutes] Number of minutes to wait for the command to complete and display
                             results.
      --async                Run the command asynchronously.
      --concise              Show concise output of the deploy result.
      --verbose              Show verbose output of the deploy result.

GLOBAL FLAGS
  --flags-dir=<value>  Import flag values from a directory.
  --json               Format output as json.

DESCRIPTION
  Quickly deploy a validated deployment to an org.

  Before you run this command, first create a validated deployment with the "sf project deploy validate" command, which
  returns a job ID. Validated deployments haven't been deployed to the org yet; you deploy them with this command.
  Either pass the job ID to this command or use the --use-most-recent flag to use the job ID of the most recently
  validated deployment. For the quick deploy to succeed, the associated validated deployment must also have succeeded.

  Executing this quick deploy command takes less time than a standard deploy because it skips running Apex tests. These
  tests were previously run as part of the validation. Validating first and then running a quick deploy is useful if the
  deployment to your production org take several hours and you don’t want to risk a failed deploy.

  This command doesn't support source-tracking. The source you deploy overwrites the corresponding metadata in your org.
  This command doesn’t attempt to merge your source with the versions in your org.

  Note: Don't use this command on sandboxes; the command is intended to be used on production orgs.  By default,
  sandboxes don't run tests during a deploy. Use `sf project deploy start` instead.

ALIASES
  $ sf deploy metadata quick

EXAMPLES
  Run a quick deploy to your default org using a job ID:

    $ sf project deploy quick --job-id 0Af0x000017yLUFCA2

  Asynchronously run a quick deploy of the most recently validated deployment to an org with alias "my-prod-org":

    $ sf project deploy quick --async --use-most-recent --target-org my-prod-org

FLAG DESCRIPTIONS
  -a, --api-version=<value>  Target API version for the deploy.

    Use this flag to override the default API version with the API version of your package.xml file. The default API
    version is the latest version supported by the CLI.

  -i, --job-id=<value>  Job ID of the deployment you want to quick deploy.

    The job ID is valid for 10 days from when you started the validation.

  -o, --target-org=<value>  Login username or alias for the target org.

    Overrides your default org.

  -r, --use-most-recent  Use the job ID of the most recently validated deployment.

    For performance reasons, this flag uses only job IDs that were validated in the past 3 days or less. If your most
    recent deployment validation was more than 3 days ago, this flag won't find a job ID.

  -w, --wait=<minutes>  Number of minutes to wait for the command to complete and display results.

    If the command continues to run after the wait period, the CLI returns control of the terminal window to you. To
    resume watching the deploy, run "sf project deploy resume". To check the status of the deploy, run "sf project
    deploy report".

  --async  Run the command asynchronously.

    The command immediately returns the control of the terminal to you. This way, you can continue to use the CLI. To
    resume watching the deploy, run "sf project deploy resume". To check the status of the deploy, run "sf project
    deploy report".
```

_See code: [src/commands/project/deploy/quick.ts](https://github.com/salesforcecli/plugin-deploy-retrieve/blob/3.5.6/src/commands/project/deploy/quick.ts)_

## `sf project deploy report`

Check or poll for the status of a deploy operation.

```
USAGE
  $ sf project deploy report [--json] [--flags-dir <value>] [-o <value>] [-i <value>] [-r] [--coverage-formatters
    clover|cobertura|html-spa|html|json|json-summary|lcovonly|none|teamcity|text|text-summary] [--junit] [--results-dir
    <value>] [-w <value>]

FLAGS
  -i, --job-id=<value>      Job ID of the deploy operation you want to check the status of.
  -o, --target-org=<value>  Login username or alias for the target org.
  -r, --use-most-recent     Use the job ID of the most recent deploy operation.
  -w, --wait=<minutes>      Number of minutes to wait for command to complete and display results.

TEST FLAGS
  --coverage-formatters=<option>...  Format of the code coverage results.
                                     <options: clover|cobertura|html-spa|html|json|json-summary|lcovonly|none|teamcity|t
                                     ext|text-summary>
  --junit                            Output JUnit test results.
  --results-dir=<value>              Output directory for code coverage and JUnit results; defaults to the deploy ID.

GLOBAL FLAGS
  --flags-dir=<value>  Import flag values from a directory.
  --json               Format output as json.

DESCRIPTION
  Check or poll for the status of a deploy operation.

  Deploy operations include standard deploys, quick deploys, deploy validations, and deploy cancellations.

  Run this command by either passing it a job ID or specifying the --use-most-recent flag to use the job ID of the most
  recent deploy operation. If you specify the --wait flag, the command polls for the status every second until the
  timeout of --wait minutes. If you don't specify the --wait flag, the command simply checks and displays the status of
  the deploy; the command doesn't poll for the status.

  You typically don't specify the --target-org flag because the cached job already references the org to which you
  deployed. But if you run this command on a computer different than the one from which you deployed, then you must
  specify the --target-org and it must point to the same org.

  This command doesn't update source tracking information.

ALIASES
  $ sf deploy metadata report

EXAMPLES
  Check the status using a job ID:

    $ sf project deploy report --job-id 0Af0x000017yLUFCA2

  Check the status of the most recent deploy operation:

    $ sf project deploy report --use-most-recent

  Poll for the status using a job ID and target org:

    $ sf project deploy report --job-id 0Af0x000017yLUFCA2 --target-org me@my.org --wait 30

FLAG DESCRIPTIONS
  -i, --job-id=<value>  Job ID of the deploy operation you want to check the status of.

    These commands return a job ID if they time out or you specified the --async flag:

    - sf project deploy start
    - sf project deploy validate
    - sf project deploy quick
    - sf project deploy cancel

    The job ID is valid for 10 days from when you started the deploy operation.

  -o, --target-org=<value>  Login username or alias for the target org.

    Overrides your default org.

  -r, --use-most-recent  Use the job ID of the most recent deploy operation.

    For performance reasons, this flag uses job IDs for deploy operations that started only in the past 3 days or less.
    If your most recent operation was more than 3 days ago, this flag won't find a job ID.

  -w, --wait=<minutes>  Number of minutes to wait for command to complete and display results.

    If the command continues to run after the wait period, the CLI returns control of the terminal window to you and
    returns the job ID. To resume the deployment, run "sf project deploy resume". To check the status of the deployment,
    run "sf project deploy report".

  --coverage-formatters=clover|cobertura|html-spa|html|json|json-summary|lcovonly|none|teamcity|text|text-summary...

    Format of the code coverage results.

    For multiple formatters, repeat the flag for each formatter.
    --coverage-formatters lcov --coverage-formatters clover
```

_See code: [src/commands/project/deploy/report.ts](https://github.com/salesforcecli/plugin-deploy-retrieve/blob/3.5.6/src/commands/project/deploy/report.ts)_

## `sf project deploy resume`

Resume watching a deploy operation and update source tracking when the deploy completes.

```
USAGE
  $ sf project deploy resume [--json] [--flags-dir <value>] [--concise | --verbose] [-i <value>] [-r] [-w <value>]
    [--coverage-formatters clover|cobertura|html-spa|html|json|json-summary|lcovonly|none|teamcity|text|text-summary]
    [--junit] [--results-dir <value>]

FLAGS
  -i, --job-id=<value>   Job ID of the deploy operation you want to resume.
  -r, --use-most-recent  Use the job ID of the most recent deploy operation.
  -w, --wait=<minutes>   Number of minutes to wait for the command to complete and display results.
      --concise          Show concise output of the deploy operation result.
      --verbose          Show verbose output of the deploy operation result.

TEST FLAGS
  --coverage-formatters=<option>...  Format of the code coverage results.
                                     <options: clover|cobertura|html-spa|html|json|json-summary|lcovonly|none|teamcity|t
                                     ext|text-summary>
  --junit                            Output JUnit test results.
  --results-dir=<value>              Output directory for code coverage and JUnit results; defaults to the deploy ID.

GLOBAL FLAGS
  --flags-dir=<value>  Import flag values from a directory.
  --json               Format output as json.

DESCRIPTION
  Resume watching a deploy operation and update source tracking when the deploy completes.

  Use this command to resume watching a deploy operation if the original command times out or you specified the --async
  flag. Deploy operations include standard deploys, quick deploys, deploy validations, and deploy cancellations. This
  command doesn't resume the original operation itself, because the operation always continues after you've started it,
  regardless of whether you're watching it or not. When the deploy completes, source tracking information is updated as
  needed.

  Run this command by either passing it a job ID or specifying the --use-most-recent flag to use the job ID of the most
  recent deploy operation.

ALIASES
  $ sf deploy metadata resume

EXAMPLES
  Resume watching a deploy operation using a job ID:

    $ sf project deploy resume --job-id 0Af0x000017yLUFCA2

  Resume watching the most recent deploy operation:

    $ sf project deploy resume --use-most-recent

FLAG DESCRIPTIONS
  -i, --job-id=<value>  Job ID of the deploy operation you want to resume.

    These commands return a job ID if they time out or you specified the --async flag:

    - sf project deploy start
    - sf project deploy validate
    - sf project deploy quick
    - sf project deploy cancel

    The job ID is valid for 10 days from when you started the deploy operation.

  -r, --use-most-recent  Use the job ID of the most recent deploy operation.

    For performance reasons, this flag uses job IDs for deploy operations that started only in the past 3 days or less.
    If your most recent operation was more than 3 days ago, this flag won't find a job ID.

  -w, --wait=<minutes>  Number of minutes to wait for the command to complete and display results.

    If the command continues to run after the wait period, the CLI returns control of the terminal window to you. To
    resume watching the deploy operation, run this command again. To check the status of the deploy operation, run "sf
    project deploy report".

  --coverage-formatters=clover|cobertura|html-spa|html|json|json-summary|lcovonly|none|teamcity|text|text-summary...

    Format of the code coverage results.

    For multiple formatters, repeat the flag for each formatter.
    --coverage-formatters lcov --coverage-formatters clover
```

_See code: [src/commands/project/deploy/resume.ts](https://github.com/salesforcecli/plugin-deploy-retrieve/blob/3.5.6/src/commands/project/deploy/resume.ts)_

## `sf project deploy start`

Deploy metadata to an org from your local project.

```
USAGE
  $ sf project deploy start -o <value> [--json] [--flags-dir <value>] [-a <value>] [--async | -w <value>] [--concise |
    --verbose] [--dry-run] [-c] [-r] [-g] [--single-package ] [-t <value>] [-l
    NoTestRun|RunSpecifiedTests|RunLocalTests|RunAllTestsInOrg] [--purge-on-delete [-x <value> | -d <value> | -m <value>
    | --metadata-dir <value>]] [--pre-destructive-changes <value> ] [--post-destructive-changes <value> ]
    [--coverage-formatters clover|cobertura|html-spa|html|json|json-summary|lcovonly|none|teamcity|text|text-summary]
    [--junit] [--results-dir <value>]

FLAGS
  -a, --api-version=<value>  Target API version for the deploy.
  -c, --ignore-conflicts     Ignore conflicts and deploy local files, even if they overwrite changes in the org.
  -g, --ignore-warnings      Ignore warnings and allow a deployment to complete successfully.
  -o, --target-org=<value>   (required) Login username or alias for the target org.
  -r, --ignore-errors        Ignore any errors and don’t roll back deployment.
  -w, --wait=<minutes>       Number of minutes to wait for command to complete and display results.
      --async                Run the command asynchronously.
      --concise              Show concise output of the deploy result.
      --dry-run              Validate deploy and run Apex tests but don’t save to the org.
      --verbose              Show verbose output of the deploy result.

SOURCE FORMAT FLAGS
  -d, --source-dir=<value>...  Path to the local source files to deploy.
  -m, --metadata=<value>...    Metadata component names to deploy. Wildcards (`*` ) supported as long as you use quotes,
                               such as `ApexClass:MyClass*`.
  -x, --manifest=<value>       Full file path for manifest (package.xml) of components to deploy.

TEST FLAGS
  -l, --test-level=<option>              Deployment Apex testing level.
                                         <options: NoTestRun|RunSpecifiedTests|RunLocalTests|RunAllTestsInOrg>
  -t, --tests=<value>...                 Apex tests to run when --test-level is RunSpecifiedTests.
      --coverage-formatters=<option>...  Format of the code coverage results.
                                         <options: clover|cobertura|html-spa|html|json|json-summary|lcovonly|none|teamci
                                         ty|text|text-summary>
      --junit                            Output JUnit test results.
      --results-dir=<value>              Output directory for code coverage and JUnit results; defaults to the deploy
                                         ID.

GLOBAL FLAGS
  --flags-dir=<value>  Import flag values from a directory.
  --json               Format output as json.

METADATA API FORMAT FLAGS
  --metadata-dir=<value>  Root of directory or zip file of metadata formatted files to deploy.
  --single-package        Indicates that the metadata zip file points to a directory structure for a single package.

DELETE FLAGS
  --post-destructive-changes=<value>  File path for a manifest (destructiveChangesPost.xml) of components to delete
                                      after the deploy.
  --pre-destructive-changes=<value>   File path for a manifest (destructiveChangesPre.xml) of components to delete
                                      before the deploy.
  --purge-on-delete                   Specify that deleted components in the destructive changes manifest file are
                                      immediately eligible for deletion rather than being stored in the Recycle Bin.

DESCRIPTION
  Deploy metadata to an org from your local project.

  You must run this command from within a project.

  Metadata components are deployed in source format by default. Deploy them in metadata format by specifying the
  --metadata-dir flag, which specifies the root directory or ZIP file that contains the metadata formatted files you
  want to deploy.

  If your org allows source tracking, then this command tracks the changes in your source. Some orgs, such as production
  orgs, never allow source tracking. Source tracking is enabled by default on scratch and sandbox orgs; you can disable
  source tracking when you create the orgs by specifying the --no-track-source flag on the "sf org create
  scratch|sandbox" commands.

  To deploy multiple metadata components, either set multiple --metadata <name> flags or a single --metadata flag with
  multiple names separated by spaces. Enclose names that contain spaces in one set of double quotes. The same syntax
  applies to --manifest and --source-dir.

ALIASES
  $ sf deploy metadata

EXAMPLES
  Deploy local changes not in the org; uses your default org:

    $ sf project deploy start

  Deploy all source files in the "force-app" directory to an org with alias "my-scratch"; show only concise output, in
  other words don't print a list of all the source that was deployed:

    $ sf project deploy start  --source-dir force-app --target-org my-scratch --concise

  Deploy all the Apex classes and custom objects that are in the "force-app" directory. The list views, layouts, etc,
  that are associated with the custom objects are also deployed. Both examples are equivalent:

    $ sf project deploy start --source-dir force-app/main/default/classes force-app/main/default/objects
    $ sf project deploy start --source-dir force-app/main/default/classes --source-dir \
      force-app/main/default/objects

  Deploy all Apex classes that are in all package directories defined in the "sfdx-project.json" file:

    $ sf project deploy start --metadata ApexClass

  Deploy a specific Apex class; ignore any conflicts between the local project and org (be careful with this flag,
  because it will overwrite the Apex class in the org if there are conflicts!):

    $ sf project deploy start --metadata ApexClass:MyApexClass --ignore-conflicts

  Deploy specific Apex classes that match a pattern; in this example, deploy Apex classes whose names contain the
  string "MyApex". Also ignore any deployment warnings (again, be careful with this flag! You typically want to see
  the warnings):

    $ sf project deploy start --metadata 'ApexClass:MyApex*' --ignore-warnings

  Deploy all custom objects and Apex classes found in all defined package directories (both examples are equivalent):

    $ sf project deploy start --metadata CustomObject ApexClass
    $ sf project deploy start --metadata CustomObject --metadata ApexClass

  Deploy all Apex classes and a profile that has a space in its name:

    $ sf project deploy start --metadata ApexClass --metadata "Profile:My Profile"

  Deploy all components listed in a manifest:

    $ sf project deploy start --manifest path/to/package.xml

  Run the tests that aren’t in any managed packages as part of a deployment:

    $ sf project deploy start --metadata ApexClass --test-level RunLocalTests

FLAG DESCRIPTIONS
  -a, --api-version=<value>  Target API version for the deploy.

    Use this flag to override the default API version with the API version of your package.xml file. The default API
    version is the latest version supported by the CLI.

  -c, --ignore-conflicts  Ignore conflicts and deploy local files, even if they overwrite changes in the org.

    This flag applies only to orgs that allow source tracking. It has no effect on orgs that don't allow it, such as
    production orgs.

  -d, --source-dir=<value>...  Path to the local source files to deploy.

    The supplied path can be to a single file (in which case the operation is applied to only one file) or to a folder
    (in which case the operation is applied to all metadata types in the directory and its subdirectories).

    If you specify this flag, don’t specify --metadata or --manifest.

  -g, --ignore-warnings  Ignore warnings and allow a deployment to complete successfully.

    If you specify this flag, and a warning occurs, the success status of the deployment is set to true. If you don't
    specify this flag, and a warning occurs, then the success status is set to false, and the warning is treated like an
    error.

    This flag is useful in a CI environment and your deployment includes destructive changes; if you try to delete a
    component that doesn't exist in the org, you get a warning. In this case, to ensure that the command returns a
    success value of true, specify this flag.

  -l, --test-level=NoTestRun|RunSpecifiedTests|RunLocalTests|RunAllTestsInOrg  Deployment Apex testing level.

    Valid values are:

    - NoTestRun — No tests are run. This test level applies only to deployments to development environments, such as
    sandbox, Developer Edition, or trial orgs. This test level is the default for development environments.

    - RunSpecifiedTests — Runs only the tests that you specify with the --tests flag. Code coverage requirements differ
    from the default coverage requirements when using this test level. Executed tests must comprise a minimum of 75%
    code coverage for each class and trigger in the deployment package. This coverage is computed for each class and
    trigger individually and is different than the overall coverage percentage.

    - RunLocalTests — All tests in your org are run, except the ones that originate from installed managed and unlocked
    packages. This test level is the default for production deployments that include Apex classes or triggers.

    - RunAllTestsInOrg — All tests in your org are run, including tests of managed packages.

    If you don’t specify a test level, the default behavior depends on the contents of your deployment package and
    target org. For more information, see [Running Tests in a
    Deployment](https://developer.salesforce.com/docs/atlas.en-us.api_meta.meta/api_meta/meta_deploy_running_tests.htm)
    in the "Metadata API Developer Guide".

  -o, --target-org=<value>  Login username or alias for the target org.

    Overrides your default org.

  -r, --ignore-errors  Ignore any errors and don’t roll back deployment.

    Never use this flag when deploying to a production org. If you specify it, components without errors are deployed
    and components with errors are skipped, and could result in an inconsistent production org.

  -t, --tests=<value>...  Apex tests to run when --test-level is RunSpecifiedTests.

    If a test name contains a space, enclose it in double quotes.
    For multiple test names, use one of the following formats:

    - Repeat the flag for multiple test names: --tests Test1 --tests Test2 --tests "Test With Space"
    - Separate the test names with spaces: --tests Test1 Test2 "Test With Space"

  -w, --wait=<minutes>  Number of minutes to wait for command to complete and display results.

    If the command continues to run after the wait period, the CLI returns control of the terminal window to you and
    returns the job ID. To resume the deployment, run "sf project deploy resume". To check the status of the deployment,
    run "sf project deploy report".

  -x, --manifest=<value>  Full file path for manifest (package.xml) of components to deploy.

    All child components are included. If you specify this flag, don’t specify --metadata or --source-dir.

  --async  Run the command asynchronously.

    The command immediately returns the job ID and control of the terminal to you. This way, you can continue to use the
    CLI. To resume the deployment, run "sf project deploy resume". To check the status of the deployment, run "sf
    project deploy report".

  --coverage-formatters=clover|cobertura|html-spa|html|json|json-summary|lcovonly|none|teamcity|text|text-summary...

    Format of the code coverage results.

    For multiple formatters, repeat the flag for each formatter.
    --coverage-formatters lcov --coverage-formatters clover
```

_See code: [src/commands/project/deploy/start.ts](https://github.com/salesforcecli/plugin-deploy-retrieve/blob/3.5.6/src/commands/project/deploy/start.ts)_

## `sf project deploy validate`

Validate a metadata deployment without actually executing it.

```
USAGE
  $ sf project deploy validate -o <value> [--json] [--flags-dir <value>] [-a <value>] [--async] [--concise | --verbose] [-m
    <value>] [-d <value>] [--single-package --metadata-dir <value>] [-t <value>] [-l
    RunAllTestsInOrg|RunLocalTests|RunSpecifiedTests] [-w <value>] [-g] [--coverage-formatters
    clover|cobertura|html-spa|html|json|json-summary|lcovonly|none|teamcity|text|text-summary] [--junit] [--results-dir
    <value>] [--purge-on-delete -x <value>] [--pre-destructive-changes <value> ] [--post-destructive-changes <value> ]

FLAGS
  -a, --api-version=<value>  Target API version for the validation.
  -g, --ignore-warnings      Ignore warnings and allow a deployment to complete successfully.
  -o, --target-org=<value>   (required) Login username or alias for the target org.
  -w, --wait=<minutes>       Number of minutes to wait for the command to complete and display results.
      --async                Run the command asynchronously.
      --concise              Show concise output of the validation result.
      --verbose              Show verbose output of the validation result.

SOURCE FORMAT FLAGS
  -d, --source-dir=<value>...  Path to the local source files to validate for deployment.
  -m, --metadata=<value>...    Metadata component names to validate for deployment.
  -x, --manifest=<value>       Full file path for manifest (package.xml) of components to validate for deployment.

TEST FLAGS
  -l, --test-level=<option>              [default: RunLocalTests] Deployment Apex testing level.
                                         <options: RunAllTestsInOrg|RunLocalTests|RunSpecifiedTests>
  -t, --tests=<value>...                 Apex tests to run when --test-level is RunSpecifiedTests.
      --coverage-formatters=<option>...  Format of the code coverage results.
                                         <options: clover|cobertura|html-spa|html|json|json-summary|lcovonly|none|teamci
                                         ty|text|text-summary>
      --junit                            Output JUnit test results.
      --results-dir=<value>              Output directory for code coverage and JUnit results; defaults to the deploy
                                         ID.

GLOBAL FLAGS
  --flags-dir=<value>  Import flag values from a directory.
  --json               Format output as json.

METADATA API FORMAT FLAGS
  --metadata-dir=<value>  Root of directory or zip file of metadata formatted files to deploy.
  --single-package        Indicates that the metadata zip file points to a directory structure for a single package.

DELETE FLAGS
  --post-destructive-changes=<value>  File path for a manifest (destructiveChangesPost.xml) of components to delete
                                      after the deploy.
  --pre-destructive-changes=<value>   File path for a manifest (destructiveChangesPre.xml) of components to delete
                                      before the deploy
  --purge-on-delete                   Specify that deleted components in the destructive changes manifest file are
                                      immediately eligible for deletion rather than being stored in the Recycle Bin.

DESCRIPTION
  Validate a metadata deployment without actually executing it.

  Use this command to verify whether a deployment will succeed without actually deploying the metadata to your org. This
  command is similar to "sf project deploy start", except you're required to run Apex tests, and the command returns a
  job ID rather than executing the deployment. If the validation succeeds, then you pass this job ID to the "sf project
  deploy quick" command to actually deploy the metadata. This quick deploy takes less time because it skips running Apex
  tests. The job ID is valid for 10 days from when you started the validation. Validating first is useful if the
  deployment to your production org take several hours and you don’t want to risk a failed deploy.

  You must run this command from within a project.

  This command doesn't support source-tracking. When you quick deploy with the resulting job ID, the source you deploy
  overwrites the corresponding metadata in your org.

  To validate the deployment of multiple metadata components, either set multiple --metadata <name> flags or a single
  --metadata flag with multiple names separated by spaces. Enclose names that contain spaces in one set of double
  quotes. The same syntax applies to --manifest and --source-dir.

  Note: Don't use this command on sandboxes; the command is intended to be used on production orgs. By default,
  sandboxes don't run tests during a deploy.  If you want to validate a deployment with tests on a sandbox, use "sf
  project deploy start --dry-run --test-level RunLocalTests" instead.

ALIASES
  $ sf deploy metadata validate

EXAMPLES
  NOTE: These examples focus on validating large deployments. See the help for "sf project deploy start" for examples of deploying smaller sets of metadata which you can also use to validate.

  Validate the deployment of all source files in the "force-app" directory to the default org:

    $ sf project deploy validate --source-dir force-app

  Validate the deployment of all source files in two directories: "force-app" and "force-app-utils":

    $ sf project deploy validate --source-dir force-app --source-dir force-app-utils

  Asynchronously validate the deployment and run all tests in the org with alias "my-prod-org"; command immediately
  returns the job ID:

    $ sf project deploy validate --source-dir force-app --async --test-level RunAllTestsInOrg --target-org \
      my-prod-org

  Validate the deployment of all components listed in a manifest:

    $ sf project deploy validate --manifest path/to/package.xml

FLAG DESCRIPTIONS
  -a, --api-version=<value>  Target API version for the validation.

    Use this flag to override the default API version with the API version of your package.xml file. The default API
    version is the latest version supported by the CLI.

  -d, --source-dir=<value>...  Path to the local source files to validate for deployment.

    The supplied path can be to a single file (in which case the operation is applied to only one file) or to a folder
    (in which case the operation is applied to all metadata types in the directory and its subdirectories).

    If you specify this flag, don’t specify --metadata or --manifest.

  -g, --ignore-warnings  Ignore warnings and allow a deployment to complete successfully.

    If you specify this flag, and a warning occurs, the success status of the deployment is set to true. If you don't
    specify this flag, and a warning occurs, then the success status is set to false, and the warning is treated like an
    error.

    This flag is useful in a CI environment and your deployment includes destructive changes; if you try to delete a
    component that doesn't exist in the org, you get a warning. In this case, to ensure that the command returns a
    success value of true, specify this flag.

  -l, --test-level=RunAllTestsInOrg|RunLocalTests|RunSpecifiedTests  Deployment Apex testing level.

    Valid values are:

    - RunSpecifiedTests — Runs only the tests that you specify with the --tests flag. Code coverage requirements differ
    from the default coverage requirements when using this test level. Executed tests must comprise a minimum of 75%
    code coverage for each class and trigger in the deployment package. This coverage is computed for each class and
    trigger individually and is different than the overall coverage percentage.

    - RunLocalTests — All tests in your org are run, except the ones that originate from installed managed and unlocked
    packages. This test level is the default.

    - RunAllTestsInOrg — All tests in your org are run, including tests of managed packages.

  -o, --target-org=<value>  Login username or alias for the target org.

    Overrides your default org.

  -t, --tests=<value>...  Apex tests to run when --test-level is RunSpecifiedTests.

    If a test name contains a space, enclose it in double quotes.
    For multiple test names, use one of the following formats:

    - Repeat the flag for multiple test names: --tests Test1 --tests Test2 --tests "Test With Space"
    - Separate the test names with spaces: --tests Test1 Test2 "Test With Space"

  -w, --wait=<minutes>  Number of minutes to wait for the command to complete and display results.

    If the command continues to run after the wait period, the CLI returns control of the terminal window to you and
    returns the job ID. To resume watching the validation, run "sf project deploy resume". To check the status of the
    validation, run "sf project deploy report".

  -x, --manifest=<value>  Full file path for manifest (package.xml) of components to validate for deployment.

    All child components are included. If you specify this flag, don’t specify --metadata or --source-dir.

  --async  Run the command asynchronously.

    The command immediately returns the job ID and control of the terminal to you. This way, you can continue to use the
    CLI. To resume watching the validation, run "sf project deploy resume". To check the status of the validation, run
    "sf project deploy report".

  --coverage-formatters=clover|cobertura|html-spa|html|json|json-summary|lcovonly|none|teamcity|text|text-summary...

    Format of the code coverage results.

    For multiple formatters, repeat the flag for each formatter.
    --coverage-formatters lcov --coverage-formatters clover
```

_See code: [src/commands/project/deploy/validate.ts](https://github.com/salesforcecli/plugin-deploy-retrieve/blob/3.5.6/src/commands/project/deploy/validate.ts)_

## `sf project generate manifest`

Create a project manifest that lists the metadata components you want to deploy or retrieve.

```
USAGE
  $ sf project generate manifest [--json] [--flags-dir <value>] [--api-version <value>] [-m <value>] [-p <value>] [-n <value> |
    -t pre|post|destroy|package] [-c managed|unlocked --from-org <value>] [-d <value>]

FLAGS
  -c, --include-packages=<option>...  Package types (managed, unlocked) whose metadata is included in the manifest; by
                                      default, metadata in packages is ignored.
                                      <options: managed|unlocked>
  -d, --output-dir=<value>            Directory to save the created manifest.
  -m, --metadata=<value>...           Names of metadata components to include in the manifest.
  -n, --name=<value>                  Name of a custom manifest file to create.
  -p, --source-dir=<value>...         Paths to the local source files to include in the manifest.
  -t, --type=<option>                 Type of manifest to create; the type determines the name of the created file.
                                      <options: pre|post|destroy|package>
      --api-version=<value>           Override the api version used for api requests made by this command
      --from-org=<value>              Username or alias of the org that contains the metadata components from which to
                                      build a manifest.

GLOBAL FLAGS
  --flags-dir=<value>  Import flag values from a directory.
  --json               Format output as json.

DESCRIPTION
  Create a project manifest that lists the metadata components you want to deploy or retrieve.

  Create a manifest from a list of metadata components (--metadata) or from one or more local directories that contain
  source files (--source-dir). You can specify either of these parameters, not both.

  Use --type to specify the type of manifest you want to create. The resulting manifest files have specific names, such
  as the standard package.xml or destructiveChanges.xml to delete metadata. Valid values for this parameter, and their
  respective file names, are:

  * package : package.xml (default)
  * pre : destructiveChangesPre.xml
  * post : destructiveChangesPost.xml
  * destroy : destructiveChanges.xml

  See https://developer.salesforce.com/docs/atlas.en-us.api_meta.meta/api_meta/meta_deploy_deleting_files.htm for
  information about these destructive manifest files.

  Use --name to specify a custom name for the generated manifest if the pre-defined ones don’t suit your needs. You can
  specify either --type or --name, but not both.

  To include multiple metadata components, either set multiple --metadata <name> flags or a single --metadata flag with
  multiple names separated by spaces. Enclose names that contain spaces in one set of double quotes. The same syntax
  applies to --include-packages and --source-dir.

ALIASES
  $ sf force source manifest create

EXAMPLES
  Create a manifest for deploying or retrieving all Apex classes and custom objects:

    $ sf project generate manifest --metadata ApexClass --metadata CustomObject

  Create a manifest for deleting the specified Apex class:

    $ sf project generate manifest --metadata ApexClass:MyApexClass --type destroy

  Create a manifest for deploying or retrieving all the metadata components in the specified local directory; name the
  file myNewManifest.xml:

    $ sf project generate manifest --source-dir force-app --name myNewManifest

  Create a manifest from the metadata components in the specified org and include metadata in any unlocked packages:

    $ sf project generate manifest --from-org test@myorg.com --include-packages unlocked
```

_See code: [src/commands/project/generate/manifest.ts](https://github.com/salesforcecli/plugin-deploy-retrieve/blob/3.5.6/src/commands/project/generate/manifest.ts)_

## `sf project list ignored`

Check your local project package directories for forceignored files.

```
USAGE
  $ sf project list ignored [--json] [--flags-dir <value>] [-p <value>]

FLAGS
  -p, --source-dir=<value>  File or directory of files that the command checks for foreceignored files.

GLOBAL FLAGS
  --flags-dir=<value>  Import flag values from a directory.
  --json               Format output as json.

DESCRIPTION
  Check your local project package directories for forceignored files.

  When deploying or retrieving metadata between your local project and an org, you can specify the source files you want
  to exclude with a .forceignore file. The .forceignore file structure mimics the .gitignore structure. Each line in
  .forceignore specifies a pattern that corresponds to one or more files. The files typically represent metadata
  components, but can be any files you want to exclude, such as LWC configuration JSON files or tests.

ALIASES
  $ sf force source ignored list

EXAMPLES
  List all the files in all package directories that are ignored:

    $ sf project list ignored

  List all the files in a specific directory that are ignored:

    $ sf project list ignored --source-dir force-app

  Check if a particular file is ignored:

    $ sf project list ignored --source-dir package.xml
```

_See code: [src/commands/project/list/ignored.ts](https://github.com/salesforcecli/plugin-deploy-retrieve/blob/3.5.6/src/commands/project/list/ignored.ts)_

## `sf project reset tracking`

Reset local and remote source tracking.

```
USAGE
  $ sf project reset tracking -o <value> [--json] [--flags-dir <value>] [--api-version <value>] [-r <value>] [-p]

FLAGS
  -o, --target-org=<value>   (required) Username or alias of the target org. Not required if the `target-org`
                             configuration variable is already set.
  -p, --no-prompt            Don't prompt for source tracking override confirmation.
  -r, --revision=<value>     SourceMember revision counter number to reset to.
      --api-version=<value>  Override the api version used for api requests made by this command

GLOBAL FLAGS
  --flags-dir=<value>  Import flag values from a directory.
  --json               Format output as json.

DESCRIPTION
  Reset local and remote source tracking.

  WARNING: This command deletes or overwrites all existing source tracking files. Use with extreme caution.

  Resets local and remote source tracking so that Salesforce CLI no longer registers differences between your local
  files and those in the org. When you next run 'project deploy preview', Salesforce CLI returns no results, even though
  conflicts might actually exist. Salesforce CLI then resumes tracking new source changes as usual.

  Use the --revision parameter to reset source tracking to a specific revision number of an org source member. To get
  the revision number, query the SourceMember Tooling API object with the 'data soql' command. For example:

  sf data query --query "SELECT MemberName, MemberType, RevisionCounter FROM SourceMember" --use-tooling-api
  --target-org my-scratch

ALIASES
  $ sf force source tracking reset

EXAMPLES
  Reset source tracking for the org with alias "my-scratch":

    $ sf project reset tracking --target-org my-scratch

  Reset source tracking to revision number 30 for your default org:

    $ sf project reset tracking --revision 30
```

_See code: [src/commands/project/reset/tracking.ts](https://github.com/salesforcecli/plugin-deploy-retrieve/blob/3.5.6/src/commands/project/reset/tracking.ts)_

## `sf project retrieve preview`

Preview a retrieval to see what will be retrieved from the org, the potential conflicts, and the ignored files.

```
USAGE
  $ sf project retrieve preview -o <value> [--json] [--flags-dir <value>] [-c] [--concise]

FLAGS
  -c, --ignore-conflicts    Don't display conflicts in the preview of the retrieval.
  -o, --target-org=<value>  (required) Login username or alias for the target org.
      --concise             Show only the changes that will be retrieved; omits files that are forceignored.

GLOBAL FLAGS
  --flags-dir=<value>  Import flag values from a directory.
  --json               Format output as json.

DESCRIPTION
  Preview a retrieval to see what will be retrieved from the org, the potential conflicts, and the ignored files.

  You must run this command from within a project.

  The command outputs a table that describes what will happen if you run the "sf project retrieve start" command. The
  table lists the metadata components that will be retrieved and deleted. The table also lists the current conflicts
  between files in your local project and components in the org. Finally, the table lists the files that won't be
  retrieved because they're included in your .forceignore file.

  If your org allows source tracking, then this command displays potential conflicts between the org and your local
  project. Some orgs, such as production org, never allow source tracking. Source tracking is enabled by default on
  scratch and sandbox orgs; you can disable source tracking when you create the orgs by specifying the --no-track-source
  flag on the "sf org create scratch|sandbox" commands.

ALIASES
  $ sf retrieve metadata preview

EXAMPLES
  Preview the retrieve of all changes from your default org:

    $ sf project retrieve preview

  Preview the retrieve when ignoring any conflicts from an org with alias "my-scratch":

    $ sf project retrieve preview --ignore-conflicts --target-org my-scratch

FLAG DESCRIPTIONS
  -c, --ignore-conflicts  Don't display conflicts in the preview of the retrieval.

    This flag applies only to orgs that allow source tracking. It has no effect on orgs that don't allow it, such as
    production orgs.

  -o, --target-org=<value>  Login username or alias for the target org.

    Overrides your default org.
```

_See code: [src/commands/project/retrieve/preview.ts](https://github.com/salesforcecli/plugin-deploy-retrieve/blob/3.5.6/src/commands/project/retrieve/preview.ts)_

## `sf project retrieve start`

Retrieve metadata from an org to your local project.

```
USAGE
  $ sf project retrieve start -o <value> [--json] [--flags-dir <value>] [-a <value>] [-c] [-x <value> | -m <value> | -d
    <value>] [-r <value> | -n <value> | ] [--single-package -t <value>] [-w <value>] [-z ] [--zip-file-name <value> ]

FLAGS
  -a, --api-version=<value>      Target API version for the retrieve.
  -c, --ignore-conflicts         Ignore conflicts and retrieve and save files to your local filesystem, even if they
                                 overwrite your local changes.
  -d, --source-dir=<value>...    File paths for source to retrieve from the org.
  -m, --metadata=<value>...      Metadata component names to retrieve. Wildcards (`*`) supported as long as you use
                                 quotes, such as `ApexClass:MyClass*`.
  -n, --package-name=<value>...  Package names to retrieve.
  -o, --target-org=<value>       (required) Login username or alias for the target org.
  -r, --output-dir=<value>       Directory root for the retrieved source files.
  -w, --wait=<value>             [default: 33 minutes] Number of minutes to wait for the command to complete and display
                                 results to the terminal window.
  -x, --manifest=<value>         File path for the manifest (package.xml) that specifies the components to retrieve.

METADATA API FORMAT FLAGS
  -t, --target-metadata-dir=<value>  Directory that will contain the retrieved metadata format files or ZIP.
  -z, --unzip                        Extract all files from the retrieved zip file.
      --single-package               Indicates that the zip file points to a directory structure for a single package.
      --zip-file-name=<value>        File name to use for the retrieved zip file.

GLOBAL FLAGS
  --flags-dir=<value>  Import flag values from a directory.
  --json               Format output as json.

DESCRIPTION
  Retrieve metadata from an org to your local project.

  You must run this command from within a project.

  Metadata components are retrieved in source format by default. Retrieve them in metadata format by specifying the
  --target-metadata-dir flag, which retrieves the components into a ZIP file in the specified directory.

  If your org allows source tracking, then this command tracks the changes in your source. Some orgs, such as production
  orgs, never allow source tracking. Source tracking is enabled by default on scratch and sandbox orgs; you can disable
  source tracking when you create the orgs by specifying the --no-track-source flag on the "sf org create
  scratch|sandbox" commands.

  To retrieve multiple metadata components, either use multiple --metadata <name> flags or use a single --metadata flag
  with multiple names separated by spaces. Enclose names that contain spaces in one set of double quotes. The same
  syntax applies to --manifest and --source-dir.

ALIASES
  $ sf retrieve metadata

EXAMPLES
  Retrieve all remote changes from your default org:

    $ sf project retrieve start

  Retrieve the source files in the "force-app" directory from an org with alias "my-scratch":

    $ sf project retrieve start --source-dir force-app --target-org my-scratch

  Retrieve all the Apex classes and custom objects whose source is in the "force-app" directory. The list views,
  layouts, etc, that are associated with the custom objects are also retrieved. Both examples are equivalent:

    $ sf project retrieve start --source-dir force-app/main/default/classes force-app/main/default/objects
    $ sf project retrieve start --source-dir force-app/main/default/classes --source-dir \
      force-app/main/default/objects

  Retrieve all Apex classes that are in all package directories defined in the "sfdx-project.json" file:

    $ sf project retrieve start --metadata ApexClass

  Retrieve a specific Apex class; ignore any conflicts between the local project and org (be careful with this flag,
  because it will overwrite the Apex class source files in your local project if there are conflicts!):

    $ sf project retrieve start --metadata ApexClass:MyApexClass --ignore-conflicts

  Retrieve specific Apex classes that match a pattern; in this example, retrieve Apex classes whose names contain the
  string "MyApex":

    $ sf project retrieve start --metadata 'ApexClass:MyApex*'

  Retrieve all custom objects and Apex classes found in all defined package directories (both examples are
  equivalent):

    $ sf project retrieve start --metadata CustomObject ApexClass
    $ sf project retrieve start --metadata CustomObject --metadata ApexClass

  Retrieve all metadata components listed in a manifest:

    $ sf project retrieve start --manifest path/to/package.xml

  Retrieve metadata from a package:

    $ sf project retrieve start --package-name MyPackageName

  Retrieve metadata from multiple packages, one of which has a space in its name (both examples are equivalent):

    $ sf project retrieve start --package-name Package1 "PackageName With Spaces" Package3
    $ sf project retrieve start --package-name Package1 --package-name "PackageName With Spaces" --package-name \
      Package3

  Retrieve the metadata components listed in the force-app directory, but retrieve them in metadata format into a ZIP
  file in the "output" directory:

    $ sf project retrieve start --source-dir force-app --target-metadata-dir output

  Retrieve in metadata format and automatically extract the contents into the "output" directory:

    $ sf project retrieve start --source-dir force-app --target-metadata-dir output --unzip

FLAG DESCRIPTIONS
  -a, --api-version=<value>  Target API version for the retrieve.

    Use this flag to override the default API version, which is the latest version supported the CLI, with the API
    version in your package.xml file.

  -c, --ignore-conflicts

    Ignore conflicts and retrieve and save files to your local filesystem, even if they overwrite your local changes.

    This flag applies only to orgs that allow source tracking. It has no effect on orgs that don't allow it, such as
    production orgs.

  -d, --source-dir=<value>...  File paths for source to retrieve from the org.

    The supplied paths can be to a single file (in which case the operation is applied to only one file) or to a folder
    (in which case the operation is applied to all source files in the directory and its subdirectories).

  -o, --target-org=<value>  Login username or alias for the target org.

    Overrides your default org.

  -r, --output-dir=<value>  Directory root for the retrieved source files.

    The root of the directory structure into which the source files are retrieved.
    If the target directory matches one of the package directories in your sfdx-project.json file, the command fails.
    Running the command multiple times with the same target adds new files and overwrites existing files.

  -w, --wait=<value>  Number of minutes to wait for the command to complete and display results to the terminal window.

    If the command continues to run after the wait period, the CLI returns control of the terminal window to you.

  -x, --manifest=<value>  File path for the manifest (package.xml) that specifies the components to retrieve.

    If you specify this parameter, don’t specify --metadata or --source-dir.
```

_See code: [src/commands/project/retrieve/start.ts](https://github.com/salesforcecli/plugin-deploy-retrieve/blob/3.5.6/src/commands/project/retrieve/start.ts)_

<!-- commandsstop -->
