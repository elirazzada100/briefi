import LegalPage from "@/components/legal/LegalPage";
import { UserCheck } from "lucide-react";

const CONTACT_EMAIL = "weatbriefi@gmail.com";

const requestTypes = [
  "בקשה לעיין במידע שלי",
  "בקשה לתקן מידע",
  "בקשה למחוק מידע",
  "בקשה אחרת",
];

export default function PrivacyRequest() {
  return (
    <LegalPage title="בקשת פרטיות">
      <p className="text-muted-foreground font-medium">
        עיון, תיקון או מחיקה של מידע
      </p>

      <p className="leading-relaxed">
        אם תרצו לעיין במידע שלכם, לתקן מידע, למחוק מידע או לשלוח בקשה אחרת בנושא פרטיות, כתבו לנו לכתובת:
      </p>

      <p className="font-bold text-foreground">{CONTACT_EMAIL}</p>

      <div className="bg-white rounded-2xl border border-border/60 p-4 space-y-2">
        <p className="text-xs font-bold text-muted-foreground uppercase tracking-wide">סוגי בקשות</p>
        {requestTypes.map((type) => (
          <div key={type} className="flex items-center gap-2 text-sm text-foreground py-1.5 border-b border-muted last:border-0">
            <div className="w-1.5 h-1.5 rounded-full bg-primary flex-shrink-0" />
            {type}
          </div>
        ))}
      </div>

      <div className="flex flex-col items-center gap-3">
        <a
          href={`mailto:${CONTACT_EMAIL}?subject=בקשת%20פרטיות%20בבריפי`}
          className="briefi-btn-primary w-full max-w-sm"
        >
          <UserCheck className="w-4 h-4" />
          שליחת בקשת פרטיות
        </a>
      </div>

      <div className="bg-muted/40 rounded-2xl p-4">
        <p className="text-sm text-muted-foreground leading-relaxed">
          כדי שנוכל לטפל בבקשה מהר יותר, שלחו אותה מהאימייל שאיתו נרשמתם לבריפי.
        </p>
      </div>
    </LegalPage>
  );
}