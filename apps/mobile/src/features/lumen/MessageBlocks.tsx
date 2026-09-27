import { parseLumenBlocks, type Citation } from '@catalysis/api';
import { StyleSheet, Text, View } from 'react-native';

import { Label } from '@/components/Label';
import { colors, display, text } from '@/theme';

/** Lumen's prose: Caslon paragraphs and crimson-ruled Bodoni quotations. Safe on partial, streaming text. */
export function MessageBlocks({ content }: { content: string }) {
  const blocks = parseLumenBlocks(content);
  return (
    <View style={styles.blocks}>
      {blocks.map((block, i) =>
        block.kind === 'quote' ? (
          <View key={i} style={styles.quote}>
            <Text style={styles.quoteText}>{block.text}</Text>
            {block.citation ? (
              <Label size={8.5} color={colors.muted} style={styles.citation}>{block.citation}</Label>
            ) : null}
          </View>
        ) : (
          <Text key={i} style={styles.paragraph}>{block.text}</Text>
        ),
      )}
    </View>
  );
}

/** "Sources in this answer": crimson type, bold reference, italic description. */
export function SourceList({ citations }: { citations: Citation[] }) {
  return (
    <View style={styles.sources}>
      {citations.map((citation) => (
        <View key={`${citation.type}-${citation.reference}`} style={styles.source}>
          <Label size={9} color={colors.crimson}>{citation.type}</Label>
          <Text style={styles.reference}>{citation.reference}</Text>
          {citation.description ? <Text style={styles.description}>{citation.description}</Text> : null}
        </View>
      ))}
    </View>
  );
}

const styles = StyleSheet.create({
  blocks: { gap: 14 },
  paragraph: { ...text(15.5, { lineHeight: 1.62 }), color: colors.body },
  quote: { borderLeftWidth: 2, borderLeftColor: colors.crimson, paddingVertical: 2, paddingLeft: 16 },
  quoteText: { ...display(20, { italic: true, lineHeight: 1.3 }), color: colors.ink },
  citation: { marginTop: 8 },
  sources: { borderTopWidth: 1, borderTopColor: colors.ink },
  source: { paddingVertical: 14, borderBottomWidth: 1, borderBottomColor: colors.rule },
  reference: { ...text(16, { bold: true }), color: colors.ink, marginTop: 6 },
  description: { ...text(14, { italic: true }), color: colors.muted, marginTop: 4 },
});
