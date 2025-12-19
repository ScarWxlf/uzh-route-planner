"use client"

import { useEffect, useState } from "react"
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Check, Copy, Download } from "lucide-react"
import type { RouteData, MapPoint } from "@/lib/types"
import { generateGPX, downloadGPX } from "@/lib/gpx"

interface ShareDialogProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  shareUrl: string | null
  route: RouteData | null
  start: MapPoint | null
  end: MapPoint | null
}

export function ShareDialog({ open, onOpenChange, shareUrl, route, start, end }: ShareDialogProps) {
  const [copied, setCopied] = useState(false)
  const [qrDataUrl, setQrDataUrl] = useState<string | null>(null)

  // Generate QR code using qrcode library (lightweight)
  useEffect(() => {
    if (shareUrl && open) {
      // Use a simple QR code API as fallback
      const qrUrl = `https://api.qrserver.com/v1/create-qr-code/?size=200x200&data=${encodeURIComponent(shareUrl)}`
      setQrDataUrl(qrUrl)
    }
  }, [shareUrl, open])

  const handleCopy = async () => {
    if (!shareUrl) return
    try {
      await navigator.clipboard.writeText(shareUrl)
      setCopied(true)
      setTimeout(() => setCopied(false), 2000)
    } catch {
      // Ignore
    }
  }

  const handleExportGPX = () => {
    if (!route) return
    const gpx = generateGPX(route, start, end)
    downloadGPX(gpx)
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>Поділитися маршрутом</DialogTitle>
          <DialogDescription>Скопіюйте посилання або відскануйте QR-код</DialogDescription>
        </DialogHeader>

        <div className="space-y-4">
          {/* URL input with copy */}
          <div className="flex gap-2">
            <Input readOnly value={shareUrl || ""} className="flex-1" />
            <Button size="icon" onClick={handleCopy} variant="outline">
              {copied ? <Check className="h-4 w-4" /> : <Copy className="h-4 w-4" />}
            </Button>
          </div>

          {/* QR Code */}
          {qrDataUrl && (
            <div className="flex justify-center">
              <img
                src={qrDataUrl || "/placeholder.svg"}
                alt="QR код маршруту"
                width={200}
                height={200}
                className="rounded-lg border"
              />
            </div>
          )}

          {/* GPX Export */}
          {route && (
            <Button onClick={handleExportGPX} variant="outline" className="w-full bg-transparent">
              <Download className="h-4 w-4 mr-2" />
              Експорт GPX
            </Button>
          )}
        </div>
      </DialogContent>
    </Dialog>
  )
}
