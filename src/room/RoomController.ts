import { SpawnPlanner } from "../spawn/SpawnPlanner";
import { TaskFactory } from "../tasks/TaskFactory";
import { TaskScheduler } from "../tasks/TaskScheduler";
import { TaskStore } from "../tasks/TaskStore";
import { DemandPlanner } from "./DemandPlanner";
import { RoomStateScanner } from "./RoomStateScanner";

export class RoomController {
  public constructor(
    private readonly scanner: RoomStateScanner,
    private readonly demandPlanner: DemandPlanner,
    private readonly taskFactory: TaskFactory,
    private readonly taskStore: TaskStore,
    private readonly taskScheduler: TaskScheduler,
    private readonly spawnPlanner: SpawnPlanner
  ) {}

  public run(room: Room): void {
    const snapshot = this.scanner.scan(room);
    const demands = this.demandPlanner.plan(snapshot);
    const tasks = demands.map(demand => this.taskFactory.fromDemand(demand));

    this.taskStore.upsertMany(tasks);
    this.taskScheduler.assign(room);
    this.spawnPlanner.run(room);
  }
}
