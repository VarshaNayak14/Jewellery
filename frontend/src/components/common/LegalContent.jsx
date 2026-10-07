// Renders a legal page written in light Markdown (## heading, - bullet,
// **bold**, blank line = new paragraph) as React elements — no raw HTML, so
// whatever an admin types is shown safely. {siteName}, {contactEmail},
// {contactPhone} and {address} are filled from Site Settings.

export const LEGAL_PAGES = [
  { slug: 'privacy-policy', label: 'Privacy Policy' },
  { slug: 'terms-and-conditions', label: 'Terms & Conditions' },
];

export const fillPlaceholders = (text, settings = {}) => String(text || '')
  .replace(/\{siteName\}/g, settings.siteName || 'growthkarts')
  .replace(/\{contactEmail\}/g, settings.contactEmail || 'hello@growthkarts.com')
  .replace(/\{contactPhone\}/g, settings.contactPhone || '+91 98765 43210')
  .replace(/\{address\}/g, settings.address || 'our registered office');

const slugify = (s) => s.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '');

// Parse into blocks: { type: 'h', text, id } | { type: 'p', text } | { type: 'ul', items }
export const parseLegal = (text) => {
  const blocks = [];
  let para = [];
  let list = null;
  const flushPara = () => { if (para.length) { blocks.push({ type: 'p', text: para.join(' ') }); para = []; } };
  const flushList = () => { if (list) { blocks.push({ type: 'ul', items: list }); list = null; } };
  String(text || '').split(/\r?\n/).forEach(raw => {
    const line = raw.trim();
    if (!line) { flushPara(); flushList(); return; }
    if (line.startsWith('## ')) {
      flushPara(); flushList();
      const heading = line.slice(3).trim();
      blocks.push({ type: 'h', text: heading, id: slugify(heading) });
    } else if (/^[-*] /.test(line)) {
      flushPara();
      (list = list || []).push(line.slice(2).trim());
    } else {
      flushList();
      para.push(line);
    }
  });
  flushPara(); flushList();
  return blocks;
};

// **bold** → <strong>
const Inline = ({ text }) => String(text).split(/(\*\*[^*]+\*\*)/g).map((part, i) => (
  part.startsWith('**') && part.endsWith('**')
    ? <strong key={i} className="font-semibold text-gray-900 dark:text-white">{part.slice(2, -2)}</strong>
    : <span key={i}>{part}</span>
));

export default function LegalContent({ blocks }) {
  return (
    <div className="space-y-4 text-[15px] leading-7 text-gray-600 dark:text-gray-300">
      {blocks.map((b, i) => {
        if (b.type === 'h') {
          return <h2 key={i} id={b.id} className="scroll-mt-28 pt-4 text-xl font-bold text-gray-900 dark:text-white">{b.text}</h2>;
        }
        if (b.type === 'ul') {
          return (
            <ul key={i} className="space-y-2">
              {b.items.map((item, j) => (
                <li key={j} className="flex gap-3">
                  <span className="mt-2.5 h-1.5 w-1.5 shrink-0 rounded-full bg-blue-500" />
                  <span><Inline text={item} /></span>
                </li>
              ))}
            </ul>
          );
        }
        return <p key={i}><Inline text={b.text} /></p>;
      })}
    </div>
  );
}
