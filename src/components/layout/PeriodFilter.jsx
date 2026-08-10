import { useEffect, useRef, useState } from 'react'
import { ChevronDown } from 'lucide-react'
import { usePeriod } from '../../context/PeriodContext'
import { MONTH_ABBR } from '../../data/periods'

export function PeriodFilter() {
  const { year, years, setYear, availableMonths, selectedMonths, toggleMonth, selectAllMonths, setSelectedMonths, isFullYear } = usePeriod()
  const [open, setOpen] = useState(false)
  const ref = useRef(null)

  useEffect(() => {
    function onClickOutside(e) {
      if (ref.current && !ref.current.contains(e.target)) setOpen(false)
    }
    document.addEventListener('mousedown', onClickOutside)
    return () => document.removeEventListener('mousedown', onClickOutside)
  }, [])

  const buttonLabel = isFullYear
    ? 'Todo el año'
    : selectedMonths.length === 1
      ? MONTH_ABBR[selectedMonths[0] - 1]
      : `${selectedMonths.length} meses`

  return (
    <div className="flex items-center gap-1.5">
      <select
        value={year}
        onChange={(e) => setYear(Number(e.target.value))}
        className="border border-slate-200 rounded-lg pl-2 pr-1 py-1.5 text-xs md:text-sm font-medium text-slate-700 bg-white focus:outline-none focus:ring-2 focus:ring-indigo-500"
        aria-label="Año"
      >
        {years.map((y) => (
          <option key={y} value={y}>
            {y}
          </option>
        ))}
      </select>

      <div className="relative" ref={ref}>
        <button
          type="button"
          onClick={() => setOpen((o) => !o)}
          className="flex items-center gap-1 border border-slate-200 rounded-lg pl-2.5 pr-1.5 py-1.5 text-xs md:text-sm font-medium text-slate-700 bg-white focus:outline-none focus:ring-2 focus:ring-indigo-500"
          aria-label="Mes"
        >
          {buttonLabel}
          <ChevronDown size={13} className="text-slate-400" />
        </button>

        {open && (
          <div className="absolute right-0 top-full mt-1.5 z-30 w-56 bg-white border border-slate-200 rounded-xl shadow-lg p-3">
            <button
              type="button"
              onClick={() =>
                isFullYear ? setSelectedMonths([availableMonths[availableMonths.length - 1].month]) : selectAllMonths()
              }
              className={`w-full flex items-center gap-1.5 text-left text-xs font-semibold px-2 py-1.5 rounded-md mb-2 transition-colors ${
                isFullYear ? 'bg-indigo-600 text-white' : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
              }`}
            >
              <input type="checkbox" checked={isFullYear} readOnly className="accent-white pointer-events-none" />
              Todo el año
            </button>
            <div className="grid grid-cols-3 gap-1">
              {availableMonths.map((m) => {
                const checked = selectedMonths.includes(m.month)
                return (
                  <label
                    key={m.key}
                    className={`flex items-center gap-1.5 text-xs px-1.5 py-1 rounded cursor-pointer transition-colors ${
                      checked ? 'bg-indigo-50 text-indigo-700 font-medium' : 'text-slate-600 hover:bg-slate-50'
                    }`}
                  >
                    <input
                      type="checkbox"
                      checked={checked}
                      onChange={() => toggleMonth(m.month)}
                      className="accent-indigo-600"
                    />
                    {MONTH_ABBR[m.month - 1]}
                  </label>
                )
              })}
            </div>
            <p className="text-[10px] text-slate-400 mt-2">Elegí uno o varios meses para combinarlos en el mismo análisis.</p>
          </div>
        )}
      </div>
    </div>
  )
}
