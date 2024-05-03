function CallInsightsIcon({ width = '40px', fill = '#DDEB18' }) {
  return (
    <svg
      xmlns="http://www.w3.org/2000/svg"
      width={width}
      height={width}
      viewBox="0 0 40 40"
      fill="none"
    >
      <path
        d="M6.66669 6.66667V29.2308C6.66669 31.4966 8.50347 33.3333 10.7693 33.3333H33.3334"
        stroke={fill}
        strokeWidth="2"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
      <path
        d="M10.7692 25.1282L16.9231 18.9744L21.0256 23.077L31.282 12.8205"
        stroke={fill}
        strokeWidth="2"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
      <path
        d="M31.2821 18.9744V12.8205H25.1282"
        stroke={fill}
        strokeWidth="2"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  );
}

export default CallInsightsIcon;
