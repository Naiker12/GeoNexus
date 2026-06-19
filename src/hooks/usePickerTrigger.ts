import { useState, useEffect, useCallback } from "react"

export interface PickerTriggerState {
  trigger: "@" | "/" | null
  query: string
  triggerIndex: number
}

export function usePickerTrigger(
  value: string,
  cursorPos: number
): PickerTriggerState & { close: () => void } {
  const [state, setState] = useState<PickerTriggerState>({
    trigger: null,
    query: "",
    triggerIndex: -1,
  })

  useEffect(() => {
    const textBeforeCaret = value.slice(0, cursorPos)
    const match = textBeforeCaret.match(/(?:^|\s)([@/])([^\s]*)$/)
    if (match) {
      setState({
        trigger: match[1] as "@" | "/",
        query: match[2],
        triggerIndex: cursorPos - match[2].length - 1,
      })
    } else {
      setState({ trigger: null, query: "", triggerIndex: -1 })
    }
  }, [value, cursorPos])

  const close = useCallback(() => {
    setState({ trigger: null, query: "", triggerIndex: -1 })
  }, [])

  return { ...state, close }
}
