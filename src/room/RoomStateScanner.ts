export interface SourceSnapshot {
  id: Id<Source>;
  pos: RoomPosition;
}

export interface StructureSnapshot {
  id: Id<Structure>;
  structureType: StructureConstant;
  pos: RoomPosition;
  hits: number;
  hitsMax: number;
}

export interface EnergyStoreSnapshot {
  id: Id<StructureContainer | StructureStorage | StructureTerminal>;
  structureType: STRUCTURE_CONTAINER | STRUCTURE_STORAGE | STRUCTURE_TERMINAL;
  pos: RoomPosition;
  energy: number;
}

export interface ResourceSnapshot {
  id: Id<Resource>;
  pos: RoomPosition;
  amount: number;
}

export interface HostileSnapshot {
  id: Id<Creep>;
  pos: RoomPosition;
}

export interface RoomSnapshot {
  roomName: string;
  tick: number;
  level: number;
  controllerPos: RoomPosition | undefined;
  energyAvailable: number;
  energyCapacityAvailable: number;
  sources: SourceSnapshot[];
  energyStores: EnergyStoreSnapshot[];
  droppedEnergy: ResourceSnapshot[];
  energySinks: Array<StructureSpawn | StructureExtension>;
  constructionSites: ConstructionSite[];
  damagedStructures: StructureSnapshot[];
  hostiles: HostileSnapshot[];
}

export class RoomStateScanner {
  public scan(room: Room): RoomSnapshot {
    room.memory.lastScanned = Game.time;

    const hostiles = room.find(FIND_HOSTILE_CREEPS).map(c => ({
      id: c.id,
      pos: c.pos
    }));

    const sources = room.find(FIND_SOURCES).map(source => ({
      id: source.id,
      pos: source.pos
    }));

    const energyStores = room.find(FIND_STRUCTURES, {
      filter: (structure): structure is StructureContainer | StructureStorage | StructureTerminal =>
        (structure.structureType === STRUCTURE_CONTAINER ||
          structure.structureType === STRUCTURE_STORAGE ||
          structure.structureType === STRUCTURE_TERMINAL) &&
        structure.store.getUsedCapacity(RESOURCE_ENERGY) > 0
    }).map(structure => ({
      id: structure.id,
      structureType: structure.structureType,
      pos: structure.pos,
      energy: structure.store.getUsedCapacity(RESOURCE_ENERGY)
    }));

    const droppedEnergy = room.find(FIND_DROPPED_RESOURCES, {
      filter: resource => resource.resourceType === RESOURCE_ENERGY && resource.amount > 0
    }).map(resource => ({
      id: resource.id,
      pos: resource.pos,
      amount: resource.amount
    }));

    const energySinks = room.find(FIND_MY_STRUCTURES, {
      filter: structure =>
        (structure.structureType === STRUCTURE_SPAWN || structure.structureType === STRUCTURE_EXTENSION) &&
        structure.store.getFreeCapacity(RESOURCE_ENERGY) > 0
    }) as Array<StructureSpawn | StructureExtension>;

    const constructionSites = room.find(FIND_MY_CONSTRUCTION_SITES);

    const damagedStructures = room
      .find(FIND_STRUCTURES, {
        filter: structure =>
          structure.hits < structure.hitsMax &&
          structure.structureType !== STRUCTURE_WALL &&
          structure.structureType !== STRUCTURE_RAMPART
      })
      .map(structure => ({
        id: structure.id,
        structureType: structure.structureType,
        pos: structure.pos,
        hits: structure.hits,
        hitsMax: structure.hitsMax
      }));

    return {
      roomName: room.name,
      tick: Game.time,
      level: room.controller?.level ?? 0,
      controllerPos: room.controller?.pos,
      energyAvailable: room.energyAvailable,
      energyCapacityAvailable: room.energyCapacityAvailable,
      sources,
      energyStores,
      droppedEnergy,
      energySinks,
      constructionSites,
      damagedStructures,
      hostiles
    };
  }
}
