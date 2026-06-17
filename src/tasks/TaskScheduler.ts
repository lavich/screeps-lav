import type { TaskMemory } from "./Task";
import { TaskStore } from "./TaskStore";

export class TaskScheduler {
  public constructor(private readonly taskStore: TaskStore) {}

  public assign(room: Room): void {
    const creeps = Object.values(Game.creeps).filter(creep => creep.memory.homeRoom === room.name);
    const tasks = this.taskStore.byRoom(room.name);

    for (const creep of creeps) {
      const currentTask = this.taskStore.get(creep.memory.taskId);

      if (currentTask && this.canExecute(creep, currentTask)) {
        continue;
      }

      if (currentTask) {
        this.taskStore.release(currentTask);
      }

      const nextTask = this.selectTask(creep, tasks);
      if (nextTask) {
        this.taskStore.assign(nextTask, creep);
      } else {
        delete creep.memory.taskId;
      }
    }
  }

  private selectTask(creep: Creep, tasks: TaskMemory[]): TaskMemory | undefined {
    const candidates = tasks.filter(task => !task.assignedTo && this.canExecute(creep, task));

    return candidates.reduce<TaskMemory | undefined>((best, task) => {
      if (!best) {
        return task;
      }

      return this.score(creep, task) > this.score(creep, best) ? task : best;
    }, undefined);
  }

  private score(creep: Creep, task: TaskMemory): number {
    const target = this.resolveTarget(creep.room, task);
    const rangePenalty = target ? creep.pos.getRangeTo(target) * 10 : 0;
    const carriedEnergyBonus = creep.store.getUsedCapacity(RESOURCE_ENERGY) > 0 && task.type !== "harvest" ? 100 : 0;
    const emptyBonus = creep.store.getUsedCapacity(RESOURCE_ENERGY) === 0 && task.type === "harvest" ? 100 : 0;

    return task.priority * 1000 + carriedEnergyBonus + emptyBonus - rangePenalty;
  }

  private canExecute(creep: Creep, task: TaskMemory): boolean {
    if ((task.requirements.work ?? 0) > 0 && creep.getActiveBodyparts(WORK) === 0) {
      return false;
    }

    if ((task.requirements.carry ?? 0) > 0 && creep.getActiveBodyparts(CARRY) === 0) {
      return false;
    }

    if (task.type === "harvest") {
      return creep.store.getFreeCapacity(RESOURCE_ENERGY) > 0;
    }

    if (["transfer", "build", "repair", "upgrade"].includes(task.type)) {
      return creep.store.getUsedCapacity(RESOURCE_ENERGY) > 0;
    }

    return true;
  }

  private resolveTarget(room: Room, task: TaskMemory): Source | Structure | ConstructionSite | StructureController | undefined {
    if (task.targetId === "controller") {
      return room.controller;
    }

    return Game.getObjectById(task.targetId as Id<Source | Structure | ConstructionSite>) ?? undefined;
  }
}
