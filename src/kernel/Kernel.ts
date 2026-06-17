import { CreepExecutor } from "../creeps/CreepExecutor";
import { DemandPlanner } from "../room/DemandPlanner";
import { RoomController } from "../room/RoomController";
import { RoomStateScanner } from "../room/RoomStateScanner";
import { BodyPlanner } from "../spawn/BodyPlanner";
import { SpawnPlanner } from "../spawn/SpawnPlanner";
import { TaskFactory } from "../tasks/TaskFactory";
import { TaskScheduler } from "../tasks/TaskScheduler";
import { TaskStore } from "../tasks/TaskStore";

export class Kernel {
  private readonly taskStore = new TaskStore();
  private readonly roomController = new RoomController(
    new RoomStateScanner(),
    new DemandPlanner(),
    new TaskFactory(),
    this.taskStore,
    new TaskScheduler(this.taskStore),
    new SpawnPlanner(new BodyPlanner())
  );
  private readonly creepExecutor = new CreepExecutor();

  public run(): void {
    for (const room of Object.values(Game.rooms)) {
      if (room.controller?.my) {
        this.roomController.run(room);
      }
    }

    for (const creep of Object.values(Game.creeps)) {
      const task = this.taskStore.get(creep.memory.taskId);
      this.creepExecutor.run(creep, task);
    }
  }
}
