import { useState } from 'react'
import Dialog from '@mui/material/Dialog'
import DialogTitle from '@mui/material/DialogTitle'
import DialogContent from '@mui/material/DialogContent'
import DialogActions from '@mui/material/DialogActions'
import Button from '@mui/material/Button'
import TextField from '@mui/material/TextField'
import Stack from '@mui/material/Stack'
import Typography from '@mui/material/Typography'
import FormGroup from '@mui/material/FormGroup'
import FormControlLabel from '@mui/material/FormControlLabel'
import Checkbox from '@mui/material/Checkbox'
import InputAdornment from '@mui/material/InputAdornment'
import { somarDuracao } from '../service/servicos.model.js'
import { formatarDuracao } from '../formatarDuracao.js'

const NOME_MAX = 60

function agruparPorCategoria(itens) {
  const grupos = new Map()
  for (const item of itens) {
    if (!grupos.has(item.categoria)) grupos.set(item.categoria, [])
    grupos.get(item.categoria).push(item)
  }
  return [...grupos.entries()]
}

/**
 * Cria (sem `servico`) ou edita (com `servico`) um combo. Os itens vêm só do
 * catálogo — a loja não digita o que o serviço inclui.
 * Monte com `key` diferente por serviço para o estado inicial ser refeito.
 */
function ServicoFormDialog({ open, servico, itensCatalogo, salvando, onClose, onSalvar }) {
  const [nome, setNome] = useState(servico?.nome ?? '')
  const [preco, setPreco] = useState(servico ? String(servico.preco) : '')
  const [itemIds, setItemIds] = useState(() => new Set(servico?.itens.map((item) => item.id) ?? []))

  const precoNumero = Number(preco.replace(',', '.'))
  const valido = nome.trim() !== '' && precoNumero > 0 && itemIds.size > 0
  const duracaoMinutos = somarDuracao(itensCatalogo.filter((item) => itemIds.has(item.id)))

  function toggleItem(id) {
    setItemIds((atuais) => {
      const proximo = new Set(atuais)
      if (proximo.has(id)) proximo.delete(id)
      else proximo.add(id)
      return proximo
    })
  }

  function handleSubmit(event) {
    event.preventDefault()
    if (!valido) return
    onSalvar({ nome: nome.trim(), preco: precoNumero, itemIds: [...itemIds] })
  }

  return (
    <Dialog open={open} onClose={onClose} fullWidth maxWidth="sm">
      <form onSubmit={handleSubmit}>
        <DialogTitle>{servico ? 'Editar serviço' : 'Novo serviço'}</DialogTitle>
        <DialogContent dividers>
          <Stack spacing={2}>
            <TextField
              label="Nome do serviço"
              value={nome}
              onChange={(event) => setNome(event.target.value)}
              required
              fullWidth
              inputProps={{ maxLength: NOME_MAX }}
              helperText="Nome comercial, ex.: Lavagem completa"
            />
            <TextField
              label="Preço"
              value={preco}
              onChange={(event) => setPreco(event.target.value.replace(/[^\d.,]/g, ''))}
              required
              fullWidth
              inputProps={{ inputMode: 'decimal' }}
              InputProps={{ startAdornment: <InputAdornment position="start">R$</InputAdornment> }}
            />
            <Stack direction="row" sx={{ justifyContent: 'space-between', alignItems: 'baseline' }}>
              <Typography variant="subtitle2">O que este serviço inclui</Typography>
              <Typography variant="body2" color="text.secondary">
                Duração estimada: {itemIds.size > 0 ? formatarDuracao(duracaoMinutos) : '—'}
              </Typography>
            </Stack>
            {agruparPorCategoria(itensCatalogo).map(([categoria, itens]) => (
              <Stack key={categoria} spacing={0.5}>
                <Typography variant="body2" color="text.secondary">
                  {categoria}
                </Typography>
                <FormGroup>
                  {itens.map((item) => (
                    <FormControlLabel
                      key={item.id}
                      control={<Checkbox checked={itemIds.has(item.id)} onChange={() => toggleItem(item.id)} />}
                      label={
                        <Stack>
                          <Typography variant="body2">
                            {item.nome} · {formatarDuracao(item.duracaoMinutos)}
                          </Typography>
                          <Typography variant="caption" color="text.secondary">
                            {item.descricao}
                          </Typography>
                        </Stack>
                      }
                    />
                  ))}
                </FormGroup>
              </Stack>
            ))}
          </Stack>
        </DialogContent>
        <DialogActions>
          <Button onClick={onClose} disabled={salvando}>
            Cancelar
          </Button>
          <Button type="submit" variant="contained" disabled={!valido || salvando}>
            Salvar
          </Button>
        </DialogActions>
      </form>
    </Dialog>
  )
}

export default ServicoFormDialog
