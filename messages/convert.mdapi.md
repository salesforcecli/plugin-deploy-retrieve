# summary

convert metadata from the Metadata API format into the source format

# description

Converts metadata retrieved via Metadata API into the source format used in Salesforce DX projects.

To use Salesforce CLI to work with components that you retrieved via Metadata API, first convert your files from the metadata format to the source format using "sfdx force:mdapi:convert".

To convert files from the source format back to the metadata format, so that you can deploy them using "<%= config.bin %> project deploy", run "<%= config.bin %> project convert source".

# examples

- $ <%= config.bin %> <%= command.id %> -r path/to/metadata

- $ <%= config.bin %> <%= command.id %> -r path/to/metadata -d path/to/outputdir

# flags.root-dir

the root directory containing the Metadata API–formatted metadata

# flags.output-dir

the output directory to store the source–formatted files

# flags.manifest

file path to manifest (package.xml) of metadata types to convert.

# flags.metadata-path

comma-separated list of metadata file paths to convert

# flags.metadata

comma-separated list of metadata component names to convert

# flagsLong.root-dir

The root directory that contains the metadata you retrieved using Metadata API.

# flagsLong.output-dir

The directory to store your files in after they’re converted to the source format. Can be an absolute or relative path.

# flagsLong.manifest

- The complete path to the manifest (package.xml) file that specifies the metadata types to convert.

- If you specify this parameter, don’t specify --metadata or --source-path.

# flagsLong.metadata-path

- A comma-separated list of paths to the local metadata files to convert. The supplied paths can be to a single file (in which case the operation is applied to only one file) or to a folder (in which case the operation is applied to all metadata types in the directory and its sub-directories).

- If you specify this parameter, don’t specify --manifest or --metadata. If the comma-separated list you’re supplying contains spaces, enclose the entire comma-separated list in one set of double quotes.

# flagsLong.metadata

A comma-separated list of metadata component names to convert.

# expectedDirectory

Expected a directory but found a file.

# expectedFile

Expected a file but found a directory.

# InvalidFlagPath

The %s command parameter specifies an invalid path: %s
%s

# notFound

No such file or directory.
