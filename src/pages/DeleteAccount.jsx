import LegalPage from "@/components/legal/LegalPage";
import { Trash2 } from "lucide-react";

const CONTACT_EMAIL = "weatbriefi@gmail.com";

export default function DeleteAccount() {
  return (
    <LegalPage title="מחיקת חשבון">
      <p className="text-muted-foreground leading-relaxed">
        אם תרצו למחוק את החשבון שלכם, כתבו לנו מהאימייל שאיתו נרשמתם לבריפי.
      </p>

      <p className="leading-relaxed">
        מחיקת חשבון תמחק את הפרויקטים, הבריפים והמידע האישי שלכם מהמערכת, בכפוף למידע שאנחנו מחויבים לשמור לפי דין או לצרכים חשבונאיים, אבטחתיים או תפעוליים.
      </p>

      <div className="bg-white rounded-2xl border border-border/60 p-5 flex flex-col items-center gap-4 text-center">
        <div className="w-12 h-12 rounded-2xl flex items-center justify-center" style={{ background: "#EF444415" }}>
          <Trash2 className="w-5 h-5" style={{ color: "#EF4444" }} />
        </div>
        <p className="font-bold text-foreground">{CONTACT_EMAIL}</p>
        <a
          href={`mailto:${CONTACT_EMAIL}?subject=בקשת%20מחיקת%20חשבון%20בבריפי`}
          className="w-full max-w-xs h-11 px-6 rounded-2xl text-sm font-bold text-white flex items-center justify-center gap-2 transition-all"
          style={{ background: "#EF4444" }}
        >
          <Trash2 className="w-4 h-4" />
          בקשת מחיקת חשבון
        </a>
      </div>

      <div className="bg-muted/40 rounded-2xl p-4">
        <p className="text-sm text-muted-foreground leading-relaxed">
          כדי שנוכל לזהות את החשבון, שלחו את הבקשה מהאימייל שאיתו נרשמתם.
        </p>
      </div>
    </LegalPage>
  );
}