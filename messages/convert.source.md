# summary

convert source into Metadata API format

# description

convert source into Metadata API format
Converts source-formatted files into metadata that you can deploy using Metadata API.
To convert source-formatted files into the metadata format, so that you can deploy them using Metadata API,
run "<%= config.bin %> project convert mdapi". Then deploy the metadata using "<%= config.bin %> project deploy".

To convert Metadata API–formatted files into the source format, run "<%= config.bin %> project convert mdapi".

To specify a package name that includes spaces, enclose the name in single quotes.

# examples

- $ <%= config.bin %> <%= command.id %> -r path/to/source

- $ <%= config.bin %> <%= command.id %> -r path/to/source -d path/to/outputdir -n 'My Package'

# flags.root-dir

a source directory other than the default package to convert

# flags.output-dir

output directory to store the Metadata API–formatted files in

# flags.package-name

name of the package to associate with the metadata-formatted files

# flags.manifest

file path to manifest (package.xml) of metadata types to convert.

# flags.source-dir

comma-separated list of paths to the local source files to convert

# flags.metadata

comma-separated list of metadata component names to convert

# flagsLong.manifest

- The complete path to the manifest (package.xml) file that specifies the metadata types to convert.

- If you specify this parameter, don’t specify --metadata or --source-dir.

# flagsLong.source-dir

- A comma-separated list of paths to the local source files to convert. The supplied paths can be to a single file (in which case the operation is applied to only one file) or to a folder (in which case the operation is applied to all metadata types in the directory and its sub-directories).

- If you specify this parameter, don’t specify --manifest or --metadata.

# success

Source was successfully converted to Metadata API format and written to the location: %s

# convertFailed

Failed to convert source
