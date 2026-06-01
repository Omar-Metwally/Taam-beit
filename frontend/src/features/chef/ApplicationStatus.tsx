import { useState } from 'react'
import {
  ChevronRight, X, UserCheck, UtensilsCrossed,
  MapPin, Clock, FileText, Camera, ChefHat
} from 'lucide-react'
import { cn } from '@/lib/utils'

/* ─── Types ─── */
interface TodoItem {
  id: string
  icon: React.ReactNode
  title: string
  description: string
  required: boolean
  done: boolean
}

interface WelcomeModalProps {
  onClose: () => void
}

/* ─── Welcome Modal ─── */
function WelcomeModal({ onClose }: WelcomeModalProps) {
  return (
    <div className="fixed inset-0 bg-black/40 backdrop-blur-sm z-50 flex items-center justify-center p-4">
      <div className="bg-white rounded-2xl shadow-2xl w-full max-w-md p-8 relative fade-up">
        <button
          onClick={onClose}
          className="absolute top-4 right-4 text-[--text-muted] hover:text-[--text-primary] transition-colors"
        >
          <X size={18} />
        </button>

        {/* Coin illustration */}
        <div className="flex justify-center mb-6">
          <div className="w-24 h-24 bg-brand-50 rounded-full flex items-center justify-center">
            <span className="text-5xl">🪙</span>
          </div>
        </div>

        <h2 className="font-display text-2xl font-bold text-center text-[--text-primary] mb-1">
          Welcome To{' '}
          <span className="text-brand-600">Ta'am Beit</span>
          , Chef!
        </h2>
        <p className="text-[--text-muted] text-sm text-center mb-6">
          We're excited to have you on board.
        </p>

        <div className="mb-7">
          <p className="font-semibold text-sm text-[--text-primary] mb-3">
            Here's how to get started:
          </p>
          <ol className="flex flex-col gap-3">
            {[
              { title: 'Set Up Your Profile:', body: 'Complete your personal and culinary details.' },
              { title: 'Verify Your Credentials:', body: 'Ensure all necessary health and safety certificates are uploaded.' },
              { title: 'Add Your Dishes:', body: 'Start adding your delicious creations.' },
            ].map((step, i) => (
              <li key={i} className="flex gap-2 text-sm text-[--text-primary]">
                <span className="font-semibold shrink-0">{i + 1}.</span>
                <span>
                  <span className="font-semibold">{step.title}</span>{' '}
                  {step.body}
                </span>
              </li>
            ))}
          </ol>
        </div>

        <button
          onClick={onClose}
          className="btn-primary w-full py-3.5 text-base"
        >
          Let's Get Cooking!
        </button>

        <p className="text-center text-xs text-[--text-muted] mt-4">
          Need help? Visit our{' '}
          <a href="#" className="text-brand-600 hover:underline font-medium">
            Help Center
          </a>
        </p>
      </div>
    </div>
  )
}

/* ─── Progress Bar ─── */
function ProgressBar({ done, total }: { done: number; total: number }) {
  const pct = total === 0 ? 0 : Math.round((done / total) * 100)
  return (
    <div className="w-full h-1.5 bg-[--border] rounded-full overflow-hidden">
      <div
        className="h-full bg-brand-500 rounded-full transition-all duration-700"
        style={{ width: `${pct}%` }}
      />
    </div>
  )
}

/* ─── Task Row ─── */
function TaskRow({ item, onToggle }: { item: TodoItem; onToggle: (id: string) => void }) {
  return (
    <button
      onClick={() => onToggle(item.id)}
      className={cn(
        'w-full flex items-center gap-4 px-4 py-4 rounded-xl border transition-all duration-200 text-left group',
        item.done
          ? 'bg-brand-50 border-brand-200 opacity-70'
          : 'bg-white border-[--border] hover:border-brand-300 hover:shadow-sm'
      )}
    >
      {/* Icon bubble */}
      <div className={cn(
        'w-11 h-11 rounded-full flex items-center justify-center shrink-0 transition-colors',
        item.done ? 'bg-brand-500 text-white' : 'bg-brand-100 text-brand-600'
      )}>
        {item.done
          ? <span className="text-lg">✓</span>
          : item.icon
        }
      </div>

      {/* Text */}
      <div className="flex-1 min-w-0">
        <p className={cn(
          'text-sm font-semibold',
          item.done ? 'line-through text-[--text-muted]' : 'text-[--text-primary]'
        )}>
          {item.title}
        </p>
        <p className="text-xs text-[--text-muted] mt-0.5 truncate">
          {item.description}
        </p>
      </div>

      <ChevronRight
        size={16}
        className={cn(
          'shrink-0 transition-colors',
          item.done ? 'text-brand-400' : 'text-[--text-muted] group-hover:text-brand-500'
        )}
      />
    </button>
  )
}

/* ─── Main Page ─── */
const INITIAL_TASKS: TodoItem[] = [
  {
    id: 'legal',
    icon: <UserCheck size={18} />,
    title: 'Complete your legal credentials',
    description: 'Ensure you meet all legal requirements',
    required: true,
    done: false,
  },
  {
    id: 'dish',
    icon: <UtensilsCrossed size={18} />,
    title: 'Add your first dish',
    description: 'Start by adding a signature dish',
    required: true,
    done: false,
  },
  {
    id: 'cuisine',
    icon: <ChefHat size={18} />,
    title: 'Select Cuisine',
    description: "Choose the type of cuisine you'll offer",
    required: false,
    done: false,
  },
  {
    id: 'bio',
    icon: <FileText size={18} />,
    title: 'Write Your bio',
    description: 'Introduce yourself to your customers',
    required: false,
    done: false,
  },
  {
    id: 'photo',
    icon: <Camera size={18} />,
    title: 'Upload your photo',
    description: 'Add a profile picture for a personal touch',
    required: false,
    done: false,
  },
]

export default function ChefApplicationStatus() {
  const [showModal, setShowModal] = useState(true)
  const [tasks, setTasks] = useState(INITIAL_TASKS)
  const [optionalOpen, setOptionalOpen] = useState(true)

  const toggle = (id: string) => {
    setTasks(prev => prev.map(t => t.id === id ? { ...t, done: !t.done } : t))
  }

  const required = tasks.filter(t => t.required)
  const optional  = tasks.filter(t => !t.required)
  const requiredDone = required.filter(t => t.done).length
  const optionalDone = optional.filter(t => t.done).length

  return (
    <>
      {showModal && <WelcomeModal onClose={() => setShowModal(false)} />}

      <div className="min-h-full bg-[--bg]">
        {/* Hero banner */}
        <div className="flex flex-col items-center pt-10 pb-8 px-4">
          <div className="w-28 h-28 bg-brand-50 rounded-full flex items-center justify-center mb-4 shadow-inner">
            <span className="text-6xl">🪙</span>
          </div>
          <h1 className="font-display text-2xl font-bold text-[--text-primary] text-center">
            Top Chefs earn{' '}
            <span className="text-brand-600">5000 EGP</span> per day!
          </h1>
          <p className="text-[--text-muted] text-sm mt-1">
            Finish your application and start earning
          </p>
        </div>

        {/* Task cards */}
        <div className="max-w-2xl mx-auto px-4 pb-16 flex flex-col gap-4">

          {/* To-do section */}
          <div className="bg-white rounded-2xl border border-[--border] shadow-card overflow-hidden">
            <div className="px-5 pt-5 pb-3">
              <div className="flex items-center justify-between mb-2">
                <h2 className="font-semibold text-[--text-primary]">To-do</h2>
                <span className="text-xs text-[--text-muted]">
                  {requiredDone}/{required.length} done
                </span>
              </div>
              <ProgressBar done={requiredDone} total={required.length} />
            </div>
            <div className="px-4 pb-4 flex flex-col gap-2">
              {required.map(item => (
                <TaskRow key={item.id} item={item} onToggle={toggle} />
              ))}
            </div>
          </div>

          {/* Optional section */}
          <div className="bg-white rounded-2xl border border-[--border] shadow-card overflow-hidden">
            <button
              onClick={() => setOptionalOpen(o => !o)}
              className="w-full px-5 pt-5 pb-3 text-left"
            >
              <div className="flex items-center justify-between mb-2">
                <h2 className="font-semibold text-[--text-primary]">Optional</h2>
                <div className="flex items-center gap-2">
                  <span className="text-xs text-[--text-muted]">
                    {optionalDone}/{optional.length} done
                  </span>
                  <span className={cn(
                    'transition-transform duration-200 text-[--text-muted]',
                    optionalOpen ? 'rotate-180' : 'rotate-0'
                  )}>
                    ▲
                  </span>
                </div>
              </div>
              <ProgressBar done={optionalDone} total={optional.length} />
            </button>

            {optionalOpen && (
              <div className="px-4 pb-4 flex flex-col gap-2">
                {optional.map(item => (
                  <TaskRow key={item.id} item={item} onToggle={toggle} />
                ))}
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Floating help button */}
      <button className="fixed bottom-6 right-6 w-12 h-12 bg-brand-600 text-white rounded-full shadow-lg hover:bg-brand-700 transition-colors flex items-center justify-center z-10">
        <span className="text-lg">💬</span>
      </button>
    </>
  )
}
