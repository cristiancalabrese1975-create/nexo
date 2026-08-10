import { useState, useEffect, useRef } from 'react'
import { X, Mic, Square } from 'lucide-react'
import { Card } from '../ui/Card'
import { useAgenda } from '../../context/AgendaContext'
import { clientes, vendedores, HOY_DEMO_ISO } from '../../data/mockData'

const SpeechRecognitionAPI =
  typeof window !== 'undefined' ? window.SpeechRecognition || window.webkitSpeechRecognition : null

function generarEnlaceReunion(plataforma) {
  const id = Math.floor(100_000_000 + Math.random() * 900_000_000)
  return plataforma === 'Teams'
    ? `https://teams.microsoft.com/l/meetup-join/19%3ameeting_${id}%40thread.v2/0`
    : `https://zoom.us/j/${id}`
}

function emptyForm(vendedorFijo, clienteCodigo, fecha, hora, tipo, notas) {
  return {
    clienteCodigo: clienteCodigo ?? '',
    vendedor: vendedorFijo ?? vendedores[0],
    tipo: tipo || 'Visita',
    plataforma: 'Zoom',
    fecha: fecha || HOY_DEMO_ISO,
    hora: hora || '09:00',
    estado: 'Pendiente',
    notas: notas || '',
    proximaGestion: '',
  }
}

export function GestionFormModal({
  open,
  onClose,
  defaultClienteCodigo = '',
  defaultFecha,
  defaultHora,
  defaultTipo,
  defaultNotas,
  esVendedor,
  nombreVendedor,
  onSaved,
}) {
  const { addActividad } = useAgenda()
  const [form, setForm] = useState(() =>
    emptyForm(esVendedor ? nombreVendedor : undefined, defaultClienteCodigo, defaultFecha, defaultHora, defaultTipo, defaultNotas),
  )
  const [dictando, setDictando] = useState(false)
  const recognitionRef = useRef(null)

  useEffect(() => {
    if (open) {
      setForm(emptyForm(esVendedor ? nombreVendedor : undefined, defaultClienteCodigo, defaultFecha, defaultHora, defaultTipo, defaultNotas))
    } else {
      recognitionRef.current?.stop()
    }
  }, [open, defaultClienteCodigo, defaultFecha, defaultHora, defaultTipo, defaultNotas, esVendedor, nombreVendedor])

  useEffect(() => () => recognitionRef.current?.stop(), [])

  const clientesDisponibles = esVendedor ? clientes.filter((c) => c.vendedorAsignado === nombreVendedor) : clientes

  if (!open) return null

  function toggleDictado() {
    if (!SpeechRecognitionAPI) return
    if (dictando) {
      recognitionRef.current?.stop()
      return
    }
    const baseline = form.notas ? `${form.notas} ` : ''
    const recognition = new SpeechRecognitionAPI()
    recognition.lang = 'es-AR'
    recognition.interimResults = true
    recognition.continuous = true
    recognition.onresult = (e) => {
      const texto = Array.from(e.results)
        .map((r) => r[0].transcript)
        .join(' ')
      setForm((f) => ({ ...f, notas: `${baseline}${texto}` }))
    }
    recognition.onend = () => setDictando(false)
    recognition.onerror = () => setDictando(false)
    recognitionRef.current = recognition
    recognition.start()
    setDictando(true)
  }

  function handleSubmit(e) {
    e.preventDefault()
    if (!form.clienteCodigo) return
    const cliente = clientes.find((c) => c.codigo === form.clienteCodigo)
    const esVideollamada = form.tipo === 'Videollamada'
    const enlace = esVideollamada ? generarEnlaceReunion(form.plataforma) : undefined
    const nueva = {
      id: `a${Date.now()}`,
      clienteCodigo: form.clienteCodigo,
      cliente: cliente?.razonSocial ?? '',
      vendedor: form.vendedor,
      tipo: form.tipo,
      fecha: form.fecha,
      hora: form.hora,
      estado: form.estado,
      notas: form.notas.trim(),
      ...(form.estado === 'Realizada' && form.proximaGestion ? { proximaGestion: form.proximaGestion } : {}),
      ...(esVideollamada ? { plataforma: form.plataforma, enlace } : {}),
    }
    addActividad(nueva)
    onClose()
    onSaved?.(nueva)
  }

  return (
    <div className="fixed inset-0 z-50 bg-slate-900/50 flex items-center justify-center p-4">
      <Card className="w-full max-w-md p-5 md:p-6 max-h-[90vh] overflow-y-auto">
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-base font-semibold text-slate-900">Registrar gestión</h2>
          <button onClick={onClose} className="text-slate-400 hover:text-slate-700">
            <X size={20} />
          </button>
        </div>
        <form onSubmit={handleSubmit} className="space-y-3.5">
          <div>
            <label className="block text-xs font-medium text-slate-500 mb-1">Cliente</label>
            <select
              required
              value={form.clienteCodigo}
              onChange={(e) => setForm({ ...form, clienteCodigo: e.target.value })}
              className="w-full border border-slate-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500"
            >
              <option value="">Seleccionar cliente…</option>
              {clientesDisponibles.map((c) => (
                <option key={c.codigo} value={c.codigo}>
                  {c.razonSocial}
                </option>
              ))}
            </select>
          </div>

          {!esVendedor && (
            <div>
              <label className="block text-xs font-medium text-slate-500 mb-1">Vendedor</label>
              <select
                value={form.vendedor}
                onChange={(e) => setForm({ ...form, vendedor: e.target.value })}
                className="w-full border border-slate-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500"
              >
                {vendedores.map((v) => (
                  <option key={v} value={v}>
                    {v}
                  </option>
                ))}
              </select>
            </div>
          )}

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-medium text-slate-500 mb-1">Tipo</label>
              <select
                value={form.tipo}
                onChange={(e) => setForm({ ...form, tipo: e.target.value })}
                className="w-full border border-slate-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500"
              >
                <option value="Visita">Visita</option>
                <option value="Llamada">Llamada</option>
                <option value="Videollamada">Videollamada (Zoom/Teams)</option>
              </select>
            </div>
            <div>
              <label className="block text-xs font-medium text-slate-500 mb-1">Estado</label>
              <select
                value={form.estado}
                onChange={(e) => setForm({ ...form, estado: e.target.value })}
                className="w-full border border-slate-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500"
              >
                <option value="Realizada">Realizada</option>
                <option value="Pendiente">Pendiente</option>
                <option value="Reprogramada">Reprogramada</option>
              </select>
            </div>
          </div>

          {form.tipo === 'Videollamada' && (
            <div>
              <label className="block text-xs font-medium text-slate-500 mb-1">Plataforma</label>
              <div className="flex bg-slate-100 rounded-lg p-0.5 text-sm font-medium">
                {['Zoom', 'Teams'].map((p) => (
                  <button
                    key={p}
                    type="button"
                    onClick={() => setForm({ ...form, plataforma: p })}
                    className={`flex-1 py-1.5 rounded-md transition-colors ${
                      form.plataforma === p ? 'bg-white shadow-sm text-slate-800' : 'text-slate-500'
                    }`}
                  >
                    {p === 'Teams' ? 'Microsoft Teams' : 'Zoom'}
                  </button>
                ))}
              </div>
              <p className="text-[11px] text-slate-400 mt-1">
                Se genera el enlace de la reunión y se agenda para el cliente al guardar.
              </p>
            </div>
          )}

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-medium text-slate-500 mb-1">
                {form.estado === 'Realizada' ? 'Fecha en que se hizo' : 'Fecha agendada'}
              </label>
              <input
                type="date"
                required
                value={form.fecha}
                onChange={(e) => setForm({ ...form, fecha: e.target.value })}
                className="w-full border border-slate-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500"
              />
            </div>
            <div>
              <label className="block text-xs font-medium text-slate-500 mb-1">Hora</label>
              <input
                type="time"
                required
                value={form.hora}
                onChange={(e) => setForm({ ...form, hora: e.target.value })}
                className="w-full border border-slate-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500"
              />
            </div>
          </div>

          {form.estado === 'Realizada' && (
            <div>
              <label className="block text-xs font-medium text-slate-500 mb-1">
                ¿Cuándo debería volver a gestionarse? (opcional)
              </label>
              <input
                type="date"
                value={form.proximaGestion}
                onChange={(e) => setForm({ ...form, proximaGestion: e.target.value })}
                className="w-full border border-slate-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500"
              />
              <p className="text-[11px] text-slate-400 mt-1">
                Si llega esa fecha y no se cargó una gestión más reciente, este cliente va a aparecer en "a gestionar hoy".
              </p>
            </div>
          )}

          <div>
            <div className="flex items-center justify-between mb-1">
              <label className="block text-xs font-medium text-slate-500">Notas / Observación</label>
              {SpeechRecognitionAPI && (
                <button
                  type="button"
                  onClick={toggleDictado}
                  className={`flex items-center gap-1.5 text-xs font-medium rounded-full px-2.5 py-1 transition-colors ${
                    dictando ? 'bg-rose-50 text-rose-600' : 'bg-slate-100 text-slate-500 hover:bg-slate-200'
                  }`}
                >
                  {dictando ? <Square size={11} /> : <Mic size={12} />}
                  {dictando ? 'Escuchando…' : 'Dictar por voz'}
                </button>
              )}
            </div>
            <textarea
              value={form.notas}
              onChange={(e) => setForm({ ...form, notas: e.target.value })}
              rows={3}
              placeholder="Detalle de la visita o llamada… o tocá «Dictar por voz» y contalo hablando."
              className={`w-full border rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500 resize-none ${
                dictando ? 'border-rose-300' : 'border-slate-200'
              }`}
            />
          </div>

          <button
            type="submit"
            className="w-full bg-indigo-600 hover:bg-indigo-700 text-white text-sm font-medium rounded-lg py-2.5 transition-colors"
          >
            Guardar gestión
          </button>
        </form>
      </Card>
    </div>
  )
}
