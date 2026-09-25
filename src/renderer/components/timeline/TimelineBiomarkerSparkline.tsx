import React, { useMemo } from 'react';

export interface TimelineBiomarkerSparklineProps {
  history: Array<{ date: string; value: number | string }>;
  referenceRange?: string;
  status: 'normal' | 'borderline' | 'flagged';
  className?: string;
}

const parseReferenceRange = (range: string | undefined): { low?: number; high?: number } | null => {
  if (!range) return null;
  const matchInterval = range.match(/([\d.]+)\s*-\s*([\d.]+)/);
  if (matchInterval) {
    return { low: parseFloat(matchInterval[1]), high: parseFloat(matchInterval[2]) };
  }
  const matchLess = range.match(/<\s*([\d.]+)/);
  if (matchLess) {
    return { high: parseFloat(matchLess[1]) };
  }
  const matchGreater = range.match(/>\s*([\d.]+)/);
  if (matchGreater) {
    return { low: parseFloat(matchGreater[1]) };
  }
  return null;
};

export const TimelineBiomarkerSparkline: React.FC<TimelineBiomarkerSparklineProps> = ({
  history,
  referenceRange,
  status,
  className = '',
}) => {
  const width = 120;
  const height = 32;
  const paddingY = 4;
  const paddingX = 4;

  const { points, lines, refLines } = useMemo(() => {
    // 1. Parse all values to numbers, filter out non-numeric
    const dataPoints = history
      .map((d) => ({ date: d.date, value: typeof d.value === 'string' ? parseFloat(d.value) : d.value }))
      .filter((d) => !isNaN(d.value));

    if (dataPoints.length === 0) {
      return { points: [], lines: '', refLines: [] };
    }

    // 4. Parse reference range
    const refRange = parseReferenceRange(referenceRange);

    // 2. Compute min/max for Y-axis scaling with 10% padding
    let minVal = Math.min(...dataPoints.map((d) => d.value));
    let maxVal = Math.max(...dataPoints.map((d) => d.value));

    if (refRange?.low !== undefined) minVal = Math.min(minVal, refRange.low);
    if (refRange?.high !== undefined) maxVal = Math.max(maxVal, refRange.high);

    if (minVal === maxVal) {
      minVal -= 1;
      maxVal += 1;
    }

    const range = maxVal - minVal;
    const paddedMin = minVal - range * 0.1;
    const paddedMax = maxVal + range * 0.1;
    const paddedRange = paddedMax - paddedMin;

    const scaleY = (val: number) => {
      const scaled = ((val - paddedMin) / paddedRange) * (height - paddingY * 2);
      return height - paddingY - scaled;
    };

    // 3. Distribute points evenly along X-axis
    const numPoints = dataPoints.length;
    const stepX = numPoints > 1 ? (width - paddingX * 2) / (numPoints - 1) : 0;

    const pointsList = dataPoints.map((d, i) => {
      const cx = numPoints === 1 ? width / 2 : paddingX + i * stepX;
      const cy = scaleY(d.value);
      return { cx, cy, value: d.value };
    });

    const linesPath = pointsList.map((p, i) => `${i === 0 ? 'M' : 'L'} ${p.cx} ${p.cy}`).join(' ');

    const refLinesList: number[] = [];
    if (refRange) {
      if (refRange.low !== undefined && refRange.high !== undefined) {
        refLinesList.push(scaleY(refRange.low));
        refLinesList.push(scaleY(refRange.high));
      } else if (refRange.low !== undefined) {
        refLinesList.push(scaleY(refRange.low));
      } else if (refRange.high !== undefined) {
        refLinesList.push(scaleY(refRange.high));
      }
    }

    return { points: pointsList, lines: linesPath, refLines: refLinesList };
  }, [history, referenceRange]);

  const colorClass = 
    status === 'normal' ? 'text-sage-600' :
    status === 'borderline' ? 'text-amber-600' :
    'text-clay-600';

  if (points.length === 0) {
    return <div className={`inline-flex items-center w-[120px] h-[32px] ${className}`} />;
  }

  const fillPath = `${lines} L ${points[points.length - 1].cx} ${height} L ${points[0].cx} ${height} Z`;

  return (
    <div className={`inline-flex items-center select-none ${className}`}>
      <svg 
        width={width} 
        height={height} 
        viewBox={`0 0 ${width} ${height}`}
        className="overflow-visible"
        aria-hidden="true"
      >
        <defs>
          <linearGradient id={`gradient-${status}`} x1="0" x2="0" y1="0" y2="1">
            <stop offset="0%" stopColor="currentColor" stopOpacity={0.1} className={colorClass} />
            <stop offset="100%" stopColor="currentColor" stopOpacity={0.0} className={colorClass} />
          </linearGradient>
        </defs>

        {/* Reference lines */}
        {refLines.map((y, i) => (
          <line
            key={i}
            x1={0}
            y1={y}
            x2={width}
            y2={y}
            className="text-tertiary"
            stroke="currentColor"
            strokeWidth={1}
            strokeDasharray="2,2"
            opacity={0.3}
          />
        ))}

        {/* Area fill */}
        {points.length > 1 && (
          <path
            d={fillPath}
            fill={`url(#gradient-${status})`}
          />
        )}

        {/* Line */}
        {points.length > 1 && (
          <path
            d={lines}
            fill="none"
            stroke="currentColor"
            strokeWidth={1.5}
            strokeLinecap="round"
            strokeLinejoin="round"
            className={colorClass}
          />
        )}

        {/* Points */}
        {points.map((p, i) => {
          const isLast = i === points.length - 1;
          return (
            <circle
              key={i}
              cx={p.cx}
              cy={p.cy}
              r={isLast ? 3 : 2}
              fill="currentColor"
              className={colorClass}
              stroke={isLast ? 'white' : 'none'}
              strokeWidth={isLast ? 1.5 : 0}
            />
          );
        })}
      </svg>
    </div>
  );
};
