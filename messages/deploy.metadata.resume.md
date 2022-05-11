# summary

Resume watching a deploy operation.

# description

Use this command to resume watching a deploy operation if the original command times out or you specified the --async flag. Deploy operations include standard deploys, quick deploys, deploy validations, and deploy cancellations. This command doesn't resume the original operation itself, because the operation always continues after you've started it, regardless of whether you're watching it or not.

Run this command by either passing it a job ID or specifying the --use-most-recent flag to use the job ID of the most recent deploy operation.

# examples

- Resume watching a deploy operation using a job ID:

      <%= config.bin %> <%= command.id %> --job-id 0Af0x000017yLUFCA2

- Resume watching the most recent deploy operation:

      <%= config.bin %> <%= command.id %> --use-most-recent

# flags.job-id.summary

Job ID of the deploy operation you want to resume.

# flags.job-id.description

These commands return a job ID if they time out or you specified the --async flag:

- sf deploy metadata
- sf deploy metadata validate
- sf deploy metadata quick
- sf deploy metadata cancel

The job ID is valid for 10 days from when you started the deploy operation.

# flags.use-most-recent.summary

Use the job ID of the most recent deploy operation.

# flags.use-most-recent.description

For performance reasons, this flag uses job IDs for deploy operations that started only in the past 3 days or less. If your most recent operation was more than 3 days ago, this flag won't find a job ID.

# flags.wait.summary

Number of minutes to wait for the command to complete and display results.

# flags.wait.description

If the command continues to run after the wait period, the CLI returns control of the terminal window to you. To resume watching the deploy operation, run this command again. To check the status of the deploy operation, run "sf deploy metadata report".

# flags.verbose.summary

Show verbose output of the deploy operation result.

# flags.concise.summary

Show concise output of the deploy operation result.

# error.DeployNotResumable

Job ID %s is not resumable with status %s.
