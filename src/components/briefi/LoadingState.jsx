import BriefiLogo from "./BriefiLogo";

export default function LoadingState({ message = "מנתחים את העסק..." }) {
  return (
    <div className="flex flex-col items-center justify-center min-h-[300px] gap-6 animate-fade-in">
      <div className="relative">
        <div className="w-16 h-16 rounded-full border-4 border-primary/20 border-t-primary animate-spin" />
        <div className="absolute inset-0 flex items-center justify-center">
          <BriefiLogo size={32} />
        </div>
      </div>
      <p className="text-briefi-secondary font-medium text-base">{message}</p>
    </div>
  );
}