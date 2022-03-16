# summary

Deploy metadata in source format to an org from your local project.

# description

You must run this command from within a project.

This command doesn't support source-tracking. The source you deploy overwrites the corresponding metadata in your org. This command doesn’t attempt to merge your source with the versions in your org.

To run the command asynchronously, set --wait to 0, which immediately returns the job ID. This way, you can continue to use the CLI.

To deploy multiple metadata components, either set multiple --metadata <name> flags or a single --metadata flag with multiple names separated by spaces. Enclose names that contain spaces in one set of double quotes. The same syntax applies to --manifest and --source-dir.

# examples

- Deploy the source files in a directory:

      <%= config.bin %> <%= command.id %>  --source-dir path/to/source

- Deploy a specific Apex class and the objects whose source is in a directory (both examples are equivalent):

      <%= config.bin %> <%= command.id %> --source-dir path/to/apex/classes/MyClass.cls path/to/source/objects
      <%= config.bin %> <%= command.id %> --source-dir path/to/apex/classes/MyClass.cls --source-dir path/to/source/objects

- Deploy all Apex classes:

      <%= config.bin %> <%= command.id %> --metadata ApexClass

- Deploy a specific Apex class:

      <%= config.bin %> <%= command.id %> --metadata ApexClass:MyApexClass

- Deploy all custom objects and Apex classes (both examples are equivalent):

      <%= config.bin %> <%= command.id %> --metadata CustomObject ApexClass
      <%= config.bin %> <%= command.id %> --metadata CustomObject --metadata ApexClass

- Deploy all Apex classes and a profile that has a space in its name:

      <%= config.bin %> <%= command.id %> --metadata ApexClass --metadata "Profile:My Profile"

- Deploy all components listed in a manifest:

      <%= config.bin %> <%= command.id %> --manifest path/to/package.xml

- Run the tests that aren’t in any managed packages as part of a deployment:

      <%= config.bin %> <%= command.id %> --metadata ApexClass --test-level RunLocalTests

# flags.target-org.summary

Login username or alias for the target org.

# flags.target-org.description

Overrides your default org.

# flags.metadata.summary

Metadata component names to deploy.

# flags.test-level.summary

Deployment Apex testing level.

# flags.test-level.description

Valid values are:

- NoTestRun — No tests are run. This test level applies only to deployments to development environments, such as sandbox, Developer Edition, or trial orgs. This test level is the default for development environments.

- RunSpecifiedTests — Runs only the tests that you specify with the --run-tests flag. Code coverage requirements differ from the default coverage requirements when using this test level. Executed tests must comprise a minimum of 75% code coverage for each class and trigger in the deployment package. This coverage is computed for each class and trigger individually and is different than the overall coverage percentage.

- RunLocalTests — All tests in your org are run, except the ones that originate from installed managed and unlocked packages. This test level is the default for production deployments that include Apex classes or triggers.

- RunAllTestsInOrg — All tests in your org are run, including tests of managed packages.

  If you don’t specify a test level, the default behavior depends on the contents of your deployment package. For more information, see [Running Tests in a Deployment](https://developer.salesforce.com/docs/atlas.en-us.api_meta.meta/api_meta/meta_deploy_running_tests.htm) in the "Metadata API Developer Guide".

# flags.source-dir.summary

Path to the local source files to deploy.

# flags.source-dir.description

The supplied path can be to a single file (in which case the operation is applied to only one file) or to a folder (in which case the operation is applied to all metadata types in the directory and its subdirectories).

If you specify this flag, don’t specify --metadata or --manifest.

# flags.wait.summary

Number of minutes to wait for command to complete and display results.

# flags.wait.description

If the command continues to run after the wait period, the CLI returns control of the terminal window to you.

# flags.manifest.summary

Full file path for manifest (package.xml) of components to deploy.

# flags.manifest.description

All child components are included. If you specify this flag, don’t specify --metadata or --source-dir.

# flags.dry-run.summary

Validate deploy and run Apex tests but don’t save to the org.

# flags.api.summary

The API to use for deploying.

# flags.ignore-errors.summary

Ignore any errors and don’t roll back deployment.

# flags.ignore-errors.description

When deploying to a production org, keep this flag set to false (default value). When set to true, components without errors are deployed and components with errors are skipped, and could result in an inconsistent production org.

# flags.ignore-warnings.summary

Ignore warnings and allow a deployment to complete successfully.

# flags.ignore-warnings.description

If a warning occurs and this flag is set to true, the success status of the deployment is set to true. When this flag is set to false, success is set to false, and the warning is treated like an error.

# flags.tests.summary

Apex tests to run when --test-level is RunSpecifiedTests.

# flags.tests.description

Separate multiple test names with commas, and enclose the entire flag value in double quotes if a test contains a space.

# flags.verbose.summary

Show verbose output of the deploy result.

# flags.api-version.summary

Target API version for the deploy.

# flags.api-version.description

Use this flag to override the default API version, which is the latest version supported the CLI, with the API version of your package.xml file.

# save.as.default

Save %s as default target-org?

# errors.NoOrgsToSelect

Can't find any active scratch orgs, Dev Hubs, or other orgs.
Either log into an org or create a scratch org, and then try again.

# error.UserTerminatedDeployForExpiredOrg

The target-org found in the configuration is expired. The user terminated the deploy.

# warning.TargetOrgIsExpired

The target-org, "%s", is expired. Do you want to pick another org?
