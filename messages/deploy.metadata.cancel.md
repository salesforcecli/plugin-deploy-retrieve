# summary

Cancel a deployment to a Salesforce org.

# description

Use this command to cancel a specified asynchronous deployment.

# examples

- Cacnel a deployment:

      <%= config.bin %> <%= command.id %> --job-id 0Af0x000017yLUFCA2

# flags.job-id.summary

Job ID of the deployment you want to cancel.

# flags.job-id.description

TBD.


# flags.use-most-recent.summary

Use the job id of the most recent deployment.

# flags.use-most-recent.description

TBD.

# flags.wait.summary

Number of minutes to wait for command to complete and display results.

# flags.wait.description

If the command continues to run after the wait period, the CLI returns control of the terminal window to you.

# error.InvalidJobId

No job found for ID: %s

# error.NoRecentJobId

There are no recent job ids available to cancel.

# error.CannotCancelDeploy

Cannot cancel deploy since it's already been completed.
