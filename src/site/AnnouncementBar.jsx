export default function AnnouncementBar({ text }) {
  if (!text) return null;
  return (
    <div className="sb2 sb-announce">
      <p>{text}</p>
    </div>
  );
}
