# summary

Deploy a project interactively to any Salesforce environment.

# description

This command must be run from within a project.

The command first analyzes your project, your active or logged-into environments, and local defaults to determine what to deploy and where to deploy it. The command then prompts you for information about this particular deployment and provides intelligent choices based on its analysis.

For example, if your local project contains a source directory with metadata files in source format, the command asks if you want to deploy that Salesforce app to an org. The command lists your connected orgs and asks which one you want to deploy to. The list of orgs starts with scratch orgs, ordered by expiration date with the most recently created one first, and then Dev Hub and production orgs ordered by name. If the command finds Apex tests, it asks if you want to run them and at which level.

The command stores your responses in the "deploy-options.json" file in your local project directory and uses them as defaults when you rerun the command. Specify --interactive to force the command to reprompt.

Use this command for quick and simple deploys. For more complicated deployments, use the environment-specific commands, such as "sf project deploy start", that provide additional flags.

# examples

- Deploy a project and use stored values from a previous command run:

  <%= config.bin %> <%= command.id %>

- Reprompt for all deployment inputs:

  <%= config.bin %> <%= command.id %> --interactive

# flags.interactive.summary

Force the CLI to prompt for all deployment inputs.

# errors.NoOrgsToSelect

Can't find any active scratch orgs, Dev Hubs, or other orgs.
Either log into an org or create a scratch org, and then try again.

# error.initialization

One or more initialization steps failed.

# error.initialization.title

Initialization Failures. The following table describes each failure:

# error.UserTerminatedDeployForExpiredOrg

The target-org found in the configuration is expired. The user terminated the deploy.

# warning.TargetOrgIsExpired

The target-org, "%s", is expired. Do you want to pick another org?

# AnalyzingProject

Analyzing project

# UsingOptionsFromFile

Using options found in %s.

# FoundNothingToDeploy

Found nothing in the project to deploy.

# NothingSelectedToDeploy

Nothing was selected to deploy.

# DeployOptionsSavedToFile

Your deploy options have been saved to %s.

# DeployOptionsIncludedInGitIgnore

We added %s to the .gitignore for you.

# DeployersHaveNonZeroExitCode

One or more of the selected deployers exited with a non-zero exit code.

# DeployerExitCode

Deployer "%s" exited with code %d.

# save.as.default

Save username %s as default?

# deprecation

The top-level deploy command is deprecated. You should use `functions deploy` to deploy functions, and use `project deploy start` to deploy metadata to Salesforce orgs.
