import ReactMarkdown, { type Components } from 'react-markdown';
import { type ReactNode } from 'react';
import remarkGfm from 'remark-gfm';
import rehypeHighlight from 'rehype-highlight';
import rehypeSanitize, { defaultSchema } from 'rehype-sanitize';
import { MermaidDiagram } from './MermaidDiagram';

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

// 自定义渲染：```mermaid 代码块渲染为流程图，其余代码块保持默认高亮
const components: Components = {
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
      const t = (child as { type?: unknown }).type;
      if (t === MermaidDiagram) return <>{children}</>;
    }
    return <pre>{children}</pre>;
  },
};

export function MarkdownRenderer({ content }: MarkdownRendererProps) {
  return (
    <article className="prose prose-neutral max-w-none">
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
