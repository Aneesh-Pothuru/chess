import { useEffect, useState } from 'react'
import { initAutoSync } from './lib/sync'
import { Dashboard } from './features/dashboard/Dashboard'
import { Play } from './features/play/Play'
import { Openings } from './features/openings/Openings'
import { Puzzles } from './features/puzzles/Puzzles'
import { Endgame } from './features/endgame/Endgame'
import { Calculation } from './features/calculation/Calculation'
import { Review } from './features/review/Review'
import { Progress } from './features/progress/Progress'

export type Route = 'dashboard' | 'play' | 'openings' | 'puzzles' | 'endgame' | 'calculation' | 'review' | 'progress'

const NAV: Array<{ route: Route; label: string }> = [
  { route: 'dashboard', label: 'Today' },
  { route: 'play', label: 'Play the coach' },
  { route: 'openings', label: 'Opening lab' },
  { route: 'puzzles', label: 'Tactics' },
  { route: 'endgame', label: 'Conversion gym' },
  { route: 'calculation', label: 'Calculation' },
  { route: 'progress', label: 'Progress' },
  { route: 'review', label: 'My games' },
]

export default function App() {
  const [route, setRoute] = useState<Route>('dashboard')
  const [target, setTarget] = useState<string | undefined>()

  useEffect(() => initAutoSync(), [])

  function go(r: Route, t?: string) {
    setRoute(r)
    setTarget(t)
  }

  return (
    <div className="shell">
      <nav className="rail">
        <div className="brand">
          Chess Coach
          <em>pots1125 edition</em>
        </div>
        {NAV.map((item) => (
          <button
            key={item.route}
            className={route === item.route ? 'active' : ''}
            onClick={() => go(item.route)}
          >
            {item.label}
          </button>
        ))}
        <div className="foot">
          Stockfish 18 · lichess puzzles (CC0)
          <br />
          castle by 8 · spend the clock · convert
        </div>
      </nav>
      <main className="main">
        {route === 'dashboard' && <Dashboard go={go} />}
        {route === 'play' && <Play />}
        {route === 'openings' && <Openings key={target} initialTarget={target} />}
        {route === 'puzzles' && <Puzzles key={target} initialTarget={target} />}
        {route === 'endgame' && <Endgame key={target} initialTarget={target} />}
        {route === 'calculation' && <Calculation />}
        {route === 'progress' && <Progress />}
        {route === 'review' && <Review />}
      </main>
    </div>
  )
}
