import { MapPin } from 'lucide-react'

/** Web-Mercator tile coords for a lat/lng at zoom z, plus the pixel offset within the tile. */
function tilePos(lat: number, lng: number, z: number) {
  const n = 2 ** z
  const xf = ((lng + 180) / 360) * n
  const latRad = (lat * Math.PI) / 180
  const yf = ((1 - Math.asinh(Math.tan(latRad)) / Math.PI) / 2) * n
  const xt = Math.floor(xf)
  const yt = Math.floor(yf)
  return { xt, yt, px: (xf - xt) * 256, py: (yf - yt) * 256 }
}

const OFFSETS = [-1, 0, 1]

/** A shared-location card: a 3×3 grid of OSM tiles centered on the point (fills the card,
 *  pin in the middle) + a link out to Maps. Falls back to the gradient if tiles don't load. */
export function LocationAttachment({ lat, lng, label }: { lat: number; lng: number; label?: string }) {
  const z = 15
  const { xt, yt, px, py } = tilePos(lat, lng, z)
  const maps = `https://www.google.com/maps?q=${lat},${lng}`
  return (
    <a
      href={maps}
      target="_blank"
      rel="noreferrer"
      className="block w-64 overflow-hidden rounded-2xl bg-black/20 ring-1 ring-white/10 transition hover:bg-black/30"
    >
      <div className="relative h-32 w-full overflow-hidden bg-gradient-to-br from-emerald-900/40 via-slate-900 to-sky-900/30">
        {OFFSETS.map((dy) =>
          OFFSETS.map((dx) => (
            <img
              key={`${dx},${dy}`}
              src={`https://tile.openstreetmap.org/${z}/${xt + dx}/${yt + dy}.png`}
              alt=""
              onError={(e) => {
                e.currentTarget.style.display = 'none'
              }}
              className="pointer-events-none absolute max-w-none"
              style={{ left: `${128 - px + dx * 256}px`, top: `${64 - py + dy * 256}px`, width: 256, height: 256 }}
            />
          )),
        )}
        <span className="absolute left-1/2 top-1/2 -translate-x-1/2 -translate-y-full">
          <MapPin className="h-7 w-7 fill-rose-500 text-white drop-shadow-[0_1px_3px_rgba(0,0,0,0.6)]" />
        </span>
      </div>
      <div className="flex items-center gap-2 px-3 py-2">
        <MapPin className="h-4 w-4 shrink-0 text-emerald-400" />
        <span className="min-w-0 flex-1">
          <span className="block truncate text-sm font-medium text-white">{label || 'Shared location'}</span>
          <span className="block truncate text-xs text-white/55">
            {lat.toFixed(5)}, {lng.toFixed(5)}
          </span>
        </span>
      </div>
    </a>
  )
}
