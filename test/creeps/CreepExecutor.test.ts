import { describe, it, expect, beforeEach, vi } from "vitest";
import { CreepExecutor } from "../../src/creeps/CreepExecutor";
import type { TaskMemory } from "../../src/tasks/Task";

function creep(name: string, overrides?: Partial<Creep>): Creep {
  return {
    name,
    pos: {
      findClosestByRange: vi.fn(() => null),
      findClosestByPath: vi.fn(() => null),
      getRangeTo: vi.fn(() => 99),
      getDirectionTo: vi.fn(() => 1),
    },
    store: {
      getFreeCapacity: vi.fn(() => 0),
      getUsedCapacity: vi.fn(() => 0),
    },
    getActiveBodyparts: vi.fn(() => 0),
    move: vi.fn(),
    moveTo: vi.fn(),
    harvest: vi.fn(),
    transfer: vi.fn(),
    pickup: vi.fn(),
    withdraw: vi.fn(),
    build: vi.fn(),
    repair: vi.fn(),
    upgradeController: vi.fn(),
    room: { name: "W1N1", controller: {} },
    memory: { homeRoom: "W1N1" },
    ...overrides,
  } as unknown as Creep;
}

const makeTask = (type: TaskMemory["type"]): TaskMemory => ({
  id: "task:test",
  roomName: "W1N1",
  type,
  targetId: "t1",
  priority: 0,
  createdAt: 500,
  expiresAt: 600,
  requirements: {},
});

describe("CreepExecutor", () => {
  const executor = new CreepExecutor();

  beforeEach(() => {
    Game.time = 500;
    Game.getObjectById = vi.fn(() => ({ id: "t1" })) as unknown as typeof Game.getObjectById;
  });

  describe("flee behavior", () => {
    it("executes task normally when no hostiles nearby", () => {
      const harvest = vi.fn(() => 0);
      const c = creep("c1", {
        pos: { findClosestByRange: vi.fn(() => null), findClosestByPath: vi.fn(() => null), getRangeTo: vi.fn(() => 99), getDirectionTo: vi.fn(() => 1) },
        store: { getFreeCapacity: vi.fn(() => 50), getUsedCapacity: vi.fn(() => 0) },
        getActiveBodyparts: vi.fn(part => (part === "work" ? 5 : 0)),
        harvest,
        moveTo: vi.fn(),
        move: vi.fn(),
      });

      executor.run(c, makeTask("harvest"));

      expect(harvest).toHaveBeenCalled();
      expect(c.moveTo).not.toHaveBeenCalled();
    });

    it("flees when hostile is within 5 tiles — moves toward controller", () => {
      const moveTo = vi.fn();
      const controller = { id: "c1" };
      const c = creep("c1", {
        pos: {
          findClosestByRange: vi.fn(() => ({ name: "Hostile1" })),
          findClosestByPath: vi.fn(() => null),
          getRangeTo: vi.fn(() => 3),
          getDirectionTo: vi.fn(() => 1),
        },
        store: { getFreeCapacity: vi.fn(() => 50), getUsedCapacity: vi.fn(() => 0) },
        getActiveBodyparts: vi.fn(() => 0),
        moveTo,
        room: { name: "W1N1", controller },
      });

      executor.run(c, makeTask("harvest"));

      expect(moveTo).toHaveBeenCalledWith(controller, expect.any(Object));
      expect(c.memory.fleeUntil).toBe(505);
    });

    it("does not flee when hostile is beyond 5 tiles", () => {
      const harvest = vi.fn(() => 0);
      const c = creep("c1", {
        pos: {
          findClosestByRange: vi.fn(() => ({ name: "HostileFar" })),
          findClosestByPath: vi.fn(() => null),
          getRangeTo: vi.fn(() => 10),
          getDirectionTo: vi.fn(() => 1),
        },
        store: { getFreeCapacity: vi.fn(() => 50), getUsedCapacity: vi.fn(() => 0) },
        getActiveBodyparts: vi.fn(part => (part === "work" ? 5 : 0)),
        harvest,
        moveTo: vi.fn(),
        move: vi.fn(),
      });

      executor.run(c, makeTask("harvest"));

      expect(harvest).toHaveBeenCalled();
    });

    it("moves towards spawn when fleeing and spawn is reachable", () => {
      const moveTo = vi.fn();
      const spawn = { name: "Spawn1", store: { getFreeCapacity: vi.fn(() => 0) } };
      const controller = { id: "c1" };

      const c = creep("c1", {
        pos: {
          findClosestByRange: vi.fn(() => ({ name: "Hostile1" })),
          findClosestByPath: vi.fn(() => spawn),
          getRangeTo: vi.fn(thing => (thing === spawn ? 5 : 3)),
          getDirectionTo: vi.fn(() => 1),
        },
        store: { getFreeCapacity: vi.fn(() => 50), getUsedCapacity: vi.fn(() => 0) },
        getActiveBodyparts: vi.fn(() => 0),
        moveTo,
        room: { name: "W1N1", controller },
      });

      executor.run(c, makeTask("harvest"));

      expect(moveTo).toHaveBeenCalledWith(spawn, expect.any(Object));
    });

    it("moves opposite direction when no spawn and no controller", () => {
      const move = vi.fn(() => 0);
      const c = creep("c1", {
        pos: {
          findClosestByRange: vi.fn(() => ({ name: "Hostile1" })),
          findClosestByPath: vi.fn(() => null),
          getRangeTo: vi.fn(() => 3),
          getDirectionTo: vi.fn(() => 1),
        },
        store: { getFreeCapacity: vi.fn(() => 50), getUsedCapacity: vi.fn(() => 0) },
        getActiveBodyparts: vi.fn(() => 0),
        move,
        room: { name: "W1N1" },
      });

      executor.run(c, makeTask("harvest"));

      expect(move).toHaveBeenCalledWith(5);
    });

    describe("hysteresis", () => {
      it("keeps fleeing for fleeCooldown ticks after hostile leaves", () => {
        const moveTo = vi.fn();
        const controller = { id: "c1" };

        const c = creep("c1", {
          pos: {
            findClosestByRange: vi.fn(() => null),
            findClosestByPath: vi.fn(() => null),
            getRangeTo: vi.fn(() => 99),
            getDirectionTo: vi.fn(() => 1),
          },
          store: { getFreeCapacity: vi.fn(() => 50), getUsedCapacity: vi.fn(() => 0) },
          getActiveBodyparts: vi.fn(() => 0),
          moveTo,
          room: { name: "W1N1", controller },
          memory: { homeRoom: "W1N1", fleeUntil: 503 },
        });

        Game.time = 502;
        executor.run(c, makeTask("harvest"));

        expect(moveTo).toHaveBeenCalledWith(controller, expect.any(Object));
      });

      it("resumes task after fleeUntil expires", () => {
        const harvest = vi.fn(() => 0);
        const c = creep("c1", {
          pos: {
            findClosestByRange: vi.fn(() => null),
            findClosestByPath: vi.fn(() => null),
            getRangeTo: vi.fn(() => 99),
            getDirectionTo: vi.fn(() => 1),
          },
          store: { getFreeCapacity: vi.fn(() => 50), getUsedCapacity: vi.fn(() => 0) },
          getActiveBodyparts: vi.fn(part => (part === "work" ? 5 : 0)),
          harvest,
          moveTo: vi.fn(),
          move: vi.fn(),
          room: { name: "W1N1", controller: {} },
          memory: { homeRoom: "W1N1", fleeUntil: 500 },
        });

        Game.time = 501;
        executor.run(c, makeTask("harvest"));

        expect(harvest).toHaveBeenCalled();
      });
    });
  });
});
