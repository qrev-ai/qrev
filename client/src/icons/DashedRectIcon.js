function DashedRectIcon({ width = '24px', fill = '#DDEB18' }) {
  return (
    <svg
      width={width}
      height={width}
      viewBox="0 0 24 24"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
    >
      <rect
        x="2.5"
        y="2.5"
        width="19"
        height="19"
        stroke={fill}
        strokeLinecap="square"
        strokeLinejoin="bevel"
        strokeDasharray="6 4"
      />
    </svg>
  );
}

export default DashedRectIcon;
