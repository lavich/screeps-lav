import { describe, it, expect, beforeEach, vi } from "vitest";
import { TaskScheduler } from "../../src/tasks/TaskScheduler";
import { TaskStore } from "../../src/tasks/TaskStore";
import type { TaskMemory } from "../../src/tasks/Task";

const TASK = {
  harvest: {
    id: "task:W1N1:mine:s1",
    roomName: "W1N1",
    type: "harvest" as const,
    targetId: "s1",
    priority: 900,
    createdAt: 500,
    expiresAt: 600,
    requirements: { work: 1, carry: 0, move: 1 },
  },
  transfer: {
    id: "task:W1N1:fill:sp1",
    roomName: "W1N1",
    type: "transfer" as const,
    targetId: "sp1",
    priority: 800,
    resourceType: "energy",
    createdAt: 500,
    expiresAt: 600,
    requirements: { carry: 1, move: 1 },
  },
  upgrade: {
    id: "task:W1N1:upgrade:controller",
    roomName: "W1N1",
    type: "upgrade" as const,
    targetId: "controller",
    priority: 300,
    createdAt: 500,
    expiresAt: 600,
    requirements: { work: 1, carry: 1, move: 1 },
  },
};

function creep(name: string, overrides?: Partial<Creep>): Creep {
  return {
    name,
    memory: { homeRoom: "W1N1" },
    store: {
      getFreeCapacity: () => 0,
      getUsedCapacity: () => 0,
    },
    getActiveBodyparts: () => 0,
    pos: { getRangeTo: () => 0 },
    room: { name: "W1N1" },
    ...overrides,
  } as unknown as Creep;
}

describe("TaskScheduler", () => {
  let store: TaskStore;
  let scheduler: TaskScheduler;

  beforeEach(() => {
    Memory.tasks = {};
    Game.creeps = {};
    Game.time = 500;
    store = new TaskStore();
    scheduler = new TaskScheduler(store);
  });

  function assign() {
    scheduler.assign({ name: "W1N1" } as unknown as Room);
  }

  describe("harvest → transfer transition (the bug)", () => {
    it("keeps empty miner on harvest when free capacity exists", () => {
      const miner = creep("m1", {
        getActiveBodyparts: part => (part === "work" ? 5 : part === "carry" ? 1 : 0),
        store: { getFreeCapacity: () => 50, getUsedCapacity: () => 0 },
      });
      miner.memory.taskId = TASK.harvest.id;
      Game.creeps["m1"] = miner;
      store.upsertMany([{ ...TASK.harvest }]);

      assign();

      expect(miner.memory.taskId).toBe(TASK.harvest.id);
    });

    it("switches full miner from harvest to transfer", () => {
      const miner = creep("m1", {
        getActiveBodyparts: part => (part === "work" ? 5 : part === "carry" ? 1 : 0),
        store: { getFreeCapacity: () => 0, getUsedCapacity: () => 50 },
      });
      miner.memory.taskId = TASK.harvest.id;
      Game.creeps["m1"] = miner;
      store.upsertMany([{ ...TASK.harvest, assignedTo: "m1" }, { ...TASK.transfer }]);

      assign();

      expect(miner.memory.taskId).toBe(TASK.transfer.id);
      expect(Memory.tasks[TASK.transfer.id].assignedTo).toBe("m1");
    });

    it("switches empty transfer creep back to harvest", () => {
      const miner = creep("m1", {
        getActiveBodyparts: part => (part === "work" ? 5 : part === "carry" ? 1 : 0),
        store: { getFreeCapacity: () => 50, getUsedCapacity: () => 0 },
      });
      miner.memory.taskId = TASK.transfer.id;
      Game.creeps["m1"] = miner;
      store.upsertMany([{ ...TASK.transfer, assignedTo: "m1" }, { ...TASK.harvest }]);

      assign();

      expect(miner.memory.taskId).toBe(TASK.harvest.id);
    });

    it("clears taskId when full miner has no transfer task available", () => {
      const miner = creep("m1", {
        getActiveBodyparts: part => (part === "work" ? 5 : 0),
        store: { getFreeCapacity: () => 0, getUsedCapacity: () => 50 },
      });
      miner.memory.taskId = TASK.harvest.id;
      Game.creeps["m1"] = miner;
      store.upsertMany([{ ...TASK.harvest, assignedTo: "m1" }]);

      assign();

      expect(miner.memory.taskId).toBeUndefined();
    });
  });

  describe("canExecute per task type", () => {
    it("blocks harvest for creep with no WORK", () => {
      const creepie = creep("c1", {
        getActiveBodyparts: () => 0,
        store: { getFreeCapacity: () => 50, getUsedCapacity: () => 0 },
      });
      Game.creeps["c1"] = creepie;
      store.upsertMany([{ ...TASK.harvest }]);

      assign();

      expect(creepie.memory.taskId).toBeUndefined();
    });

    it("blocks transfer/upgrade for creep with no energy", () => {
      const creepie = creep("c1", {
        getActiveBodyparts: part => (part === "work" ? 5 : part === "carry" ? 1 : 0),
        store: { getFreeCapacity: () => 50, getUsedCapacity: () => 0 },
      });
      Game.creeps["c1"] = creepie;
      store.upsertMany([{ ...TASK.transfer }, { ...TASK.upgrade }]);

      assign();

      expect(creepie.memory.taskId).toBeUndefined();
    });

    it("allows transfer/upgrade for creep with energy", () => {
      const creepie = creep("c1", {
        getActiveBodyparts: part => (part === "work" ? 5 : part === "carry" ? 1 : 0),
        store: { getFreeCapacity: () => 0, getUsedCapacity: () => 50 },
      });
      Game.creeps["c1"] = creepie;
      store.upsertMany([{ ...TASK.transfer }]);

      assign();

      expect(creepie.memory.taskId).toBe(TASK.transfer.id);
    });
  });

  describe("expired tasks", () => {
    it("releases expired task and reassigns to valid one", () => {
      const miner = creep("m1", {
        getActiveBodyparts: part => (part === "work" ? 5 : part === "carry" ? 1 : 0),
        store: { getFreeCapacity: () => 50, getUsedCapacity: () => 0 },
      });
      miner.memory.taskId = "task:stale";
      Game.creeps["m1"] = miner;

      const stale: TaskMemory = { ...TASK.harvest, id: "task:stale", expiresAt: 490 };
      store.upsertMany([stale, { ...TASK.harvest }]);

      assign();

      expect(Memory.tasks["task:stale"].assignedTo).toBeUndefined();
      expect(miner.memory.taskId).toBe(TASK.harvest.id);
    });
  });

  describe("scoring", () => {
    it("prefers higher priority task when both are executable", () => {
      const miner = creep("m1", {
        getActiveBodyparts: part => (part === "work" ? 5 : part === "carry" ? 1 : 0),
        store: { getFreeCapacity: () => 0, getUsedCapacity: () => 50 },
      });
      Game.creeps["m1"] = miner;
      store.upsertMany([
        { ...TASK.transfer, priority: 800 },
        { ...TASK.upgrade, priority: 300 },
      ]);

      assign();

      expect(miner.memory.taskId).toBe(TASK.transfer.id);
    });
  });
});
