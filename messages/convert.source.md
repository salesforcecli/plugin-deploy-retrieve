# summary

Convert source-formatted files into metadata that you can deploy using Metadata API.

# description

To convert source-formatted files into the metadata format, so that you can deploy them using Metadata API, run this command. Then deploy the metadata using "<%= config.bin %> project deploy".

To convert Metadata API–formatted files into the source format, run "<%= config.bin %> project convert mdapi".

To specify a package name that includes spaces, enclose the name in single quotes.

# examples

- Convert source-formatted files in the specified directory into metadata-formatted files; writes converted files into a new directory:

  $ <%= config.bin %> <%= command.id %> --root-dir path/to/source

- Similar to previous example, but writes converted files to the specified output directory and associates the files with the specified package:

  $ <%= config.bin %> <%= command.id %> --root-dir path/to/source --output-dir path/to/outputdir --package-name 'My Package'

# flags.root-dir.summary

Source directory other than the default package to convert.

# flags.output-dir.summary

Output directory to store the Metadata API–formatted files in.

# flags.package-name.summary

Name of the package to associate with the metadata-formatted files.

# flags.manifest.summary

Path to the manifest (package.xml) file that specifies the metadata types to convert.

# flags.source-dir.summary

Comma-separated list of paths to the local source files to convert.

# flags.metadata.summary

Comma-separated list of metadata component names to convert.

# flags.manifest.description

If you specify this parameter, don’t specify --metadata or --source-dir.

# flags.source-dir.description

The supplied paths can be to a single file (in which case the operation is applied to only one file) or to a folder (in which case the operation is applied to all metadata types in the directory and its sub-directories).

If you specify this parameter, don’t specify --manifest or --metadata.

# success

Source was successfully converted to Metadata API format and written to the location: %s

# convertFailed

Failed to convert source
