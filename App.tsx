import React, { useState, useEffect, useRef } from 'react';
import { Send, Trash2, Paperclip, X, Bot, Sparkles, Zap, Command, ArrowRight } from 'lucide-react';
import { ChatBubble } from './components/ChatBubble';
import { Message, MessageRole, ApiInstruction, Attachment } from './types';
import { sendMessageToGemini, initGemini, resetSession } from './services/geminiService';
import { callExternalApi } from './services/mockExternalApi';

const App: React.FC = () => {
  const [messages, setMessages] = useState<Message[]>([]);
  const [inputValue, setInputValue] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [filePreview, setFilePreview] = useState<string | null>(null);
  
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const textareaRef = useRef<HTMLTextAreaElement>(null);

  useEffect(() => {
    initGemini();
    setMessages([
      {
        id: 'welcome',
        role: MessageRole.ASSISTANT,
        content: "**System Online.**\n\nI am your research assistant. I can access external APIs (like `tutorialspoint`) to fetch real-time data, analyze documents, and help you study.",
        timestamp: Date.now(),
      }
    ]);
  }, []);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages, isLoading]);

  // Textarea resizing logic: Single line start, max 5 lines
  useEffect(() => {
    if (textareaRef.current) {
      textareaRef.current.style.height = 'auto';
      const scrollHeight = textareaRef.current.scrollHeight;
      // approx 24px per line. 5 lines ~= 120px
      textareaRef.current.style.height = `${Math.min(scrollHeight, 120)}px`;
    }
  }, [inputValue]);

  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      const file = e.target.files[0];
      setSelectedFile(file);
      const reader = new FileReader();
      reader.onload = (e) => {
        setFilePreview(e.target?.result as string);
      };
      reader.readAsDataURL(file);
    }
  };

  const clearFile = () => {
    setSelectedFile(null);
    setFilePreview(null);
    if (fileInputRef.current) fileInputRef.current.value = '';
  };

  const fileToBase64 = (file: File): Promise<string> => {
    return new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.readAsDataURL(file);
      reader.onload = () => {
        const result = reader.result as string;
        const base64 = result.split(',')[1]; 
        resolve(base64);
      };
      reader.onerror = error => reject(error);
    });
  };

  const handleSendMessage = async () => {
    if ((!inputValue.trim() && !selectedFile) || isLoading) return;

    const currentInput = inputValue;
    const currentFile = selectedFile;
    const currentPreview = filePreview;

    setInputValue('');
    clearFile();
    setIsLoading(true);
    
    // Reset height
    if (textareaRef.current) textareaRef.current.style.height = 'auto';

    let attachment: Attachment | undefined;
    let base64Data: string | undefined;

    if (currentFile && currentPreview) {
        base64Data = await fileToBase64(currentFile);
        attachment = {
            type: currentFile.type.startsWith('image') ? 'image' : 'file',
            url: currentPreview,
            mimeType: currentFile.type,
            data: base64Data,
            name: currentFile.name
        };
    }

    const userMsg: Message = {
      id: Date.now().toString(),
      role: MessageRole.USER,
      content: currentInput,
      timestamp: Date.now(),
      attachment: attachment
    };

    setMessages(prev => [...prev, userMsg]);

    try {
      // 1. Ask Gemini (Orchestrator)
      const responseText = await sendMessageToGemini(
        userMsg.content, 
        attachment ? { mimeType: attachment.mimeType, data: base64Data! } : undefined
      );

      // 2. Check for JSON Tool Request
      let instruction: ApiInstruction | null = null;
      try {
        const cleanedJson = responseText.replace(/```json\n?|\n?```/g, '').trim();
        if (cleanedJson.startsWith('{') && cleanedJson.endsWith('}')) {
            instruction = JSON.parse(cleanedJson);
        }
      } catch (e) {
        instruction = null;
      }

      if (instruction && instruction.action === 'call_api') {
        // --- HYBRID MODE FLOW ---
        
        // A. Visualize the Tool Request (The "Cool Style")
        const toolRequestMsg: Message = {
          id: Date.now().toString() + '-req',
          role: MessageRole.TOOL_REQUEST,
          content: responseText, // Contains the JSON with URL
          timestamp: Date.now()
        };
        setMessages(prev => [...prev, toolRequestMsg]);

        // B. Call the External API (with simulated failure chance)
        let apiResponseText = "";
        try {
            apiResponseText = await callExternalApi(instruction.api_url, instruction.params);
        } catch (apiError: any) {
            // C. Failure Handling: Visual feedback + Fallback instruction
            apiResponseText = `ERROR: External Tool Failed (${apiError.message}). Ignore tool request and answer using internal knowledge.`;
        }
        
        // D. Log the Tool Response (System Log)
        const toolResponseMsg: Message = {
           id: Date.now().toString() + '-resp',
           role: MessageRole.TOOL_RESPONSE,
           content: apiResponseText,
           timestamp: Date.now()
        };
        setMessages(prev => [...prev, toolResponseMsg]);

        // E. Final Generation by Gemini
        const finalPayload = JSON.stringify({ api_response: apiResponseText });
        const finalResponseText = await sendMessageToGemini(finalPayload);

        const finalMsg: Message = {
          id: Date.now().toString() + '-final',
          role: MessageRole.ASSISTANT,
          content: finalResponseText,
          timestamp: Date.now()
        };
        setMessages(prev => [...prev, finalMsg]);

      } else {
        // --- STANDARD FLOW ---
        const assistantMsg: Message = {
          id: Date.now().toString(),
          role: MessageRole.ASSISTANT,
          content: responseText,
          timestamp: Date.now()
        };
        setMessages(prev => [...prev, assistantMsg]);
      }

    } catch (error) {
      const errorMsg: Message = {
        id: Date.now().toString(),
        role: MessageRole.SYSTEM,
        content: "Network anomaly detected. Retrying connection...",
        timestamp: Date.now()
      };
      setMessages(prev => [...prev, errorMsg]);
    } finally {
      setIsLoading(false);
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSendMessage();
    }
  };

  const handleClearChat = () => {
      setMessages([]);
      resetSession();
      setMessages([
        {
          id: 'welcome-reset',
          role: MessageRole.ASSISTANT,
          content: "Workspace cleared. Ready for new session.",
          timestamp: Date.now(),
        }
      ]);
  }

  return (
    <div className="flex flex-col h-screen relative overflow-hidden font-sans">
      {/* Background Glows */}
      <div className="fixed top-0 left-0 w-full h-full overflow-hidden pointer-events-none z-0">
          <div className="absolute top-[-10%] left-[-10%] w-[40%] h-[40%] rounded-full bg-violet-900/20 blur-[120px]"></div>
          <div className="absolute bottom-[-10%] right-[-10%] w-[40%] h-[40%] rounded-full bg-fuchsia-900/20 blur-[120px]"></div>
      </div>
      
      {/* Header */}
      <header className="h-16 glass border-b border-white/5 flex items-center justify-between px-6 sticky top-0 z-30 shadow-sm">
        <div className="flex items-center gap-3 group cursor-default">
            <div className="bg-gradient-to-tr from-violet-600 to-indigo-600 p-2 rounded-lg shadow-lg shadow-violet-500/20 group-hover:rotate-12 transition-transform duration-500">
                <Zap size={18} className="text-white" fill="currentColor" />
            </div>
            <div className="flex flex-col">
                <h1 className="font-bold text-lg tracking-tight text-gray-100 font-mono">NEXUS<span className="text-violet-400">.AI</span></h1>
            </div>
        </div>
        <button 
            onClick={handleClearChat}
            className="text-gray-500 hover:text-red-400 hover:bg-white/5 transition-all p-2 rounded-lg group"
            title="Clear Workspace"
        >
            <Trash2 size={18} className="group-hover:scale-110 transition-transform" />
        </button>
      </header>

      {/* Chat Area */}
      <div className="flex-1 overflow-y-auto p-4 md:p-8 scroll-smooth z-10">
        <div className="max-w-3xl mx-auto min-h-full flex flex-col justify-end pb-4">
            {messages.length === 0 && (
                <div className="flex-1 flex flex-col items-center justify-center text-gray-600 space-y-6 animate-fade-in">
                    <div className="relative group">
                        <div className="absolute -inset-1 bg-gradient-to-r from-violet-600 to-indigo-600 rounded-full blur opacity-25 group-hover:opacity-75 transition duration-1000 group-hover:duration-200"></div>
                        <div className="relative bg-black ring-1 ring-gray-800 rounded-full p-4">
                             <Command size={48} className="text-gray-400" />
                        </div>
                    </div>
                    <div className="text-center space-y-1">
                        <p className="text-lg font-medium text-gray-300">Research Workspace Ready</p>
                        <p className="text-sm text-gray-600">Paste code, upload notes, or ask complex questions.</p>
                    </div>
                </div>
            )}
            {messages.map((msg) => (
              <ChatBubble key={msg.id} message={msg} />
            ))}
            
            {isLoading && (
               <div className="flex justify-start mb-8 ml-2 sm:ml-14 animate-fade-in">
                  <div className="bg-[#18181b] border border-violet-500/20 px-4 py-3 rounded-2xl rounded-tl-sm flex items-center gap-3 shadow-lg shadow-violet-900/10">
                      <div className="flex items-center gap-1">
                          <span className="w-1.5 h-1.5 bg-violet-400 rounded-full animate-[bounce_1s_infinite]"></span>
                          <span className="w-1.5 h-1.5 bg-violet-400 rounded-full animate-[bounce_1s_infinite_0.2s]"></span>
                          <span className="w-1.5 h-1.5 bg-violet-400 rounded-full animate-[bounce_1s_infinite_0.4s]"></span>
                      </div>
                      <span className="text-xs font-mono text-violet-300/80">Processing...</span>
                  </div>
               </div>
            )}
            <div ref={messagesEndRef} />
        </div>
      </div>

      {/* Input Area */}
      <div className="p-4 md:p-6 z-20">
        <div className="max-w-3xl mx-auto relative">
             {filePreview && (
                <div className="absolute -top-16 left-0 animate-slide-up">
                    <div className="relative group bg-[#18181b] border border-gray-700 rounded-xl p-2 pr-8 flex items-center gap-3 shadow-xl">
                         <img src={filePreview} alt="Upload" className="h-10 w-10 rounded-lg object-cover border border-white/10" />
                         <div className="flex flex-col">
                            <span className="text-xs font-medium text-gray-200 truncate max-w-[200px]">{selectedFile?.name}</span>
                            <span className="text-[10px] text-gray-500 uppercase">Queued</span>
                         </div>
                         <button 
                            onClick={clearFile}
                            className="absolute -top-2 -right-2 bg-gray-700 text-gray-400 hover:text-white rounded-full p-1 border border-gray-600 shadow-md transition-all"
                        >
                            <X size={12} />
                        </button>
                    </div>
                </div>
            )}

            <div className={`
                relative flex items-end gap-2 bg-[#09090b]/80 backdrop-blur-xl rounded-[2rem] p-2 
                border transition-all duration-300 shadow-2xl
                ${(inputValue || selectedFile) ? 'border-violet-500/50 ring-1 ring-violet-500/20' : 'border-gray-800 hover:border-gray-700'}
            `}>
                <button 
                    onClick={() => fileInputRef.current?.click()}
                    className={`p-3 rounded-full transition-all duration-200 flex-shrink-0 ${selectedFile ? 'bg-violet-500/20 text-violet-300' : 'hover:bg-white/5 text-gray-400 hover:text-gray-200'}`}
                    title="Attach Resource"
                >
                    <Paperclip size={20} />
                </button>

                <textarea 
                    ref={textareaRef}
                    value={inputValue}
                    onChange={(e) => setInputValue(e.target.value)}
                    onKeyDown={handleKeyDown}
                    placeholder="Type a command or query..."
                    rows={1}
                    className="flex-1 bg-transparent border-none focus:ring-0 text-gray-100 placeholder-gray-500 py-3 px-2 resize-none leading-relaxed max-h-[120px] scrollbar-hide"
                    style={{ minHeight: '44px' }}
                />

                <button 
                    onClick={handleSendMessage} 
                    disabled={isLoading || (!inputValue.trim() && !selectedFile)}
                    className={`p-3 rounded-full transition-all duration-300 transform flex-shrink-0 ${
                        (inputValue.trim() || selectedFile) && !isLoading
                            ? 'bg-white text-black shadow-lg hover:scale-105' 
                            : 'bg-white/5 text-gray-600 cursor-not-allowed'
                    }`}
                >
                    {isLoading ? (
                        <div className="w-[18px] h-[18px] border-2 border-gray-500 border-t-transparent rounded-full animate-spin"></div>
                    ) : (
                        <ArrowRight size={20} className={inputValue.trim() || selectedFile ? 'ml-0.5' : ''} />
                    )}
                </button>
            </div>
            
            <input 
                type="file" 
                ref={fileInputRef} 
                onChange={handleFileSelect} 
                className="hidden" 
                accept="image/*,application/pdf,text/*"
            />
        </div>
      </div>
    </div>
  );
};

export default App;