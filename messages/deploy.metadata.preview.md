# summary

Preview a deployment to see what will deploy, including any conflicts and ignored files

# description

You must run this command from within a project.

If your org allows source tracking, then this command considers conflicts between the org and local. Some orgs, such as production org, never allow source tracking. You can also use the "--no-track-source" flag when you create a scratch or sandbox org to disable source tracking.

To preview the deployment of multiple metadata components, either set multiple --metadata <name> flags or a single --metadata flag with multiple names separated by spaces. Enclose names that contain spaces in one set of double quotes. The same syntax applies to --manifest and --source-dir.

# examples

- Preview deployment of local changes to org

      <%= config.bin %> <%= command.id %>

- Preview deployment of source files in a directory:

      <%= config.bin %> <%= command.id %>  --source-dir path/to/source

- Preview deployment of a specific Apex class and the objects whose source is in a directory (both examples are equivalent):

      <%= config.bin %> <%= command.id %> --source-dir path/to/apex/classes/MyClass.cls path/to/source/objects
      <%= config.bin %> <%= command.id %> --source-dir path/to/apex/classes/MyClass.cls --source-dir path/to/source/objects

- Preview deployment of all Apex classes:

      <%= config.bin %> <%= command.id %> --metadata ApexClass

- Preview deployment of a specific Apex class:

      <%= config.bin %> <%= command.id %> --metadata ApexClass:MyApexClass

- Preview deployment of all custom objects and Apex classes (both examples are equivalent):

      <%= config.bin %> <%= command.id %> --metadata CustomObject ApexClass
      <%= config.bin %> <%= command.id %> --metadata CustomObject --metadata ApexClass

- Preview deployment of all Apex classes and a profile that has a space in its name:

      <%= config.bin %> <%= command.id %> --metadata ApexClass --metadata "Profile:My Profile"

- Preview deployment of all components listed in a manifest:

      <%= config.bin %> <%= command.id %> --manifest path/to/package.xml

# flags.target-org.summary

Login username or alias for the target org.

# flags.target-org.description

Overrides your default org.

# flags.metadata.summary

Metadata component names to deploy.

# flags.source-dir.summary

Path to the local source files to deploy.

# flags.source-dir.description

The supplied path can be to a single file (in which case the operation is applied to only one file) or to a folder (in which case the operation is applied to all metadata types in the directory and its subdirectories).

If you specify this flag, don’t specify --metadata or --manifest.

# flags.manifest.summary

Full file path for manifest (package.xml) of components to deploy.

# flags.manifest.description

All child components are included. If you specify this flag, don’t specify --metadata or --source-dir.

# flags.ignore-conflicts.summary

Ignore conflicts and deploy local files, even if they overwrite changes in the org.

# flags.ignore-conflicts.description

This flag applies only to orgs that allow source tracking. It has no effect on orgs that don't allow it, such as production orgs.

# flags.concise.summary

Omit ignored files

# flags.api-version.summary

Target API version for the deploy.

# flags.api-version.description

Use this flag to override the default API version, which is the latest version supported the CLI, with the API version of your package.xml file.

# error.Conflicts

There are changes in the org that conflict with the local changes you're trying to deploy.

# error.Conflicts.Actions

- To overwrite the remote changes, rerun this command with the --ignore-conflicts flag.

- To overwrite the local changes, run the "sf retrieve metadata" command with the --ignore-conflicts flag.
