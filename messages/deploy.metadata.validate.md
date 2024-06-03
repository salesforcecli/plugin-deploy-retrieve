# summary

Validate a metadata deployment without actually executing it.

# description

Use this command to verify whether a deployment will succeed without actually deploying the metadata to your org. This command is similar to "<%= config.bin %> project deploy start", except you're required to run Apex tests, and the command returns a job ID rather than executing the deployment. If the validation succeeds, then you pass this job ID to the "<%= config.bin %> project deploy quick" command to actually deploy the metadata. This quick deploy takes less time because it skips running Apex tests. The job ID is valid for 10 days from when you started the validation. Validating first is useful if the deployment to your production org take several hours and you don’t want to risk a failed deploy.

You must run this command from within a project.

This command doesn't support source-tracking. When you quick deploy with the resulting job ID, the source you deploy overwrites the corresponding metadata in your org.

To validate the deployment of multiple metadata components, either set multiple --metadata <name> flags or a single --metadata flag with multiple names separated by spaces. Enclose names that contain spaces in one set of double quotes. The same syntax applies to --manifest and --source-dir.

Note: Don't use this command on sandboxes; the command is intended to be used on production orgs. By default, sandboxes don't run tests during a deploy. If you want to validate a deployment with tests on a sandbox, use "<%= config.bin %> project deploy start --dry-run --test-level RunLocalTests" instead.

# examples

- NOTE: These examples focus on validating large deployments. See the help for "<%= config.bin %> project deploy start" for examples of deploying smaller sets of metadata which you can also use to validate.

- Validate the deployment of all source files in the "force-app" directory to the default org:

      <%= config.bin %> <%= command.id %> --source-dir force-app

- Validate the deployment of all source files in two directories: "force-app" and "force-app-utils":

      <%= config.bin %> <%= command.id %> --source-dir force-app --source-dir force-app-utils

- Asynchronously validate the deployment and run all tests in the org with alias "my-prod-org"; command immediately returns the job ID:

      <%= config.bin %> <%= command.id %> --source-dir force-app --async --test-level RunAllTestsInOrg --target-org my-prod-org

- Validate the deployment of all components listed in a manifest:

      <%= config.bin %> <%= command.id %> --manifest path/to/package.xml

# flags.metadata.summary

Metadata component names to validate for deployment.

# flags.test-level.summary

Deployment Apex testing level.

# flags.test-level.description

Valid values are:

- RunSpecifiedTests — Runs only the tests that you specify with the --tests flag. Code coverage requirements differ from the default coverage requirements when using this test level. Executed tests must comprise a minimum of 75% code coverage for each class and trigger in the deployment package. This coverage is computed for each class and trigger individually and is different than the overall coverage percentage.

- RunLocalTests — All tests in your org are run, except the ones that originate from installed managed and unlocked packages. This test level is the default.

- RunAllTestsInOrg — All tests in your org are run, including tests of managed packages.

# flags.source-dir.summary

Path to the local source files to validate for deployment.

# flags.source-dir.description

The supplied path can be to a single file (in which case the operation is applied to only one file) or to a folder (in which case the operation is applied to all metadata types in the directory and its subdirectories).

If you specify this flag, don’t specify --metadata or --manifest.

# flags.wait.summary

Number of minutes to wait for the command to complete and display results.

# flags.wait.description

If the command continues to run after the wait period, the CLI returns control of the terminal window to you and returns the job ID. To resume watching the validation, run "<%= config.bin %> project deploy resume". To check the status of the validation, run "<%= config.bin %> project deploy report".

# flags.manifest.summary

Full file path for manifest (package.xml) of components to validate for deployment.

# flags.manifest.description

All child components are included. If you specify this flag, don’t specify --metadata or --source-dir.

# flags.api.summary

The API to use for validating the deployment.

# flags.verbose.summary

Show verbose output of the validation result.

# flags.concise.summary

Show concise output of the validation result.

# flags.api-version.summary

Target API version for the validation.

# flags.api-version.description

Use this flag to override the default API version with the API version of your package.xml file. The default API version is the latest version supported by the CLI.

# flags.async.summary

Run the command asynchronously.

# flags.async.description

The command immediately returns the job ID and control of the terminal to you. This way, you can continue to use the CLI. To resume watching the validation, run "<%= config.bin %> project deploy resume". To check the status of the validation, run "<%= config.bin %> project deploy report".

# flags.metadata-dir.summary

Root of directory or zip file of metadata formatted files to deploy.

# flags.single-package.summary

Indicates that the metadata zip file points to a directory structure for a single package.

# info.SuccessfulValidation

Successfully validated the deployment (%s).

# info.suggestedQuickDeploy

Run "sf project deploy quick --job-id %s" to execute this deploy

# error.FailedValidation

Failed to validate the deployment (%s). Due To:
%s

# error.NoTestsSpecified

You must specify tests using the --tests flag if the --test-level flag is set to RunSpecifiedTests.

# flags.pre-destructive-changes.summary

File path for a manifest (destructiveChangesPre.xml) of components to delete before the deploy

# flags.post-destructive-changes.summary

File path for a manifest (destructiveChangesPost.xml) of components to delete after the deploy.

# flags.purge-on-delete.summary

Specify that deleted components in the destructive changes manifest file are immediately eligible for deletion rather than being stored in the Recycle Bin.

# flags.junit.summary

Output JUnit test results.

# flags.results-dir.summary

Output directory for code coverage and JUnit results; defaults to the deploy ID.
