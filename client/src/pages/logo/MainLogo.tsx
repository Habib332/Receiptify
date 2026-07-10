const ReceiptLogo = ({ size = 64 }: { size?: number }) => {
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 64 64"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
    >
      {/* Receipt */}
      <path
        d="M14 6H42L50 14V56L45 52L40 56L35 52L30 56L25 52L20 56L14 52V6Z"
        fill="white"
        stroke="#2563EB"
        strokeWidth="2.5"
        strokeLinejoin="round"
      />

      {/* Folded Corner */}
      <path
        d="M42 6V14H50"
        fill="none"
        stroke="#2563EB"
        strokeWidth="2.5"
        strokeLinejoin="round"
      />

      {/* R */}
      <text
        x="32"
        y="26"
        textAnchor="middle"
        fontSize="18"
        fontWeight="700"
        fill="#2563EB"
        fontFamily="Inter, Arial, sans-serif"
      >
        R
      </text>

      {/* Receipt Lines */}
      <line
        x1="22"
        y1="34"
        x2="42"
        y2="34"
        stroke="#CBD5E1"
        strokeWidth="2"
        strokeLinecap="round"
      />
      <line
        x1="22"
        y1="40"
        x2="42"
        y2="40"
        stroke="#CBD5E1"
        strokeWidth="2"
        strokeLinecap="round"
      />

      {/* Accent Line */}
      <line
        x1="22"
        y1="46"
        x2="34"
        y2="46"
        stroke="#EF4444"
        strokeWidth="2.5"
        strokeLinecap="round"
      />
    </svg>
  );
};

export default ReceiptLogo;