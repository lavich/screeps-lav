import { describe, it, expect, beforeEach } from "vitest";
import { DemandPlanner } from "../../src/room/DemandPlanner";
import type { RoomSnapshot } from "../../src/room/RoomStateScanner";

const baseSnapshot = (overrides?: Partial<RoomSnapshot>): RoomSnapshot => ({
  roomName: "W1N1",
  tick: 12345,
  level: 1,
  energyAvailable: 300,
  energyCapacityAvailable: 300,
  sources: [],
  energyStores: [],
  droppedEnergy: [],
  energySinks: [],
  constructionSites: [],
  damagedStructures: [],
  ...overrides,
});

const source = (id: string) => ({ id: id as Id<Source>, pos: { roomName: "W1N1", x: 10, y: 10 } as RoomPosition });
const store = (id: string) => ({ id: id as Id<StructureContainer>, structureType: STRUCTURE_CONTAINER, pos: { roomName: "W1N1", x: 10, y: 10 } as RoomPosition, energy: 100 });
const drop = (id: string) => ({ id: id as Id<Resource>, pos: { roomName: "W1N1", x: 10, y: 10 } as RoomPosition, amount: 100 });
const sink = (id: string) => ({ id: id as Id<StructureSpawn>, structureType: STRUCTURE_SPAWN, pos: { roomName: "W1N1", x: 10, y: 10 } as RoomPosition, store: { getFreeCapacity: () => 100 } } as StructureSpawn);
const site = (id: string) => ({ id: id as Id<ConstructionSite>, pos: { roomName: "W1N1", x: 10, y: 10 } as RoomPosition });
const damaged = (id: string, hits: number, hitsMax: number) => ({ id: id as Id<Structure>, structureType: STRUCTURE_ROAD, pos: { roomName: "W1N1", x: 10, y: 10 } as RoomPosition, hits, hitsMax });

describe("DemandPlanner", () => {
  const planner = new DemandPlanner();

  beforeEach(() => {
    Game.time = 500;
  });

  it("creates mine demands for each source", () => {
    const snap = baseSnapshot({ sources: [source("s1"), source("s2")] });
    const demands = planner.plan(snap);
    const mineDemands = demands.filter(d => d.kind === "mine");
    expect(mineDemands).toHaveLength(2);
    expect(mineDemands[0]).toMatchObject({
      id: "W1N1:mine:s1",
      roomName: "W1N1",
      kind: "mine",
      priority: 900,
      targetId: "s1",
      expiresAt: 505,
    });
  });

  it("creates pickup demands for dropped energy", () => {
    const snap = baseSnapshot({ droppedEnergy: [drop("r1"), drop("r2")] });
    const demands = planner.plan(snap);
    const pickupDemands = demands.filter(d => d.kind === "pickup");
    expect(pickupDemands).toHaveLength(2);
    expect(pickupDemands[0]).toMatchObject({
      id: "W1N1:pickup:r1",
      kind: "pickup",
      priority: 850,
      expiresAt: 503,
    });
  });

  it("creates withdraw demands for energy stores", () => {
    const snap = baseSnapshot({ energyStores: [store("st1")] });
    const demands = planner.plan(snap);
    const withdrawDemands = demands.filter(d => d.kind === "withdraw");
    expect(withdrawDemands).toHaveLength(1);
    expect(withdrawDemands[0]).toMatchObject({
      id: "W1N1:withdraw:st1",
      kind: "withdraw",
      priority: 825,
      expiresAt: 505,
    });
  });

  it("creates fill demands for energy sinks", () => {
    const snap = baseSnapshot({ energySinks: [sink("sp1"), sink("sp2")] });
    const demands = planner.plan(snap);
    const fillDemands = demands.filter(d => d.kind === "fill");
    expect(fillDemands).toHaveLength(2);
    expect(fillDemands[0]).toMatchObject({
      id: "W1N1:fill:sp1",
      kind: "fill",
      priority: 800,
    });
  });

  it("creates build demands for construction sites", () => {
    const snap = baseSnapshot({ constructionSites: [site("c1"), site("c2")] });
    const demands = planner.plan(snap);
    const buildDemands = demands.filter(d => d.kind === "build");
    expect(buildDemands).toHaveLength(2);
    expect(buildDemands[0]).toMatchObject({
      id: "W1N1:build:c1",
      kind: "build",
      priority: 500,
      expiresAt: 510,
    });
  });

    it("creates repair demands only for structures below min(hitsMax, 10000)", () => {
      const snap = baseSnapshot({
        level: 2,
        damagedStructures: [
          damaged("d1", 100, 1000),
          damaged("d2", 4999, 5000),
          damaged("d3", 10000, 20000),
        ],
      });
      const demands = planner.plan(snap);
      const repairDemands = demands.filter(d => d.kind === "repair");
      const repairIds = repairDemands.map(d => d.targetId);
      expect(repairIds).toContain("d1");
      expect(repairIds).toContain("d2");
      expect(repairIds).not.toContain("d3");
    });

  it("sorts repair by worst hits/hitsMax ratio first", () => {
    const snap = baseSnapshot({
      level: 5,
      damagedStructures: [
        damaged("half", 500, 1000),
        damaged("almost-dead", 100, 1000),
        damaged("just-dented", 900, 1000),
      ],
    });
    const demands = planner.plan(snap);
    const repairDemands = demands.filter(d => d.kind === "repair");
    expect(repairDemands[0].targetId).toBe("almost-dead");
    expect(repairDemands[1].targetId).toBe("half");
  });

  it("limits repair targets by floor(level + 1)", () => {
    const snap = baseSnapshot({
      level: 0,
      damagedStructures: [
        damaged("d1", 100, 1000),
        damaged("d2", 200, 1000),
        damaged("d3", 300, 1000),
      ],
    });
    const demands = planner.plan(snap);
    const repairDemands = demands.filter(d => d.kind === "repair");
    expect(repairDemands).toHaveLength(1);
  });

  it("keeps at least 1 repair target even at level 0", () => {
    const snap = baseSnapshot({
      level: 0,
      damagedStructures: [damaged("d1", 100, 1000)],
    });
    const demands = planner.plan(snap);
    const repairDemands = demands.filter(d => d.kind === "repair");
    expect(repairDemands).toHaveLength(1);
  });

  it("creates upgrade demand only when level > 0", () => {
    const snapNoLevel = baseSnapshot({ level: 0 });
    expect(planner.plan(snapNoLevel).some(d => d.kind === "upgrade")).toBe(false);

    const snapWithLevel = baseSnapshot({ level: 1 });
    expect(planner.plan(snapWithLevel).some(d => d.kind === "upgrade")).toBe(true);
  });

  it("sets upgrade priority to 300", () => {
    const snap = baseSnapshot({ level: 1 });
    const upgrade = planner.plan(snap).find(d => d.kind === "upgrade")!;
    expect(upgrade.priority).toBe(300);
    expect(upgrade.targetId).toBe("controller");
  });

  it("generates demands for all categories simultaneously", () => {
    const snap = baseSnapshot({
      level: 2,
      sources: [source("s1")],
      droppedEnergy: [drop("r1")],
      energyStores: [store("t1")],
      energySinks: [sink("sp1")],
      constructionSites: [site("c1")],
      damagedStructures: [damaged("d1", 500, 1000)],
    });
    const demands = planner.plan(snap);
    const kinds = demands.map(d => d.kind);
    expect(kinds).toContain("mine");
    expect(kinds).toContain("pickup");
    expect(kinds).toContain("withdraw");
    expect(kinds).toContain("fill");
    expect(kinds).toContain("build");
    expect(kinds).toContain("repair");
    expect(kinds).toContain("upgrade");
  });
});
