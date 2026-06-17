export class MemoryManager {
  public static run(): void {
    Memory.tasks ??= {};

    for (const creepName in Memory.creeps) {
      if (!Game.creeps[creepName]) {
        delete Memory.creeps[creepName];
      }
    }

    for (const taskId in Memory.tasks) {
      const task = Memory.tasks[taskId];
      const assignedCreep = task.assignedTo ? Game.creeps[task.assignedTo] : undefined;

      if (task.expiresAt <= Game.time || (task.assignedTo && !assignedCreep)) {
        delete Memory.tasks[taskId];
      }
    }
  }
}
