import type { BodyProfile, RoomMode, TaskMemory } from "../tasks/Task";

declare global {
  interface Memory {
    tasks: Record<string, TaskMemory>;
  }

  interface RoomMemory {
    mode?: RoomMode;
    lastScanned?: number;
  }

  interface CreepMemory {
    taskId?: string;
    homeRoom?: string;
    bodyProfile?: BodyProfile;
    generation?: number;
  }
}

export {};
