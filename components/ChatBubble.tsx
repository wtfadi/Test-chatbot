import React, { useEffect, useState } from 'react';
import { User, Bot, Sparkles, AlertCircle, FileText, Terminal, Database, ArrowRight } from 'lucide-react';
import { Message, MessageRole } from '../types';
import { CodeBlock } from './CodeBlock';

interface ChatBubbleProps {
  message: Message;
}

const MarkdownText: React.FC<{ content: string }> = ({ content }) => {
  const lines = content.split('\n');

  const formatInline = (text: string) => {
    const parts = text.split(/(\*\*.*?\*\*|`[^`]+`|\[.*?\]\(.*?\)|(?<!\*)\*[^*]+\*(?!\*))/g);
    
    return parts.map((part, idx) => {
      if (part.startsWith('**') && part.endsWith('**') && part.length > 4) {
        return <strong key={idx} className="font-bold text-violet-300">{part.slice(2, -2)}</strong>;
      }
      if (part.startsWith('`') && part.endsWith('`') && part.length > 2) {
        return (
            <code key={idx} className="font-mono text-[13px] bg-violet-500/10 text-violet-200 px-1.5 py-0.5 rounded border border-violet-500/20 mx-0.5">
                {part.slice(1, -1)}
            </code>
        ); 
      }
      if (part.startsWith('[') && part.includes('](') && part.endsWith(')')) {
        const match = part.match(/^\[(.*?)\]\((.*?)\)$/);
        if (match) {
            return <a key={idx} href={match[2]} target="_blank" rel="noreferrer" className="text-blue-400 hover:text-blue-300 hover:underline underline-offset-2 transition-colors">{match[1]}</a>;
        }
      }
      if (part.startsWith('*') && part.endsWith('*') && part.length > 2) {
         return <em key={idx} className="italic text-gray-400">{part.slice(1, -1)}</em>; 
      }
      return <span key={idx}>{part}</span>;
    });
  };

  return (
    <div className="space-y-4 text-gray-300 leading-relaxed text-[15px]">
      {lines.map((line, lineIdx) => {
        if (line.startsWith('### ')) return <h3 key={lineIdx} className="text-lg font-bold text-gray-100 mt-6 mb-2 flex items-center gap-2"><span className="h-1 w-4 bg-violet-500 rounded-full"></span>{formatInline(line.slice(4))}</h3>;
        if (line.startsWith('## ')) return <h2 key={lineIdx} className="text-xl font-bold text-gray-50 mt-8 mb-3 pb-2 border-b border-gray-800">{formatInline(line.slice(3))}</h2>;
        if (line.startsWith('# ')) return <h1 key={lineIdx} className="text-2xl font-extrabold text-transparent bg-clip-text bg-gradient-to-r from-violet-400 to-fuchsia-400 mt-8 mb-4">{formatInline(line.slice(2))}</h1>;

        if (line.startsWith('> ')) {
            return (
                <div key={lineIdx} className="border-l-4 border-violet-500/50 bg-gray-800/30 pl-4 py-2 italic text-gray-400 my-3 rounded-r">
                    {formatInline(line.slice(2))}
                </div>
            );
        }

        const listMatch = line.match(/^(\s*)([-*]|\d+\.)\s+(.*)/);
        if (listMatch) {
            const [, indent, bullet, text] = listMatch;
            const isOrdered = /^\d+\./.test(bullet);
            const level = Math.floor(indent.length / 2); 

            return (
              <div key={lineIdx} className="flex items-start gap-3 ml-1 my-1.5 group" style={{ marginLeft: `${level * 1.5}rem` }}>
                <div className={`mt-2 flex-shrink-0 transition-colors ${
                    isOrdered 
                    ? 'text-violet-400 font-mono text-xs font-bold' 
                    : 'w-1.5 h-1.5 rounded-full bg-violet-500/70 group-hover:bg-violet-400 mt-2.5'
                }`}>
                    {isOrdered ? bullet : null}
                </div>
                <div className="flex-1">
                    {formatInline(text)}
                </div>
              </div>
            );
        }

        if (!line.trim()) return <div key={lineIdx} className="h-2" />;

        return <div key={lineIdx}>{formatInline(line)}</div>;
      })}
    </div>
  );
};

const parseContent = (text: string) => {
  const parts = [];
  const codeBlockRegex = /```(\w+)?\n([\s\S]*?)```/g;
  let match;
  let lastIndex = 0;

  while ((match = codeBlockRegex.exec(text)) !== null) {
    if (match.index > lastIndex) {
      parts.push({ type: 'text', content: text.slice(lastIndex, match.index) });
    }
    parts.push({ type: 'code', language: match[1] || 'plaintext', content: match[2] });
    lastIndex = match.index + match[0].length;
  }

  if (lastIndex < text.length) {
    parts.push({ type: 'text', content: text.slice(lastIndex) });
  }

  return parts;
};

export const ChatBubble: React.FC<ChatBubbleProps> = ({ message }) => {
  const isUser = message.role === MessageRole.USER;
  const isSystem = message.role === MessageRole.SYSTEM;
  const isToolReq = message.role === MessageRole.TOOL_REQUEST;
  const isToolResp = message.role === MessageRole.TOOL_RESPONSE;

  const [displayContent, setDisplayContent] = useState(
    isUser || isToolReq || isToolResp || isSystem ? message.content : ''
  );
  const [isTyping, setIsTyping] = useState(false);

  useEffect(() => {
    if (isUser || isSystem || isToolReq || isToolResp) {
      setDisplayContent(message.content);
      return;
    }
    if (displayContent === message.content) return;

    setIsTyping(true);
    let currentIndex = 0;
    const fullText = message.content;
    
    const interval = setInterval(() => {
      if (currentIndex < fullText.length) {
        const chunk = fullText.slice(currentIndex, currentIndex + 8);
        setDisplayContent(prev => prev + chunk);
        currentIndex += 8;
      } else {
        setDisplayContent(fullText);
        setIsTyping(false);
        clearInterval(interval);
      }
    }, 10);

    return () => clearInterval(interval);
  }, [message.content, message.role]);

  // --- RENDER TOOL REQUEST (The "Cool Style" to retrieve data) ---
  if (isToolReq) {
    let url = "External Database";
    try {
        const json = JSON.parse(message.content);
        if(json.api_url) url = json.api_url;
    } catch(e) {}

    return (
        <div className="flex justify-start mb-4 animate-fade-in w-full">
            <div className="ml-2 sm:ml-14 flex items-center gap-3 px-4 py-2 bg-black/40 border border-emerald-500/20 rounded-lg font-mono text-xs text-emerald-400/90 max-w-2xl">
                <Terminal size={12} className="text-emerald-500" />
                <div className="flex gap-2 items-center overflow-hidden">
                    <span className="font-bold text-emerald-500 shrink-0">RUNNING:</span>
                    <span className="truncate opacity-70">{url}</span>
                </div>
                <span className="animate-pulse w-1.5 h-3 bg-emerald-500 ml-auto block"></span>
            </div>
        </div>
    );
  }

  // --- RENDER TOOL RESPONSE (Hidden usually, but good for logs) ---
  if (isToolResp) {
      const isError = message.content.includes("ERROR");
      return (
        <div className="flex justify-start mb-4 animate-fade-in w-full">
            <div className={`ml-2 sm:ml-14 flex items-center gap-3 px-4 py-2 bg-black/40 border rounded-lg font-mono text-xs max-w-2xl ${isError ? 'border-red-500/20 text-red-400/90' : 'border-blue-500/20 text-blue-400/90'}`}>
                <Database size={12} className={isError ? 'text-red-500' : 'text-blue-500'} />
                <div className="flex gap-2 items-center">
                    <span className="font-bold shrink-0">{isError ? 'FAILURE:' : 'RECEIVED:'}</span>
                    <span>{isError ? 'API Unreachable. Switching to internal knowledge.' : 'Data packet received successfully.'}</span>
                </div>
            </div>
        </div>
      );
  }

  if (isSystem) {
    return (
      <div className="flex justify-center my-6 animate-fade-in">
        <div className="bg-red-900/20 border border-red-500/30 text-red-200 px-4 py-2 rounded-full flex items-center gap-2 text-xs font-medium backdrop-blur-sm">
          <AlertCircle size={14} />
          {message.content}
        </div>
      </div>
    );
  }

  return (
    <div className={`flex ${isUser ? 'justify-end' : 'justify-start'} mb-6 group animate-fade-in-up`}>
      <div className={`max-w-[85%] lg:max-w-3xl flex gap-4 ${isUser ? 'flex-row-reverse' : 'flex-row'}`}>
        
        <div className={`w-10 h-10 rounded-xl flex items-center justify-center flex-shrink-0 shadow-lg transition-transform duration-300 group-hover:scale-105 ${
          isUser 
            ? 'bg-gradient-to-br from-violet-600 to-fuchsia-600 text-white ring-2 ring-violet-500/30' 
            : 'bg-[#18181b] text-emerald-400 ring-1 ring-gray-800'
        }`}>
          {isUser ? <User size={20} /> : <Bot size={20} />}
        </div>

        <div className={`flex flex-col ${isUser ? 'items-end' : 'items-start'} w-full min-w-0`}>
            <div className={`relative px-6 py-5 shadow-xl backdrop-blur-md ${
              isUser 
                ? 'rounded-2xl rounded-tr-sm bg-white/5 text-white border border-white/10' 
                : 'rounded-2xl rounded-tl-sm bg-[#18181b]/90 text-gray-100 border border-gray-800'
            }`}>
               
               {message.attachment && (
                 <div className="mb-4 p-3 bg-black/40 rounded-lg flex items-center gap-4 border border-white/5 hover:bg-black/60 transition-colors group/file">
                    {message.attachment.type === 'image' ? (
                        <img src={message.attachment.url} alt="attachment" className="h-16 w-16 rounded-md object-cover bg-gray-900 border border-white/10" />
                    ) : (
                        <div className="h-12 w-12 bg-white/5 rounded-md flex items-center justify-center border border-white/10">
                            <FileText size={24} className="opacity-70" />
                        </div>
                    )}
                    <div className="flex flex-col">
                        <span className="text-sm font-medium opacity-90 truncate max-w-[180px]">{message.attachment.name || 'Attachment'}</span>
                        <span className="text-xs opacity-50 uppercase tracking-wider font-mono flex items-center gap-1">
                            {message.attachment.type}
                            <ArrowRight size={10} className="opacity-0 group-hover/file:opacity-100 transition-opacity" />
                        </span>
                    </div>
                 </div>
               )}

               {isUser ? (
                 <p className="whitespace-pre-wrap leading-relaxed text-[15px]">{message.content}</p>
               ) : (
                 <div className="w-full overflow-hidden">
                   {parseContent(displayContent).map((part, index) => (
                     part.type === 'code' ? (
                       <CodeBlock key={index} language={part.language!} code={part.content} />
                     ) : (
                       <MarkdownText key={index} content={part.content} />
                     )
                   ))}
                   {isTyping && (
                       <span className="inline-flex items-center ml-2">
                           <span className="w-1.5 h-1.5 bg-violet-400 rounded-full animate-pulse"></span>
                       </span>
                   )}
                 </div>
               )}
            </div>
             <div className="flex items-center gap-2 mt-2 px-1">
                <span className="text-[10px] font-medium text-gray-600 uppercase tracking-widest opacity-60 font-mono">
                    {new Date(message.timestamp).toLocaleTimeString([], {hour: '2-digit', minute:'2-digit'})}
                </span>
                {!isUser && !isTyping && (
                    <div className="flex items-center gap-1 text-[10px] text-violet-400/60">
                        <Sparkles size={10} />
                        <span>AI generated</span>
                    </div>
                )}
             </div>
        </div>
      </div>
    </div>
  );
};