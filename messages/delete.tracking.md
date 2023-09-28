# resetSummary

Reset local and remote source tracking.

# resetDescription

WARNING: This command deletes or overwrites all existing source tracking files. Use with extreme caution.

Resets local and remote source tracking so that Salesforce CLI no longer registers differences between your local files and those in the org. When you next run 'project deploy preview', Salesforce CLI returns no results, even though conflicts might actually exist. Salesforce CLI then resumes tracking new source changes as usual.

Use the --revision parameter to reset source tracking to a specific revision number of an org source member. To get the revision number, query the SourceMember Tooling API object with the 'data soql' command. For example:

    <%= config.bin %> data query --query "SELECT MemberName, MemberType, RevisionCounter FROM SourceMember" --use-tooling-api --target-org my-scratch

# resetExample

- Reset source tracking for the org with alias "my-scratch":

  $ <%= config.bin %> <%= command.id %> --target-org my-scratch

- Reset source tracking to revision number 30 for your default org:

  $ <%= config.bin %> <%= command.id %> --revision 30

# deleteExample

- Delete local source tracking for the org with alias "my-scratch":

  $ <%= config.bin %> <%= command.id %> --target-org my-scratch

# deleteSummary

Delete all local source tracking information.

# deleteDescription

WARNING: This command deletes or overwrites all existing source tracking files. Use with extreme caution.

Deletes all local source tracking information. When you next run 'project deploy preview', Salesforce CLI displays all local and remote files as changed, and any files with the same name are listed as conflicts.

# flags.no-prompt.summary

Don't prompt for source tracking override confirmation.

# flags.revision.summary

SourceMember revision counter number to reset to.

# promptMessage

WARNING: This operation will modify all your local source tracking files. The operation can have unintended consequences on all the "project deploy" and "project retrieve" commands. Are you sure you want to proceed?

# conflictMsg

We couldn't complete the operation due to conflicts. Verify that you want to keep the existing versions, then run the command again with the --forceoverwrite (-f) flag.
