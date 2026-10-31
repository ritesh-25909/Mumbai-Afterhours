export function Logo({ light = true }: { light?: boolean }) {
  return (
    <span className={`inline-flex items-center gap-2 text-lg font-extrabold ${light ? 'text-white' : 'text-ink'}`}>
      <img src={`${import.meta.env.BASE_URL}favicon.svg`} alt="" className="h-7 w-7" /> Mumbai Afterhours
    </span>
  );
}
