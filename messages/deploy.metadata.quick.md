# summary

Execute a deployment to a Salesforce org that's already been validated.

# description

You can create a validated deployment by running sf deploy metadata validate.

# examples

- Run a quick deployment:

      <%= config.bin %> <%= command.id %> --job-id 0Af0x000017yLUFCA2

# flags.job-id.summary

Job ID of the deployment you want to quick deploy.

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

# flags.verbose.summary

Show verbose output of the deploy result.

# flags.concise.summary

Show concise output of the deploy result.

# flags.async.summary

Run the command asynchronously. This will immediately return the job ID. This way, you can continue to use the CLI.

# flags.async.description

To check the status of the job, use sf deploy metadata report. To resume watching the job, use sf deploy metadata resume.

# error.InvalidJobId

No job found for ID: %s

# error.NoRecentJobId

There are no recent job ids available to quick deploy.

# error.CannotQuickDeploy

Job id cannot be used for quick deployment. This is likely because the deployment has not been validated.
