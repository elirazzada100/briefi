import BriefiLogo from "./BriefiLogo";

export default function LoadingState({ message = "עוד רגע זה מוכן" }) {
  return (
    <div className="flex flex-col items-center justify-center min-h-[260px] gap-5 px-6 text-center animate-fade-in">
      <div className="relative">
        <div className="w-16 h-16 rounded-full border-4 border-primary/20 border-t-primary animate-spin" />
        <div className="absolute inset-0 flex items-center justify-center">
          <BriefiLogo size={32} />
        </div>
      </div>
      <p className="max-w-[220px] text-base font-medium leading-7 text-briefi-secondary">{message}</p>
    </div>
  );
}
