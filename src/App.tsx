import { CanvasView } from './components/CanvasView'

function App() {
  return (
    <div className="h-full w-full flex bg-canvas-bg overflow-hidden">
      {/* Main Canvas Area */}
      <div className="flex-1 relative">
        <CanvasView />
      </div>
    </div>
  )
}

export default App
