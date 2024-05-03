function CardCheckedIcon({ width = '24px', fill = '#2A2930', color = '#2DA24F' }) {
  return (
    <svg
      width={width}
      height={width}
      viewBox="0 0 24 24"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
    >
      <circle cx="12" cy="12" r="12" fill={fill} />
      <path
        d="M12 24C5.37559 23.9927 0.00727484 18.6244 0 12V11.76C0.131918 5.16545 5.5615 -0.0864308 12.1568 0.00107786C18.7521 0.0885865 24.0404 5.48268 23.9973 12.0784C23.9542 18.6742 18.5959 23.9987 12 24ZM6.49199 11.508L4.8 13.2L9.59999 18L19.2 8.40001L17.508 6.69602L9.59999 14.604L6.49199 11.508Z"
        fill={color}
      />
    </svg>
  );
}

export default CardCheckedIcon;
