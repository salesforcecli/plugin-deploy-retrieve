# summary

Retrieve metadata from an org to your local project.

# description

You must run this command from within a project.

Metadata components are retrieved in source format by default. Retrieve them in metadata format by specifying the --target-metadata-dir flag, which retrieves the components into a ZIP file in the specified directory.

If your org allows source tracking, then this command tracks the changes in your source. Some orgs, such as production orgs, never allow source tracking. Source tracking is enabled by default on scratch and sandbox orgs; you can disable source tracking when you create the orgs by specifying the --no-track-source flag on the "<%= config.bin %> org create scratch|sandbox" commands.

To retrieve multiple metadata components, either use multiple --metadata <name> flags or use a single --metadata flag with multiple names separated by spaces. Enclose names that contain spaces in one set of double quotes. The same syntax applies to --manifest and --source-dir.

# examples

- Retrieve all remote changes from your default org:

  <%= config.bin %> <%= command.id %>

- Retrieve the source files in the "force-app" directory from an org with alias "my-scratch":

  <%= config.bin %> <%= command.id %> --source-dir force-app --target-org my-scratch

- Retrieve all the Apex classes and custom objects whose source is in the "force-app" directory. The list views, layouts, etc, that are associated with the custom objects are also retrieved. Both examples are equivalent:

  <%= config.bin %> <%= command.id %> --source-dir force-app/main/default/classes force-app/main/default/objects
  <%= config.bin %> <%= command.id %> --source-dir force-app/main/default/classes --source-dir force-app/main/default/objects

- Retrieve all Apex classes that are in all package directories defined in the "sfdx-project.json" file:

  <%= config.bin %> <%= command.id %> --metadata ApexClass

- Retrieve a specific Apex class; ignore any conflicts between the local project and org (be careful with this flag, because it will overwrite the Apex class source files in your local project if there are conflicts!):

  <%= config.bin %> <%= command.id %> --metadata ApexClass:MyApexClass --ignore-conflicts

- Retrieve specific Apex classes that match a pattern; in this example, retrieve Apex classes whose names contain the string "MyApex":

      <%= config.bin %> <%= command.id %> --metadata 'ApexClass:MyApex*'

- Retrieve a custom object called ExcitingObject that's in the SBQQ namespace:

      sf <%= command.id %> --metadata CustomObject:SBQQ__ExcitingObject

- Retrieve all custom objects in the SBQQ namespace by using a wildcard and quotes:

      sf <%= command.id %> --metadata 'CustomObject:SBQQ__*'

- Retrieve all custom objects and Apex classes found in all defined package directories (both examples are equivalent):

  <%= config.bin %> <%= command.id %> --metadata CustomObject ApexClass
  <%= config.bin %> <%= command.id %> --metadata CustomObject --metadata ApexClass

- Retrieve all metadata components listed in a manifest:

  <%= config.bin %> <%= command.id %> --manifest path/to/package.xml

- Retrieve metadata from a package:

  <%= config.bin %> <%= command.id %> --package-name MyPackageName

- Retrieve metadata from multiple packages, one of which has a space in its name (both examples are equivalent):

  <%= config.bin %> <%= command.id %> --package-name Package1 "PackageName With Spaces" Package3
  <%= config.bin %> <%= command.id %> --package-name Package1 --package-name "PackageName With Spaces" --package-name Package3

- Retrieve the metadata components listed in the force-app directory, but retrieve them in metadata format into a ZIP file in the "output" directory:

  <%= config.bin %> <%= command.id %> --source-dir force-app --target-metadata-dir output

- Retrieve in metadata format and automatically extract the contents into the "output" directory:

  <%= config.bin %> <%= command.id %> --source-dir force-app --target-metadata-dir output --unzip

# flags.api-version.summary

Target API version for the retrieve.

# flags.api-version.description

Use this flag to override the default API version, which is the latest version supported the CLI, with the API version in your package.xml file.

# flags.ignore-conflicts.summary

Ignore conflicts and retrieve and save files to your local filesystem, even if they overwrite your local changes.

# flags.ignore-conflicts.description

This flag applies only to orgs that allow source tracking. It has no effect on orgs that don't allow it, such as production orgs.

# flags.manifest.summary

File path for the manifest (package.xml) that specifies the components to retrieve.

# flags.manifest.description

If you specify this parameter, don’t specify --metadata or --source-dir.

# flags.metadata.summary

Metadata component names to retrieve. Wildcards (`*`) supported as long as you use quotes, such as `ApexClass:MyClass*`.

# flags.package-name.summary

Package names to retrieve. Use of this flag is for reference only; don't use it to retrieve packaged metadata for development.

# flags.package-name.description

The metadata of the supplied package name(s) will be retrieved into a child directory of the project. The name of that child directory matches the name of the package. The retrieved metadata is meant for your reference only, don't add it to a source control system for development and deployment. For package development, retrieve the metadata using a manifest (`--manifest` flag) or by targeting a source controlled package directory within your project (`--source-dir` flag).

# flags.source-dir.summary

File paths for source to retrieve from the org.

# flags.source-dir.description

The supplied paths can be to a single file (in which case the operation is applied to only one file) or to a folder (in which case the operation is applied to all source files in the directory and its subdirectories).

# flags.wait.summary

Number of minutes to wait for the command to complete and display results to the terminal window.

# flags.wait.description

If the command continues to run after the wait period, the CLI returns control of the terminal window to you.

# flags.metadata-dir.summary

Root of directory or zip file of metadata formatted files to retrieve.

# flags.single-package.summary

Indicates that the zip file points to a directory structure for a single package.

# flags.target-metadata-dir.summary

Directory that will contain the retrieved metadata format files or ZIP.

# flags.unzip.summary

Extract all files from the retrieved zip file.

# flags.zip-file-name.summary

File name to use for the retrieved zip file.

# spinner.start

Preparing retrieve request

# spinner.sending

Sending request to org

# spinner.polling

Waiting for the org to respond

# error.Conflicts

There are changes in your local files that conflict with the org changes you're trying to retrieve.

# error.Conflicts.Actions

- To overwrite the local changes, rerun this command with the --ignore-conflicts flag.

- To overwrite the remote changes, run the "sf project deploy start" command with the --ignore-conflicts flag.

# info.WroteZipFile

Wrote retrieve zip file to %s.

# info.ExtractedZipFile

Extracted %s to %s.

# flags.output-dir.description

The root of the directory structure into which the source files are retrieved.
If the target directory matches one of the package directories in your sfdx-project.json file, the command fails.
Running the command multiple times with the same target adds new files and overwrites existing files.

# flags.output-dir.summary

Directory root for the retrieved source files.

# retrieveTargetDirOverlapsPackage

The retrieve target directory [%s] overlaps one of your package directories. Specify a different retrieve target directory and try again.

# apiVersionMsgDetailed

%s %s metadata from %s using the v%s SOAP API

# wantsToRetrieveCustomFields

Because you're retrieving one or more CustomFields that you didn't specify the name for, we're also retrieving the CustomObject to which they're associated.

# noSourceTracking

Unable to track changes in your source files.
This command expects the org to support source tracking. If it doesn't, you must specify the metadata you want to retrieve.

# noSourceTracking.actions

- Use the `--source-dir`, `--manifest` or `--package-name` flags to retrieve metadata in source format.

- Use the `--target-metadata-dir` flag to retrieve metadata in metadata format to a directory.
