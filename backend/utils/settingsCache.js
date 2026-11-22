import Settings from "../models/Settings.js";
import { ttlCache } from "./cache.js";

// Settings change rarely but are read on every quote and booking
export const getSettingsCached = ttlCache(() => Settings.findOne().lean(), 30_000);
export const clearSettingsCache = () => getSettingsCached.clear();