import { Kernel } from "./kernel/Kernel";
import { MemoryManager } from "./kernel/MemoryManager";
import "./memory/schema";

export const loop = (): void => {
  MemoryManager.run();

  const kernel = new Kernel();
  kernel.run();
};
