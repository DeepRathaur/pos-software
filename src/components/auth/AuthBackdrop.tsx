/** Decorative blur orbs — login_red_black_edition */

export function AuthBackdrop() {
  return (
    <>
      <div
        className="pointer-events-none fixed left-[-10%] top-[-10%] h-[40%] w-[40%] rounded-full bg-stitch-primary/10 blur-[120px]"
        aria-hidden
      />
      <div
        className="pointer-events-none fixed bottom-[-10%] right-[-10%] h-[30%] w-[30%] rounded-full bg-stitch-primary/5 blur-[100px]"
        aria-hidden
      />
    </>
  );
}
