import type { TaskMemory } from "../tasks/Task";

export class CreepExecutor {
  private readonly fleeRange = 5;
  private readonly fleeCooldown = 5;

  public run(creep: Creep, task: TaskMemory | undefined): void {
    if (this.shouldFlee(creep)) {
      this.flee(creep);
      return;
    }

    if (!task) {
      this.idle(creep);
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
        return this.withdraw(creep, task);
      case "pickup":
        return this.pickup(creep, task);
    }
  }

  private shouldFlee(creep: Creep): boolean {
    const hostile = creep.pos.findClosestByRange(FIND_HOSTILE_CREEPS);
    if (hostile && creep.pos.getRangeTo(hostile) <= this.fleeRange) {
      creep.memory.fleeUntil = Game.time + this.fleeCooldown;
      return true;
    }

    return (creep.memory.fleeUntil ?? 0) > Game.time;
  }

  private flee(creep: Creep): void {
    const spawn = creep.pos.findClosestByPath(FIND_MY_SPAWNS);
    if (spawn) {
      creep.moveTo(spawn, { visualizePathStyle: { stroke: "#ff0000" } });
      return;
    }

    const controller = creep.room.controller;
    if (controller) {
      creep.moveTo(controller, { visualizePathStyle: { stroke: "#ff0000" } });
      return;
    }

    const hostile = creep.pos.findClosestByRange(FIND_HOSTILE_CREEPS);
    if (!hostile) return;

    const direction = creep.pos.getDirectionTo(hostile);
    const opposite = ((direction + 3) % 8 + 1) as DirectionConstant;
    creep.move(opposite);
  }

  private idle(creep: Creep): void {
    if (creep.store.getUsedCapacity(RESOURCE_ENERGY) > 0) {
      const spawnTarget = creep.pos.findClosestByPath(FIND_MY_SPAWNS);
      if (spawnTarget && spawnTarget.store.getFreeCapacity(RESOURCE_ENERGY) > 0) {
        if (creep.transfer(spawnTarget, RESOURCE_ENERGY) === ERR_NOT_IN_RANGE) {
          creep.moveTo(spawnTarget, { visualizePathStyle: { stroke: "#ffffff" } });
        }
        return;
      }

      const extensionTarget = creep.pos.findClosestByPath(FIND_MY_STRUCTURES, {
        filter: s => s.structureType === STRUCTURE_EXTENSION && s.store.getFreeCapacity(RESOURCE_ENERGY) > 0
      });
      if (extensionTarget) {
        if (creep.transfer(extensionTarget, RESOURCE_ENERGY) === ERR_NOT_IN_RANGE) {
          creep.moveTo(extensionTarget, { visualizePathStyle: { stroke: "#ffffff" } });
        }
        return;
      }
    }

    const source = creep.pos.findClosestByPath(FIND_SOURCES);
    if (source && creep.harvest(source) === ERR_NOT_IN_RANGE) {
      creep.moveTo(source, { visualizePathStyle: { stroke: "#ffaa00" } });
    }
  }

  private harvest(creep: Creep, task: TaskMemory): void {
    const source = Game.getObjectById(task.targetId as Id<Source>);
    if (!source) {
      return;
    }

    if (creep.store.getFreeCapacity(RESOURCE_ENERGY) === 0) {
      if (creep.pos.getRangeTo(source) > 1) {
        creep.moveTo(source, { visualizePathStyle: { stroke: "#ffaa00" } });
      }
      return;
    }

    if (creep.harvest(source) === ERR_NOT_IN_RANGE) {
      creep.moveTo(source, { visualizePathStyle: { stroke: "#ffaa00" } });
    }
  }

  private transfer(creep: Creep, task: TaskMemory): void {
    if (creep.store.getUsedCapacity(RESOURCE_ENERGY) === 0) {
      return;
    }

    const target = Game.getObjectById(task.targetId as Id<StructureSpawn | StructureExtension>);
    if (!target) {
      return;
    }

    if (creep.transfer(target, task.resourceType ?? RESOURCE_ENERGY) === ERR_NOT_IN_RANGE) {
      creep.moveTo(target, { visualizePathStyle: { stroke: "#ffffff" } });
    }
  }

  private pickup(creep: Creep, task: TaskMemory): void {
    const resource = Game.getObjectById(task.targetId as Id<Resource>);
    if (!resource) {
      return;
    }

    if (creep.store.getFreeCapacity(RESOURCE_ENERGY) === 0) {
      return;
    }

    if (creep.pickup(resource) === ERR_NOT_IN_RANGE) {
      creep.moveTo(resource, { visualizePathStyle: { stroke: "#facc15" } });
    }
  }

  private withdraw(creep: Creep, task: TaskMemory): void {
    if (creep.store.getFreeCapacity(RESOURCE_ENERGY) === 0) {
      return;
    }

    const target = Game.getObjectById(task.targetId as Id<StructureContainer | StructureStorage | StructureTerminal>);
    if (!target) {
      return;
    }

    if (creep.withdraw(target, task.resourceType ?? RESOURCE_ENERGY) === ERR_NOT_IN_RANGE) {
      creep.moveTo(target, { visualizePathStyle: { stroke: "#f97316" } });
    }
  }

  private build(creep: Creep, task: TaskMemory): void {
    if (creep.store.getUsedCapacity(RESOURCE_ENERGY) === 0) {
      return;
    }

    const site = Game.getObjectById(task.targetId as Id<ConstructionSite>);
    if (!site) {
      return;
    }

    if (creep.build(site) === ERR_NOT_IN_RANGE) {
      creep.moveTo(site, { visualizePathStyle: { stroke: "#3b82f6" } });
    }
  }

  private repair(creep: Creep, task: TaskMemory): void {
    if (creep.store.getUsedCapacity(RESOURCE_ENERGY) === 0) {
      return;
    }

    const structure = Game.getObjectById(task.targetId as Id<Structure>);
    if (!structure) {
      return;
    }

    if (creep.repair(structure) === ERR_NOT_IN_RANGE) {
      creep.moveTo(structure, { visualizePathStyle: { stroke: "#22c55e" } });
    }
  }

  private upgrade(creep: Creep): void {
    if (creep.store.getUsedCapacity(RESOURCE_ENERGY) === 0) {
      return;
    }

    const controller = creep.room.controller;
    if (!controller) {
      return;
    }

    if (creep.upgradeController(controller) === ERR_NOT_IN_RANGE) {
      creep.moveTo(controller, { visualizePathStyle: { stroke: "#a855f7" } });
    }
  }
}
