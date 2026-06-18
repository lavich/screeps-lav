import type { TaskMemory } from "./Task";

export class TaskStore {
  public upsertMany(tasks: TaskMemory[]): void {
    for (const task of tasks) {
      const existing = Memory.tasks[task.id];

      Memory.tasks[task.id] = {
        ...task,
        assignedTo: existing?.assignedTo
      };
    }
  }

  public byRoom(roomName: string): TaskMemory[] {
    return Object.values(Memory.tasks).filter(
      task => task.roomName === roomName && task.expiresAt > Game.time
    );
  }

  public get(taskId: string | undefined): TaskMemory | undefined {
    if (!taskId) {
      return undefined;
    }

    return Memory.tasks[taskId];
  }

  public assign(task: TaskMemory, creep: Creep): void {
    Memory.tasks[task.id] = { ...task, assignedTo: creep.name };
    creep.memory.taskId = task.id;
  }

  public release(task: TaskMemory): void {
    if (task.assignedTo && Game.creeps[task.assignedTo]) {
      delete Game.creeps[task.assignedTo].memory.taskId;
    }

    Memory.tasks[task.id] = { ...task, assignedTo: undefined };
  }

  public releaseByRoom(roomName: string): void {
    for (const task of Object.values(Memory.tasks)) {
      if (task.roomName === roomName) {
        this.release(task);
      }
    }
  }
}
