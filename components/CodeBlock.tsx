import React, { useMemo } from 'react';
import { Check, Copy, Code2, Terminal } from 'lucide-react';

interface CodeBlockProps {
  language: string;
  code: string;
}

const HighlightedCode: React.FC<{ code: string; language: string }> = ({ code, language }) => {
  const elements = useMemo(() => {
    const tokens = [];
    // Enhanced Regex for tokenization
    const tokenRegex = /("(?:\\.|[^"\\])*"|'(?:\\.|[^'\\])*'|`(?:\\.|[^`\\])*`|\/\/.*|\/\*[\s\S]*?\*\/|\b(?:const|let|var|function|return|if|else|for|while|switch|case|break|continue|import|export|from|as|default|class|interface|type|extends|implements|async|await|try|catch|throw|new|this|super|typeof|void|true|false|null|undefined|public|private|protected|readonly|static|enum|package|implements)\b|\b\d+(?:\.\d+)?\b|[{}()[\]<>=!&|.,:;+-])/g;

    let lastIndex = 0;
    let match;

    while ((match = tokenRegex.exec(code)) !== null) {
      // Plain text
      if (match.index > lastIndex) {
        tokens.push(<span key={`text-${lastIndex}`} className="text-[#e5e7eb]">{code.slice(lastIndex, match.index)}</span>);
      }

      const token = match[0];
      let className = "text-[#e5e7eb]";

      if (token.startsWith('//') || token.startsWith('/*')) {
        className = "text-[#6b7280] italic"; // Gray/Comment
      } else if (token.startsWith('"') || token.startsWith("'") || token.startsWith('`')) {
        className = "text-[#a78bfa]"; // Light Purple (Strings)
      } else if (/^\d/.test(token)) {
        className = "text-[#f472b6]"; // Pink (Numbers)
      } else if (/^(true|false|null|undefined)$/.test(token)) {
        className = "text-[#fbbf24] font-semibold"; // Amber (Booleans)
      } else if (/^[{}()[\]<>=!&|.,:;+-]$/.test(token)) {
        className = "text-[#60a5fa]"; // Blue (Punctuation)
      } else {
        className = "text-[#2dd4bf] font-medium"; // Teal (Keywords)
      }

      tokens.push(<span key={`token-${match.index}`} className={className}>{token}</span>);
      lastIndex = tokenRegex.lastIndex;
    }

    if (lastIndex < code.length) {
      tokens.push(<span key={`text-${lastIndex}`} className="text-[#e5e7eb]">{code.slice(lastIndex)}</span>);
    }

    return tokens;
  }, [code]);

  return <>{elements}</>;
};

export const CodeBlock: React.FC<CodeBlockProps> = ({ language, code }) => {
  const [copied, setCopied] = React.useState(false);

  const handleCopy = () => {
    navigator.clipboard.writeText(code);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <div className="my-6 rounded-xl overflow-hidden border border-gray-800 bg-[#09090b] shadow-2xl group ring-1 ring-white/5 hover:ring-violet-500/40 transition-all duration-300">
      {/* Header */}
      <div className="flex items-center justify-between px-4 py-3 bg-[#18181b] border-b border-gray-800 select-none">
        <div className="flex items-center gap-3">
            <div className="flex gap-1.5">
                <div className="w-2.5 h-2.5 rounded-full bg-red-500/80"></div>
                <div className="w-2.5 h-2.5 rounded-full bg-yellow-500/80"></div>
                <div className="w-2.5 h-2.5 rounded-full bg-green-500/80"></div>
            </div>
            <div className="h-4 w-[1px] bg-gray-700 mx-2"></div>
            <span className="text-xs font-medium text-gray-400 flex items-center gap-2 font-mono">
                {language === 'bash' || language === 'sh' ? <Terminal size={12} /> : <Code2 size={12} className="text-violet-400" />}
                {language || 'text'}
            </span>
        </div>
        <button
          onClick={handleCopy}
          className="flex items-center gap-1.5 px-2 py-1 rounded hover:bg-white/10 text-gray-400 hover:text-white transition-all focus:outline-none opacity-0 group-hover:opacity-100"
        >
          {copied ? <Check size={14} className="text-emerald-400" /> : <Copy size={14} />}
          <span className="text-[10px] font-medium uppercase tracking-wider">{copied ? 'Copied' : 'Copy'}</span>
        </button>
      </div>
      
      {/* Editor Content */}
      <div className="p-5 overflow-x-auto bg-[#0c0c0e] selection:bg-violet-500/30">
        <pre className="text-[13px] font-mono leading-6">
          <code>
            <HighlightedCode code={code} language={language} />
          </code>
        </pre>
      </div>
    </div>
  );
};