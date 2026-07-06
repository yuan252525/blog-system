import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';
import rehypeHighlight from 'rehype-highlight';
import rehypeSanitize, { defaultSchema } from 'rehype-sanitize';

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

export function MarkdownRenderer({ content }: MarkdownRendererProps) {
  return (
    <article className="prose prose-neutral max-w-none">
      <ReactMarkdown
        remarkPlugins={[remarkGfm]}
        rehypePlugins={[[rehypeSanitize, sanitizeSchema], rehypeHighlight]}
      >
        {content}
      </ReactMarkdown>
    </article>
  );
}
