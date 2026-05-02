import { useState, useEffect, useRef } from "react";
import { base44 } from "@/api/base44Client";
import { ArrowRight, Upload, Check, Palette } from "lucide-react";
import { useNavigate } from "react-router-dom";
import LoadingState from "@/components/briefi/LoadingState";

const BRAND_COLORS = [
  "#6C35FF", "#1E8BFF", "#23C98B", "#FF7A2F", "#F2519D", "#11B7C7",
  "#F8B900", "#0B1B36", "#5F6675",
];

export default function UserProfile() {
  const navigate = useNavigate();
  const fileRef = useRef(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);
  const [uploading, setUploading] = useState(false);

  const [form, setForm] = useState({
    display_name: "",
    business_name: "",
    logo_url: "",
    brand_color: "#6C35FF",
    email: "",
    phone: "",
    website: "",
  });

  const invokeSecureBriefMutations = async (payload) => {
    const response = await base44.functions.invoke("secureBriefMutations", payload);
    if (response.data?.error) {
      throw new Error(response.data.error);
    }
    return response.data;
  };

  useEffect(() => {
    const load = async () => {
      const data = await invokeSecureBriefMutations({ action: "getOwnedUserBranding" });
      const existing = data?.branding;
      if (existing) {
        setForm({
          display_name: existing.display_name || "",
          business_name: existing.business_name || "",
          logo_url: existing.logo_url || "",
          brand_color: existing.brand_color || "#6C35FF",
          email: existing.email || "",
          phone: existing.phone || "",
          website: existing.website || "",
        });
      }
      setLoading(false);
    };
    load();
  }, []);

  const handleLogoUpload = async (e) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setUploading(true);
    const { file_url } = await base44.integrations.Core.UploadFile({ file });
    setForm(prev => ({ ...prev, logo_url: file_url }));
    setUploading(false);
  };

  const handleSave = async () => {
    setSaving(true);
    await invokeSecureBriefMutations({
      action: "updateUserBranding",
      branding: form,
    });
    setSaving(false);
    setSaved(true);
    setTimeout(() => setSaved(false), 2000);
  };

  const update = (field, value) => setForm(prev => ({ ...prev, [field]: value }));

  if (loading) return <div className="min-h-screen bg-briefi-bg flex items-center justify-center" dir="rtl"><LoadingState /></div>;

  return (
    <div className="min-h-screen bg-briefi-bg" dir="rtl">
      <div className="bg-white border-b border-border px-5 pt-safe pt-4 pb-3">
        <div className="max-w-lg mx-auto flex items-center gap-3">
          <button onClick={() => navigate("/")} className="w-9 h-9 rounded-xl bg-muted flex items-center justify-center">
            <ArrowRight className="w-5 h-5 text-briefi-secondary" />
          </button>
          <div>
            <h1 className="text-xl font-black text-briefi-navy">המיתוג שלי</h1>
            <p className="text-xs text-briefi-muted">פרטים שיופיעו במסמכי PDF</p>
          </div>
        </div>
      </div>

      <div className="max-w-lg mx-auto px-5 py-5 space-y-5">

        {/* Logo */}
        <div className="bg-white rounded-2xl border border-border p-5 space-y-4">
          <h3 className="font-bold text-briefi-navy text-sm">לוגו למסמכים</h3>
          <p className="text-xs text-briefi-muted -mt-2">העלו לוגו שיופיע בראש המסמך, כמו נייר מכתבים.</p>

          <div className="flex items-center gap-4">
            {form.logo_url ? (
              <img src={form.logo_url} alt="לוגו" className="w-20 h-20 object-contain rounded-xl border border-border bg-muted/20" />
            ) : (
              <div className="w-20 h-20 rounded-xl border-2 border-dashed border-border bg-muted/20 flex items-center justify-center">
                <Upload className="w-6 h-6 text-briefi-muted" />
              </div>
            )}
            <div className="flex-1 space-y-2">
              <button
                onClick={() => fileRef.current?.click()}
                disabled={uploading}
                className="w-full h-10 rounded-xl border border-border bg-white text-sm font-semibold text-briefi-navy hover:bg-muted/30 transition-colors disabled:opacity-50"
              >
                {uploading ? "מעלה..." : form.logo_url ? "החלפת לוגו" : "העלאת לוגו"}
              </button>
              {form.logo_url && (
                <button
                  onClick={() => update("logo_url", "")}
                  className="w-full text-xs text-red-400 hover:text-red-500 font-medium"
                >
                  הסרת לוגו
                </button>
              )}
            </div>
          </div>
          <input ref={fileRef} type="file" accept="image/*" onChange={handleLogoUpload} className="hidden" />
        </div>

        {/* Details */}
        <div className="bg-white rounded-2xl border border-border p-5 space-y-4">
          <h3 className="font-bold text-briefi-navy text-sm">פרטים</h3>

          {[
            { field: "display_name", label: "שם שיופיע במסמכים", placeholder: "כמו: יובל כהן" },
            { field: "business_name", label: "שם העסק / הסוכנות", placeholder: "כמו: Studio Social" },
          ].map(({ field, label, placeholder }) => (
            <div key={field} className="space-y-1.5">
              <label className="text-xs font-bold text-briefi-muted">{label}</label>
              <input
                type="text"
                value={form[field]}
                onChange={e => update(field, e.target.value)}
                placeholder={placeholder}
                className="w-full h-11 px-4 rounded-xl border border-border bg-muted/20 text-sm text-briefi-navy font-medium focus:outline-none focus:ring-2 focus:ring-primary/30"
              />
            </div>
          ))}
        </div>

        {/* Brand Color */}
        <div className="bg-white rounded-2xl border border-border p-5 space-y-3">
          <div className="flex items-center gap-2">
            <Palette className="w-4 h-4 text-briefi-muted" />
            <h3 className="font-bold text-briefi-navy text-sm">צבע מותג</h3>
          </div>
          <div className="flex flex-wrap gap-2">
            {BRAND_COLORS.map(color => (
              <button
                key={color}
                onClick={() => update("brand_color", color)}
                className="w-9 h-9 rounded-xl border-2 transition-all"
                style={{
                  background: color,
                  borderColor: form.brand_color === color ? "#0B1B36" : "transparent",
                  transform: form.brand_color === color ? "scale(1.1)" : "scale(1)",
                }}
              />
            ))}
            <div className="flex items-center gap-1">
              <input
                type="color"
                value={form.brand_color}
                onChange={e => update("brand_color", e.target.value)}
                className="w-9 h-9 rounded-xl cursor-pointer border border-border"
              />
            </div>
          </div>
          <div
            className="h-1 rounded-full mt-1"
            style={{ background: form.brand_color }}
          />
        </div>

        {/* Contact */}
        <div className="bg-white rounded-2xl border border-border p-5 space-y-4">
          <h3 className="font-bold text-briefi-navy text-sm">פרטי קשר (אופציונלי)</h3>
          {[
            { field: "email", label: "אימייל", placeholder: "you@studio.com" },
            { field: "phone", label: "טלפון", placeholder: "050-0000000" },
            { field: "website", label: "אתר", placeholder: "www.yourstudio.com" },
          ].map(({ field, label, placeholder }) => (
            <div key={field} className="space-y-1.5">
              <label className="text-xs font-bold text-briefi-muted">{label}</label>
              <input
                type="text"
                value={form[field]}
                onChange={e => update(field, e.target.value)}
                placeholder={placeholder}
                className="w-full h-11 px-4 rounded-xl border border-border bg-muted/20 text-sm text-briefi-navy font-medium focus:outline-none focus:ring-2 focus:ring-primary/30 placeholder:text-briefi-muted"
              />
            </div>
          ))}
        </div>

        {/* Save */}
        <button
          onClick={handleSave}
          disabled={saving}
          className={`w-full h-14 rounded-2xl font-black text-base text-white flex items-center justify-center gap-2 transition-all active:scale-95 ${saved ? "bg-green-500" : ""}`}
          style={!saved ? { background: "linear-gradient(135deg, #1E8BFF 0%, #8B3DFF 100%)" } : {}}
        >
          {saved ? <><Check className="w-5 h-5" /> נשמר!</> : saving ? "שומר..." : "שמור מיתוג"}
        </button>
      </div>
    </div>
  );
}
