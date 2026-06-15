import { useUpdater } from '../hooks/useUpdater';
import { Button } from './ui/Button';
import { X, Download, ArrowUpCircle } from 'lucide-react';

export function UpdateBanner() {
  const { updateInfo, installing, installUpdate, dismissed, dismiss } = useUpdater();

  if (!updateInfo.available || dismissed) return null;

  return (
    <div className="bg-gradient-to-r from-blue-600 to-indigo-600 text-white px-4 py-3 flex items-center justify-between">
      <div className="flex items-center gap-3">
        <ArrowUpCircle className="h-5 w-5" />
        <div>
          <p className="font-semibold">Nueva versión disponible</p>
          <p className="text-sm text-blue-100">GeoAgents v{updateInfo.version}</p>
        </div>
      </div>
      <div className="flex items-center gap-2">
        <Button
          variant="secondary"
          size="sm"
          onClick={installUpdate}
          disabled={installing}
          className="bg-white/20 hover:bg-white/30 text-white border-0"
        >
          {installing ? (
            <>Instalando...</>
          ) : (
            <>
              <Download className="h-4 w-4 mr-2" />
              Actualizar ahora
            </>
          )}
        </Button>
        <Button
          variant="ghost"
          size="sm"
          onClick={dismiss}
          className="text-white hover:bg-white/20"
        >
          <X className="h-4 w-4" />
        </Button>
      </div>
    </div>
  );
}
