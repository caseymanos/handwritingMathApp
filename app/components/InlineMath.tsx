/**
 * InlineMath Component
 *
 * Renders plain text with inline LaTeX segments delimited by $...$ using react-native-katex.
 * Example: "Write out $a + b$ and simplify" -> text + KaTeX + text.
 */

import React from 'react';
import { View, Text, StyleProp, TextStyle, ViewStyle } from 'react-native';
import Katex from 'react-native-katex';

interface InlineMathProps {
  text: string;
  textStyle?: StyleProp<TextStyle>;
  containerStyle?: StyleProp<ViewStyle>;
  mathStyle?: any;
}

// Split by $...$ preserving delimiters
const splitIntoSegments = (input: string): Array<{ type: 'text' | 'math'; value: string }> => {
  const segments: Array<{ type: 'text' | 'math'; value: string }> = [];
  const regex = /\$(.+?)\$/g; // non-greedy between single dollar signs
  let lastIndex = 0;
  let match;

  while ((match = regex.exec(input)) !== null) {
    const [full, inner] = match;
    const start = match.index;
    const end = start + full.length;

    if (start > lastIndex) {
      segments.push({ type: 'text', value: input.slice(lastIndex, start) });
    }
    segments.push({ type: 'math', value: inner });
    lastIndex = end;
  }

  if (lastIndex < input.length) {
    segments.push({ type: 'text', value: input.slice(lastIndex) });
  }

  // If no matches, just return a single text segment
  if (segments.length === 0) {
    segments.push({ type: 'text', value: input });
  }

  return segments;
};

export const InlineMath: React.FC<InlineMathProps> = ({ text, textStyle, containerStyle, mathStyle }) => {
  const segments = React.useMemo(() => splitIntoSegments(text), [text]);

  return (
    <View style={[{ flexDirection: 'row', flexWrap: 'wrap', alignItems: 'center' }, containerStyle]}>
      {segments.map((seg, idx) => {
        if (seg.type === 'text') {
          return (
            <Text key={`t-${idx}`} style={textStyle}>
              {seg.value}
            </Text>
          );
        }
        return (
          <Katex
            key={`m-${idx}`}
            expression={seg.value}
            displayMode={false}
            style={mathStyle}
            inlineStyle={`
              html, body {
                display: inline-flex;
                align-items: center;
                margin: 0;
                padding: 0;
                background: transparent !important;
              }
              .katex {
                font-size: 1.0em;
                margin: 0 2px;
                background: transparent !important;
                border: none !important;
                box-shadow: none !important;
              }
              .katex-html {
                background: transparent !important;
              }
            `}
            onError={(error) => console.log('[InlineMath] KaTeX render error:', error)}
          />
        );
      })}
    </View>
  );
};

export default InlineMath;

