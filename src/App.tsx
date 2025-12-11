import { useStore } from './store/useStore'
import { CanvasView } from './components/CanvasView'
import { ChatPanel } from './components/ChatPanel'
import { ChatToggle } from './components/ChatToggle'

function App() {
  const isChatOpen = useStore((state) => state.isChatOpen)

  return (
    <div className="h-full w-full flex bg-canvas-bg overflow-hidden">
      {/* Main Canvas Area */}
      <div className="flex-1 relative">
        <CanvasView />
        <ChatToggle />
      </div>

      {/* Chat Panel - Floating */}
      <div
        className={`fixed right-4 top-4 bottom-4 transition-all duration-300 ease-in-out ${
          isChatOpen ? 'w-96 opacity-100 translate-x-0' : 'w-96 opacity-0 translate-x-8 pointer-events-none'
        } z-40`}
      >
        <ChatPanel />
      </div>
    </div>
  )
}

export default App
