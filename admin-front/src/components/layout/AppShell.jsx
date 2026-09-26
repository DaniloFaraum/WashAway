import Box from '@mui/material/Box'
import Drawer from '@mui/material/Drawer'
import Toolbar from '@mui/material/Toolbar'
import Typography from '@mui/material/Typography'
import Divider from '@mui/material/Divider'
import Sidebar from './Sidebar.jsx'

const DRAWER_WIDTH = 240

function AppShell({ children, empresaLogada, onSair }) {
  return (
    <Box sx={{ display: 'flex' }}>
      <Drawer
        variant="permanent"
        sx={{
          width: DRAWER_WIDTH,
          flexShrink: 0,
          '& .MuiDrawer-paper': {
            width: DRAWER_WIDTH,
            boxSizing: 'border-box',
            display: 'flex',
            flexDirection: 'column',
          },
        }}
      >
        <Toolbar sx={{ flexDirection: 'column', alignItems: 'flex-start', justifyContent: 'center', py: 1 }}>
          <Typography variant="h6" noWrap>
            WashAway
          </Typography>
          {empresaLogada && (
            <Typography variant="caption" color="text.secondary" noWrap>
              {empresaLogada.name}
            </Typography>
          )}
        </Toolbar>
        <Divider />
        <Box sx={{ flexGrow: 1, minHeight: 0, display: 'flex' }}>
          <Sidebar onSair={onSair} />
        </Box>
      </Drawer>
      <Box component="main" sx={{ flexGrow: 1, p: 3 }}>
        {children}
      </Box>
    </Box>
  )
}

export default AppShell
