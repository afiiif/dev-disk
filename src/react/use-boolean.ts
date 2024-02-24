import { useMemo, useState } from 'react'

/**
 * Handle boolean state with useful utility functions.
 */
export const useBoolean = (defaultValue: boolean = false) => {
  const [value, setValue] = useState(defaultValue)

  const actions = useMemo(
    () => ({
      setTrue: () => setValue(true),
      setFalse: () => setValue(false),
      toggle: () => setValue((p) => !p),
    }),
    [],
  )

  return [value, actions] as const
}
