import { useState } from "react";
import { StyleSheet, Text } from "react-native";

import { colors, fontSize, fontWeight } from "../theme/tokens";
import Button from "./Button";
import FormSheet from "./FormSheet";
import RadioOption from "./RadioOption";

// The two settings the website offers, minus fullscreen (React Native has no
// equivalent of the Fullscreen API). Private to this file: the ids are what the
// study screen stores, so nothing else needs the lists.
const SORTINGS = [
  {
    id: "browsing",
    label: "Browsing",
    detail: "Standard flashcard flipping. Great for familiarising yourself with terms.",
  },
  {
    id: "basic",
    label: "Basic sorting",
    detail: "Grade each card as I know this or still learning.",
  },
];

const FRONT_SIDES = [
  { id: "term", label: "Term" },
  { id: "definition", label: "Definition" },
];

export default function StudySettingsModal({ sorting, front, onCancel, onApply }) {
  const [draftSorting, setDraftSorting] = useState(sorting);
  const [draftFront, setDraftFront] = useState(front);

  return (
    <FormSheet
      onClose={onCancel}
      title="Build your session"
      footer={
        <>
          <Button
            onPress={() => onApply({ sorting: draftSorting, front: draftFront })}
            title="Apply settings"
          />
          <Button onPress={onCancel} title="Cancel" variant="ghost" />
        </>
      }
    >
      <Text style={styles.group}>Flashcard sorting</Text>
      {SORTINGS.map((option) => (
        <RadioOption
          detail={option.detail}
          key={option.id}
          label={option.label}
          onPress={() => setDraftSorting(option.id)}
          selected={draftSorting === option.id}
        />
      ))}

      <Text style={styles.group}>Front of card</Text>
      {FRONT_SIDES.map((option) => (
        <RadioOption
          key={option.id}
          label={option.label}
          onPress={() => setDraftFront(option.id)}
          selected={draftFront === option.id}
        />
      ))}
    </FormSheet>
  );
}

const styles = StyleSheet.create({
  group: {
    color: colors.inkSecondary,
    fontSize: fontSize.xs,
    fontWeight: fontWeight.semibold,
    letterSpacing: 0.6,
    textTransform: "uppercase",
  },
});
