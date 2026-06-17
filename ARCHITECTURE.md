# Screeps Bot Architecture

Цель: построить бота как распределенную систему управления экономикой, а не как набор ролей creep'ов.

Главная идея:

- `Empire` принимает глобальные решения.
- `RoomController` управляет отдельной комнатой.
- `TaskScheduler` превращает спрос системы в конкретные задачи.
- `SpawnPlanner` закрывает дефицит throughput через тела creep'ов.
- `CreepExecutor` только исполняет назначенную задачу.

## Принципы

1. Creep не принимает стратегических решений.
2. Роли не являются источником поведения. Роль можно использовать только как метку профиля тела или capability.
3. Все действия появляются из demand: добыть, перевезти, построить, починить, защитить, атаковать.
4. Планирование централизовано на уровне комнаты и империи.
5. Memory используется как KV-store для стабильного состояния, но состояние должно быть восстанавливаемым из мира.
6. CPU рассматривается как hard quota: каждая подсистема должна иметь bounded cost.

## Слои

```text
main loop
  |
  v
Kernel
  |
  +-- MemoryManager
  +-- Profiler
  +-- EmpirePlanner
  |     |
  |     +-- WorldGraph
  |     +-- ExpansionPlanner
  |     +-- MarketPlanner
  |     +-- MilitaryPlanner
  |
  +-- RoomController[]
  |     |
  |     +-- RoomStateScanner
  |     +-- RoomModeSelector
  |     +-- DemandPlanner
  |     +-- TaskScheduler
  |     +-- SpawnPlanner
  |     +-- TowerPlanner
  |     +-- ConstructionPlanner
  |
  +-- CreepExecutor[]
```

## Tick Pipeline

Порядок важен: сначала собрать состояние, потом построить demand, затем планировать spawn, затем исполнять.

```text
1. boot
   - очистить memory мертвых creep'ов
   - загрузить persistent state
   - инициализировать кеши

2. scan
   - просканировать owned rooms
   - просканировать visible remote rooms
   - обновить room snapshots
   - обновить world graph

3. plan empire
   - выбрать стратегический режим
   - оценить expansion targets
   - оценить remote mining targets
   - оценить угрозы

4. plan rooms
   - определить room mode
   - рассчитать demand
   - сгенерировать tasks
   - назначить tasks creep'ам
   - рассчитать spawn queue

5. execute
   - выполнить tower actions
   - выполнить creep tasks
   - выполнить spawn actions
   - выполнить market/terminal actions

6. persist
   - сохранить минимум долгоживущего состояния
   - записать метрики
```

## Core Data Model

### Room Snapshot

Snapshot является read-only моделью текущего tick.

```ts
interface RoomSnapshot {
  roomName: string;
  tick: number;
  controller?: Id<StructureController>;
  level: number;
  energyAvailable: number;
  energyCapacityAvailable: number;
  storageEnergy: number;
  terminalEnergy: number;
  hostiles: HostileSnapshot[];
  sources: SourceSnapshot[];
  minerals: MineralSnapshot[];
  structures: StructureSnapshot[];
  constructionSites: ConstructionSiteSnapshot[];
  droppedResources: ResourceSnapshot[];
  damagedStructures: StructureSnapshot[];
}
```

### Demand

Demand описывает потребность системы. Это еще не задача для конкретного creep'а.

```ts
interface Demand {
  id: string;
  roomName: string;
  kind:
    | "mine"
    | "haul"
    | "upgrade"
    | "build"
    | "repair"
    | "reserve"
    | "claim"
    | "defend"
    | "attack";
  priority: number;
  requiredWork?: number;
  requiredCarry?: number;
  requiredMove?: number;
  throughput?: number;
  distance?: number;
  targetId?: string;
  expires: number;
}
```

### Task

Task является конкретным исполнимым контрактом.

```ts
interface Task {
  id: string;
  roomName: string;
  type:
    | "harvest"
    | "withdraw"
    | "transfer"
    | "pickup"
    | "build"
    | "repair"
    | "upgrade"
    | "move"
    | "reserve"
    | "attack"
    | "heal";
  targetId: string;
  resourceType?: ResourceConstant;
  amount?: number;
  priority: number;
  assignedTo?: string;
  createdAt: number;
  expiresAt: number;
  requirements: CreepCapabilities;
}
```

### Creep Memory

Creep memory должна быть маленькой. Creep хранит только ссылку на задачу и минимальное runtime-состояние.

```ts
interface CreepMemory {
  taskId?: string;
  homeRoom: string;
  bodyProfile: BodyProfile;
  generation: number;
}
```

## Room Modes

Room mode выбирается каждый tick из состояния комнаты.

```text
bootstrap
  нет стабильной добычи, мало creep'ов, RCL низкий

economy
  базовая добыча и hauling покрыты

upgrade
  surplus energy идет в controller

buildout
  есть важные construction sites

defense
  есть hostiles или повреждения критических структур

recovery
  после атаки или экономического провала

remote
  комната обслуживает remote mining
```

Приоритеты по умолчанию:

```text
defense > recovery > bootstrap > economy > buildout > upgrade
```

## Task Scheduler

Scheduler делает три вещи:

1. Удаляет устаревшие задачи.
2. Генерирует новые задачи из demand.
3. Назначает задачи creep'ам по score.

Score должен учитывать:

- приоритет задачи;
- distance до target;
- capability тела;
- remaining TTL;
- уже несомый ресурс;
- стоимость переключения задачи.

Пример:

```text
score = priority * 1000
      - range * 10
      + capabilityMatch * 100
      + carriedResourceMatch * 50
      - taskSwitchPenalty
      - ttlRiskPenalty
```

## Body Planner

Body planner получает demand, energy budget и constraints комнаты.

Вместо `spawn builder`:

```text
нужно 15 WORK/tick на construction
комната имеет 800 energy capacity
расстояние до задач 20
нужен worker с WORK/CARRY/MOVE балансом
```

Профили тел:

```text
miner
  цель: source throughput
  метрика: WORK parts near source

hauler
  цель: carry throughput over distance
  метрика: CARRY capacity * trips per lifetime

worker
  цель: build/repair/upgrade flexibility
  метрика: WORK with enough CARRY and MOVE

claimer
  цель: claim/reserve throughput
  метрика: CLAIM parts and TTL timing

combat
  цель: damage/heal/tank
  метрика: damage per tick, healing per tick, effective hits
```

Hauler capacity:

```text
roundTripTicks = distance * 2
energyPerTrip = sourceOutputPerTick * roundTripTicks
carryParts = ceil(energyPerTrip / 50)
moveParts = ceil(carryParts / 2) on roads, carryParts off roads
```

## Spawn Planner

Spawn planner сравнивает demand и текущий fleet.

Вход:

- active creeps;
- assigned tasks;
- unfilled demand;
- room energy capacity;
- spawn availability;
- creep TTL.

Выход:

```ts
interface SpawnRequest {
  id: string;
  roomName: string;
  priority: number;
  body: BodyPartConstant[];
  memory: CreepMemory;
  reason: string;
  expiresAt: number;
}
```

Spawn queue сортируется по:

```text
emergency miner
emergency hauler
defense
bootstrap worker
economic throughput
remote mining
upgrade/build surplus
```

## World Graph

Граф нужен для empire-level решений и для room logistics.

Узлы:

- rooms;
- sources;
- controller;
- storage;
- terminal;
- spawn;
- exits;
- chokepoints.

Ребра:

- room adjacency;
- path cost;
- road coverage;
- danger score;
- logistics throughput.

```ts
interface GraphNode {
  id: string;
  kind: "room" | "source" | "storage" | "terminal" | "spawn" | "controller" | "exit";
  roomName: string;
  pos?: RoomPosition;
}

interface GraphEdge {
  from: string;
  to: string;
  cost: number;
  distance: number;
  danger: number;
  capacity?: number;
}
```

## Expansion Scoring

Expansion target score:

```text
score =
  sourceScore
  + mineralScore
  + controllerScore
  + neighborScore
  - distancePenalty
  - dangerPenalty
  - reservationPenalty
  - defenseCost
```

Минимальные признаки хорошей комнаты:

- 2 sources лучше, чем 1;
- короткий путь от текущей empire;
- безопасные exits;
- хороший remote cluster рядом;
- mineral полезен, но не важнее экономики;
- нет сильного соседа рядом.

## Defense Model

Defense planner должен быть отдельным от economy planner.

Состояния:

```text
safe
  нет угроз

watch
  hostile scout или непонятное движение

defend
  armed hostile в комнате

siege
  sustained attack, walls/ramparts под давлением

recover
  атака ушла, экономика восстанавливается
```

Реакции:

- towers target priority;
- safe mode trigger;
- rampart repair priority;
- emergency defenders;
- evacuation of remote workers;
- suspension of non-critical tasks.

## Memory Layout

```ts
interface Memory {
  empire: EmpireMemory;
  rooms: Record<string, RoomMemory>;
  creeps: Record<string, CreepMemory>;
  tasks: Record<string, Task>;
  graph: WorldGraphMemory;
  metrics: MetricsMemory;
}
```

Правило: Memory хранит только то, что дорого или невозможно восстановить из текущего tick.

Хранить можно:

- long-term room intel;
- remote room danger history;
- task assignments;
- planned base layout;
- path cache;
- metrics.

Не стоит хранить:

- текущий список structures;
- текущую энергию;
- transient hostile list;
- данные, которые дешево получить через `Room.find`.

## Suggested Source Layout

```text
src/
  main.ts
  kernel/
    Kernel.ts
    MemoryManager.ts
    Profiler.ts
  empire/
    EmpirePlanner.ts
    ExpansionPlanner.ts
    WorldGraph.ts
  room/
    RoomController.ts
    RoomStateScanner.ts
    RoomModeSelector.ts
    DemandPlanner.ts
    ConstructionPlanner.ts
    DefensePlanner.ts
    TowerPlanner.ts
  tasks/
    Task.ts
    TaskStore.ts
    TaskFactory.ts
    TaskScheduler.ts
    TaskScoring.ts
  creeps/
    CreepExecutor.ts
    actions/
      harvest.ts
      transfer.ts
      withdraw.ts
      build.ts
      repair.ts
      upgrade.ts
      combat.ts
  spawn/
    BodyPlanner.ts
    SpawnPlanner.ts
    SpawnQueue.ts
  logistics/
    LogisticsPlanner.ts
    Pathing.ts
  memory/
    schema.ts
    migrations.ts
  types/
    screeps.d.ts
```

## MVP Roadmap

### Phase 1: Kernel and stateless creep executor

- `main.ts` запускает kernel.
- `MemoryManager` чистит мертвых creep'ов.
- `RoomStateScanner` строит snapshot.
- `TaskStore` хранит tasks.
- `CreepExecutor` умеет исполнять базовые tasks.

Готово, когда creep не имеет hardcoded роли и выполняет назначенный task.

### Phase 2: Economy room loop

- Demand для mining, hauling, upgrade.
- Scheduler назначает harvest/transfer/upgrade.
- SpawnPlanner закрывает miner/hauler/worker demand.

Готово, когда одна комната стабильно добывает, переносит и апгрейдит controller.

### Phase 3: Build and repair

- Construction demand.
- Repair demand с cap по hits.
- Приоритеты build/repair против upgrade.

Готово, когда комната сама строит extensions, roads, containers и поддерживает repair budget.

### Phase 4: Remote mining

- Long-term intel для соседних комнат.
- Remote source scoring.
- Reserve/remote miner/remote hauler demand.
- Danger suspend для remote rooms.

Готово, когда remote mining окупается и отключается при угрозах.

### Phase 5: Defense

- Hostile classifier.
- Tower target policy.
- Emergency repair.
- Emergency defender spawn.
- Safe mode policy.

Готово, когда комната переживает basic raids без ручного вмешательства.

### Phase 6: Empire graph and expansion

- WorldGraph для owned + visible rooms.
- Expansion scoring.
- Claim/settle pipeline.
- Inter-room logistics.

Готово, когда бот сам выбирает и поднимает новую комнату.

## First Implementation Target

Первый рабочий vertical slice:

```text
RoomSnapshot
  -> DemandPlanner
  -> TaskFactory
  -> TaskScheduler
  -> CreepExecutor
  -> SpawnPlanner
```

Минимальные task types:

- `harvest`
- `transfer`
- `withdraw`
- `pickup`
- `upgrade`
- `build`

Минимальные body profiles:

- `miner`
- `hauler`
- `worker`

Это даст основу, на которую можно добавлять graph planning, remotes, defense и expansion без переписывания creep logic.

