import { Dust } from "@/components/dust";

export function Backdrop() {
  return (
    <div className="site-backdrop" aria-hidden="true">
      <div className="site-backdrop__spill" />
      <Dust />
      <div className="site-backdrop__image" />
      <div className="site-backdrop__vignette" />
      <div className="site-backdrop__grain" />
    </div>
  );
}
