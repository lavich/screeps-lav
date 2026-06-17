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

export interface RoomSnapshot {
  roomName: string;
  tick: number;
  level: number;
  energyAvailable: number;
  energyCapacityAvailable: number;
  sources: SourceSnapshot[];
  energySinks: Array<StructureSpawn | StructureExtension>;
  constructionSites: ConstructionSite[];
  damagedStructures: StructureSnapshot[];
}

export class RoomStateScanner {
  public scan(room: Room): RoomSnapshot {
    room.memory.lastScanned = Game.time;

    const sources = room.find(FIND_SOURCES).map(source => ({
      id: source.id,
      pos: source.pos
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
      energyAvailable: room.energyAvailable,
      energyCapacityAvailable: room.energyCapacityAvailable,
      sources,
      energySinks,
      constructionSites,
      damagedStructures
    };
  }
}
