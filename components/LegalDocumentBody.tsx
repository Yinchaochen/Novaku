import React from 'react';
import { Text, View } from 'react-native';

// Lightweight renderer for the legal-document subset of markdown used in
// lib/legalContent.ts. Recognized constructs:
//
//   `## Heading`           → section heading
//   blank line             → paragraph break
//   `- Bullet text`        → bullet item
//   `**bold span**` inline → bold run (single level, no nesting)
//
// Anything else is rendered as a paragraph of body text. This is intentionally
// not a full markdown parser — keep the source documents in lib/legalContent.ts
// within these conventions instead of extending the renderer.

type Block =
  | { kind: 'heading'; text: string }
  | { kind: 'paragraph'; text: string }
  | { kind: 'bullet'; text: string };

function parse(source: string): Block[] {
  const lines = source.split('\n');
  const blocks: Block[] = [];
  let paragraphLines: string[] = [];

  const flushParagraph = () => {
    if (paragraphLines.length > 0) {
      blocks.push({ kind: 'paragraph', text: paragraphLines.join(' ').trim() });
      paragraphLines = [];
    }
  };

  for (const rawLine of lines) {
    const line = rawLine.trimEnd();
    if (line.startsWith('## ')) {
      flushParagraph();
      blocks.push({ kind: 'heading', text: line.slice(3).trim() });
    } else if (line.startsWith('- ')) {
      flushParagraph();
      blocks.push({ kind: 'bullet', text: line.slice(2).trim() });
    } else if (line.trim() === '') {
      flushParagraph();
    } else {
      paragraphLines.push(line.trim());
    }
  }
  flushParagraph();
  return blocks;
}

function renderInline(text: string): React.ReactNode {
  // Splits on `**…**` and emits bold runs for the captured groups. Empty/odd
  // groups (incomplete bold markers) just pass through as plain text.
  const parts = text.split(/\*\*(.+?)\*\*/g);
  return parts.map((part, i) =>
    i % 2 === 1 ? (
      <Text key={i} style={{ fontWeight: '700' }}>
        {part}
      </Text>
    ) : (
      <React.Fragment key={i}>{part}</React.Fragment>
    ),
  );
}

export function LegalDocumentBody({
  source,
  lastUpdatedLabel,
}: {
  source: string;
  lastUpdatedLabel: string;
}) {
  const blocks = parse(source);

  return (
    <View>
      <Text style={{ fontSize: 12.5, color: '#9CA3AF', marginBottom: 18 }}>
        {lastUpdatedLabel}
      </Text>
      {blocks.map((block, idx) => {
        if (block.kind === 'heading') {
          return (
            <Text
              key={idx}
              style={{
                fontSize: 17,
                fontWeight: '800',
                color: '#111111',
                marginTop: idx === 0 ? 0 : 18,
                marginBottom: 8,
              }}
            >
              {block.text}
            </Text>
          );
        }
        if (block.kind === 'bullet') {
          return (
            <View
              key={idx}
              style={{ flexDirection: 'row', marginBottom: 8, paddingLeft: 4 }}
            >
              <Text
                style={{ fontSize: 14, lineHeight: 22, color: '#374151', marginRight: 8 }}
              >
                •
              </Text>
              <Text style={{ flex: 1, fontSize: 14, lineHeight: 22, color: '#374151' }}>
                {renderInline(block.text)}
              </Text>
            </View>
          );
        }
        return (
          <Text
            key={idx}
            style={{ fontSize: 14, lineHeight: 22, color: '#374151', marginBottom: 10 }}
          >
            {renderInline(block.text)}
          </Text>
        );
      })}
    </View>
  );
}
