import { useEffect } from 'react'

/** Pone el título del documento mientras la página está montada. */
export function useTitle(title: string) {
  useEffect(() => {
    document.title = title
  }, [title])
}
