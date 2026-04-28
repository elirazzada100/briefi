import LegalPage, { LegalSection } from "@/components/legal/LegalPage";

export default function AiUsePage() {
  return (
    <LegalPage title="שימוש ב־AI">
      <p className="leading-relaxed">
        בריפי משתמשת בכלי AI כדי לייצר רעיונות, קונספטים, בריפים וטקסטים.
      </p>

      <LegalSection title="על התוצרים">
        <p>
          התוצרים הם הצעות בלבד. בריפי יכול לטעות לפעמים, ולכן לפני פרסום, שליחה ללקוח או שימוש מסחרי, באחריות המשתמש לבדוק את התוכן, לערוך אותו ולוודא שהוא מתאים לעסק, לקהל, לחוק ולזכויות צדדים שלישיים.
        </p>
      </LegalSection>

      <LegalSection title="AI ושיקול דעת אנושי">
        <p>
          בריפי לא מחליפה שיקול דעת אנושי. היא באה לעזור, לפתוח כיוונים, לחסוך זמן, ולתת התחלה טובה יותר לעבודה הקריאייטיבית.
        </p>
      </LegalSection>

      <div className="bg-primary/5 border border-primary/15 rounded-2xl p-4">
        <p className="text-sm leading-relaxed text-foreground">
          השתמשו בבריפי ככלי עזר, ואז הפעילו שיקול דעת לפני שמוציאים משהו החוצה.
        </p>
      </div>
    </LegalPage>
  );
}