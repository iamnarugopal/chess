"use client";

import type { ReactNode } from "react";
import { Drawer } from "@base-ui/react/drawer";

type MobileSettingsDrawerProps = {
  children: ReactNode;
};

export default function MobileSettingsDrawer({
  children,
}: MobileSettingsDrawerProps) {
  return (
    <Drawer.Root>
      <Drawer.Trigger className="flex items-center gap-2 rounded-lg border border-white/10 bg-white/5 px-3 py-2 text-sm font-medium text-zinc-200 transition active:scale-95 lg:hidden">
        <span aria-hidden="true">⚙</span>
        Settings
      </Drawer.Trigger>

      <Drawer.Portal>
        <Drawer.Backdrop className="fixed inset-0 z-40 bg-black/60 backdrop-blur-sm transition-opacity duration-300 data-[ending-style]:opacity-0 data-[starting-style]:opacity-0 lg:hidden" />

        <Drawer.Viewport className="fixed inset-0 z-50 lg:hidden">
          <Drawer.Popup className="absolute inset-y-0 left-0 flex w-[min(88vw,360px)] flex-col border-r border-white/10 bg-zinc-900 text-white shadow-2xl transition-transform duration-300 ease-out data-[ending-style]:-translate-x-full data-[starting-style]:-translate-x-full">
            <div className="flex shrink-0 items-center justify-between border-b border-white/10 px-5 py-4">
              <div>
                <Drawer.Title className="font-semibold text-white">
                  Chess Settings
                </Drawer.Title>

                <Drawer.Description className="mt-0.5 text-xs text-zinc-400">
                  Customize your game
                </Drawer.Description>
              </div>

              <Drawer.Close
                aria-label="Close settings"
                className="flex size-9 items-center justify-center rounded-lg border border-white/10 text-xl text-zinc-400 transition hover:bg-white/10 hover:text-white"
              >
                ×
              </Drawer.Close>
            </div>

            <div className="min-h-0 flex-1 overflow-y-auto p-5">
              {children}
            </div>
          </Drawer.Popup>
        </Drawer.Viewport>
      </Drawer.Portal>
    </Drawer.Root>
  );
}