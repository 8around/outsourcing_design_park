"use client";

import { ModuleRegistry, AllCommunityModule } from "ag-grid-community";

// 앱 전역에서 1회만 호출
let isRegistered = false;

export function registerAgGridModules() {
  if (isRegistered) return;

  ModuleRegistry.registerModules([AllCommunityModule]);

  isRegistered = true;
}
