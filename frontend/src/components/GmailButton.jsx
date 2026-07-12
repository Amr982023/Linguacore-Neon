import { useState } from "react";
import { Mail, CheckCircle, XCircle, Loader } from "lucide-react";

export default function GmailButton({ label, onSend }) {
  const [status, setStatus] = useState("idle"); // idle | sending | sent | error

  const handleClick = async () => {
    if (status === "sending") return;
    setStatus("sending");
    try {
      await onSend();
      setStatus("sent");
      setTimeout(() => setStatus("idle"), 3000);
    } catch {
      setStatus("error");
      setTimeout(() => setStatus("idle"), 3000);
    }
  };

  return (
    <button
      onClick={handleClick}
      disabled={status === "sending"}
      title={`Send ${label} via Gmail`}
      className={`inline-flex items-center gap-1 px-2 py-1 rounded-lg text-xs font-medium transition-all duration-200 ${
        status === "sent"
          ? "bg-green-100 text-green-700 dark:bg-green-900/40 dark:text-green-300"
          : status === "error"
            ? "bg-red-100 text-red-700 dark:bg-red-900/40 dark:text-red-300"
            : status === "sending"
              ? "bg-gray-100 text-gray-400 dark:bg-gray-800 cursor-not-allowed"
              : "bg-red-50 text-red-600 hover:bg-red-100 dark:bg-red-900/20 dark:text-red-400 dark:hover:bg-red-900/40 cursor-pointer"
      }`}
    >
      {status === "sending" ? (
        <Loader size={11} className="animate-spin" />
      ) : status === "sent" ? (
        <CheckCircle size={11} />
      ) : status === "error" ? (
        <XCircle size={11} />
      ) : (
        <Mail size={11} />
      )}
      <span>
        {status === "sending"
          ? "Sending…"
          : status === "sent"
            ? "Sent!"
            : status === "error"
              ? "Failed"
              : label}
      </span>
    </button>
  );
}
