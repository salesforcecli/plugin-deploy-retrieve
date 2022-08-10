# summary

Preview a deployment to see what will deploy to the org, the potential conflicts, and the ignored files.

# description

You must run this command from within a project.

The command outputs a table that describes what will happen if you run the "sf deploy metadata" command. The table lists the metadata components that will be deployed and deleted. The table also lists the current conflicts between files in your local project and components in the org. Finally, the table lists the files that won't be deployed because they're included in your .forceignore file.

If your org allows source tracking, then this command considers conflicts between the org and local. Some orgs, such as production orgs, never allow source tracking. Use the "--no-track-source" flag when you create a scratch or sandbox org to disable source tracking.

To preview the deployment of multiple metadata components, either set multiple --metadata <name> flags or a single --metadata flag with multiple names separated by spaces. Enclose names that contain spaces in one set of double quotes. The same syntax applies to --manifest and --source-dir.

# examples

- NOTE: The commands to preview a deployment and actually deploy it use similar flags. We provide a few preview examples here, but see the help for "sf deploy metadata" for more examples that you can adapt for previewing.

- Preview the deployment of source files in a directory, such as force-app:

      <%= config.bin %> <%= command.id %>  --source-dir force-app

- Preview the deployment of all Apex classes:

      <%= config.bin %> <%= command.id %> --metadata ApexClass

- Preview deployment of a specific Apex class:

      <%= config.bin %> <%= command.id %> --metadata ApexClass:MyApexClass

- Preview deployment of all components listed in a manifest:

      <%= config.bin %> <%= command.id %> --manifest path/to/package.xml

# flags.target-org.summary

Login username or alias for the target org.

# flags.target-org.description

Overrides your default org.

# flags.metadata.summary

Metadata component names to preview.

# flags.source-dir.summary

Path to the local source files to preview.

# flags.source-dir.description

The supplied path can be to a single file (in which case the operation is applied to only one file) or to a folder (in which case the operation is applied to all metadata types in the directory and its subdirectories).

If you specify this flag, don’t specify --metadata or --manifest.

# flags.manifest.summary

Full file path for manifest (package.xml) of components to preview.

# flags.manifest.description

All child components are included. If you specify this flag, don’t specify --metadata or --source-dir.

# flags.ignore-conflicts.summary

Ignore conflicts and deploy local files, even if they overwrite changes in the org.

# flags.ignore-conflicts.description

This flag applies only to orgs that allow source tracking. It has no effect on orgs that don't allow it, such as production orgs.

# flags.concise.summary

Omit ignored files.

# flags.api-version.summary

Target API version for the preview.

# flags.api-version.description

Use this flag to override the default API version with the API version of your package.xml file. The default API version is the latest version supported by the CLI.

# error.Conflicts

There are changes in the org that conflict with the local changes you're trying to preview.

# error.Conflicts.Actions

- To overwrite the remote changes, rerun this command with the --ignore-conflicts flag.

- To overwrite the local changes, run the "sf retrieve metadata" command with the --ignore-conflicts flag.
