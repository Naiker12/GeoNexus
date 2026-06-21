import { useState, useEffect, useRef, useCallback } from "react"
import { QRCodeSVG } from "qrcode.react"
import { RefreshCwIcon, SmartphoneIcon } from "lucide-react"
import { generatePairingCode, type PairingCodeInfo } from "@/api/telegram"
import { Button } from "@/components/ui/Button"

interface Props {
  botUsername: string | null
  enabled: boolean
}

export function TelegramQrPairing({ botUsername, enabled }: Props) {
  const [pairing, setPairing] = useState<PairingCodeInfo | null>(null)
  const [loading, setLoading] = useState(false)
  const [expiresIn, setExpiresIn] = useState(0)
  const intervalRef = useRef<ReturnType<typeof setInterval> | null>(null)

  const clearTimer = useCallback(() => {
    if (intervalRef.current) {
      clearInterval(intervalRef.current)
      intervalRef.current = null
    }
  }, [])

  const generateCode = useCallback(async () => {
    if (!enabled) return
    setLoading(true)
    clearTimer()
    try {
      const result = await generatePairingCode()
      setPairing(result)
      setExpiresIn(result.expires_in_secs)
    } catch {
      setPairing(null)
    } finally {
      setLoading(false)
    }
  }, [enabled, clearTimer])

  useEffect(() => {
    if (pairing && expiresIn > 0) {
      intervalRef.current = setInterval(() => {
        setExpiresIn((prev) => {
          if (prev <= 1) {
            clearTimer()
            setPairing(null)
            return 0
          }
          return prev - 1
        })
      }, 1000)
    }
    return clearTimer
  }, [pairing, clearTimer])

  if (!enabled) return null

  const pairingUrl = botUsername
    ? `https://t.me/${botUsername.replace("@", "")}?start=${pairing?.code ?? ""}`
    : null

  return (
    <div className="rounded-lg border p-4">
      <h4 className="mb-3 flex items-center gap-2 text-sm font-semibold text-foreground">
        <SmartphoneIcon className="size-4" />
        Vincular por QR
      </h4>

      {!pairing ? (
        <Button
          variant="outline"
          size="sm"
          onClick={generateCode}
          disabled={loading || !botUsername}
        >
          {loading ? (
            <RefreshCwIcon className="size-3.5 animate-spin" />
          ) : (
            <SmartphoneIcon className="size-3.5" />
          )}
          {loading ? "Generando..." : "Generar código QR"}
        </Button>
      ) : (
        <div className="flex flex-col items-center gap-3">
          {pairingUrl && (
            <div className="rounded-lg border bg-white p-3">
              <QRCodeSVG value={pairingUrl} size={180} level="M" />
            </div>
          )}
          <p className="text-center text-xs text-muted-foreground">
            Escanea con Telegram para vincular automáticamente tu cuenta
          </p>
          <p className="font-mono text-lg font-bold tracking-widest text-foreground">
            {pairing.code}
          </p>
          <p className="text-xs text-muted-foreground">
            Código expira en {expiresIn}s
          </p>
          <Button variant="ghost" size="sm" onClick={generateCode}>
            <RefreshCwIcon className="mr-1 size-3" />
            Generar nuevo
          </Button>
        </div>
      )}
    </div>
  )
}
