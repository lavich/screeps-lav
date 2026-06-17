import type { TaskMemory } from "../tasks/Task";

export class CreepExecutor {
  public run(creep: Creep, task: TaskMemory | undefined): void {
    if (!task) {
      return;
    }

    switch (task.type) {
      case "harvest":
        return this.harvest(creep, task);
      case "transfer":
        return this.transfer(creep, task);
      case "build":
        return this.build(creep, task);
      case "repair":
        return this.repair(creep, task);
      case "upgrade":
        return this.upgrade(creep);
      case "withdraw":
      case "pickup":
        return;
    }
  }

  private harvest(creep: Creep, task: TaskMemory): void {
    const source = Game.getObjectById(task.targetId as Id<Source>);
    if (!source) {
      return;
    }

    if (creep.harvest(source) === ERR_NOT_IN_RANGE) {
      creep.moveTo(source, { visualizePathStyle: { stroke: "#ffaa00" } });
    }
  }

  private transfer(creep: Creep, task: TaskMemory): void {
    const target = Game.getObjectById(task.targetId as Id<StructureSpawn | StructureExtension>);
    if (!target) {
      return;
    }

    if (creep.transfer(target, task.resourceType ?? RESOURCE_ENERGY) === ERR_NOT_IN_RANGE) {
      creep.moveTo(target, { visualizePathStyle: { stroke: "#ffffff" } });
    }
  }

  private build(creep: Creep, task: TaskMemory): void {
    const site = Game.getObjectById(task.targetId as Id<ConstructionSite>);
    if (!site) {
      return;
    }

    if (creep.build(site) === ERR_NOT_IN_RANGE) {
      creep.moveTo(site, { visualizePathStyle: { stroke: "#3b82f6" } });
    }
  }

  private repair(creep: Creep, task: TaskMemory): void {
    const structure = Game.getObjectById(task.targetId as Id<Structure>);
    if (!structure) {
      return;
    }

    if (creep.repair(structure) === ERR_NOT_IN_RANGE) {
      creep.moveTo(structure, { visualizePathStyle: { stroke: "#22c55e" } });
    }
  }

  private upgrade(creep: Creep): void {
    const controller = creep.room.controller;
    if (!controller) {
      return;
    }

    if (creep.upgradeController(controller) === ERR_NOT_IN_RANGE) {
      creep.moveTo(controller, { visualizePathStyle: { stroke: "#a855f7" } });
    }
  }
}
