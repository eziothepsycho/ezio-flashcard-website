import { useState } from "react";

import { describeError } from "../lib/api/client.js";
import Button from "./Button";
import Field from "./Field";
import FormSheet from "./FormSheet";
import Notice from "./Notice";

// Add or edit one card. Both sides are required, and the API's own wording
// ("Term is required." / "Definition is required.") lands under the right field.
export default function CardFormModal({ mode, initialCard, onCancel, onSubmit }) {
  const editing = mode === "edit";
  const [term, setTerm] = useState(initialCard?.term ?? "");
  const [definition, setDefinition] = useState(initialCard?.definition ?? "");
  const [fieldErrors, setFieldErrors] = useState({ term: "", definition: "" });
  const [formError, setFormError] = useState("");
  const [busy, setBusy] = useState(false);

  function handleSubmit() {
    if (busy) return;
    setFormError("");

    const trimmedTerm = term.trim();
    const trimmedDefinition = definition.trim();
    const localErrors = {
      term: trimmedTerm ? "" : "Term is required.",
      definition: trimmedDefinition ? "" : "Definition is required.",
    };

    setFieldErrors(localErrors);
    if (localErrors.term || localErrors.definition) return;

    setBusy(true);
    onSubmit({ term: trimmedTerm, definition: trimmedDefinition })
      .catch((err) => {
        setFieldErrors({
          term: err?.fields?.term ?? "",
          definition: err?.fields?.definition ?? "",
        });
        setFormError(describeError(err, "flashcard"));
      })
      .finally(() => setBusy(false));
  }

  return (
    <FormSheet
      onClose={busy ? () => {} : onCancel}
      title={editing ? "Edit flashcard" : "New flashcard"}
      footer={
        <>
          {Boolean(formError) && <Notice>{formError}</Notice>}
          <Button busy={busy} onPress={handleSubmit} title={editing ? "Save card" : "Add card"} />
          <Button disabled={busy} onPress={onCancel} title="Cancel" variant="ghost" />
        </>
      }
    >
      <Field
        autoCapitalize="sentences"
        error={fieldErrors.term}
        label="Term"
        onChangeText={setTerm}
        placeholder="Router"
        value={term}
      />
      <Field
        autoCapitalize="sentences"
        error={fieldErrors.definition}
        label="Definition"
        multiline
        onChangeText={setDefinition}
        placeholder="Forwards packets between networks"
        value={definition}
      />
    </FormSheet>
  );
}
