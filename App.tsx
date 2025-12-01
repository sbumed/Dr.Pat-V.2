import React, { useState, useEffect, useRef, FormEvent } from 'react';
import { Content, Part } from '@google/genai';
import type { ChatMessageType, Conversation, Language, Theme } from './types';
import { streamDrPatResponse } from './services/geminiService';
import { ChatMessage } from './components/ChatMessage';
import { TopicSuggestions } from './components/TopicSuggestions';
import { ConversationHistory } from './components/ConversationHistory';
import { SuggestedQuestions } from './components/SuggestedQuestions';
import { parseResponse } from './utils/parser';

const INITIAL_MESSAGE_TH: ChatMessageType = {
    role: 'model',
    text: 'สวัสดีครับ ผม **Dr.Pat V.2** ท่านอยากรู้เรื่องวิจัยทางการบริหารการศึกษาใช่ไหมครับ อยากรู้อะไรสอบถามมาได้เลยครับ หรือเลือกดูหัวข้อจาก "คู่มือการวิจัย" ด้านบนได้เลยครับ'
};

const INITIAL_MESSAGE_EN: ChatMessageType = {
    role: 'model',
    text: 'Hello, I am **Dr.Pat V.2**. Are you interested in educational administration research? Feel free to ask me anything, or browse the "Research Guide" above.'
};

const INITIAL_MESSAGE_ZH: ChatMessageType = {
    role: 'model',
    text: '您好，我是 **Dr.Pat V.2**。您对教育管理研究感兴趣吗？请随时提问，或者查看上方的“研究指南”。'
};

// UI Translations
const UI_TEXT = {
    th: {
        title: 'Dr.Pat V.2',
        subtitle: 'Educational Research Specialist',
        placeholder: 'สอบถาม Dr.Pat ได้ที่นี่...',
        newChat: 'แชทใหม่',
        export: 'Export PDF',
        attach: 'แนบไฟล์',
        send: 'ส่ง',
        history: 'ประวัติ',
        guide: 'คู่มือวิจัย',
        error: 'ขออภัยครับ เกิดข้อผิดพลาด: ',
        processing: 'กำลังประมวลผล...',
        files: 'ไฟล์แนบ:',
        copyright: '©2025 Dr.Pattaroj Kamonrojsiri. All rights reserved.'
    },
    en: {
        title: 'Dr.Pat V.2',
        subtitle: 'Educational Research Specialist',
        placeholder: 'Ask Dr.Pat anything here...',
        newChat: 'New Chat',
        export: 'Export PDF',
        attach: 'Attach',
        send: 'Send',
        history: 'History',
        guide: 'Guide',
        error: 'Sorry, an error occurred: ',
        processing: 'Processing...',
        files: 'Attachments:',
        copyright: '©2025 Dr.Pattaroj Kamonrojsiri. All rights reserved.'
    },
    zh: {
        title: 'Dr.Pat V.2',
        subtitle: '教育研究专家',
        placeholder: '在这里询问 Dr.Pat...',
        newChat: '新对话',
        export: '导出 PDF',
        attach: '附件',
        send: '发送',
        history: '历史',
        guide: '指南',
        error: '抱歉，发生了错误：',
        processing: '处理中...',
        files: '附件：',
        copyright: '©2025 Dr.Pattaroj Kamonrojsiri. All rights reserved.'
    }
};

const SUGGESTED_TOPICS = [
    'หัวข้อวิจัยบริหารการศึกษาที่ทันสมัย',
    'แนวคิด "ภาวะผู้นำดิจิทัล" ในสถานศึกษา',
    'เทคนิคการกำหนดขนาดกลุ่มตัวอย่าง (Sample Size)',
    'การตรวจสอบคุณภาพเครื่องมือวิจัย (IOC & Reliability)',
    'สถิติที่เหมาะสมสำหรับการเปรียบเทียบผลสัมฤทธิ์',
    'แนวทางการเขียนอภิปรายผลให้สอดคล้องกับทฤษฎี',
];

const fileToBase64 = (file: File): Promise<string> => {
    return new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.readAsDataURL(file);
      reader.onload = () => resolve((reader.result as string).split(',')[1]);
      reader.onerror = (error) => reject(error);
    });
};

const App: React.FC = () => {
  const [conversations, setConversations] = useState<Conversation[]>([]);
  const [activeChatId, setActiveChatId] = useState<string | null>(null);
  const [userInput, setUserInput] = useState<string>('');
  const [stagedFiles, setStagedFiles] = useState<File[]>([]);
  const [isLoading, setIsLoading] = useState<boolean>(false);
  const [error, setError] = useState<string | null>(null);
  const [isDrawerOpen, setIsDrawerOpen] = useState(false);
  const [activeTab, setActiveTab] = useState<'guide' | 'history'>('guide');
  const [suggestedQuestions, setSuggestedQuestions] = useState<string[]>([]);
  
  // New State for Settings
  const [language, setLanguage] = useState<Language>('th');
  const [theme, setTheme] = useState<Theme>('blue');

  const chatContainerRef = useRef<HTMLDivElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const activeConversation = conversations.find(c => c.id === activeChatId);
  const messages = activeConversation?.messages ?? [];

  // Initial Message based on Language
  const getInitialMessage = (lang: Language) => {
      if (lang === 'en') return INITIAL_MESSAGE_EN;
      if (lang === 'zh') return INITIAL_MESSAGE_ZH;
      return INITIAL_MESSAGE_TH;
  };

  const createNewChat = () => {
    const newChat: Conversation = {
        id: Date.now().toString() + Math.random().toString(),
        title: language === 'th' ? 'การสนทนาใหม่' : (language === 'en' ? 'New Chat' : '新对话'),
        createdAt: Date.now(),
        messages: [getInitialMessage(language)],
    };
    setConversations(prev => [newChat, ...prev]);
    setActiveChatId(newChat.id);
    setSuggestedQuestions([]);
    setIsDrawerOpen(false); // Close drawer on new chat
    return newChat.id;
  };

  useEffect(() => {
    try {
        const savedData = localStorage.getItem('drPatConversations');
        if (savedData) {
            const parsedData = JSON.parse(savedData);
            if (Array.isArray(parsedData) && parsedData.length > 0) {
                setConversations(parsedData);
                const lastActiveId = localStorage.getItem('drPatLastActiveId');
                const chatExists = parsedData.some(c => c.id === lastActiveId);
                setActiveChatId(lastActiveId && chatExists ? lastActiveId : parsedData[0].id);
            } else {
                createNewChat();
            }
        } else {
            createNewChat();
        }
    } catch(e) { console.error("Failed to load from storage", e); createNewChat(); }
  }, []);

  useEffect(() => {
    if (conversations.length > 0) {
        localStorage.setItem('drPatConversations', JSON.stringify(conversations));
    }
    if (activeChatId) {
        localStorage.setItem('drPatLastActiveId', activeChatId);
    }
  }, [conversations, activeChatId]);

  useEffect(() => {
    chatContainerRef.current?.scrollTo({ top: chatContainerRef.current.scrollHeight, behavior: 'smooth' });
  }, [messages, suggestedQuestions, isLoading]);
  
  const updateConversationMessages = (chatId: string, messages: ChatMessageType[] | ((prev: ChatMessageType[]) => ChatMessageType[])) => {
    setConversations(prev => prev.map(c => c.id === chatId ? { ...c, messages: typeof messages === 'function' ? messages(c.messages) : messages } : c));
  };

  const sendMessage = async (prompt: string, files: File[] = []) => {
    if ((!prompt.trim() && files.length === 0) || isLoading) return;
    
    let currentChatId = activeChatId;
    let currentConversation = activeConversation;

    if (!currentChatId || !currentConversation || (currentConversation.messages.length > 1 && prompt.trim())) {
        currentChatId = createNewChat();
        currentConversation = {
            id: currentChatId,
            title: UI_TEXT[language].newChat,
            createdAt: Date.now(),
            messages: [getInitialMessage(language)],
        };
    }
    
    setIsLoading(true);
    setError(null);
    setSuggestedQuestions([]);

    const userMessage: ChatMessageType = { role: 'user', text: prompt };
    
    if (currentConversation.messages.length === 1) {
        const newTitle = prompt.trim() ? prompt.substring(0, 40) : files.map(f => f.name).join(', ').substring(0, 40);
        setConversations(prev => prev.map(c => c.id === currentChatId ? { ...c, title: newTitle } : c));
    }
    updateConversationMessages(currentChatId, prev => [...prev, userMessage]);
    
    try {
      const historyForApi: Content[] = currentConversation.messages
        .slice(1)
        .filter(msg => msg.role === 'user' || msg.role === 'model')
        .map(msg => ({ role: msg.role, parts: [{ text: msg.text }] }));

      const userParts: Part[] = [];
      if (prompt.trim()) {
          userParts.push({ text: prompt });
      }
      for (const file of files) {
          const base64Data = await fileToBase64(file);
          userParts.push({
              inlineData: {
                  mimeType: file.type,
                  data: base64Data,
              }
          });
      }
      historyForApi.push({ role: 'user', parts: userParts });
      
      updateConversationMessages(currentChatId, prev => [...prev, { role: 'model', text: '...' }]);
      
      const stream = await streamDrPatResponse(historyForApi, language);

      let botResponseText = '';
      
      for await (const chunk of stream) {
        botResponseText += chunk.text;
        updateConversationMessages(currentChatId, prev => {
            const newMessages = [...prev];
            newMessages[newMessages.length - 1] = { role: 'model', text: botResponseText };
            return newMessages;
        });
      }

      const { content, suggestions } = parseResponse(botResponseText);
      updateConversationMessages(currentChatId, prev => {
          const newMessages = [...prev];
          newMessages[newMessages.length - 1] = { role: 'model', text: content };
          return newMessages;
      });
      setSuggestedQuestions(suggestions);

    } catch (err: any) {
      const errorMessage = err instanceof Error ? err.message : 'An unknown error occurred.';
      setError(`${UI_TEXT[language].error}${errorMessage}`);
      updateConversationMessages(currentChatId, prev => {
           const msgs = [...prev];
           if (msgs[msgs.length - 1].text === '...') msgs.pop();
           return [...msgs, { role: 'model', text: `${UI_TEXT[language].error} ${errorMessage}` }];
      });
    } finally {
      setIsLoading(false);
    }
  };

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault();
    await sendMessage(userInput, stagedFiles);
    setUserInput('');
    setStagedFiles([]);
    if(fileInputRef.current) fileInputRef.current.value = '';
  };
  
  const handleSelectTopic = async (topic: string) => {
    await sendMessage(topic);
    setUserInput('');
    setStagedFiles([]);
  };

  const handleSelectGuideTopic = (title: string, content: string) => {
    const newChat: Conversation = {
      id: Date.now().toString() + Math.random().toString(),
      title: title,
      createdAt: Date.now(),
      messages: [
        getInitialMessage(language),
        { role: 'model', text: content }
      ],
    };
    setConversations(prev => [newChat, ...prev]);
    setActiveChatId(newChat.id);
    setSuggestedQuestions([]);
    setIsDrawerOpen(false);
  };

  const handleDeleteChat = (id: string) => {
    setConversations(prev => prev.filter(c => c.id !== id));
    if (activeChatId === id) {
        const remainingChats = conversations.filter(c => c.id !== id);
        setActiveChatId(remainingChats.length > 0 ? remainingChats[0].id : null);
        if (remainingChats.length === 0) createNewChat();
    }
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files) {
      setStagedFiles(prev => [...prev, ...Array.from(e.target.files!)]);
    }
  };

  const removeStagedFile = (indexToRemove: number) => {
    setStagedFiles(prev => prev.filter((_, index) => index !== indexToRemove));
  };

  const handleExportPDF = () => {
    window.print();
  };

  const openDrawer = (tab: 'guide' | 'history') => {
    setActiveTab(tab);
    setIsDrawerOpen(true);
  };

  const isActionDisabled = isLoading;

  // Theme classes logic
  const getThemeClasses = () => {
      switch(theme) {
          case 'pink':
              return {
                  bg: 'bg-gradient-to-br from-pink-50 to-white',
                  header: 'bg-white/90 backdrop-blur-xl border-pink-100',
                  title: 'text-pink-800',
                  subtitle: 'text-pink-600',
                  main: 'bg-transparent',
                  inputRing: 'focus:ring-pink-400',
                  sendBtn: 'bg-gradient-to-r from-pink-500 to-rose-500 hover:from-pink-600 hover:to-rose-600',
                  stagedFiles: 'bg-white border-pink-100 text-slate-700',
                  fileTag: 'bg-pink-50 text-pink-800 border-pink-100',
                  navBtn: 'text-pink-700 hover:bg-pink-50',
                  navBtnActive: 'bg-pink-100 text-pink-900',
              };
          case 'purple':
              return {
                  bg: 'bg-gradient-to-br from-purple-50 to-white',
                  header: 'bg-white/90 backdrop-blur-xl border-purple-100',
                  title: 'text-purple-800',
                  subtitle: 'text-purple-600',
                  main: 'bg-transparent',
                  inputRing: 'focus:ring-purple-400',
                  sendBtn: 'bg-gradient-to-r from-purple-500 to-indigo-500 hover:from-purple-600 hover:to-indigo-600',
                  stagedFiles: 'bg-white border-purple-100 text-slate-700',
                  fileTag: 'bg-purple-50 text-purple-800 border-purple-100',
                  navBtn: 'text-purple-700 hover:bg-purple-50',
                  navBtnActive: 'bg-purple-100 text-purple-900',
              };
          case 'red':
              return {
                  bg: 'bg-gradient-to-br from-orange-50 to-white',
                  header: 'bg-white/90 backdrop-blur-xl border-orange-100',
                  title: 'text-orange-800',
                  subtitle: 'text-orange-600',
                  main: 'bg-transparent',
                  inputRing: 'focus:ring-orange-400',
                  sendBtn: 'bg-gradient-to-r from-orange-500 to-red-500 hover:from-orange-600 hover:to-red-600',
                  stagedFiles: 'bg-white border-orange-100 text-slate-700',
                  fileTag: 'bg-orange-50 text-orange-800 border-orange-100',
                  navBtn: 'text-orange-700 hover:bg-orange-50',
                  navBtnActive: 'bg-orange-100 text-orange-900',
              };
          default: // blue
              return {
                  bg: 'bg-gradient-to-br from-slate-50 to-white',
                  header: 'bg-white/90 backdrop-blur-xl border-slate-200/60',
                  title: 'text-indigo-900',
                  subtitle: 'text-indigo-600',
                  main: 'bg-transparent',
                  inputRing: 'focus:ring-indigo-400',
                  sendBtn: 'bg-gradient-to-r from-indigo-600 to-blue-600 hover:from-indigo-700 hover:to-blue-700',
                  stagedFiles: 'bg-slate-50 border-slate-200 text-slate-700',
                  fileTag: 'bg-white border shadow-sm text-slate-700',
                  navBtn: 'text-slate-600 hover:bg-slate-100',
                  navBtnActive: 'bg-slate-100 text-slate-900',
              };
      }
  };

  const themeClasses = getThemeClasses();

  return (
    <div className={`flex flex-col h-screen font-sans overflow-hidden ${themeClasses.bg}`}>
        
        {/* Navigation Drawer (Overlay) */}
        <ConversationHistory 
            conversations={conversations} 
            activeChatId={activeChatId} 
            onSelectChat={(id) => {setActiveChatId(id); setSuggestedQuestions([]); setIsDrawerOpen(false);}} 
            onNewChat={createNewChat} 
            onDeleteChat={handleDeleteChat} 
            isOpen={isDrawerOpen} 
            onToggle={() => setIsDrawerOpen(o => !o)}
            onSelectGuideTopic={handleSelectGuideTopic}
            theme={theme}
            activeTab={activeTab}
            onTabChange={setActiveTab}
        />

        {/* Top Navbar */}
        <header className={`px-4 py-3 sm:px-6 shadow-sm z-30 border-b flex justify-between items-center transition-all duration-300 no-print ${themeClasses.header}`}>
            <div className="flex items-center gap-3 md:gap-4">
                <div className="relative group cursor-pointer" onClick={() => window.location.reload()}>
                    <img src="https://i.postimg.cc/VLNqd047/Dr-Pattaroj-V-2.png" alt="Dr. Pat Profile" className="h-10 w-10 sm:h-11 sm:w-11 rounded-full object-cover ring-2 ring-offset-2 ring-indigo-50 shadow-sm transition-transform group-hover:scale-105" />
                    <span className="absolute bottom-0 right-0 block h-2.5 w-2.5 rounded-full ring-2 ring-white bg-emerald-500"></span>
                </div>
                <div className="flex flex-col">
                    <h1 className={`text-lg sm:text-xl font-bold tracking-tight leading-none ${themeClasses.title}`}>{UI_TEXT[language].title}</h1>
                    <span className={`text-[10px] sm:text-xs font-medium tracking-wide opacity-80 ${themeClasses.subtitle}`}>{UI_TEXT[language].subtitle}</span>
                </div>
                
                {/* Desktop Navigation Links */}
                <nav className="hidden md:flex ml-6 gap-1">
                    <button onClick={() => openDrawer('guide')} className={`px-3 py-1.5 rounded-full text-sm font-medium transition-colors ${activeTab === 'guide' && isDrawerOpen ? themeClasses.navBtnActive : themeClasses.navBtn}`}>
                        {UI_TEXT[language].guide}
                    </button>
                    <button onClick={() => openDrawer('history')} className={`px-3 py-1.5 rounded-full text-sm font-medium transition-colors ${activeTab === 'history' && isDrawerOpen ? themeClasses.navBtnActive : themeClasses.navBtn}`}>
                        {UI_TEXT[language].history}
                    </button>
                </nav>
            </div>

            <div className="flex items-center gap-2 sm:gap-3">
                {/* Mobile Menu Trigger */}
                <button onClick={() => setIsDrawerOpen(true)} className="md:hidden p-2 rounded-full hover:bg-black/5 text-slate-500 transition-colors">
                    <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6h16M4 12h16M4 18h16" /></svg>
                </button>

                {/* New Chat Button (Desktop) */}
                <button onClick={createNewChat} className={`hidden sm:flex items-center gap-2 px-4 py-2 rounded-full text-white text-sm font-semibold shadow-md hover:shadow-lg transition-all transform hover:-translate-y-0.5 ${themeClasses.sendBtn}`}>
                    <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}><path strokeLinecap="round" strokeLinejoin="round" d="M12 4v16m8-8H4" /></svg>
                    {UI_TEXT[language].newChat}
                </button>

                 {/* Export Button */}
                 {messages.length > 1 && (
                    <button onClick={handleExportPDF} className="hidden lg:flex items-center justify-center w-9 h-9 rounded-full bg-slate-100 text-slate-600 hover:bg-slate-200 transition-colors" title={UI_TEXT[language].export}>
                         <svg xmlns="http://www.w3.org/2000/svg" className="h-4.5 w-4.5" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4" /></svg>
                    </button>
                )}

                <div className="h-6 w-px bg-slate-200 mx-1 hidden sm:block"></div>

                {/* Settings Group */}
                <div className="flex items-center bg-slate-100/80 p-1 rounded-full border border-slate-200/50">
                    <div className="flex">
                        {(['th', 'en', 'zh'] as Language[]).map(lang => (
                            <button 
                                key={lang}
                                onClick={() => setLanguage(lang)}
                                className={`w-7 h-7 flex items-center justify-center rounded-full text-[10px] font-bold transition-all ${language === lang ? 'bg-white shadow-sm text-indigo-700' : 'text-slate-400 hover:text-slate-600'}`}
                            >
                                {lang.toUpperCase()}
                            </button>
                        ))}
                    </div>
                </div>
                
                <div className="hidden sm:flex items-center gap-1.5 ml-1">
                     <button onClick={() => setTheme('blue')} className={`w-5 h-5 rounded-full bg-indigo-500 ring-2 ring-offset-1 transition-all ${theme === 'blue' ? 'ring-indigo-200 scale-110' : 'ring-transparent hover:scale-110'}`} title="Modern Blue"></button>
                     <button onClick={() => setTheme('pink')} className={`w-5 h-5 rounded-full bg-pink-500 ring-2 ring-offset-1 transition-all ${theme === 'pink' ? 'ring-pink-200 scale-110' : 'ring-transparent hover:scale-110'}`} title="Vibrant Pink"></button>
                     <button onClick={() => setTheme('purple')} className={`w-5 h-5 rounded-full bg-purple-500 ring-2 ring-offset-1 transition-all ${theme === 'purple' ? 'ring-purple-200 scale-110' : 'ring-transparent hover:scale-110'}`} title="Elegant Purple"></button>
                     <button onClick={() => setTheme('red')} className={`w-5 h-5 rounded-full bg-orange-500 ring-2 ring-offset-1 transition-all ${theme === 'red' ? 'ring-orange-200 scale-110' : 'ring-transparent hover:scale-110'}`} title="Energetic Orange"></button>
                </div>
            </div>
        </header>

        {/* Main Content Area */}
        <main ref={chatContainerRef} className={`flex-1 overflow-y-auto p-4 sm:p-6 space-y-6 scroll-smooth ${themeClasses.main}`}>
            <div className="print-only p-8">
                <div className="flex items-center gap-4 mb-6 pb-6 border-b border-slate-300">
                    <img src="https://i.postimg.cc/VLNqd047/Dr-Pattaroj-V-2.png" alt="Dr. Pat" className="h-20 w-20 rounded-full" />
                    <div>
                        <h1 className="text-3xl font-bold text-slate-900">{UI_TEXT[language].title}</h1>
                        <p className="text-lg text-slate-600">{UI_TEXT[language].subtitle}</p>
                    </div>
                </div>
                <div className="mb-8">
                    <p className="text-sm font-bold text-slate-500 uppercase tracking-wider mb-1">Topic</p>
                    <p className="text-xl text-slate-900 font-semibold">{activeConversation?.title || 'Chat'}</p>
                    <p className="text-sm text-slate-500 mt-2">Date: {new Date().toLocaleString()}</p>
                </div>
            </div>

            <div className="max-w-4xl mx-auto w-full space-y-6">
                {messages.map((msg, index) => <ChatMessage key={index} message={msg} />)}
                
                {messages.length === 1 && !isLoading && <TopicSuggestions topics={SUGGESTED_TOPICS} onSelectTopic={handleSelectTopic} />}
                
                {!isLoading && suggestedQuestions.length > 0 && <SuggestedQuestions questions={suggestedQuestions} onSelectQuestion={handleSelectTopic} />}
                
                <div className="h-4"></div>
            </div>
        </main>

        {/* Footer Input Area */}
        <footer className={`p-4 sm:p-6 no-print bg-white/70 backdrop-blur-xl border-t border-slate-200/60 shadow-[0_-10px_40px_-15px_rgba(0,0,0,0.05)]`}>
            <div className="max-w-4xl mx-auto w-full">
                {error && <div className="bg-red-50 border border-red-100 text-red-600 px-4 py-2.5 rounded-xl text-sm text-center mb-4 animate-fadeInUp shadow-sm">{error}</div>}
                
                {stagedFiles.length > 0 && (
                    <div className={`p-3 mb-3 border rounded-2xl ${themeClasses.stagedFiles}`}>
                        <p className={`text-[10px] font-bold uppercase tracking-wider mb-2 text-slate-400 pl-1`}>{UI_TEXT[language].files}</p>
                        <div className="flex flex-wrap gap-2">
                            {stagedFiles.map((file, index) => (
                                <div key={index} className={`relative rounded-xl py-1.5 pl-3 pr-8 text-xs flex items-center gap-2 max-w-[200px] shadow-sm ${themeClasses.fileTag}`}>
                                    <span className="truncate font-medium" title={file.name}>{file.name}</span>
                                    <button onClick={() => removeStagedFile(index)} className="absolute top-1/2 right-1 -translate-y-1/2 p-1 rounded-full hover:bg-black/5 hover:text-red-500 transition-colors">
                                        <svg xmlns="http://www.w3.org/2000/svg" className="h-3.5 w-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}><path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" /></svg>
                                    </button>
                                </div>
                            ))}
                        </div>
                    </div>
                )}

                <form onSubmit={handleSubmit} className={`flex items-end gap-2 bg-white rounded-[1.5rem] shadow-lg border border-slate-200 p-2 focus-within:ring-2 focus-within:ring-offset-2 transition-all duration-300 relative ${themeClasses.inputRing}`}>
                    <label htmlFor="file-input" className={`cursor-pointer p-3 text-slate-400 hover:text-indigo-500 hover:bg-indigo-50 transition-colors rounded-full z-10 ${isActionDisabled ? 'opacity-50' : ''}`} aria-label={UI_TEXT[language].attach} title={UI_TEXT[language].attach}>
                         <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}><path strokeLinecap="round" strokeLinejoin="round" d="M15.172 7l-6.586 6.586a2 2 0 102.828 2.828l6.414-6.586a4 4 0 00-5.656-5.656l-6.415 6.585a6 6 0 108.486 8.486L20.5 13" /></svg>
                    </label>
                    <input
                        id="file-input"
                        ref={fileInputRef}
                        type="file"
                        multiple
                        className="hidden"
                        onChange={handleFileChange}
                        accept="image/*,application/pdf"
                        disabled={isActionDisabled}
                    />
                    <input 
                        type="text" 
                        value={userInput} 
                        onChange={(e) => setUserInput(e.target.value)} 
                        placeholder={UI_TEXT[language].placeholder}
                        className={`w-full py-3 px-2 bg-transparent border-none focus:ring-0 text-base resize-none z-10 placeholder-slate-400 text-slate-700 font-medium`} 
                        disabled={isActionDisabled}
                    />
                    <button 
                        type="submit" 
                        disabled={isActionDisabled || (!userInput.trim() && stagedFiles.length === 0)} 
                        className={`p-3 rounded-full text-white shadow-md transition-all transform hover:scale-105 active:scale-95 disabled:opacity-50 disabled:cursor-not-allowed disabled:transform-none z-10 ${themeClasses.sendBtn}`} 
                        aria-label={UI_TEXT[language].send}
                        title={UI_TEXT[language].send}
                    >
                        <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 19l9 2-9-18-9 18 9-2zm0 0v-8" /></svg>
                    </button>
                </form>
                
                <div className="text-center mt-6">
                   <p className={`text-xs text-slate-400 font-medium`}>{UI_TEXT[language].copyright}</p>
                </div>
            </div>
        </footer>
    </div>
  );
};

export default App;