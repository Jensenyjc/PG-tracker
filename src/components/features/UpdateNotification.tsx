import { X, Download, RefreshCw, AlertCircle } from 'lucide-react'
import { useUpdater } from '../../lib/useUpdater'
import { Button } from '../ui/button'
import { useState } from 'react'

export default function UpdateNotification(): JSX.Element | null {
  const { status, checking, downloadUpdate, installUpdate } = useUpdater()
  const [dismissedPhase, setDismissedPhase] = useState<string | null>(null)

  if (checking && status.phase === 'checking') return null

  const showBanner =
    status.phase !== dismissedPhase &&
    (status.phase === 'available' || status.phase === 'downloaded')

  if (!showBanner) return null

  return (
    <div className="sticky top-0 z-50 w-full bg-card border-b border-border shadow-sm">
      <div className="flex items-center justify-between px-4 py-3 max-w-full">
        <div className="flex items-center gap-3">
          {status.phase === 'available' && (
            <>
              <AlertCircle className="h-5 w-5 text-primary flex-shrink-0" />
              <span className="text-sm font-medium">
                发现新版本 <span className="text-primary">v{status.version}</span>
              </span>
              <Button size="sm" onClick={downloadUpdate}>
                <Download className="h-4 w-4 mr-1.5" />下载更新
              </Button>
            </>
          )}
          {status.phase === 'downloaded' && (
            <>
              <RefreshCw className="h-5 w-5 text-green-600 dark:text-green-400 flex-shrink-0" />
              <span className="text-sm font-medium text-green-600 dark:text-green-400">
                v{status.version} 下载完成，重启即可安装
              </span>
              <Button size="sm" onClick={installUpdate}>
                <RefreshCw className="h-4 w-4 mr-1.5" />立即重启
              </Button>
            </>
          )}
        </div>
        <button
          onClick={() => setDismissedPhase(status.phase)}
          className="p-1 rounded-md hover:bg-muted transition-colors flex-shrink-0 ml-3"
        >
          <X className="h-4 w-4 text-muted-foreground" />
        </button>
      </div>
    </div>
  )
}
