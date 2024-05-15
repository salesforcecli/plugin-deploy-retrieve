# summary

Enable a preset in sfdx-project.json and update your project source to use it.

# description

Makes local changes to your project based on the chosen preset.

# flags.preset.summary

Which preset to enable.

# examples

- Switch the project to use decomposed custom labels
  <%= config.bin %> <%= command.id %> --preset DecomposeCustomLabels --source-dir .

- Switch one packageDirectory to use decomposed custom labels
  <%= config.bin %> <%= command.id %> --preset DecomposeCustomLabels --source-dir force-app

# flags.dry-run.summary

Explain what the command would do but don't modify the project.

# flags.preserve-temp-dir.summary

Don't delete the metadata API format temp dir that this command creates. Useful for debugging.

# flags.source-dir.summary

Directory to modify the decomposition for. Can be an entire SfdxProject or any subfolder inside it.
