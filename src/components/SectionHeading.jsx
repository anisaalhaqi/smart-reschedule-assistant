export default function SectionHeading({ eyebrow, title, description, action }) {
  return (
    <div className="flex flex-col justify-between gap-3 sm:flex-row sm:items-end">
      <div>
        {eyebrow && <p className="text-[10px] font-extrabold uppercase tracking-[0.18em] text-emerald-700">{eyebrow}</p>}

        <h2 className="mt-1 font-display text-xl font-extrabold tracking-tight text-ink sm:text-[23px]">{title}</h2>

        {description && <p className="mt-1.5 text-xs text-muted">{description}</p>}
      </div>

      {action}
    </div>
  );
}
