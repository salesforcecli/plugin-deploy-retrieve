# summary

Check or poll for the status of a deploy operation.

# description

Deploy operations include standard deploys, quick deploys, deploy validations, and deploy cancellations.

Run this command by either passing it a job ID or specifying the --use-most-recent flag to use the job ID of the most recent deploy operation. If you specify the --wait flag, the command polls for the status every second until the timeout of --wait minutes. If you don't specify the --wait flag, the command simply checks and displays the status of the deploy; the command doesn't poll for the status.

You typically don't specify the --target-org flag because the cached job already references the org to which you deployed. But if you run this command on a computer different than the one from which you deployed, then you must specify the --target-org and it must point to the same org.

This command doesn't update source tracking information.

# examples

- Check the status using a job ID:

      <%= config.bin %> <%= command.id %> --job-id 0Af0x000017yLUFCA2

- Check the status of the most recent deploy operation:

      <%= config.bin %> <%= command.id %> --use-most-recent

- Poll for the status using a job ID and target org:

      <%= config.bin %> <%= command.id %> --job-id 0Af0x000017yLUFCA2 --target-org me@my.org --wait 30

# flags.job-id.summary

Job ID of the deploy operation you want to check the status of.

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

For performance reasons, this flag uses job IDs for deploy operations that started only in the past 3 days or less. If your most recent operation was more than 3 days ago, this flag won't find a job ID.

# flags.junit.summary

Output JUnit test results.

# flags.results-dir.summary

Output directory for code coverage and JUnit results; defaults to the deploy ID.

# noOrgError

No environment found. Use -o or --target-org to specify an environment
