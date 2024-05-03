 

function HomeIcon({ width = '32px', fill = '#7F7F83' }) {
  return (
    <svg
      width={width}
      height={width}
      viewBox="0 0 32 32"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
    >
      <path
        d="M16 9.228L22 14.628V24H19.6V16.8H12.4V24H10V14.628L16 9.228ZM16 6L4 16.8H7.6V26.4H14.8V19.2H17.2V26.4H24.4V16.8H28L16 6Z"
        fill={fill}
      />
    </svg>
  );
}

export default HomeIcon;
