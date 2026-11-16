/** Page banner: small tag chip, big title (may contain <em>), subtitle and an emoji tile. */
export default function PageHero({ tag, title, sub, icon }) {
  return (
    <div className="page-hero">
      <div>
        {tag && <span className="chip">{tag}</span>}
        <h1>{title}</h1>
        {sub && <p>{sub}</p>}
      </div>
      {icon && <div className="hero-tile" aria-hidden="true">{icon}</div>}
    </div>
  );
}
