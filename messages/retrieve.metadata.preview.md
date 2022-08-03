# summary

Preview a retrieve to see what will retrieve, including any conflicts and ignored files

# description

You must run this command from within a project.

If your org allows source tracking, then this command considers conflicts between the org and local. Some orgs, such as production org, never allow source tracking. You can also use the "--no-track-source" flag when you create a scratch or sandbox org to disable source tracking.

# examples

- Preview retrieve of remote changes from org

      <%= config.bin %> <%= command.id %>

- Preview retrieve of remote changes from org, overwriting any local conflicts

      <%= config.bin %> <%= command.id %> --ignore-conflicts

# flags.target-org.summary

Login username or alias for the target org.

# flags.target-org.description

Overrides your default org.

# flags.ignore-conflicts.summary

Ignore conflicts and retrieve remote components, even if they overwrite local changes.

# flags.ignore-conflicts.description

This flag applies only to orgs that allow source tracking. It has no effect on orgs that don't allow it, such as production orgs.

# flags.concise.summary

Omit ignored files

# flags.api-version.summary

Target API version for the deploy.

# flags.api-version.description

Use this flag to override the default API version, which is the latest version supported the CLI, with the API version of your package.xml file.

# error.Conflicts

There are local changes that conflict with the remote changes that would retrieve.

# error.Conflicts.Actions

- To overwrite the remote changes, run the "sf deploy metadata" command with the --ignore-conflicts flag

- To overwrite the local changes, run the "sf retrieve metadata" command with the --ignore-conflicts flag.
