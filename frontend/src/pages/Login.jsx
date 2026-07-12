import { useEffect, useState, useRef } from "react";
import { useForm } from "react-hook-form";
import { useNavigate } from "react-router-dom";
import { useMutation, useQuery } from "@tanstack/react-query";
import toast from "react-hot-toast";
import { authApi, lookupsApi } from "../services/endpoints";
import { useAuthStore } from "../context/authStore";
import logo from "../components/logo.png";
import Centerlogo from "../components/Centerlogo.png";

const clickSound = new Audio("https://assets.codepen.io/605876/click.mp3");
const playClick = () => {
  clickSound.currentTime = 0;
  clickSound.play().catch(() => {});
};

function Lamp({ isOn, onToggle }) {
  const [pullY, setPullY] = useState(0);
  const [dragging, setDrag] = useState(false);
  const startY = useRef(0);

  const onDown = (e) => {
    e.preventDefault();
    setDrag(true);
    startY.current = e.clientY;
    window.addEventListener("pointermove", onMove);
    window.addEventListener("pointerup", onUp);
  };

  const onMove = (e) =>
    setPullY(Math.max(0, Math.min(60, e.clientY - startY.current)));

  const onUp = (e) => {
    const dy = Math.max(0, Math.min(60, e.clientY - startY.current));
    if (dy > 30) {
      playClick();
      onToggle();
    }
    setPullY(0);
    setDrag(false);
    window.removeEventListener("pointermove", onMove);
    window.removeEventListener("pointerup", onUp);
  };

  const ease = "cubic-bezier(0.34,1.56,0.64,1)";
  const cordTrans = dragging ? "none" : `all 0.5s ${ease}`;
  const beadCY = 190 + pullY;
  const lineY2 = 180 + pullY;

  return (
    <div
      style={{ position: "relative", width: 280, height: 400, flexShrink: 0 }}
    >
      <svg
        viewBox="0 0 200 300"
        xmlns="http://www.w3.org/2000/svg"
        style={{ width: "100%", height: "100%", overflow: "visible" }}
      >
        <ellipse
          cx="100"
          cy="110"
          rx="60"
          ry="30"
          fill="#ffdb8a"
          style={{
            filter: "blur(15px)",
            opacity: isOn ? 0.6 : 0,
            transition: "opacity 0.5s cubic-bezier(0.4,0,0.2,1)",
          }}
        />
        <rect x="92" y="100" width="16" height="160" rx="8" fill="#d1ccc2" />
        <rect x="60" y="250" width="80" height="12" rx="6" fill="#d1ccc2" />
        <line
          x1="130"
          y1="110"
          x2="130"
          y2={lineY2}
          stroke="#555"
          strokeWidth="2"
          style={{ transition: cordTrans }}
        />
        <circle
          cx="130"
          cy={beadCY}
          r="6"
          fill="#d4a373"
          style={{ transition: dragging ? "none" : `cy 0.5s ${ease}` }}
        />
        <circle
          cx="130"
          cy={beadCY}
          r="25"
          fill="transparent"
          style={{ cursor: "pointer" }}
          onPointerDown={onDown}
        />
        <path
          d="M30 110 C 30 50, 170 50, 170 110 C 170 125, 30 125, 30 110 Z"
          fill={isOn ? "#fff" : "#f5f0e6"}
          style={{
            transition:
              "fill 0.5s cubic-bezier(0.4,0,0.2,1), filter 0.5s cubic-bezier(0.4,0,0.2,1)",
            filter: isOn
              ? "drop-shadow(0 0 30px rgba(255,255,200,0.4))"
              : "none",
          }}
        />
      </svg>
    </div>
  );
}

function Field({ label, error, children }) {
  return (
    <div style={{ marginBottom: "1.2rem" }}>
      <label
        style={{
          display: "block",
          color: "#999",
          fontSize: "0.85rem",
          marginBottom: "0.5rem",
          marginLeft: 5,
        }}
      >
        {label}
      </label>
      {children}
      {error && (
        <p
          style={{
            color: "#f87171",
            fontSize: 12,
            marginTop: 4,
            marginBottom: 0,
          }}
        >
          {error}
        </p>
      )}
    </div>
  );
}

const inputBase = {
  width: "100%",
  boxSizing: "border-box",
  padding: "14px 18px",
  background: "rgba(255,255,255,0.07)",
  border: "1px solid transparent",
  borderRadius: 15,
  color: "#fff",
  outline: "none",
  transition: "0.3s",
  fontSize: "1rem",
  fontFamily: "Inter, system-ui, sans-serif",
};

const selectBase = {
  ...inputBase,
  appearance: "none",
  cursor: "pointer",
  background: "#1e2126",
  color: "#fff",
};

function Input({ reg, type = "text", placeholder, error }) {
  return (
    <input
      type={type}
      {...reg}
      placeholder={placeholder}
      style={{ ...inputBase, borderColor: error ? "#f87171" : "transparent" }}
      onFocus={(e) => {
        e.target.style.borderColor = "#d4a373";
        e.target.style.background = "rgba(255,255,255,0.12)";
      }}
      onBlur={(e) => {
        e.target.style.borderColor = error ? "#f87171" : "transparent";
        e.target.style.background = "rgba(255,255,255,0.07)";
      }}
    />
  );
}

const loginBtnStyle = {
  width: "100%",
  padding: "15px",
  background:
    "linear-gradient(135deg, #bf953f, #fcf6ba, #b38728, #fcf6ba, #aa771c)",
  border: "none",
  borderRadius: 15,
  fontWeight: 600,
  color: "#121417",
  cursor: "pointer",
  transition: "0.3s",
  marginTop: 10,
  fontSize: "1rem",
  fontFamily: "Inter, system-ui, sans-serif",
};

function LoginForm({ onSuccess }) {
  const {
    register,
    handleSubmit,
    formState: { errors },
  } = useForm();
  const mutation = useMutation({
    mutationFn: (data) => authApi.login(data),
    onSuccess: (res) => onSuccess(res.data.data),
    onError: (err) =>
      toast.error(err.response?.data?.message || "Invalid email or password"),
  });
  return (
    <form onSubmit={handleSubmit((d) => mutation.mutate(d))}>
      <Field label="Email" error={errors.email?.message}>
        <Input
          reg={register("email", { required: "Email is required" })}
          type="email"
          placeholder="admin@linguacore.com"
          error={errors.email}
        />
      </Field>
      <Field label="Password" error={errors.password?.message}>
        <Input
          reg={register("password", { required: "Password is required" })}
          type="password"
          placeholder="••••••••"
          error={errors.password}
        />
      </Field>
      <button
        type="submit"
        disabled={mutation.isPending}
        style={{ ...loginBtnStyle, opacity: mutation.isPending ? 0.6 : 1 }}
        onMouseEnter={(e) => {
          if (!mutation.isPending) e.target.style.transform = "scale(1.02)";
        }}
        onMouseLeave={(e) => {
          e.target.style.transform = "scale(1)";
        }}
      >
        {mutation.isPending ? "Signing in…" : "Sign In"}
      </button>
    </form>
  );
}

function SetupForm({ onSuccess }) {
  const {
    register,
    handleSubmit,
    watch,
    formState: { errors },
  } = useForm();
  const [branches, setBranches] = useState([]);
  const [roles, setRoles] = useState([]);

  useEffect(() => {
    lookupsApi
      .getBranches()
      .then((r) => setBranches(r.data.data || []))
      .catch(() => {});
    lookupsApi
      .getRoles()
      .then((r) => setRoles(r.data.data || []))
      .catch(() => {});
  }, []);

  const mutation = useMutation({
    mutationFn: (data) => authApi.register(data),
    onSuccess: (res) => onSuccess(res.data.data),
    onError: (err) =>
      toast.error(err.response?.data?.message || "Setup failed"),
  });

  const onSubmit = (data) => {
    mutation.mutate({
      firstName: data.firstName,
      secondName: data.secondName || null,
      lastName: data.lastName,
      nationalId: data.nationalId || null,
      age: data.age || null,
      gender: data.gender || null,
      phone: data.phone || null,
      whatsappNumber: data.whatsappNumber || null,
      address: data.address || null,
      email: data.email,
      password: data.password,
      branchId: data.branchId,
      roleId: data.roleId,
    });
  };

  return (
    <form onSubmit={handleSubmit(onSubmit)}>
      <div
        style={{
          background: "rgba(212,163,115,0.15)",
          border: "1px solid rgba(212,163,115,0.35)",
          borderRadius: 12,
          padding: "10px 14px",
          fontSize: 13,
          color: "#d4a373",
          marginBottom: "1.2rem",
        }}
      >
        👋 No users found. Create your first <strong>Super Admin</strong> to get
        started.
      </div>

      <div
        style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr", gap: 10 }}
      >
        <Field label="First Name *" error={errors.firstName?.message}>
          <Input
            reg={register("firstName", { required: "Required" })}
            placeholder="Ahmed"
            error={errors.firstName}
          />
        </Field>
        <Field label="Middle Name">
          <Input reg={register("secondName")} placeholder="Ali" />
        </Field>
        <Field label="Last Name *" error={errors.lastName?.message}>
          <Input
            reg={register("lastName", { required: "Required" })}
            placeholder="Mohamed"
            error={errors.lastName}
          />
        </Field>
      </div>

      <Field label="Email *" error={errors.email?.message}>
        <Input
          reg={register("email", { required: "Email is required" })}
          type="email"
          placeholder="admin@linguacore.com"
          error={errors.email}
        />
      </Field>

      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 10 }}>
        <Field label="Phone">
          <Input reg={register("phone")} placeholder="+20 1xx xxx xxxx" />
        </Field>
        <Field label="WhatsApp">
          <Input
            reg={register("whatsappNumber")}
            placeholder="+20 1xx xxx xxxx"
          />
        </Field>
      </div>

      <Field label="Address">
        <Input reg={register("address")} placeholder="Street, City, Country" />
      </Field>

      <div
        style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr", gap: 10 }}
      >
        <Field label="National ID">
          <Input reg={register("nationalId")} placeholder="12345…" />
        </Field>
        <Field label="Age">
          <Input
            reg={register("age", { valueAsNumber: true })}
            type="number"
            placeholder="25"
          />
        </Field>
        <Field label="Gender">
          <select {...register("gender")} style={selectBase}>
            <option value="" style={{ background: "#1e2126", color: "#fff" }}>
              — Select —
            </option>
            <option
              value="MALE"
              style={{ background: "#1e2126", color: "#fff" }}
            >
              Male
            </option>
            <option
              value="FEMALE"
              style={{ background: "#1e2126", color: "#fff" }}
            >
              Female
            </option>
          </select>
        </Field>
      </div>

      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 10 }}>
        <Field label="Password *" error={errors.password?.message}>
          <Input
            reg={register("password", {
              required: "Password required",
              minLength: { value: 8, message: "Min 8 characters" },
            })}
            type="password"
            placeholder="Min 8 characters"
            error={errors.password}
          />
        </Field>
        <Field label="Confirm Password *" error={errors.confirm?.message}>
          <Input
            reg={register("confirm", {
              required: "Please confirm",
              validate: (v) =>
                v === watch("password") || "Passwords do not match",
            })}
            type="password"
            placeholder="Repeat password"
            error={errors.confirm}
          />
        </Field>
      </div>

      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 10 }}>
        {branches.length > 0 && (
          <Field label="Branch *" error={errors.branchId?.message}>
            <select
              {...register("branchId", { required: "Select a branch" })}
              style={selectBase}
            >
              <option value="" style={{ background: "#1e2126", color: "#fff" }}>
                — Select branch —
              </option>
              {branches.map((b) => (
                <option
                  key={b.id}
                  value={b.id}
                  style={{ background: "#1e2126", color: "#fff" }}
                >
                  {b.name}
                </option>
              ))}
            </select>
          </Field>
        )}
        {roles.length > 0 && (
          <Field label="Role *" error={errors.roleId?.message}>
            <select
              {...register("roleId", { required: "Select a role" })}
              style={selectBase}
            >
              <option value="" style={{ background: "#1e2126", color: "#fff" }}>
                — Select role —
              </option>
              {roles.map((r) => (
                <option
                  key={r.id}
                  value={r.id}
                  style={{ background: "#1e2126", color: "#fff" }}
                >
                  {r.name}
                </option>
              ))}
            </select>
          </Field>
        )}
      </div>

      <button
        type="submit"
        disabled={mutation.isPending}
        style={{ ...loginBtnStyle, opacity: mutation.isPending ? 0.6 : 1 }}
        onMouseEnter={(e) => {
          if (!mutation.isPending) e.target.style.transform = "scale(1.02)";
        }}
        onMouseLeave={(e) => {
          e.target.style.transform = "scale(1)";
        }}
      >
        {mutation.isPending ? "Creating account…" : "Create Admin Account"}
      </button>
    </form>
  );
}

export default function Login() {
  const { setAuth } = useAuthStore();
  const navigate = useNavigate();
  const [lampOn, setLampOn] = useState(false);

  const { data, isLoading } = useQuery({
    queryKey: ["has-users"],
    queryFn: () => authApi.hasUsers(),
    retry: false,
  });

  const hasUsers = data?.data?.hasUsers;

  function handleSuccess(authData) {
    setAuth(authData.token, authData);
    toast.success(`Welcome, ${authData.name}!`);
    navigate("/");
  }

  if (isLoading) {
    return (
      <div
        style={{
          minHeight: "100vh",
          background: "#121417",
          display: "grid",
          placeItems: "center",
        }}
      >
        <div
          style={{
            color: "#fff",
            fontSize: 18,
            opacity: 0.4,
            fontFamily: "Inter, system-ui, sans-serif",
          }}
        >
          Loading…
        </div>
      </div>
    );
  }

  return (
    <>
      <style>{`
        @keyframes floatHint {
          0%, 100% { transform: translateY(0px); }
          50%       { transform: translateY(8px); }
        }
      `}</style>

      <div
        style={{
          minHeight: "100vh",
          display: "grid",
          placeItems: "center",
          background: lampOn ? "#1c1f24" : "#121417",
          transition: "background 0.5s cubic-bezier(0.4,0,0.2,1)",
          position: "relative",
          overflow: "hidden",
          fontFamily: "Inter, system-ui, sans-serif",
          padding: "24px 16px",
          boxSizing: "border-box",
        }}
      >
        {/* radial glow */}
        <div
          style={{
            position: "absolute",
            inset: 0,
            pointerEvents: "none",
            background:
              "radial-gradient(circle at 50% 40%, rgba(255,214,110,0.3), transparent 70%)",
            opacity: lampOn ? 1 : 0,
            transition: "opacity 0.5s cubic-bezier(0.4,0,0.2,1)",
          }}
        />

        <div
          style={{
            display: "flex",
            flexDirection: "column",
            alignItems: "center",
            gap: "2rem",
            zIndex: 1,
            width: "100%",
            maxWidth: 1100,
          }}
        >
          {/* ── Logo stack: side by side ── */}
          <div
            style={{
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              gap: "2rem",
            }}
          >
            {/* Centerlogo — white bg killed via multiply blend, black parts become invisible on dark bg */}
            <img
              src={Centerlogo}
              alt="Berliner Mauer"
              style={{
                height: 270,
                width: "auto",
                objectFit: "contain",
                mixBlendMode: "screen", // black pixels → transparent on dark bg
                opacity: lampOn ? 0.85 : 0.35,
                filter: lampOn
                  ? "drop-shadow(0 0 10px rgba(255,214,110,0.3))"
                  : "none",
                transition: "opacity 0.5s ease, filter 0.5s ease",
              }}
            />

            {/* Divider */}
            <div
              style={{
                width: 1,
                height: 200,
                background: "rgba(255,255,255,0.15)",
                flexShrink: 0,
              }}
            />

            {/* Main Novexus logo */}
            <img
              src={logo}
              alt="Novexus Solution"
              style={{
                height: 270,
                width: "auto",
                objectFit: "contain",
                filter: lampOn
                  ? "drop-shadow(0 0 14px rgba(255,214,110,0.45))"
                  : "brightness(0) invert(1)",
                opacity: lampOn ? 1 : 0.45,
                transition: "filter 0.5s ease, opacity 0.5s ease",
              }}
            />
          </div>

          {/* lamp + card row */}
          <div
            style={{
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              gap: "8vmin",
              flexWrap: "wrap",
              width: "100%",
            }}
          >
            <Lamp isOn={lampOn} onToggle={() => setLampOn((v) => !v)} />

            <div style={{ position: "relative", width: 420, minHeight: 200 }}>
              {/* ── Pull-cord hint (lamp OFF) ── */}
              <div
                style={{
                  position: "absolute",
                  inset: 0,
                  display: "flex",
                  flexDirection: "column",
                  alignItems: "center",
                  justifyContent: "center",
                  gap: 16,
                  opacity: lampOn ? 0 : 1,
                  transform: lampOn ? "translateY(10px)" : "translateY(0)",
                  transition: "opacity 0.45s ease, transform 0.45s ease",
                  pointerEvents: "none",
                  animation: lampOn
                    ? "none"
                    : "floatHint 3s ease-in-out infinite",
                }}
              >
                <svg
                  width="26"
                  height="42"
                  viewBox="0 0 26 42"
                  fill="none"
                  xmlns="http://www.w3.org/2000/svg"
                  style={{ opacity: 0.6 }}
                >
                  <line
                    x1="13"
                    y1="0"
                    x2="13"
                    y2="24"
                    stroke="#d4a373"
                    strokeWidth="1.5"
                    strokeDasharray="3 3"
                  />
                  <circle
                    cx="13"
                    cy="33"
                    r="7"
                    fill="rgba(212,163,115,0.12)"
                    stroke="#d4a373"
                    strokeWidth="1.5"
                  />
                  <polyline
                    points="9,30 13,34 17,30"
                    fill="none"
                    stroke="#d4a373"
                    strokeWidth="1.5"
                    strokeLinecap="round"
                    strokeLinejoin="round"
                  />
                </svg>

                <span
                  style={{
                    fontSize: "0.7rem",
                    color: "#d4a373",
                    letterSpacing: "0.14em",
                    textTransform: "uppercase",
                    fontWeight: 600,
                    opacity: 0.85,
                  }}
                >
                  Pull the cord
                </span>

                <span
                  style={{
                    fontSize: "0.78rem",
                    color: "rgba(255,255,255,0.3)",
                    letterSpacing: "0.02em",
                    textAlign: "center",
                    lineHeight: 1.7,
                    maxWidth: 200,
                  }}
                >
                  Drag the bead downward to turn on the lamp and reveal the
                  login panel
                </span>
              </div>

              {/* ── Login / Setup card (lamp ON) ── */}
              <div
                style={{
                  background: "rgba(255,255,255,0.05)",
                  backdropFilter: "blur(20px)",
                  WebkitBackdropFilter: "blur(20px)",
                  padding: "2.5rem",
                  borderRadius: 30,
                  border: "1px solid rgba(255,255,255,0.1)",
                  boxShadow: "0 20px 40px rgba(0,0,0,0.3)",
                  opacity: lampOn ? 1 : 0,
                  transform: lampOn ? "translateY(0)" : "translateY(30px)",
                  pointerEvents: lampOn ? "all" : "none",
                  transition: "all 0.7s cubic-bezier(0.175,0.885,0.32,1.275)",
                }}
              >
                <h2
                  style={{
                    color: "#fff",
                    margin: "0 0 1.5rem 0",
                    fontWeight: 500,
                    textAlign: "center",
                    fontSize: "1.2rem",
                    lineHeight: 1.4,
                  }}
                >
                  Languages Center Management System
                </h2>

                {hasUsers ? (
                  <LoginForm onSuccess={handleSuccess} />
                ) : (
                  <SetupForm onSuccess={handleSuccess} />
                )}
              </div>
            </div>
          </div>
        </div>
      </div>
    </>
  );
}
