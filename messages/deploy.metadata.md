# summary

Deploy metadata to an org from your local project.

# description

You must run this command from within a project.

Metadata components are deployed in source format by default. Deploy them in metadata format by specifying the --metadata-dir flag, which specifies the root directory or ZIP file that contains the metadata formatted files you want to deploy.

If your org allows source tracking, then this command tracks the changes in your source. Some orgs, such as production orgs, never allow source tracking. Source tracking is enabled by default on scratch and sandbox orgs; you can disable source tracking when you create the orgs by specifying the --no-track-source flag on the "<%= config.bin %> org create scratch|sandbox" commands.

To deploy multiple metadata components, either set multiple --metadata <name> flags or a single --metadata flag with multiple names separated by spaces. Enclose names that contain spaces in one set of double quotes. The same syntax applies to --manifest and --source-dir.

# examples

- Deploy local changes not in the org; uses your default org:

      <%= config.bin %> <%= command.id %>

- Deploy all source files in the "force-app" directory to an org with alias "my-scratch"; show only concise output, in other words don't print a list of all the source that was deployed:

      <%= config.bin %> <%= command.id %>  --source-dir force-app --target-org my-scratch --concise

- Deploy all the Apex classes and custom objects that are in the "force-app" directory. The list views, layouts, etc, that are associated with the custom objects are also deployed. Both examples are equivalent:

      <%= config.bin %> <%= command.id %> --source-dir force-app/main/default/classes force-app/main/default/objects
      <%= config.bin %> <%= command.id %> --source-dir force-app/main/default/classes --source-dir force-app/main/default/objects

- Deploy all Apex classes that are in all package directories defined in the "sfdx-project.json" file:

      <%= config.bin %> <%= command.id %> --metadata ApexClass

- Deploy a specific Apex class; ignore any conflicts between the local project and org (be careful with this flag, because it will overwrite the Apex class in the org if there are conflicts!):

      <%= config.bin %> <%= command.id %> --metadata ApexClass:MyApexClass --ignore-conflicts

- Deploy specific Apex classes that match a pattern; in this example, deploy Apex classes whose names contain the string "MyApex". Also ignore any deployment warnings (again, be careful with this flag! You typically want to see the warnings):

      <%= config.bin %> <%= command.id %> --metadata 'ApexClass:MyApex*' --ignore-warnings

- Deploy a custom object called ExcitingObject that's in the SBQQ namespace:

      sf <%= command.id %> --metadata CustomObject:SBQQ__ExcitingObject

- Deploy all custom objects in the SBQQ namespace by using a wildcard and quotes:

      sf <%= command.id %> --metadata 'CustomObject:SBQQ__*'

- Deploy all custom objects and Apex classes found in all defined package directories (both examples are equivalent):

      <%= config.bin %> <%= command.id %> --metadata CustomObject ApexClass
      <%= config.bin %> <%= command.id %> --metadata CustomObject --metadata ApexClass

- Deploy all Apex classes and a profile that has a space in its name:

      <%= config.bin %> <%= command.id %> --metadata ApexClass --metadata "Profile:My Profile"

- Deploy all components listed in a manifest:

      <%= config.bin %> <%= command.id %> --manifest path/to/package.xml

- Run the tests that aren’t in any managed packages as part of a deployment:

      <%= config.bin %> <%= command.id %> --metadata ApexClass --test-level RunLocalTests

- Deploy all metadata formatted files in the "MDAPI" directory:

      <%= config.bin %> <%= command.id %> --metadata-dir MDAPI

- Deploy all metadata formatted files in the "MDAPI" directory; items listed in the MDAPI/destructiveChangesPre.xml and MDAPI/destructiveChangesPost.xml manifests are immediately eligible for deletion rather than stored in the Recycle Bin:

      <%= config.bin %> <%= command.id %> --metadata-dir MDAPI --purge-on-delete

# flags.pre-destructive-changes.summary

File path for a manifest (destructiveChangesPre.xml) of components to delete before the deploy.

# flags.post-destructive-changes.summary

File path for a manifest (destructiveChangesPost.xml) of components to delete after the deploy.

# flags.purge-on-delete.summary

Specify that deleted components in the destructive changes manifest file are immediately eligible for deletion rather than being stored in the Recycle Bin.

# flags.metadata.summary

Metadata component names to deploy. Wildcards (`*` ) supported as long as you use quotes, such as `ApexClass:MyClass*`.

# flags.test-level.summary

Deployment Apex testing level.

# flags.test-level.description

Valid values are:

- NoTestRun — No tests are run. This test level applies only to deployments to development environments, such as sandbox, Developer Edition, or trial orgs. This test level is the default for development environments.

- RunSpecifiedTests — Runs only the tests that you specify with the --tests flag. Code coverage requirements differ from the default coverage requirements when using this test level. Executed tests must comprise a minimum of 75% code coverage for each class and trigger in the deployment package. This coverage is computed for each class and trigger individually and is different than the overall coverage percentage.

- RunLocalTests — All tests in your org are run, except the ones that originate from installed managed and unlocked packages. This test level is the default for production deployments that include Apex classes or triggers.

- RunAllTestsInOrg — All tests in your org are run, including tests of managed packages.

  If you don’t specify a test level, the default behavior depends on the contents of your deployment package and target org. For more information, see [Running Tests in a Deployment](https://developer.salesforce.com/docs/atlas.en-us.api_meta.meta/api_meta/meta_deploy_running_tests.htm) in the "Metadata API Developer Guide".

# flags.source-dir.summary

Path to the local source files to deploy.

# flags.source-dir.description

The supplied path can be to a single file (in which case the operation is applied to only one file) or to a folder (in which case the operation is applied to all metadata types in the directory and its subdirectories).

If you specify this flag, don’t specify --metadata or --manifest.

# flags.wait.summary

Number of minutes to wait for command to complete and display results.

# flags.wait.description

If the command continues to run after the wait period, the CLI returns control of the terminal window to you and returns the job ID. To resume the deployment, run "<%= config.bin %> project deploy resume". To check the status of the deployment, run "<%= config.bin %> project deploy report".

# flags.manifest.summary

Full file path for manifest (package.xml) of components to deploy.

# flags.manifest.description

All child components are included. If you specify this flag, don’t specify --metadata or --source-dir.

# flags.dry-run.summary

Validate deploy and run Apex tests but don’t save to the org.

# flags.ignore-conflicts.summary

Ignore conflicts and deploy local files, even if they overwrite changes in the org.

# flags.ignore-conflicts.description

This flag applies only to orgs that allow source tracking. It has no effect on orgs that don't allow it, such as production orgs.

# flags.ignore-errors.summary

Ignore any errors and don’t roll back deployment.

# flags.ignore-errors.description

Never use this flag when deploying to a production org. If you specify it, components without errors are deployed and components with errors are skipped, and could result in an inconsistent production org.

# flags.ignore-warnings.summary

Ignore warnings and allow a deployment to complete successfully.

# flags.ignore-warnings.description

If you specify this flag, and a warning occurs, the success status of the deployment is set to true. If you don't specify this flag, and a warning occurs, then the success status is set to false, and the warning is treated like an error.

This flag is useful in a CI environment and your deployment includes destructive changes; if you try to delete a component that doesn't exist in the org, you get a warning. In this case, to ensure that the command returns a success value of true, specify this flag.

# flags.verbose.summary

Show verbose output of the deploy result.

# flags.concise.summary

Show concise output of the deploy result.

# flags.api-version.summary

Target API version for the deploy.

# flags.api-version.description

Use this flag to override the default API version with the API version of your package.xml file. The default API version is the latest version supported by the CLI.

# flags.async.summary

Run the command asynchronously.

# flags.async.description

The command immediately returns the job ID and control of the terminal to you. This way, you can continue to use the CLI. To resume the deployment, run "<%= config.bin %> project deploy resume". To check the status of the deployment, run "<%= config.bin %> project deploy report".

# flags.metadata-dir.summary

Root of directory or zip file of metadata formatted files to deploy.

# flags.single-package.summary

Indicates that the metadata zip file points to a directory structure for a single package.

# save.as.default

Save %s as default target-org?

# errors.NoOrgsToSelect

Can't find any active scratch orgs, Dev Hubs, or other orgs.
Either log into an org or create a scratch org, and then try again.

# error.NoTestsSpecified

You must specify tests using the --tests flag if the --test-level flag is set to RunSpecifiedTests.

# error.ClientTimeout

The command has timed out, although the deployment is still running. Use "sf project deploy resume" to resume watching the deployment.

# error.Conflicts

There are changes in the org that conflict with the local changes you're trying to deploy.

# error.Conflicts.Actions

- To overwrite the remote changes, rerun this command with the --ignore-conflicts flag.

- To overwrite the local changes, run the "sf project retrieve start" command with the --ignore-conflicts flag.

# error.nothingToDeploy

No local changes to deploy.

# error.nothingToDeploy.Actions

- To see conflicts and ignored files, run "sf project deploy preview" with any of the manifest, directory, or metadata flags.

# error.InvalidDeployId

Invalid deploy ID: %s for org: %s

# error.InvalidDeployId.actions

- Ensure the deploy ID is correct.
- Ensure the target-org username or alias is correct.

# flags.junit.summary

Output JUnit test results.

# flags.results-dir.summary

Output directory for code coverage and JUnit results; defaults to the deploy ID.

# asyncCoverageJunitWarning

You requested an async deploy with code coverage or JUnit results. The reports will be available when the deploy completes.

# pushPackageDirsWarning

The `pushPackageDirectoriesSequentially` property is not respected by this command. Please call the `project deploy start --source-dir` command for each dependency in the correct order.

# apiVersionMsgDetailed

%s %s metadata to %s using the v%s %s API.
