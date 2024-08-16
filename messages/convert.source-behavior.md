# summary

Enable a behavior of your project source files, and then update your Salesforce DX project to implement the behavior.

# description

Specifically, this command updates the "sourceBehaviorOption" option in the "sfdx-project.json" file and then converts the associated local source files in your project as needed.

For example, run this command with the "--behavior decomposePermissionSetBeta" flag to start decomposing permission sets when you deploy or retrieve them. Decomposing means breaking up the monolithic metadata API format XML file that corresponds to a metadata component into smaller XML files and directories based on its subtypes. Permission sets are not decomposed by default; you must opt-in to start decomposing them by using this command. When the command finishes, your "sfdx-project.json" file is updated to always decompose permission sets, and the existing permission set files in your local package directories are converted into the new decomposed format. You run this command only once for a given behavior change.

For more information about the possible values for the --behavior flag, see the "sourceBehaviorOptions" section in the https://developer.salesforce.com/docs/atlas.en-us.sfdx_dev.meta/sfdx_dev/sfdx_dev_ws_config.htm topic.

# flags.behavior.summary

Behavior to enable; the values correspond to the possible values of the "sourceBehaviorOption" option in the "sfdx-project.json" file.

# examples

- Update your Salesforce DX project to decompose custom permission sets:

  <%= config.bin %> <%= command.id %> --behavior decomposePermissionSetBeta

- Display what the command would do, but don't change any existing files:

  <%= config.bin %> <%= command.id %> --behavior decomposePermissionSetBeta --dry-run

- Keep the temporary directory that contains the interim metadata API formatted files:

  <%= config.bin %> <%= command.id %> --behavior decomposePermissionSetBeta --dry-run --preserve-temp-dir

# flags.dry-run.summary

Display what the command would do, but don't make any actual changes.

# flags.dry-run.description

Doesn't modify the existing files in your project, including the "sfdx-project.json" file. Instead, the command lists the files that would be deleted, explains the modifications to the "sfdx-project.json" file, and outputs the resulting modifications to a new directory named `DRY-RUN-RESULTS` for review.

# flags.preserve-temp-dir.summary

Don't delete the metadata API format temporary directory that this command creates. Useful for debugging.

# error.trackingNotSupported

Your project has a default org (target-org) that uses source tracking. This operation will cause changes to the local project source files that can't be properly tracked.

# error.trackingNotSupported.actions

- Retrieve any changes or data you need from the org that you haven't already retrieved.
- Delete the org ("sf org delete scratch" or "sf org delete sandbox").
- Run this command again.
- Create a new org ("sf org create scratch" or "sf org create sandbox") and deploy the modified source.

# mainDefaultConfirmation

- This command puts components in a newly created `main/default` folder in each package directory. You might need to re-organize them into your preferred structure.

# basicConfirmation

- This command makes changes to your project. Be sure you've committed any source changes before continuing so you can easily revert if necessary.

# success.dryRun

Files were created in %s outside your package directories for you to inspect.

# error.noTargetTypes

The project doesn't contain any package directories with metadata that matches the specified behavior %s.
