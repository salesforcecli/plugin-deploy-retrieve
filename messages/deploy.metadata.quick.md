# summary

Quickly deploy a validated deployment to an org.

# description

Before you run this command, first create a validated deployment with the "<%= config.bin %> project deploy validate" command, which returns a job ID. Validated deployments haven't been deployed to the org yet; you deploy them with this command. Either pass the job ID to this command or use the --use-most-recent flag to use the job ID of the most recently validated deployment. For the quick deploy to succeed, the associated validated deployment must also have succeeded.

Executing this quick deploy command takes less time than a standard deploy because it skips running Apex tests. These tests were previously run as part of the validation. Validating first and then running a quick deploy is useful if the deployment to your production org take several hours and you don’t want to risk a failed deploy.

This command doesn't support source-tracking. The source you deploy overwrites the corresponding metadata in your org. This command doesn’t attempt to merge your source with the versions in your org.

Note: Don't use this command on sandboxes; the command is intended to be used on production orgs. By default, sandboxes don't run tests during a deploy. Use "<%= config.bin %> project deploy start" instead.

# examples

- Run a quick deploy to your default org using a job ID:

      <%= config.bin %> <%= command.id %> --job-id 0Af0x000017yLUFCA2

- Asynchronously run a quick deploy of the most recently validated deployment to an org with alias "my-prod-org":

      <%= config.bin %> <%= command.id %> --async --use-most-recent --target-org my-prod-org

# flags.job-id.summary

Job ID of the deployment you want to quick deploy.

# flags.job-id.description

The job ID is valid for 10 days from when you started the validation.

# flags.use-most-recent.summary

Use the job ID of the most recently validated deployment.

# flags.use-most-recent.description

For performance reasons, this flag uses only job IDs that were validated in the past 3 days or less. If your most recent deployment validation was more than 3 days ago, this flag won't find a job ID.

# flags.api-version.summary

Target API version for the deploy.

# flags.api-version.description

Use this flag to override the default API version with the API version of your package.xml file. The default API version is the latest version supported by the CLI.

# flags.wait.summary

Number of minutes to wait for the command to complete and display results.

# flags.wait.description

If the command continues to run after the wait period, the CLI returns control of the terminal window to you. To resume watching the deploy, run "<%= config.bin %> project deploy resume". To check the status of the deploy, run "<%= config.bin %> project deploy report".

# flags.verbose.summary

Show verbose output of the deploy result.

# flags.concise.summary

Show concise output of the deploy result.

# flags.async.summary

Run the command asynchronously.

# flags.async.description

The command immediately returns the control of the terminal to you. This way, you can continue to use the CLI. To resume watching the deploy, run "<%= config.bin %> project deploy resume". To check the status of the deploy, run "<%= config.bin %> project deploy report".

# error.CannotQuickDeploy

Job ID can't be used for quick deployment. Possible reasons include the deployment hasn't been validated, has already been deployed, or the validation expired because you ran it more than 10 days ago.

# error.QuickDeployFailure

Deployment %s exited with status code: %s.

# error.NoTargetOrg

No target org found in cache, from a flag, or in the environment.

# info.QuickDeploySuccess

Successfully deployed (%s).
