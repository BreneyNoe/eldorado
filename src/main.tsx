import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import './index.css'
import { ConfigErrorScreen } from '@/app/ConfigErrorScreen'
import { readEnv } from '@/config/env'

const root = createRoot(document.getElementById('root')!)
const result = readEnv()

if (!result.ok) {
  // Configuration absente ou invalide : on l'explique au lieu d'afficher un écran blanc.
  root.render(
    <StrictMode>
      <ConfigErrorScreen problems={result.problems} />
    </StrictMode>,
  )
} else {
  // Le reste de l'application (qui crée le client Supabase) n'est chargé
  // qu'une fois la configuration validée.
  import('@/app/App')
    .then(({ App }) => {
      root.render(
        <StrictMode>
          <App />
        </StrictMode>,
      )
    })
    .catch(() => {
      root.render(
        <StrictMode>
          <ConfigErrorScreen
            problems={["L'application n'a pas pu se charger. Vérifie ta connexion puis recharge la page."]}
          />
        </StrictMode>,
      )
    })
}
