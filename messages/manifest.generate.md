# summary

Create a project manifest that lists the metadata components you want to deploy or retrieve.

# description

Create a manifest from a list of metadata components (--metadata) or from one or more local directories that contain source files (--source-dir). You can specify either of these flags, not both.

Use --type to specify the type of manifest you want to create. The resulting manifest files have specific names, such as the standard package.xml or destructiveChanges.xml to delete metadata. Valid values for this flag, and their respective file names, are:

    * package : package.xml (default)
    * pre : destructiveChangesPre.xml
    * post : destructiveChangesPost.xml
    * destroy : destructiveChanges.xml

See https://developer.salesforce.com/docs/atlas.en-us.api_meta.meta/api_meta/meta_deploy_deleting_files.htm for information about these destructive manifest files.

Use --name to specify a custom name for the generated manifest if the pre-defined ones don’t suit your needs. You can specify either --type or --name, but not both.

To include multiple metadata components, either set multiple --metadata <name> flags or a single --metadata flag with multiple names separated by spaces. Enclose names that contain spaces in one set of double quotes. The same syntax applies to --include-packages and --source-dir.

To build a manifest from the metadata in an org, use the --from-org flag. You can combine --from-org with the --metadata flag to include only certain metadata types, or with the --excluded-metadata flag to exclude certain metadata types. When building a manifest from an org, the command makes many concurrent API calls to discover the metadata that exists in the org. To limit the number of concurrent requests, use the SF_LIST_METADATA_BATCH_SIZE environment variable and set it to a size that works best for your org and environment. If you experience timeouts or inconsistent manifest contents, then setting this environment variable can improve accuracy. However, the command takes longer to run because it sends fewer requests at a time.

# examples

- Create a manifest for deploying or retrieving all Apex classes and custom objects:

  $ <%= config.bin %> <%= command.id %> --metadata ApexClass --metadata CustomObject

- Create a manifest for deleting the specified Apex class:

  $ <%= config.bin %> <%= command.id %> --metadata ApexClass:MyApexClass --type destroy

- Create a manifest for deploying or retrieving all the metadata components in the specified local directory; name the file myNewManifest.xml:

  $ <%= config.bin %> <%= command.id %> --source-dir force-app --name myNewManifest

- Create a manifest from the metadata components in the specified org and include metadata in any unlocked packages:

  $ <%= config.bin %> <%= command.id %> --from-org test@myorg.com --include-packages unlocked

- Create a manifest from specific metadata types in an org:

  $ <%= config.bin %> <%= command.id %> --from-org test@myorg.com --metadata ApexClass,CustomObject,CustomLabels

- Create a manifest from all metadata components in an org excluding specific metadata types:

  $ <%= config.bin %> <%= command.id %> --from-org test@myorg.com --excluded-metadata StandardValueSet

# flags.include-packages.summary

Package types (managed, unlocked) whose metadata is included in the manifest; by default, metadata in managed and unlocked packages is excluded. Metadata in unmanaged packages is always included.

# flags.excluded-metadata.summary

Metadata types to exclude when building a manifest from an org. Specify the name of the type, not the name of a specific component.

# flags.from-org.summary

Username or alias of the org that contains the metadata components from which to build a manifest.

# flags.type.summary

Type of manifest to create; the type determines the name of the created file.

# flags.name.summary

Name of a custom manifest file to create.

# flags.output-dir.summary

Directory to save the created manifest.

# flags.source-dir.summary

Paths to the local source files to include in the manifest.

# flags.metadata.summary

Names of metadata components to include in the manifest.

# success

successfully wrote %s

# successOutputDir

successfully wrote %s to %s
