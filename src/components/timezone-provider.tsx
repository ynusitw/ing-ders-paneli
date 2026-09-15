"use client";

import { createContext, useContext } from "react";
import { DEFAULT_TIMEZONE } from "@/lib/timezone";

// Oturum acan kullanicinin saat dilimi sunucuda okunup buradan tum panel
// sayfalarina dagitilir; boylece her bilesen ayri ayri /api/me cagirmaz.
const TimezoneContext = createContext<string>(DEFAULT_TIMEZONE);

export function TimezoneProvider({
  timezone,
  children,
}: {
  timezone: string;
  children: React.ReactNode;
}) {
  return <TimezoneContext.Provider value={timezone}>{children}</TimezoneContext.Provider>;
}

export function useTimezone() {
  return useContext(TimezoneContext);
}
