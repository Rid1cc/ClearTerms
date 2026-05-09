/** Jedna warstwa tła (fixed) dla całej aplikacji — unika nakładających się orbów przy nawigacji. */
export default function Ambient() {
  return (
    <div className="ambient" aria-hidden="true">
      <div className="orb orb--a" />
      <div className="orb orb--b" />
      <div className="orb orb--c" />
    </div>
  );
}
