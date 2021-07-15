# Add a new project command

The project plugin does not have any commands for deploying or or retrieving specific pieces of a salesforce project (e.g. metadata to a scratch or functions to a compute environment). Instead, we ask developers to create their own plugin with those commands. In order for the `deploy` or `retrieve` commands to know about the individual plugins, each plugin must implement an [oclif hook](https://oclif.io/docs/hooks) which returns [`Deployers`](https://github.com/salesforcecli/plugin-deploy-retrieve-utils/blob/main/src/deployer.ts) and `Retirevers`.

This method allows developers to own their own plugins while also allowing a simple way for the overarching `project` topic to interact with those plugins.

## Deploy

To implement the oclif hook for the deploy commands, you must implement a `project:findDeployers` hook in your project. To do this you need to specify the location of the hook in your package.json and implement the hook. For example, in your package.json

```json
"oclif": {
  "hooks": {
    "project:findDeployers": "./lib/hooks/findDeployers"
  }
}
```

And then in your code, you'll have a `findDeployers.ts` file under the `hooks` directory. Here's an example of a very basic implementation:

```typescript
// hooks/findDeployers.ts
import { Deployer, Options } from '@salesforce/plugin-deploy-retrieve-utils';

const hook = async function (options: Options): Promise<Deployer[]> {
  return []; // return your Deployers here
};

export default hook;
```

### Deployers

The [Deployer class](https://github.com/salesforcecli/plugin-deploy-retrieve-utils/blob/main/src/deployer.ts) is a simple interface for setting up and executing deploys. It has two primary methods, `setup` and `deploy`.

The `setup` method allows developers to do any setup that's required before a deploy can be executed. This could be anything - in some cases you might need to prompt the user for additional information or in other cases you might need to do some environment setup.

The `deploy` method is where you will write the code that executes the deploy. Again, developers have full autonomy over how this is implemented.
