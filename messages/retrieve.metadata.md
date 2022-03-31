# summary

Retrieve metadata in source format from an org to your local project.

# description

You must run this command from within a project.

This command doesn't support source-tracking. The source you retrieve overwrites the corresponding source files in your local project. This command doesn’t attempt to merge the source from your org with your local source files.

To retrieve multiple metadata components, either use multiple --metadata <name> flags or use a single --metadata flag with multiple names separated by spaces. Enclose names that contain spaces in one set of double quotes. The same syntax applies to --manifest and --source-dir.

# examples

- Retrieve the source files in a directory:

  <%= config.bin %> <%= command.id %> --source-dir path/to/source

- Retrieve a specific Apex class and the objects whose source is in a directory (both examples are equivalent):

  <%= config.bin %> <%= command.id %> --source-dir path/to/apex/classes/MyClass.cls path/to/source/objects
  <%= config.bin %> <%= command.id %> --source-dir path/to/apex/classes/MyClass.cls --source-dir path/to/source/objects

- Retrieve all Apex classes:

  <%= config.bin %> <%= command.id %> --metadata ApexClass

- Retrieve a specific Apex class:

  <%= config.bin %> <%= command.id %> --metadata ApexClass:MyApexClass

- Retrieve all custom objects and Apex classes (both examples are equivalent):

  <%= config.bin %> <%= command.id %> --metadata CustomObject ApexClass
  <%= config.bin %> <%= command.id %> --metadata CustomObject --metadata ApexClass

- Retrieve all metadata components listed in a manifest:

  <%= config.bin %> <%= command.id %> --manifest path/to/package.xml

- Retrieve metadata from a package:

  <%= config.bin %> <%= command.id %> --package-name MyPackageName

- Retrieve metadata from multiple packages, one of which has a space in its name (both examples are equivalent):

  <%= config.bin %> <%= command.id %> --package-name Package1 "PackageName With Spaces" Package3
  <%= config.bin %> <%= command.id %> --package-name Package1 --package-name "PackageName With Spaces" --package-name Package3

# flags.api-version.summary

Target API version for the retrieve.

# flags.api-version.description

Use this flag to override the default API version, which is the latest version supported the CLI, with the API version in your package.xml file.

# flags.manifest.summary

File path for the manifest (package.xml) that specifies the components to retrieve.

# flags.manifest.description

If you specify this parameter, don’t specify --metadata or --source-dir.

# flags.metadata.summary

Metadata component names to retrieve.

# flags.package-name.summary

Package names to retrieve.

# flags.source-dir.summary

File paths for source to retrieve from the org.

# flags.source-dir.description

The supplied paths can be to a single file (in which case the operation is applied to only one file) or to a folder (in which case the operation is applied to all source files in the directory and its subdirectories).

# flags.target-org.summary

Login username or alias for the target org.

# flags.target-org.description

Overrides your default org.

# flags.wait.summary

Number of minutes to wait for the command to complete and display results to the terminal window.

# flags.wait.description

If the command continues to run after the wait period, the CLI returns control of the terminal window to you.

# spinner.start

Preparing retrieve request

# spinner.sending

Sending request to org (metadata API version %s)

# spinner.polling

Waiting for the org to respond
