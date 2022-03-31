# summary

TBD.

# description

TBD.

# examples

- Run a validated deployment:

      <%= config.bin %> <%= command.id %> --job-id 0Af0x000017yLUFCA2

# flags.job-id.summary

TBD.

# flags.job-id.description

TBD.

# flags.use-most-recent.summary

TBD.

# flags.use-most-recent.description

TBD.

# flags.wait.summary

Number of minutes to wait for command to complete and display results.

# flags.wait.description

If the command continues to run after the wait period, the CLI returns control of the terminal window to you.

# error.InvalidJobId

No job found for ID: %s

# error.NoRecentJobId

There are no recent job ids available to resume.

# error.CannotQuickDeploy

Job id cannot be used for quick deployment. This is likely because the deployment has not been validated.
