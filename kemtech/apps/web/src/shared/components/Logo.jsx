/** KemTech logo: the mascot image (public/logo.png) plus the wordmark. */
export default function Logo({ size = 36, withText = true }) {
  return (
    <span className="logo" aria-label="KemTech">
      <img src="/logo.png" width={size} height={size} alt="" className="logo-img" draggable="false" />
      {withText && (
        <span className="logo-text">
          Kem<b>Tech</b>
        </span>
      )}
    </span>
  );
}
