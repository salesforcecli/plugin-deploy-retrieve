# summary

Check your local project package directories for forceignored files.

# description

When deploying or retrieving metadata between your local project and an org, you can specify the source files you want to exclude with a .forceignore file. The .forceignore file structure mimics the .gitignore structure. Each line in .forceignore specifies a pattern that corresponds to one or more files. The files typically represent metadata components, but can be any files you want to exclude, such as LWC configuration JSON files or tests.

# examples

- List all the files in all package directories that are ignored:

  <%= config.bin %> <%= command.id %>

- List all the files in a specific directory that are ignored:

  <%= config.bin %> <%= command.id %> --source-dir force-app

- Check if a particular file is ignored:

  <%= config.bin %> <%= command.id %> --source-dir package.xml

# flags.source-dir.summary

File or directory of files that the command checks for foreceignored files.

# invalidSourceDir

File or directory '%s' doesn't exist in your project. Specify one that exists and rerun the command.
