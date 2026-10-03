import Card from '@mui/material/Card'
import CardContent from '@mui/material/CardContent'
import Typography from '@mui/material/Typography'
import Stack from '@mui/material/Stack'
import Alert from '@mui/material/Alert'
import CircularProgress from '@mui/material/CircularProgress'
import { getVeiculos } from './service/veiculos.service.js'
import PageHeader from '../../components/layout/PageHeader.jsx'
import { useFetch } from '../../hooks/useFetch.js'

function Veiculos() {
  const { data: veiculos, loading, error } = useFetch(getVeiculos)

  if (loading) {
    return <CircularProgress />
  }

  if (error) {
    return <Alert severity="error">Não foi possível carregar os veículos: {error}</Alert>
  }

  return (
    <>
      <PageHeader title="Veículos" />
      <Stack spacing={2}>
        {veiculos.map((veiculo) => (
          <Card key={veiculo.id}>
            <CardContent>
              <Typography variant="subtitle1">{veiculo.modelo}</Typography>
              <Typography variant="body2" color="text.secondary">
                {veiculo.placa}
              </Typography>
            </CardContent>
          </Card>
        ))}
      </Stack>
    </>
  )
}

export default Veiculos
