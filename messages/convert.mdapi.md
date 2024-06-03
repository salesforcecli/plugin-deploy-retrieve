# summary

Convert metadata retrieved via Metadata API into the source format used in Salesforce DX projects.

# description

To use Salesforce CLI to work with components that you retrieved via Metadata API, first convert your files from the metadata format to the source format using this command.

To convert files from the source format back to the metadata format, run "sf project convert source".

To convert multiple metadata components, either set multiple --metadata <name> flags or a single --metadata flag with multiple names separated by spaces. Enclose names that contain spaces in one set of double quotes. The same syntax applies to --manifest and --source-dir.

# examples

- Convert metadata formatted files in the specified directory into source formatted files; writes converted files to your default package directory:

  $ <%= config.bin %> <%= command.id %> --root-dir path/to/metadata

- Similar to previous example, but writes converted files to the specified output directory:

  $ <%= config.bin %> <%= command.id %> --root-dir path/to/metadata --output-dir path/to/outputdir

# flags.root-dir.summary

Root directory that contains the Metadata API–formatted metadata.

# flags.output-dir.summary

Directory to store your files in after they’re converted to source format; can be an absolute or relative path.

# flags.manifest.summary

File path to manifest (package.xml) of metadata types to convert.

# flags.metadata-dir.summary

Root of directory or zip file of metadata formatted files to convert.

# flags.metadata.summary

Metadata component names to convert.

# flags.manifest.description

If you specify this parameter, don’t specify --metadata or --source-dir.

# flags.metadata-dir.description

The supplied paths can be to a single file (in which case the operation is applied to only one file) or to a folder (in which case the operation is applied to all metadata types in the directory and its sub-directories).

If you specify this flag, don’t specify --manifest or --metadata. If the comma-separated list you’re supplying contains spaces, enclose the entire comma-separated list in one set of double quotes.

# expectedDirectory

Expected a directory but found a file.

# expectedFile

Expected a file but found a directory.

# InvalidFlagPath

The %s command parameter specifies an invalid path: %s
%s

# notFound

No such file or directory.
