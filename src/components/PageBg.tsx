"use client";

export default function PageBg({
  image = "/bg.jpg",
  overlay,
  children,
}: {
  image?: string;
  overlay?: string;
  children: React.ReactNode;
}) {
  // se non passi overlay, usa la variabile CSS globale
  const ov = overlay ?? "rgba(0,0,0,var(--page-overlay))";

  return (
    <div className="page-bg">
      <div
        className="page-bg__layer"
        style={{
          backgroundImage: `linear-gradient(${ov}, ${ov}), url(${image})`,
        }}
        aria-hidden="true"
      />
      <div className="page-bg__content">{children}</div>
    </div>
  );
}