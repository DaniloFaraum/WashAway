import { Routes, Route } from 'react-router-dom'
import AppBar from '@mui/material/AppBar'
import Toolbar from '@mui/material/Toolbar'
import Typography from '@mui/material/Typography'
import Container from '@mui/material/Container'
import PainelPedidos from './pages/painel-pedidos/PainelPedidos.jsx'

function App() {
  return (
    <>
      <AppBar position="static">
        <Toolbar>
          <Typography variant="h6" component="div">
            WashAway — Painel do lava-rápido
          </Typography>
        </Toolbar>
      </AppBar>
      <Container sx={{ mt: 4 }}>
        <Routes>
          <Route path="/" element={<PainelPedidos />} />
        </Routes>
      </Container>
    </>
  )
}

export default App
