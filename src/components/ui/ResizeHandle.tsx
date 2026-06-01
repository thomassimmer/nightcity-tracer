export function ResizeHandle({
  axis,
  gridColumn,
  gridRow,
  onMouseDown,
}: {
  axis: "col" | "row";
  gridColumn: string;
  gridRow: string;
  onMouseDown: (e: React.MouseEvent) => void;
}) {
  const isCol = axis === "col";
  return (
    <div
      style={{ gridColumn, gridRow }}
      className={`flex ${isCol ? "items-stretch justify-center cursor-col-resize" : "flex-col items-center justify-center cursor-row-resize"} group z-10`}
      onMouseDown={onMouseDown}
    >
      <div
        className={`${isCol ? "w-0.5 h-full" : "h-0.5 w-full"} bg-theme-border/30 group-hover:bg-theme-primary/60 transition-colors`}
      />
    </div>
  );
}
