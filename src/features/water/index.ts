// Water feature — public API
export { WaterLogger } from "./components/WaterLogger";
export { WaterProgress } from "./components/WaterProgress";
export { WaterHistory } from "./components/WaterHistory";
export {
  useWaterEntries,
  useTodayWaterTotal,
  useLogWater,
  useDeleteWater,
  WATER_KEY,
} from "./hooks/useWater";
