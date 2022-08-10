# summary

Preview a retrieval to see what will be retrieved from the org, the potential conflicts, and the ignored files.

# description

You must run this command from within a project.

The command outputs a table that describes what will happen if you run the "sf retrieve metadata" command. The table lists the metadata components that will be retrieved and deleted. The table also lists the current conflicts between files in your local project and components in the org. Finally, the table lists the files that won't be retrieved because they're included in your .forceignore file.

If your org allows source tracking, then this command considers conflicts between the org and local. Some orgs, such as production orgs, never allow source tracking. Use the "--no-track-source" flag when you create a scratch or sandbox org to disable source tracking.

# examples

- Preview the retrieve of all changes from the org:

  <%= config.bin %> <%= command.id %>

- Preview the retrieve when ignoring any conflicts:

  <%= config.bin %> <%= command.id %> --ignore-conflicts

# flags.target-org.summary

Login username or alias for the target org.

# flags.target-org.description

Overrides your default org.

# flags.ignore-conflicts.summary

Ignore conflicts and preview the retrieve of remote components, even if they will overwrite local changes.

# flags.ignore-conflicts.description

This flag applies only to orgs that allow source tracking. It has no effect on orgs that don't allow it, such as production orgs.

# flags.concise.summary

Omit ignored files.

# flags.api-version.summary

Target API version for the deploy.

# flags.api-version.description

Use this flag to override the default API version with the API version of your package.xml file. The default API version is the latest version supported by the CLI.

# error.Conflicts

There are local changes that conflict with the remote changes that would be retrieved.

# error.Conflicts.Actions

- To overwrite the remote changes, run the "sf deploy metadata" command with the --ignore-conflicts flag.

- To overwrite the local changes, run the "sf retrieve metadata" command with the --ignore-conflicts flag.
