function ArrowDown({ width = '24px', fill = '#D4D4D6', style = {} }) {
  return (
    <svg
      width={width}
      height={width}
      viewBox="0 0 24 24"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
      style={style}
    >
      <path
        d="M12.1721 8.40156L6.69755 13.8761C6.50238 14.0713 6.50227 14.3877 6.6973 14.583L7.36076 15.2474C7.55602 15.4429 7.87289 15.443 8.06823 15.2475L12.1721 11.141L16.2753 15.2477C16.4705 15.4431 16.7872 15.4432 16.9826 15.2479L17.6465 14.5839C17.8417 14.3887 17.8417 14.0721 17.6465 13.8769L12.1721 8.40156Z"
        fill={fill}
      />
    </svg>
  );
}

export default ArrowDown;
