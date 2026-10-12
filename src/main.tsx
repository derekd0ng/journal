import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import './index.css'
import { App } from './App'
import { seedIfEmpty } from './db/seed'

const root = document.getElementById('root')
if (!root) throw new Error('#root element not found')

// Сидинг до первого рендера — компоненты сразу видят данные
seedIfEmpty()
  .then(() => {
    createRoot(root).render(
      <StrictMode>
        <App />
      </StrictMode>,
    )
  })
  .catch(console.error)
