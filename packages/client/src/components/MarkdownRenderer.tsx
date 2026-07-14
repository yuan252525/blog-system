import ReactMarkdown, { type Components } from 'react-markdown';
import { type ReactNode } from 'react';
import remarkGfm from 'remark-gfm';
import rehypeHighlight from 'rehype-highlight';
import rehypeSanitize, { defaultSchema } from 'rehype-sanitize';
import { Copy } from 'lucide-react';
import { MermaidDiagram } from './MermaidDiagram';
import { makeSlugger, slugify } from '../utils/toc';
import { useTranslation } from '../i18n/context';
import { toast } from './ui/toast';

const sanitizeSchema = {
  ...defaultSchema,
  attributes: {
    ...defaultSchema.attributes,
    // 保留 class 属性 — rehypeHighlight 通过 class 注入代码高亮样式
    code: [...(defaultSchema.attributes?.code ?? []), ['className']],
    pre: [...(defaultSchema.attributes?.pre ?? []), ['className']],
    span: [...(defaultSchema.attributes?.span ?? []), ['className']],
    div: [...(defaultSchema.attributes?.div ?? []), ['className'], ['dataLanguage']],
    // 保留表格样式
    td: [...(defaultSchema.attributes?.td ?? []), ['style'], ['align']],
    th: [...(defaultSchema.attributes?.th ?? []), ['style'], ['align']],
    table: [...(defaultSchema.attributes?.table ?? []), ['style'], ['align']],
    p: [...(defaultSchema.attributes?.p ?? []), ['align']],
    // 允许 img 附加属性
    img: [...(defaultSchema.attributes?.img ?? []), ['loading'], ['width'], ['height']],
    // 允许标题 id（供目录跳转）
    h1: [...(defaultSchema.attributes?.h1 ?? []), ['id']],
    h2: [...(defaultSchema.attributes?.h2 ?? []), ['id']],
    h3: [...(defaultSchema.attributes?.h3 ?? []), ['id']],
  },
  // 扩展允许的 HTML 标签（GFM task list、删除线、折叠块）
  tagNames: [...(defaultSchema.tagNames ?? []), 'input', 'del', 'details', 'summary'],
};

interface MarkdownRendererProps {
  content: string;
}

// 递归提取 React 子节点中的纯文本（用于从 mermaid 代码块拿到原始源码，避免丢失换行）
function extractText(node: ReactNode): string {
  if (node == null || typeof node === 'boolean') return '';
  if (typeof node === 'string' || typeof node === 'number') return String(node);
  if (Array.isArray(node)) return node.map(extractText).join('');
  if (typeof node === 'object' && 'props' in node) {
    return extractText((node as { props?: { children?: ReactNode } }).props?.children);
  }
  return '';
}

export function MarkdownRenderer({ content, sizeClass }: MarkdownRendererProps) {
  const { t } = useTranslation();
  // slugger 在本次渲染内共享，保证标题 id 与 TOC 解析结果一致
  const slugger = makeSlugger();

  // 为 h1~h3 注入 id（与 TOC 使用同一 slug 规则）
  const headingComponents: Components = {
    h1: ({ children }) => <h1 id={slugger(extractText(children))}>{children}</h1>,
    h2: ({ children }) => <h2 id={slugger(extractText(children))}>{children}</h2>,
    h3: ({ children }) => <h3 id={slugger(extractText(children))}>{children}</h3>,
  };

  // 自定义渲染：```mermaid 代码块渲染为流程图，其余代码块保持默认高亮
  const components: Components = {
    ...headingComponents,
    code({ node: _node, className, children, ...props }) {
      const match = /language-(\w+)/.exec(className || '');
      if (match?.[1] === 'mermaid') {
        const code = extractText(children).replace(/\n$/, '');
        return <MermaidDiagram code={code} />;
      }
      return (
        <code className={className} {...props}>
          {children}
        </code>
      );
    },
    // mermaid 块由自定义组件渲染，不再套用 <pre> 的代码框样式
    pre({ node: _pre, children }) {
      const child = Array.isArray(children) ? children[0] : children;
      if (child && typeof child === 'object' && 'type' in child) {
        const type = (child as { type?: unknown }).type;
        if (type === MermaidDiagram) return <>{children}</>;
      }

      const codeText = extractText(children).replace(/\n$/, '');
      const handleCopy = () => {
        navigator.clipboard
          ?.writeText(codeText)
          .then(() => toast({ title: t('common.copied'), variant: 'success' }))
          .catch(() => toast({ title: t('common.copyFailed'), variant: 'error' }));
      };

      return (
        <div className="group relative">
          <button
            type="button"
            onClick={handleCopy}
            title={t('common.copyCode')}
            aria-label={t('common.copyCode')}
            className="no-print absolute right-2 top-2 z-10 grid h-7 w-7 place-items-center rounded-md border border-neutral-200 bg-white/90 text-neutral-500 opacity-0 transition-opacity hover:text-brand-600 group-hover:opacity-100"
          >
            <Copy className="h-3.5 w-3.5" />
          </button>
          <pre>{children}</pre>
        </div>
      );
    },
  };

  return (
    <article className={`prose prose-neutral max-w-none ${sizeClass ?? ''}`}>
      <ReactMarkdown
        remarkPlugins={[remarkGfm]}
        rehypePlugins={[[rehypeSanitize, sanitizeSchema], [rehypeHighlight, { ignoreMissing: true }]]}
        components={components}
      >
        {content}
      </ReactMarkdown>
    </article>
  );
}

// 重新导出 slugify，便于其他模块复用
export { slugify };
