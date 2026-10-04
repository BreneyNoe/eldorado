/**
 * Lecture de test : on demande une ligne de spot_types et on rapporte ce
 * que Supabase a répondu. L'interprétation est faite dans logic/.
 */
import { supabase } from '@/lib/supabase'
import type { BackendProbe } from '@/features/diagnostic/logic/classifyProbe'

function isNetworkFailure(text: string): boolean {
  return /failed to fetch|load failed|networkerror|fetch failed/i.test(text)
}

export async function probeBackend(): Promise<BackendProbe> {
  // getSession lit la session enregistrée sur l'appareil, sans appel réseau.
  const { data: sessionData } = await supabase.auth.getSession()
  const hasSession = sessionData.session !== null

  try {
    // retry(false) : un diagnostic doit répondre tout de suite, sans les
    // tentatives automatiques que supabase-js fait d'habitude sur les lectures.
    const { data, error, status } = await supabase
      .from('spot_types')
      .select('id')
      .limit(1)
      .retry(false)

    if (error) {
      const text = `${error.message ?? ''} ${error.details ?? ''}`
      return {
        networkFailed: status === 0 || isNetworkFailure(text),
        status,
        code: error.code || null,
        message: error.message || null,
        rowCount: null,
        hasSession,
      }
    }

    return {
      networkFailed: false,
      status,
      code: null,
      message: null,
      rowCount: data.length,
      hasSession,
    }
  } catch (caught) {
    return {
      networkFailed: true,
      status: 0,
      code: null,
      message: caught instanceof Error ? caught.message : String(caught),
      rowCount: null,
      hasSession,
    }
  }
}
