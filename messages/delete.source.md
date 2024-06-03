# summary

Delete source from your project and from a non-source-tracked org.

# description

Use this command to delete components from orgs that don’t have source tracking. To remove deleted items from orgs that have source tracking enabled, "<%= config.bin %> project deploy start".

When you run this command, both the local source file and the metadata component in the org are deleted.

To delete multiple metadata components, either set multiple --metadata <name> flags or a single --metadata flag with multiple names separated by spaces. Enclose names that contain spaces in one set of double quotes. The same syntax applies to --manifest and --source-dir.

# examples

- Delete all local Apex source files and all Apex classes from the org with alias "my-scratch":

  <%= config.bin %> <%= command.id %> --metadata ApexClass --target-org my-scratch

- Delete a specific Apex class and a Profile that has a space in it from your default org; don't prompt for confirmation:

  <%= config.bin %> <%= command.id %> --metadata ApexClass:MyFabulousApexClass --metadata "Profile: My Profile" --no-prompt

- Run the tests that aren’t in any managed packages as part of the deletion; if the delete succeeds, and the org has source-tracking enabled, update the source tracking information:

  <%= config.bin %> <%= command.id %> --metadata ApexClass --test-level RunLocalTests --track-source

- Delete the Apex source files in a directory and the corresponding components from your default org:

  <%= config.bin %> <%= command.id %> --source-dir force-app/main/default/classes

# flags.source-dir.summary

Source file paths to delete.

# flags.metadata.summary

Metadata components to delete.

# flags.no-prompt.summary

Don't prompt for delete confirmation.

# flags.wait.summary

Number of minutes to wait for the command to finish.

# flags.check-only.summary

Validate delete command but don't delete anything from the org or the local project.

# flags.test-Level.summary

Deployment Apex testing level.

# flags.track-source.summary

If the delete succeeds, update the source tracking information.

# flags.force-overwrite.summary

Ignore conflict warnings and overwrite changes to the org.

# flags.verbose.summary

Verbose output of the delete result.

# flags.check-only.description

IMPORTANT: Where possible, we changed noninclusive terms to align with our company value of Equality. We maintained certain terms to avoid any effect on customer implementations.

Validates the deleted metadata and runs all Apex tests, but prevents the deletion from being saved to the org.

If you change a field type from Master-Detail to Lookup or vice versa, that change isn’t supported when using the --check-only parameter to test a deletion (validation). This kind of change isn’t supported for test deletions to avoid the risk of data loss or corruption. If a change that isn’t supported for test deletions is included in a deletion package, the test deletion fails and issues an error.

If your deletion package changes a field type from Master-Detail to Lookup or vice versa, you can still validate the changes prior to deploying to Production by performing a full deletion to another test Sandbox. A full deletion includes a validation of the changes as part of the deletion process.

Note: A Metadata API deletion that includes Master-Detail relationships deletes all detail records in the Recycle Bin in the following cases.

    1. For a deletion with a new Master-Detail field, soft delete (send to the Recycle Bin) all detail records before proceeding to delete the Master-Detail field, or the deletion fails. During the deletion, detail records are permanently deleted from the Recycle Bin and cannot be recovered.

    2. For a deletion that converts a Lookup field relationship to a Master-Detail relationship, detail records must reference a master record or be soft-deleted (sent to the Recycle Bin) for the deletion to succeed. However, a successful deletion permanently deletes any detail records in the Recycle Bin.

# flags.metadata.description

If you specify this parameter, don’t specify --source-dir.

# flags.source-dir.description

The supplied paths can be a single file (in which case the operation is applied to only one file) or a folder (in which case the operation is applied to all metadata types in the directory and its sub-directories).

If you specify this parameter, don’t specify --metadata.

# flags.wait.description

If the command continues to run after the wait period, the CLI returns control of the terminal window to you.

# flags.test-Level.description

Valid values are:

- NoTestRun — No tests are run. This test level applies only to deployments to development environments, such as sandbox, Developer Edition, or trial orgs. This test level is the default for development environments.

- RunSpecifiedTests — Runs only the tests that you specify with the --tests flag. Code coverage requirements differ from the default coverage requirements when using this test level. Executed tests must comprise a minimum of 75% code coverage for each class and trigger in the deployment package. This coverage is computed for each class and trigger individually and is different than the overall coverage percentage.

- RunLocalTests — All tests in your org are run, except the ones that originate from installed managed and unlocked packages. This test level is the default for production deployments that include Apex classes or triggers.

- RunAllTestsInOrg — All tests in your org are run, including tests of managed packages.

If you don’t specify a test level, the default behavior depends on the contents of your deployment package and target org. For more information, see “Running Tests in a Deployment” in the Metadata API Developer Guide.

# localPrompt

This operation will delete the following files on your computer and in your org:
%s

# remotePrompt

This operation will delete the following metadata in your org:
%s

# deployPrompt

This operation will deploy the following:
%s

# areYouSure

Are you sure you want to proceed?

# areYouSureCheckOnly

Are you sure you want to proceed (this is only a check and won't actually delete anything)?

# conflictMsg

We couldn't complete the operation due to conflicts. Verify that you want to keep the existing versions, then run the command again with the --force-overwrite (-f) option.

# prompt.delete.cancel

The request to delete metadata was canceled.

# error.NoTestsSpecified

You must specify tests using the --tests flag if the --test-level flag is set to RunSpecifiedTests.
