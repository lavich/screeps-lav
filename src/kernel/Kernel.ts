import { CreepExecutor } from "../creeps/CreepExecutor";
import { RoomController } from "../room/RoomController";
import { TaskStore } from "../tasks/TaskStore";

export class Kernel {
  public constructor(
    private readonly roomController: RoomController,
    private readonly taskStore: TaskStore,
    private readonly creepExecutor: CreepExecutor
  ) {}

  public run(): void {
    for (const room of Object.values(Game.rooms)) {
      if (!room.controller?.my) {
        continue;
      }

      try {
        this.roomController.run(room);
      } catch (error) {
        Game.notify(`[Kernel] Error processing room ${room.name}: ${error}`);
      }
    }

    for (const creep of Object.values(Game.creeps)) {
      try {
        const task = this.taskStore.get(creep.memory.taskId);
        this.creepExecutor.run(creep, task);
      } catch (error) {
        Game.notify(`[Kernel] Error executing creep ${creep.name}: ${error}`);
      }
    }
  }
}
