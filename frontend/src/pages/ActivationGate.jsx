import { useQuery, useMutation } from "@tanstack/react-query";
import { useState } from "react";
import axios from "axios";
import toast from "react-hot-toast";

const api = {
  status: () => axios.get("/api/license/status"),
  activate: (code) => axios.post("/api/license/activate", { code }),
};

const inputStyle = {
  width: "100%",
  boxSizing: "border-box",
  padding: "14px 18px",
  background: "rgba(255,255,255,0.07)",
  border: "1px solid rgba(212,163,115,0.4)",
  borderRadius: 15,
  color: "#fff",
  outline: "none",
  fontSize: "1rem",
  fontFamily: "Inter, monospace",
  letterSpacing: "0.1em",
  textAlign: "center",
};

export default function ActivationGate({ children }) {
  const [code, setCode] = useState("");

  const { data, isLoading, refetch } = useQuery({
    queryKey: ["license-status"],
    queryFn: () => api.status().then((r) => r.data),
    retry: false,
  });

  const mutation = useMutation({
    mutationFn: () => api.activate(code),
    onSuccess: () => {
      toast.success("Activated!");
      refetch();
    },
    onError: (err) =>
      toast.error(err.response?.data?.message || "Invalid serial"),
  });

  if (isLoading)
    return (
      <div
        style={{
          minHeight: "100vh",
          background: "#121417",
          display: "grid",
          placeItems: "center",
        }}
      >
        <span
          style={{
            color: "#fff",
            opacity: 0.4,
            fontFamily: "Inter, sans-serif",
          }}
        >
          Checking license…
        </span>
      </div>
    );

  if (data?.activated) return children;

  return (
    <div
      style={{
        minHeight: "100vh",
        background: "#121417",
        display: "grid",
        placeItems: "center",
        fontFamily: "Inter, system-ui, sans-serif",
        padding: 24,
      }}
    >
      <div
        style={{
          background: "rgba(255,255,255,0.05)",
          backdropFilter: "blur(20px)",
          border: "1px solid rgba(255,255,255,0.1)",
          borderRadius: 30,
          padding: "2.5rem",
          width: "100%",
          maxWidth: 420,
          textAlign: "center",
          boxShadow: "0 20px 40px rgba(0,0,0,0.4)",
        }}
      >
        <div style={{ fontSize: 48, marginBottom: 8 }}>🔐</div>

        <h2
          style={{
            color: "#fff",
            fontWeight: 600,
            fontSize: "1.3rem",
            margin: "0 0 0.5rem",
          }}
        >
          Activate LinguaCore
        </h2>
        <p
          style={{
            color: "rgba(255,255,255,0.4)",
            fontSize: 13,
            marginBottom: "2rem",
            lineHeight: 1.6,
          }}
        >
          Enter the serial number provided by Novexus Solution to activate this
          copy.
        </p>

        <input
          value={code}
          onChange={(e) => setCode(e.target.value)}
          placeholder="Enter serial number"
          style={inputStyle}
          onKeyDown={(e) => e.key === "Enter" && mutation.mutate()}
        />

        <button
          onClick={() => mutation.mutate()}
          disabled={mutation.isPending || !code.trim()}
          style={{
            marginTop: 16,
            width: "100%",
            padding: "15px",
            background:
              "linear-gradient(135deg,#bf953f,#fcf6ba,#b38728,#fcf6ba,#aa771c)",
            border: "none",
            borderRadius: 15,
            fontWeight: 600,
            color: "#121417",
            cursor: "pointer",
            fontSize: "1rem",
            opacity: mutation.isPending || !code.trim() ? 0.5 : 1,
            transition: "0.3s",
          }}
        >
          {mutation.isPending ? "Activating…" : "Activate"}
        </button>

        <p
          style={{
            color: "rgba(255,255,255,0.25)",
            fontSize: 11,
            marginTop: 20,
            lineHeight: 1.6,
          }}
        >
          Contact Novexus Solution to obtain your serial number.
        </p>
      </div>
    </div>
  );
}
