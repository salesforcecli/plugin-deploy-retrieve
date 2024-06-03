# summary

Preview a retrieval to see what will be retrieved from the org, the potential conflicts, and the ignored files.

# description

You must run this command from within a project.

The command outputs a table that describes what will happen if you run the "<%= config.bin %> project retrieve start" command. The table lists the metadata components that will be retrieved and deleted. The table also lists the current conflicts between files in your local project and components in the org. Finally, the table lists the files that won't be retrieved because they're included in your .forceignore file.

If your org allows source tracking, then this command displays potential conflicts between the org and your local project. Some orgs, such as production org, never allow source tracking. Source tracking is enabled by default on scratch and sandbox orgs; you can disable source tracking when you create the orgs by specifying the --no-track-source flag on the "<%= config.bin %> org create scratch|sandbox" commands.

# examples

- Preview the retrieve of all changes from your default org:

  <%= config.bin %> <%= command.id %>

- Preview the retrieve when ignoring any conflicts from an org with alias "my-scratch":

  <%= config.bin %> <%= command.id %> --ignore-conflicts --target-org my-scratch

# flags.ignore-conflicts.summary

Don't display conflicts in the preview of the retrieval.

# flags.ignore-conflicts.description

This flag applies only to orgs that allow source tracking. It has no effect on orgs that don't allow it, such as production orgs.

# flags.concise.summary

Show only the changes that will be retrieved; omits files that are forceignored.

# flags.api-version.summary

Target API version for the deploy.

# flags.api-version.description

Use this flag to override the default API version with the API version of your package.xml file. The default API version is the latest version supported by the CLI.

# error.Conflicts

There are local changes that conflict with the remote changes that would be retrieved.

# error.Conflicts.Actions

- To overwrite the remote changes, run the "project deploy start" command with the --ignore-conflicts flag.

- To overwrite the local changes, run the "project retrieve start" command with the --ignore-conflicts flag.
