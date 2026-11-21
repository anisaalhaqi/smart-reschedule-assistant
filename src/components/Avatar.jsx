const avatarColors = {
  rose: "bg-rose-100 text-rose-700",
  blue: "bg-sky-100 text-sky-700",
  purple: "bg-violet-100 text-violet-700",
  amber: "bg-amber-100 text-amber-700",
  teal: "bg-teal-100 text-teal-700",
};

export default function Avatar({ request, size = "md" }) {
  const dimensions = size === "sm" ? "h-8 w-8 text-[10px]" : "h-10 w-10 text-xs";

  return <div className={`grid shrink-0 place-items-center rounded-full font-extrabold ${dimensions} ${avatarColors[request.color] || avatarColors.blue}`}>{request.initials}</div>;
}
