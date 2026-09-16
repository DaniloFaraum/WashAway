import { Routes, Route } from 'react-router-dom'
import AppShell from './components/layout/AppShell.jsx'
import PainelPedidos from './pages/painel-pedidos/PainelPedidos.jsx'

function App() {
  return (
    <AppShell>
      <Routes>
        <Route path="/" element={<PainelPedidos />} />
      </Routes>
    </AppShell>
  )
}

export default App
