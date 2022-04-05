# summary

Check the status of a deployment to a Salesforce org.

# description

TBD.

# examples

- Report a deployment:

      <%= config.bin %> <%= command.id %> --job-id 0Af0x000017yLUFCA2

# flags.job-id.summary

Job ID of the deployment you want to check the status of.

# flags.job-id.description

TBD.


# flags.use-most-recent.summary

Use the job id of the most recent deployment.

# flags.use-most-recent.description

TBD.

# error.InvalidJobId

No job found for ID: %s

# error.NoRecentJobId

There are no recent job ids available to report.
