# summary

Deploy a project interactively to any Salesforce environment.

# description

This command must be run from within a project.

The command first analyzes your project, your active or logged-into environments, and local defaults to determine what to deploy and where to deploy it. The command then prompts you for information about this particular deployment and provides intelligent choices based on its analysis.

For example, if your local project contains a source directory with metadata files in source format, the command asks if you want to deploy that Salesforce app to an org. The command lists your connected orgs and asks which one you want to deploy to. The list of orgs starts with scratch orgs, ordered by expiration date with the most recently created one first, and then Dev Hub and production orgs ordered by name. If the command finds Apex tests, it asks if you want to run them and at which level.

The command stores your responses in the "deploy-options.json" file in your local project directory and uses them as defaults when you rerun the command. Specify --interactive to force the command to reprompt.

Use this command for quick and simple deploys. For more complicated deployments, use the environment-specific commands, such as "sf deploy metadata", that provide additional flags.

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
