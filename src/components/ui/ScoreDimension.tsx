interface Props {
  icon: React.ReactNode;
  label: string;
  value: number;
  finalValue: number;
  sub?: string;
}

export function ScoreDimension({ icon, label, value, finalValue, sub }: Props) {
  const color = finalValue >= 75 ? 'text-green-400' : finalValue >= 40 ? 'text-yellow-400' : 'text-red-500';
  const barColor = finalValue >= 75 ? 'bg-green-400' : finalValue >= 40 ? 'bg-yellow-400' : 'bg-red-500';
  return (
    <div className="text-center">
      <div className={`flex justify-center mb-1 ${color}`}>{icon}</div>
      <div className="font-mono text-[10px] text-gray-500 mb-1">{label}</div>
      <div className={`font-bold text-2xl font-mono ${color}`}>{value}</div>
      <div className="h-1 bg-gray-800 rounded mt-2 mx-auto w-full">
        <div
          className={`h-1 rounded ${barColor}`}
          style={{ width: `${value}%` }}
        />
      </div>
      {sub && <div className="text-[10px] text-gray-600 font-mono mt-1">{sub}</div>}
    </div>
  );
}
