// Markdown → bloques de Portable Text, para las páginas legales: las landings
// las pintan con `@portabletext/to-html`. Cubre lo que el backoffice deja
// escribir: títulos, párrafos, citas, listas, negrita, cursiva y enlaces.

type Span = { _type: 'span'; _key: string; text: string; marks: string[] };
type MarkDef = { _type: 'link'; _key: string; href: string };
export type Block = {
  _type: 'block';
  _key: string;
  style: string;
  children: Span[];
  markDefs: MarkDef[];
  listItem?: 'bullet' | 'number';
  level?: number;
};

const HEADINGS: Record<number, string> = { 1: 'h1', 2: 'h2', 3: 'h3', 4: 'h4' };

// Por orden: enlace, negrita+cursiva, negrita, cursiva.
const INLINE = /\[([^\]]+)\]\(([^)\s]+)\)|\*\*\*([^*]+)\*\*\*|\*\*([^*]+)\*\*|\*([^*\s][^*]*)\*/g;

function inline(text: string, blockKey: string): { children: Span[]; markDefs: MarkDef[] } {
  const children: Span[] = [];
  const markDefs: MarkDef[] = [];
  const push = (t: string, marks: string[]) => {
    if (t !== '') children.push({ _type: 'span', _key: `${blockKey}s${children.length}`, text: t, marks });
  };
  let last = 0;
  for (const m of text.matchAll(INLINE)) {
    push(text.slice(last, m.index), []);
    if (m[1] !== undefined) {
      const key = `${blockKey}l${markDefs.length}`;
      markDefs.push({ _type: 'link', _key: key, href: m[2] });
      // El texto del enlace puede llevar a su vez negrita o cursiva.
      const inner = inline(m[1], `${blockKey}i${markDefs.length}`);
      for (const span of inner.children) children.push({ ...span, _key: `${blockKey}s${children.length}`, marks: [...span.marks, key] });
    } else if (m[3] !== undefined) push(m[3], ['strong', 'em']);
    else if (m[4] !== undefined) push(m[4], ['strong']);
    else if (m[5] !== undefined) push(m[5], ['em']);
    last = m.index! + m[0].length;
  }
  push(text.slice(last), []);
  if (children.length === 0) push(text, []);
  return { children, markDefs };
}

export function markdownToBlocks(markdown: string): Block[] {
  const blocks: Block[] = [];
  const add = (text: string, extra: Partial<Block> = {}) => {
    const key = `b${blocks.length}`;
    blocks.push({ _type: 'block', _key: key, style: 'normal', ...inline(text.trim(), key), ...extra });
  };

  let paragraph: string[] = [];
  const flush = () => {
    if (paragraph.length > 0) add(paragraph.join(' '));
    paragraph = [];
  };

  for (const line of markdown.replace(/\r\n?/g, '\n').split('\n')) {
    if (line.trim() === '') { flush(); continue; }
    const heading = line.match(/^(#{1,4})\s+(.*)$/);
    const quote = line.match(/^>\s?(.*)$/);
    const item = line.match(/^(\s*)([-*]|\d+\.)\s+(.*)$/);
    if (heading) {
      flush();
      add(heading[2], { style: HEADINGS[heading[1].length] });
    } else if (quote) {
      flush();
      add(quote[1], { style: 'blockquote' });
    } else if (item) {
      flush();
      add(item[3], { listItem: /\d/.test(item[2]) ? 'number' : 'bullet', level: Math.floor(item[1].length / 2) + 1 });
    } else {
      paragraph.push(line.trim());
    }
  }
  flush();
  return blocks;
}
