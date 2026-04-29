import { useEffect, useState } from 'react'

export function useAppVersion(): string {
  const [version, setVersion] = useState('')

  useEffect(() => {
    let isActive = true
    const getVersion = window.api?.app?.getVersion

    if (!getVersion) return

    getVersion()
      .then((value) => {
        if (isActive) setVersion(value || '')
      })
      .catch(() => {
        if (isActive) setVersion('')
      })

    return () => {
      isActive = false
    }
  }, [])

  return version
}
