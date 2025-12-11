import { CanvasView } from './components/CanvasView'
import { ChatPanel } from './components/ChatPanel'
import { ChatToggle } from './components/ChatToggle'
import { useStore } from './store/useStore'

function App() {
  const { isChatOpen } = useStore()

  return (
    <div className="h-full w-full flex bg-canvas-bg overflow-hidden">
      {/* Main Canvas Area */}
      <div className="flex-1 relative">
        <CanvasView />
      </div>

      {/* Chat Panel */}
      {isChatOpen && <ChatPanel />}

      {/* Chat Toggle Button */}
      <ChatToggle />
    </div>
  )
}

export default App
