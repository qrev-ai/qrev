function ViewLinkIcon({ width = '14.000000pt', fill = 'rgba(233, 233, 233, 0.8)' }) {
  return (
    <svg
      height={width}
      width={width}
      viewBox="0 0 13 12"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
    >
      <path
        d="M10.25 12H2C1.17157 12 0.5 11.3284 0.5 10.5V2.25C0.5 1.42157 1.17157 0.75 2 0.75H5V2.25H2V10.5H10.25V7.5H11.75V10.5C11.75 11.3284 11.0784 12 10.25 12ZM6.275 7.28025L5.2175 6.21975L9.93725 1.5H7.25V0H12.5V5.25H11V2.56125L6.275 7.28025Z"
        fill={fill}
      />
    </svg>
  );
}

export default ViewLinkIcon;
