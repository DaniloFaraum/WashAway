import { Routes, Route } from 'react-router-dom'
import Box from '@mui/material/Box'
import CircularProgress from '@mui/material/CircularProgress'
import AppShell from './components/layout/AppShell.jsx'
import Login from './login/Login.jsx'
import OnboardingContrato from './login/OnboardingContrato.jsx'
import { useSessaoEmpresa } from './login/useSessaoEmpresa.js'
import PainelPedidos from './pages/painel-pedidos/PainelPedidos.jsx'
import Servicos from './pages/servicos/Servicos.jsx'
import Disponibilidade from './pages/disponibilidade/Disponibilidade.jsx'
import Veiculos from './pages/veiculos/Veiculos.jsx'

function App() {
  const {
    empresaLogada,
    solicitacaoPendente,
    loading,
    entrar,
    cadastrar,
    aceitarContrato,
    cancelarOnboarding,
    sair,
    reabrir,
  } = useSessaoEmpresa()

  if (loading) {
    return (
      <Box sx={{ display: 'flex', justifyContent: 'center', alignItems: 'center', minHeight: '100vh' }}>
        <CircularProgress />
      </Box>
    )
  }

  if (!empresaLogada && solicitacaoPendente) {
    return (
      <OnboardingContrato
        solicitacao={solicitacaoPendente}
        onAssinar={aceitarContrato}
        onVoltar={cancelarOnboarding}
      />
    )
  }

  if (!empresaLogada) {
    return <Login onEntrar={entrar} onCadastrar={cadastrar} />
  }

  return (
    <AppShell empresaLogada={empresaLogada} onSair={sair} onReabrir={reabrir}>
      <Routes>
        <Route path="/" element={<PainelPedidos />} />
        <Route path="/servicos" element={<Servicos />} />
        <Route path="/disponibilidade" element={<Disponibilidade />} />
        <Route path="/veiculos" element={<Veiculos />} />
      </Routes>
    </AppShell>
  )
}

export default App
