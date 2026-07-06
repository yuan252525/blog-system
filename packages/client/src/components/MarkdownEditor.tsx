import { useRef, useCallback } from 'react';
import { MarkdownRenderer } from './MarkdownRenderer';
import { Maximize2, Minimize2, Columns2, AlignJustify } from 'lucide-react';
import { useState } from 'react';

interface MarkdownEditorProps {
  value: string;
  onChange: (value: string) => void;
  placeholder?: string;
  label?: string;
}

export function MarkdownEditor({ value, onChange, placeholder, label }: MarkdownEditorProps) {
  const [fullscreen, setFullscreen] = useState(false);
  const [viewMode, setViewMode] = useState<'split' | 'edit' | 'preview'>('split');
  const textareaRef = useRef<HTMLTextAreaElement>(null);

  const handleInsert = useCallback(
    (syntax: string) => {
      const ta = textareaRef.current;
      if (!ta) return;
      const start = ta.selectionStart;
      const end = ta.selectionEnd;
      const selected = value.substring(start, end);
      let replacement: string;

      switch (syntax) {
        case 'bold':
          replacement = `**${selected || 'bold text'}**`;
          break;
        case 'italic':
          replacement = `*${selected || 'italic text'}*`;
          break;
        case 'heading':
          replacement = `\n## ${selected || 'Heading'}\n`;
          break;
        case 'link':
          replacement = `[${selected || 'link text'}](url)`;
          break;
        case 'image':
          replacement = `![${selected || 'alt text'}](url)`;
          break;
        case 'code':
          replacement = `\`${selected || 'code'}\``;
          break;
        case 'codeblock':
          replacement = `\n\`\`\`\n${selected || 'code block'}\n\`\`\`\n`;
          break;
        case 'quote':
          replacement = `\n> ${selected || 'blockquote'}\n`;
          break;
        case 'list':
          replacement = `\n- ${selected || 'list item'}\n`;
          break;
        case 'table':
          replacement =
            '\n| Header 1 | Header 2 |\n| -------- | -------- |\n| Cell     | Cell     |\n';
          break;
        default:
          return;
      }

      const newValue = value.substring(0, start) + replacement + value.substring(end);
      onChange(newValue);

      // 恢复光标位置
      requestAnimationFrame(() => {
        ta.focus();
        const cursorPos = start + replacement.length;
        ta.setSelectionRange(cursorPos, cursorPos);
      });
    },
    [value, onChange],
  );

  const contentClasses = fullscreen
    ? 'fixed inset-0 z-50 bg-white'
    : '';

  return (
    <div className={contentClasses}>
      {/* Toolbar */}
      <div className={`flex items-center justify-between gap-2 px-1 mb-2 ${fullscreen ? 'px-4 pt-3' : ''}`}>
        <div className="flex items-center gap-1">
          {label && <span className="text-sm font-medium text-neutral-700 mr-1">{label}</span>}
          <div className="flex items-center gap-0.5 border border-neutral-200 rounded-lg p-0.5 bg-neutral-50">
            <ToolbarButton icon="B" label="Bold" onClick={() => handleInsert('bold')} className="font-bold" />
            <ToolbarButton icon="I" label="Italic" onClick={() => handleInsert('italic')} className="italic" />
            <div className="w-px h-5 bg-neutral-200 mx-0.5" />
            <ToolbarButton icon="H" label="Heading" onClick={() => handleInsert('heading')} />
            <ToolbarButton icon="🔗" label="Link" onClick={() => handleInsert('link')} />
            <ToolbarButton icon="🖼" label="Image" onClick={() => handleInsert('image')} />
            <div className="w-px h-5 bg-neutral-200 mx-0.5" />
            <ToolbarButton icon="<>" label="Inline Code" onClick={() => handleInsert('code')} className="text-xs" />
            <ToolbarButton icon="【】" label="Code Block" onClick={() => handleInsert('codeblock')} className="text-xs" />
            <ToolbarButton icon="❝" label="Quote" onClick={() => handleInsert('quote')} />
            <ToolbarButton icon="•≡" label="List" onClick={() => handleInsert('list')} className="text-xs" />
            <ToolbarButton icon="⊞" label="Table" onClick={() => handleInsert('table')} />
          </div>
        </div>

        <div className="flex items-center gap-1">
          {/* View mode toggle */}
          <div className="flex items-center border border-neutral-200 rounded-lg p-0.5 bg-neutral-50">
            <button
              type="button"
              onClick={() => setViewMode('edit')}
              className={`px-2 py-1 text-xs rounded-md transition-all cursor-pointer ${
                viewMode === 'edit' ? 'bg-white shadow-sm text-neutral-900' : 'text-neutral-400 hover:text-neutral-600'
              }`}
              title="Edit only"
            >
              <AlignJustify className="h-3.5 w-3.5" />
            </button>
            <button
              type="button"
              onClick={() => setViewMode('split')}
              className={`px-2 py-1 text-xs rounded-md transition-all cursor-pointer ${
                viewMode === 'split' ? 'bg-white shadow-sm text-neutral-900' : 'text-neutral-400 hover:text-neutral-600'
              }`}
              title="Split view"
            >
              <Columns2 className="h-3.5 w-3.5" />
            </button>
            <button
              type="button"
              onClick={() => setViewMode('preview')}
              className={`px-2 py-1 text-xs rounded-md transition-all cursor-pointer ${
                viewMode === 'preview' ? 'bg-white shadow-sm text-neutral-900' : 'text-neutral-400 hover:text-neutral-600'
              }`}
              title="Preview only"
            >
              <span className="text-xs font-semibold">👁</span>
            </button>
          </div>
          <button
            type="button"
            onClick={() => setFullscreen(!fullscreen)}
            className="p-1.5 rounded-lg text-neutral-400 hover:text-neutral-600 hover:bg-neutral-100 transition-all cursor-pointer"
            title={fullscreen ? 'Exit fullscreen' : 'Fullscreen'}
          >
            {fullscreen ? <Minimize2 className="h-4 w-4" /> : <Maximize2 className="h-4 w-4" />}
          </button>
        </div>
      </div>

      {/* Editor + Preview */}
      <div
        className={`flex gap-0 ${fullscreen ? 'h-[calc(100vh-60px)]' : 'min-h-[420px]'} rounded-xl border border-neutral-200 bg-white overflow-hidden`}
      >
        {/* Textarea */}
        {(viewMode === 'split' || viewMode === 'edit') && (
          <div className={`${viewMode === 'split' ? 'w-1/2' : 'w-full'} border-r border-neutral-100`}>
            <textarea
              ref={textareaRef}
              value={value}
              onChange={(e) => onChange(e.target.value)}
              placeholder={placeholder || 'Write your Markdown here...'}
              className="w-full h-full p-5 font-mono text-sm text-neutral-700 placeholder:text-neutral-300 bg-white resize-none outline-none leading-relaxed"
            />
          </div>
        )}

        {/* Preview */}
        {(viewMode === 'split' || viewMode === 'preview') && (
          <div className={`${viewMode === 'split' ? 'w-1/2' : 'w-full'} overflow-y-auto`}>
            <div className="p-5">
              {value.trim() ? (
                <MarkdownRenderer content={value} />
              ) : (
                <div className="flex items-center justify-center h-64 text-neutral-300 text-sm">
                  Preview will appear here...
                </div>
              )}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

function ToolbarButton({
  icon,
  label,
  onClick,
  className = '',
}: {
  icon: string;
  label: string;
  onClick: () => void;
  className?: string;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={`px-2 py-1 text-xs rounded hover:bg-white hover:shadow-sm transition-all text-neutral-500 hover:text-neutral-900 cursor-pointer ${className}`}
      title={label}
    >
      {icon}
    </button>
  );
}
