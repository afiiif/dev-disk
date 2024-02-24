// import { useMemo, useState } from 'react'
// That doesn't work in ESM, because React libs are CJS only.
// See: https://github.com/pmndrs/valtio/issues/452
// The following is a workaround until ESM is supported.
import ReactExports from 'react'

const { useMemo, useState } = ReactExports

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
