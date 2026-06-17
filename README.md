# screeps-lav

Task-based Screeps bot scaffold.

## Commands

```sh
npm install
npm run typecheck
npm run build
```

Build output:

```text
dist/main.js
```

## Deploy Through GitHub Actions

This repo is designed to keep TypeScript source code on GitHub and deploy the compiled bundle to Screeps from GitHub Actions.

Flow:

```text
push to GitHub main
  -> GitHub Actions runs typecheck and build
  -> dist/main.js is posted to Screeps API
  -> Screeps updates the selected code branch
```

Setup:

1. Create a Screeps auth token:

   ```text
   Screeps account settings -> Auth Tokens -> Generate token
   ```

2. Add it to GitHub:

   ```text
   GitHub repository -> Settings -> Secrets and variables -> Actions
   -> New repository secret
   -> Name: SCREEPS_TOKEN
   -> Value: your token
   ```

3. Optional: set the target Screeps code branch:

   ```text
   GitHub repository -> Settings -> Secrets and variables -> Actions
   -> Variables -> New repository variable
   -> Name: SCREEPS_BRANCH
   -> Value: default
   ```

If `SCREEPS_BRANCH` is not set, the workflow deploys to Screeps branch `default`.

The deploy script uses the Screeps `/api/user/code` endpoint with the `X-Token` header.

## Current MVP

The bot already has the first vertical slice:

```text
RoomStateScanner
  -> DemandPlanner
  -> TaskFactory
  -> TaskStore
  -> TaskScheduler
  -> CreepExecutor
  -> SpawnPlanner
```

Implemented task types:

- `harvest`
- `transfer`
- `build`
- `repair`
- `upgrade`

Implemented body profile:

- `worker`

The current spawn planner keeps a small worker fleet per owned room. Creeps do not use role behavior; they execute the task assigned in `creep.memory.taskId`.

## Next Implementation Steps

1. Split `worker` demand into real `miner` and `hauler` body profiles.
2. Add dropped-resource `pickup` and container/storage `withdraw`.
3. Add task completion/release logic when a target is filled, built, or no longer valid.
4. Add lightweight CPU metrics around scanner, scheduler, executor, and spawn planner.
5. Add room modes: `bootstrap`, `economy`, `buildout`, `upgrade`.
