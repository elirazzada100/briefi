export default function ErrorState({ onRetry }) {
  return (
    <div className="flex flex-col items-center justify-center min-h-[250px] gap-4 text-center px-6">
      <div className="text-4xl">⚠️</div>
      <h3 className="text-briefi-navy font-bold text-lg">משהו נתקע בדרך</h3>
      <p className="text-briefi-secondary text-sm">נסו שוב בעוד רגע.</p>
      {onRetry && (
        <button
          onClick={onRetry}
          className="mt-2 px-6 py-3 bg-primary text-white rounded-xl font-bold text-sm"
        >
          נסה שוב
        </button>
      )}
    </div>
  );
}