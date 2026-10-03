import { NavLink, useLocation } from 'react-router-dom'
import Box from '@mui/material/Box'
import List from '@mui/material/List'
import ListSubheader from '@mui/material/ListSubheader'
import ListItem from '@mui/material/ListItem'
import ListItemButton from '@mui/material/ListItemButton'
import ListItemIcon from '@mui/material/ListItemIcon'
import ListItemText from '@mui/material/ListItemText'
import Tooltip from '@mui/material/Tooltip'
import Divider from '@mui/material/Divider'
import ReceiptLongIcon from '@mui/icons-material/ReceiptLong'
import CleaningServicesIcon from '@mui/icons-material/CleaningServices'
import EventAvailableIcon from '@mui/icons-material/EventAvailable'
import DirectionsCarIcon from '@mui/icons-material/DirectionsCar'
import LogoutIcon from '@mui/icons-material/Logout'

const NAV_ITEMS = [
  { label: 'Pedidos', path: '/', icon: ReceiptLongIcon },
  { label: 'Serviços', path: '/servicos', icon: CleaningServicesIcon },
  { label: 'Disponibilidade', path: '/disponibilidade', icon: EventAvailableIcon },
  { label: 'Veículos', path: '/veiculos', icon: DirectionsCarIcon },
]

function Sidebar({ onSair }) {
  const location = useLocation()

  return (
    <Box sx={{ display: 'flex', flexDirection: 'column', flexGrow: 1, minHeight: 0 }}>
      <List subheader={<ListSubheader>Operação</ListSubheader>} sx={{ flexGrow: 1, overflowY: 'auto' }}>
        {NAV_ITEMS.map(({ label, path, icon: Icon }) => {
          if (!path) {
            return (
              <Tooltip key={label} title="Em breve" placement="right">
                <ListItem disablePadding>
                  <ListItemButton disabled>
                    <ListItemIcon>
                      <Icon />
                    </ListItemIcon>
                    <ListItemText primary={label} />
                  </ListItemButton>
                </ListItem>
              </Tooltip>
            )
          }

          return (
            <ListItem key={label} disablePadding>
              <ListItemButton component={NavLink} to={path} selected={location.pathname === path}>
                <ListItemIcon>
                  <Icon />
                </ListItemIcon>
                <ListItemText primary={label} />
              </ListItemButton>
            </ListItem>
          )
        })}
      </List>

      <Divider />
      <List>
        <ListItem disablePadding>
          <ListItemButton onClick={onSair}>
            <ListItemIcon>
              <LogoutIcon />
            </ListItemIcon>
            <ListItemText primary="Sair" />
          </ListItemButton>
        </ListItem>
      </List>
    </Box>
  )
}

export default Sidebar
