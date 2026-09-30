import React from 'react';

/**
 * Renders formatted text supporting markdown bold (**text**), lists (* / - / 1.),
 * headers (###), inline code, and severity badges without displaying raw asterisks.
 */
export default function FormattedText({ content, style = {} }) {
  if (!content) return null;

  // Split into lines
  const lines = content.split('\n');

  const renderInline = (text) => {
    if (!text) return null;

    // Pattern to match bold (**text**), inline code (`code`), or plain text
    const parts = [];
    let remaining = text;
    let keyIdx = 0;

    while (remaining.length > 0) {
      // Check for **bold**
      const boldMatch = remaining.match(/\*\*(.+?)\*\*/);
      // Check for `code`
      const codeMatch = remaining.match(/`([^`]+)`/);

      // Find which comes first
      const boldIndex = boldMatch ? remaining.indexOf(boldMatch[0]) : -1;
      const codeIndex = codeMatch ? remaining.indexOf(codeMatch[0]) : -1;

      if (boldIndex === -1 && codeIndex === -1) {
        // Plain text remainder
        parts.push(<span key={keyIdx++}>{remaining}</span>);
        break;
      }

      if (boldIndex !== -1 && (codeIndex === -1 || boldIndex < codeIndex)) {
        // Push preceding plain text
        if (boldIndex > 0) {
          parts.push(<span key={keyIdx++}>{remaining.slice(0, boldIndex)}</span>);
        }
        // Bold content
        const boldText = boldMatch[1];
        parts.push(
          <strong key={keyIdx++} style={{ fontWeight: 650, color: '#f1f5f9' }}>
            {boldText}
          </strong>
        );
        remaining = remaining.slice(boldIndex + boldMatch[0].length);
      } else if (codeIndex !== -1) {
        // Push preceding plain text
        if (codeIndex > 0) {
          parts.push(<span key={keyIdx++}>{remaining.slice(0, codeIndex)}</span>);
        }
        // Code content
        const codeText = codeMatch[1];
        parts.push(
          <code
            key={keyIdx++}
            style={{
              padding: '1px 5px',
              borderRadius: '4px',
              background: 'rgba(56, 189, 248, 0.15)',
              color: '#38bdf8',
              fontFamily: 'monospace',
              fontSize: '0.85em'
            }}
          >
            {codeText}
          </code>
        );
        remaining = remaining.slice(codeIndex + codeMatch[0].length);
      }
    }

    return parts;
  };

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '6px', ...style }}>
      {lines.map((line, lineIdx) => {
        const trimmed = line.trim();

        if (!trimmed) {
          return <div key={lineIdx} style={{ height: '4px' }} />;
        }

        // Header 3 (### )
        if (trimmed.startsWith('### ')) {
          return (
            <div
              key={lineIdx}
              style={{
                fontSize: '0.88rem',
                fontWeight: 750,
                color: '#38bdf8',
                marginTop: '4px',
                marginBottom: '2px'
              }}
            >
              {renderInline(trimmed.replace(/^###\s+/, ''))}
            </div>
          );
        }

        // Bullet point (* or -)
        if (trimmed.startsWith('* ') || trimmed.startsWith('- ')) {
          const bulletContent = trimmed.replace(/^[\*\-]\s+/, '');
          return (
            <div
              key={lineIdx}
              style={{
                display: 'flex',
                alignItems: 'flex-start',
                gap: '6px',
                paddingLeft: '4px'
              }}
            >
              <span style={{ color: '#38bdf8', fontSize: '0.9rem', lineHeight: '1.4' }}>•</span>
              <span style={{ flex: 1 }}>{renderInline(bulletContent)}</span>
            </div>
          );
        }

        // Numbered list (1. 2. etc)
        const numMatch = trimmed.match(/^(\d+)\.\s+(.*)/);
        if (numMatch) {
          return (
            <div
              key={lineIdx}
              style={{
                display: 'flex',
                alignItems: 'flex-start',
                gap: '6px',
                paddingLeft: '4px'
              }}
            >
              <span style={{ color: '#38bdf8', fontWeight: 600, fontSize: '0.8rem', minWidth: '16px' }}>
                {numMatch[1]}.
              </span>
              <span style={{ flex: 1 }}>{renderInline(numMatch[2])}</span>
            </div>
          );
        }

        // Normal paragraph
        return (
          <div key={lineIdx} style={{ lineHeight: '1.5' }}>
            {renderInline(line)}
          </div>
        );
      })}
    </div>
  );
}
