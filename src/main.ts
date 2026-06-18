import { CreepExecutor } from "./creeps/CreepExecutor";
import { Kernel } from "./kernel/Kernel";
import { MemoryManager } from "./kernel/MemoryManager";
import { BodyPlanner } from "./spawn/BodyPlanner";
import { SpawnPlanner } from "./spawn/SpawnPlanner";
import { TaskStore } from "./tasks/TaskStore";
import { TaskFactory } from "./tasks/TaskFactory";
import { TaskScheduler } from "./tasks/TaskScheduler";
import { ConstructionPlanner } from "./room/ConstructionPlanner";
import { RoomStateScanner } from "./room/RoomStateScanner";
import { DemandPlanner } from "./room/DemandPlanner";
import { RoomController } from "./room/RoomController";
import "./memory/schema";

export const loop = (): void => {
  MemoryManager.run();

  const taskStore = new TaskStore();
  const kernel = new Kernel(
    new RoomController(
      new RoomStateScanner(),
      new ConstructionPlanner(),
      new DemandPlanner(),
      new TaskFactory(),
      taskStore,
      new TaskScheduler(taskStore),
      new SpawnPlanner(new BodyPlanner())
    ),
    taskStore,
    new CreepExecutor()
  );
  kernel.run();
};
