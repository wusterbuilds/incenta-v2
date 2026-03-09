import * as React from "react";
import { ChatMessage, AuditFlag, ScenarioResult } from "../types";
import { colors, fonts } from "../theme";
import MessageBubble from "./MessageBubble";

interface ChatPanelProps {
  messages: ChatMessage[];
  onSendMessage: (text: string) => void;
  onFileUpload?: (file: File) => void;
  isLoading: boolean;
  onApplyScenario?: (scenario: ScenarioResult) => void;
  onClickProblem?: (flag: AuditFlag) => void;
  onApplyChanges?: () => void;
  onUndo?: () => void;
  onDismiss?: () => void;
}

const styles: Record<string, React.CSSProperties> = {
  container: {
    display: "flex",
    flexDirection: "column",
    height: "100%",
    overflow: "hidden",
  },
  messageArea: {
    flex: 1,
    overflowY: "auto",
    padding: "12px 12px 8px",
    display: "flex",
    flexDirection: "column",
    gap: 8,
  },
  typingIndicator: {
    display: "flex",
    alignItems: "center",
    gap: 4,
    padding: "8px 14px",
    background: colors.offWhite,
    borderRadius: 14,
    alignSelf: "flex-start",
    maxWidth: "60%",
  },
  dot: {
    width: 6,
    height: 6,
    borderRadius: "50%",
    background: colors.muted,
  },
  inputBar: {
    display: "flex",
    alignItems: "center",
    gap: 8,
    padding: "10px 12px",
    borderTop: `1px solid ${colors.lightGray}`,
    background: colors.white,
    flexShrink: 0,
  },
  input: {
    flex: 1,
    padding: "9px 14px",
    border: `1px solid ${colors.lightGray}`,
    borderRadius: 20,
    outline: "none",
    fontSize: 13,
    fontFamily: fonts.sans,
    color: colors.primary,
    background: colors.offWhite,
    transition: "border-color 0.15s",
  },
  sendButton: {
    width: 34,
    height: 34,
    borderRadius: "50%",
    border: "none",
    background: colors.warm,
    color: colors.white,
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
    flexShrink: 0,
    fontSize: 13,
    cursor: "pointer",
    transition: "background 0.15s",
  },
  uploadButton: {
    width: 34,
    height: 34,
    borderRadius: "50%",
    border: `1px solid ${colors.lightGray}`,
    background: colors.offWhite,
    color: colors.secondary,
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
    flexShrink: 0,
    fontSize: 15,
    cursor: "pointer",
    transition: "background 0.15s, border-color 0.15s",
  },
};

const TypingIndicator: React.FC = () => (
  <div style={styles.typingIndicator}>
    {[0, 1, 2].map((i) => (
      <div
        key={i}
        style={{
          ...styles.dot,
          animation: `typing 1.2s infinite ${i * 0.2}s`,
        }}
      />
    ))}
    <style>{`
      @keyframes typing {
        0%, 60%, 100% { opacity: 0.3; transform: scale(1); }
        30% { opacity: 1; transform: scale(1.2); }
      }
    `}</style>
  </div>
);

const ChatPanel: React.FC<ChatPanelProps> = ({
  messages,
  onSendMessage,
  onFileUpload,
  isLoading,
  onApplyScenario,
  onClickProblem,
  onApplyChanges,
  onUndo,
  onDismiss,
}) => {
  const [input, setInput] = React.useState("");
  const bottomRef = React.useRef<HTMLDivElement>(null);
  const fileInputRef = React.useRef<HTMLInputElement>(null);

  React.useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages, isLoading]);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const trimmed = input.trim();
    if (!trimmed || isLoading) return;
    onSendMessage(trimmed);
    setInput("");
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file && onFileUpload) {
      onFileUpload(file);
    }
    if (fileInputRef.current) {
      fileInputRef.current.value = "";
    }
  };

  return (
    <div style={styles.container}>
      <div style={styles.messageArea}>
        {messages.map((msg) => (
          <MessageBubble
            key={msg.id}
            message={msg}
            onApplyScenario={onApplyScenario}
            onClickProblem={onClickProblem}
            onApplyChanges={onApplyChanges}
            onUndo={onUndo}
            onDismiss={onDismiss}
          />
        ))}
        {isLoading && <TypingIndicator />}
        <div ref={bottomRef} />
      </div>

      <form onSubmit={handleSubmit} style={styles.inputBar}>
        <input
          ref={fileInputRef}
          type="file"
          accept=".xlsx,.xls"
          style={{ display: "none" }}
          onChange={handleFileChange}
        />
        <button
          type="button"
          style={{
            ...styles.uploadButton,
            opacity: isLoading ? 0.5 : 1,
          }}
          disabled={isLoading}
          title="Upload pro forma"
          onClick={() => fileInputRef.current?.click()}
        >
          &#128206;
        </button>
        <input
          style={styles.input}
          value={input}
          onChange={(e) => setInput(e.target.value)}
          placeholder="Ask about your pro forma..."
          disabled={isLoading}
          onFocus={(e) => (e.currentTarget.style.borderColor = colors.warm)}
          onBlur={(e) => (e.currentTarget.style.borderColor = colors.lightGray)}
        />
        <button
          type="submit"
          style={{
            ...styles.sendButton,
            opacity: !input.trim() || isLoading ? 0.5 : 1,
          }}
          disabled={!input.trim() || isLoading}
          title="Send"
        >
          &#9654;
        </button>
      </form>
    </div>
  );
};

export default ChatPanel;
