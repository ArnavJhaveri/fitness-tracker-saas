"use client";

import { Header } from "@/components/layout/Header";
import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/Card";
import { WaterLogger } from "@/features/water/components/WaterLogger";
import { WaterProgress } from "@/features/water/components/WaterProgress";
import { WaterHistory } from "@/features/water/components/WaterHistory";
import { useTodayWaterTotal } from "@/features/water/hooks/useWater";
import { useSettings } from "@/features/settings/hooks/useSettings";

const FALLBACK_TARGET_ML = 2000;

export default function WaterPage() {
  const { total } = useTodayWaterTotal();
  const { data: settings } = useSettings();

  // Use the user's saved target; fall back to 2 000 ml until settings load
  const targetMl = settings?.daily_water_target_ml ?? FALLBACK_TARGET_ML;

  return (
    <div className="flex flex-col">
      <Header title="Water" />
      <div className="flex flex-col gap-4 p-4 sm:p-6">
        <Card>
          <CardHeader>
            <CardTitle>Today&apos;s intake</CardTitle>
          </CardHeader>
          <CardContent>
            <WaterProgress totalMl={total} targetMl={targetMl} />
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Log water</CardTitle>
          </CardHeader>
          <CardContent>
            <WaterLogger />
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Today&apos;s log</CardTitle>
          </CardHeader>
          <CardContent>
            <WaterHistory />
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
