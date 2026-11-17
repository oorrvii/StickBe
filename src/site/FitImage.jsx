import { useState } from "react";

export default function FitImage({ src, alt = "", loading = "lazy" }) {
  const [failed, setFailed] = useState(false);
  return (
    <span className="sb-fit">
      {failed ? (
        <span className="sb-fit__missing">Photo coming soon</span>
      ) : (
        <img className="sb-fit__img" src={src} alt={alt} loading={loading} onError={() => setFailed(true)} />
      )}
    </span>
  );
}
