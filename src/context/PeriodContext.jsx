import { createContext, useContext, useMemo, useState } from 'react'
import { CURRENT_PERIOD, MONTH_ABBR, PERIODS, YEARS, indexOfPeriod, monthsForYear, periodKey } from '../data/periods'

const PeriodContext = createContext(null)

export function PeriodProvider({ children }) {
  const [year, setYearRaw] = useState(CURRENT_PERIOD.year)
  const [selectedMonths, setSelectedMonthsRaw] = useState([CURRENT_PERIOD.month])

  const availableMonths = useMemo(() => monthsForYear(year), [year])

  function setYear(nextYear) {
    setYearRaw(nextYear)
    const validMonths = monthsForYear(nextYear).map((m) => m.month)
    setSelectedMonthsRaw((prev) => {
      const kept = prev.filter((m) => validMonths.includes(m))
      return kept.length ? kept : [validMonths[validMonths.length - 1]]
    })
  }

  function setSelectedMonths(months) {
    if (!months || !months.length) return // nunca se permite vaciar la selección
    setSelectedMonthsRaw([...new Set(months)].sort((a, b) => a - b))
  }

  function selectAllMonths() {
    setSelectedMonthsRaw(availableMonths.map((m) => m.month))
  }

  function toggleMonth(month) {
    setSelectedMonthsRaw((prev) => {
      if (prev.includes(month)) {
        const next = prev.filter((m) => m !== month)
        return next.length ? next : prev
      }
      return [...prev, month].sort((a, b) => a - b)
    })
  }

  const value = useMemo(() => {
    const validMonths = availableMonths.map((m) => m.month)
    const months = selectedMonths.filter((m) => validMonths.includes(m))
    const monthsFinal = months.length ? months : [validMonths[validMonths.length - 1]]

    const selectedIndices = monthsFinal.map((m) => indexOfPeriod(periodKey(year, m)))
    const primaryIndex = selectedIndices[selectedIndices.length - 1]

    const isSingleMonth = monthsFinal.length === 1
    const isFullYear = monthsFinal.length === validMonths.length

    // Comparación "natural": contra el mes anterior si hay un único mes
    // elegido, o contra el mismo tramo del año anterior si son varios meses
    // (sea el año completo o una selección parcial como "Jun-Jul").
    const comparisonIndices = isSingleMonth
      ? [primaryIndex - 1].filter((i) => i >= 0)
      : selectedIndices.map((i) => i - 12).filter((i) => i >= 0)

    const yoyIndices = selectedIndices.map((i) => i - 12).filter((i) => i >= 0)

    let label
    if (isSingleMonth) {
      label = `${MONTH_ABBR[monthsFinal[0] - 1]} ${year}`
    } else if (isFullYear) {
      label = `Año ${year}`
    } else {
      const contiguos = monthsFinal.every((m, i) => i === 0 || m === monthsFinal[i - 1] + 1)
      label = contiguos
        ? `${MONTH_ABBR[monthsFinal[0] - 1]}-${MONTH_ABBR[monthsFinal[monthsFinal.length - 1] - 1]} ${year}`
        : `${monthsFinal.map((m) => MONTH_ABBR[m - 1]).join(', ')} ${year}`
    }

    return {
      year,
      setYear,
      selectedMonths: monthsFinal,
      setSelectedMonths,
      selectAllMonths,
      toggleMonth,
      years: YEARS,
      availableMonths,
      // Compat: cuando hay un único mes elegido, `month` es ese número;
      // en cualquier otro caso (año completo o selección parcial) es 'todos'.
      month: isSingleMonth ? monthsFinal[0] : 'todos',
      // `isAnnual` significa "no hay un único mes puntual elegido" — sigue
      // valiendo para año completo y también para selecciones parciales
      // (ej. Jun+Jul), que también se comparan contra el año anterior.
      isAnnual: !isSingleMonth,
      isSingleMonth,
      isFullYear,
      selectedIndices,
      primaryIndex,
      comparisonIndices,
      yoyIndices,
      label,
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [year, selectedMonths, availableMonths])

  return <PeriodContext.Provider value={value}>{children}</PeriodContext.Provider>
}

export function usePeriod() {
  const ctx = useContext(PeriodContext)
  if (!ctx) throw new Error('usePeriod debe usarse dentro de <PeriodProvider>')
  return ctx
}

export { PERIODS }
