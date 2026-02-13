export default function NotFound() {
  return (
    <div
      style={{
        minHeight: "70vh",
        display: "flex",
        flexDirection: "column",
        justifyContent: "center",
        alignItems: "center",
        textAlign: "center",
        padding: 24,
      }}
    >
      <h1 style={{ margin: 0, fontSize: 96, fontWeight: 900 }}>404</h1>

      <p style={{ marginTop: 12, fontSize: 20, opacity: 0.85 }}>
        Тази страница не съществува.
      </p>

      <a
        href="/"
        style={{
          marginTop: 20,
          fontWeight: 900,
          fontSize: 18,
          color: "#16a34a",
          textDecoration: "none",
        }}
      >
        ← Обратно към началото
      </a>
    </div>
  );
}