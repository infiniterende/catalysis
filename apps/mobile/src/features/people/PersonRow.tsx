import { initialOf, type Person } from '@catalysis/api';
import { StyleSheet, Text, View } from 'react-native';

import { Chip } from '@/components/Buttons';
import { Label } from '@/components/Label';
import { actions, useApp } from '@/lib/store';
import { colors, display } from '@/theme';

/** Square initial, name, handle and parish, with a Follow toggle. */
export function PersonRow({ person }: { person: Person }) {
  const following = useApp((s) => s.followingIds.includes(person.id));
  return (
    <View style={styles.row}>
      <View style={styles.square}>
        <Text style={styles.initial}>{initialOf(person.name.replace(/^Fr\.\s+/, ''))}</Text>
      </View>
      <View style={styles.body}>
        <Label weight="semibold">{person.name}</Label>
        <Label size={8.5} color={colors.muted} style={styles.meta} numberOfLines={1}>
          {person.handle} · {person.parish}
        </Label>
      </View>
      <Chip
        label={following ? 'Following' : 'Follow'}
        filled={following}
        selected={following}
        accessibilityLabel={following ? `Following ${person.name}` : `Follow ${person.name}`}
        onPress={() => actions().toggleFollow(person.id)}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 14,
    paddingVertical: 13,
    borderBottomWidth: 1,
    borderBottomColor: colors.rule,
  },
  square: { width: 44, height: 44, backgroundColor: colors.ink, alignItems: 'center', justifyContent: 'center' },
  initial: { ...display(17), color: colors.white },
  body: { flex: 1 },
  meta: { marginTop: 5 },
});
