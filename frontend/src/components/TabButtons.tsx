import React from 'react'

type Tab = 'script' | 'markdown' | 'chat'

type Props = {
  activeTab: Tab
  onTabChange: (tab: Tab) => void
  hasScript: boolean
  hasMarkdown: boolean
  hasPdf: boolean
}

export const TabButtons: React.FC<Props> = ({
  activeTab,
  onTabChange,
  hasScript,
  hasMarkdown,
  hasPdf
}) => {
  const handleTabClick = (tab: Tab) => {
    if (
      (tab === 'script' && hasScript) ||
      (tab === 'markdown' && hasMarkdown) ||
      (tab === 'chat' && hasPdf)
    ) {
      onTabChange(tab)
    }
  }

  return (
    <div className="tab-buttons">
      <button
        className={`tab-button ${activeTab === 'script' ? 'active' : ''}`}
        onClick={() => handleTabClick('script')}
        disabled={!hasScript}
      >
        Script
      </button>
      <button
        className={`tab-button ${activeTab === 'markdown' ? 'active' : ''}`}
        onClick={() => handleTabClick('markdown')}
        disabled={!hasMarkdown}
      >
        Markdown
      </button>
      <button
        className={`tab-button ${activeTab === 'chat' ? 'active' : ''}`}
        onClick={() => handleTabClick('chat')}
        disabled={!hasPdf}
      >
        Chat
      </button>
    </div>
  )
}
