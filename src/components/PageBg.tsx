"use client";

export default function PageBg({
  image = "/bg.jpg",
  overlay = "rgba(0,0,0,0.55)",
  children,
}: {
  image?: string;
  overlay?: string;
  children: React.ReactNode;
}) {
  return (
    <div className="page-bg">
      <div
        className="page-bg__layer"
        style={{
          backgroundImage: `linear-gradient(${overlay}, ${overlay}), url(${image})`,
        }}
        aria-hidden="true"
      />
      <div className="page-bg__content">{children}</div>
    </div>
  );
}