import { useMemo, useRef, useState } from "react";
import "./App.css";

type Tab = "home" | "book" | "contact";

type FormState = {
  firstName: string;
  lastName: string;
  email: string;
  instagram: string; // 필수
  phone: string;
  message: string;
  is18: boolean;
  agreeDeposit: boolean;
  budget: string;
  date: string; // yyyy-mm-dd
  referenceFiles: File[];
};

const FORM_ENDPOINT = "https://formspree.io/f/xbdadaez";

// ✅ 여기만 네 thanks 페이지 경로로 맞추면 됨
const THANKS_URL = "/thanks.html";

const INITIAL_STATE: FormState = {
  firstName: "",
  lastName: "",
  email: "",
  instagram: "",
  phone: "",
  message: "",
  is18: false,
  agreeDeposit: false,
  budget: "",
  date: "",
  referenceFiles: [],
};

function isValidEmail(email: string) {
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email.trim());
}

function isValidPhone(phone: string) {
  const digits = phone.replace(/\D/g, "");
  return digits.length >= 7;
}

export default function App() {
  const [tab, setTab] = useState<Tab>("home");
  const [form, setForm] = useState<FormState>(INITIAL_STATE);
  const [touched, setTouched] = useState<Record<string, boolean>>({});
  const [status, setStatus] = useState<"idle" | "submitting" | "success" | "error">("idle");
  const [statusMsg, setStatusMsg] = useState("");

  const fileInputRef = useRef<HTMLInputElement | null>(null);

  const previews = useMemo(() => {
    return form.referenceFiles.map((file) => ({
      name: file.name,
      url: URL.createObjectURL(file),
      size: file.size,
      type: file.type,
    }));
  }, [form.referenceFiles]);

  const errors = useMemo(() => {
    const e: Record<string, string> = {};

    if (!form.firstName.trim()) e.firstName = "First name is required.";
    if (!form.lastName.trim()) e.lastName = "Last name is required.";

    if (!form.email.trim()) e.email = "Email is required.";
    else if (!isValidEmail(form.email)) e.email = "Please enter a valid email.";

    if (!form.instagram.trim()) e.instagram = "Instagram ID is required.";

    if (!form.phone.trim()) e.phone = "Phone is required.";
    else if (!isValidPhone(form.phone)) e.phone = "Please enter a valid phone number.";

    if (!form.message.trim()) e.message = "Message is required.";
    if (!form.date.trim()) e.date = "Please select a date.";

    if (!form.is18) e.is18 = "You must confirm you are 18+.";
    if (!form.agreeDeposit) e.agreeDeposit = "You must agree to the deposit policy.";

    return e;
  }, [form]);

  const hasErrors = Object.keys(errors).length > 0;

  function markTouched(name: keyof FormState) {
    setTouched((prev) => ({ ...prev, [name]: true }));
  }

  function update<K extends keyof FormState>(key: K, value: FormState[K]) {
    setForm((prev) => ({ ...prev, [key]: value }));
    if (status !== "idle") {
      setStatus("idle");
      setStatusMsg("");
    }
  }

  function onAddFiles(files: FileList | null) {
    if (!files) return;

    const incoming = Array.from(files);
    const filtered = incoming.filter((f) => f.type.startsWith("image/") && f.size <= 10 * 1024 * 1024);
    const combined = [...form.referenceFiles, ...filtered].slice(0, 6);

    update("referenceFiles", combined);

    if (fileInputRef.current) fileInputRef.current.value = "";
  }

  function removeFile(index: number) {
    update(
      "referenceFiles",
      form.referenceFiles.filter((_, i) => i !== index)
    );
  }

  function resetAll() {
    setForm(INITIAL_STATE);
    setTouched({});
    setStatus("idle");
    setStatusMsg("");
    if (fileInputRef.current) fileInputRef.current.value = "";
  }

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();

    setTouched({
      firstName: true,
      lastName: true,
      email: true,
      instagram: true,
      phone: true,
      message: true,
      is18: true,
      agreeDeposit: true,
      date: true,
    });

    if (Object.keys(errors).length > 0) return;

    setStatus("submitting");
    setStatusMsg("");

    try {
      const fd = new FormData();

      // ✅ honeypot (스팸 방지): 빈 값 유지
      fd.append("_gotcha", "");

      fd.append("firstName", form.firstName);
      fd.append("lastName", form.lastName);
      fd.append("email", form.email);
      fd.append("instagram", form.instagram);
      fd.append("phone", form.phone);
      fd.append("date", form.date);
      fd.append("budget", form.budget || "");
      fd.append("message", form.message);

      fd.append("is18Confirmed", form.is18 ? "yes" : "no");
      fd.append("depositPolicyAgreed", form.agreeDeposit ? "yes" : "no");

      form.referenceFiles.forEach((file) => {
        fd.append("referenceImages", file, file.name);
      });

      fd.append("subject", `Tattoo Appointment Request - ${form.firstName} ${form.lastName}`);

      const res = await fetch(FORM_ENDPOINT, {
        method: "POST",
        body: fd,
        headers: { Accept: "application/json" },
      });

      if (!res.ok) {
        let msg = "Submission failed. Please try again.";
        try {
          const data = await res.json();
          if (data?.errors?.length) msg = data.errors.map((x: any) => x.message).join(" ");
        } catch {}
        setStatus("error");
        setStatusMsg(msg);
        return;
      }

      // ✅ 성공 처리: 메시지/리셋은 그대로 두고, 바로 리다이렉트
      setStatus("success");
      setStatusMsg("thank you, your request was submitted. We will get back to you through your email or dm.");
      resetAll();

      // ✅ 핵심: fetch submit에서는 Formspree redirect가 자동으로 안 되므로, 직접 이동
      window.location.assign(THANKS_URL);
    } catch {
      setStatus("error");
      setStatusMsg("Network error. Please check your connection and try again.");
    }
  }

  const homeGallery = useMemo(() => {
    return Array.from({ length: 26 }, (_, i) => `/works/${i + 1}.JPG`);
  }, []);

  return (
    <div className="app">
      <header className="topbar">
        <div className="brand">
          <img className="brandAvatar" src="/works/0.jpg" alt="MATT Tattoo profile" />
          <div className="brandText">
            <div className="brandTitle">MATT Tattoo</div>
            <div className="brandSub">@matt_tattooist · Booking</div>
          </div>
        </div>

        <nav className="tabs" aria-label="Primary">
          <button className={tab === "home" ? "tab active" : "tab"} onClick={() => setTab("home")}>
            Home
          </button>
          <button className={tab === "book" ? "tab active" : "tab"} onClick={() => setTab("book")}>
            Book an appointment
          </button>
          <button className={tab === "contact" ? "tab active" : "tab"} onClick={() => setTab("contact")}>
            Contact me
          </button>
        </nav>
      </header>

      <main className="container">
        {tab === "home" && (
          <>
            <section className="card">
              <h1 className="h1">Welcome</h1>
              <p className="lead">
              I’m a tattoo artist with over <strong>10 years of professional experience</strong> from Korea. 
              I specialize in highly detailed and delicate work, but I’m also comfortable working across all styles and genres. 
              Every tattoo is created through in-depth consultation so you receive a design that truly fits you. Because a tattoo stays with you for life, it’s important to work with an <strong>experienced artist</strong>> you can trust. 
              You’re in good hands with me.
               
              </p>

              <div className="grid2">
                <div className="info">
                  <h3 className="h3">How booking works</h3>
                  <ol className="list">
                    <li>Submit your request with details + preferred date OR DMing @matt_tattooist is fine.</li>
                    <li>I’ll review and reply with availability and next steps.</li>
                    <li>We’ll confirm design + final pricing during consultation.</li>
                    <li>After deposit is paid, we’ll schedule your appointment.</li>
                  </ol>
                </div>

                <div className="info">
                  <h3 className="h3">Pricing note</h3>
                  <p className="p">
                    My designs are detailed and sophisticated. I have a <b>base price</b>, and we can discuss your budget.
                    <br />
                    <br />
                    Final pricing depends on the design, size, and placement. I’m happy to work with you to find a design
                    that fits your vision and budget.
                  </p>
                  <button className="primary" onClick={() => setTab("book")}>
                    Go to booking →
                  </button>
                </div>
              </div>
            </section>

            <section className="gallery" aria-label="Tattoo works gallery">
              {homeGallery.map((src) => (
                <div key={src} className="galleryItem">
                  <img src={src} alt="Tattoo work" loading="lazy" />
                </div>
              ))}
            </section>
          </>
        )}

        {tab === "book" && (
          <section className="card">
            <h1 className="h1">Book an appointment</h1>
            <p className="muted">Fields marked with * are required.</p>

            <form className="form" onSubmit={onSubmit} noValidate>
              {/* ✅ honeypot (사람에게는 안 보임) */}
              <input type="text" name="_gotcha" style={{ display: "none" }} tabIndex={-1} autoComplete="off" />

              <div className="row">
                <div className="field">
                  <label>
                    First Name <span className="req">*</span>
                  </label>
                  <input
                    value={form.firstName}
                    onChange={(e) => update("firstName", e.target.value)}
                    onBlur={() => markTouched("firstName")}
                    placeholder="First name"
                    autoComplete="given-name"
                  />
                  {touched.firstName && errors.firstName && <div className="error">{errors.firstName}</div>}
                </div>

                <div className="field">
                  <label>
                    Last Name <span className="req">*</span>
                  </label>
                  <input
                    value={form.lastName}
                    onChange={(e) => update("lastName", e.target.value)}
                    onBlur={() => markTouched("lastName")}
                    placeholder="Last name"
                    autoComplete="family-name"
                  />
                  {touched.lastName && errors.lastName && <div className="error">{errors.lastName}</div>}
                </div>
              </div>

              <div className="row">
                <div className="field">
                  <label>
                    Email <span className="req">*</span>
                  </label>
                  <input
                    value={form.email}
                    onChange={(e) => update("email", e.target.value)}
                    onBlur={() => markTouched("email")}
                    placeholder="you@example.com"
                    autoComplete="email"
                    inputMode="email"
                  />
                  {touched.email && errors.email && <div className="error">{errors.email}</div>}
                </div>

                <div className="field">
                  <label>
                    Instagram ID <span className="req">*</span>
                  </label>
                  <input
                    value={form.instagram}
                    onChange={(e) => update("instagram", e.target.value)}
                    onBlur={() => markTouched("instagram")}
                    placeholder="@yourhandle"
                    autoComplete="off"
                  />
                  {touched.instagram && errors.instagram && <div className="error">{errors.instagram}</div>}
                  <div className="hint">We’ll contact you via email or DM.</div>
                </div>
              </div>

              <div className="row">
                <div className="field">
                  <label>
                    Phone <span className="req">*</span>
                  </label>
                  <input
                    value={form.phone}
                    onChange={(e) => update("phone", e.target.value)}
                    onBlur={() => markTouched("phone")}
                    placeholder="+1 (___) ___-____"
                    autoComplete="tel"
                    inputMode="tel"
                  />
                  {touched.phone && errors.phone && <div className="error">{errors.phone}</div>}
                </div>

                <div className="field">
                  <label>
                    Preferred Date <span className="req">*</span>
                  </label>
                  <input
                    type="date"
                    value={form.date}
                    onChange={(e) => update("date", e.target.value)}
                    onBlur={() => markTouched("date")}
                  />
                  {touched.date && errors.date && <div className="error">{errors.date}</div>}
                  <div className="hint">Select a date for consultation/appointment request.</div>
                </div>
              </div>

              <div className="field">
                <label>Budget (optional)</label>
                <input
                  value={form.budget}
                  onChange={(e) => update("budget", e.target.value)}
                  placeholder='e.g., "$250–$350" or "not sure"'
                />
                <div className="hint">Base price applies; final pricing depends on design/size/placement.</div>
              </div>

              <div className="field">
                <label>
                  Message <span className="req">*</span>
                </label>
                <textarea
                  value={form.message}
                  onChange={(e) => update("message", e.target.value)}
                  onBlur={() => markTouched("message")}
                  placeholder={`design idea, size, placement information`}
                  rows={7}
                />
                {touched.message && errors.message && <div className="error">{errors.message}</div>}
              </div>

              <div className="field">
                <label>Reference images (optional)</label>
                <div className="upload">
                  <input
                    ref={fileInputRef}
                    type="file"
                    accept="image/*"
                    multiple
                    onChange={(e) => onAddFiles(e.target.files)}
                  />
                  <div className="hint">Up to 6 images. Max 10MB each.</div>
                </div>

                {previews.length > 0 && (
                  <div className="previews">
                    {previews.map((p, idx) => (
                      <div key={p.url} className="preview">
                        <img src={p.url} alt={p.name} />
                        <div className="previewMeta">
                          <div className="previewName" title={p.name}>
                            {p.name}
                          </div>
                          <button type="button" className="link" onClick={() => removeFile(idx)}>
                            Remove
                          </button>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>

              <div className="field checkboxRow">
                <label className="checkbox">
                  <input
                    type="checkbox"
                    checked={form.is18}
                    onChange={(e) => update("is18", e.target.checked)}
                    onBlur={() => markTouched("is18")}
                  />
                  I confirm that I am 18+ years old <span className="req">*</span>
                </label>
                {touched.is18 && errors.is18 && <div className="error">{errors.is18}</div>}
              </div>

              <div className="policy">
                <h3 className="h3">Deposit Policy</h3>
                <p className="p">
                  All appointments require a non-refundable deposit of <b>$150</b>. This deposit will be applied to the
                  total cost of your tattoo at your final appointment.
                </p>
                <p className="p">
                  Deposits are non-transferable. We require <b>48 hours’ notice</b> to make changes. A{" "}
                  <b>no-call/no-show</b> loses the deposit. Same-day reschedule also forfeits the deposit.
                </p>
              </div>

              <div className="field checkboxRow">
                <label className="checkbox">
                  <input
                    type="checkbox"
                    checked={form.agreeDeposit}
                    onChange={(e) => update("agreeDeposit", e.target.checked)}
                    onBlur={() => markTouched("agreeDeposit")}
                  />
                  I have read and agree to the Deposit Policy <span className="req">*</span>
                </label>
                {touched.agreeDeposit && errors.agreeDeposit && <div className="error">{errors.agreeDeposit}</div>}
              </div>

              <div className="actions">
                <button className="primary" type="submit" disabled={hasErrors || status === "submitting"}>
                  {status === "submitting" ? "Sending..." : "Send request"}
                </button>

                <button className="secondary" type="button" onClick={resetAll} disabled={status === "submitting"}>
                  Reset
                </button>
              </div>

              {status === "success" && <div className="success">{statusMsg}</div>}
              {status === "error" && <div className="errorBox">{statusMsg}</div>}
            </form>
          </section>
        )}

        {tab === "contact" && (
          <section className="card contactCard">
            <h1 className="h1">Contact me</h1>
            <p className="lead">
              Fastest: Instagram DM. For booking requests, please submit the form in <b>Book an appointment</b>.
            </p>

            <div className="grid2">
              <div className="info">
                <h3 className="h3">Instagram</h3>
                <p className="p">@matt_tattooist</p>
              </div>

              <div className="info">
                <h3 className="h3">Email</h3>
                <p className="p">copi23600@gmail.com</p>
              </div>
            </div>

            <button className="primary" onClick={() => setTab("book")}>
              Book now →
            </button>
          </section>
        )}
      </main>

      <footer className="footer">
        <div>© {new Date().getFullYear()} MATT Tattoo</div>
      </footer>
    </div>
  );
}
