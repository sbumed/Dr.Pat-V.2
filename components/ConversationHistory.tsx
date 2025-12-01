import React from 'react';
import type { Conversation, Theme } from '../types';
import { ResearchGuide } from './ResearchGuide';

interface ConversationHistoryProps {
  conversations: Conversation[];
  activeChatId: string | null;
  onSelectChat: (id: string) => void;
  onNewChat: () => void;
  onDeleteChat: (id: string) => void;
  isOpen: boolean;
  onToggle: () => void;
  onSelectGuideTopic: (title: string, content: string) => void;
  theme: Theme;
  activeTab: 'guide' | 'history';
  onTabChange: (tab: 'guide' | 'history') => void;
}

export const ConversationHistory: React.FC<ConversationHistoryProps> = ({
  conversations,
  activeChatId,
  onSelectChat,
  onNewChat,
  onDeleteChat,
  isOpen,
  onToggle,
  onSelectGuideTopic,
  theme,
  activeTab,
  onTabChange,
}) => {
  const handleDelete = (e: React.MouseEvent, id: string) => {
    e.stopPropagation();
    if (window.confirm('คุณแน่ใจหรือไม่ว่าต้องการลบการสนทนานี้?')) {
      onDeleteChat(id);
    }
  };

  // Determine styles based on theme
  const getThemeStyles = () => {
    switch (theme) {
      case 'pink':
        return {
          btn: 'bg-pink-600 hover:bg-pink-700',
          activeChat: 'bg-pink-50 text-pink-900 border-l-4 border-pink-500',
          tabActive: 'text-pink-700 border-pink-600 bg-pink-50',
          tabInactive: 'text-slate-500 hover:text-slate-700 hover:bg-slate-50',
        };
      case 'purple':
        return {
          btn: 'bg-purple-600 hover:bg-purple-700',
          activeChat: 'bg-purple-50 text-purple-900 border-l-4 border-purple-500',
          tabActive: 'text-purple-700 border-purple-600 bg-purple-50',
          tabInactive: 'text-slate-500 hover:text-slate-700 hover:bg-slate-50',
        };
      case 'red':
        return {
          btn: 'bg-red-600 hover:bg-red-700',
          activeChat: 'bg-red-50 text-red-900 border-l-4 border-red-500',
          tabActive: 'text-red-700 border-red-600 bg-red-50',
          tabInactive: 'text-slate-500 hover:text-slate-700 hover:bg-slate-50',
        };
      default: // blue
        return {
          btn: 'bg-indigo-600 hover:bg-indigo-700',
          activeChat: 'bg-indigo-50 text-indigo-900 border-l-4 border-indigo-500',
          tabActive: 'text-indigo-700 border-indigo-600 bg-indigo-50',
          tabInactive: 'text-slate-500 hover:text-slate-700 hover:bg-slate-50',
        };
    }
  };

  const themeStyles = getThemeStyles();

  return (
    <>
      {/* Backdrop */}
      <div 
        className={`fixed inset-0 bg-slate-900/40 backdrop-blur-sm z-40 transition-opacity duration-300 ${isOpen ? 'opacity-100' : 'opacity-0 pointer-events-none'}`} 
        onClick={onToggle}
        aria-hidden="true"
      ></div>

      {/* Drawer Panel */}
      <aside className={`fixed top-0 left-0 z-50 h-full w-full sm:w-[380px] bg-white shadow-2xl transform transition-transform duration-300 ease-out flex flex-col ${isOpen ? 'translate-x-0' : '-translate-x-full'}`}>
        
        {/* Header with Close Button */}
        <div className="p-4 border-b border-slate-100 flex justify-between items-center bg-white/50 backdrop-blur-md">
            <h2 className="font-bold text-xl text-slate-800 tracking-tight">เมนู (Menu)</h2>
            <button onClick={onToggle} className="p-2 rounded-full hover:bg-slate-100 text-slate-500 transition-colors">
                <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" /></svg>
            </button>
        </div>

        {/* Tabs */}
        <div className="flex border-b border-slate-200">
            <button 
                onClick={() => onTabChange('guide')}
                className={`flex-1 py-3 text-sm font-semibold text-center border-b-2 transition-all ${activeTab === 'guide' ? themeStyles.tabActive : `border-transparent ${themeStyles.tabInactive}`}`}
            >
                คู่มือการวิจัย (Guide)
            </button>
            <button 
                onClick={() => onTabChange('history')}
                className={`flex-1 py-3 text-sm font-semibold text-center border-b-2 transition-all ${activeTab === 'history' ? themeStyles.tabActive : `border-transparent ${themeStyles.tabInactive}`}`}
            >
                ประวัติ (History)
            </button>
        </div>

        {/* Content Area */}
        <div className="flex-1 overflow-y-auto scrollbar-thin scrollbar-thumb-slate-300 scrollbar-track-transparent">
            
            {/* Guide Content */}
            {activeTab === 'guide' && (
                <div className="p-4 animate-fadeInUp">
                    <div className="bg-slate-50 rounded-xl p-4 border border-slate-200 mb-4">
                        <h3 className="text-sm font-bold text-slate-700 mb-1">ยินดีต้อนรับสู่ Dr.Pat</h3>
                        <p className="text-xs text-slate-500">เลือกหัวข้อด้านล่างเพื่อเริ่มการเรียนรู้ หรือกดที่หัวข้อเพื่อเริ่มแชทเกี่ยวกับเรื่องนั้นๆ</p>
                    </div>
                    <ResearchGuide onSelectGuideTopic={onSelectGuideTopic} />
                </div>
            )}

            {/* History Content */}
            {activeTab === 'history' && (
                <div className="p-2 animate-fadeInUp">
                    <button onClick={onNewChat} className={`w-full mb-4 flex items-center justify-center gap-2 text-sm text-white px-4 py-3 rounded-xl shadow-md transition-all transform hover:scale-[1.02] active:scale-[0.98] ${themeStyles.btn}`}>
                        <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}><path strokeLinecap="round" strokeLinejoin="round" d="M12 4v16m8-8H4" /></svg>
                        <span>สร้างการสนทนาใหม่</span>
                    </button>

                    {conversations.length > 0 ? (
                        <ul className="space-y-1">
                        {conversations.slice().sort((a,b) => b.createdAt - a.createdAt).map((conv) => (
                            <li key={conv.id}>
                            <button
                                onClick={() => onSelectChat(conv.id)}
                                className={`w-full text-left p-3 rounded-xl transition-all group flex justify-between items-start gap-3 ${activeChatId === conv.id ? themeStyles.activeChat : 'hover:bg-slate-100 text-slate-600 border-l-4 border-transparent'}`}
                            >
                                <div className="flex-1 overflow-hidden">
                                    <p className="font-semibold text-sm truncate">{conv.title}</p>
                                    <p className="text-[10px] opacity-70 mt-1">{new Date(conv.createdAt).toLocaleString()}</p>
                                </div>
                                <div onClick={(e) => handleDelete(e, conv.id)} className="p-1.5 rounded-lg text-slate-400 hover:bg-red-50 hover:text-red-500 opacity-0 group-hover:opacity-100 transition-all flex-shrink-0" title="Delete Chat">
                                    <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}><path strokeLinecap="round" strokeLinejoin="round" d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" /></svg>
                                </div>
                            </button>
                            </li>
                        ))}
                        </ul>
                    ) : (
                        <div className="flex flex-col items-center justify-center py-10 text-slate-400">
                            <svg xmlns="http://www.w3.org/2000/svg" className="h-12 w-12 mb-2 opacity-20" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 10h.01M12 10h.01M16 10h.01M9 16H5a2 2 0 01-2-2V6a2 2 0 012-2h14a2 2 0 012 2v8a2 2 0 01-2 2h-5l-5 5v-5z" /></svg>
                            <p className="text-sm">ยังไม่มีประวัติการสนทนา</p>
                        </div>
                    )}
                </div>
            )}
        </div>
      </aside>
    </>
  );
};