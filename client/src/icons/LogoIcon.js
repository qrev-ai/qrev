function LogoIcon({ width = '64px', fill = '#DDEB18' }) {
  return (
    <svg
      xmlns="http://www.w3.org/2000/svg"
      width={width}
      height={width}
      viewBox="0 0 64 64"
      fill="none"
    >
      <rect
        x="9"
        y="28.9043"
        width="32.3917"
        height="32.3917"
        transform="rotate(-45 9 28.9043)"
        stroke={fill}
        strokeWidth="1.5"
      />
      <path
        d="M12.2721 31.8236L9 35.0957L31.9044 58.0001L54.8088 35.0957L51.5368 31.8236"
        stroke={fill}
        strokeWidth="1.5"
      />
      <rect
        x="14.7266"
        y="28.9043"
        width="24.2938"
        height="24.2938"
        transform="rotate(-45 14.7266 28.9043)"
        stroke={fill}
        strokeWidth="1.5"
      />
      <rect
        x="20.4521"
        y="28.9043"
        width="16.1959"
        height="16.1959"
        transform="rotate(-45 20.4521 28.9043)"
        stroke={fill}
        strokeWidth="1.5"
      />
      <rect
        x="26.1787"
        y="28.9043"
        width="8.09793"
        height="8.09793"
        transform="rotate(-45 26.1787 28.9043)"
        stroke={fill}
        strokeWidth="1.5"
      />
    </svg>
  );
}

export default LogoIcon;
