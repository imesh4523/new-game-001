import { useQuery } from "@tanstack/react-query";
import { SnowAnimation } from "./snow-animation";
import { HeartsAnimation } from "./hearts-animation";

interface SystemSetting {
  key: string;
  value: string;
}

export function ChristmasModeWrapper() {
  const { data: settings } = useQuery<SystemSetting[]>({
    queryKey: ['/api/system-settings/public'],
    retry: false,
    staleTime: 60000,
  });

  const christmasModeEnabled = settings?.find(s => s.key === 'christmas_mode_enabled')?.value === 'true';
  const valentineModeEnabled = settings?.find(s => s.key === 'valentine_mode_enabled')?.value === 'true';

  // Valentine mode takes priority if both are enabled
  if (valentineModeEnabled) {
    return <HeartsAnimation />;
  }

  if (christmasModeEnabled) {
    return <SnowAnimation />;
  }

  return null;
}
