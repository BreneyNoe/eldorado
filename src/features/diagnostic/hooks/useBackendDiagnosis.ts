import { useQuery } from '@tanstack/react-query'
import { probeBackend } from '@/features/diagnostic/api/probeBackend'
import { classifyProbe } from '@/features/diagnostic/logic/classifyProbe'

export function useBackendDiagnosis() {
  return useQuery({
    queryKey: ['diagnostic', 'backend'],
    queryFn: async () => classifyProbe(await probeBackend()),
    // Un diagnostic doit toujours refléter l'état présent.
    staleTime: 0,
    gcTime: 0,
    retry: false,
  })
}
