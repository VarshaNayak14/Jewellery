// Renders blog `content` written in a small, safe markup — no raw HTML:
//   ## Heading / ### Sub-heading
//   - bullet item        1. numbered item
//   > quote
//   ![caption](https://image-url)
//   **bold**  *italic*  [link text](https://url)
// Blank line = new paragraph.

const INLINE = /(\*\*[^*]+\*\*|\*[^*]+\*|\[[^\]]+\]\((?:https?:\/\/|\/)[^)\s]+\))/g;

function inline(text, keyBase) {
  return text.split(INLINE).filter(Boolean).map((part, i) => {
    const key = `${keyBase}-${i}`;
    if (/^\*\*[^*]+\*\*$/.test(part)) return <strong key={key}>{part.slice(2, -2)}</strong>;
    if (/^\*[^*]+\*$/.test(part)) return <em key={key}>{part.slice(1, -1)}</em>;
    const link = part.match(/^\[([^\]]+)\]\(((?:https?:\/\/|\/)[^)\s]+)\)$/);
    if (link) {
      const external = link[2].startsWith('http');
      return <a key={key} href={link[2]} {...(external ? { target: '_blank', rel: 'noopener noreferrer' } : {})}>{link[1]}</a>;
    }
    return part;
  });
}

export function parseBlocks(content = '') {
  const lines = String(content).replace(/\r\n/g, '\n').split('\n');
  const blocks = [];
  let para = [];
  let list = null;

  const flushPara = () => { if (para.length) { blocks.push({ type: 'p', text: para.join(' ') }); para = []; } };
  const flushList = () => { if (list) { blocks.push(list); list = null; } };

  lines.forEach((raw) => {
    const line = raw.trim();
    if (!line) { flushPara(); flushList(); return; }
    let m;
    if ((m = line.match(/^(#{2,3})\s+(.*)$/))) { flushPara(); flushList(); blocks.push({ type: m[1].length === 2 ? 'h2' : 'h3', text: m[2] }); return; }
    if ((m = line.match(/^!\[([^\]]*)\]\(((?:https?:\/\/|\/)[^)\s]+)\)$/))) { flushPara(); flushList(); blocks.push({ type: 'img', alt: m[1], src: m[2] }); return; }
    if ((m = line.match(/^>\s?(.*)$/))) { flushPara(); flushList(); blocks.push({ type: 'quote', text: m[1] }); return; }
    if ((m = line.match(/^[-*]\s+(.*)$/))) { flushPara(); if (!list || list.type !== 'ul') { flushList(); list = { type: 'ul', items: [] }; } list.items.push(m[1]); return; }
    if ((m = line.match(/^\d+[.)]\s+(.*)$/))) { flushPara(); if (!list || list.type !== 'ol') { flushList(); list = { type: 'ol', items: [] }; } list.items.push(m[1]); return; }
    flushList();
    para.push(line);
  });
  flushPara();
  flushList();
  return blocks;
}

export default function BlogContent({ content }) {
  return (
    <div className="blog-prose">
      {parseBlocks(content).map((b, i) => {
        switch (b.type) {
          case 'h2': return <h2 key={i} id={`s-${i}`}>{inline(b.text, i)}</h2>;
          case 'h3': return <h3 key={i}>{inline(b.text, i)}</h3>;
          case 'quote': return <blockquote key={i}>{inline(b.text, i)}</blockquote>;
          case 'img': return (
            <figure key={i}>
              <img src={b.src} alt={b.alt} loading="lazy" />
              {b.alt && <figcaption>{b.alt}</figcaption>}
            </figure>
          );
          case 'ul': return <ul key={i}>{b.items.map((t, j) => <li key={j}>{inline(t, `${i}-${j}`)}</li>)}</ul>;
          case 'ol': return <ol key={i}>{b.items.map((t, j) => <li key={j}>{inline(t, `${i}-${j}`)}</li>)}</ol>;
          default: return <p key={i}>{inline(b.text, i)}</p>;
        }
      })}
    </div>
  );
}
