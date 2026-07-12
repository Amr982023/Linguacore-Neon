// src/components/ui.jsx — All shared UI primitives

import { forwardRef } from 'react'
import { X, ChevronDown, Loader2 } from 'lucide-react'

// ── Badge ────────────────────────────────────────────────────────────────────
const STATUS_COLORS = {
  ACTIVE:          'bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200',
  COMPLETED:       'bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-200',
  SUSPENDED:       'bg-yellow-100 text-yellow-800 dark:bg-yellow-900 dark:text-yellow-200',
  PENDING:         'bg-gray-100 text-gray-700 dark:bg-gray-700 dark:text-gray-300',
  DROPPED:         'bg-red-100 text-red-800 dark:bg-red-900 dark:text-red-200',
  EXITED_REFUNDED: 'bg-purple-100 text-purple-800 dark:bg-purple-900 dark:text-purple-200',
  PARTIAL:         'bg-orange-100 text-orange-800 dark:bg-orange-900 dark:text-orange-200',
  CANCELLED:       'bg-gray-200 text-gray-600 dark:bg-gray-600 dark:text-gray-400',
  WAITING:         'bg-amber-100 text-amber-800 dark:bg-amber-900 dark:text-amber-200',
  ENROLLED:        'bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200',
  EXPIRED:         'bg-red-100 text-red-800 dark:bg-red-900 dark:text-red-200',
  PAID:            'bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200',
  DRAFT:           'bg-gray-100 text-gray-700 dark:bg-gray-700 dark:text-gray-300',
  CONFIRMED:       'bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-200',
  SCHEDULED:       'bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-200',
  ONLINE:          'bg-cyan-100 text-cyan-800 dark:bg-cyan-900 dark:text-cyan-200',
  OFFLINE:         'bg-slate-100 text-slate-700 dark:bg-slate-700 dark:text-slate-300',
  BASIC:           'bg-indigo-100 text-indigo-800 dark:bg-indigo-900 dark:text-indigo-200',
  ADDITIONAL:      'bg-pink-100 text-pink-800 dark:bg-pink-900 dark:text-pink-200',
  PUBLIC:          'bg-teal-100 text-teal-800 dark:bg-teal-900 dark:text-teal-200',
  PRIVATE:         'bg-purple-100 text-purple-800 dark:bg-purple-900 dark:text-purple-200',
}

export function Badge({ label, color }) {
  const cls = color || STATUS_COLORS[label?.toUpperCase()] ||
    'bg-gray-100 text-gray-700 dark:bg-gray-700 dark:text-gray-300'
  return <span className={`badge ${cls}`}>{label}</span>
}

// ── Button ────────────────────────────────────────────────────────────────────
export function Button({ children, variant = 'primary', loading, icon: Icon, className = '', ...props }) {
  const base = variant === 'primary' ? 'btn-primary'
             : variant === 'danger'   ? 'btn-danger'
             : 'btn-secondary'
  return (
    <button className={`${base} flex items-center gap-2 ${className}`} disabled={loading} {...props}>
      {loading ? <Loader2 size={15} className="animate-spin" /> : Icon ? <Icon size={15} /> : null}
      {children}
    </button>
  )
}

// ── Input ─────────────────────────────────────────────────────────────────────
export const Input = forwardRef(({ label, error, className = '', ...props }, ref) => (
  <div>
    {label && <label className="label">{label}</label>}
    <input ref={ref} className={`input ${error ? 'border-red-400' : ''} ${className}`} {...props} />
    {error && <p className="text-red-500 text-xs mt-1">{error}</p>}
  </div>
))
Input.displayName = 'Input'

// ── Select ────────────────────────────────────────────────────────────────────
export const Select = forwardRef(({ label, error, children, className = '', ...props }, ref) => (
  <div>
    {label && <label className="label">{label}</label>}
    <div className="relative">
      <select ref={ref}
        className={`input appearance-none pr-8 ${error ? 'border-red-400' : ''} ${className}`}
        {...props}>
        {children}
      </select>
      <ChevronDown size={14} className="absolute right-2 top-1/2 -translate-y-1/2 text-gray-400 pointer-events-none" />
    </div>
    {error && <p className="text-red-500 text-xs mt-1">{error}</p>}
  </div>
))
Select.displayName = 'Select'

// ── Textarea ──────────────────────────────────────────────────────────────────
export const Textarea = forwardRef(({ label, error, className = '', ...props }, ref) => (
  <div>
    {label && <label className="label">{label}</label>}
    <textarea ref={ref}
      className={`input resize-none ${error ? 'border-red-400' : ''} ${className}`}
      {...props} />
    {error && <p className="text-red-500 text-xs mt-1">{error}</p>}
  </div>
))
Textarea.displayName = 'Textarea'

// ── Modal ────────────────────────────────────────────────────────────────────
export function Modal({ open, onClose, title, children, size = 'md' }) {
  if (!open) return null
  const widths = { sm: 'max-w-md', md: 'max-w-xl', lg: 'max-w-3xl', xl: 'max-w-5xl' }
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50">
      <div className={`bg-white dark:bg-gray-800 rounded-2xl shadow-2xl w-full ${widths[size]} max-h-[90vh] flex flex-col`}>
        <div className="flex items-center justify-between px-6 py-4 border-b dark:border-gray-700">
          <h3 className="font-semibold text-gray-800 dark:text-gray-100">{title}</h3>
          <button onClick={onClose} className="text-gray-400 hover:text-gray-600 dark:hover:text-gray-200">
            <X size={18} />
          </button>
        </div>
        <div className="overflow-y-auto flex-1 px-6 py-4">{children}</div>
      </div>
    </div>
  )
}

// ── Confirm Dialog ────────────────────────────────────────────────────────────
export function ConfirmDialog({ open, onConfirm, onCancel, title, message, danger }) {
  if (!open) return null
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50">
      <div className="bg-white dark:bg-gray-800 rounded-2xl shadow-2xl w-full max-w-sm p-6">
        <h3 className="font-semibold text-gray-800 dark:text-gray-100 mb-2">{title}</h3>
        <p className="text-sm text-gray-500 dark:text-gray-400 mb-6">{message}</p>
        <div className="flex gap-3 justify-end">
          <Button variant="secondary" onClick={onCancel}>Cancel</Button>
          <Button variant={danger ? 'danger' : 'primary'} onClick={onConfirm}>Confirm</Button>
        </div>
      </div>
    </div>
  )
}

// ── Table ─────────────────────────────────────────────────────────────────────
export function Table({ columns, data, loading, emptyMsg = 'No records found.' }) {
  if (loading) return (
    <div className="flex items-center justify-center py-16">
      <Loader2 size={32} className="animate-spin text-primary-500" />
    </div>
  )
  return (
    <div className="overflow-x-auto">
      <table className="w-full">
        <thead>
          <tr>{columns.map(c => <th key={c.key} className="table-th">{c.label}</th>)}</tr>
        </thead>
        <tbody>
          {data?.length === 0
            ? <tr><td colSpan={columns.length} className="table-td text-center text-gray-400 py-8">{emptyMsg}</td></tr>
            : data?.map((row, i) => (
                <tr key={row.id || i} className="hover:bg-gray-50 dark:hover:bg-gray-700/50 transition-colors">
                  {columns.map(c => <td key={c.key} className="table-td">{c.render ? c.render(row) : row[c.key]}</td>)}
                </tr>
              ))
          }
        </tbody>
      </table>
    </div>
  )
}

// ── Page header ───────────────────────────────────────────────────────────────
export function PageHeader({ title, subtitle, action }) {
  return (
    <div className="flex items-start justify-between mb-6">
      <div>
        <h1 className="text-2xl font-bold text-gray-800 dark:text-gray-100">{title}</h1>
        {subtitle && <p className="text-sm text-gray-500 dark:text-gray-400 mt-0.5">{subtitle}</p>}
      </div>
      {action}
    </div>
  )
}

// ── Stat card ─────────────────────────────────────────────────────────────────
export function StatCard({ title, value, icon: Icon, color = 'bg-primary-900', sub, trend }) {
  return (
    <div className="card p-5 flex items-center gap-4">
      <div className={`p-3 rounded-xl ${color} flex-shrink-0`}>
        <Icon className="text-white" size={22} />
      </div>
      <div className="min-w-0">
        <p className="text-xs text-gray-500 dark:text-gray-400 truncate">{title}</p>
        <p className="text-2xl font-bold text-gray-800 dark:text-gray-100 leading-tight">{value ?? '—'}</p>
        {sub && <p className="text-xs text-gray-400 dark:text-gray-500 mt-0.5">{sub}</p>}
      </div>
      {trend !== undefined && (
        <span className={`ml-auto text-xs font-medium ${trend >= 0 ? 'text-green-500' : 'text-red-500'}`}>
          {trend >= 0 ? '▲' : '▼'} {Math.abs(trend)}%
        </span>
      )}
    </div>
  )
}

// ── Empty state ───────────────────────────────────────────────────────────────
export function Empty({ icon: Icon, message, action }) {
  return (
    <div className="flex flex-col items-center justify-center py-16 text-gray-400">
      {Icon && <Icon size={48} className="mb-4 opacity-40" />}
      <p className="text-sm">{message}</p>
      {action && <div className="mt-4">{action}</div>}
    </div>
  )
}

// ── Search input ──────────────────────────────────────────────────────────────
export function SearchInput({ value, onChange, placeholder = 'Search…' }) {
  return (
    <input
      type="text" value={value} onChange={e => onChange(e.target.value)}
      placeholder={placeholder}
      className="input w-64 text-sm"
    />
  )
}

// ── Tabs ──────────────────────────────────────────────────────────────────────
export function Tabs({ tabs, active, onChange }) {
  return (
    <div className="flex gap-1 border-b dark:border-gray-700 mb-6">
      {tabs.map(t => (
        <button key={t.key} onClick={() => onChange(t.key)}
          className={`px-4 py-2 text-sm font-medium border-b-2 transition-colors
            ${active === t.key
              ? 'border-primary-900 dark:border-primary-500 text-primary-900 dark:text-primary-400'
              : 'border-transparent text-gray-500 hover:text-gray-700 dark:hover:text-gray-300'}`}>
          {t.label}
          {t.count !== undefined && (
            <span className="ml-2 text-xs bg-gray-100 dark:bg-gray-700 px-1.5 py-0.5 rounded-full">
              {t.count}
            </span>
          )}
        </button>
      ))}
    </div>
  )
}

// ── Progress bar ─────────────────────────────────────────────────────────────
export function ProgressBar({ value, max, color = 'bg-primary-500' }) {
  const pct = max > 0 ? Math.min(100, (value / max) * 100) : 0
  return (
    <div className="w-full bg-gray-200 dark:bg-gray-700 rounded-full h-1.5">
      <div className={`${color} h-1.5 rounded-full transition-all`} style={{ width: `${pct}%` }} />
    </div>
  )
}
