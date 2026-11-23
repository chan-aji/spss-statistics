import { useEffect, useState } from 'react'
import Landing from './components/Landing'
import Workspace from './components/workspace/Workspace'

function readRoute() {
  return window.location.hash.startsWith('#/workspace') ? 'workspace' : 'landing'
}

export default function App() {
  const [route, setRoute] = useState(readRoute())

  useEffect(() => {
    const onHash = () => {
      setRoute(readRoute())
      window.scrollTo({ top: 0, behavior: 'instant' as ScrollBehavior })
    }
    window.addEventListener('hashchange', onHash)
    return () => window.removeEventListener('hashchange', onHash)
  }, [])

  if (route === 'workspace') return <Workspace />
  return <Landing />
}
