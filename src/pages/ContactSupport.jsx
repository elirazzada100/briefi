import LegalPage from "@/components/legal/LegalPage";
import { Mail } from "lucide-react";

const CONTACT_EMAIL = "weatbriefi@gmail.com";

export default function ContactSupport() {
  return (
    <LegalPage title="יצירת קשר ותמיכה">
      <p className="text-muted-foreground">
        צריכים עזרה? משהו לא עובד? רוצים למחוק חשבון או לשלוח בקשת פרטיות? כתבו לנו.
      </p>

      <p>
        כאן אפשר לפנות אלינו לגבי תמיכה טכנית, תקלות, שאלות על החשבון, בקשות פרטיות, מחיקת חשבון, או כל דבר אחר שקשור לבריפי.
      </p>

      <div className="bg-white rounded-2xl border border-border/60 p-5 flex flex-col items-center gap-4 text-center">
        <div className="w-12 h-12 rounded-2xl flex items-center justify-center" style={{ background: "#0EA5E915" }}>
          <Mail className="w-5 h-5" style={{ color: "#0EA5E9" }} />
        </div>
        <p className="font-bold text-foreground text-lg">{CONTACT_EMAIL}</p>
        <a
          href={`mailto:${CONTACT_EMAIL}?subject=פנייה%20מבריפי`}
          className="briefi-btn-primary w-full max-w-xs"
        >
          <Mail className="w-4 h-4" />
          שלחו לנו מייל
        </a>
        <p className="text-xs text-muted-foreground leading-relaxed">
          כרגע הפנייה נשלחת דרך המייל. לחצו על הכפתור כדי לפתוח הודעה מוכנה.
        </p>
      </div>

      <div className="bg-muted/40 rounded-2xl p-4">
        <p className="text-sm text-muted-foreground leading-relaxed">
          <strong className="text-foreground">טיפ:</strong> כדי שנוכל לעזור מהר יותר, כתבו לנו מה קרה, באיזה פרויקט זה קרה, ואם אפשר צרפו צילום מסך.
        </p>
      </div>
    </LegalPage>
  );
}