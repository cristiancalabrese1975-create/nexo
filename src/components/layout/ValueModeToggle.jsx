import { useValueMode } from '../../context/ValueModeContext'

export function ValueModeToggle() {
  const { modo, setModo } = useValueMode()
  return (
    <div className="flex bg-white border border-slate-200 rounded-lg overflow-hidden text-xs md:text-sm font-medium shrink-0">
      <button
        onClick={() => setModo('pesos')}
        className={`px-2.5 py-1.5 ${modo === 'pesos' ? 'bg-indigo-600 text-white' : 'text-slate-600'}`}
      >
        $
      </button>
      <button
        onClick={() => setModo('unidades')}
        className={`px-2.5 py-1.5 ${modo === 'unidades' ? 'bg-indigo-600 text-white' : 'text-slate-600'}`}
      >
        Uni
      </button>
    </div>
  )
}
