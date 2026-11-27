'use client';

import { useEffect } from 'react';
import { EditorContent, useEditor, type Editor } from '@tiptap/react';
import StarterKit from '@tiptap/starter-kit';
import { Markdown } from 'tiptap-markdown';
import { Bold, Heading2, Heading3, IndentDecrease, IndentIncrease, Italic, List, ListOrdered, type LucideIcon } from 'lucide-react';
import type { FieldControlProps } from '@/components/ui/Field';
import { cn } from '@/lib/utils';

interface Props {
  control: FieldControlProps;
  /** Nombre del campo para lectores de pantalla (un área editable no se une a su `<label>`). */
  label: string;
  lang: string;
  value: string;
  onChange: (markdown: string) => void;
  onBlur?: () => void;
}

/**
 * Editor con formato para textos largos (los textos legales). Guarda Markdown, lo mismo
 * que ya leen las webs: negrita, cursiva, títulos de apartado y listas con sangría.
 */
export function MarkdownEditor({ control, label, lang, value, onChange, onBlur }: Props) {
  const editor = useEditor({
    extensions: [
      StarterKit.configure({ heading: { levels: [2, 3] }, code: false, codeBlock: false, horizontalRule: false, blockquote: false }),
      Markdown.configure({ html: false, tightLists: true, bulletListMarker: '-', linkify: false })
    ],
    content: value ?? '',
    // En el servidor no hay editor: se monta ya en el navegador (si no, la hidratación no casa).
    immediatelyRender: false,
    editorProps: {
      attributes: {
        id: control.id,
        lang,
        role: 'textbox',
        'aria-multiline': 'true',
        'aria-label': label,
        ...(control['aria-describedby'] ? { 'aria-describedby': control['aria-describedby'] } : {}),
        ...(control['aria-invalid'] ? { 'aria-invalid': 'true' } : {}),
        class: 'min-h-[320px] rounded-b-[8px] px-3.5 py-3 text-[16px] leading-[1.6] text-[color:var(--color-ink)] outline-none focus-visible:outline-solid focus-visible:outline-2 focus-visible:-outline-offset-2 focus-visible:outline-[color:var(--color-accent)] sm:text-[15px]'
      }
    },
    onUpdate: ({ editor }) => onChange(markdownOf(editor)),
    onBlur: () => onBlur?.()
  });

  // Si el valor cambia desde fuera (descartar, cambiar de página), el editor lo sigue.
  useEffect(() => {
    if (editor && (value ?? '') !== markdownOf(editor)) editor.commands.setContent(value ?? '', false);
  }, [editor, value]);

  return (
    <div className="rounded-[8px] border border-[color:var(--color-control)] bg-white focus-within:border-[color:var(--color-accent)] focus-within:ring-[3px] focus-within:ring-[color:var(--accent-ring)] aria-[invalid=true]:border-[color:var(--color-danger)]">
      <Toolbar editor={editor} label={label} />
      <EditorContent
        editor={editor}
        className={cn(
          '[&_h2]:mb-2 [&_h2]:mt-5 [&_h2]:text-[19px] [&_h2]:font-bold [&_h3]:mb-1.5 [&_h3]:mt-4 [&_h3]:text-[16.5px] [&_h3]:font-bold',
          '[&_p]:my-2 [&_ul]:my-2 [&_ul]:list-disc [&_ul]:pl-6 [&_ol]:my-2 [&_ol]:list-decimal [&_ol]:pl-6 [&_li_p]:my-0.5 [&_strong]:font-bold'
        )}
      />
    </div>
  );
}

function markdownOf(editor: Editor): string {
  return (editor.storage as { markdown: { getMarkdown: () => string } }).markdown.getMarkdown();
}

function Toolbar({ editor, label }: { editor: Editor | null; label: string }) {
  const tools: { icon: LucideIcon; name: string; active?: boolean; disabled?: boolean; run: () => void }[] = editor ? [
    { icon: Bold, name: 'Negrita', active: editor.isActive('bold'), run: () => editor.chain().focus().toggleBold().run() },
    { icon: Italic, name: 'Cursiva', active: editor.isActive('italic'), run: () => editor.chain().focus().toggleItalic().run() },
    { icon: Heading2, name: 'Título de apartado', active: editor.isActive('heading', { level: 2 }), run: () => editor.chain().focus().toggleHeading({ level: 2 }).run() },
    { icon: Heading3, name: 'Subtítulo', active: editor.isActive('heading', { level: 3 }), run: () => editor.chain().focus().toggleHeading({ level: 3 }).run() },
    { icon: List, name: 'Lista', active: editor.isActive('bulletList'), run: () => editor.chain().focus().toggleBulletList().run() },
    { icon: ListOrdered, name: 'Lista numerada', active: editor.isActive('orderedList'), run: () => editor.chain().focus().toggleOrderedList().run() },
    { icon: IndentIncrease, name: 'Más sangría', disabled: !editor.can().sinkListItem('listItem'), run: () => editor.chain().focus().sinkListItem('listItem').run() },
    { icon: IndentDecrease, name: 'Menos sangría', disabled: !editor.can().liftListItem('listItem'), run: () => editor.chain().focus().liftListItem('listItem').run() }
  ] : [];
  return (
    <div role="toolbar" aria-label={`Formato: ${label}`} className="flex flex-wrap gap-1 border-b border-[color:var(--color-border)] bg-[color:var(--color-surface-2)] p-1.5">
      {tools.map(({ icon: Icon, name, active, disabled, run }) => (
        <button
          key={name}
          type="button"
          aria-label={name}
          title={name}
          aria-pressed={active === undefined ? undefined : active}
          disabled={disabled}
          // Que el clic no quite el foco del texto (si no, se pierde la selección).
          onMouseDown={e => e.preventDefault()}
          onClick={run}
          className={cn(
            'grid h-9 w-9 cursor-pointer place-items-center rounded-[6px] border-0 text-[color:var(--color-ink-soft)] transition-colors disabled:cursor-default disabled:opacity-40',
            active ? 'bg-[color:var(--color-accent-soft)] text-[color:var(--color-accent-fg)]' : 'bg-transparent hover:bg-white hover:text-[color:var(--color-ink)]'
          )}
        >
          <Icon aria-hidden className="h-4 w-4" />
        </button>
      ))}
    </div>
  );
}
