import { useState } from 'react'
import Box from '@mui/material/Box'
import AppBar from '@mui/material/AppBar'
import IconButton from '@mui/material/IconButton'
import MenuIcon from '@mui/icons-material/Menu'
import useMediaQuery from '@mui/material/useMediaQuery'
import { useTheme } from '@mui/material/styles'
import Drawer from '@mui/material/Drawer'
import Toolbar from '@mui/material/Toolbar'
import Typography from '@mui/material/Typography'
import Divider from '@mui/material/Divider'
import Chip from '@mui/material/Chip'
import Button from '@mui/material/Button'
import Stack from '@mui/material/Stack'
import Sidebar from './Sidebar.jsx'

const DRAWER_WIDTH = 240

function AppShell({ children, empresaLogada, onSair, onReabrir }) {
  const theme = useTheme()
  // Em telas pequenas o menu vira uma gaveta aberta pelo botão da barra de cima
  // (o dono usa o painel no celular durante a operação).
  const celular = useMediaQuery(theme.breakpoints.down('md'))
  const [menuAberto, setMenuAberto] = useState(false)

  const cabecalho = (
    <Toolbar sx={{ flexDirection: 'column', alignItems: 'flex-start', justifyContent: 'center', py: 1 }}>
      <Typography variant="h6" noWrap>
        Wash Your Way
      </Typography>
      {empresaLogada && (
        <>
          <Typography variant="caption" color="text.secondary" noWrap>
            {empresaLogada.name}
          </Typography>
          <Stack direction="row" spacing={1} sx={{ alignItems: 'center', mt: 0.5 }}>
            <Chip
              size="small"
              label={empresaLogada.isOpen ? 'Aberto' : 'Fechado'}
              color={empresaLogada.isOpen ? 'success' : 'error'}
            />
            {!empresaLogada.isOpen && empresaLogada.intercorrenciaAtiva && (
              <Button size="small" onClick={onReabrir}>
                Reabrir
              </Button>
            )}
          </Stack>
          {!empresaLogada.isOpen && empresaLogada.intercorrenciaAtiva && (
            <Typography variant="caption" color="text.secondary" noWrap>
              Motivo: {empresaLogada.intercorrenciaAtiva.motivo}
            </Typography>
          )}
          {!empresaLogada.isOpen && !empresaLogada.intercorrenciaAtiva && empresaLogada.foraDoHorario && (
            <Typography variant="caption" color="text.secondary" noWrap>
              Fora do horário de funcionamento
            </Typography>
          )}
        </>
      )}
    </Toolbar>
  )

  const menu = (
    <>
      {cabecalho}
      <Divider />
      <Box sx={{ flexGrow: 1, minHeight: 0, display: 'flex' }}>
        <Sidebar onSair={onSair} onNavegar={() => setMenuAberto(false)} />
      </Box>
    </>
  )

  const papelDaGaveta = { width: DRAWER_WIDTH, boxSizing: 'border-box', display: 'flex', flexDirection: 'column' }

  return (
    <Box sx={{ display: 'flex' }}>
      {celular ? (
        <>
          <AppBar position="fixed" color="inherit" elevation={1}>
            <Toolbar>
              <IconButton edge="start" aria-label="Abrir menu" onClick={() => setMenuAberto(true)} sx={{ mr: 1 }}>
                <MenuIcon />
              </IconButton>
              <Typography variant="h6" noWrap sx={{ flexGrow: 1 }}>
                Wash Your Way
              </Typography>
              {empresaLogada && (
                <Chip
                  size="small"
                  label={empresaLogada.isOpen ? 'Aberto' : 'Fechado'}
                  color={empresaLogada.isOpen ? 'success' : 'error'}
                />
              )}
            </Toolbar>
          </AppBar>
          <Drawer
            variant="temporary"
            open={menuAberto}
            onClose={() => setMenuAberto(false)}
            ModalProps={{ keepMounted: true }}
            sx={{ '& .MuiDrawer-paper': papelDaGaveta }}
          >
            {menu}
          </Drawer>
        </>
      ) : (
        <Drawer
          variant="permanent"
          sx={{ width: DRAWER_WIDTH, flexShrink: 0, '& .MuiDrawer-paper': papelDaGaveta }}
        >
          {menu}
        </Drawer>
      )}
      <Box component="main" sx={{ flexGrow: 1, minWidth: 0, p: { xs: 2, md: 3 } }}>
        {celular && <Toolbar />}
        {children}
      </Box>
    </Box>
  )
}

export default AppShell
