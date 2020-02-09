# Learn Infrastructure

Import Lerna Repositories:
```
import { LernaArbiter } from '@linfra/arbiter';
const arbiter = LernaArbiter.create();
await arbiter.setLernaRepositories([
  `.`, // relative path to current folder 
]);
```

Build Linfra Modules:
```
await arbiter.buildLinfraModules({
  dockerConfig: {
    imagePrefix: 'app',
  },
});
```

Start all Docker Services in all Linfra Modules:
```
await arbiter.startAllDockerServices({
  dockerConfig: {
    imagePrefix: 'app',
  },
});
```

Stop all Docker Services in all Linfra Modules:
```
await arbiter.stopAllDockerServices({
  dockerConfig: {
    imagePrefix: 'app',
  },
});
```
