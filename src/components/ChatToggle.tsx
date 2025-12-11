import { useStore } from '../store/useStore'

export function ChatToggle() {
  const { isChatOpen, toggleChat, messages } = useStore()

  const unreadCount = messages.filter((m) => m.role === 'assistant').length

  return (
    <button
      onClick={toggleChat}
      className={`absolute top-4 right-4 flex items-center justify-center w-16 h-16 bg-white/90 backdrop-blur-sm rounded-full shadow-lg hover:scale-105 transition-all ${
        isChatOpen ? 'opacity-0 pointer-events-none' : 'opacity-100'
      }`}
      title="Open AI Assistant"
    >
      <img
        src="/ai-avatar.png"
        alt="AI Assistant"
        className="w-12 h-12 object-contain"
      />
      {unreadCount > 0 && (
        <span className="absolute -top-1 -right-1 bg-[#522CEC] text-white text-xs w-5 h-5 flex items-center justify-center rounded-full">
          {unreadCount}
        </span>
      )}
    </button>
  )
}
