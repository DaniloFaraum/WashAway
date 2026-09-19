import { NavLink, useLocation } from 'react-router-dom'
import List from '@mui/material/List'
import ListSubheader from '@mui/material/ListSubheader'
import ListItem from '@mui/material/ListItem'
import ListItemButton from '@mui/material/ListItemButton'
import ListItemIcon from '@mui/material/ListItemIcon'
import ListItemText from '@mui/material/ListItemText'
import Tooltip from '@mui/material/Tooltip'
import ReceiptLongIcon from '@mui/icons-material/ReceiptLong'
import CleaningServicesIcon from '@mui/icons-material/CleaningServices'
import EventAvailableIcon from '@mui/icons-material/EventAvailable'
import DirectionsCarIcon from '@mui/icons-material/DirectionsCar'

const NAV_ITEMS = [
  { label: 'Pedidos', path: '/', icon: ReceiptLongIcon },
  { label: 'Serviços', path: null, icon: CleaningServicesIcon },
  { label: 'Disponibilidade', path: null, icon: EventAvailableIcon },
  { label: 'Veículos', path: null, icon: DirectionsCarIcon },
]

function Sidebar() {
  const location = useLocation()

  return (
    <List subheader={<ListSubheader>Operação</ListSubheader>}>
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
  )
}

export default Sidebar
