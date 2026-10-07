// Shared section heading: small gold label + title whose last word is gold-gradient
// (same look as the "Best Sellers" heading). Pass `plain` to skip the gold word.
export default function SectionTitle({ title, eyebrow, className = '', plain = false, as: Tag = 'h2', align = 'center' }) {
  let content = title;
  if (!plain && typeof title === 'string') {
    const words = title.trim().split(/\s+/);
    if (words.length > 1) {
      const last = words.pop();
      content = <>{words.join(' ')} <em>{last}</em></>;
    } else {
      content = <em>{title}</em>;
    }
  }
  return (
    <>
      {eyebrow && <span className="sec-eyebrow" style={{ textAlign: align }}>{eyebrow}</span>}
      <Tag className={`sec-title ${className}`}>{content}</Tag>
    </>
  );
}