# summary

Cancel a deploy operation.

# description

Use this command to cancel a deploy operation that hasn't yet completed in the org. Deploy operations include standard deploys, quick deploys, deploy validations, and deploy cancellations.

Run this command by either passing it a job ID or specifying the --use-most-recent flag to use the job ID of the most recent deploy operation.

# examples

- Cancel a deploy operation using a job ID:

      <%= config.bin %> <%= command.id %> --job-id 0Af0x000017yLUFCA2

- Cancel the most recent deploy operation:

      <%= config.bin %> <%= command.id %> --use-most-recent

# flags.job-id.summary

Job ID of the deploy operation you want to cancel.

# flags.job-id.description

These commands return a job ID if they time out or you specified the --async flag:

- <%= config.bin %> project deploy start
- <%= config.bin %> project deploy validate
- <%= config.bin %> project deploy quick
- <%= config.bin %> project deploy cancel

The job ID is valid for 10 days from when you started the deploy operation.

# flags.use-most-recent.summary

Use the job ID of the most recent deploy operation.

# flags.use-most-recent.description

For performance reasons, this flag uses job IDs for deploy operations that started only in the past 3 days or less. If your most recent deploy operations was more than 3 days ago, this flag won't find a job ID.

# flags.wait.summary

Number of minutes to wait for the command to complete and display results.

# flags.wait.description

If the command continues to run after the wait period, the CLI returns control of the terminal window to you. To resume watching the cancellation, run "<%= config.bin %> project deploy resume". To check the status of the cancellation, run "<%= config.bin %> project deploy report".

# flags.async.summary

Run the command asynchronously.

# flags.async.description

The command immediately returns the control of the terminal to you. This way, you can continue to use the CLI. To resume watching the cancellation, run "<%= config.bin %> project deploy resume". To check the status of the cancellation, run "<%= config.bin %> project deploy report".

# error.CannotCancelDeploy

Can't cancel deploy because it's already completed.

# error.CannotCancelDeployPre

Can't cancel deploy with Job Id %s because it's already completed (status is %s)
