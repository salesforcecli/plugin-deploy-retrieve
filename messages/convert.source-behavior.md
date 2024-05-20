# summary

Enable a sourceBehaviorOption in sfdx-project.json and update your project source to use it.

# description

Makes local changes to your project based on the chosen sourceBehaviorOption.

# flags.behavior.summary

Which sourceBehaviorOption to enable.

# examples

- Switch the project to use decomposed custom labels
  <%= config.bin %> <%= command.id %> --behavior DecomposeCustomLabels

- Without changing any existing files, see what the command would have produced.
  <%= config.bin %> <%= command.id %> --behavior DecomposeCustomLabels --dry-run

# flags.dry-run.summary

Explain what the command would do.

# flags.dry-run.description

Doesn't modify existing files. Lists files that would be deleted, explains modifications to sfdx-project.json, and outputs the resulting modifications to a new folder for review.

# flags.preserve-temp-dir.summary

Don't delete the metadata API format temp dir that this command creates. Useful for debugging.

# error.trackingNotSupported

The project has a target-org that uses source tracking. This operation will cause changes to the local project that can't be properly tracked.

# error.trackingNotSupported.actions

- Get any changes or data you need from the org
- Delete the org (`sf org delete scratch` or `sf org delete sandbox`)
- Run the command again
- Create a new org and deploy the modified source

# error.packageDirectoryNeedsMainDefault

The package directory %s does not have a main/default structure.
The command will move metadata into main/default which doesn't seem like what you'd want.

# error.packageDirectoryNeedsMainDefault.actions

- Update %s to have all its metadata inside main/default.
- Run the command again.

# success.dryRun

Files were created in %s outside your package directories for inspection.

# error.noTargetTypes

The project contains no packageDirectories with metadata that matches the specified behavior %s.
