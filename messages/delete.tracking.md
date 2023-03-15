# resetDescription

reset local and remote source tracking

WARNING: This command deletes or overwrites all existing source tracking files. Use with extreme caution.

Resets local and remote source tracking so that the CLI no longer registers differences between your local files and those in the org. When you next run force:source:status, the CLI returns no results, even though conflicts might actually exist. The CLI then resumes tracking new source changes as usual.

Use the --revision parameter to reset source tracking to a specific revision number of an org source member. To get the revision number, query the SourceMember Tooling API object with the force:data:soql:query command. For example:
$ sfdx force:data:soql:query -q "SELECT MemberName, MemberType, RevisionCounter FROM SourceMember" -t

# deleteDescription

delete all local source tracking information

WARNING: This command deletes or overwrites all existing source tracking files. Use with extreme caution.

Deletes all local source tracking information. When you next run 'project deploy preview', the CLI displays all local and remote files as changed, and any files with the same name are listed as conflicts.

# no-promptDescription

do not prompt for source tracking override confirmation

# revisionDescription

reset to a specific SourceMember revision counter number

# promptMessage

WARNING: This operation will modify all your local source tracking files. The operation can have unintended consequences on all the force:source commands. Are you sure you want to proceed?

# conflictMsg

We couldn't complete the operation due to conflicts. Verify that you want to keep the existing versions, then run the command again with the --forceoverwrite (-f) option.