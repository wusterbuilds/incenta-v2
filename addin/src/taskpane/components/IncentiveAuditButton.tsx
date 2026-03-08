import * as React from "react";
import { colors } from "../theme";

interface IncentiveAuditButtonProps {
  onClick: () => void;
  isLoading: boolean;
}

const styles: Record<string, React.CSSProperties> = {
  button: {
    width: "100%",
    padding: "13px 18px",
    background: colors.warm,
    color: colors.white,
    border: "none",
    borderRadius: 10,
    fontSize: 14,
    fontWeight: 600,
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
    gap: 10,
    transition: "background 0.15s, transform 0.1s",
    letterSpacing: 0.3,
  },
  spinner: {
    width: 16,
    height: 16,
    border: `2px solid ${colors.white}`,
    borderTopColor: "transparent",
    borderRadius: "50%",
    animation: "spin 0.7s linear infinite",
  },
};

const IncentiveAuditButton: React.FC<IncentiveAuditButtonProps> = ({ onClick, isLoading }) => (
  <>
    <button
      style={{
        ...styles.button,
        opacity: isLoading ? 0.75 : 1,
        cursor: isLoading ? "not-allowed" : "pointer",
      }}
      onClick={onClick}
      disabled={isLoading}
      onMouseEnter={(e) => {
        if (!isLoading) e.currentTarget.style.background = colors.secondary;
      }}
      onMouseLeave={(e) => {
        e.currentTarget.style.background = colors.warm;
      }}
    >
      {isLoading && <div style={styles.spinner} />}
      {isLoading ? "Auditing..." : "Run Pro Forma Audit"}
    </button>
    <style>{`@keyframes spin { to { transform: rotate(360deg); } }`}</style>
  </>
);

export default IncentiveAuditButton;
