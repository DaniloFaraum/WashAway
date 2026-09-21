import { useState } from 'react'

/**
 * @returns {{
 *   toast: { open: boolean, message: string, severity: 'success' | 'error' },
 *   showToast: (message: string, severity?: 'success' | 'error') => void,
 *   closeToast: () => void,
 * }}
 */
export function useToast() {
  const [toast, setToast] = useState({ open: false, message: '', severity: 'success' })

  function showToast(message, severity = 'success') {
    setToast({ open: true, message, severity })
  }

  function closeToast() {
    setToast((atual) => ({ ...atual, open: false }))
  }

  return { toast, showToast, closeToast }
}
